import type { Metadata } from "next";

import { IkaDwalletCustodyWorkbench } from "@/components/ika-dwallet-custody-workbench";
import { LocalizedRouteBrief } from "@/components/localized-route-brief";
import { OperationStateLegend } from "@/components/operation-state-legend";
import { OperationsShell } from "@/components/operations-shell";
import { RefhePayrollProofWorkbench } from "@/components/refhe-payroll-proof-workbench";
import { buildRouteMetadata } from "@/lib/route-metadata";

export const metadata: Metadata = buildRouteMetadata({
  title: "REFHE Payroll Proof",
  description:
    "Encrypted payroll computation proof route for confidential payroll, Ika custody readiness, and proof-linked private settlement.",
  path: "/services/refhe-payroll-proof",
  keywords: ["refhe", "encrypt", "confidential payroll", "ika", "encrypted computation"],
});

export default function RefhePayrollProofPage() {
  return (
    <OperationsShell
      eyebrow="Encrypted payroll"
      title="REFHE-style payroll proof with Ika custody readiness"
      description="A practical route for confidential payroll: encrypt payroll data in the browser, generate computation commitments, send only ciphertext and hashes to the backend, then prepare Ika dWallet custody boundaries for governed settlement."
      badges={[
        { label: "REFHE proof", variant: "cyan" },
        { label: "Ika custody", variant: "violet" },
        { label: "Confidential payroll", variant: "success" },
      ]}
    >
      <LocalizedRouteBrief routeKey="servicesCore" />
      <OperationStateLegend description="This route separates encrypted computation proof, live Ika SDK readiness, intent receipt, and final private settlement so reviewers can see exactly what is live and what requires funded custody execution." />
      <RefhePayrollProofWorkbench />
      <IkaDwalletCustodyWorkbench />
    </OperationsShell>
  );
}
