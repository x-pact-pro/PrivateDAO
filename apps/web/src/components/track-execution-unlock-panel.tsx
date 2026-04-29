import Link from "next/link";
import { AlertTriangle, ArrowUpRight, BellRing, LockKeyhole, Smartphone } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getMonitoringDeliveryClosureSnapshot, getSettlementReceiptClosureSnapshot } from "@/lib/operational-closure-corridors";
import { getRealDeviceCaptureClosureSnapshot } from "@/lib/real-device-capture-closure";
import type { CompetitionTrackWorkspace } from "@/lib/site-data";
import { cn } from "@/lib/utils";

type TrackExecutionUnlockPanelProps = {
  workspace: CompetitionTrackWorkspace;
};

const telemetrySlugs = new Set(["rpc-infrastructure", "dune-analytics"]);
const payoutSlugs = new Set(["privacy-track", "encrypt-ika", "umbra-confidential-payout"]);
const capitalSlugs = new Set(["startup-accelerator", "poland-grants", "superteam-poland"]);

export function TrackExecutionUnlockPanel({ workspace }: TrackExecutionUnlockPanelProps) {
  const runtime = getRealDeviceCaptureClosureSnapshot();
  const monitoring = getMonitoringDeliveryClosureSnapshot();
  const settlement = getSettlementReceiptClosureSnapshot();

  const rows = telemetrySlugs.has(workspace.slug)
    ? [
        {
          label: "Monitoring delivery",
          value: monitoring.blockerStatus,
          detail: monitoring.blockerNextAction,
          icon: BellRing,
          href: "/security#monitoring-delivery-readiness",
        },
        {
          label: "Real-device closure",
          value: runtime.completionLabel,
          detail: `${runtime.pendingCount} target(s) remain in reviewer-grade capture expansion.`,
          icon: Smartphone,
          href: "/security#real-device-capture-readiness",
        },
      ]
    : payoutSlugs.has(workspace.slug)
      ? [
          {
            label: "Settlement receipts",
            value: settlement.blockerStatus,
            detail: settlement.blockerNextAction,
            icon: LockKeyhole,
            href: "/services#settlement-receipt-readiness",
          },
          {
            label: "Real-device closure",
            value: runtime.completionLabel,
            detail: `${runtime.pendingCount} wallet target(s) remain in signed-capture expansion.`,
            icon: Smartphone,
            href: "/security#real-device-capture-readiness",
          },
        ]
      : capitalSlugs.has(workspace.slug)
        ? [
            {
              label: "Real-device closure",
              value: runtime.completionLabel,
              detail: `${runtime.pendingCount} target(s) remain in the runtime-complete expansion set.`,
              icon: Smartphone,
              href: "/security#real-device-capture-readiness",
            },
            {
              label: "Monitoring delivery",
              value: monitoring.blockerStatus,
              detail: monitoring.blockerNextAction,
              icon: BellRing,
              href: "/security#monitoring-delivery-readiness",
            },
            {
              label: "Settlement receipts",
              value: settlement.blockerStatus,
              detail: settlement.blockerNextAction,
              icon: LockKeyhole,
              href: "/services#settlement-receipt-readiness",
            },
          ]
        : [];

  if (rows.length === 0) return null;

  return (
    <Card className="border-amber-300/16 bg-[linear-gradient(180deg,rgba(22,16,10,0.96),rgba(10,10,18,0.99))]">
      <CardHeader className="space-y-3">
        <div className="text-[11px] uppercase tracking-[0.3em] text-amber-200/78">Execution unlocks</div>
        <CardTitle className="text-2xl">The exact closure gates that make this track reviewer-ready</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-sm leading-7 text-white/66">
          This does not broaden the roadmap. It isolates the few execution gaps that still limit how far this specific submission can be pushed today.
        </div>

        <div className={cn("grid gap-4", rows.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3")}>
          {rows.map((row) => {
            const Icon = row.icon;

            return (
              <div key={row.label} className="rounded-3xl border border-white/8 bg-white/[0.04] p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-amber-100">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-4 text-[11px] uppercase tracking-[0.24em] text-white/54">{row.label}</div>
                <div className="mt-2 text-lg font-medium text-white">{row.value}</div>
                <div className="mt-3 text-sm leading-7 text-white/60">{row.detail}</div>
                <Link href={row.href} className={cn(buttonVariants({ variant: "outline" }), "mt-4 w-full justify-between")}>
                  Open closure route
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            );
          })}
        </div>

        <div className="rounded-3xl border border-fuchsia-300/14 bg-fuchsia-300/[0.06] p-5 text-sm leading-7 text-white/64">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-fuchsia-200/78">
            <AlertTriangle className="h-4 w-4" />
            Why this helps reviewers
          </div>
          <div className="mt-3">
            Reviewers trust a submission more when the last serious blockers are named, bounded, and routed into concrete closure surfaces rather than hidden behind generic readiness language.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
