import type { Metadata } from "next";
import Link from "next/link";

import { CryptographicExecutionSpine } from "@/components/cryptographic-execution-spine";
import { GoldRushIntelligenceSurface } from "@/components/goldrush-intelligence-surface";
import { IntelligenceLayerSurface } from "@/components/intelligence-layer-surface";
import { OperationsShell } from "@/components/operations-shell";
import { QvacSovereignAiSurface } from "@/components/qvac-sovereign-ai-surface";
import { SectionHeader } from "@/components/section-header";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "GoldRush Decision Intelligence",
  description:
    "Direct decision-support corridor that turns Covalent GoldRush wallet context into PrivateDAO pre-sign intelligence, encrypted operation routing, execution, and proof continuity.",
  path: "/services/goldrush-decision-intelligence",
  keywords: ["GoldRush", "Covalent", "decision intelligence", "pre-sign", "encrypted operations", "IKA", "REFHE"],
});

const decisionLanes = [
  {
    title: "Counterparty decision",
    detail: "Review wallet history, labels, stablecoin exposure, and unusual flow context before approving a vendor, payroll, or grant recipient.",
  },
  {
    title: "Treasury decision",
    detail: "Turn holdings and stablecoin flow context into a signer-readable reason for rebalance, payout, or funding-route selection.",
  },
  {
    title: "Encryption decision",
    detail: "Decide what can be public proof, what must become an encrypted manifest, and whether REFHE / Encrypt / IKA should carry the sensitive lane.",
  },
  {
    title: "Execution decision",
    detail: "Move forward only after the wallet signer understands the route, the privacy boundary, the expected receipt, and the proof path.",
  },
] as const;

export default function GoldRushDecisionIntelligencePage() {
  return (
    <OperationsShell
      eyebrow="GoldRush decision intelligence"
      title="A direct intelligence corridor from wallet data to encrypted execution"
      description="This route makes GoldRush visible as a decision engine, not a decorative analytics badge. It helps a normal operator inspect wallet and stablecoin context, decide what must be encrypted, then continue into Ika, execution, and proof."
      navigationMode="guided"
      badges={[
        { label: "GoldRush", variant: "warning" },
        { label: "Pre-sign decision", variant: "cyan" },
        { label: "Encrypt / IKA handoff", variant: "violet" },
      ]}
    >
      <div className="rounded-[30px] border border-amber-300/18 bg-amber-300/[0.08] p-6">
        <div className="text-[11px] uppercase tracking-[0.28em] text-amber-100/76">Shortest judge path</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Analyze → decide → encrypt → execute → verify</h2>
        <p className="mt-3 max-w-5xl text-sm leading-7 text-white/66">
          Start with a wallet or .sol name, run a GoldRush-style pre-sign query, use the intelligence result to classify risk,
          send sensitive intent into Encrypt / IKA, then execute only through the wallet-first Testnet path. Proof remains
          visible without exposing confidential payload details.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="#goldrush-workbench" className={cn(buttonVariants({ size: "sm" }))}>
            Run intelligence
          </Link>
          <Link href="/services/encrypt-ika-operations" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open Encrypt / IKA
          </Link>
          <Link href="/execute" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Continue to execute
          </Link>
        </div>
      </div>

      <CryptographicExecutionSpine context="intelligence" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {decisionLanes.map((lane) => (
          <div key={lane.title} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
            <div className="text-base font-semibold text-white">{lane.title}</div>
            <p className="mt-3 text-sm leading-7 text-white/60">{lane.detail}</p>
          </div>
        ))}
      </div>

      <div id="goldrush-workbench">
        <GoldRushIntelligenceSurface />
      </div>

      <SectionHeader
        eyebrow="Decision assistant"
        title="The analysis stays useful because it ends in a clear next action"
        description="If the operation is routine, proceed to execution. If it is sensitive, route it through encrypted operations. If the proof path is unclear, stop and verify before signing."
      />
      <IntelligenceLayerSurface />
      <QvacSovereignAiSurface compact />
    </OperationsShell>
  );
}
