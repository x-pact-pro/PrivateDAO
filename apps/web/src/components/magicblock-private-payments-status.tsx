"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type OnchainProof = {
  generatedAt: string;
  network: string;
  rpcEndpoint: string;
  proposal: string;
  corridorPda: string;
  corridorAccount: { exists: boolean; lamports: number; owner: string | null };
  settlementWallet: string;
  runtime: { health: string; apiBase: string; cluster: string; paymentApiCluster?: string; solanaRuntimeCluster?: string };
  transactions: Array<{ label: string; signature: string; status: string | null; confirmed: boolean; explorerUrl: string }>;
  summary: { checked: number; finalized: number; allFinalized: boolean };
};

type ProofResponse = { ok: boolean; proof?: OnchainProof; error?: string };

const endpoints = [
  ["On-chain proof", "https://api.privatedao.org/api/v1/magicblock/onchain-proof"],
  ["Health", "https://api.privatedao.org/api/v1/magicblock/health"],
  ["Challenge", "https://api.privatedao.org/api/v1/magicblock/challenge?pubkey=B3STL1akxLGLvPpKd6Grz19jjVySkWrGgHFwGNK8yEZ"],
  ["Payments API", "https://payments.magicblock.app/health"],
];

const flow = [
  "base-layer corridor account",
  "MagicBlock private deposit",
  "private transfer receipt",
  "withdraw receipt",
  "corridor settlement",
  "governed execute receipt",
  "wallet-signed private reads through challenge/login",
];

function short(value: string) {
  return value.length > 18 ? `${value.slice(0, 8)}...${value.slice(-8)}` : value;
}

export function MagicBlockPrivatePaymentsStatus() {
  const [proof, setProof] = useState<OnchainProof | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("https://api.privatedao.org/api/v1/magicblock/onchain-proof")
      .then((response) => response.json() as Promise<ProofResponse>)
      .then((payload) => {
        if (cancelled) return;
        if (payload.ok && payload.proof) {
          setProof(payload.proof);
          setError(null);
        } else {
          setError(payload.error || "On-chain proof endpoint returned no proof payload.");
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Unable to read MagicBlock proof now.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="rounded-[28px] border border-sky-300/16 bg-sky-300/[0.07] p-6">
      <div className="text-[11px] uppercase tracking-[0.28em] text-sky-100/78">MagicBlock on-chain corridor</div>
      <div className="mt-3 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div>
          <h2 className="text-2xl font-semibold text-white">Private payments are tied to explorer-visible Testnet receipts</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-white/66">
            PrivateDAO exposes the MagicBlock corridor as a live proof lane: the read-node verifies the corridor PDA and
            the deposit, private transfer, withdraw, settle, and execute signatures directly against Solana RPC. Private
            balance reads still require MagicBlock challenge/login, so sensitive state remains wallet-authorized.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/42">Receipts</div>
              <div className="mt-2 text-2xl font-semibold text-white">
                {proof ? `${proof.summary.finalized}/${proof.summary.checked}` : "reading"}
              </div>
              <div className="mt-1 text-xs text-white/52">finalized on Testnet</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/42">Corridor</div>
              <div className="mt-2 text-sm font-semibold text-white">{proof ? (proof.corridorAccount.exists ? "account live" : "checking") : "reading"}</div>
              <div className="mt-1 text-xs text-white/52">{proof ? short(proof.corridorPda) : "MagicBlock PDA"}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/42">Runtime</div>
              <div className="mt-2 text-sm font-semibold text-white">{proof ? proof.runtime.health : "reading"}</div>
              <div className="mt-1 text-xs text-white/52">
                {proof ? `Solana ${proof.runtime.solanaRuntimeCluster || proof.runtime.cluster}` : "Solana Testnet"} proof
              </div>
            </div>
          </div>

          {proof ? (
            <div className="mt-4 rounded-2xl border border-sky-200/14 bg-sky-200/[0.06] p-3 text-xs leading-6 text-sky-50/72">
              The corridor proof is verified on Solana {proof.network}. MagicBlock private balance reads still use the
              wallet-authorized Payments API boundary
              {proof.runtime.paymentApiCluster ? ` (${proof.runtime.paymentApiCluster})` : ""}; the page keeps those
              two clusters explicit instead of hiding the runtime boundary.
            </div>
          ) : null}

          {error ? <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">{error}</div> : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/viewer/magicblock/private-payments-live-probe.generated" className={cn(buttonVariants({ size: "sm" }))}>
              Open MagicBlock live probe
            </Link>
            {endpoints.map(([label, href]) => (
              <a key={label} href={href} className={cn(buttonVariants({ size: "sm", variant: label === "On-chain proof" ? "secondary" : "outline" }))}>
                {label}
              </a>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/44">Execution shape</div>
          <div className="mt-3 space-y-2">
            {flow.map((step, index) => (
              <div key={step} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/70">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 font-mono text-[11px] text-white/56">
                  {index + 1}
                </span>
                {step}
              </div>
            ))}
          </div>

          {proof?.transactions?.length ? (
            <div className="mt-4 space-y-2">
              {proof.transactions.map((tx) => (
                <a
                  key={tx.signature}
                  href={tx.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-2xl border border-emerald-300/14 bg-emerald-300/[0.06] px-3 py-2 text-xs text-white/70 transition hover:border-emerald-200/30 hover:bg-emerald-300/[0.1]"
                >
                  <span className="font-medium text-white">{tx.label}</span>
                  <span className="ml-2 text-emerald-100/70">{tx.confirmed ? "finalized" : tx.status || "checking"}</span>
                  <span className="mt-1 block break-all font-mono text-[11px] text-white/42">{short(tx.signature)}</span>
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
