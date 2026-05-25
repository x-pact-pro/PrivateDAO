export type TechnicalEvidenceRoute = {
  label: string;
  href: string;
};

export type SponsorEvidenceItem = {
  sponsor: string;
  status: "Direct live use" | "Product-fit" | "Bounded narrative";
  detail: string;
};

export type TrackTechnicalFit = {
  coreIdentity: Array<{ label: string; value: string }>;
  sponsorUsage: string[];
  sponsorEvidence: SponsorEvidenceItem[];
  evidenceRoutes: TechnicalEvidenceRoute[];
  validationGates: string[];
};

const coreIdentity = [
  { label: "Program ID", value: "EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva" },
  { label: "Verification Wallet", value: "4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD" },
  { label: "Governance Mint", value: "DFYvBdivHCe4bSErgCiKm2RhwGEcZYbBPFQzLNr37Bie" },
  { label: "Token Program", value: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" },
];

const defaultRoutes: TechnicalEvidenceRoute[] = [
  { label: "Core integrations", href: "/documents/frontier-integrations" },
  { label: "PDAO attestation", href: "/viewer/pdao-attestation.generated" },
  { label: "Wallet matrix", href: "/viewer/wallet-compatibility-matrix.generated" },
  { label: "Canonical judge route", href: "/judge" },
  { label: "Legacy proof mode", href: "/proof/?judge=1" },
];

const fits: Record<string, TrackTechnicalFit> = {
  "colosseum-frontier": {
    coreIdentity,
    sponsorUsage: [
      "The live route uses a real wallet adapter path, a real program id, and a real governance mint instead of a staged demo-only path.",
      "The product shell connects onboarding, govern, proof, diagnostics, services, and trust packets into one startup-quality surface.",
      "The submission path is deliberately product-first because serious external review now rewards product impact and business quality.",
    ],
    sponsorEvidence: [
      {
        sponsor: "Colosseum",
        status: "Direct live use",
        detail:
          "The app now demonstrates one connected startup-quality product chain across start, govern, proof, diagnostics, services, and trust, which directly matches a product-impact review posture.",
      },
      {
        sponsor: "Solana Foundation",
        status: "Direct live use",
        detail:
          "Real Testnet Program ID, governance mint, wallet path, trust packets, and live Testnet routes are all visible in-product instead of staying buried in backend-only artifacts.",
      },
    ],
    evidenceRoutes: [
      { label: "Product operating brief", href: "/documents/colosseum-frontier-2026-operating-brief" },
      ...defaultRoutes,
    ],
    validationGates: [
      "npm run verify:submission-registry",
      "npm run verify:generated-artifacts",
      "npm run web:verify:live:root",
    ],
  },
  "privacy-track": {
    coreIdentity,
    sponsorUsage: [
      "MagicBlock is not a badge only: confidential settlement corridors and runtime evidence are already exposed on Testnet.",
      "REFHE is tied to confidential payout plans and proposal-bound settlement, not positioned as a vague future primitive.",
      "ZK proof anchors, reviewer packets, and the confidence engine together show privacy, reviewability, and execution integrity in one flow.",
    ],
    sponsorEvidence: [
      {
        sponsor: "MagicBlock",
        status: "Direct live use",
        detail:
          "MagicBlock is tied to responsive settlement corridors and proposal-scoped runtime evidence, not shown as a logo or speculative future hook.",
      },
      {
        sponsor: "REFHE",
        status: "Direct live use",
        detail:
          "REFHE is used to frame confidential payout and payroll boundaries as concrete user workflows instead of generic encrypted-compute claims.",
      },
      {
        sponsor: "ZK",
        status: "Direct live use",
        detail:
          "ZK is surfaced through review posture, proof anchors, and the capability matrix so the privacy thesis remains inspectable by judges and buyers.",
      },
    ],
    evidenceRoutes: [
      { label: "ZK capability matrix", href: "/documents/zk-capability-matrix" },
      { label: "Confidence engine", href: "/documents/cryptographic-confidence-engine" },
      { label: "Live proof V3", href: "/documents/live-proof-v3" },
      { label: "Core integrations", href: "/documents/frontier-integrations" },
    ],
    validationGates: [
      "npm run verify:test-wallet-live-proof:v3",
      "npm run verify:zk-docs",
      "npm run verify:magicblock-runtime",
    ],
  },
  "eitherway-live-dapp": {
    coreIdentity,
    sponsorUsage: [
      "Solflare is the preferred wallet path in-product, while Phantom and Backpack remain first-class fallbacks in the adapter stack.",
      "The live dApp corridor is not isolated from proof or services; it continues into govern, live state, and judge proof without leaving the app.",
      "QuickNode/Kamino/DFlow fit is shown through wallet UX, runtime diagnostics, treasury corridors, and buyer-facing API packaging rather than logos alone.",
    ],
    sponsorEvidence: [
      {
        sponsor: "Solflare",
        status: "Direct live use",
        detail:
          "Solflare is the preferred wallet route in the product shell and is used to drive the live wallet-first experience end to end.",
      },
      {
        sponsor: "QuickNode",
        status: "Direct live use",
        detail:
          "QuickNode-style value is made real through hosted-read, diagnostics, and runtime evidence surfaces that already exist in-product.",
      },
      {
        sponsor: "Kamino / DFlow",
        status: "Product-fit",
        detail:
          "Current fit is shown through treasury and user-execution corridors without overclaiming a deep partner integration that is not yet shipped.",
      },
    ],
    evidenceRoutes: [
      { label: "Start workspace", href: "/start" },
      { label: "Govern", href: "/govern" },
      { label: "Wallet matrix", href: "/viewer/wallet-compatibility-matrix.generated" },
      { label: "Core integrations", href: "/documents/frontier-integrations" },
    ],
    validationGates: [
      "npm run verify:browser-smoke",
      "npm run verify:wallet-matrix",
      "npm run web:verify:live:root",
    ],
  },
  "rpc-infrastructure": {
    coreIdentity,
    sponsorUsage: [
      "Fast RPC is surfaced as hosted reads, diagnostics, runtime evidence, and buyer packaging rather than a buried infra detail.",
      "The read path is backend-indexer based and already tied to proposal counts, confidential payout counts, and MagicBlock/REFHE runtime visibility.",
      "This lets a QuickNode-style judge see operational value, not only raw endpoint usage.",
    ],
    sponsorEvidence: [
      {
        sponsor: "QuickNode / RPC",
        status: "Direct live use",
        detail:
          "Hosted reads, runtime diagnostics, and reviewer-grade evidence exports turn Fast RPC into visible product value rather than buried implementation detail.",
      },
      {
        sponsor: "Infrastructure credits",
        status: "Direct live use",
        detail:
          "The services and diagnostics routes already package what a customer would actually buy from an infrastructure-backed governance product.",
      },
    ],
    evidenceRoutes: [
      { label: "Diagnostics", href: "/diagnostics" },
      { label: "Core integrations", href: "/documents/frontier-integrations" },
      { label: "Runtime evidence", href: "/viewer/runtime-evidence.generated" },
      { label: "Service catalog", href: "/documents/service-catalog" },
    ],
    validationGates: [
      "npm run verify:runtime-evidence",
      "npm run verify:runtime-surface",
      "npm run verify:frontier-integrations",
    ],
  },
  "consumer-apps": {
    coreIdentity,
    sponsorUsage: [
      "The user path is explicit: start, connect wallet, enter govern, then reach proof or services only when needed.",
      "Search and the product assistant convert user problems into the right route, proof packet, and execution surface without exposing repo-level complexity.",
      "The same product shell stays coherent for users, judges, buyers, and operators rather than fragmenting into different demos.",
    ],
    sponsorEvidence: [
      {
        sponsor: "Consumer Apps",
        status: "Direct live use",
        detail:
          "The start path, story route, search, and assistant all reduce protocol complexity for normal users before they ever need to understand proof or trust packets.",
      },
      {
        sponsor: "Wallet UX",
        status: "Direct live use",
        detail:
          "Wallet connect is framed as a natural next step in a guided flow instead of a technical prerequisite dumped on the user.",
      },
    ],
    evidenceRoutes: [
      { label: "Start workspace", href: "/start" },
      { label: "Story route", href: "/story" },
      { label: "Govern", href: "/govern" },
      { label: "Assistant", href: "/assistant" },
    ],
    validationGates: [
      "npm run verify:browser-smoke",
      "npm run verify:frontend-surface",
      "npm run web:verify:live:root",
    ],
  },
  "ranger-main": {
    coreIdentity,
    sponsorUsage: [
      "Ranger main fit comes from integration quality across product shell, proof, trust, and buyer surfaces rather than any single feature.",
      "The program id, token surface, runtime evidence, and submission routes are all connected in the live app, not hidden in separate docs folders.",
      "This is what makes the startup read as coherent and investment-worthy rather than fragmented across disconnected surfaces.",
    ],
    sponsorEvidence: [
      {
        sponsor: "Ranger",
        status: "Direct live use",
        detail:
          "The product shell, trust packets, services, and investor surfaces already behave like a venture-backable infrastructure startup instead of a narrow protocol prototype.",
      },
      {
        sponsor: "Main track",
        status: "Direct live use",
        detail:
          "The submission shows integrated product quality, business packaging, and technical evidence in one live surface, which is what main-track judges care about most.",
      },
    ],
    evidenceRoutes: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Learning path", href: "/learn" },
      { label: "Trust package", href: "/documents/trust-package" },
      { label: "Investor deck", href: "/viewer/investor-pitch-deck" },
    ],
    validationGates: [
      "npm run verify:submission-registry",
      "npm run verify:review-links",
      "npm run web:verify:live:root",
    ],
  },
  "ranger-drift": {
    coreIdentity,
    sponsorUsage: [
      "This fit is framed as treasury governance and risk discipline, not as a misleading trading-bot claim.",
      "The confidence engine and treasury analytics explain bounded capital decisions in a way that judges can audit.",
      "Execution remains policy-scoped through Governance V3, Settlement V3, and proposal-aware confidence scoring.",
    ],
    sponsorEvidence: [
      {
        sponsor: "Ranger Drift side",
        status: "Direct live use",
        detail:
          "This corridor is presented as treasury governance and risk discipline shaped by Drift-era lessons, not as a shallow trading-bot angle.",
      },
      {
        sponsor: "Confidence engine",
        status: "Direct live use",
        detail:
          "Proposal-aware confidence scoring makes treasury and policy decisions legible in a way judges can challenge and customers can understand.",
      },
    ],
    evidenceRoutes: [
      { label: "Analytics", href: "/analytics" },
      { label: "Confidence engine", href: "/documents/cryptographic-confidence-engine" },
      { label: "Security", href: "/security" },
      { label: "Trust package", href: "/documents/trust-package" },
    ],
    validationGates: [
      "npm run verify:zk-docs",
      "npm run verify:generated-artifacts",
      "npm run verify:frontend-surface",
    ],
  },
  "100xdevs": {
    coreIdentity,
    sponsorUsage: [
      "The Next.js multi-page shell, static export deployment, in-app docs, and route-level product surfaces make the frontend architecture visible.",
      "Wallet UX, search, assistant routing, and product corridors show shipping discipline rather than surface-level frontend polish.",
      "The codebase now reads as a product platform with reusable surfaces, not a single demo page.",
    ],
    sponsorEvidence: [
      {
        sponsor: "100xDevs",
        status: "Direct live use",
        detail:
          "The multi-page Next.js shell, static export discipline, search/assistant routing, and product learning/proof routes make frontend and product engineering quality obvious.",
      },
      {
        sponsor: "Shipping discipline",
        status: "Direct live use",
        detail:
          "Root-domain publishing, verification gates, and route-level productization show serious engineering execution rather than event-only polish.",
      },
    ],
    evidenceRoutes: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Developers", href: "/developers" },
      { label: "Search", href: "/search" },
      { label: "Learning path", href: "/learn" },
    ],
    validationGates: [
      "cd apps/web && npm run lint",
      "cd apps/web && npm run build",
      "npm run web:verify:live:root",
    ],
  },
  "encrypt-ika": {
    coreIdentity,
    sponsorUsage: [
      "REFHE is tied to confidential payout envelopes and proposal-scoped settlement rather than a vague encrypted-compute story.",
      "The security route explains exactly where ZK, REFHE, MagicBlock, and Fast RPC contribute and where the honest boundary remains.",
      "This makes encrypted operations feel like a real workflow improvement for payroll, bonus approvals, and committee actions.",
    ],
    sponsorEvidence: [
      {
        sponsor: "Encrypt / IKA",
        status: "Direct live use",
        detail:
          "Encrypted operations are framed through concrete payroll and approval workflows instead of generic cryptography marketing.",
      },
      {
        sponsor: "REFHE + ZK",
        status: "Direct live use",
        detail:
          "The app shows where REFHE and ZK change the workflow and where the honest trust boundary still remains, which is what a serious privacy judge needs to see.",
      },
    ],
    evidenceRoutes: [
      { label: "Security", href: "/security" },
      { label: "REFHE protocol", href: "/viewer/refhe-protocol" },
      { label: "REFHE security model", href: "/viewer/refhe-security-model" },
      { label: "Core integrations", href: "/documents/frontier-integrations" },
    ],
    validationGates: [
      "npm run verify:zk-docs",
      "npm run verify:confidential-manifest",
      "npm run verify:magicblock-runtime",
    ],
  },
  "solrouter-encrypted-ai": {
    coreIdentity,
    sponsorUsage: [
      "The assistant and search surfaces are route-aware guidance layers tied to proof, docs, tracks, and operations rather than hallucinated autonomy.",
      "The confidence engine gives encrypted-decision posture with explicit product rails and sponsor-aware track routing.",
      "This keeps the AI angle grounded in execution and privacy instead of over-claiming a fully autonomous agent.",
    ],
    sponsorEvidence: [
      {
        sponsor: "SolRouter",
        status: "Bounded narrative",
        detail:
          "The current assistant is intentionally deterministic and route-bound. That makes the AI angle real enough to inspect without pretending an autonomous encrypted agent already exists.",
      },
      {
        sponsor: "Encrypted AI posture",
        status: "Product-fit",
        detail:
          "Search, assistant routing, and the confidence engine already create the right operator-assistant foundation for this track while keeping claims disciplined.",
      },
    ],
    evidenceRoutes: [
      { label: "Assistant", href: "/assistant" },
      { label: "Problem-to-route search", href: "/search" },
      { label: "Confidence engine", href: "/documents/cryptographic-confidence-engine" },
      { label: "Security", href: "/security" },
    ],
    validationGates: [
      "npm run verify:frontend-surface",
      "cd apps/web && npm run build",
      "npm run web:verify:live:root",
    ],
  },
};

export function getTrackTechnicalFit(slug: string): TrackTechnicalFit {
  return (
    fits[slug] ?? {
      coreIdentity,
      sponsorUsage: [
        "This track inherits the core PrivateDAO program, token, proof, wallet, and runtime surfaces already visible in the live app.",
      ],
      sponsorEvidence: [
        {
          sponsor: "PrivateDAO core",
          status: "Direct live use",
          detail:
            "The track inherits the live product shell, proof continuity, wallet flow, and trust packaging already visible across the site.",
        },
      ],
      evidenceRoutes: defaultRoutes,
      validationGates: ["npm run verify:frontend-surface", "npm run web:verify:live:root"],
    }
  );
}
