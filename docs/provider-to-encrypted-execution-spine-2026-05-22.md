# Provider To Encrypted Execution Spine

Date: 2026-05-22

PrivateDAO now exposes a single product path for turning provider intelligence into protected execution:

1. Provider context
2. Decision intelligence
3. Encrypted operation preparation
4. Wallet-first Testnet execution
5. Proof continuity

This is the operating spine behind the visible route:

- `https://privatedao.org/services/goldrush-decision-intelligence/`

## Why This Matters

Private governance and confidential treasury operations fail when analytics, encryption, execution, and proof live in disconnected pages. The improved spine makes the route obvious:

- GoldRush and hosted reads provide wallet, stablecoin, counterparty, and source-health context.
- QVAC and deterministic intelligence explain the risk before the signer approves.
- REFHE, Encrypt, and IKA carry sensitive payroll, vendor, and treasury intent into commitment-safe artifacts.
- The wallet remains the execution boundary.
- Proof routes preserve receipts and reviewer-readable evidence without exposing the confidential payload.

## Product Flow

| Stage | Route | User job |
| --- | --- | --- |
| Provider | `/services/goldrush-decision-intelligence` | Inspect wallet, stablecoin, counterparty, and read-node context. |
| Decide | `/intelligence` | Turn proposal and treasury context into a clear pre-sign decision. |
| Encrypt | `/services/encrypt-ika-operations` | Prepare encrypted manifests, REFHE proof packets, and IKA custody routes. |
| Execute | `/execute` | Run the wallet-first Testnet operation after review is clear. |
| Verify | `/proof` | Inspect receipts, runtime logs, evidence packets, and chain references. |

## Claim Boundary

This spine strengthens product clarity and live Testnet routing. It does not claim Mainnet custody completion, external audit completion, unrestricted autonomous execution, or production real-funds release. Those remain governed by the trust, security, diagnostics, and mainnet-readiness gates.

## Reviewer Interpretation

The important architectural point is not that PrivateDAO has separate integrations. The point is that the integrations now form one user path:

> Analyze the counterparty, decide what risk exists, encrypt what must stay private, sign only from the wallet, and verify the outcome.

That is the shortest explanation of how GoldRush, QVAC, REFHE, Encrypt, IKA, execution, and proof work together inside the product.
