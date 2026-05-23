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
- accepted auth headers: `Authorization: Bearer <token>`, `x-quicknode-security-token`, or `x-private-dao-stream-token`

Never commit the token. Rotate any token that was pasted into chat, screenshots, issue bodies, build logs, or public notes.

## Recommended QuickNode Settings

- network: Solana Testnet
- dataset: `Programs + Logs` for protocol observation, or `Block` for broad runtime health
- batch size: `1`
- compression: optional; keep `None` while testing
- timeout: `30s`
- retry delay: `1s`
- terminate after: `3` retries
- destination URL: `https://api.privatedao.org/api/v1/quicknode/stream`

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
npm run verify:frontend-surface
npm run web:build
```

Health check:

```bash
curl https://api.privatedao.org/api/v1/quicknode/stream
```
