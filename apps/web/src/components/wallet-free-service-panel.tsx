"use client";

import { useCallback, useState } from "react";
import { CheckCircle2, ExternalLink, FileCheck2, Loader2, Play, ReceiptText } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const API_BASE = (process.env.NEXT_PUBLIC_AGENT_EXCHANGE_API_BASE || "https://agents.privatedao.org").replace(/\/$/, "");
const DEFAULT_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

type Job = {
  id?: string;
  job_id?: string;
  status?: string;
  result?: unknown;
  receipt?: { id?: string; receipt_id?: string } | null;
  receipt_id?: string | null;
  error?: string;
};

function messageFor(payload: unknown, status: number) {
  if (payload && typeof payload === "object") {
    const value = payload as { message?: unknown; error?: unknown };
    if (typeof value.message === "string") return value.message;
    if (typeof value.error === "string") return value.error;
  }
  return `Agent Exchange request failed (HTTP ${status}).`;
}

async function readJson(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(messageFor(payload, response.status));
  return payload as Job;
}

export function WalletFreeServicePanel({ wallet }: { wallet: string }) {
  const [mint, setMint] = useState(DEFAULT_MINT);
  const [job, setJob] = useState<Job | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Run a free, read-only verification while your wallet stays local.");

  const run = useCallback(async () => {
    if (!wallet) {
      setStatus("Connect a wallet first to continue.");
      return;
    }
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,88}$/.test(mint.trim())) {
      setStatus("Enter a valid Solana mint address.");
      return;
    }
    setBusy(true);
    setJob(null);
    setStatus("Creating a free read-only verification job...");
    try {
      const created = await readJson(await fetch(`${API_BASE}/api/jobs`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          service_id: "verify.basic",
          input: { network: "solana-mainnet-beta", mint: mint.trim() },
          // Bind the free verification to the connected wallet for participation
          // records and downstream Questline validation. This remains read-only.
          payer: wallet,
        }),
      }));
      setJob(created);
      const jobId = created.id || created.job_id;
      if (!jobId) {
        setStatus("The service returned a response without a job id.");
        return;
      }
      let current = created;
      for (let attempt = 0; attempt < 12 && ["queued", "pending", "running", "processing"].includes(String(current.status)); attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 750));
        current = await readJson(await fetch(`${API_BASE}/api/jobs/${encodeURIComponent(jobId)}`, { headers: { accept: "application/json" } }));
        setJob(current);
      }
      if (["completed", "complete", "succeeded", "success"].includes(String(current.status))) {
        setStatus("Verification completed. The result and receipt are ready below.");
      } else if (current.error) {
        setStatus(current.error);
      } else {
        setStatus(`Verification status: ${current.status || "unknown"}. Refresh the job from Agent Exchange if it is still processing.`);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The free verification could not be completed.");
    } finally {
      setBusy(false);
    }
  }, [mint, wallet]);

  const jobId = job?.id || job?.job_id;
  const receiptId = job?.receipt?.id || job?.receipt?.receipt_id || job?.receipt_id;

  return (
    <Card aria-labelledby="wallet-free-service-title">
      <CardHeader>
        <CardTitle id="wallet-free-service-title" className="flex items-center gap-2"><FileCheck2 className="h-5 w-5 text-[#175cd3]" /> Run a free Agent Exchange service</CardTitle>
        <CardDescription>Start with Basic Verification. It is read-only, does not create a payment, and returns a machine-readable result.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-[12px] border border-[#dce5f0] bg-[#f7faff] p-4 text-sm text-[#425570]">
          <div className="flex items-center gap-2 font-semibold text-[#10233f]"><CheckCircle2 className="h-4 w-4 text-[#16824c]" /> Wallet selected</div>
          <div className="mt-2 break-all font-mono text-xs">{wallet}</div>
        </div>
        <label className="block text-sm font-semibold text-[#10233f]">Solana mint to verify
          <input value={mint} onChange={(event) => setMint(event.target.value)} disabled={busy} spellCheck={false} className="mt-2 block w-full rounded-[10px] border border-[#cfe0ef] bg-white px-3 py-2.5 font-mono text-sm" />
        </label>
        <button type="button" onClick={() => void run()} disabled={busy || !wallet} className={cn(buttonVariants({ size: "default" }), "w-full justify-center bg-[#175cd3] hover:bg-[#124eb8]")}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {busy ? "Running verification..." : "Run free verification"}
        </button>
        <div role="status" aria-live="polite" className="rounded-[12px] border border-[#dce5f0] bg-white px-4 py-3 text-sm leading-6 text-[#425570]">{status}</div>
        {job ? <div className="rounded-[12px] border border-[#dce5f0] bg-white p-4 text-sm">
          <div className="flex items-center justify-between gap-3"><span className="font-semibold text-[#10233f]">Job status</span><span className="font-mono text-xs text-[#5d6d82]">{job.status || "unknown"}</span></div>
          {jobId ? <div className="mt-2 break-all font-mono text-xs text-[#7a8ba0]">{jobId}</div> : null}
          {receiptId ? <a href={`${API_BASE}/api/receipts/${encodeURIComponent(receiptId)}`} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm", variant: "outline" }), "mt-3")}><ReceiptText className="h-4 w-4" /> Open receipt <ExternalLink className="h-3.5 w-3.5" /></a> : null}
        </div> : null}
      </CardContent>
    </Card>
  );
}
