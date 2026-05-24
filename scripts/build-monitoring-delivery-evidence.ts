import fs from "fs";
import path from "path";

type MonitoringDeliveryIntake = {
  project: string;
  environment: string;
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
  providerAssignments?: {
    candidatePrimaryRpc?: string;
    activePrimaryRpc?: string;
    fallbackRpc: string;
    readPath: string;
    status: string;
  };
  transcriptRequirements: string[];
};

type MonitoringAlertRulesJson = {
  claimBoundary: string;
  rules: Array<{
    id: string;
    severity: "critical" | "high" | "medium" | "low";
  }>;
};

function main() {
  const intake = readJson<MonitoringDeliveryIntake>("docs/monitoring-delivery-intake.json");
  const rules = readJson<MonitoringAlertRulesJson>("docs/monitoring-alert-rules.json");

  const ownerAssignedCount = intake.owners.filter((item) => item.status !== "pending-assignment").length;
  const closedRequirementCount = intake.deliveryRequirements.filter((item) => item.status === "closed").length;
  const partialRequirementCount = intake.deliveryRequirements.filter((item) => item.status === "partial").length;
  const payload = {
    project: intake.project,
    generatedAt: new Date().toISOString(),
    environment: intake.environment,
    status: intake.status,
    summary: {
      ownerCount: intake.owners.length,
      ownerAssignedCount,
      deliveryRequirementCount: intake.deliveryRequirements.length,
      closedRequirementCount,
      partialRequirementCount,
      transcriptRequirementCount: intake.transcriptRequirements.length,
      criticalRuleCount: rules.rules.filter((rule) => rule.severity === "critical").length,
      highRuleCount: rules.rules.filter((rule) => rule.severity === "high").length,
    },
    owners: intake.owners,
    deliveryRequirements: intake.deliveryRequirements,
    providerAssignments: intake.providerAssignments,
    transcriptRequirements: intake.transcriptRequirements,
    claimBoundary: rules.claimBoundary,
    supportingArtifacts: [
      "docs/backend-provider-readiness-2026-05-24.md",
      "docs/readiness-aggregate.md",
      "docs/quicknode-stream-intelligence.md",
      "docs/timelock-enforcement-proof-2026-05-23.md",
    ],
    commands: [
      "npm run record:monitoring-delivery -- /path/to/intake.json",
      "npm run build:monitoring-delivery",
      "npm run verify:monitoring-delivery",
    ],
  };

  fs.writeFileSync(path.resolve("docs/monitoring-delivery.generated.json"), JSON.stringify(payload, null, 2) + "\n");
  fs.writeFileSync(path.resolve("docs/monitoring-delivery.generated.md"), buildMarkdown(payload));
  console.log("Wrote monitoring delivery evidence package");
}

function buildMarkdown(payload: {
  project: string;
  generatedAt: string;
  environment: string;
  status: string;
  summary: {
    ownerCount: number;
    ownerAssignedCount: number;
    deliveryRequirementCount: number;
    closedRequirementCount: number;
    partialRequirementCount: number;
    transcriptRequirementCount: number;
    criticalRuleCount: number;
    highRuleCount: number;
  };
  owners: MonitoringDeliveryIntake["owners"];
  deliveryRequirements: MonitoringDeliveryIntake["deliveryRequirements"];
  providerAssignments?: MonitoringDeliveryIntake["providerAssignments"];
  transcriptRequirements: string[];
  claimBoundary: string;
  supportingArtifacts: string[];
  commands: string[];
}) {
  return `# Monitoring Delivery Evidence

## Overview

- project: \`${payload.project}\`
- generated at: \`${payload.generatedAt}\`
- environment: \`${payload.environment}\`
- status: \`${payload.status}\`
- owner assignments: \`${payload.summary.ownerAssignedCount}/${payload.summary.ownerCount}\`
- closed delivery requirements: \`${payload.summary.closedRequirementCount}/${payload.summary.deliveryRequirementCount}\`
- partial delivery requirements: \`${payload.summary.partialRequirementCount}/${payload.summary.deliveryRequirementCount}\`
- transcript requirements: \`${payload.summary.transcriptRequirementCount}\`
- rule severity mix: \`${payload.summary.criticalRuleCount}\` critical / \`${payload.summary.highRuleCount}\` high

## Owners

${payload.owners.map((item) => `- ${item.role} | ${item.status} | ${item.scope}`).join("\n")}

## Delivery Requirements

${payload.deliveryRequirements.map((item) => `- ${item.label} | ${item.status} | evidence: ${item.evidence}`).join("\n")}

## Provider Assignments

${
  payload.providerAssignments
    ? `- candidate primary RPC: \`${payload.providerAssignments.candidatePrimaryRpc || "not documented"}\`
- active primary RPC: \`${payload.providerAssignments.activePrimaryRpc || "not documented"}\`
- fallback RPC: \`${payload.providerAssignments.fallbackRpc}\`
- read path: \`${payload.providerAssignments.readPath}\`
- status: \`${payload.providerAssignments.status}\``
    : "- not yet configured"
}

## Transcript Requirements

${payload.transcriptRequirements.map((item) => `- ${item}`).join("\n")}

## Claim Boundary

${payload.claimBoundary}

## Supporting Artifacts

${payload.supportingArtifacts.map((item) => `- \`${item}\``).join("\n")}

## Commands

${payload.commands.map((item) => `- \`${item}\``).join("\n")}
`;
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.resolve(relativePath), "utf8")) as T;
}

main();
