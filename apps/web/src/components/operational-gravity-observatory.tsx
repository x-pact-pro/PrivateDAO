import Link from "next/link";
import { Activity, BrainCircuit, GitBranch, Gauge, ShieldCheck } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const observatorySignals = [
  {
    title: "Recovery Memory",
    detail: "Keeps the user anchored to prior receipts, proposal state, wallet signatures, and proof routes after refresh or reconnect.",
    icon: GitBranch,
  },
  {
    title: "Coordination Gravity",
    detail: "Shows whether governance, payroll, treasury, rewards, and proof are pulling toward one executable operation or splitting apart.",
    icon: Gauge,
  },
  {
    title: "Operational Drift",
    detail: "Flags stale context, missing proof continuity, weak route quality, or a payment lane that no longer matches the approved intent.",
    icon: Activity,
  },
  {
    title: "Continuity Legitimacy",
    detail: "Connects intent, review, wallet signature, read-node receipt, explorer URL, and proof artifact into one verifier-readable chain.",
    icon: ShieldCheck,
  },
] as const;

export function OperationalGravityObservatory() {
  return (
    <section className="rounded-[30px] border border-cyan-300/16 bg-[radial-gradient(circle_at_10%_0%,rgba(0,194,255,0.16),transparent_34%),radial-gradient(circle_at_90%_8%,rgba(154,106,255,0.14),transparent_30%),linear-gradient(180deg,rgba(7,14,27,0.96),rgba(4,7,16,0.98))] p-5 md:p-6">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.26em] text-cyan-100/78">
        <BrainCircuit className="h-4 w-4" />
        Operational Intelligence Layer for DAOs
      </div>
      <div className="mt-3 grid gap-5 xl:grid-cols-[0.92fr_1.08fr] xl:items-end">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white md:text-3xl">
            DAO Coordination Intelligence before the wallet signs
          </h2>
          <p className="mt-3 text-sm leading-7 text-white/66">
            PrivateDAO treats intelligence as an execution control surface, not a chatbot. QVAC handles local proposal
            and policy reasoning; GoldRush/Covalent and QuickNode-backed context help explain on-chain history,
            treasury movement, and route quality before a signer approves the next action.
          </p>
          <p className="mt-3 text-sm leading-7 text-white/58">
            The internal model is the Operational Gravity Observatory: it watches whether an organization is keeping
            intent, approval, execution, and proof aligned across governance, payroll, treasury, and reward lanes.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/execute" className={cn(buttonVariants({ size: "sm" }))}>
              Continue to execute
            </Link>
            <Link href="/rpc-services" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
              Check RPC services
            </Link>
            <Link href="/proof?judge=1" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              Verify continuity
            </Link>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {observatorySignals.map((signal) => {
            const Icon = signal.icon;
            return (
              <div key={signal.title} className="rounded-[24px] border border-white/10 bg-black/22 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-cyan-100">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="text-base font-semibold text-white">{signal.title}</div>
                </div>
                <p className="mt-3 min-h-24 text-sm leading-7 text-white/60">{signal.detail}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
