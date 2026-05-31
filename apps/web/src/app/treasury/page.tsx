import type { Metadata } from "next";
import Link from "next/link";

import { AnalystGradeDataCorridor } from "@/components/analyst-grade-data-corridor";
import { OperationsShell } from "@/components/operations-shell";
import { PrivateDaoStackSurface } from "@/components/private-dao-stack-surface";
import { ReadNodeActivationStrip } from "@/components/read-node-activation-strip";
import { ReadNodeHostReadinessStrip } from "@/components/read-node-host-readiness-strip";
import { SectionExplainerVideo } from "@/components/post-governance-brander-video";
import { TreasuryRiskInline } from "@/components/treasury-risk-inline";
import { TreasuryTable } from "@/components/treasury-table";
import { proposalCards } from "@/lib/site-data";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "Treasury",
  description:
    "Treasury intelligence route with risk, allocation, runtime posture, and proof-linked execution context.",
  path: "/treasury",
  keywords: ["treasury", "risk", "allocation", "goldrush", "dune", "solana"],
});

export default function TreasuryPage() {
  const featuredProposal = proposalCards[0] ?? null;

  return (
    <OperationsShell
      eyebrow="Treasury"
      title="Inspect treasury health before any signature"
      description="This route centralizes treasury posture: asset allocation, risk interpretation, read-node health, and AI-assisted proposal context for safer execution."
      badges={[
        { label: "Treasury intelligence", variant: "cyan" },
        { label: "Risk-first", variant: "warning" },
        { label: "Proof-linked", variant: "success" },
      ]}
    >
      <PrivateDaoStackSurface compact />
      <SectionExplainerVideo variant="treasury" compact />
      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 text-sm leading-7 text-white/68">
        Start from treasury context, then continue to execution only after reviewing risk and route quality.
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/intelligence" className={cn(buttonVariants({ size: "sm" }))}>
            Open intelligence
          </Link>
          <Link href="/services/jupiter-treasury-route" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open treasury route
          </Link>
          <Link href="/proof" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Open proof
          </Link>
        </div>
      </div>

      <TreasuryTable />
      {featuredProposal ? <TreasuryRiskInline proposal={featuredProposal} /> : null}
      <ReadNodeActivationStrip context="services" />
      <ReadNodeHostReadinessStrip context="services" />
      <AnalystGradeDataCorridor />
    </OperationsShell>
  );
}
