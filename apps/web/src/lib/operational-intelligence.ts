import type { ProposalCardModel } from "@/lib/site-data";

export type IntelligenceFeatureId =
  | "proposal-analyzer"
  | "treasury-risk-ai"
  | "voting-summary"
  | "rpc-analyzer"
  | "gaming-ai";

export type IntelligenceFeature = {
  id: IntelligenceFeatureId;
  title: string;
  posture: string;
  summary: string;
  route: string;
  tryNow: string;
};

export type IntelligenceAnalysis = {
  headline: string;
  summary: string;
  bullets: string[];
  scoreLabel: string;
  scoreValue: number;
};

export type ProposalCardAnalysis = IntelligenceAnalysis & {
  sourceSummary: string;
};

export type TreasuryCardAnalysis = IntelligenceAnalysis & {
  sourceSummary: string;
};

export const intelligenceFeatures: IntelligenceFeature[] = [
  {
    id: "proposal-analyzer",
    title: "Proposal Review AI",
    posture: "Execution-visible",
    summary:
      "Review proposal readiness before voting, clarify recipients, transfer context, and execution framing without hiding operational notes.",
    route: "/intelligence#proposal-analyzer",
    tryNow: "Paste a proposal and treasury action to receive a pre-vote risk readout.",
  },
  {
    id: "treasury-risk-ai",
    title: "Treasury Review AI",
    posture: "Payments-visible",
    summary:
      "Review payout size, recipient novelty, timing, and execution posture so treasury operations stay legible, disciplined, and reviewer-safe.",
    route: "/intelligence#treasury-risk-ai",
    tryNow: "Enter payout conditions and compare them against a normal treasury motion.",
  },
  {
    id: "voting-summary",
    title: "Voting Summary",
    posture: "Discussion-ready",
    summary:
      "Summarize discussion threads into support, concern, and execution-readiness language for judges and operators.",
    route: "/intelligence#voting-summary",
    tryNow: "Paste governance discussion notes and get a compressed operator summary.",
  },
  {
    id: "rpc-analyzer",
    title: "RPC Analyzer",
    posture: "Infra-grade",
    summary:
      "Turn raw latency, failure rate, and retry pressure into a readable RPC health posture for operators and buyers.",
    route: "/intelligence#rpc-analyzer",
    tryNow: "Input request metrics and get runtime health plus buyer-facing interpretation.",
  },
  {
    id: "gaming-ai",
    title: "Gaming AI",
    posture: "Economy-aware",
    summary:
      "Review reward changes, clan payouts, and event proposals so game governance does not accidentally damage the economy.",
    route: "/intelligence#gaming-ai",
    tryNow: "Model a game update or reward change before it goes to governance.",
  },
];

function normalizeAddress(value: string) {
  return value.trim();
}

function getProposalContextSummary(proposal: ProposalCardModel) {
  const context = proposal.execution;
  const availableSignals = [
    context.recipientKnown ? "recipient" : null,
    context.amount !== null ? "amount" : null,
    context.mintSymbol ? "mint" : null,
    context.timelockHours !== null ? "timelock-hours" : "timelock-state",
    "execution-target",
  ].filter(Boolean);

  return `${context.sourceLabel}. Structured execution context reads ${availableSignals.join(", ")} directly instead of inferring them from card prose.`;
}

export function analyzeProposalCard(proposal: ProposalCardModel): ProposalCardAnalysis {
  const context = proposal.execution;
  const text = `${proposal.title} ${proposal.summary} ${proposal.treasury} ${proposal.privacy}`.toLowerCase();
  const bullets: string[] = [];
  let score = 5.2;

  if (proposal.status === "Execution ready") {
    score -= 1.3;
    bullets.push("Execution posture looks disciplined because voting and reveal are already complete.");
  } else if (proposal.status === "Executed") {
    score -= 1.7;
    bullets.push("The indexed proposal record is already executed on Testnet, so the remaining review question is proof quality rather than signing readiness.");
  } else if (proposal.status === "Live voting") {
    score += 1.1;
    bullets.push("Proposal is still live, so signer clarity and treasury explanation matter before voting closes.");
  } else if (proposal.status === "Evidence gated") {
    score += 1.4;
    bullets.push("Settlement evidence is still gating execution, so reviewers should inspect proof freshness before approval.");
  } else if (proposal.status === "Timelocked") {
    score += 0.8;
    bullets.push("Timelock is active, which is healthy, but the execution path still needs beneficiary clarity.");
  }

  if (proposal.privacy.toLowerCase().includes("commit-reveal")) {
    score -= 0.4;
    bullets.push("Commit-reveal lowers premature intent leakage and strengthens governance discipline.");
  }

  if (proposal.tech.includes("ZK") || proposal.tech.includes("REFHE")) {
    score -= 0.4;
    bullets.push("Cryptographic review rails are part of this motion, which improves trust posture.");
  }

  if (proposal.tech.includes("MagicBlock")) {
    score += 0.5;
    bullets.push("Responsive settlement logic is involved, so runtime evidence should remain visible near execution.");
  }

  if (text.includes("grant")) {
    score += 0.8;
    bullets.push("Grant-style proposals should explain recipient legitimacy and tranche rationale clearly.");
  }

  if (text.includes("payroll") || text.includes("vendor") || text.includes("contributor")) {
    score -= 0.3;
    bullets.push("Operational payout framing is legible to operators and easier to evaluate than a generic transfer.");
  }

  if (context.amount === null) {
    score += 0.8;
    bullets.push("The structured proposal context still lacks an explicit execution amount, so signers should request the exact treasury magnitude before voting.");
  } else if (context.amount >= 100) {
    score += 1.4;
    bullets.push(`The live execution context carries a ${context.amountDisplay}, which deserves stronger treasury explanation before signatures are collected.`);
  }

  if (!context.recipientKnown) {
    score += 1.2;
    bullets.push("The recipient set is still intentionally undisclosed in the structured proposal payload, so the execution packet should carry stronger recipient rationale.");
  }

  if (!context.mintSymbol) {
    score += 0.9;
    bullets.push("Mint is not yet explicit in the proposal execution context, so the payout asset should stay reviewer-visible before signatures are collected.");
  }

  if (context.timelockHours === null) {
    score += 0.6;
    bullets.push("The current path exposes timelock state but not exact unlock hours, which should be tightened before mainnet-facing claims.");
  }

  const analysis = analyzeProposalRisk({
    title: proposal.title,
    summary: proposal.summary,
    amount: context.amount ?? 0,
    recipient: context.recipient ?? context.recipientLabel,
    mint: context.mintSymbol ?? "pending-asset-disclosure",
    timelockHours: context.timelockHours ?? 0,
    historicalUseCount: context.historicalUseCount,
  });

  const scoreValue = Math.max(1, Math.min(10, Number(((analysis.scoreValue + score) / 2).toFixed(1))));
  const scoreLabel =
    scoreValue >= 7 ? "Execution notes attached" : scoreValue >= 4.5 ? "Operational notes attached" : "Execution path clear";
  const summary =
    proposal.status === "Execution ready" || proposal.status === "Executed"
      ? proposal.status === "Executed"
        ? "This motion is already executed on Testnet, so the AI layer focuses on beneficiary correctness, treasury interpretation, and proof continuity."
        : "This motion is close to execution, so the AI layer focuses on beneficiary clarity, treasury magnitude, and proof visibility."
      : "This motion is still active, so the AI layer focuses on signing clarity, treasury context, and the proof surfaces the reviewer should inspect next.";

  return {
    headline: "Proposal execution review",
    summary,
    bullets: [...analysis.bullets, ...bullets].slice(0, 4),
    scoreLabel,
    scoreValue,
    sourceSummary: getProposalContextSummary(proposal),
  };
}

export function analyzeTreasuryProposalCard(proposal: ProposalCardModel): TreasuryCardAnalysis {
  const context = proposal.execution;
  const text = `${proposal.title} ${proposal.summary} ${proposal.treasury}`.toLowerCase();

  const analysis = analyzeTreasuryRisk({
    amount: context.amount ?? 0,
    normalAmount: context.baselineAmount ?? 0,
    repeatedAttempts: context.repeatedAttempts,
    newRecipient: !context.recipientKnown || context.historicalUseCount <= 1,
    executionDelayHours: context.timelockHours ?? 0,
  });

  const bullets = [...analysis.bullets];

  if (context.amount === null) {
    bullets.push("Treasury magnitude is not yet present in the structured proposal payload, so payout risk should stay conservative.");
  }

  if (!context.recipientKnown) {
    bullets.push("Recipient disclosure is not yet present, so beneficiary validation cannot be completed from the current packet alone.");
  }

  if (!context.mintSymbol) {
    bullets.push("Asset mint is still missing from the structured proposal context, which weakens wallet-side payout verification.");
  }

  if (text.includes("grant")) {
    bullets.push("Grant tranches should expose beneficiary legitimacy and tranche checkpoints before treasury release.");
  }

  if (text.includes("reward") || text.includes("gaming")) {
    bullets.push("Reward corridors need extra diagnostics because fan-out and settlement delays compound quickly.");
  }

  if (text.includes("payroll")) {
    bullets.push("Payroll motions are safer when the payout manifest remains encrypted but reviewer-readable at execution time.");
  }

  return {
    headline: analysis.headline,
    summary: analysis.summary,
    bullets: bullets.slice(0, 4),
    scoreLabel: analysis.scoreLabel,
    scoreValue: analysis.scoreValue,
    sourceSummary: getProposalContextSummary(proposal),
  };
}

export function analyzeProposalRisk(input: {
  title: string;
  summary: string;
  amount: number;
  recipient: string;
  mint: string;
  timelockHours: number | null;
  historicalUseCount: number;
}) {
  let score = 2.2;
  const bullets: string[] = [];

  if (input.amount >= 500) {
    score += 3.2;
    bullets.push("Large treasury transfer detected relative to a normal Testnet operating motion.");
  } else if (input.amount >= 150) {
    score += 1.8;
    bullets.push("Transfer size is meaningful enough to justify an explicit treasury review note.");
  }

  const recipient = normalizeAddress(input.recipient);
  if (recipient.length < 32) {
    score += 2.5;
    bullets.push("Recipient formatting looks incomplete or too short for a trusted treasury destination.");
  }

  if (input.historicalUseCount === 0) {
    score += 1.9;
    bullets.push("Recipient has no prior usage history in this governance context yet.");
  } else if (input.historicalUseCount <= 2) {
    score += 1.0;
    bullets.push("Recipient is lightly used, so the route should keep an explicit rationale visible before voting.");
  }

  if (input.timelockHours !== null && input.timelockHours < 12) {
    score += 1.4;
    bullets.push("Timelock is compact, so timing context should stay explicit before execution.");
  } else if (input.timelockHours === null) {
    score += 0.8;
    bullets.push("Exact timelock hours are still missing from the structured proposal context.");
  }

  const summaryText = `${input.title} ${input.summary}`.toLowerCase();
  if (summaryText.includes("emergency") || summaryText.includes("urgent")) {
    score += 1.1;
    bullets.push("Emergency language raises the burden for evidence and beneficiary validation.");
  }

  if (summaryText.includes("vendor") || summaryText.includes("contributor")) {
    score -= 0.4;
    bullets.push("Operational payout framing is clearer than a generic transfer proposal.");
  }

  const clamped = Math.max(1, Math.min(10, Number(score.toFixed(1))));
  return {
    headline: "Proposal execution review",
    summary:
      clamped >= 7
        ? "This proposal should keep explanation, trust context, and destination rationale visible before signatures are collected."
        : clamped >= 4
          ? "This proposal is serviceable, and the route should keep treasury context and reviewer notes visible before voting."
          : "This proposal reads like a routine governed action with a clear execution path.",
    bullets:
      bullets.length > 0
        ? bullets
        : ["No abnormal treasury pattern was detected from the current proposal inputs."],
    scoreLabel: clamped >= 7 ? "Execution notes attached" : clamped >= 4 ? "Route notes attached" : "Ready path",
    scoreValue: clamped,
  } satisfies IntelligenceAnalysis;
}

export function analyzeTreasuryRisk(input: {
  amount: number;
  normalAmount: number;
  repeatedAttempts: number;
  newRecipient: boolean;
  executionDelayHours: number | null;
}) {
  const ratio =
    input.normalAmount > 0 ? Number((input.amount / input.normalAmount).toFixed(2)) : input.amount;
  let score = 1.8;
  const bullets: string[] = [];

  if (ratio >= 4) {
    score += 3.1;
    bullets.push(`Amount exceeds the normal treasury motion by ${ratio}x.`);
  } else if (ratio >= 2) {
    score += 1.8;
    bullets.push(`Amount is materially above the normal treasury motion at ${ratio}x.`);
  }

  if (input.repeatedAttempts >= 3) {
    score += 2.4;
    bullets.push("Repeated request attempts mean the route should keep operator trail and request history visible.");
  } else if (input.repeatedAttempts > 0) {
    score += 1.0;
    bullets.push("This request has already been attempted before, so the route should stay connected to logs and prior context.");
  }

  if (input.newRecipient) {
    score += 1.6;
    bullets.push("Recipient has limited treasury history, so destination context should stay visible before execution.");
  }

  if (input.executionDelayHours !== null && input.executionDelayHours < 24) {
    score += 1.1;
    bullets.push("Execution delay is compact, so timing and signer context should stay explicit through execution.");
  } else if (input.executionDelayHours === null) {
    score += 0.8;
    bullets.push("Execution delay is not yet explicit in the treasury packet, so timing context should stay visible.");
  }

  const clamped = Math.max(1, Math.min(10, Number(score.toFixed(1))));
  return {
    headline: "Treasury execution review",
    summary:
      clamped >= 7
        ? "This payout should keep diagnostics, proof, and signer context visible before it reaches execution."
        : clamped >= 4
          ? "Treasury conditions are serviceable, and the route should keep operational notes and reviewer links visible."
          : "Treasury conditions read as a standard governed payout flow.",
    bullets:
      bullets.length > 0
        ? bullets
        : ["No treasury anomaly exceeded the current monitoring thresholds."],
    scoreLabel: clamped >= 7 ? "Execution notes attached" : clamped >= 4 ? "Route notes attached" : "Visible payout path",
    scoreValue: clamped,
  } satisfies IntelligenceAnalysis;
}

export function summarizeVotingDiscussion(input: { discussion: string }) {
  const text = input.discussion.trim();
  const normalized = text.toLowerCase();
  const supportHits = ["support", "approve", "pass", "ship", "yes"].reduce(
    (sum, term) => sum + normalized.split(term).length - 1,
    0,
  );
  const concernHits = ["risk", "concern", "delay", "unknown", "block", "issue"].reduce(
    (sum, term) => sum + normalized.split(term).length - 1,
    0,
  );
  const executionHits = ["timelock", "execute", "treasury", "recipient", "proof"].reduce(
    (sum, term) => sum + normalized.split(term).length - 1,
    0,
  );

  const score = Math.max(1, Math.min(10, 5 + supportHits - concernHits * 0.6));
  const sentiment =
    supportHits > concernHits ? "Discussion leans supportive." : concernHits > supportHits ? "Discussion leans cautious." : "Discussion is balanced.";

  return {
    headline: "Voting summary",
    summary: `${sentiment} ${executionHits > 0 ? "Execution and treasury details are already part of the conversation." : "Execution details should be made more explicit before final voting."}`,
    bullets: [
      `Support signals detected: ${supportHits}`,
      `Concern signals detected: ${concernHits}`,
      `Execution-safety references detected: ${executionHits}`,
    ],
    scoreLabel: supportHits >= concernHits ? "Readable for voters" : "Needs cleaner framing",
    scoreValue: Number(score.toFixed(1)),
  } satisfies IntelligenceAnalysis;
}

export function analyzeRpcHealth(input: {
  latencyMs: number;
  successRatePct: number;
  errorRatePct: number;
  retryPressurePct: number;
}) {
  let score = 9.6;
  const bullets: string[] = [];

  if (input.latencyMs > 450) {
    score -= 2.6;
    bullets.push("Latency is high enough to weaken buyer confidence for time-sensitive product actions.");
  } else if (input.latencyMs > 220) {
    score -= 1.2;
    bullets.push("Latency is acceptable, but not yet strong enough for an infrastructure-grade claim.");
  }

  if (input.successRatePct < 97) {
    score -= 2.4;
    bullets.push("Success rate is below a strong operator-facing threshold.");
  } else if (input.successRatePct < 99) {
    score -= 1.0;
    bullets.push("Success rate is good, but still leaves room for reliability tightening.");
  }

  if (input.errorRatePct > 2.5) {
    score -= 1.9;
    bullets.push("Error rate is elevated and should be reflected in diagnostics and incident watch.");
  }

  if (input.retryPressurePct > 12) {
    score -= 1.4;
    bullets.push("Retry pressure suggests unstable request handling or endpoint saturation.");
  }

  const clamped = Math.max(1, Math.min(10, Number(score.toFixed(1))));
  return {
    headline: "RPC operating posture",
    summary:
      clamped >= 8.5
        ? "This reads like a credible RPC surface for a buyer-facing infrastructure story."
        : clamped >= 6.5
          ? "This is usable, but the commercial story should stay disciplined until the metrics improve."
          : "This RPC posture needs more runtime work before it should be sold as infrastructure.",
    bullets:
      bullets.length > 0
        ? bullets
        : ["Latency, reliability, and retry pressure all read clean for the current operating target."],
    scoreLabel: clamped >= 8.5 ? "Commercially credible" : clamped >= 6.5 ? "Usable with caution" : "Needs hardening",
    scoreValue: clamped,
  } satisfies IntelligenceAnalysis;
}

export function analyzeGamingGovernance(input: {
  proposal: string;
  rewardChangePct: number;
  payoutCount: number;
  clanCount: number;
}) {
  let score = 7.8;
  const bullets: string[] = [];

  if (Math.abs(input.rewardChangePct) > 20) {
    score -= 1.8;
    bullets.push("Reward change is large enough to risk economy shock for players and guilds.");
  } else if (Math.abs(input.rewardChangePct) > 10) {
    score -= 0.8;
    bullets.push("Reward change is moderate and should be paired with a clear player-impact note.");
  }

  if (input.payoutCount > 100) {
    score -= 1.1;
    bullets.push("Large payout fan-out suggests stronger diagnostics and treasury rehearsal are needed.");
  }

  if (input.clanCount >= 5) {
    score += 0.6;
    bullets.push("Clan distribution supports a stronger governance narrative for game communities.");
  }

  const normalized = input.proposal.toLowerCase();
  if (normalized.includes("weapon") || normalized.includes("event") || normalized.includes("tournament")) {
    score += 0.5;
    bullets.push("Proposal maps cleanly to a game governance event users can understand.");
  }

  const clamped = Math.max(1, Math.min(10, Number(score.toFixed(1))));
  return {
    headline: "Gaming governance posture",
    summary:
      clamped >= 8
        ? "This game governance motion is product-legible and commercially attractive for a studio demo."
        : clamped >= 6
          ? "This gaming motion is viable, but economy communication should improve before rollout."
          : "This gaming motion risks confusing players or destabilizing rewards without more guardrails.",
    bullets:
      bullets.length > 0
        ? bullets
        : ["No major economy shock or governance readability issue was detected from the current game motion."],
    scoreLabel: clamped >= 8 ? "Strong demo candidate" : clamped >= 6 ? "Needs economy framing" : "High economy risk",
    scoreValue: clamped,
  } satisfies IntelligenceAnalysis;
}
