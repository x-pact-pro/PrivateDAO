// SPDX-License-Identifier: AGPL-3.0-or-later
import fs from "fs";
import path from "path";
import { PrivateDaoReadNode } from "./lib/read-node";

type ProposalReportEntry = {
  label: string;
  recipient?: string;
  proposalPublicKey: string;
  proposalId?: string;
  createProposalTx?: string;
  commitTxs?: string[];
  revealTxs?: string[];
  finalizeTx?: string;
  executeTx?: string;
};

type DevnetMultiProposalReport = {
  proposals?: ProposalReportEntry[];
};

type TxCheck = {
  label: string;
  signature: string;
  endpoint: string;
  status: string;
  slot: number;
  confirmed: boolean;
};

type FrontierIntegrations = {
  confidentialOperations?: {
    status?: string;
    txChecks?: TxCheck[];
  };
};

type PresentationStatus =
  | "Live voting"
  | "Ready to reveal"
  | "Timelocked"
  | "Execution ready"
  | "Evidence gated"
  | "Executed";

type ProposalContext = {
  sourceType: "runtime-indexed";
  sourceLabel: string;
  indexedPhase: string;
  proposalAccount: string;
  daoAccount: string;
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
  presentationStatus: PresentationStatus;
  presentationWindow: string;
  presentationTreasury: string;
  phaseMappingLabel: string;
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

type FeaturedProposalContexts = {
  payroll: ProposalContext;
  gaming: ProposalContext;
  grant: ProposalContext;
};

type ProposalRegistryEntry = {
  id: string;
  title: string;
  type: string;
  status: PresentationStatus;
  quorum: string;
  window: string;
  treasury: string;
  privacy: string;
  tech: string[];
  summary: string;
  execution: FeaturedProposalContexts[keyof FeaturedProposalContexts];
};

const ROOT = path.resolve(__dirname, "..");
const JSON_PATH = path.join(ROOT, "docs/read-node/snapshot.generated.json");
const MD_PATH = path.join(ROOT, "docs/read-node/snapshot.generated.md");
const FRONTEND_TS_PATH = path.join(ROOT, "apps/web/src/lib/read-node-proposal-context.generated.ts");
const NETWORK_LABEL_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bExecuted on devnet\b/g, "Executed on Testnet"],
  [/\bFinalized on devnet\b/g, "Finalized on Testnet"],
  [/\balready executed on devnet\b/g, "already executed on Testnet"],
  [/\bLive Devnet proof\b/g, "Live Testnet proof"],
  [/## Devnet Load Profiles/g, "## Testnet Load Profiles"],
];

const FEATURED_PROPOSAL_KEYS = {
  payroll: "52UpWHJodPWQzpR8u2qqpgwo3jRB7mvjgwCnf8oSJuXX",
  gaming: "QwRmN5WFDL7AxXT8fjcZNhy53cgLk7UWnJ5qB2CmRaJ",
  grant: "A5Hd89vpCTVPALhuwurLQvyAkHyrNGhvZtAcJvBmuJ9U",
} as const;

function resolveActiveCluster() {
  const raw = (process.env.SOLANA_CLUSTER || process.env.NEXT_PUBLIC_SOLANA_NETWORK || "testnet").toLowerCase();
  return raw === "devnet" ? "devnet" : "testnet";
}

function clusterLabel(cluster = resolveActiveCluster()) {
  return cluster === "devnet" ? "Devnet" : "Testnet";
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(ROOT, filePath), "utf8")) as T;
}

function isRecoverableRpcFailure(error: unknown) {
  const message = String((error as Error)?.message || error || "").toLowerCase();
  return (
    message.includes("429") ||
    message.includes("too many requests") ||
    message.includes("rpc request timed out") ||
    message.includes("fetch failed") ||
    message.includes("network")
  );
}

function rewriteExistingSnapshotNetworkLabels() {
  for (const filePath of [JSON_PATH, MD_PATH, FRONTEND_TS_PATH]) {
    if (!fs.existsSync(filePath)) continue;
    let text = fs.readFileSync(filePath, "utf8");
    for (const [pattern, replacement] of NETWORK_LABEL_REPLACEMENTS) {
      text = text.replace(pattern, replacement);
    }
    fs.writeFileSync(filePath, text);
  }
}

function formatLamportsToSol(lamports: number) {
  return Number((lamports / 1_000_000_000).toFixed(4));
}

function formatRawUnits(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatTimelockLabel(seconds: number | null | undefined) {
  if (typeof seconds !== "number" || Number.isNaN(seconds) || seconds <= 0) {
    return "Execution delay is not available from the indexed DAO record";
  }

  if (seconds < 60) {
    return `${seconds} second on-chain execution delay from the indexed DAO record`;
  }

  if (seconds < 3600) {
    const minutes = Number((seconds / 60).toFixed(1));
    return `${minutes} minute on-chain execution delay from the indexed DAO record`;
  }

  const hours = Number((seconds / 3600).toFixed(2));
  return `${hours} hour on-chain execution delay from the indexed DAO record`;
}

function formatSourceLabel(title: string, phase: string) {
  return `Backend-indexed proposal record: ${title} (${phase})`;
}

function proposalRegistryId(
  proposal: Awaited<ReturnType<PrivateDaoReadNode["fetchProposals"]>>[number],
) {
  if (proposal.pubkey === FEATURED_PROPOSAL_KEYS.payroll) return "PDAO-104";
  if (proposal.pubkey === FEATURED_PROPOSAL_KEYS.gaming) return "PDAO-105";
  if (proposal.pubkey === FEATURED_PROPOSAL_KEYS.grant) return "PDAO-106";

  const proposalId = String(proposal.proposalId).padStart(3, "0");
  const daoSuffix = proposal.dao.slice(0, 4).toUpperCase();
  return `PDAO-${proposalId}-${daoSuffix}`;
}

function mapIndexedPhaseToPresentationStatus(
  phase: string,
  options?: {
    hasConfidentialPayout?: boolean;
    payoutFunded?: boolean;
    payoutSettled?: boolean;
  },
): PresentationStatus {
  if (phase === "Executed") {
    return "Executed";
  }

  if (phase === "Executable") {
    return "Execution ready";
  }

  if (phase === "Timelocked") {
    return "Timelocked";
  }

  if (phase === "Reveal") {
    return "Ready to reveal";
  }

  if (phase === "Voting") {
    return "Live voting";
  }

  if (
    phase === "Finalized" &&
    options?.hasConfidentialPayout &&
    (!options.payoutFunded || !options.payoutSettled)
  ) {
    return "Evidence gated";
  }

  if (phase === "Finalized") {
    return "Timelocked";
  }

  return "Evidence gated";
}

function buildWindowSummary(phase: string, status: PresentationStatus, cluster = resolveActiveCluster()) {
  const label = clusterLabel(cluster);
  if (status === "Executed") {
    return `Commit closed · Reveal complete · Executed on ${label}`;
  }

  if (status === "Execution ready") {
    return "Commit closed · Reveal complete · Timelock cleared";
  }

  if (status === "Timelocked") {
    return `Voting closed · Finalized on ${label} · Timelock still active`;
  }

  if (status === "Ready to reveal") {
    return "Commit closed · Reveal window is open";
  }

  if (status === "Live voting") {
    return "Commit window still open on the indexed proposal record";
  }

  if (phase === "Finalized") {
    return `Voting closed · Finalized on ${label} · Settlement evidence still incomplete`;
  }

  return "Execution boundary still depends on explicit evidence completion";
}

function buildTreasurySummary(
  proposal: Awaited<ReturnType<PrivateDaoReadNode["fetchProposals"]>>[number],
  status: PresentationStatus,
) {
  if (proposal.treasuryAction) {
    const amount = formatLamportsToSol(proposal.treasuryAction.amountLamports);
    const asset = proposal.treasuryAction.tokenMint ? "SPL token" : "SOL";
    const recipient = `${proposal.treasuryAction.recipient.slice(0, 4)}…${proposal.treasuryAction.recipient.slice(-4)}`;
    const verb = status === "Executed" ? "sent" : status === "Execution ready" ? "ready to send" : "queued to send";
    return `${amount} ${asset} ${verb} to ${recipient}`;
  }

  if (proposal.confidentialPayoutPlan) {
    const recipient = `${proposal.confidentialPayoutPlan.settlementRecipient.slice(0, 4)}…${proposal.confidentialPayoutPlan.settlementRecipient.slice(-4)}`;
    const mint = proposal.confidentialPayoutPlan.tokenMint
      ? `${proposal.confidentialPayoutPlan.tokenMint.slice(0, 4)}…${proposal.confidentialPayoutPlan.tokenMint.slice(-4)}`
      : "native asset";
    const statusLead =
      status === "Executed"
        ? "Confidential payout executed"
        : status === "Evidence gated"
          ? "Confidential payout still gated"
          : "Confidential payout prepared";
    return `${statusLead} for ${formatRawUnits(proposal.confidentialPayoutPlan.totalAmount)} units to ${recipient} via mint ${mint}`;
  }

  return "Treasury action is still pending explicit indexing in the current proposal record";
}

function buildQuorumSummary(
  proposal: Awaited<ReturnType<PrivateDaoReadNode["fetchProposals"]>>[number],
) {
  if (!proposal.daoDetails) {
    return "Indexed DAO quorum is still unavailable in the current proposal record";
  }

  return `${proposal.daoDetails.quorumPercentage}% quorum · governance token requirement ${proposal.daoDetails.governanceTokenRequired}`;
}

function buildPrivacySummary(
  proposal: Awaited<ReturnType<PrivateDaoReadNode["fetchProposals"]>>[number],
) {
  if (proposal.refheEnvelope) {
    return "Commit-reveal + REFHE envelope";
  }

  if (proposal.magicblockCorridor) {
    return "Commit-reveal + MagicBlock settlement";
  }

  if (proposal.treasuryAction) {
    return "Commit-reveal + indexed treasury action";
  }

  return "Commit-reveal governance path";
}

function buildTechSummary(
  proposal: Awaited<ReturnType<PrivateDaoReadNode["fetchProposals"]>>[number],
) {
  const tech = new Set<string>();
  if (proposal.zkMode && proposal.zkMode !== "Disabled") {
    tech.add("ZK");
  }
  if (proposal.refheEnvelope) {
    tech.add("REFHE");
  }
  if (proposal.magicblockCorridor) {
    tech.add("MagicBlock");
  }
  tech.add("Fast RPC");
  return Array.from(tech);
}

function buildRegistrySummary(
  proposal: Awaited<ReturnType<PrivateDaoReadNode["fetchProposals"]>>[number],
  status: PresentationStatus,
  cluster = resolveActiveCluster(),
) {
  const base = proposal.description.trim() || proposal.title;
  if (status === "Executed") {
    return `${base} This indexed proposal already executed on ${clusterLabel(cluster)} and should be reviewed as proof, not as a pending signature flow.`;
  }
  if (status === "Evidence gated") {
    return `${base} The governance phase is complete, but settlement evidence still gates the commercial trust surface.`;
  }
  if (status === "Execution ready") {
    return `${base} The governance lifecycle is complete enough that the treasury path is ready to execute once the operator reviews the final packet.`;
  }
  return base;
}

function inferProposalType(
  proposal: Awaited<ReturnType<PrivateDaoReadNode["fetchProposals"]>>[number],
) {
  const text = `${proposal.title} ${proposal.description}`.toLowerCase();
  if (
    text.includes("game") ||
    text.includes("gaming") ||
    text.includes("reward") ||
    text.includes("tournament") ||
    text.includes("clan") ||
    proposal.magicblockCorridor
  ) {
    return "Gaming DAO";
  }

  if (text.includes("grant")) {
    return "Grant Committee";
  }

  if (text.includes("payroll") || proposal.confidentialPayoutPlan || proposal.refheEnvelope) {
    return "Enterprise DAO";
  }

  if (proposal.treasuryAction) {
    return "Treasury Committee";
  }

  return "Governance Council";
}

function inferExecutionTarget(
  proposal: Awaited<ReturnType<PrivateDaoReadNode["fetchProposals"]>>[number],
) {
  if (proposal.magicblockCorridor) {
    return "MagicBlock reward corridor with settlement gating before final distribution.";
  }

  if (proposal.confidentialPayoutPlan) {
    return "Aggregate confidential payout to the settlement wallet after governance clearance.";
  }

  if (proposal.treasuryAction) {
    return "Send treasury funds to the approved beneficiary after governance finalization and unlock.";
  }

  return "Execution target remains governed by the indexed proposal account and current DAO phase.";
}

function buildProposalContext(
  proposal: Awaited<ReturnType<PrivateDaoReadNode["fetchProposals"]>>[number],
  reportEntry: ProposalReportEntry | undefined,
  integrations: FrontierIntegrations,
): ProposalContext {
  const activeCluster = resolveActiveCluster();
  const hasConfidentialPayout = Boolean(proposal.confidentialPayoutPlan);
  const confidentialPlan = proposal.confidentialPayoutPlan;
  const treasuryAction = proposal.treasuryAction;
  const magicBlockExecute =
    proposal.pubkey === FEATURED_PROPOSAL_KEYS.payroll
      ? integrations.confidentialOperations?.txChecks?.find((entry) => entry.label === "magicblock-execute")
      : null;
  const status = mapIndexedPhaseToPresentationStatus(proposal.phase, {
    hasConfidentialPayout,
    payoutFunded: confidentialPlan?.status === "Funded",
    payoutSettled: proposal.magicblockCorridor?.status === "Settled",
  });

  const amount =
    treasuryAction
      ? formatLamportsToSol(treasuryAction.amountLamports)
      : confidentialPlan
        ? confidentialPlan.totalAmount
        : null;

  const amountDisplay =
    treasuryAction
      ? `${formatLamportsToSol(treasuryAction.amountLamports)} ${treasuryAction.tokenMint ? "SPL token" : "SOL"}`
      : confidentialPlan
        ? `${formatRawUnits(confidentialPlan.totalAmount)} raw token units`
        : "Pending exact amount from the indexed proposal record";

  const recipient =
    treasuryAction?.recipient ??
    proposal.magicblockCorridor?.settlementWallet ??
    confidentialPlan?.settlementRecipient ??
    null;

  const recipientLabel = treasuryAction
    ? "Treasury beneficiary"
    : proposal.magicblockCorridor
      ? "MagicBlock settlement corridor"
      : confidentialPlan
        ? "Confidential settlement wallet"
        : "Execution target pending index evidence";

  const mintAddress = treasuryAction?.tokenMint ?? confidentialPlan?.tokenMint ?? null;
  const mintSymbol = treasuryAction ? (treasuryAction.tokenMint ? "SPL token" : "SOL") : confidentialPlan ? "SPL token" : null;

  return {
    sourceType: "runtime-indexed",
    sourceLabel: formatSourceLabel(proposal.title, proposal.phase),
    indexedPhase: proposal.phase,
    proposalAccount: proposal.pubkey,
    daoAccount: proposal.dao,
    executionTarget: inferExecutionTarget(proposal),
    recipient,
    recipientLabel,
    recipientKnown: Boolean(recipient),
    amount,
    amountDisplay,
    mintSymbol,
    mintAddress,
    timelockHours:
      typeof proposal.daoDetails?.executionDelaySeconds === "number"
        ? Number((proposal.daoDetails.executionDelaySeconds / 3600).toFixed(6))
        : null,
    timelockLabel: formatTimelockLabel(proposal.daoDetails?.executionDelaySeconds),
    historicalUseCount: 1,
    repeatedAttempts: Math.max(
      0,
      (reportEntry?.commitTxs?.length ?? 0) +
        (reportEntry?.revealTxs?.length ?? 0) +
        (reportEntry?.executeTx ? 1 : 0) -
        (proposal.phase === "Executed" ? 1 : 0),
    ),
    baselineAmount: amount,
    presentationStatus: status,
    presentationWindow: buildWindowSummary(proposal.phase, status, activeCluster),
    presentationTreasury: buildTreasurySummary(proposal, status),
    phaseMappingLabel: `${proposal.phase} indexed phase maps to ${status} in the product surface`,
    txContext: {
      proofStatus: proposal.magicblockCorridor
        ? proposal.magicblockCorridor.status === "Settled"
          ? "runtime-indexed-confidential-path"
          : "runtime-indexed-settlement-pending"
        : reportEntry?.executeTx
          ? `verified-${activeCluster}-governance-path`
          : hasConfidentialPayout
            ? integrations.confidentialOperations?.status ?? "runtime-indexed-confidential-path"
            : "runtime-indexed-governance-path",
      evidenceRoute: hasConfidentialPayout ? "/proof/?judge=1" : "/documents/reviewer-fast-path",
      createProposalSignature: reportEntry?.createProposalTx,
      commitSignature: reportEntry?.commitTxs?.[0],
      revealSignature: reportEntry?.revealTxs?.[0],
      finalizeSignature: reportEntry?.finalizeTx,
      executeSignature: reportEntry?.executeTx ?? magicBlockExecute?.signature,
    },
  };
}

function buildFeaturedProposalContexts(
  proposals: Awaited<ReturnType<PrivateDaoReadNode["fetchProposals"]>>,
  report: DevnetMultiProposalReport,
  integrations: FrontierIntegrations,
): FeaturedProposalContexts {
  const proposalByPubkey = new Map(proposals.map((proposal) => [proposal.pubkey, proposal]));
  const reportByPubkey = new Map((report.proposals ?? []).map((proposal) => [proposal.proposalPublicKey, proposal]));
  const confidentialExecute = integrations.confidentialOperations?.txChecks?.find((entry) => entry.label === "magicblock-execute");

  const confidentialCandidates = proposals.filter((proposal) => proposal.confidentialPayoutPlan);
  const payroll =
    proposalByPubkey.get(FEATURED_PROPOSAL_KEYS.payroll) ??
    confidentialCandidates.find((proposal) => proposal.refheEnvelope?.status === "Settled") ??
    confidentialCandidates[0] ??
    proposals[0];
  const gaming =
    proposalByPubkey.get(FEATURED_PROPOSAL_KEYS.gaming) ??
    confidentialCandidates.find((proposal) => proposal.magicblockCorridor?.status === "Settled") ??
    confidentialCandidates.find((proposal) => proposal.pubkey !== payroll?.pubkey) ??
    payroll;
  const grant =
    proposalByPubkey.get(FEATURED_PROPOSAL_KEYS.grant) ??
    proposals.find((proposal) => proposal.treasuryAction) ??
    proposals.find((proposal) => proposal.pubkey !== payroll?.pubkey && proposal.pubkey !== gaming?.pubkey) ??
    payroll;

  if (!payroll || !gaming || !grant) {
    throw new Error("read-node snapshot has no live proposals to feature");
  }

  return {
    payroll: buildProposalContext(payroll, reportByPubkey.get(payroll.pubkey), integrations),
    gaming: buildProposalContext(gaming, reportByPubkey.get(gaming.pubkey), integrations),
    grant: buildProposalContext(grant, reportByPubkey.get(grant.pubkey), integrations),
  } as const;
}

function buildProposalRegistry(
  proposals: Awaited<ReturnType<PrivateDaoReadNode["fetchProposals"]>>,
  report: DevnetMultiProposalReport,
  integrations: FrontierIntegrations,
): ProposalRegistryEntry[] {
  const reportByPubkey = new Map((report.proposals ?? []).map((proposal) => [proposal.proposalPublicKey, proposal]));

  return proposals.map((proposal) => {
    const execution = buildProposalContext(proposal, reportByPubkey.get(proposal.pubkey), integrations);
    const status = execution.presentationStatus ?? "Evidence gated";

    return {
      id: proposalRegistryId(proposal),
      title: proposal.title,
      type: inferProposalType(proposal),
      status,
      quorum: buildQuorumSummary(proposal),
      window: execution.presentationWindow ?? buildWindowSummary(proposal.phase, status, resolveActiveCluster()),
      treasury: execution.presentationTreasury ?? buildTreasurySummary(proposal, status),
      privacy: buildPrivacySummary(proposal),
      tech: buildTechSummary(proposal),
      summary: buildRegistrySummary(proposal, status, resolveActiveCluster()),
      execution,
    };
  });
}

async function main() {
  const readNode = new PrivateDaoReadNode();
  const [runtime, proposals] = await Promise.all([
    readNode.getRuntimeSnapshot(false),
    readNode.fetchProposals({ force: false }),
  ]);

  if (
    proposals.length === 0 &&
    fs.existsSync(JSON_PATH) &&
    fs.existsSync(MD_PATH) &&
    fs.existsSync(FRONTEND_TS_PATH)
  ) {
    console.log(
      "No indexed proposals returned from the current cluster; preserving committed read-node snapshot artifacts.",
    );
    return;
  }

  const report = readJson<DevnetMultiProposalReport>("docs/devnet-multi-proposal-report.json");
  const integrations = readJson<FrontierIntegrations>("docs/frontier-integrations.generated.json");
  const profiles = readNode.getLoadProfiles();

  const counts = {
    proposals: proposals.length,
    executed: proposals.filter((proposal) => proposal.phase === "Executed").length,
    executable: proposals.filter((proposal) => proposal.phase === "Executable").length,
    timelocked: proposals.filter((proposal) => proposal.phase === "Timelocked").length,
    zkEnforced: proposals.filter((proposal) => proposal.zkMode === "ZkEnforced").length,
    confidentialPayouts: proposals.filter((proposal) => Boolean(proposal.confidentialPayoutPlan)).length,
    uniqueDaos: new Set(proposals.map((proposal) => proposal.dao)).size,
  };
  const overview = {
    generatedAt: new Date().toISOString(),
    proposals: proposals.length,
    uniqueDaos: counts.uniqueDaos,
    zkEnforced: counts.zkEnforced,
    confidentialPayouts: counts.confidentialPayouts,
    magicblockConfigured: proposals.filter((proposal) => Boolean(proposal.magicblockCorridor)).length,
    magicblockSettled: proposals.filter((proposal) => proposal.magicblockCorridor?.status === "Settled").length,
    refheConfigured: proposals.filter((proposal) => Boolean(proposal.refheEnvelope)).length,
    refheSettled: proposals.filter((proposal) => proposal.refheEnvelope?.status === "Settled").length,
    refheWithVerifier: proposals.filter((proposal) => Boolean(proposal.refheEnvelope?.verifierProgram)).length,
    executableConfidential: proposals.filter(
      (proposal) => Boolean(proposal.confidentialPayoutPlan) && proposal.phase === "Executable",
    ).length,
  };
  const featuredProposalContexts = buildFeaturedProposalContexts(proposals, report, integrations);
  const proposalRegistry = buildProposalRegistry(proposals, report, integrations);
  const featuredProposalRegistry = proposalRegistry.filter((proposal) =>
    [
      featuredProposalContexts.payroll.proposalAccount,
      featuredProposalContexts.gaming.proposalAccount,
      featuredProposalContexts.grant.proposalAccount,
    ].includes(proposal.execution.proposalAccount),
  );

  const payload = {
    generatedAt: new Date().toISOString(),
    readPath: "backend-indexer",
    runtime,
    cache: readNode.cacheStats(),
    counts,
    overview,
    profiles,
    proposals: proposalRegistry.map((proposal) => ({
      id: proposal.id,
      title: proposal.title,
      type: proposal.type,
      status: proposal.status,
      indexedPhase: proposal.execution.indexedPhase,
      proposalAccount: proposal.execution.proposalAccount,
      daoAccount: proposal.execution.daoAccount,
      executionTarget: proposal.execution.executionTarget,
      recipient: proposal.execution.recipient,
      amountDisplay: proposal.execution.amountDisplay,
      mintAddress: proposal.execution.mintAddress,
      timelockLabel: proposal.execution.timelockLabel,
      evidenceRoute: proposal.execution.txContext.evidenceRoute,
      executeSignature: proposal.execution.txContext.executeSignature,
    })),
    featuredProposalContexts,
    proposalRegistry,
    featuredProposalRegistry,
  };

  fs.writeFileSync(JSON_PATH, JSON.stringify(payload, null, 2) + "\n");
  fs.writeFileSync(
    MD_PATH,
    `# Read Node Snapshot

- Generated at: \`${payload.generatedAt}\`
- Read path: \`${payload.readPath}\`
- RPC endpoint: \`${runtime.rpcEndpoint}\`
- RPC pool size: \`${runtime.rpcPoolSize}\`
- Cache entries: \`${payload.cache.entryCount}\`
- Cache TTL ms: \`${payload.cache.ttlMs}\`
- Program ID: \`${runtime.programId}\`
- Slot: \`${runtime.slot}\`
- Solana core: \`${runtime.solanaCore}\`
- Feature set: \`${runtime.featureSet}\`

## Proposal Coverage

- Proposals indexed: \`${counts.proposals}\`
- Unique DAOs: \`${counts.uniqueDaos}\`
- Executed proposals: \`${counts.executed}\`
- Executable proposals: \`${counts.executable}\`
- Timelocked proposals: \`${counts.timelocked}\`
- ZK-enforced proposals: \`${counts.zkEnforced}\`
- Confidential payout proposals: \`${counts.confidentialPayouts}\`
- REFHE-configured proposals: \`${overview.refheConfigured}\`
- REFHE-settled proposals: \`${overview.refheSettled}\`
- REFHE proposals with verifier binding: \`${overview.refheWithVerifier}\`
- Executable confidential proposals: \`${overview.executableConfidential}\`

## Testnet Load Profiles

${profiles.map((profile) => `- \`${profile.name}\` | wallets=\`${profile.walletCount}\` | waves=\`${profile.waveCount}\` | wave-size=\`${profile.waveSize}\` | funding-wave=\`${profile.fundingWaveSize}\` | target-pdao-ui=\`${profile.targetPdaoUi}\` | negative=\`${profile.negativeScenarios.join(", ")}\``).join("\n")}

## Sample

${payload.proposals.slice(0, 5).map((proposal) => `- \`${proposal.title}\` | phase=\`${proposal.indexedPhase}\` | recipient=\`${proposal.recipient ?? "pending"}\` | amount=\`${proposal.amountDisplay}\` | dao=\`${proposal.daoAccount}\``).join("\n")}

## Proposal Registry

- Registry entries: \`${proposalRegistry.length}\`
- Executed: \`${proposalRegistry.filter((proposal) => proposal.status === "Executed").length}\`
- Evidence gated: \`${proposalRegistry.filter((proposal) => proposal.status === "Evidence gated").length}\`
- Execution ready: \`${proposalRegistry.filter((proposal) => proposal.status === "Execution ready").length}\`

## Featured Proposal Contexts

- \`payroll\` | phase=\`${featuredProposalContexts.payroll.indexedPhase}\` | proposal=\`${featuredProposalContexts.payroll.proposalAccount}\` | recipient=\`${featuredProposalContexts.payroll.recipientLabel}\` | mint=\`${featuredProposalContexts.payroll.mintAddress ?? featuredProposalContexts.payroll.mintSymbol}\`
- \`gaming\` | phase=\`${featuredProposalContexts.gaming.indexedPhase}\` | proposal=\`${featuredProposalContexts.gaming.proposalAccount}\` | recipient=\`${featuredProposalContexts.gaming.recipientLabel}\` | mint=\`${featuredProposalContexts.gaming.mintAddress ?? featuredProposalContexts.gaming.mintSymbol}\`
- \`grant\` | phase=\`${featuredProposalContexts.grant.indexedPhase}\` | proposal=\`${featuredProposalContexts.grant.proposalAccount}\` | recipient=\`${featuredProposalContexts.grant.recipient}\` | mint=\`${featuredProposalContexts.grant.mintAddress ?? featuredProposalContexts.grant.mintSymbol}\`

## Featured Proposal Registry

${featuredProposalRegistry.map((proposal) => `- \`${proposal.id}\` | \`${proposal.title}\` | status=\`${proposal.status}\` | treasury=\`${proposal.treasury}\``).join("\n")}
`,
  );

  const frontendFile = `// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 X-PACT. AGPL-3.0-or-later.
// Generated by scripts/build-read-node-snapshot.ts. Do not edit manually.

export const READ_NODE_FEATURED_PROPOSAL_CONTEXTS = ${JSON.stringify(featuredProposalContexts, null, 2)} as const;
export const READ_NODE_PROPOSAL_REGISTRY = ${JSON.stringify(proposalRegistry, null, 2)} as const;
export const READ_NODE_FEATURED_PROPOSAL_REGISTRY = ${JSON.stringify(featuredProposalRegistry, null, 2)} as const;

export type ReadNodeFeaturedProposalContextKey = keyof typeof READ_NODE_FEATURED_PROPOSAL_CONTEXTS;
`;

  fs.writeFileSync(FRONTEND_TS_PATH, frontendFile);

  console.log(`Wrote read-node snapshot: ${path.relative(process.cwd(), JSON_PATH)}`);
}

main().catch((error) => {
  if (
    isRecoverableRpcFailure(error) &&
    fs.existsSync(JSON_PATH) &&
    fs.existsSync(MD_PATH) &&
    fs.existsSync(FRONTEND_TS_PATH)
  ) {
    rewriteExistingSnapshotNetworkLabels();
    console.warn(
      "Read-node RPC unavailable; preserved committed snapshot data and refreshed Testnet presentation labels.",
    );
    return;
  }
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
