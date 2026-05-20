"use client";

import { useState } from "react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const curveOptions = [
  { value: "SECP256K1", label: "SECP256K1 / ECDSA", fit: "Bitcoin, Ethereum, bridgeless capital markets" },
  { value: "ED25519", label: "ED25519 / EdDSA", fit: "Solana-native signing model" },
  { value: "SECP256R1", label: "SECP256R1 / P-256", fit: "WebAuthn and institutional key policy" },
  { value: "RISTRETTO", label: "RISTRETTO / Schnorrkel", fit: "privacy and Substrate-style flows" },
];

type IkaRoutePreview = {
  solanaPreAlpha?: {
    grpcUrl?: string;
    rpcUrl?: string;
    programId?: string;
    executionBoundary?: string;
    program?: {
      executable?: boolean;
    };
    operator?: {
      publicKey?: string;
      balanceSol?: number;
      funded?: boolean;
    };
  };
};

export function IkaDwalletCustodyWorkbench() {
  const [curve, setCurve] = useState("SECP256K1");
  const [custodyMode, setCustodyMode] = useState("shared-dwallet");
  const [status, setStatus] = useState("Prepare a live Ika SDK custody route against testnet.");
  const [preview, setPreview] = useState("");
  const [routePreview, setRoutePreview] = useState<IkaRoutePreview | null>(null);
  const [running, setRunning] = useState(false);

  async function handlePrepare() {
    setRunning(true);
    setStatus("Initializing Ika SDK and reading live testnet custody config...");
    try {
      const response = await fetch("https://api.privatedao.org/api/v1/ika/custody/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          network: "testnet",
          curve,
          custodyMode,
          operationLabel: "PrivateDAO confidential payroll custody route",
        }),
      });
      const body = await response.json().catch(() => null);
      setRoutePreview(body && typeof body === "object" ? (body as IkaRoutePreview) : null);
      setPreview(JSON.stringify(body, null, 2));
      setStatus(
        response.ok
          ? "Ika route initialized. The response now shows Sui SDK readiness plus the funded Solana pre-alpha operator lane."
          : `Ika route responded ${response.status}.`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Ika custody route failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-violet-300/16 bg-violet-300/[0.08] p-6">
      <div className="text-[11px] uppercase tracking-[0.28em] text-violet-100/78">Ika dWallet custody route</div>
      <h2 className="mt-3 text-2xl font-semibold text-white">Programmable custody for private payroll and treasury execution</h2>
      <p className="mt-3 max-w-4xl text-sm leading-7 text-white/66">
        This workbench uses <code>@ika.xyz/sdk</code> on the read node to initialize Ika testnet, read the live network
        encryption key, choose the dWallet curve, and expose the exact boundary before DKG submission. It also reads the
        Ika Solana pre-alpha program and the funded devnet operator wallet used for the approval-flow lane.
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
            <div className="text-sm font-semibold text-white">Curve and custody mode</div>
            <div className="mt-3 grid gap-3">
              {curveOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCurve(option.value)}
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-left transition",
                    curve === option.value ? "border-violet-300/32 bg-violet-300/[0.12]" : "border-white/10 bg-black/20 hover:bg-white/[0.04]",
                  )}
                >
                  <div className="text-sm font-medium text-white">{option.label}</div>
                  <div className="mt-1 text-xs leading-5 text-white/52">{option.fit}</div>
                </button>
              ))}
            </div>
            <select
              value={custodyMode}
              onChange={(event) => setCustodyMode(event.target.value)}
              className="mt-4 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
            >
              <option value="shared-dwallet">Shared dWallet for DAO automation</option>
              <option value="zero-trust-dwallet">Zero-trust dWallet for user-held share</option>
              <option value="imported-key-dwallet">Imported-key dWallet migration plan</option>
            </select>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={() => void handlePrepare()} disabled={running} className={cn(buttonVariants({ size: "sm" }))}>
                {running ? "Preparing..." : "Prepare live Ika route"}
              </button>
              <Link href="/proof" className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
                Open proof
              </Link>
            </div>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/66">
            This is not a speculative trading lane. It is a custody and guardrail layer for governed payroll,
            treasury, agent permissions, and bridgeless capital operations.
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-emerald-300/16 bg-emerald-300/[0.08] p-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-100/76">Route status</div>
            <div className="mt-3 text-sm leading-7 text-white/72">{status}</div>
          </div>
          {routePreview?.solanaPreAlpha ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[20px] border border-white/10 bg-black/24 p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-white/44">Ika program</div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {routePreview.solanaPreAlpha.program?.executable ? "Executable" : "Not executable"}
                </div>
                <div className="mt-2 break-all text-xs leading-5 text-white/52">{routePreview.solanaPreAlpha.programId}</div>
              </div>
              <div className="rounded-[20px] border border-white/10 bg-black/24 p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-white/44">Operator wallet</div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {routePreview.solanaPreAlpha.operator?.funded ? `${routePreview.solanaPreAlpha.operator.balanceSol ?? 0} SOL funded` : "Needs SOL"}
                </div>
                <div className="mt-2 break-all text-xs leading-5 text-white/52">{routePreview.solanaPreAlpha.operator?.publicKey}</div>
              </div>
              <div className="rounded-[20px] border border-white/10 bg-black/24 p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-white/44">Execution lane</div>
                <div className="mt-2 text-sm font-semibold text-white">Solana devnet</div>
                <div className="mt-2 text-xs leading-5 text-white/52">{routePreview.solanaPreAlpha.executionBoundary}</div>
              </div>
            </div>
          ) : null}
          <pre className="max-h-[520px] overflow-auto rounded-[24px] border border-white/10 bg-black/30 p-4 text-xs leading-6 text-cyan-100/82">
            {preview || "The Ika SDK route response will appear here."}
          </pre>
        </div>
      </div>
    </section>
  );
}
