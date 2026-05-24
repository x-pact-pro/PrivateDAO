import fs from "fs";
import path from "path";

type Evidence = {
  project: string;
  environment: string;
  status: string;
  summary: {
    ownerCount: number;
    ownerAssignedCount: number;
    deliveryRequirementCount: number;
    closedRequirementCount: number;
    partialRequirementCount?: number;
    transcriptRequirementCount: number;
    criticalRuleCount: number;
    highRuleCount: number;
  };
  owners: Array<{ role: string; scope: string; status: string }>;
  deliveryRequirements: Array<{ label: string; status: string; evidence: string }>;
  providerAssignments?: {
    candidatePrimaryRpc?: string;
    activePrimaryRpc?: string;
    fallbackRpc?: string;
    readPath?: string;
    status?: string;
  };
  transcriptRequirements: string[];
  claimBoundary: string;
  supportingArtifacts?: string[];
  commands: string[];
};

function main() {
  const jsonPath = path.resolve("docs/monitoring-delivery.generated.json");
  const mdPath = path.resolve("docs/monitoring-delivery.generated.md");

  if (!fs.existsSync(jsonPath) || !fs.existsSync(mdPath)) {
    throw new Error("missing monitoring delivery evidence artifacts");
  }

  const evidence = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as Evidence;
  const markdown = fs.readFileSync(mdPath, "utf8");

  assert(evidence.project === "PrivateDAO", "monitoring delivery evidence project mismatch");
  assert(
    evidence.environment === "solana-testnet-production-candidate",
    "monitoring delivery evidence environment mismatch",
  );
  assert(
    evidence.status === "testnet-probe-closure-alert-delivery-pending",
    "monitoring delivery evidence status mismatch",
  );
  assert(evidence.summary.ownerCount >= 1, "monitoring delivery evidence missing owners");
  assert(evidence.summary.deliveryRequirementCount >= 1, "monitoring delivery evidence missing delivery requirements");
  assert(
    evidence.summary.closedRequirementCount >= 2,
    "monitoring delivery evidence should close live Testnet probe requirements",
  );
  assert(
    (evidence.summary.partialRequirementCount ?? 0) >= 1,
    "monitoring delivery evidence should separate partial alert-delivery requirements",
  );
  assert(evidence.summary.transcriptRequirementCount >= 1, "monitoring delivery evidence missing transcript requirements");
  assert(
    evidence.providerAssignments?.activePrimaryRpc?.includes("solana-testnet.quiknode.pro"),
    "monitoring delivery evidence must use current QuickNode Testnet active RPC",
  );
  assert(
    evidence.providerAssignments?.fallbackRpc === "https://api.testnet.solana.com",
    "monitoring delivery evidence must use Solana Testnet fallback",
  );
  assert(
    evidence.deliveryRequirements.some((item) => item.status === "partial" && item.evidence.includes("transcript")),
    "monitoring delivery evidence must keep transcript-bound requirements partial",
  );
  assert(
    evidence.supportingArtifacts?.includes("docs/backend-provider-readiness-2026-05-24.md"),
    "monitoring delivery evidence missing backend provider readiness artifact",
  );
  assert(evidence.commands.includes("npm run build:monitoring-delivery"), "monitoring delivery evidence missing build command");
  assert(evidence.commands.includes("npm run verify:monitoring-delivery"), "monitoring delivery evidence missing verify command");
  assert(markdown.includes("# Monitoring Delivery Evidence"), "monitoring delivery markdown missing title");
  assert(markdown.includes("Claim Boundary"), "monitoring delivery markdown missing claim boundary");
  assert(markdown.includes("partial delivery requirements"), "monitoring delivery markdown missing partial count");
  assert(
    evidence.claimBoundary.includes("external alert routing") && evidence.claimBoundary.includes("pending"),
    "monitoring claim boundary must preserve external alert routing boundary",
  );

  console.log("Monitoring delivery evidence verification: PASS");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

main();
