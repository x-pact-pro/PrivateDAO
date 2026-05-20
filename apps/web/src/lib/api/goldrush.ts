export type GoldRushQueryType =
  | "wallet-history"
  | "stablecoin-flows"
  | "counterparty-screen"
  | "token-holdings";

export type GoldRushQueryRequest = {
  queryType: GoldRushQueryType;
  chainName?: string;
  walletAddress: string;
  include?: string[];
  assets?: string[];
};

export type GoldRushQueryResponse = {
  ok?: boolean;
  queryType: GoldRushQueryType;
  chainName: string;
  walletAddress: string;
  sources: {
    goldRush: string;
    legacyAnalytics?: string;
    covalentGoldRush?: string;
    zerion?: string;
    solanaRpc?: string;
  };
  summary: {
    assetCount: number;
    stableAssetCount: number;
    totalQuoteUsd: number;
    previewTransactionCount: number;
  };
  riskSignals: string[];
  balances: Array<{
    symbol?: string;
    name?: string;
    quote?: number | null;
    prettyBalance?: string | null;
  }>;
  stablecoinHoldings: Array<{
    symbol?: string;
    quote?: number | null;
    prettyBalance?: string | null;
  }>;
  transactions: unknown[];
  stablecoinFlowPreview: unknown[];
  raw: {
    balanceStatus?: number;
    transactionStatus?: number;
    zerionStatus?: number | null;
    solanaRpcStatus?: number | null;
  };
};

export async function runGoldRushQuery(payload: GoldRushQueryRequest): Promise<GoldRushQueryResponse> {
  const endpoint = process.env.NEXT_PUBLIC_GOLDRUSH_PROXY_ENDPOINT?.trim() || "https://api.privatedao.org/api/v1/goldrush/query";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok || !body) {
    throw new Error(typeof body?.error === "string" ? body.error : `GoldRush query failed (${response.status}).`);
  }

  return body as GoldRushQueryResponse;
}
