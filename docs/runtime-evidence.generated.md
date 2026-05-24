# Runtime Evidence Package

## Overview

- Generated at: `2026-05-24T20:47:28.331Z`
- Program id: `5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx`
- Verification wallet: `4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD`
- Diagnostics page: `https://privatedao.org/diagnostics/`
- Supported wallet classes: `5`

## Wallet Matrix

- Auto Detect (`auto-detect`) | status: `devnet-review-ready` | diagnostics: `true` | selector: `true`
- Phantom (`phantom`) | status: `devnet-review-ready` | diagnostics: `true` | selector: `true`
- Solflare (`solflare`) | status: `devnet-review-ready` | diagnostics: `true` | selector: `true`
- Backpack (`backpack`) | status: `devnet-review-ready` | diagnostics: `true` | selector: `true`
- Glow (`glow`) | status: `manual-runtime-qa-required` | diagnostics: `true` | selector: `true`

## Devnet Canary Summary

- Network: `devnet`
- Primary healthy: `true`
- Fallback healthy: `true`
- Anchor accounts present: `true`
- Unexpected failures: `0`

## Resilience Summary

- RPC fallback recovered: `true`
- Stale blockhash rejected: `true`
- Stale blockhash recovered: `true`
- Unexpected failures: `0`

## Real-Device Runtime Intake

- Status: `pending-real-device-capture`
- Target count: `5`
- Completed target count: `1`
- Successful connect count: `1`
- Successful submission count: `1`
- Diagnostics capture count: `1`
- Pending targets: `Phantom, Solflare, Backpack, Glow`

## Browser-Wallet Runtime Intake

- Status: `pending-browser-wallet-capture`
- Target count: `4`
- Completed target count: `2`
- Successful connect count: `2`
- Successful submission count: `1`
- Diagnostics capture count: `2`
- Action coverage count: `7`
- Pending targets: `Backpack, Glow`

## Evidence-Backed Wallet Readiness

- Browser wallet targets: `4`
- Browser wallet evidence-backed: `1`
- Browser wallet evidence-backed labels: `Solflare`
- Browser connect-only captures: `1`
- Browser connect-only labels: `Phantom`
- Browser diagnostics captures: `2`
- Browser diagnostics labels: `Phantom, Solflare`
- Real-device targets: `5`
- Real-device evidence-backed: `1`
- Real-device evidence-backed labels: `Android Native / Mobile`
- Real-device pending targets: `4`
- Support matrix wallet count: `5`
- Support matrix selector-visible count: `5`
- Support matrix diagnostics-visible count: `5`
- Support matrix review-ready count: `4`

## MagicBlock Runtime Intake

- Status: `pending-magicblock-capture`
- Target count: `6`
- Completed target count: `1`
- Deposit success count: `1`
- Private transfer success count: `1`
- Settle success count: `1`
- Execute success count: `1`
- Diagnostics capture count: `0`
- Pending targets: `Phantom, Solflare, Backpack, Glow, Android Native / Mobile`

## ZK-Enforced Runtime Intake

- Status: `pending-zk-enforced-capture`
- Target count: `5`
- Completed target count: `0`
- Mode activation success count: `0`
- Finalize success count: `0`
- Diagnostics capture count: `0`
- Pending targets: `Phantom, Solflare, Backpack, Glow, Android Native / Mobile`

## ZK External Closure

- Status: `pending-external-execution`
- Pending blocking stages: `3`
- ZK-Enforced Runtime Captures: `capture-required` (operators)
- External Audit Handoff: `ready-for-external-review` (core-team)
- Canonical Verifier Boundary Freeze: `decision-pending` (core-team)

## Operational Summary

- Canonical wallet count: `50`
- Canonical tx count: `185`
- ZK proof count: `7`
- Adversarial scenarios: `33`
- Unexpected adversarial successes: `0`
- Finalize single-winner: `true`
- Execute single-winner: `true`
- Failover recovered: `true`
- Stale blockhash recovered: `true`

## Runtime Documents

- `docs/wallet-runtime.md`
- `docs/runtime/real-device.md`
- `docs/runtime/real-device-captures.json`
- `docs/runtime/real-device.generated.md`
- `docs/runtime/real-device.generated.json`
- `docs/runtime/browser-wallet.md`
- `docs/runtime/browser-wallet-captures.json`
- `docs/runtime/browser-wallet.generated.md`
- `docs/runtime/browser-wallet.generated.json`
- `docs/magicblock/private-payments.md`
- `docs/magicblock/operator-flow.md`
- `docs/magicblock/runtime-evidence.md`
- `docs/magicblock/runtime-captures.json`
- `docs/magicblock/runtime.generated.md`
- `docs/magicblock/runtime.generated.json`
- `docs/frontier-integrations.generated.md`
- `docs/frontier-integrations.generated.json`
- `docs/zk/enforced-runtime-evidence.md`
- `docs/zk/enforced-runtime-captures.json`
- `docs/zk/enforced-runtime.generated.md`
- `docs/zk/enforced-runtime.generated.json`
- `docs/zk/enforced-operator-flow.md`
- `docs/zk/external-closure.json`
- `docs/zk/external-closure.generated.md`
- `docs/zk/external-closure.generated.json`
- `docs/runtime-attestation.generated.json`
- `docs/operational-evidence.generated.md`
- `docs/operational-evidence.generated.json`
- `docs/governance-runtime-proof.generated.md`
- `docs/governance-runtime-proof.generated.json`
- `docs/wallet-compatibility-matrix.generated.md`
- `docs/devnet-canary.generated.md`
- `docs/devnet-resilience-report.md`
- `docs/fair-voting.md`

## Governance Runtime Proof

- Dedicated packet: `docs/governance-runtime-proof.generated.md`
- Machine-readable source: `docs/governance-runtime-proof.generated.json`
- Purpose: separate shipped wallet-first governance capability from repo proof, browser-wallet proof, and real-device proof so the product does not overclaim based on code alone.

## Commands

- `npm run build:operational-evidence`
- `npm run verify:operational-evidence`
- `npm run build:governance-runtime-proof`
- `npm run verify:governance-runtime-proof`
- `npm run build:browser-wallet-runtime`
- `npm run verify:browser-wallet-runtime`
- `npm run build:wallet-matrix`
- `npm run verify:wallet-matrix`
- `npm run build:real-device-runtime`
- `npm run verify:real-device-runtime`
- `npm run build:magicblock-runtime`
- `npm run verify:magicblock-runtime`
- `npm run build:frontier-integrations`
- `npm run verify:frontier-integrations`
- `npm run build:zk-enforced-runtime`
- `npm run verify:zk-enforced-runtime`
- `npm run build:zk-external-closure`
- `npm run verify:zk-external-closure`
- `npm run build:devnet-canary`
- `npm run verify:devnet-canary`
- `npm run test:devnet:resilience`
- `npm run verify:devnet:resilience-report`
- `npm run verify:runtime-surface`
- `npm run verify:all`

## Notes

- This runtime evidence package is Devnet-focused and reviewer-visible.
- It does not replace real device QA across every wallet release and browser combination.
- It binds browser/runtime behavior to diagnostics, wallet matrix, canary, resilience evidence, and real-device capture intake in one summary.
- Wallet support matrix status is not treated as review-readiness by itself; browser-wallet and real-device captures drive the evidence-backed readiness counts.
- It includes a dedicated governance runtime proof packet so reviewers can see the difference between shipped wallet-first lanes and still-pending browser or device captures.
- It now carries a separate browser-wallet runtime intake so live web governance claims stay tied to actual injected-wallet captures instead of code paths alone.
- It exposes the MagicBlock confidential payout corridor as a separate runtime track instead of burying it inside generic payout claims.
- It adds a Frontier integration package that binds ZK anchors, MagicBlock settlement, REFHE settlement, and backend-indexed RPC state into one machine-checked review surface.
- It exposes the stronger zk_enforced runtime blocker as a first-class evidence track instead of leaving it implicit in prose.
- It tracks the remaining external closure path: runtime captures, external audit, and the canonical verifier-boundary freeze.
