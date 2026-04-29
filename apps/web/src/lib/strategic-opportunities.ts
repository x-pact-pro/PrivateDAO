export type StrategicOpportunity = {
  slug: string;
  title: string;
  sponsor: string;
  fit: "Strong" | "Moderate" | "Selective";
  summary: string;
  shippedNow: string;
  missingFeature: string;
  action: string;
  skillsNeeded: string[];
  liveRoutes: string[];
  sourceUrls: string[];
};

export const strategicOpportunities: StrategicOpportunity[] = [
  {
    slug: "startup-capital-corridor",
    title: "Startup Capital Corridor",
    sponsor: "Accelerator and ecosystem funding",
    fit: "Strong",
    summary:
      "PrivateDAO already reads like a startup-quality Testnet product with trust packets, reviewer paths, and commercial surfaces that can support accelerator and grant review.",
    shippedNow:
      "Root-domain product shell, story route, command center, services, custody truth, reviewer packets, and launch-trust surfaces are live.",
    missingFeature:
      "The strongest version requires treasury professionalism, custody proof continuity, and a buyer-safe funding narrative to stay perfectly aligned.",
    action:
      "Lead with /start, /story, /services, and the custody reviewer packet so capital reviewers see one coherent product and launch-readiness thesis.",
    skillsNeeded: ["Frontend", "Backend", "Blockchain", "Product"],
    liveRoutes: ["/start", "/story", "/services", "/documents/custody-proof-reviewer-packet"],
    sourceUrls: [
      "https://privatedao.org/documents/capital-readiness-packet/",
      "https://privatedao.org/services/",
    ],
  },
  {
    slug: "regional-grant-corridor",
    title: "Regional Grant Corridor",
    sponsor: "Regional ecosystem grants",
    fit: "Moderate",
    summary:
      "The project already has a credible regional proof story thanks to the live product, reviewer packets, and the existing first-place Poland signal.",
    shippedNow:
      "Awards, story video, reviewer packet flow, and the public root-domain product make the regional grant case legible quickly.",
    missingFeature:
      "Regional eligibility and deployment value should stay explicit, and the case should remain framed around ecosystem infrastructure rather than generic overlap.",
    action:
      "Use the awards proof, core product route, and trust packet as the regional-review starter bundle.",
    skillsNeeded: ["Product", "Frontend", "Operations"],
    liveRoutes: ["/awards", "/start", "/documents/launch-trust-packet"],
    sourceUrls: [
      "https://privatedao.org/awards/",
      "https://privatedao.org/documents/solana-developer-tooling-proposal-2026/",
    ],
  },
  {
    slug: "data-and-telemetry-corridor",
    title: "Data And Telemetry Corridor",
    sponsor: "Analytics and telemetry side opportunities",
    fit: "Moderate",
    summary:
      "Runtime evidence, diagnostics, indexed proposal state, and hosted reads already give PrivateDAO a real analytics story, not only dashboard cosmetics.",
    shippedNow:
      "Diagnostics, runtime evidence, proposal registry, read-node snapshot, and reviewer-facing operational artifacts are already in-product.",
    missingFeature:
      "The strongest data submission would add a tighter analyst-facing corridor around exports, evidence summaries, and infrastructure storytelling.",
    action:
      "Lead from /diagnostics to /analytics to integration evidence and read-node evidence as one telemetry-grade infrastructure lane.",
    skillsNeeded: ["Backend", "Infrastructure", "Analytics"],
    liveRoutes: ["/diagnostics", "/analytics", "/documents/frontier-integrations"],
    sourceUrls: [
      "https://privatedao.org/analytics/",
      "https://privatedao.org/services/",
    ],
  },
  {
    slug: "confidential-payout-corridor",
    title: "Confidential Payout Corridor",
    sponsor: "Private payout and treasury operations",
    fit: "Strong",
    summary:
      "PrivateDAO already has the right foundation for confidential grants, payroll, and payout approvals through REFHE, privacy rails, and treasury request routing.",
    shippedNow:
      "Security route, treasury receive surface, grant committee pack, confidence engine, and custody truth surfaces are already aligned enough to tell a serious payout story.",
    missingFeature:
      "The highest-value uplift is continued tightening of reviewer-safe payout evidence, sender discipline, and custody-linked treasury truth.",
    action:
      "Lead with /security, /services, /custody, and the grant committee pack as the confidential payout bundle.",
    skillsNeeded: ["Security", "Blockchain", "Product"],
    liveRoutes: ["/security", "/services", "/custody", "/documents/grant-committee-pack"],
    sourceUrls: [
      "https://privatedao.org/security/",
      "https://privatedao.org/services/",
    ],
  },
  {
    slug: "audit-and-hardening-corridor",
    title: "Audit And Hardening Corridor",
    sponsor: "Security bounty and hardening opportunities",
    fit: "Selective",
    summary:
      "PrivateDAO has a strong reviewer and hardening story, but this corridor only becomes first-class when every claim stays pinned to exact proof, custody state, and blocker truth.",
    shippedNow:
      "Canonical custody proof, reviewer packet, authority hardening, incident readiness, and diagnostics already exist as a serious review surface.",
    missingFeature:
      "External audit closure remains an evidence gate, so the product should present hardening truth with discipline rather than bounty-style hype.",
    action:
      "Lead with canonical custody proof, authority hardening, incident readiness, and diagnostics as the strict hardening packet.",
    skillsNeeded: ["Security", "Backend", "Operations"],
    liveRoutes: [
      "/documents/canonical-custody-proof",
      "/documents/authority-hardening-mainnet",
      "/documents/incident-readiness-runbook",
      "/diagnostics",
    ],
    sourceUrls: [
      "https://privatedao.org/trust/",
    ],
  },
];
