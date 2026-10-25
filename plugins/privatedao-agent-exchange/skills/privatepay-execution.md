# Skill: PrivatePAY x402 Execution

## Goal

Guide a customer or AI agent through a real PrivatePAY x402 request without skipping consent, quote validation, settlement verification, or receipt verification.

## Required sequence

1. Call `privatepay_status` and confirm the live rail, supported network, and current readiness.
2. Call `privatepay_challenge` with the service, amount, asset, network, and intended recipient context.
3. Show the customer the quote, service, amount, asset, network, privacy wording, and expiry.
4. Stop and request explicit approval. Never infer payment approval from a chat message that only asks for information.
5. Call `privatepay_checkout` or `privatepay_prepare` only after approval.
6. Keep signing in the customer's wallet or approved provider. Never collect a private key, seed phrase, or raw wallet export.
7. Call `privatepay_verify` on the returned payment evidence.
8. Call `privatepay_settle` only after verification succeeds and the quote is still valid.
9. Return the service result and the redacted receipt. Offer `verify_receipt` for independent checking.

## Fail-closed rules

- Do not pay when `privatepay_status` is disabled, stale, or missing a supported rail.
- Do not substitute a public payment for a private quote.
- Do not change `payTo`, amount, asset, network, memo, or expiry after the quote.
- Do not retry a settlement blindly; use the idempotency or receipt status returned by the service.
- Do not claim that privacy means invisibility. Deposits, withdrawals, timing, fees, and infrastructure metadata may still create observable signals.

## Customer-facing answer

Say: “I can prepare the private payment and show you the exact quote first. Nothing will be signed or settled until you approve it.”
