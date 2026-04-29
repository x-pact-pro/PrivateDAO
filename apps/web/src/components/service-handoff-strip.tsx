"use client";

import Link from "next/link";
import { ArrowRight, Radar, ReceiptText, WalletCards } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  buildServiceHandoffQuery,
  type ServiceHandoffState,
} from "@/lib/service-handoff-state";
import { getProposalById } from "@/lib/site-data";
import { useServiceHandoffSnapshot } from "@/lib/use-service-handoff-snapshot";
import { cn } from "@/lib/utils";

type ServiceHandoffStripProps = {
  context: "services" | "command-center";
};

const copy = {
  services: {
    title: "Service handoff",
    description:
      "This page now keeps the selected proposal, payout profile, and telemetry mode visible so the commercial route stays connected to the live execution corridor.",
    primaryHref: "#payout-route-selection",
    primaryLabel: "Continue payout route selection",
  },
  "command-center": {
    title: "Execution handoff",
    description:
      "The command shell should inherit the selected proposal, payout intent, and telemetry mode so the operator does not re-stage context after leaving the first-run surface.",
    primaryHref: "#proposal-review-action",
    primaryLabel: "Continue proposal review",
  },
} as const;

const payoutProfileLabels: Record<ServiceHandoffState["payoutProfile"], string> = {
  "pilot-funding": "Pilot funding",
  "agentic-micropayment-rail": "Agentic micropayment rail",
  "audd-merchant-settlement": "AUDD merchant settlement",
  "audd-treasury-settlement": "AUDD treasury settlement",
  "pusd-confidential-payroll": "PUSD confidential payroll",
  "pusd-gaming-reward-pool": "PUSD gaming reward pool",
  "treasury-rebalance": "Treasury rebalance",
  "treasury-top-up": "Treasury top-up",
  "vendor-payout": "Vendor payout",
  "contributor-payout": "Contributor payout",
};

export function ServiceHandoffStrip({ context }: ServiceHandoffStripProps) {
  const baseSnapshot = useServiceHandoffSnapshot(context);
  const snapshot: (ServiceHandoffState & { query: string }) | null = baseSnapshot
    ? {
        ...baseSnapshot,
        proposalTitle:
          getProposalById(baseSnapshot.proposalId)?.title ??
          baseSnapshot.proposalTitle,
        proposalStatus:
          getProposalById(baseSnapshot.proposalId)?.status ??
          baseSnapshot.proposalStatus,
        payoutTitle:
          baseSnapshot.payoutTitle ??
          payoutProfileLabels[baseSnapshot.payoutProfile],
        query: buildServiceHandoffQuery(baseSnapshot),
      }
    : null;

  if (!snapshot) return null;

  const sectionCopy = copy[context];

  return (
    <Card
      id="service-handoff"
      className="border-cyan-300/14 bg-[linear-gradient(180deg,rgba(10,16,31,0.95),rgba(8,12,24,0.99))]"
    >
      <CardHeader className="gap-3">
        <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-200/80">Service handoff</div>
        <CardTitle>{sectionCopy.title}</CardTitle>
        <div className="max-w-4xl text-sm leading-7 text-white/58">{sectionCopy.description}</div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-white/42">
              <ReceiptText className="h-3.5 w-3.5 text-cyan-200/78" />
              Proposal
            </div>
            <div className="mt-3 text-sm font-medium text-white">{snapshot.proposalId}</div>
            <div className="mt-1 text-sm leading-6 text-white/58">{snapshot.proposalTitle}</div>
            <div className="mt-2 text-xs uppercase tracking-[0.2em] text-white/40">{snapshot.proposalStatus}</div>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-white/42">
              <WalletCards className="h-3.5 w-3.5 text-emerald-200/78" />
              Payout profile
            </div>
            <div className="mt-3 text-sm font-medium text-white">{snapshot.payoutTitle}</div>
            <div className="mt-1 text-sm leading-6 text-white/58">{snapshot.payoutProfile}</div>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-white/42">
              <Radar className="h-3.5 w-3.5 text-fuchsia-200/78" />
              Telemetry mode
            </div>
            <div className="mt-3 text-sm font-medium text-white">{snapshot.telemetryMode}</div>
            <div className="mt-1 text-sm leading-6 text-white/58">
              {snapshot.updatedAt === "query-handoff"
                ? `Persisted from ${snapshot.source} via query handoff`
                : `Persisted from ${snapshot.source} · ${snapshot.updatedAt}`}
            </div>
          </div>
        </div>

        <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
          <div className="text-[11px] uppercase tracking-[0.24em] text-white/42">Selected route payload</div>
          <div className="mt-3 break-all font-mono text-xs leading-6 text-white/64">
            proposal={snapshot.proposalId}&amp;profile={snapshot.payoutProfile}&amp;telemetryMode={snapshot.telemetryMode}&amp;handoff=1
          </div>
          {snapshot.payoutIntent ? (
            <div className="mt-3 text-sm leading-7 text-white/56">
              {snapshot.payoutIntent.assetSymbol}
              {snapshot.payoutIntent.amount ? ` · ${snapshot.payoutIntent.amount}` : " · sender amount ready"}
              {" · "}
              {snapshot.payoutIntent.reference}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href={`${context === "services" ? "/services" : "/command-center"}?${snapshot.query}${sectionCopy.primaryHref}`} className={cn(buttonVariants({ variant: "secondary" }), "justify-between")}>
            {sectionCopy.primaryLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href={`/analytics?${snapshot.query}#telemetry-inspection`} className={cn(buttonVariants({ variant: "outline" }), "justify-between")}>
            Continue telemetry inspection
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href={`/diagnostics?${snapshot.query}`} className={cn(buttonVariants({ variant: "outline" }), "justify-between")}>
            Continue diagnostics
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
