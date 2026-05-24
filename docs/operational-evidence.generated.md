# Operational Evidence Package

## Overview

- Generated at: `2026-05-24T20:47:18.077Z`
- Network: `devnet`
- Canonical run label: `20260417125017`
- Multi-proposal run label: `20260407211024`
- Race run label: `20260407211024`
- Resilience run label: `20260417225004`

## Transaction Summary

- Wallet count: `50`
- Total transactions: `185`
- Total attempts: `212`
- Success count: `180`
- Failure count: `32`
- Retry count: `0`
- Average tx latency ms: `1522.9081`
- Total execution time ms: `36058082`
- Failure rate: `0.1509`
- Retry rate: `0`

### Phase Counts

- bootstrap: `3`
- commit: `42`
- execute: `1`
- finalize: `1`
- fund: `100`
- reveal: `35`
- zk: `3`

## Voting And Lifecycle Evidence

- Full lifecycle report: `docs/load-test-report.md`
- Bootstrap registry: `docs/devnet-bootstrap.json`
- Explorer tx registry: `docs/devnet-tx-registry.json`
- Multi-proposal executed: `3/3`
- Cross-proposal rejections: `3`
- Multi-proposal unexpected successes: `0`
- Multi-proposal markdown: `docs/devnet-multi-proposal-report.md`
- Multi-proposal json: `docs/devnet-multi-proposal-report.json`

## ZK Companion Evidence

- Verification mode: `offchain-groth16`
- On-chain verifier present: `false`
- Proof entries: `7`
- Verified proof entries: `7`
- Registry: `docs/zk-proof-registry.json`

### ZK Layer Counts

- delegation: `1`
- tally: `1`
- vote: `5`

## Adversarial Evidence

- Total scenarios: `33`
- Rejected as expected: `32`
- Unexpected successes: `0`
- Report: `docs/adversarial-report.json`

## Resilience Evidence

- RPC failover recovered: `true`
- Stale blockhash rejected: `true`
- Stale blockhash recovered: `true`
- Unexpected failures: `undefined`
- Markdown report: `docs/devnet-resilience-report.md`
- JSON report: `docs/devnet-resilience-report.json`

## Collision Evidence

- Finalize winners: `1`
- Finalize rejections: `4`
- Execute winners: `1`
- Execute rejections: `4`
- Finalize single winner: `true`
- Execute single winner: `true`
- Unexpected successes: `0`
- Markdown report: `docs/devnet-race-report.md`
- JSON report: `docs/devnet-race-report.json`

## Commands

- `npm run test:devnet:all`
- `npm run test:devnet:multi`
- `npm run test:devnet:race`
- `npm run test:devnet:resilience`
- `npm run build:operational-evidence`
- `npm run verify:operational-evidence`
- `npm run verify:all`

## Source Documents

- `docs/load-test-report.md`
- `docs/devnet-bootstrap.json`
- `docs/devnet-tx-registry.json`
- `docs/performance-metrics.json`
- `docs/adversarial-report.json`
- `docs/zk-proof-registry.json`
- `docs/devnet-multi-proposal-report.md`
- `docs/devnet-multi-proposal-report.json`
- `docs/devnet-race-report.md`
- `docs/devnet-race-report.json`
- `docs/devnet-resilience-report.md`
- `docs/devnet-resilience-report.json`

## Interpretation

This package binds the canonical Devnet voting lifecycle, zk companion proofs, adversarial rejection behavior, RPC interruption recovery, and finalize/execute collision handling into one reviewer-facing operational surface. It is intended to show that PrivateDAO is not only specified and documented, but also reproducibly exercised under realistic multi-wallet and failure-path conditions.
