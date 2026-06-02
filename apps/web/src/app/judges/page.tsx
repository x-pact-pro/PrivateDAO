import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ClipboardCheck, FileText, PlayCircle, ShieldCheck } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "Judges Fast Path",
  description:
    "PrivateDAO judge fast path: demo link, pitch deck link, proof center, AI-readable summary, and live Solana Testnet evidence.",
  path: "/judges",
  keywords: ["judges", "demo link", "pitch deck", "proof center", "PrivateDAO"],
});

const primaryLinks = [
  {
    title: "Demo link",
    body: "Fastest product flow for a reviewer: connect, intelligence, private vote, reveal, verify, execute.",
    href: "/try/",
    icon: PlayCircle,
    primary: true,
  },
  {
    title: "Pitch deck link",
    body: "The submitted pitch URL now opens the strongest proof packet, demo path, and traction metrics.",
    href: "/proof/?judge=1",
    icon: FileText,
    primary: true,
  },
  {
    title: "Judge hub",
    body: "Canonical reviewer hub with technology guide, launch paths, runtime logs, and Testnet proof.",
    href: "/judge/",
    icon: ClipboardCheck,
  },
  {
    title: "AI / judge summary",
    body: "Plain AI-readable explanation for automated reviewers and human judges who need context fast.",
    href: "/judge-ai",
    icon: ShieldCheck,
  },
] as const;

const proofLinks = [
  ["Live readiness API", "https://api.privatedao.org/api/v1/readiness"],
  ["Privacy execution claims", "https://api.privatedao.org/api/v1/privacy-execution-claims"],
  ["Privacy execution matrix", "https://api.privatedao.org/api/v1/privacy-execution-matrix"],
  ["Provider integrations status", "https://api.privatedao.org/api/v1/provider-integrations/status"],
  ["QVAC runtime proof", "https://api.privatedao.org/api/v1/qvac/runtime-proof"],
  ["AI-readable manifest", "/llms.txt"],
] as const;

export default function JudgesPage() {
  return (
    <main className="min-h-screen bg-[#05070d] px-4 py-10 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(20,241,149,0.16),transparent_34%),linear-gradient(135deg,rgba(8,13,28,0.98),rgba(3,7,18,0.98))] p-5 shadow-2xl shadow-black/30 sm:p-8">
        <div className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">Judges fast path</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.045em] sm:text-5xl">
            PrivateDAO in minutes: demo, pitch, proof, and live Testnet evidence.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
            Use this page when a judge needs the shortest path. The product is organized around private coordination
            with public verification: choose the demo, inspect the pitch/proof packet, then verify the live APIs.
          </p>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {primaryLinks.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-[24px] border p-4 transition hover:bg-white/[0.055]",
                  item.primary ? "border-emerald-300/22 bg-emerald-300/[0.08]" : "border-white/10 bg-black/24",
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl border border-white/10 bg-black/24 p-2.5 text-emerald-100">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-white">{item.title}</div>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{item.body}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-6 rounded-[24px] border border-cyan-300/16 bg-cyan-300/[0.07] p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">Direct proof links</div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {proofLinks.map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="inline-flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/24 px-4 py-3 text-sm text-white/76 transition hover:bg-white/[0.055]"
              >
                <span>{label}</span>
                <ArrowUpRight className="h-4 w-4 text-cyan-100" />
              </a>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/try/" className={cn(buttonVariants({ size: "sm" }))}>
            Open demo
          </Link>
          <Link href="/proof/?judge=1" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open pitch deck link
          </Link>
          <Link href="/judge/" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Open full judge hub
          </Link>
        </div>
      </section>
    </main>
  );
}
