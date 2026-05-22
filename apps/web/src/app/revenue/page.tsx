import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Building2, CheckCircle2, Server, UsersRound } from "lucide-react";

import { OperationsShell } from "@/components/operations-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "Revenue Model",
  description:
    "PrivateDAO revenue model with self-hosted, managed SLA, and enterprise compliance tiers for Solana DAO treasury privacy.",
  path: "/revenue",
  keywords: ["revenue", "pricing", "SLA", "enterprise", "DAO treasury", "TAM"],
});

const tiers = [
  {
    name: "OPEN PROTOCOL",
    price: "Free",
    icon: Server,
    points: ["Open source protocol", "Testnet product access", "Community learning and proof inspection"],
    tone: "border-white/10 bg-white/[0.035]",
  },
  {
    name: "PILOT",
    price: "$2,500 setup",
    icon: CheckCircle2,
    points: ["Four-week guided operating pilot", "One selected governance or payout workflow", "Buyer-readable proof and success report"],
    tone: "border-cyan-300/20 bg-cyan-300/[0.07]",
  },
  {
    name: "MANAGED + ENTERPRISE",
    price: "$750/month then custom",
    icon: Building2,
    points: ["Hosted reads, telemetry, and operator support", "Monthly proof packets and readiness review", "Dedicated infrastructure for sovereign deployments"],
    tone: "border-emerald-300/20 bg-emerald-300/[0.07]",
  },
] as const;

const buyerMotions = [
  ["Who pays first", "Grant committees, gaming guilds, funds, DAO operators, and Web3 teams with sensitive treasury approvals."],
  ["Why they pay", "They need private coordination, clean wallet signing, proof packets, and operator support without building protocol infrastructure themselves."],
  ["What converts", "A fixed pilot converts into managed operations when the team repeats the workflow or needs hosted reads, payroll, payouts, or proof exports every month."],
  ["Why this can scale", "The open protocol creates adoption, the pilot creates trust, the managed plan creates recurring revenue, and sovereign deployments create high-value enterprise upside."],
] as const;

export default function RevenuePage() {
  return (
    <OperationsShell
      eyebrow="Revenue"
      title="Privacy is a treasury operating requirement, not a cosmetic feature"
      description="PrivateDAO can stay open-source at the protocol layer while monetizing managed uptime, priority reads, audit credits, and compliance packaging for teams that operate real treasuries."
      badges={[
        { label: "Open protocol", variant: "cyan" },
        { label: "SLA-ready", variant: "success" },
        { label: "Enterprise path", variant: "violet" },
      ]}
    >
      <section className="rounded-[34px] border border-emerald-300/18 bg-[radial-gradient(circle_at_10%_0%,rgba(20,241,149,0.18),transparent_34%),radial-gradient(circle_at_88%_10%,rgba(0,194,255,0.14),transparent_30%),linear-gradient(180deg,rgba(7,12,24,0.96),rgba(4,7,16,0.99))] p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.75fr] lg:items-center">
          <div>
            <h2 className="max-w-4xl text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              A business model judges can understand in one minute: open adoption, paid pilots, managed operations, sovereign deployments.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/64 sm:text-base sm:leading-8">
              Users can learn and test for free. Operating teams pay when privacy, proof, payroll, payout, or treasury workflows need guided rollout, hosted reads, operator support, and buyer-readable evidence.
            </p>
          </div>
          <Card className="border-amber-300/18 bg-amber-300/[0.07]">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <UsersRound className="h-5 w-5 text-amber-100" />
                Market thesis
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold leading-tight text-white">
              First revenue does not require mainnet overclaiming: sell a measured Testnet pilot, then convert repeat workflows into managed infrastructure.
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-4">
        {buyerMotions.map(([title, body]) => (
          <Card key={title} className="border-white/10 bg-white/[0.035]">
            <CardHeader>
              <CardTitle className="text-lg">{title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-7 text-white/64">{body}</CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {tiers.map((tier) => {
          const Icon = tier.icon;
          return (
            <Card key={tier.name} className={tier.tone}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-cyan-100">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.24em] text-white/42">{tier.name}</div>
                    <CardTitle className="mt-1">{tier.price}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-7 text-white/64">
                {tier.points.map((point) => (
                  <div key={point} className="flex gap-3 rounded-2xl border border-white/8 bg-black/18 px-4 py-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-100" />
                    <span>{point}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-cyan-300/16 bg-cyan-300/[0.055]">
        <CardContent className="flex flex-col gap-4 p-6 text-sm leading-7 text-white/66 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            Revenue aligns with the product boundary: the protocol remains inspectable, while pilot delivery, hosted reads,
            monthly proof packets, operator support, and sovereign deployment work become the paid operational layer.
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/services" className={cn(buttonVariants({ size: "lg" }))}>
              Open services
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link href="/judge" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
              Open judge route
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </OperationsShell>
  );
}
