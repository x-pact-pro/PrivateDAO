# Backend Provider Readiness — 2026-05-24

## Summary

- Base URL: `https://api.privatedao.org`
- Cluster: `solana-testnet`
- Current program: `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`
- Generated at: `2026-05-25T04:18:25.392Z`
- Posture: `backend-production-candidate`

## Provider Checks

### AWS same-domain read node

- provider: `AWS EC2 + Docker edge`
- endpoint: `https://api.privatedao.org/healthz`
- status: `pass`
- http: `200`
- summary: Program EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva executable=true

### QuickNode Testnet RPC

- provider: `QuickNode Solana Testnet`
- endpoint: `https://api.privatedao.org/api/v1/readiness`
- status: `pass`
- http: `200`
- summary: RPC https://cosmological-hidden-water.solana-testnet.quiknode.pro/[redacted]

### QuickNode stream intake

- provider: `QuickNode Streams`
- endpoint: `https://api.privatedao.org/api/v1/quicknode/stream/stats`
- status: `pass`
- http: `200`
- summary: 2 accepted payload(s), raw storage disabled

### Supabase visitor counters

- provider: `Supabase`
- endpoint: `https://api.privatedao.org/api/v1/visitors/stats`
- status: `pass`
- http: `200`
- summary: 740 total sessions, 57 visitor txs

### MagicBlock receipt proof

- provider: `MagicBlock + Solana receipts`
- endpoint: `https://api.privatedao.org/api/v1/magicblock/onchain-proof`
- status: `pass`
- http: `200`
- summary: 5/5 receipts finalized; runtime ok

### Ika Solana pre-alpha readiness

- provider: `Ika 2PC-MPC / Solana pre-alpha`
- endpoint: `https://api.privatedao.org/api/v1/ika/solana-prealpha/readiness`
- status: `pass`
- http: `200`
- summary: program executable=true, operator funded=true, latest blockhash=BhgGG2Lr...VTfZ25

### REFHE payroll proof route

- provider: `REFHE-style encrypted computation receipt`
- endpoint: `https://api.privatedao.org/api/v1/refhe/payroll/proof`
- status: `pass`
- http: `200`
- summary: encrypted computation receipt 4a86b4e9...45350b

### Supabase freshness memo

- provider: `Supabase + Solana Testnet`
- endpoint: `https://api.privatedao.org/api/v1/freshness/latest`
- status: `pass`
- http: `200`
- summary: Latest tx 2vxAjYuh...Y2Zx6v at 2026-05-21T08:26:33.728+00:00

### QVAC sovereign AI proof

- provider: `QVAC local-first runtime`
- endpoint: `https://api.privatedao.org/api/v1/qvac/runtime-proof`
- status: `pass`
- http: `200`
- summary: SDK 0.10.0, model qvac/fabric-llm-finetune

### Umbra relayer health

- provider: `Umbra devnet relayer`
- endpoint: `https://api.privatedao.org/api/v1/umbra/relayer/health`
- status: `pass`
- http: `200`
- summary: Relayer ok

### Chain watcher

- provider: `Solana Testnet indexed chain events`
- endpoint: `https://api.privatedao.org/api/v1/chain/latest`
- status: `pass`
- http: `200`
- summary: 10 latest indexed transactions

## Operator Interpretation

- The public backend is live on the same API host used by the product.
- QuickNode RPC is active and redacted in public payloads.
- QuickNode stream intake is configured with raw payload storage disabled.
- MagicBlock, Ika, and REFHE proof routes are live as backend endpoints with reviewer-safe outputs.
- Supabase counters are live without IP or personal-data collection.
- QVAC and Umbra are exposed as proof/health endpoints, not secret-bearing client code.

## Reviewer Route

Open `/api-status`, `/rpc-services`, and `/documents/readiness-aggregate` to inspect the same live backend surface from the product UI.
