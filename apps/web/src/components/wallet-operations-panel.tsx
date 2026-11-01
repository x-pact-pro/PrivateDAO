"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Bot, CircleDollarSign, Loader2, RefreshCw } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const API_BASE = (process.env.NEXT_PUBLIC_AGENT_EXCHANGE_API_BASE || "https://agents.privatedao.org").replace(/\/$/, "");

type ExchangeService = {
  id: string;
  title: string;
  category?: string;
  summary?: string;
  price?: number;
  currency?: string;
  free?: boolean;
  status?: string;
  public_url?: string;
};

type PrivatePayStatus = {
  status?: string;
  enabled?: boolean;
  operational?: boolean;
  supported_payment_networks?: string[];
  activation_blockers?: string[];
  privacy_rail?: string;
};

type LoadState = "loading" | "ready" | "error";

function readServices(payload: unknown): ExchangeService[] {
  const value = payload && typeof payload === "object" && "services" in payload ? payload.services : payload;
  if (!Array.isArray(value)) return [];
  return value.filter((service): service is ExchangeService => {
    if (!service || typeof service !== "object") return false;
    const candidate = service as Partial<ExchangeService>;
    return typeof candidate.id === "string" && typeof candidate.title === "string";
  });
}

function readPrivatePayStatus(payload: unknown): PrivatePayStatus {
  if (!payload || typeof payload !== "object") return {};
  const value = payload as Record<string, unknown>;
  return {
    status: typeof value.status === "string" ? value.status : undefined,
    enabled: typeof value.enabled === "boolean" ? value.enabled : undefined,
    operational: typeof value.operational === "boolean" ? value.operational : undefined,
    supported_payment_networks: Array.isArray(value.supported_payment_networks)
      ? value.supported_payment_networks.filter((item): item is string => typeof item === "string")
      : undefined,
    activation_blockers: Array.isArray(value.activation_blockers)
      ? value.activation_blockers.filter((item): item is string => typeof item === "string")
      : undefined,
    privacy_rail: typeof value.privacy_rail === "string" ? value.privacy_rail : undefined,
  };
}

export function WalletOperationsPanel() {
  const [services, setServices] = useState<ExchangeService[]>([]);
  const [privatePay, setPrivatePay] = useState<PrivatePayStatus>({});
  const [state, setState] = useState<LoadState>("loading");
  const [message, setMessage] = useState<string | null>(null);

  const loadOperations = useCallback(async (signal?: AbortSignal) => {
    setState("loading");
    setMessage(null);
    try {
      const [servicesResponse, privatePayResponse] = await Promise.all([
        fetch(`${API_BASE}/api/services`, { signal, headers: { accept: "application/json" } }),
        fetch(`${API_BASE}/api/privatepay/status`, { signal, headers: { accept: "application/json" } }),
      ]);
      if (!servicesResponse.ok || !privatePayResponse.ok) {
        throw new Error("PrivateDAO service status is temporarily unavailable.");
      }
      const [servicesPayload, privatePayPayload] = await Promise.all([
        servicesResponse.json(),
        privatePayResponse.json(),
      ]);
      setServices(readServices(servicesPayload));
      setPrivatePay(readPrivatePayStatus(privatePayPayload));
      setState("ready");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setState("error");
      setMessage(error instanceof Error ? error.message : "Unable to load PrivateDAO operations.");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadOperations(controller.signal);
    return () => controller.abort();
  }, [loadOperations]);

  const freeServices = useMemo(() => services.filter((service) => service.free || service.price === 0), [services]);
  const paidServices = useMemo(() => services.filter((service) => !service.free && service.price !== 0), [services]);
  const privatePayReady = privatePay.enabled === true && privatePay.operational !== false;

  return (
    <section aria-labelledby="wallet-operations-title" className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#175cd3]">Connected operations</div>
          <h2 id="wallet-operations-title" className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#10233f]">Use this wallet across PrivateDAO</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5d6d82]">Browse live services, start with a free result, or review an exact USDC quote before your wallet signs anything.</p>
        </div>
        <button type="button" onClick={() => void loadOperations()} disabled={state === "loading"} className={cn(buttonVariants({ size: "sm", variant: "outline" }), "shrink-0")}>
          {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh services
        </button>
      </div>

      {message ? <div role="alert" className="rounded-[14px] border border-[#f0c9cd] bg-[#fff7f7] px-4 py-3 text-sm text-[#9b3038]">{message}</div> : null}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-[#175cd3]" /> Agent Exchange</CardTitle>
            <CardDescription>{state === "ready" ? `${services.length} live services · ${freeServices.length} free starting points · ${paidServices.length} quote-first services` : "Loading the live service catalog..."}</CardDescription>
          </CardHeader>
          <CardContent>
            {services.length === 0 && state === "loading" ? <div className="flex items-center gap-2 py-4 text-sm text-[#5d6d82]"><Loader2 className="h-4 w-4 animate-spin" /> Loading catalog</div> : null}
            {services.length > 0 ? <div className="grid gap-3 sm:grid-cols-2">
              {services.slice(0, 4).map((service) => <a key={service.id} href={service.public_url || `${API_BASE}/marketplace`} target="_blank" rel="noreferrer" className="group rounded-[14px] border border-[#dce5f0] p-4 transition hover:border-[#175cd3] hover:bg-[#f7faff]">
                <div className="flex items-start justify-between gap-3"><div><div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7a8ba0]">{service.category || "Service"}</div><div className="mt-1 font-semibold text-[#10233f]">{service.title}</div></div><ArrowUpRight className="h-4 w-4 shrink-0 text-[#7a8ba0] transition group-hover:text-[#175cd3]" /></div>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#5d6d82]">{service.summary || "Open the live service details."}</p>
                <div className="mt-3 text-xs font-medium text-[#175cd3]">{service.free || service.price === 0 ? "Free" : `${service.price ?? "Quote"} ${service.currency || "USDC"} · quote first`}</div>
              </a>)}
            </div> : null}
            <div className="mt-4 flex flex-wrap gap-3"><Link href="/agents" className={cn(buttonVariants({ size: "sm" }))}>Open marketplace <ArrowUpRight className="h-4 w-4" /></Link><a href={`${API_BASE}/api/services`} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>View API catalog</a></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CircleDollarSign className="h-5 w-5 text-[#087f5b]" /> PrivatePAY x402</CardTitle><CardDescription>Quote-first USDC settlement through the connected wallet.</CardDescription></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#16824c]"><span className="h-2.5 w-2.5 rounded-full bg-[#16824c]" />{state === "ready" ? (privatePayReady ? "Operational" : privatePay.status || "Status unavailable") : "Checking status"}</div>
            <dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-[#7a8ba0]">Network</dt><dd className="text-right font-medium text-[#10233f]">Solana Mainnet</dd></div><div className="flex justify-between gap-4"><dt className="text-[#7a8ba0]">Rail</dt><dd className="text-right font-medium text-[#10233f]">MagicBlock private settlement</dd></div><div className="flex justify-between gap-4"><dt className="text-[#7a8ba0]">Wallet custody</dt><dd className="text-right font-medium text-[#10233f]">Local signing</dd></div></dl>
            <Link href="/privatepay" className={cn(buttonVariants({ size: "sm" }), "mt-5 w-full justify-center bg-[#087f5b] hover:bg-[#066e4f]")}>Review exact quote <ArrowUpRight className="h-4 w-4" /></Link>
            {privatePay.activation_blockers?.length ? <p className="mt-3 text-xs leading-5 text-[#8a641f]">Some provider capabilities may remain unavailable until their activation checks pass.</p> : null}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
