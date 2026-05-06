# PrivateDAO Reviewer Fast Path - 2026-05-06

PrivateDAO is a wallet-first Solana Testnet financial OS for private governance, confidential treasury operations, local-first QVAC intelligence, and public proof review.

## Start Here

| Need | Route |
| --- | --- |
| Product home | https://privatedao.org/ |
| About narrative | https://privatedao.org/about/ |
| QVAC local AI | https://privatedao.org/services/qvac-sovereign-ai/ |
| Intelligence | https://privatedao.org/intelligence/ |
| Governance | https://privatedao.org/govern/ |
| Private settlement | https://privatedao.org/services/cloak-private-settlement/ |
| Proof matrix | https://privatedao.org/proof/?judge=1 |
| Custody truth | https://privatedao.org/custody/ |
| Excellence closure matrix | https://privatedao.org/documents/excellence-closure-matrix-2026-05-06/ |
| Technology video | https://youtu.be/iFTUe4CTWP0 |

## Anchor 1.0.1

Anchor Rust program/toolchain is upgraded to `1.0.1`.

- `Anchor.toml`: `anchor_version = "1.0.1"`
- `Cargo.toml`: `anchor-lang = "1.0.1"` and `anchor-spl = "1.0.1"`
- Testnet program: `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`
- Evidence: `docs/anchor-1-migration-evidence-2026-04-30.md`
- Boundary: `@coral-xyz/anchor` remains on npm latest `0.32.1`; no `1.0.1` npm client is currently published.

## QVAC

QVAC is product-critical in the pre-sign intelligence lane.

- Model: `qvac/fabric-llm-finetune`
- Browser runtime: `@xenova/transformers`
- Use: local proposal and treasury execution brief
- Output: operation type, risk notes, privacy recommendation, counterparty check
- Privacy: no cloud LLM endpoint, no API key, browser cache after first model load

## Umbra / Cloak Boundary

The hosted read-node private settlement endpoint is:

`https://api.privatedao.org/api/v1/private-settlement/intent`

Umbra relayer proof endpoints:

- `https://api.privatedao.org/api/v1/umbra/relayer/health`
- `https://api.privatedao.org/api/v1/umbra/relayer/info`

The read node checks Umbra relayer availability and records settlement intent receipts. Full Umbra claim submission requires SDK-generated ZK `proof_account_data` and UTXO slot data; the endpoint intentionally does not fabricate cryptographic claim bodies.

## Supabase Timeline

The proof timeline reads from Supabase when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are present. If cloud rows are not yet available, the UI shows reviewer seed receipts instead of an empty timeline state.

Schema: `docs/supabase-operation-receipts.sql`

## AWS / Read Node

The read-node backend is expected behind `api.privatedao.org`. It should serve:

- `/healthz`
- `/api/v1/metrics`
- `/api/v1/private-settlement/intent`
- `/api/v1/goldrush/query`
- `/api/v1/qvac/runtime-proof`
- `/api/v1/umbra/relayer/health`
- `/api/v1/umbra/relayer/info`

## Mainnet Truth

PrivateDAO is live on Solana Testnet. Production mainnet release remains gated by custody ceremony, multisig authority transfer, external audit / focused review, monitoring, and final readouts.
