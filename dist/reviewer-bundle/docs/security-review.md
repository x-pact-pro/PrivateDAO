# Security Review Surface

PrivateDAO now includes a reviewer-visible hardening layer focused on realistic Solana governance misuse, not just happy-path coverage.

## Scope covered in the repository

- lifecycle bypass rejection
- commit-reveal invalid reveal paths
- replay and duplicate execution prevention
- signer and authority misuse rejection
- PDA and account substitution rejection
- treasury miswiring rejection
- delegation misuse guards across product surfaces
- finalize and execute account-binding rejection
- timing boundary and lifecycle invariant checks
- mainnet cutover readiness checks
- non-breaking zk stack proof generation and verification
- zk threat-extension reasoning and registry-backed review integrity
- additive Governance Hardening V3 and Settlement Hardening V3 proof on Devnet
- 50-wallet Devnet stress and adversarial execution evidence
- multi-proposal isolation evidence
- finalize and execute collision-race evidence
- rpc failover and stale-blockhash recovery evidence
- wallet compatibility matrix evidence
- read-only devnet canary evidence

## Reviewer-first proof points

- Core program: `programs/private-dao/src/lib.rs`
- Core behavior tests: `tests/private-dao.ts`
- End-to-end lifecycle and treasury tests: `tests/full-flow-test.ts`
- Demo walkthrough: `tests/demo.ts`
- 50-wallet load report: `docs/load-test-report.md`
- multi-proposal isolation report: `docs/devnet-multi-proposal-report.md`
- race report: `docs/devnet-race-report.md`
- resilience report: `docs/devnet-resilience-report.md`
- wallet compatibility matrix: `docs/wallet-compatibility-matrix.generated.md`
- devnet canary: `docs/devnet-canary.generated.md`
- Devnet transaction registry: `docs/devnet-tx-registry.json`
- Dedicated V3 live proof: `docs/test-wallet-live-proof-v3.generated.md`
- Governance Hardening V3: `docs/governance-hardening-v3.md`
- Settlement Hardening V3: `docs/settlement-hardening-v3.md`
- Adversarial report: `docs/adversarial-report.json`
- ZK proof registry: `docs/zk-proof-registry.json`
- Mainnet gate: `scripts/check-mainnet-readiness.sh`
- Judge audit note: `docs/judge-technical-audit.md`
- Mainnet readiness note: `docs/mainnet-readiness.md`

## Hardening highlights

## Token Role in Governance Security

The governance token is part of the protocol's security posture, not a detached branding layer.

Its role in governance security is to:

- reduce proposal spam by tying participation to a governance-access surface
- increase accountability by linking proposal and voting activity to token-governed participation
- reinforce proposal validity by making lifecycle entry more structured
- support lifecycle correctness by narrowing governance actions to economically aligned participants

This does not replace lifecycle checks, signer validation, replay protection, or account-binding enforcement. It complements them by making the governance surface less noisy and more accountable before proposals ever reach finalize or execute.

The live token surface also has an explicit program boundary:

- Current PrivateDAO Testnet governance program id: `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`
- Legacy Devnet baseline program id: `5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx`
- PDAO token program id: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`

This is expected. The second id belongs to the Token-2022 mint surface, not to a duplicate PrivateDAO governance deployment.

## Reviewer Clarification Points

These clarifications are included because partial repo scans often overstate or misread a few boundaries:

- Browser-native commit flows generate salts in memory and require the voter to save or export them. The review surface does not persist salts in `localStorage` or `sessionStorage`.
- Raw commitment preimages are proposal-bound as `sha256(vote_byte || salt_32 || proposal_pubkey_32 || voter_pubkey_32)`, and replay remains proposal-scoped through the `VoteRecord` PDA, reveal account binding, and `has_committed` / `has_revealed` lifecycle flags.
- Keeper reveal authority is proposal-scoped and optional. It can only submit the exact reveal for that stored commitment, and successful reveal clears the stored keeper authority from the record.
- In the baseline path, reveal rebate is paid from the proposal account only when the proposal account stays rent-safe. In `V3`, rebate is paid from a dedicated reveal rebate vault PDA instead. The DAO treasury is not the rebate source in either path.
- The current zk stack is an additive Groth16 companion layer. It improves reviewer-visible proof surfaces today, but the deployed on-chain program remains the enforcement boundary.

### Lifecycle and replay safety

- proposals cannot execute before finalize
- proposals cannot execute before timelock unlock
- proposals cannot execute twice
- invalid proposal states are rejected for finalize and execute
- failed execution paths leave execution state unmutated

### Commit-reveal safety

- reveal before commit is rejected
- reveal with mismatched salt or mismatched vote payload is rejected
- reveal by the wrong signer is rejected
- reveal outside the allowed window is rejected
- successful reveal clears any stored keeper authority from that voter record
- voter records remain proposal-bound and cannot be reused across proposals
- cross-proposal replay is stopped by proposal-bound commitments, proposal-bound voter records, and lifecycle flags

### Treasury and account wiring safety

- `SendSol` enforces intended recipient wiring
- `SendToken` enforces:
  - expected mint alignment
  - treasury token source owned by the treasury PDA
  - destination owner matches the configured recipient
  - source and destination are not duplicated
- unsupported `CustomCPI` actions are rejected rather than marked executed
- failed treasury execution attempts do not partially mark proposals as executed

### Signer and delegation safety

- self-delegation is rejected
- unauthorized delegated voting is rejected
- delegated commits cannot consume a delegation PDA from another proposal
- on-chain marker accounts reject direct-commit and delegation overlap for the same proposal

### Finalize and execute binding safety

- finalize rejects mismatched `dao` / `proposal` pairings
- execute rejects treasury PDAs that belong to another DAO even when the treasury account is valid and funded
- failed finalize and execute attempts leave proposal state unchanged
- permissionless finalize and execute remain supported, but only when signer and account bindings are exact

### Timing and invariant safety

- commit still works immediately before voting end and is rejected once the commit window is closed
- reveal opens exactly when the voting window ends and not before
- finalize opens at reveal end and not before
- execute opens at timelock unlock and not before
- failed finalize and execute attempts do not advance proposal lifecycle fields
- `revealed => committed` is asserted directly through voter records
- `reveal_count <= commit_count` is asserted directly
- successful execute is the only tested path that sets `is_executed = true`

## Honest current boundary

One protocol-level boundary remains intentionally documented instead of hidden:

- quadratic weighting still assumes an external sybil-resistance policy; the on-chain program does not claim to solve identity on its own
- `CustomCPI` remains outside the live treasury execution surface and is rejected when attempted

## Mainnet transition stance

The repository is stronger and safer than before, but it is still honest about the last mile:

- mainnet transition is operationally reachable
- external audit completeness is not claimed
- production monitoring and release controls still matter
- Android runtime verification still requires a real Android SDK/device environment

This note exists so reviewers can verify that the hardening work is concrete, visible, and bounded by what the current protocol actually supports.

## Formal Security Reasoning Layer

The repository now includes a formal audit-simulation layer:

- Threat model: `docs/threat-model.md`
- Security coverage map: `docs/security-coverage-map.md`
- Failure modes: `docs/failure-modes.md`
- Replay analysis: `docs/replay-analysis.md`

## Failure Mode Summary

The failure-mode review focuses on realistic misuse:

- mismatched treasury execution
- wrong DAO context for finalize
- wrong voter or keeper reveal
- cross-proposal delegation misuse
- malformed but valid-looking token accounts
- invalid PDA substitution
- partial execution attempts

The expected safe outcome in each case is rejection without unintended state advancement or duplicate treasury effects.

## Multi-Wallet Devnet Evidence

The repository now also includes a wave-based Devnet stress harness that exercises the live protocol with:

- 50 persistent wallets
- 35 voter wallets
- 10 adversarial wallets
- 5 zk tester wallets
- public Devnet transaction evidence

The generated artifacts bind:

- wallet funding and role assignment
- DAO bootstrap and proposal anchors
- wave-based commit and reveal execution
- finalize and execute timing checks
- replay, signer, delegation, and treasury miswiring rejections
- off-chain Groth16 proof generation for the zk tester slice

This does not replace the instruction-level tests. It complements them with live multi-wallet evidence on Devnet and explorer-verifiable transaction traces.

## Isolation And Collision Evidence

The repository now also includes extended Devnet reports that target adversarial surfaces not covered by a single-proposal wave run alone:

- `docs/devnet-multi-proposal-report.md` shows three live proposals inside one DAO, all executed successfully, while cross-proposal voter-record reuse, delegation-marker reuse, and mismatched reveal material are rejected.
- `docs/devnet-race-report.md` shows concurrent finalize and execute attempts against one live proposal, with exactly one winning finalize and one winning execute while the remaining attempts are rejected without partial execution drift.

These artifacts make proposal isolation and permissionless collision safety reviewer-visible with public Devnet transaction evidence, not only local integration tests.

## Runtime And RPC Resilience Evidence

The repository now also includes a Devnet resilience report focused on operator-grade recovery paths:

- `docs/devnet-resilience-report.md` shows fallback from an intentionally dead-end RPC endpoint to a healthy Devnet RPC.
- The same report also shows stale blockhash rejection followed by one rebuilt transaction on a fresh blockhash with a confirmed explorer-visible recovery transaction.

This does not change protocol logic. It proves that the surrounding execution tooling can recover from common Solana operator failure modes without ambiguous retries or silent drift in the reviewer-facing evidence package.

## Sustainable Operational Evidence

The repository now also includes lighter-weight runtime artifacts for sustained operator confidence:

- `docs/wallet-compatibility-matrix.generated.md` makes supported wallet classes and runtime fallback behavior explicit.
- `docs/devnet-canary.generated.md` provides a read-only Devnet signal for RPC health, canonical anchor visibility, and governance-mint supply visibility between heavier stress runs.
- `docs/runtime-evidence.generated.md` consolidates runtime attestation, wallet compatibility, Devnet canary, and resilience evidence into one reviewer-facing runtime package.

These artifacts do not replace the multi-wallet stress package. They reduce blind spots between heavy runs and make the browser/runtime side of the system more reviewable.

## Release Ceremony Evidence

The repository now also includes a reviewer-visible release-ceremony layer:

- `docs/release-ceremony.md`
- `docs/release-ceremony-attestation.generated.md`
- `docs/release-ceremony-attestation.generated.json`

This layer turns release discipline into inspectable evidence by binding:

- reviewed commit identity
- required release gates
- deployment and go-live attestations
- operator-facing cutover documents
- unresolved external blockers

It does not claim that mainnet release has happened. It makes the discipline around any future release auditable before that release exists.

## Release Drill Evidence

The repository now also includes a release-drill layer:

- `docs/release-drill.generated.md`
- `docs/release-drill.generated.json`
- `docs/review-automation.md`

This layer turns the release-ceremony surface into a repository-contained drill artifact that distinguishes:

- what already passes inside the repository
- what remains blocked by external audit and custody requirements
- which stages are simulated rather than live production events
- which repository commands and reviewer artifacts appear in the simulated execution trace

The repository now also exposes:

- `docs/mainnet-acceptance-matrix.generated.md`
- `docs/mainnet-proof-package.generated.md`

These separate repository-accepted surfaces from external blockers so mainnet-readiness discussion stays explicit and reviewer-friendly.

## Additive V3 Hardening Layer

The repository now also includes a stricter additive path that does not reinterpret legacy objects:

- `Governance Hardening V3` adds token-supply quorum snapshots and a dedicated reveal rebate vault
- `Settlement Hardening V3` adds payout caps, minimum evidence age, and proposal-scoped settlement policy snapshots
- `docs/test-wallet-live-proof-v3.generated.md` proves both paths on Devnet with real execute transactions

This is a meaningful hardening extension to the baseline proof surface, but it remains a Devnet proof package rather than a production-custody or mainnet claim.

## Replay Summary

Replay analysis now documents:

- repeated commit attempts
- repeated reveal attempts
- repeated finalize attempts
- repeated execute attempts
- reordered-account replay attempts
- altered-signer replay attempts
- cross-proposal state reuse

Current reasoning supports that no replay path in tested behavior produces duplicate execution effects.

## ZK Stack Summary

The repository now includes a real zero-knowledge companion stack that does not change the deployed protocol surface:

- Circom circuit: `zk/circuits/private_dao_vote_overlay.circom`
- Circom circuit: `zk/circuits/private_dao_delegation_overlay.circom`
- Circom circuit: `zk/circuits/private_dao_tally_overlay.circom`
- Groth16 setup and verification path
- sample witness generation
- proof generation
- proof verification through `npm run zk:all`
- explicit zk layer framing: `docs/zk-layer.md`
- layered zk stack note: `docs/zk-stack.md`
- zk threat extension: `docs/zk-threat-extension.md`
- zk assumption matrix: `docs/zk-assumption-matrix.md`
- zk capability matrix: `docs/zk-capability-matrix.md`
- zk verification flow: `docs/zk-verification-flow.md`

The current zk stack proves:

- vote form validity and eligibility
- delegation activation and delegatee binding
- weighted tally integrity over a reveal sample
- proposal-scoped nullifier bindings across the live proof layers

This is intentionally additive. It strengthens the protocol's future privacy path without changing current instruction interfaces or deployed assumptions.

The review surface also now includes a zk-specific threat extension so auditors can inspect the additive proof layer with the same discipline used for the live protocol surface.

## Cryptographic Integrity Summary

The repository now also includes a sha256-based artifact integrity layer over the highest-signal zk and review artifacts:

- generated manifest: `docs/cryptographic-manifest.generated.json`
- integrity note: `docs/cryptographic-integrity.md`
- build command: `npm run build:cryptographic-manifest`
- verification command: `npm run verify:cryptographic-manifest`

The current integrity manifest covers:

- zk circuit source
- zk verification key
- zk sample proof and public inputs
- proof registry
- devnet release manifest
- live proof note
- submission registry
- PDAO token surface

This does not replace protocol security. It reduces silent drift and makes reviewer-facing evidence tamper-evident.

## Supply-Chain And Cryptographic Posture

The repository now also exposes a reviewer-visible dependency and manifest surface:

- `docs/cryptographic-posture.md`
- `docs/artifact-freshness.md`
- `docs/supply-chain-security.md`
- `docs/supply-chain-attestation.generated.md`
- `docs/supply-chain-attestation.generated.json`

The generated supply-chain attestation binds:

- `Cargo.toml`
- `Cargo.lock`
- `Anchor.toml`
- `package.json`
- `package-lock.json`
- `yarn.lock`

This does not replace external dependency auditing or registry trust review. It does make lockfile drift, manifest tampering, and reviewer-package inconsistency materially easier to detect inside the repository itself.

## Sustainable Review Automation

The repository now also exposes the operational automation that keeps the reviewer surface coherent:

- `docs/review-automation.md`
- `docs/artifact-freshness.md`

This layer makes two things explicit:

- the reviewer surface is rebuilt deterministically from repository builders
- generated reviewer artifacts and the packaged review bundle must remain fresh relative to their builders

This does not claim that operational discipline replaces external audit. It does make repository-contained review evidence harder to let drift silently between changes.

## Remaining Real-World Risks

The audit-simulation layer does not hide residual realities:

- off-chain timing metadata is not hidden by commit-reveal
- Groth16 witness generation and proving remain off-chain; the live program now records proposal-bound zk proof anchors and parallel on-chain verification receipts, but commit-reveal remains the canonical enforcement path today
- this shell host does not expose AVX2, so local-validator Anchor suites must run on an AVX2-capable machine while the portable core suite remains the canonical green check here
- external audit completeness is still not claimed
- `CustomCPI` remains intentionally unsupported rather than arbitrary on-chain execution

## Confidence Level

Current confidence level: **high for tested lifecycle and treasury safety on the implemented protocol surface**, with the remaining limits concentrated in:

- environment-dependent integration execution
- external review depth beyond repository-contained reasoning and tests
