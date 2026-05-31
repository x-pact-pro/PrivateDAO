import type { Metadata } from "next";
import Link from "next/link";

import { ConfidentialPaymentsSystemSurface } from "@/components/confidential-payments-system-surface";
import { CloakSdkIntegrationStatus } from "@/components/cloak-sdk-integration-status";
import { IkaUserShareOpsGuardrail } from "@/components/ika-user-share-ops-guardrail";
import { LocalizedRouteSummary } from "@/components/localized-route-summary";
import { MagicBlockPrivatePaymentsStatus } from "@/components/magicblock-private-payments-status";
import { OperationsShell } from "@/components/operations-shell";
import { OperationStateLegend } from "@/components/operation-state-legend";
import { PrivateDaoStackSurface } from "@/components/private-dao-stack-surface";
import { SectionExplainerVideo } from "@/components/post-governance-brander-video";
import { UmbraSdkIntegrationStatus } from "@/components/umbra-sdk-integration-status";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "Confidential Payments",
  description:
    "PrivateDAO confidential payments lane: encrypted payroll coordination, private settlement, Umbra/Cloak payout rails, and intelligence-assisted execution.",
  path: "/services/confidential-payments",
  keywords: ["confidential payments", "private payroll", "cloak", "umbra", "magicblock", "encrypt ika", "refhe"],
});

export default function ConfidentialPaymentsPage() {
  return (
    <OperationsShell
      eyebrow="Confidential payments"
      title="Encrypted payment coordination for Solana-native organizations"
      description="This route packages the full confidential payment stack as an operational product surface: encrypted planning, private payout rails, intelligence-assisted risk review, and proof-linked execution continuity."
      badges={[
        { label: "Payroll-grade privacy", variant: "success" },
        { label: "Umbra + Cloak + MagicBlock", variant: "cyan" },
        { label: "Encrypt / IKA + REFHE", variant: "violet" },
      ]}
    >
      <LocalizedRouteSummary routeKey="services" />
      <PrivateDaoStackSurface compact />
      <SectionExplainerVideo variant="payments" compact />
      <OperationStateLegend description="This section combines multiple rails. Some cards execute live flows, others expose health or receipt continuity. The boundaries stay explicit so visitors know what has already moved on-chain and what is still a review or readiness step." />
      <ConfidentialPaymentsSystemSurface />
      <IkaUserShareOpsGuardrail />
      <MagicBlockPrivatePaymentsStatus />
      <CloakSdkIntegrationStatus />
      <UmbraSdkIntegrationStatus />

      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
        <div className="text-[11px] uppercase tracking-[0.24em] text-white/44">Operational flow</div>
        <ol className="mt-3 grid gap-3 text-sm leading-7 text-white/66 md:grid-cols-2">
          <li className="rounded-2xl border border-white/8 bg-black/20 p-4">1. Prepare confidential policy and payroll intent through local-first intelligence.</li>
          <li className="rounded-2xl border border-white/8 bg-black/20 p-4">2. Encrypt sensitive payloads client-side with Encrypt / IKA envelope before execution lanes.</li>
          <li className="rounded-2xl border border-white/8 bg-black/20 p-4">3. Route settlement through Cloak/Umbra/MagicBlock rails based on confidentiality and speed requirements.</li>
          <li className="rounded-2xl border border-white/8 bg-black/20 p-4">4. Publish commitment-safe receipts to proof and judge surfaces for verifiable operational continuity.</li>
        </ol>
      </div>
      <div className="rounded-[28px] border border-white/10 bg-black/20 p-5 text-sm leading-7 text-white/66">
        Chain verification stays simple here: first inspect the rail status, then generate the encrypted intent or receipt,
        then open Proof for the explorer link, transaction anchor, or relayer reference that belongs to that exact flow.
      </div>

      <div className="rounded-[28px] border border-cyan-300/16 bg-cyan-300/[0.07] p-5">
        <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/76">IKA protocol economics context</div>
        <p className="mt-3 max-w-5xl text-sm leading-7 text-white/66">
          For payment-lane planning, IKA economics matters at runtime: operation pricing, validator incentives, and governance
          adjustments can affect dWallet lifecycle costs (generation, presign, signing, resharing). This route keeps those
          economics visible to treasury operators before finalizing confidential execution policies.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="https://ika.xyz/blog/the-token-economics-of-ika"
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
          >
            Open IKA tokenomics
          </a>
          <a
            href="https://ika.xyz/docs"
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
          >
            Open IKA docs
          </a>
          <a
            href="https://github.com/dwallet-labs/ika"
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
          >
            Open IKA GitHub
          </a>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/services/encrypt-ika-operations" className={cn(buttonVariants({ size: "sm" }))}>
          Open Encrypt / IKA operations
        </Link>
        <Link href="/payroll" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
          Open private payroll
        </Link>
        <Link href="/proof" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          Open proof
        </Link>
      </div>
    </OperationsShell>
  );
}
