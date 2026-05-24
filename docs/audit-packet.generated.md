# Audit Packet

## Identity

- Project: PrivateDAO
- Current Testnet Program ID: `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`
- Legacy Devnet Program ID: `5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx`
- Deploy transaction: `2CMEujY1CKnC8rH8BuLy4GvwYk3zfqMfAKaUjybcAvRhS1dnzg3Zd3GeMttBp4vkUbu69GkQtr3TWgbmBqGY8cyC`
- Verification wallet: `4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD`

## Reviewer Entry Points

- Live frontend: https://privatedao.org/
- Proof Center: https://privatedao.org/proof/
- Judge Mode: https://privatedao.org/proof/?judge=1
- Security page: https://privatedao.org/security/
- YouTube pitch: https://youtu.be/iFTUe4CTWP0

## Legacy Devnet Anchors

- DAO PDA: `FZV9KmpeY1B31XvszQypp5T6nQN5C44JDLM4QWBEDvhx`
- Governance mint: `AZUkprJDfJPgAp7L4z3TpCV3KHqLiA8RjHAVhK9HCvDt`
- Treasury PDA: `AZUroiNeGAjNdD84eEHnAKHHFwqAFmkjr2g1eoF7Ek5c`
- Proposal PDA: `AegjmwkX1FknBJMDyH5yM6BMhyHsiUreNtz3d8iz3QrP`

## PDAO Token Surface

- Current PDAO mint: `DFYvBdivHCe4bSErgCiKm2RhwGEcZYbBPFQzLNr37Bie`
- Legacy Devnet PDAO mint: `AZUkprJDfJPgAp7L4z3TpCV3KHqLiA8RjHAVhK9HCvDt`
- PDAO program: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`
- PDAO token account: `CeXqKvdjrVYsPZEX2ysBNs6jubofEXEk4emE2qdS4pVg`
- PDAO metadata URI: `https://privatedao.org/assets/pdao-token.json`
- PDAO decimals: `9`
- PDAO initial supply: `1000000`
- PDAO attestation: `docs/pdao-attestation.generated.json`

### Program Boundary

- Current PrivateDAO governance program: `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`
- Legacy Devnet governance program: `5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx`
- PDAO token program: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`
- Boundary note: the Token-2022 program id belongs to the PDAO mint surface and does not indicate a second PrivateDAO governance program.

### PDAO Token Transactions

- `create-token`: `5hYpAkcK7h7sQBP8zCtejDi4F6z7wiurbuqDvgFbGNqjB6bPVu9BGab7iXiXUbBqLYT71VjCPwRjNyeVhqU7sCVE`
- `initialize-metadata`: `5uH1aCevn3GCcrzAUdtWxdQ8e8DngYsFB49nQxNvebB9abzGaMR4e3i2V18jophnuaHEaYGwxgFVUKYJ5cn7jWKN`
- `create-account`: `4TX4uB1YDYFPqyqA3krngaPNA8XWffWBU5gq5bEjAmWg7kv1ZoVFiZ8SdKyQewJGR2GqNxnj6fyYvzFMHs4EuizA`
- `mint-initial-supply`: `2aCsyLrFy2myKd4YR1Sqg6SigvH2F6ivaw86CnRDtHUPoAAFeENkVCAKLVbZM9rsKaH7tPsmWc8JsjMN5G6KB4To`
- `disable-mint-authority`: `2qFb2dKVEmD2hzmN9d6bajHuxLrk5aqKBvqM1Xb71VNTCfY39XgVV49koPigjoa2Vn41PNMmhp7qxK5KMBxNYvj4`

## Lifecycle Transactions

- `create-dao`: `5mcyVi3SbZo4hvpVMjH2eZH8FYeywdbbPz4ArmE5wHXH5X9EnP6gSq76ogBWYWVkVUwzrCchPnSdhGV1mFb48s5Q`
- `mint-voting`: `reused-existing-governance-balance`
- `deposit`: `KHWqfteEQhsH7hk7onQymbmnYdtF8rLoPWwchoQz5XFy8eY3DufeaX8DPiiVS1or7XkMVjMrbH2rsEhPtrPfzi9`
- `create-proposal`: `E93ikMXVJbtvz8ewAHA2BasZPVKYyUXe3Jy88h3b3AQubm7PSYFMNtDveBkRts7uYodwzb8cGZSVDoneKF16X2L`
- `commit`: `3RMbrcYGx297hgcTrov9PqtUqM97ZFg6A21qxmepTboLQAoXov6toY2QTa8yU1i8zmQPvjR3ArNGpvR3jat79uTP`
- `reveal`: `5L3cxZZgwMRnJTxNXLQCyjQMXSAi6bwoskFoKsfaQ7JycYUPuGCkWAkr7qA18WkddfNdSPB5qHt3FVSiHq2eDGh5`
- `finalize`: `4JSPRJQuSY5es74TcChBTzuGMMCr4RknHkmr6vFmtmbav4TRABDAnapmtgipYioEZzh4wmKfg2PMzZHCfJ7UruLG`
- `execute`: `x1vhP6H3Regi6WHYx6LUGbeo4CCbJxWwtUVucPVjonnymyccpM8mpb7t3UpQpqksXBU7PYGPd86cPnZLYwRzBn9`

## Additive Hardening V3

- Governance hardening note: `docs/governance-hardening-v3.md`
- Settlement hardening note: `docs/settlement-hardening-v3.md`
- Dedicated V3 live proof: `docs/test-wallet-live-proof-v3.generated.md`
- Dedicated V3 live proof JSON: `docs/test-wallet-live-proof-v3.generated.json`
- Boundary note: V3 evidence is a real Devnet packet for the stricter additive path, not a production-custody or mainnet claim

## Artifact Integrity

- Read node and indexer: `docs/read-node/indexer.md`
- RPC architecture: `docs/rpc-architecture.md`
- Backend operator flow: `docs/backend-operator-flow.md`
- Read-node snapshot: `docs/read-node/snapshot.generated.md`
- Colosseum competitive analysis: `docs/competitive/analysis.generated.md`
- Read-node architecture diagram: `docs/assets/read-node-architecture.svg`
- Confidential payouts note: `docs/confidential-payments.md`
- Confidential payroll flow: `docs/confidential-payroll-flow.md`
- Confidential payouts diagram: `docs/confidential-payments-diagram.md`
- Confidential payouts audit scope: `docs/confidential-payments-audit-scope.md`
- REFHE protocol: `docs/refhe-protocol.md`
- REFHE operator flow: `docs/refhe-operator-flow.md`
- REFHE security model: `docs/refhe-security-model.md`
- REFHE audit scope: `docs/refhe-audit-scope.md`
- REFHE flow diagram: `docs/assets/refhe-flow.svg`
- Integrity note: `docs/cryptographic-integrity.md`
- Cryptographic posture: `docs/cryptographic-posture.md`
- Supply-chain security note: `docs/supply-chain-security.md`
- Supply-chain attestation: `docs/supply-chain-attestation.generated.json`
- Cryptographic manifest: `docs/cryptographic-manifest.generated.json`
- Mainnet readiness report: `docs/mainnet-readiness.generated.md`
- Mainnet acceptance matrix: `docs/mainnet-acceptance-matrix.generated.md`
- Mainnet proof package: `docs/mainnet-proof-package.generated.md`
- Deployment attestation: `docs/deployment-attestation.generated.json`
- Go-live attestation: `docs/go-live-attestation.generated.json`
- Release ceremony note: `docs/release-ceremony.md`
- Release ceremony attestation: `docs/release-ceremony-attestation.generated.json`
- Release drill: `docs/release-drill.generated.json`
- PDAO attestation: `docs/pdao-attestation.generated.json`
- Algorithm: `sha256`
- Manifest entries: `145`
- Aggregate sha256: `b6e035466e78ac82356fd989a7d716a1eada9eb03b317204c870ad5bc20cc700`

## ZK Package

- ZK layer note: `docs/zk-layer.md`
- ZK stack note: `docs/zk-stack.md`
- ZK threat extension: `docs/zk-threat-extension.md`
- ZK assumption matrix: `docs/zk-assumption-matrix.md`
- ZK capability matrix: `docs/zk-capability-matrix.md`
- ZK provenance: `docs/zk-provenance.md`
- ZK verification flow: `docs/zk-verification-flow.md`
- ZK registry: `docs/zk-registry.generated.json`
- ZK transcript: `docs/zk-transcript.generated.md`
- ZK attestation: `docs/zk-attestation.generated.json`
- ZK stack version: `1`
- ZK registry entries: `3`

- `vote` -> `private_dao_vote_overlay` | public signals: `6` | build: `npm run zk:build:vote` | verify: `npm run zk:verify:vote`
- `delegation` -> `private_dao_delegation_overlay` | public signals: `7` | build: `npm run zk:build:delegation` | verify: `npm run zk:verify:delegation`
- `tally` -> `private_dao_tally_overlay` | public signals: `7` | build: `npm run zk:build:tally` | verify: `npm run zk:verify:tally`

### ZK Review Commands

- `npm run build:zk-registry`
- `npm run build:zk-transcript`
- `npm run build:zk-attestation`
- `npm run verify:zk-registry`
- `npm run verify:zk-transcript`
- `npm run verify:zk-attestation`
- `npm run verify:zk-docs`
- `npm run verify:zk-consistency`
- `npm run verify:zk-negative`
- `npm run zk:all`

## Strategy Package

- `docs/ranger-strategy-documentation.md`
- `docs/strategy-blueprint.md`
- `docs/strategy-adaptor-interface.md`
- `docs/strategy-operations.md`
- `docs/consumer-readiness.md`
- `docs/consumer-user-flows.md`
- `docs/launch-growth-plan.md`
- `docs/risk-policy.md`
- `docs/performance-evidence.md`
- `docs/competitive/source.json`
- `docs/competitive/analysis.generated.md`
- `docs/competitive/analysis.generated.json`

## Security Package

- `docs/security-review.md`
- `docs/governance-hardening-v3.md`
- `docs/settlement-hardening-v3.md`
- `docs/threat-model.md`
- `docs/security-coverage-map.md`
- `docs/confidential-payments-audit-scope.md`
- `docs/runtime/confidential-manifests/devnet-stable-magicblock-refhe.enc.json`
- `docs/magicblock/private-payments.md`
- `docs/refhe-security-model.md`
- `docs/refhe-audit-scope.md`
- `docs/failure-modes.md`
- `docs/replay-analysis.md`
- `docs/cryptographic-integrity.md`
- `docs/cryptographic-posture.md`
- `docs/artifact-freshness.md`
- `docs/supply-chain-security.md`
- `docs/supply-chain-attestation.generated.md`
- `docs/supply-chain-attestation.generated.json`

## ZK Review Package

- `docs/zk-layer.md`
- `docs/refhe-protocol.md`
- `docs/refhe-operator-flow.md`
- `docs/phase-c-hardening.md`
- `docs/zk-verifier-strategy.md`
- `docs/zk-enforced-threat-review.md`
- `docs/zk/enforced-runtime-evidence.md`
- `docs/zk/enforced-runtime-captures.json`
- `docs/zk/enforced-runtime.generated.json`
- `docs/zk/enforced-runtime.generated.md`
- `docs/zk/enforced-operator-flow.md`
- `docs/zk-external-audit-scope.md`
- `docs/canonical-verifier-boundary-decision.md`
- `docs/zk/external-closure.json`
- `docs/zk/external-closure.generated.json`
- `docs/zk/external-closure.generated.md`
- `docs/zk-stack.md`
- `docs/zk-upgrade.md`
- `docs/zk-architecture.md`
- `docs/zk-evidence.md`
- `docs/zk-threat-extension.md`
- `docs/zk-assumption-matrix.md`
- `docs/zk-capability-matrix.md`
- `docs/zk-provenance.md`
- `docs/zk-verification-flow.md`
- `docs/zk-registry.generated.json`
- `docs/zk-transcript.generated.md`
- `docs/zk-attestation.generated.json`

## Proof Package

- `docs/test-wallet-live-proof-v3.generated.md`
- `docs/test-wallet-live-proof-v3.generated.json`
- `docs/governance-hardening-v3.md`
- `docs/settlement-hardening-v3.md`
- `docs/read-node/indexer.md`
- `docs/read-node/same-domain-deploy.md`
- `docs/rpc-architecture.md`
- `docs/backend-operator-flow.md`
- `docs/read-node/snapshot.generated.md`
- `docs/read-node/snapshot.generated.json`
- `docs/read-node/ops.generated.md`
- `docs/read-node/ops.generated.json`
- `docs/competitive/analysis.generated.md`
- `docs/competitive/analysis.generated.json`
- `docs/assets/read-node-architecture.svg`
- `docs/confidential-payments.md`
- `docs/confidential-payroll-flow.md`
- `docs/confidential-payments-diagram.md`
- `docs/magicblock/private-payments.md`
- `docs/magicblock/operator-flow.md`
- `docs/magicblock/runtime-evidence.md`
- `docs/magicblock/runtime-captures.json`
- `docs/magicblock/runtime.generated.md`
- `docs/magicblock/runtime.generated.json`
- `docs/runtime/devnet-feature-sweep-2026-04-06.md`
- `docs/runtime/confidential-manifests/devnet-stable-magicblock-refhe.enc.json`
- `docs/refhe-protocol.md`
- `docs/refhe-operator-flow.md`
- `docs/refhe-security-model.md`
- `docs/refhe-audit-scope.md`
- `docs/assets/icons/confidential-payroll.svg`
- `docs/assets/confidential-payments-flow.svg`
- `docs/assets/icons/refhe-protocol.svg`
- `docs/assets/refhe-flow.svg`
- `docs/live-proof.md`
- `docs/devnet-release-manifest.md`
- `docs/proof-registry.json`
- `docs/devnet-wallet-registry.json`
- `docs/devnet-bootstrap.json`
- `docs/devnet-tx-registry.json`
- `docs/adversarial-report.json`
- `docs/zk-proof-registry.json`
- `docs/performance-metrics.json`
- `docs/load-test-report.md`
- `docs/devnet-scale-profiles.md`
- `docs/devnet-350-wave-plan.md`
- `docs/devnet-multi-proposal-report.json`
- `docs/devnet-multi-proposal-report.md`
- `docs/devnet-race-report.json`
- `docs/devnet-race-report.md`
- `docs/devnet-resilience-report.json`
- `docs/devnet-resilience-report.md`
- `docs/independent-verification.md`
- `docs/cryptographic-manifest.generated.json`
- `docs/token.md`
- `docs/pdao-token.md`
- `docs/pdao-attestation.generated.json`
- `docs/assets/pdao-token.json`
- `docs/fair-voting.md`
- `docs/wallet-runtime.md`
- `docs/runtime/real-device.md`
- `docs/runtime/real-device-captures.json`
- `docs/runtime/real-device.generated.md`
- `docs/runtime/real-device.generated.json`
- `docs/operational-evidence.generated.md`
- `docs/operational-evidence.generated.json`
- `docs/runtime-evidence.generated.md`
- `docs/runtime-evidence.generated.json`
- `docs/mainnet-acceptance-matrix.generated.md`
- `docs/mainnet-acceptance-matrix.generated.json`
- `docs/mainnet-proof-package.generated.md`
- `docs/mainnet-proof-package.generated.json`
- `docs/authority-hardening.md`
- `docs/mainnet-go-live-checklist.md`
- `docs/external-readiness-intake.md`
- `docs/wallet-compatibility-matrix.generated.md`
- `docs/wallet-compatibility-matrix.generated.json`
- `docs/devnet-canary.generated.md`
- `docs/devnet-canary.generated.json`
- `docs/deployment-attestation.generated.json`
- `docs/runtime-attestation.generated.json`
- `docs/go-live-attestation.generated.json`
- `docs/governance-hardening-v3.md`
- `docs/settlement-hardening-v3.md`
- `docs/test-wallet-live-proof-v3.generated.md`
- `docs/test-wallet-live-proof-v3.generated.json`

## Runtime Package

- `docs/read-node/indexer.md`
- `docs/rpc-architecture.md`
- `docs/backend-operator-flow.md`
- `docs/read-node/snapshot.generated.md`
- `docs/read-node/snapshot.generated.json`
- `docs/fair-voting.md`
- `docs/wallet-runtime.md`
- `docs/runtime/real-device.md`
- `docs/runtime/real-device-captures.json`
- `docs/runtime/real-device.generated.md`
- `docs/runtime/real-device.generated.json`
- `docs/zk/enforced-runtime-evidence.md`
- `docs/zk/enforced-runtime-captures.json`
- `docs/zk/enforced-runtime.generated.md`
- `docs/zk/enforced-runtime.generated.json`
- `docs/zk/enforced-operator-flow.md`
- `docs/operational-evidence.generated.md`
- `docs/operational-evidence.generated.json`
- `docs/runtime-evidence.generated.md`
- `docs/runtime-evidence.generated.json`
- `docs/wallet-compatibility-matrix.generated.md`
- `docs/wallet-compatibility-matrix.generated.json`
- `docs/devnet-canary.generated.md`
- `docs/devnet-canary.generated.json`
- `docs/mainnet-acceptance-matrix.generated.md`
- `docs/mainnet-acceptance-matrix.generated.json`
- `docs/mainnet-proof-package.generated.md`
- `docs/mainnet-proof-package.generated.json`
- `docs/external-readiness-intake.md`
- `docs/mainnet-readiness.generated.md`
- `docs/release-ceremony.md`
- `docs/release-ceremony-attestation.generated.md`
- `docs/release-ceremony-attestation.generated.json`
- `docs/release-drill.generated.md`
- `docs/release-drill.generated.json`
- `docs/deployment-attestation.generated.json`
- `docs/go-live-criteria.md`
- `docs/operational-drillbook.md`
- `docs/runtime-attestation.generated.json`
- `docs/go-live-attestation.generated.json`

## Devnet Stress Package

- `docs/devnet-wallet-registry.json`
- `docs/devnet-bootstrap.json`
- `docs/devnet-tx-registry.json`
- `docs/adversarial-report.json`
- `docs/zk-proof-registry.json`
- `docs/performance-metrics.json`
- `docs/load-test-report.md`
- `docs/devnet-scale-profiles.md`
- `docs/devnet-350-wave-plan.md`
- `docs/devnet-multi-proposal-report.json`
- `docs/devnet-multi-proposal-report.md`
- `docs/devnet-race-report.json`
- `docs/devnet-race-report.md`
- `docs/devnet-resilience-report.json`
- `docs/devnet-resilience-report.md`

## Operations Package

- `docs/governance-hardening-v3.md`
- `docs/settlement-hardening-v3.md`
- `docs/test-wallet-live-proof-v3.generated.md`
- `docs/read-node/indexer.md`
- `docs/read-node/same-domain-deploy.md`
- `docs/rpc-architecture.md`
- `docs/backend-operator-flow.md`
- `docs/read-node/snapshot.generated.md`
- `docs/read-node/snapshot.generated.json`
- `docs/magicblock/runtime-evidence.md`
- `docs/magicblock/runtime.generated.md`
- `docs/runtime/devnet-feature-sweep-2026-04-06.md`
- `docs/runtime/confidential-manifests/devnet-stable-magicblock-refhe.enc.json`
- `docs/mainnet-readiness.md`
- `docs/authority-hardening.md`
- `docs/phase-c-hardening.md`
- `docs/mainnet-go-live-checklist.md`
- `docs/mainnet-readiness.generated.md`
- `docs/release-ceremony.md`
- `docs/release-ceremony-attestation.generated.md`
- `docs/release-ceremony-attestation.generated.json`
- `docs/release-drill.generated.md`
- `docs/release-drill.generated.json`
- `docs/review-automation.md`
- `docs/go-live-criteria.md`
- `docs/operational-drillbook.md`
- `docs/production-operations.md`
- `docs/monitoring-alerts.md`
- `docs/incident-response.md`
- `docs/verification-gates.md`
- `docs/mainnet-cutover-runbook.md`
- `docs/operator-checklist.md`
- `docs/risk-register.md`
- `docs/audit-handoff.md`

## Verification Gates

- `npm run validate:ranger-strategy -- docs/ranger-strategy-config.devnet.json`
- `npm run verify:strategy-surface`
- `npm run verify:live-proof`
- `npm run verify:test-wallet-live-proof:v3`
- `npm run verify:release-manifest`
- `npm run verify:program-id-consistency`
- `npm run verify:pdao-surface`
- `npm run verify:pdao-attestation`
- `npm run verify:pdao-live`
- `npm run test:devnet:wallets`
- `npm run test:devnet:fund`
- `npm run test:devnet:bootstrap`
- `npm run test:devnet:commit`
- `npm run test:devnet:reveal`
- `npm run test:devnet:execute`
- `npm run test:devnet:zk`
- `npm run test:devnet:adversarial`
- `npm run test:devnet:report`
- `npm run test:devnet:100`
- `npm run test:devnet:350`
- `npm run test:devnet:500`
- `npm run test:devnet:multi`
- `npm run test:devnet:race`
- `npm run test:devnet:extended`
- `npm run test:devnet:resilience`
- `npm run test:devnet:all`
- `npm run verify:review-links`
- `npm run verify:ops-surface`
- `npm run verify:submission-registry`
- `npm run verify:registry-consistency`
- `npm run verify:generated-artifacts`
- `npm run verify:colosseum-competitive`
- `npm run verify:supply-chain-attestation`
- `npm run verify:release-ceremony-attestation`
- `npm run verify:operational-evidence`
- `npm run verify:real-device-runtime`
- `npm run verify:magicblock-runtime`
- `npm run verify:confidential-manifest`
- `npm run verify:zk-enforced-runtime`
- `npm run verify:runtime-evidence`
- `npm run verify:release-drill`
- `npm run verify:artifact-freshness`
- `npm run verify:wallet-matrix`
- `npm run verify:devnet-canary`
- `npm run verify:devnet:resilience-report`
- `npm run ops:canary`
- `npm run verify:cryptographic-manifest`
- `npm run verify:mainnet-readiness-report`
- `npm run verify:mainnet-acceptance-matrix`
- `npm run verify:mainnet-proof-package`
- `npm run verify:deployment-attestation`
- `npm run verify:runtime-attestation`
- `npm run verify:runtime-surface`
- `npm run verify:go-live-attestation`
- `npm run verify:zk-surface`
- `npm run verify:zk-registry`
- `npm run verify:zk-transcript`
- `npm run verify:zk-attestation`
- `npm run verify:zk-docs`
- `npm run verify:zk-consistency`
- `npm run verify:zk-negative`
- `npm run verify:review-surface`
- `npm run verify:all`

## Current Status

- governanceLifecycle: `verified`
- confidentialPayoutSurface: `verified`
- refheProtocolSurface: `verified`
- backendReadNodeSurface: `verified`
- securityReasoning: `verified`
- supplyChainSurface: `verified`
- releaseCeremonySurface: `verified`
- runtimeEvidenceSurface: `verified`
- realDeviceRuntimeIntake: `verified`
- operationalEvidenceSurface: `verified`
- magicblockRuntimeSurface: `verified`
- confidentialManifestEncryption: `verified`
- releaseDrillSurface: `verified`
- artifactFreshness: `verified`
- zkCompanionStack: `verified`
- governanceHardeningV3: `verified`
- settlementHardeningV3: `verified`
- liveProofV3: `verified`
- reviewerSurface: `verified`
- operationsSurface: `verified`
- competitivePositioningSurface: `verified`
- strategyEngine: `not-in-repo`
- livePerformance: `not-in-repo`
- externalAudit: `pending`
- mainnetRollout: `pending`
