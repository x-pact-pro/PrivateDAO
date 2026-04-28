import { NextResponse } from "next/server";

export const dynamic = "force-static";

type TorqueEventBody = {
  userPubkey?: string;
  eventName?: string;
  timestamp?: string | number;
  data?: Record<string, unknown>;
  custom_event?: string;
  metadata?: Record<string, unknown>;
};

function normalizeText(value: string | undefined, fallback: string) {
  const normalized = value?.trim() ?? fallback;
  return normalized || fallback;
}

export async function POST(request: Request) {
  const apiKey = process.env.TORQUE_API_KEY?.trim();
  const baseUrl = (
    process.env.TORQUE_CUSTOM_EVENT_API_URL ??
    process.env.TORQUE_INGESTER_URL ??
    "https://ingest.torque.so"
  ).trim();

  if (!apiKey) {
    return NextResponse.json({ error: "Missing TORQUE_API_KEY in server environment." }, { status: 500 });
  }
  if (!baseUrl) {
    return NextResponse.json(
      { error: "Missing TORQUE_CUSTOM_EVENT_API_URL (or TORQUE_INGESTER_URL) in server environment." },
      { status: 500 },
    );
  }

  try {
    const body = (await request.json()) as TorqueEventBody;
    const payload = {
      userPubkey: normalizeText(
        body.userPubkey,
        process.env.PRIVATE_DAO_TESTNET_WALLET_PUBLIC_KEY ?? "unknown-wallet",
      ),
      timestamp:
        typeof body.timestamp === "number"
          ? body.timestamp
          : Number.isFinite(Number(body.timestamp))
            ? Number(body.timestamp)
            : Date.now(),
      eventName: normalizeText(body.eventName ?? body.custom_event, "unknown_event"),
      data: {
        ...(body.data ?? {}),
        ...(body.metadata ? { metadata: body.metadata } : {}),
      },
    };

    const forwardUrl = `${baseUrl.replace(/\/+$/, "")}/events`;
    const response = await fetch(forwardUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-api-key": apiKey,
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
            `Torque responded ${response.status}.`,
          status: response.status,
          forwardUrl,
        },
        { status: response.status },
      );
    }

    return NextResponse.json(
      {
        delivered: true,
        status: response.status,
        eventName: payload.eventName,
        userPubkey: payload.userPubkey,
        forwardedAt: new Date().toISOString(),
        forwardUrl,
        raw,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Torque custom_event forwarding failed." },
      { status: 400 },
    );
  }
}
