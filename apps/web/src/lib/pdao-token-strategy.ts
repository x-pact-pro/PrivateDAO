export type PdaoTokenStrategyContext =
  | "services"
  | "dashboard"
  | "command-center"
  | "documents";

type StrategyItem = {
  label: string;
  detail: string;
};

export type PdaoTokenStrategySnapshot = {
  title: string;
  description: string;
  boundary: string;
  mint: string;
  network: string;
  tokenProgram: string;
  supply: string;
  bestRouteLabel: string;
  bestRouteHref: string;
  tokenArchitectureHref: string;
  tokenSurfaceHref: string;
  now: StrategyItem[];
  gates: StrategyItem[];
  futureFacing: StrategyItem[];
  techRails: StrategyItem[];
};

const sharedSnapshot = {
  boundary:
    "PDAO is the public Solana Mainnet token identity for PrivateDAO. It is presented as a factual community asset, not as a guaranteed payment instrument or investment return.",
  mint: "9isGuumtaqvJeJeyLF44fvfskk2cv5mYsopexMBfpump",
  network: "Solana Mainnet",
  tokenProgram: "Public mint identity",
  supply: "See the official public facts page",
  tokenArchitectureHref: "/documents/token-architecture",
  tokenSurfaceHref: "/documents/pdao-token-surface",
  now: [
    {
      label: "Governance participation",
      detail:
        "PDAO is the public token identity associated with the PrivateDAO community and product ecosystem.",
    },
    {
      label: "Proposal discipline",
      detail:
        "It exists as the participation layer behind proposal lifecycle responsibility instead of leaving proposal access completely open-ended.",
    },
    {
      label: "Treasury accountability",
      detail:
        "Treasury motions stay tied to a governed participation surface rather than informal wallet choreography or off-chain chat decisions.",
    },
    {
      label: "Reviewer-visible identity",
      detail:
        "The token surface, mint attestation, metadata, and disabled mint authority are already reviewer-visible and bound to the proof package.",
    },
  ],
  gates: [
    {
      label: "Voting rights",
      detail:
        "PDAO gates who participates in the proposal lifecycle today, especially voting and reviewer-facing governance flows.",
    },
    {
      label: "Proposal access",
      detail:
        "The token strategy supports proposal access and anti-spam governance posture without claiming a new protocol interface beyond the documented token-gated surface.",
    },
    {
      label: "Treasury action classes",
      detail:
        "It governs who can shape treasury-sensitive motions such as top-ups, vendor payouts, contributor flows, and confidential payout proposals.",
    },
    {
      label: "Community membership",
      detail:
        "PDAO already reads naturally as a membership and governance identity layer for recurring operator and community actions.",
    },
  ],
  futureFacing: [
    {
      label: "Gaming governance",
      detail:
        "Reward policies, clan treasury motions, sponsorship budgets, and tournament allocations are the most natural next gaming-facing uses.",
    },
    {
      label: "API and operator permissions",
      detail:
        "Hosted reads, diagnostics, and API-oriented governance services can use PDAO as a permission and accountability layer rather than a billing token.",
    },
    {
      label: "Commercial service access",
      detail:
        "Longer term, PDAO can anchor recurring governance identity across enterprise deployments, contributor rails, and governed service permissions.",
    },
    {
      label: "Confidential settlement governance",
      detail:
        "Future-facing confidential payout and settlement policies can stay governed by PDAO without claiming that the token itself is the settlement asset.",
    },
  ],
  techRails: [
    {
      label: "ZK",
      detail:
        "ZK remains the proof and reviewer-confidence rail around proposal patterns and governance interpretation, not a separate token thesis.",
    },
    {
      label: "MagicBlock",
      detail:
        "MagicBlock is the responsive confidential payout corridor. PDAO governs access and policy around that corridor instead of replacing it.",
    },
    {
      label: "REFHE",
      detail:
        "REFHE stays the encrypted settlement gate for confidential payout proposals. PDAO is the governance layer deciding when those proposals move forward.",
    },
    {
      label: "RPC and API",
      detail:
        "Indexed proposals, hosted reads, diagnostics, and reviewer telemetry make the token strategy inspectable as infrastructure rather than symbolic branding.",
    },
    {
      label: "Payments",
      detail:
        "PDAO should be read as a governance and control token around payments readiness, payout policy, and treasury routing, not as the public payments coin itself.",
    },
  ],
} satisfies Omit<
  PdaoTokenStrategySnapshot,
  "title" | "description" | "bestRouteLabel" | "bestRouteHref"
>;

export function getPdaoTokenStrategySnapshot(
  context: PdaoTokenStrategyContext,
): PdaoTokenStrategySnapshot {
  switch (context) {
    case "services":
      return {
        ...sharedSnapshot,
        title: "PDAO token strategy for buyers, payments, and infrastructure reviewers",
        description:
          "Explain the token as governance coordination and commercial control infrastructure: what it already does now, what it gates, what remains future-facing, and how it stays tied to payments, API, RPC, and confidential execution rails without pretending to be a generic payment coin.",
        bestRouteLabel: "Open services payments rail",
        bestRouteHref: "/services",
      };
    case "dashboard":
      return {
        ...sharedSnapshot,
        title: "PDAO token strategy for live governance operations",
        description:
          "Keep the token story operational: PDAO governs participation, proposal discipline, and treasury accountability inside the live dashboard instead of reading like detached tokenomics.",
        bestRouteLabel: "Open governance dashboard",
        bestRouteHref: "/dashboard",
      };
    case "command-center":
      return {
        ...sharedSnapshot,
        title: "PDAO token strategy for operator and execution paths",
        description:
        "Show the public token facts without confusing the token identity with product execution, payment rails, or workflow verification.",
        bestRouteLabel: "Open command-center payout path",
        bestRouteHref: "/command-center",
      };
    case "documents":
      return {
        ...sharedSnapshot,
        title: "PDAO token strategy for judges and reviewer packets",
        description:
          "Give reviewers one truth-aligned explanation of the public Mainnet token identity and keep it separate from PrivateDAO product execution and technical evidence.",
        bestRouteLabel: "Open treasury reviewer packet",
        bestRouteHref: "/documents/treasury-reviewer-packet",
      };
  }
}
