import fs from "node:fs";
import path from "node:path";

type FrontierIntegrationsJson = {
  generatedAt: string;
  reviewerEntry: string;
  simpleGovernance: {
    proposal: string;
    verificationStatus: string;
    txChecks: Array<{
      label: string;
      signature: string;
      status: string;
      slot: number;
      confirmed: boolean;
    }>;
  };
  confidentialOperations: {
    proposal: string;
    verificationStatus: string;
    txChecks: Array<{
      label: string;
      signature: string;
      status: string;
      slot: number;
      confirmed: boolean;
    }>;
  };
};

type RuntimeEvidenceJson = {
  generatedAt: string;
  walletCount: number;
  realDevice: {
    status: string;
    completedTargetCount: number;
    targetCount: number;
  };
  operational: {
    totalTxCount: number;
    totalAttemptCount: number;
    adversarialScenarioCount: number;
    unexpectedAdversarialSuccesses: number;
  };
};

type TestWalletProofV3Json = {
  generatedAt: string;
  mode: string;
  governanceV3: {
    proposal: string;
    transactions: Record<string, string>;
    invariants: {
      status: string;
      isExecuted: boolean;
    };
  };
  settlementV3: {
    proposal: string;
    transactions: Record<string, string>;
    invariants: {
      status: string;
      evidenceConsumed: boolean;
    };
  };
};

type AgenticMicropaymentRailJson = {
  generatedAt: string;
  assetMode: "SOL" | "SPL";
  settlementAssetSymbol: string;
  transferCount: number;
  successfulTransferCount: number;
  targetCount: number;
  totalAmountDisplay: string;
  executionWallet: string;
  reportPath: string;
  transfers: Array<{
    batchIndex: number;
    action: string;
    recipient: string;
    amountDisplay: string;
    signature: string;
    explorerUrl: string;
    status: string;
    slot?: number;
  }>;
};

export type JudgeLogEntry = {
  label: string;
  signature: string;
  status: string;
  slot?: number;
};

export type JudgeRuntimeLogsSnapshot = {
  freshness: string;
  reviewerEntry: string;
  nextStep: {
    label: string;
    href: string;
    detail: string;
  };
  operatingJourney: Array<{
    label: string;
    status: "verified" | "partial" | "pending";
    detail: string;
  }>;
  governance: {
    proposal: string;
    verificationStatus: string;
    entries: JudgeLogEntry[];
  };
  confidential: {
    proposal: string;
    verificationStatus: string;
    entries: JudgeLogEntry[];
  };
  v3Hardening: {
    mode: string;
    governanceProposal: string;
    governanceExecuted: boolean;
    settlementProposal: string;
    settlementEvidenceConsumed: boolean;
    governanceEntries: JudgeLogEntry[];
    settlementEntries: JudgeLogEntry[];
  };
  runtime: {
    walletCoverage: string;
    txSuccessRate: string;
    adversarialSummary: string;
  };
  agenticMicropayments: {
    available: boolean;
    freshness?: string;
    assetMode?: "SOL" | "SPL";
    settlementAssetSymbol?: string;
    transferCount?: number;
    successfulTransferCount?: number;
    targetCount?: number;
    totalAmountDisplay?: string;
    executionWallet?: string;
    reportPath?: string;
    entries: JudgeLogEntry[];
  };
};

function readJson<T>(relativePath: string): T {
  const filePath = path.resolve(
    /* turbopackIgnore: true */ process.cwd(),
    "..",
    "..",
    relativePath,
  );
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function readOptionalJson<T>(relativePath: string): T | null {
  try {
    return readJson<T>(relativePath);
  } catch {
    return null;
  }
}

function formatFreshness(...isoTimestamps: string[]) {
  const latest = isoTimestamps
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => b - a)[0];
  if (!latest) return "freshness unknown";
  const ageHours = Math.max(0, Math.round((Date.now() - latest) / (1000 * 60 * 60)));
  if (ageHours < 1) return "updated this hour";
  if (ageHours < 24) return `${ageHours}h old`;
  return `${Math.round(ageHours / 24)}d old`;
}

function pickEntries(
  entries: Array<{ label: string; signature: string; status: string; slot?: number; confirmed?: boolean }>,
  preferredOrder: string[],
) {
  const byLabel = new Map(entries.map((entry) => [entry.label, entry]));
  return preferredOrder
    .map((label) => byLabel.get(label))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .map((entry) => ({
      label: entry.label,
      signature: entry.signature,
      status: entry.confirmed === false ? `unconfirmed · ${entry.status}` : entry.status,
      slot: entry.slot,
    }));
}

export function getJudgeRuntimeLogsSnapshot(): JudgeRuntimeLogsSnapshot {
  const frontier = readJson<FrontierIntegrationsJson>("docs/frontier-integrations.generated.json");
  const runtime = readJson<RuntimeEvidenceJson>("docs/runtime-evidence.generated.json");
  const v3 = readJson<TestWalletProofV3Json>("docs/test-wallet-live-proof-v3.generated.json");
  const micropayments = readOptionalJson<AgenticMicropaymentRailJson>("docs/agentic-treasury-micropayment-rail.generated.json");
  const governanceEntries = pickEntries(frontier.simpleGovernance.txChecks, [
    "create-dao",
    "deposit",
    "create-proposal",
    "commit",
    "reveal",
    "finalize",
    "execute",
  ]);
  const confidentialEntries = pickEntries(frontier.confidentialOperations.txChecks, [
    "magicblock-deposit",
    "magicblock-private-transfer",
    "magicblock-withdraw",
    "magicblock-settle",
    "magicblock-execute",
  ]);
  const hasGovernanceCreate = governanceEntries.some((entry) => entry.label === "create-dao");
  const hasProposalCreate = governanceEntries.some((entry) => entry.label === "create-proposal");
  const hasCommit = governanceEntries.some((entry) => entry.label === "commit");
  const hasReveal = governanceEntries.some((entry) => entry.label === "reveal");
  const hasFinalize = governanceEntries.some((entry) => entry.label === "finalize");
  const hasExecute = governanceEntries.some((entry) => entry.label === "execute");
  const realDeviceComplete = runtime.realDevice.completedTargetCount >= runtime.realDevice.targetCount;
  const txOutcomeComplete = runtime.operational.totalTxCount >= runtime.operational.totalAttemptCount;
  const nextStep = !hasGovernanceCreate
    ? {
        label: "Open govern and create a DAO",
        href: "/govern",
        detail: "The next useful move is to bootstrap a fresh wallet-driven DAO lane before expecting proposal or vote evidence.",
      }
    : !hasProposalCreate
      ? {
          label: "Open govern and submit a proposal",
          href: "/govern#proposal-review-action",
          detail: "DAO bootstrap is visible, but proposal creation should be completed before the rest of the lifecycle can be verified cleanly.",
        }
      : !hasCommit
        ? {
            label: "Open govern and commit a vote",
            href: "/govern#commit-vote-action",
            detail: "Proposal review exists, but commit-reveal evidence is not complete without the first vote commit.",
          }
        : !hasReveal
          ? {
              label: "Open govern and reveal the vote",
              href: "/govern#reveal-vote-action",
              detail: "The commit exists. The next missing step is reveal, so the governance path becomes visible end to end.",
            }
          : !hasFinalize
            ? {
                label: "Open govern and finalize the proposal",
                href: "/govern#finalize-proposal-action",
                detail: "Reveal is captured. Finalize is the next gate before execution and final proof continuity.",
              }
            : !hasExecute
              ? {
                  label: "Open govern and execute the proposal",
                  href: "/govern#execute-proposal-action",
                  detail: "Governance reached finalize. Execution is the remaining runtime step before full proof closure.",
                }
              : !realDeviceComplete
                ? {
                    label: "Expand wallet/device evidence",
                    href: "/documents/real-device-runtime",
                    detail: "On-chain lifecycle is captured, and wallet/device evidence is attached through signed capture packets as each path is verified.",
                  }
                : !txOutcomeComplete
                  ? {
                      label: "Open proof and inspect runtime evidence",
                      href: "/proof",
                      detail: "Execution exists, but runtime evidence still needs tighter outcome coverage before the lane is fully closed.",
                    }
                  : {
                      label: "Open proof and judge",
                      href: "/proof",
                      detail: "The current operating journey is verified. The next move is reviewer-facing verification, not another product action.",
                    };

  return {
    freshness: formatFreshness(
      frontier.generatedAt,
      runtime.generatedAt,
      v3.generatedAt,
      micropayments?.generatedAt ?? "",
    ),
    reviewerEntry: frontier.reviewerEntry,
    nextStep,
    operatingJourney: [
      {
        label: "Connect",
        status: realDeviceComplete ? "verified" : "partial",
        detail: realDeviceComplete
          ? "Supported wallet paths are represented in runtime capture evidence"
          : "Wallet evidence intake is active across desktop and mobile paths",
      },
      {
        label: "Review",
        status: hasGovernanceCreate && hasProposalCreate ? "verified" : "partial",
        detail: hasGovernanceCreate && hasProposalCreate
          ? "DAO bootstrap and proposal creation are captured in the governance evidence lane"
          : "DAO/proposal review lane is not fully evidenced yet",
      },
      {
        label: "Sign",
        status: hasCommit && hasReveal && hasFinalize && hasExecute ? "verified" : "partial",
        detail: hasCommit && hasReveal && hasFinalize && hasExecute
          ? "Commit, reveal, finalize, and execute signatures are all captured in the wallet-driven lifecycle"
          : "Some signing stages still need broader capture coverage",
      },
      {
        label: "Verify",
        status: txOutcomeComplete && confidentialEntries.length > 0 ? "verified" : "partial",
        detail: txOutcomeComplete && confidentialEntries.length > 0
          ? "Governance and confidential execution both resolve into public proof and runtime evidence"
          : "Verification continuity exists, but some evidence lanes are still being expanded",
      },
    ],
    governance: {
      proposal: frontier.simpleGovernance.proposal,
      verificationStatus: frontier.simpleGovernance.verificationStatus,
      entries: governanceEntries,
    },
    confidential: {
      proposal: frontier.confidentialOperations.proposal,
      verificationStatus: frontier.confidentialOperations.verificationStatus,
      entries: confidentialEntries,
    },
    v3Hardening: {
      mode: v3.mode,
      governanceProposal: v3.governanceV3.proposal,
      governanceExecuted: v3.governanceV3.invariants.isExecuted,
      settlementProposal: v3.settlementV3.proposal,
      settlementEvidenceConsumed: v3.settlementV3.invariants.evidenceConsumed,
      governanceEntries: Object.entries(v3.governanceV3.transactions).map(([label, signature]) => ({
        label,
        signature,
        status: "captured-devnet-proof",
      })),
      settlementEntries: Object.entries(v3.settlementV3.transactions).map(([label, signature]) => ({
        label,
        signature,
        status: "captured-devnet-proof",
      })),
    },
    runtime: {
      walletCoverage: "Wallet/device capture intake active",
      txSuccessRate: `${runtime.operational.totalTxCount}/${runtime.operational.totalAttemptCount} tx outcomes captured`,
      adversarialSummary: `${runtime.operational.adversarialScenarioCount} adversarial scenarios · ${runtime.operational.unexpectedAdversarialSuccesses} unexpected successes`,
    },
    agenticMicropayments: micropayments
      ? {
          available: true,
          freshness: "archived Devnet packet",
          assetMode: micropayments.assetMode,
          settlementAssetSymbol: micropayments.settlementAssetSymbol,
          transferCount: micropayments.transferCount,
          successfulTransferCount: micropayments.successfulTransferCount,
          targetCount: micropayments.targetCount,
          totalAmountDisplay: micropayments.totalAmountDisplay,
          executionWallet: micropayments.executionWallet,
          reportPath: micropayments.reportPath,
          entries: micropayments.transfers
            .filter((entry) => entry.action !== "recipient-activation")
            .slice(0, 8)
            .map((entry) => ({
            label: `${entry.action} #${entry.batchIndex + 1}`,
            signature: entry.signature,
            status: `${entry.amountDisplay} · ${entry.status}`,
            slot: entry.slot,
            })),
        }
      : {
          available: false,
          entries: [],
        },
  };
}
