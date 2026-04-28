import { NextResponse } from "next/server";

export const dynamic = "force-static";

const DUNE_SIM_BASE = "https://api.sim.dune.com/beta/svm";

function parseWallet(searchParams: URLSearchParams) {
  const wallet = searchParams.get("wallet")?.trim() ?? "";
  if (!wallet || wallet.length < 32 || wallet.length > 64) {
    throw new Error("Invalid wallet address.");
  }
  return wallet;
}

export async function GET(request: Request) {
  const apiKey = process.env.DUNE_SIM_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "Missing DUNE_SIM_API_KEY in server environment." }, { status: 500 });
  }

  try {
    const url = new URL(request.url);
    const wallet = parseWallet(url.searchParams);
    const response = await fetch(`${DUNE_SIM_BASE}/transactions/${wallet}`, {
      headers: {
        Accept: "application/json",
        "X-Sim-Api-Key": apiKey,
      },
      cache: "no-store",
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json(
        { error: `Dune Sim transactions responded ${response.status}.`, details: body },
        { status: response.status },
      );
    }
    return NextResponse.json(body, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Dune Sim transactions proxy failed." },
      { status: 400 },
    );
  }
}
