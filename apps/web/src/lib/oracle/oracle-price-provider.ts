export type PriceUseCase = "treasury" | "payout" | "vesting";

export type OraclePriceRequest = {
  symbol: string;
  amount?: string;
  useCase: PriceUseCase;
};

export type OraclePriceContext = {
  symbol: string;
  priceAvailable: boolean;
  usdPrice?: number;
  usdValue?: number;
  label: string;
  providerStatus: "sandbox" | "available" | "disabled";
};

export type OraclePriceProvider = {
  id: "sandbox-price-context" | "pyth-compatible";
  getStatus(): { enabled: boolean; configured: boolean; status: OraclePriceContext["providerStatus"] };
  getPriceContext(request: OraclePriceRequest): Promise<OraclePriceContext>;
};

const sandboxPrices: Record<string, number> = {
  USDC: 1,
  PUSD: 1,
  AUDD: 0.66,
  SOL: 165,
};

function normalizeAmount(amount?: string) {
  const parsed = Number(amount);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export const sandboxOraclePriceProvider: OraclePriceProvider = {
  id: "sandbox-price-context",

  getStatus() {
    return { enabled: true, configured: true, status: "sandbox" };
  },

  async getPriceContext(request) {
    const symbol = request.symbol.trim().toUpperCase();
    const usdPrice = sandboxPrices[symbol];
    const amount = normalizeAmount(request.amount);
    return {
      symbol,
      priceAvailable: usdPrice !== undefined,
      usdPrice,
      usdValue: usdPrice !== undefined && amount !== undefined ? Number((usdPrice * amount).toFixed(2)) : undefined,
      label: usdPrice !== undefined ? "Price context available" : "Price context unavailable",
      providerStatus: "sandbox",
    };
  },
};

export const pythCompatibleOracleProvider: OraclePriceProvider = {
  id: "pyth-compatible",

  getStatus() {
    const enabled = process.env.PYTH_PROVIDER_ENABLED === "true";
    const configured = Boolean(enabled && process.env.PYTH_API_BASE_URL?.trim());
    return { enabled, configured, status: configured ? "available" : "disabled" };
  },

  async getPriceContext(request) {
    const status = this.getStatus();
    if (!status.configured) return sandboxOraclePriceProvider.getPriceContext(request);
    const baseUrl = process.env.PYTH_API_BASE_URL?.trim();
    if (!baseUrl) return sandboxOraclePriceProvider.getPriceContext(request);

    try {
      const url = new URL("/v1/price-context", baseUrl);
      url.searchParams.set("symbol", request.symbol);
      url.searchParams.set("useCase", request.useCase);
      const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) return sandboxOraclePriceProvider.getPriceContext(request);
      const raw = (await response.json()) as { usdPrice?: unknown };
      const usdPrice = typeof raw.usdPrice === "number" ? raw.usdPrice : undefined;
      const amount = normalizeAmount(request.amount);
      return {
        symbol: request.symbol.trim().toUpperCase(),
        priceAvailable: usdPrice !== undefined,
        usdPrice,
        usdValue: usdPrice !== undefined && amount !== undefined ? Number((usdPrice * amount).toFixed(2)) : undefined,
        label: usdPrice !== undefined ? "Price context available" : "Price context unavailable",
        providerStatus: "available",
      };
    } catch {
      return sandboxOraclePriceProvider.getPriceContext(request);
    }
  },
};

export function getOraclePriceProvider() {
  return pythCompatibleOracleProvider.getStatus().configured ? pythCompatibleOracleProvider : sandboxOraclePriceProvider;
}
