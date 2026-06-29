import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-static";

const LIVE_URL = "https://api.privatedao.org/api/v1/txline/matches";

export async function GET() {
  try {
    const upstream = await fetch(LIVE_URL, { headers: { Accept: "application/json" }, cache: "no-store" });
    const payload = await upstream.json();
    return NextResponse.json(payload, { status: upstream.status });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        source: "privatedao-txline-matches-proxy",
        status: "txline-matches-unavailable",
        error: error instanceof Error ? error.message : "Unable to reach TxLINE matches runtime.",
      },
      { status: 502 },
    );
  }
}
