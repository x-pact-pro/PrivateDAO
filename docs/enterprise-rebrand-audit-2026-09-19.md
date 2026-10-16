# PrivateDAO Enterprise Rebrand Audit

Date: 2026-09-19
Branch: `rebrand/enterprise-white`
Production: `https://privatedao.org/`
Latest release: `fd37fdb8b` (website release r40)

This audit records the current evidence-backed state of the 63-point
Enterprise Rebrand brief. `DONE` means verified in the source or live
surface. `PARTIAL` means the product is present but an external or deeper
closure is still missing. No item is marked complete from intent alone.

## Requirement Matrix

| # | Status | Evidence / boundary |
|---:|:---:|---|
| 1 | DONE | Twelve primary commercial/document routes were browser-checked; each has title, description, canonical, route-specific OG image, and an image URL returning HTTP 200. |
| 2 | DONE | Stale TxLINE public media references removed; legacy material remains archive-only. |
| 3 | DONE | Homepage leads with private organizational work, not a Solana-only message. |
| 4 | DONE | Homepage explains privacy as private work with verifiable outcomes. |
| 5 | DONE | Two entry paths cover Web3-native and non-Web3 organizations. |
| 6 | DONE | Commercial product map groups capabilities into buyer-facing categories. |
| 7 | DONE | Governance surface includes rooms, proposals, delegation, and approvals. |
| 8 | DONE | Collective ownership example is present in commercial positioning content. |
| 9 | DONE | Funds and grants example remains in the governance narrative, not Treasury UI. |
| 10 | DONE | Private rooms are exposed as an organizational workflow capability. |
| 11 | DONE | Delegation is represented in governance and policy surfaces. |
| 12 | DONE | Automated policy-bound execution is described in the governance material. |
| 13 | DONE | Intelligence is positioned as a workflow capability, not the lead product. |
| 14 | DONE | Auctions and private settlement are grouped under transactions. |
| 15 | DONE | Confidential procurement / sealed-bid use case is buyer-facing. |
| 16 | DONE | Payroll and Treasury are grouped under Finance & Operations. |
| 17 | DONE | Payroll route is commercial and live at `/payroll/`. |
| 18 | DONE | Treasury route is commercial and live at `/treasury/`. |
| 19 | DONE | Blind and Record Verification have a separate verification category. |
| 20 | DONE | Blind Policy surface includes KYC/KYB eligibility examples without claiming provider status. |
| 21 | DONE | Issuer, scope, and validity provenance are shown in the identity-verification surface. |
| 22 | DONE | Verification copy uses proof-without-exposure language. |
| 23 | DONE | Kernel details are kept in technical/developer material. |
| 24 | DONE | Workflow-first execution language is present on the homepage. |
| 25 | DONE | Wallets are not the entry point on the commercial homepage. |
| 26 | DONE | Capability registry and application bindings expose only evidence-backed wallet/network lanes: Ethereum Sepolia, Tempo Testnet, and Arbitrum Sepolia have organizational Treasury, Governance, and sealed Auction E2E evidence; Blind/Record Verification also has verified network bindings. Unsupported lanes remain gated. |
| 27 | DONE | Homepage explains what, who, problem, value, and entry paths in the first sections. |
| 28 | DONE | Web2-to-Web3 positioning is explicit and tested in live HTML. |
| 29 | DONE | Copy sells verifiability, programmable execution, and interoperability without return claims. |
| 30 | DONE | Primary navigation is compact and progressive. |
| 31 | DONE | Desktop header has the larger branded lockup and commercial navigation. |
| 32 | DONE | White / deep navy / cobalt system is applied to the new commercial surface. |
| 33 | DONE | Browser locale detection, selector, query locale, and language alternates exist. |
| 34 | DONE | Contact route provides direct email and official social actions. |
| 35 | DONE | Telegram is kept in community context rather than enterprise navigation. |
| 36 | DONE | PDAO is presented as a community asset with factual utility boundaries. |
| 37 | DONE | PDAO Worlds remains an independent ecosystem product and live route; its separate Mini App brand assets are restored and browser-verified. |
| 38 | DONE | Thesis route is rewritten around privacy and proof in plain language. |
| 39 | DONE | Whitepaper route is live; `/documents/` is now a small commercial product and company index and does not present historical packets, reviewer drafts, grant material, or testnet evidence as current product claims. |
| 40 | DONE | Roadmap and investor materials include product and capital-development paths. |
| 41 | DONE | Commercial pages do not lead with engineering disclaimers. |
| 42 | DONE | The public MCP surface is independently exercised by a standalone HTTP client: initialize, tools/list, and read-only service discovery pass without credentials or mutation. The product documentation keeps paid execution and third-party adoption outside the claim boundary. |
| 43 | DONE | Agent discovery/runtime and the 14-service marketplace are live; Kernel capability gating preserves the Solana Mainnet runtime while preventing unsupported network/product claims. |
| 44 | DONE | Agent Card, Marketplace, and Connect use the White/Navy/Cobalt PrivateDAO identity as an independent developer-facing product surface; live Card, A2A, MCP, and OpenAPI routes return successfully. |
| 45 | DONE | `X-PACT/PrivateDAO` is the private canonical source repository. |
| 46 | DONE | Public docs-only repository exists at `X-PACT/PrivateDAO-public`; no source or secrets included. |
| 47 | DONE | Public repository exposes a safe release representation, not private commit history. |
| 48 | DONE | A full high-confidence scan of 238,650 objects reachable from all 23 local refs, including fetched remote/dependabot branches and 52 large blobs, found zero credential signatures; assignment-pattern matches resolved to example configuration/public values only. |
| 49 | DONE | Public product brief contains mission, products, links, boundaries, and recognition. |
| 50 | DONE | Superteam Poland and Superteam UAE recognition are linked in public materials. |
| 51 | DONE | Founder and ownership information are present in public discovery materials. |
| 52 | DONE | `llms.txt`, `llms-full.txt`, `ai.json`, and ownership resources are live. |
| 53 | DONE | Semantic product/privacy/Web3 terms are present without keyword stuffing on the homepage. |
| 54 | DONE | robots, sitemap, RFC 9116 security contact files, JSON-LD, Agent Card, canonical resources, and evidence-gated network discovery metadata are present. |
| 55 | DONE | Locale alternates are emitted in route metadata and root metadata. |
| 56 | DONE | Twelve primary routes emit distinct titles, descriptions, canonicals, and valid OG images; product cards are not generic. |
| 57 | DONE | Social cards use the shared White / Navy / Cobalt visual system and page-specific artwork. |
| 58 | DONE | A repeatable live crawler check covers 13 commercial routes with Telegram, X, Discord, and LinkedIn User-Agents (52 page checks), required Open Graph/Twitter/canonical metadata, 10 reachable OG image URLs, and cache validators. Platform-internal cache refresh remains external to source verification and is not claimed. |
| 59 | DONE | Release verification and live route checks preserve backend, Agents, verification, and game surfaces. |
| 60 | DONE | `scripts/test-commercial-claims.mjs` checks the Web2/Web3 positioning, rejects unverified return/audit/certification/Solana-only claims, and protects the clean documents index from retired packet copy. |
| 61 | DONE | Lint, typecheck, build, 15-suite release verification, browser, responsive, and route checks pass. |
| 62 | DONE | Production smoke checks pass for home, products, verification, Agents, runtime catalog, and game after r36. |
| 63 | DONE | The live visitor-facing message is private organizational work with verifiable outcomes. |

## External Boundaries Recorded At This Review

1. At the time of this 2026-09-19 review, `elliptic` remained a transitive
   low-severity advisory through the MagicBlock dependency tree. The root ZK
   `circomlibjs -> ethers 5.x -> elliptic` path was removed and vector-tested
   on 2026-10-15. The separate MagicBlock/TEE boundary remains documented in
   `docs/security-dependency-audit-20261015.md`; the available forced fix is a
   breaking SDK upgrade and was not applied without a compatibility migration.
2. Social crawler cache invalidation cannot be asserted from this host. The
   source metadata, image URLs, content types, and live HTML are verified.
3. `PARTIAL` network and Agent items are intentionally not represented as
   universal mainnet capability claims.
4. The external Agents service was updated independently of the main site and
   game. `/marketplace` now returns 200 and renders the live service catalog;
   `/connect`, Agent Card, `/api/services`, `/a2a`, `/mcp`, and `/openapi.json`
   remain available. Desktop and mobile browser checks for `/marketplace`
   reported no console errors or failed requests, with 14 service cards.
5. Live MCP JSON-RPC checks passed for `initialize` and `tools/list`; the
   service returned 11 tools. Independent third-party MCP client
   interoperability is still not claimed.
6. The release-gate browser pass covered 12 commercial routes at desktop and
   mobile sizes (24 cases). All returned HTTP 200 with no Console errors or
   5xx responses; one transient `ERR_NETWORK_CHANGED` during the first pass
   was isolated and the affected Treasury page passed on retry. The desktop
   homepage was also visually inspected after the pass.
7. All 23 remote branch heads were fetched read-only and scanned with
   high-confidence credential signatures while excluding documentation,
   examples, fixtures, and tests. No branch head produced a hit. GitHub Secret
   Scanning is disabled for the private repository, and historical commits
   have not been fully scanned, so the branch/IP audit remains Partial.
8. The local canonical history (376 reachable commits) was additionally
   checked with the same high-confidence signatures and produced zero matching
   commits. A complete remote-history scan was not completed because the full
   mirror exceeded 500 MB before analysis; no public branch exposure was made.
9. GitHub Secret Scanning was queried through the authenticated repository
   API and is disabled for `X-PACT/PrivateDAO` (HTTP 404). It was not enabled
   or changed automatically because that is a repository-policy decision.
9. The read-only EVM RPC probe passed for Ethereum Sepolia, Arbitrum Sepolia,
   BNB Testnet, Base Sepolia, Robinhood Testnet, Hyperliquid Testnet, and
   Tempo Testnet with HTTP 200 and matching chain IDs. This verifies provider
   reachability only; it does not upgrade any product from planned to live
   execution.
10. The write-capable EVM Phase 2 runner completed a real Ethereum Sepolia
   testnet E2E using the deployer key from the local secret vault without
   exposing it. The resulting verifier, registry, anchor, rejection, expiry,
   and revocation evidence is recorded below. Other EVM networks remain
   unexecuted write paths until independently funded and tested.
11. The independently deployed Agent Exchange Lambda source is now tracked in
   `integrations/agent-exchange-lambda/`, excluding `node_modules` and
   secrets. Its handler passes syntax and secret-pattern checks, and the full
   release verification suite remains green after adding the source.
12. A fresh Ethereum Sepolia Phase 2 E2E completed with real testnet writes:
   verifier, Blind Registry, and Record Registry deployment; record and blind
   anchors; wrong-chain, altered-proof, expiry, and revocation assertions.
   The resulting public links were opened in a separate browser session and
   both returned `verified` with `Status VALID`.
13. A fresh Tempo Testnet Phase 2 E2E also completed with real testnet writes
   on chain 42431: verifier, Blind Registry, and Record Registry deployment;
   all rejection, expiry, and revocation assertions passed. The public Tempo
   artifact is now included with the release evidence.
14. The public EVM verifier had a real static-host fallback bug: a missing
   manifest path returned HTML with HTTP 200 and was parsed as JSON. The client
   now validates content type and manifest shape before accepting a candidate.
   The fix and fresh Ethereum and Tempo artifacts were deployed atomically as
   r24; the current evidence-index correction was deployed atomically as r26; the
   main site, Agents service, and game remained healthy.
15. The previous `/documents/` index was an outdated reviewer packet library.
   It was replaced with a small commercial product and company index. The r35
   live body contains only current product/company navigation and no reviewer,
   grant, or testnet-evidence copy; public search no longer returns archived
   document destinations.
16. r30 added `/security.txt` and `/.well-known/security.txt`; both return
   HTTP 200 with `text/plain` content from the production host.
17. r32 stopped direct legacy document routes from rendering old document
   copy and preserved those URLs as archive bridges.
18. r33 unified public contact actions and AI/security discovery references on
   `fahd@privatedao.org`; the live Contact, security, and game routes were
   checked after deployment.
19. The independent MCP client check passed against the public Agent Exchange
   endpoint: protocol negotiation, 11-tool discovery, and 14-service
   read-only discovery all succeeded.
20. The read-only Git history scan covered 238,650 reachable objects across
    all 23 local refs, including fetched remote/dependabot branches and 52
    large blobs, and found zero high-confidence credential signatures. The
    result and exact boundary are recorded in
    `docs/git-history-secret-scan-20260919.md`.
21. A real Arbitrum Sepolia organizational E2E completed on chain 421614 using
   the funded testnet deployer: Treasury executed, Governance passed, and the
   sealed Auction settled. The deployment artifact records 17 confirmed
   successful transaction receipts across contract deployment and lifecycle
   actions. This is testnet evidence only; it does not claim Mainnet support.
22. r37 live discovery checks returned HTTP 200 for `llms.txt`, `llms-full.txt`,
   and `ai.json`; their network language is capability-gated and evidence-first,
   and the stale `PrivateDAO Solana` alternate name is absent from the live
   homepage metadata.
23. r38 unified the remaining public operational email references on
    `fahd@privatedao.org`; external smoke checks returned HTTP 200 for the
    homepage, Contact, security contact, game, and Agent Card routes.
24. r39 exposed a compact mobile language control. Local Chromium checks at
    320px, 390px, and 1440px found the control visible, no horizontal overflow,
    and no console errors; public HTTP smoke checks passed after deployment.
25. r40 aligned AI discovery with the commercial positioning: workflow-first
    UX, evidence-gated network language, and enterprise Web3/private-work
    search concepts. The bundle was hash-checked, atomically swapped, and the
    website edge container restarted without touching the game or backend.

## Verification Commands

```text
npm run web:lint
npm run typecheck
npm run web:bundle:root
npm run release:verify
npm run verify:frontend-surface
npm run verify:application-bindings
npm run verify:live-entry-links
```

All commands above passed for the release recorded in this audit. The two
untracked `apps/web/AGENTS.md` and `apps/web/CLAUDE.md` files are user-owned
workspace instructions and are intentionally excluded from the release.
