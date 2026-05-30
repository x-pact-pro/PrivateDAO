import type { Metadata } from "next";
import Link from "next/link";

import { CryptographicExecutionSpine } from "@/components/cryptographic-execution-spine";
import { EndToEndIntegrationClaimMatrix } from "@/components/end-to-end-integration-claim-matrix";
import { ExecutionCommandSurface } from "@/components/execution-command-surface";
import { GuidedOperationRail } from "@/components/guided-operation-rail";
import { GoldRushIntelligenceSurface } from "@/components/goldrush-intelligence-surface";
import { IntelligenceLayerSurface } from "@/components/intelligence-layer-surface";
import { MetricsStrip } from "@/components/metrics-strip";
import { OperatingJourneyStrip } from "@/components/operating-journey-strip";
import { OperationalGravityObservatory } from "@/components/operational-gravity-observatory";
import { OperationsShell } from "@/components/operations-shell";
import { PrivateDaoStackSurface } from "@/components/private-dao-stack-surface";
import { ProjectOperatingMap } from "@/components/project-operating-map";
import { QuickNodeStreamIntelligenceSurface } from "@/components/quicknode-stream-intelligence-surface";
import { QvacSovereignAiSurface } from "@/components/qvac-sovereign-ai-surface";
import { SectionHeader } from "@/components/section-header";
import { SnsDomainLookup } from "@/components/sns-domain-lookup";
import { getJudgeRuntimeLogsSnapshot } from "@/lib/judge-runtime-logs";
import { buildRouteMetadata } from "@/lib/route-metadata";

export const metadata: Metadata = buildRouteMetadata({
  title: "Intelligence",
  description:
    "QVAC local-first AI, Covalent GoldRush, proposal context, counterparty trust, RPC quality, and treasury risk review before a PrivateDAO wallet signs.",
  path: "/intelligence",
  keywords: ["QVAC", "local AI", "Covalent GoldRush", "proposal review", "treasury review", "rpc analyzer"],
});

export default function IntelligencePage() {
  const runtimeSnapshot = getJudgeRuntimeLogsSnapshot();

  return (
    <OperationsShell
      eyebrow="Intelligence"
      title="Operational intelligence that helps a normal user make safer governance and treasury decisions"
      description="PrivateDAO uses intelligence where it actually matters: proposal review, treasury execution review, voting compression, RPC health interpretation, and gaming-governance decision support tied to real product flows before execution."
      navigationMode="guided"
      badges={[
        { label: "Security + Intelligence", variant: "cyan" },
        { label: "Decision support", variant: "success" },
        { label: "Hugging Face free-ready", variant: "warning" },
      ]}
    >
      <GuidedOperationRail current="review" reviewHref="/intelligence" verifyHref="/proof" />
      <PrivateDaoStackSurface compact />
      <OperationalGravityObservatory />
      <EndToEndIntegrationClaimMatrix />
      <OperatingJourneyStrip
        snapshot={runtimeSnapshot}
        title="Review is the decision gate before any signer approves treasury or governance actions"
        description="This route exists between wallet connection and signature approval. Read the risk context here, then move to execution only when the policy, route quality, and proof path are clear."
      />
      <ExecutionCommandSurface compact />
      <div className="rounded-[28px] border border-cyan-300/16 bg-cyan-300/[0.08] p-6 text-sm leading-7 text-white/68">
        This route is easiest to understand after <a className="text-cyan-100 underline underline-offset-4" href="/learn">/learn</a> and a real Testnet action from <a className="text-cyan-100 underline underline-offset-4" href="/govern">/govern</a>. The goal is simple: help the signer understand risk, treasury context, RPC quality, and gaming consequences before pressing approve and moving to <a className="text-cyan-100 underline underline-offset-4" href="/execute">/execute</a>.
      </div>
      <div className="rounded-[28px] border border-emerald-300/18 bg-emerald-300/[0.08] p-6">
        <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-100/76">Pre-execution gate</div>
        <h2 className="mt-3 text-xl font-semibold text-white">Execution should not run before this gate is clear</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[
            "Proposal risk score reviewed",
            "Counterparty context checked",
            "Liquidity and route quality reviewed",
            "Proof and audit path prepared",
          ].map((item) => (
            <div key={item} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-white/72">
              {item}
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <a className="inline-flex h-9 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-black transition hover:bg-white/90" href="/execute">
            Continue to execute
          </a>
          <a className="inline-flex h-9 items-center justify-center rounded-md border border-white/15 bg-transparent px-4 text-sm font-medium text-white transition hover:bg-white/10" href="/proof">
            Open proof path
          </a>
        </div>
      </div>
      <div className="rounded-[28px] border border-violet-300/16 bg-violet-300/[0.07] p-6 text-sm leading-7 text-white/68">
        Sensitive DAO and treasury decisions use the QVAC local-first path; general encrypted analysis uses the SolRouter lane.
        Review the exact boundary at{" "}
        <Link className="text-violet-100 underline underline-offset-4" href="/documents/solrouter-vs-qvac-boundary">
          /documents/solrouter-vs-qvac-boundary
        </Link>
        .
      </div>
      <div>
        <MetricsStrip />
      </div>
      <CryptographicExecutionSpine compact context="intelligence" />
      <div>
        <SectionHeader
          eyebrow="Not a chatbot"
          title="AI in PrivateDAO exists to explain hard decisions, not to distract from them"
          description="This route is intentionally operational. It helps users understand proposal review context, treasury execution context, voting posture, RPC quality, and gaming-governance implications before they sign or execute anything."
        />
      </div>
      <div>
        <IntelligenceLayerSurface />
      </div>
      <ProjectOperatingMap
        compact
        title="Intelligence feeds every operating lane"
        description="This is not a detached analytics page. Intelligence feeds governance review, treasury route choice, payroll preparation, confidential payment rail selection, compliance posture, and wallet-first execution clarity before the user signs."
      />
      <div>
        <GoldRushIntelligenceSurface />
      </div>
      <QuickNodeStreamIntelligenceSurface />
      <div>
        <SnsDomainLookup />
      </div>
      <div>
        <QvacSovereignAiSurface compact />
      </div>
    </OperationsShell>
  );
}
