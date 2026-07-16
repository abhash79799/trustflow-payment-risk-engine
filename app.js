const behaviour = {
  backspace_count: 0,
  paste_attempts: 0,
  focus_loss_count: 0
};

const byId = (id) => document.getElementById(id);

const showCounters = () => {
  byId("backspaces").textContent = behaviour.backspace_count;
  byId("pastes").textContent = behaviour.paste_attempts;
  byId("focus-losses").textContent = behaviour.focus_loss_count;
};

[byId("password"), byId("otp")].forEach((input) => {
  input.addEventListener("keydown", (event) => {
    if (event.key === "Backspace") {
      behaviour.backspace_count++;
      showCounters();
    }
  });

  input.addEventListener("paste", () => {
    behaviour.paste_attempts++;
    showCounters();
  });
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    behaviour.focus_loss_count++;
    showCounters();
  }
});

document.querySelector("#risk-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = { ...behaviour };

  event.currentTarget.querySelectorAll("input[name]").forEach((input) => {
    payload[input.name] =
      input.type === "checkbox" ? input.checked : Number(input.value);
  });

  const response = await fetch("/api/evaluate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    alert(data.error || "Invalid input");
    return;
  }

  byId("result").hidden = false;

  byId("decision").textContent = data.risk_decision;
  byId("decision").className = data.risk_decision.toLowerCase();

  byId("score").textContent = `${data.scores.overall_trust} / 100`;

  byId("score-list").innerHTML = Object.entries(data.scores)
    .filter(([key]) => key !== "overall_trust")
    .map(
      ([key, value]) => `
        <div class="metric">
          <span>${key.replaceAll("_", " ")}</span>
          <strong>${value}</strong>
        </div>
      `
    )
    .join("");

  byId("reasons").innerHTML = data.reasons
    .map((reason) => `<li>${reason}</li>`)
    .join("");

  byId("settlement").textContent = data.settlement_action.replaceAll("_", " ");
  byId("privacy").textContent = data.privacy_note;
});
