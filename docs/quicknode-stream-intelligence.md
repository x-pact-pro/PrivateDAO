# QuickNode Stream Intelligence

## Purpose

PrivateDAO uses QuickNode Streams as the real-time Solana Testnet telemetry intake for proof freshness, program-log observation, and pre-execution intelligence.

This is not a public secret store and it is not a raw block archive. The product receives large QuickNode payloads, authenticates them, and converts them into reviewer-safe signals:

- transaction count
- failed transaction count
- PrivateDAO program matches
- compute units consumed
- latest slot and block metadata
- sample signatures for proof inspection

## Webhook

- production destination: `https://api.privatedao.org/api/v1/quicknode/stream`
- static-site advisory route: `apps/web/src/app/api/quicknode/stream/route.ts`
- read-node route: `scripts/run-read-node.ts`
- required secret: `QUICKNODE_STREAM_TOKEN`
- accepted auth modes: QuickNode HMAC headers `X-QN-Nonce`, `X-QN-Timestamp`, `X-QN-Signature`; or fallback direct-token headers `Authorization: Bearer <token>`, `x-quicknode-security-token`, `x-private-dao-stream-token`
- token mode: single token or comma-separated rotation list
- root POST compatibility: `POST https://api.privatedao.org/` is rewritten by Caddy to `/api/v1/quicknode/stream` for dashboard configurations that were initially pointed at the domain root
- RPC evidence redaction: `healthz` and `/api/v1/config` expose QuickNode as `https://*.solana-testnet.quiknode.pro/[redacted]`

Never commit the token. Rotate any token that was pasted into chat, screenshots, issue bodies, build logs, or public notes.

## Production Activation — 2026-05-23

The hosted read-node was redeployed with QuickNode Testnet as the first RPC provider and the public Solana Testnet endpoint as fallback.

- live health: `https://api.privatedao.org/healthz`
- live config: `https://api.privatedao.org/api/v1/config`
- live stream intake: `https://api.privatedao.org/api/v1/quicknode/stream`
- live stream stats: `https://api.privatedao.org/api/v1/quicknode/stream/stats`
- live readiness aggregate: `https://api.privatedao.org/api/v1/readiness`
- RPC pool: `QuickNode Testnet [redacted]` -> `https://api.testnet.solana.com`
- stream auth: configured
- smoke result: POST accepted with `privateDaoTransactionCount=1`, `blockCount=1`, and `computeUnitsConsumed=8888`
- raw payload storage: disabled; only reviewer-safe summaries are returned

This closes the previous zero-metrics condition: production API traffic now exercises the QuickNode RPC endpoint, and QuickNode Streams can deliver authenticated Solana Testnet payloads to the read-node instead of the static site root.

## Live Stats Endpoint

`GET /api/v1/quicknode/stream/stats` exposes reviewer-safe operational counters:

- accepted stream payloads
- last accepted timestamp
- latest summary
- cumulative blocks, transactions, failed transactions, PrivateDAO program matches, and compute units
- auth posture and accepted header names

The stats endpoint never returns stream tokens and never stores raw block payloads.

For reviewers who need one fast JSON surface, `GET /api/v1/readiness` aggregates runtime health, QuickNode stream counters, visitor stats, execution counters, freshness evidence, latest chain event, and public route links.

On the primary host, these counters persist across read-node restarts in the runtime volume:

- container path: `/srv/privatedao/runtime/quicknode-stream-telemetry.json`
- compose mount: `deploy/primary-host/volumes/runtime`
- environment override: `PRIVATE_DAO_RUNTIME_STATE_DIR`

## Recommended QuickNode Settings

- network: Solana Testnet
- dataset: `Programs + Logs` for protocol observation, or `Block` for broad runtime health
- batch size: `1`
- compression: optional; keep `None` while testing
- timeout: `30s`
- retry delay: `1s`
- terminate after: `3` retries
- preferred destination URL: `https://api.privatedao.org/api/v1/quicknode/stream`
- compatible destination URL if already configured in QuickNode: `https://api.privatedao.org/`
- security token: keep QuickNode's generated security token in the dashboard and mirror it only as `QUICKNODE_STREAM_TOKEN` on the read-node; the server verifies QuickNode's HMAC signature over `nonce + timestamp + decoded JSON payload`

## Why It Matters

QuickNode supplies live chain telemetry. GoldRush/Covalent supplies wallet and counterparty intelligence. QVAC supplies local-first decision support before a signer approves. Together they form a data-to-decision lane:

1. QuickNode streams the current Testnet execution environment.
2. PrivateDAO summarizes the stream without persisting raw payloads.
3. GoldRush adds wallet history and treasury context.
4. QVAC turns context into a signer-readable pre-execution brief.
5. The proof route exposes what was observed without leaking secrets.

## Verification

Run:

```bash
npm run typecheck
npm run web:lint
npm run verify:quicknode-stream-intake
npm run verify:frontend-surface
npm run web:build
```

Health check:

```bash
curl https://api.privatedao.org/api/v1/quicknode/stream
```
