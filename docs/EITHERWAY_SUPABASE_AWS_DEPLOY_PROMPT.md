# Eitherway Prompt: PrivateDAO Supabase + AWS Read Node Closure

Build and deploy the missing production-style backend layer for PrivateDAO without changing the existing Colosseum/GitHub/Twitter links.

Project context:
- Site: https://privatedao.org
- API domain: https://api.privatedao.org
- Supabase project ref: zhjtxxykchcbtnqiykyj
- Solana cluster: Testnet only. Do not claim mainnet.
- Current PrivateDAO program ID: EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva
- Anchor Rust toolchain: 1.0.1
- QVAC browser model: qvac/fabric-llm-finetune via Transformers.js

Deliver exactly these backend items:

1. Apply this Supabase schema to the connected project:
   - Read the SQL from `docs/supabase-operation-receipts.sql`.
   - Create or update `operation_receipts`, `governance_receipts`, and `cloak_delivery_state`.
   - Enable Row Level Security on all three tables.
   - Grant `SELECT` and `INSERT` to `anon`.
   - Add permissive insert/select policies exactly as the SQL states.

2. Deploy/read-node behavior:
   - Use the existing AWS/EC2 read-node path for `api.privatedao.org`, but do not proxy Solana RPC through AWS as a hard dependency.
   - Prefer direct Solana Testnet RPC first, then Helius if `HELIUS_API_KEY` is configured, then public fallback.
   - Ensure `PRIVATE_DAO_PROGRAM_ID` is `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`.
   - Ensure `https://api.privatedao.org/healthz`, `https://api.privatedao.org/api/health`, and `https://api.privatedao.org/api/v1/health` all return `ok: true`.
   - Ensure `https://api.privatedao.org/api/v1/metrics` returns real metrics.
   - Ensure `POST https://api.privatedao.org/api/v1/private-settlement/intent` accepts JSON and returns a receipt, not 405.
   - Ensure `GET https://api.privatedao.org/api/v1/umbra/relayer/health` proxies the Umbra Devnet relayer health.
   - Ensure `GET https://api.privatedao.org/api/v1/umbra/relayer/info` shows relayer address and supported mints.
   - Ensure `POST https://api.privatedao.org/api/v1/goldrush/query` forwards through the configured GoldRush API key.

3. Required environment names:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `GOLDRUSH_API_KEY`
   - `DUNE_SIM_API_KEY`
   - `UMBRA_RELAYER_API_ENDPOINT=https://relayer.api-devnet.umbraprivacy.com`
   - `PRIVATE_DAO_SETTLEMENT_NETWORK=testnet`
   - `PRIVATE_DAO_PROGRAM_ID=EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`
   - `NEXT_PUBLIC_JUPITER_QUOTE_ENDPOINT=https://lite-api.jup.ag/swap/v1/quote`

4. Test payload for Cloak/Umbra endpoint:

```json
{
  "rail": "umbra",
  "operationType": "private-payroll",
  "asset": "USDC",
  "amount": "0.01",
  "recipient": "2oq56CUPwsnxbHAdmbQswFR3DWAQ3EBinrNDNSAJMTTS",
  "memo": "PrivateDAO reviewer testnet confidential payout receipt",
  "auditMode": "confidential-payout",
  "recipientVisibility": "recipient-private"
}
```

5. Acceptance checks:
- No endpoint returns 405 or 502 for the expected health method.
- Jupiter route preview uses `https://lite-api.jup.ag/swap/v1/quote` with `inputMint=So11111111111111111111111111111111111111112`, `outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`, `amount=20000000`, and `slippageBps=75`.
   - No secret is exposed in browser HTML or GitHub.
   - `/proof/` shows receipt timeline rows, never an empty timeline.
   - `/services/qvac-sovereign-ai/` loads and exposes local model progress for `qvac/fabric-llm-finetune`.
   - `/services/jupiter-treasury-route/` auto-loads a live Jupiter quote with router and output amount.
   - `/intelligence/` includes GoldRush and `.sol` lookup entry points.
   - Keep all claims Testnet-scoped.

Return:
- Exact deployed API URLs.
- Exact Supabase table creation status.
- Exact `curl` commands and outputs for health, metrics, Umbra health/info, GoldRush POST, and private-settlement POST.
- Any failed step and the exact error.
