import { competitionTrackWorkspaces, proposalRegistry } from "@/lib/site-data";
import { getPdaoTokenStrategySnapshot } from "@/lib/pdao-token-strategy";
import { getCompetitionLaneLabel } from "@/lib/competition-lane-labels";
import { getSubmissionCoachPlan } from "@/lib/submission-coach";
import { getTreasuryReceiveConfig } from "@/lib/treasury-receive-config";
import { getTrackCommercializationPlan } from "@/lib/track-commercialization";
import { getTrackMainnetGatePlan } from "@/lib/track-mainnet-gates";
import { getTrackNarrativePlan } from "@/lib/track-narratives";
import { getTrackReviewerPacketRoute } from "@/lib/track-reviewer-packets";
import { getTrackTechnicalFit } from "@/lib/technical-eligibility";

export type AssistantSuggestion = {
  title: string;
  summary: string;
  primaryActionLabel: string;
  primaryActionHref: string;
  queryBlock?: {
    kind: "payments-truth";
    title: string;
    readiness: string;
    network: string;
    rails: string;
    blocker: string;
    blockerSummary: string;
    reviewerPacketLabel: string;
    reviewerPacketHref: string;
    bestRouteLabel: string;
    bestRouteHref: string;
  } | {
    kind: "token-truth";
    title: string;
    whatItIs: string;
    whatItIsNot: string;
    gates: string;
    bestProofRouteLabel: string;
    bestProofRouteHref: string;
    tokenSurfaceLabel: string;
    tokenSurfaceHref: string;
  };
  relatedRoutes: Array<{
    label: string;
    href: string;
  }>;
};

type AssistantIntent = {
  title: string;
  summary: string;
  primaryActionLabel: string;
  primaryActionHref: string;
  relatedRoutes: Array<{
    label: string;
    href: string;
  }>;
  keywords: string[];
};

function hasPaymentsTruthIntent(normalized: string) {
  return [
    "treasury",
    "payments",
    "payment",
    "vendor payout",
    "contributor payout",
    "pilot funding",
    "treasury top-up",
    "treasury top up",
    "top-up",
    "top up",
    "sender checklist",
    "payment rails",
    "treasury rails",
    "micropayment",
    "micropayments",
    "agentic treasury",
    "agentic payout",
  ].some((term) => normalized.includes(term));
}

function hasJupiterRouteIntent(normalized: string) {
  return [
    "jupiter",
    "swap",
    "rebalance",
    "treasury swap",
    "treasury rebalance",
    "quote preview",
    "slippage",
    "nanopayment",
    "micropayment rail",
    "agentic micropayment",
  ].some((term) => normalized.includes(term));
}

function hasPusdTreasuryIntent(normalized: string) {
  return [
    "pusd",
    "palm usd",
    "biconomy",
    "stablecoin treasury",
    "stable coin treasury",
    "confidential payroll",
    "grant distribution",
    "gaming reward",
    "stable rewards",
    "usd stablecoin",
  ].some((term) => normalized.includes(term));
}

function hasAuddTreasuryIntent(normalized: string) {
  return [
    "audd",
    "australian digital dollar",
    "australian dollar stablecoin",
    "australian dollar",
    "merchant settlement",
    "invoice settlement",
    "treasury management",
    "programmable finance",
    "merchant tools",
  ].some((term) => normalized.includes(term));
}

function hasTokenTruthIntent(normalized: string) {
  return [
    "pdao",
    "token utility",
    "governance token",
    "payments token",
    "payment token",
    "token strategy",
    "token surface",
    "testnet token",
    "live token",
    "governance mint",
  ].some((term) => normalized.includes(term));
}

function getPusdTreasuryBlock(normalized: string): AssistantSuggestion["queryBlock"] | undefined {
  if (!hasPusdTreasuryIntent(normalized)) return undefined;

  return {
    kind: "payments-truth",
    title: "PUSD stablecoin treasury",
    readiness: "PUSD stablecoin treasury lane active in the product, with browser-signed SPL TransferChecked execution bound to the official Solana mint configuration",
    network: "Solana Testnet",
    rails: "PUSD payroll + grant distribution + gaming rewards + stablecoin treasury proof",
    blocker: "official PUSD mint + funded wallet · activation input",
    blockerSummary:
      "Configure the official Solana PUSD mint and use a funded PUSD wallet to execute the browser-signed TransferChecked path with memo-coded proof.",
    reviewerPacketLabel: "Open PUSD layer brief",
    reviewerPacketHref: "/documents/pusd-stablecoin-treasury-layer",
    bestRouteLabel: "Run stablecoin billing rehearsal",
    bestRouteHref: "/services/testnet-billing-rehearsal",
  };
}

function getAuddTreasuryBlock(normalized: string): AssistantSuggestion["queryBlock"] | undefined {
  if (!hasAuddTreasuryIntent(normalized)) return undefined;

  return {
    kind: "payments-truth",
    title: "AUDD stablecoin treasury",
    readiness: "AUDD stablecoin treasury lane active in the product, with browser-signed SPL TransferChecked execution bound to the official Solana mint configuration",
    network: "Solana Testnet",
    rails: "AUDD merchant settlement + treasury management + invoice collection + programmable finance proof",
    blocker: "official AUDD mint + funded wallet · activation input",
    blockerSummary:
      "Configure the official Solana AUDD mint and use a funded AUDD wallet to execute the browser-signed TransferChecked path with memo-coded proof.",
    reviewerPacketLabel: "Open AUDD layer brief",
    reviewerPacketHref: "/documents/audd-stablecoin-treasury-layer",
    bestRouteLabel: "Run stablecoin billing rehearsal",
    bestRouteHref: "/services/testnet-billing-rehearsal",
  };
}

function getPaymentsTruthBlock(normalized: string): AssistantSuggestion["queryBlock"] | undefined {
  if (!hasPaymentsTruthIntent(normalized)) return undefined;

  const treasury = getTreasuryReceiveConfig();
  const isExecutionPath =
    normalized.includes("vendor payout") || normalized.includes("contributor payout");

  return {
    kind: "payments-truth",
    title: "Payments truth",
    readiness: "Testnet rails live, production treasury still evidence-gated",
    network: treasury.network,
    rails: `${treasury.assets.length} public rails`,
    blocker: "upgrade-authority-multisig · next production gate",
    blockerSummary:
      "Move production upgrade authority and operational authorities into a documented multisig or governance-owned path and record the rotation evidence needed for the next operating milestone.",
    reviewerPacketLabel: "Open treasury proof packet",
    reviewerPacketHref: "/documents/treasury-reviewer-packet",
    bestRouteLabel: isExecutionPath
      ? "Open govern payments path"
      : "Open services payments path",
    bestRouteHref: isExecutionPath ? "/govern" : "/services",
  };
}

function getTokenTruthBlock(normalized: string): AssistantSuggestion["queryBlock"] | undefined {
  if (!hasTokenTruthIntent(normalized)) return undefined;

  const snapshot = getPdaoTokenStrategySnapshot("documents");
  const whatItIs = `${snapshot.network} governance and coordination token with live mint ${snapshot.mint}.`;
  const whatItIsNot =
    "Built as a governance and coordination token first, with payment and settlement rails handled through the broader product infrastructure instead of speculative token positioning.";
  const gates = snapshot.gates
    .slice(0, 3)
    .map((item) => item.label)
    .join(" · ");

  return {
    kind: "token-truth",
    title: "PDAO token truth",
    whatItIs,
    whatItIsNot,
    gates,
    bestProofRouteLabel: "Open PDAO token surface",
    bestProofRouteHref: snapshot.tokenSurfaceHref,
    tokenSurfaceLabel: "Open token architecture",
    tokenSurfaceHref: snapshot.tokenArchitectureHref,
  };
}

function getJupiterRouteBlock(normalized: string): AssistantSuggestion["queryBlock"] | undefined {
  if (!hasJupiterRouteIntent(normalized)) return undefined;

  return {
    kind: "payments-truth",
    title: "Jupiter treasury route",
    readiness: "Treasury route active in product and being tightened into a quote-aware swap and rebalance lane",
    network: "Solana Testnet",
    rails: "Govern + treasury route + settlement evidence",
    blocker: "quote-preview-and-receipt-closure · next operating milestone",
    blockerSummary:
      "Keep route rationale, treasury policy thresholds, and post-route settlement evidence visible in the same operator path so swaps and rebalances remain easy to review.",
    reviewerPacketLabel: "Open Jupiter route brief",
    reviewerPacketHref: "/documents/jupiter-treasury-route",
    bestRouteLabel: "Open Jupiter treasury route",
    bestRouteHref: "/services#jupiter-treasury-route",
  };
}

function getHighPriorityQueryBlock(normalized: string): AssistantSuggestion["queryBlock"] | undefined {
  return getAuddTreasuryBlock(normalized) ?? getPusdTreasuryBlock(normalized) ?? getJupiterRouteBlock(normalized) ?? getTokenTruthBlock(normalized) ?? getPaymentsTruthBlock(normalized);
}

const assistantIntents: AssistantIntent[] = [
  {
    title: "Open the AUDD stablecoin treasury lane",
    summary:
      "Use the AUDD treasury layer when the question is about Australian-dollar settlement, merchant tools, invoice collection, treasury reserves, or programmable finance on Solana.",
    primaryActionLabel: "Run AUDD billing rehearsal",
    primaryActionHref: "/services/testnet-billing-rehearsal",
    relatedRoutes: [
      { label: "AUDD treasury layer", href: "/documents/audd-stablecoin-treasury-layer" },
      { label: "AUDD merchant settlement", href: "/engage?profile=audd-merchant-settlement" },
      { label: "AUDD treasury settlement", href: "/engage?profile=audd-treasury-settlement" },
      { label: "Treasury payment request", href: "/services#treasury-payment-request" },
    ],
    keywords: ["audd", "australian digital dollar", "australian dollar stablecoin", "merchant settlement", "invoice collection", "programmable finance", "treasury management"],
  },
  {
    title: "Open the PUSD stablecoin treasury lane",
    summary:
      "Use the PUSD treasury layer when the question is about Palm USD, institutional stablecoin settlement, confidential payroll, grant distribution, gaming reward pools, or Biconomy PUSD market access.",
    primaryActionLabel: "Run PUSD billing rehearsal",
    primaryActionHref: "/services/testnet-billing-rehearsal",
    relatedRoutes: [
      { label: "PUSD treasury layer", href: "/documents/pusd-stablecoin-treasury-layer" },
      { label: "PUSD payroll intake", href: "/engage?profile=pusd-confidential-payroll" },
      { label: "PUSD gaming rewards", href: "/engage?profile=pusd-gaming-reward-pool" },
      { label: "Treasury payment request", href: "/services#treasury-payment-request" },
    ],
    keywords: ["pusd", "palm usd", "biconomy", "stablecoin", "stable coin", "confidential payroll", "grant distribution", "gaming reward", "stable rewards"],
  },
  {
    title: "Open the Jupiter treasury route",
    summary:
      "Use the services route when the question is about treasury swaps, rebalances, payout funding, agentic micropayments, route clarity, quote-aware execution, or how PrivateDAO is turning treasury motion into a governed product lane.",
    primaryActionLabel: "Open Jupiter treasury route",
    primaryActionHref: "/services#jupiter-treasury-route",
    relatedRoutes: [
      { label: "Jupiter route brief", href: "/documents/jupiter-treasury-route" },
      { label: "Treasury routes", href: "/services#payout-route-selection" },
      { label: "Agentic micropayment rail", href: "/engage?profile=agentic-micropayment-rail" },
      { label: "Govern", href: "/govern#proposal-review-action" },
    ],
    keywords: ["jupiter", "swap", "rebalance", "treasury swap", "treasury rebalance", "quote preview", "slippage", "micropayment rail", "agentic micropayment", "nanopayment"],
  },
  {
    title: "Open the PDAO token truth path",
    summary:
      "Use the token surface and token architecture docs when the reviewer wants the live governance mint boundary, token utility, token-gated participation, or the exact distinction between governance coordination and payment rails.",
    primaryActionLabel: "Open PDAO token surface",
    primaryActionHref: "/documents/pdao-token-surface",
    relatedRoutes: [
      { label: "Token Architecture", href: "/documents/token-architecture" },
      { label: "Govern", href: "/govern" },
      { label: "Live State", href: "/live" },
    ],
    keywords: ["pdao", "token utility", "governance token", "payments token", "token strategy", "governance mint"],
  },
  {
    title: "Start a normal-user PrivateDAO flow",
    summary:
      "Use the onboarding path first, connect a wallet, then continue into the govern flow instead of jumping into proof or raw documents.",
    primaryActionLabel: "Open start route",
    primaryActionHref: "/start",
    relatedRoutes: [
      { label: "Govern", href: "/govern" },
      { label: "Services", href: "/services" },
      { label: "Story Video", href: "/story" },
    ],
    keywords: ["start", "begin", "user", "easy", "onboarding", "consumer", "normal", "first run"],
  },
  {
    title: "Open the shortest review path",
    summary:
      "Use the canonical judge route first. It now combines product proof, integrations, recognition context, runtime evidence, and the direct handoff into proof packets without digging through the full site.",
    primaryActionLabel: "Open canonical judge route",
    primaryActionHref: "/judge",
    relatedRoutes: [
      { label: "Proof Mode", href: "/proof/?judge=1" },
      { label: "Trust Package", href: "/documents/trust-package" },
      { label: "Live Proof V3", href: "/documents/live-proof-v3" },
      { label: "Mainnet Readiness Gates", href: "/documents/mainnet-blockers" },
    ],
    keywords: ["judge", "review", "proof", "trust", "packet", "audit", "reviewer", "award"],
  },
  {
    title: "Inspect cryptography and security posture",
    summary:
      "Open the security route when the question is about ZK, REFHE, MagicBlock, Fast RPC, the capability matrix, or the confidence engine.",
    primaryActionLabel: "Open security route",
    primaryActionHref: "/security",
    relatedRoutes: [
      { label: "ZK Capability Matrix", href: "/documents/zk-capability-matrix" },
      { label: "Confidence Engine", href: "/documents/cryptographic-confidence-engine" },
      { label: "Diagnostics", href: "/diagnostics" },
    ],
    keywords: ["zk", "security", "encryption", "magicblock", "refhe", "rpc", "fast rpc", "cryptography", "matrix"],
  },
  {
    title: "Open the hosted-read backend cutover path",
    summary:
      "Use the read-node cutover runbook when the question is about `api.privatedao.org`, AWS, Namecheap DNS, `/api/v1`, public health checks, or Anchor program alignment on the hosted backend.",
    primaryActionLabel: "Open AWS read-node cutover",
    primaryActionHref: "/documents/aws-namecheap-read-node-cutover-2026-04-29",
    relatedRoutes: [
      { label: "AWS Cutover", href: "/documents/aws-namecheap-read-node-cutover-2026-04-29" },
      { label: "Read-Node Snapshot", href: "/documents/read-node-snapshot" },
      { label: "Read-Node Ops", href: "/documents/read-node-ops" },
    ],
    keywords: ["read node", "read-node", "backend cutover", "same-domain", "api v1", "hosted reads", "metrics", "healthz", "aws", "namecheap", "program drift"],
  },
  {
    title: "Inspect live Solana infrastructure readiness",
    summary:
      "Use the RPC services route when the question is about QuickNode Streams, Solana Testnet RPC, API health, readiness aggregate, visitor counters, execution counters, or backend proof freshness.",
    primaryActionLabel: "Open live readiness",
    primaryActionHref: "/rpc-services",
    relatedRoutes: [
      { label: "API status", href: "/api-status" },
      { label: "Readiness aggregate", href: "/documents/readiness-aggregate" },
      { label: "QuickNode stream intelligence", href: "/documents/quicknode-stream-intelligence" },
    ],
    keywords: [
      "quicknode",
      "quicknode streams",
      "solana rpc",
      "testnet rpc",
      "rpc services",
      "readiness aggregate",
      "api health",
      "api status",
      "backend telemetry",
      "runtime telemetry",
      "proof freshness",
      "visitor counters",
      "execution counters",
    ],
  },
  {
    title: "Open the Security + Intelligence layer",
    summary:
      "Use the intelligence route when the user wants proposal review, treasury execution review, voting summaries, RPC interpretation, or gaming-governance assistance inside the product.",
    primaryActionLabel: "Open intelligence route",
    primaryActionHref: "/intelligence",
    relatedRoutes: [
      { label: "Security", href: "/security" },
      { label: "Services", href: "/services" },
      { label: "Services", href: "/services" },
    ],
    keywords: [
      "proposal analyzer",
      "treasury risk",
      "treasury review",
      "proposal review",
      "voting summary",
      "rpc analyzer",
      "gaming ai",
      "intelligence",
      "ai features",
      "ai powered",
    ],
  },
  {
    title: "Review mainnet authority hardening",
    summary:
      "Open the security route and the authority brief when the question is about multisig, upgrade authority, treasury authority, or admin-boundary discipline before Mainnet.",
    primaryActionLabel: "Open authority hardening",
    primaryActionHref: "/documents/authority-hardening-mainnet",
    relatedRoutes: [
      { label: "Security", href: "/security" },
      { label: "Mainnet Readiness Gates", href: "/documents/mainnet-blockers" },
      { label: "Production Custody Ceremony", href: "/documents/production-custody-ceremony" },
    ],
    keywords: ["multisig", "authority", "upgrade authority", "treasury authority", "admin authority", "ceremony", "mainnet hardening"],
  },
  {
    title: "Open custody truth and proof packet",
    summary:
      "Use the canonical custody proof and custody packet when the question is about multisig evidence, signer roster, authority transfer signatures, or the strict repo-safe custody route.",
    primaryActionLabel: "Open custody proof packet",
    primaryActionHref: "/documents/custody-proof-reviewer-packet",
    relatedRoutes: [
      { label: "Canonical custody proof", href: "/documents/canonical-custody-proof" },
      { label: "Custody", href: "/custody" },
      { label: "Multisig intake shape", href: "/documents/multisig-setup-intake" },
    ],
    keywords: [
      "custody proof",
      "reviewer packet",
      "authority transfer",
      "multisig intake",
      "signer roster",
      "custody ceremony",
      "canonical custody",
    ],
  },
  {
    title: "Open the monitoring and incident path",
    summary:
      "Use diagnostics and the incident runbook when the question is about RPC failures, wallet errors, repeated tx attempts, alerts, logs, or response discipline.",
    primaryActionLabel: "Open incident readiness runbook",
    primaryActionHref: "/documents/incident-readiness-runbook",
    relatedRoutes: [
      { label: "Diagnostics", href: "/diagnostics" },
      { label: "Proof Center", href: "/proof" },
      { label: "Runtime evidence", href: "/viewer/runtime-evidence.generated" },
    ],
    keywords: ["incident", "runbook", "monitoring", "alerts", "logs", "rpc failures", "wallet errors", "replay", "duplicate calls"],
  },
  {
    title: "Open the treasury proof packet",
    summary:
      "Use the treasury packet when the question is about public rails, sender discipline, proof and trust links, payments fit, or the next treasury readiness gate instead of general custody flow only.",
    primaryActionLabel: "Open treasury proof packet",
    primaryActionHref: "/documents/treasury-reviewer-packet",
    relatedRoutes: [
      { label: "Services", href: "/services" },
      { label: "Canonical custody proof", href: "/documents/canonical-custody-proof" },
      { label: "Custody proof packet", href: "/documents/custody-proof-reviewer-packet" },
    ],
    keywords: [
      "treasury reviewer packet",
      "treasury packet",
      "treasury proof",
      "sender checklist",
      "payment rails",
      "treasury rails",
      "payments proof",
    ],
  },
  {
    title: "Open the telemetry packet",
    summary:
      "Use the telemetry packet when the question is about data-side readiness, hosted reads, runtime evidence, analytics posture, or RPC packaging for technical reviewers and operators.",
    primaryActionLabel: "Open telemetry packet",
    primaryActionHref: "/documents/reviewer-telemetry-packet",
    relatedRoutes: [
      { label: "Diagnostics", href: "/diagnostics" },
      { label: "Analytics", href: "/analytics" },
      { label: "Integration evidence", href: "/documents/frontier-integrations" },
    ],
    keywords: ["telemetry packet", "reviewer telemetry", "hosted read proof", "data corridor", "analytics packet", "rpc packet"],
  },
  {
    title: "Find the best wallet and live dApp path",
    summary:
      "Lead with Solflare for the current product shell. Keep Phantom as a familiar fallback, then continue into the govern flow or the live app corridor.",
    primaryActionLabel: "Open wallet-first start path",
    primaryActionHref: "/start",
    relatedRoutes: [
      { label: "Services", href: "/services" },
      { label: "Live State", href: "/live" },
      { label: "Govern", href: "/govern" },
    ],
    keywords: ["wallet", "solflare", "phantom", "backpack", "kamino", "dflow", "quicknode", "eitherway"],
  },
  {
    title: "Open the strongest product route",
    summary:
      "Go to learning, start, services, or proof when the question is about product fit, confidential governance, runtime infrastructure, or reviewer positioning. Keep the visitor on real product routes instead of isolated legacy workspaces.",
    primaryActionLabel: "Open learning path",
    primaryActionHref: "/learn",
    relatedRoutes: [
      { label: "Start", href: "/start" },
      { label: "Services", href: "/services" },
      { label: "Judge Route", href: "/judge" },
    ],
    keywords: ["product route", "privacy", "operations", "analytics", "learning", "reviewer packet", "confidential payouts", "rpc", "encrypted operations"],
  },
  {
      title: "Open the strategic opportunity readiness map",
    summary:
      "Use the opportunity map when the question is about startup accelerator grants, regional grants, analytics side opportunities, confidential payout fit, or hardening-first bounty posture around the same product thesis.",
    primaryActionLabel: "Open opportunity readiness",
    primaryActionHref: "/documents/strategic-opportunity-readiness-2026",
    relatedRoutes: [
      { label: "Services", href: "/services" },
      { label: "Diagnostics", href: "/diagnostics" },
      { label: "Canonical custody proof", href: "/documents/canonical-custody-proof" },
    ],
    keywords: [
      "startup accelerator",
      "accelerator grant",
      "poland grant",
      "regional grant",
      "dune data",
      "dune analytics",
      "umbra",
      "adevar",
      "audit bounty",
    ],
  },
  {
    title: "Open ecosystem focus alignment",
    summary:
      "Use this packet when the reviewer wants the exact mapping from PrivateDAO into decentralisation, censorship resistance, DAO tooling, education, developer tooling, payments, and selective cause-driven fit.",
    primaryActionLabel: "Open ecosystem focus alignment",
    primaryActionHref: "/documents/ecosystem-focus-alignment",
    relatedRoutes: [
      { label: "Strategic opportunity map", href: "/documents/strategic-opportunity-readiness-2026" },
      { label: "Services", href: "/services" },
      { label: "Developers", href: "/developers" },
    ],
    keywords: [
      "decentralisation",
      "decentralization",
      "censorship resistance",
      "dao tooling",
      "education",
      "developer tooling",
      "payments grant",
      "cause driven",
      "focus alignment",
    ],
  },
  {
    title: "Package the commercial and API surface",
    summary:
      "Use the services route when the question is about pilots, hosted reads, enterprise governance, sales posture, or infrastructure packaging for buyers and partners.",
    primaryActionLabel: "Open services route",
    primaryActionHref: "/services",
    relatedRoutes: [
      { label: "Products", href: "/products" },
      { label: "Service Catalog", href: "/documents/service-catalog" },
      { label: "Pricing Model", href: "/documents/pricing-model" },
    ],
    keywords: ["service", "pricing", "pilot", "enterprise", "sales", "customer", "api", "hosted", "commercial", "rpc"],
  },
  {
    title: "Join the PrivateDAO community",
    summary:
      "Use the community route when the goal is to join Discord, subscribe on YouTube, or follow public product updates without going through proof-heavy reviewer pages.",
    primaryActionLabel: "Open community hub",
    primaryActionHref: "/community",
    relatedRoutes: [
      { label: "Discord", href: "https://discord.gg/PbM8BC2A" },
      { label: "YouTube", href: "https://www.youtube.com/@privatedao" },
      { label: "Story Video", href: "/story" },
    ],
    keywords: ["community", "discord", "join", "server", "youtube", "channel", "social", "telegram", "x"],
  },
  {
    title: "Search the document and viewer layer",
    summary:
      "Use the document library first for curated packets, then the broader viewer if you need raw repository depth or generated operational artifacts.",
    primaryActionLabel: "Open curated documents",
    primaryActionHref: "/documents",
    relatedRoutes: [
      { label: "Viewer", href: "/viewer" },
      { label: "Reviewer Fast Path", href: "/documents/reviewer-fast-path" },
      { label: "Audit Packet", href: "/documents/audit-packet" },
    ],
    keywords: ["document", "docs", "viewer", "readme", "artifact", "generated", "packet"],
  },
];

const fallbackSuggestion: AssistantSuggestion = {
  title: "Start from the product shell",
  summary:
    "If the goal is unclear, begin at onboarding or the govern flow. That gives the shortest route to a real product flow, wallet action, proof surface, or learning path.",
  primaryActionLabel: "Open start route",
  primaryActionHref: "/start",
  relatedRoutes: [
    { label: "Govern", href: "/govern" },
    { label: "Search", href: "/search" },
      { label: "Learn", href: "/learn" },
  ],
};

const competitionAliases: Record<string, string[]> = {
  "colosseum-frontier": ["colosseum", "frontier", "grand champion", "accelerator", "product impact"],
  "privacy-track": ["privacy", "magicblock", "encrypted", "zk", "refhe", "private governance"],
  "eitherway-live-dapp": ["eitherway", "solflare", "kamino", "dflow", "quicknode", "live dapp", "wallet track"],
  "rpc-infrastructure": ["rpc", "quicknode", "infrastructure", "hosted reads", "diagnostics", "api"],
  "consumer-apps": ["consumer", "tokenton", "tokenton26", "ux", "onboarding", "normal users"],
  "ranger-main": ["ranger", "main track", "startup quality", "build a bear"],
  "ranger-drift": ["drift", "treasury", "capital allocation", "side track", "risk"],
  "100xdevs": ["100xdevs", "frontend", "next.js", "developer quality", "shipping discipline"],
  "encrypt-ika": ["encrypt", "ika", "encrypted ops", "confidential operations"],
  "solrouter-encrypted-ai": ["solrouter", "encrypted ai", "assistant", "ai track"],
};

type TreasuryProfile =
  | "pilot-funding"
  | "treasury-top-up"
  | "vendor-payout"
  | "contributor-payout";

function detectTreasuryProfile(query: string): TreasuryProfile | null {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("pilot funding")) return "pilot-funding";
  if (normalized.includes("vendor payout")) return "vendor-payout";
  if (normalized.includes("contributor payout")) return "contributor-payout";
  if (
    normalized.includes("treasury top-up") ||
    normalized.includes("treasury top up") ||
    normalized.includes("top-up") ||
    normalized.includes("top up")
  ) {
    return "treasury-top-up";
  }
  return null;
}

function getProfileTrackSuggestion(query: string): AssistantSuggestion | null {
  const normalized = query.trim().toLowerCase();
  const profile = detectTreasuryProfile(normalized);
  const workspace = findCompetitionWorkspace(normalized);

  if (!profile || !workspace) return null;

  if (profile === "pilot-funding") {
    return {
      title: `Pilot funding route for ${getCompetitionLaneLabel(workspace.slug)}`,
      summary:
        "Go straight into the strongest product route for pilot funding: start first, then engage, then proof and trust.",
      primaryActionLabel: "Open product route",
      primaryActionHref: workspace.liveRoute,
      relatedRoutes: [
        { label: "1. Product route", href: workspace.liveRoute },
        { label: "2. Engage", href: "/engage?profile=pilot-funding" },
        { label: "3. Proof", href: workspace.proofRoute },
      ],
      queryBlock: getHighPriorityQueryBlock(normalized),
    };
  }

  if (profile === "treasury-top-up") {
    return {
      title: `Treasury top-up route for ${getCompetitionLaneLabel(workspace.slug)}`,
      summary:
        "Go straight into the strongest treasury route: services first, then engage, then product proof.",
      primaryActionLabel: "Open product route",
      primaryActionHref: workspace.liveRoute,
      relatedRoutes: [
        { label: "1. Product route", href: workspace.liveRoute },
        { label: "2. Engage", href: "/engage?profile=treasury-top-up" },
        { label: "3. Services", href: "/services" },
      ],
      queryBlock: getHighPriorityQueryBlock(normalized),
    };
  }

  if (profile === "vendor-payout") {
    return {
      title: `Vendor payout route for ${getCompetitionLaneLabel(workspace.slug)}`,
      summary:
        "Go straight into the governed vendor route: product path first, then govern and diagnostics, then trust.",
      primaryActionLabel: "Open product route",
      primaryActionHref: workspace.liveRoute,
      relatedRoutes: [
        { label: "1. Product route", href: workspace.liveRoute },
        { label: "2. Govern", href: "/govern" },
        { label: "3. Diagnostics", href: "/diagnostics" },
      ],
      queryBlock: getHighPriorityQueryBlock(normalized),
    };
  }

  return {
    title: `Contributor payout route for ${getCompetitionLaneLabel(workspace.slug)}`,
    summary:
      "Go straight into the governed contributor route: product path first, then govern, then security and trust.",
    primaryActionLabel: "Open product route",
    primaryActionHref: workspace.liveRoute,
    relatedRoutes: [
      { label: "1. Product route", href: workspace.liveRoute },
      { label: "2. Govern", href: "/govern" },
      { label: "3. Security", href: "/security" },
    ],
    queryBlock: getHighPriorityQueryBlock(normalized),
  };
}

function getStrategicOpportunitySuggestion(query: string): AssistantSuggestion | null {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;

  const opportunityRules = [
    {
      keywords: ["startup accelerator", "accelerator grant", "startup grant"],
      title: "Open the startup capital corridor",
      summary:
        "Start from the strategic opportunity map, then move into services and the custody proof packet. This is the shortest evidence-bound route for accelerator and funding reviewers.",
      primaryActionHref: "/documents/strategic-opportunity-readiness-2026",
      relatedRoutes: [
        { label: "1. Strategic opportunity map", href: "/documents/strategic-opportunity-readiness-2026" },
        { label: "2. Services", href: "/services" },
        { label: "3. Custody proof packet", href: "/documents/custody-proof-reviewer-packet" },
      ],
    },
    {
      keywords: ["poland grant", "regional grant", "poland grants"],
      title: "Open the regional grant corridor",
      summary:
      "Start from the strategic opportunity map, then use awards, start, and the launch trust packet as the regional proof chain.",
      primaryActionHref: "/documents/strategic-opportunity-readiness-2026",
      relatedRoutes: [
        { label: "1. Strategic opportunity map", href: "/documents/strategic-opportunity-readiness-2026" },
        { label: "2. Awards", href: "/awards" },
        { label: "3. Launch trust packet", href: "/documents/launch-trust-packet" },
      ],
    },
    {
      keywords: ["dune data", "dune analytics", "data sidetrack", "data side track"],
      title: "Open the data and telemetry corridor",
      summary:
        "Start from the strategic opportunity map, then continue into diagnostics, analytics, and integration evidence for the clearest runtime-data story.",
      primaryActionHref: "/documents/strategic-opportunity-readiness-2026",
      relatedRoutes: [
        { label: "1. Strategic opportunity map", href: "/documents/strategic-opportunity-readiness-2026" },
        { label: "2. Diagnostics", href: "/diagnostics" },
        { label: "3. Analytics", href: "/analytics" },
      ],
    },
    {
      keywords: ["umbra", "confidential payout", "private payout"],
      title: "Open the confidential payout corridor",
      summary:
        "Start from the strategic opportunity map, then continue into security, services, and custody for the reviewer-safe payout path.",
      primaryActionHref: "/documents/strategic-opportunity-readiness-2026",
      relatedRoutes: [
        { label: "1. Strategic opportunity map", href: "/documents/strategic-opportunity-readiness-2026" },
        { label: "2. Security", href: "/security" },
        { label: "3. Custody", href: "/custody" },
      ],
    },
    {
      keywords: ["adevar", "audit bounty", "hardening bounty", "security bounty"],
      title: "Open the audit and hardening corridor",
      summary:
        "Start from the strategic opportunity map, then continue into canonical custody proof, authority hardening, and incident readiness as the strict hardening bundle.",
      primaryActionHref: "/documents/strategic-opportunity-readiness-2026",
      relatedRoutes: [
        { label: "1. Strategic opportunity map", href: "/documents/strategic-opportunity-readiness-2026" },
        { label: "2. Canonical custody proof", href: "/documents/canonical-custody-proof" },
        { label: "3. Authority hardening", href: "/documents/authority-hardening-mainnet" },
      ],
    },
  ];

  const match = opportunityRules.find((rule) => rule.keywords.some((keyword) => normalized.includes(keyword)));
  if (!match) return null;

  return {
    title: match.title,
    summary: match.summary,
    primaryActionLabel: "Open opportunity readiness",
    primaryActionHref: match.primaryActionHref,
    relatedRoutes: match.relatedRoutes,
  };
}

function getTreasuryProfileSuggestion(query: string): AssistantSuggestion | null {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;

  if (normalized.includes("pilot funding")) {
    return {
      title: "Open the pilot funding bundle",
      summary:
        "Start with Engage to qualify the buyer path, then open the product route where the first three surfaces are ordered for pilot funding: start path, buyer context, then trust and proof.",
      primaryActionLabel: "Open pilot funding path",
      primaryActionHref: "/engage?profile=pilot-funding",
      relatedRoutes: [
        { label: "1. Engage", href: "/engage?profile=pilot-funding" },
        { label: "2. Start", href: "/start" },
        { label: "3. Proof and trust", href: "/documents/reviewer-fast-path/" },
      ],
      queryBlock: getPaymentsTruthBlock(normalized),
    };
  }

  if (normalized.includes("vendor payout")) {
    return {
      title: "Open the vendor payout bundle",
      summary:
        "Start from the vendor payout lane, then use the live product route with execution-first ordering: services first, then metrics and diagnostics, then custody and trust.",
      primaryActionLabel: "Open vendor payout path",
      primaryActionHref: "/engage?profile=vendor-payout",
      relatedRoutes: [
        { label: "1. Engage", href: "/engage?profile=vendor-payout" },
        { label: "2. Services", href: "/services" },
        { label: "3. Govern and diagnostics", href: "/govern" },
      ],
      queryBlock: getPaymentsTruthBlock(normalized),
    };
  }

  if (normalized.includes("contributor payout")) {
    return {
      title: "Open the contributor payout bundle",
      summary:
        "Start from the contributor payout lane, then use the consumer-ready product route with execution-first ordering: start first, then metrics, then custody and trust before broader commercial reading.",
      primaryActionLabel: "Open contributor payout path",
      primaryActionHref: "/engage?profile=contributor-payout",
      relatedRoutes: [
        { label: "1. Engage", href: "/engage?profile=contributor-payout" },
        { label: "2. Start", href: "/start" },
        { label: "3. Govern and trust", href: "/govern" },
      ],
      queryBlock: getPaymentsTruthBlock(normalized),
    };
  }

  if (normalized.includes("treasury top-up") || normalized.includes("treasury top up") || normalized.includes("top-up") || normalized.includes("top up")) {
    return {
      title: "Open the treasury top-up bundle",
      summary:
        "Start with treasury capitalization in Engage, then open the RPC route where services, commercialization, and mainnet gates are intentionally raised before deeper proof reading.",
      primaryActionLabel: "Open treasury top-up path",
      primaryActionHref: "/engage?profile=treasury-top-up",
      relatedRoutes: [
        { label: "1. Engage", href: "/engage?profile=treasury-top-up" },
        { label: "2. Services", href: "/services" },
        { label: "3. Services and trust", href: "/services" },
      ],
      queryBlock: getPaymentsTruthBlock(normalized),
    };
  }

  return null;
}

function findCompetitionWorkspace(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;

  const scored = competitionTrackWorkspaces
    .map((workspace) => {
      const aliasTerms = competitionAliases[workspace.slug] ?? [];
      const rawTerms = [
        workspace.slug,
        workspace.title,
        workspace.sponsor,
        workspace.primaryCorridor,
        ...workspace.skillsNeeded,
        ...aliasTerms,
      ]
        .join(" ")
        .toLowerCase()
        .split(/[^a-z0-9.+#-]+/g)
        .filter(Boolean);

      const uniqueTerms = [...new Set(rawTerms)];
      const score = uniqueTerms.reduce(
        (sum, term) => (normalized.includes(term) ? sum + 1 : sum),
        0,
      );
      return { workspace, score };
    })
    .sort((left, right) => right.score - left.score);

  const top = scored[0];
  if (!top || top.score === 0) return null;
  return top.workspace;
}

function getTrackAnswer(query: string): AssistantSuggestion | null {
  const normalized = query.trim().toLowerCase();
  const workspace = findCompetitionWorkspace(normalized);
  if (!workspace) return null;

  if (
    normalized.includes("blocking") ||
    normalized.includes("mainnet") ||
    normalized.includes("blocker")
  ) {
    const gates = getTrackMainnetGatePlan(workspace);
    return {
      title: `Mainnet readiness gates for ${workspace.title}`,
      summary:
        `${gates.beforeMainnet[0]} ${gates.beforeMainnet[1] ?? ""}`.trim(),
      primaryActionLabel: "Open product route",
      primaryActionHref: workspace.liveRoute,
      relatedRoutes: [
        { label: "Mainnet readiness gates", href: "/documents/mainnet-blockers" },
        { label: "Review route", href: workspace.judgeRoute },
        { label: "Engage", href: "/engage" },
      ],
    };
  }

  if (
    normalized.includes("latency") ||
    normalized.includes("success rate") ||
    normalized.includes("wallet coverage") ||
    normalized.includes("proof completion") ||
    normalized.includes("execute health") ||
    normalized.includes("reveal health")
  ) {
    return {
      title: `Testnet metrics for ${workspace.title}`,
      summary:
        "Open the product route to see measured Testnet metrics for success rate, latency, wallet coverage, proof completion, and reveal or execute health in one panel.",
      primaryActionLabel: "Open product route",
      primaryActionHref: workspace.liveRoute,
      relatedRoutes: [
        { label: "Diagnostics", href: "/diagnostics" },
        { label: "Services", href: "/services" },
        { label: "Runtime evidence", href: "/viewer/runtime-evidence.generated" },
      ],
    };
  }

  if (
    normalized.includes("program id") ||
    normalized.includes("token") ||
    normalized.includes("wallet matrix") ||
    normalized.includes("runtime evidence") ||
    normalized.includes("technical evidence")
  ) {
    const technical = getTrackTechnicalFit(workspace.slug);
    return {
      title: `Technical evidence for ${workspace.title}`,
      summary:
        `${technical.coreIdentity[0]?.label}: ${technical.coreIdentity[0]?.value}. ${technical.sponsorUsage[0]}`,
      primaryActionLabel: "Open product route",
      primaryActionHref: workspace.liveRoute,
      relatedRoutes: [
        { label: technical.evidenceRoutes[0]?.label ?? "Proof route", href: technical.evidenceRoutes[0]?.href ?? workspace.proofRoute },
        { label: technical.evidenceRoutes[1]?.label ?? "Wallet matrix", href: technical.evidenceRoutes[1]?.href ?? "/viewer/wallet-compatibility-matrix.generated" },
        { label: "Trust package", href: "/documents/trust-package" },
      ],
    };
  }

  if (
    normalized.includes("why us") ||
    normalized.includes("sponsor should care") ||
    normalized.includes("future problem") ||
    normalized.includes("problem and solution") ||
    normalized.includes("investor")
  ) {
    const narrative = getTrackNarrativePlan(workspace);
    return {
      title: `Strategic case for ${workspace.title}`,
      summary: `${narrative.whySponsorShouldCareNow} ${narrative.futureProblemSolution}`.trim(),
      primaryActionLabel: "Open product route",
      primaryActionHref: workspace.liveRoute,
      relatedRoutes: [
        { label: "Engage", href: "/engage" },
        { label: "Proof", href: workspace.proofRoute },
        { label: "Review", href: workspace.judgeRoute },
      ],
    };
  }

  if (
    normalized.includes("paid") ||
    normalized.includes("customer") ||
    normalized.includes("commercial") ||
    normalized.includes("sell") ||
    normalized.includes("pricing") ||
    normalized.includes("motion")
  ) {
    const commercialization = getTrackCommercializationPlan(workspace);
    return {
      title: `Fastest paid motion for ${workspace.title}`,
      summary: commercialization.firstPaidMotion,
      primaryActionLabel: "Open engage route",
      primaryActionHref: "/engage",
      relatedRoutes: [
        { label: "Product route", href: workspace.liveRoute },
        { label: "Services", href: "/services" },
        { label: commercialization.routes[0]?.label ?? "Pilot program", href: commercialization.routes[0]?.href ?? "/documents/pilot-program" },
      ],
    };
  }

  if (
    normalized.includes("readiness") ||
    normalized.includes("score") ||
    normalized.includes("gap") ||
    normalized.includes("improvement") ||
    normalized.includes("demo order")
  ) {
    const coach = getSubmissionCoachPlan(workspace);
    return {
      title: `Submission coach for ${workspace.title}`,
      summary:
        `Readiness ${coach.readinessScore} (${coach.readinessBand}). Weakest gap: ${coach.weakestGap}`,
      primaryActionLabel: "Open product route",
      primaryActionHref: workspace.liveRoute,
      relatedRoutes: [
        { label: "Live route", href: workspace.liveRoute },
        { label: "Review route", href: workspace.judgeRoute },
        { label: "Proof route", href: workspace.proofRoute },
      ],
    };
  }

  return null;
}

function getCompetitionSuggestion(query: string): AssistantSuggestion | null {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;
  const top = findCompetitionWorkspace(normalized);
  if (!top) return null;

  return {
    title: `Open ${top.title}`,
    summary:
      `${top.objective} Lead with ${top.liveRoute}, keep reviewers on ${top.judgeRoute}, and use the proof and deck routes as the submission support bundle.`,
    primaryActionLabel: "Open product route",
    primaryActionHref: top.liveRoute,
    relatedRoutes: [
      { label: "Live route", href: top.liveRoute },
      { label: "Review route", href: top.judgeRoute },
      { label: "Proof route", href: top.proofRoute },
      { label: "Deck route", href: top.deckRoute },
    ],
  };
}

function getProposalSuggestion(query: string): AssistantSuggestion | null {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;

  const scored = proposalRegistry
    .map((proposal) => {
      const searchable = [
        proposal.id,
        proposal.title,
        proposal.type,
        proposal.status,
        proposal.execution.proposalAccount,
        proposal.execution.recipient ?? "",
        proposal.execution.recipientLabel,
        proposal.execution.executionTarget,
        proposal.execution.mintAddress ?? "",
        proposal.execution.mintSymbol ?? "",
        proposal.summary,
      ]
        .join(" ")
        .toLowerCase();

      let score = 0;
      if (searchable.includes(normalized)) score += 6;
      for (const token of normalized.split(/\s+/).filter(Boolean)) {
        if (searchable.includes(token)) score += 1;
      }

      return { proposal, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  const top = scored[0];
  if (!top) return null;

  const proposal = top.proposal;
  return {
    title: `Open live indexed proposal ${proposal.id}`,
    summary:
      `${proposal.title} is being routed from the unified indexed proposal registry. Open the govern flow with this proposal preselected, then review the proposal and treasury execution surfaces on the real execution context.`,
    primaryActionLabel: "Open govern flow with proposal",
    primaryActionHref: `/govern?proposal=${encodeURIComponent(proposal.id)}`,
    relatedRoutes: [
      { label: "1. Govern", href: `/govern?proposal=${encodeURIComponent(proposal.id)}` },
      { label: "2. Live State", href: "/live" },
      { label: "3. Evidence route", href: proposal.execution.txContext.evidenceRoute },
    ],
  };
}

function getCustodyTruthSuggestion(query: string): AssistantSuggestion | null {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;

  const custodyTerms = [
    "custody proof",
    "reviewer packet",
    "proof packet",
    "authority transfer",
    "multisig intake",
    "signer roster",
    "custody ceremony",
    "canonical custody",
  ];

  if (!custodyTerms.some((term) => normalized.includes(term))) {
    return null;
  }

  return {
    title: "Open custody truth and proof packet",
    summary:
      "Start from the custody packet, then open the canonical custody proof, then custody. This is the fastest route for multisig truth, authority transfer status, and the remaining ceremony evidence.",
    primaryActionLabel: "Open custody proof packet",
    primaryActionHref: "/documents/custody-proof-reviewer-packet",
    relatedRoutes: [
      { label: "1. Custody proof packet", href: "/documents/custody-proof-reviewer-packet" },
      { label: "2. Canonical custody proof", href: "/documents/canonical-custody-proof" },
      { label: "3. Custody", href: "/custody" },
    ],
    queryBlock: getHighPriorityQueryBlock(normalized),
  };
}

function getTelemetrySuggestion(query: string): AssistantSuggestion | null {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;

  const telemetryTerms = [
    "telemetry packet",
    "reviewer telemetry",
    "hosted read proof",
    "data corridor",
    "analytics packet",
    "runtime telemetry",
    "dune data",
    "dune analytics",
    "quicknode",
    "quicknode streams",
    "solana rpc",
    "testnet rpc",
    "readiness aggregate",
    "api health",
    "api status",
    "proof freshness",
  ];

  if (!telemetryTerms.some((term) => normalized.includes(term))) {
    return null;
  }

  return {
    title: normalized.includes("quicknode") || normalized.includes("readiness aggregate") || normalized.includes("api health")
      ? "Open live Solana infrastructure readiness"
      : "Open the telemetry packet",
    summary:
      normalized.includes("quicknode") || normalized.includes("readiness aggregate") || normalized.includes("api health")
        ? "Start from RPC services, then open API status and the readiness aggregate. This is the shortest live route for QuickNode-backed Testnet telemetry, backend health, counters, and proof freshness."
        : "Start from the telemetry packet, then open diagnostics, analytics, and integration evidence. This is the shortest route for runtime maturity, hosted-read value, and infrastructure-facing proof.",
    primaryActionLabel: normalized.includes("quicknode") || normalized.includes("readiness aggregate") || normalized.includes("api health")
      ? "Open live readiness"
      : "Open telemetry packet",
    primaryActionHref: normalized.includes("quicknode") || normalized.includes("readiness aggregate") || normalized.includes("api health")
      ? "/rpc-services"
      : "/documents/reviewer-telemetry-packet",
    relatedRoutes: [
      { label: "1. RPC services", href: "/rpc-services" },
      { label: "2. API status", href: "/api-status" },
      { label: "3. Readiness aggregate", href: "/documents/readiness-aggregate" },
    ],
    queryBlock: getHighPriorityQueryBlock(normalized),
  };
}

function getTokenTruthSuggestion(query: string): AssistantSuggestion | null {
  const normalized = query.trim().toLowerCase();
  if (!normalized || !hasTokenTruthIntent(normalized)) return null;

  return {
    title: "Open the PDAO token truth path",
    summary:
      "Start from the PDAO token surface, then open token architecture, then continue into govern or live state to see the token as live governance coordination rather than speculative token copy.",
    primaryActionLabel: "Open PDAO token surface",
    primaryActionHref: "/documents/pdao-token-surface",
    relatedRoutes: [
      { label: "1. PDAO token surface", href: "/documents/pdao-token-surface" },
      { label: "2. Token architecture", href: "/documents/token-architecture" },
      { label: "3. Govern", href: "/govern" },
    ],
    queryBlock: getTokenTruthBlock(normalized),
  };
}

function getTrackReviewerPacketSuggestion(query: string): AssistantSuggestion | null {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;

  const packetRules = [
    {
      keywords: ["privacy reviewer packet", "privacy packet", "privacy judge packet"],
      title: "Open the privacy reviewer packet",
      route: getTrackReviewerPacketRoute("privacy-track"),
      trackRoute: "/security",
      proofRoute: "/documents/live-proof-v3",
    },
    {
      keywords: ["rpc reviewer packet", "rpc packet", "infrastructure reviewer packet", "infrastructure packet"],
      title: "Open the runtime reviewer packet",
      route: getTrackReviewerPacketRoute("rpc-infrastructure"),
      trackRoute: "/services",
      proofRoute: "/documents/frontier-integrations",
    },
    {
      keywords: ["colosseum packet", "colosseum reviewer packet", "frontier packet", "frontier reviewer packet"],
      title: "Open the core reviewer packet",
      route: getTrackReviewerPacketRoute("colosseum-frontier"),
      trackRoute: "/start",
      proofRoute: "/documents/reviewer-fast-path",
    },
  ];

  const match = packetRules.find((rule) => rule.keywords.some((keyword) => normalized.includes(keyword)));
  if (!match) return null;

  return {
    title: match.title,
    summary:
      "Open the reviewer packet first. It already bundles the judge-first opening, proof closure, the next readiness gate, the strongest product route, and the shortest trust links for that lane.",
    primaryActionLabel: "Open reviewer packet",
    primaryActionHref: match.route,
    relatedRoutes: [
      { label: "1. Reviewer packet", href: match.route },
      { label: "2. Product route", href: match.trackRoute },
      { label: "3. Proof route", href: match.proofRoute },
    ],
    queryBlock: getHighPriorityQueryBlock(normalized),
  };
}

export function getAssistantSuggestion(query: string): AssistantSuggestion {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return fallbackSuggestion;

  const trackReviewerPacketSuggestion = getTrackReviewerPacketSuggestion(normalized);
  if (trackReviewerPacketSuggestion) return trackReviewerPacketSuggestion;

  const profileTrackSuggestion = getProfileTrackSuggestion(normalized);
  if (profileTrackSuggestion) return profileTrackSuggestion;

  const treasuryProfileSuggestion = getTreasuryProfileSuggestion(normalized);
  if (treasuryProfileSuggestion) return treasuryProfileSuggestion;

  const tokenTruthSuggestion = getTokenTruthSuggestion(normalized);
  if (tokenTruthSuggestion) return tokenTruthSuggestion;

  const custodyTruthSuggestion = getCustodyTruthSuggestion(normalized);
  if (custodyTruthSuggestion) return custodyTruthSuggestion;

  const telemetrySuggestion = getTelemetrySuggestion(normalized);
  if (telemetrySuggestion) return telemetrySuggestion;

  const strategicOpportunitySuggestion = getStrategicOpportunitySuggestion(normalized);
  if (strategicOpportunitySuggestion) return strategicOpportunitySuggestion;

  const trackAnswer = getTrackAnswer(normalized);
  if (trackAnswer) return trackAnswer;

  const proposalSuggestion = getProposalSuggestion(normalized);
  if (proposalSuggestion) return proposalSuggestion;

  const competitionSuggestion = getCompetitionSuggestion(normalized);
  if (competitionSuggestion) return competitionSuggestion;

  const scored = assistantIntents
    .map((intent) => ({
      intent,
      score: intent.keywords.reduce((sum, keyword) => (normalized.includes(keyword) ? sum + 1 : sum), 0),
    }))
    .sort((left, right) => right.score - left.score);

  const top = scored[0];
  if (!top || top.score === 0) return fallbackSuggestion;

  return {
    title: top.intent.title,
    summary: top.intent.summary,
    primaryActionLabel: top.intent.primaryActionLabel,
    primaryActionHref: top.intent.primaryActionHref,
    queryBlock: getHighPriorityQueryBlock(normalized),
    relatedRoutes: top.intent.relatedRoutes,
  };
}
