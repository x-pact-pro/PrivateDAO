import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, FileText, PlayCircle, ShieldCheck } from "lucide-react";

import { OperationsShell } from "@/components/operations-shell";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "PrivateDAO Reviewer Packet",
  description:
    "The fastest reviewer path for PrivateDAO: try the live Testnet flow, read the pitch, inspect proof, and verify the AI-readable evidence layer.",
  path: "/reviewer",
  keywords: ["PrivateDAO reviewer packet", "PrivateDAO pitch deck", "PrivateDAO demo", "Solana private governance"],
});

const reviewerLinks = [
  {
    title: "Demo link",
    href: "/try/",
    icon: PlayCircle,
    description: "Start with the simple Connect -> Intelligence -> Private Vote -> Reveal -> Verify -> Execute flow.",
    cta: "Try live flow",
  },
  {
    title: "Pitch deck link",
    href: "/reviewer/",
    icon: FileText,
    description: "Use this page as the short judge-facing pitch packet for product value, traction, proof, and routes.",
    cta: "Open packet",
  },
  {
    title: "Proof center",
    href: "/proof/?judge=1",
    icon: ShieldCheck,
    description: "Verify Testnet evidence, transparency reports, runtime proof, and public accountability routes.",
    cta: "Verify proof",
  },
] as const;

const pitchPoints = [
  "Most DAO voters see vote counts, whale wallets, and public momentum before voting ends.",
  "PrivateDAO hides influence signals while the decision is active, then reveals final outcomes and proofs after the voting window.",
  "The product path is simple for users: Connect -> Intelligence -> Private Vote -> Reveal -> Verify -> Execute.",
  "The stack supports public DAOs, private rooms, confidential treasury coordination, payroll, payouts, vesting, proof reports, and local/hosted intelligence providers.",
  "Public accountability remains intact through proof routes, audit receipts, Solana Testnet references, and AI-readable evidence files.",
] as const;

const applicationMetrics = [
  ["Git commits", "1,094"],
  ["Detected Git contributors", "5"],
  ["Generated static HTML files", "811"],
  ["Public app routes", "121"],
  ["API route files", "17"],
  ["Unit tests passing", "47 / 47"],
  ["TypeScript errors", "0"],
  ["Broken internal links", "0"],
  ["Internal links checked", "35,435"],
  ["Supabase visitor sessions", "1,224"],
  ["Supabase visitor pings", "1,810"],
  ["Wallet-submitted Testnet receipts", "80"],
  ["Solscan verified users", "6"],
  ["Successful execution records", "11 / 11"],
  ["QuickNode accepted stream payloads", "15,506"],
  ["QuickNode streamed Testnet transactions", "8,808,995"],
  ["Privacy execution claims", "27"],
  ["Core integrations in AI manifest", "22"],
] as const;

const milestoneMetrics = [
  "Latest GitHub CI succeeded on commit 5d7ffc430f5cf219e5407c4d85f5d9fe9907cf22.",
  "Latest GitHub Pages deployment succeeded on commit 5d7ffc430f5cf219e5407c4d85f5d9fe9907cf22.",
  "Live readiness API reports the Solana Testnet program executable.",
  "The internal link verifier checked 609 HTML files and reported missingCount 0.",
  "The AI-readable layer includes llms.txt, ai.json, evidence.json, the AI guide route, Schema.org, and OpenGraph metadata.",
] as const;

const verifierLinks = [
  ["Live site", "https://privatedao.org/"],
  ["Demo", "https://privatedao.org/try/"],
  ["Pitch packet", "https://privatedao.org/reviewer/"],
  ["Judge hub", "https://privatedao.org/judge/"],
  ["Proof center", "https://privatedao.org/proof/?judge=1"],
  ["GitHub", "https://github.com/X-PACT/PrivateDAO"],
  ["AI manifest", "https://privatedao.org/ai.json"],
  ["Evidence manifest", "https://privatedao.org/evidence.json"],
  ["LLM index", "https://privatedao.org/llms.txt"],
] as const;

export default function ReviewerPage() {
  return (
    <OperationsShell
      eyebrow="Reviewer packet"
      title="PrivateDAO pitch and demo links"
      description="A concise reviewer surface for the live Testnet product: start the demo, read the pitch, inspect proof, then verify the public repository and AI-readable evidence layer."
      navigationMode="guided"
      badges={[
        { label: "Demo: /try", variant: "success" },
        { label: "Pitch: /reviewer", variant: "violet" },
        { label: "Proof: /proof", variant: "cyan" },
      ]}
    >
      <section className="grid gap-4 xl:grid-cols-4">
        {reviewerLinks.map(({ title, href, icon: Icon, description, cta }) => (
          <article key={title} className="min-w-0 rounded-[28px] border border-white/10 bg-white/[0.045] p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-300/18 bg-emerald-300/10 text-emerald-100">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="text-lg font-semibold text-white">{title}</h2>
            </div>
            <p className="mt-4 text-sm leading-7 text-white/62">{description}</p>
            <Link href={href} className={cn(buttonVariants({ size: "sm", variant: title === "Demo link" ? "default" : "outline" }), "mt-5")}>
              {cta}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </article>
        ))}
      </section>

      <section className="rounded-[28px] border border-emerald-300/18 bg-[radial-gradient(circle_at_top_left,rgba(20,241,149,0.14),transparent_34%),linear-gradient(135deg,rgba(7,13,26,0.96),rgba(4,7,18,0.98))] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-100/76">Pitch narrative</div>
        <h2 className="mt-3 max-w-4xl text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">
          Vote privately while it matters. Reveal transparently when it counts.
        </h2>
        <div className="mt-5 grid gap-3">
          {pitchPoints.map((point) => (
            <div key={point} className="flex min-w-0 gap-3 rounded-2xl border border-white/8 bg-black/24 px-4 py-3">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-100/78" />
              <p className="min-w-0 text-sm leading-6 text-white/70">{point}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="application-ready-metrics" className="rounded-[28px] border border-cyan-300/16 bg-cyan-300/[0.055] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/76">Application ready metrics</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Fact-only traction snapshot</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/62">
          These figures are pulled from repository history, build output, CI/CD, local verification scripts,
          Supabase-backed readiness counters, QuickNode stream stats, and public API endpoints. They are included
          here for accelerators, venture funds, startup applications, Solana ecosystem grants, and MonkeNova-style
          reviewer checks.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {applicationMetrics.map(([label, value]) => (
            <div key={label} className="min-w-0 rounded-2xl border border-white/8 bg-black/24 p-4">
              <div className="font-mono text-xl font-semibold text-white">{value}</div>
              <div className="mt-2 text-xs uppercase tracking-[0.14em] text-white/42">{label}</div>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-2">
          {milestoneMetrics.map((metric) => (
            <div key={metric} className="flex min-w-0 gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-100/78" />
              <p className="min-w-0 text-sm leading-6 text-white/68">{metric}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
        <div className="text-[11px] uppercase tracking-[0.22em] text-white/44">Verifier links</div>
        <a href="/judge" target="/judge" className="sr-only">
          Legacy reviewer route preserved for the canonical judge hub.
        </a>
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {verifierLinks.map(([label, href]) => (
            <a key={href} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined} className="min-w-0 rounded-2xl border border-white/8 bg-black/22 px-4 py-3 text-sm text-white/68 transition hover:border-emerald-300/24 hover:text-white">
              <span className="block text-white">{label}</span>
              <span className="mt-1 block truncate font-mono text-[11px] text-white/42">{href}</span>
            </a>
          ))}
        </div>
      </section>
    </OperationsShell>
  );
}
