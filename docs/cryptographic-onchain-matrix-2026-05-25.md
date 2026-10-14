# Cryptographic On-Chain Matrix — 2026-05-25

PrivateDAO is now tracked through one cryptographic operating matrix. The purpose is simple: every encryption, privacy, custody, and intelligence lane must say what is live on Solana Testnet, what is locally verifiable, what is staged behind Squads timelock, and what is not claimed yet.

This is a Testnet operating packet for the current Anchor `1.0.1` program:

- Program ID: `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`
- ProgramData: `FKyt5DcmRQcCF8kzMGjCvfGb3ZPHMQnH1SqiG9Mi8xEc`
- Squads multisig: `thHmF7VYNtxE1MaDzYXbfPCiq13RF6JwuWnjvDZuSmF`
- Squads vault authority: `CALHrBqx6jbzcPn2NVcinqSAHeod65v9LcDuTxsdPqBv`
- Current binary proposal: Squads proposal index `3`
- Current binary timelock release: `2026-05-27T02:25:39Z`

## Executive Reading

PrivateDAO does not treat privacy as a slogan. It separates the protected payload from the public proof trail:

- governance intent can stay protected until reveal or verification time
- confidential payout settlement can be gated before execution
- ZK proofs can be generated and verified locally, with standalone on-chain verifier evidence already deployed
- upgrade authority is controlled by Squads and enforced by a timelock that cannot be bypassed by signers
- data and intelligence providers supply decision context, telemetry, and reviewer evidence without becoming key custody authorities

## Matrix

### Squads custody

Current state: live authority control.

Evidence: vault `CALHrBqx6jbzcPn2NVcinqSAHeod65v9LcDuTxsdPqBv`, multisig `thHmF7VYNtxE1MaDzYXbfPCiq13RF6JwuWnjvDZuSmF`, and current proposal index `3` approved 2-of-3 while waiting for timelock release.

Product meaning: protocol upgrades are no longer single-key operations.

Boundary: DAO operating handoff waits for proposal index `3` execution after `2026-05-27T02:25:39Z`.

### Timelock enforcement

Current state: live security control.

Evidence: execution before release fails with Squads `TimeLockNotReleased / 6021`.

Product meaning: even approved signers cannot bypass the waiting period.

Boundary: this is a Testnet custody proof, not mainnet launch completion.

### ZK local Groth16

Current state: verified local cryptographic path.

Evidence: `npm run zk:all`, `npm run verify:zk-consistency`, `npm run verify:zk-negative`, and `docs/zk-capability-matrix.md`.

Product meaning: vote, delegation, and tally proof paths have real artifacts and tamper rejection.

Boundary: local/off-chain proof verification is not the same as integrated verifier CPI.

### Standalone ZK verifier

Current state: deployed on Solana Testnet.

Evidence: program `5H7Afyqdh5yPekkZJ5UM2j3HNB2bRvU8aVv8XoqeAW1j` and receipt tx `zwqNsA3kNP1mgcaS6zNdR92LLdssFULXfsRdkMK3UxraKLM6wYDoPaWCwV3J9PqApK5xJJH8TpxsGyCRcdEah67`.

Product meaning: PrivateDAO has an on-chain BN254/Groth16 verifier receipt path for reviewers.

Boundary: the verifier is standalone; native governance CPI integration is staged, not yet executed.

### Program-integrated ZK path

Current state: staged behind Squads timelock.

Evidence: current binary buffer `HXcaUbT7Q8euufUbDKuhoRkSSYQPwUwmhw69TdePV6uY` and buffer authority transfer tx `4g7SaVf6yXNouGCvxqDnSsQGD7yuPgJr9fLCSWhd3BaN1uQJgZy5LQ8iZZhMozSy83X8CBKjXfsjZTgdiZVq6fqB`.

Product meaning: the stricter protocol path is prepared under multisig release discipline.

Boundary: do not claim this as executed until proposal index `3` is executed after timelock.

### REFHE confidential envelope

Current state: on-chain active as settlement gate.

Evidence: configure tx `3fygnmHzFpRQEbHq9q6u3djBnkTEcYz9y1TSwxDmbnuemshrMwLmy9CqpjifjRb7SmW3DbmXrkyq35cnjU7mMSPi`, settle tx `5TmS2AcpAmifcoG97U63Unzy7wt7B2NfyhBRs8Z6C4r1eqcWthEqf3GLcZXQ33sVYHf9YwfvBNhZD8ZZdt4HRwEY`, and envelope `5UHy5XTrYdTUn9Wfwmeur7kMp2rLneyuZZQJf1mYasy3`.

Product meaning: confidential operations must pass a governed encryption-envelope gate before payout execution.

Boundary: this does not claim full on-chain FHE computation re-execution.

### MagicBlock private corridor

Current state: on-chain active as execution corridor.

Evidence: configure tx `4UiUumtuGeDciojDA26PkQby7RFiTNb12UG4ACcvGMGfQj24PUPxK5Apeno7EY8mbCvq8nR6h6nfxDcBpjPvGvPj`, settle tx `22XW8XVhWwQtChNQK2aEqXv5BVBbckxUmu4NsisoZQW21KA5ii87gVNUTcNoZ9e1vYKnHmm62qP1girpzVXWN1WY`, and corridor `CwB641sj7R6GAL84kf5xThi4zjN9Edx5S7yXz7GDuo85`.

Product meaning: private payments can move through an explicit settlement corridor instead of a UI-only label.

Boundary: corridor receipts are Testnet operational evidence.

### Evidence-gated payout

Current state: executed on Solana Testnet.

Evidence: execute tx `2a8sHWgiVCZkstybMff2M9R6DVU4Y96Rfsg8mqYs7K3xcYSEG1zMcq2iSTNwLD6FgfXvxxxWpwEP9Tbyin47RXvE`, treasury token balance `60000000 -> 10000000`, and recipient token balance `0 -> 50000000`.

Product meaning: the encrypted settlement lane has proof of execution, not only proof of configuration.

Boundary: token motion is Testnet and should be presented as such.

### IKA / 2PC-MPC

Current state: live readiness and approval route prepared.

Evidence: Sui Testnet latest network encryption key `0xe7c79a60931299e110297554fc02e0a0e095e96778775092c97f07a1bd1337cc`, Solana pre-alpha program `87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY`, and route `ika-approval-e58f98a89fa650dcc587a848`.

Product meaning: PrivateDAO has a concrete dWallet path for threshold-controlled signing and cross-chain policy work.

Boundary: No funded IKA dWallet DKG or final 2PC-MPC signature is claimed in this run.

### Token-2022 governance asset

Current state: live fixed-supply Testnet token.

Evidence: mint ``, supply `1,000,000 PDAO`, and mint authority disabled.

Product meaning: governance and reward lanes have a fixed Testnet asset for reviewer-visible flows.

Boundary: Testnet token has no monetary value.

### QuickNode stream/read-node

Current state: data and telemetry lane.

Evidence: Testnet endpoint and stream are configured for read-node and Programs + Logs routing.

Product meaning: backend telemetry can feed visitor counters, live proof surfaces, and operational monitoring.

Boundary: RPC tokens and stream secrets stay out of repository and public docs.

### GoldRush / Covalent / QVAC intelligence

Current state: decision-support lane.

Evidence: indexed into the intelligence and reviewer evidence surfaces.

Product meaning: intelligence helps turn raw chain activity into explainable policy, treasury, and risk decisions.

Boundary: these providers do not replace wallet signatures or protocol authority checks.

## What Changed Since The Older Devnet Narrative

The older Devnet material is now treated as archived proof history. The current reviewer path should lead with:

- Anchor `1.0.1`
- Solana Testnet
- Program `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`
- REFHE and MagicBlock Testnet settlement gates
- evidence-gated token motion
- Squads proposal index `3` waiting for enforced timelock release

Any surface that still references the old Devnet program as the primary product state should be considered stale and routed to this matrix or the current network state document.

## Verification Commands

```bash
npm run verify:encrypted-integrations-activation
npm run verify:cryptographic-onchain-matrix
npm run verify:test-wallet-live-proof:v3
npm run verify:zk-standalone-verifier
npm run verify:operation-ledger
```

## Reviewer Shortcut

Open these in order:

1. `/documents/engineering-proof-ledger-2026-06-11`
2. `/engineering-proof-ledger.json`
3. `/documents/cryptographic-onchain-matrix-2026-05-25`
4. `/documents/privacy-encryption-engineering-report-2026-06-11`
5. `/documents/intelligence-provider-engineering-report-2026-06-11`
6. `/documents/treasury-asset-oracle-engineering-report-2026-06-11`
7. `/documents/infrastructure-telemetry-engineering-report-2026-06-11`
8. `/documents/magicblock-engineering-report-2026-06-11`
9. `/judge`

The expected reading is: encrypted operations have real Testnet execution evidence; ZK has both local proof discipline and a standalone on-chain verifier receipt; the newest integrated binary is protected by Squads timelock until the scheduled release.

## Specialist Report Links

- Ika / 2PC-MPC / Encrypt: `/documents/privacy-encryption-engineering-report-2026-06-11` and `/services/encrypt-ika-operations/`
- REFHE: `/documents/privacy-encryption-engineering-report-2026-06-11` and `/services/refhe-payroll-proof/`
- ZK / Commit-reveal: `/documents/privacy-encryption-engineering-report-2026-06-11`, `/documents/zk-capability-matrix`, and `/try/`
- Verification / proof center: `/documents/engineering-proof-ledger-2026-06-11` and `/proof/?judge=1`
- Treasury / assets / stablecoins / oracle: `/documents/treasury-asset-oracle-engineering-report-2026-06-11` and `/treasury/`
- Intelligence / QVAC / provider router: `/documents/intelligence-provider-engineering-report-2026-06-11` and `/intelligence/`
- MagicBlock: `/documents/magicblock-engineering-report-2026-06-11` and `/services/magicblock-private-payments/`
- Infrastructure / QuickNode / Supabase / AWS: `/documents/infrastructure-telemetry-engineering-report-2026-06-11` and `/api-status/`
