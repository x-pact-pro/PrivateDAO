"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Upload, XCircle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import type { TxlineSettlementProofPackage } from "@/lib/txline-settlement";
import { cn } from "@/lib/utils";

const API_BASE = "/api/v1/txline";
const FALLBACK_API_BASE = "https://api.privatedao.org/api/v1/txline";
const storedTxlineSettlementProofKey = "privatedao-txline-settlement-proof";

type VerifyResponse = {
  ok: boolean;
  status: string;
  originalHash: string | null;
  recomputedHash: string | null;
  message: string;
};

async function verifyPackage(proofPackage: unknown): Promise<VerifyResponse> {
  let response = await fetch(`${API_BASE}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ publicProofPackage: proofPackage }),
  });
  const contentType = response.headers.get("content-type") ?? "";
  if (response.status === 404 || response.status === 405 || response.status === 502 || !contentType.includes("application/json")) {
    response = await fetch(`${FALLBACK_API_BASE}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ publicProofPackage: proofPackage }),
    });
  }
  return (await response.json()) as VerifyResponse;
}

function extractPackage(value: unknown): TxlineSettlementProofPackage | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const candidate = record.publicProofPackage ?? record.proofPackage ?? record.package ?? value;
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
  if (typeof (candidate as Record<string, unknown>).proofId !== "string") return null;
  return candidate as TxlineSettlementProofPackage;
}

export function TxlineSettlementVerifier({ proofId }: { proofId?: string }) {
  const [raw, setRaw] = useState("");
  const [proofPackage, setProofPackage] = useState<TxlineSettlementProofPackage | null>(null);
  const [verification, setVerification] = useState<VerifyResponse>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(storedTxlineSettlementProofKey);
    if (!stored) return;
    try {
      const parsed = extractPackage(JSON.parse(stored));
      if (parsed && (!proofId || parsed.proofId === proofId)) {
        setProofPackage(parsed);
        setRaw(JSON.stringify(parsed, null, 2));
        void verifyPackage(parsed).then(setVerification);
      }
    } catch {
      // Ignore invalid local data.
    }
  }, [proofId]);

  async function runVerify() {
    setError(undefined);
    setVerification(undefined);
    try {
      const parsed = extractPackage(JSON.parse(raw));
      if (!parsed) throw new Error("Paste a TxLINE settlement proof package JSON.");
      setProofPackage(parsed);
      setVerification(await verifyPackage(parsed));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to verify this package.");
    }
  }

  async function simulateTamper() {
    if (!proofPackage) return;
    const tampered = { ...proofPackage, matchId: `${proofPackage.matchId}-tampered` };
    setVerification(await verifyPackage(tampered));
  }

  async function uploadFile(file: File | null) {
    if (!file) return;
    const text = await file.text();
    setRaw(text);
    const parsed = extractPackage(JSON.parse(text));
    if (parsed) {
      setProofPackage(parsed);
      setVerification(await verifyPackage(parsed));
    }
  }

  return (
    <div className="grid gap-5">
      <section className={`rounded-[28px] border p-5 sm:p-6 ${verification?.ok ? "border-emerald-300/18 bg-emerald-300/[0.06]" : "border-white/10 bg-white/[0.035]"}`}>
        <div className="flex items-start gap-3">
          {verification?.ok ? (
            <CheckCircle2 className="mt-1 h-6 w-6 text-emerald-100" />
          ) : verification ? (
            <XCircle className="mt-1 h-6 w-6 text-red-100" />
          ) : (
            <Upload className="mt-1 h-6 w-6 text-cyan-100" />
          )}
          <div>
            <div className="text-2xl font-semibold text-white">
              {verification?.ok ? "Verification Passed" : verification ? "Verification Failed" : "Verify a settlement proof"}
            </div>
            <p className="mt-2 text-sm leading-7 text-white/64">
              {verification?.message ||
                "Paste or upload a TxLINE settlement proof package. No CLI or SDK required."}
            </p>
          </div>
        </div>

        {proofPackage && (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              ["matchId", proofPackage.matchId],
              ["marketId", proofPackage.marketId],
              ["circuitVersion", proofPackage.circuitVersion],
              ["policyVersion", proofPackage.policyVersion],
              ["proof hash", proofPackage.originalProofHash],
              ["TxLINE snapshot", proofPackage.txlineSnapshotHash],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-black/22 p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-white/42">{label}</div>
                <div className="mt-2 break-all font-mono text-xs text-white/72">{value}</div>
              </div>
            ))}
          </div>
        )}

        {verification && !verification.ok && (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-red-300/14 bg-black/22 p-4">
              <div className="text-[11px] uppercase tracking-[0.2em] text-white/42">Original hash</div>
              <div className="mt-2 break-all font-mono text-xs text-white/72">{verification.originalHash}</div>
            </div>
            <div className="rounded-2xl border border-red-300/14 bg-black/22 p-4">
              <div className="text-[11px] uppercase tracking-[0.2em] text-white/42">Recomputed hash</div>
              <div className="mt-2 break-all font-mono text-xs text-white/72">{verification.recomputedHash}</div>
            </div>
          </div>
        )}

        {proofPackage?.onchainReceipt?.transactionExplorerUrl && (
          <a
            href={proofPackage.onchainReceipt.transactionExplorerUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex rounded-full border border-emerald-200/20 bg-emerald-300/[0.08] px-4 py-2 text-sm font-semibold text-emerald-100"
          >
            Open on-chain receipt
          </a>
        )}
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-white/42">Proof package</div>
        <textarea
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          placeholder="Paste TxLINE settlement proof package JSON..."
          className="mt-4 min-h-72 w-full rounded-2xl border border-white/10 bg-black/30 p-4 font-mono text-xs text-white/76 outline-none focus:border-cyan-200/60"
        />
        {error && <div className="mt-3 text-sm text-red-100">{error}</div>}
        <div className="mt-4 flex flex-wrap gap-3">
          <label className={cn(buttonVariants({ size: "sm", variant: "outline" }), "cursor-pointer")}>
            Upload JSON
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => void uploadFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <button onClick={runVerify} className={cn(buttonVariants({ size: "sm" }))}>
            Verify
          </button>
          <button disabled={!proofPackage} onClick={simulateTamper} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Simulate Tamper
          </button>
        </div>
      </section>
    </div>
  );
}
