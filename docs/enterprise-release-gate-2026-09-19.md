# PrivateDAO Enterprise Release Gate (historical snapshot)

> Historical note: the dependency statements in this dated release record are
> preserved for audit history. The root `circomlibjs -> ethers 5.x -> elliptic`
> chain was removed and verified by the 2026-10-15 dependency audit. The
> separate MagicBlock/TEE transitive boundary remains documented there.

Date: 2026-09-19
Branch: `rebrand/enterprise-white`
Latest audited commit: `c971b740f`

## Verified

- `npm run release:verify`: all 15 suites passed, including the independent
  MCP client and social-preview checks.
- Commercial browser pass: 12 routes x 2 viewports = 24 cases.
- Desktop and mobile routes returned HTTP 200.
- No Console errors or HTTP 5xx responses in the release-gate pass.
- Treasury was rechecked after one transient `ERR_NETWORK_CHANGED` and passed.
- Homepage was visually inspected at desktop size.
- `https://agents.privatedao.org/marketplace` and `/connect` passed desktop/mobile browser checks.
- Agent Card, `/api/services`, `/a2a`, `/mcp`, and `/openapi.json` returned 200.
- `/documents/` now exposes only current product/company links; historical document URLs remain explicit archive bridges.
- MCP JSON-RPC `initialize` and `tools/list` passed; 11 tools were returned.
- `https://privatedao.org/`, `/game/`, and `https://game.privatedao.org/game/godot/index.html` returned 200 after the Agents-only deployment.
- Tempo Testnet Phase 2 evidence was published and its Record and Blind verification links returned 200 and `Status VALID` in an independent browser session.
- `/documents/` is a small commercial product and company index; r34 passed live checks with no reviewer/grant/testnet-evidence language, no console errors observed in the available runtime checks, and HTTP 200.
- Website release r27 was deployed atomically with the prior site retained for rollback.
- The separate Mini App service received only the missing `/game/assets/brand/privatedao_logo.jpg` and `/game/assets/brand/privatedao_icon.png` assets; no game code or game service was restarted.
- A fresh Chromium desktop pass returned HTTP 200 with no console errors or failed requests for `/`, `/documents/`, and `/game/`.
- The r28 correction replaced only `/documents/index.html` after the full bundle was rejected by the server's full disk; the active site directory was verified intact before the narrow replacement.
- The live `/documents/` body was checked for stale grant text and returned none; the rollback copy is retained beside the active file.
- A read-only high-confidence scan of all 23 local refs and 190,894 reachable blobs found no credential signatures, including the 52 large blobs; only example configuration/public-value assignment matches remained.
- Metadata smoke test passed for 12 primary routes: all returned HTTP 200 with title, description, canonical, page-specific OG image, and OG image HTTP 200.
- `commercial-claims` is now a release suite; it checks five commercial source surfaces for required Web2/Web3 and privacy language, rejects unverified commercial claims, and protects the documents index from retired packet copy. The complete release gate passed 13/13 suites.
- r29 was deployed atomically after the claim gate passed; live Chromium verified `/`, `/documents/`, and `/game/` with HTTP 200 and no console or failed-request errors.
- r30 added RFC 9116 security contact files at `/security.txt` and `/.well-known/security.txt`.
- r31 replaced the documents index with the simplified commercial resource page. The active site, homepage, and game route returned HTTP 200 after the swap; only the website edge container was restarted.
- r32 archived direct legacy document routes behind a continuity page; old document copy is no longer rendered as current product evidence.
- r33 unified public contact actions, security contact files, and AI discovery email references on `fahd@privatedao.org`; the homepage, contact page, security files, and game route returned HTTP 200 after the swap.
- The independent MCP client check passed against `agents.privatedao.org`:
  JSON-RPC initialize, 11-tool discovery, and read-only service discovery
  returned successfully.
- The read-only reachable-object history scan found zero high-confidence
  credential signatures across 7,531 objects; remote branch history remains a
  documented boundary rather than an unverified claim.
- To recover deployment headroom, only obsolete website rollback directories r19-r25 were removed from EC2. The active site and rollback directories r26/r27 were retained, and home/documents/game returned HTTP 200 afterward.
- r34 replaced only the commercial website volume after the official information index was simplified again. The active site was staged, hash-checked, atomically swapped, and rolled back once when an internal redirect check was too strict; the corrected swap passed `/`, `/documents/`, and `/game/`. Only the website edge container was restarted. Rollback directories r32, r33, and r34 remain; obsolete r26-r31 copies were removed to recover disk space.
- r35 removed archived `/documents/<slug>` destinations from the public site search index while preserving their archive bridge URLs. The release passed the 14-suite gate, was staged and atomically swapped, and live checks confirmed `/`, `/documents/`, `/search/`, and `/game/` at HTTP 200 with the main product routes still available.
- r36 added verified Arbitrum Sepolia organizational E2E evidence for Treasury, Governance, and sealed Auctions. The release passed all 14 verification suites, was staged with matching hashes, atomically swapped, and live checks confirmed the commercial routes, `/verify/*`, `/game/`, and the runtime catalog. Only the website edge container was restarted; the rollback copy is retained at `/home/ec2-user/PrivateDAO/deploy/primary-host/volumes/site.rollback-r36-20260919040827`.
- r37 aligned `llms.txt`, `ai.json`, and SoftwareApplication metadata with the evidence-gated multi-network posture, removing the stale Solana-only alternate name and mainnet execution wording. The release passed typecheck and all 14 suites, was hash-checked and atomically swapped, and live discovery/product routes returned HTTP 200. The rollback copy is retained at `/home/ec2-user/PrivateDAO/deploy/primary-host/volumes/site.rollback-r37-20260919041510`.
- r38 unified the remaining public operational email references on `fahd@privatedao.org`. The release passed typecheck, all 14 suites, static export checks, and external smoke checks for the homepage, Contact, security contact, game, and Agent Card routes. Only the website edge container was restarted; the previous site was retained as `/home/ec2-user/PrivateDAO/deploy/primary-host/volumes/site.rollback-email-20260919073000`.
- r39 exposed a compact language selector in the mobile header. The release passed typecheck, lint, all 14 suites, production export/bundle checks, and public HTTP smoke checks; the website edge container was restarted only after the staged bundle passed validation. The rollback copy is retained at `/home/ec2-user/PrivateDAO/deploy/primary-host/volumes/site.rollback-r39-20260919075000`.
- r40 aligned `llms.txt` and `ai.json` with the commercial positioning: workflow-first UX, enterprise Web3/private-work language, and evidence-gated network discovery. The release passed typecheck, all 14 suites, JSON validation, hash checks, and live discovery/product smoke checks. Only the website edge container was restarted; the rollback copy is retained at `/home/ec2-user/PrivateDAO/deploy/primary-host/volumes/site.rollback-fd37fdb8-20260919`.

## Explicitly Not Claimed

- A network is not considered supported merely because an RPC or capability entry exists.
- `planned` entries in the capability matrix are not represented as live execution.
- External MCP client interoperability has not been independently certified.
- Historical remote Dependabot branches have not been fetched or made public.
- `npm run verify:social-previews` checks the live source as Telegram, X, Discord, and LinkedIn crawlers across 13 commercial routes, including metadata, canonical URLs, OG images, and cache validators. Platform-internal cache refresh remains outside source verification and is not claimed.
- At the time of this 2026-09-19 review, the transitive `elliptic` advisory
  remained open. Current status is recorded in
  `docs/security-dependency-audit-20261015.md`.

## Production Safety Gate

The main website cutover was completed as an atomic website-volume swap r24, and
the latest mobile-UX release was deployed as r39. The r39
rollback copy is retained at
`/home/ec2-user/PrivateDAO/deploy/primary-host/volumes/site.rollback-r39-20260919075000`.
The game and its separate host/service remained outside the website cutover.

Before a future cutover:

1. Build and run the release verification suites from the canonical commit.
2. Run the desktop/mobile browser pass and inspect the homepage and product pages.
3. Record the active site directory and current container list on EC2.
4. Copy the active site to a versioned rollback directory. Completed for r24, r26, r33, r34, r35, r36, r37, r38, and r39.
5. Perform an atomic directory swap only for the website volume. Completed for r24, r26, r34, r35, r36, r37, r38, and r39.
6. Restart only the website edge process if the bind mount requires it. Completed for r24, r26, r34, r35, r36, r37, r38, and r39.
7. Verify the homepage, commercial routes, Agent Card, EVM links, `/documents/`, `/search/`, discovery files, and `/game/`. Completed for r39 smoke coverage.
8. Keep the rollback directory until the post-release observation window ends.
9. Do not remove containers or game services as part of the website cutover.

If any post-swap check fails, restore the versioned site directory and restart
only the website edge process. Do not restart or replace the game services.
