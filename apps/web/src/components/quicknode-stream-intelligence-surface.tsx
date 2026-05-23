import Link from "next/link";
import { RadioTower, ShieldCheck, Signal, Workflow } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const streamFacts = [
  {
    label: "Stream endpoint",
    value: "api.privatedao.org/api/v1/quicknode/stream",
    detail: "Authenticated webhook for Solana Testnet Programs + Logs or Block datasets.",
  },
  {
    label: "Payload posture",
    value: "summarized",
    detail: "Large raw blocks become transaction counts, program hits, compute usage, and proof freshness signals.",
  },
  {
    label: "Security",
    value: "env-token only",
    detail: "Secrets live in deployment environment variables; no stream token is committed to GitHub.",
  },
  {
    label: "Decision use",
    value: "data-to-intel",
    detail: "QuickNode feeds runtime telemetry, GoldRush adds wallet context, and QVAC turns both into signer guidance.",
  },
];

export function QuickNodeStreamIntelligenceSurface({ compact = false }: { compact?: boolean }) {
  return (
    <section className="rounded-[28px] border border-sky-300/16 bg-sky-300/[0.075] p-6">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-sky-100/78">
        <RadioTower className="h-4 w-4" />
        QuickNode stream intelligence
      </div>
      <div className="mt-3 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Live Solana Testnet stream intake for proof freshness and operational telemetry
          </h2>
          <p className="mt-3 text-sm leading-7 text-white/68">
            PrivateDAO now treats QuickNode as infrastructure, not a logo. Streams can send Testnet block or program-log data
            into a protected webhook, where the product converts noisy chain payloads into reviewer-safe intelligence:
            program matches, transaction health, compute usage, and evidence freshness before a signer executes.
          </p>
          {!compact ? (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                ["QuickNode", "real-time Solana stream"],
                ["GoldRush", "wallet and counterparty context"],
                ["QVAC", "local-first decision brief"],
              ].map(([label, detail]) => (
                <div key={label} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <div className="text-sm font-semibold text-white">{label}</div>
                  <div className="mt-2 text-xs leading-6 text-white/58">{detail}</div>
                </div>
              ))}
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/documents/quicknode-stream-intelligence" className={cn(buttonVariants({ size: "sm" }))}>
              Open stream runbook
            </Link>
            <Link href="/intelligence" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
              Open intelligence
            </Link>
            <Link href="/proof" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              Verify proof surface
            </Link>
          </div>
        </div>
        <div className="grid gap-3">
          {streamFacts.map((fact, index) => {
            const Icon = index === 0 ? Signal : index === 1 ? Workflow : ShieldCheck;
            return (
              <div key={fact.label} className="rounded-2xl border border-white/8 bg-black/22 p-4">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-sky-100/70">
                  <Icon className="h-4 w-4" />
                  {fact.label}
                </div>
                <div className="mt-2 text-sm font-semibold text-white">{fact.value}</div>
                <div className="mt-1 text-xs leading-6 text-white/58">{fact.detail}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
