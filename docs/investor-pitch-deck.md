# PrivateDAO Investor And Competition Pitch Deck

This is the canonical repo-native pitch deck source for investors, grant reviewers, and external technical reviewers. It is intentionally evidence-bound: implemented surfaces are described as implemented, while final production-release gates remain clearly separated from what is already live today.

## Slide 1 - Title

**PrivateDAO**

Private governance, confidential treasury operations, and audit-grade runtime evidence for Solana organizations.

Public-good governance and treasury infrastructure for the Solana ecosystem.

Proof anchors:

- 1st Place - Superteam Poland, March 2026: `docs/awards.md`
- Live product: `https://privatedao.org/`
- Testnet program: `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`
- PDAO governance mint evidence: ``

## Slide 2 - The Problem

Most DAO governance leaks intent before decisions are final.

Public votes, visible treasury signaling, and off-chain compensation approvals create:

- whale pressure and vote intimidation
- vote buying and live-tally manipulation
- treasury front-running and operational leakage
- weak auditability around payroll, bonuses, and sensitive approvals

The problem is not only UX. It is governance infrastructure.

## Slide 3 - The Product

PrivateDAO is a Solana governance and treasury product for DAOs, crypto-native teams, grant committees, and on-chain organizations that need privacy without losing auditability.

It should also be understood as public-good infrastructure:

- reusable governance and treasury patterns for the ecosystem
- privacy and trust rails that other teams can inspect and build on
- a product that makes advanced cryptography usable from a normal wallet-first interface

It combines:

- commit-reveal private voting
- timelocked treasury execution
- confidential payroll and bonus approvals
- REFHE-gated settlement envelopes
- MagicBlock private-payment corridor support
- Strict V2 companion accounts for policy, proof, settlement, consumption, cancellation, and voter-weight scope
- backend read node and reviewer-visible runtime evidence

## Slide 4 - Why Now

On-chain organizations are becoming more operationally serious.

They need to vote, approve payouts, control treasuries, and coordinate sensitive decisions without exposing intent too early. Solana is the right environment because it has:

- low-latency execution for operator workflows
- strong wallet and mobile surfaces
- growing DAO and treasury tooling
- a builder ecosystem that rewards real protocol code, not only narrative

## Slide 4A - Public-Good Value

PrivateDAO matters beyond one product surface because it helps the ecosystem:

- coordinate grants and treasury motions with less signaling leakage
- move sensitive governance into clearer, more reviewable operating paths
- reuse privacy, telemetry, and trust patterns instead of rebuilding them from scratch
- understand advanced cryptography through a simpler product interface

## Slide 5 - What Works Today

PrivateDAO is beyond concept stage and already runs as a Testnet product.

Implemented and evidenced today:

- live wallet-connected frontend
- live operational routes for `/start`, `/command-center`, `/dashboard`, `/proof`, `/diagnostics`, and `/services`
- live custody route for `/custody` covering multisig and authority-transfer workflow
- Anchor program and PDA account model on the current Testnet path
- commit, reveal, finalize, veto, cancel, execute lifecycle
- treasury SOL and token execution checks
- confidential payout and encrypted manifest surfaces
- REFHE and MagicBlock settlement gates
- Strict V2 additive security hardening
- Android-native Solana Mobile Wallet Adapter path
- generated audit packet, manifests, runtime evidence, and review surfaces

Canonical gate:

```bash
npm run verify:all
```

## Slide 6 - Evidence And Traction

Current traction is technical and ecosystem validation, not claimed production revenue.

Evidence:

- 1st Place - Superteam Poland
- 50-wallet Testnet rehearsal
- standard Testnet lifecycle proof
- 212 total attempts
- 180 successful attempts
- 32 expected security rejections
- 3 on-chain ZK proof anchors
- live Testnet operating path inside `/start`, `/judge`, `/proof`, `/services`, and `/diagnostics`
- generated audit packet and cryptographic manifest
- market analysis and reviewer package

Primary references:

- `docs/operational-evidence.generated.md`
- `docs/runtime-evidence.generated.md`
- `docs/audit-packet.generated.md`
- `docs/cryptographic-manifest.generated.json`
- `docs/competitive/analysis.generated.md`
- `docs/reviewer-telemetry-packet.generated.md`

## Slide 7 - Differentiation

PrivateDAO is not trying to replace every DAO product.

It focuses on the missing layer between public governance and serious internal operations:

- Realms-style governance is strong for public DAO workflows, but privacy is not the default.
- Squads-style treasury control is strong for multisig execution, but private organizational approvals are not the core product.
- Research privacy systems often lack a usable governance operating surface.

PrivateDAO’s wedge:

Private voting + confidential operational approvals + execution-safe treasury control + reviewer-visible evidence in one Solana-native product.

## Slide 8 - Security Model

PrivateDAO is explicit about the difference between implemented enforcement, attestation, and future cryptographic upgrades.

Implemented now:

- proposal-bound commitment hashes
- proposal-bound vote and delegation records
- timelocked treasury execution
- duplicate-execution resistance
- Strict V2 companion accounts
- settlement evidence and consumption semantics
- on-chain ZK proof anchors in the Devnet evidence path

Current release boundary:

- external audit is pending as an active release gate
- real-funds mainnet is blocked until custody, monitoring, real-device capture, and audit completion are closed
- ZK and external settlement source-verification can be strengthened further through verifier and source-receipt integrations

## Slide 8A - Canonical Custody Proof

PrivateDAO now has a canonical custody proof surface, not only narrative slides.

Official custody state today:

- status: `awaiting-external-record`
- production mainnet claim allowed: `false`
- network: `mainnet-beta`
- threshold target: `2-of-3`
- signer public keys recorded: `0/3`
- multisig implementation: `selection-in-progress`
- multisig address: `record-in-preparation`
- authority transfer signatures: `record-in-preparation`
- post-transfer readouts: `record-in-preparation`
- observed current devnet authority: `4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD`
- observed target-network program readout: `not found`

Canonical sources:

- `docs/custody-observed-readouts.json`
- `docs/canonical-custody-proof.generated.md`
- `docs/custody-proof-reviewer-packet.generated.md`
- `docs/multisig-setup-intake.json`
- `docs/production-custody-ceremony.md`
- `docs/authority-transfer-runbook.md`
- `docs/mainnet-blockers.md`
- `https://privatedao.org/custody/`

Strict ingestion path:

1. Build the public-key and signature packet in `https://privatedao.org/custody/`
2. Save it as local operator input: `docs/custody-evidence-intake.json`
3. Run `npm run apply:custody-evidence-intake`

Reviewer-facing condensation:

- `docs/custody-proof-reviewer-packet.generated.md`
- `https://privatedao.org/documents/custody-proof-reviewer-packet/`

## Slide 9 - Business Model

PrivateDAO does not claim live protocol revenue today.

The commercial model is now specific enough to judge:

1. **Open protocol** - free Testnet product access, source inspection, and proof review build trust and developer adoption.
2. **Fixed pilot** - `$2,500 setup` for a four-week pilot that proves one governance, payout, payroll, or treasury workflow with a buyer-readable proof packet.
3. **Managed operations** - `$750/month` starting point for hosted reads, telemetry, proof exports, operator support, and monthly readiness reviews after a successful pilot.
4. **Sovereign deployment** - custom pricing for customer-cloud installs, dedicated controls, white-label posture, retention policy, and high-touch support.

The near-term value is adoption, trust, and paid pilot conversion. The long-term value is recurring governance infrastructure plus high-value sovereign deployment work.

Boundary:

- the Testnet billing rehearsal proves wallet-signed payment logic and receipt continuity
- the project does not claim live mainnet revenue or finished card subscription automation today

## Slide 10 - Go-To-Market Wedge

Best early users:

- DAO treasury committees
- grant and allocation committees
- crypto-native teams with sensitive payroll or bonus approvals
- mobile-first Solana communities
- strategy or risk committees that need private approval before execution

Clear ecosystem-facing use cases:

- grant and allocation committees
- treasury approvals and controlled payout routing
- protocol operating and security councils
- contributor, vendor, and payroll-style payout governance

Best product corridors:

- primary product shell via the live buyer and command path
- confidential-governance corridor via commit-reveal governance, ZK posture, REFHE, and privacy-aware settlement
- runtime-infrastructure corridor via diagnostics, hosted reads, API packaging, and runtime evidence
- polished product-execution corridor via route quality, live proof continuity, and reviewer discipline
- startup-capital corridor via `/start`, `/story`, `/services`, and the custody reviewer packet
- data-and-telemetry corridor via `/diagnostics`, `/analytics`, and core integrations
- confidential-payout corridor via `/security`, `/services`, `/custody`, and reviewer-visible grant governance

Primary reviewer routes:

- `https://privatedao.org/start/`
- `https://privatedao.org/security/`
- `https://privatedao.org/services/`

## Slide 11 - Roadmap

Near-term repo-complete path:

- keep README, live UI, and evidence surfaces synchronized
- maintain `verify:all` and `check:mainnet` as canonical gates
- deepen real-device wallet capture intake
- close MagicBlock and ZK runtime evidence gaps with real captures

Production path:

- create production 2-of-3 multisig
- configure 48+ hour timelock
- transfer authorities with recorded signatures and readouts
- run external audit or focused independent review
- deploy monitoring and alerting
- perform final cutover ceremony

Trackable milestone logic:

1. governance and proof remain easy to verify from a Testnet wallet session
2. treasury, payout, and diagnostics paths stay reviewer-visible from the live product
3. custody, monitoring, and audit evidence continue to harden the release case
4. production release happens from a strong, legible, ecosystem-useful base

Milestones a funder can track:

1. a new visitor connects a Testnet wallet, runs the core flow, and verifies the result directly
2. a reviewer can inspect proof, telemetry, custody, and diagnostics without leaving the product shell
3. audit, custody, monitoring, and wallet coverage become fully evidenced
4. the release candidate is strong enough for final production cutover

The important discipline is explicit:

- repo truth and live product truth must match
- custody remains pending until real explorer-linked signatures and authority readouts exist
- no deck language should outrun the canonical custody packet

## Slide 12 - The Ask

PrivateDAO is seeking ecosystem funding, grants, and direct investment to move from live Testnet product and audit-readiness candidate into production-grade launch readiness.

Use of funds:

- external audit and security review
- mainnet custody and monitoring setup
- MagicBlock / REFHE source-verifiable settlement work
- real-device wallet and Android capture closure
- first pilot deployments with Solana organizations
- product UX simplification for non-technical operators

The funding case is straightforward:

- the product already exists
- the ecosystem value is legible
- the use cases are clear
- the milestones are trackable
- support compounds into stronger shared infrastructure for Solana

## Slide 13 - Closing Line

PrivateDAO makes on-chain organizational operations meaningfully safer on Solana:

private voting, confidential compensation, disciplined treasury execution, and reviewer-visible runtime trust.

## Appendices

Core links:

- README: `README.md`
- Submission dossier: `docs/submission-dossier.md`
- Live product: `https://privatedao.org/`
- Start route: `https://privatedao.org/start/`
- Services: `https://privatedao.org/services/`
- Security: `https://privatedao.org/security/`
- Trust: `https://privatedao.org/trust/`
- Judge / proof route: `https://privatedao.org/proof/?judge=1`
- Reviewer fast path: `https://privatedao.org/documents/reviewer-fast-path/`
- Reviewer telemetry packet: `https://privatedao.org/documents/reviewer-telemetry-packet/`
- Capital readiness packet: `https://privatedao.org/documents/capital-readiness-packet/`
- Launch trust packet: `https://privatedao.org/documents/launch-trust-packet/`
- Mainnet blockers: `https://privatedao.org/documents/mainnet-blockers/`
- Story video: `https://privatedao.org/story/`
- Technology explainer video: `https://youtu.be/iFTUe4CTWP0`
- YouTube channel: `https://www.youtube.com/@privatedao`
- Discord: `https://discord.gg/GjJykUtTTt`
- Colosseum project page: `https://arena.colosseum.org/projects/explore/praivatedao`
- Security hardening: `docs/security-hardening-v2.md`
- Mainnet blockers: `docs/mainnet-blockers.md`
- Multisig intake: `docs/multisig-setup-intake.md`
- Multisig intake JSON: `docs/multisig-setup-intake.json`
- Custody proof reviewer packet: `docs/custody-proof-reviewer-packet.generated.md`
- Production custody ceremony: `docs/production-custody-ceremony.md`
- Authority transfer runbook: `docs/authority-transfer-runbook.md`
- Monitoring rules: `docs/monitoring-alert-rules.md`
- Wallet E2E plan: `docs/wallet-e2e-test-plan.md`
- Economic model: `docs/economic-model.md`
- Product readiness: `docs/product-readiness.md`
- Investor video package: `docs/investor-video.md`
