import {
  getDevnetServiceMetrics,
  getOperationalValidationSnapshot,
} from "@/lib/devnet-service-metrics";
import { readRepoJson } from "@/lib/repo-docs";

type ReviewerTelemetryPacket = {
  generatedAt: string;
  hostedReadProof: {
    proposals: number;
    uniqueDaos: number;
  };
  integrationsSnapshot: {
    governanceFinalizedCount: number;
    governanceTotalCount: number;
    confidentialFinalizedCount: number;
    confidentialTotalCount: number;
  };
};

export type ReviewerTelemetryTruthSnapshot = {
  freshnessLabel: string;
  indexedProposalCount: string;
  governanceFinalized: string;
  confidentialFinalized: string;
  packetHref: string;
  packetLabel: string;
};

function readJson<T>(relativePath: string): T {
  return readRepoJson<T>(relativePath);
}

export function getReviewerTelemetryTruthSnapshot(): ReviewerTelemetryTruthSnapshot {
  const packet = readJson<ReviewerTelemetryPacket>(
    "docs/reviewer-telemetry-packet.generated.json",
  );
  const validation = getOperationalValidationSnapshot();
  const serviceMetrics = getDevnetServiceMetrics();
  const hostedReadMetric = serviceMetrics.services.find(
    (metric) => metric.label === "Hosted read coverage",
  );

  return {
    freshnessLabel: validation.proofFreshness.value,
    indexedProposalCount:
      hostedReadMetric?.value ??
      `${packet.hostedReadProof.proposals} proposals / ${packet.hostedReadProof.uniqueDaos} DAOs`,
    governanceFinalized: `${packet.integrationsSnapshot.governanceFinalizedCount}/${packet.integrationsSnapshot.governanceTotalCount}`,
    confidentialFinalized: `${packet.integrationsSnapshot.confidentialFinalizedCount}/${packet.integrationsSnapshot.confidentialTotalCount}`,
    packetHref: "/documents/reviewer-telemetry-packet",
    packetLabel: "Open reviewer telemetry packet",
  };
}
