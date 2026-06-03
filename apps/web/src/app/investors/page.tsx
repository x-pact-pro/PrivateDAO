import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Mail, MessageCircle, Rocket, ShieldCheck } from "lucide-react";

import { OperationsShell } from "@/components/operations-shell";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "PrivateDAO Investors",
  description:
    "PrivateDAO is confidential coordination infrastructure for Solana organizations: coordinate, approve, execute, and audit without exposing sensitive operations.",
  path: "/investors",
  keywords: [
    "PrivateDAO investors",
    "confidential coordination infrastructure",
    "Solana organizations",
    "DAO treasury operations",
    "private organizational operations",
  ],
});

const problemPoints = ["Telegram", "Discord", "multisigs", "private spreadsheets", "trusted operators"] as const;

const solutionPoints = [
  "Coordinate confidentially",
  "Route authority securely",
  "Execute workflows verifiably",
  "Preserve organizational continuity",
] as const;

const whyNow = [
  ["Institutional adoption", "Organizations need privacy before they move real operations onchain."],
  ["DAO treasury growth", "Treasury decisions now involve grants, payroll, vendors, and multi-party approvals."],
  ["AI agents", "Autonomous execution needs sovereign approval, audit, and bounded authority."],
  ["Operational complexity", "The work before and after a vote is becoming the real coordination bottleneck."],
] as const;

const progress = [
  ["Website", "Live public product at privatedao.org."],
  ["Live demo", "Wallet-first Solana Testnet flow through /try."],
  ["GitHub", "Public repository and CI/CD history."],
  ["Hackathons", "Superteam awards, Colosseum participation, and QVAC submission surface."],
  ["Integrations", "Solana, Anchor, QVAC, QuickNode, Supabase, provider boundaries, and proof routes."],
  ["Ecosystem involvement", "MetaDAO-style post-governance workflow framing and Solana organization use cases."],
] as const;

const commercialPath = [
  ["Open Testnet product", "Build trust through a product that teams can inspect and use before a sales conversation."],
  ["$2,500 fixed pilot", "Prove one governance, grant, treasury, payroll, or payout workflow over four weeks."],
  ["$750/month managed operations", "Support teams that repeat workflows and need hosted reads, proof exports, telemetry, and operator help."],
  ["Sovereign deployment", "Serve organizations that require dedicated infrastructure, custom controls, and customer-cloud operation."],
] as const;

const assurancePath = [
  ["Public proof", "Wallet signatures, Testnet references, proof routes, and runtime evidence remain inspectable."],
  ["Audit-ready repository", "The repository includes a defined external audit scope, handoff packet, threat model, and closure standard."],
  ["Production release discipline", "Custody, monitoring, authority, and audit gates are treated as explicit release requirements."],
] as const;

const collaborationPath = [
  ["Design partners", "DAOs, grant programs, and protocol teams that want to prove one sensitive workflow."],
  ["Technical contributors", "Solana, privacy, wallet, mobile, and infrastructure builders who want to strengthen an open product."],
  ["Security reviewers", "Independent reviewers and audit partners who can validate the production release path."],
  ["Infrastructure partners", "Providers that improve wallet onboarding, encrypted compute, treasury control, or runtime resilience."],
] as const;

const founderPriorWork = [
  [
    "Confidential Payroll",
    "Founder-built prior project for private payroll, employee onboarding, equity attestations, and verifier-safe payslip proofs.",
    "https://confidential-payroll-henna.vercel.app/frontend",
  ],
  [
    "Confidential Payroll GitHub",
    "Public repository showing the earlier Zama/fhEVM payroll direction that now informs PrivateDAO payroll and contributor operations.",
    "https://github.com/X-PACT/confidential-payroll",
  ],
] as const;

const resourceStrategy = [
  ["Wallet onboarding", "Phantom Connect", "Reduce wallet friction for normal users entering the Testnet flow."],
  ["Treasury control", "Squads Multisig / Altitude", "Connect confidential coordination to institutional treasury authority."],
  ["Encrypted compute", "Arcium", "Explore private computation for sealed reviews, votes, and treasury context."],
  ["Human review", "World ID", "Optional proof-of-human reviewer gating without public identity leakage."],
  ["Private execution", "Vanish", "Research privacy-preserving execution patterns for treasury and payment routes."],
  ["Runtime resilience", "Helius / Triton / FluxRPC", "Prepare RPC redundancy around the current QuickNode-backed runtime."],
] as const;

export default function InvestorsPage() {
  return (
    <OperationsShell
      eyebrow="Investors"
      title="Confidential Coordination Infrastructure for Solana Organizations"
      description="PrivateDAO helps organizations coordinate, approve, execute, and audit sensitive operations without exposing vote intent, treasury context, payroll coordination, or internal workflows before the right moment."
      navigationMode="guided"
      badges={[
        { label: "Coordination infrastructure", variant: "cyan" },
        { label: "Solana organizations", variant: "success" },
        { label: "Public verification", variant: "violet" },
      ]}
    >
      <section className="rounded-[30px] border border-emerald-300/18 bg-[radial-gradient(circle_at_top_left,rgba(20,241,149,0.16),transparent_34%),linear-gradient(135deg,rgba(7,13,26,0.98),rgba(4,7,18,0.98))] p-5 sm:p-7">
        <div className="max-w-4xl">
          <div className="text-[11px] uppercase tracking-[0.3em] text-emerald-100/78">PrivateDAO</div>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.045em] text-white sm:text-5xl">
            Coordinate. Approve. Execute. Audit.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-white/68">
            Without exposing sensitive operations. Governance is the first use case; the larger layer is confidential
            coordination for organizations on Solana.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="mailto:Fahd.kotb@tuta.io?subject=PrivateDAO%20Investor%20Materials" className={cn(buttonVariants({ size: "sm" }))}>
              Request investor materials
              <Mail className="h-4 w-4" />
            </a>
            <Link href="/deck" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
              Open pitch deck
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link href="/thesis" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              Read thesis
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
          <div className="text-[11px] uppercase tracking-[0.25em] text-white/46">Problem</div>
          <h2 className="mt-3 text-2xl font-semibold text-white">The most important decisions still happen off-chain.</h2>
          <p className="mt-3 text-sm leading-7 text-white/64">
            DAOs and Solana-native organizations rely on fragmented coordination channels before and after governance.
            That is where pressure, leakage, unclear authority, and lost organizational memory appear.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {problemPoints.map((item) => (
              <span key={item} className="rounded-full border border-white/10 bg-black/24 px-3 py-1 text-xs text-white/66">
                {item}
              </span>
            ))}
          </div>
        </article>

        <article className="rounded-[28px] border border-emerald-300/18 bg-emerald-300/[0.07] p-5 sm:p-6">
          <div className="text-[11px] uppercase tracking-[0.25em] text-emerald-100/78">Solution</div>
          <h2 className="mt-3 text-2xl font-semibold text-white">Private coordination with public verification.</h2>
          <div className="mt-5 grid gap-3">
            {solutionPoints.map((item) => (
              <div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-black/22 p-4">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-100" />
                <span className="text-sm leading-6 text-white/70">{item}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-[28px] border border-cyan-300/16 bg-cyan-300/[0.06] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-cyan-100/76">Why now</div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {whyNow.map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-black/22 p-4">
              <div className="text-base font-semibold text-white">{title}</div>
              <p className="mt-2 text-sm leading-6 text-white/62">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-violet-300/16 bg-violet-300/[0.06] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-violet-100/76">Current progress</div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {progress.map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-black/22 p-4">
              <div className="text-base font-semibold text-white">{title}</div>
              <p className="mt-2 text-sm leading-6 text-white/62">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-cyan-300/16 bg-cyan-300/[0.06] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-cyan-100/76">Commercial path</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">A clear first purchase, then recurring operational value.</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/64">
          PrivateDAO does not require a buyer to adopt every feature at once. The entry point is one painful workflow,
          one measurable pilot, and one proof packet that shows whether repeated use is justified.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {commercialPath.map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-black/22 p-4">
              <div className="text-base font-semibold text-white">{title}</div>
              <p className="mt-2 text-sm leading-6 text-white/62">{body}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/pricing" className={cn(buttonVariants({ size: "sm" }))}>
            View pricing
          </Link>
          <Link href="/business-model" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            View business model
          </Link>
        </div>
      </section>

      <section className="rounded-[28px] border border-emerald-300/16 bg-emerald-300/[0.06] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-emerald-100/76">Assurance path</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Trust is built through evidence and independent review.</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {assurancePath.map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-black/22 p-4">
              <div className="text-base font-semibold text-white">{title}</div>
              <p className="mt-2 text-sm leading-6 text-white/62">{body}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/security" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open security center
          </Link>
          <Link href="/documents/external-audit-engagement" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Open audit engagement scope
          </Link>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-white/46">Collaboration path</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Founder-built, open to the partners required for scale.</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/64">
          The next stage is designed around real collaboration: design partners create validated use cases, technical
          contributors expand delivery capacity, security reviewers strengthen trust, and infrastructure partners improve
          the operating layer.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {collaborationPath.map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-black/22 p-4">
              <div className="text-base font-semibold text-white">{title}</div>
              <p className="mt-2 text-sm leading-6 text-white/62">{body}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/pilots" className={cn(buttonVariants({ size: "sm" }))}>
            Open pilot program
          </Link>
          <Link href="/community" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Join the community
          </Link>
          <a href="https://github.com/X-PACT/PrivateDAO" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Open GitHub
          </a>
        </div>
      </section>

      <section className="rounded-[28px] border border-emerald-300/16 bg-emerald-300/[0.06] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-emerald-100/76">Colosseum resource strategy</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Provider rails are modular; the workflow remains PrivateDAO-owned.</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/64">
          Colosseum sponsor resources strengthen specific lanes without changing the core product thesis. PrivateDAO
          owns coordination, privacy, authority, execution, and proof; providers remain replaceable.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {resourceStrategy.map(([lane, tool, body]) => (
            <div key={lane} className="rounded-2xl border border-white/10 bg-black/22 p-4">
              <div className="text-base font-semibold text-white">{lane}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.16em] text-emerald-100/62">{tool}</div>
              <p className="mt-3 text-sm leading-6 text-white/62">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-cyan-300/16 bg-cyan-300/[0.06] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-cyan-100/76">Founder prior work</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Confidential payroll did not start as a slide.</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/64">
          PrivateDAO's payroll and contributor-operations lane builds on earlier founder work around confidential salary
          state, employee onboarding, equity attestations, and verifier-safe payslip proof.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {founderPriorWork.map(([title, body, href]) => (
            <a key={title} href={href} className="rounded-2xl border border-white/10 bg-black/22 p-4 transition hover:border-cyan-200/32">
              <div className="text-base font-semibold text-white">{title}</div>
              <p className="mt-2 text-sm leading-6 text-white/62">{body}</p>
              <div className="mt-3 font-mono text-xs text-cyan-100/76">{href}</div>
            </a>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
          <div className="flex items-center gap-3 text-emerald-100">
            <Rocket className="h-5 w-5" />
            <div className="text-[11px] uppercase tracking-[0.25em]">Funding</div>
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-white">Strategic capital and ecosystem collaboration.</h2>
          <p className="mt-3 text-sm leading-7 text-white/64">
            PrivateDAO is currently exploring strategic investors, ecosystem partners, and infrastructure collaborators
            who understand privacy-preserving organizational operations on Solana.
          </p>
        </article>

        <article className="rounded-[28px] border border-white/10 bg-black/24 p-5 sm:p-6">
          <div className="flex items-center gap-3 text-cyan-100">
            <MessageCircle className="h-5 w-5" />
            <div className="text-[11px] uppercase tracking-[0.25em]">Contact</div>
          </div>
          <div className="mt-4 grid gap-2 text-sm leading-7 text-white/70">
            <div><span className="text-white">Founder:</span> Fahd Kotb</div>
            <a className="text-cyan-100 underline underline-offset-4" href="mailto:Fahd.kotb@tuta.io">Fahd.kotb@tuta.io</a>
            <a className="text-cyan-100 underline underline-offset-4" href="mailto:Fahdkotb.8888@gmail.com">Fahdkotb.8888@gmail.com</a>
            <a className="text-cyan-100 underline underline-offset-4" href="mailto:I.Kotb@proton.me">I.Kotb@proton.me</a>
            <a className="text-cyan-100 underline underline-offset-4" href="https://x.com/privateDAOOS">X: @privateDAOOS</a>
            <a className="text-cyan-100 underline underline-offset-4" href="https://t.me/Fahdkotb">Telegram: @Fahdkotb</a>
          </div>
        </article>
      </section>

      <section className="rounded-[28px] border border-emerald-300/16 bg-black/24 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-emerald-100" />
          <p className="text-sm leading-7 text-white/66">
            PrivateDAO owns the workflow: coordination, privacy, authority, execution, and proof. Data, intelligence,
            analytics, and infrastructure providers remain modular and replaceable.
          </p>
        </div>
      </section>
    </OperationsShell>
  );
}
