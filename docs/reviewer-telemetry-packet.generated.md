# Reviewer Telemetry Packet

## Overview

- project: `PrivateDAO`
- generated at: `2026-05-22T19:34:06.346Z`
- reviewer intent: Show the shortest truth-synced route into runtime maturity, hosted reads, indexed governance, and infrastructure-facing reviewer value without claiming unsupported partnerships or mainnet readiness.

## Truth Sources

- Runtime evidence: `2026-05-06T09:07:34.282Z` via `docs/runtime-evidence.generated.md`
- Frontier integrations: `2026-04-22T00:19:16.435Z` via `docs/frontier-integrations.generated.md`
- Read-node snapshot: `2026-04-28T23:33:45.971Z` via `docs/read-node/snapshot.generated.md`
- Devnet service metrics: `2026-05-20T17:45:47.757Z` via `apps/web/src/lib/devnet-service-metrics.ts`

## What Works Now

- Hosted reads expose 48 indexed proposals across 28 DAOs through the backend-indexer path.
- Diagnostics, analytics, and services remain live reviewer-visible routes starting from https://privatedao.org/diagnostics/.
- 7/7 canonical governance lifecycle transactions are finalized in the current integrations package.
- 5/5 confidential settlement corridor transactions are finalized in the current integrations package.
- 4 REFHE-settled and 3 MagicBlock-settled proposal paths are already reflected in the indexed source.

## What Is Externally Or Operationally Proven Now

- Runtime evidence package generated at 2026-05-06T09:07:34.282Z and published as docs/runtime-evidence.generated.md.
- Frontier integrations package generated at 2026-04-22T00:19:16.435Z with reviewer entry https://privatedao.org/proof/?judge=1.
- Read-node snapshot generated at 2026-04-28T23:33:45.971Z on slot 458767709 against https://api.devnet.solana.com.
- Proposal flow health, wallet readiness, and proof freshness summaries are taken from the same devnet service metrics module used by the live app.
- Unexpected runtime failures remain 0 and unexpected adversarial successes remain 0.

## Hosted-Read Proof

- read path: `backend-indexer`
- rpc endpoint: `https://api.devnet.solana.com`
- slot: `458767709`
- program id: `5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx`
- commitment: `confirmed`
- indexed proposals: `48`
- indexed DAOs: `28`

## Runtime Snapshot

- diagnostics page: `https://privatedao.org/diagnostics/`
- wallet count: `5`
- unexpected failures: `0`
- fallback recovered: `true`
- stale blockhash recovered: `true`
- pending real-device targets: `4`

## Integrations Snapshot

- governance status: `verified-devnet-governance-path`
- confidential status: `verified-devnet-confidential-path`
- governance finalized: `7/7`
- confidential finalized: `5/5`
- zk anchors confirmed: `3/3`

## Export-Ready Summaries

- Proposal flow health: 37.5% — 7/7 governance proof steps are finalized. 0 proposal is already executed on Testnet, 0 proposal is still in commit mode, and 5 proposal is still waiting on settlement evidence. (Open proof and execution: /proof/?judge=1)
- Wallet-by-wallet readiness: Runtime capture live — Wallet diagnostics, connect/sign/submit evidence, and real-device intake are surfaced as a living runtime program with proof packets attached for each supported wallet path. (Open wallet diagnostics: /diagnostics)
- Proof freshness: 2d old — Runtime evidence 16d old and Testnet canary 2d old remain published together. The integration packet remains linked as the reviewer baseline without turning an archived source packet into the freshness score. Latest Testnet rehearsal is 16d old with 9 confirmed lifecycle signatures. (Open trust documents: /documents/live-proof-v3)
- Hosted read coverage: 48 — The backend-indexer read path currently exposes 48 indexed proposals across 28 DAOs. (Open services: /services)
- MagicBlock settlement completion: 100% — 5/5 confidential corridor transactions finalized in the current integration evidence package. (Open diagnostics: /diagnostics)
- Primary RPC latency: 153 ms — Current blockhash latency from the primary Testnet endpoint. Version latency is 998 ms. (Open analytics: /analytics)

## Reviewer-First Path

1. Open telemetry packet: Start from the generated truth-synced packet instead of inferring readiness from multiple pages. (/documents/reviewer-telemetry-packet)
2. Open diagnostics: Validate runtime health and reviewer-visible operational signals. (/diagnostics)
3. Open analytics: Inspect export-ready summaries sourced from the same metrics module. (/analytics)
4. Open services: Confirm the hosted-read and buyer-facing infrastructure route. (/services)

## Best Demo Route

- start: `/services`
- sequence: `/services` -> `/diagnostics` -> `/analytics` -> `/documents/reviewer-telemetry-packet`
- explanation: Lead with the buyer-visible infrastructure surface, then validate runtime health, then show export-ready analytics summaries, and finally land on the reviewer packet that binds the same truth sources together.

## Exact Boundary

- This packet does not claim live third-party analytics partnerships.
- It does not claim production mainnet custody or launch approval.
- It does not replace canonical custody proof, launch trust packet, or mainnet blockers.
- Pending real-device captures remain explicit and are not hidden behind aggregate metrics.

## Linked Docs

- `docs/reviewer-telemetry-packet.generated.md`
- `docs/runtime-evidence.generated.md`
- `docs/frontier-integrations.generated.md`
- `docs/read-node/snapshot.generated.md`
- `docs/launch-trust-packet.generated.md`
- `docs/canonical-custody-proof.generated.md`

## Live Routes

- https://privatedao.org/services/
- https://privatedao.org/diagnostics/
- https://privatedao.org/analytics/
- https://privatedao.org/documents/reviewer-telemetry-packet/

## Canonical Commands

- `npm run build:reviewer-telemetry-packet`
- `npm run verify:reviewer-telemetry-packet`
- `npm run build:runtime-evidence`
- `npm run verify:runtime-evidence`
- `npm run build:frontier-integrations`
- `npm run verify:frontier-integrations`
- `npm run build:read-node-snapshot`
- `npm run verify:read-node-snapshot`
