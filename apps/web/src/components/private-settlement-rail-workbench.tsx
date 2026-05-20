"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, LockKeyhole, Send, ShieldCheck } from "lucide-react";

import { persistCloakDeliveryState, persistOperationReceipt } from "@/lib/supabase/operation-receipts";
import { buttonVariants } from "@/components/ui/button";
import { WalletOrSnsInput } from "@/components/wallet-or-sns-input";
import { cn } from "@/lib/utils";

type PrivateRail = "cloak" | "umbra";
type SettlementAsset = "PUSD" | "AUDD" | "USDC" | "USDT" | "SOL";

const railProfiles: Record<
  PrivateRail,
  {
    title: string;
    summary: string;
    auditMode: string;
    visibility: string;
    proofHref: string;
    docsHref: string;
  }
> = {
  cloak: {
    title: "Cloak private treasury lane",
    summary:
      "Use Cloak posture when payroll, vendor settlement, or treasury motion needs selective disclosure and a tighter private execution story.",
    auditMode: "selective-disclosure",
    visibility: "private-by-default",
    proofHref: "/proof",
    docsHref: "/documents/live-proof-v3",
  },
  umbra: {
    title: "Umbra confidential payout lane",
    summary:
      "Use Umbra posture when recipient privacy, claim-style flows, and public-facing confidential payout UX are the main product requirement.",
    auditMode: "confidential-payout",
    visibility: "recipient-private",
    proofHref: "/judge",
    docsHref: "/documents/privacy-and-encryption-proof-guide",
  },
};

function getRailEndpoint(rail: PrivateRail) {
  const configured =
    rail === "cloak"
      ? process.env.NEXT_PUBLIC_CLOAK_PROXY_ENDPOINT
      : process.env.NEXT_PUBLIC_UMBRA_PROXY_ENDPOINT;
  const readNode = process.env.NEXT_PUBLIC_PRIVATE_DAO_READ_NODE_ENDPOINT?.trim();
  if (configured?.trim()) return configured.trim();
  if (readNode) return `${readNode.replace(/\/+$/, "")}/api/v1/private-settlement/intent`;
  return "https://api.privatedao.org/api/v1/private-settlement/intent";
}

type PrivateSettlementRailWorkbenchProps = {
  initialRail?: PrivateRail;
  lockRail?: boolean;
};

const DEFAULT_REVIEWER_RECIPIENT = "B3STL1akxLGLvPpKd6Grz19jjVySkWrGgHFwGNK8yEZ";

export function PrivateSettlementRailWorkbench({
  initialRail = "cloak",
  lockRail = false,
}: PrivateSettlementRailWorkbenchProps = {}) {
  const [rail, setRail] = useState<PrivateRail>(initialRail);
  const [operationType, setOperationType] = useState("private-payroll");
  const [asset, setAsset] = useState<SettlementAsset>("USDC");
  const [amount, setAmount] = useState("250");
  const [recipient, setRecipient] = useState(DEFAULT_REVIEWER_RECIPIENT);
  const [memo, setMemo] = useState("Payroll tranche / reviewer-safe memo");
  const [status, setStatus] = useState("Prepare a private settlement intent, forward it through the read-node rail endpoint, and store the receipt.");
  const [preview, setPreview] = useState("");
  const [running, setRunning] = useState(false);

  const profile = railProfiles[rail];
  const payload = useMemo(
    () => ({
      rail,
      operationType,
      asset,
      amount,
      recipient: recipient.trim(),
      memo,
      auditMode: profile.auditMode,
      recipientVisibility: profile.visibility,
      createdAt: new Date().toISOString(),
    }),
    [amount, asset, memo, operationType, profile.auditMode, profile.visibility, rail, recipient],
  );

  async function handleForward() {
    const endpoint = getRailEndpoint(rail);
    const reference = `${rail}-${Date.now()}`;
    const normalizedRecipient = recipient.trim();
    const normalizedAmount = amount.trim();

    if (normalizedRecipient.length < 32) {
      setStatus("Enter a valid recipient public key before forwarding the private settlement intent.");
      setPreview(JSON.stringify({ ok: false, reason: "recipient-public-key-required" }, null, 2));
      return;
    }

    if (!normalizedAmount || Number.isNaN(Number(normalizedAmount)) || Number(normalizedAmount) <= 0) {
      setStatus("Enter a positive settlement amount before forwarding the private settlement intent.");
      setPreview(JSON.stringify({ ok: false, reason: "positive-amount-required" }, null, 2));
      return;
    }

    setPreview(JSON.stringify(payload, null, 2));

    setRunning(true);
    setStatus(`Forwarding ${profile.title} request through private settlement proxy...`);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => null);
      const executionReference =
        typeof body?.signature === "string"
          ? body.signature
          : typeof body?.reference === "string"
            ? body.reference
            : reference;

      setPreview(JSON.stringify(body ?? payload, null, 2));
      setStatus(response.ok ? `${profile.title} request delivered.` : `${profile.title} endpoint responded ${response.status}.`);

      await persistOperationReceipt({
        operationType,
        proposalId: `${rail}:${operationType}`,
        approvalState: response.ok ? "forwarded" : "prepared",
        executionReference,
        privateSettlementRail: rail,
        stablecoinSymbol: asset,
        auditMode: profile.auditMode,
        recipientVisibility: profile.visibility,
        metadata: payload,
      });

      await persistCloakDeliveryState({
        rail,
        operationType,
        asset,
        amount,
        recipient,
        memo,
        auditMode: profile.auditMode,
        recipientVisibility: profile.visibility,
        responseStatus: response.ok ? "delivered" : `http-${response.status}`,
      });

      const torqueEndpoint = process.env.NEXT_PUBLIC_TORQUE_CUSTOM_EVENT_ENDPOINT?.trim() || "https://api.privatedao.org/api/v1/torque/custom-event";
      try {
        await fetch(torqueEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventName: "private_treasury_execution",
            data: {
              amount: Number(amount),
              type: `${rail}_${operationType}_${asset}`.toLowerCase(),
              success: response.ok,
            },
          }),
        });
      } catch {
        // Keep settlement execution non-blocking if growth relay fails.
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Private settlement request failed.";
      const fallbackReceipt = {
        ok: false,
        mode: "local-prepared-intent",
        source: `${rail}-browser-fallback`,
        endpoint,
        executionReference: reference,
        error: message,
        intent: payload,
        nextAction: "Retry the read-node private settlement endpoint before any wallet signing or external relay execution.",
      };
      setPreview(JSON.stringify(fallbackReceipt, null, 2));
      setStatus(`${message} Local prepared intent retained and receipt persistence attempted so the visitor can continue review.`);
      try {
        await persistOperationReceipt({
          operationType,
          proposalId: `${rail}:${operationType}`,
          approvalState: "local-prepared",
          executionReference: reference,
          privateSettlementRail: rail,
          stablecoinSymbol: asset,
          auditMode: profile.auditMode,
          recipientVisibility: profile.visibility,
          metadata: fallbackReceipt,
        });

        await persistCloakDeliveryState({
          rail,
          operationType,
          asset,
          amount,
          recipient,
          memo,
          auditMode: profile.auditMode,
          recipientVisibility: profile.visibility,
          responseStatus: "local-prepared",
        });
      } catch {
        // Keep the operator unblocked when Supabase or the rail endpoint is unavailable.
      }
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-violet-300/16 bg-violet-300/[0.08] p-6">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-violet-100/78">
        <LockKeyhole className="h-4 w-4" />
        Private settlement rail workbench
      </div>
      <h2 className="mt-3 text-2xl font-semibold text-white">Prepare and forward rail-specific private settlement intents</h2>
      <p className="mt-3 max-w-4xl text-sm leading-7 text-white/68">
        This workbench turns private settlement into a real operator action surface. It prepares a Cloak or Umbra execution
        intent, forwards it through a rail-specific proxy when available, and records the resulting receipt path.
      </p>

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/44">Settlement rail</div>
            {lockRail ? (
              <div className="mt-3 rounded-2xl border border-violet-300/24 bg-violet-300/[0.12] px-4 py-3">
                <div className="text-sm font-medium text-white">{railProfiles[rail].title}</div>
                <div className="mt-1 text-sm leading-6 text-white/60">{railProfiles[rail].summary}</div>
              </div>
            ) : (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {(["cloak", "umbra"] as PrivateRail[]).map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => setRail(entry)}
                    className={cn(
                      "rounded-2xl border px-4 py-3 text-left transition",
                      rail === entry
                        ? "border-violet-300/24 bg-violet-300/[0.12] text-white"
                        : "border-white/10 bg-black/20 text-white/68 hover:border-white/16 hover:bg-white/[0.04]",
                    )}
                  >
                    <div className="text-sm font-medium text-white">{railProfiles[entry].title}</div>
                    <div className="mt-1 text-sm leading-6 text-white/60">{railProfiles[entry].summary}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-white/70">
                <div>Operation type</div>
                <input value={operationType} onChange={(event) => setOperationType(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none" />
              </label>
              <label className="space-y-2 text-sm text-white/70">
                <div>Asset</div>
                <select value={asset} onChange={(event) => setAsset(event.target.value as SettlementAsset)} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none">
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
              <WalletOrSnsInput label="Recipient" value={recipient} onChange={setRecipient} />
            </div>
            <label className="mt-4 block space-y-2 text-sm text-white/70">
              <div>Operator memo</div>
              <textarea value={memo} onChange={(event) => setMemo(event.target.value)} rows={4} className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none" />
            </label>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" className={cn(buttonVariants({ size: "sm" }))} onClick={() => void handleForward()} disabled={running}>
                {running ? "Forwarding..." : "Prepare / forward intent"}
              </button>
              <Link href={profile.proofHref} className={cn(buttonVariants({ size: "sm", variant: "secondary" }))}>
                Open proof route
              </Link>
              <Link href={profile.docsHref} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                Open packet
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-emerald-300/16 bg-emerald-300/[0.08] p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-emerald-100/76">
              <ShieldCheck className="h-4 w-4" />
              Delivery state
            </div>
            <div className="mt-3 text-sm leading-7 text-white/72">{status}</div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-white/44">
              <Send className="h-4 w-4 text-violet-100/78" />
              Prepared intent
            </div>
            <pre className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-xs leading-6 text-white/70">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/44">Latest response preview</div>
            <pre className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-xs leading-6 text-white/70">
              {preview || "The rail receipt will appear here after the operator forwards the prepared intent."}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
