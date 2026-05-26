# Custody Proof Reviewer Packet

## Overview

- project: `PrivateDAO`
- generated at: `2026-05-26T03:09:06.155Z`
- reviewer intent: Explain the current custody truth, show what is externally proven now, and make the missing external ceremony evidence explicit without narrative drift.
- custody status: `ready-for-transfer`
- trust decision: `blocked-external-steps`
- production mainnet claim allowed: `false`
- custody completion: `16/25`

## Current Truth

- summary: PrivateDAO is Testnet-live and internally hardened; real-funds mainnet production remains gated on external audit, custody completion, monitoring, runtime wallet captures, verifier-CPI or audited residual-trust acceptance for privacy settlement, and the final release ceremony.
- multisig implementation: `Squads Protocol`
- multisig address: `thHmF7VYNtxE1MaDzYXbfPCiq13RF6JwuWnjvDZuSmF`
- threshold: `2-of-3`
- configured timelock hours: `48`
- minimum timelock hours: `48`

## What Is Externally Proven Now

- Current Testnet deployed program readout after Squads transfer (testnet)
  - address: `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`
  - explorer: https://explorer.solana.com/address/EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva?cluster=testnet
  - authority: `CALHrBqx6jbzcPn2NVcinqSAHeod65v9LcDuTxsdPqBv`
  - program data: `FKyt5DcmRQcCF8kzMGjCvfGb3ZPHMQnH1SqiG9Mi8xEc`
  - last deploy slot: `410689759`
- Current Testnet DAO anchor readout (testnet)
  - address: `FEz2hCLGpDhJ3cdAm5CCWFzrKv8vDDzmmt9UjdF2fApZ`
  - explorer: https://explorer.solana.com/address/FEz2hCLGpDhJ3cdAm5CCWFzrKv8vDDzmmt9UjdF2fApZ?cluster=testnet
  - authority: `pending`
  - program data: `pending`
  - last deploy slot: `pending`

Explorer-linked artifacts:

- Program creation signature: `67S63JAUNvvCED3hE9h6bCXW9iJ3EYzJLARvj8Lki5x2dJEgLnrfES9mp6bAxfsH6vfmor2ocqNaEd68uVN68DNJ` -> https://explorer.solana.com/tx/67S63JAUNvvCED3hE9h6bCXW9iJ3EYzJLARvj8Lki5x2dJEgLnrfES9mp6bAxfsH6vfmor2ocqNaEd68uVN68DNJ?cluster=testnet
- Timelock configuration signature: `67S63JAUNvvCED3hE9h6bCXW9iJ3EYzJLARvj8Lki5x2dJEgLnrfES9mp6bAxfsH6vfmor2ocqNaEd68uVN68DNJ` -> https://explorer.solana.com/tx/67S63JAUNvvCED3hE9h6bCXW9iJ3EYzJLARvj8Lki5x2dJEgLnrfES9mp6bAxfsH6vfmor2ocqNaEd68uVN68DNJ?cluster=testnet
- program-upgrade-authority transfer signature: `EzwLLrAchBpj3eLTUFuv1uo9rSLKgKNbQgp1DkCevJycT31Eou9TSJsJsEfMjLt4q87pKwXaZUTqCZ1NduNc1vy` -> https://explorer.solana.com/tx/EzwLLrAchBpj3eLTUFuv1uo9rSLKgKNbQgp1DkCevJycT31Eou9TSJsJsEfMjLt4q87pKwXaZUTqCZ1NduNc1vy?cluster=testnet

## Exact Pending Items

- rehearsal signature
- dao authority destination authority
- dao authority transfer signature
- dao authority post-transfer readout
- dao authority post-transfer readout reference
- treasury operator authority destination authority
- treasury operator authority transfer signature
- treasury operator authority post-transfer readout
- treasury operator authority post-transfer readout reference

## Exact Mainnet Blocker

- blocker id: `upgrade-authority-multisig`
- severity: `critical`
- status: `pending-external`
- next action: Move production upgrade authority and operational authorities to a documented multisig or governance-owned path and rehearse rotation.

Blocker evidence refs:

- docs/authority-hardening.md
- docs/authority-transfer-runbook.md
- docs/production-custody-ceremony.md
- docs/multisig-setup-intake.json
- docs/multisig-setup-intake.md
- docs/launch-ops-checklist.json
- docs/launch-ops-checklist.md
- docs/mainnet-cutover-runbook.md
- docs/launch-trust-packet.generated.md

## Strict Ingestion Route

1. Build the public-key and signature packet in https://privatedao.org/custody/
2. Save it locally as docs/custody-evidence-intake.json
3. Run npm run apply:custody-evidence-intake
4. Re-open canonical custody proof, launch trust packet, and the track proof closure surfaces

## Judge-First Track Openings

Use these exact opening sequences to keep the first 30 to 45 seconds of the track videos aligned with the judge-first top strip and the reviewer packet.

### Core Reviewer Packet
- best demo route: `/start`
1. What works now: Lead the first 90 seconds from /start into /govern with a real wallet-first path. Use /proof/?judge=1, trust package, diagnostics, and services as the second-stage proof of maturity. Keep the README, deck, story video, and product learning path perfectly aligned with the live site.
2. What is externally proven: Proof center via /proof and Launch trust packet via /documents/launch-trust-packet and Treasury reviewer packet via /documents/treasury-reviewer-packet and Reviewer telemetry packet via /documents/reviewer-telemetry-packet.
3. Exact blocker: upgrade-authority-multisig. The startup-quality path remains blocked until production multisig, authority transfer signatures, and post-transfer readouts are recorded.
4. Best product route: open /start first. Lead with /start, then keep proof, custody truth, and the blocker in the same judge flow instead of splitting the product story across routes. Close the route by opening /documents/treasury-reviewer-packet and /documents/reviewer-telemetry-packet so payments readiness and the data corridor stay inside the same proof story.
- voiceover: What works now: Lead the first 90 seconds from /start into /govern with a real wallet-first path. Use /proof/?judge=1, trust package, diagnostics, and services as the second-stage proof of maturity. Keep the README, deck, story video, and product learning path perfectly aligned with the live site. What is externally proven: Proof center via /proof and Launch trust packet via /documents/launch-trust-packet and Treasury reviewer packet via /documents/treasury-reviewer-packet and Reviewer telemetry packet via /documents/reviewer-telemetry-packet. Exact blocker: upgrade-authority-multisig. The startup-quality path remains blocked until production multisig, authority transfer signatures, and post-transfer readouts are recorded. Best product route: open /start first. Lead with /start, then keep proof, custody truth, and the blocker in the same judge flow instead of splitting the product story across routes. Close the route by opening /documents/treasury-reviewer-packet and /documents/reviewer-telemetry-packet so payments readiness and the data corridor stay inside the same proof story.

### Confidential Governance Reviewer Packet
- best demo route: `/story`
1. What works now: Use the comprehensive story video as the first-pass product walkthrough for judges. Lead the click path from /security to the ZK matrix, confidence engine, and V3 proof packet. Keep the pitch deck anchored around private governance, confidential payouts, and clear release boundaries.
2. What is externally proven: Live Proof V3 via /documents/live-proof-v3 and ZK capability matrix via /documents/zk-capability-matrix and Treasury reviewer packet via /documents/treasury-reviewer-packet and Reviewer telemetry packet via /documents/reviewer-telemetry-packet.
3. Exact blocker: magicblock-refhe-source-receipts. Testnet REFHE and MagicBlock receipts are closed; real-funds mainnet still requires verifier CPI or externally audited residual-trust acceptance.
4. Best product route: open /story first. Lead with /story, then keep proof, custody truth, and the blocker in the same judge flow instead of splitting the product story across routes. Close the route by opening /documents/treasury-reviewer-packet and /documents/reviewer-telemetry-packet so payments readiness and the data corridor stay inside the same proof story.
- voiceover: What works now: Use the comprehensive story video as the first-pass product walkthrough for judges. Lead the click path from /security to the ZK matrix, confidence engine, and V3 proof packet. Keep the pitch deck anchored around private governance, confidential payouts, and clear release boundaries. What is externally proven: Live Proof V3 via /documents/live-proof-v3 and ZK capability matrix via /documents/zk-capability-matrix and Treasury reviewer packet via /documents/treasury-reviewer-packet and Reviewer telemetry packet via /documents/reviewer-telemetry-packet. Exact blocker: magicblock-refhe-source-receipts. Testnet REFHE and MagicBlock receipts are closed; real-funds mainnet still requires verifier CPI or externally audited residual-trust acceptance. Best product route: open /story first. Lead with /story, then keep proof, custody truth, and the blocker in the same judge flow instead of splitting the product story across routes. Close the route by opening /documents/treasury-reviewer-packet and /documents/reviewer-telemetry-packet so payments readiness and the data corridor stay inside the same proof story.

### Runtime Infrastructure Reviewer Packet
- best demo route: `/services`
1. What works now: Show diagnostics, runtime evidence, and hosted read/API packaging in one buyer-friendly path. Use the service catalog, SLA, pricing, and trust package as the commercial proof layer. Keep the Fast RPC role explicit in video, deck, README, and services UI.
2. What is externally proven: Diagnostics via /diagnostics and Core integrations via /documents/frontier-integrations and Treasury reviewer packet via /documents/treasury-reviewer-packet and Reviewer telemetry packet via /documents/reviewer-telemetry-packet.
3. Exact blocker: production-monitoring-alerts. RPC and hosted-read mainnet claims remain blocked until live monitoring, alert delivery, and tested operator ownership are recorded.
4. Best product route: open /services first. Lead with /services, then keep proof, custody truth, and the blocker in the same judge flow instead of splitting the product story across routes. Close the route by opening /documents/treasury-reviewer-packet and /documents/reviewer-telemetry-packet so payments readiness and the data corridor stay inside the same proof story.
- voiceover: What works now: Show diagnostics, runtime evidence, and hosted read/API packaging in one buyer-friendly path. Use the service catalog, SLA, pricing, and trust package as the commercial proof layer. Keep the Fast RPC role explicit in video, deck, README, and services UI. What is externally proven: Diagnostics via /diagnostics and Core integrations via /documents/frontier-integrations and Treasury reviewer packet via /documents/treasury-reviewer-packet and Reviewer telemetry packet via /documents/reviewer-telemetry-packet. Exact blocker: production-monitoring-alerts. RPC and hosted-read mainnet claims remain blocked until live monitoring, alert delivery, and tested operator ownership are recorded. Best product route: open /services first. Lead with /services, then keep proof, custody truth, and the blocker in the same judge flow instead of splitting the product story across routes. Close the route by opening /documents/treasury-reviewer-packet and /documents/reviewer-telemetry-packet so payments readiness and the data corridor stay inside the same proof story.

## Required External Inputs

- 3 production signer public keys
- chosen multisig implementation and address
- 48+ hour timelock configuration evidence
- authority transfer signatures, explorer links, and readouts
- real-device wallet captures
- external audit report or signed memo
- first pilot DAO target and operator contact

## Live Routes

- https://privatedao.org/custody/
- https://privatedao.org/security/
- https://privatedao.org/documents/launch-trust-packet/
- https://privatedao.org/documents/canonical-custody-proof/

## Linked Docs

- `docs/canonical-custody-proof.generated.md`
- `docs/track-judge-first-openings.generated.md`
- `docs/launch-trust-packet.generated.md`
- `docs/production-custody-ceremony.md`
- `docs/multisig-setup-intake.md`
- `docs/multisig-setup-intake.json`
- `docs/mainnet-blockers.md`
- `docs/custody-proof-reviewer-packet.generated.md`
- `docs/custody-observed-readouts.json`
- `docs/authority-transfer-runbook.md`
- `docs/external-audit-engagement.md`
- `docs/audit-handoff.md`
- `docs/governance-hardening-v3.md`
- `docs/settlement-hardening-v3.md`
- `docs/test-wallet-live-proof-v3.generated.md`
- `docs/runtime/real-device.md`
- `docs/pilot-onboarding-playbook.md`
- `docs/pilot-program.md`
- `docs/trust-package.md`

## Canonical Commands

- `npm run build:custody-proof-reviewer-packet`
- `npm run verify:custody-proof-reviewer-packet`
- `npm run build:track-judge-first-openings`
- `npm run verify:track-judge-first-openings`
- `npm run apply:custody-evidence-intake`
- `npm run build:launch-trust-packet`
- `npm run verify:launch-trust-packet`
- `npm run verify:multisig-intake`
- `npm run verify:launch-ops`
- `npm run verify:mainnet-blockers`
- `npm run verify:real-device-runtime`
- `npm run check:mainnet`

## Honest Boundary

This reviewer packet proves the current observed custody state, the exact missing ceremony evidence, and the strict repo-safe ingestion path.

It does not claim that production multisig, signer closure, authority transfer, or post-transfer readouts already exist until those exact public artifacts are recorded.
