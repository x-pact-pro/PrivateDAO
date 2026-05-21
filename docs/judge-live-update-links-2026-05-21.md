# Judge Live Update Links - 2026-05-21

PrivateDAO is presented as a sovereign operational intelligence layer for encrypted governance, treasury coordination, confidential payroll, private payments, and reviewer-visible execution proof on Solana.

## Primary Reviewer Links

- Main product: https://privatedao.org/
- Judge route: https://privatedao.org/judge/
- Updated judges route: https://privatedao.org/judges/
- Proof center: https://privatedao.org/proof/
- Encrypt / Ika / 2PC-MPC / REFHE desktop proof: https://privatedao.org/proof/encrypt-ika-desktop/
- Trust center: https://privatedao.org/trust/
- Whitepaper: https://privatedao.org/whitepaper/
- Legacy whiteprint redirect surface: https://privatedao.org/whiteprint/

## Core Product Lanes

- Intelligence: https://privatedao.org/intelligence/
- Governance: https://privatedao.org/govern/
- Treasury: https://privatedao.org/treasury/
- Confidential payroll: https://privatedao.org/payroll/
- Execution: https://privatedao.org/execute/
- Live state: https://privatedao.org/live/
- API status: https://privatedao.org/api-status/
- RPC services: https://privatedao.org/rpc-services/

## Privacy And Payment Routes

- Encrypt / Ika operations: https://privatedao.org/services/encrypt-ika-operations/
- REFHE payroll proof: https://privatedao.org/services/refhe-payroll-proof/
- Confidential payments: https://privatedao.org/services/confidential-payments/
- Umbra confidential payout: https://privatedao.org/services/umbra-confidential-payout/
- Umbra private payments: https://privatedao.org/services/umbra-private-payments/
- MagicBlock private payments: https://privatedao.org/services/magicblock-private-payments/
- Cloak private settlement: https://privatedao.org/services/cloak-private-settlement/
- Zerion agent policy: https://privatedao.org/services/zerion-agent-policy/
- Runtime infrastructure: https://privatedao.org/services/runtime-infrastructure/

## Live API Proof Links

- API index: https://api.privatedao.org/api/v1
- Health: https://api.privatedao.org/api/v1/health
- Runtime: https://api.privatedao.org/api/v1/runtime
- Metrics: https://api.privatedao.org/api/v1/metrics
- Proposals: https://api.privatedao.org/api/v1/proposals
- QVAC runtime proof: https://api.privatedao.org/api/v1/qvac/runtime-proof
- Live execution counters: https://api.privatedao.org/api/v1/execution-events/stats
- Latest indexed chain event: https://api.privatedao.org/api/v1/chain/latest
- Ika Solana pre-alpha readiness: https://api.privatedao.org/api/v1/ika/solana-prealpha/readiness
- MagicBlock health: https://api.privatedao.org/api/v1/magicblock/health
- Umbra relayer info: https://api.privatedao.org/api/v1/umbra/relayer/info
- Umbra relayer health: https://api.privatedao.org/api/v1/umbra/relayer/health
- Config: https://api.privatedao.org/api/v1/config
- Ops overview: https://api.privatedao.org/api/v1/ops/overview
- Devnet profiles: https://api.privatedao.org/api/v1/devnet/profiles

## Reviewer Notes

- Every public page listed above returned HTTP 200 during the live sweep.
- The hosted read node uses RPCFast for Ika Solana pre-alpha readiness and redacts RPC secrets in public responses.
- The execution counter records real visitor-triggered attempts in Supabase and exposes aggregate proof without leaking private request data.
- GoldRush Warehouse, Zerion, and Solana RPC are wired into the analytics route so reviewer analysis can continue even when a single vendor surface changes its wallet endpoint behavior.
- Private settlement, REFHE payroll proof, Ika approval preparation, and Umbra relayer status are exposed as separated proof lanes so judges can distinguish live execution, readiness, intent receipts, and full settlement rails.
