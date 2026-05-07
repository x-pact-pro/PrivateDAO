import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, BrainCircuit, Gift, ShieldCheck, Sparkles, WalletCards } from "lucide-react";

import { GuidedOperationRail } from "@/components/guided-operation-rail";
import { OperationsShell } from "@/components/operations-shell";
import { SectionHeader } from "@/components/section-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "theMiracle Benefit",
  description:
    "PrivateDAO wallet-placement benefit design for DeFi-active Solana governance wallets: connect, submit one confidential proposal, and unlock Founding Governor access.",
  path: "/benefit",
  keywords: ["theMiracle", "wallet placement", "Solflare", "MetaMask", "benefit", "PrivateDAO", "Founding Governor"],
});

const benefitBlocks = [
  {
    label: "Audience",
    icon: WalletCards,
    body:
      "DeFi-active Solana wallets with on-chain governance history: DAO token holders, treasury participants, grant voters, and wallets that have interacted with voting, multisig, stablecoin, DeFi, or payout flows.",
  },
  {
    label: "Action",
    icon: BadgeCheck,
    body:
      "Connect a Solana Testnet wallet to PrivateDAO, create or join a private DAO workspace, and submit one confidential governance proposal through the wallet-first guided flow.",
  },
  {
    label: "Incentive",
    icon: Gift,
    body:
      "$5,000+ perceived value across completing users: 3 months of Founding Governor access, private settlement lane access for confidential payroll rehearsals, V3 hardening beta access, QVAC local AI assistant access, and a non-transferable Founding Governor SBT.",
  },
  {
    label: "Value",
    icon: Sparkles,
    body:
      "The first treasury vote a user can keep private, verify publicly, and connect to a confidential payout path without touching a terminal or learning the cryptography underneath.",
  },
];

const proofLinks = [
  { label: "Open live dApp preview", href: "https://preview.eitherway.ai/169057d4-cf4e-4a3e-88e5-2fe436eac112/" },
  { label: "Open benefit proposal doc", href: "/documents/themiracle-benefit-proposal" },
  { label: "Start wallet flow", href: "/start" },
  { label: "Verify proof", href: "/proof/?judge=1" },
];

export default function BenefitPage() {
  return (
    <OperationsShell
      eyebrow="Wallet placement benefit"
      title="A wallet-native benefit for governance users who should experience private treasury operations first"
      description="PrivateDAO turns theMiracle placement into one clear action: qualified Solana wallets connect, submit a confidential proposal, and receive a concrete Founding Governor benefit tied to the product they just used."
      badges={[
        { label: "theMiracle-ready", variant: "warning" },
        { label: "$5,000+ value design", variant: "success" },
        { label: "Wallet-first", variant: "cyan" },
      ]}
    >
      <GuidedOperationRail current="connect" reviewHref="/intelligence" verifyHref="/proof" />

      <section className="overflow-hidden rounded-[34px] border border-emerald-300/18 bg-[radial-gradient(circle_at_12%_0%,rgba(20,241,149,0.2),transparent_34%),radial-gradient(circle_at_90%_20%,rgba(0,194,255,0.16),transparent_32%),linear-gradient(180deg,rgba(7,14,28,0.96),rgba(4,7,16,0.99))] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)] sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div className="space-y-5">
            <div className="inline-flex rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-100/80">
              Audience {"->"} Action {"->"} Incentive {"->"} Value
            </div>
            <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              Put PrivateDAO directly in front of wallets already showing governance and treasury intent.
            </h2>
            <p className="max-w-2xl text-base leading-8 text-white/64">
              The campaign is designed for conversion inside wallet UI: one high-intent audience, one measurable action,
              one useful product reward, and one durable reason to return.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/start" className={cn(buttonVariants({ size: "lg" }), "shadow-[0_0_60px_rgba(20,241,149,0.14)]")}>
                Claim Your Founding Governor Access
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <a
                href="https://preview.eitherway.ai/169057d4-cf4e-4a3e-88e5-2fe436eac112/"
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
              >
                Open Eitherway preview
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          <Card className="border-white/12 bg-black/24">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-cyan-300/18 bg-cyan-300/10 p-3 text-cyan-100">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <CardTitle>Why this benefit fits the wallet surface</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-7 text-white/64">
              <p>
                Wallet placement works when the user can understand the next move without leaving the wallet mindset.
                PrivateDAO asks for one action: submit a confidential governance proposal.
              </p>
              <p>
                The reward is product-native. Users receive access to the private settlement, V3 hardening, and local QVAC
                intelligence paths that make the first action more valuable after completion.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <div>
        <SectionHeader
          eyebrow="Benefit design"
          title="Four fields, one measurable campaign"
          description="The benefit is written in the structure theMiracle asks for, with every claim tied back to a live route or reviewer document."
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {benefitBlocks.map((block) => {
          const Icon = block.icon;
          return (
            <Card key={block.label} className="border-white/10 bg-white/[0.035]">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-emerald-300/18 bg-emerald-300/10 p-3 text-emerald-100">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle>{block.label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-sm leading-8 text-white/64">{block.body}</CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-cyan-300/16 bg-cyan-300/[0.07]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-cyan-300/18 bg-cyan-300/10 p-3 text-cyan-100">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <CardTitle>Campaign success definition</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm leading-8 text-white/64 lg:grid-cols-[1fr_0.9fr]">
          <p>
            Success means qualified wallets connect, complete the first confidential proposal, and generate wallet-level
            conversion data that tells PrivateDAO which governance, DeFi, gaming, and stablecoin operators are most ready
            for private treasury operations.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {proofLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel={link.href.startsWith("http") ? "noreferrer" : undefined}
                className="inline-flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white/76 transition hover:border-cyan-300/28 hover:text-white"
              >
                {link.label}
                <ArrowUpRight className="h-4 w-4" />
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </OperationsShell>
  );
}
