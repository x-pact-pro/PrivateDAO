import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-static";

const LIVE_URL = "https://api.privatedao.org/api/v1/txline/guest/start";

export async function POST() {
  try {
    const upstream = await fetch(LIVE_URL, { method: "POST", headers: { Accept: "application/json" }, cache: "no-store" });
    const payload = await upstream.json();
    return NextResponse.json(payload, { status: upstream.status });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        source: "privatedao-txline-guest-start-proxy",
        status: "guest-session-unavailable",
        error: error instanceof Error ? error.message : "Unable to reach TxLINE guest session runtime.",
      },
      { status: 502 },
    );
  }
}
