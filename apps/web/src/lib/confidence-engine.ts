export type ConfidenceSignals = {
  commitReveal: boolean;
  zkReview: boolean;
  zkAnchors: boolean;
  governanceV3: boolean;
  settlementV3: boolean;
  refheEnvelope: boolean;
  magicBlockEvidence: boolean;
  fastRpcIndexed: boolean;
  liveProof: boolean;
  v3Proof: boolean;
  auditPacket: boolean;
  launchBoundaryExplicit: boolean;
};

export type ConfidenceSignalKey = keyof ConfidenceSignals;

export type ConfidencePreset = {
  key: "grant" | "fund" | "gaming" | "enterprise";
  label: string;
  subtitle: string;
  signals: ConfidenceSignals;
};

export type ConfidenceProfile = {
  title: string;
  subtitle: string;
  explanation: string;
  signals: ConfidenceSignals;
};

export type ProposalConfidenceInput = {
  title: string;
  type: string;
  status: string;
  privacy: string;
  tech: string[];
  summary?: string;
};

type ConfidenceDimension = {
  title: string;
  weight: number;
  factors: Array<{
    label: string;
    weight: number;
    enabled: (signals: ConfidenceSignals) => boolean;
  }>;
};

export type ConfidenceScorecard = {
  title: string;
  subtitle: string;
  explanation: string;
  total: number;
  band: "Foundational" | "Strong" | "Advanced";
  dimensions: Array<{
    title: string;
    score: number;
    weight: number;
  }>;
  strongestSignals: string[];
  missingSignals: string[];
  recommendations: string[];
};

const DIMENSIONS: ConfidenceDimension[] = [
  {
    title: "Privacy depth",
    weight: 28,
    factors: [
      { label: "Commit-reveal voting", weight: 26, enabled: (signals) => signals.commitReveal },
      { label: "ZK review overlay", weight: 30, enabled: (signals) => signals.zkReview },
      { label: "REFHE confidential envelope", weight: 28, enabled: (signals) => signals.refheEnvelope },
      { label: "Proposal-bound proof anchors", weight: 16, enabled: (signals) => signals.zkAnchors },
    ],
  },
  {
    title: "Enforcement depth",
    weight: 28,
    factors: [
      { label: "Governance Hardening V3", weight: 28, enabled: (signals) => signals.governanceV3 },
      { label: "Settlement Hardening V3", weight: 28, enabled: (signals) => signals.settlementV3 },
      { label: "Proposal-bound proof anchors", weight: 20, enabled: (signals) => signals.zkAnchors },
      { label: "MagicBlock settlement evidence", weight: 12, enabled: (signals) => signals.magicBlockEvidence },
      { label: "REFHE execution boundary", weight: 12, enabled: (signals) => signals.refheEnvelope },
    ],
  },
  {
    title: "Execution integrity",
    weight: 24,
    factors: [
      { label: "Fast RPC indexed runtime", weight: 24, enabled: (signals) => signals.fastRpcIndexed },
      { label: "MagicBlock corridor evidence", weight: 26, enabled: (signals) => signals.magicBlockEvidence },
      { label: "REFHE envelope readiness", weight: 24, enabled: (signals) => signals.refheEnvelope },
      { label: "Baseline live proof", weight: 14, enabled: (signals) => signals.liveProof },
      { label: "Dedicated V3 proof", weight: 12, enabled: (signals) => signals.v3Proof },
    ],
  },
  {
    title: "Reviewer confidence",
    weight: 20,
    factors: [
      { label: "Baseline live proof", weight: 30, enabled: (signals) => signals.liveProof },
      { label: "Dedicated V3 proof", weight: 26, enabled: (signals) => signals.v3Proof },
      { label: "Audit packet", weight: 22, enabled: (signals) => signals.auditPacket },
      { label: "Launch boundary remains explicit", weight: 22, enabled: (signals) => signals.launchBoundaryExplicit },
    ],
  },
];

const PROFILE_DATA: ConfidenceProfile[] = [
  {
    title: "Confidential payroll",
    subtitle: "REFHE + Governance V3 + Fast RPC",
    explanation:
      "Payroll flows benefit from private signal collection, versioned governance snapshots, REFHE-bound manifests, and runtime evidence that stays visible to reviewers.",
    signals: {
      commitReveal: true,
      zkReview: true,
      zkAnchors: true,
      governanceV3: true,
      settlementV3: true,
      refheEnvelope: true,
      magicBlockEvidence: false,
      fastRpcIndexed: true,
      liveProof: true,
      v3Proof: true,
      auditPacket: true,
      launchBoundaryExplicit: true,
    },
  },
  {
    title: "Private grant committee",
    subtitle: "ZK + Governance V3 + reviewer-safe proof",
    explanation:
      "Grant committees need private signal collection and strong reviewer context more than confidential payout corridors. ZK and proof anchors do most of the heavy lifting here.",
    signals: {
      commitReveal: true,
      zkReview: true,
      zkAnchors: true,
      governanceV3: true,
      settlementV3: false,
      refheEnvelope: false,
      magicBlockEvidence: false,
      fastRpcIndexed: true,
      liveProof: true,
      v3Proof: true,
      auditPacket: true,
      launchBoundaryExplicit: true,
    },
  },
  {
    title: "Gaming rewards corridor",
    subtitle: "MagicBlock + Settlement V3 + Fast RPC",
    explanation:
      "Token reward programs rely more on settlement evidence and corridor controls than on encrypted payroll-style envelopes. The score reflects that difference instead of pretending every pack has the same cryptographic posture.",
    signals: {
      commitReveal: true,
      zkReview: false,
      zkAnchors: false,
      governanceV3: false,
      settlementV3: true,
      refheEnvelope: false,
      magicBlockEvidence: true,
      fastRpcIndexed: true,
      liveProof: false,
      v3Proof: true,
      auditPacket: true,
      launchBoundaryExplicit: true,
    },
  },
];

function scoreDimension(dimension: ConfidenceDimension, signals: ConfidenceSignals) {
  const enabledWeight = dimension.factors
    .filter((factor) => factor.enabled(signals))
    .reduce((sum, factor) => sum + factor.weight, 0);
  const totalWeight = dimension.factors.reduce((sum, factor) => sum + factor.weight, 0);
  return Math.round((enabledWeight / totalWeight) * 100);
}

function scoreBand(total: number): ConfidenceScorecard["band"] {
  if (total >= 80) return "Advanced";
  if (total >= 62) return "Strong";
  return "Foundational";
}

function strongestSignals(signals: ConfidenceSignals) {
  return DIMENSIONS.flatMap((dimension) =>
    dimension.factors.filter((factor) => factor.enabled(signals)).map((factor) => factor.label),
  ).slice(0, 4);
}

function missingSignals(signals: ConfidenceSignals) {
  return DIMENSIONS.flatMap((dimension) =>
    dimension.factors.filter((factor) => !factor.enabled(signals)).map((factor) => factor.label),
  ).slice(0, 3);
}

export function buildConfidenceScorecard(profile: ConfidenceProfile): ConfidenceScorecard {
  const dimensions = DIMENSIONS.map((dimension) => ({
    title: dimension.title,
    weight: dimension.weight,
    score: scoreDimension(dimension, profile.signals),
  }));
  const total = Math.round(
    dimensions.reduce((sum, dimension) => sum + (dimension.score * dimension.weight) / 100, 0),
  );

  return {
    title: profile.title,
    subtitle: profile.subtitle,
    explanation: profile.explanation,
    total,
    band: scoreBand(total),
    dimensions,
    strongestSignals: strongestSignals(profile.signals),
    missingSignals: missingSignals(profile.signals),
    recommendations: buildRecommendations(profile.signals),
  };
}

export const confidenceProfiles = PROFILE_DATA.map(buildConfidenceScorecard);

export const confidenceDimensions = DIMENSIONS.map((dimension) => ({
  title: dimension.title,
  weight: dimension.weight,
  factors: dimension.factors.map((factor) => factor.label),
}));

export const confidenceEnginePrinciples = [
  "The score is additive and reviewer-facing, not a claim of impossible-to-break security.",
  "ZK, REFHE, MagicBlock, and Fast RPC contribute differently depending on the proposal pattern.",
  "Launch blockers and external custody gates are intentionally left outside the score so the app does not hide ceremony-gated work.",
];

export const confidenceSignalDefinitions: Array<{
  key: ConfidenceSignalKey;
  label: string;
  group: "privacy" | "enforcement" | "execution" | "review";
}> = [
  { key: "commitReveal", label: "Commit-reveal voting", group: "privacy" },
  { key: "zkReview", label: "ZK review overlay", group: "privacy" },
  { key: "zkAnchors", label: "Proposal-bound proof anchors", group: "enforcement" },
  { key: "governanceV3", label: "Governance Hardening V3", group: "enforcement" },
  { key: "settlementV3", label: "Settlement Hardening V3", group: "enforcement" },
  { key: "refheEnvelope", label: "REFHE envelope", group: "execution" },
  { key: "magicBlockEvidence", label: "MagicBlock settlement evidence", group: "execution" },
  { key: "fastRpcIndexed", label: "Fast RPC indexed runtime", group: "execution" },
  { key: "liveProof", label: "Baseline live proof", group: "review" },
  { key: "v3Proof", label: "Dedicated V3 proof", group: "review" },
  { key: "auditPacket", label: "Audit packet", group: "review" },
  { key: "launchBoundaryExplicit", label: "Explicit launch boundary", group: "review" },
];

export const defaultConfidenceSignals: ConfidenceSignals = {
  commitReveal: true,
  zkReview: true,
  zkAnchors: true,
  governanceV3: true,
  settlementV3: true,
  refheEnvelope: false,
  magicBlockEvidence: false,
  fastRpcIndexed: true,
  liveProof: true,
  v3Proof: true,
  auditPacket: true,
  launchBoundaryExplicit: true,
};

export const confidencePresets: ConfidencePreset[] = [
  {
    key: "grant",
    label: "Grant Committee",
    subtitle: "Reviewer-safe grants with private signal collection",
    signals: {
      commitReveal: true,
      zkReview: true,
      zkAnchors: true,
      governanceV3: true,
      settlementV3: false,
      refheEnvelope: false,
      magicBlockEvidence: false,
      fastRpcIndexed: true,
      liveProof: true,
      v3Proof: true,
      auditPacket: true,
      launchBoundaryExplicit: true,
    },
  },
  {
    key: "fund",
    label: "Fund Governance",
    subtitle: "High-sensitivity capital allocation with deeper review rails",
    signals: {
      commitReveal: true,
      zkReview: true,
      zkAnchors: true,
      governanceV3: true,
      settlementV3: true,
      refheEnvelope: true,
      magicBlockEvidence: false,
      fastRpcIndexed: true,
      liveProof: true,
      v3Proof: true,
      auditPacket: true,
      launchBoundaryExplicit: true,
    },
  },
  {
    key: "gaming",
    label: "Gaming DAO",
    subtitle: "Corridor-style rewards with settlement evidence",
    signals: {
      commitReveal: true,
      zkReview: false,
      zkAnchors: false,
      governanceV3: false,
      settlementV3: true,
      refheEnvelope: false,
      magicBlockEvidence: true,
      fastRpcIndexed: true,
      liveProof: false,
      v3Proof: true,
      auditPacket: true,
      launchBoundaryExplicit: true,
    },
  },
  {
    key: "enterprise",
    label: "Enterprise DAO",
    subtitle: "Payroll and bonus operations with confidential execution",
    signals: {
      commitReveal: true,
      zkReview: true,
      zkAnchors: true,
      governanceV3: true,
      settlementV3: true,
      refheEnvelope: true,
      magicBlockEvidence: false,
      fastRpcIndexed: true,
      liveProof: true,
      v3Proof: true,
      auditPacket: true,
      launchBoundaryExplicit: true,
    },
  },
];

function includesAny(value: string, needles: string[]) {
  const normalized = value.toLowerCase();
  return needles.some((needle) => normalized.includes(needle.toLowerCase()));
}

function inferSignals(input: ProposalConfidenceInput): ConfidenceSignals {
  const joinedTech = input.tech.join(" ");
  const privacyText = `${input.privacy} ${input.summary ?? ""} ${input.type}`;
  const statusText = input.status.toLowerCase();

  const commitReveal = includesAny(privacyText, ["commit-reveal", "private vote", "reveal"]);
  const zkReview = includesAny(joinedTech, ["zk"]) || includesAny(privacyText, ["zk review"]);
  const refheEnvelope = includesAny(joinedTech, ["refhe"]) || includesAny(privacyText, ["refhe", "encrypted manifest", "confidential"]);
  const magicBlockEvidence = includesAny(joinedTech, ["magicblock"]) || includesAny(privacyText, ["corridor", "settlement"]);
  const governanceV3 =
    includesAny(joinedTech, ["governance v3"]) ||
    includesAny(input.type, ["grant", "enterprise", "fund"]) ||
    includesAny(privacyText, ["quorum", "governance"]);
  const settlementV3 =
    includesAny(joinedTech, ["settlement v3"]) ||
    magicBlockEvidence ||
    refheEnvelope ||
    includesAny(privacyText, ["settlement", "execution"]);
  const zkAnchors = zkReview || includesAny(privacyText, ["proof anchor", "anchored"]);
  const fastRpcIndexed = includesAny(joinedTech, ["fast rpc"]) || includesAny(privacyText, ["runtime", "reviewer-visible"]);
  const liveProof = statusText !== "evidence gated";
  const v3Proof = governanceV3 || settlementV3;
  const auditPacket = true;
  const launchBoundaryExplicit = true;

  return {
    commitReveal,
    zkReview,
    zkAnchors,
    governanceV3,
    settlementV3,
    refheEnvelope,
    magicBlockEvidence,
    fastRpcIndexed,
    liveProof,
    v3Proof,
    auditPacket,
    launchBoundaryExplicit,
  };
}

function buildRecommendations(signals: ConfidenceSignals) {
  const recommendations: string[] = [];

  if (!signals.zkReview && !signals.refheEnvelope) {
    recommendations.push("Use ZK review rails or REFHE when the proposal leaks sensitive internal intent.");
  }
  if (!signals.magicBlockEvidence && !signals.refheEnvelope) {
    recommendations.push("Keep settlement simpler unless corridor evidence or encrypted payout semantics are actually required.");
  }
  if (!signals.fastRpcIndexed) {
    recommendations.push("Expose Fast RPC-backed diagnostics before presenting the path as fully operator-ready.");
  }
  if (!signals.liveProof) {
    recommendations.push("Attach a live proof path before treating the proposal as reviewer-complete.");
  }
  if (!signals.governanceV3) {
    recommendations.push("Governance V3 improves enforceability when token-supply quorum or stricter policy snapshots matter.");
  }

  return recommendations.slice(0, 3);
}

export function buildProposalConfidenceScorecard(input: ProposalConfidenceInput): ConfidenceScorecard {
  const signals = inferSignals(input);
  const profile = buildConfidenceScorecard({
    title: input.title,
    subtitle: input.type,
    explanation:
      input.summary ??
      "Proposal-aware reading of privacy, enforcement, execution, and reviewer confidence for this governance path.",
    signals,
  });

  return {
    ...profile,
    recommendations: buildRecommendations(signals),
  };
}

export function getConfidenceEngineSummary(input: ProposalConfidenceInput) {
  const scorecard = buildProposalConfidenceScorecard(input);
  return {
    total: scorecard.total,
    band: scorecard.band,
    strongestSignals: scorecard.strongestSignals,
    recommendations: scorecard.recommendations,
  };
}

export function buildManualConfidenceScorecard(signals: ConfidenceSignals, title = "Custom proposal path", subtitle = "Interactive policy composer") {
  return buildConfidenceScorecard({
    title,
    subtitle,
    explanation:
      "Interactive policy composition for a proposal path that mixes ZK, REFHE, MagicBlock, Fast RPC, and additive hardening rails before execution.",
    signals,
  });
}
