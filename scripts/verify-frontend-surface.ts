import fs from "fs";
import path from "path";

const ROOT_INDEX = path.resolve("index.html");
const HOME_SHELL = path.resolve("apps/web/src/components/home-shell.tsx");
const SITE_HEADER = path.resolve("apps/web/src/components/site-header.tsx");
const COMMAND_CENTER = path.resolve("apps/web/src/components/command-center.tsx");
const PROOF_CENTER = path.resolve("apps/web/src/components/proof-center.tsx");
const SECURITY_CENTER = path.resolve("apps/web/src/components/security-center.tsx");
const DIAGNOSTICS_CENTER = path.resolve("apps/web/src/components/diagnostics-center.tsx");
const SERVICES_SURFACE = path.resolve("apps/web/src/components/services-surface.tsx");
const PROOF_PAGE = path.resolve("apps/web/src/app/proof/page.tsx");
const JUPITER_TREASURY_ROUTE_PAGE = path.resolve("apps/web/src/app/services/jupiter-treasury-route/page.tsx");
const JUDGE_PAGE = path.resolve("apps/web/src/app/judge/page.tsx");
const SECURITY_PAGE = path.resolve("apps/web/src/app/security/page.tsx");
const API_STATUS_PAGE = path.resolve("apps/web/src/app/api-status/page.tsx");
const RPC_SERVICES_LIVE_PANEL = path.resolve("apps/web/src/components/rpc-services-live-panel.tsx");
const JUPITER_TREASURY_ROUTE_SURFACE = path.resolve("apps/web/src/components/jupiter-treasury-route-surface.tsx");
const CONSUMER_GOVERNANCE_UX_PAGE = path.resolve("apps/web/src/app/services/consumer-governance-ux/page.tsx");
const CURATED_DOCUMENTS = path.resolve("apps/web/src/lib/curated-documents.ts");
const SITE_DATA = path.resolve("apps/web/src/lib/site-data.ts");
const SITE_FOOTER = path.resolve("apps/web/src/components/site-footer.tsx");
const DOCUMENT_RENDERER = path.resolve("apps/web/src/components/document-renderer.tsx");
const TRACK_COMMERCIALIZATION = path.resolve("apps/web/src/lib/track-commercialization.ts");
const TECHNICAL_ELIGIBILITY = path.resolve("apps/web/src/lib/technical-eligibility.ts");
const RPCFAST_INFRASTRUCTURE = path.resolve("apps/web/src/lib/rpcfast-infrastructure.ts");
const OLD_SQUADS_PROPOSAL_DOC = path.resolve("docs/squads-testnet-upgrade-proposal-2026-05-23.md");
const OLD_TIMELOCK_DOC = path.resolve("docs/timelock-enforcement-proof-2026-05-23.md");
const OLD_ARENA_SUBMISSION_DOC = path.resolve("docs/arena-frontier-submission-2026-05-23.md");
const PUBLIC_OPENGRAPH_IMAGE = path.resolve("apps/web/public/opengraph-image.png");
const PUBLIC_TWITTER_IMAGE = path.resolve("apps/web/public/twitter-image.png");

function main() {
  const rootIndex = fs.readFileSync(ROOT_INDEX, "utf8");
  const homeShell = fs.readFileSync(HOME_SHELL, "utf8");
  const siteHeader = fs.readFileSync(SITE_HEADER, "utf8");
  const commandCenter = fs.readFileSync(COMMAND_CENTER, "utf8");
  const proofCenter = fs.readFileSync(PROOF_CENTER, "utf8");
  const securityCenter = fs.readFileSync(SECURITY_CENTER, "utf8");
  const diagnosticsCenter = fs.readFileSync(DIAGNOSTICS_CENTER, "utf8");
  const servicesSurface = fs.readFileSync(SERVICES_SURFACE, "utf8");
  const proofPage = fs.readFileSync(PROOF_PAGE, "utf8");
  const jupiterTreasuryRoutePage = fs.readFileSync(JUPITER_TREASURY_ROUTE_PAGE, "utf8");
  const judgePage = fs.readFileSync(JUDGE_PAGE, "utf8");
  const securityPage = fs.readFileSync(SECURITY_PAGE, "utf8");
  const apiStatusPage = fs.readFileSync(API_STATUS_PAGE, "utf8");
  const rpcServicesLivePanel = fs.readFileSync(RPC_SERVICES_LIVE_PANEL, "utf8");
  const jupiterTreasuryRouteSurface = fs.readFileSync(JUPITER_TREASURY_ROUTE_SURFACE, "utf8");
  const consumerGovernanceUxPage = fs.readFileSync(CONSUMER_GOVERNANCE_UX_PAGE, "utf8");
  const curatedDocuments = fs.readFileSync(CURATED_DOCUMENTS, "utf8");
  const siteData = fs.readFileSync(SITE_DATA, "utf8");
  const siteFooter = fs.readFileSync(SITE_FOOTER, "utf8");
  const documentRenderer = fs.readFileSync(DOCUMENT_RENDERER, "utf8");
  const trackCommercialization = fs.readFileSync(TRACK_COMMERCIALIZATION, "utf8");
  const technicalEligibility = fs.readFileSync(TECHNICAL_ELIGIBILITY, "utf8");
  const rpcfastInfrastructure = fs.readFileSync(RPCFAST_INFRASTRUCTURE, "utf8");
  const oldSquadsProposalDoc = fs.readFileSync(OLD_SQUADS_PROPOSAL_DOC, "utf8");
  const oldTimelockDoc = fs.readFileSync(OLD_TIMELOCK_DOC, "utf8");
  const oldArenaSubmissionDoc = fs.readFileSync(OLD_ARENA_SUBMISSION_DOC, "utf8");

  if (!fs.existsSync(PUBLIC_OPENGRAPH_IMAGE)) {
    throw new Error("public OpenGraph image is missing at /opengraph-image.png");
  }

  if (!fs.existsSync(PUBLIC_TWITTER_IMAGE)) {
    throw new Error("public Twitter image is missing at /twitter-image.png");
  }

  const opengraphSize = fs.statSync(PUBLIC_OPENGRAPH_IMAGE).size;
  if (opengraphSize < 100_000) {
    throw new Error("public OpenGraph image is unexpectedly small and may render blank in link previews");
  }

  if (!homeShell.includes("Superteam Poland") && !homeShell.includes('eyebrow="Why PrivateDAO"')) {
    throw new Error("home shell is missing the achievement surface for Superteam Poland");
  }

  const includesAny = (body: string, fragments: string[]) => fragments.some((fragment) => body.includes(fragment));

  const checks: Array<[string, string, string]> = [
    [rootIndex, "__next_f.push", "root live surface is missing the exported Next.js app payload"],
    [siteHeader, 'href: "/documents"', "site header is missing the Documents route"],
    [siteHeader, 'href: "/learn"', "site header is missing the Learn route"],
    [siteHeader, 'href: "/story"', "site header is missing the Story route"],
    [siteHeader, 'href: "/community"', "site header is missing the Community route"],
    [siteHeader, 'href: "/products"', "site header is missing the Products route"],
    [siteHeader, 'href: "/network"', "site header is missing the Network route"],
    [homeShell, "Powered by the live stack", "home shell is missing the integrated tech section"],
    [homeShell, "REFHE proof receipts", "home shell is missing REFHE proof-receipt language"],
    [homeShell, "MagicBlock execution receipts", "home shell is missing MagicBlock execution-receipt language"],
    [homeShell, "Public good", "home shell is missing the Solana-style value section"],
    [homeShell, "The shortest path from landing page to a real Testnet action", "home shell is missing the focused route-entry narrative"],
    [commandCenter, "Command Center", "command center surface is missing"],
    [proofCenter, "Proof center", "proof center surface is missing"],
    [securityCenter, "Security architecture", "security center surface is missing"],
    [diagnosticsCenter, "Operational diagnostics", "diagnostics center surface is missing"],
    [servicesSurface, "content.commercialTitle", "services surface is missing"],
    [siteData, "Governance Hardening V3", "site data is missing Governance V3"],
    [siteData, "Settlement Hardening V3", "site data is missing Settlement V3"],
    [siteData, "Core integrations", "site data is missing the integrations packet surface"],
    [siteData, "Pilot Program", "site data is missing the Pilot Program surface"],
    [siteData, "Pricing Model", "site data is missing the Pricing Model surface"],
    [siteData, "REFHE", "site data is missing REFHE"],
    [siteData, "MagicBlock", "site data is missing MagicBlock"],
    [siteData, "Fast RPC", "site data is missing Fast RPC"],
    [siteData, "https://www.youtube.com/@privatedao", "site data is missing the official YouTube channel"],
    [curatedDocuments, 'slug: "reviewer-fast-path"', "curated documents are missing reviewer-fast-path"],
    [curatedDocuments, 'slug: "audit-packet"', "curated documents are missing the audit packet"],
    [curatedDocuments, 'slug: "live-proof-v3"', "curated documents are missing live proof V3"],
    [curatedDocuments, 'slug: "trust-package"', "curated documents are missing trust package"],
    [curatedDocuments, 'slug: "service-catalog"', "curated documents are missing service catalog"],
    [curatedDocuments, 'slug: "frontier-integrations"', "curated documents are missing frontier integrations"],
    [curatedDocuments, 'slug: "frontier-track-closure-matrix-2026-05-25"', "curated documents are missing the Frontier track closure matrix"],
    [curatedDocuments, 'slug: "mainnet-proof-package"', "curated documents are missing mainnet proof package"],
    [curatedDocuments, 'slug: "mainnet-acceptance-matrix"', "curated documents are missing mainnet acceptance matrix"],
    [curatedDocuments, 'slug: "squads-current-binary-upgrade-proposal-2026-05-25"', "curated documents are missing current Squads proposal 3 packet"],
    [siteData, "https://discord.gg/GjJykUtTTt", "site data is missing the Discord server link"],
    [siteData, "https://arena.colosseum.org/projects/explore/praivatedao", "site data is missing the Colosseum project link"],
    [siteData, "https://superteam.fun/earn/t/Private-dao-1", "site data is missing the Superteam Earn profile link"],
    [siteData, "https://x.com/privateDAOOS", "site data is missing the X profile link"],
    [siteData, "https://t.me/Fahdkotb", "site data is missing the Telegram contact link"],
    [siteFooter, "communityLinks.map", "site footer is missing centralized community link rendering"],
    [judgePage, "2026-05-27T02:25:39Z", "judge route is missing the current Squads proposal 3 timelock release"],
    [judgePage, "Current proposal index 3", "judge route is missing the current Squads proposal index"],
    [judgePage, "/documents/squads-current-binary-upgrade-proposal-2026-05-25", "judge route is not linked to the current Squads proposal packet"],
    [judgePage, "/documents/mainnet-proof-package", "judge route is missing the release proof package link"],
    [judgePage, "/documents/frontier-track-closure-matrix-2026-05-25", "judge route is missing the Frontier track closure matrix link"],
    [judgePage, "https://privatedao.org/services/jupiter-treasury-route/", "judge route is missing the Jupiter submission link"],
    [judgePage, "https://privatedao.org/services/umbra-confidential-payout/", "judge route is missing the Umbra submission link"],
    [judgePage, "https://privatedao.org/services/eitherway-live-dapp/", "judge route is missing the Eitherway submission link"],
    [judgePage, "https://privatedao.org/services/encrypt-ika-operations/", "judge route is missing the Encrypt/Ika submission link"],
    [securityPage, "Squads proposal index 3", "security route is missing the current Squads proposal index"],
    [securityPage, "2026-05-27T02:25:39Z", "security route is missing the current Squads proposal 3 timelock release"],
    [securityPage, "/documents/squads-current-binary-upgrade-proposal-2026-05-25", "security route is not linked to the current Squads proposal packet"],
    [proofPage, "finalized Testnet private payment receipts", "proof route is missing Testnet private-payment receipt language"],
    [proofPage, "/documents/frontier-track-closure-matrix-2026-05-25", "proof route is missing the Frontier track closure matrix link"],
    [jupiterTreasuryRoutePage, "Jupiter Developer Platform /order", "Jupiter service page is missing static Developer Platform order copy"],
    [apiStatusPage, "MagicBlock receipts", "API status route is missing MagicBlock receipt evidence"],
    [apiStatusPage, "Ika readiness", "API status route is missing Ika readiness evidence"],
    [apiStatusPage, "REFHE proof", "API status route is missing REFHE proof evidence"],
    [rpcServicesLivePanel, "MagicBlock receipts", "RPC services panel is missing MagicBlock receipt checks"],
    [rpcServicesLivePanel, "Ika readiness", "RPC services panel is missing Ika readiness checks"],
    [rpcServicesLivePanel, "REFHE payroll route", "RPC services panel is missing the REFHE payroll proof route"],
    [rpcServicesLivePanel, "accepted stream payloads", "RPC services panel is missing QuickNode stream ingestion detail"],
    [rpcServicesLivePanel, "receipts finalized", "RPC services panel is missing MagicBlock receipt finality detail"],
    [rpcServicesLivePanel, "program executable", "RPC services panel is missing Ika executable-readiness detail"],
    [jupiterTreasuryRouteSurface, "NEXT_PUBLIC_JUPITER_ORDER_ENDPOINT", "Jupiter treasury route is missing server order endpoint support"],
    [jupiterTreasuryRouteSurface, "Developer Platform /order", "Jupiter treasury route is missing Developer Platform order mode copy"],
    [jupiterTreasuryRouteSurface, "Lite Quote fallback", "Jupiter treasury route is missing public quote fallback copy"],
    [consumerGovernanceUxPage, "DAO infrastructure is powerful, but the first user session is usually broken.", "consumer governance UX page is missing the user problem framing"],
    [consumerGovernanceUxPage, "One guided operating path replaces scattered tools", "consumer governance UX page is missing the solution framing"],
    [consumerGovernanceUxPage, "The ecosystem needs private governance that feels like a product", "consumer governance UX page is missing the ecosystem-value framing"],
    [consumerGovernanceUxPage, "/documents/frontier-track-closure-matrix-2026-05-25", "consumer governance UX page is missing the track closure matrix link"],
    [curatedDocuments, "archived canary evidence", "runtime evidence document summary still presents old canary language as current"],
    [oldSquadsProposalDoc, "This is a historical custody packet", "old Squads proposal doc is missing historical status"],
    [oldSquadsProposalDoc, "Current proposal index `3`", "old Squads proposal doc is missing the current proposal index 3 pointer"],
    [oldSquadsProposalDoc, "2026-05-27T02:25:39Z", "old Squads proposal doc is missing the current proposal 3 timelock release"],
    [oldTimelockDoc, "This is a historical enforcement proof", "old timelock doc is missing historical status"],
    [oldTimelockDoc, "Current proposal index `3`", "old timelock doc is missing the current proposal index 3 pointer"],
    [oldTimelockDoc, "2026-05-27T02:25:39Z", "old timelock doc is missing the current proposal 3 timelock release"],
    [oldArenaSubmissionDoc, "preserved as a historical May 23 reviewer snapshot", "old arena submission doc is missing historical status"],
    [oldArenaSubmissionDoc, "Current proposal index `3`", "old arena submission doc is missing the current proposal index 3 pointer"],
    [oldArenaSubmissionDoc, "2026-05-27T02:25:39Z", "old arena submission doc is missing the current proposal 3 timelock release"],
    [documentRenderer, "function parseInline", "document renderer is missing inline markdown support"],
    [documentRenderer, "function flushOrderedList", "document renderer is missing ordered-list support"],
    [documentRenderer, "function flushTable", "document renderer is missing markdown table support"],
    [documentRenderer, 'target={isExternal ? "_blank" : undefined}', "document renderer is missing safe external link handling"],
    [documentRenderer, "rounded-3xl border border-white/10", "document renderer is missing readable table styling"],
  ];

  const forbiddenChecks: Array<[string, string, string]> = [
    [siteData, "live devnet", "site data still presents Devnet as the live operating route"],
    [homeShell, "live devnet", "home shell still presents Devnet as the live operating route"],
    [homeShell, "REFHE confidential-execution posture", "home shell still presents REFHE as posture instead of proof receipts"],
    [servicesSurface, "live devnet", "services surface still presents Devnet as the live operating route"],
    [documentRenderer, "live devnet", "document renderer should not encode stale network copy"],
    [judgePage, "timelock release 2026-05-25T00:31:05Z", "judge route still shows the old Squads timelock release"],
    [securityPage, "2026-05-25T00:31:05Z unlock", "security route still shows the old Squads timelock release"],
    [judgePage, "/documents/squads-testnet-upgrade-proposal-2026-05-23", "judge route still links primary custody proof to the old Squads proposal packet"],
    [securityPage, "/documents/squads-testnet-upgrade-proposal-2026-05-23", "security route still links primary custody proof to the old Squads proposal packet"],
    [trackCommercialization, "live product path stable on devnet", "commercialization plan still presents Devnet as the live product path"],
    [trackCommercialization, "devnet-backed operating partnership", "commercialization plan still presents Devnet as the operating partnership path"],
    [technicalEligibility, "live devnet routes", "technical eligibility still presents Devnet as the live route"],
    [rpcfastInfrastructure, "Primary Ika Solana pre-alpha, proof, and reviewer-readiness route for live Devnet reads", "RPCFast infrastructure still presents Devnet as the current primary read path"],
    [curatedDocuments, "live rail and Devnet execution target", "curated documents still present a Devnet execution target as current"],
    [curatedDocuments, "current Devnet posture", "curated documents still present Devnet posture as current"],
    [curatedDocuments, "documents live Devnet evidence", "curated documents still present Devnet evidence as the current review state"],
  ];

  const hasGithubPagesPrefix = rootIndex.includes("/PrivateDAO/_next/");
  const hasRootDomainPrefix = rootIndex.includes("/_next/");
  if (!hasGithubPagesPrefix && !hasRootDomainPrefix) {
    throw new Error("root live surface is missing both root-domain and GitHub Pages Next asset prefixes");
  }

  for (const [body, fragment, message] of checks) {
    if (!body.includes(fragment)) {
      throw new Error(message);
    }
  }

  for (const [body, fragment, message] of forbiddenChecks) {
    if (body.toLowerCase().includes(fragment.toLowerCase())) {
      throw new Error(message);
    }
  }

  if (!includesAny(homeShell, ["Private governance on Solana", "Governed"])) {
    throw new Error("home shell is missing the primary product badge surface");
  }

  if (!includesAny(homeShell, ["Open verification view", "Review Proof"])) {
    throw new Error("home shell is missing the verification CTA");
  }

  if (
    !includesAny(homeShell, [
      "The public story explains the product, cryptography, and commercial corridors in one watch surface.",
      "Proof and runtime surfaces remain open for judges, operators, and partners after every action.",
    ])
  ) {
    throw new Error("home shell is missing the hosted story and verification narrative section");
  }

  console.log("Frontend surface verification: PASS");
}

main();
