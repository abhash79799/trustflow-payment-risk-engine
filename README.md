# TrustFlow – Payment Risk Engine

TrustFlow is an explainable payment-risk dashboard that recommends:

- APPROVE
- REVIEW
- BLOCK

It combines four types of signals:

- User transaction history
- Merchant performance history
- Payment system reliability
- Privacy-preserving behavioural signals

## Behavioural Privacy

TrustFlow does not collect or store:

- Passwords
- OTPs
- Typed text
- Individual keystrokes

It only uses safe aggregate signals such as backspace count, paste attempts, checkout focus loss, failed authentication attempts, and new-device status.

## How it works

The dashboard calculates:

- User trust score
- Merchant trust score
- Transaction reliability score
- Behavioural safety score
- Overall trust score

It then recommends an action along with clear reasons.

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Python
- Deployment: Vercel Serverless Functions

## Important Note

This is a transparent rule-based baseline, not a trained ML fraud model. It does not make unsupported fraud-detection accuracy claims.
