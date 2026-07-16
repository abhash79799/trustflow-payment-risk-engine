class InputError(ValueError):
    pass


COUNTS = (
    "active_days",
    "total_user_transactions",
    "user_disputes",
    "device_changes",
    "merchant_transactions",
    "merchant_successes",
    "merchant_failures",
    "merchant_chargebacks",
    "merchant_disputes",
    "backspace_count",
    "paste_attempts",
    "focus_loss_count",
    "failed_auth_attempts"
)

FLAGS = (
    "has_timeout",
    "has_processing_error",
    "payment_already_credited",
    "is_new_device"
)


def evaluate(raw):
    if not isinstance(raw, dict):
        raise InputError("JSON request must be an object.")

    p = {
        key: _count(raw.get(key), key)
        for key in COUNTS
    }

    p.update({
        key: _flag(raw.get(key), key)
        for key in FLAGS
    })

    p["system_health"] = _health(raw.get("system_health"))

    _relationships(p)

    reasons = []

    user = user_score(p, reasons)
    merchant = merchant_score(p, reasons)
    reliability = reliability_score(p, reasons)
    behaviour = behaviour_score(p, reasons)

    overall = round(
        0.30 * user +
        0.30 * merchant +
        0.25 * reliability +
        0.15 * behaviour,
        1
    )

    decision = risk_decision(p, overall)
    settlement = settlement_action(p, decision, overall)

    if not reasons:
        reasons = [
            "No material risk signals were detected in this demo window."
        ]

    return {
        "scores": {
            "overall_trust": overall,
            "user_trust": round(user, 1),
            "merchant_trust": round(merchant, 1),
            "transaction_reliability": round(reliability, 1),
            "behavioural_safety": round(behaviour, 1)
        },
        "risk_decision": decision,
        "settlement_action": settlement,
        "reasons": reasons,
        "privacy_note": (
            "Only aggregate interaction counts are evaluated. "
            "Passwords, OTPs, typed text and individual keystrokes "
            "are never collected or stored."
        )
    }


def user_score(p, reasons):
    if p["total_user_transactions"] == 0 or p["active_days"] == 0:
        reasons.append(
            "Limited user history: manual review may be appropriate."
        )
        return 50

    dispute_rate = (
        p["user_disputes"] / p["total_user_transactions"]
    )

    device_change_rate = (
        p["device_changes"] / p["active_days"]
    )

    if dispute_rate >= 0.05:
        reasons.append(
            f"User dispute rate is {dispute_rate:.1%}."
        )

    if p["device_changes"] >= 3:
        reasons.append(
            f"{p['device_changes']} device changes were seen in the last 30 days."
        )

    return clamp(
        100 -
        70 * dispute_rate -
        30 * min(device_change_rate, 1)
    )


def merchant_score(p, reasons):
    if p["merchant_transactions"] < 10:
        reasons.append(
            "Merchant has insufficient transaction history "
            "(fewer than 10 transactions)."
        )
        return 50

    total = p["merchant_transactions"]

    failure_rate = p["merchant_failures"] / total
    chargeback_rate = p["merchant_chargebacks"] / total
    dispute_rate = p["merchant_disputes"] / total

    if failure_rate >= 0.10:
        reasons.append(
            f"Merchant failure rate is {failure_rate:.1%}."
        )

    if chargeback_rate >= 0.02:
        reasons.append(
            f"Merchant chargeback rate is {chargeback_rate:.1%}."
        )

    if dispute_rate >= 0.03:
        reasons.append(
            f"Merchant dispute rate is {dispute_rate:.1%}."
        )

    return clamp(
        100 -
        45 * failure_rate -
        80 * chargeback_rate -
        45 * dispute_rate
    )


def reliability_score(p, reasons):
    score = 100 * p["system_health"]

    if p["system_health"] < 0.85:
        reasons.append(
            f"Payment-system health is reduced "
            f"({p['system_health']:.0%})."
        )

    if p["has_timeout"]:
        score -= 30
        reasons.append("Payment processing timed out.")

    if p["has_processing_error"]:
        score -= 40
        reasons.append("Payment processing reported an error.")

    return clamp(score)


def behaviour_score(p, reasons):
    score = 100

    if p["backspace_count"] >= 8:
        score -= min(
            20,
            (p["backspace_count"] - 5) * 2
        )
        reasons.append(
            f"Unusually high correction count in secure inputs "
            f"({p['backspace_count']})."
        )

    if p["paste_attempts"] > 0:
        score -= min(
            15,
            p["paste_attempts"] * 8
        )
        reasons.append(
            f"Paste was attempted in a secure input "
            f"({p['paste_attempts']} time(s))."
        )

    if p["focus_loss_count"] >= 2:
        score -= min(
            20,
            p["focus_loss_count"] * 7
        )
        reasons.append(
            f"Checkout lost focus {p['focus_loss_count']} time(s)."
        )

    if p["failed_auth_attempts"] > 0:
        score -= min(
            30,
            p["failed_auth_attempts"] * 10
        )
        reasons.append(
            f"{p['failed_auth_attempts']} failed authentication "
            f"attempt(s) were reported."
        )

    if p["is_new_device"]:
        score -= 12
        reasons.append(
            "Checkout is occurring from a new device/browser."
        )

    return clamp(score)


def risk_decision(p, overall):
    severe_merchant_risk = (
        p["merchant_transactions"] >= 10 and
        p["merchant_chargebacks"] / p["merchant_transactions"] >= 0.10
    )

    behavioural_anomaly = (
        p["failed_auth_attempts"] >= 2 or
        p["focus_loss_count"] >= 3 or
        (
            p["backspace_count"] >= 8 and
            p["paste_attempts"] > 0
        )
    )

    if (
        severe_merchant_risk or
        (p["has_processing_error"] and p["has_timeout"]) or
        overall < 40
    ):
        return "BLOCK"

    if (
        p["total_user_transactions"] == 0 or
        p["merchant_transactions"] < 10 or
        behavioural_anomaly or
        overall < 70
    ):
        return "REVIEW"

    return "APPROVE"


def settlement_action(p, decision, overall):
    if p["payment_already_credited"]:
        return "ALREADY_CREDITED"

    if p["has_processing_error"] or decision == "BLOCK":
        return "REFUND_AND_INVESTIGATE"

    if decision == "REVIEW" or overall < 80:
        return "HOLD_AND_VERIFY"

    return "CREDIT_SAME_DAY"


def _count(value, key):
    if (
        isinstance(value, bool) or
        not isinstance(value, int) or
        value < 0
    ):
        raise InputError(
            f"{key} must be a non-negative integer."
        )

    return value


def _flag(value, key):
    if not isinstance(value, bool):
        raise InputError(
            f"{key} must be true or false."
        )

    return value


def _health(value):
    if (
        isinstance(value, bool) or
        not isinstance(value, (int, float)) or
        not 0 <= value <= 1
    ):
        raise InputError(
            "system_health must be a number from 0 to 1."
        )

    return float(value)


def _relationships(p):
    if p["active_days"] > 30:
        raise InputError(
            "active_days must be between 0 and 30."
        )

    if p["user_disputes"] > p["total_user_transactions"]:
        raise InputError(
            "user_disputes cannot exceed total_user_transactions."
        )

    if (
        p["merchant_successes"] +
        p["merchant_failures"] >
        p["merchant_transactions"]
    ):
        raise InputError(
            "merchant successes + failures cannot exceed "
            "merchant_transactions."
        )

    for key in ("merchant_chargebacks", "merchant_disputes"):
        if p[key] > p["merchant_transactions"]:
            raise InputError(
                f"{key} cannot exceed merchant_transactions."
            )


def clamp(value):
    return max(0, min(100, value))
