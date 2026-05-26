import type { Metadata } from "next";
import Link from "next/link";

import { LocalizedRouteSummary } from "@/components/localized-route-summary";
import { OperationStateLegend } from "@/components/operation-state-legend";
import { OperationsShell } from "@/components/operations-shell";
import { ProjectOperatingMap } from "@/components/project-operating-map";
import { ConfidentialPaymentsSystemSurface } from "@/components/confidential-payments-system-surface";
import { PrivateSettlementRailWorkbench } from "@/components/private-settlement-rail-workbench";
import { UmbraClaimLinkWorkbench } from "@/components/umbra-claim-link-workbench";
import { UmbraSdkIntegrationStatus } from "@/components/umbra-sdk-integration-status";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "Umbra Confidential Payout",
  description:
    "Umbra payout lane for private recipient flows, claim-link style distribution, and proof-linked settlement continuity.",
  path: "/services/umbra-confidential-payout",
  keywords: ["umbra", "confidential payout", "payment links", "private settlement", "solana"],
});

export default function UmbraConfidentialPayoutPage() {
  return (
    <OperationsShell
      eyebrow="Umbra track"
      title="Confidential payout lane for claim-style recipient flows"
      description="This route packages Umbra-style recipient privacy flow as Testnet product behavior: claim-link preparation, private settlement intents, private recipient boundaries, and proof continuity for operators, treasury teams, and judges."
      badges={[
        { label: "Umbra lane", variant: "success" },
        { label: "Claim-style payouts", variant: "cyan" },
        { label: "Proof continuity", variant: "violet" },
      ]}
    >
      <LocalizedRouteSummary routeKey="services" />
      <OperationStateLegend
        description="On this Umbra Testnet lane, relayer health and intent receipts are visible before any claim is treated as a completed private payout. The page keeps that boundary explicit for visitors and reviewers."
      />

      <div className="rounded-[28px] border border-emerald-300/16 bg-emerald-300/[0.08] p-6">
        <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-100/78">Execution model</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Prepare claim link, execute Testnet payout intent, verify receipt</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/66">
          The payout lane is structured for recipient privacy and operator clarity. Umbra is not isolated here; it
          serves the larger PrivateDAO system by handling the recipient-private disbursement edge inside confidential
          payroll, treasury payouts, grants, and controlled organizational distributions.
        </p>
        <p className="mt-3 max-w-4xl rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs leading-6 text-emerald-50/72">
          Build note: PrivateDAO development and hardening continue without interruption. This public route stays live
          while each integration is promoted from preparation, to Testnet receipt, to stronger on-chain execution proof.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/execute#vendor-payment" className={cn(buttonVariants({ size: "sm" }))}>
            Open execute lane
          </Link>
          <Link href="/services/magicblock-private-payments" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open MagicBlock lane
          </Link>
          <Link href="/judge" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open judge lane
          </Link>
          <Link href="/proof" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Open proof lane
          </Link>
        </div>
      </div>

      <UmbraClaimLinkWorkbench />
      <UmbraSdkIntegrationStatus />
      <ProjectOperatingMap
        compact
        title="Where Umbra fits inside the full product"
        description="Umbra covers the recipient-private payout edge. Governance and intelligence decide when a payout should happen, treasury selects the funding route, Encrypt / IKA protects sensitive payroll preparation, MagicBlock can handle fast private execution loops, and Umbra preserves recipient privacy at the disbursement step."
      />
      <ConfidentialPaymentsSystemSurface compact />
      <PrivateSettlementRailWorkbench initialRail="umbra" lockRail />
    </OperationsShell>
  );
}
