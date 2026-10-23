"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ExternalLink, ShieldCheck, Sparkles } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const modules = [
  { id: "pdao-verify", name: "PDAO Verify", price: "$49/mo", description: "Evidence verification, transaction interpretation and receipts.", services: 5 },
  { id: "pdao-forensics", name: "PDAO Forensics Cloud", price: "$149/mo", description: "Contract, launch, asset-risk and anomaly investigation.", services: 5 },
  { id: "pdao-multichain-intelligence", name: "PDAO Multichain Intelligence", price: "$99/mo", description: "Wallet, asset, market and portfolio intelligence.", services: 7 },
  { id: "pdao-decision-transaction", name: "PDAO Decision & Transaction", price: "$129/mo", description: "Quotes, simulations and decision context before signing.", services: 5 },
  { id: "pdao-agent-network", name: "PDAO Agent Network", price: "$79/mo", description: "Discovery, matching, reputation and disclosed promotion.", services: 4 },
] as const;

const sampleChecks = [
  "Ownership and executable-state check",
  "Mint authority and freeze authority review",
  "Liquidity and market-context availability",
  "Evidence digest prepared for review",
] as const;

export function AgentExchangeDemoPanel() {
  const [ran, setRan] = useState(false);

  return (
    <section id="agent-demo" className="overflow-hidden rounded-[24px] border border-[#dce5f0] bg-[#f7f9fc] p-5 shadow-[0_16px_44px_rgba(16,35,63,0.08)] sm:p-8">
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <div className="flex items-center justify-between gap-3">
            <div className="commercial-eyebrow">Free demo</div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#dff7e9] px-3 py-1 text-xs font-bold text-[#087f5b]"><Sparkles className="h-3.5 w-3.5" /> No wallet required</span>
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[#10233f] sm:text-4xl">Try an AI agent before you connect anything.</h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-[#52647d]">See the shape of a PDAO Token Safety Check using a preloaded sample. The demo is local and deterministic; the marketplace is where you run the actual service on your own input.</p>
          <div className="mt-6 rounded-[16px] border border-[#dce5f0] bg-white p-4">
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#7a8ba0]">Preloaded example</div>
            <div className="mt-2 text-lg font-semibold text-[#10233f]">Sample Solana token contract</div>
            <div className="mt-1 break-all font-mono text-xs text-[#7a8ba0]">So11111111111111111111111111111111111111112</div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={() => setRan(true)} className={cn(buttonVariants({ size: "sm" }))}>
              {ran ? "Demo completed" : "Try it now"} <ArrowRight className="h-4 w-4" />
            </button>
            <a href="https://agents.privatedao.org/marketplace" target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              Explore marketplace <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="rounded-[18px] border border-[#dce5f0] bg-white p-5">
          <div className="flex items-center gap-3"><div className="rounded-[10px] bg-[#edf4ff] p-2.5"><ShieldCheck className="h-5 w-5 text-[#175cd3]" /></div><div><div className="font-semibold text-[#10233f]">PDAO Token Safety Check</div><div className="text-sm text-[#7a8ba0]">Sample report · read-only demonstration</div></div></div>
          <div className="mt-5 grid gap-2">
            {sampleChecks.map((check) => <div key={check} className="flex items-center gap-2 text-sm text-[#425570]"><CheckCircle2 className="h-4 w-4 shrink-0 text-[#087f5b]" />{check}</div>)}
          </div>
          <div aria-live="polite" className={cn("mt-5 border-t border-[#dce5f0] pt-5", ran ? "" : "text-[#7a8ba0]")}>
            {ran ? <><div className="text-xs font-bold uppercase tracking-[0.16em] text-[#087f5b]">Demo result</div><p className="mt-2 text-sm leading-6 text-[#425570]">The sample passed the bounded structural checks. No wallet was connected, no transaction was created, and no external provider was called.</p><Link href="https://agents.privatedao.org/marketplace" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#175cd3]">Run a real check in the marketplace <ArrowRight className="h-4 w-4" /></Link></> : <p className="text-sm leading-6">Press <strong>Try it now</strong> to see a sample report.</p>}
          </div>
        </div>
      </div>

      <div className="mt-8 border-t border-[#dce5f0] pt-7">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="commercial-eyebrow">PrivateDAO Agent Exchange</div><h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#10233f]">One platform. Five PDAO Cloud modules. 26 capabilities.</h3></div><Link href="https://agents.privatedao.org/api/marketplace/packaging" className="text-sm font-semibold text-[#175cd3]">View machine-readable packaging <ExternalLink className="ml-1 inline h-4 w-4" /></Link></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {modules.map((module) => <article key={module.id} className="border border-[#dce5f0] bg-white p-4"><div className="flex items-start justify-between gap-2"><h4 className="text-sm font-semibold leading-5 text-[#10233f]">{module.name}</h4><span className="shrink-0 text-xs font-bold text-[#087f5b]">{module.price}</span></div><p className="mt-2 text-xs leading-5 text-[#52647d]">{module.description}</p><div className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7a8ba0]">{module.services} services</div><a href={`https://agents.privatedao.org/marketplace#${module.id}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#175cd3]">Try now <ArrowRight className="h-3.5 w-3.5" /></a></article>)}
        </div>
        <p className="mt-4 text-xs leading-5 text-[#7a8ba0]">Alibaba subscription prices are separate from direct Agent Exchange execution. Direct paid requests remain quote-first and settle in USDC on Solana Mainnet. PDAO is optional for ordinary services.</p>
      </div>
    </section>
  );
}
