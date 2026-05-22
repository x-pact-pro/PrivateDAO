import Link from "next/link";
import { ArrowUpRight, BrainCircuit, Coins, Gamepad2, LockKeyhole, Network, ShieldCheck, Sparkles, Vote } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { privateDaoServiceConstellation } from "@/lib/site-data";
import { cn } from "@/lib/utils";

const iconMap = [
  Vote,
  ShieldCheck,
  LockKeyhole,
  Coins,
  Gamepad2,
  Sparkles,
  BrainCircuit,
  Network,
] as const;

export function ServiceConstellationSurface() {
  return (
    <section className="overflow-hidden rounded-[32px] border border-cyan-300/18 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_34%),linear-gradient(135deg,rgba(8,13,27,0.98),rgba(2,6,23,0.98))] p-5 shadow-2xl shadow-cyan-950/30">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/72">PrivateDAO service constellation</div>
          <h2 className="mt-3 max-w-4xl text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
            The missing private operating layer for Solana teams
          </h2>
          <p className="mt-3 max-w-5xl text-sm leading-7 text-white/66">
            Solana is already fast, liquid, and developer-rich. PrivateDAO adds the product layer teams still need for
            sensitive coordination: private governance, confidential payroll, encrypted payouts, reward programs,
            buyer-readable automation, and proof that a normal reviewer can inspect in minutes.
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-4 text-sm leading-6 text-white/70 lg:max-w-xs">
          <span className="font-medium text-white">Founder-built product thesis:</span> one wallet-first stack where the
          user decides, signs, executes, and verifies without leaving the public product.
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {privateDaoServiceConstellation.map((service, index) => {
          const Icon = iconMap[index] ?? ShieldCheck;
          return (
            <article key={service.title} className="group rounded-[26px] border border-white/10 bg-black/22 p-5 transition hover:border-cyan-200/30 hover:bg-white/[0.055]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-200/20 bg-cyan-300/[0.10] text-cyan-100">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{service.title}</h3>
                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/42">{service.audience}</div>
                  </div>
                </div>
                <ArrowUpRight className="mt-1 h-4 w-4 text-cyan-200 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>

              <div className="mt-4 grid gap-3 text-sm leading-6 md:grid-cols-3">
                <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-3">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-rose-100/58">Problem</div>
                  <p className="mt-2 text-white/62">{service.problem}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-3">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-100/58">PrivateDAO service</div>
                  <p className="mt-2 text-white/66">{service.service}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-3">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-100/58">Execution proof</div>
                  <p className="mt-2 text-white/62">{service.execution}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <Link href={service.href} className={cn(buttonVariants({ size: "sm" }))}>
                  Open service
                </Link>
                <Link href={service.proofHref} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                  {service.proof}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
