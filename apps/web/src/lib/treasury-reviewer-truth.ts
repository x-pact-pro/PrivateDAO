import fs from "node:fs";
import path from "node:path";

type TreasuryReviewerPacket = {
  generatedAt: string;
  treasuryNetwork: string;
  referenceLinkedRails: Array<{
    symbol: string;
  }>;
  productionMainnetClaimAllowed: boolean;
  exactBlocker: {
    id: string;
    status: string;
    nextAction: string;
  };
  commercialPaymentsAlignment: Array<{
    slug: string;
    fit: "strong" | "moderate" | "selective";
    bestRoutes: string[];
  }>;
  exactPendingItems: string[];
  currentTruth: {
    summary: string;
  };
};

export type TreasuryReviewerTruthContext = "services" | "command-center" | "dashboard";

export type TreasuryReviewerTruthSnapshot = {
  title: string;
  description: string;
  paymentsReadiness: string;
  treasuryNetwork: string;
  publicRails: string;
  exactBlocker: string;
  exactBlockerSummary: string;
  paymentsFit: string;
  pendingCount: string;
  reviewerPacketHref: string;
  reviewerPacketLabel: string;
  proofHref: string;
  proofLabel: string;
  bestDemoRouteHref: string;
  bestDemoRouteLabel: string;
};

function readJson<T>(relativePath: string): T {
  const filePath = path.resolve(process.cwd(), "..", "..", relativePath);
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function getPaymentsFit(packet: TreasuryReviewerPacket) {
  return (
    packet.commercialPaymentsAlignment.find((item) => item.slug === "payments")?.fit ?? "strong"
  );
}

function getContextCopy(context: TreasuryReviewerTruthContext) {
  if (context === "services") {
    return {
      title: "Payments truth strip",
      description:
        "Give buyers the treasury truth at first glance: public Testnet rails, reviewer packet, commercial fit, and the exact blocker stay visible before deeper service sections.",
      bestDemoRouteHref: "/services#treasury-reviewer-grade",
      bestDemoRouteLabel: "Open services treasury rail",
    };
  }

  if (context === "command-center") {
    return {
      title: "Payments truth strip",
      description:
        "Keep operators and reviewers on the same treasury truth before proposal execution: public rails, sender discipline, custody proof, and the blocker remain visible inside the command shell.",
      bestDemoRouteHref: "/command-center",
      bestDemoRouteLabel: "Open command-center treasury flow",
    };
  }

  return {
    title: "Payments truth strip",
    description:
      "Surface treasury readiness to reviewers and operators directly from the dashboard so payments proof does not depend on a separate documents-first reading path.",
    bestDemoRouteHref: "/dashboard",
    bestDemoRouteLabel: "Open dashboard treasury path",
  };
}

export function getTreasuryReviewerTruthSnapshot(
  context: TreasuryReviewerTruthContext,
): TreasuryReviewerTruthSnapshot {
  const packet = readJson<TreasuryReviewerPacket>(
    "docs/treasury-reviewer-packet.generated.json",
  );
  const copy = getContextCopy(context);
  const paymentsFit = getPaymentsFit(packet);

  return {
    title: copy.title,
    description: copy.description,
    paymentsReadiness: packet.productionMainnetClaimAllowed
      ? "Production-safe treasury proof closed"
      : "Testnet rails live, production treasury still evidence-gated",
    treasuryNetwork: packet.treasuryNetwork,
    publicRails: `${packet.referenceLinkedRails.length} public rails`,
    exactBlocker: `${packet.exactBlocker.id} · ${packet.exactBlocker.status}`,
    exactBlockerSummary: packet.exactBlocker.nextAction,
    paymentsFit,
    pendingCount: `${packet.exactPendingItems.length} ceremony evidence gates`,
    reviewerPacketHref: "/documents/treasury-reviewer-packet",
    reviewerPacketLabel: "Open treasury packet",
    proofHref: "/documents/canonical-custody-proof",
    proofLabel: "Open custody proof",
    bestDemoRouteHref: copy.bestDemoRouteHref,
    bestDemoRouteLabel: copy.bestDemoRouteLabel,
  };
}
