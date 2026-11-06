"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Bot, CircleDollarSign, Filter, Globe2, Loader2, RefreshCw, Send, ShieldCheck, SlidersHorizontal, UsersRound } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WalletPaidServicePanel } from "@/components/wallet-paid-service-panel";
import { PrivatePayAutopilotPanel } from "@/components/privatepay-autopilot-panel";
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
  container?: boolean;
  flow?: string;
  marketplace?: { service_count?: number };
};

type PrivatePayStatus = {
  status?: string;
  enabled?: boolean;
  operational?: boolean;
  supported_payment_networks?: string[];
  activation_blockers?: string[];
  privacy_rail?: string;
  payment_ingress_configured?: boolean;
  merchant_accounts_delegated?: boolean;
  merchant_account_delegation?: {
    accounts?: Array<{ role?: string; status?: string; delegated?: boolean }>;
  };
};

type AutopilotStatus = {
  enabled?: boolean;
  configured?: boolean;
  storage?: string;
  blockers?: string[];
  custody?: string;
  reusable_x402_credentials?: boolean;
  policy_limits?: {
    max_ttl_ms?: number;
    max_operations?: number;
    max_budget_base_units?: string;
  };
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
    payment_ingress_configured: value.payment_ingress_configured === true,
    merchant_accounts_delegated: value.merchant_accounts_delegated === true,
    merchant_account_delegation: value.merchant_account_delegation && typeof value.merchant_account_delegation === "object"
      ? { accounts: Array.isArray((value.merchant_account_delegation as Record<string, unknown>).accounts)
        ? ((value.merchant_account_delegation as Record<string, unknown>).accounts as unknown[]).filter((entry): entry is { role?: string; status?: string; delegated?: boolean } => Boolean(entry && typeof entry === "object"))
        : undefined }
      : undefined,
  };
}

function readAutopilotStatus(payload: unknown): AutopilotStatus {
  if (!payload || typeof payload !== "object") return {};
  const value = payload as Record<string, unknown>;
  const limits = value.policy_limits;
  const rawLimits = limits && typeof limits === "object" ? limits as Record<string, unknown> : undefined;
  const maxTtlMs = typeof rawLimits?.max_ttl_ms === "number" ? rawLimits.max_ttl_ms : undefined;
  const maxOperations = typeof rawLimits?.max_operations === "number" ? rawLimits.max_operations : undefined;
  const maxBudgetBaseUnits = typeof rawLimits?.max_budget_base_units === "string" ? rawLimits.max_budget_base_units : undefined;
  return {
    enabled: typeof value.enabled === "boolean" ? value.enabled : undefined,
    configured: typeof value.configured === "boolean" ? value.configured : undefined,
    storage: typeof value.storage === "string" ? value.storage : undefined,
    blockers: Array.isArray(value.blockers)
      ? value.blockers.filter((item): item is string => typeof item === "string")
      : undefined,
    custody: typeof value.custody === "string" ? value.custody : undefined,
    reusable_x402_credentials: typeof value.reusable_x402_credentials === "boolean"
      ? value.reusable_x402_credentials
      : undefined,
    policy_limits: rawLimits ? { max_ttl_ms: maxTtlMs, max_operations: maxOperations, max_budget_base_units: maxBudgetBaseUnits } : undefined,
  };
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 10_000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  const abort = () => controller.abort();
  init.signal?.addEventListener("abort", abort, { once: true });
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
    init.signal?.removeEventListener("abort", abort);
  }
}

export function WalletOperationsPanel({ wallet }: { wallet: string }) {
  const [services, setServices] = useState<ExchangeService[]>([]);
  const [privatePay, setPrivatePay] = useState<PrivatePayStatus>({});
  const [autopilot, setAutopilot] = useState<AutopilotStatus>({});
  const [state, setState] = useState<LoadState>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showAllServices, setShowAllServices] = useState(false);

  const loadOperations = useCallback(async (signal?: AbortSignal) => {
    setState("loading");
    setMessage(null);
    try {
      const [servicesResponse, privatePayResponse] = await Promise.all([
        fetchWithTimeout(`${API_BASE}/api/services`, { signal, headers: { accept: "application/json" } }),
        fetchWithTimeout(`${API_BASE}/api/privatepay/status`, { signal, headers: { accept: "application/json" } }),
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
      try {
        const autopilotResponse = await fetchWithTimeout(`${API_BASE}/api/privatepay/autopilot/status`, { signal, headers: { accept: "application/json" } });
        setAutopilot(autopilotResponse.ok ? readAutopilotStatus(await autopilotResponse.json()) : { blockers: ["Agent policy status is temporarily unavailable."] });
      } catch (autopilotError) {
        if (autopilotError instanceof DOMException && autopilotError.name === "AbortError") return;
        setAutopilot({ blockers: ["Agent policy status is temporarily unavailable."] });
      }
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
  const privatePayCatalog = services.find((service) => service.id === "privatepay.x402");
  const catalogContractReady = services.length === 27
    && services.filter((service) => service.id !== "privatepay.x402").length === 26
    && privatePayCatalog?.container === true
    && privatePayCatalog.marketplace?.service_count === 26
    && privatePayCatalog.flow === "marketplace_container";
  const delegatedPrivatePayAccounts = privatePay.merchant_account_delegation?.accounts;
  const privatePayDelegationReady = privatePay.payment_ingress_configured === true
    && privatePay.merchant_accounts_delegated === true
    && Array.isArray(delegatedPrivatePayAccounts)
    && ["merchant", "payment_ingress"].every((role) => delegatedPrivatePayAccounts.some((entry) => entry.role === role && entry.delegated === true && entry.status === "delegated"));
  const privatePayReady = privatePay.operational === true
    && privatePay.enabled !== false
    && privatePayDelegationReady;
  const categories = useMemo(() => ["All", ...Array.from(new Set(services.map((service) => service.category).filter((category): category is string => Boolean(category)))).sort()], [services]);
  const filteredServices = useMemo(() => categoryFilter === "All" ? services : services.filter((service) => service.category === categoryFilter), [categoryFilter, services]);
  const suggestedServices = useMemo(() => {
    const priority = ["risk.score", "wallet.intelligence", "token.intelligence", "launch.check", "transaction.explain", "transaction.simulate", "forensics.trace", "verify.basic"];
    const ranked = priority.map((id) => services.find((service) => service.id === id)).filter((service): service is ExchangeService => Boolean(service));
    return ranked.length > 0 ? ranked : services.slice(0, 4);
  }, [services]);
  const externalConnectors = [
    {
      name: "Grok",
      detail: "Use the verified Grok MCP setup page, then keep wallet approval in PDAO.",
      href: `${API_BASE}/connect/grok`,
      icon: Bot,
    },
    {
      name: "ChatGPT",
      detail: "Open the remote MCP setup flow for a compatible ChatGPT client.",
      href: `${API_BASE}/connect/chatgpt`,
      icon: Bot,
    },
    {
      name: "Claude",
      detail: "Connect Claude to the Exchange tools with explicit service boundaries.",
      href: `${API_BASE}/connect/claude`,
      icon: Bot,
    },
    {
      name: "Cursor",
      detail: "Use the Cursor connection guide for research and verification workflows.",
      href: `${API_BASE}/connect/cursor`,
      icon: Bot,
    },
    {
      name: "OpenClaw",
      detail: "Connect a compatible OpenClaw client without exposing wallet keys.",
      href: `${API_BASE}/connect/openclaw`,
      icon: Bot,
    },
    {
      name: "Telegram or custom bot",
      detail: "Use the Exchange MCP endpoint in a bot or external agent connector.",
      href: `${API_BASE}/connect`,
      icon: Send,
    },
    {
      name: "MCP / A2A client",
      detail: "Connect any compatible client with explicit service permissions and receipts.",
      href: `${API_BASE}/connect`,
      icon: Globe2,
    },
  ];

  return (
    <section aria-labelledby="wallet-operations-title" className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--wallet-success)]">Agent workspace</div>
          <h2 id="wallet-operations-title" className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--wallet-text)]">Your wallet, your agent team, your approval rules.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--wallet-secondary)]">Connect external agents through the live Exchange, choose a verification service, and keep every paid action quote-bound and user-approved.</p>
        </div>
        <button type="button" onClick={() => void loadOperations()} disabled={state === "loading"} className="inline-flex min-h-10 shrink-0 items-center gap-2 border border-[var(--wallet-line)] px-3 text-xs text-[var(--wallet-secondary)] transition hover:bg-white/[0.05] disabled:opacity-50">
          {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh services
        </button>
      </div>

      {message ? <div role="alert" className="border border-[rgba(184,121,121,0.42)] bg-[rgba(184,121,121,0.1)] px-4 py-3 text-sm text-[#e3b8b8]">{message}</div> : null}

      <section className="wallet-data-panel p-5 sm:p-6" aria-labelledby="wallet-agent-team-title">
        <div className="flex items-start justify-between gap-4"><div><h3 id="wallet-agent-team-title" className="flex items-center gap-2 text-sm font-semibold text-[var(--wallet-text)]"><UsersRound className="h-4 w-4 text-[var(--wallet-success)]" /> Bring your agents</h3><p className="mt-2 text-xs leading-5 text-[var(--wallet-secondary)]">Connectors are discovery and permission paths. They do not receive your private key or automatic signing authority.</p></div><a href={`${API_BASE}/connect`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[var(--wallet-text)] underline-offset-4 hover:underline">Open connector <ArrowUpRight className="h-3.5 w-3.5" /></a></div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">{externalConnectors.map(({ name, detail, href, icon: Icon }) => <a key={name} href={href} target="_blank" rel="noreferrer" className="flex items-start gap-3 border border-[var(--wallet-line)] p-4 transition hover:bg-[var(--wallet-elevated)]"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--wallet-secondary)]" /><span><span className="block text-sm font-semibold text-[var(--wallet-text)]">{name}</span><span className="mt-1 block text-xs leading-5 text-[var(--wallet-muted)]">{detail}</span><span className="mt-3 block text-[11px] text-[var(--wallet-success)]">Connect through Agent Exchange</span></span></a>)}</div>
      </section>

      <section className="wallet-data-panel p-5 sm:p-6" aria-labelledby="wallet-suggested-checks-title">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h3 id="wallet-suggested-checks-title" className="flex items-center gap-2 text-sm font-semibold text-[var(--wallet-text)]"><SlidersHorizontal className="h-4 w-4 text-[var(--wallet-success)]" /> Suggested verification checks</h3><p className="mt-2 text-xs leading-5 text-[var(--wallet-secondary)]">Choose evidence before an agent or human makes a trading or payment decision.</p></div><div className="flex items-center gap-2"><Filter className="h-3.5 w-3.5 text-[var(--wallet-muted)]" /><select aria-label="Filter services by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="min-h-9 border border-[var(--wallet-line)] bg-[var(--wallet-elevated)] px-2 text-xs text-[var(--wallet-text)]">{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></div></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{suggestedServices.slice(0, 4).map((service) => <ServiceTile key={service.id} service={service} />)}</div>
      </section>

      <section className="wallet-data-panel p-5 sm:p-6" aria-labelledby="wallet-service-catalog-title"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h3 id="wallet-service-catalog-title" className="flex items-center gap-2 text-sm font-semibold text-[var(--wallet-text)]"><Bot className="h-4 w-4 text-[var(--wallet-secondary)]" /> Full live service catalog</h3><p className="mt-2 text-xs text-[var(--wallet-muted)]">{state === "ready" ? `${services.length} live services · ${freeServices.length} free starting points · ${paidServices.length} quote-first services` : "Loading the live service catalog..."}</p></div><button type="button" onClick={() => setShowAllServices((value) => !value)} className="text-xs text-[var(--wallet-text)] underline-offset-4 hover:underline">{showAllServices ? "Show fewer" : "Show all services"}</button></div>{services.length === 0 && state === "loading" ? <div className="mt-5 flex items-center gap-2 text-sm text-[var(--wallet-secondary)]"><Loader2 className="h-4 w-4 animate-spin" /> Loading catalog</div> : null}<div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filteredServices.slice(0, showAllServices ? filteredServices.length : 6).map((service) => <ServiceTile key={service.id} service={service} />)}</div><div className="mt-5 flex flex-wrap gap-3"><Link href="/agents" className={cn(buttonVariants({ size: "sm" }), "!border-[var(--wallet-line)] !bg-[var(--wallet-elevated)] !text-[var(--wallet-text)]")}>Open marketplace <ArrowUpRight className="h-4 w-4" /></Link><a href={`${API_BASE}/api/services`} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-2 border border-[var(--wallet-line)] px-3 text-xs text-[var(--wallet-secondary)]">View live API catalog <ArrowUpRight className="h-3.5 w-3.5" /></a></div></section>

      <section className="wallet-data-panel p-5 sm:p-6" aria-labelledby="wallet-b2c-trade-title"><div className="flex items-start justify-between gap-4"><div><h3 id="wallet-b2c-trade-title" className="flex items-center gap-2 text-sm font-semibold text-[var(--wallet-text)]"><CircleDollarSign className="h-4 w-4 text-[var(--wallet-success)]" /> B2C buy and sell</h3><p className="mt-2 max-w-2xl text-xs leading-5 text-[var(--wallet-secondary)]">Request a Jupiter quote for either side, review route and slippage, then pay any Agent Exchange service through x402. Asset execution stays disabled unless the provider returns a wallet-signable transaction.</p></div><span className="text-[11px] uppercase tracking-[0.14em] text-[var(--wallet-warning)]">Quote first</span></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Link href="/services/jupiter-treasury-route" className="flex items-center justify-between border border-[var(--wallet-line)] p-4 text-sm font-semibold text-[var(--wallet-text)] transition hover:bg-[var(--wallet-elevated)]"><span><span className="block">Buy / swap into an asset</span><span className="mt-1 block text-xs font-normal text-[var(--wallet-muted)]">Jupiter route and wallet review</span></span><ArrowUpRight className="h-4 w-4 text-[var(--wallet-muted)]" /></Link><Link href="/services/jupiter-treasury-route" className="flex items-center justify-between border border-[var(--wallet-line)] p-4 text-sm font-semibold text-[var(--wallet-text)] transition hover:bg-[var(--wallet-elevated)]"><span><span className="block">Sell / swap out of an asset</span><span className="mt-1 block text-xs font-normal text-[var(--wallet-muted)]">Quote, slippage, and explicit approval</span></span><ArrowUpRight className="h-4 w-4 text-[var(--wallet-muted)]" /></Link></div></section>

      <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CircleDollarSign className="h-5 w-5 text-[#087f5b]" /> PrivatePAY x402</CardTitle><CardDescription>Quote-first USDC settlement through the connected wallet.</CardDescription></CardHeader>
          <CardContent>
            <div className={cn("flex items-center gap-2 text-sm font-semibold", state === "ready" && privatePayReady ? "text-[#16824c]" : "text-[#8a641f]")}><span className={cn("h-2.5 w-2.5 rounded-full", state === "ready" && privatePayReady ? "bg-[#16824c]" : "bg-[#c58a16]")} />{state === "ready" ? (privatePayReady ? (catalogContractReady ? "Rail ready; exact challenge checked at checkout" : "Rail ready; marketplace catalog update required") : privatePay.status || "Status unavailable") : "Checking status"}</div>
            <dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-[#7a8ba0]">Network</dt><dd className="text-right font-medium text-[#10233f]">Solana Mainnet</dd></div><div className="flex justify-between gap-4"><dt className="text-[#7a8ba0]">Rail</dt><dd className="text-right font-medium text-[#10233f]">MagicBlock private settlement</dd></div><div className="flex justify-between gap-4"><dt className="text-[#7a8ba0]">Wallet custody</dt><dd className="text-right font-medium text-[#10233f]">Local signing</dd></div></dl>
            <Link href="/privatepay" className={cn(buttonVariants({ size: "sm" }), "mt-5 w-full justify-center bg-[#087f5b] hover:bg-[#066e4f]")}>Review exact quote <ArrowUpRight className="h-4 w-4" /></Link>
            {privatePay.activation_blockers?.length || !catalogContractReady ? <p className="mt-3 text-xs leading-5 text-[#8a641f]">{privatePay.activation_blockers?.join(" · ") || "The live service catalog has not published the PrivatePAY marketplace container yet."}</p> : null}
          </CardContent>
        </Card>

      {wallet ? <PrivatePayAutopilotPanel wallet={wallet} /> : null}

      {wallet ? <WalletPaidServicePanel wallet={wallet} services={paidServices} /> : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[#6d3bd1]" /> Agent wallet policies</CardTitle>
          <CardDescription>Scoped execution is available only through signed policies. The wallet remains the final approval boundary.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 font-semibold", autopilot.enabled ? "bg-[#e5f8ee] text-[#16824c]" : "bg-[#fff5dc] text-[#8a641f]")}>
              <span className={cn("h-2.5 w-2.5 rounded-full", autopilot.enabled ? "bg-[#16824c]" : "bg-[#c58a16]")} />
              {state === "loading" ? "Checking policy rail" : autopilot.enabled ? "Ready for signed scoped policies" : "Explicit activation required"}
            </span>
            <span className="text-[#5d6d82]">Custody: {autopilot.custody === "delegated_agent_session_key" ? "delegated agent session key" : autopilot.custody === "session_wallet_only" ? "session wallet only" : "not reported"}</span>
            <span className="text-[#5d6d82]">Reusable payment credentials: {autopilot.reusable_x402_credentials === false ? "disabled" : "not reported"}</span>
          </div>
          {autopilot.blockers?.length ? <p className="mt-3 text-sm leading-6 text-[#8a641f]">{autopilot.blockers.join(" · ")}</p> : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <a href={`${API_BASE}/api/privatepay/autopilot/status`} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>View policy status <ArrowUpRight className="h-4 w-4" /></a>
            <Link href="/services/zerion-agent-policy" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>Configure scoped policy <ArrowUpRight className="h-4 w-4" /></Link>
            <a href={`${API_BASE}/marketplace`} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm" }))}>Open agent services <ArrowUpRight className="h-4 w-4" /></a>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function ServiceTile({ service }: { service: ExchangeService }) {
  return <a href={service.public_url || `${API_BASE}/marketplace`} target="_blank" rel="noreferrer" className="group border border-[var(--wallet-line)] p-4 transition hover:bg-[var(--wallet-elevated)]"><div className="flex items-start justify-between gap-3"><div><div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--wallet-muted)]">{service.category || "Service"}</div><div className="mt-1 text-sm font-semibold text-[var(--wallet-text)]">{service.title}</div></div><ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--wallet-muted)] transition group-hover:text-[var(--wallet-text)]" /></div><p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--wallet-secondary)]">{service.summary || "Open the live service details."}</p><div className="mt-3 text-xs font-medium text-[var(--wallet-success)]">{service.free || service.price === 0 ? "Free" : `${service.price ?? "Quote"} ${service.currency || "USDC"} · quote first`}</div></a>;
}
