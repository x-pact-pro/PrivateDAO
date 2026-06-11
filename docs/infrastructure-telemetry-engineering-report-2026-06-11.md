# PrivateDAO Infrastructure And Telemetry Engineering Report

Date: 2026-06-11  
Audience: backend engineers, RPC providers, infrastructure partners, reliability reviewers, judges  
Repository snapshot reviewed: `origin/main` at `7fb1025ff064c8c83efb2c59ce07ec780964c450`  
Primary posture: AWS-hosted API/read-node, QuickNode-backed Solana telemetry, Supabase product telemetry, and public proof routes.

## 1. Executive Summary

PrivateDAO's infrastructure stack supports the public product without requiring users to understand infrastructure vendors.

The public user sees:

```text
Connect -> Intelligence -> Private Vote -> Reveal -> Verify -> Execute
```

The infrastructure layer supports that with:

- AWS hosted API/read-node layer
- QuickNode Solana RPC and stream telemetry
- Supabase visitor/session/execution metadata
- provider status endpoints
- proof center and AI-readable manifests
- static web mirror and historical route preservation
- backend health/readiness endpoints

The strongest operational claim is:

> PrivateDAO has public hosted routes that expose runtime readiness, provider status, privacy execution claims, MagicBlock proof, QVAC proof, and QuickNode stream telemetry for reviewers.

## 2. AWS Hosted API Layer

Primary evidence:

- `deploy/primary-host/Caddyfile`
- `deploy/primary-host/docker-compose.yml`
- `scripts/run-read-node.ts`
- `scripts/start-deploy.mjs`
- `docs/backend-provider-readiness-2026-05-24.md`
- live host: `api.privatedao.org`

Product role:

- same-domain API and read-node backend
- proof endpoints
- health/readiness status
- QuickNode stream intake
- provider status aggregation
- privacy execution claim preparation

Current boundary:

- hosted backend is live and exposed through `api.privatedao.org`
- secrets remain server-side
- static frontend routes should not contain private keys, provider API keys, or wallet material

## 3. QuickNode RPC And Streams

Primary evidence:

- `docs/backend-provider-readiness-2026-05-24.md`
- `docs/quicknode-stream-intelligence.md`
- `scripts/run-read-node.ts`
- live endpoint: `https://api.privatedao.org/api/v1/quicknode/stream/stats`

Product role:

- Solana Testnet RPC/read pool
- block/transaction stream intake
- stream statistics
- backend proof freshness
- counters and runtime telemetry

Important historical operational note:

- the QuickNode stream destination must point to `https://api.privatedao.org/api/v1/quicknode/stream`
- auth failures and 502 termination incidents were resolved by using the correct security token/header shape and ensuring the AWS destination accepted payloads

Current boundary:

- QuickNode stream telemetry is infrastructure evidence, not governance privacy itself
- stream counters should be reported as telemetry facts, not user counts
- stream intake proves backend reachability and data flow, not private vote correctness by itself

## 4. Supabase Telemetry

Primary evidence:

- visitor/session counters in prior traction report
- `docs/backend-provider-readiness-2026-05-24.md`
- live readiness and metrics endpoints

Product role:

- public DAO metadata
- proposal/reveal records
- room metadata and policies
- analytics and visitor counters
- intelligence cache and historical context

Current boundary:

- Supabase is metadata and telemetry infrastructure
- private vote intent, private room notes, and secrets should not be written into public telemetry tables
- visitor/session counters should be reported as Supabase telemetry, not audited revenue traction

## 5. Provider Status And Proof Routes

Important public routes:

- `https://api.privatedao.org/healthz`
- `https://api.privatedao.org/api/v1/readiness`
- `https://api.privatedao.org/api/v1/provider-integrations/status`
- `https://privatedao.org/api/coordination/providers/status`
- `https://api.privatedao.org/api/v1/privacy-execution-matrix`
- `https://api.privatedao.org/api/v1/privacy-execution-claims`
- `https://api.privatedao.org/api/v1/qvac/runtime-proof`
- `https://api.privatedao.org/api/v1/magicblock/onchain-proof`
- `https://api.privatedao.org/api/v1/magicblock/health`

These routes turn the reviewer experience from "trust our deck" into "open the live proof endpoint."

## 6. AI-Readable Layer

Primary public routes:

- `/llms.txt`
- `/ai.json`
- `/evidence.json`
- `/judge-ai`
- `/robots.txt`
- `/sitemap.xml`
- `/ownership.json`
- `/rights.txt`

Product role:

- help AI reviewers and automated crawlers understand the project accurately
- expose proof routes, repo, runtime evidence, and category
- reduce false "no demo/no repo/no website" evaluations

Current boundary:

- AI-readable files must state verifiable claims and route to evidence
- rights/ownership claims are public notices, not a substitute for formal legal registration

## 7. Torque MCP / Growth Telemetry

Primary evidence:

- `docs/torque-growth-loop.md`
- live privacy execution matrix
- provider status surfaces

Product role:

- growth loop attached to measurable product actions
- event relay through server-side ingestion
- acquisition/retention instrumentation without exposing private workflow secrets

Current boundary:

- Torque credentials must remain server-side
- the static site may build event payloads, but ingestion must be relayed by the backend when API keys are involved
- Torque MCP is an administration/growth tool, not a cryptographic primitive

## 8. Historical Development Notes

Relevant recent commits include:

- `b0876efb8` - aligned read-node cutover packet with live API host.
- `ad75b3655` - added live provider integration status.
- `6001fd40a` - published live privacy execution matrix.
- `0587d9fd8` - added live service execution gate.
- `ae54be196` - added QuickNode stream intake gate.
- `d495eb432` - hardened QuickNode stream intake.
- `75ed6ba33` - clarified QuickNode stream destination.
- `979b5d0d2` - added backend provider readiness gate.
- `1bdabee2f` - exposed QuickNode stream posture in metrics.
- `63a3f91a2` - exposed readiness aggregate in reviewer surfaces.

## 9. Reliability Boundaries

Required behavior:

- frontend can load even if a provider is unavailable
- provider status routes expose configuration health without secrets
- read-node endpoints label network correctly
- QuickNode stream failures should not break static site rendering
- Supabase metrics should not be the only source of execution proof

## 10. Upgrade Path

Recommended next upgrades:

1. Add a single `/status` public page for AWS, QuickNode, Supabase, QVAC, MagicBlock, provider status, and proof freshness.
2. Add a backend job that periodically snapshots provider status into `evidence.json`.
3. Add alerting for QuickNode stream delivery failure and stale proof freshness.
4. Add live route preservation tests for historical URLs.
5. Add an operator runbook for switching DNS between GitHub Pages mirror and AWS primary host.

## 11. Engineering Conclusion

PrivateDAO's infrastructure layer is already structured as a reviewer-visible runtime:

```text
AWS read-node -> QuickNode/Supabase/provider telemetry -> proof routes -> static public UX
```

The next reliability win is not adding another provider name. It is consolidating health, proof freshness, and provider status into one public operational dashboard while keeping secrets and private coordination data out of public telemetry.

