import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Layers3 } from "lucide-react";

import { OperationsShell } from "@/components/operations-shell";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "PrivateDAO Pitch Deck",
  description:
    "PrivateDAO pitch deck: confidential coordination infrastructure for Solana organizations, covering vision, problem, market, product, architecture, use cases, ecosystem, roadmap, team, and contact.",
  path: "/deck",
  keywords: ["PrivateDAO deck", "PrivateDAO pitch deck", "confidential coordination infrastructure", "Solana organizations"],
});

const slides = [
  {
    title: "1. Vision",
    body: "PrivateDAO is confidential coordination infrastructure for organizations on Solana. Governance is the first use case; the larger opportunity is private operational coordination with public verification.",
  },
  {
    title: "2. Problem",
    body: "The least decentralized part of every DAO is everything before and after the vote: Telegram threads, DMs, spreadsheets, trusted operators, payroll coordination, and treasury routing.",
  },
  {
    title: "3. Market",
    body: "Solana organizations, grant programs, DAOs, foundations, contributors, security councils, and AI-assisted operators need privacy-preserving coordination as their treasuries and workflows mature.",
  },
  {
    title: "4. Product",
    body: "Connect -> Intelligence -> Private Vote -> Reveal -> Verify -> Execute. The user sees a simple workflow while PrivateDAO handles privacy, authority routing, receipts, and proof.",
  },
  {
    title: "5. Architecture",
    body: "Solana Testnet programs, wallet-first UX, Supabase metadata, QuickNode runtime data, AWS APIs, QVAC intelligence, provider boundaries, and proof reports compose the operating layer.",
  },
  {
    title: "6. Use Cases",
    body: "Private governance, treasury requests, payroll, confidential payouts, grants, private rooms, contributor management, security incident coordination, and agent-assisted operations.",
  },
  {
    title: "7. Ecosystem",
    body: "PrivateDAO is designed around modular provider rails: Solana, Anchor, QVAC, QuickNode, Supabase, Jupiter, GoldRush/Covalent, PUSD, MagicBlock, Umbra-compatible payout boundaries, and future providers.",
  },
  {
    title: "8. Roadmap",
    body: "Short term: clearer product entry and stronger Testnet proof. Next: deeper private rooms, treasury execution, QVAC local intelligence, and partner pilots. Later: production security review, real operating use on Solana, then disciplined cross-chain expansion.",
  },
  {
    title: "9. Team",
    body: "Founder-built by Fahd Kotb with public repository history, live website, public proof routes, competition evidence, and prior confidential payroll work.",
  },
  {
    title: "10. Contact",
    body: "Investor and partner conversations: Fahd.kotb@tuta.io, Fahdkotb.8888@gmail.com, I.Kotb@proton.me, X @privateDAOOS, Telegram @Fahdkotb.",
  },
] as const;

const metrics = [
  ["Live product", "privatedao.org"],
  ["Demo", "/try"],
  ["Proof", "/proof"],
  ["Investors", "/investors"],
  ["Thesis", "/thesis"],
  ["GitHub", "github.com/X-PACT/PrivateDAO"],
] as const;

const priorWork = [
  ["Confidential Payroll live console", "https://confidential-payroll-henna.vercel.app/frontend"],
  ["Confidential Payroll GitHub", "https://github.com/X-PACT/confidential-payroll"],
] as const;

const colosseumResources = [
  [
    "Phantom Connect",
    "Immediate wallet UX lane",
    "Use embedded/email onboarding to make the Testnet flow easier for non-crypto operators while preserving wallet-first signing.",
    "https://docs.phantom.com/phantom-connect",
  ],
  [
    "Squads Multisig / Altitude",
    "Treasury authority lane",
    "Map treasury execution and upgrade authority into multisig-backed organizational controls for serious teams.",
    "https://squads.xyz/multisig",
  ],
  [
    "Arcium",
    "Encrypted computation rail",
    "Evaluate encrypted computation for private voting, sealed scoring, treasury review, and future confidential workflows.",
    "https://docs.arcium.com/developers",
  ],
  [
    "World ID",
    "Human reviewer proof",
    "Add optional proof-of-human gating for reviewers or private rooms without exposing a user's full identity across apps.",
    "https://docs.world.org/world-id/idkit/integrate",
  ],
  [
    "Vanish",
    "Private execution research lane",
    "Study private swap and wallet unlinking patterns for treasury privacy and private execution without changing the public UX.",
    "https://core.vanish.trade",
  ],
  [
    "Helius / Triton / FluxRPC",
    "RPC redundancy lane",
    "Keep QuickNode as the current runtime path while preparing provider redundancy for reads, streams, and reviewer telemetry.",
    "https://www.helius.dev/pricing",
  ],
] as const;

export default function DeckPage() {
  return (
    <OperationsShell
      eyebrow="Pitch deck"
      title="PrivateDAO: Confidential Coordination Infrastructure for Solana Organizations"
      description="A concise investor and reviewer deck: one thesis, ten sections, and direct links into the live product and proof routes."
      navigationMode="guided"
      badges={[
        { label: "10 sections", variant: "cyan" },
        { label: "Live Testnet", variant: "success" },
        { label: "Investor-ready", variant: "violet" },
      ]}
    >
      <section className="rounded-[30px] border border-emerald-300/18 bg-[radial-gradient(circle_at_top_left,rgba(20,241,149,0.16),transparent_34%),linear-gradient(135deg,rgba(7,13,26,0.98),rgba(4,7,18,0.98))] p-5 sm:p-7">
        <div className="max-w-4xl">
          <div className="flex items-center gap-3 text-emerald-100">
            <Layers3 className="h-5 w-5" />
            <span className="text-[11px] uppercase tracking-[0.28em]">Core message</span>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.045em] text-white sm:text-5xl">
            Organizations need secure coordination, not just voting.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-white/68">
            PrivateDAO lets organizations coordinate privately, execute workflows verifiably, and reveal final outcomes
            with public accountability.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/try" className={cn(buttonVariants({ size: "sm" }))}>
              Open demo
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link href="/proof/?judge=1" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
              Verify proof
            </Link>
            <Link href="/investors" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              Investor page
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <div className="text-sm font-semibold text-white">{label}</div>
            <div className="mt-2 font-mono text-xs text-white/48">{value}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {slides.map((slide) => (
          <article key={slide.title} className="rounded-[28px] border border-white/10 bg-black/24 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <BadgeCheck className="mt-1 h-4 w-4 shrink-0 text-emerald-100" />
              <div>
                <h2 className="text-xl font-semibold text-white">{slide.title}</h2>
                <p className="mt-3 text-sm leading-7 text-white/64">{slide.body}</p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-[28px] border border-cyan-300/16 bg-cyan-300/[0.06] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-cyan-100/76">Pitch line</div>
        <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">
          PrivateDAO is the layer for everything that happens before and after governance.
        </p>
      </section>

      <section className="rounded-[28px] border border-emerald-300/16 bg-emerald-300/[0.06] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-emerald-100/76">Colosseum resource alignment</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Sponsor tools are mapped to product lanes, not pasted as logos.</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/64">
          PrivateDAO keeps the user journey simple while using Colosseum resources as modular rails behind wallet UX,
          treasury authority, encrypted computation, reviewer identity, private execution research, and RPC redundancy.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {colosseumResources.map(([name, lane, body, href]) => (
            <a key={name} href={href} className="rounded-2xl border border-white/10 bg-black/22 p-4 transition hover:border-emerald-200/32">
              <div className="text-base font-semibold text-white">{name}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.16em] text-emerald-100/62">{lane}</div>
              <p className="mt-3 text-sm leading-6 text-white/62">{body}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-white/46">Founder prior work</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Confidential payroll lineage</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/64">
          The PrivateDAO payroll and contributor-management lane is informed by earlier founder work on confidential
          payroll, verifier-safe payslips, and encrypted salary operations.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {priorWork.map(([label, href]) => (
            <a key={href} href={href} className="rounded-2xl border border-white/10 bg-black/22 p-4 text-sm text-cyan-100 transition hover:border-cyan-200/32">
              <span className="block font-semibold text-white">{label}</span>
              <span className="mt-2 block break-all font-mono text-xs text-cyan-100/72">{href}</span>
            </a>
          ))}
        </div>
      </section>
    </OperationsShell>
  );
}
