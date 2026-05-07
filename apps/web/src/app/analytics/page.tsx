import { Suspense } from "react";
import type { Metadata } from "next";

import { AnalystGradeDataCorridor } from "@/components/analyst-grade-data-corridor";
import { AnalyticsCharts } from "@/components/analytics-charts";
import { AnalyticsSummary } from "@/components/analytics-summary";
import { DataCorridorQuickLinks } from "@/components/data-corridor-quick-links";
import { HostedReadProofStrip } from "@/components/hosted-read-proof-strip";
import { LaunchBlockersPanel } from "@/components/launch-blockers-panel";
import { LiveSiteActivityPanel } from "@/components/live-site-activity-panel";
import { OperationsShell } from "@/components/operations-shell";
import { ReviewerTelemetryTruthStrip } from "@/components/reviewer-telemetry-truth-strip";
import { TelemetryExportReadinessPanel } from "@/components/telemetry-export-readiness-panel";
import { TelemetryExportScorecard } from "@/components/telemetry-export-scorecard";
import { TelemetryRuntimeFocusStrip } from "@/components/telemetry-runtime-focus-strip";
import { TelemetryModeHandoffStrip } from "@/components/telemetry-mode-handoff-strip";
import { SectionHeader } from "@/components/section-header";
import { buildRouteMetadata } from "@/lib/route-metadata";

export const metadata: Metadata = buildRouteMetadata({
  title: "Analytics",
  description:
    "Responsive analytics for votes, proposals, treasury actions, hashes, telemetry, and runtime visibility across the PrivateDAO product surface.",
  path: "/analytics",
  keywords: ["analytics", "recharts", "runtime telemetry", "treasury actions", "proposal evidence"],
  index: false,
});

export default function AnalyticsPage() {
  return (
    <OperationsShell
      eyebrow="Analytics"
      title="Operational analytics that explain what happened on-chain in language a normal user can follow"
      description="This route turns proposal counts, treasury motions, telemetry, and runtime freshness into a readable product surface. It exists so a visitor can understand what happened after a wallet action without reading raw logs first."
      badges={[
        { label: "Responsive analytics", variant: "cyan" },
        { label: "Recharts", variant: "violet" },
        { label: "Votes · proposals · treasury actions", variant: "success" },
      ]}
    >
      <div className="rounded-[28px] border border-cyan-300/16 bg-cyan-300/[0.08] p-6 text-sm leading-7 text-white/68">
        Start with <a className="text-cyan-100 underline underline-offset-4" href="/learn">/learn</a> if you are new. Use this route after a real Testnet action to understand the product through counts, freshness, and treasury movement before going deeper into proof or diagnostics.
      </div>
      <LiveSiteActivityPanel variant="analytics" />
      <div>
        <Suspense fallback={null}>
          <TelemetryModeHandoffStrip context="analytics" />
        </Suspense>
      </div>
      <div>
        <ReviewerTelemetryTruthStrip
          id="telemetry-inspection"
          title="Telemetry truth for analytics reviewers"
          description="Keep freshness, hosted-read scale, finalized governance counts, and the reviewer packet visible above the analytics surface itself."
        />
      </div>
      <div>
        <SectionHeader
          eyebrow="Runtime and telemetry"
          title="Analytics is the easiest way to understand the live blockchain story after a wallet action"
          description="Use this corridor when a visitor, judge, or operator wants to understand signatures, telemetry, hosted-read value, treasury behavior, and runtime proof in one place without starting from raw blockchain internals."
        />
      </div>
      <div>
        <Suspense fallback={<div className="rounded-3xl border border-white/8 bg-white/4 p-6 text-sm text-white/60">Loading telemetry runtime focus…</div>}>
          <TelemetryRuntimeFocusStrip context="analytics" />
        </Suspense>
      </div>
      <div>
        <DataCorridorQuickLinks />
      </div>
      <div>
        <AnalystGradeDataCorridor />
      </div>
      <div>
        <TelemetryExportReadinessPanel />
      </div>
      <div>
        <TelemetryExportScorecard />
      </div>
      <div>
        <Suspense fallback={<div className="rounded-3xl border border-white/8 bg-white/4 p-6 text-sm text-white/60">Loading analytics summary…</div>}>
          <AnalyticsSummary />
        </Suspense>
      </div>
      <div>
        <HostedReadProofStrip />
      </div>
      <div>
        <Suspense fallback={<div className="rounded-3xl border border-white/8 bg-white/4 p-6 text-sm text-white/60">Loading analytics charts…</div>}>
          <AnalyticsCharts />
        </Suspense>
      </div>
      <div>
        <LaunchBlockersPanel />
      </div>
    </OperationsShell>
  );
}
