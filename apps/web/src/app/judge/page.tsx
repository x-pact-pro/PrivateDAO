import type { Metadata } from "next";
import { ArrowUpRight, Award } from "lucide-react";
import { DevnetExecutionScreenshotsStrip } from "@/components/devnet-execution-screenshots-strip";
import { JudgeSelectiveDisclosureCta } from "@/components/judge-selective-disclosure-cta";
import { JudgeRuntimeLogsPanel } from "@/components/judge-runtime-logs-panel";
import { JudgeTechnologyGuide } from "@/components/judge-technology-guide";
import { JudgeFoundationMessageCard } from "@/components/judge-foundation-message-card";
import { LocalizedJudgePrimer } from "@/components/localized-judge-primer";
import { LocalizedRouteSummary } from "@/components/localized-route-summary";
import { MagicBlockPrivatePaymentsStatus } from "@/components/magicblock-private-payments-status";
import { OperationsShell } from "@/components/operations-shell";
import { ProjectOperatingMap } from "@/components/project-operating-map";
import { PrivacyPolicySelector } from "@/components/privacy-policy-selector";
import { PrivacyProofExplainer } from "@/components/privacy-proof-explainer";
import { TestnetProofMatrix } from "@/components/testnet-proof-matrix";
import { PlatformCapabilityStack } from "@/components/platform-capability-stack";
import { VideoCenter } from "@/components/video-center";
import Link from "next/link";
import { getJudgeRuntimeLogsSnapshot } from "@/lib/judge-runtime-logs";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "Verification Route",
  description:
    "Fast verification route for inspecting the DAO lifecycle, real Testnet transactions, agentic treasury micropayments, and the clearest proof surfaces inside PrivateDAO.",
  path: "/judge",
  keywords: ["verification", "testnet proof", "micropayments", "governance proof"],
});

export default function JudgePage() {
  const runtimeSnapshot = getJudgeRuntimeLogsSnapshot();
  const recognitionSignals = [
    {
      label: "1st Place",
      value: "Superteam Poland",
      detail: "Regional recognition attached to proof, product clarity, and operating discipline.",
    },
    {
      label: "3rd Place",
      value: "Superteam UAE Frontier Hackathon",
      detail: "Frontier recognition for the integrated private-governance, payments, AI, and infrastructure surface.",
    },
    {
      label: "Top 1%",
      value: "Solana ecosystem signal",
      detail: "Credibility signal shown beside live Testnet proof rather than replacing technical verification.",
    },
  ];
  const integrationFastPaths = [
    ["MagicBlock private payments", "Primary Frontier track lane with challenge/login auth, private balance boundary, and wallet-signed execution path.", "/services/magicblock-private-payments", "/proof"],
    ["Cloak private settlement", "Confidential treasury and payroll execution lane with receipt continuity.", "/services/cloak-private-settlement", "/proof"],
    ["Umbra confidential payout", "Recipient-private payout lane with claim-style flow, relayer visibility, and settlement continuity.", "/services/umbra-confidential-payout", "/proof"],
    ["Intelligence evidence", "Covalent GoldRush treasury and counterparty review surface with live fallback visibility.", "/intelligence", "/proof"],
    ["AUDD treasury mode", "AUD settlement, invoice, and merchant-facing stablecoin lane.", "/services/audd-stablecoin", "/documents/audd-stablecoin-treasury-layer"],
    ["PUSD treasury mode", "Stable reserve, grants, payroll, and reward-pool lane.", "/services/pusd-stablecoin", "/documents/pusd-stablecoin-treasury-layer"],
    ["Jupiter treasury route", "Governed route preview for rebalance and payout funding.", "/services/jupiter-treasury-route", "/documents/jupiter-treasury-route"],
    ["Zerion policy lane", "Bounded agent execution with wallet-safe policy framing.", "/services/zerion-agent-policy", "/documents/zerion-autonomous-agent-policy"],
    ["Torque growth loop", "Retention and reward surfaces tied to product activity.", "/services/torque-growth-loop", "/documents/torque-growth-loop"],
    ["Eitherway live dApp", "Wallet-first connect/sign/verify lane with partner-ready UX boundaries.", "/services/eitherway-live-dapp", "/proof"],
    ["Consumer governance UX", "Normal-user path across web and Android with wallet-first signing clarity.", "/services/consumer-governance-ux", "/android"],
    ["Runtime infrastructure", "Fast RPC and telemetry lane with reviewer-facing diagnostics continuity.", "/services/runtime-infrastructure", "/analytics"],
    ["Encrypt / IKA operations", "Client-side encrypted payload lane with commitment-safe proof continuity and payroll-safe preparation.", "/services/encrypt-ika-operations", "/proof"],
    ["SolRouter encrypted AI", "Deterministic proposal intelligence with encrypted brief output and receipt continuity.", "/services/solrouter-encrypted-ai", "/proof"],
    ["Main Frontier closure", "Integrated product route connecting all shipped operational lanes.", "/services/main-frontier-closure", "/proof"],
  ] as const;

  return (
    <OperationsShell
      eyebrow="Verification"
      title="Inspect the real product, the real transactions, and the fastest trust path first"
      description="This route is built for fast verification. It shows the DAO lifecycle, captured Testnet signatures, the Agentic Treasury Micropayment Rail, and the shortest route into the deeper proof and document surfaces. A normal visitor can use it too: the chain evidence is public and readable even when the protected parts of the workflow stay private until the correct stage."
      badges={[
        { label: "Verification first", variant: "cyan" },
        { label: "Testnet live", variant: "success" },
        { label: "Proof-linked", variant: "violet" },
      ]}
    >
      <LocalizedRouteSummary routeKey="judge" />
      <VideoCenter compact />
      <div className="rounded-[26px] border border-amber-300/18 bg-[linear-gradient(135deg,rgba(251,191,36,0.12),rgba(20,241,149,0.07),rgba(8,13,28,0.92))] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-100">
              <Award className="h-4 w-4" />
              <div className="text-[11px] uppercase tracking-[0.28em]">Recognition attached to proof</div>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/66">
              Awards are shown here only as review context. The primary judge path remains the live product, Testnet
              proof, runtime status, and integration map across QVAC, Cloak, Umbra, MagicBlock, Covalent GoldRush,
              Jupiter, Zerion, Torque, Eitherway, Supabase, and the AWS read-node.
            </p>
          </div>
          <Link href="/awards" className={cn(buttonVariants({ variant: "outline" }), "border-amber-300/24 bg-amber-300/[0.08] text-amber-50 hover:bg-amber-300/[0.13]")}>
            Open awards context
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {recognitionSignals.map((item) => (
            <div key={item.value} className="rounded-2xl border border-white/10 bg-black/22 p-4">
              <div className="text-[11px] uppercase tracking-[0.24em] text-amber-100/62">{item.label}</div>
              <div className="mt-2 text-lg font-semibold text-white">{item.value}</div>
              <p className="mt-2 text-sm leading-6 text-white/56">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <LocalizedJudgePrimer />

        <div className="grid gap-3">
          <div className="rounded-[26px] border border-white/8 bg-white/[0.04] p-5">
            <div className="text-[11px] uppercase tracking-[0.24em] text-white/42">Governance proof</div>
            <div className="mt-2 text-base font-medium text-white">
              {runtimeSnapshot.governance.proposal} · {runtimeSnapshot.governance.verificationStatus}
            </div>
          </div>
          <div className="rounded-[26px] border border-white/8 bg-white/[0.04] p-5">
            <div className="text-[11px] uppercase tracking-[0.24em] text-white/42">Micropayment rail</div>
            <div className="mt-2 text-base font-medium text-white">
              {runtimeSnapshot.agenticMicropayments.available
                ? `${runtimeSnapshot.agenticMicropayments.successfulTransferCount}/${runtimeSnapshot.agenticMicropayments.transferCount} real transfers`
                : "rail proof not attached yet"}
            </div>
            {runtimeSnapshot.agenticMicropayments.available ? (
              <div className="mt-2 text-sm leading-7 text-white/60">
                {runtimeSnapshot.agenticMicropayments.settlementAssetSymbol} ·{" "}
                {runtimeSnapshot.agenticMicropayments.assetMode} · {runtimeSnapshot.agenticMicropayments.freshness}
              </div>
            ) : null}
          </div>
          <div className="rounded-[26px] border border-white/8 bg-white/[0.04] p-5">
            <div className="text-[11px] uppercase tracking-[0.24em] text-white/42">Runtime freshness</div>
            <div className="mt-2 text-base font-medium text-white">{runtimeSnapshot.freshness}</div>
          </div>
        </div>
      </div>

      <div className="rounded-[26px] border border-cyan-300/14 bg-cyan-300/[0.06] p-5">
        <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/76">Capability map</div>
        <div className="mt-2 max-w-4xl text-sm leading-7 text-white/68">
          The platform also exposes a compact map showing how recurring ecosystem requirements were translated into product capabilities across private governance, treasury rails, analytics, growth loops, wallet UX, and runtime infrastructure.
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/documents/ecosystem-capability-map-2026" className={cn(buttonVariants({ variant: "secondary" }), "justify-between")}>
            Open capability map
          </Link>
          <Link href="/trust#whitepaper" className={cn(buttonVariants({ variant: "outline" }), "justify-between border-amber-300/24 bg-amber-300/[0.08] text-amber-50 hover:bg-amber-300/[0.13]")}>
            Open Whitepaper
          </Link>
          <Link href="/learn" className={cn(buttonVariants({ variant: "outline" }), "justify-between")}>
            Open learn route
          </Link>
        </div>
      </div>

      <div className="rounded-[26px] border border-sky-300/16 bg-sky-300/[0.07] p-5">
        <div className="text-[11px] uppercase tracking-[0.24em] text-sky-100/78">Current advanced track</div>
        <div className="mt-2 max-w-4xl text-sm leading-7 text-white/68">
          The most current reviewer lane starts with MagicBlock private payments, then branches into Umbra recipient privacy,
          Cloak settlement, and Encrypt / IKA operational privacy. Intelligence is not separate from these lanes; it
          prepares governance, treasury, payroll, and wallet-first action before any signature is requested.
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/services/magicblock-private-payments" className={cn(buttonVariants({ size: "sm" }))}>
            Open MagicBlock lane
          </Link>
          <Link href="/services/encrypt-ika-operations" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open Encrypt / IKA lane
          </Link>
          <Link href="/services/umbra-confidential-payout" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Open Umbra lane
          </Link>
        </div>
      </div>

      <MagicBlockPrivatePaymentsStatus />

      <JudgeFoundationMessageCard />
      <ProjectOperatingMap
        description="Reviewers need a clean system view: governance sets policy, intelligence prepares the decision, treasury selects the route, confidential rails execute private value movement, payroll remains encrypted, and wallet-first UX preserves user control at the final signing edge."
      />

      <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
        <div className="text-[11px] uppercase tracking-[0.24em] text-white/42">Integration fast paths</div>
        <div className="mt-2 max-w-4xl text-sm leading-7 text-white/68">
          Each lane below opens the live feature and the closest proof packet directly, so a reviewer can validate the implementation without digging through the entire site.
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {integrationFastPaths.map(([title, summary, liveHref, proofHref]) => (
            <div key={title} className="rounded-[22px] border border-white/8 bg-black/20 p-4">
              <div className="text-base font-medium text-white">{title}</div>
              <div className="mt-2 text-sm leading-6 text-white/62">{summary}</div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={liveHref} className={cn(buttonVariants({ size: "sm" }))}>
                  Open feature
                </Link>
                <Link href={proofHref} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                  Open proof
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
        <div className="text-[11px] uppercase tracking-[0.24em] text-white/42">Trust path</div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {[
            "What was approved: proposal policy and governance state",
            "What was analyzed: intelligence and runtime context",
            "What was executed: on-chain signatures and receipt lanes",
            "What stayed private: recipient and payout sensitivity",
            "What stayed verifiable: hashes, logs, and proof artifacts",
            "Why each rail exists: governance, privacy, market, proof",
          ].map((item) => (
            <div key={item} className="rounded-2xl border border-white/8 bg-black/20 p-3 text-sm text-white/68">
              {item}
            </div>
          ))}
        </div>
      </div>

      <PlatformCapabilityStack
        title="What the product surface unlocks underneath"
        description="This view is for reviewers who want the shortest bridge from a visible route into the underlying execution core, proof path, learning path, and productized service lane."
      />

      <JudgeSelectiveDisclosureCta />
      <TestnetProofMatrix />
      <DevnetExecutionScreenshotsStrip />
      <PrivacyPolicySelector compact />
      <PrivacyProofExplainer />
      <JudgeTechnologyGuide />
      <JudgeRuntimeLogsPanel />
    </OperationsShell>
  );
}
