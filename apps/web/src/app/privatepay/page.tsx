import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bot, CheckCircle2, LockKeyhole, ReceiptText, ShieldCheck } from "lucide-react";

import { OperationsShell } from "@/components/operations-shell";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "PrivatePAY x402",
  description:
    "PrivatePAY x402 lets agents and businesses pay for services with USDC on Solana through a MagicBlock private settlement rail, with wallet authorization and machine-readable receipts.",
  path: "/privatepay",
  keywords: ["PrivatePAY", "x402", "USDC", "Solana", "MagicBlock", "private settlement"],
});

const steps = [
  ["01", "Choose a service", "Select a paid capability from the PrivateDAO Agent Exchange."],
  ["02", "Approve the payment", "Your wallet authorizes the exact USDC amount and recipient."],
  ["03", "Private settlement", "MagicBlock processes the private transfer inside its TEE-backed rail."],
  ["04", "Receive the result", "The service returns a receipt that people and software can verify."],
] as const;

const features = [
  [LockKeyhole, "Private by design", "Private settlement reduces public payment linkability where the MagicBlock private rail applies."],
  [ShieldCheck, "Fail-closed controls", "The flow checks the exact quote, wallet authorization, PDAO rule, and facilitator response before acceptance."],
  [Bot, "Built for agents", "Use the MCP connector, x402 requests, or a business integration without handing PrivateDAO a private key."],
  [ReceiptText, "Clear commercial receipts", "Each accepted payment returns structured status, fees, settlement, and reconciliation evidence."],
] as const;

export default function PrivatePayPage() {
  return (
    <OperationsShell
      navigationMode="focused"
      eyebrow="PrivateDAO payment infrastructure"
      title="PrivatePAY x402: pay for services without publishing the payment trail"
      description="A commercial payment rail for people, agents, and businesses. Pay for PrivateDAO services with USDC on Solana, authorize each request in your wallet, and receive a verifiable result through the Agent Exchange."
      badges={[
        { label: "Solana Mainnet", variant: "success" },
        { label: "USDC", variant: "cyan" },
        { label: "MagicBlock private settlement", variant: "violet" },
        { label: "x402 v2", variant: "warning" },
      ]}
    >
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[20px] border border-[#bfe4d2] bg-[#f2fbf6] p-5">
          <CheckCircle2 className="h-5 w-5 text-[#16824c]" />
          <h2 className="mt-3 text-lg font-semibold text-[#10233f]">Live on Mainnet</h2>
          <p className="mt-2 text-sm leading-6 text-[#52657c]">The verified PrivatePAY rail is enabled and operational for the Solana private path.</p>
        </div>
        <div className="rounded-[20px] border border-[#cfe0f3] bg-[#f5f9ff] p-5">
          <Bot className="h-5 w-5 text-[#175cd3]" />
          <h2 className="mt-3 text-lg font-semibold text-[#10233f]">For people and agents</h2>
          <p className="mt-2 text-sm leading-6 text-[#52657c]">Connect through MCP or use the payment endpoint from a product, agent, or workflow.</p>
        </div>
        <div className="rounded-[20px] border border-[#ead7ba] bg-[#fffaf1] p-5">
          <ReceiptText className="h-5 w-5 text-[#a46708]" />
          <h2 className="mt-3 text-lg font-semibold text-[#10233f]">Commercially ready</h2>
          <p className="mt-2 text-sm leading-6 text-[#52657c]">Quotes, fees, settlement status, and receipts are returned in a machine-readable format.</p>
        </div>
      </section>

      <section className="mt-6 rounded-[24px] border border-[#dce5f0] bg-white p-6 shadow-[0_12px_32px_rgba(16,35,63,0.06)] sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#175cd3]">How it works</div>
            <h2 className="mt-3 text-2xl font-semibold text-[#10233f]">One payment path for a human or an agent</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5d6d82]">The payer remains in control: the wallet signs the payment, PrivateDAO verifies the exact request, and the service receives only the settlement result it needs.</p>
            <div className="mt-6 space-y-3">
              {steps.map(([number, title, body]) => (
                <div key={number} className="flex gap-4 rounded-[16px] border border-[#e1e8f1] bg-[#f8fafc] p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#175cd3] text-xs font-bold text-white">{number}</div>
                  <div><h3 className="font-semibold text-[#10233f]">{title}</h3><p className="mt-1 text-sm leading-6 text-[#5d6d82]">{body}</p></div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[20px] border border-[#dce5f0] bg-[#f7f9fc] p-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#7a8ba0]">Start here</div>
            <h2 className="mt-3 text-xl font-semibold text-[#10233f]">Connect PrivatePAY to your workflow</h2>
            <p className="mt-3 text-sm leading-7 text-[#5d6d82]">Use the public MCP endpoint for ChatGPT, Claude, Grok, Cursor, or another MCP-compatible client. The connector exposes discovery, quote, preparation, verification, settlement, and receipt tools.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href="https://agents.privatedao.org/mcp" target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm" }))}>Open MCP endpoint <ArrowRight className="h-4 w-4" /></a>
              <a href="https://glama.ai/mcp/connectors/io.github.X-PACT/pdao-agent-exchange" target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>View Glama connector</a>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        {features.map(([Icon, title, body]) => (
          <article key={title} className="rounded-[20px] border border-[#dce5f0] bg-white p-5">
            <Icon className="h-5 w-5 text-[#175cd3]" />
            <h2 className="mt-3 text-lg font-semibold text-[#10233f]">{title}</h2>
            <p className="mt-2 text-sm leading-7 text-[#5d6d82]">{body}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 rounded-[20px] border border-[#ead7ba] bg-[#fffaf1] p-5 text-sm leading-7 text-[#6d552d]">
        <strong className="text-[#5c431d]">Privacy boundary:</strong> PrivatePAY reduces public payment linkability through MagicBlock private settlement. The authenticated provider can see payment metadata, and deposits, withdrawals, fees, timing, and network-level traffic may still support independent analysis. PrivatePAY does not claim perfect anonymity.
      </section>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/contact" className={cn(buttonVariants({ size: "sm" }))}>Talk to PrivateDAO <ArrowRight className="h-4 w-4" /></Link>
        <Link href="/services/magicblock-private-payments" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>Open technical evidence</Link>
      </div>
    </OperationsShell>
  );
}
