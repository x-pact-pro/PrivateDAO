import Link from "next/link";
import { ArrowUpRight, Clock3, ShieldCheck, UsersRound } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const defaultProofFacts = [
  {
    label: "Program",
    value: "EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva",
    icon: ShieldCheck,
  },
  {
    label: "Multisig",
    value: "Squads v4, 2-of-3 threshold",
    icon: UsersRound,
  },
  {
    label: "Timelock",
    value: "48 hours before protected execution",
    icon: Clock3,
  },
] as const;

type ExplainerFact = {
  label: string;
  value: string;
};

type ExplainerAction = {
  label: string;
  href: string;
  variant?: "primary" | "secondary" | "outline";
};

export type SectionExplainerVariant =
  | "post-governance"
  | "start"
  | "treasury"
  | "payments"
  | "payroll"
  | "security"
  | "intelligence"
  | "android"
  | "services"
  | "execute"
  | "proof";

type SectionExplainerConfig = {
  eyebrow: string;
  title: string;
  description: string;
  asset: string;
  facts: readonly ExplainerFact[];
  actions: readonly ExplainerAction[];
};

const sectionExplainers: Record<SectionExplainerVariant, SectionExplainerConfig> = {
  "post-governance": {
    eyebrow: "Brand explainer",
    title: "The simple story: governance passes, then PrivateDAO runs the work.",
    description:
      "This short brand video is separate from the live demo. It explains why teams keep Telegram and Discord for conversation, then move review, approval, execution, and audit into a wallet-first Solana Testnet flow.",
    asset: "private-dao-post-governance-brander",
    facts: defaultProofFacts,
    actions: [
      { label: "Run PrivateDAO workflow", href: "/review?claim=metadao-grant-review-workflow#privacy-claim-console", variant: "primary" },
      { label: "Open governance procedure", href: "/govern", variant: "secondary" },
      { label: "Verify multisig", href: "/documents/squads-testnet-custody-transfer-2026-05-22", variant: "outline" },
      { label: "Verify timelock", href: "/documents/timelock-enforcement-proof-2026-05-23", variant: "outline" },
    ],
  },
  start: {
    eyebrow: "First-run explainer",
    title: "Start with one wallet, one Testnet path, and one proof trail.",
    description:
      "The start route removes architecture shock. The visitor connects, gets Testnet SOL, runs a governed action, and verifies the receipt without needing a terminal or a separate demo script.",
    asset: "private-dao-start-explainer",
    facts: [
      { label: "Entry", value: "Connect -> Fund -> Govern -> Verify" },
      { label: "User", value: "No code, no terminal, wallet-first" },
      { label: "Proof", value: "Receipts and explorer links stay one click away" },
    ],
    actions: [
      { label: "Start governance flow", href: "/govern", variant: "primary" },
      { label: "Get Testnet SOL", href: "https://faucet.solana.com/", variant: "outline" },
      { label: "Open proof", href: "/proof?judge=1", variant: "secondary" },
    ],
  },
  treasury: {
    eyebrow: "Treasury explainer",
    title: "Treasury work should be private before execution and verifiable after it.",
    description:
      "The treasury route explains budget risk, route quality, stablecoin movement, and governed execution before a signer approves anything from the wallet.",
    asset: "private-dao-treasury-explainer",
    facts: [
      { label: "Pain", value: "Public wallets expose strategy before action" },
      { label: "Path", value: "Review risk -> Select route -> Execute -> Audit" },
      { label: "Rails", value: "Jupiter, PUSD, read-node proof, Testnet receipts" },
    ],
    actions: [
      { label: "Open treasury", href: "/treasury", variant: "primary" },
      { label: "Open Jupiter route", href: "/services/jupiter-treasury-route", variant: "secondary" },
      { label: "Open proof", href: "/proof", variant: "outline" },
    ],
  },
  payments: {
    eyebrow: "Private payments explainer",
    title: "Payments need privacy for the reason, and proof for the outcome.",
    description:
      "The confidential payments lane turns sensitive payout intent into encrypted metadata, wallet review, settlement receipt, and a verifier-visible proof path.",
    asset: "private-dao-payments-explainer",
    facts: [
      { label: "Pain", value: "Public payment reasons leak operations" },
      { label: "Path", value: "Encrypt intent -> Sign -> Settle -> Verify" },
      { label: "Rails", value: "Cloak, Umbra, MagicBlock, Solana memo anchoring" },
    ],
    actions: [
      { label: "Open payments lane", href: "/services/confidential-payments", variant: "primary" },
      { label: "Open services", href: "/services", variant: "secondary" },
      { label: "Open proof", href: "/proof", variant: "outline" },
    ],
  },
  payroll: {
    eyebrow: "Payroll explainer",
    title: "Payroll should not turn every contributor into a public salary row.",
    description:
      "The payroll route explains how a private manifest, wallet-signed rehearsal, settlement receipt, and proof path make compensation easier to operate without exposing sensitive details.",
    asset: "private-dao-payroll-explainer",
    facts: [
      { label: "Pain", value: "Public payroll creates internal friction" },
      { label: "Path", value: "Encrypt manifest -> Sign payout -> Verify receipt" },
      { label: "Proof", value: "Private amounts stay scoped; outcomes stay reviewable" },
    ],
    actions: [
      { label: "Open payroll", href: "/payroll", variant: "primary" },
      { label: "Open confidential payments", href: "/services/confidential-payments", variant: "secondary" },
      { label: "Open proof", href: "/proof?judge=1", variant: "outline" },
    ],
  },
  security: {
    eyebrow: "Security explainer",
    title: "Security coordination needs privacy before disclosure and proof after response.",
    description:
      "The security route explains incident rooms, emergency governance, custody, timelocks, encrypted execution rails, and public evidence without exposing the sensitive investigation path.",
    asset: "private-dao-security-explainer",
    facts: [
      { label: "Custody", value: "Squads v4, 2-of-3, 48h timelock" },
      { label: "Response", value: "Incident room -> Emergency approval -> Audit" },
      { label: "Proof", value: "ZK, REFHE, MagicBlock and settlement evidence" },
    ],
    actions: [
      { label: "Open security", href: "/security", variant: "primary" },
      { label: "Verify timelock", href: "/documents/timelock-enforcement-proof-2026-05-23", variant: "secondary" },
      { label: "Open privacy matrix", href: "/documents/privacy-execution-matrix-2026-05-26", variant: "outline" },
    ],
  },
  intelligence: {
    eyebrow: "Intelligence explainer",
    title: "AI should explain risk before a wallet signs, not decorate the page.",
    description:
      "The intelligence route turns proposal context, treasury risk, RPC quality, operational drift, and continuity memory into a signer-facing review gate.",
    asset: "private-dao-intelligence-explainer",
    facts: [
      { label: "Pain", value: "Teams sign before understanding operational risk" },
      { label: "Path", value: "Summarize -> Score -> Route -> Approve" },
      { label: "Rails", value: "QVAC, GoldRush, QuickNode stream intelligence" },
    ],
    actions: [
      { label: "Open intelligence", href: "/intelligence", variant: "primary" },
      { label: "Open execute", href: "/execute", variant: "secondary" },
      { label: "Open proof", href: "/proof", variant: "outline" },
    ],
  },
  android: {
    eyebrow: "Android explainer",
    title: "The same private operating path should work from a mobile wallet.",
    description:
      "The Android route explains how the APK and live web flow stay aligned: connect, review, sign, and verify with the same Solana Testnet evidence surface.",
    asset: "private-dao-android-explainer",
    facts: [
      { label: "Mobile", value: "Wallet Adapter-compatible Testnet flow" },
      { label: "Parity", value: "Web proof and Android runtime stay connected" },
      { label: "User", value: "Download, connect, sign, verify" },
    ],
    actions: [
      { label: "Open Android", href: "/android", variant: "primary" },
      { label: "Open start", href: "/start", variant: "secondary" },
      { label: "Open proof", href: "/proof", variant: "outline" },
    ],
  },
  services: {
    eyebrow: "Services explainer",
    title: "Services are not random integrations; they are operating lanes.",
    description:
      "The services route groups integrations into buyer-readable lanes: governance, treasury, private payments, payroll, intelligence, proof, and hosted read-node operations.",
    asset: "private-dao-services-explainer",
    facts: [
      { label: "Pain", value: "Tool lists hide the real workflow" },
      { label: "Path", value: "Pick lane -> Prepare claim -> Execute -> Verify" },
      { label: "Buyer", value: "Pilot, hosted API, support, proof package" },
    ],
    actions: [
      { label: "Open services", href: "/services", variant: "primary" },
      { label: "Open claim console", href: "/services?claim=metadao-grant-review-workflow#privacy-claim-console", variant: "secondary" },
      { label: "Open API status", href: "/api-status", variant: "outline" },
    ],
  },
  execute: {
    eyebrow: "Execution explainer",
    title: "Execution starts only after review, approval, and policy gates are clear.",
    description:
      "The execute route explains what a user is about to sign, why timelock and policy checks matter, and where the final receipt can be verified.",
    asset: "private-dao-execute-explainer",
    facts: [
      { label: "Sequence", value: "Review -> Sign -> Execute -> Verify" },
      { label: "Guard", value: "Policy, recipient, timelock, and proof checks" },
      { label: "Outcome", value: "Receipt, explorer link, and audit continuity" },
    ],
    actions: [
      { label: "Open execute", href: "/execute", variant: "primary" },
      { label: "Open govern", href: "/govern", variant: "secondary" },
      { label: "Open proof", href: "/proof", variant: "outline" },
    ],
  },
  proof: {
    eyebrow: "Proof explainer",
    title: "Privacy is useful only when the outcome remains verifiable.",
    description:
      "The proof route explains explorer links, API receipts, ZK evidence, custody packets, and reviewer-visible audit trails in one place.",
    asset: "private-dao-proof-explainer",
    facts: [
      { label: "Evidence", value: "On-chain signatures, receipts, ZK and custody docs" },
      { label: "Audience", value: "User, reviewer, auditor, operator" },
      { label: "Rule", value: "Private process, verifiable outcome" },
    ],
    actions: [
      { label: "Open proof", href: "/proof", variant: "primary" },
      { label: "Open judge hub", href: "/judge", variant: "secondary" },
      { label: "Open documents", href: "/documents", variant: "outline" },
    ],
  },
};

type SectionExplainerVideoProps = {
  variant: SectionExplainerVariant;
  compact?: boolean;
};

export function SectionExplainerVideo({ variant, compact = false }: SectionExplainerVideoProps) {
  const config = sectionExplainers[variant];
  const poster = `/assets/launch/${config.asset}-poster.png`;
  const video = `/assets/launch/${config.asset}.mp4`;

  return (
    <section className="min-w-0 overflow-hidden rounded-[28px] border border-cyan-300/16 bg-[radial-gradient(circle_at_top_left,rgba(20,241,149,0.12),transparent_34%),radial-gradient(circle_at_100%_0%,rgba(153,69,255,0.16),transparent_32%),rgba(3,8,20,0.94)] p-4 sm:p-5">
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] xl:items-center">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/72">{config.eyebrow}</div>
          <h2 className="mt-3 max-w-4xl text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">
            {config.title}
          </h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-white/64">{config.description}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {config.facts.map((fact, index) => {
              const Icon = defaultProofFacts[index]?.icon ?? ShieldCheck;
              return (
                <div key={fact.label} className="min-w-0 rounded-2xl border border-white/10 bg-black/22 p-4">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/44">
                    <Icon className="h-4 w-4 shrink-0 text-emerald-100/80" />
                    {fact.label}
                  </div>
                  <div className="mt-2 break-words text-sm font-semibold leading-6 text-white/82">{fact.value}</div>
                </div>
              );
            })}
          </div>

          {!compact ? (
            <div className="mt-5 flex flex-wrap gap-3">
              {config.actions.map((action, index) => {
                const variantName = action.variant === "primary" ? undefined : action.variant;
                const isExternal = action.href.startsWith("http");
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noreferrer" : undefined}
                    className={cn(buttonVariants({ size: "sm", variant: variantName }))}
                  >
                    {action.label}
                    {index === 0 ? <ArrowUpRight className="h-4 w-4" /> : null}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="min-w-0 rounded-[24px] border border-white/10 bg-black/30 p-2 shadow-2xl shadow-black/30">
          <video
            className="aspect-video w-full rounded-[18px] bg-black object-cover"
            controls
            playsInline
            preload="metadata"
            poster={poster}
            src={video}
          />
        </div>
      </div>
    </section>
  );
}

type PostGovernanceBranderVideoProps = {
  compact?: boolean;
};

export function PostGovernanceBranderVideo({ compact = false }: PostGovernanceBranderVideoProps) {
  return <SectionExplainerVideo variant="post-governance" compact={compact} />;
}
