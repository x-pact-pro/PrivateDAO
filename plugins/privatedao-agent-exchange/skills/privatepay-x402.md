# Skill: PrivatePAY x402

## Commercial explanation

PrivatePAY x402 lets a compatible service request payment through a quote-first flow. PrivateDAO keeps the customer experience simple: see the service, understand the price, approve the payment, receive the result, and keep a redacted receipt for verification.

## Privacy language

PrivatePAY uses the documented MagicBlock private execution path where the supported rail is enabled. It reduces public linkability for the payment workflow, but it does not promise that deposits, withdrawals, timing, network fees, or infrastructure-level metadata are impossible to analyze.

## Agent rules

- Never create or submit a payment without explicit user approval.
- Never ask the user to paste a private key.
- Treat a quote as an authorization boundary, not as proof of settlement.
- Treat a receipt as valid only when the service verifies it.
- Keep payer, amount, destination, and settlement details out of public summaries unless the user explicitly needs them.
