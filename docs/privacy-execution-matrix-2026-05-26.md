# Privacy Execution Matrix — 2026-05-26

PrivateDAO now exposes a single backend-readable matrix for every privacy and intelligence rail:

`https://api.privatedao.org/api/v1/privacy-execution-matrix`

Provider health for GoldRush, Zerion, Torque, Jupiter, and QVAC is exposed separately:

`https://api.privatedao.org/api/v1/provider-integrations/status`

This endpoint exists so the product, reviewers, and operators can see how sensitive services move through:

`Review -> Sign -> Verify`

without exposing private payroll rows, private balances, strategy text, provider API keys, RPC tokens, PEM contents, wallet secret keys, or private manifests.

## Public Testnet Anchors

- PrivateDAO program: `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`
- ZK verifier program: `5H7Afyqdh5yPekkZJ5UM2j3HNB2bRvU8aVv8XoqeAW1j`
- REFHE configure: `3fygnmHzFpRQEbHq9q6u3djBnkTEcYz9y1TSwxDmbnuemshrMwLmy9CqpjifjRb7SmW3DbmXrkyq35cnjU7mMSPi`
- REFHE settle: `5TmS2AcpAmifcoG97U63Unzy7wt7B2NfyhBRs8Z6C4r1eqcWthEqf3GLcZXQ33sVYHf9YwfvBNhZD8ZZdt4HRwEY`
- MagicBlock configure: `4UiUumtuGeDciojDA26PkQby7RFiTNb12UG4ACcvGMGfQj24PUPxK5Apeno7EY8mbCvq8nR6h6nfxDcBpjPvGvPj`
- MagicBlock settle: `22XW8XVhWwQtChNQK2aEqXv5BVBbckxUmu4NsisoZQW21KA5ii87gVNUTcNoZ9e1vYKnHmm62qP1girpzVXWN1WY`
- Evidence-gated payout execution: `2a8sHWgiVCZkstybMff2M9R6DVU4Y96Rfsg8mqYs7K3xcYSEG1zMcq2iSTNwLD6FgfXvxxxWpwEP9Tbyin47RXvE`

## Service Coverage

| Service | Privacy / intelligence rail | Execution proof class | Visitor repeatable | Backend proof |
| --- | --- | --- | --- | --- |
| Private governance | commit-reveal, ZK verifier companion, nullifier-ready primitive | `wallet-signed-onchain` | yes | `/api/v1/runtime`, `/api/v1/cryptographic-readiness` |
| Confidential payroll | REFHE envelope, encrypted manifest hash, selective disclosure receipt | `onchain-signature` | yes | `/api/v1/refhe/payroll/proof` |
| Private payments | MagicBlock private corridor and receipt proof | `onchain-signature` | yes | `/api/v1/magicblock/onchain-proof?refresh=1` |
| Umbra payout | recipient-private claim intent and relayer health | `testnet-intent-receipt` | yes | `/api/v1/umbra/relayer/info`, `/api/v1/umbra/relayer/health`, `/api/v1/private-settlement/intent` |
| Ika custody | Solana approval preparation for Ika dWallet / 2PC-MPC route | `readiness-receipt` | yes | `/api/v1/ika/solana-prealpha/readiness`, `/api/v1/ika/solana-prealpha/approval/prepare`, `/api/v1/ika/custody/prepare` |
| Intelligence | GoldRush, Zerion, QVAC, QuickNode Stream telemetry | `provider-plus-rpc-receipt` | yes | `/api/v1/provider-integrations/status`, `/api/v1/goldrush/query`, `/api/v1/zerion/portfolio`, `/api/v1/qvac/runtime-proof`, `/api/v1/quicknode/stream/stats` |
| Treasury / growth | Jupiter order preview, Torque custom event relay, execution event stats | `wallet-reviewed-route-plus-ingestion-receipt` | yes | `/api/v1/provider-integrations/status`, `/api/v1/jupiter/order`, `/api/v1/torque/custom-event`, `/api/v1/execution-events/stats` |

Every service row in the live API now carries `executionProofClass`, `visitorRepeatable`, `blockchainVerificationUrl`, and `currentOnchainStatus`. That is the enforcement layer: on-chain signature rails stay visibly on-chain, while intent/readiness rails stay visitor-repeatable but cannot be mislabeled as final chain settlement before the missing signature exists.

## Visitor-Repeatable Claim Layer

`/services` and `/judge` now expose an on-chain claim console. The console is intentionally simple and repeatable:

1. The visitor connects a Solana Testnet wallet.
2. The visitor selects any privacy or encryption rail.
3. The browser creates a fresh AES-GCM encrypted claim packet locally.
4. The browser hashes the ciphertext and builds a Memo Program transaction containing `PDAO_ENCRYPTED_CLAIM_V1`, the selected rail, the proof class, and the digest prefix.
5. The visitor signs from their own wallet.
6. The page returns a new Testnet signature, Explorer link, and local encrypted packet for inspection.

This gives every rail a live visitor-generated encrypted on-chain claim path today, while the stronger native rails continue to carry their own evidence: REFHE signatures, MagicBlock signatures, ZK verifier receipts, Ika readiness receipts, Umbra claim-intent receipts, Jupiter route previews, Torque delivery receipts, and intelligence-provider proofs.

## Provider Execution Gate

`/api/v1/provider-integrations/status` is intentionally safe to call without secrets. It reports whether each server-side credential is configured, which public product route uses it, which proof endpoint exercises it, and which privacy boundary prevents provider data from becoming leaked strategy text.

Torque has one extra boundary: MCP auth tokens are not automatically ingestion API keys. The status route therefore exposes whether a Torque credential is present separately from whether event ingestion has been verified by `ingest.torque.so`.

2026-05-26 Torque activation evidence:

- Project: `PrivateDAO` (`cmpm5lnzt00hujq1jd9imtp2o`)
- Custom event: `private_treasury_execution` (`cmpm5lolt00iajq1jjluy5a3m`)
- Accepted ingestion proof: `4e660492-af75-4a28-9cb2-a81f7779be38`
- Live verification field: `/api/v1/provider-integrations/status -> providers.torque.deliveryVerified`

2026-05-26 expanded live-service gate:

- Umbra private settlement intent: `/api/v1/private-settlement/intent` returns a Testnet intent receipt with a recipient-private rail and live relayer context.
- Ika dWallet custody preparation: `/api/v1/ika/custody/prepare` initializes `@ika.xyz/sdk`, reads the live Ika network encryption key, and returns an `ika-custody-*` route for funded dWallet execution.
- GoldRush intelligence: `/api/v1/goldrush/query` checks Covalent GoldRush Warehouse and falls back to Zerion plus Solana RPC for wallet-level preview when the current GoldRush key cannot access the wallet-specific v1 endpoint.
- Torque growth delivery: `/api/v1/torque/custom-event` posts a real `private_treasury_execution` event to Torque and requires an accepted ingestion response in `verify:live-service-execution`.

## Boundary

This matrix does not claim mainnet funds are live. It does not claim final funded Ika dWallet DKG, final Ika 2PC-MPC signatures, or full Umbra claim settlement unless those are separately recorded with execution evidence.

It does prove the operating shape of the product: sensitive services are routed through private/intelligent preparation, wallet-controlled execution, and public-safe proof. The current engineering direction is stricter than the old copy: every privacy or encryption promise must move toward a repeatable Solana Testnet action with a visitor-openable verification URL.

No private keys, provider API keys, RPC tokens, PEM contents, or wallet secret keys are included.
