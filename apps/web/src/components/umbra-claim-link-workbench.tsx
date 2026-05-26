"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { persistOperationReceipt } from "@/lib/supabase/operation-receipts";
import { buttonVariants } from "@/components/ui/button";
import { WalletOrSnsInput } from "@/components/wallet-or-sns-input";
import { cn } from "@/lib/utils";

type ClaimAsset = "PUSD" | "AUDD" | "USDC" | "USDT" | "SOL";
type IntentResponse = {
  ok?: boolean;
  mode?: string;
  source?: string;
  executionReference?: string;
  signature?: string;
  reference?: string;
  receipt?: {
    network?: string;
    executionReference?: string;
    receiptHash?: string;
    note?: string;
  };
};

function toBase64(value: string) {
  if (typeof window === "undefined") return "";
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}

export function UmbraClaimLinkWorkbench() {
  const [asset, setAsset] = useState<ClaimAsset>("USDC");
  const [amount, setAmount] = useState("25");
  const [recipientHint, setRecipientHint] = useState("contractor-01");
  const [recipientWallet, setRecipientWallet] = useState("B3STL1akxLGLvPpKd6Grz19jjVySkWrGgHFwGNK8yEZ");
  const [memo, setMemo] = useState("Umbra claim payout rehearsal");
  const [claimLink, setClaimLink] = useState("");
  const [status, setStatus] = useState("Build a claim link, then execute the claim settlement intent.");
  const [verificationUrl, setVerificationUrl] = useState("https://api.privatedao.org/api/v1/umbra/relayer/health");
  const [lastReceipt, setLastReceipt] = useState<IntentResponse | null>(null);
  const [running, setRunning] = useState(false);

  const payload = useMemo(
    () => ({
      rail: "umbra",
      operationType: "payment-link-claim",
      asset,
      amount: amount.trim(),
      recipient: recipientWallet.trim(),
      memo,
      recipientHint,
      auditMode: "confidential-payout",
      recipientVisibility: "recipient-private",
      createdAt: new Date().toISOString(),
    }),
    [amount, asset, memo, recipientHint, recipientWallet],
  );

  function buildClaimLink() {
    const encoded = toBase64(JSON.stringify(payload));
    const link = encoded ? `https://privatedao.org/services/umbra-confidential-payout?claim=${encodeURIComponent(encoded)}` : "";
    setClaimLink(link);
    setStatus(link ? "Testnet claim link prepared. Execute claim intent to record settlement continuity." : "Unable to prepare claim link.");
  }

  async function executeClaimIntent() {
    setRunning(true);
    setStatus("Submitting Umbra claim intent to the PrivateDAO Testnet read-node...");
    try {
      if (payload.recipient.length < 32 || payload.amount.length === 0 || Number(payload.amount) <= 0) {
        setStatus("Enter a valid Solana recipient and a positive amount before executing the Umbra intent.");
        return;
      }
      const endpoint =
        process.env.NEXT_PUBLIC_PRIVATE_SETTLEMENT_ENDPOINT?.trim() ||
        "https://api.privatedao.org/api/v1/private-settlement/intent";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => null)) as IntentResponse | null;
      const executionReference =
        body?.executionReference ||
        body?.receipt?.executionReference ||
        body?.signature ||
        body?.reference ||
        `umbra-${Date.now()}`;
      setLastReceipt(body);
      setVerificationUrl("https://api.privatedao.org/api/v1/umbra/relayer/health");

      await persistOperationReceipt({
        operationType: "umbra-payment-link-claim",
        proposalId: "umbra:payment-link-claim",
        approvalState: response.ok ? "forwarded" : "prepared",
        executionReference,
        privateSettlementRail: "umbra",
        stablecoinSymbol: asset,
        auditMode: "confidential-payout",
        recipientVisibility: "recipient-private",
        metadata: payload,
      });

      setStatus(
        response.ok
          ? `Umbra Testnet claim intent delivered. Reference: ${executionReference}`
          : `Umbra proxy responded ${response.status}. ${body?.receipt?.note || ""}`.trim(),
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Umbra claim intent failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-emerald-300/16 bg-emerald-300/[0.08] p-6">
      <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-100/78">Umbra claim-link lane</div>
      <h2 className="mt-3 text-2xl font-semibold text-white">Create a private claim link and execute the Testnet payout intent</h2>
      <p className="mt-3 max-w-4xl text-sm leading-7 text-white/66">
        This lane lets the visitor run the Umbra-style flow directly from the browser on the PrivateDAO Testnet
        operating surface. It prepares a claim link, forwards a recipient-private settlement intent to the read-node,
        records proof continuity, and leaves a live relayer health endpoint that the user can open immediately.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {[
          ["Network", "Solana Testnet"],
          ["User action", "Build -> execute -> verify"],
          ["Proof path", "Read-node receipt + live relayer health"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-emerald-200/14 bg-black/20 p-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-100/55">{label}</div>
            <div className="mt-1 text-sm font-medium text-white">{value}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-white/70">
              <div>Asset</div>
              <select value={asset} onChange={(event) => setAsset(event.target.value as ClaimAsset)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none">
                <option value="PUSD">PUSD</option>
                <option value="AUDD">AUDD</option>
                <option value="USDC">USDC</option>
                <option value="USDT">USDT</option>
                <option value="SOL">SOL</option>
              </select>
            </label>
            <label className="space-y-2 text-sm text-white/70">
              <div>Amount</div>
              <input value={amount} onChange={(event) => setAmount(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none" />
            </label>
            <label className="space-y-2 text-sm text-white/70">
              <div>Recipient hint</div>
              <input value={recipientHint} onChange={(event) => setRecipientHint(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none" />
            </label>
            <WalletOrSnsInput label="Recipient wallet" value={recipientWallet} onChange={setRecipientWallet} />
          </div>
          <label className="mt-4 block space-y-2 text-sm text-white/70">
            <div>Memo</div>
            <textarea value={memo} onChange={(event) => setMemo(event.target.value)} rows={3} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none" />
          </label>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={buildClaimLink} className={cn(buttonVariants({ size: "sm" }))}>
              Build claim link
            </button>
            <button type="button" onClick={() => void executeClaimIntent()} disabled={running} className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
              {running ? "Executing..." : "Execute claim intent"}
            </button>
            <Link href="/proof" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              Open proof
            </Link>
            <a href={verificationUrl} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              Verify Testnet rail
            </a>
            <a href="https://explorer.solana.com/?cluster=testnet" target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              Open Testnet explorer
            </a>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/44">Delivery state</div>
            <div className="mt-3 text-sm leading-7 text-white/72">{status}</div>
          </div>
          <div className="rounded-[24px] border border-emerald-300/16 bg-emerald-300/[0.06] p-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-100/60">User-verifiable Testnet receipt</div>
            <div className="mt-3 text-sm leading-7 text-white/72">
              After execution, the receipt reports <span className="font-mono text-emerald-100">network: testnet</span>,
              the settlement rail, execution reference, and relayer boundary. The project keeps building and hardening
              this rail continuously without interrupting the public Testnet route.
            </div>
            <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs leading-6 text-white/58">
              Boundary: this browser action proves the Umbra Testnet intent route and relayer readiness. Full Umbra
              claim settlement becomes explorer-linked only when the wallet supplies SDK proof account data, UTXO slot
              data, and a submitted claim transaction.
            </div>
            <pre className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-xs leading-6 text-white/70">
              {lastReceipt ? JSON.stringify(lastReceipt, null, 2) : "Execute the claim intent to display the latest Testnet receipt."}
            </pre>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/44">Claim link</div>
            <pre className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-xs leading-6 text-white/70">
              {claimLink || "No link generated yet."}
            </pre>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/44">Claim intent payload</div>
            <pre className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-xs leading-6 text-white/70">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
