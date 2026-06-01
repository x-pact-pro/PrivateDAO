import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { AssetContextCard } from "@/components/asset-context-card";
import { OperationsShell } from "@/components/operations-shell";
import { PrivatePayoutModes } from "@/components/private-payout-modes";
import { TransparencyReportPreview } from "@/components/transparency-report-preview";
import { WalletConnectButton } from "@/components/wallet-connect-button";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "Try Testnet Vote",
  description: "Run the simplest PrivateDAO path: connect wallet, choose DAO mode, create proposal, vote privately, reveal, verify, and execute.",
  path: "/try",
  keywords: ["try private dao", "testnet vote", "private voting", "reveal proof"],
});

const steps = [
  ["1", "Connect wallet", "Use a Solana Testnet wallet. No seed phrase. No mainnet funds."],
  ["2", "Choose DAO mode", "Public DAO with private voting, private room, or VIP room."],
  ["3", "Create proposal", "Write the public decision text members can understand."],
  ["4", "Vote privately", "No counts, percentages, identities, momentum, or whale signals while voting is active."],
  ["5", "Reveal outcome", "After the timer ends, results and aggregate counts become visible."],
  ["6", "Verify and execute", "Open proof, inspect the route, then execute the approved action."],
] as const;

export default function TryPage() {
  return (
    <OperationsShell
      eyebrow="Try PrivateDAO"
      title="Connect → Intelligence → Private Vote → Reveal → Verify → Execute"
      description="This route is the shortest product path. It hides technical complexity and lets a first-time visitor understand the value before seeing the provider stack."
      navigationMode="guided"
      badges={[
        { label: "No code", variant: "success" },
        { label: "Testnet", variant: "cyan" },
        { label: "Influence hidden", variant: "violet" },
      ]}
    >
      <section className="rounded-[30px] border border-emerald-300/18 bg-[linear-gradient(135deg,rgba(20,241,149,0.11),rgba(0,194,255,0.08),rgba(153,69,255,0.10))] p-5 md:p-6">
        <div className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-emerald-100/80">Main action</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-white md:text-4xl">
              Vote privately while it matters. Reveal transparently when it counts.
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/66">
              PrivateDAO keeps live influence signals hidden during voting. Members can still understand proposal context before signing, then everyone can verify the result after reveal.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <WalletConnectButton connectLabel="Connect Testnet Wallet" />
              <Link href="/govern#live-dao" className={cn(buttonVariants({ size: "sm" }))}>
                Start vote
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/proof/?judge=1" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                Verify proof
              </Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {steps.map(([number, title, body]) => (
              <Link key={title} href={number === "6" ? "/proof/?judge=1" : "/govern#live-dao"} className="rounded-[22px] border border-white/10 bg-black/22 p-4 transition hover:border-emerald-300/28 hover:bg-white/[0.055]">
                <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-100/70">{number}</div>
                <div className="mt-2 text-base font-semibold text-white">{title}</div>
                <p className="mt-2 text-sm leading-6 text-white/58">{body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <AssetContextCard symbol="USDC" amount="10000" useCase="treasury" />
      <PrivatePayoutModes />
      <TransparencyReportPreview compact />
    </OperationsShell>
  );
}
