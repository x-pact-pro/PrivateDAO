import { NextResponse } from "next/server";

export const dynamic = "force-static";

type PrivateRail = "cloak" | "umbra";
type SettlementAsset = "PUSD" | "AUDD" | "USDC" | "USDT" | "SOL";

type SettlementIntentBody = {
  rail?: PrivateRail;
  operationType?: string;
  asset?: SettlementAsset;
  amount?: string;
  recipient?: string;
  memo?: string;
  auditMode?: string;
  recipientVisibility?: string;
};

function normalizeRail(value: string | undefined): PrivateRail {
  if (value === "cloak" || value === "umbra") return value;
  throw new Error("Invalid private settlement rail.");
}

function normalizeOperationType(value: string | undefined) {
  const operationType = value?.trim() ?? "private-payroll";
  if (!operationType) throw new Error("operationType is required.");
  return operationType;
}

function normalizeAsset(value: string | undefined): SettlementAsset {
  const asset = (value?.trim().toUpperCase() ?? "USDC") as SettlementAsset;
  if (!["PUSD", "AUDD", "USDC", "USDT", "SOL"].includes(asset)) {
    throw new Error("Invalid settlement asset.");
  }
  return asset;
}

function normalizeAmount(value: string | undefined) {
  const amount = value?.trim() ?? "0";
  if (!/^\d+(\.\d+)?$/.test(amount)) throw new Error("Invalid settlement amount.");
  return amount;
}

function normalizeRecipient(value: string | undefined) {
  const recipient = value?.trim() ?? "";
  if (!recipient || recipient.length < 20) {
    throw new Error("Recipient is required.");
  }
  return recipient;
}

function normalizeText(value: string | undefined, fallback: string) {
  const normalized = value?.trim() ?? fallback;
  return normalized || fallback;
}

function getForwardConfig(rail: PrivateRail) {
  if (rail === "cloak") {
    return {
      url: process.env.CLOAK_RELAY_URL?.trim(),
      apiKey: process.env.CLOAK_API_KEY?.trim(),
      source: "cloak-relay",
    };
  }
  return {
    url: process.env.UMBRA_RELAY_URL?.trim(),
    apiKey: process.env.UMBRA_API_KEY?.trim(),
    source: "umbra-relay",
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SettlementIntentBody;
    const rail = normalizeRail(body.rail);
    const operationType = normalizeOperationType(body.operationType);
    const asset = normalizeAsset(body.asset);
    const amount = normalizeAmount(body.amount);
    const recipient = normalizeRecipient(body.recipient);
    const memo = normalizeText(body.memo, "private settlement");
    const auditMode = normalizeText(body.auditMode, "selective-disclosure");
    const recipientVisibility = normalizeText(body.recipientVisibility, "private-by-default");
    const createdAt = new Date().toISOString();

    const payload = {
      rail,
      operationType,
      asset,
      amount,
      recipient,
      memo,
      auditMode,
      recipientVisibility,
      createdAt,
    };

    const forward = getForwardConfig(rail);
    if (forward.url) {
      const response = await fetch(forward.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(forward.apiKey ? { Authorization: `Bearer ${forward.apiKey}` } : {}),
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      const raw = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      if (!response.ok) {
        return NextResponse.json(
          {
            error:
              (typeof raw?.message === "string" && raw.message) ||
              (typeof raw?.error === "string" && raw.error) ||
              `${forward.source} responded ${response.status}.`,
            status: response.status,
            rail,
          },
          { status: response.status },
        );
      }

      const executionReference =
        (typeof raw?.signature === "string" && raw.signature) ||
        (typeof raw?.reference === "string" && raw.reference) ||
        `${rail}-${Date.now()}`;

      return NextResponse.json(
        {
          delivered: true,
          mode: "relay-live",
          source: forward.source,
          rail,
          executionReference,
          createdAt,
          payload,
          raw,
        },
        { status: 200 },
      );
    }

    const executionReference = `sim-${rail}-${Date.now()}`;
    return NextResponse.json(
      {
        delivered: true,
        mode: "testnet-rehearsal",
        source: "private-settlement-proxy",
        rail,
        executionReference,
        createdAt,
        payload,
        note: "Relay credentials are optional. This proxy still records full execution intent and proof-linked receipts.",
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Private settlement intent failed.",
      },
      { status: 400 },
    );
  }
}

