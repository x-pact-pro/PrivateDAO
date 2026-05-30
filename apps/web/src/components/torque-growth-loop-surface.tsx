"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const torqueEventTemplates = [
  {
    id: "dao_created",
    title: "DAO created",
    description: "Reward the first successful organization setup from a new operator.",
    rewardIntent: "onboarding rebate",
    route: "/govern",
  },
  {
    id: "proposal_created",
    title: "Proposal created",
    description: "Measure governance activation after the user creates a real proposal.",
    rewardIntent: "builder activation points",
    route: "/govern",
  },
  {
    id: "billing_signed",
    title: "Billing signed",
    description: "Track commercial intent when the operator signs a Testnet billing SKU.",
    rewardIntent: "operator rebate",
    route: "/services/testnet-billing-rehearsal",
  },
  {
    id: "learn_completed",
    title: "Lecture completed",
    description: "Retain developers by rewarding completion of the Frontend Solana learning path.",
    rewardIntent: "education completion raffle",
    route: "/learn",
  },
  {
    id: "private_treasury_execution",
    title: "Private treasury execution",
    description: "Track private treasury execution outcomes with amount, type, and success fields.",
    rewardIntent: "treasury execution incentive",
    route: "/execute",
  },
];

type TorqueEventRecord = {
  id: string;
  event: string;
  rewardIntent: string;
  route: string;
  timestamp: string;
  delivery: "local-only" | "forwarded" | "failed";
  detail?: string;
};

function buildTorquePayload(template: (typeof torqueEventTemplates)[number], timestamp = "client-generated-on-record") {
  const isPrivateTreasuryEvent = template.id === "private_treasury_execution";
  return {
    userPubkey: "4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD",
    timestamp,
    eventName: template.id,
    data: isPrivateTreasuryEvent
      ? {
          amount: 1250,
          type: "audd_pusd_rebalance",
          success: true,
        }
      : {
          reward_intent: template.rewardIntent,
          route: `https://privatedao.org${template.route}/`.replace("//.", "/"),
          network: "solana-testnet",
          product: "private-governance-and-stablecoin-treasury",
          proofRoutes: ["https://privatedao.org/judge/", "https://privatedao.org/proof/?judge=1"],
        },
  };
}

export function TorqueGrowthLoopSurface() {
  const [activeId, setActiveId] = useState(torqueEventTemplates[0].id);
  const [eventWallet, setEventWallet] = useState("4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD");
  const [treasuryAmount, setTreasuryAmount] = useState("1250");
  const [treasuryType, setTreasuryType] = useState("audd_pusd_rebalance");
  const [treasurySuccess, setTreasurySuccess] = useState(true);
  const [records, setRecords] = useState<TorqueEventRecord[]>([]);
  const [deliveryState, setDeliveryState] = useState<string>("Local event log ready");
  const activeTemplate = torqueEventTemplates.find((event) => event.id === activeId) ?? torqueEventTemplates[0];
  const payload = useMemo(() => {
    const basePayload = buildTorquePayload(activeTemplate);
    if (activeTemplate.id !== "private_treasury_execution") {
      return {
        ...basePayload,
        userPubkey: eventWallet,
      };
    }
    return {
      ...basePayload,
      userPubkey: eventWallet,
      data: {
        amount: Number(treasuryAmount),
        type: treasuryType,
        success: treasurySuccess,
      },
    };
  }, [activeTemplate, eventWallet, treasuryAmount, treasuryType, treasurySuccess]);
  const payloadText = JSON.stringify(payload, null, 2);

  async function recordEvent() {
    const record: TorqueEventRecord = {
      id: `${activeTemplate.id}-${Date.now()}`,
      event: activeTemplate.id,
      rewardIntent: activeTemplate.rewardIntent,
      route: activeTemplate.route,
      timestamp: new Date().toISOString(),
      delivery: "local-only",
    };
    const livePayload = {
      ...payload,
      timestamp: record.timestamp,
    };
    setRecords((current) => [record, ...current].slice(0, 6));

    const endpoint = process.env.NEXT_PUBLIC_TORQUE_CUSTOM_EVENT_ENDPOINT?.trim() || "https://api.privatedao.org/api/v1/torque/custom-event";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(livePayload),
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        forwardUrl?: string;
        raw?: { ingestionId?: string; status?: string; receivedAt?: string };
        status?: number;
      } | null;
      const detail = response.ok
        ? body?.raw?.ingestionId
          ? `accepted by Torque · ingestion ${body.raw.ingestionId}`
          : body?.forwardUrl ?? "forwarded through configured torque endpoint"
        : body?.error ?? `endpoint responded ${response.status}`;
      setRecords((current) =>
        current.map((item) =>
          item.id === record.id
            ? { ...item, delivery: response.ok ? "forwarded" : "failed", detail }
            : item,
        ),
      );
      setDeliveryState(
        response.ok ? `Torque custom_event delivered via ${detail}` : `Torque delivery failed: ${detail}`,
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Torque delivery failed";
      setRecords((current) =>
        current.map((item) =>
          item.id === record.id ? { ...item, delivery: "failed", detail } : item,
        ),
      );
      setDeliveryState(detail);
    }
  }

  return (
    <section className="rounded-[32px] border border-white/10 bg-[#06111f]/88 p-6 shadow-2xl shadow-emerald-950/20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.34em] text-emerald-200/78">Torque MCP growth loop</div>
          <h2 className="mt-3 max-w-3xl text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">
            Convert real product actions into retention events and incentive loops
          </h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-white/64">
            Torque fits PrivateDAO as a measurable growth layer: users do not earn rewards for visiting a page; they
            earn from wallet-first actions such as creating a DAO, creating a proposal, signing a billing SKU, or
            finishing the Solana frontend learning path.
          </p>
        </div>
        <Badge variant="success">Custom events</Badge>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        {torqueEventTemplates.map((event) => (
          <button
            key={event.id}
            type="button"
            onClick={() => setActiveId(event.id)}
            className={cn(
              "rounded-3xl border p-5 text-left transition",
              activeId === event.id
                ? "border-emerald-300/45 bg-emerald-300/[0.10]"
                : "border-white/8 bg-white/[0.03] hover:border-white/16 hover:bg-white/[0.05]",
            )}
          >
            <div className="text-base font-semibold text-white">{event.title}</div>
            <p className="mt-3 text-sm leading-7 text-white/58">{event.description}</p>
            <div className="mt-4 text-[11px] uppercase tracking-[0.2em] text-emerald-100/70">{event.rewardIntent}</div>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-emerald-300/14 bg-emerald-300/[0.06] p-5">
          <div className="text-sm font-semibold text-emerald-100">Live activity path</div>
          <p className="mt-3 text-sm leading-7 text-white/62">
            The event workbench records local activity immediately and forwards the same payload to Torque through the
            verified read-node relay. This keeps the growth loop tied to product behavior rather than detached campaign
            copy.
          </p>
          <div className="mt-4 space-y-3">
            <label className="space-y-2">
              <div className="text-[11px] uppercase tracking-[0.2em] text-white/44">User wallet</div>
              <input
                value={eventWallet}
                onChange={(event) => setEventWallet(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                placeholder="wallet address"
              />
            </label>
            {activeTemplate.id === "private_treasury_execution" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-white/44">Amount</div>
                  <input
                    value={treasuryAmount}
                    onChange={(event) => setTreasuryAmount(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                    placeholder="1250"
                  />
                </label>
                <label className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-white/44">Type</div>
                  <input
                    value={treasuryType}
                    onChange={(event) => setTreasuryType(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                    placeholder="audd_pusd_rebalance"
                  />
                </label>
                <label className="md:col-span-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/72">
                  <input
                    type="checkbox"
                    checked={treasurySuccess}
                    onChange={(event) => setTreasurySuccess(event.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-black/20"
                  />
                  success
                </label>
              </div>
            ) : null}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={() => void recordEvent()} className={cn(buttonVariants({ size: "sm" }))}>
              Send Torque event
            </button>
            <button
              type="button"
              onClick={() => void navigator.clipboard?.writeText(payloadText)}
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            >
              Copy payload
            </button>
            <Link href={activeTemplate.route} className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
              Open route
            </Link>
          </div>
          <div className="mt-4 rounded-2xl border border-white/8 bg-black/24 p-4 text-xs leading-6 text-white/58">
            {deliveryState}
          </div>
          {records.length > 0 ? (
            <div className="mt-4 space-y-2">
              {records.map((record) => (
                <div key={record.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-xs text-white/58">
                  <div>
                    {record.event} · {record.rewardIntent} · {record.timestamp}
                  </div>
                  <div className="mt-1 uppercase tracking-[0.18em] text-[10px] text-white/44">
                    {record.delivery}
                  </div>
                  {record.detail ? <div className="mt-1 text-white/50">{record.detail}</div> : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/24 p-5">
          <div className="text-sm font-semibold text-white">Torque custom_event payload</div>
          <pre className="mt-4 max-h-[420px] overflow-auto rounded-2xl border border-white/8 bg-black/40 p-4 text-xs leading-6 text-emerald-100/82">
            {payloadText}
          </pre>
        </div>
      </div>
    </section>
  );
}
