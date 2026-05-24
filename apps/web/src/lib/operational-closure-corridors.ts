import { readRepoJson } from "@/lib/repo-docs";

type MonitoringAlertRulesJson = {
  environment: string;
  claimBoundary: string;
  rules: Array<{
    id: string;
    category: string;
    severity: "critical" | "high" | "medium" | "low";
    status: string;
  }>;
};

type MainnetBlockersJson = {
  summary: string;
  blockers: Array<{
    id: string;
    category: string;
    severity: "critical" | "high" | "medium" | "low";
    status: string;
    owner: string;
    nextAction: string;
    evidence: string[];
  }>;
};

type MonitoringDeliveryIntakeJson = {
  status: string;
  owners: Array<{
    role: string;
    scope: string;
    status: string;
  }>;
  deliveryRequirements: Array<{
    id: string;
    label: string;
    status: string;
    evidence: string;
  }>;
  transcriptRequirements: string[];
};

type SettlementReceiptClosureIntakeJson = {
  status: string;
  closureRequirements: Array<{
    id: string;
    label: string;
    status: string;
    evidence: string;
  }>;
  supportingArtifacts: string[];
};

export type MonitoringDeliveryClosureSnapshot = {
  environment: string;
  claimBoundary: string;
  ruleCount: number;
  criticalCount: number;
  highCount: number;
  blockerStatus: string;
  blockerOwner: string;
  blockerNextAction: string;
  deliveryRequirements: Array<{
    label: string;
    status: string;
    evidence: string;
  }>;
  ownerAssignments: Array<{
    role: string;
    scope: string;
    status: string;
  }>;
  transcriptRequirements: string[];
  evidencePaths: string[];
};

export type SettlementReceiptClosureSnapshot = {
  blockerStatus: string;
  blockerOwner: string;
  blockerNextAction: string;
  severity: string;
  currentTruth: string[];
  requiredClosure: Array<{
    label: string;
    status: string;
    evidence: string;
  }>;
  evidencePaths: string[];
};

function readJson<T>(relativePath: string): T {
  return readRepoJson<T>(relativePath);
}

export function getMonitoringDeliveryClosureSnapshot(): MonitoringDeliveryClosureSnapshot {
  const monitoring = readJson<MonitoringAlertRulesJson>("docs/monitoring-alert-rules.json");
  const blockers = readJson<MainnetBlockersJson>("docs/mainnet-blockers.json");
  const intake = readJson<MonitoringDeliveryIntakeJson>("docs/monitoring-delivery-intake.json");
  const blocker = blockers.blockers.find((item) => item.id === "production-monitoring-alerts");

  if (!blocker) {
    throw new Error("Missing production-monitoring-alerts blocker");
  }

  return {
    environment: monitoring.environment,
    claimBoundary: monitoring.claimBoundary,
    ruleCount: monitoring.rules.length,
    criticalCount: monitoring.rules.filter((rule) => rule.severity === "critical").length,
    highCount: monitoring.rules.filter((rule) => rule.severity === "high").length,
    blockerStatus: blocker.status,
    blockerOwner: blocker.owner,
    blockerNextAction: blocker.nextAction,
    deliveryRequirements: intake.deliveryRequirements.map((item) => ({
      label: item.label,
      status: item.status,
      evidence: item.evidence,
    })),
    ownerAssignments: intake.owners,
    transcriptRequirements: intake.transcriptRequirements,
    evidencePaths: blocker.evidence,
  };
}

export function getSettlementReceiptClosureSnapshot(): SettlementReceiptClosureSnapshot {
  const blockers = readJson<MainnetBlockersJson>("docs/mainnet-blockers.json");
  const intake = readJson<SettlementReceiptClosureIntakeJson>("docs/settlement-receipt-closure-intake.json");
  const blocker = blockers.blockers.find((item) => item.id === "magicblock-refhe-source-receipts");

  if (!blocker) {
    throw new Error("Missing magicblock-refhe-source-receipts blocker");
  }

  return {
    blockerStatus: blocker.status,
    blockerOwner: blocker.owner,
    blockerNextAction: blocker.nextAction,
    severity: blocker.severity,
    currentTruth: [
      "Testnet confidential payout execution exists inside the governed treasury corridor.",
      "REFHE and MagicBlock settlement evidence is already part of the product and security surfaces.",
      "Reviewer-safe receipt closure exists for Testnet; real-funds mainnet still requires verifier CPI or externally audited residual-trust acceptance.",
    ],
    requiredClosure: intake.closureRequirements.map((item) => ({
      label: item.label,
      status: item.status,
      evidence: item.evidence,
    })),
    evidencePaths: [...blocker.evidence, ...intake.supportingArtifacts],
  };
}
