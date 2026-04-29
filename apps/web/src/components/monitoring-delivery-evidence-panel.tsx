import Link from "next/link";
import { AlertTriangle, ArrowUpRight, BellRing, RadioTower, ShieldCheck, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getRuntimeOperationsReadinessSnapshot } from "@/lib/runtime-operations-readiness";
import { cn } from "@/lib/utils";

export function MonitoringDeliveryEvidencePanel() {
  const snapshot = getRuntimeOperationsReadinessSnapshot();

  return (
    <Card className="border-cyan-300/16 bg-[linear-gradient(180deg,rgba(10,18,28,0.96),rgba(10,10,18,0.99))]">
      <CardHeader className="space-y-3">
        <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-200/78">Monitoring delivery evidence</div>
        <CardTitle className="text-2xl">Defined monitoring rules and the live delivery route</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-white/8 bg-white/[0.04] p-5">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-cyan-200/78">
              <BellRing className="h-4 w-4" />
              Rule coverage
            </div>
            <div className="mt-3 text-2xl font-medium text-white">{snapshot.monitoring.ruleCount} rules</div>
            <div className="mt-3 text-sm leading-7 text-white/60">
              RPC, governance, proof, treasury, and authority activity are already represented in the alert rule set.
            </div>
          </div>

          <div className="rounded-3xl border border-white/8 bg-white/[0.04] p-5">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-amber-200/78">
              <AlertTriangle className="h-4 w-4" />
              Highest-severity alerts
            </div>
            <div className="mt-3 text-2xl font-medium text-white">
              {snapshot.monitoring.criticalCount} critical / {snapshot.monitoring.highCount} high
            </div>
            <div className="mt-3 text-sm leading-7 text-white/60">
              The monitoring posture already knows which failures are treasury- or custody-critical. The operator route now focuses on live routing and tested acknowledgment.
            </div>
          </div>

          <div className="rounded-3xl border border-white/8 bg-white/[0.04] p-5">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-emerald-200/78">
              <RadioTower className="h-4 w-4" />
              Delivery gap
            </div>
            <div className="mt-3 text-lg font-medium text-white">external delivery lane</div>
            <div className="mt-3 text-sm leading-7 text-white/60">
              The blocker is not rule design. It is primary/fallback RPC selection, alert destination ownership, response windows, and tested transcripts.
            </div>
          </div>

          <div className="rounded-3xl border border-white/8 bg-white/[0.04] p-5">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-fuchsia-200/78">
              <Users className="h-4 w-4" />
              Funder relevance
            </div>
            <div className="mt-3 text-lg font-medium text-white">execution unlock</div>
            <div className="mt-3 text-sm leading-7 text-white/60">
              This is exactly the kind of bounded operations work a serious funder can accelerate without asking whether the product itself already exists.
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-fuchsia-300/14 bg-fuchsia-300/[0.06] p-5 text-sm leading-7 text-white/64">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-fuchsia-200/78">
            <ShieldCheck className="h-4 w-4" />
            Current boundary
          </div>
          <div className="mt-3">{snapshot.monitoring.claimBoundary}</div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Link href="/documents/monitoring-delivery-evidence-packet" className={cn(buttonVariants({ variant: "secondary" }), "justify-between")}>
            Monitoring packet
            <ArrowUpRight className="h-4 w-4" />
          </Link>
          <Link href="/documents/monitoring-alert-rules" className={cn(buttonVariants({ variant: "outline" }), "justify-between")}>
            Alert rules
            <BellRing className="h-4 w-4" />
          </Link>
          <Link href="/documents/runtime-operations-readiness-packet" className={cn(buttonVariants({ variant: "outline" }), "justify-between")}>
            Runtime ops
            <ArrowUpRight className="h-4 w-4" />
          </Link>
          <Link href="/documents/mainnet-execution-readiness-packet" className={cn(buttonVariants({ variant: "outline" }), "justify-between")}>
            Mainnet execution
            <ArrowUpRight className="h-4 w-4" />
          </Link>
          <Link href="/documents/mainnet-blockers" className={cn(buttonVariants({ variant: "outline" }), "justify-between")}>
            Blockers
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
