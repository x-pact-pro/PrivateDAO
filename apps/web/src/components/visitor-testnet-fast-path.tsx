import Link from "next/link";
import { ArrowRight, CheckCircle2, Eye, LockKeyhole, ReceiptText, ShieldCheck, WalletCards } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type VisitorTestnetFastPathProps = {
  focus?: "govern" | "execute" | "payroll" | "intelligence";
};

const fastPathSteps = [
  {
    title: "Connect",
    detail: "Use a Solana Testnet wallet. No code, CLI, or local setup.",
    href: "/govern",
    cta: "Open wallet flow",
    icon: WalletCards,
  },
  {
    title: "Create DAO",
    detail: "Initialize a DAO from the browser and keep the generated address visible.",
    href: "/govern#live-dao",
    cta: "Create DAO",
    icon: CheckCircle2,
  },
  {
    title: "Propose",
    detail: "Prepare a proposal with payroll, vendor, reward, or treasury intent.",
    href: "/govern#live-proposal",
    cta: "Create proposal",
    icon: ReceiptText,
  },
  {
    title: "Commit / Reveal",
    detail: "Commit a hashed vote, reveal it after the window, then finalize.",
    href: "/govern#live-vote",
    cta: "Run vote",
    icon: LockKeyhole,
  },
  {
    title: "Execute",
    detail: "Execute the approved action and open the confirmed Testnet signature.",
    href: "/execute",
    cta: "Execute",
    icon: ShieldCheck,
  },
  {
    title: "Verify",
    detail: "Open Solscan and PrivateDAO proof routes from the same screen.",
    href: "/proof?judge=1",
    cta: "Verify proof",
    icon: Eye,
  },
] as const;

const focusCopy: Record<NonNullable<VisitorTestnetFastPathProps["focus"]>, string> = {
  govern:
    "The governance route is the shortest live path: DAO creation, proposal, commit, reveal, finalize, execute, and Solscan verification.",
  execute:
    "The execution route keeps payroll, vendor payment, billing rehearsal, treasury route planning, and proof continuity on one page.",
  payroll:
    "The payroll route turns a private payroll payload into an encrypted manifest, then routes the user to a wallet-signed Testnet payment rehearsal and proof.",
  intelligence:
    "The intelligence route is the review gate before signing: it explains risk, continuity, route quality, and operational drift.",
};

export function VisitorTestnetFastPath({ focus = "govern" }: VisitorTestnetFastPathProps) {
  return (
    <section className="rounded-[30px] border border-emerald-300/18 bg-[radial-gradient(circle_at_14%_0%,rgba(20,241,149,0.18),transparent_34%),radial-gradient(circle_at_92%_10%,rgba(0,194,255,0.14),transparent_30%),linear-gradient(180deg,rgba(7,14,27,0.96),rgba(4,7,16,0.98))] p-5 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-emerald-300/22 bg-emerald-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-emerald-100">
          Visitor fast path
        </span>
        <span className="rounded-full border border-cyan-300/18 bg-cyan-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-cyan-100">
          Click → Sign → Verify
        </span>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[0.88fr_1.12fr] xl:items-end">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white md:text-3xl">
            A normal visitor should reach a Testnet transaction in minutes
          </h2>
          <p className="mt-3 text-sm leading-7 text-white/66">{focusCopy[focus]}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/govern" className={cn(buttonVariants({ size: "sm" }))}>
              Start with Govern
            </Link>
            <Link href="/payroll" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
              Run payroll lane
            </Link>
            <Link href="/proof?judge=1" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              Open proof
            </Link>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fastPathSteps.map((step) => {
            const Icon = step.icon;
            return (
              <Link
                key={step.title}
                href={step.href}
                className="group rounded-[22px] border border-white/10 bg-black/24 p-4 transition hover:-translate-y-0.5 hover:border-emerald-300/28 hover:bg-white/[0.055]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-emerald-100">
                    <Icon className="h-4 w-4" />
                  </span>
                  <ArrowRight className="h-4 w-4 text-cyan-100/70 transition group-hover:translate-x-1" />
                </div>
                <div className="mt-3 text-base font-semibold text-white">{step.title}</div>
                <p className="mt-2 min-h-16 text-sm leading-6 text-white/58">{step.detail}</p>
                <div className="mt-3 text-[10px] uppercase tracking-[0.18em] text-cyan-100/78">{step.cta}</div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
