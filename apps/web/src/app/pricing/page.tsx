import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Code2,
  Cpu,
  KeyRound,
  Landmark,
  Network,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

import { OperationsShell } from "@/components/operations-shell";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "Pricing",
  description:
    "PrivateDAO pricing for private governance, confidential payroll, gaming DAO operations, treasury intelligence, API access, and managed Solana Testnet infrastructure.",
  path: "/pricing",
  keywords: ["pricing", "DAO", "confidential payroll", "QVAC", "GoldRush", "Umbra", "Cloak", "MagicBlock", "REFHE"],
});

const tiers = [
  {
    name: "OPEN",
    price: "Free forever",
    target: "Developers, solo founders, researchers",
    badge: "No credit card. No wallet required to explore.",
    cta: "Start Building Free",
    href: "/start/",
    icon: Sparkles,
    features: [
      "Full Solana Testnet access",
      "Commit-reveal private voting protocol",
      "Up to 3 active DAOs",
      "10 proposals per month",
      "Basic ZK proof receipts",
      "QVAC local AI in browser",
      "GitHub source access",
      "Community support",
    ],
  },
  {
    name: "COLLECTIVE",
    price: "$299 / month",
    target: "DAOs, gaming guilds, grant committees, investment clubs",
    badge: "Less than one treasury mistake costs.",
    cta: "Start 14-day Trial",
    href: "/onboard/?tier=collective",
    icon: UsersRound,
    highlighted: true,
    features: [
      "Unlimited DAOs and proposals",
      "Cloak confidential settlement lane",
      "REFHE settlement corridor",
      "GoldRush wallet intelligence",
      "Priority RPC lane",
      "1-year Supabase receipt archive",
      "5 team seats",
      "Basic compliance reports",
      "99.5% uptime target",
    ],
  },
  {
    name: "INSTITUTION",
    price: "$1,499 / month",
    target: "Funds, Web3 companies, studios, serious treasury operators",
    badge: "Built for teams managing high-value treasuries.",
    cta: "Book a Demo",
    href: "/onboard/?tier=institution",
    icon: Landmark,
    features: [
      "Full confidential payroll module",
      "ZK proof anchors across the workflow",
      "MagicBlock gaming corridor",
      "Jupiter treasury rebalancing",
      "Dedicated QVAC governance assistant",
      "Umbra + Cloak relay integration path",
      "20 team seats",
      "Advanced compliance reporting",
      "99.9% uptime target",
    ],
  },
  {
    name: "SOVEREIGN",
    price: "Custom",
    target: "Large protocols, infrastructure teams, enterprise DAOs",
    badge: "Dedicated infrastructure, custom controls, direct founder support.",
    cta: "Contact Founder Directly",
    href: "/onboard/?tier=sovereign",
    icon: Building2,
    features: [
      "Dedicated EC2/VPC or customer cloud deployment",
      "Custom ZK and REFHE configuration",
      "On-prem or local-first QVAC deployment",
      "White-label option",
      "Unlimited seats",
      "Custom SLA up to 99.99%",
      "Quarterly security review",
      "API-first custom integrations",
      "Governance strategy consulting",
    ],
  },
] as const;

const developerProducts = [
  {
    name: "API ACCESS",
    price: "$99 / month",
    icon: Code2,
    href: "/onboard/?tier=api",
    features: ["REST API at api.privatedao.org/api/v1", "10,000 calls per month", "Governance, treasury, proof, QVAC, analytics", "Webhook support", "Sandbox environment"],
  },
  {
    name: "SDK LICENSE",
    price: "$499 / month",
    icon: Cpu,
    href: "/onboard/?tier=sdk",
    features: ["Anchor CPI access", "TypeScript SDK path", "QVAC integration kit", "REFHE settlement primitives", "Instruction templates", "Developer support"],
  },
  {
    name: "PROTOCOL LICENSE",
    price: "Custom",
    icon: KeyRound,
    href: "/onboard/?tier=protocol",
    features: ["White-label deployment", "Run your own instance", "Custom tokenomics", "Revenue share option", "Dedicated integration support"],
  },
] as const;

const featureRows = [
  ["Active DAOs", "3", "Unlimited", "Unlimited", "Unlimited"],
  ["Proposals", "10 / month", "Unlimited", "Unlimited", "Unlimited"],
  ["Private voting", "Commit-reveal", "Commit-reveal", "ZK anchored", "Custom ZK"],
  ["Confidential payout", "Testnet demo", "Cloak lane", "Umbra + Cloak", "Dedicated relay"],
  ["Confidential payroll", "Preview", "Basic", "Full", "Custom"],
  ["Gaming DAO", "Preview", "Guild + rewards", "MagicBlock corridor", "White-label"],
  ["QVAC AI", "Browser local", "Proposal briefs", "Dedicated assistant", "On-prem/local-first"],
  ["GoldRush intelligence", "Basic", "Wallet checks", "Treasury intelligence", "Custom data packs"],
  ["Receipt archive", "Local/basic", "1 year", "3 years", "Custom retention"],
  ["Support", "Community", "Priority", "Dedicated", "24/7 critical path"],
  ["Seats", "1", "5", "20", "Unlimited"],
  ["SLA target", "Best effort", "99.5%", "99.9%", "Custom"],
] as const;

const techSignals = [
  ["Cloak", "confidential settlement"],
  ["Umbra", "recipient-private payout path"],
  ["QVAC", "local sovereign AI"],
  ["GoldRush", "wallet intelligence"],
  ["Zerion", "agent policy lane"],
  ["Eitherway", "live dApp hosting"],
  ["MagicBlock", "fast execution corridor"],
  ["ZK", "proof anchors"],
  ["REFHE / Encrypt", "confidential computation"],
  ["IKA", "dWallet approval path"],
  ["SNS", ".sol identity lookup"],
  ["Torque", "growth event loop"],
] as const;

export default function PricingPage() {
  return (
    <OperationsShell
      eyebrow="Pricing"
      title="Private governance infrastructure, built for every operating scale"
      description="From solo builders to managed treasury operators: one Solana-native protocol for private voting, confidential payroll, gaming rewards, intelligence, receipts, and API access."
      badges={[
        { label: "Testnet live", variant: "success" },
        { label: "Business-ready", variant: "cyan" },
        { label: "No terminal required", variant: "violet" },
      ]}
    >
      <section className="rounded-[34px] border border-cyan-300/18 bg-[radial-gradient(circle_at_12%_0%,rgba(20,241,149,0.18),transparent_32%),radial-gradient(circle_at_85%_20%,rgba(153,69,255,0.18),transparent_34%),linear-gradient(180deg,rgba(7,12,24,0.98),rgba(4,7,16,0.99))] p-6 sm:p-8">
        <div className="grid gap-7 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <Badge variant="cyan">One protocol. Four tiers.</Badge>
            <h2 className="mt-5 max-w-4xl text-4xl font-semibold tracking-[-0.055em] text-white sm:text-6xl">
              Pay for managed privacy only when your treasury needs it.
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-8 text-white/66">
              Explore freely on Testnet. Upgrade for managed reliability, private payout lanes, compliance-ready receipts,
              intelligence, automation, and developer access.
            </p>
          </div>
          <Card className="border-emerald-300/18 bg-emerald-300/[0.08]">
            <CardContent className="space-y-4 p-6">
              {[
                ["Governance OS", "DAO creation, proposals, voting, execution"],
                ["Confidential operations", "Payroll, vendor payouts, gaming rewards"],
                ["Intelligence layer", "QVAC, Covalent GoldRush, SNS, Zerion policy"],
                ["Proof layer", "ZK, REFHE, IKA, receipts, Solscan links"],
              ].map(([title, body]) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="font-semibold text-white">{title}</div>
                  <div className="mt-1 text-sm text-white/56">{body}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-4">
        {tiers.map((tier) => {
          const Icon = tier.icon;
          const isHighlighted = tier.name === "COLLECTIVE";
          return (
            <Card
              key={tier.name}
              className={cn(
                "relative overflow-hidden border-white/10 bg-white/[0.035] transition hover:-translate-y-1 hover:border-cyan-300/30",
                isHighlighted && "border-cyan-300/28 bg-cyan-300/[0.08] shadow-[0_0_80px_rgba(34,211,238,0.12)]",
              )}
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-cyan-100">
                    <Icon className="h-5 w-5" />
                  </div>
                  {isHighlighted ? <Badge variant="success">Most practical</Badge> : null}
                </div>
                <div className="mt-4 text-[11px] uppercase tracking-[0.24em] text-white/42">{tier.name}</div>
                <CardTitle className="text-3xl">{tier.price}</CardTitle>
                <p className="text-sm leading-6 text-white/58">{tier.target}</p>
                <p className="rounded-2xl border border-white/8 bg-black/18 px-3 py-2 text-xs leading-5 text-white/52">{tier.badge}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link href={tier.href} className={cn(buttonVariants({ className: "w-full" }))}>
                  {tier.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <div className="space-y-2">
                  {tier.features.map((feature) => (
                    <div key={feature} className="flex gap-2 text-sm leading-6 text-white/64">
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-200" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <section className="rounded-[30px] border border-white/10 bg-white/[0.035] p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Badge variant="violet">Developer products</Badge>
            <h2 className="mt-3 text-3xl font-semibold text-white">Build on the PrivateDAO protocol</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-white/60">
              API, SDK, and protocol licensing give builders a commercial path without turning every team into protocol engineers.
            </p>
          </div>
          <Link href="/developers/" className={cn(buttonVariants({ variant: "outline" }))}>
            View API docs
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {developerProducts.map((product) => {
            const Icon = product.icon;
            return (
              <Card key={product.name} className="border-white/10 bg-black/20">
                <CardHeader>
                  <Icon className="h-6 w-6 text-cyan-100" />
                  <div className="text-[11px] uppercase tracking-[0.24em] text-white/42">{product.name}</div>
                  <CardTitle>{product.price}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {product.features.map((feature) => (
                    <div key={feature} className="text-sm leading-6 text-white/62">{feature}</div>
                  ))}
                  <Link href={product.href} className={cn(buttonVariants({ className: "w-full", variant: "secondary" }))}>
                    Get access
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-[30px] border border-white/10 bg-black/22">
        <div className="grid grid-cols-[1.35fr_repeat(4,0.9fr)] border-b border-white/10 bg-white/[0.04] text-xs uppercase tracking-[0.18em] text-white/44">
          {["Feature", "Open", "Collective", "Institution", "Sovereign"].map((head) => (
            <div key={head} className="px-4 py-4">{head}</div>
          ))}
        </div>
        {featureRows.map((row) => (
          <div key={row[0]} className="grid grid-cols-[1.35fr_repeat(4,0.9fr)] border-b border-white/8 text-sm text-white/62 last:border-b-0">
            {row.map((cell, index) => (
              <div key={`${row[0]}-${index}`} className={cn("px-4 py-4", index === 0 && "font-medium text-white")}>
                {cell}
              </div>
            ))}
          </div>
        ))}
      </section>

      <section className="rounded-[30px] border border-emerald-300/16 bg-emerald-300/[0.06] p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            [ShieldCheck, "All plans include open-source protocol access, Testnet verification, and Solana-native execution."],
            [ReceiptText, "Every signed operation can produce a proof receipt and a Solscan verification path."],
            [BadgeCheck, "1st Place Superteam Poland recognition is part of the current credibility packet."],
            [Network, "API and managed infrastructure are designed for grant, accelerator, and partner due diligence."],
          ].map(([Icon, text]) => {
            const TypedIcon = Icon as typeof ShieldCheck;
            return (
              <div key={text as string} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/66">
                <TypedIcon className="mb-3 h-5 w-5 text-emerald-100" />
                {text as string}
              </div>
            );
          })}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {techSignals.map(([name, role]) => (
            <span key={name} className="rounded-full border border-white/10 bg-black/18 px-3 py-1.5 text-xs text-white/58">
              <span className="font-semibold text-white">{name}</span> · {role}
            </span>
          ))}
        </div>
      </section>

      <Card className="border-cyan-300/18 bg-cyan-300/[0.07]">
        <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xl font-semibold text-white">Need a full operating package?</div>
            <p className="mt-1 text-sm leading-6 text-white/62">
              DAO setup, private payroll rehearsal, treasury intelligence, gaming rewards, compliance receipts, and API access can be bundled into one onboarding brief.
            </p>
          </div>
          <Link href="/onboard/?tier=institution" className={cn(buttonVariants({ size: "lg" }))}>
            Send Governance Brief
            <ArrowRight className="h-4 w-4" />
          </Link>
        </CardContent>
      </Card>
    </OperationsShell>
  );
}
