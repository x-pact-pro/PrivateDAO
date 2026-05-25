# Mainnet Cryptographic Readiness Ladder - 2026-05-25

PrivateDAO is a Solana Testnet production-candidate system. This ladder is the cutover map from the current Testnet cryptographic system to a mainnet-ready launch posture. It does not claim mainnet real-funds release. It shows the exact rails that already exist, the public proof attached to them, and the remaining gates that must close before mainnet funds or customer payroll can be enabled.

Current operating scope:

- Cluster: Solana Testnet
- Anchor program version: `1.0.1`
- Current program ID: `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`
- ProgramData: `FKyt5DcmRQcCF8kzMGjCvfGb3ZPHMQnH1SqiG9Mi8xEc`
- Squads vault authority: `CALHrBqx6jbzcPn2NVcinqSAHeod65v9LcDuTxsdPqBv`
- Current binary proposal: Squads proposal index `3`
- Current timelock release: `2026-05-27T02:25:39Z`

## What This Changes

The old readiness question was "do not overstate operational truth." That is still enforced. The new engineering question is stronger: every cryptographic claim must have a path to production-grade operation. For each rail below, PrivateDAO tracks four layers:

1. Core instruction or backend route
2. Testnet proof or repository artifact
3. User-facing route
4. Mainnet cutover gate

## Ladder

| Rail | Current core | Current proof | Public route | Mainnet cutover gate |
| --- | --- | --- | --- | --- |
| Squads custody | Program upgrade authority moved to Squads vault; proposal index `3` carries the current binary path. | Vault `CALHrBqx6jbzcPn2NVcinqSAHeod65v9LcDuTxsdPqBv`, proposal index `3`, timelock release `2026-05-27T02:25:39Z`. | `/security`, `/documents/squads-current-binary-upgrade-proposal-2026-05-25` | Execute proposal after timelock, then record DAO authority and treasury-operator authority handoff readouts. |
| DAO authority | `transfer_dao_authority` exists in the Anchor program and is part of the post-upgrade operating path. | Source-level instruction exists; execution waits for Squads proposal index `3`. | `/custody`, `/security` | Post-unlock transaction signature and account readout showing Squads-controlled DAO authority. |
| Treasury operator authority | `initialize_treasury_operator_authority` and `transfer_treasury_operator_authority` exist as the real handoff path. | Source-level instruction exists; no fake `transfer_treasury_authority` command is published. | `/security`, `/documents/dao-treasury-authority-handoff-2026-05-23` | Post-unlock transaction signature and readout showing Squads-controlled treasury operator authority. |
| ZK local circuits | Groth16 vote, delegation, and tally overlay commands exist with consistency and negative checks. | `npm run zk:all`, `npm run verify:zk-consistency`, `npm run verify:zk-negative`, `docs/zk-capability-matrix.md`. | `/proof`, `/documents/zk-capability-matrix` | Circuit audit, test vectors, setup assumptions, and governance-integrated verifier receipts. |
| Standalone ZK verifier | Solana Testnet verifier program validates the BN254/Groth16 receipt path. | Program `5H7Afyqdh5yPekkZJ5UM2j3HNB2bRvU8aVv8XoqeAW1j`; receipt tx `zwqNsA3kNP1mgcaS6zNdR92LLdssFULXfsRdkMK3UxraKLM6wYDoPaWCwV3J9PqApK5xJJH8TpxsGyCRcdEah67`. | `/judge`, `/documents/zk-standalone-verifier-testnet-2026-05-23` | Mainnet verifier deployment or governed verifier-address policy, then production receipt replay. |
| Program-integrated ZK mode | `anchor_zk_proof`, `verify_zk_proof_on_chain`, `configure_proposal_zk_mode`, and `finalize_zk_enforced_proposal_v3` are in the program path. | Current binary buffer and Squads proposal index `3` protect the integrated rollout. | `/security`, `/proof` | Execute proposal index `3`, then run an end-to-end proposal with verifier-program boundary readout. |
| REFHE confidential envelope | `configure_refhe_envelope` and `settle_refhe_envelope` are active settlement gates. | Configure tx `3fygnmHzFpRQEbHq9q6u3djBnkTEcYz9y1TSwxDmbnuemshrMwLmy9CqpjifjRb7SmW3DbmXrkyq35cnjU7mMSPi`; settle tx `5TmS2AcpAmifcoG97U63Unzy7wt7B2NfyhBRs8Z6C4r1eqcWthEqf3GLcZXQ33sVYHf9YwfvBNhZD8ZZdt4HRwEY`. | `/services/encrypt-ika-operations`, `/documents/testnet-encrypted-integrations-activation-2026-05-23` | Mainnet verifier boundary, audit notes, and live payout policy using production keys. |
| MagicBlock private corridor | `configure_magicblock_private_payment_corridor` and `settle_magicblock_private_payment_corridor` gate private payment execution. | Configure tx `4UiUumtuGeDciojDA26PkQby7RFiTNb12UG4ACcvGMGfQj24PUPxK5Apeno7EY8mbCvq8nR6h6nfxDcBpjPvGvPj`; settle tx `22XW8XVhWwQtChNQK2aEqXv5BVBbckxUmu4NsisoZQW21KA5ii87gVNUTcNoZ9e1vYKnHmm62qP1girpzVXWN1WY`. | `/services/magicblock-private-payments`, `/judge` | Repeat corridor settlement with production endpoint policy, monitoring, and incident response. |
| Evidence-gated payout | `executeConfidentialPayoutPlanV3` consumes REFHE and MagicBlock evidence before token motion. | Execute tx `2a8sHWgiVCZkstybMff2M9R6DVU4Y96Rfsg8mqYs7K3xcYSEG1zMcq2iSTNwLD6FgfXvxxxWpwEP9Tbyin47RXvE`; treasury `60000000 -> 10000000`; recipient `0 -> 50000000`. | `/judge`, `/proof` | Production asset allowlist, real payroll policy, monitoring alerts, and selective-disclosure export. |
| Ika / 2PC-MPC | Ika SDK and Solana pre-alpha approval route are documented and separated from final dWallet signing claims. | Sui Testnet network encryption key `0xe7c79a60931299e110297554fc02e0a0e095e96778775092c97f07a1bd1337cc`; pre-alpha program `87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY`. | `/services/encrypt-ika-operations`, `/api/v1/ika/solana-prealpha/readiness` | Funded dWallet DKG, final 2PC-MPC signature, and cross-chain policy proof. |
| Umbra private payout lane | Recipient-private claim-style UX and relayer health surfaces are productized. | `/api/v1/umbra/relayer/health` and route-level claim boundary are documented. | `/services/umbra-confidential-payout` | SDK-generated proof account data, UTXO slot data, claim submission, and compliance viewing-key workflow. |
| Jupiter treasury route | Developer Platform `/order` mode is supported behind `NEXT_PUBLIC_JUPITER_ORDER_ENDPOINT` with Lite Quote fallback. | Local API smoke returned HTTP 200 and request ID without exposing the API key. | `/services/jupiter-treasury-route`, `docs/DX-REPORT-JUPITER.md` | Governed signing, execution signature, slippage policy, and production key vaulting. |
| QuickNode read-node and stream | Read-node, Programs + Logs stream intake, and readiness JSON are wired for proof surfaces. | `/api/v1/readiness`, `/api/v1/quicknode/stream/stats`, verification scripts keep secrets out of public docs. | `/api-status`, `/analytics`, `/services/runtime-infrastructure` | Stream delivery evidence, alert owners, transcript retention, and production RPC failover. |
| Intelligence layer | GoldRush, Covalent, Birdeye-style market context, and QVAC decision support feed the review surfaces. | Intelligence routes and reviewer proof packets expose decision context without replacing signatures. | `/intelligence`, `/judge` | Production provider keys in server vault, latency budgets, and signed action recommendations. |

## Mainnet Cutover Sequence

1. Execute Squads proposal index `3` after `2026-05-27T02:25:39Z`.
2. Record DAO authority handoff signature and account readout.
3. Record treasury-operator authority handoff signature and account readout.
4. Run the integrated ZK proposal flow and record verifier-program boundary evidence.
5. Repeat REFHE + MagicBlock settlement with production endpoint policy and monitoring owners.
6. Close Umbra claim proof account data and Ika funded dWallet proof only when those artifacts exist.
7. Enable production RPC and stream alert delivery with transcript evidence.
8. Freeze a release candidate, run `npm run verify:all`, `npm run check:mainnet`, and publish the mainnet proof package.

## Verification Commands

```bash
npm run verify:mainnet-cryptographic-readiness
npm run verify:cryptographic-onchain-matrix
npm run verify:frontier-track-closure
npm run verify:mainnet-proof-package
npm run check:mainnet
```

## Public Language Boundary

Safe public wording:

- "PrivateDAO is a Solana Testnet production-candidate for private governance, encrypted payroll, confidential payouts, and wallet-first operations."
- "REFHE and MagicBlock settlement gates have finalized Testnet receipts."
- "ZK has local proof discipline plus a standalone Solana Testnet verifier receipt; integrated governance execution is staged behind Squads timelock."
- "Ika and Umbra lanes are productized with explicit proof boundaries; final dWallet signing and full claim settlement are not claimed until recorded."

Forbidden until recorded:

- "Mainnet funds are live."
- "Final Ika 2PC-MPC signing is complete."
- "Umbra full claim settlement is complete."
- "External audit is complete."
- "Monitoring is production-delivering incidents to named owners" unless delivery evidence is attached.

## Reviewer Shortcut

Open these in order:

1. `/documents/mainnet-cryptographic-readiness-ladder-2026-05-25`
2. `/documents/cryptographic-onchain-matrix-2026-05-25`
3. `/judge`
4. `/security`
5. `/services/encrypt-ika-operations`
6. `/services/magicblock-private-payments`

The intended reading is simple: PrivateDAO has real Testnet encrypted execution, real custody controls, real proof surfaces, and a precise cutover ladder to mainnet without overstating unfinished external rails.
