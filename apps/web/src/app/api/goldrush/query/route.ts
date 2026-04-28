import { NextResponse } from "next/server";

export const dynamic = "force-static";

type GoldRushQueryType =
  | "wallet-history"
  | "stablecoin-flows"
  | "counterparty-screen"
  | "token-holdings";

type GoldRushRequest = {
  queryType?: GoldRushQueryType;
  chainName?: string;
  walletAddress?: string;
  include?: string[];
  assets?: string[];
};

const GOLDRUSH_BASE = "https://api.covalenthq.com/v1";
const DUNE_SIM_BASE = "https://api.sim.dune.com/beta/svm";
const FALLBACK_CHAIN = "solana-mainnet";

function normalizeWalletAddress(value: string | undefined) {
  const wallet = value?.trim() ?? "";
  if (!wallet || wallet.length < 32 || wallet.length > 64) {
    throw new Error("Invalid wallet address.");
  }
  return wallet;
}

function normalizeChain(value: string | undefined) {
  const chain = value?.trim() ?? FALLBACK_CHAIN;
  return chain || FALLBACK_CHAIN;
}

function pickStableSymbols(requestAssets?: string[]) {
  const defaults = ["USDC", "USDT", "PUSD", "AUDD"];
  const values = requestAssets?.filter(Boolean).map((asset) => asset.toUpperCase()) ?? defaults;
  return values.length > 0 ? values : defaults;
}

function asObject(value: unknown) {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function parseNumeric(value: unknown) {
  const numberValue =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(numberValue) ? numberValue : null;
}

async function fetchGoldRushBalances(chainName: string, walletAddress: string, apiKey: string) {
  const url = `${GOLDRUSH_BASE}/${chainName}/address/${walletAddress}/balances_v2/?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`GoldRush responded ${response.status}.`);
  }

  return response.json();
}

async function fetchDuneSimTransactions(walletAddress: string, apiKey: string) {
  const url = `${DUNE_SIM_BASE}/transactions/${walletAddress}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Sim-Api-Key": apiKey,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Dune Sim responded ${response.status}.`);
  }

  return response.json();
}

function buildBalanceSummary(items: unknown[], stableSymbols: string[]) {
  const normalized = items.map((item) => ({
    symbol: asObject(item)?.contract_ticker_symbol ?? asObject(item)?.contract_name ?? "UNKNOWN",
    name: asObject(item)?.contract_name ?? asObject(item)?.contract_ticker_symbol ?? "Unknown asset",
    balance: asObject(item)?.balance ?? null,
    prettyBalance: asObject(item)?.pretty_balance ?? null,
    quote: parseNumeric(asObject(item)?.quote),
    contractAddress: asObject(item)?.contract_address ?? null,
    decimals: asObject(item)?.contract_decimals ?? null,
  }));

  const stableHoldings = normalized.filter((item) => stableSymbols.includes(String(item.symbol).toUpperCase()));
  const totalQuote = normalized.reduce((sum, item) => sum + (item.quote ?? 0), 0);

  return {
    assets: normalized.slice(0, 30),
    stableHoldings,
    totalQuoteUsd: Number(totalQuote.toFixed(2)),
    assetCount: normalized.length,
  };
}

function buildTransactionSummary(raw: unknown, stableSymbols: string[]) {
  const rawObject = asObject(raw);
  const dataObject = asObject(rawObject?.data);
  const transactions = asArray(
    dataObject?.items ??
      rawObject?.items ??
      rawObject?.transactions ??
      rawObject?.result,
  );

  const preview = transactions.slice(0, 20);
  const stablecoinMentions = preview.filter((entry) => {
    const haystack = JSON.stringify(entry).toUpperCase();
    return stableSymbols.some((symbol) => haystack.includes(symbol));
  });

  return {
    preview,
    previewCount: preview.length,
    stablecoinMentions,
  };
}

function buildRiskSignals(
  queryType: GoldRushQueryType,
  balanceSummary: ReturnType<typeof buildBalanceSummary>,
  transactionSummary: ReturnType<typeof buildTransactionSummary> | null,
) {
  const signals: string[] = [];

  if (balanceSummary.assetCount >= 12) {
    signals.push("Wallet holds a wide asset set and should be reviewed for concentration drift.");
  }

  if (balanceSummary.stableHoldings.length === 0) {
    signals.push("No stable holdings were detected in the current balance snapshot.");
  }

  if ((balanceSummary.totalQuoteUsd ?? 0) >= 100_000) {
    signals.push("Treasury value is large enough to justify explicit route review before signing.");
  }

  if (transactionSummary && transactionSummary.previewCount === 0) {
    signals.push("No recent transaction preview was returned from the supplemental transaction feed.");
  }

  if (queryType === "counterparty-screen" && transactionSummary && transactionSummary.stablecoinMentions.length >= 8) {
    signals.push("Counterparty has repeated stablecoin activity and should be cross-checked before settlement.");
  }

  if (queryType === "stablecoin-flows" && transactionSummary && transactionSummary.stablecoinMentions.length === 0) {
    signals.push("No stablecoin-tagged activity was found in the sampled transaction preview.");
  }

  return signals;
}

export async function POST(request: Request) {
  const goldRushApiKey = process.env.GOLDRUSH_API_KEY?.trim();
  const duneSimApiKey = process.env.DUNE_SIM_API_KEY?.trim();

  if (!goldRushApiKey) {
    return NextResponse.json(
      { error: "Missing GOLDRUSH_API_KEY in server environment." },
      { status: 500 },
    );
  }

  try {
    const body = (await request.json()) as GoldRushRequest;
    const queryType = (body.queryType ?? "wallet-history") as GoldRushQueryType;
    const chainName = normalizeChain(body.chainName);
    const walletAddress = normalizeWalletAddress(body.walletAddress);
    const stableSymbols = pickStableSymbols(body.assets);

    const goldRushBalances = await fetchGoldRushBalances(chainName, walletAddress, goldRushApiKey);
    const balanceSummary = buildBalanceSummary(goldRushBalances?.data?.items ?? goldRushBalances?.items ?? [], stableSymbols);

    const shouldFetchTransactions =
      queryType === "wallet-history" ||
      queryType === "stablecoin-flows" ||
      queryType === "counterparty-screen";

    let transactionSummary: ReturnType<typeof buildTransactionSummary> | null = null;
    let duneSourceState = "disabled";

    if (shouldFetchTransactions && duneSimApiKey) {
      try {
        const duneRaw = await fetchDuneSimTransactions(walletAddress, duneSimApiKey);
        transactionSummary = buildTransactionSummary(duneRaw, stableSymbols);
        duneSourceState = "live";
      } catch (error) {
        duneSourceState = error instanceof Error ? error.message : "failed";
      }
    }

    const response = {
      queryType,
      chainName,
      walletAddress,
      sources: {
        goldRush: "live",
        duneSim: duneSourceState,
      },
      summary: {
        assetCount: balanceSummary.assetCount,
        stableAssetCount: balanceSummary.stableHoldings.length,
        totalQuoteUsd: balanceSummary.totalQuoteUsd,
        previewTransactionCount: transactionSummary?.previewCount ?? 0,
      },
      riskSignals: buildRiskSignals(queryType, balanceSummary, transactionSummary),
      balances: balanceSummary.assets,
      stablecoinHoldings: balanceSummary.stableHoldings,
      transactions: transactionSummary?.preview ?? [],
      stablecoinFlowPreview: transactionSummary?.stablecoinMentions ?? [],
      raw: {
        include: body.include ?? [],
        assets: stableSymbols,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "GoldRush proxy failed." },
      { status: 400 },
    );
  }
}
