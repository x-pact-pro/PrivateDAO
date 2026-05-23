import { readRepoJson } from "@/lib/repo-docs";

type LaunchOpsChecklistJson = {
  decision: string;
  productionMainnetClaimAllowed: boolean;
  items: Array<{
    id: string;
    category: string;
    status: string;
  }>;
};

type MainnetBlockersJson = {
  decision: string;
  productionMainnetClaimAllowed: boolean;
  blockers: Array<{
    id: string;
    category: string;
    severity: "critical" | "high" | "medium" | "low";
    status: string;
  }>;
};

export type MainnetExecutionReadinessSnapshot = {
  decision: string;
  claimAllowed: boolean;
  launchOps: {
    total: number;
    repoDocumented: number;
    repoDefined: number;
    devnetProven: number;
    pendingExternal: number;
    pendingRuntimeCaptures: number;
  };
  blockers: {
    total: number;
    critical: number;
    high: number;
    pendingExternal: number;
    pendingIntegration: number;
    pendingRuntimeCaptures: number;
  };
};

function readJson<T>(relativePath: string): T {
  return readRepoJson<T>(relativePath);
}

export function getMainnetExecutionReadinessSnapshot(): MainnetExecutionReadinessSnapshot {
  const launchOps = readJson<LaunchOpsChecklistJson>("docs/launch-ops-checklist.json");
  const blockers = readJson<MainnetBlockersJson>("docs/mainnet-blockers.json");

  return {
    decision: blockers.decision,
    claimAllowed: blockers.productionMainnetClaimAllowed,
    launchOps: {
      total: launchOps.items.length,
      repoDocumented: launchOps.items.filter((item) => item.status === "repo-documented").length,
      repoDefined: launchOps.items.filter((item) => item.status === "repo-defined").length,
      devnetProven: launchOps.items.filter((item) => item.status === "devnet-proven").length,
      pendingExternal: launchOps.items.filter((item) => item.status === "pending-external").length,
      pendingRuntimeCaptures: launchOps.items.filter((item) => item.status === "pending-runtime-captures").length,
    },
    blockers: {
      total: blockers.blockers.length,
      critical: blockers.blockers.filter((item) => item.severity === "critical").length,
      high: blockers.blockers.filter((item) => item.severity === "high").length,
      pendingExternal: blockers.blockers.filter((item) => item.status === "pending-external").length,
      pendingIntegration: blockers.blockers.filter((item) => item.status === "pending-integration").length,
      pendingRuntimeCaptures: blockers.blockers.filter((item) => item.status === "pending-runtime-captures").length,
    },
  };
}
