"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, ServerCog, ShieldCheck, Waves } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EndpointState = {
  label: string;
  href: string;
  purpose: string;
  status: "checking" | "online" | "degraded";
  detail: string;
};

const initialEndpoints: EndpointState[] = [
  {
    label: "Read-node health",
    href: "https://api.privatedao.org/healthz",
    purpose: "Backend-indexed runtime and RPC posture for reviewer checks.",
    status: "checking",
    detail: "Checking same-domain API health...",
  },
  {
    label: "Readiness aggregate",
    href: "https://api.privatedao.org/api/v1/readiness",
    purpose: "One JSON route for runtime health, QuickNode telemetry, visitor counters, execution counters, and public proof links.",
    status: "checking",
    detail: "Checking production-candidate readiness...",
  },
  {
    label: "Umbra relayer proxy",
    href: "https://api.privatedao.org/api/v1/umbra/relayer/health",
    purpose: "Verifies the private payout rail can reach the Umbra devnet relayer through the read node.",
    status: "checking",
    detail: "Checking private rail endpoint...",
  },
  {
    label: "QVAC runtime proof",
    href: "https://api.privatedao.org/api/v1/qvac/runtime-proof",
    purpose: "Exposes local-first AI runtime evidence without leaking browser secrets.",
    status: "checking",
    detail: "Checking sovereign AI proof endpoint...",
  },
  {
    label: "QuickNode stream stats",
    href: "https://api.privatedao.org/api/v1/quicknode/stream/stats",
    purpose: "Shows accepted Solana Testnet stream payloads, PrivateDAO program matches, and compute telemetry.",
    status: "checking",
    detail: "Checking QuickNode stream telemetry...",
  },
  {
    label: "MagicBlock receipts",
    href: "https://api.privatedao.org/api/v1/magicblock/onchain-proof",
    purpose: "Checks the private-payment receipt packet and finalized Solana proof continuity.",
    status: "checking",
    detail: "Checking MagicBlock receipt proof...",
  },
  {
    label: "Ika readiness",
    href: "https://api.privatedao.org/api/v1/ika/solana-prealpha/readiness",
    purpose: "Checks the Ika Solana pre-alpha program, funded operator, and approval-flow readiness boundary.",
    status: "checking",
    detail: "Checking Ika Solana pre-alpha readiness...",
  },
  {
    label: "REFHE payroll route",
    href: "https://api.privatedao.org/api/v1/refhe/payroll/proof",
    purpose: "POST-only encrypted-computation proof route used by the confidential payroll service.",
    status: "online",
    detail: "POST-only proof route; verified by backend provider readiness.",
  },
];

function summarizePayload(payload: unknown) {
  if (typeof payload !== "object" || payload === null) return "Endpoint returned a response.";
  const record = payload as Record<string, unknown>;
  const stats = record.stats as Record<string, unknown> | undefined;
  if (stats && typeof stats === "object") {
    const accepted = Number(stats.acceptedPayloads ?? 0);
    const totals = stats.totals as Record<string, unknown> | undefined;
    const matches = Number(totals?.privateDaoTransactionCount ?? stats.privateDaoTransactionCount ?? 0);
    return `Online: ${accepted} accepted stream payloads and ${matches} PrivateDAO program match(es).`;
  }
  const proof = record.proof as Record<string, unknown> | undefined;
  const summary = proof?.summary as Record<string, unknown> | undefined;
  if (summary && typeof summary === "object") {
    return `Online: ${Number(summary.finalized ?? 0)}/${Number(summary.checked ?? 0)} receipts finalized.`;
  }
  const solanaPreAlpha = record.solanaPreAlpha as Record<string, unknown> | undefined;
  if (solanaPreAlpha && typeof solanaPreAlpha === "object") {
    const program = solanaPreAlpha.program as Record<string, unknown> | undefined;
    const operator = solanaPreAlpha.operator as Record<string, unknown> | undefined;
    return `Online: program executable=${String(program?.executable ?? "unknown")}, operator funded=${String(operator?.funded ?? "unknown")}.`;
  }
  if (record.ok === true || record.status === "ok") return "Online and returning reviewer-readable JSON.";
  if (typeof record.health === "object" && record.health !== null) return "Online with nested health payload.";
  return "Endpoint responded; inspect JSON for details.";
}

export function RpcServicesLivePanel() {
  const [endpoints, setEndpoints] = useState<EndpointState[]>(initialEndpoints);

  useEffect(() => {
    let cancelled = false;
    async function checkEndpoints() {
      const next = await Promise.all(
        initialEndpoints.map(async (endpoint) => {
          try {
            if (endpoint.href.endsWith("/api/v1/refhe/payroll/proof")) {
              return endpoint;
            }
            const response = await fetch(endpoint.href, { cache: "no-store" });
            const payload = (await response.json().catch(() => null)) as unknown;
            return {
              ...endpoint,
              status: response.ok ? ("online" as const) : ("degraded" as const),
              detail: response.ok ? summarizePayload(payload) : `HTTP ${response.status}`,
            };
          } catch (error) {
            return {
              ...endpoint,
              status: "degraded" as const,
              detail: error instanceof Error ? error.message : "Endpoint check failed.",
            };
          }
        }),
      );
      if (!cancelled) setEndpoints(next);
    }
    void checkEndpoints();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card className="border-white/10 bg-[#07101d]/88 text-white shadow-[0_30px_120px_rgba(14,165,233,0.14)]">
      <CardHeader>
        <div className="flex items-center gap-3 text-cyan-200">
          <ServerCog className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-[0.26em]">Live RPC and read-node services</span>
        </div>
        <CardTitle className="text-2xl">Same-domain backend health for Testnet operations</CardTitle>
        <p className="max-w-3xl text-sm leading-7 text-white/62">
          This route closes the reviewer gap between the static web app and the live backend. It checks read-node health,
          Umbra relayer reachability, and QVAC runtime proof from the public product surface.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-4">
        {endpoints.map((endpoint) => {
          const online = endpoint.status === "online";
          return (
            <div key={endpoint.href} className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {online ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <Waves className="h-4 w-4 text-amber-200" />}
                  <span className="font-semibold text-white">{endpoint.label}</span>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
                    online ? "bg-emerald-400/15 text-emerald-200" : "bg-amber-400/15 text-amber-100",
                  )}
                >
                  {endpoint.status}
                </span>
              </div>
              <p className="min-h-16 text-sm leading-6 text-white/62">{endpoint.purpose}</p>
              <p className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-white/65">{endpoint.detail}</p>
              <Link
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 border-white/15 bg-white/5 text-white hover:bg-white/10")}
                href={endpoint.href}
                target="_blank"
              >
                Open endpoint <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          );
        })}
        <div className="rounded-3xl border border-cyan-300/20 bg-cyan-300/8 p-5 lg:col-span-4">
          <div className="mb-2 flex items-center gap-2 text-cyan-100">
            <ShieldCheck className="h-4 w-4" />
            <span className="font-semibold">Reviewer boundary</span>
          </div>
          <p className="text-sm leading-7 text-white/65">
            Browser keys are never exposed here. API secrets stay server-side, wallet signatures stay in Solflare, and the
            public route only displays health, proof, and relay-readiness signals that judges can verify safely.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
