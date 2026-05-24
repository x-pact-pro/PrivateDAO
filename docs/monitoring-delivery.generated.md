# Monitoring Delivery Evidence

## Overview

- project: `PrivateDAO`
- generated at: `2026-05-24T16:59:31.503Z`
- environment: `solana-testnet-production-candidate`
- status: `testnet-probe-closure-alert-delivery-pending`
- owner assignments: `3/3`
- closed delivery requirements: `2/6`
- partial delivery requirements: `4/6`
- transcript requirements: `5`
- rule severity mix: `2` critical / `5` high

## Owners

- operations-lead | assigned | alert destination ownership and response windows
- rpc-operator | assigned | primary and fallback RPC probe routing
- release-manager | assigned | incident acknowledgment transcript retention

## Delivery Requirements

- Alert destination ownership | partial | evidence: operations owner assigned; external alert destination delivery transcript remains the closure item
- Primary and fallback RPC probes | closed | evidence: same-domain /healthz and /api/v1/readiness pass on https://api.privatedao.org with QuickNode Testnet RPC redacted in public payloads
- Proposal lifecycle monitor | partial | evidence: Solana Testnet chain watcher endpoint returns latest indexed transactions; routed alert transcript still required
- Treasury balance monitor | partial | evidence: Token and treasury evidence remains indexed in reviewer packets; balance anomaly delivery transcript still required
- Proof and settlement monitor | closed | evidence: QuickNode stream stats, freshness endpoint, QVAC runtime proof, Umbra relayer health, and backend provider readiness packet all return HTTP 200
- Authority activity monitor | partial | evidence: Squads custody evidence and timelock proof are recorded; external authority-activity alert transcript still required

## Provider Assignments

- candidate primary RPC: `QUICKNODE_SOLANA_TESTNET_RPC host secret`
- active primary RPC: `https://cosmological-hidden-water.solana-testnet.quiknode.pro/[redacted]`
- fallback RPC: `https://api.testnet.solana.com`
- read path: `backend-indexer`
- status: `testnet-provider-probes-live-alert-transcripts-pending`

## Transcript Requirements

- trigger source and timestamp
- alert destination and delivery result
- acknowledging operator
- response window
- linked runbook and incident note

## Claim Boundary

Testnet backend probes are live and verified; external alert routing and incident transcripts remain pending delivery setup

## Supporting Artifacts

- `docs/backend-provider-readiness-2026-05-24.md`
- `docs/readiness-aggregate.md`
- `docs/quicknode-stream-intelligence.md`
- `docs/timelock-enforcement-proof-2026-05-23.md`

## Commands

- `npm run record:monitoring-delivery -- /path/to/intake.json`
- `npm run build:monitoring-delivery`
- `npm run verify:monitoring-delivery`
