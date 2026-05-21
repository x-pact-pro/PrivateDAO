import type { Metadata } from "next";

import { EncryptIkaDesktopProofWorkbench } from "@/components/encrypt-ika-desktop-proof-workbench";
import { OperationStateLegend } from "@/components/operation-state-legend";
import { OperationsShell } from "@/components/operations-shell";
import { buildRouteMetadata } from "@/lib/route-metadata";

export const metadata: Metadata = buildRouteMetadata({
  title: "Encrypt Ika Desktop Proof",
  description:
    "Desktop-only proof route for browser encryption, REFHE receipts, Ika readiness, and Solana pre-alpha approval intent boundaries.",
  path: "/proof/encrypt-ika-desktop",
  keywords: ["encrypt", "ika", "2pc-mpc", "refhe", "desktop proof"],
});

export default function EncryptIkaDesktopProofPage() {
  return (
    <OperationsShell
      eyebrow="Desktop proof"
      title="Encrypt / Ika / 2PC-MPC / REFHE proof without mobile ambiguity"
      description="A desktop-only verification path that separates live execution, readiness checks, intent receipts, and private settlement lanes with clear proof signals."
      badges={[
        { label: "Desktop only", variant: "cyan" },
        { label: "Ika readiness", variant: "violet" },
        { label: "REFHE receipt", variant: "success" },
      ]}
    >
      <OperationStateLegend description="This page is intentionally strict: readiness, intent, receipt, and full settlement are separate states so judges do not confuse proof continuity with completed private settlement." />
      <EncryptIkaDesktopProofWorkbench />
    </OperationsShell>
  );
}
