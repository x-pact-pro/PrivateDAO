"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, Binary, LockKeyhole, ShieldCheck, WalletCards } from "lucide-react";

import { ProposalAnalyzerInline } from "@/components/proposal-analyzer-inline";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildProposalConfidenceScorecard, confidenceProfiles } from "@/lib/confidence-engine";
import { buildServiceHandoffQuery } from "@/lib/service-handoff-state";
import { getFeaturedProposal } from "@/lib/site-data";
import { useServiceHandoffSnapshot } from "@/lib/use-service-handoff-snapshot";
import { cn } from "@/lib/utils";
import { commandCenterPacks, executionLog } from "@/lib/site-data";

export function CommandCenter() {
  const searchParams = useSearchParams();
  const featuredProposal = getFeaturedProposal(searchParams.get("proposal"));
  const handoff = useServiceHandoffSnapshot("command-center");
  if (!featuredProposal) {
    return null;
  }
  const hasActiveExecutionContinuity =
    handoff?.proposalId === featuredProposal.id && Boolean(handoff.payoutIntent);
  const continuityQuery = handoff ? buildServiceHandoffQuery(handoff) : "";
  const executionState = handoff?.requestDelivery?.state ?? handoff?.requestPayload?.state ?? "draft";
  const executionControlLabel =
    executionState === "executed" ? "Payload already submitted" : "Execute delivered payload";
  const executionControlSummary =
    executionState === "executed"
      ? "The command shell is now reading an executed request object and keeping the same payload attached to runtime and judge evidence."
      : "Command-center is prioritizing the delivered treasury request payload over proposal-derived analyzer copy for this active execution lane.";
  const featuredScore = buildProposalConfidenceScorecard({
    title: featuredProposal.title,
    type: featuredProposal.type,
    status: featuredProposal.status,
    privacy: featuredProposal.privacy,
    tech: featuredProposal.tech,
    summary: featuredProposal.summary,
  });
  const featuredActionHref =
    featuredProposal.status === "Live voting"
      ? `/govern${continuityQuery ? `?${continuityQuery}` : ""}#commit-vote-action`
      : featuredProposal.status === "Ready to reveal"
        ? `/govern${continuityQuery ? `?${continuityQuery}` : ""}#reveal-vote-action`
        : featuredProposal.status === "Execution ready" || featuredProposal.status === "Executed"
          ? `/govern${continuityQuery ? `?${continuityQuery}` : ""}#execute-proposal-action`
          : `/command-center${continuityQuery ? `?${continuityQuery}` : ""}#proposal-review-action`;
  const featuredActionLabel =
    featuredProposal.status === "Live voting"
      ? "Run commit vote live"
      : featuredProposal.status === "Ready to reveal"
        ? "Run reveal live"
        : featuredProposal.status === "Execution ready" || featuredProposal.status === "Executed"
          ? "Open execution action"
          : "Open live review action";

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-300/80">Command Center</div>
              <CardTitle className="mt-2">One guided surface for create → submit → private vote → execute</CardTitle>
            </div>
            <StatusBadge status={featuredProposal.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-3xl border border-white/8 bg-white/4 p-5">
            <div className="text-[11px] uppercase tracking-[0.28em] text-white/40">Featured proposal</div>
            <div className="mt-2 text-xl font-medium text-white">{featuredProposal.title}</div>
            <p className="mt-3 text-sm leading-7 text-white/58">{featuredProposal.summary}</p>
          </div>

          {hasActiveExecutionContinuity && handoff?.payoutIntent ? (
            <div className="rounded-3xl border border-cyan-300/15 bg-cyan-400/5 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/70">Execution continuity</div>
                  <div className="mt-1 text-sm font-medium text-white">{handoff.requestPayload?.requestId ?? handoff.proposalId}</div>
                </div>
                <Badge variant="cyan">Live payload</Badge>
              </div>
              <p className="mt-3 text-sm leading-7 text-white/62">
                {executionControlSummary}
              </p>
              <div className="mt-3 grid gap-3 rounded-[24px] border border-cyan-300/12 bg-black/20 p-4 sm:grid-cols-2">
                <div className="text-sm leading-7 text-white/56">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/60">Authoritative request object</div>
                  <div className="mt-1 text-white/80">{handoff.requestPayload?.kind ?? "request payload ready"}</div>
                </div>
                <div className="text-sm leading-7 text-white/56">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/60">Amount / asset</div>
                  <div className="mt-1 text-white/80">{handoff.requestPayload?.amountDisplay ?? handoff.payoutIntent.amountDisplay}</div>
                </div>
                <div className="text-sm leading-7 text-white/56">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/60">Reference</div>
                  <div className="mt-1 text-white/80">{handoff.requestPayload?.reference ?? handoff.payoutIntent.reference}</div>
                </div>
                <div className="text-sm leading-7 text-white/56">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/60">Execution target</div>
                  <div className="mt-1 text-white/80">{handoff.requestPayload?.executionTarget ?? handoff.payoutIntent.executionTarget}</div>
                </div>
                <div className="text-sm leading-7 text-white/56">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/60">Telemetry lane</div>
                  <div className="mt-1 text-white/80">{handoff.requestPayload?.telemetryMode ?? handoff.telemetryMode}</div>
                </div>
                <div className="text-sm leading-7 text-white/56 sm:col-span-2">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/60">Payload continuity</div>
                  <div className="mt-1 break-all text-white/80">
                    {handoff.requestPayload?.requestRoute ?? handoff.requestDelivery?.requestRoute}
                  </div>
                </div>
                <div className="text-sm leading-7 text-white/56 sm:col-span-2">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/60">Signing source</div>
                  <div className="mt-1 text-white/80">
                    The delivered request payload now drives the signing shell, execution review, and runtime log trail before any signature step.
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href={continuityQuery ? `/command-center?${continuityQuery}#proposal-review-action` : "/command-center#proposal-review-action"} className={cn(buttonVariants({ size: "sm" }))}>
                  Review payload-driven signing shell
                </Link>
                <Link href={continuityQuery ? `/command-center?${continuityQuery}#proposal-review-action` : "/command-center#proposal-review-action"} className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
                  {executionControlLabel}
                </Link>
                <Link href={continuityQuery ? `/network?${continuityQuery}` : "/network"} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                  Open authoritative network log trail
                </Link>
              </div>
            </div>
          ) : (
            <ProposalAnalyzerInline proposal={featuredProposal} />
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-white/8 bg-black/20 p-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                <div className="text-sm font-medium text-white">Create proposal</div>
              </div>
              <p className="mt-3 text-sm leading-7 text-white/56">Product packs, proposal cards, and buyer guidance reduce setup friction for normal users.</p>
            </div>
            <div className="rounded-3xl border border-white/8 bg-black/20 p-4">
              <div className="flex items-center gap-3">
                <LockKeyhole className="h-4 w-4 text-fuchsia-300" />
                <div className="text-sm font-medium text-white">Private vote</div>
              </div>
              <p className="mt-3 text-sm leading-7 text-white/56">Commit-reveal, optional ZK review rails, and evidence boundaries stay visible before any signing step.</p>
            </div>
            <div className="rounded-3xl border border-white/8 bg-black/20 p-4">
              <div className="flex items-center gap-3">
                <WalletCards className="h-4 w-4 text-cyan-300" />
                <div className="text-sm font-medium text-white">Execute treasury</div>
              </div>
              <p className="mt-3 text-sm leading-7 text-white/56">Runtime evidence, settlement checks, and execution logs keep the treasury path understandable after approval.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={continuityQuery ? `/command-center?${continuityQuery}#proposal-review-action` : "/command-center#proposal-review-action"}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Open governance dashboard
            </Link>
            <Link href={featuredActionHref} className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
              {featuredActionLabel}
            </Link>
            <Link href="/documents/reviewer-fast-path" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              Review curated proof docs
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Command presets</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {commandCenterPacks.map((pack) => (
            <div key={pack.title} className="rounded-3xl border border-white/8 bg-white/4 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-base font-medium text-white">{pack.title}</div>
                  <div className="mt-1 text-sm text-white/45">{pack.subtitle}</div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-cyan-300" />
              </div>
              <p className="mt-3 text-sm leading-7 text-white/58">{pack.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {pack.technologies.map((technology) => (
                  <Badge key={technology} variant={technology.includes("ZK") ? "violet" : technology.includes("MagicBlock") ? "success" : "cyan"}>
                    {technology}
                  </Badge>
                ))}
              </div>
              <div className="mt-4 text-[11px] uppercase tracking-[0.28em] text-emerald-300/75">{pack.readiness}</div>
            </div>
          ))}
          <div className="rounded-3xl border border-white/8 bg-black/20 p-5">
            <div className="text-[11px] uppercase tracking-[0.28em] text-white/40">Execution log snapshot</div>
            <div className="mt-3 space-y-3">
              {executionLog.slice(0, 2).map((entry) => (
                <div key={entry.label}>
                  <div className="text-sm font-medium text-white">{entry.label}</div>
                  <div className="mt-1 text-sm leading-7 text-white/56">{entry.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-white/8 bg-black/20 p-5">
            <div className="flex items-center gap-3">
              <Binary className="h-4 w-4 text-cyan-300" />
              <div>
                <div className="text-sm font-medium text-white">Confidence engine snapshot</div>
                <div className="text-[11px] uppercase tracking-[0.28em] text-white/40">
                  ZK + REFHE + MagicBlock + Fast RPC
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {confidenceProfiles.map((profile) => (
                <div key={profile.title} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-white">{profile.title}</div>
                      <div className="mt-1 text-xs text-white/45">{profile.subtitle}</div>
                    </div>
                    <div className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-sm font-medium text-white">
                      {profile.total}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-white/8 bg-white/4 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-white">Featured proposal live score</div>
                  <div className="mt-1 text-xs text-white/45">{featuredScore.title}</div>
                </div>
                <div className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-sm font-medium text-white">
                  {featuredScore.total}
                </div>
              </div>
              <div className="mt-3 text-sm leading-7 text-white/58">
                {featuredScore.strongestSignals.slice(0, 2).join(" · ")}
              </div>
            </div>
            <Link
              href="/documents/cryptographic-confidence-engine"
              className={cn(buttonVariants({ size: "sm", variant: "outline" }), "mt-4 w-full")}
            >
              Open engine specification
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
