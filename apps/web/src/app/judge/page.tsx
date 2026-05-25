import type { Metadata } from "next";
import { ArrowUpRight, Award, BarChart3 } from "lucide-react";
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

const ENCRYPTED_INTEGRATIONS_2026_05_23 = {
  title: "Encrypted integrations activated — 2026-05-23",
  description:
    "REFHE envelope + MagicBlock corridor executed on-chain. Treasury: 60M -> 10M tokens. Recipient: 0 -> 50M tokens.",
  txs: [
    {
      label: "REFHE configure",
      sig: "3fygnmHzFpRQEbHq9q6u3djBnkTEcYz9y1TSwxDmbnuemshrMwLmy9CqpjifjRb7SmW3DbmXrkyq35cnjU7mMSPi",
      status: "finalized" as const,
    },
    {
      label: "MagicBlock configure",
      sig: "4UiUumtuGeDciojDA26PkQby7RFiTNb12UG4ACcvGMGfQj24PUPxK5Apeno7EY8mbCvq8nR6h6nfxDcBpjPvGvPj",
      status: "finalized" as const,
    },
    {
      label: "REFHE settle",
      sig: "5TmS2AcpAmifcoG97U63Unzy7wt7B2NfyhBRs8Z6C4r1eqcWthEqf3GLcZXQ33sVYHf9YwfvBNhZD8ZZdt4HRwEY",
      status: "finalized" as const,
    },
    {
      label: "MagicBlock settle",
      sig: "22XW8XVhWwQtChNQK2aEqXv5BVBbckxUmu4NsisoZQW21KA5ii87gVNUTcNoZ9e1vYKnHmm62qP1girpzVXWN1WY",
      status: "finalized" as const,
    },
    {
      label: "executeConfidentialPayoutPlanV3 — token moved",
      sig: "2a8sHWgiVCZkstybMff2M9R6DVU4Y96Rfsg8mqYs7K3xcYSEG1zMcq2iSTNwLD6FgfXvxxxWpwEP9Tbyin47RXvE",
      status: "finalized" as const,
      highlight: true,
    },
  ],
  cluster: "testnet",
  programId: "EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva",
};

export const metadata: Metadata = buildRouteMetadata({
  title: "Verification Route",
  description:
    "Fast verification route for inspecting the DAO lifecycle, real Testnet transactions, agentic treasury micropayments, and the clearest proof surfaces inside PrivateDAO.",
  path: "/judge",
  keywords: ["verification", "testnet proof", "micropayments", "governance proof"],
});

export default function JudgePage() {
  const runtimeSnapshot = getJudgeRuntimeLogsSnapshot();
  const liveEvidence = [
    {
      label: "ZK verifier deployed on-chain",
      value: "Program 5H7Afy...AW1j",
      detail: "Receipt tx zwqNsA3k...cdEah67 on Solana Testnet. Native BN254 pairing syscall path is live in a standalone verifier.",
      href: "https://solscan.io/tx/zwqNsA3kNP1mgcaS6zNdR92LLdssFULXfsRdkMK3UxraKLM6wYDoPaWCwV3J9PqApK5xJJH8TpxsGyCRcdEah67?cluster=testnet",
      cta: "Open receipt",
    },
    {
      label: "Squads 2-of-3 approved",
      value: "Vault CALHr...PqBv",
      detail:
        "Current proposal index 3 reached threshold with signer approvals 4rcv9Eyf... and 3giWXof...; enforced timelock release 2026-05-27T02:25:39Z.",
      href: "/documents/squads-current-binary-upgrade-proposal-2026-05-25",
      cta: "Open proposal proof",
    },
    {
      label: "Timelock enforcement demonstrated",
      value: "6021 TimeLockNotReleased",
      detail: "Even threshold-approved multisig execution cannot bypass the active 48-hour delay. Recorded in the proof packet and current proposal 3 status.",
      href: "/documents/timelock-enforcement-proof-2026-05-23",
      cta: "Open timelock proof",
    },
    {
      label: "PDAO Token-2022 fixed supply",
      value: "1,000,000 PDAO",
      detail: "Mint DFYvBdiv...37Bie is live on Testnet with mint authority disabled and metadata published.",
      href: "/documents/pdao-token-surface",
      cta: "Open token proof",
    },
    {
      label: "Production readiness aggregate",
      value: "API + stream + proof",
      detail: "One live JSON route summarizes read-node health, QuickNode stream stats, visitor counters, execution counters, freshness, and public verification links.",
      href: "https://api.privatedao.org/api/v1/readiness",
      cta: "Open readiness JSON",
    },
  ];
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
      <section className="rounded-[30px] border border-cyan-300/24 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.20),transparent_34%),linear-gradient(135deg,rgba(14,165,233,0.12),rgba(20,241,149,0.09),rgba(8,13,28,0.95))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.30)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-100/78">Encrypted execution proof</div>
            <h2 className="mt-3 max-w-4xl text-2xl font-semibold text-white">{ENCRYPTED_INTEGRATIONS_2026_05_23.title}</h2>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-white/66">{ENCRYPTED_INTEGRATIONS_2026_05_23.description}</p>
            <div className="mt-3 break-all text-xs leading-6 text-white/48">
              Program: <span className="font-mono text-cyan-100">{ENCRYPTED_INTEGRATIONS_2026_05_23.programId}</span> · Cluster:{" "}
              <span className="font-mono text-emerald-100">{ENCRYPTED_INTEGRATIONS_2026_05_23.cluster}</span>
            </div>
          </div>
          <Link href="/documents/testnet-encrypted-integrations-activation-2026-05-23" className={cn(buttonVariants({ variant: "secondary" }), "shrink-0")}>
            Open activation packet
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {ENCRYPTED_INTEGRATIONS_2026_05_23.txs.map((tx) => (
            <a
              key={tx.sig}
              href={`https://solscan.io/tx/${tx.sig}?cluster=testnet`}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "rounded-[22px] border bg-black/24 p-4 transition hover:bg-black/32",
                tx.highlight
                  ? "border-emerald-300/42 shadow-[0_0_34px_rgba(20,241,149,0.14)]"
                  : "border-white/10 hover:border-cyan-300/28",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-100/62">{tx.status}</div>
                {tx.highlight ? (
                  <span className="rounded-full border border-emerald-300/28 bg-emerald-300/[0.10] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                    token moved
                  </span>
                ) : null}
              </div>
              <div className="mt-3 text-sm font-semibold leading-6 text-white">{tx.label}</div>
              <div className="mt-2 break-all font-mono text-[11px] leading-5 text-white/54">{tx.sig}</div>
              <div className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-cyan-100">
                Open Solscan
                <ArrowUpRight className="h-3.5 w-3.5" />
              </div>
            </a>
          ))}
        </div>
      </section>
      <div className="rounded-[30px] border border-emerald-300/22 bg-[radial-gradient(circle_at_top_left,rgba(20,241,149,0.18),transparent_34%),linear-gradient(135deg,rgba(20,241,149,0.10),rgba(0,194,255,0.08),rgba(8,13,28,0.94))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-emerald-100/78">2026-05-23 live evidence</div>
            <h2 className="mt-3 max-w-4xl text-2xl font-semibold text-white">
              Fresh Testnet custody, ZK, timelock, and Token-2022 proof is visible before the archived judge logs.
            </h2>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-white/64">
              This panel is the current reviewer entry point. It separates live Testnet evidence from older Devnet
              packets, and links every high-impact claim to a transaction, document, or proof surface.
            </p>
          </div>
          <Link href="/security" className={cn(buttonVariants({ variant: "secondary" }), "shrink-0")}>
            Open security route
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {liveEvidence.map((item) => {
            const isExternal = item.href.startsWith("http");
            const className = "rounded-[24px] border border-white/10 bg-black/24 p-4 transition hover:border-emerald-300/28 hover:bg-black/30";
            const content = (
              <>
                <div className="text-[10px] uppercase tracking-[0.24em] text-emerald-100/58">{item.label}</div>
                <div className="mt-2 text-lg font-semibold text-white">{item.value}</div>
                <p className="mt-2 text-sm leading-6 text-white/58">{item.detail}</p>
                <div className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-cyan-100">
                  {item.cta}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </div>
              </>
            );

            return isExternal ? (
              <a key={item.label} href={item.href} target="_blank" rel="noreferrer" className={className}>
                {content}
              </a>
            ) : (
              <Link key={item.label} href={item.href} className={className}>
                {content}
              </Link>
            );
          })}
        </div>
      </div>
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

      <div className="rounded-[26px] border border-emerald-300/16 bg-[linear-gradient(135deg,rgba(20,241,149,0.11),rgba(8,13,28,0.92))] p-5">
        <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-100/78">Business model judges can inspect</div>
        <div className="mt-2 max-w-4xl text-sm leading-7 text-white/68">
          PrivateDAO monetizes without overstating mainnet maturity: open-source Testnet adoption builds trust, a
          <span className="font-semibold text-white"> $2,500 four-week pilot</span> proves one buyer workflow, a
          <span className="font-semibold text-white"> $750/month managed plan</span> supports recurring private operations,
          and sovereign deployments capture teams that need dedicated infrastructure and controls.
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/pricing" className={cn(buttonVariants({ size: "sm" }))}>
            Open pricing
          </Link>
          <Link href="/revenue" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open revenue model
          </Link>
          <Link href="/documents/pilot-program" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Open pilot program
          </Link>
        </div>
      </div>

      <div className="rounded-[26px] border border-fuchsia-300/16 bg-[linear-gradient(135deg,rgba(217,70,239,0.10),rgba(56,189,248,0.07),rgba(8,13,28,0.92))] p-5">
        <div className="flex items-center gap-2 text-fuchsia-100">
          <BarChart3 className="h-4 w-4" />
          <div className="text-[11px] uppercase tracking-[0.24em]">Frontier completion map</div>
        </div>
        <div className="mt-2 max-w-4xl text-sm leading-7 text-white/68">
          The judge path shows how large adjacent product types are completed inside one operating layer: governed
          intelligence, confidential treasury, payroll, payments, Android access, Testnet proof, and a buyer-readable
          pilot path in one product surface.
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/documents/frontier-adjacent-project-completion-map-2026-05-22" className={cn(buttonVariants({ size: "sm" }))}>
            Open completion map
          </Link>
          <Link href="/android" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open Android parity
          </Link>
          <Link href="/services" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Open service map
          </Link>
        </div>
      </div>

      <div className="rounded-[26px] border border-emerald-300/16 bg-[linear-gradient(135deg,rgba(20,241,149,0.10),rgba(0,194,255,0.07),rgba(8,13,28,0.92))] p-5">
        <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-100/78">10-level improvement map</div>
        <div className="mt-2 max-w-4xl text-sm leading-7 text-white/68">
          The current upgrade path is organized as ten product levels: first-minute understanding, wallet execution,
          Android parity, proof continuity, confidential operations, intelligence before signing, business conversion,
          security discipline, repository reviewability, and judging-grade narrative.
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/documents/grand-champion-10-level-improvement-map-2026-05-22" className={cn(buttonVariants({ size: "sm" }))}>
            Open 10-level map
          </Link>
          <Link href="/start" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open start route
          </Link>
          <Link href="/pricing" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Open business path
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
