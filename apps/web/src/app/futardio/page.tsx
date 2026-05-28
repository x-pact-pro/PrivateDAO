import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Coins, FileText, ShieldCheck } from "lucide-react";

import { OperationsShell } from "@/components/operations-shell";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "Futardio Launch",
  description:
    "PrivateDAO Futardio launch packet with public token fields, legal terms, IP details, raise target, proof routes, and launch assets.",
  path: "/futardio",
  keywords: ["Futardio", "MetaDAO", "PDAO", "PrivateDAO launch", "ownership coin"],
});

const launchFields = [
  ["Token name", "PrivateDAO"],
  ["Ticker", "PDAO"],
  ["Raise goal", "50,000 USDC"],
  ["Monthly spending limit", "6,500 USDC/month"],
  ["Duration", "3 days"],
  ["Team tokens", "2,580,000"],
  ["Unlock", "18 months"],
] as const;

const proofLinks = [
  ["Live product", "/"],
  ["Judge route", "/judge"],
  ["Governance route", "/govern"],
  ["Execution route", "/execute"],
  ["Proof route", "/proof"],
  ["Legal terms", "/legal"],
  ["IP packet", "/documents/futardio-launch-ip-details-2026-05-28"],
] as const;

export default function FutardioLaunchPage() {
  return (
    <OperationsShell
      eyebrow="Futardio Launch"
      title="PDAO launch packet for private on-chain governance"
      description="PrivateDAO is preparing a disciplined Futardio launch around a fixed 50,000 USDC raise target, public legal terms, DAO IP control, wallet-first Testnet proof, and community accountability from day one."
      badges={[
        { label: "PDAO", variant: "cyan" },
        { label: "50K USDC target", variant: "success" },
        { label: "Public accountability", variant: "violet" },
      ]}
    >
      <section className="overflow-hidden rounded-[32px] border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(34,211,238,0.13),rgba(20,241,149,0.07),rgba(5,10,20,0.98))]">
        <img
          src="/assets/launch/privatedao-futardio-banner-16x9.png"
          alt="PrivateDAO Futardio launch banner"
          className="aspect-video w-full object-cover"
        />
        <div className="p-6">
          <div className="flex flex-wrap gap-2">
            <Badge variant="cyan">Private governance</Badge>
            <Badge variant="success">Encrypted treasury</Badge>
            <Badge variant="violet">Verifiable proof</Badge>
          </div>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-white/68">
            PDAO is positioned as a community-backed ownership coin for the next phase of PrivateDAO: moving from live
            Solana Testnet proof toward mainnet-ready private governance infrastructure. The launch materials avoid
            publishing private wallet material and keep mainnet claims gated on review, custody, monitoring, and release
            checks.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {launchFields.map(([label, value]) => (
          <div key={label} className="rounded-[22px] border border-white/10 bg-white/[0.04] p-5">
            <div className="text-[11px] uppercase tracking-[0.24em] text-white/42">{label}</div>
            <div className="mt-3 text-xl font-semibold text-white">{value}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[26px] border border-emerald-300/16 bg-emerald-300/[0.07] p-6">
          <Coins className="h-5 w-5 text-emerald-100" />
          <h2 className="mt-4 text-2xl font-semibold text-white">Use of funds</h2>
          <p className="mt-3 text-sm leading-7 text-white/66">
            20% of the raise goes to liquidity, leaving approximately 40,000 USDC usable operating treasury. The
            6,500 USDC monthly spending limit funds focused execution, infrastructure, security-readiness, public
            documentation, and community onboarding without over-sizing the first raise.
          </p>
        </div>
        <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-6">
          <ShieldCheck className="h-5 w-5 text-cyan-100" />
          <h2 className="mt-4 text-2xl font-semibold text-white">Entity and IP boundary</h2>
          <p className="mt-3 text-sm leading-7 text-white/66">
            The future DAO Cayman SPC entity should hold or control the project package it funds: source code, domains,
            brand assets, launch assets, cloud infrastructure, proof materials, deployed program authorities, and future
            production deployment rights. Private keys, seed phrases, and API secrets stay outside public launch materials.
          </p>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-black/20 p-6">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-violet-100" />
          <h2 className="text-2xl font-semibold text-white">Reviewer links</h2>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {proofLinks.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-2xl border border-white/8 bg-white/[0.045] p-4 text-sm font-medium text-white transition hover:border-cyan-300/24"
            >
              <CheckCircle2 className="mb-3 h-4 w-4 text-emerald-100" />
              {label}
            </Link>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/documents/futardio-launch-ip-details-2026-05-28" className={cn(buttonVariants({ size: "sm" }))}>
            Open IP details
          </Link>
          <a
            href="/assets/launch/privatedao-futardio-token-image-400.png"
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            target="_blank"
            rel="noreferrer"
          >
            Token image
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </section>
    </OperationsShell>
  );
}
