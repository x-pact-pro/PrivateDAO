# Verification Gates

PrivateDAO maintains a reviewer-visible verification layer so the repository can be checked without trusting prose alone.

## Core Gates

Run these from the repository root.

### Strategy Surface

```bash
npm run verify:strategy-surface
```

Checks that the strategy-facing review package is present and internally coherent.

### Submission Registry

```bash
npm run verify:submission-registry
```

Checks that the canonical submission registry contains the required packages, links, gates, and core identity values.

### Registry Consistency

```bash
npm run verify:registry-consistency
```

Checks that the submission registry and proof registry stay aligned on canonical live references.

### Generated Artifacts

```bash
npm run verify:generated-artifacts
```

Checks that generated reviewer artifacts such as the audit packet and review attestation exist and remain structurally valid.

### Devnet Stress Harness

```bash
npm run test:devnet:all
```

Runs the full 50-wallet Devnet harness, then rebuilds and verifies the reviewer artifacts that bind:

- wallet registry
- DAO bootstrap record
- explorer transaction registry
- adversarial rejection report
- zk proof registry
- performance metrics
- load-test report

This is the canonical reproducible multi-wallet execution command for the live Devnet package.

### Devnet Extended Isolation And Race Harness

```bash
npm run test:devnet:multi
npm run test:devnet:race
npm run test:devnet:extended
```

These commands extend the canonical 50-wallet run with:

- three live proposals executed in one DAO to prove proposal isolation
- cross-proposal voter-record and delegation-marker rejection evidence
- concurrent finalize races with one valid winner
- concurrent execute races with one valid winner

The generated reviewer-facing artifacts are:

- `docs/devnet-multi-proposal-report.json`
- `docs/devnet-multi-proposal-report.md`
- `docs/devnet-race-report.json`
- `docs/devnet-race-report.md`

### Devnet Resilience Harness

```bash
npm run test:devnet:resilience
npm run verify:devnet:resilience-report
```

This command adds operator-grade recovery evidence on Devnet for:

- fallback from a dead-end RPC endpoint
- stale blockhash rejection
- rebuilt transaction recovery on a fresh blockhash

The generated reviewer-facing artifacts are:

- `docs/devnet-resilience-report.json`
- `docs/devnet-resilience-report.md`

### Cryptographic Integrity

```bash
npm run verify:cryptographic-manifest
```

Checks that the sha256 manifest covering zk artifacts, live-proof anchors, and generated review materials still matches the canonical files on disk.

### Mainnet Readiness Report

```bash
npm run build:mainnet-readiness-report
npm run verify:mainnet-readiness-report
```

Builds and verifies the generated readiness report that summarizes what is already verified inside the repository and what still remains external before any production cutover should be claimed.

### Mainnet Go-Live Checklist

Review:

- `docs/mainnet-go-live-checklist.md`

### ZK Phase C Hardening

Review:

- `docs/phase-c-hardening.md`

This document makes the current boundary explicit:

- Phase A is live
- Phase B is live
- `zk_enforced` is usable
- `zk_enforced` is not yet promoted as the strongest production path

Related review docs:

- `docs/zk-verifier-strategy.md`
- `docs/zk-enforced-threat-review.md`
- `docs/zk/enforced-runtime-evidence.md`
- `docs/zk/enforced-operator-flow.md`
- `docs/zk-external-audit-scope.md`
- `docs/canonical-verifier-boundary-decision.md`
- `docs/zk/external-closure.generated.md`

Commands:

```bash
npm run build:zk-enforced-runtime
npm run verify:zk-enforced-runtime
npm run build:zk-external-closure
npm run verify:zk-external-closure
```

This checklist is the shortest go or no-go surface for production cutover. It does not replace the generated proof package; it compresses the final blockers into one operator-facing checklist.

### Deployment Attestation

```bash
npm run build:deployment-attestation
npm run verify:deployment-attestation
```

Builds and verifies a machine-readable deployment attestation that binds the canonical program, governance anchors, token surface, readiness status, and verification gates into one review artifact.

### Go-Live Attestation

```bash
npm run build:go-live-attestation
npm run verify:go-live-attestation
```

Builds and verifies a machine-readable go-live decision artifact that makes the current mainnet block conditions explicit instead of leaving them implicit in prose.

### Runtime Attestation

```bash
npm run build:runtime-attestation
npm run verify:runtime-attestation
```

Builds and verifies a machine-readable runtime summary for supported Devnet wallets, the diagnostics page, and the reviewer-visible wallet runtime surface.

### Runtime Surface

```bash
npm run verify:runtime-surface
```

Checks that the live diagnostics page, supported wallet labels, runtime attestation, and PDAO/runtime anchors stay aligned in the frontend itself.

### Runtime Evidence

```bash
npm run build:runtime-evidence
npm run verify:runtime-evidence
```

Builds and verifies a generated runtime-evidence package that consolidates runtime attestation, wallet compatibility, Devnet canary, and resilience behavior into one reviewer-facing summary.

### Real-Device Runtime Intake

```bash
npm run build:real-device-runtime
npm run verify:real-device-runtime
```

Builds and verifies the reviewer-facing intake package for real desktop and mobile wallet captures. This package keeps the boundary honest: diagnostics and wallet matrices are useful, but real-device evidence is tracked separately until actual captures are committed.

### Operational Evidence

```bash
npm run build:operational-evidence
npm run verify:operational-evidence
```

Builds and verifies a generated operational-evidence package that consolidates:

- full 50-wallet lifecycle execution
- zk companion proof activity
- adversarial rejection coverage
- multi-proposal isolation
- finalize and execute race behavior
- RPC interruption and stale-blockhash recovery

This package is the shortest reviewer-facing path for the project's preserved Devnet execution evidence, while the current operating path is Testnet.

### Extended Devnet Profiles

```bash
npm run test:devnet:100
npm run test:devnet:500
```

Runs the same Devnet stress harness at larger wallet counts while writing to profile-specific artifacts so the canonical 50-wallet reviewer package remains stable and explorer-visible.

### Wallet Compatibility Matrix

```bash
npm run build:wallet-matrix
npm run verify:wallet-matrix
```

Builds and verifies a generated wallet compatibility matrix that documents the detected providers, connection fallback, transaction fallback, diagnostics visibility, and honest runtime-QA boundary for each supported wallet class.

### Devnet Canary

```bash
npm run build:devnet-canary
npm run verify:devnet-canary
npm run ops:canary
```

Builds and verifies a lightweight read-only Devnet canary that checks:

- primary and fallback RPC health
- canonical PrivateDAO anchor accounts
- governance mint supply visibility
- sustainable operational readiness between heavier stress runs

### Supply-Chain Attestation

```bash
npm run build:supply-chain-attestation
npm run verify:supply-chain-attestation
```

Builds and verifies a generated supply-chain attestation that binds the top-level Cargo, Anchor, npm, and Yarn manifests and lockfiles into the reviewer-visible integrity surface.

### Release Ceremony Attestation

```bash
npm run build:release-ceremony-attestation
npm run verify:release-ceremony-attestation
```

Builds and verifies a generated release-ceremony attestation that ties reviewed commit identity, required release gates, operator-facing cutover docs, and unresolved external blockers into one reviewer-visible artifact.

### Release Drill Evidence

```bash
npm run build:release-drill
npm run verify:release-drill
```

Builds and verifies a repository-simulated release drill that makes the pre-cutover and blocked-external stages explicit rather than leaving them implied.
The generated trace now also records which repository commands and reviewer-visible artifacts participated in the simulated release path.

### Mainnet Acceptance Package

```bash
npm run build:mainnet-acceptance-matrix
npm run verify:mainnet-acceptance-matrix
npm run build:mainnet-proof-package
npm run verify:mainnet-proof-package
```

Builds and verifies the reviewer-facing acceptance matrix and proof package that separate repository-accepted surfaces from external blockers such as audit, real-device QA, and live rollout.

### Artifact Freshness

```bash
npm run verify:artifact-freshness
```

Rebuilds the deterministic generated reviewer artifacts and packaged review bundle, then rejects drift between committed outputs and the current builders.

### ZK Registry

```bash
npm run build:zk-registry
npm run verify:zk-registry
```

Builds and verifies the machine-readable registry for the live Circom and Groth16 stack, including artifact paths, public signal counts, and per-layer commands.

### ZK Transcript

```bash
npm run build:zk-transcript
npm run verify:zk-transcript
```

Builds and verifies the reviewer-readable zk transcript that carries the proving system, ptau reference, per-layer commands, and tracked artifact hashes.

### ZK Attestation

```bash
npm run build:zk-attestation
npm run verify:zk-attestation
```

Builds and verifies a machine-readable zk attestation that binds the registry, transcript, proving system, ptau, and per-layer proof artifacts into one reviewer-facing summary.

### ZK Docs

```bash
npm run verify:zk-docs
```

Checks that the zk reviewer docs stay aligned on layer names, replay boundaries, and verification commands.
This includes:

- threat extension
- assumption matrix
- capability matrix
- verification flow

### ZK Consistency And Tamper Rejection

```bash
npm run verify:zk-consistency
npm run verify:zk-negative
```

Checks that recomputed public signals match the stored outputs and that tampered public signals or proof objects are rejected.

### Live Proof

```bash
npm run verify:live-proof
```

Checks that the live-proof document stays aligned with the canonical proof registry and expected devnet evidence.

The wider review surface also tracks the documented Devnet governance-token profile:

- `docs/pdao-token.md`
- `docs/token.md`

### Token Presence Gate

The token presence gate confirms that governance identity and structured participation are visible in the reviewer surface.

This means the repository should make clear:

- why the governance token exists
- how it supports proposal participation
- how it reinforces lifecycle accountability
- how it fits inside the wider governance security model

### Release Manifest

```bash
npm run verify:release-manifest
```

Checks that the release manifest, proof registry, README references, and generated handoff surfaces remain consistent.

### Program ID Consistency

```bash
npm run verify:program-id-consistency
```

Checks that the canonical PrivateDAO program id stays aligned across `Anchor.toml`, `declare_id!`, reviewer docs, the frontend constant, and supporting tooling.

### PDAO Token Surface

```bash
npm run build:pdao-attestation
npm run verify:pdao-surface
npm run verify:pdao-attestation
npm run verify:pdao-live
```


### Review Links

```bash
npm run verify:review-links
```

Checks that the canonical reviewer path remains visible from the README and the GitHub Pages frontend.

### Ops Surface

```bash
npm run verify:ops-surface
```

Checks that production-ops, incident-response, monitoring, cutover, and operator docs remain present.

### Review Surface

```bash
npm run verify:review-surface
```

Runs the broader review-surface gate, including release-manifest, live-proof, registry, and reviewer-link consistency.

## Unified Gate

```bash
npm run verify:all
```

This is the canonical repo-wide verification command. It rebuilds generated reviewer artifacts and runs the verification gates needed to keep the reviewer, operator, and proof surfaces coherent.

## CI Enforcement

The unified gate is also enforced in CI on push and pull request events, so review-surface drift is caught automatically.
