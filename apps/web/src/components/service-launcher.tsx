import Link from "next/link";
import { ArrowUpRight, BrainCircuit, Coins, Gamepad2, Gavel, KeyRound, ShieldAlert, WalletCards } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LauncherAction = {
  label: string;
  href: string;
  primary?: boolean;
};

type LauncherService = {
  title: string;
  pain: string;
  outcome: string;
  icon: typeof Gavel;
  actions: LauncherAction[];
};

const services: LauncherService[] = [
  {
    title: "DAO Governance",
    pain: "Public vote counts, whale signals, and visible momentum influence members before the vote ends.",
    outcome: "Create a DAO, join a live vote, or start a VIP room with private voting and public reveal.",
    icon: Gavel,
    actions: [
      { label: "Create DAO", href: "/try?flow=create-dao", primary: true },
      { label: "Join live DAO", href: "/govern#live-dao" },
      { label: "Create VIP room", href: "/rooms/new" },
    ],
  },
  {
    title: "Private Rooms",
    pain: "Grant reviews, incidents, hiring, and partnerships break down when every sensitive detail is public too early.",
    outcome: "Invite members, add a proposal, run a private vote, reveal the outcome, and export proof.",
    icon: ShieldAlert,
    actions: [
      { label: "Create private room", href: "/rooms/new", primary: true },
      { label: "Review workflow", href: "/review" },
      { label: "Security room", href: "/security" },
    ],
  },
  {
    title: "Treasury Coordination",
    pain: "Treasury actions expose strategy, counterparties, and timing before the organization is ready.",
    outcome: "Preview route context, coordinate privately, then publish verifiable execution evidence.",
    icon: Coins,
    actions: [
      { label: "Run treasury route", href: "/services/jupiter-treasury-route", primary: true },
      { label: "PUSD stable lane", href: "/services/pusd-stablecoin" },
      { label: "Verify proof", href: "/proof/?judge=1" },
    ],
  },
  {
    title: "Private Payments & Payroll",
    pain: "Contributor payouts, payroll, and vendor payments should not become public spreadsheets.",
    outcome: "Prepare private payout, payroll, or REFHE proof lanes with wallet-first Testnet receipts.",
    icon: KeyRound,
    actions: [
      { label: "Private payout", href: "/services/confidential-payments", primary: true },
      { label: "Payroll flow", href: "/payroll" },
      { label: "REFHE proof", href: "/services/refhe-payroll-proof" },
    ],
  },
  {
    title: "Intelligence Before Signing",
    pain: "Members sign governance and treasury actions without enough context, or send sensitive context to hosted AI.",
    outcome: "Use QVAC/local intelligence, risk context, and provider-safe analysis before the private vote.",
    icon: BrainCircuit,
    actions: [
      { label: "Run intelligence", href: "/intelligence", primary: true },
      { label: "QVAC local AI", href: "/services/qvac-sovereign-ai" },
      { label: "API status", href: "/api-status" },
    ],
  },
  {
    title: "GamingDAO Rewards",
    pain: "Guild rewards, tournaments, and prize pools lose trust when reward decisions and payouts are messy.",
    outcome: "Create a tournament, route reward distribution through governance, and keep reward proof visible.",
    icon: Gamepad2,
    actions: [
      { label: "Open GamingDAO", href: "/gaming", primary: true },
      { label: "Create tournament", href: "/gaming/tournaments" },
      { label: "Reward treasury", href: "/services/pusd-stablecoin" },
    ],
  },
  {
    title: "Provider & Growth Rails",
    pain: "Provider integrations become noise when users cannot see the action they enable.",
    outcome: "Use Torque, SDK/API starter, and proof routes as backend rails under simple execution flows.",
    icon: WalletCards,
    actions: [
      { label: "Torque growth loop", href: "/services/torque-growth-loop", primary: true },
      { label: "SDK/API starter", href: "/services/privacy-sdk-api-starter" },
      { label: "Proof center", href: "/proof" },
    ],
  },
];

export function ServiceLauncher({ compact = false }: { compact?: boolean }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-[28px] border border-emerald-300/18 bg-[linear-gradient(135deg,rgba(20,241,149,0.12),rgba(0,194,255,0.08),rgba(153,69,255,0.10),rgba(3,7,18,0.96))] p-4 sm:p-6">
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-100/78">Choose a service to try</div>
          <h2 className="mt-3 max-w-4xl text-2xl font-semibold tracking-[-0.035em] text-white md:text-3xl">
            Start with the pain, pick the service, run the Testnet path.
          </h2>
          <p className="mt-3 max-w-5xl text-sm leading-7 text-white/66">
            PrivateDAO is not a maze of integrations. Choose governance, rooms, treasury, payouts, intelligence, or GamingDAO,
            then continue directly into the wallet-first flow and proof route.
          </p>
        </div>
        <Link href="/try" className={cn(buttonVariants({ size: "sm" }))}>
          Try the fastest flow
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <div className={cn("mt-5 grid gap-3", compact ? "lg:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3")}>
        {services.map((service) => {
          const Icon = service.icon;

          return (
            <article key={service.title} className="min-w-0 rounded-[22px] border border-white/10 bg-black/28 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-2.5 text-emerald-100">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-white">{service.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/58">{service.pain}</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-cyan-300/14 bg-cyan-300/[0.07] p-3 text-sm leading-6 text-white/68">
                {service.outcome}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {service.actions.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className={cn(buttonVariants({ size: "sm", variant: action.primary ? "default" : "outline" }))}
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
