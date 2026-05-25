import type { CompetitionTrackWorkspace } from "@/lib/site-data";

export type TrackCommercializationPlan = {
  buyerType: string;
  customerOffer: string;
  commercialNarrative: string;
  firstPaidMotion: string;
  mainnetUpgradePath: string[];
  routes: Array<{ label: string; href: string }>;
};

export function getTrackCommercializationPlan(
  workspace: CompetitionTrackWorkspace,
): TrackCommercializationPlan {
  if (workspace.slug === "colosseum-frontier") {
    return {
      buyerType: "DAO founders, protocol teams, and early-stage Solana operators evaluating a serious governance operating system.",
      customerOffer: "Pilot Package -> Hosted Read API + Ops -> Enterprise Governance Retainer.",
      commercialNarrative:
        "Colosseum is our strongest startup-quality corridor because it shows the full product chain: onboarding, govern, proof, diagnostics, and services as one sellable system.",
      firstPaidMotion:
        "Close a guided pilot where the customer adopts PrivateDAO Core plus trust-package review before a longer governance rollout.",
      mainnetUpgradePath: [
        "Keep Testnet user path stable while preserving signer and timelock discipline.",
        "Use launch trust packet and mainnet blockers as the explicit customer-facing upgrade gate.",
        "Move from pilot operations into retained governance support after external review and runtime evidence mature.",
      ],
      routes: [
        { label: "Pilot program", href: "/documents/pilot-program" },
        { label: "Services", href: "/services" },
        { label: "Launch trust packet", href: "/documents/launch-trust-packet" },
      ],
    };
  }

  if (workspace.slug === "privacy-track") {
    return {
      buyerType: "Grant councils, payroll teams, and privacy-sensitive organizations that need confidential approvals and bounded treasury execution.",
      customerOffer: "Confidential Operations Premium with trust package and V3 hardening evidence.",
      commercialNarrative:
        "This is where PrivateDAO is easiest to differentiate commercially: private governance, encrypted operations, and proof-backed trust boundaries are already productized.",
      firstPaidMotion:
        "Start with one confidential payroll or grant-approval pilot tied to REFHE envelopes, ZK review posture, and reviewer-visible trust routes.",
      mainnetUpgradePath: [
        "Keep encrypted workflows bounded to clearly documented proposal and payout paths.",
        "Advance governance and settlement hardening evidence alongside launch blockers review.",
        "Gate customer mainnet rollout on external review, runtime capture maturity, and signer policy enforcement.",
      ],
      routes: [
        { label: "Pricing model", href: "/documents/pricing-model" },
        { label: "ZK matrix", href: "/documents/zk-capability-matrix" },
        { label: "Mainnet blockers", href: "/documents/mainnet-blockers" },
      ],
    };
  }

  if (workspace.slug === "eitherway-live-dapp") {
    return {
      buyerType: "Consumer-facing or wallet-first products that need governance actions to feel polished for normal users.",
      customerOffer: "Pilot Package with wallet onboarding and guided govern rollout.",
      commercialNarrative:
        "The Eitherway track converts best when the wallet is not the endpoint but the start of a meaningful proposal and treasury flow.",
      firstPaidMotion:
        "Sell a branded wallet-first pilot that uses Solflare-led onboarding and a guided proposal action path for a real DAO or community program.",
      mainnetUpgradePath: [
        "Keep wallet UX and route clarity stable while production trust surfaces mature.",
        "Carry the same onboarding path into mainnet packaging instead of replacing it with operator-only tools.",
        "Use service and trust packets to make the customer rollout feel managed rather than experimental.",
      ],
      routes: [
        { label: "Start", href: "/start" },
        { label: "Govern", href: "/govern" },
        { label: "Service level agreement", href: "/documents/service-level-agreement" },
      ],
    };
  }

  if (workspace.slug === "rpc-infrastructure") {
    return {
      buyerType: "Protocols, dashboards, and governance products that need faster reads, diagnostics, and reviewer-grade evidence exports.",
      customerOffer: "Hosted Read API + Ops as the clearest infrastructure offer, with enterprise retainer as the next step.",
      commercialNarrative:
        "Fast RPC becomes commercially meaningful when diagnostics, reviewer exports, and hosted-read value are visible in the product shell and service packaging.",
      firstPaidMotion:
        "Sell hosted governance reads and operator diagnostics as a managed API + evidence layer for teams that do not want to build this in-house.",
      mainnetUpgradePath: [
        "Keep diagnostics and runtime evidence tied to real service expectations and trust boundaries.",
        "Strengthen monitoring, alerting, and indexing posture before promising production throughput commitments.",
        "Upgrade from hosted-read pilot into SLA-backed retained operations once runtime evidence is stronger.",
      ],
      routes: [
        { label: "Service catalog", href: "/documents/service-catalog" },
        { label: "Diagnostics", href: "/diagnostics" },
        { label: "SLA", href: "/documents/service-level-agreement" },
      ],
    };
  }

  if (workspace.slug === "consumer-apps") {
    return {
      buyerType: "Communities, gaming programs, and new DAOs that need an understandable first-run governance experience.",
      customerOffer: "Pilot Package first, then productized onboarding plus hosted operations support.",
      commercialNarrative:
        "Consumer strength is not abstract here: it is the ability to make governance, wallet actions, and proof routes comprehensible to a normal user without losing trust depth.",
      firstPaidMotion:
        "Close a user-facing pilot for a community or rewards program that needs cleaner onboarding, guided proposal flow, and buyer-readable trust packaging.",
      mainnetUpgradePath: [
        "Keep the first-run path simple and keep reviewer-heavy routes behind guided progression.",
        "Use the story route and trust package to hold the product narrative together during customer rollout.",
        "Promote to mainnet only after the guided user path survives wider wallet and runtime checks.",
      ],
      routes: [
        { label: "Story", href: "/story" },
        { label: "Start", href: "/start" },
        { label: "Trust package", href: "/documents/trust-package" },
      ],
    };
  }

  if (workspace.slug === "ranger-main") {
    return {
      buyerType: "Serious DAO operators and crypto-native teams buying an integrated governance product rather than a loose stack of tooling.",
      customerOffer: "Enterprise Governance Retainer, backed by pilot and trust-package entry routes.",
      commercialNarrative:
        "Ranger main is where the whole startup-quality story matters most: product shell, proof continuity, business posture, and operational trust must read as one company-grade system.",
      firstPaidMotion:
        "Lead with a retained governance engagement for a customer that needs product shell, proof visibility, and operator support as one package.",
      mainnetUpgradePath: [
        "Preserve the integrated product flow from demo through operations review.",
        "Use launch trust packet and blocker review as the explicit pre-mainnet commercial checkpoint.",
        "Move from Testnet-backed operating partnership into formal retained governance support once readiness gates are satisfied.",
      ],
      routes: [
        { label: "Products", href: "/products" },
        { label: "Services", href: "/services" },
        { label: "Launch trust packet", href: "/documents/launch-trust-packet" },
      ],
    };
  }

  if (workspace.slug === "ranger-drift") {
    return {
      buyerType: "Treasury operators and capital-allocation teams that want tighter policy discipline and execution boundaries after Drift-like lessons.",
      customerOffer: "Enterprise Governance Retainer with analytics, policy review, and trust-bound treasury operations.",
      commercialNarrative:
        "This becomes commercially real when framed as treasury-governance discipline, not speculative trading. The value is bounded policy, analytics, and trust-aware execution.",
      firstPaidMotion:
        "Sell a treasury-governance review plus operating pilot that uses analytics, confidence scoring, and clear risk boundaries for capital decisions.",
      mainnetUpgradePath: [
        "Keep treasury strategy tightly bounded to governance and policy, not open-ended DeFi automation.",
        "Require blocker review, signer posture, and timelock clarity before any mainnet treasury rollout.",
        "Use analytics and trust surfaces as customer evidence, not as marketing-only claims.",
      ],
      routes: [
        { label: "Analytics", href: "/analytics" },
        { label: "Confidence engine", href: "/documents/cryptographic-confidence-engine" },
        { label: "Mainnet blockers", href: "/documents/mainnet-blockers" },
      ],
    };
  }

  if (workspace.slug === "100xdevs") {
    return {
      buyerType: "Developer-led teams that want reusable frontend, wallet UX, and deployment discipline on top of a real governance protocol.",
      customerOffer: "Pilot Package plus Hosted Read API + Ops for teams adopting the shell and evidence surfaces.",
      commercialNarrative:
        "100xDevs is the best proof that this is a production-shaped frontend: multi-page architecture, deployment discipline, wallet matrices, and route-level productization all convert into implementation value for customers.",
      firstPaidMotion:
        "Offer a build-and-adopt pilot where a customer uses the product shell, docs viewer, diagnostics, and evidence flow as a starting governance infrastructure layer.",
      mainnetUpgradePath: [
        "Keep architecture, deployment, and wallet behavior stable across Testnet and production surfaces.",
        "Continue proving verification discipline through root-domain publishing and route-level trust continuity.",
        "Use retained operations and hosted-read packaging as the commercial bridge into mainnet support.",
      ],
      routes: [
        { label: "Developers", href: "/developers" },
        { label: "Dashboard", href: "/dashboard" },
        { label: "Service catalog", href: "/documents/service-catalog" },
      ],
    };
  }

  if (workspace.slug === "encrypt-ika") {
    return {
      buyerType: "Teams that need a commercial story around encrypted operations, confidential payroll, and reviewable privacy posture.",
      customerOffer: "Confidential Operations Premium with launch trust framing and security-backed review path.",
      commercialNarrative:
        "This track should convert like a privacy product, not a cryptography showcase: one encrypted workflow, one proof chain, one trust story, and one bounded commercial offer.",
      firstPaidMotion:
        "Pilot one confidential payroll or bonus-approval workflow, backed by the security route and integrations packet, before expanding to broader DAO operations.",
      mainnetUpgradePath: [
        "Keep encrypted workflows tied to concrete user actions such as payroll or grants.",
        "Advance privacy surfaces with trust packages and mainnet blockers rather than speculative promises.",
        "Upgrade to mainnet only after encrypted ops evidence and external review posture are sufficient for real-funds credibility.",
      ],
      routes: [
        { label: "Security", href: "/security" },
        { label: "Core integrations", href: "/documents/frontier-integrations" },
        { label: "Pricing model", href: "/documents/pricing-model" },
      ],
    };
  }

  if (workspace.slug === "solrouter-encrypted-ai") {
    return {
      buyerType: "Early teams exploring deterministic assistant layers for governance, policy composition, and route-aware operator guidance.",
      customerOffer: "Pilot Package centered on deterministic assistant routing and confidence-engine guidance.",
      commercialNarrative:
        "The commercial value here is not a generic AI chatbot. It is a deterministic assistant that routes users through governance, proof, and policy surfaces with bounded reasoning and explicit trust lines.",
      firstPaidMotion:
        "Package the assistant and search layer as a guided operator workspace for teams that want easier navigation of governance, proof, and trust actions.",
      mainnetUpgradePath: [
        "Keep assistant behavior deterministic and route-bound instead of overstating autonomy.",
        "Use confidence-engine evidence and proof links to show why the assistant is trustworthy.",
        "Treat mainnet expansion as a governance operations helper first, not a speculative agent platform.",
      ],
      routes: [
        { label: "Assistant", href: "/assistant" },
        { label: "Search", href: "/search" },
        { label: "Confidence engine", href: "/documents/cryptographic-confidence-engine" },
      ],
    };
  }

  return {
    buyerType: "Protocols and operators evaluating PrivateDAO as a governance infrastructure layer.",
    customerOffer: "Pilot Package with a clear trust and proof route.",
    commercialNarrative:
      "Each track should still collapse back into the same company-grade product story: a usable governance shell, proof continuity, and an honest path toward mainnet.",
    firstPaidMotion:
      "Start with a pilot grounded in the live product and service corridors before expanding into retained operations.",
    mainnetUpgradePath: [
      "Keep the live product path stable on Solana Testnet.",
      "Use trust packets and blocker reviews as explicit upgrade gates.",
      "Promote to broader customer rollout only when readiness evidence is sufficient.",
    ],
    routes: [
      { label: "Services", href: "/services" },
      { label: "Trust package", href: "/documents/trust-package" },
      { label: "Mainnet blockers", href: "/documents/mainnet-blockers" },
    ],
  };
}
