import type { Metadata } from "next";
import Link from "next/link";

import { CryptographicExecutionSpine } from "@/components/cryptographic-execution-spine";
import { TestnetBillingRehearsal } from "@/components/devnet-billing-rehearsal";
import { ExecuteCurrentOperationPanel } from "@/components/execute-current-operation-panel";
import { ExecuteGrowthPanel } from "@/components/execute-growth-panel";
import { ExecuteLatestReceiptsPanel } from "@/components/execute-latest-receipts-panel";
import { EndToEndIntegrationClaimMatrix } from "@/components/end-to-end-integration-claim-matrix";
import { ExecutionSpineSurface } from "@/components/execution-spine-surface";
import { GovernWorkbenchClient } from "@/components/govern/govern-workbench-client";
import { GuidedOperationRail } from "@/components/guided-operation-rail";
import { JupiterTreasuryRouteSurface } from "@/components/jupiter-treasury-route-surface";
import { OperationsShell } from "@/components/operations-shell";
import { PrivateSettlementRailWorkbench } from "@/components/private-settlement-rail-workbench";
import { PrivacyPolicySelector } from "@/components/privacy-policy-selector";
import { PrivacyExecutionClaimConsole } from "@/components/privacy-execution-claim-console";
import { PrivacySdkApiStarter } from "@/components/privacy-sdk-api-starter";
import { PrivatePayrollEncryptionWorkbench } from "@/components/private-payroll-encryption-workbench";
import { ProjectOperatingMap } from "@/components/project-operating-map";
import { QvacSovereignAiSurface } from "@/components/qvac-sovereign-ai-surface";
import { VisitorTestnetFastPath } from "@/components/visitor-testnet-fast-path";
import { getExecutionSurfaceSnapshot } from "@/lib/devnet-service-metrics";
import { getJudgeRuntimeLogsSnapshot } from "@/lib/judge-runtime-logs";
import { buildRouteMetadata } from "@/lib/route-metadata";

export const metadata: Metadata = buildRouteMetadata({
  title: "Execute",
  description:
    "Run PrivateDAO operations from one wallet-first surface: private payroll rehearsal, vendor settlement, treasury rebalance lanes, and proof-linked execution.",
  path: "/execute",
  keywords: ["execute", "private payroll", "treasury rebalance", "vendor payment", "wallet-first", "testnet"],
});

const executionModes = [
  {
    id: "private-payroll",
    title: "A. Private Payroll",
    detail:
      "Run contributor payout rehearsals with stablecoin rails, memo-linked receipts, wallet signatures, and proof continuity from the same browser flow.",
    cta: "Run payroll rehearsal",
  },
  {
    id: "vendor-payment",
    title: "B. Vendor Payment",
    detail:
      "Issue settlement-ready payments with policy context, chain verification, and reviewer-safe traces without leaving the operation shell.",
    cta: "Open settlement lane",
  },
  {
    id: "treasury-rebalance",
    title: "C. Treasury Rebalance",
    detail:
      "Use governed execution to plan route quality, execution intent, and treasury posture shifts through a controlled market-ops corridor.",
    cta: "Open treasury route",
  },
  {
    id: "rewards-gaming",
    title: "D. Rewards / Gaming",
    detail:
      "Attach private reward distribution to governance approvals and exportable proof artifacts for audits, judges, and operator replay.",
    cta: "Open govern workbench",
  },
] as const;

export default function ExecutePage() {
  const runtimeSnapshot = getJudgeRuntimeLogsSnapshot();
  const executionSnapshot = getExecutionSurfaceSnapshot();
  const intelligenceStatus = executionSnapshot.incidentAlerts.some((item) => item.status === "Action")
    ? "active monitoring"
    : executionSnapshot.incidentAlerts.some((item) => item.status === "Watch")
      ? "enhanced monitoring"
      : "operational";

  return (
    <OperationsShell
      eyebrow="Execute"
      title="Turn approved governance into private treasury, payroll, payment, and reward execution"
      description="This is the operating surface where a normal user moves from approved policy into Testnet action: encrypted payroll, private settlement, treasury routing, stablecoin billing, and community or GamingDAO rewards with wallet signatures and proof-linked continuity."
      navigationMode="guided"
      badges={[
        { label: "Execution center", variant: "cyan" },
        { label: "Wallet-first", variant: "success" },
        { label: "Proof-linked", variant: "violet" },
      ]}
    >
      <GuidedOperationRail
        current="sign"
        reviewHref="/intelligence"
        verifyHref="/proof"
        pendingNote="Wallet-first execution, rail proxy forwarding, and proof routes are live on one continuous operating surface."
      />
      <VisitorTestnetFastPath focus="execute" />
      <div className="rounded-[28px] border border-cyan-300/16 bg-cyan-300/[0.08] p-6">
        <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/74">Operating flow</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Review → Intelligence → Prepare → Wallet sign → Verify</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/64">
          Before signing, review proposal, treasury, counterparty, privacy, and route context in <Link className="text-cyan-100 underline underline-offset-4" href="/intelligence">Intelligence</Link>.
          Execution then happens here from the connected Testnet wallet, and the resulting receipt path stays verifiable in{" "}
          <Link className="text-cyan-100 underline underline-offset-4" href="/proof">Proof</Link>.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        {executionModes.map((mode) => (
          <a
            key={mode.id}
            href={`#${mode.id}`}
            className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 transition hover:border-cyan-300/24 hover:bg-white/[0.06]"
          >
            <div className="text-base font-medium text-white">{mode.title}</div>
            <p className="mt-3 text-sm leading-7 text-white/62">{mode.detail}</p>
            <div className="mt-4 text-xs uppercase tracking-[0.2em] text-cyan-100/80">{mode.cta}</div>
          </a>
        ))}
      </div>
      <EndToEndIntegrationClaimMatrix />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <ExecutionSpineSurface context="execute" compact />
          <PrivacyExecutionClaimConsole compact />
          <CryptographicExecutionSpine compact context="execute" />
          <QvacSovereignAiSurface compact />
          <ProjectOperatingMap
            compact
            title="Execution is where integrations become product behavior"
            description="Ika, Encrypt, REFHE, 2PC-MPC, MagicBlock, Umbra, Cloak, Jupiter, Torque, Zerion, GoldRush, QVAC, and QuickNode are not separate site stories here. They are rails inside one user path: protect intent, prepare a safe operation, sign from a wallet, and verify the Testnet result."
          />

          <section id="private-payroll" className="space-y-4">
            <div className="rounded-[24px] border border-emerald-300/16 bg-emerald-300/[0.08] p-5">
              <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-100/76">A. Private Payroll</div>
              <p className="mt-3 text-sm leading-7 text-white/66">
                Use the rehearsal lanes for stablecoin and SOL operations with wallet signatures and live explorer hashes. This is the direct browser flow for payroll-grade execution testing.
              </p>
            </div>
            <PrivatePayrollEncryptionWorkbench />
            <TestnetBillingRehearsal />
          </section>

          <section id="vendor-payment" className="space-y-4">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
              <div className="text-[11px] uppercase tracking-[0.24em] text-white/46">B. Vendor Payment</div>
              <p className="mt-3 text-sm leading-7 text-white/62">
                Settlement flows remain policy-bound and reviewer-readable. Use the same billing lane for invoice-like vendor motions, then verify the receipt from Proof and runtime logs.
              </p>
            </div>
            <PrivacyPolicySelector compact />
            <PrivateSettlementRailWorkbench />
          </section>

          <section id="treasury-rebalance" className="space-y-4">
            <div className="rounded-[24px] border border-cyan-300/16 bg-cyan-300/[0.08] p-5">
              <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/78">C. Treasury Rebalance</div>
              <p className="mt-3 text-sm leading-7 text-white/64">
                Route planning, swap quality, and governed treasury posture stay in one operation story. Keep policy and route rationale attached before any execution.
              </p>
            </div>
            <JupiterTreasuryRouteSurface />
          </section>

          <section id="rewards-gaming" className="space-y-4">
            <div className="rounded-[24px] border border-violet-300/16 bg-violet-300/[0.08] p-5">
              <div className="text-[11px] uppercase tracking-[0.24em] text-violet-100/78">D. Rewards / Gaming</div>
              <p className="mt-3 text-sm leading-7 text-white/66">
                Use governance actions to run reward-oriented operations, then inspect signatures, logs, and continuity lanes without leaving this execution shell.
              </p>
            </div>
            <GovernWorkbenchClient />
          </section>

          <ExecuteGrowthPanel
            proposalFlowHealth={executionSnapshot.proposalFlow.value}
            proofFreshness={executionSnapshot.proofFreshness.value}
          />

          <ExecuteLatestReceiptsPanel />

          <PrivacySdkApiStarter compact />
        </div>

        <ExecuteCurrentOperationPanel
          governanceStatus={runtimeSnapshot.governance.verificationStatus}
          proposalFlowHealth={executionSnapshot.proposalFlow.value}
          intelligenceStatus={intelligenceStatus}
          proofFreshness={executionSnapshot.proofFreshness.value}
        />
      </div>
    </OperationsShell>
  );
}
