import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ConfidentialPaymentsSystemSurfaceProps = {
  compact?: boolean;
};

const rails = [
  {
    title: "Cloak private settlement rail",
    body: "Shielded treasury and payroll settlement path for confidential value movement with review-safe proof handoff.",
    href: "/services/cloak-private-settlement",
  },
  {
    title: "Umbra confidential payout rail",
    body: "Recipient-private payout lane for high-sensitivity disbursements and selective disclosure boundaries.",
    href: "/services/umbra-confidential-payout",
  },
  {
    title: "MagicBlock private payments rail",
    body: "High-frequency execution path for private payment intent, commit continuity, and low-latency operation loops.",
    href: "/services/magicblock-private-payments",
  },
  {
    title: "Encrypt / IKA + REFHE envelope",
    body: "Client-side payload encryption and confidential execution commitments before any shared route receives metadata.",
    href: "/services/encrypt-ika-operations",
  },
  {
    title: "REFHE payroll proof",
    body: "Encrypted payroll packet, computation commitment, and Ika custody readiness for confidential salary operations.",
    href: "/services/refhe-payroll-proof",
  },
] as const;

const intelligenceLayers = [
  {
    title: "QVAC sovereign decision layer",
    body: "Local-first AI review for sensitive payroll and treasury flows before a signer approves execution.",
    href: "/services/qvac-sovereign-ai",
  },
  {
    title: "SolRouter encrypted analysis",
    body: "Encrypted operational reasoning for non-sensitive policy summaries and route pre-checks.",
    href: "/services/solrouter-encrypted-ai",
  },
  {
    title: "Covalent GoldRush intelligence",
    body: "Counterparty, treasury, and wallet context to reduce operational blind spots before confidential settlement.",
    href: "/intelligence",
  },
] as const;

export function ConfidentialPaymentsSystemSurface({ compact = false }: ConfidentialPaymentsSystemSurfaceProps) {
  return (
    <section className="rounded-[28px] border border-emerald-300/16 bg-emerald-300/[0.07] p-5">
      <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-100/76">Confidential payments system</div>
      <h2 className={cn("mt-3 text-2xl font-semibold text-white", compact ? "text-xl" : "")}>
        Encrypted payment coordination built as product infrastructure
      </h2>
      <p className="mt-3 max-w-5xl text-sm leading-7 text-white/66">
        This lane is not a trading flow. It is operational infrastructure for confidential payroll, encrypted treasury
        coordination, secure payout routing, and AI-assisted pre-sign controls, with each rail connected to review and
        proof surfaces on Solana Testnet.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {rails.map((rail) => (
          <Link key={rail.title} href={rail.href} className="rounded-[22px] border border-white/10 bg-black/20 p-4 transition hover:border-emerald-200/30">
            <div className="text-base font-medium text-white">{rail.title}</div>
            <p className="mt-2 text-sm leading-6 text-white/62">{rail.body}</p>
          </Link>
        ))}
      </div>

      <div className="mt-4 rounded-[22px] border border-white/10 bg-black/20 p-4">
        <div className="text-[11px] uppercase tracking-[0.24em] text-white/44">Intelligence layer</div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {intelligenceLayers.map((layer) => (
            <Link key={layer.title} href={layer.href} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 transition hover:border-cyan-200/30">
              <div className="text-sm font-medium text-white">{layer.title}</div>
              <div className="mt-2 text-sm leading-6 text-white/60">{layer.body}</div>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/services/confidential-payments" className={cn(buttonVariants({ size: "sm" }))}>
          Open full encrypted payments section
          <ArrowUpRight className="h-4 w-4" />
        </Link>
        <Link href="/proof" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          Open proof continuity
        </Link>
        <Link href="/judge" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          Open judge verification path
        </Link>
      </div>
    </section>
  );
}
