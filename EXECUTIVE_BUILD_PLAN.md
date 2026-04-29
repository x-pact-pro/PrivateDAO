# PrivateDAO Executive Build Plan

## Mandatory Guardrails
- Rule 1: Never create a file before checking if it exists.
- Rule 2: Safe additive changes only unless deletion is explicitly verified safe.
- Rule 3: Every new file must have one clear purpose.
- Rule 4: Commit at least every 3 hours during execution windows.
- Rule 5: No production secrets in code or git history. Use `.env.local` only.

## Current Deployment Truth — 2026-04-29
- Public frontend remains on the existing static web host for `privatedao.org` and `www.privatedao.org`.
- AWS EC2 is the hosted read-node/API backend, not the primary frontend host.
- Live API base: `https://api.privatedao.org`.
- AWS instance: `i-08accd60a2ff2925a` in `eu-north-1`.
- Read-node service: `privatedao-read-node` behind Nginx and Let's Encrypt HTTPS.
- Verified API routes:
  - `GET https://api.privatedao.org/healthz`
  - `GET https://api.privatedao.org/api/v1/config`
  - `GET https://api.privatedao.org/api/v1/umbra/relayer/health`
  - `GET https://api.privatedao.org/api/v1/qvac/runtime-proof`
  - `POST https://api.privatedao.org/api/v1/private-settlement/intent`
- Runtime boundary: Umbra relayer health and intent receipts are live. Full Umbra claim submission still requires SDK-generated ZK claim payloads and funded UTXOs; do not describe intent receipts as completed shielded transfers.
- DNS boundary: `api` points to AWS. Apex and `www` still point to the frontend host.

## Phase 0 — Repository Truth Audit
1. Map current route surface and identify missing operational routes.
2. Map Solana program instructions and test coverage.
3. Map frontend service lanes, proof wiring, and judge fast paths.
4. Map API integration readiness (GoldRush, Dune, Jupiter, Torque, privacy rails).
5. Convert all TODO language in docs into either:
  - implemented route, or
  - explicit `in progress` with concrete blocker.

Verified route correction: `/payroll`, `/gaming`, `/gaming/tournaments`, `/gaming/inventory`, `/compliance`, `/developers`, `/rpc-services`, and `/command-center` are present in the Next app unless a later audit proves otherwise. Do not repeat stale claims that these routes are absent.

## Phase 1 — Intelligence Layer Hardening
- Live treasury health via GoldRush.
- Supplemental wallet flows via Dune SIM.
- Human-readable AI summaries for proposal and treasury decisions.
- Risk-first rendering on `/intelligence` and `/treasury`.
- Keep API-keyed data behind server/API proxy surfaces where possible; do not expose sponsor keys in client code.

## Phase 2 — Private Execution Layer
- Private payroll route with CSV preview and private settlement preparation.
- Private payment flow with clear wallet action boundaries.
- Encrypted payload generation in browser (commitment-safe artifacts only).
- Proof continuity persisted through operation receipts.
- Bind client workbenches to `NEXT_PUBLIC_PRIVATE_DAO_READ_NODE_ENDPOINT=https://api.privatedao.org`.
- Promote Umbra from live relayer readiness + intent receipt to a real claim only when SDK-generated `proof_account_data`, UTXO slot data, and funded supported mint notes are available.
- Keep Cloak as a relay-forwarding lane until a sponsor-provided live SDK/proxy endpoint is configured.

## Phase 3 — Gaming DAO Layer
- Guild hub route (`/gaming`).
- Tournament route with proposal handoff (`/gaming/tournaments`).
- Inventory route for governed transfer intent (`/gaming/inventory`).

## Phase 4 — Compliance and Proof
- Compliance report generator route (`/compliance`) with scoped period controls.
- Proof matrix showing:
  - ZK status,
  - viewing-key status,
  - transaction reference link.
- Keep `/judge` and `/proof` as single reviewer entry path.
- Add hosted API evidence to proof and reviewer packets whenever a route depends on read-node data.

## Phase 4.5 — QVAC Sovereign AI
- QVAC SDK proof route is live through `https://api.privatedao.org/api/v1/qvac/runtime-proof`.
- Product use case: local-first AI explanation, translation, and private workflow assistance for governance, payroll, compliance, and judge mode.
- Required next step: keep the web route and submission language tied to real QVAC runtime proof, not a generic AI wrapper claim.

## Phase 5 — Submission and Evidence Discipline
- Keep `submissions-new/` synchronized with real product routes.
- Maintain track board with product/judge/proof links.
- Maintain `INTEGRATIONS.md` as source-of-truth mapping between technology and live route.
- Maintain sponsor-specific docs:
  - `docs/DX-REPORT-JUPITER.md`
  - `docs/TORQUE-FRICTION-LOG.md`

## Daily Execution Loop
1. Verify route and code truth.
2. Implement only missing operational gaps.
3. Run smallest meaningful validations.
4. Publish root mirror and verify live surface, then verify `https://api.privatedao.org/healthz`.
5. Commit and push.
