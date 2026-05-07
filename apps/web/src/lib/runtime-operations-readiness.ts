import fs from "node:fs";
import path from "node:path";

type RealDeviceRuntimeJson = {
  generatedAt: string;
  summary: {
    targetCount: number;
    completedTargetCount: number;
    successfulConnectCount: number;
    successfulSubmissionCount: number;
    diagnosticsCaptureCount: number;
    pendingTargets: string[];
  };
  targets: Array<{
    id: string;
    walletLabel: string;
    environmentType: string;
    status: string;
  }>;
  status: string;
};

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

type ReadinessCard = {
  label: string;
  value: string;
  detail: string;
};

export type RuntimeOperationsReadinessSnapshot = {
  generatedAt: string;
  walletMatrix: {
    status: string;
    targetCount: number;
    completedTargetCount: number;
    pendingTargetCount: number;
    environmentSummary: string;
    cards: ReadinessCard[];
  };
  monitoring: {
    environment: string;
    ruleCount: number;
    criticalCount: number;
    highCount: number;
    claimBoundary: string;
    cards: ReadinessCard[];
  };
};

function readJson<T>(relativePath: string): T {
  const filePath = path.resolve(process.cwd(), "..", "..", relativePath);
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function percent(numerator: number, denominator: number) {
  if (!denominator) return "0%";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

export function getRuntimeOperationsReadinessSnapshot(): RuntimeOperationsReadinessSnapshot {
  const runtime = readJson<RealDeviceRuntimeJson>("docs/runtime/real-device.generated.json");
  const monitoring = readJson<MonitoringAlertRulesJson>("docs/monitoring-alert-rules.json");

  const criticalCount = monitoring.rules.filter((rule) => rule.severity === "critical").length;
  const highCount = monitoring.rules.filter((rule) => rule.severity === "high").length;
  const environments = Array.from(
    new Set(runtime.targets.map((target) => target.environmentType)),
  );

  return {
    generatedAt: runtime.generatedAt,
    walletMatrix: {
      status: runtime.status,
      targetCount: runtime.summary.targetCount,
      completedTargetCount: runtime.summary.completedTargetCount,
      pendingTargetCount: runtime.summary.pendingTargets.length,
      environmentSummary: environments.join(", "),
      cards: [
        {
          label: "Wallet coverage",
          value: `${runtime.summary.completedTargetCount}/${runtime.summary.targetCount} complete`,
          detail: "Signed wallet captures are tracked through a dedicated intake program and attached to proof packets as they are verified.",
        },
        {
          label: "Submission proof",
          value: `${runtime.summary.successfulSubmissionCount} captured`,
          detail: "Real-device submission evidence remains the most visible runtime lift before stronger production-release claims.",
        },
        {
          label: "Diagnostics captures",
          value: `${runtime.summary.diagnosticsCaptureCount} recorded`,
          detail: "Diagnostics evidence must stay linked to real wallets, not browser-only expectations.",
        },
      ],
    },
    monitoring: {
      environment: monitoring.environment,
      ruleCount: monitoring.rules.length,
      criticalCount,
      highCount,
      claimBoundary: monitoring.claimBoundary,
      cards: [
        {
          label: "Defined alerts",
          value: `${monitoring.rules.length} rules`,
          detail: "The alert set already covers RPC, governance, proof, treasury, and authority activity.",
        },
        {
          label: "High-pressure rules",
          value: `${criticalCount} critical / ${highCount} high`,
          detail: "The rulebook is already defined. Delivery ownership and tested transcripts are the next operating lift.",
        },
        {
          label: "Environment claim",
          value: monitoring.environment,
          detail: monitoring.claimBoundary,
        },
      ],
    },
  };
}
