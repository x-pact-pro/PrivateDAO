import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { OperationsShell } from "@/components/operations-shell";
import { TxlineSettlementWorkbench } from "@/components/txline-settlement-workbench";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

const worldCupHackathonLogo =
  "/assets/txline/world-cup-hackathon-logo.png";

export const metadata: Metadata = buildRouteMetadata({
  title: "TxLINE Match Settlement",
  description:
    "PrivateDAO Match Settlement resolves prediction-market outcomes from TxLINE sports data, verifies a hidden settlement policy, and anchors public receipts on Solana.",
  path: "/txline-settlement",
  keywords: ["TxLINE", "TxODDS", "prediction markets", "match settlement", "Groth16", "Solana receipt"],
});

export default function TxlineSettlementPage() {
  return (
    <OperationsShell
      eyebrow="TxODDS / TxLINE Hackathon Product"
      title="World Cup markets settle themselves."
      description="A fan sees the bet resolved. An operator sees the engine: TxLINE validates the match, PrivateDAO proves the settlement policy privately, and Solana keeps the receipt."
      navigationMode="focused"
      badges={[
        { label: "TxLINE data source", variant: "cyan" },
        { label: "Blind settlement proof", variant: "violet" },
        { label: "Solana receipt", variant: "success" },
      ]}
    >
      <section className="grid gap-5 rounded-[28px] border border-cyan-300/16 bg-cyan-300/[0.055] p-4 sm:p-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="World Cup Hackathon"
                className="h-14 w-14 rounded-2xl border border-white/10 bg-white object-contain p-2"
                src={worldCupHackathonLogo}
              />
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/76">World Cup settlement desk</div>
                <h2 className="mt-1 text-3xl font-semibold tracking-[-0.035em] text-white">Investor-simple. Mainnet receipt path.</h2>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-white/66">
              The technology is the engine. The product is the car: pick an official World Cup fixture, settle the market,
              show the proof, and let anyone verify the receipt without learning the operator&apos;s private payout logic.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-white/68 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/24 p-4">
              <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-100/70">Official fixture story</div>
              <div className="mt-2 text-xl">Brazil vs Morocco</div>
              <div className="mt-1 text-white/58">Fixture 17588386 from the TxLINE World Cup schedule.</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/24 p-4">
              <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-100/70">Three-minute promise</div>
              <div className="mt-2 font-semibold text-white">Bet ends. TxLINE validates. Receipt verifies.</div>
              <div className="mt-1 text-white/58">Built exactly for Prediction Markets and Settlement.</div>
            </div>
          </div>
        </div>
        <video
          className="aspect-video w-full rounded-[22px] border border-white/10 bg-black"
          controls
          preload="metadata"
          src="/videos/txline-settlement-demo-3min.mp4"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {[
          ["1. Fan action", "Choose a World Cup market from an official TxLINE fixture ID."],
          ["2. Data engine", "TxLINE score validation feeds the settlement packet and CPI-ready validate_stat target."],
          ["3. Public trust", "Private policy stays hidden while the public proof and Solana receipt stay verifiable."],
        ].map(([title, copy]) => (
          <article key={title} className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-200/20 bg-cyan-300/[0.08] text-cyan-100">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="mt-4 text-lg font-semibold text-white">{title}</div>
            <p className="mt-2 text-sm leading-7 text-white/62">{copy}</p>
          </article>
        ))}
      </section>

      <TxlineSettlementWorkbench />

      <section className="rounded-[28px] border border-violet-300/16 bg-violet-300/[0.06] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-violet-100/76">Investor version</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Prediction markets need a neutral scoreboard and a private settlement engine.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/64">
          TxLINE supplies cryptographically verifiable sports data. PrivateDAO turns that data into a buyer-facing
          settlement product for markets, pools, contests, and payout review. The customer gets a clean result; the
          operator keeps risk rules private; reviewers get hashes, proof status, and a receipt they can check.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/developers/txline-settlement-api" className={cn(buttonVariants({ size: "sm" }))}>
            Developer API
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/documents/txline-settlement-architecture" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Architecture
          </Link>
        </div>
      </section>
    </OperationsShell>
  );
}
