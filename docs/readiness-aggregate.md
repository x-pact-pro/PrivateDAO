# Readiness Aggregate

## Purpose

`https://api.privatedao.org/api/v1/readiness` is the fast reviewer and operator route for checking PrivateDAO's current Solana Testnet production-candidate posture.

It exists so a judge, investor, or operator does not need to open five different endpoints before understanding whether the backend is live.

## What It Aggregates

- read-node health and RPC pool posture
- QuickNode stream telemetry and persisted intake counters
- visitor and execution counters
- runtime freshness and latest chain-event evidence
- public proof routes for the site, judge path, proof center, security route, and QuickNode stats

## Trust Boundary

The route is intentionally reviewer-safe:

- it never returns private keys
- it never returns QuickNode tokens
- it never returns full RPC path secrets
- it never stores or exposes raw QuickNode block payloads
- it reports Testnet production-candidate readiness, not Mainnet custody completion

## Live Route

- readiness aggregate: `https://api.privatedao.org/api/v1/readiness`
- QuickNode stream stats: `https://api.privatedao.org/api/v1/quicknode/stream/stats`
- read-node health: `https://api.privatedao.org/healthz`
- RPC services page: `https://privatedao.org/rpc-services`
- API status page: `https://privatedao.org/api-status`

## Verification

Run:

```bash
npm run verify:remote-primary-host -- https://api.privatedao.org
```

The gate checks health, config redaction, QuickNode stream stats, and readiness aggregation from the hosted API.
