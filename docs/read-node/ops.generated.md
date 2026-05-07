# Read Node Ops Snapshot

- Generated at: `2026-05-07T03:21:40.872Z`
- Read path: `backend-indexer`
- RPC endpoint: `https://api.devnet.solana.com`
- RPC pool size: `2`
- Program ID: `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`
- Same-domain recommended: `true`
- Read API path: `/api/v1`

## Backend Coverage

- proposals: `0`
- unique DAOs: `0`
- zk-enforced proposals: `0`
- confidential payout proposals: `0`
- REFHE configured: `0`
- REFHE settled: `0`
- REFHE with verifier binding: `0`
- executable confidential proposals: `0`

## Supported Devnet Profiles

- `50` | wallets=`50` | waves=`5` | wave-size=`10` | negative=`wrong-voter-record, wrong-delegation-marker, wrong-token-account`
- `100` | wallets=`100` | waves=`5` | wave-size=`20` | negative=`wrong-voter-record, wrong-delegation-marker, wrong-token-account, late-reveal`
- `350` | wallets=`350` | waves=`7` | wave-size=`50` | negative=`invalid-reveal, late-reveal, execute-replay, wrong-vault, wrong-authority, payout-replay`
- `500` | wallets=`500` | waves=`20` | wave-size=`25` | negative=`invalid-reveal, late-reveal, execute-replay, wrong-authority, payout-replay`

## Operator Checks

- `curl /healthz`
- `curl /api/v1/runtime`
- `curl /api/v1/ops/overview`
- `curl /api/v1/ops/snapshot`
- `curl /api/v1/devnet/profiles`
- `curl /api/v1/metrics`

## Deployment Guide

- `docs/read-node/same-domain-deploy.md`
