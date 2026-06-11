# PrivateDAO Engineering Proof Ledger

Date: 2026-06-11

Project: PrivateDAO

Positioning: Confidential Coordination Infrastructure for Organizations on Solana

Primary network: Solana Testnet

Purpose: This ledger consolidates the engineering proof surface for PrivateDAO's protocol, intelligence, privacy, treasury, and infrastructure integrations. It is designed for judges, protocol engineers, provider teams, AI reviewers, investors, and maintainers who need to evaluate what exists, where the code lives, what evidence is public, and which boundaries are intentionally labelled.

## Executive Summary

PrivateDAO is structured around one product spine:

Connect wallet -> Intelligence before signing -> Private vote while deciding -> Reveal -> Verify -> Execute.

The reports below prove that the visible product is backed by provider boundaries, runtime routes, local documentation, and public evidence manifests instead of only marketing copy. The ledger does not convert every provider boundary into a live real-funds production claim. It separates four evidence classes:

- On-chain proof: Solana Testnet program state, transaction signatures, explorer references, or proof routes tied to executable Testnet logic.
- Runtime API proof: public API endpoint returns current runtime, provider, readiness, telemetry, or receipt data.
- Repository proof: source files, tests, docs, and generated artifacts exist in the public repository.
- Boundary proof: optional, sandbox, future, or provider-configured lane is labelled so reviewers do not confuse it with completed production settlement.

## Proof Ledger

| Area | Integration | Current product role | Evidence class | Public proof | Repository/code references | Boundary |
| --- | --- | --- | --- | --- | --- | --- |
| Core chain | Solana Testnet | Governance, proposal, vote, execution, proof network | On-chain/runtime | https://privatedao.org/proof/?judge=1 | `apps/web/src/lib/solana-network.ts`, `docs/governance-runtime-proof.generated.md` | Testnet-first; mainnet is not claimed as completed production custody. |
| Program framework | Anchor | PrivateDAO program account model and instruction surface | Repository/runtime | https://api.privatedao.org/api/v1/readiness | `programs/private-dao/src/privacy.rs`, `docs/anchor-1-migration-evidence-2026-04-30.md` | Program-readiness evidence does not replace independent external audit. |
| Token layer | Token-2022 / PDAO context | Governance token context and token-aware proposal flow | Repository/boundary | https://privatedao.org/documents/treasury-asset-oracle-engineering-report-2026-06-11/ | `apps/web/src/lib/pdao-token-strategy.ts`, `docs/pdao-token.md`, `docs/assets/pdao-token.json` | Token context is documented separately from live real-funds treasury custody. |
| Governance UX | Public-private-until-reveal voting | Public proposal visibility with hidden counts, percentages, identities, intent, whale signals, and momentum during active voting | Product/repository | https://privatedao.org/try/ | `docs/solana-anonymous-governance-primitive.md`, `docs/privacy-and-encryption-proof-guide.md` | The UX posture is the active product rule; proof strength depends on the selected route and signed Testnet receipt. |
| Governance UX | Private rooms / VIP rooms | Invite-only coordination, private proposal notes, hidden member intent, reveal policy, proof export | Product/repository | https://privatedao.org/rooms/ | `docs/privacy-execution-matrix-2026-05-26.md`, `docs/provider-to-encrypted-execution-spine-2026-05-22.md` | Room names and private metadata must not be public; proof packets reveal only policy-approved outcome data. |
| Governance proof | Commit-reveal | Commit first, reveal later to prevent vote influence and premature outcome leakage | Repository/proof | https://privatedao.org/documents/privacy-encryption-engineering-report-2026-06-11/ | `docs/zk-proof-registry.json`, `docs/privacy-and-encryption-proof-guide.md`, `apps/web/src/lib/privacy-proof-snapshot.ts` | Commit-reveal is a privacy posture and proof pattern; aggregate reveal happens after the voting/reveal policy permits it. |
| ZK proof | ZK / Groth16 proof artifacts | Proof-artifact registry and reviewer-visible privacy proof lane | Repository/proof | https://privatedao.org/documents/privacy-encryption-engineering-report-2026-06-11/ | `docs/zk-proof-registry.json`, `docs/privacy-and-encryption-proof-guide.md` | Current artifacts are reviewer-visible proof materials; on-chain verifier CPI is a stronger future implementation target. |
| Verification | Proof Center / Transparency Reports | Public verification after voting, payout, vesting, or execution completes | Runtime/product | https://privatedao.org/proof/?judge=1 | `docs/live-proof.md`, `docs/proof-registry.json`, `docs/privacy-execution-matrix-2026-05-26.md` | Transparency after completion does not expose hidden active-vote signals or private-room notes. |
| Confidential execution | REFHE | Confidential payroll/payment proof lane and encrypted-execution narrative | Repository/runtime receipt | https://privatedao.org/services/refhe-payroll-proof/ | `docs/refhe-protocol.md`, `docs/refhe-security-model.md`, `docs/refhe-audit-scope.md`, `docs/refhe-operator-flow.md` | REFHE route is proof/receipt oriented unless backed by a fresh signed transaction or configured provider receipt. |
| MPC / threshold custody | Ika / 2PC-MPC / Encrypt lane | Future/optional approval and dWallet-style threshold-signing boundary for confidential operations | Repository/boundary | https://privatedao.org/services/encrypt-ika-operations/ | `docs/encrypt-ika-2pcmpc-refhe-desktop-report-2026-05-21.md`, `docs/testnet-refhe-encrypt-ika-commitment-2026-05-07.md` | Ika/2PC-MPC is treated as a provider boundary and commitment lane unless final dWallet signing evidence is present. |
| Runtime performance | MagicBlock | Private payment corridor, low-latency execution strategy, future ER/PER lane | On-chain/runtime | https://api.privatedao.org/api/v1/magicblock/onchain-proof | `docs/magicblock-engineering-report-2026-06-11.md`, `docs/magicblock/private-payments.md`, `docs/magicblock/runtime-evidence.md` | Current proof is the PrivateDAO corridor and proof route; ER/PER-native delegation is labelled as upgrade path. |
| Local AI | QVAC | Local/private decision intelligence before signing | Runtime/repository | https://api.privatedao.org/api/v1/qvac/runtime-proof | `apps/web/src/lib/ai/qvac.ts`, `docs/intelligence-provider-engineering-report-2026-06-11.md` | QVAC is decision support; it does not receive hidden vote intent or private room transcript by default. |
| LLM routing | Local/custom/hosted LLM boundary | Optional local or hosted intelligence provider selection | Repository/boundary | https://privatedao.org/settings/intelligence/ | `apps/web/src/lib/intelligence/llm/types.ts`, `apps/web/src/lib/intelligence/llm/providers.ts`, `apps/web/src/lib/intelligence/llm/prompt-builder.ts` | Hidden vote intent, encrypted votes, private voter identities, and private room notes are excluded unless explicitly approved where policy allows. |
| Intelligence data | GoldRush/Covalent | Treasury, wallet, and historical decision context | Runtime/repository | https://privatedao.org/services/goldrush-decision-intelligence/ | `apps/web/src/lib/api/goldrush.ts`, `apps/web/src/lib/intelligence/providers/goldrush-provider.ts`, `apps/web/src/app/api/goldrush/query/route.ts` | External data providers are optional and non-blocking; unavailable providers do not break the main vote flow. |
| Intelligence data | Arkham provider slot | Optional counterparty/entity risk context | Repository/boundary | https://api.privatedao.org/api/v1/provider-integrations/status | `apps/web/src/lib/intelligence/providers/arkham-provider.ts`, `apps/web/src/lib/intelligence/providers/types.ts` | Optional provider. No browser-exposed API key. Hidden vote data is excluded from provider requests. |
| Intelligence data | Birdeye provider slot | Optional market and token context in the provider-router model | Boundary | https://api.privatedao.org/api/v1/provider-integrations/status | `apps/web/src/lib/intelligence/provider-registry.ts`, `apps/web/src/lib/intelligence/providers/types.ts` | Provider slot is modular; unavailable state must not block governance. |
| Intelligence data | Helius provider slot | Optional Solana account/transaction context and RPC resilience lane | Boundary/runtime | https://api.privatedao.org/api/v1/provider-integrations/status | `apps/web/src/lib/intelligence/provider-registry.ts`, `apps/web/src/lib/intelligence/providers/types.ts` | Provider slot is future/optional unless configured. |
| Intelligence routing | Provider registry | Swap intelligence providers without changing the primary UX | Repository | https://privatedao.org/settings/intelligence/ | `apps/web/src/lib/intelligence/provider-registry.ts`, `apps/web/src/lib/intelligence/providers/types.ts`, `apps/web/src/lib/intelligence/user-provider-config.ts` | Provider failures are isolated; default safe intelligence should work without external keys. |
| Portfolio context | Zerion | Agent policy and portfolio-intelligence lane | Runtime/repository | https://privatedao.org/services/zerion-agent-policy/ | `apps/web/src/app/api/zerion/portfolio/route.ts`, `docs/zerion-autonomous-agent-policy.md` | Zerion lane is intelligence context, not unrestricted autonomous custody. |
| Private settlement | Umbra-compatible provider | Private payout intent/receipt boundary | Runtime/repository | https://privatedao.org/services/umbra-confidential-payout/ | `apps/web/src/lib/providers/umbra-provider.ts`, `apps/web/src/lib/privacy/umbra.ts`, `docs/private-payout-provider.md`, `docs/umbra-adapter-boundary.md` | Sandbox fallback is labelled sandbox; no real Umbra settlement claim without configured provider receipt. |
| Private settlement | Cloak-style settlement | Confidential settlement narrative and proof lane | Runtime/repository | https://privatedao.org/services/cloak-private-settlement/ | `docs/cloak-devnet-sdk-live-probe.generated.md`, `docs/privacy-execution-matrix-2026-05-26.md` | Cloak-style route is a provider rail and must not be described as final real-funds production settlement without current receipt evidence. |
| Vesting | Streamflow-compatible vesting boundary | Confidential vesting rehearsal and future provider lane | Repository/boundary | https://privatedao.org/rooms/ | `apps/web/src/lib/providers/confidential-vesting-provider.ts`, `docs/treasury-asset-oracle-engineering-report-2026-06-11.md` | Sandbox/provider boundary unless Streamflow config, signature, and receipt are present. |
| Payout provider | Private payout provider interface | Provider abstraction for payroll, vendor payout, grant payout, and reward payout | Repository/API | https://privatedao.org/api/coordination/providers/status | `apps/web/src/lib/providers/private-payout-provider.ts`, `apps/web/src/lib/providers/private-payout-registry.ts`, `apps/web/src/app/api/private-payout/prepare/route.ts`, `apps/web/src/app/api/private-payout/execute-testnet/route.ts`, `apps/web/src/app/api/private-payout/status/route.ts` | Provider receipts must not leak raw recipient metadata; sandbox receipts must remain labelled sandbox. |
| Treasury routing | Jupiter | Treasury route preview and swap/liquidity corridor | Runtime/repository | https://privatedao.org/services/jupiter-treasury-route/ | `apps/web/src/app/api/jupiter/order/route.ts`, `docs/jupiter-treasury-route.md` | Route preview and order preparation are separate from completed signed swap settlement. |
| Stablecoins | PUSD / AUDD | Stablecoin treasury and payout context | Repository/product | https://privatedao.org/services/pusd-stablecoin/ | `docs/treasury-asset-oracle-engineering-report-2026-06-11.md` | Stablecoin support must be tied to configured mints, wallet signatures, and receipts for settlement claims. |
| Asset context | Tokens-compatible boundary | Verify asset context before a vote or payout | Repository/product | https://privatedao.org/try/ | `apps/web/src/lib/tokens/token-intelligence-provider.ts`, `docs/treasury-asset-oracle-engineering-report-2026-06-11.md` | Never blocks governance if provider is unavailable; fallback labels unknown/sandbox context. |
| Price context | Pyth-compatible boundary | Price context for treasury, payout, and vesting decisions | Repository/product | https://privatedao.org/try/ | `apps/web/src/lib/oracle/oracle-price-provider.ts` | Pyth-compatible boundary is modular and does not imply live oracle settlement unless configured. |
| Treasury operations | Treasury coordination | Private treasury request, approval, route selection, execution receipt, public audit | Product/repository | https://privatedao.org/treasury/ | `docs/treasury-asset-oracle-engineering-report-2026-06-11.md`, `docs/provider-to-encrypted-execution-spine-2026-05-22.md` | Treasury route should reveal public outcome and proof after completion, not active private coordination details. |
| Payroll operations | Confidential payroll | Contributor payroll and reward proof lane with private metadata posture | Product/repository | https://privatedao.org/payroll/ | `docs/refhe-protocol.md`, `docs/refhe-security-model.md`, `docs/privacy-execution-matrix-2026-05-26.md` | Payroll privacy is metadata/proof oriented unless live settlement receipt is attached. |
| GamingDAO | Gaming/community rewards | Community and game reward coordination with private payout/reward rehearsal | Product/repository | https://privatedao.org/gamingdao/ | `docs/privacy-execution-matrix-2026-05-26.md`, `docs/treasury-asset-oracle-engineering-report-2026-06-11.md` | Reward proof must separate game/community outcome from private recipient metadata. |
| RPC and streams | QuickNode | RPC, stream telemetry, block/transaction ingestion and proof monitoring | Runtime/API | https://api.privatedao.org/api/v1/quicknode/stream/stats | `apps/web/src/app/api/quicknode/stream/route.ts`, `docs/quicknode-stream-intelligence.md` | Stream counters are telemetry and monitoring evidence, not a substitute for proposal-specific proof. |
| Data layer | Supabase | Operation receipts, analytics, room/proposal metadata, telemetry | Repository/runtime | https://privatedao.org/reviewer/#application-ready-metrics | `apps/web/src/lib/supabase/operation-receipts.ts`, `docs/supabase-operation-receipts.sql` | Visitor and receipt telemetry are factual when sourced from live APIs; do not estimate beyond returned values. |
| Hosted runtime | AWS API layer | `api.privatedao.org`, readiness, runtime, proof and provider routes | Runtime/API | https://api.privatedao.org/healthz | `docs/infrastructure-telemetry-engineering-report-2026-06-11.md` | Hosted runtime must remain checked independently from GitHub Pages/static mirrors. |
| Growth telemetry | Torque MCP | Growth-loop and event telemetry integration route | Runtime/repository | https://privatedao.org/services/torque-growth-loop/ | `apps/web/src/app/api/torque/custom-event/route.ts`, `docs/torque-growth-loop.md` | Torque telemetry is engagement/growth infrastructure, not governance correctness proof. |
| AI-readable layer | llms.txt / ai.json / evidence.json | Machine-readable reviewer and crawler surface | Public static proof | https://privatedao.org/llms.txt | `apps/web/public/llms.txt`, `apps/web/public/ai.json`, `apps/web/public/evidence.json` | AI-readable manifests describe official surfaces and evidence; they do not replace source code or runtime verification. |

## Reviewer Routing By Specialist

| Reviewer type | Start here | Then inspect | Main question answered |
| --- | --- | --- | --- |
| Ika / 2PC-MPC engineer | https://privatedao.org/services/encrypt-ika-operations/ | `docs/encrypt-ika-2pcmpc-refhe-desktop-report-2026-05-21.md` | How PrivateDAO frames Ika/2PC-MPC as a threshold-approval and confidential-operation boundary. |
| REFHE engineer | https://privatedao.org/services/refhe-payroll-proof/ | `docs/refhe-protocol.md`, `docs/refhe-security-model.md` | How encrypted payroll/payment proofs are represented and where the receipt boundary sits. |
| ZK engineer | https://privatedao.org/documents/privacy-encryption-engineering-report-2026-06-11/ | `docs/zk-proof-registry.json`, `docs/privacy-and-encryption-proof-guide.md` | How the project separates commit, reveal, proof artifact, and future verifier CPI. |
| Commit-reveal/governance engineer | https://privatedao.org/try/ | `docs/solana-anonymous-governance-primitive.md` | How active-vote influence signals are hidden until reveal. |
| MagicBlock engineer | https://privatedao.org/documents/magicblock-engineering-report-2026-06-11/ | `docs/magicblock/private-payments.md`, `docs/magicblock/runtime-evidence.md` | How the current corridor works and what remains for ER/PER-native execution. |
| QVAC/local-AI engineer | https://privatedao.org/services/qvac-sovereign-ai/ | `apps/web/src/lib/ai/qvac.ts`, `apps/web/src/lib/intelligence/llm/prompt-builder.ts` | How intelligence runs before signing without hidden vote data. |
| Data-provider engineer | https://privatedao.org/settings/intelligence/ | `apps/web/src/lib/intelligence/provider-registry.ts` | How external providers are optional, swappable, and isolated from sensitive voting state. |
| Treasury/stablecoin engineer | https://privatedao.org/treasury/ | `docs/treasury-asset-oracle-engineering-report-2026-06-11.md` | How asset context, price context, routing, payout, and verification are connected. |
| RPC/stream engineer | https://api.privatedao.org/api/v1/quicknode/stream/stats | `docs/quicknode-stream-intelligence.md` | How block stream telemetry feeds operational intelligence and proof monitoring. |
| Backend/Supabase engineer | https://privatedao.org/reviewer/#application-ready-metrics | `apps/web/src/lib/supabase/operation-receipts.ts` | How operation receipts and telemetry are stored and reported without estimating. |
| Security reviewer | https://privatedao.org/proof/?judge=1 | `docs/proof-registry.json`, `docs/privacy-and-encryption-proof-guide.md` | Which proof is on-chain, runtime, repository, sandbox, or roadmap. |

## Upgrade Impact

This ledger upgrades PrivateDAO's reviewer surface in four ways:

1. It reduces evaluator ambiguity. Each integration is mapped to a product role, proof route, code reference, and boundary.
2. It prevents overclaiming. Sandbox, optional, and future provider states are labelled directly beside the proof.
3. It makes AI evaluation easier. The same facts are published in the AI-readable layer and can be indexed without crawling long UI pages.
4. It supports protocol conversations. Integration teams can jump directly from product claims to the specific code/docs they need to inspect.

## Evaluation Rule

Use this hierarchy when scoring or auditing PrivateDAO:

1. Prefer live on-chain proof and public runtime APIs when present.
2. Use repository code and tests to verify provider boundaries and non-leakage behavior.
3. Treat sandbox lanes as product-ready rehearsals, not production settlement.
4. Treat roadmap lanes as explicit upgrade paths, not current completion claims.
5. Treat public UX as the simplified operator path and docs/reports as the reviewer-grade detail layer.

## Related Reports

- MagicBlock Engineering Report: https://privatedao.org/documents/magicblock-engineering-report-2026-06-11/
- Engineering Integration Reports Index: https://privatedao.org/documents/integration-reports-index-2026-06-11/
- Intelligence Provider Engineering Report: https://privatedao.org/documents/intelligence-provider-engineering-report-2026-06-11/
- Privacy And Encryption Engineering Report: https://privatedao.org/documents/privacy-encryption-engineering-report-2026-06-11/
- Treasury Asset And Oracle Engineering Report: https://privatedao.org/documents/treasury-asset-oracle-engineering-report-2026-06-11/
- Infrastructure And Telemetry Engineering Report: https://privatedao.org/documents/infrastructure-telemetry-engineering-report-2026-06-11/
