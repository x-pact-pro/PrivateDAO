import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Award, ShieldCheck } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "Judges Fast Path",
  description:
    "Legacy judges URL that points reviewers to the canonical PrivateDAO verification route with live proof, integrations, awards, and runtime evidence.",
  path: "/judges",
  keywords: ["judges", "fast path", "verification", "PrivateDAO"],
});

export default function JudgesPage() {
  return (
    <main className="mx-auto flex min-h-[72vh] w-full max-w-5xl items-center px-4 py-14 sm:px-6 lg:px-8">
      <section className="w-full rounded-[34px] border border-cyan-300/18 bg-[radial-gradient(circle_at_8%_0%,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_92%_10%,rgba(20,241,149,0.16),transparent_30%),linear-gradient(180deg,rgba(7,12,24,0.96),rgba(4,7,16,0.99))] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)] sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          {["Canonical judge route", "All integrations", "Awards attached to proof"].map((label) => (
            <span key={label} className="rounded-full border border-cyan-300/18 bg-cyan-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-100">
              {label}
            </span>
          ))}
        </div>

        <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_0.82fr]">
          <div>
            <div className="text-[11px] uppercase tracking-[0.32em] text-emerald-100/78">Judges URL cleaned</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              Use the updated verification route.
            </h1>
            <p className="mt-4 text-sm leading-7 text-white/66">
              This `/judges` URL is kept alive for older links, but the canonical reviewer route is now `/judge`.
              It carries the fuller technical map: QVAC, Cloak, Umbra, MagicBlock, Covalent GoldRush, Jupiter,
              Zerion, Torque, Eitherway, Supabase, AWS read-node, Testnet proof, and recognition context.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/judge" className={cn(buttonVariants({ size: "lg" }))}>
                Open canonical judge route
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/proof/?judge=1" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
                Open proof mode
              </Link>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-amber-300/18 bg-amber-300/[0.08] p-4">
              <div className="flex items-center gap-2 text-amber-100">
                <Award className="h-4 w-4" />
                <div className="text-[11px] uppercase tracking-[0.24em]">Recognition</div>
              </div>
              <div className="mt-3 text-lg font-semibold text-white">1st Place · Superteam Poland</div>
              <div className="mt-1 text-sm font-medium text-amber-100/85">3rd Place · Superteam UAE Frontier Hackathon</div>
              <div className="mt-3 text-sm leading-6 text-white/58">Top 1% in Solana, shown as a credibility signal beside proof.</div>
            </div>
            <div className="rounded-2xl border border-emerald-300/16 bg-emerald-300/[0.07] p-4">
              <div className="flex items-center gap-2 text-emerald-100">
                <ShieldCheck className="h-4 w-4" />
                <div className="text-[11px] uppercase tracking-[0.24em]">Truth boundary</div>
              </div>
              <p className="mt-3 text-sm leading-7 text-white/60">
                Recognition does not replace the technical review. The updated route keeps product proof, live API
                status, runtime evidence, and integration lanes together.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
