import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { WalletConnectButton } from "@/components/wallet-connect-button";
import { cn } from "@/lib/utils";

const flow = [
  ["Intelligence before signing", "Understand treasury context, risk, and public evidence before making a decision."],
  ["Private coordination", "Keep vote momentum, reviewer opinions, and sensitive operating details private while they matter."],
  ["Public verification", "Reveal the outcome, execution receipt, and proof route when the workflow is complete."],
] as const;

export function SimpleHomeHero() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6 sm:pt-12 lg:px-8 lg:pt-16">
      <section className="grid items-start gap-8 border-b border-white/10 pb-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12 lg:pb-14">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="cyan">Solana Testnet</Badge>
            <Badge variant="success">Private coordination</Badge>
            <Badge variant="violet">Public verification</Badge>
          </div>
          <div className="mt-6 text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-100/78">
            Confidential Coordination Infrastructure for Organizations on Solana
          </div>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-white sm:text-6xl">
            Your organization runs on public wallets, public votes, and public treasury activity.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/68">
            PrivateDAO helps organizations coordinate sensitive decisions privately, then reveal outcomes and execution
            proof when transparency protects trust.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <WalletConnectButton size="lg" variant="default" connectLabel="Connect Testnet Wallet" />
            <Link href="/try" className={cn(buttonVariants({ size: "lg" }))}>
              Try Testnet workflow
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/value" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
              Why PrivateDAO
            </Link>
          </div>
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/58">
            {["No code", "Wallet-first", "Proof-linked", "Governance is the first use case"].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-100" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <aside className="rounded-[26px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
          <div className="flex items-center gap-3 text-cyan-100">
            <ShieldCheck className="h-5 w-5" />
            <div className="text-[11px] uppercase tracking-[0.26em]">One simple operating flow</div>
          </div>
          <div className="mt-5 grid gap-3">
            {flow.map(([title, body], index) => (
              <article key={title} className="rounded-[20px] border border-white/10 bg-black/22 p-4">
                <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-100/72">Step {index + 1}</div>
                <h2 className="mt-2 text-base font-semibold text-white">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-white/60">{body}</p>
              </article>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/proof" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
              Verify proof
            </Link>
            <Link href="/pilots" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              Pilot program
            </Link>
          </div>
        </aside>
      </section>
    </main>
  );
}
