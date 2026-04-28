import { NextResponse } from "next/server";

export const dynamic = "force-static";

type ZerionPortfolioRequest = {
  walletAddress?: string;
  currency?: string;
  sync?: boolean;
  positionsFilter?: "only_simple" | "only_complex" | "no_filter";
};

const ZERION_BASE = "https://api.zerion.io/v1";

function buildBasicAuth(apiKey: string) {
  return Buffer.from(`${apiKey}:`).toString("base64");
}

function normalizeWalletAddress(value: string | undefined) {
  const wallet = value?.trim() ?? "";
  if (!wallet || wallet.length < 32 || wallet.length > 64) {
    throw new Error("Invalid wallet address.");
  }
  return wallet;
}

function normalizeCurrency(value: string | undefined) {
  const currency = value?.trim().toLowerCase() ?? "usd";
  return currency || "usd";
}

function normalizePositionsFilter(value: ZerionPortfolioRequest["positionsFilter"]) {
  return value ?? "only_simple";
}

export async function POST(request: Request) {
  const apiKey = process.env.ZERION_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "Missing ZERION_API_KEY in server environment." }, { status: 500 });
  }

  try {
    const body = (await request.json()) as ZerionPortfolioRequest;
    const walletAddress = normalizeWalletAddress(
      body.walletAddress ?? process.env.PRIVATE_DAO_TESTNET_WALLET_PUBLIC_KEY,
    );
    const currency = normalizeCurrency(body.currency);
    const positionsFilter = normalizePositionsFilter(body.positionsFilter);
    const sync = body.sync === true;

    const params = new URLSearchParams({
      currency,
      "filter[positions]": positionsFilter,
      sync: sync ? "true" : "false",
    });

    const response = await fetch(`${ZERION_BASE}/wallets/${walletAddress}/portfolio?${params.toString()}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${buildBasicAuth(apiKey)}`,
      },
      cache: "no-store",
    });

    const raw = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            (typeof raw?.message === "string" && raw.message) ||
            (typeof raw?.error === "string" && raw.error) ||
            `Zerion responded ${response.status}.`,
          status: response.status,
        },
        { status: response.status },
      );
    }

    const data = (raw?.data ?? {}) as Record<string, unknown>;
    const attributes = (data.attributes ?? {}) as Record<string, unknown>;
    const total = (attributes.total ?? {}) as Record<string, unknown>;
    const changes = (attributes.changes ?? {}) as Record<string, unknown>;
    const byType = (attributes.positions_distribution_by_type ?? {}) as Record<string, unknown>;
    const byChain = (attributes.positions_distribution_by_chain ?? {}) as Record<string, unknown>;

    return NextResponse.json(
      {
        walletAddress,
        currency,
        positionsFilter,
        summary: {
          totalPositionsUsd:
            typeof total.positions === "number" ? total.positions : null,
          absoluteChange1d:
            typeof changes.absolute_1d === "number" ? changes.absolute_1d : null,
          percentChange1d:
            typeof changes.percent_1d === "number" ? changes.percent_1d : null,
        },
        positionsDistributionByType: byType,
        positionsDistributionByChain: byChain,
        raw,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Zerion portfolio request failed." },
      { status: 400 },
    );
  }
}
