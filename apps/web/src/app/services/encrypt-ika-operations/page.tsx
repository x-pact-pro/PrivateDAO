import type { Metadata } from "next";
import Link from "next/link";

import { CryptographicExecutionSpine } from "@/components/cryptographic-execution-spine";
import { EncryptedOperationsWorkbench } from "@/components/encrypted-operations-workbench";
import { ConfidentialPaymentsSystemSurface } from "@/components/confidential-payments-system-surface";
import { IkaDwalletCustodyWorkbench } from "@/components/ika-dwallet-custody-workbench";
import { IkaUserShareOpsGuardrail } from "@/components/ika-user-share-ops-guardrail";
import { LocalizedRouteBrief } from "@/components/localized-route-brief";
import { LocalizedRouteSummary } from "@/components/localized-route-summary";
import { OperationStateLegend } from "@/components/operation-state-legend";
import { OperationsShell } from "@/components/operations-shell";
import { ProjectOperatingMap } from "@/components/project-operating-map";
import { PrivatePayrollEncryptionWorkbench } from "@/components/private-payroll-encryption-workbench";
import { RefhePayrollProofWorkbench } from "@/components/refhe-payroll-proof-workbench";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "Encrypt / IKA Operations",
  description:
    "Encrypted operations route for client-side payload encryption, confidential planning, and proof-linked execution continuity.",
  path: "/services/encrypt-ika-operations",
  keywords: ["encrypt", "ika", "encrypted operations", "private payroll", "refhe"],
});

export default function EncryptIkaOperationsPage() {
  return (
    <OperationsShell
      eyebrow="Encrypted operations"
      title="Turn confidential operations into a real user workflow instead of abstract cryptography claims"
      description="This lane packages Encrypt/IKA fit in an operational way: plan encrypted operations, produce client-side encrypted payloads, keep commitment hashes, protect payroll and operational instructions, and carry continuity into proof."
      badges={[
        { label: "Encrypt / IKA", variant: "cyan" },
        { label: "Client-side encryption", variant: "success" },
        { label: "Proof-linked", variant: "violet" },
      ]}
    >
      <LocalizedRouteSummary routeKey="services" />
      <LocalizedRouteBrief routeKey="servicesCore" />
      <OperationStateLegend
        description="This route is the encryption preparation lane. It makes clear what is encrypted locally, what becomes a receipt, and which downstream rail is responsible for final private settlement."
      />
      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 text-sm leading-7 text-white/68">
        The product value here is simple: operations become encrypted before execution, and only commitment-safe
        artifacts move into shared review lanes. This keeps privacy load-bearing while preserving audit continuity.
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/services/confidential-payments" className={cn(buttonVariants({ size: "sm" }))}>
            Open confidential payments
          </Link>
          <Link href="/services/refhe-payroll-proof" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open REFHE payroll proof
          </Link>
          <Link href="/services/magicblock-private-payments" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open MagicBlock lane
          </Link>
          <Link href="/services/cloak-private-settlement" className={cn(buttonVariants({ size: "sm" }))}>
            Open private settlement
          </Link>
          <Link href="/proof/encrypted-capital-markets" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open encrypted capital markets proof
          </Link>
          <Link href="/proof" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open proof
          </Link>
          <Link href="/judge" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Open judge
          </Link>
        </div>
      </div>
      <ProjectOperatingMap
        compact
        title="How encrypted operations feed the rest of the product"
        description="Encrypt / IKA is the privacy preparation layer. It protects payroll instructions, sensitive treasury operations, and confidential governance payloads before Cloak, Umbra, or MagicBlock take over as execution rails. Intelligence still feeds this lane by narrowing what should be signed and what must remain encrypted."
      />
      <CryptographicExecutionSpine compact context="encrypt-ika" />
      <RefhePayrollProofWorkbench />
      <IkaDwalletCustodyWorkbench />
      <PrivatePayrollEncryptionWorkbench />
      <EncryptedOperationsWorkbench />
      <IkaUserShareOpsGuardrail />
      <ConfidentialPaymentsSystemSurface compact />
    </OperationsShell>
  );
}
