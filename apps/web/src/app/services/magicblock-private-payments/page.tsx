import type { Metadata } from "next";
import Link from "next/link";

import { LocalizedRouteSummary } from "@/components/localized-route-summary";
import { MagicBlockPrivatePaymentsStatus } from "@/components/magicblock-private-payments-status";
import { OperationsShell } from "@/components/operations-shell";
import { buttonVariants } from "@/components/ui/button";
import { buildRouteMetadata } from "@/lib/route-metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildRouteMetadata({
  title: "MagicBlock Private Payments",
  description:
    "MagicBlock private payment corridor with on-chain Testnet proof, challenge/login authenticated private reads, and wallet-signed deposit, transfer, withdraw, settle, and execute receipts.",
  path: "/services/magicblock-private-payments",
  keywords: ["magicblock", "private payments", "ephemeral rollups", "solana payments", "private balance"],
});

export default function MagicBlockPrivatePaymentsPage() {
  return (
    <OperationsShell
      eyebrow="MagicBlock track"
      title="On-chain private payment corridor for MagicBlock execution"
      description="This route exposes MagicBlock as an execution lane: live Solana RPC proof for the corridor, finalized private payment receipts, challenge initiation, bearer-token private reads, and wallet-signed continuation in one place."
      badges={[
        { label: "Private Payments API", variant: "cyan" },
        { label: "Challenge/login", variant: "success" },
        { label: "On-chain receipts", variant: "violet" },
      ]}
    >
      <LocalizedRouteSummary routeKey="services" />

      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
        <div className="text-[11px] uppercase tracking-[0.28em] text-white/44">Reviewer route</div>
        <h2 className="mt-3 text-2xl font-semibold text-white">MagicBlock proof starts on-chain, then protects private reads</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/66">
          The public proof endpoint checks the corridor PDA and finalized Testnet receipts live through Solana RPC. Private
          balances remain behind MagicBlock challenge/login, then the user wallet signs and submits any payment
          transaction to the connection returned by the payments API.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/services/umbra-confidential-payout" className={cn(buttonVariants({ size: "sm" }))}>
            Open Umbra payout lane
          </Link>
          <Link href="/services/cloak-private-settlement" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
            Open Cloak lane
          </Link>
          <Link href="/proof" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Open proof
          </Link>
        </div>
      </div>

      <MagicBlockPrivatePaymentsStatus />
    </OperationsShell>
  );
}
