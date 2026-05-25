import type { Metadata } from "next";
import Link from "next/link";

import { LocalizedRouteSummary } from "@/components/localized-route-summary";
import { OperationsShell } from "@/components/operations-shell";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

const pusdLanes = [
  {
    title: "PUSD payroll lane",
    summary: "Stable payout rehearsal for contributor and payroll-oriented treasury operations.",
    href: "/services/testnet-billing-rehearsal",
  },
  {
    title: "PUSD reward pool lane",
    summary: "Gaming and contribution reward distribution lane for recurring operator loops.",
    href: "/services/testnet-billing-rehearsal",
  },
  {
    title: "PUSD governance continuity",
    summary: "Proof-linked treasury lane for judge review with wallet-first execution context.",
    href: "/judge",
  },
] as const;

export const metadata: Metadata = buildRouteMetadata({
  title: "PUSD Stablecoin Mode",
  description:
    "PUSD operating mode for payroll, grants, and reward pool workflows with wallet-first execution and proof continuity.",
  path: "/services/pusd-stablecoin",
  keywords: ["pusd", "stablecoin", "payroll", "rewards", "treasury", "solana"],
});

export default function PusdStablecoinPage() {
  const executionPath = [
    ["Select lane", "Choose PUSD payroll, grants, or gaming rewards from the treasury flow."],
    ["Build transfer", "The browser constructs an SPL TransferChecked transaction using configured mint, decimals, receive account, and token program."],
    ["Sign in wallet", "The user reviews and signs from the connected Solana Testnet wallet; PrivateDAO does not custody user keys."],
    ["Verify proof", "Memo, signature, and explorer link are routed back to Judge, Proof, and treasury reviewer packets."],
  ] as const;
  const activationInputs = [
    "NEXT_PUBLIC_TREASURY_PUSD_MINT",
    "NEXT_PUBLIC_TREASURY_PUSD_RECEIVE_ADDRESS",
    "NEXT_PUBLIC_TREASURY_PUSD_DECIMALS",
    "NEXT_PUBLIC_TREASURY_PUSD_TOKEN_PROGRAM",
    "PRIVATE_DAO_MICROPAYMENT_SYMBOL=PUSD",
  ] as const;

  return (
    <OperationsShell
      eyebrow="PUSD track"
      title="PUSD as a governed treasury lane for payroll and rewards"
      description="This route frames PUSD as a core operational currency inside PrivateDAO for payroll, grants, and reward loops while preserving wallet-first UX and reviewer continuity."
      badges={[
        { label: "PUSD mode", variant: "success" },
        { label: "Wallet-first", variant: "cyan" },
        { label: "Judge + proof linked", variant: "violet" },
      ]}
    >
      <LocalizedRouteSummary routeKey="services" />

      <div className="rounded-[28px] border border-emerald-300/16 bg-emerald-300/[0.08] p-6">
        <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-100/78">Operating model</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Payroll, grants, and reward pools under governed stablecoin flow</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/66">
          PUSD is integrated as a practical treasury rail. Operators can run billing and payout rehearsals from the
          browser, then validate execution context through judge and proof surfaces. The product does not hardcode an
          unverified mint; the official PUSD Solana mint and receive account are injected through environment
          configuration, so the same wallet-first flow can move from Testnet rehearsal to production policy when the
          activation inputs are present.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/services/testnet-billing-rehearsal" className={cn(buttonVariants({ size: "sm" }))}>
            Open billing route
          </Link>
          <Link href="/documents/pusd-stablecoin-treasury-layer" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open PUSD packet
          </Link>
          <Link href="/proof" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Open proof lane
          </Link>
        </div>
      </div>

      <section className="rounded-[30px] border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(34,211,238,0.11),rgba(20,241,149,0.07),rgba(8,13,28,0.94))] p-6">
        <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/78">Wallet-first stablecoin execution</div>
        <h2 className="mt-3 max-w-4xl text-2xl font-semibold text-white">PUSD is framed as a treasury operating layer, not a token badge</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/66">
          The value is not simply listing PUSD. PrivateDAO wraps the stablecoin inside governance approval, memo-coded
          payout intent, wallet review, confidential-payroll positioning, and reviewer-readable proof. That gives DAOs,
          gaming communities, and grant committees a stable payment lane that normal users can understand in minutes.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {executionPath.map(([label, detail]) => (
            <div key={label} className="rounded-[22px] border border-white/10 bg-black/22 p-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-100/62">{label}</div>
              <p className="mt-3 text-sm leading-6 text-white/62">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[30px] border border-amber-300/18 bg-amber-300/[0.07] p-6">
        <div className="text-[11px] uppercase tracking-[0.28em] text-amber-100/78">Activation inputs</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Production PUSD activation is configuration-gated, not a rewrite</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/66">
          The implementation already supports configured SPL/Token-2022-style treasury assets through the same payment
          request surface. The remaining production step is attaching the official PUSD mint, funded receive account,
          and policy-approved wallet before claiming real PUSD settlement.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {activationInputs.map((input) => (
            <div key={input} className="rounded-2xl border border-white/10 bg-black/22 p-4 font-mono text-xs leading-6 text-white/62">
              {input}
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        {pusdLanes.map((lane) => (
          <div key={lane.title} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
            <div className="text-base font-medium text-white">{lane.title}</div>
            <p className="mt-3 text-sm leading-7 text-white/62">{lane.summary}</p>
            <Link href={lane.href} className={cn(buttonVariants({ size: "sm", variant: "outline" }), "mt-4 w-full justify-between")}>
              Open lane
            </Link>
          </div>
        ))}
      </div>
    </OperationsShell>
  );
}
