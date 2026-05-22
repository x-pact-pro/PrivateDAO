import { READ_NODE_PROPOSAL_REGISTRY } from "@/lib/read-node-proposal-context.generated";
import { SOLANA_NETWORK_LABEL } from "@/lib/solana-network";

export type ProposalStatus =
  | "Live voting"
  | "Ready to reveal"
  | "Timelocked"
  | "Execution ready"
  | "Evidence gated"
  | "Executed";

export type ProposalCardModel = {
  id: string;
  title: string;
  type: string;
  status: ProposalStatus;
  quorum: string;
  window: string;
  treasury: string;
  privacy: string;
  tech: string[];
  summary: string;
  execution: ProposalExecutionContext;
};

export type ProposalExecutionContext = {
  sourceType: "evidence-backed" | "runtime-indexed" | "operator-draft";
  sourceLabel: string;
  indexedPhase?: string;
  presentationStatus?: ProposalStatus;
  presentationWindow?: string;
  presentationTreasury?: string;
  phaseMappingLabel?: string;
  proposalAccount: string;
  daoAccount?: string;
  treasuryAccount?: string;
  executionTarget: string;
  recipient: string | null;
  recipientLabel: string;
  recipientKnown: boolean;
  amount: number | null;
  amountDisplay: string;
  mintSymbol: string | null;
  mintAddress: string | null;
  timelockHours: number | null;
  timelockLabel: string;
  historicalUseCount: number;
  repeatedAttempts: number;
  baselineAmount: number | null;
  txContext: {
    proofStatus: string;
    evidenceRoute: string;
    createProposalSignature?: string;
    commitSignature?: string;
    revealSignature?: string;
    finalizeSignature?: string;
    executeSignature?: string;
  };
};

export const daoSummary = {
  name: "PrivateDAO Governance Council",
  network: "Solana Testnet",
  treasuryValue: "$2.84M",
  activeMembers: "164",
  livePolicies: "Governance V3 + Settlement V3",
  reviewerState: "Live proof and runtime evidence available",
};

export const topMetrics = [
  {
    label: "Live proofs",
    value: "2",
    detail: "Baseline proof and dedicated V3 proof packet are both reviewer-facing",
  },
  {
    label: "ZK anchors",
    value: "3",
    detail: "On-chain proof anchors exposed in the Testnet evidence path",
  },
  {
    label: "Wallets",
    value: "50",
    detail: "Multi-wallet Testnet rehearsal already captured and packaged",
  },
  {
    label: "Commercial rails",
    value: "4",
    detail: "Grant, fund, gaming, and enterprise service packs remain part of the UI",
  },
];

export const sponsorSignals = [
  {
    name: "Solana",
    accent: "from-[#14f195] via-[#00c2ff] to-[#9945ff]",
    summary: "The core governance, wallet, and Testnet posture stays unmistakably Solana-native.",
  },
  {
    name: "Solflare",
    accent: "from-[#ff8f43] via-[#ff6a3d] to-[#ff4fa3]",
    summary: "Wallet-first live-dApp UX is surfaced directly in the product shell and command flows.",
  },
  {
    name: "Kamino",
    accent: "from-[#9ae66e] via-[#45d483] to-[#00b2a9]",
    summary: "Capital-governance and treasury-discipline positioning stays strong for partner-facing product lanes.",
  },
  {
    name: "QuickNode",
    accent: "from-[#6fe7ff] via-[#4fb4ff] to-[#8067ff]",
    summary: "Fast RPC, diagnostics, and hosted-read posture remain visible as real product value.",
  },
  {
    name: "MagicBlock",
    accent: "from-[#ffe066] via-[#ff9f43] to-[#ff5f7a]",
    summary: "Privacy route strength stays tied to responsive settlement corridors and proof-backed execution.",
  },
  {
    name: "100xDevs",
    accent: "from-[#f7f8ff] via-[#a4b7ff] to-[#6a7cff]",
    summary: "Next.js architecture, reusable UI, and shipping discipline remain obvious to developer judges.",
  },
];

export const frontierOperatingSignals = [
  {
    title: "Product impact matters more than narrative stacking",
    summary:
      "The single most important operating truth is that product impact, startup quality, and believable user value matter more than stacking narratives around one build.",
    action: "Lead every product walkthrough from the live product shell, not from protocol internals.",
  },
  {
    title: "Drift proved ops failures can beat good code",
    summary:
      "The largest Solana DeFi exploit in history came through signer hygiene, durable nonce exposure, weak admin thresholding, and missing timelocks rather than a contract bug.",
    action: "Keep signer posture, timelock discipline, release gates, and runtime clarity visible in the product.",
  },
  {
    title: "STRIDE and SIRN raised the security bar",
    summary:
      "Operational security, threat monitoring, incident readiness, and governance posture now matter alongside audits.",
    action: "Present PrivateDAO as a protocol plus operating system, not as audited code alone.",
  },
  {
    title: "Anchor v1 rewards disciplined upgrade posture",
    summary:
      "Teams now have stronger migration, testing, and runtime safety defaults available through Anchor 1.0.",
    action: "Keep the roadmap aligned with migration-safe schemas, hooks, and stricter runtime validation.",
  },
  {
    title: "Bootcamp 2026 and Engineering Solana raised judge literacy",
    summary:
      "Judges and builders are seeing more production-readiness, indexing, security, and systems-engineering content than before.",
    action: "Make our proof, diagnostics, indexing, and readiness surfaces concrete and easy to inspect.",
  },
];

export const storyVideo = {
  title: "PrivateDAO Website Demo",
  summary:
    "A product-first website demo that shows how a normal user moves through PrivateDAO without code: learn the problem, choose the operating lane, connect a wallet, review the action, sign, and verify the result.",
  runtime: "YouTube-first website demo · upload-ready MP4 backup",
  youtubeHref: "https://youtu.be/iFTUe4CTWP0",
  embedHref: "https://www.youtube.com/embed/iFTUe4CTWP0",
  mp4Href: "/assets/private-dao-product-overview.mp4",
  posterHref: "/assets/private-dao-product-overview-poster.png",
  uploadFile:
    "/assets/private-dao-product-overview.mp4",
};

export const walletChoices = [
  {
    name: "Solflare",
    fit: "Best first-run choice for live dApps, consumer UX, and partner-facing wallet flows.",
  },
  {
    name: "Phantom",
    fit: "Fastest path for mainstream Solana users who want familiar wallet behavior on Testnet.",
  },
  {
    name: "Glow",
    fit: "Additional adapter-backed wallet path for reviewers who want to test compatibility beyond the primary wallets.",
  },
  {
    name: "Backpack",
    fit: "Best for users who want a more advanced signer posture without leaving the product shell.",
  },
  {
    name: "Jupiter Unified Wallet Kit",
    fit: "Wallet-standard and mobile-first UX foundation used to keep the wallet layer extensible without replacing Solflare, Phantom, Glow, or Backpack.",
  },
];

export const gettingStartedActions = [
  {
    title: "Open the guided start workspace",
    detail: "Choose the service corridor, connect a wallet, and follow the shortest path to a real governance action.",
    href: "/start",
  },
  {
    title: "Use the story route first",
    detail: "Start with one hosted overview reel when a normal user or judge needs instant orientation.",
    href: "/story",
  },
  {
    title: "Move into govern",
    detail: "Create, vote, reveal, and execute in one operational rail without dropping into raw docs.",
    href: "/govern",
  },
];

export const achievements = [
  {
    title: "1st Place · Superteam Poland",
    detail:
      "This recognition is presented as an execution signal while the platform stays product-first across governance, proof, and services.",
    meta: "March 2026",
  },
  {
    title: "3rd Place · Superteam UAE Frontier Hackathon",
    detail:
      "A current Frontier recognition signal that sits beside the Poland result while the product keeps proof, runtime, and service routes visible.",
    meta: "May 2026",
  },
  {
    title: "Top 1% in Solana",
    detail:
      "Founder/community credibility signal used carefully as context for execution quality, not as a substitute for live product proof.",
    meta: "Solana ecosystem",
  },
];

export const communityLinks = [
  {
    title: "YouTube",
    href: "https://www.youtube.com/@privatedao",
    summary: "Official PrivateDAO channel for product videos, weekly updates, and public walkthroughs.",
    cta: "Open channel",
  },
  {
    title: "Discord",
    href: "https://discord.gg/PbM8BC2A",
    summary: "Join the PrivateDAO server for product updates, community discussion, weekly releases, and operator coordination.",
    cta: "Join server",
  },
];

function cloneProposalCard(proposal: (typeof READ_NODE_PROPOSAL_REGISTRY)[number]): ProposalCardModel {
  const normalizeNetworkCopy = (value?: string | null) => {
    if (!value) return value ?? undefined;
    if (SOLANA_NETWORK_LABEL === "Devnet") return value;
    return value.replace(/\bdevnet\b/gi, SOLANA_NETWORK_LABEL.toLowerCase());
  };

  return {
    ...proposal,
    title: normalizeNetworkCopy(proposal.title) ?? proposal.title,
    window: normalizeNetworkCopy(proposal.window) ?? proposal.window,
    summary: normalizeNetworkCopy(proposal.summary) ?? proposal.summary,
    tech: [...proposal.tech],
    execution: {
      ...proposal.execution,
      sourceLabel: normalizeNetworkCopy(proposal.execution.sourceLabel) ?? proposal.execution.sourceLabel,
      presentationWindow:
        normalizeNetworkCopy(proposal.execution.presentationWindow) ?? proposal.execution.presentationWindow,
      txContext: {
        ...proposal.execution.txContext,
      },
    },
  };
}

function proposalStatusRank(status: ProposalStatus) {
  switch (status) {
    case "Execution ready":
      return 6;
    case "Evidence gated":
      return 5;
    case "Executed":
      return 4;
    case "Timelocked":
      return 3;
    case "Ready to reveal":
      return 2;
    case "Live voting":
      return 1;
  }
}

function proposalSignalStrength(proposal: ProposalCardModel) {
  let score = proposalStatusRank(proposal.status) * 100;
  score += proposal.tech.length * 8;
  if (proposal.execution.txContext.executeSignature) score += 18;
  if (proposal.execution.txContext.finalizeSignature) score += 10;
  if (proposal.execution.recipientKnown) score += 6;
  if (proposal.execution.mintAddress) score += 4;
  if (proposal.execution.indexedPhase === "Executed") score += 8;
  return score;
}

function compareProposalCards(left: ProposalCardModel, right: ProposalCardModel) {
  const signalGap = proposalSignalStrength(right) - proposalSignalStrength(left);
  if (signalGap !== 0) return signalGap;
  return left.id.localeCompare(right.id);
}

export const proposalRegistry: ProposalCardModel[] = READ_NODE_PROPOSAL_REGISTRY.map(cloneProposalCard).sort(compareProposalCards);

export function getProposalById(proposalId?: string | null) {
  if (!proposalId) return null;
  return (
    proposalRegistry.find((proposal) => proposal.id === proposalId) ??
    proposalRegistry.find((proposal) => proposal.execution.proposalAccount === proposalId) ??
    null
  );
}

export function getPrimaryProposalCards(limit = 6) {
  return proposalRegistry.slice(0, Math.max(1, limit));
}

export const proposalCards: ProposalCardModel[] = getPrimaryProposalCards();

export function getFeaturedProposal(proposalId?: string | null) {
  return getProposalById(proposalId) ?? proposalCards[0] ?? proposalRegistry[0] ?? null;
}

export const treasuryRows = [
  {
    asset: "SOL treasury",
    allocation: "0.02 SOL",
    value: "Testnet rehearsal funded",
    policy: "Timelocked execution / onchain treasury PDA · display uses Testnet evidence, not USD AUM",
    runtime: "Live",
  },
  {
    asset: "Confidential payroll reserve",
    allocation: "USDC/PUSD/AUDD",
    value: "Intent receipts ready",
    policy: "Umbra/Cloak intent receipts + scoped viewing-key audit posture",
    runtime: "Testnet-ready lane",
  },
  {
    asset: "Gaming rewards corridor",
    allocation: "Proposal-bound",
    value: "Governed payout route",
    policy: "MagicBlock settlement evidence with proposal-bound distribution review",
    runtime: "Routed",
  },
  {
    asset: "Strategic grants",
    allocation: "16%",
    value: "$451k",
    policy: "Governance V3 + live proof bundle",
    runtime: "Live",
  },
];

export const timelineEvents = [
  {
    title: "DAO bootstrap",
    detail: "Create DAO, treasury, policy companions, and migration-safe governance defaults.",
    state: "Completed",
  },
  {
    title: "Private vote",
    detail: "Commit-reveal with quorum snapshots, reveal rebate vault, and ZK review overlay when needed.",
    state: "Completed",
  },
  {
    title: "Evidence boundary",
    detail: "REFHE and MagicBlock runtime checks gate treasury execution without changing the legacy path.",
    state: "Live",
  },
  {
    title: "Execution and review",
    detail: "Execution log, Testnet proof packets, and reviewer bundles update together.",
    state: "Live",
  },
];

export const executionLog = [
  {
    label: "Create DAO",
    value: "DAO 8c6N...EvjG deployed with policy snapshotting and treasury rails.",
    status: "confirmed",
  },
  {
    label: "Submit proposal",
    value: "Proposal 6rSb...KqpG recorded with encrypted manifest binding and service-fit guidance.",
    status: "confirmed",
  },
  {
    label: "Private vote",
    value: "Commit and reveal completed with generated runtime evidence and reviewer path.",
    status: "confirmed",
  },
  {
    label: "Execute treasury",
    value: "0.05 SOL Testnet execution completed with explicit proof and settlement packet linkage.",
    status: "confirmed",
  },
];

export const techCards = [
  {
    name: "ZK Layer",
    description:
      "Companion proof surfaces, reviewer packets, and additive hardening flows for sensitive governance paths.",
  },
  {
    name: "REFHE",
    description:
      "Encrypted envelope path for payroll and bonus flows where confidential computation boundaries matter.",
  },
  {
    name: "MagicBlock",
    description:
      "Proposal-scoped token corridor and settlement evidence for private distribution workflows.",
  },
  {
    name: "Fast RPC",
    description:
      "Backend-indexed pooled reads, diagnostics, and proof surfaces so the app feels operational rather than static.",
  },
];

export const servicePacks = [
  {
    name: "Grant Committee",
    fit: "Private committee decisions and public treasury accountability",
    cta: "Start reviewer-visible grant governance",
  },
  {
    name: "Fund Governance",
    fit: "ZK-heavy review rails for sensitive capital allocation",
    cta: "Run private fund governance with stronger review surfaces",
  },
  {
    name: "Gaming DAO",
    fit: "Reward distribution and token-native operations with corridor evidence",
    cta: "Launch private gaming treasury operations",
  },
  {
    name: "Enterprise DAO",
    fit: "Payroll, bonus, and operator trust packaging for real teams",
    cta: "Deploy private internal treasury operations",
  },
];

export const commercialServices = [
  {
    title: "Hosted Read API + Ops",
    summary:
      "Serve governance state, runtime evidence, and diagnostics through a cleaner operational API layer.",
  },
  {
    title: "Pilot Package",
    summary:
      "Week-by-week rollout with trust packet, SLA framing, and buyer-friendly onboarding.",
  },
  {
    title: "Confidential Operations Premium",
    summary:
      "Add encrypted payout boundaries, V3 hardening, and reviewer-ready execution evidence.",
  },
];

export const privateDaoServiceConstellation = [
  {
    title: "Confidential governance",
    audience: "DAOs, grant committees, funds, ecosystem programs",
    problem: "Important decisions leak strategy when every draft, vote, and treasury path is public too early.",
    service:
      "Private proposal intake, commit/reveal voting, reviewer-readable execution state, and proof-linked governance history.",
    execution: "Wallet signs the action, Testnet records the lifecycle, and the product keeps the proof path visible.",
    proof: "Governance lifecycle proof",
    href: "/govern",
    proofHref: "/proof/?judge=1",
  },
  {
    title: "Private polls and committee signals",
    audience: "Grant reviewers, councils, juries, internal committees",
    problem: "Teams need honest signal before public execution without turning private review into an opaque black box.",
    service:
      "Encrypted signal collection, proposal review summaries, evidence packets, and public accountability after a decision is ready.",
    execution: "Signal stays private while the decision route, rationale, and final proof remain inspectable.",
    proof: "Reviewer packet",
    href: "/intelligence",
    proofHref: "/documents/reviewer-fast-path",
  },
  {
    title: "Confidential payroll",
    audience: "Startups, contributor networks, foundations, operators",
    problem: "Payroll and contributor compensation are high-sensitivity flows that still need governance and audit discipline.",
    service:
      "REFHE payroll packet, encrypted payout intent, treasury approval, and role-safe proof for salary and bonus operations.",
    execution: "Operators prepare the confidential packet, reviewers approve the route, and settlement evidence stays attached.",
    proof: "REFHE payroll proof",
    href: "/services/refhe-payroll-proof",
    proofHref: "/documents/confidential-payroll-flow",
  },
  {
    title: "Encrypted payments and private payouts",
    audience: "Treasury teams, vendors, payroll operators, grant programs",
    problem: "Normal payment rails expose too much context around recipients, timing, and operating intent.",
    service:
      "Cloak, Umbra, MagicBlock, Encrypt/IKA, and treasury-route surfaces composed into one confidential payments corridor.",
    execution: "A governed request becomes an encrypted or recipient-private payout path with proof continuity.",
    proof: "Confidential payout packet",
    href: "/services/confidential-payments",
    proofHref: "/documents/confidential-payout-evidence-packet",
  },
  {
    title: "Rewards and gaming treasuries",
    audience: "Games, guilds, tournaments, creator economies",
    problem: "Reward programs need fast distribution without losing policy, treasury limits, or visible fairness.",
    service:
      "Gaming reward pools, MagicBlock execution framing, tournament payout logic, and proposal-scoped settlement boundaries.",
    execution: "Game or tournament intent routes through governance and lands as a controlled reward distribution packet.",
    proof: "Gaming reward corridor",
    href: "/gaming",
    proofHref: "/services/magicblock-private-payments",
  },
  {
    title: "Stablecoin treasury rails",
    audience: "Merchants, foundations, regional operators, service buyers",
    problem: "Teams need stable-value operating rails that remain governed instead of becoming disconnected payment widgets.",
    service:
      "PUSD, AUDD, USDC, and treasury request flows for invoices, grant distribution, merchant settlement, and treasury top-ups.",
    execution: "The visitor selects the asset, purpose, and route; the packet can move into governed delivery and proof.",
    proof: "Treasury request packet",
    href: "/services/testnet-billing-rehearsal",
    proofHref: "/services#treasury-payment-request",
  },
  {
    title: "AI-assisted private operations",
    audience: "Operators, reviewers, treasury analysts, founders",
    problem: "Sensitive governance needs interpretation, but external AI tools can leak operational context.",
    service:
      "Local-first QVAC review, deterministic proposal summaries, treasury route analysis, and encrypted brief generation.",
    execution: "AI helps explain risk and next action before the wallet signs; the signer remains the execution boundary.",
    proof: "Intelligence route",
    href: "/intelligence",
    proofHref: "/services/qvac-sovereign-ai",
  },
  {
    title: "Read API, automations, and live counters",
    audience: "Apps, dashboards, infrastructure buyers, judges",
    problem: "Private governance is hard to trust if state, counters, and proof are scattered across logs and docs.",
    service:
      "Hosted reads, visitor transaction capture, runtime metrics, proof freshness, and buyer-safe operational telemetry.",
    execution: "The read node and UI expose live state while wallet signatures and proof packets carry the authority boundary.",
    proof: "Runtime telemetry",
    href: "/network",
    proofHref: "/diagnostics",
  },
] as const;

export const platformServiceLayers = [
  {
    layer: "Layer 1",
    title: "Governance Core",
    summary:
      "The live governance engine already runs the end-to-end DAO lifecycle with treasury execution inside the product shell.",
    services: [
      "Create DAO",
      "Create Proposal",
      "Commit Vote",
      "Reveal Vote",
      "Finalize Proposal",
      "Execute Proposal",
      "Treasury Execution",
    ],
    href: "/govern",
    cta: "Open govern flow",
  },
  {
    layer: "Layer 2",
    title: "RPC Infrastructure",
    summary:
      "PrivateDAO is also an infrastructure surface: hosted reads, diagnostics, metered RPC posture, and DAO-specific runtime visibility.",
    services: [
      "Dedicated Solana RPC",
      "Shared RPC",
      "DAO-specific RPC",
      "Read API",
      "Usage diagnostics",
      "Runtime evidence",
    ],
    href: "/services",
    cta: "Open RPC surface",
  },
  {
    layer: "Layer 3",
    title: "Gaming DAO Toolkit",
    summary:
      "Gaming DAO turns reward, guild, clan, and tournament decisions into governance flows with proposal templates and treasury rails.",
    services: [
      "Game governance",
      "Reward treasury",
      "NFT voting",
      "Clan DAO",
      "Tournament payouts",
      "Game proposal templates",
    ],
    href: "/products",
    cta: "Open gaming corridor",
  },
  {
    layer: "Layer 4",
    title: "Payments DAO Engine",
    summary:
      "Payments extends the treasury model into contributors, vendors, subscriptions, and governed payout approvals.",
    services: [
      "Wallet payments",
      "Contributor payouts",
      "Vendor payments",
      "Subscription billing",
      "Treasury payouts",
      "Payment approvals",
    ],
    href: "/services",
    cta: "Open payments corridor",
  },
  {
    layer: "Layer 5",
    title: "Security and Proof Layer",
    summary:
      "ZK, REFHE, MagicBlock, Fast RPC, diagnostics, and trust packets are exposed as product rails rather than hidden implementation detail.",
    services: [
      "ZK capability matrix",
      "Proof center",
      "Confidence engine",
      "Incident readiness",
      "Authority hardening",
      "Runtime diagnostics",
    ],
    href: "/security",
    cta: "Open trust layer",
  },
  {
    layer: "Layer 6",
    title: "Developer Platform",
    summary:
      "The platform also needs a developer-facing surface for SDK, API, templates, billing posture, quotas, and RPC access.",
    services: [
      "SDK",
      "API",
      "CLI",
      "Templates",
      "API key issuance posture",
      "Quota and billing framing",
    ],
    href: "/developers",
    cta: "Open developer portal",
  },
];

export const rpcPlans = [
  {
    name: "Free",
    requests: "100K requests",
    network: "Testnet",
    price: "Free",
    fit: "Builders evaluating PrivateDAO RPC and diagnostics on Testnet.",
  },
  {
    name: "Pro",
    requests: "5M requests",
    network: "Testnet + hosted reads",
    price: "Subscription",
    fit: "Teams running governance, payouts, and app reads on a shared product rail.",
  },
  {
    name: "Enterprise",
    requests: "Unlimited / negotiated",
    network: "Dedicated endpoint",
    price: "Custom",
    fit: "Organizations that need DAO-specific RPC, higher trust boundaries, and operator support.",
  },
];

export const developerPlatformFeatures = [
  {
    title: "RPC access",
    summary: "Dedicated RPC, shared RPC, DAO-specific RPC, and hosted read surfaces tied to diagnostics and runtime evidence.",
    href: "/services",
  },
  {
    title: "API and SDK",
    summary: "Developer-facing API, SDK, CLI, and templates for integrating governance, payouts, and proof-aware reads.",
    href: "/developers",
  },
  {
    title: "Gaming DAO templates",
    summary: "Proposal templates for events, rewards, guild voting, and game economy changes.",
    href: "/products",
  },
  {
    title: "Payments and governed payouts",
    summary: "Contributor, vendor, and subscription approvals routed through the same treasury and proof rails.",
    href: "/services",
  },
];

export const productCorridors = [
  {
    name: "PrivateDAO Core",
    audience: "Private treasury teams and internal governance operators",
    summary:
      "The main governance system for private proposals, treasury execution, reviewer-visible evidence, and additive V3 hardening.",
    technologies: ["ZK", "REFHE", "Governance V3", "Settlement V3"],
    href: "/govern",
    cta: "Open core governance rail",
  },
  {
    name: "Realms Compatibility Rail",
    audience: "Teams that need a familiar committee and council posture",
    summary:
      "A compatibility-facing surface for organizations that still think in Realms-style committees but need stronger privacy, proof, and operational rails.",
    technologies: ["ZK review", "Fast RPC", "Reviewer docs"],
    href: "/documents/reviewer-fast-path",
    cta: "Open reviewer compatibility rail",
  },
  {
    name: "Android Native",
    audience: "Mobile-first operators and signer workflows",
    summary:
      "A mobile and Android-facing runtime path for wallet access, reviewer journeys, and diagnostics without pretending the product is desktop-only.",
    technologies: ["Wallet UX", "Diagnostics", "Fast RPC"],
    href: "/viewer/android-native",
    cta: "Open Android runtime surface",
  },
  {
    name: "Gaming DAO Corridor",
    audience: "Reward programs, tournaments, and token-native communities",
    summary:
      "MagicBlock-backed evidence corridors for reward distribution and proposal-scoped settlement logic where responsiveness matters.",
    technologies: ["MagicBlock", "Settlement V3", "Proof"],
    href: "/services",
    cta: "Open gaming corridor",
  },
  {
    name: "Read API + RPC",
    audience: "Builders, operators, and hosted governance consumers",
    summary:
      "A commercial and operational surface for hosted reads, diagnostics, API-facing ops, and buyer-friendly product packaging.",
    technologies: ["Fast RPC", "Hosted Read API", "Ops"],
    href: "/services",
    cta: "Open API and RPC surface",
  },
];

export const competitionTracks = [
  {
    slug: "colosseum-frontier",
    title: "Core Product Lane",
    sponsor: "Product-first public-good lane",
    fit: "Very strong",
    status: "Primary first-place push",
    priority: "Priority 1",
    prizeSummary: "Primary product lane for the strongest reviewer-visible story, capital readiness, and ecosystem usefulness.",
    winnerAnnouncementBy: "Ongoing community review favors product impact and execution quality.",
    recommendedWallet: "Solflare for the live product flow, Phantom as fallback for judges.",
    demoRoute: "/start",
    winningThesis:
      "Win by showing one coherent startup-quality product: start flow, govern flow, proof continuity, services, diagnostics, and trust surfaces in one system.",
    summary:
      "PrivateDAO is now strongest where product impact, security posture, wallet UX, proof continuity, and startup-quality packaging meet inside one live surface.",
    edge: "The project already has a root-domain app, story route, learning route, proof center, diagnostics, and commercial corridors.",
    gap: "The highest-value gap is continued tightening of first-run clarity and submission polish, not protocol invention.",
    action: "Lead the full submission from /start to /govern to /proof/?judge=1, then close with services, diagnostics, and trust package.",
    href: "/start",
    sourceUrl: "https://privatedao.org/start/",
  },
  {
    slug: "privacy-track",
    title: "Privacy Infrastructure Lane",
    sponsor: "MagicBlock and privacy-aligned partners",
    fit: "Strong",
    status: "Submission-ready with stronger live surface",
    priority: "Priority 2",
    prizeSummary: "Privacy-preserving governance and payout infrastructure with reviewer-visible proof.",
    winnerAnnouncementBy: "Community review follows the live product surface and proof freshness.",
    recommendedWallet: "Solflare first, Phantom second for judge familiarity.",
    demoRoute: "/security",
    winningThesis:
      "Show private governance, encrypted operations, ZK review, and REFHE settlement as one user-understandable product corridor.",
    summary:
      "PrivateDAO is already strongest where private voting, ZK review, REFHE envelopes, MagicBlock corridors, and reviewer-visible evidence converge.",
    edge: "This is the most natural product lane for the current protocol, security story, and additive V3 hardening posture.",
    gap: "The biggest remaining upside is sharper problem framing and a cleaner end-user story per use case.",
    action: "Lead with PrivateDAO Core, the Gaming DAO corridor, the ZK matrix, and the confidence engine across the product walkthrough and deck.",
    href: "/security",
    sourceUrl: "https://privatedao.org/security/",
  },
  {
    slug: "eitherway-live-dapp",
    title: "Wallet-First Live Application Lane",
    sponsor: "Eitherway App",
    fit: "Strong with one partner-facing flow",
    status: "Submission-ready with wallet-first corridor",
    priority: "Priority 7",
    prizeSummary: "Wallet UX, partner polish, and infrastructure rails combined into one product path.",
    winnerAnnouncementBy: "This lane improves as the live wallet flow becomes faster and clearer.",
    recommendedWallet: "Solflare as the default product wallet.",
    demoRoute: "/govern",
    winningThesis:
      "Show one wallet-first product flow that feels live, partner-ready, and infrastructure-aware from the first click.",
    summary:
      "The app is live and operational already, but this track gets stronger when one concrete partner-facing flow is surfaced around wallet UX, live dApp behavior, and infrastructure.",
    edge: "PrivateDAO already has wallet adapter, operational UI, and live proof surfaces; the highest-value uplift is a tighter partner corridor.",
    gap: "The strongest version of this submission is the wallet-first corridor, the hosted story video, and the govern flow working together.",
    action: "Lead with the live app, the story route, and the govern flow as one continuous wallet-first product flow.",
    href: "/services",
    sourceUrl: "https://privatedao.org/govern/",
  },
  {
    slug: "rpc-infrastructure",
    title: "Runtime API And Fast Reads",
    sponsor: "RPC infrastructure sponsors",
    fit: "Very strong",
    status: "Submission-ready",
    priority: "Priority 3",
    prizeSummary: "Hosted reads, diagnostics, and runtime evidence packaged as infrastructure worth adopting.",
    winnerAnnouncementBy: "This lane improves as API and telemetry routes become easier to verify.",
    recommendedWallet: "Solflare for continuity; wallet is secondary to diagnostics.",
    demoRoute: "/diagnostics",
    winningThesis:
      "Win by making hosted reads, diagnostics, runtime evidence, and buyer-facing API packaging impossible to miss.",
    summary:
      "Fast RPC, diagnostics, hosted reads, and reviewer-facing runtime surfaces are already part of the product story and commercial rails.",
    edge: "The project already sells hosted read API plus ops, not just protocol theory.",
    gap: "The API and RPC buyer journey can be made even more explicit in a dedicated partner section.",
    action: "Lead with the Read API + RPC corridor, diagnostics page, and hosted read commercial surfaces.",
    href: "/services",
    sourceUrl: "https://privatedao.org/services/",
  },
  {
    slug: "consumer-apps",
    title: "Consumer Governance UX",
    sponsor: "TokenTon26",
    fit: "Moderate to strong",
    status: "Submission-ready with consumer-first shell",
    priority: "Priority 6",
    prizeSummary: "Consumer-ready governance where clarity and first-run UX matter most.",
    winnerAnnouncementBy: "This lane improves as normal users complete the first session without operator help.",
    recommendedWallet: "Solflare first, Phantom fallback.",
    demoRoute: "/start",
    winningThesis:
      "Make governance feel simple and confident to a normal user through onboarding, story, and wallet-first action flow.",
    summary:
      "The frontend is now much stronger, but this track wants the app to feel intuitive to normal users, not only operators and reviewers.",
    edge: "The new operational shell and corridors already move the project closer to consumer-grade clarity.",
    gap: "The strongest version of this submission is the buyer journey, the story video, and the govern flow working as one product path.",
    action: "Lead with the story route, buyer journey, govern flow, and cleaner wallet-first navigation.",
    href: "/govern",
    sourceUrl: "https://privatedao.org/learn/",
  },
  {
    slug: "ranger-main",
    title: "Integrated Product Quality",
    sponsor: "Ranger Build a Bear",
    fit: "Strong",
    status: "Submission-ready for a first-place push",
    priority: "Priority 4",
    prizeSummary: "Startup-quality product evaluation across engineering, proof, and commercial packaging.",
    winnerAnnouncementBy: "This lane improves as the live site, proof, and trust routes stay coherent together.",
    recommendedWallet: "Solflare for live product continuity.",
    demoRoute: "/awards",
    winningThesis:
      "Present PrivateDAO as a startup-quality product with protocol depth, trust posture, commercial corridors, and operator-grade execution.",
    summary:
      "PrivateDAO already reads as serious infra: governance, evidence, trust packaging, and live runtime surfaces are all present.",
    edge: "This lane rewards integrated products, and the project already combines protocol, ops, review, and commercial layers.",
    gap: "The winning version foregrounds the product thesis first, then lands into proof, trust, and services with no narrative break.",
    action: "Lead with the operational shell, story route, product corridors, awards, and proof-to-execution continuity.",
    href: "/awards",
    sourceUrl: "https://privatedao.org/awards/",
  },
  {
    slug: "ranger-drift",
    title: "Capital Governance Operations",
    sponsor: "Ranger / Drift",
    fit: "Moderate",
    status: "Focused treasury-governance thesis",
    priority: "Priority 8",
    prizeSummary: "Treasury strategy and bounded capital-governance flows kept credible and reviewer-visible.",
    winnerAnnouncementBy: "This lane improves as treasury policy and analytics become easier to inspect.",
    recommendedWallet: "Solflare or Phantom; secondary to analytics and treasury framing.",
    demoRoute: "/analytics",
    winningThesis:
      "Frame PrivateDAO as bounded capital-governance infrastructure, not as a speculative trading bot.",
    summary:
      "The governance and confidential execution rails are strong, but this track gets stronger if tied to treasury strategy, risk policy, or capital allocation workflows.",
    edge: "The confidence engine and V3 policy surfaces can be adapted into a stronger capital-governance narrative.",
    gap: "This track is strongest when framed as bounded capital governance instead of generic DeFi trading.",
    action: "Lead with analytics, the confidence engine, and policy-bounded treasury decision quality.",
    href: "/analytics",
    sourceUrl: "https://privatedao.org/analytics/",
  },
  {
    slug: "100xdevs",
    title: "Product Engineering Delivery",
    sponsor: "100xDevs",
    fit: "Strong",
    status: "Submission-ready",
    priority: "Priority 5",
    prizeSummary: "Frontend quality, shipping discipline, and route architecture as visible differentiators.",
    winnerAnnouncementBy: "This lane improves as the product shell and teaching surfaces stay coherent.",
    recommendedWallet: "Solflare for polish, Phantom as fallback.",
    demoRoute: "/dashboard",
    winningThesis:
      "Win by proving this is a real product shell with reusable architecture, strong UX, and deployment discipline.",
    summary:
      "This track benefits from end-to-end product quality, and the app now has a strong operational shell, multi-page architecture, and live surface.",
    edge: "The migration from static docs-style pages to a professional Next.js product UI is now a real differentiator.",
    gap: "The narrative should emphasize developer execution quality and end-user polish more directly.",
    action: "Lead with the Next.js operational shell, wallet UX, and reviewer-ready documentation stack.",
    href: "/dashboard",
    sourceUrl: "https://privatedao.org/learn/",
  },
  {
    slug: "encrypt-ika",
    title: "Encrypted Operations",
    sponsor: "Encrypt / IKA",
    fit: "Strong",
    status: "Submission-ready with encrypted operations emphasis",
    priority: "Priority 7",
    prizeSummary: "Encrypted operations with strong privacy framing and real product workflows.",
    winnerAnnouncementBy: "This lane improves as confidential flows stay easy to execute and verify.",
    recommendedWallet: "Solflare; wallet is secondary to encrypted-ops framing.",
    demoRoute: "/security",
    winningThesis:
      "Lead with encrypted payroll and confidential operations before diving into low-level cryptography labels.",
    summary:
      "The project already has a legitimate encrypted operations thesis thanks to REFHE, ZK, reviewer packets, and explicit security boundaries.",
    edge: "Few submissions can tell a coherent privacy story across governance, settlement, review, and product packaging.",
    gap: "The strongest version leans into encrypted operations, deterministic policy logic, and reviewer-visible confidence scoring.",
    action: "Lead with confidential payroll, encrypted envelopes, and the confidence engine as deterministic interpretation.",
    href: "/security",
    sourceUrl: "https://privatedao.org/security/",
  },
  {
    slug: "solrouter-encrypted-ai",
    title: "SolRouter Ship with Encrypted AI",
    sponsor: "SolRouter",
    fit: "Partial",
    status: "Secondary lane with deterministic assistant posture",
    priority: "Priority 9",
    prizeSummary: "AI-adjacent lane if deterministic reasoning stays clearly bounded and useful.",
    winnerAnnouncementBy: "Follow the listing schedule and sponsor updates.",
    recommendedWallet: "Solflare; wallet is not the main judging concern here.",
    demoRoute: "/assistant",
    winningThesis:
      "Use deterministic reasoning and policy composition as the current assistant story without pretending to ship a full encrypted agent.",
    summary:
      "The cryptographic confidence engine is strong, but this track becomes much stronger if wrapped in a more explicit encrypted AI or assistant workflow.",
    edge: "There is already a deterministic engine and strong privacy rails to build on.",
    gap: "The strongest version of this track positions the confidence engine as the current assistant-like surface without overstating autonomy.",
    action: "Treat the confidence engine and policy composer as the current encrypted-decision workspace for this track.",
    href: "/security",
    sourceUrl: "https://privatedao.org/security/",
  },
  {
    slug: "dune-analytics",
    title: "Analytics And Telemetry",
    sponsor: "Dune",
    fit: "Strong",
    status: "High-upside submission corridor",
    priority: "Priority 6",
    prizeSummary: "Backend-grade data value and analyst-visible telemetry credibility.",
    winnerAnnouncementBy: "This lane improves as exports and reviewer telemetry remain current.",
    recommendedWallet: "Solflare only for continuity; this track is judged more on telemetry than signer theatrics.",
    demoRoute: "/diagnostics",
    winningThesis:
      "Win by proving that PrivateDAO already exposes analyst-grade runtime evidence, read-node value, and governance telemetry as product infrastructure.",
    summary:
      "This is one of the strongest adjacency corridors because the product already ships diagnostics, runtime evidence, proposal state, and hosted-read positioning.",
    edge: "Few governance products can show a live telemetry corridor tied to real wallet actions, proof packets, and read-node packaging in one system.",
    gap: "The remaining gap is a cleaner analyst-facing export and narrative layer rather than a new protocol primitive.",
    action: "Lead with diagnostics, runtime evidence, analytics, and read-node value as one telemetry submission bundle.",
    href: "/analytics",
    sourceUrl: "https://privatedao.org/analytics/",
  },
  {
    slug: "umbra-confidential-payout",
    title: "Umbra Confidential Payout Track",
    sponsor: "Umbra",
    fit: "Strong",
    status: "High-fit privacy-commercial corridor",
    priority: "Priority 5",
    prizeSummary: "$10k side track centered on private payout and confidentiality-friendly product execution.",
    winnerAnnouncementBy: "Listing shows winner announcement by May 26, 2026.",
    recommendedWallet: "Solflare for the live path, with proof routes doing the trust-heavy work.",
    demoRoute: "/security",
    winningThesis:
      "Win by showing confidential payout, payroll, and treasury motion rehearsal as usable product behavior rather than privacy rhetoric.",
    summary:
      "Umbra is a natural fit because PrivateDAO already ties confidential treasury operations to governance approval, trust packets, and reviewer-visible evidence.",
    edge: "The product can already tell a credible story around private grants, payroll, and governed payout rails backed by REFHE, ZK, and trust surfaces.",
    gap: "The remaining work is evidence packaging and payout-centric storytelling, not inventing a new privacy primitive.",
    action: "Lead with security, services, custody, and grant-committee proof as the confidential payout bundle.",
    href: "/services",
    sourceUrl: "https://privatedao.org/services/",
  },
  {
    slug: "adevar-audit-credits",
    title: "Adevar Audit Credits",
    sponsor: "Adevar Labs",
    fit: "Strong",
    status: "Evidence-bound hardening corridor",
    priority: "Priority 8",
    prizeSummary: "$50k in audit credits for teams that already present serious hardening and security discipline.",
    winnerAnnouncementBy: "Listing shows winner announcement by June 10, 2026.",
    recommendedWallet: "Wallet choice is secondary; hardening proof is the center of gravity.",
    demoRoute: "/trust",
    winningThesis:
      "Win by showing that PrivateDAO already behaves like a team preparing for formal audit: authority control, incident readiness, custody proof, and runtime truth.",
    summary:
      "This corridor is strong if we stay precise about what is hardened already and what still awaits external audit closure.",
    edge: "The repo and product already expose authority hardening, incident readiness, reviewer packets, and custody truth as first-class surfaces.",
    gap: "The missing piece is external audit completion itself, which should remain an explicit hardening gate rather than hidden.",
    action: "Lead with trust, hardening docs, incident readiness, and custody proof as the audit-credit packet.",
    href: "/trust",
    sourceUrl: "https://privatedao.org/trust/",
  },
  {
    slug: "superteam-poland",
    title: "Regional Product Leadership Corridor",
    sponsor: "Regional ecosystem review",
    fit: "Strong",
    status: "Regional product-leadership corridor",
    priority: "Priority 7",
    prizeSummary: "Regional support corridor where product clarity, shipped proof, and ecosystem usefulness matter most.",
    winnerAnnouncementBy: "Regional review timing varies with the active funding window.",
    recommendedWallet: "Solflare for the live Testnet product; regional judges should see accessible execution, product clarity, and ecosystem usefulness first.",
    demoRoute: "/start",
    winningThesis:
      "Win by showing PrivateDAO as a live Solana governance product company: easy Testnet use, private execution value, ecosystem relevance, and a credible path from current usage to production release.",
    summary:
      "This route should read as a product-leadership page for a team already shipping real governance infrastructure on Solana, not as a trophy shelf or regional vanity page.",
    edge: "PrivateDAO already has a real Poland win, live Testnet product routes, reviewer-visible proof, Android and wallet runtime work, and a product thesis that serves institutions, DAOs, and ecosystem builders.",
    gap: "The only valid gap is continued product hardening and broader human testing, not the absence of ambition or ecosystem relevance.",
    action: "Lead with start, learn, judge, and awards as one product-and-proof bundle that makes support feel catalytic, not corrective.",
    href: "/start",
    sourceUrl: "https://privatedao.org/awards/",
  },
  {
    slug: "poland-grants",
    title: "Regional Grants Corridor",
    sponsor: "Regional ecosystem grants",
    fit: "Strong",
    status: "Grant-ready regional corridor",
    priority: "Priority 7",
    prizeSummary: "Regional grant corridor where infrastructure value, ecosystem relevance, and proof of execution matter more than theatrics.",
    winnerAnnouncementBy: "Follow the active funding window and review timing.",
    recommendedWallet: "Solflare for the main product path; buyer and reviewer materials matter more than wallet novelty here.",
    demoRoute: "/services",
    winningThesis:
      "Position PrivateDAO as regional infrastructure-grade governance product with commercial rails, trust discipline, and shipped proof on Solana.",
    summary:
      "Regional grants fit is strongest when the project reads as commercially useful ecosystem infrastructure rather than as a one-off artifact.",
    edge: "The live product, services route, awards signal, and trust packet already support a credible regional grant narrative.",
    gap: "We still need a cleaner explicit grant packet and capital-readiness mapping, not more protocol breadth.",
    action: "Lead with services, awards, start, and trust packet as the regional grant packet.",
    href: "/services",
    sourceUrl: "https://privatedao.org/documents/solana-developer-tooling-proposal-2026/",
  },
  {
    slug: "startup-accelerator",
    title: "Startup Accelerator Grant",
    sponsor: "Startup acceleration corridor",
    fit: "Very strong",
    status: "Primary capital corridor",
    priority: "Priority 4",
    prizeSummary: "Startup grant and acceleration corridor where product coherence, traction narrative, and launch discipline matter more than isolated technical novelty.",
    winnerAnnouncementBy: "Follow the accelerator review window and support timing.",
    recommendedWallet: "Solflare for the main product walkthrough; capital reviewers care more about coherence and commercial readiness than wallet variety.",
    demoRoute: "/start",
    winningThesis:
      "Win by showing that PrivateDAO is already a live Testnet governance company with commercial rails, reviewable proof, and a disciplined path to mainnet.",
    summary:
      "This is one of the highest-value corridors because it translates product, infrastructure, and trust work directly into capital readiness.",
    edge: "The root-domain app, story route, services packaging, trust packet, and learning/proof routes already make PrivateDAO look like a serious startup candidate.",
    gap: "The highest-value gap is a tighter capital-readiness packet around audits, multisig, monitoring, and source-verifiable settlement proof.",
    action: "Lead with start, story, services, trust, and mainnet gates as one accelerator-ready narrative.",
    href: "/start",
    sourceUrl: "https://privatedao.org/documents/capital-readiness-packet/",
  },
];

export type CompetitionTrackWorkspace = {
  slug: string;
  title: string;
  sponsor: string;
  prizeSummary: string;
  winnerAnnouncementBy: string;
  skillsNeeded: string[];
  recommendedWallet: string;
  devnetStatus: string;
  objective: string;
  whyUs: string;
  primaryCorridor: string;
  liveRoute: string;
  judgeRoute: string;
  proofRoute: string;
  deckRoute: string;
  videoRoute: string;
  readmeHref: string;
  sourceUrl: string;
  deliverables: string[];
  requirements: string[];
  winningMoves: string[];
  sponsorFit: string[];
  validationSteps: string[];
};

export const competitionTrackWorkspaces: CompetitionTrackWorkspace[] = [
  {
    slug: "colosseum-frontier",
    title: "Core Product Workspace",
    sponsor: "Public-good governance infrastructure",
    prizeSummary: "Primary product workspace for reviewer-visible proof, startup-quality delivery, and ecosystem adoption.",
    winnerAnnouncementBy: "Current review favors product impact and execution quality above label stacking.",
    skillsNeeded: ["Frontend", "Backend", "Blockchain", "Design", "Product"],
    recommendedWallet: "Solflare for the main product path, Phantom fallback for judge familiarity.",
    devnetStatus: "Live on Testnet with root-domain product shell, govern flow, proof center, diagnostics, services, and story route.",
    objective:
      "Present PrivateDAO as a startup-quality Solana product that already behaves like a pre-mainnet company rather than a hacked-together prototype.",
    whyUs:
      "PrivateDAO now connects onboarding, wallet-first governance, proof continuity, diagnostics, services, trust packets, and execution routes inside one live app.",
    primaryCorridor: "Start → Govern → Proof → Services",
    liveRoute: "/start",
    judgeRoute: "/proof/?judge=1",
    proofRoute: "/documents/reviewer-fast-path",
    deckRoute: "/viewer/investor-pitch-deck",
    videoRoute: "/story",
    readmeHref: "https://github.com/X-PACT/PrivateDAO#readme",
    sourceUrl: "https://privatedao.org/start/",
    deliverables: [
      "Lead the first 90 seconds from /start into /govern with a real wallet-first path.",
      "Use /proof/?judge=1, trust package, diagnostics, and services as the second-stage proof of maturity.",
      "Keep the README, deck, story video, and product learning path perfectly aligned with the live site.",
    ],
    requirements: [
      "A coherent startup-quality product, not a collection of unrelated fragments.",
      "Visible product impact, trust posture, and security maturity after the Drift exploit context.",
      "A live application that feels disciplined on Testnet and credible for mainnet later.",
    ],
    winningMoves: [
      "Open with the problem, the user path, and why this is a real governance product, not with protocol trivia.",
      "Show signer hygiene, timelock awareness, proof continuity, and release discipline as first-class product values.",
      "Use the story route to compress the whole thesis, then deepen through govern, proof, and services.",
    ],
    sponsorFit: [
      "Product impact and startup quality matter more than label accumulation.",
      "The root-domain live app, multi-page shell, and route-level product surfaces directly serve that judging posture.",
      "PrivateDAO is strongest when shown as one coherent product with privacy, infrastructure, and buyer layers connected.",
    ],
    validationSteps: [
      "Run `cd apps/web && npm run lint && npm run build` before recording or final screenshots.",
      "Run `npm run web:bundle:root && npm run web:verify:live:root` to keep the live site deployment-grade.",
      "Use `/start`, `/story`, `/govern`, `/proof/?judge=1`, and `/services` as the primary review chain.",
    ],
  },
  {
    slug: "privacy-track",
    title: "Privacy Governance Route",
    sponsor: "MagicBlock and privacy-aligned partners",
    prizeSummary: "Privacy-preserving governance and payout infrastructure with reviewer-visible proof.",
    winnerAnnouncementBy: "Follow the live product and proof surfaces for current review timing.",
    skillsNeeded: ["Frontend", "Backend", "Blockchain", "Design"],
    recommendedWallet: "Solflare first, Phantom second for judge familiarity.",
    devnetStatus: "Live on Testnet with V3 proof, ZK matrix, and security corridors already exposed.",
    objective:
      "Show PrivateDAO as the clearest privacy-native governance and confidential treasury product in the field.",
    whyUs:
      "PrivateDAO already combines commit-reveal governance, ZK review rails, REFHE envelopes, MagicBlock settlement corridors, and V3 proof packets in one live product.",
    primaryCorridor: "PrivateDAO Core + Gaming DAO Corridor",
    liveRoute: "/security",
    judgeRoute: "/proof/?judge=1",
    proofRoute: "/documents/live-proof-v3",
    deckRoute: "/viewer/investor-pitch-deck",
    videoRoute: "/story",
    readmeHref: "https://github.com/X-PACT/PrivateDAO#readme",
    sourceUrl:
      "https://privatedao.org/security/",
    deliverables: [
      "Use the comprehensive story video as the first-pass product walkthrough for judges.",
      "Lead the click path from /security to the ZK matrix, confidence engine, and V3 proof packet.",
      "Keep the pitch deck anchored around private governance, confidential payouts, and clear release boundaries.",
    ],
    requirements: [
      "Private problem framing that normal users and judges understand quickly.",
      "Visible privacy mechanism, proof path, and evidence path in the product surface.",
      "A live dApp flow that shows privacy without hiding operational discipline.",
    ],
    winningMoves: [
      "Open with the problem: visible tallies and visible payroll both leak too much.",
      "Use ZK, REFHE, MagicBlock, and V3 as product rails, not abstract protocol buzzwords.",
      "Route judges directly into /proof/?judge=1 and /documents/zk-capability-matrix.",
    ],
    sponsorFit: [
      "MagicBlock fit is strongest when privacy and execution integrity appear together, not as separate buzzwords.",
      "The confidence engine and ZK matrix give judges deterministic reasons to trust the encrypted path.",
      "Private payroll, bonus approvals, and committee governance are easier to grasp than generic private voting claims.",
    ],
    validationSteps: [
      "Run `npm run verify:test-wallet-live-proof:v3` to keep the V3 proof path intact.",
      "Run `npm run verify:zk-docs` before submission so the privacy narrative stays consistent.",
      "Use `/proof/?judge=1` and `/documents/zk-capability-matrix` as the primary review links in the final packet.",
    ],
  },
  {
    slug: "eitherway-live-dapp",
    title: "Eitherway Live dApp Route",
    sponsor: "Eitherway App",
    prizeSummary: "Wallet UX and product realism packaged as a live browser-first application.",
    winnerAnnouncementBy: "This workspace improves as the live wallet flow becomes faster and clearer.",
    skillsNeeded: ["Frontend", "Backend", "Blockchain"],
    recommendedWallet: "Solflare as the default product wallet, Phantom as the backup judge wallet.",
    devnetStatus: "Live on Testnet with wallet adapter, govern flow, onboarding, and hosted story video.",
    objective:
      "Present PrivateDAO as a wallet-first live dApp with a polished operational UI, clean partner corridor, and concrete usage path.",
    whyUs:
      "The Next.js product shell, wallet adapter integration, govern flow, proof center, and diagnostics already make PrivateDAO feel like a serious live application rather than a docs shell.",
    primaryCorridor: "PrivateDAO Core + Read API + RPC",
    liveRoute: "/govern",
    judgeRoute: "/proof/?judge=1",
    proofRoute: "/documents/telemetry-export-packet",
    deckRoute: "/viewer/investor-pitch-deck",
    videoRoute: "/story",
    readmeHref: "https://github.com/X-PACT/PrivateDAO#readme",
    sourceUrl:
      "https://privatedao.org/govern/",
    deliverables: [
        "Show a wallet-connected path from overview to govern to treasury execution.",
      "Use the new story video plus the live dApp surface on privatedao.org as the submission core.",
      "Show partner-fit corridors for wallet UX, proof, diagnostics, and infrastructure readiness.",
    ],
    requirements: [
      "A live dApp, not just a repo or concept deck.",
      "Clear wallet experience and visible operational flow.",
      "A stronger partner-facing narrative around infrastructure and user experience.",
    ],
    winningMoves: [
      "Lead with the live operational shell and Connect Wallet as the first interaction.",
      "Show that the same app serves judges, operators, and buyers without changing products.",
      "Use the story route, govern flow, and proof center as one connected product path.",
    ],
    sponsorFit: [
      "Wallet-native judges care about a clean first-run path more than a dense proof surface on first click.",
      "The story route, start route, and govern flow now work as one connected live-dApp corridor.",
      "Eitherway fit improves when the product reads as a real startup app rather than a docs shell.",
    ],
    validationSteps: [
      "Run `npm run verify:browser-smoke` after UI edits so wallet and route entry remain stable.",
      "Run `npm run verify:frontend-surface` so the live shell stays polished and coherent.",
      "Use `https://privatedao.org/start/` then `https://privatedao.org/govern/` as the primary product sequence.",
    ],
  },
  {
    slug: "rpc-infrastructure",
    title: "Runtime Infrastructure Route",
    sponsor: "RPC infrastructure sponsors",
    prizeSummary: "Runtime, diagnostics, and hosted-read infrastructure packaged as a credible API story.",
    winnerAnnouncementBy: "This workspace improves as runtime and API verification become easier.",
    skillsNeeded: ["Backend", "Blockchain", "Infrastructure"],
    recommendedWallet: "Solflare for route continuity; wallet is secondary to diagnostics in this workspace.",
    devnetStatus: "Live on Testnet with diagnostics, runtime evidence, service packaging, and integrations packet.",
    objective:
      "Make the hosted read path, diagnostics, and runtime trust posture impossible to miss.",
    whyUs:
      "PrivateDAO does not only mention RPC. It sells hosted reads, diagnostics, buyer-facing API packaging, and runtime evidence as part of the product surface.",
    primaryCorridor: "Read API + RPC",
    liveRoute: "/services",
    judgeRoute: "/diagnostics",
    proofRoute: "/documents/frontier-integrations",
    deckRoute: "/viewer/investor-pitch-deck",
    videoRoute: "/story",
    readmeHref: "https://github.com/X-PACT/PrivateDAO#readme",
    sourceUrl:
      "https://privatedao.org/services/",
    deliverables: [
      "Show diagnostics, runtime evidence, and hosted read/API packaging in one buyer-friendly path.",
      "Use the service catalog, SLA, pricing, and trust package as the commercial proof layer.",
      "Keep the Fast RPC role explicit in video, deck, README, and services UI.",
    ],
    requirements: [
      "A credible infrastructure story with visible runtime or API value.",
      "Evidence that the infrastructure layer supports a real product surface.",
      "Operational clarity for builders and hosted consumers.",
    ],
    winningMoves: [
      "Drive reviewers from /services into /diagnostics and the integration-evidence packet.",
      "Treat Fast RPC as an operator and buyer value layer, not only a backend implementation note.",
      "Use the story video to explain why faster indexed reads matter for governance products.",
    ],
    sponsorFit: [
      "QuickNode and RPC-credit judges need diagnostics and hosted-read packaging to be visible in-product.",
      "The services route shows infrastructure as a product feature, not a buried implementation detail.",
      "Runtime evidence and diagnostics are the strongest differentiators for this corridor.",
    ],
    validationSteps: [
      "Run `npm run build:runtime-evidence && npm run verify:runtime-evidence` before submission refreshes.",
      "Run `npm run verify:runtime-surface` so the diagnostics story remains reviewer-ready.",
      "Use `/services`, `/diagnostics`, and `/documents/frontier-integrations` as the runtime proof bundle.",
    ],
  },
  {
    slug: "consumer-apps",
    title: "Consumer Governance Workspace",
    sponsor: "TokenTon26",
    prizeSummary: "Consumer-ready governance workspace with heavy weighting on clarity, UX, and accessibility.",
    winnerAnnouncementBy: "April 2, 2026 according to the live listing.",
    skillsNeeded: ["Frontend", "Backend", "Blockchain", "Design"],
    recommendedWallet: "Solflare for first-run clarity, Phantom as the mainstream fallback.",
    devnetStatus: "Live on Testnet with guided onboarding, story route, buyer journey rail, and govern flow.",
    objective:
      "Show that a governance system can feel intuitive, guided, and non-intimidating to a normal user.",
    whyUs:
      "The new multi-page shell, buyer journey rail, govern flow, and wallet-first product story already improve first-run comprehension compared with a raw DAO console.",
    primaryCorridor: "PrivateDAO Core + Buyer Journey",
    liveRoute: "/govern",
    judgeRoute: "/story",
    proofRoute: "/documents/trust-package",
    deckRoute: "/viewer/investor-pitch-deck",
    videoRoute: "/story",
    readmeHref: "https://github.com/X-PACT/PrivateDAO#readme",
    sourceUrl:
      "https://privatedao.org/learn/",
    deliverables: [
      "Lead the product walk from the home page into a guided pack selection and then into govern.",
      "Keep labels human-readable and buyer-first on the home, story, services, and documents routes.",
      "Use the comprehensive story video as the fast first-look asset for non-technical judges.",
    ],
    requirements: [
      "Simple first-run onboarding and an obvious action path.",
      "Clear value story for non-technical users.",
      "A polished product shell rather than a technical admin console only.",
    ],
    winningMoves: [
      "Use the story route before opening diagnostics or reviewer-heavy surfaces.",
      "Make the wallet action feel like the natural next step, not a cryptic technical requirement.",
      "Keep the product corridors and commercial packs understandable without jargon.",
    ],
    sponsorFit: [
      "This is the strongest workspace for `/start`, `/story`, and the buyer-first route architecture.",
      "The multi-page shell makes governance feel like a product, not an admin dashboard.",
      "Consumer judges will reward clarity and momentum more than protocol density on first impression.",
    ],
    validationSteps: [
      "Run `npm run verify:browser-smoke` after changing onboarding or wallet UX.",
      "Keep `/start/`, `/story/`, and `/govern/` in the submission bundle and README.",
      "Use the hosted product overview video as the first asset for non-technical judges.",
    ],
  },
  {
    slug: "ranger-main",
    title: "Integrated Product Workspace",
    sponsor: "Ranger Build a Bear",
    prizeSummary: "Main-track startup-quality evaluation across product, engineering, proof, and business framing.",
    winnerAnnouncementBy: "Follow the Ranger listing schedule and final event timeline.",
    skillsNeeded: ["Frontend", "Backend", "Blockchain", "Product"],
    recommendedWallet: "Solflare for the live path, Phantom for judge fallback.",
    devnetStatus: "Live on Testnet with multi-page app, docs viewer, proof center, trust routes, and service packaging.",
    objective:
      "Win on integrated product quality across protocol, product shell, proof, trust, and commercial layers.",
    whyUs:
      "PrivateDAO now has a live multi-page app, a complete proof center, a document library, service packaging, and a strong trust posture tied to a real protocol.",
    primaryCorridor: "Operational shell + trust surfaces",
    liveRoute: "/dashboard",
    judgeRoute: "/learn",
    proofRoute: "/documents/reviewer-fast-path",
    deckRoute: "/viewer/investor-pitch-deck",
    videoRoute: "/story",
    readmeHref: "https://github.com/X-PACT/PrivateDAO#readme",
    sourceUrl: "https://privatedao.org/awards/",
    deliverables: [
      "Lead with the product shell, corridors, govern flow, and trust links rather than protocol detail first.",
      "Use the story route and the product learning path as submission entrypoints.",
      "Keep the deck and README aligned with the live site and reviewer surfaces.",
    ],
    requirements: [
      "A cohesive product rather than disconnected technical artifacts.",
      "Strong presentation quality and clear differentiation.",
      "A believable path from user value to operational credibility.",
    ],
    winningMoves: [
      "Open on the operational shell and show that every major function is in-product.",
      "Use /learn and /story to show why this is bigger than a single protocol surface.",
      "Lean on the 1st Place Superteam Poland signal without turning it into hype.",
    ],
    sponsorFit: [
      "Ranger main fit improves when all layers feel integrated: product, proof, trust, commercial, and operational.",
      "PrivateDAO now has enough surface area to read like a pre-mainnet startup, not a single-feature app.",
      "The route architecture and story video make the startup case visible in under two minutes.",
    ],
    validationSteps: [
      "Run `npm run verify:submission-registry` and `npm run verify:generated-artifacts` before submission freeze.",
      "Keep `/learn`, `/story`, `/dashboard`, `/services`, and `/proof/?judge=1` in the final review packet.",
      "Use the README, investor deck viewer, and hosted video as one coherent bundle.",
    ],
  },
  {
    slug: "ranger-drift",
    title: "Capital Governance Workspace",
    sponsor: "Ranger / Drift",
    prizeSummary: "Capital governance, bounded treasury actions, and risk discipline in one visible workflow.",
    winnerAnnouncementBy: "This workspace improves as treasury policy and analytics become easier to inspect.",
    skillsNeeded: ["Backend", "Blockchain", "Product", "Analytics"],
    recommendedWallet: "Phantom or Solflare; wallet is secondary to treasury and risk story.",
    devnetStatus: "Live on Testnet with analytics, confidence engine, and bounded treasury governance story.",
    objective:
      "Frame PrivateDAO as bounded capital-governance infrastructure instead of pretending to be a live trading terminal.",
    whyUs:
      "The confidence engine, treasury analytics, settlement controls, and governance rails can already support a disciplined capital-allocation story.",
    primaryCorridor: "Fund Governance + Analytics",
    liveRoute: "/analytics",
    judgeRoute: "/security",
    proofRoute: "/documents/confidential-payout-evidence-packet",
    deckRoute: "/viewer/investor-pitch-deck",
    videoRoute: "/story",
    readmeHref: "https://github.com/X-PACT/PrivateDAO#readme",
    sourceUrl: "https://privatedao.org/analytics/",
    deliverables: [
      "Tell a capital-governance story using bounded treasury actions, policy rails, and analytics.",
      "Use the confidence engine as the reasoning layer for risk-sensitive governance decisions.",
      "Keep claims bounded to governance and treasury control, not generic DeFi trading promises.",
    ],
    requirements: [
      "A credible treasury or capital-allocation thesis.",
      "Clear risk framing and bounded execution behavior.",
      "A product surface that connects decision quality to execution outcomes.",
    ],
    winningMoves: [
      "Treat Drift fit as a governance-risk corridor, not a trading-bot claim.",
      "Show how V3 policy and confidence scoring strengthen capital allocation discipline.",
      "Keep the story deterministic and risk-aware.",
    ],
    sponsorFit: [
      "The April 2026 Drift exploit made signer hygiene, timelocks, and risk controls far more relevant to judges.",
      "PrivateDAO is strongest when framed as governance infrastructure that prevents sloppy treasury behavior.",
      "The confidence engine is a better fit here than an unsupported trading narrative.",
    ],
    validationSteps: [
      "Run `npm run verify:runtime-surface` and `npm run verify:review-links` so governance-risk evidence remains coherent.",
      "Use `/analytics`, `/security`, and `/documents/cryptographic-confidence-engine` as the capital-governance bundle.",
      "Keep any Drift-facing narrative bounded to governance, permissions, signer hygiene, and treasury policy.",
    ],
  },
  {
    slug: "100xdevs",
    title: "Product Engineering Workspace",
    sponsor: "100xDevs",
    prizeSummary: "Frontend quality and shipping discipline made visible through the live product shell.",
    winnerAnnouncementBy: "May 25, 2026 according to the live listing.",
    skillsNeeded: ["Frontend", "Backend", "Blockchain"],
    recommendedWallet: "Solflare for polished UX, Phantom for common wallet familiarity.",
    devnetStatus: "Live on Testnet with reusable operational shell, route-level product surfaces, story video, and root-domain deployment.",
    objective:
      "Show professional frontend execution, reusable architecture, strong UX, and end-to-end shipping discipline.",
    whyUs:
      "The progressive migration to Next.js, reusable components, static export strategy, wallet adapter integration, and operational shell are already visible and shippable.",
    primaryCorridor: "Multi-page Next.js shell",
    liveRoute: "/dashboard",
    judgeRoute: "/story",
    proofRoute: "/documents/reviewer-fast-path",
    deckRoute: "/viewer/investor-pitch-deck",
    videoRoute: "/story",
    readmeHref: "https://github.com/X-PACT/PrivateDAO#readme",
    sourceUrl: "https://privatedao.org/learn/",
    deliverables: [
      "Use the live site and README to show a polished, reusable frontend system with pre-mainnet operating discipline.",
      "Keep the new story video tied to the product shell and route structure.",
      "Show developer discipline through docs, proof, verification gates, and deployment packaging.",
    ],
    requirements: [
      "A real product UI with code quality and end-to-end shipping discipline.",
      "Professional user experience and reuse across pages.",
      "A coherent build, publish, and verification workflow.",
    ],
    winningMoves: [
      "Emphasize the migration from a docs shell to a professional operational UI.",
      "Use route-level product surfaces, curated docs, and the video center as proof of product maturity.",
      "Show that the old link still works while the new domain feels premium.",
    ],
    sponsorFit: [
      "100xDevs fit improves when code quality, route architecture, and reuse are visible in-product.",
      "The move to Next.js, route-level bundles, and root-domain publishing are now first-class proof points.",
      "Judges can see a real shipping system with coherent release discipline.",
    ],
    validationSteps: [
      "Run `cd apps/web && npm run lint && npm run build` before submission screenshots or videos.",
      "Run `npm run web:bundle:root && npm run web:verify:live:root` for deployment-grade proof.",
      "Use `/dashboard`, `/story`, and `/documents/reviewer-fast-path` as the product-engineering bundle.",
    ],
  },
  {
    slug: "encrypt-ika",
    title: "Encrypt / IKA Workspace",
    sponsor: "Encrypt / IKA",
    prizeSummary: "Encrypted operations where privacy, trust, and practical workflow value matter most.",
    winnerAnnouncementBy: "Follow the listing schedule and sponsor communication.",
    skillsNeeded: ["Frontend", "Backend", "Blockchain", "Security"],
    recommendedWallet: "Solflare for guided flow; wallet is secondary to encrypted-ops framing.",
    devnetStatus: "Live on Testnet with REFHE settlement framing, ZK matrix, confidence engine, and security/story routes.",
    objective:
      "Present PrivateDAO as encrypted operational infrastructure rather than only a private voting tool.",
    whyUs:
      "The repo already ships REFHE settlement surfaces, ZK review rails, confidence scoring, and a coherent privacy story across governance and treasury operations.",
    primaryCorridor: "Enterprise DAO + encrypted operations",
    liveRoute: "/security",
    judgeRoute: "/story",
    proofRoute: "/documents/cryptographic-confidence-engine",
    deckRoute: "/viewer/investor-pitch-deck",
    videoRoute: "/story",
    readmeHref: "https://github.com/X-PACT/PrivateDAO#readme",
    sourceUrl: "https://privatedao.org/security/",
    deliverables: [
      "Lead with confidential payroll, bonus approvals, and REFHE-gated settlement narratives.",
      "Use the confidence engine and ZK matrix to show encrypted decision quality without overclaiming AI magic.",
      "Keep the security and story routes tightly aligned.",
    ],
    requirements: [
      "A clear encrypted operations thesis.",
      "Practical privacy or encrypted workflow value, not abstract crypto jargon.",
      "User-understandable explanation of why the encrypted layer matters.",
    ],
    winningMoves: [
      "Show encrypted operations before talking about low-level cryptography internals.",
      "Use product language first, then map to ZK, REFHE, MagicBlock, and Fast RPC.",
      "Position the confidence engine as deterministic interpretation, not autonomous AI.",
    ],
    sponsorFit: [
      "Encrypt/IKA fit is strongest when confidentiality improves a real operational workflow.",
      "PrivateDAO demonstrates encrypted governance and confidential settlement as one product story.",
      "The security route is dense enough for technical judges but still product-readable.",
    ],
    validationSteps: [
      "Run `npm run verify:zk-docs` and `npm run verify:test-wallet-live-proof:v3` before final submission.",
      "Use `/security`, `/story`, and `/documents/cryptographic-confidence-engine` as the encrypted-ops bundle.",
      "Keep the submission language deterministic and avoid any autonomous-encrypted-AI overclaim.",
    ],
  },
  {
    slug: "solrouter-encrypted-ai",
    title: "SolRouter Encrypted AI Workspace",
    sponsor: "SolRouter",
    prizeSummary: "AI-adjacent sponsor fit where reasoning must remain grounded and visibly tied to execution.",
    winnerAnnouncementBy: "Follow the listing schedule and sponsor communication.",
    skillsNeeded: ["Frontend", "Backend", "Blockchain", "AI product framing"],
    recommendedWallet: "Solflare for flow continuity; wallet is secondary to the reasoning surface here.",
    devnetStatus: "Live on Testnet with deterministic confidence engine and interactive policy composer in-product.",
    objective:
      "Keep an AI-adjacent story ready without breaking truth alignment or pretending to ship a full encrypted agent.",
    whyUs:
      "PrivateDAO now has a deterministic confidence engine, privacy rails, and product surfaces that can support an assistant-style framing later if needed.",
    primaryCorridor: "Security + confidence engine",
    liveRoute: "/security",
    judgeRoute: "/security",
    proofRoute: "/documents/cryptographic-confidence-engine",
    deckRoute: "/viewer/investor-pitch-deck",
    videoRoute: "/story",
    readmeHref: "https://github.com/X-PACT/PrivateDAO#readme",
    sourceUrl: "https://privatedao.org/security/",
    deliverables: [
      "Use the confidence engine and policy composer as the strongest current AI-adjacent surface.",
      "Keep the story bounded to what ships today in the UI and docs.",
      "Route judges into the security and story surfaces instead of making speculative claims.",
    ],
    requirements: [
      "An assistant-style or encrypted reasoning layer that helps a user take action.",
      "Clear linkage between reasoning output and product execution surface.",
      "Strict truth alignment about what is deterministic versus actually autonomous.",
    ],
    winningMoves: [
      "Treat this as a secondary submission posture until a dedicated assistant route ships.",
      "Leverage the confidence engine as the current strongest bridge into an encrypted AI narrative.",
      "Avoid claims that imply a shipped encrypted agent if one is not visibly in-product.",
    ],
    sponsorFit: [
      "The current strongest fit is deterministic reasoning tied to governance execution, not a speculative agent claim.",
      "The confidence engine and policy composer already provide a concrete reasoning surface for judges to inspect.",
      "This workspace benefits most from disciplined language and direct product screenshots.",
    ],
    validationSteps: [
      "Run `cd apps/web && npm run build` after any confidence-engine or security-route change.",
      "Use `/security`, `/story`, and `/documents/cryptographic-confidence-engine` as the current AI-adjacent bundle.",
      "Keep all submission copy explicitly bounded to deterministic scoring and policy composition.",
    ],
  },
  {
    slug: "dune-analytics",
    title: "Dune Analytics Workspace",
    sponsor: "Dune",
    prizeSummary: "$6k plan with clear backend/data emphasis and a single winning submission slot.",
    winnerAnnouncementBy: "May 27, 2026 according to the live listing.",
    skillsNeeded: ["Backend"],
    recommendedWallet: "Solflare only for continuity; the judging focus is telemetry and data value.",
    devnetStatus: "Live on Testnet with diagnostics, runtime evidence, proposal registry, and hosted-read positioning already in product.",
    objective:
      "Present PrivateDAO as analyzable governance infrastructure with exportable evidence, readable proposal state, and runtime telemetry that matters commercially.",
    whyUs:
      "PrivateDAO already ships diagnostics, runtime evidence, live wallet actions, and read-node packaging, which is the hard part of a serious analytics story.",
    primaryCorridor: "Diagnostics + Analytics + Read API",
    liveRoute: "/analytics",
    judgeRoute: "/diagnostics",
    proofRoute: "/documents/telemetry-export-packet",
    deckRoute: "/viewer/investor-pitch-deck",
    videoRoute: "/story",
    readmeHref: "https://github.com/X-PACT/PrivateDAO#readme",
    sourceUrl: "https://privatedao.org/analytics/",
    deliverables: [
      "Lead from diagnostics into analytics and then into hosted read/API value so the telemetry story feels monetizable.",
      "Package runtime evidence, proposal state, and analytics summary as a data-grade review corridor.",
      "Keep the story tied to real governance actions already captured on Testnet.",
    ],
    requirements: [
      "A credible backend/data thesis, not only frontend polish.",
      "Visible runtime or indexed state that can support analysis and exports.",
      "A clear explanation of why the data layer matters to real users or operators.",
    ],
    winningMoves: [
      "Show that analytics are a product feature for governance buyers, not a vanity dashboard.",
      "Use diagnostics, read-node packaging, and evidence packets as one telemetry corridor.",
      "Tie every chart or readout back to real Testnet actions and reviewer-visible proof.",
    ],
    sponsorFit: [
      "Dune fit is strongest when PrivateDAO reads like analyzable infrastructure, not just private voting UX.",
      "The runtime evidence system and hosted reads make analytics a natural extension of the current product.",
      "A single, clean telemetry corridor can outperform broader but less grounded storytelling.",
    ],
    validationSteps: [
      "Run `npm run build:runtime-evidence && npm run verify:runtime-evidence` before submission screenshots.",
      "Keep `/diagnostics`, `/analytics`, and `/documents/frontier-integrations` aligned in screenshots and deck copy.",
      "Do not claim Dune-native dashboards unless they are actually published.",
    ],
  },
  {
    slug: "umbra-confidential-payout",
    title: "Umbra Confidential Payout Workspace",
    sponsor: "Umbra",
    prizeSummary: "Private payout and confidentiality-friendly execution with blockchain, backend, and frontend all visibly in scope.",
    winnerAnnouncementBy: "May 26, 2026 according to the live listing.",
    skillsNeeded: ["Blockchain", "Backend", "Frontend"],
    recommendedWallet: "Solflare for the live product path and reviewer continuity.",
    devnetStatus: "Live on Testnet with confidential treasury motion framing, security route, services, and trust packets already visible.",
    objective:
      "Show confidential payout and payroll governance as a real product corridor with privacy, reviewability, and treasury discipline.",
    whyUs:
      "PrivateDAO already has the underlying story: private governance, confidential operations, REFHE-linked settlement framing, and treasury approval surfaces.",
    primaryCorridor: "Security + Services + Custody",
    liveRoute: "/security",
    judgeRoute: "/services",
    proofRoute: "/documents/confidential-payout-evidence-packet",
    deckRoute: "/viewer/investor-pitch-deck",
    videoRoute: "/story",
    readmeHref: "https://github.com/X-PACT/PrivateDAO#readme",
    sourceUrl: "https://privatedao.org/services/",
    deliverables: [
      "Lead with a confidential payout use case, not a generic privacy slogan.",
      "Route judges through security, services, custody, and the grant-committee packet as one payment corridor.",
      "Keep treasury truth and sender discipline visible in every proof packet.",
    ],
    requirements: [
      "A practical confidential payout or payment thesis.",
      "Clear product linkage between privacy, governance, and execution.",
      "A live product flow that proves this is usable, not just cryptographic theory.",
    ],
    winningMoves: [
      "Show payroll, grants, or contributor disbursement as governed confidential operations.",
      "Use REFHE and ZK as enablers of a business workflow, not abstract primitives.",
      "Keep every claim inside the Testnet/evidence boundary to preserve trust.",
    ],
    sponsorFit: [
      "Umbra fit is strongest when private payout is shown as a user-meaningful treasury operation.",
      "PrivateDAO can already connect confidential approvals, governance, and treasury routing in one surface.",
      "The commercial upside is high because this corridor maps directly to enterprise and committee use cases.",
    ],
    validationSteps: [
      "Run `npm run verify:zk-docs` and `npm run verify:test-wallet-live-proof:v3` before final submission.",
      "Use `/security`, `/services`, `/custody`, and `/documents/grant-committee-pack` as the payout review bundle.",
      "Do not imply mainnet-ready real-funds payout until settlement receipts and hardening gates close.",
    ],
  },
  {
    slug: "adevar-audit-credits",
    title: "Adevar Audit Credits Workspace",
    sponsor: "Adevar Labs",
    prizeSummary: "$50k in security audit credits distributed across five winners.",
    winnerAnnouncementBy: "June 10, 2026 according to the live listing.",
    skillsNeeded: ["Blockchain"],
    recommendedWallet: "Wallet is secondary; this route is about hardening proof and launch discipline.",
    devnetStatus: "Live on Testnet with custody proof, authority hardening, incident readiness, and diagnostics already exposed.",
    objective:
      "Earn audit-credit eligibility by showing that PrivateDAO already behaves like a team preparing for external audit, not a team pretending it is already audited.",
    whyUs:
      "The project already exposes canonical custody proof, authority hardening, incident readiness, and runtime diagnostics in ways judges can inspect directly.",
    primaryCorridor: "Trust + Hardening + Diagnostics",
    liveRoute: "/trust",
    judgeRoute: "/documents/canonical-custody-proof",
    proofRoute: "/documents/authority-hardening-mainnet",
    deckRoute: "/viewer/investor-pitch-deck",
    videoRoute: "/story",
    readmeHref: "https://github.com/X-PACT/PrivateDAO#readme",
    sourceUrl: "https://privatedao.org/trust/",
    deliverables: [
      "Lead with custody proof, authority control, and incident readiness rather than with a generic security claim.",
      "Keep all hardening evidence aligned across trust, docs, and diagnostics.",
      "Present audit-credit readiness clearly with explicit remaining hardening gates.",
    ],
    requirements: [
      "Clear security and hardening posture.",
      "Evidence that the team understands authority control, monitoring, and launch risk.",
      "No overclaiming around audit completion or custody readiness.",
    ],
    winningMoves: [
      "Use reviewer-visible proof and hardening docs as the center of the submission.",
      "Make explicit that external audit is an active hardening gate, not a hidden weakness.",
      "Show that the team already did the pre-audit operational work seriously.",
    ],
    sponsorFit: [
      "Adevar fit improves when security is shown as a discipline across product, not only code snippets.",
      "PrivateDAO already has unusually strong reviewer and hardening packets for this corridor.",
      "Clarity about remaining audit gates is an advantage here, not a liability.",
    ],
    validationSteps: [
      "Run `npm run verify:review-bundle` and `npm run verify:runtime-evidence` before final screenshots.",
      "Use `/trust`, `/documents/canonical-custody-proof`, `/documents/authority-hardening-mainnet`, and `/diagnostics` as the packet.",
      "Keep the external audit gate visible in every hardening-facing narrative.",
    ],
  },
  {
    slug: "superteam-poland",
    title: "Poland Product Leadership Brief",
    sponsor: "Superteam Poland",
    prizeSummary: "$10k regional listing open only to people in Poland.",
    winnerAnnouncementBy: "May 26, 2026 according to the live listing.",
    skillsNeeded: ["Frontend", "Backend", "Blockchain", "Mobile", "Other", "Growth"],
    recommendedWallet: "Solflare for the live product flow, with Android and browser-wallet evidence reinforcing that the experience is usable beyond developer tooling.",
    devnetStatus: "Live on Testnet with a root-domain app, wallet-first execution, judge-visible proof, Android runtime work, and public evidence packets already available.",
    objective:
      "Present PrivateDAO as a Poland-based governance infrastructure product that deserves support because it already turns complex private operations into a clear user-facing Solana experience.",
    whyUs:
      "PrivateDAO already carries the strongest opening signal in this region: a real Poland first-place result, a materially more mature live product, and a public-good thesis built around governance integrity, confidential operations, and practical ecosystem infrastructure.",
    primaryCorridor: "Start + Learn + Judge + Awards",
    liveRoute: "/start",
    judgeRoute: "/judge",
    proofRoute: "/documents/reviewer-fast-path",
    deckRoute: "/documents/capital-readiness-packet",
    videoRoute: "/story",
    readmeHref: "https://github.com/X-PACT/PrivateDAO#readme",
    sourceUrl: "https://privatedao.org/awards/",
    deliverables: [
      "Lead with the live product, then use the Poland win as proof that execution quality has already been recognized.",
      "Keep the page centered on ecosystem service, wallet usability, private governance, and reviewer-visible proof instead of on regional positioning alone.",
      "Show that support accelerates a product already helping DAOs, grant programs, contributor payouts, and governed operations on Solana.",
    ],
    requirements: [
      "A credible product story that a non-specialist judge can understand in minutes.",
      "Visible breadth across frontend, backend, blockchain, mobile, and growth without fragmenting the product identity.",
      "A clear explanation of how this infrastructure benefits the Solana ecosystem beyond the team itself.",
    ],
    winningMoves: [
      "Open with start and learn, then move directly into judge and proof so the product feels usable before it feels technical.",
      "Use Android and browser-wallet evidence to show that ordinary users can operate private governance flows without scripts or terminal work.",
      "Frame support as a way to accelerate ecosystem infrastructure already working on Testnet, not as a request to rescue an incomplete idea.",
    ],
    sponsorFit: [
      "This workspace rewards visible execution breadth, and PrivateDAO now spans product, mobile, runtime evidence, Testnet execution, and trust surfaces.",
      "The prior Poland win gives immediate credibility, but the current page must prove that the team is building toward a durable Solana company, not repeating old success.",
      "Regional judges are more likely to back a team that already serves the ecosystem and clearly knows how support turns current execution into broader adoption.",
    ],
    validationSteps: [
      "Use `/start`, `/learn`, `/judge`, and `/awards` as the opening packet.",
      "Keep screenshots and copy aligned with the current live site and live Testnet transactions, not stale prior builds.",
      "Do not let the page read like a track memo; it must read like a support-worthy product brief.",
    ],
  },
  {
    slug: "poland-grants",
    title: "Regional Grants Workspace",
    sponsor: "Regional ecosystem grants",
    prizeSummary: "Regional grant corridor for teams that can show ecosystem value and credible execution.",
    winnerAnnouncementBy: "Follow the active grants page for current review timing.",
    skillsNeeded: ["Frontend", "Backend", "Blockchain", "Product", "Operations"],
    recommendedWallet: "Solflare for continuity; commercial and trust surfaces carry most of the grant weight.",
    devnetStatus: "Live on Testnet with services packaging, trust packets, awards proof, and story route already usable in grant review.",
    objective:
      "Present PrivateDAO as regionally valuable governance infrastructure with a clear commercial path and disciplined launch boundaries.",
    whyUs:
      "The live product, services route, trust packet, and regional win signal combine into a stronger grant case than a standard product deck alone.",
    primaryCorridor: "Services + Trust + Awards",
    liveRoute: "/services",
    judgeRoute: "/trust",
    proofRoute: "/documents/poland-foundation-grant-application-packet",
    deckRoute: "/viewer/investor-pitch-deck",
    videoRoute: "/story",
    readmeHref: "https://github.com/X-PACT/PrivateDAO#readme",
    sourceUrl: "https://privatedao.org/documents/solana-developer-tooling-proposal-2026/",
    deliverables: [
      "Lead with the product and service surfaces, then attach trust and regional proof.",
      "Keep the grant story tied to real ecosystem infrastructure, not generic startup aspiration.",
      "Show how the product can outlive the current review cycle commercially.",
    ],
    requirements: [
      "A clear regional or ecosystem value proposition.",
      "Evidence of execution and product maturity.",
      "A believable path from grant capital to durable product impact.",
    ],
    winningMoves: [
      "Frame PrivateDAO as governance infrastructure with commercial rails, not just a DAO interface.",
      "Use the regional proof signal carefully but anchor the case in current product strength.",
      "Keep production gates explicit so grant reviewers trust the roadmap.",
    ],
    sponsorFit: [
      "Regional grants fit is strongest when the product reads like durable ecosystem infrastructure.",
      "The services route, trust packet, and awards proof together give a serious grant narrative.",
      "Regional reviewers will care about long-term usefulness more than novelty alone.",
    ],
    validationSteps: [
      "Use `/services`, `/trust`, `/awards`, and `/documents/launch-trust-packet` as the review set.",
      "Keep commercial claims tied to shipped routes and evidence packets only.",
      "Avoid implying regional exclusivity if the active grant page does not require it.",
    ],
  },
  {
    slug: "startup-accelerator",
    title: "Startup Accelerator Workspace",
    sponsor: "Startup acceleration corridor",
    prizeSummary: "Accelerator corridor for startup-quality products that can convert grant review into real product momentum.",
    winnerAnnouncementBy: "Follow the accelerator review window and support timing.",
    skillsNeeded: ["Frontend", "Backend", "Blockchain", "Design", "Product", "Operations"],
    recommendedWallet: "Solflare for the live product flow; capital reviewers care most about coherence, traction posture, and launch discipline.",
    devnetStatus: "Live on Testnet with root-domain product shell, story video, services packaging, trust packet, and product learning/proof routes already in place.",
    objective:
      "Show that PrivateDAO is already a coherent product: product shell, revenue rails, trust posture, and a disciplined path to production release.",
    whyUs:
      "Few projects combine live product, commercial surfaces, trust packets, runtime evidence, and reviewer-grade documentation as cohesively as PrivateDAO now does.",
    primaryCorridor: "Start + Story + Services + Trust",
    liveRoute: "/start",
    judgeRoute: "/story",
    proofRoute: "/documents/startup-accelerator-application-packet",
    deckRoute: "/viewer/investor-pitch-deck",
    videoRoute: "/story",
    readmeHref: "https://github.com/X-PACT/PrivateDAO#readme",
    sourceUrl: "https://privatedao.org/documents/capital-readiness-packet/",
    deliverables: [
      "Lead with the live product before the deck.",
      "Use services and trust surfaces to make the business and launch thesis inspectable.",
      "Keep the roadmap tied to explicit production gates rather than fuzzy ambition.",
    ],
    requirements: [
      "A startup-quality product narrative.",
      "Clear commercial relevance beyond a short-lived artifact.",
      "A believable plan to convert Testnet proof into production and operating milestones.",
    ],
    winningMoves: [
      "Use start, story, services, and trust as one accelerator-ready funnel.",
      "Treat production gates as execution milestones, not marketing liabilities.",
      "Make the commercial infrastructure thesis explicit: governance, gaming, and confidential payout corridors on one stack.",
    ],
    sponsorFit: [
      "This corridor maps directly to where PrivateDAO is strongest commercially.",
      "The app, deck, story, proof, and trust routes now look more like a company package than a temporary repo.",
      "Accelerator reviewers will reward coherence, discipline, and visible execution more than extra feature count.",
    ],
    validationSteps: [
      "Use `/start`, `/story`, `/services`, `/trust`, `/documents/startup-accelerator-application-packet`, and `/viewer/investor-pitch-deck` as the capital packet.",
      "Keep `docs/mainnet-blockers.json` and public trust language aligned before any grant submission.",
      "Do not claim production launch readiness until the operating gate set is materially closed.",
    ],
  },
];

export function getCompetitionTrackWorkspace(slug: string) {
  return competitionTrackWorkspaces.find((workspace) => workspace.slug === slug) ?? null;
}

export const proofPackets = [
  {
    title: "Live proof",
    summary: "Canonical Testnet create → vote → execute flow with public reviewer links.",
    href: "/proof/?judge=1",
    cta: "Open judge view",
  },
  {
    title: "Live proof V3",
    summary: "Dedicated additive hardening proof for Governance V3 and Settlement V3.",
    href: "/documents/live-proof-v3",
    cta: "Open curated V3 packet",
  },
  {
    title: "ZK capability matrix",
    summary: "PrivateDAO-specific matrix for what the ZK stack proves today, how it is verified, and what is still explicitly not claimed.",
    href: "/documents/zk-capability-matrix",
    cta: "Open curated ZK matrix",
  },
  {
    title: "Cryptographic confidence engine",
    summary: "Deterministic scoring model for how ZK, REFHE, MagicBlock, and Fast RPC strengthen specific proposal patterns.",
    href: "/documents/cryptographic-confidence-engine",
    cta: "Open engine specification",
  },
  {
    title: "Core integrations",
    summary: "ZK, REFHE, MagicBlock, backend-indexed reads, and runtime evidence in one surface.",
    href: "/documents/frontier-integrations",
    cta: "Open integrations packet",
  },
  {
    title: "Audit packet",
    summary: "Reviewer and launch artifacts tied together with generated attestations.",
    href: "/documents/audit-packet",
    cta: "Open curated audit packet",
  },
];

export const securitySurfaces = [
  {
    title: "ZK Capability Matrix",
    body: "Layer-by-layer truth-aligned matrix for proofs, anchors, attestation, zk_enforced posture, and verifier boundaries.",
    href: "/documents/zk-capability-matrix",
  },
  {
    title: "Cryptographic Confidence Engine",
    body: "Proposal-aware scoring model for privacy depth, enforcement depth, execution integrity, and reviewer confidence across ZK, REFHE, MagicBlock, and Fast RPC.",
    href: "/documents/cryptographic-confidence-engine",
  },
  {
    title: "Governance Hardening V3",
    body: "Token-supply quorum mode, policy snapshots, and reveal rebate vaults stay additive and versioned.",
    href: "/documents/governance-hardening-v3",
  },
  {
    title: "Settlement Hardening V3",
    body: "Payout caps, evidence aging, REFHE/MagicBlock requirements, and single-use settlement consumption semantics.",
    href: "/documents/settlement-hardening-v3",
  },
  {
    title: "Release readiness register",
    body: "The app keeps launch states clear: live execution, external evidence, custody posture, and audit readiness are shown as separate proof surfaces.",
    href: "/documents/mainnet-blockers",
  },
];

export const zkMatrixHighlights = [
  {
    layer: "Vote validity",
    state: "Live off-chain",
    verifier: "prove + verify commands",
    boundary: "Additive to current protocol",
  },
  {
    layer: "Delegation authorization",
    state: "Live off-chain",
    verifier: "prove + verify commands",
    boundary: "Additive to current protocol",
  },
  {
    layer: "Tally integrity",
    state: "Live off-chain",
    verifier: "bounded tally proof",
    boundary: "Not a full hidden tally replacement",
  },
  {
    layer: "Proposal-bound proof anchors",
    state: "Live and anchored",
    verifier: "Core integrations + live proof V3",
    boundary: "Reviewer-facing on-chain anchoring",
  },
  {
    layer: "zk_enforced path",
    state: "Live but bounded",
    verifier: "verifier strategy + V3 proof packet",
    boundary: "Not yet the dominant production recommendation",
  },
  {
    layer: "On-chain verifier CPI",
    state: "Future protocol phase",
    verifier: "Not claimed",
    boundary: "Future protocol phase",
  },
];

export const confidenceEngineHighlights = [
  {
    factor: "Privacy depth",
    meaning: "Commit-reveal, ZK review overlays, REFHE envelopes, and proposal-bound proof anchors.",
  },
  {
    factor: "Enforcement depth",
    meaning: "Governance V3, Settlement V3, anchors, REFHE boundaries, and MagicBlock evidence when present.",
  },
  {
    factor: "Execution integrity",
    meaning: "Fast RPC runtime, corridor evidence, live proof, and V3 proof completeness for the chosen proposal path.",
  },
  {
    factor: "Reviewer confidence",
    meaning: "Live proof, V3 packet, audit packet, and clear release-boundary visibility.",
  },
];

export const servicesJourney = [
  {
    title: "Pilot Program",
    detail: "Week-by-week rollout packet for teams that want guided adoption rather than a raw protocol integration.",
    href: "/documents/pilot-program",
  },
  {
    title: "Service Level Agreement",
    detail: "Operational framing for hosted reads, response expectations, and trust boundaries.",
    href: "/documents/service-level-agreement",
  },
  {
    title: "Pricing Model",
    detail: "Commercial packaging for API, ops, and confidential governance support without hiding the technical stack.",
    href: "/documents/pricing-model",
  },
  {
    title: "Trust Package",
    detail: "A buyer-readable path into proof packets, runtime evidence, and launch readiness boundaries.",
    href: "/documents/trust-package",
  },
];

export const securityTracks = [
  {
    title: "Governance Hardening V3",
    status: "Testnet-proven",
    summary:
      "Proposal-level governance snapshots, supply-based quorum mode, and reveal rebate vaults keep the path additive instead of reinterpreting legacy objects.",
    href: "/documents/governance-hardening-v3",
  },
  {
    title: "Settlement Hardening V3",
    status: "Testnet-proven",
    summary:
      "Payout caps, evidence aging, and proposal-scoped settlement policy snapshots keep confidential execution bounded and versioned.",
    href: "/documents/settlement-hardening-v3",
  },
  {
    title: "Core integrations",
    status: "Integrated",
    summary:
      "ZK anchors, REFHE envelopes, MagicBlock corridor evidence, and backend-indexed Fast RPC reads remain part of the product story.",
    href: "/documents/frontier-integrations",
  },
  {
    title: "Audit and trust surfaces",
    status: "Reviewer-ready",
    summary:
      "Audit packet, trust package, launch trust packet, and release-gate packet stay visible as product-facing security boundaries.",
    href: "/documents/audit-packet",
  },
];

export const diagnosticsChecks = [
  {
    name: "Proof packets",
    state: "Healthy",
    detail: "Baseline and V3 proof packets are generated and linked through the reviewer bundle.",
    href: "/documents/live-proof-v3",
  },
  {
    name: "Readiness gates",
    state: "Tracked",
    detail: "Release-gate packet, launch checklist, and release ceremony attestations remain explicit and versioned.",
    href: "/documents/mainnet-blockers",
  },
  {
    name: "Wallet runtime",
    state: "Pending external",
    detail: "Real-device runtime captures are tracked clearly and separated from simulated reviewer proof.",
    href: "https://github.com/X-PACT/PrivateDAO/blob/main/docs/wallet-runtime.md",
  },
  {
    name: "Monitoring and alerts",
    state: "Documented",
    detail: "Monitoring alerts, security review, and operator guides are packaged as operational follow-through.",
    href: "https://github.com/X-PACT/PrivateDAO/blob/main/docs/monitoring-alerts.md",
  },
];

export const diagnosticsEvents = [
  {
    title: "Generated artifacts",
    body: "Review attestation, cryptographic manifest, proof packages, and launch attestations stay regenerated together.",
  },
  {
    title: "Review bundle",
    body: "Reviewer tarball verification ensures baseline proof, V3 proof, fast-path docs, and audit packets travel together.",
  },
  {
    title: "Mainnet gate",
    body: "Readiness checks force clear launch boundaries instead of implying custody or audit completion that did not happen.",
  },
];

export const buyerJourneySteps = [
  {
    title: "Choose a product pack",
    description: "Start from grant, fund, gaming, or enterprise rails so the app can bias the governance and treasury experience correctly.",
    outcome: "The product story feels like a guided deployment, not a blank DAO console.",
  },
  {
    title: "Create and fund the DAO",
    description: "Bootstrap the DAO, treasury, governance settings, and wallet-connected runtime surfaces from one product shell.",
    outcome: "Operators understand treasury rails, review state, and service options before launching governance.",
  },
  {
    title: "Submit a private proposal",
    description: "Proposal cards keep privacy boundary, treasury path, service fit, and hardening expectations visible before a vote begins.",
    outcome: "Normal users understand what is being approved and what will be executed.",
  },
  {
    title: "Private vote and execute treasury",
    description: "Commit, reveal, evidence gates, and treasury execution remain connected to proof packets and runtime diagnostics.",
    outcome: "The product closes the loop from governance intent to reviewer-visible execution evidence.",
  },
];

export const commandCenterPacks = [
  {
    title: "Confidential Payroll",
    subtitle: "Enterprise DAO",
    summary: "Best for teams that need private payroll, bonus, and operator trust packaging with REFHE envelopes and additive governance hardening.",
    technologies: ["REFHE", "Fast RPC", "Governance V3"],
    readiness: "Execution-ready pattern",
  },
  {
    title: "Private Grant Committee",
    subtitle: "Grant Committee",
    summary: "Best for proposal review committees that need private signal collection, generated proof packets, and a reviewer-visible grant flow.",
    technologies: ["ZK", "Fast RPC", "Live proof"],
    readiness: "Reviewer-ready pattern",
  },
  {
    title: "Gaming Rewards Corridor",
    subtitle: "Gaming DAO",
    summary: "Best for token reward programs that need MagicBlock corridor evidence and proposal-scoped settlement boundaries.",
    technologies: ["MagicBlock", "Settlement V3", "Diagnostics"],
    readiness: "Evidence-gated pattern",
  },
];

export const commandCenterReferences = [
  {
    title: "Canonical judge route",
    description: "Fastest reviewer path into the live product, integration map, recognition context, and proof handoff.",
    href: "/judge",
  },
  {
    title: "Dedicated V3 proof",
    description: "Governance V3 and Settlement V3 proof packet for the additive hardening path.",
    href: "/documents/live-proof-v3",
  },
  {
    title: "Core integrations",
    description: "ZK, REFHE, MagicBlock, and Fast RPC reviewer packet.",
    href: "/documents/frontier-integrations",
  },
  {
    title: "Launch trust packet",
    description: "Commercial and launch boundaries linked to operational evidence.",
    href: "/documents/launch-trust-packet",
  },
];

export const analyticsSnapshots = [
  {
    label: "Baseline live proof",
    value: "Healthy",
    detail: "Create → submit → private vote → execute treasury is already packaged as reviewer-facing Testnet evidence.",
  },
  {
    label: "V3 hardening proof",
    value: "Healthy",
    detail: "Governance V3 and Settlement V3 have dedicated Testnet proof packets with additive boundaries.",
  },
  {
    label: "Release gates",
    value: "6 tracked",
    detail: "Audit, multisig transfer, monitoring, real-device runtime, source-verifiable receipts, and cutover ceremony stay explicit.",
  },
  {
    label: "Commercial readiness",
    value: "Pilot-ready",
    detail: "Service packs, pricing, SLA, trust package, and onboarding playbook remain visible in-product.",
  },
];

export const analyticsReadiness = [
  {
    title: "Proof coverage",
    body: "Baseline live proof, dedicated V3 hardening proof, integration evidence, and audit packet are all reviewer-facing.",
    tone: "success",
  },
  {
    title: "Runtime operations",
    body: "Execution logs, diagnostics surfaces, reviewer bundles, and readiness gates stay tied to generated artifacts.",
    tone: "cyan",
  },
  {
    title: "Launch truth boundary",
    body: "Production custody, multisig ceremony, audit completion, and real-device captures remain active release gates until evidenced.",
    tone: "warning",
  },
];

export const launchBlockers = [
  {
    name: "Multisig + authority transfer",
    state: "External evidence next",
    note: "Custody workspace and transfer runbooks are live; program authority and operational privileges still need final multisig transaction evidence.",
  },
  {
    name: "External audit closure",
    state: "External evidence next",
    note: "Security review packet exists, and external sign-off remains an explicit hardening gate.",
  },
  {
    name: "Real-device runtime captures",
    state: "Capture expansion active",
    note: "Wallet runtime templates are documented; production captures are still separated from claims.",
  },
  {
    name: "Monitoring + alerting",
    state: "Documented",
    note: "Operational rules exist and are linked, but live deployment evidence remains outside the repo surface.",
  },
];

export const analyticsSeries = {
  votes: [
    { name: "Mon", commits: 14, reveals: 9 },
    { name: "Tue", commits: 20, reveals: 14 },
    { name: "Wed", commits: 31, reveals: 25 },
    { name: "Thu", commits: 26, reveals: 21 },
    { name: "Fri", commits: 38, reveals: 33 },
    { name: "Sat", commits: 22, reveals: 18 },
  ],
  treasury: [
    { name: "Confidential payroll", value: 41 },
    { name: "Gaming corridor", value: 24 },
    { name: "Grant payouts", value: 19 },
    { name: "Ops reserve", value: 16 },
  ],
  proposals: [
    { month: "Jan", proposals: 8, executed: 5 },
    { month: "Feb", proposals: 11, executed: 7 },
    { month: "Mar", proposals: 14, executed: 10 },
    { month: "Apr", proposals: 17, executed: 12 },
  ],
};

export const awards = [
  {
    label: "Recognition",
    value: "1st Place - Superteam Poland, March 2026; 3rd Place - Superteam UAE Frontier Hackathon, May 2026",
  },
  {
    label: "Ecosystem signal",
    value: "Top 1% in Solana recognition, presented as a credibility signal alongside live Testnet proof and reviewer-visible operating evidence",
  },
  {
    label: "Live hosting",
    value: "Eitherway preview, Supabase receipt continuity, AWS read-node, and privatedao.org proof routes are linked from the reviewer surface",
  },
  {
    label: "Track packaging",
    value: "23 side-track surfaces are mapped to product routes so reviewers can inspect each integration without hunting through raw docs",
  },
];

export const trustLinks = [
  {
    title: "Story video",
    summary: "The comprehensive product reel that explains everything PrivateDAO offers and why the project is reviewer-ready.",
    href: "/story",
  },
  {
    title: "Canonical judge route",
    summary: "Fastest reviewer path into the live product, proof handoff, integration map, and recognition context.",
    href: "/judge",
  },
  {
    title: "Audit packet",
    summary: "Generated audit-facing packet that ties reviewer and launch evidence together.",
    href: "/documents/audit-packet",
  },
  {
    title: "Launch trust packet",
    summary: "Commercial and launch trust narrative with boundaries kept explicit.",
    href: "/documents/launch-trust-packet",
  },
  {
    title: "Release readiness register",
    summary: "Clear launch-state view for custody, audit, and runtime evidence before real-funds expansion.",
    href: "/documents/mainnet-blockers",
  },
  {
    title: "Presentation deck",
    summary: "Pitch-ready investor and reviewer presentation surface.",
    href: "https://github.com/X-PACT/PrivateDAO/blob/main/docs/investor-pitch-deck.md",
  },
  {
    title: "Live proof V3",
    summary: "Dedicated additive hardening proof packet for Governance V3 and Settlement V3.",
    href: "/documents/live-proof-v3",
  },
];

export const commercialCompare = [
  {
    name: "Pilot Package",
    fit: "Best for teams validating private governance and treasury operations before a longer rollout.",
    deliverable: "$2,500 four-week pilot with one Testnet workflow, wallet onboarding, proof packet, operator handoff, and conversion recommendation.",
    cta: "Open pilot program",
    href: "/documents/pilot-program",
  },
  {
    name: "Hosted Read API + Ops",
    fit: "Best for apps or teams that need cleaner governance data, evidence reads, and reviewer exports.",
    deliverable: "Hosted read surfaces, ops guidance, reviewer packet alignment, and product-facing API framing.",
    cta: "Open service catalog",
    href: "/documents/service-catalog",
  },
  {
    name: "Confidential Operations Premium",
    fit: "Best for payroll, bonus, and private treasury teams that need stronger confidentiality boundaries.",
    deliverable: "REFHE paths, V3 hardening, evidence-gated treasury flows, and operator trust surfaces.",
    cta: "Open pricing model",
    href: "/documents/pricing-model",
  },
  {
    name: "Enterprise Governance Retainer",
    fit: "Best for organizations that want longer-term support across launch, controls, and operator workflows.",
    deliverable: "$750/month managed operations start after pilot validation, with custom sovereign deployments for dedicated infrastructure and controls.",
    cta: "Open SLA",
    href: "/documents/service-level-agreement",
  },
];

export const proofFlowSteps = [
  {
    title: "Live proof",
    detail: "Open the canonical Testnet flow that proves create → submit → private vote → execute treasury happened.",
    href: "/proof/?judge=1",
  },
  {
    title: "Dedicated V3 proof",
    detail: "Open the additive hardening packet for Governance V3 and Settlement V3 after reviewing the baseline flow.",
    href: "/documents/live-proof-v3",
  },
  {
    title: "Integration packet",
    detail: "Open the integrations packet to verify ZK, REFHE, MagicBlock, and Fast RPC surfaces together.",
    href: "/documents/frontier-integrations",
  },
  {
    title: "Audit and launch trust",
    detail: "Close the loop with audit packet, launch trust packet, and the release-gate packet so proof is not separated from deployment truth.",
    href: "/documents/launch-trust-packet",
  },
];

export const heroPersonas = {
  buyer: {
    label: "Buyer",
    eyebrow: "Pilot-ready product surface",
    title: "Private governance and treasury execution packaged like a serious product.",
    description:
      "See service packs, pricing language, trust boundaries, release gates, and a guided path from product selection to treasury execution.",
    primaryCtaLabel: "Get started",
    primaryCtaHref: "/start",
    secondaryCtaLabel: "Open govern",
    secondaryCtaHref: "/govern",
    badge: "Commercial + launch aware",
  },
  judge: {
    label: "Judge",
    eyebrow: "Reviewer-first proof surface",
    title: "Proof packets, additive hardening, and launch truth are visible without digging.",
    description:
      "Move from live proof to V3 hardening, integration packets, audit packet, and trust surfaces without losing the actual product flow.",
    primaryCtaLabel: "Open proof center",
    primaryCtaHref: "/proof",
    secondaryCtaLabel: "Open awards + trust",
    secondaryCtaHref: "/awards",
    badge: "Baseline + V3 reviewer path",
  },
  operator: {
    label: "Operator",
    eyebrow: "Governance and runtime operations",
    title: "Proposal actions, wallet state, diagnostics, and readiness gates stay connected.",
    description:
      "Govern, live state, diagnostics, and release gates remain available in one operational surface for the team actually running the DAO.",
    primaryCtaLabel: "Open governance dashboard",
    primaryCtaHref: "/dashboard",
    secondaryCtaLabel: "Open diagnostics",
    secondaryCtaHref: "/diagnostics",
    badge: "Runtime and wallet aware",
  },
} as const;
