import { readRepoJson } from "@/lib/repo-docs";

export type ReadNodeActivationContext = "services" | "command-center" | "proof";

type ReadNodeSnapshot = {
  generatedAt: string;
  readPath: string;
  counts: {
    proposals: number;
    uniqueDaos: number;
    confidentialPayouts: number;
  };
  overview: {
    refheConfigured: number;
    refheSettled: number;
    magicblockConfigured: number;
    magicblockSettled: number;
  };
};

type ReadNodeOpsSnapshot = {
  deployment: {
    sameDomainRecommended: boolean;
    guide: string;
    readApiPath: string;
  };
  operatorChecks: string[];
};

export type ReadNodeActivationSnapshot = {
  title: string;
  description: string;
  activationState: string;
  exactGap: string;
  readPath: string;
  indexedProposalCount: string;
  confidentialCoverage: string;
  integrationCoverage: string;
  bestRouteHref: string;
  bestRouteLabel: string;
  telemetryHref: string;
  telemetryLabel: string;
  snapshotHref: string;
  snapshotLabel: string;
  opsHref: string;
  opsLabel: string;
  deployHref: string;
  deployLabel: string;
  cutoverPacketHref: string;
  cutoverPacketLabel: string;
  operatorCheckCount: string;
};

function readJson<T>(relativePath: string): T {
  return readRepoJson<T>(relativePath);
}

function getContextCopy(context: ReadNodeActivationContext) {
  if (context === "services") {
    return {
      title: "Hosted-read activation",
      description:
        "Buyer-facing infrastructure value starts here: indexed governance reads, reviewer telemetry, and the exact backend deployment target stay in one commercial path instead of being split across docs and GitHub blobs.",
      bestRouteHref: "/services",
      bestRouteLabel: "Open buyer infrastructure route",
    };
  }

  if (context === "command-center") {
    return {
      title: "Read-node operator activation",
      description:
        "Operators need one truth surface for backend-indexed reads, runtime checks, and the exact deployment gap before same-domain `/api/v1` becomes a live production-style rail.",
      bestRouteHref: "/command-center",
      bestRouteLabel: "Open operator command path",
    };
  }

  return {
    title: "Read-node judge activation",
    description:
      "Judges should see that read-node is not a claim buried in docs: the indexed read path, telemetry packet, and deployment target are part of the proof story with an explicit backend gap.",
    bestRouteHref: "/proof",
    bestRouteLabel: "Open judge proof route",
  };
}

export function getReadNodeActivationSnapshot(
  context: ReadNodeActivationContext,
): ReadNodeActivationSnapshot {
  const snapshot = readJson<ReadNodeSnapshot>("docs/read-node/snapshot.generated.json");
  const ops = readJson<ReadNodeOpsSnapshot>("docs/read-node/ops.generated.json");
  const copy = getContextCopy(context);

  return {
    title: copy.title,
    description: copy.description,
    activationState: "Indexed reads and same-domain backend serving are live for Testnet reviewer checks",
    exactGap:
      "Public product routes consume indexed read evidence and the hosted `api.privatedao.org` lane now serves health, relayer, QVAC, Covalent GoldRush, Torque, Zerion, and SNS checks.",
    readPath: snapshot.readPath,
    indexedProposalCount: `${snapshot.counts.proposals} proposals / ${snapshot.counts.uniqueDaos} DAOs`,
    confidentialCoverage: `${snapshot.counts.confidentialPayouts} confidential payouts`,
    integrationCoverage: `${snapshot.overview.refheSettled}/${snapshot.overview.refheConfigured} REFHE settled · ${snapshot.overview.magicblockSettled}/${snapshot.overview.magicblockConfigured} MagicBlock settled`,
    bestRouteHref: copy.bestRouteHref,
    bestRouteLabel: copy.bestRouteLabel,
    telemetryHref: "/documents/reviewer-telemetry-packet",
    telemetryLabel: "Open telemetry packet",
    snapshotHref: "/documents/read-node-snapshot",
    snapshotLabel: "Open read-node snapshot",
    opsHref: "/documents/read-node-ops",
    opsLabel: "Open read-node ops",
    deployHref: "/documents/read-node-same-domain-deploy",
    deployLabel: "Open deploy target",
    cutoverPacketHref: "/documents/read-node-backend-cutover",
    cutoverPacketLabel: "Open cutover packet",
    operatorCheckCount: `${ops.operatorChecks.length} operator checks`,
  };
}
