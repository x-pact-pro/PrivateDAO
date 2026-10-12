import type { Metadata } from "next";
import { OperationsShell } from "@/components/operations-shell";
import { SelectedKernelWorkflow } from "@/components/selected-kernel-workflow";
import { ProductNetworkWorkspace } from "@/components/product-network-workspace";
import { buildRouteMetadata } from "@/lib/route-metadata";

export const metadata: Metadata = buildRouteMetadata({
  title: "Confidential Payroll",
  description: "Prepare payroll privately, apply clear approval rules, and share proof that payments were processed correctly without exposing employee details.",
  path: "/confidential-payroll",
  keywords: ["payroll", "confidential payroll", "private payroll", "payroll verification"],
});

export default function PayrollPage() {
  return (
    <OperationsShell
      eyebrow="Payroll"
      title="Confidential payroll, built for trust"
      description="Prepare payments privately, apply your approval policy, and share clear proof that payroll was processed correctly without exposing employee details."
      navigationMode="guided"
      badges={[
        { label: "Private by design", variant: "success" },
        { label: "Policy-ready", variant: "cyan" },
        { label: "Shareable proof", variant: "violet" },
      ]}
    >
      <SelectedKernelWorkflow product="payroll">
        <ProductNetworkWorkspace />
      </SelectedKernelWorkflow>
    </OperationsShell>
  );
}
