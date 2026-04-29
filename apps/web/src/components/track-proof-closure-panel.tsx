import Link from "next/link";
import { ArrowUpRight, ShieldCheck, TimerReset, WalletCards } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getCanonicalCustodyProofSnapshot } from "@/lib/canonical-custody-proof";
import type { CompetitionTrackWorkspace } from "@/lib/site-data";
import { getTrackSpecificProofContext, TRACK_PROOF_PRIORITY_SLUGS } from "@/lib/track-proof-closure";
import { cn } from "@/lib/utils";

type TrackProofClosurePanelProps = {
  workspace: CompetitionTrackWorkspace;
};

export function TrackProofClosurePanel({
  workspace,
}: TrackProofClosurePanelProps) {
  if (!TRACK_PROOF_PRIORITY_SLUGS.has(workspace.slug)) {
    return null;
  }

  const custody = getCanonicalCustodyProofSnapshot();
  const proofContext = getTrackSpecificProofContext(workspace);
  const topDeliverables = workspace.deliverables.slice(0, 3);
  const ceremonyGateItems = custody.pendingItems.slice(0, 4);

  return (
    <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(10,16,32,0.94),rgba(7,11,23,0.98))]">
      <CardHeader>
        <CardTitle>Track proof closure</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 xl:grid-cols-2">
        <div className="grid gap-4">
          <div className="rounded-3xl border border-white/8 bg-white/4 p-5">
            <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-300/78">
              What works now
            </div>
            <div className="mt-4 grid gap-2 text-sm leading-7 text-white/62">
              {topDeliverables.map((item) => (
                <div key={item}>{item}</div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/8 bg-white/4 p-5">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-cyan-200/78">
              <ShieldCheck className="h-3.5 w-3.5" />
              What is externally proven
            </div>
            <div className="mt-4 grid gap-3">
              {proofContext.externallyProven.map((item) => (
                <div key={item.href} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-white">{item.label}</div>
                    <Link href={item.href} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                      Open
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  <div className="mt-2 text-sm leading-7 text-white/58">{item.summary}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-3xl border border-amber-300/14 bg-amber-300/[0.06] p-5">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-amber-200/78">
              <WalletCards className="h-3.5 w-3.5" />
              Ceremony gates
            </div>
            <div className="mt-3 text-sm leading-7 text-white/62">{proofContext.pendingSummary}</div>
            <div className="mt-4 grid gap-2 text-sm leading-7 text-white/58">
              {ceremonyGateItems.map((item) => (
                <div key={item}>{item}</div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-fuchsia-300/14 bg-fuchsia-300/[0.06] p-5">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-fuchsia-200/78">
              <TimerReset className="h-3.5 w-3.5" />
              Exact mainnet blocker
            </div>
            <div className="mt-3 text-lg font-medium text-white">{proofContext.exactBlocker}</div>
            <div className="mt-2 text-sm leading-7 text-white/62">{proofContext.exactBlockerSummary}</div>
            <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 p-4 text-sm leading-7 text-white/58">
              Canonical custody status: {custody.status}. Completion: {custody.completedItems}/{custody.totalItems}. Real-funds mainnet claim allowed: {custody.productionMainnetClaimAllowed ? "yes" : "no"}.
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/custody" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
                Open custody proof
              </Link>
              <Link href="/documents/multisig-setup-intake" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                Open intake shape
              </Link>
              <Link href="/documents/mainnet-blockers" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                Open blockers
              </Link>
              <Link href="/documents/launch-trust-packet" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                Open trust packet
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
