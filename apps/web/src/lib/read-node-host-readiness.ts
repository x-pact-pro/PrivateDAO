import { readRepoJson } from "@/lib/repo-docs";

export type ReadNodeHostReadinessContext = "services" | "command-center" | "proof" | "documents";

type ReadNodeBackendCutoverPacket = {
  generatedAt: string;
  activationState: string;
  exactBoundary: string;
  deploymentTarget: {
    frontendHost: string;
    readApiPath: string;
    healthPath: string;
    metricsPath: string;
    sameDomainRecommended: boolean;
  };
  publicProof: {
    indexedProposalCount: number;
    uniqueDaos: number;
    confidentialPayouts: number;
    refheSettled: number;
    magicblockSettled: number;
    telemetryGeneratedAt: string;
  };
  routeBindingStrategy: string[];
  uiFallbackPolicy: string[];
};

type ReadNodeOpsSnapshot = {
  operatorChecks: string[];
};

export type ReadNodeHostReadinessSnapshot = {
  title: string;
  description: string;
  readinessState: string;
  exactBoundary: string;
  deploymentTarget: string;
  publicHealthPath: string;
  publicMetricsPath: string;
  indexedCoverage: string;
  settlementCoverage: string;
  telemetryFreshness: string;
  bindingPrimary: string;
  fallbackPrimary: string;
  operatorChecks: string;
  packetHref: string;
  packetLabel: string;
  deployHref: string;
  deployLabel: string;
  snapshotHref: string;
  snapshotLabel: string;
  telemetryHref: string;
  telemetryLabel: string;
};

function readJson<T>(relativePath: string): T {
  return readRepoJson<T>(relativePath);
}

function getContextCopy(context: ReadNodeHostReadinessContext) {
  if (context === "services") {
    return {
      title: "Hosted-read host readiness",
      description:
        "Show buyers the real deployment lane: target host, public proof endpoints, route binding, and the static fallback policy stay visible from the commercial surface.",
    };
  }

  if (context === "command-center") {
    return {
      title: "Backend host readiness",
      description:
        "Operators need the cutover truth in-product: where the read service should live, what must be public, and how the UI behaves until the host is truly online.",
    };
  }

  if (context === "documents") {
    return {
      title: "Reviewer host readiness",
      description:
        "From `/documents`, a reviewer should see the exact hosted-read target and proof policy without reconstructing it from packets, routes, and ops notes separately.",
    };
  }

  return {
    title: "Judge backend readiness",
    description:
      "Judges should see the same backend truth as operators: the host target, public health and metrics proofs, and the fallback policy stay explicit until `/api/v1` is truly live.",
  };
}

export function getReadNodeHostReadinessSnapshot(
  context: ReadNodeHostReadinessContext,
): ReadNodeHostReadinessSnapshot {
  const packet = readJson<ReadNodeBackendCutoverPacket>("docs/read-node/backend-cutover-packet.generated.json");
  const ops = readJson<ReadNodeOpsSnapshot>("docs/read-node/ops.generated.json");
  const copy = getContextCopy(context);

  return {
    title: copy.title,
    description: copy.description,
    readinessState: "Host-ready lane defined; same-domain public serving is in final security hardening before release cutover",
    exactBoundary: packet.exactBoundary,
    deploymentTarget: `${packet.deploymentTarget.frontendHost} → ${packet.deploymentTarget.readApiPath}`,
    publicHealthPath: packet.deploymentTarget.healthPath,
    publicMetricsPath: packet.deploymentTarget.metricsPath,
    indexedCoverage: `${packet.publicProof.indexedProposalCount} proposals / ${packet.publicProof.uniqueDaos} DAOs`,
    settlementCoverage: `${packet.publicProof.confidentialPayouts} confidential payouts · ${packet.publicProof.refheSettled} REFHE settled · ${packet.publicProof.magicblockSettled} MagicBlock settled`,
    telemetryFreshness: packet.publicProof.telemetryGeneratedAt,
    bindingPrimary: packet.routeBindingStrategy[1] || packet.routeBindingStrategy[0] || "Route binding policy in preparation",
    fallbackPrimary: packet.uiFallbackPolicy[0] || "Fallback policy in preparation",
    operatorChecks: `${ops.operatorChecks.length} public checks`,
    packetHref: "/documents/read-node-backend-cutover",
    packetLabel: "Open cutover packet",
    deployHref: "/documents/read-node-same-domain-deploy",
    deployLabel: "Open deploy guide",
    snapshotHref: "/documents/read-node-snapshot",
    snapshotLabel: "Open runtime snapshot",
    telemetryHref: "/documents/reviewer-telemetry-packet",
    telemetryLabel: "Open telemetry packet",
  };
}
