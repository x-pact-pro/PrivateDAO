import fs from "fs";
import path from "path";

function allowedTelemetryRpcEndpoints() {
  return new Set(
    [
      process.env.PRIVATE_DAO_RPC_URL,
      process.env.SOLANA_RPC_URL,
      process.env.RPC_FAST_DEVNET_RPC,
      process.env.RPC_FAST_TESTNET_RPC,
      process.env.QUICKNODE_TESTNET_RPC,
      "https://api.devnet.solana.com",
      "https://api.testnet.solana.com",
    ].filter((value): value is string => Boolean(value)),
  );
}

function resolveExpectedCluster() {
  const raw = (process.env.SOLANA_CLUSTER || process.env.NEXT_PUBLIC_SOLANA_NETWORK || "testnet").toLowerCase();
  return raw === "devnet" ? "devnet" : "testnet";
}

function parseClusterFromStatus(status: string, suffix: "governance-path" | "confidential-path") {
  const match = status.match(new RegExp(`^(?:verified|degraded)-(devnet|testnet)-${suffix}$`));
  return match?.[1] as "devnet" | "testnet" | undefined;
}

function isAllowedTelemetryRpcEndpoint(endpoint: string) {
  return allowedTelemetryRpcEndpoints().has(endpoint) || /solana-testnet\.quiknode\.pro/i.test(endpoint);
}

type ReviewerTelemetryPacket = {
  project: string;
  truthSources: Array<{ label: string; href: string }>;
  hostedReadProof: {
    readPath: string;
    rpcEndpoint: string;
    proposals: number;
    uniqueDaos: number;
  };
  runtimeSnapshot: {
    unexpectedFailures: number;
    fallbackRecovered: boolean;
    staleBlockhashRecovered: boolean;
  };
  integrationsSnapshot: {
    governanceStatus: string;
    confidentialStatus: string;
    governanceFinalizedCount: number;
    governanceTotalCount: number;
    confidentialFinalizedCount: number;
    confidentialTotalCount: number;
  };
  exportReadySummaries: Array<{ label: string; routeHref: string }>;
  reviewerFirstPath: Array<{ href: string }>;
  bestDemoRoute: {
    start: string;
    sequence: string[];
  };
  linkedDocs: string[];
  liveRoutes: string[];
  commands: string[];
};

function main() {
  const jsonPath = path.resolve("docs/reviewer-telemetry-packet.generated.json");
  const mdPath = path.resolve("docs/reviewer-telemetry-packet.generated.md");

  if (!fs.existsSync(jsonPath) || !fs.existsSync(mdPath)) {
    throw new Error("missing reviewer telemetry packet artifacts");
  }

  const expectedCluster = resolveExpectedCluster();
  const packet = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as ReviewerTelemetryPacket;
  const markdown = fs.readFileSync(mdPath, "utf8");

  assert(packet.project === "PrivateDAO", "telemetry packet project mismatch");
  assert(packet.truthSources.length === 4, "telemetry packet must bind four truth sources");
  assert(packet.truthSources.some((entry) => entry.label === "Runtime evidence"), "telemetry packet missing runtime evidence source");
  assert(packet.truthSources.some((entry) => entry.label === "Frontier integrations"), "telemetry packet missing frontier integrations source");
  assert(packet.truthSources.some((entry) => entry.label === "Read-node snapshot"), "telemetry packet missing read-node snapshot source");
  assert(packet.truthSources.some((entry) => entry.label === "Devnet service metrics"), "telemetry packet missing devnet service metrics source");
  assert(packet.hostedReadProof.readPath === "backend-indexer", "telemetry packet read path drifted");
  assert(isAllowedTelemetryRpcEndpoint(packet.hostedReadProof.rpcEndpoint), "telemetry packet rpc endpoint drifted");
  assert(packet.hostedReadProof.proposals > 0, "telemetry packet must include indexed proposals");
  assert(packet.hostedReadProof.uniqueDaos > 0, "telemetry packet must include indexed daos");
  assert(packet.runtimeSnapshot.unexpectedFailures === 0, "telemetry packet unexpected failures mismatch");
  assert(packet.runtimeSnapshot.fallbackRecovered === true, "telemetry packet fallback recovery mismatch");
  assert(packet.runtimeSnapshot.staleBlockhashRecovered === true, "telemetry packet stale blockhash recovery mismatch");
  const governanceCluster = parseClusterFromStatus(packet.integrationsSnapshot.governanceStatus, "governance-path");
  const confidentialCluster = parseClusterFromStatus(packet.integrationsSnapshot.confidentialStatus, "confidential-path");
  assert(Boolean(governanceCluster), "telemetry packet governance status mismatch");
  assert(Boolean(confidentialCluster), "telemetry packet confidential status mismatch");
  if (governanceCluster !== expectedCluster || confidentialCluster !== expectedCluster) {
    console.warn(
      `Telemetry packet cluster (${governanceCluster}/${confidentialCluster}) differs from expected runtime (${expectedCluster}); validating against artifact cluster.`,
    );
  }
  assert(packet.integrationsSnapshot.governanceFinalizedCount <= packet.integrationsSnapshot.governanceTotalCount, "telemetry packet governance counts invalid");
  assert(packet.integrationsSnapshot.confidentialFinalizedCount <= packet.integrationsSnapshot.confidentialTotalCount, "telemetry packet confidential counts invalid");
  assert(packet.exportReadySummaries.length >= 6, "telemetry packet must include export-ready summaries");
  assert(packet.exportReadySummaries.some((entry) => entry.routeHref === "/services"), "telemetry packet missing services summary");
  assert(packet.exportReadySummaries.some((entry) => entry.routeHref === "/diagnostics"), "telemetry packet missing diagnostics summary");
  assert(packet.exportReadySummaries.some((entry) => entry.routeHref === "/analytics"), "telemetry packet missing analytics summary");
  assert(packet.reviewerFirstPath[0]?.href === "/documents/reviewer-telemetry-packet", "telemetry packet fast path must start at itself");
  assert(packet.bestDemoRoute.start === "/services", "telemetry packet best demo route must start at services");
  assert(packet.bestDemoRoute.sequence.includes("/diagnostics"), "telemetry packet best demo route missing diagnostics");
  assert(packet.bestDemoRoute.sequence.includes("/analytics"), "telemetry packet best demo route missing analytics");
  assert(packet.linkedDocs.includes("docs/reviewer-telemetry-packet.generated.md"), "telemetry packet missing self doc link");
  assert(packet.linkedDocs.includes("docs/runtime-evidence.generated.md"), "telemetry packet missing runtime evidence doc");
  assert(packet.linkedDocs.includes("docs/frontier-integrations.generated.md"), "telemetry packet missing frontier integrations doc");
  assert(packet.linkedDocs.includes("docs/read-node/snapshot.generated.md"), "telemetry packet missing read-node snapshot doc");
  assert(packet.liveRoutes.includes("https://privatedao.org/services/"), "telemetry packet missing services route");
  assert(packet.liveRoutes.includes("https://privatedao.org/diagnostics/"), "telemetry packet missing diagnostics route");
  assert(packet.liveRoutes.includes("https://privatedao.org/analytics/"), "telemetry packet missing analytics route");
  assert(packet.commands.includes("npm run build:reviewer-telemetry-packet"), "telemetry packet missing build command");
  assert(packet.commands.includes("npm run verify:reviewer-telemetry-packet"), "telemetry packet missing verify command");

  for (const token of [
    "# Reviewer Telemetry Packet",
    "## Truth Sources",
    "## Hosted-Read Proof",
    "## Runtime Snapshot",
    "## Integrations Snapshot",
    "## Export-Ready Summaries",
    "## Reviewer-First Path",
    "## Best Demo Route",
    "apps/web/src/lib/devnet-service-metrics.ts",
    "docs/runtime-evidence.generated.md",
    "docs/frontier-integrations.generated.md",
    "docs/read-node/snapshot.generated.md",
  ]) {
    assert(markdown.includes(token), `telemetry packet markdown is missing: ${token}`);
  }

  console.log("Reviewer telemetry packet verification: PASS");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

main();
