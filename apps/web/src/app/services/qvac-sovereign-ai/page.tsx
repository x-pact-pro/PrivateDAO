import type { Metadata } from "next";

import { GuidedOperationRail } from "@/components/guided-operation-rail";
import { OperationsShell } from "@/components/operations-shell";
import { QvacSovereignAiSurface } from "@/components/qvac-sovereign-ai-surface";
import { buildRouteMetadata } from "@/lib/route-metadata";

export const metadata: Metadata = buildRouteMetadata({
  title: "QVAC Sovereign AI",
  description:
    "On-device AI layer for private governance and treasury operations: local-first decision support, multilingual operations, and privacy-preserving pre-sign briefing.",
  path: "/services/qvac-sovereign-ai",
  keywords: ["qvac", "tether qvac", "local ai", "on-device inference", "private dao"],
});

export default function QvacSovereignAiPage() {
  return (
    <OperationsShell
      eyebrow="Services"
      title="QVAC for sensitive decisions before signing"
      description="QVAC is the private decision gate: it prepares proposal, payroll, treasury, and compliance context locally before a signer exposes anything to execution."
      navigationMode="guided"
      badges={[
        { label: "QVAC", variant: "cyan" },
        { label: "On-device", variant: "success" },
        { label: "Privacy-first", variant: "violet" },
      ]}
    >
      <GuidedOperationRail current="review" reviewHref="/intelligence" verifyHref="/proof" />
      <QvacSovereignAiSurface />
    </OperationsShell>
  );
}
