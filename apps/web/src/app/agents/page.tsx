import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Bot, CheckCircle2, FileCheck2, Radio } from "lucide-react";

import { OperationsShell } from "@/components/operations-shell";
import { AgentExchangeDemoPanel } from "@/components/agent-exchange-demo-panel";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

const agentExchangeBase = "https://agents.privatedao.org";

export const metadata: Metadata = buildRouteMetadata({
  title: "Agent Marketplace",
  description:
    "Give your team a faster way to verify assets, understand risk, and make better decisions with PrivateDAO Cloud.",
  path: "/agents",
  keywords: ["PrivateDAO Agent Marketplace", "A2A agents", "MCP services", "verifiable agent receipts"],
});

const exchangeLinks = [
  ["Explore services", `${agentExchangeBase}/api/services`, "Find a useful capability for your organization or product."],
  ["Connect your system", `${agentExchangeBase}/connect`, "Start a guided connection when you are ready to use a service."],
  ["Check a service", `${agentExchangeBase}/.well-known/agent-card.json`, "Confirm what a service can do before it is used."],
] as const;

const operatingLoop = [
  { Icon: Radio, label: "Discover", text: "Find a capability from the live exchange." },
  { Icon: FileCheck2, label: "Execute", text: "Run a useful verification or workflow." },
  { Icon: CheckCircle2, label: "Verify", text: "Check the receipt and result independently." },
] as const;

export default function AgentsPage() {
  return (
    <OperationsShell
      eyebrow="Agent Marketplace"
      title="Turn complex blockchain work into a clear business decision."
      description="PrivateDAO Cloud brings verification, risk, intelligence, transaction guidance, and agent discovery into one trusted service layer. Start with a live example, then choose the capability that fits your team."
      navigationMode="guided"
      badges={[
        { label: "Live service discovery", variant: "cyan" },
        { label: "Verifiable results", variant: "success" },
        { label: "Live exchange", variant: "violet" },
      ]}
    >
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[28px] border border-cyan-300/20 bg-cyan-300/[0.055] p-5 sm:p-7">
          <div className="flex items-center gap-3 text-cyan-100">
            <div className="rounded-2xl border border-cyan-200/20 bg-cyan-200/10 p-3"><Bot className="h-6 w-6" /></div>
            <span className="text-xs font-semibold uppercase tracking-[0.22em]">For teams that need answers they can trust</span>
          </div>
          <h2 className="mt-6 max-w-2xl text-2xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
            Know what you are signing, buying, or approving.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
            Start with a free check, get the context your team is missing, and receive a result that can be reviewed later by colleagues, customers, or auditors.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={`${agentExchangeBase}/connect`} className={cn(buttonVariants({ size: "sm" }))}>
              See the five PDAO Cloud modules <ArrowUpRight className="h-4 w-4" />
            </a>
            <a href={`${agentExchangeBase}/api/services`} className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
              Try a live example <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </article>

        <article className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-7">
          <div className="text-[11px] uppercase tracking-[0.25em] text-white/45">A simple path to confidence</div>
          <div className="mt-5 grid gap-3">
            {operatingLoop.map(({ Icon, label, text }) => (
              <div key={label} className="flex gap-3 rounded-2xl border border-white/8 bg-black/20 p-4">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-cyan-200" />
                <div><div className="font-semibold text-white">{label}</div><p className="mt-1 text-sm leading-6 text-white/55">{text}</p></div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {exchangeLinks.map(([title, href, text]) => (
          <a key={href} href={href} className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5 transition hover:border-cyan-200/30">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-white">{title}</h2>
              <ArrowUpRight className="h-4 w-4 text-cyan-200" />
            </div>
            <p className="mt-3 text-sm leading-6 text-white/58">{text}</p>
          </a>
        ))}
      </section>

      <AgentExchangeDemoPanel />

      <details className="enterprise-advanced-details rounded-[28px] border border-[#dce5f0] bg-[#f7f9fc] p-5 sm:p-7">
        <summary className="cursor-pointer text-sm font-semibold text-[#10233f]">Technical access for your team</summary>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href={`${agentExchangeBase}/a2a`} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>A2A</a>
          <a href={`${agentExchangeBase}/mcp`} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>MCP</a>
          <a href={`${agentExchangeBase}/openapi.json`} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>OpenAPI</a>
          <Link href="/developers" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>Developer workspace</Link>
        </div>
      </details>
    </OperationsShell>
  );
}
