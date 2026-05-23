import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";

import { MetricsStrip } from "@/components/metrics-strip";
import { JudgeRuntimeLogsPanel } from "@/components/judge-runtime-logs-panel";
import { JudgeExecutionContinuityPanel } from "@/components/judge-execution-continuity-panel";
import { LocalizedProofPrimer } from "@/components/localized-proof-primer";
import { LocalizedRouteSummary } from "@/components/localized-route-summary";
import { LiveSiteActivityPanel } from "@/components/live-site-activity-panel";
import { GuidedOperationRail } from "@/components/guided-operation-rail";
import { NormalUserOperationPath } from "@/components/normal-user-operation-path";
import { OperatingJourneyStrip } from "@/components/operating-journey-strip";
import { OperationStateLegend } from "@/components/operation-state-legend";
import { OperationReceiptLedger } from "@/components/operation-receipt-ledger";
import { OperationsShell } from "@/components/operations-shell";
import { PrivacyPolicySelector } from "@/components/privacy-policy-selector";
import { ProofEntryBanner } from "@/components/proof-entry-banner";
import { ProofFlowRail } from "@/components/proof-flow-rail";
import { ProofMatrix } from "@/components/proof-matrix";
import { ProofCenter } from "@/components/proof-center";
import { ReadNodeActivationStrip } from "@/components/read-node-activation-strip";
import { ReadNodeHostReadinessStrip } from "@/components/read-node-host-readiness-strip";
import { ProjectOperatingMap } from "@/components/project-operating-map";
import { QuickNodeStreamIntelligenceSurface } from "@/components/quicknode-stream-intelligence-surface";
import { RuntimeEvidenceContinuityPanel } from "@/components/runtime-evidence-continuity-panel";
import { AuthoritativeExecutionTrail } from "@/components/authoritative-execution-trail";
import { ExecutionOperationsStrip } from "@/components/execution-operations-strip";
import { DevnetExecutionScreenshotsStrip } from "@/components/devnet-execution-screenshots-strip";
import { SupabaseOperationTimeline } from "@/components/supabase-operation-timeline";
import { PrivacyProofExplainer } from "@/components/privacy-proof-explainer";
import { TestnetProofMatrix } from "@/components/testnet-proof-matrix";
import { VideoCenter } from "@/components/video-center";
import { MagicBlockPrivatePaymentsStatus } from "@/components/magicblock-private-payments-status";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { getExecutionSurfaceSnapshot } from "@/lib/devnet-service-metrics";
import { getJudgeRuntimeLogsSnapshot } from "@/lib/judge-runtime-logs";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "Proof Center",
  description:
    "Baseline live proof, dedicated V3 hardening proof, integration packets, and launch truth boundaries exposed in one clear product verification surface.",
  path: "/proof",
  keywords: ["proof center", "V3 hardening", "verification packets", "live proof"],
});

export default function ProofPage() {
  const executionSnapshot = getExecutionSurfaceSnapshot();
  const runtimeSnapshot = getJudgeRuntimeLogsSnapshot();
  const integrationEvidenceLanes = [
    {
      title: "MagicBlock private payments",
      summary: "Current Frontier track lane: live corridor PDA check, finalized Devnet private payment receipts, challenge/login private reads, and wallet-signed execution continuity for judges.",
      featureHref: "/services/magicblock-private-payments",
      proofHref: "/proof",
    },
    {
      title: "Cloak private settlement",
      summary: "For users: prepare a private payroll or treasury settlement. For judges: inspect the live receipt path and current relay boundary.",
      featureHref: "/services/cloak-private-settlement",
      proofHref: "/documents/testnet-integration-runtime-closure-2026-05-07",
    },
    {
      title: "Umbra confidential payout",
      summary: "For users: route recipient-private payouts. For judges: verify the Umbra relayer health and intent receipt evidence.",
      featureHref: "/services/umbra-confidential-payout",
      proofHref: "/proof",
    },
    {
      title: "Intelligence evidence",
      summary: "GoldRush is the visible financial intelligence layer: wallet history, stablecoin review, and counterparty screening before signing.",
      featureHref: "/intelligence",
      proofHref: "/documents/testnet-integration-runtime-closure-2026-05-07",
    },
    {
      title: "AUDD treasury mode",
      summary: "AUD-denominated treasury and merchant settlement lane with stablecoin proof path.",
      featureHref: "/services/audd-stablecoin",
      proofHref: "/documents/audd-stablecoin-treasury-layer",
    },
    {
      title: "PUSD treasury mode",
      summary: "Stable reserve, payroll, and reward-pool lane with treasury packet continuity.",
      featureHref: "/services/pusd-stablecoin",
      proofHref: "/documents/pusd-stablecoin-treasury-layer",
    },
    {
      title: "Jupiter treasury route",
      summary: "Route preview and rebalance lane tied to governed treasury motion.",
      featureHref: "/services/jupiter-treasury-route",
      proofHref: "/documents/jupiter-treasury-route",
    },
    {
      title: "Zerion policy lane",
      summary: "Bounded agent policy lane for wallet-safe execution and reviewer scrutiny.",
      featureHref: "/services/zerion-agent-policy",
      proofHref: "/documents/zerion-autonomous-agent-policy",
    },
    {
      title: "Torque growth loop",
      summary: "Growth and retention evidence lane linked to reward and participation mechanics.",
      featureHref: "/services/torque-growth-loop",
      proofHref: "/documents/torque-growth-loop",
    },
    {
      title: "Eitherway live dApp",
      summary: "Wallet-first product lane with connect, profile signing, and continuation into governed execution.",
      featureHref: "/services/eitherway-live-dapp",
      proofHref: "/proof",
    },
    {
      title: "Consumer governance UX",
      summary: "Normal-user path with wallet-first onboarding and cross-surface continuity (web + Android).",
      featureHref: "/services/consumer-governance-ux",
      proofHref: "/android",
    },
    {
      title: "Runtime infrastructure",
      summary: "Fast RPC, host readiness, and telemetry lane with operational evidence continuity.",
      featureHref: "/services/runtime-infrastructure",
      proofHref: "/analytics",
    },
    {
      title: "Encrypt / IKA operations",
      summary: "For users: confidential execution commitments stay behind a simple proof badge. For judges: inspect the settled Testnet REFHE envelope.",
      featureHref: "/services/encrypt-ika-operations",
      proofHref: "/proof",
    },
    {
      title: "SolRouter encrypted AI",
      summary: "General proposal analysis and encrypted local output. This is not the sensitive-decision gate; QVAC owns that role.",
      featureHref: "/services/solrouter-encrypted-ai",
      proofHref: "/documents/solrouter-encrypted-ai-evidence-2026-05-07",
    },
    {
      title: "QVAC sovereign AI",
      summary: "Sensitive-decision AI: local-first proposal and treasury briefing before a signer approves anything.",
      featureHref: "/services/qvac-sovereign-ai",
      proofHref: "/documents/testnet-integration-runtime-closure-2026-05-07",
    },
    {
      title: "ZK proof continuity",
      summary: "For users: proof badges explain hidden voting safely. For judges: verify fresh Testnet anchors and receipt transactions.",
      featureHref: "/proof",
      proofHref: "/documents/testnet-zk-verification-receipts-2026-05-07",
    },
    {
      title: "Main Frontier closure",
      summary: "Integrated route that composes all shipped lanes into one judge-ready product surface.",
      featureHref: "/services/main-frontier-closure",
      proofHref: "/proof",
    },
  ] as const;

  return (
    <OperationsShell
      eyebrow="Proof"
      title="Operation receipts, runtime evidence, and trust packets in one premium verification surface"
      description="This surface is the receipt layer for executed operations: baseline live proof, dedicated V3 hardening proof, integration packets, and the exact routes used after running real Testnet flow through the public product."
      badges={[
        { label: "Proof Center", variant: "cyan" },
        { label: "Verification-ready", variant: "violet" },
        { label: "Baseline + V3", variant: "success" },
      ]}
    >
      <GuidedOperationRail
        current="verify"
        reviewHref="/govern"
        verifyHref="/proof"
        compact
        pendingNote="Proof continuity stays explicit across governance, intelligence, execution, and receipt export lanes."
      />
      <LocalizedRouteSummary routeKey="proof" />
      <OperationStateLegend
        description="Proof is the truth boundary for the product. It separates executed on-chain activity, live service health, encrypted intent receipts, and final private settlement evidence so judges and users do not confuse one for another."
      />
      <LocalizedProofPrimer />
      <LiveSiteActivityPanel />
      <VideoCenter compact />
      <OperatingJourneyStrip
        snapshot={runtimeSnapshot}
        title="Proof-side operating journey"
        description="Before opening detailed packets, read the current Testnet operating journey here: what is verified, what is captured from runtime evidence, and what is attached to receipt exports."
      />
      <div>
        <Suspense fallback={null}>
          <ProofEntryBanner />
        </Suspense>
      </div>
      <div>
        <PrivacyProofExplainer compact />
      </div>
      <NormalUserOperationPath />
      <TestnetProofMatrix />
      <div>
        <PrivacyPolicySelector compact />
      </div>
      <div className="rounded-[26px] border border-sky-300/16 bg-sky-300/[0.07] p-5">
        <div className="text-[11px] uppercase tracking-[0.24em] text-sky-100/78">Current Frontier reviewer path</div>
        <div className="mt-2 max-w-4xl text-sm leading-7 text-white/68">
          The clearest current competition path starts with MagicBlock private payments, then expands into Umbra,
          Cloak, Encrypt / IKA, and the intelligence and governance rails that explain why each execution lane exists.
          Reviewers should not have to infer the current track from older pages.
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/services/magicblock-private-payments" className={cn(buttonVariants({ size: "sm" }))}>
            Open MagicBlock track lane
          </Link>
          <Link href="/services/confidential-payments" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open encrypted payments system
          </Link>
          <Link href="/judge" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Open judge route
          </Link>
        </div>
      </div>
      <MagicBlockPrivatePaymentsStatus />
      <ProjectOperatingMap
        description="The proof route should expose the full operating system behind the screenshots and transactions. Governance decides, intelligence explains, treasury prepares, confidential rails execute, payroll stays encrypted, and wallet-first execution keeps the final approval in the signer’s hands."
      />
      <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
        <div className="grid gap-3 lg:grid-cols-3">
          {[
            ["Sensitive decisions", "QVAC runs local-first review before signing so private treasury intent does not need a cloud model.", "/services/qvac-sovereign-ai"],
            ["Financial intelligence", "Covalent GoldRush makes wallet, stablecoin, and counterparty context visible before an operator acts.", "/intelligence"],
            ["Cryptographic proof", "ZK, REFHE/Encrypt, IKA, Umbra, Cloak, and MagicBlock each have a clear feature route and a judge proof route.", "/documents/testnet-refhe-encrypt-ika-commitment-2026-05-07"],
          ].map(([title, summary, href]) => (
            <Link key={title} href={href} className="rounded-[22px] border border-white/8 bg-black/20 p-4 transition hover:border-cyan-200/40">
              <div className="text-sm font-semibold text-white">{title}</div>
              <div className="mt-2 text-sm leading-6 text-white/62">{summary}</div>
            </Link>
          ))}
        </div>
      </div>
      <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
        <div className="text-[11px] uppercase tracking-[0.24em] text-white/42">Feature-to-proof lanes</div>
        <div className="mt-2 max-w-4xl text-sm leading-7 text-white/68">
          Each card links first to the live feature it describes, then to the closest proof packet or evidence surface for that exact lane. Use `/judge` when you need the full reviewer map; use this proof center when you need receipts and runtime evidence.
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {integrationEvidenceLanes.map((lane) => (
            <div key={lane.title} className="rounded-[22px] border border-white/8 bg-black/20 p-4">
              <div className="text-base font-medium text-white">{lane.title}</div>
              <div className="mt-2 text-sm leading-6 text-white/62">{lane.summary}</div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={lane.featureHref} className={cn(buttonVariants({ size: "sm" }))}>
                  Open feature
                </Link>
                <Link href={lane.proofHref} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                  Open proof
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <JudgeRuntimeLogsPanel />
      </div>
      <div>
        <Suspense fallback={null}>
          <JudgeExecutionContinuityPanel
            executionSnapshot={executionSnapshot}
            runtimeSnapshot={runtimeSnapshot}
          />
        </Suspense>
      </div>
      <div>
        <Suspense fallback={null}>
          <AuthoritativeExecutionTrail context="proof" runtimeSnapshot={runtimeSnapshot} />
        </Suspense>
      </div>
      <div>
        <Suspense fallback={null}>
          <ExecutionOperationsStrip context="proof" />
        </Suspense>
      </div>
      <div>
        <Suspense fallback={null}>
          <RuntimeEvidenceContinuityPanel
            context="proof"
            executionSnapshot={executionSnapshot}
            runtimeSnapshot={runtimeSnapshot}
          />
        </Suspense>
      </div>
      <div>
        <ReadNodeActivationStrip context="proof" />
      </div>
      <div>
        <ReadNodeHostReadinessStrip context="proof" />
      </div>
      <QuickNodeStreamIntelligenceSurface compact />
      <div className="rounded-[26px] border border-emerald-300/16 bg-emerald-300/[0.08] p-5 text-sm leading-7 text-white/72">
        Supabase receipt continuity is browser-direct: confirmed operations write to
        <span className="font-semibold text-white"> governance_receipts</span>,
        <span className="font-semibold text-white"> operation_receipts</span>, and
        <span className="font-semibold text-white"> cloak_delivery_state</span> without relying on static-export API routes.
        Realtime subscriptions refresh this proof surface when new rows land.
      </div>
      <div>
        <MetricsStrip />
      </div>
      <div>
        <ProofFlowRail />
      </div>
      <div>
        <ProofCenter />
      </div>
      <OperationReceiptLedger snapshot={runtimeSnapshot} />
      <ProofMatrix />
      <SupabaseOperationTimeline />
      <DevnetExecutionScreenshotsStrip />
    </OperationsShell>
  );
}
