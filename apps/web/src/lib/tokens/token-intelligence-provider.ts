export type TokenDecisionUseCase = "proposal" | "payout" | "treasury" | "vesting";

export type TokenRiskLevel = "low" | "medium" | "unknown";

export type TokenIntelligenceRequest = {
  symbol?: string;
  mint?: string;
  useCase: TokenDecisionUseCase;
};

export type TokenIntelligenceResult = {
  canonicalSymbol: string;
  verifiedAsset: boolean;
  priceAvailable: boolean;
  riskLevel: TokenRiskLevel;
  riskSummary: string;
  labels: string[];
  providerStatus: "available" | "sandbox" | "unavailable";
};

export type TokenIntelligenceProviderStatus = {
  id: "sandbox-token-context" | "tokens-compatible";
  enabled: boolean;
  configured: boolean;
  status: "available" | "sandbox" | "unavailable";
};

export type TokenIntelligenceProvider = {
  id: TokenIntelligenceProviderStatus["id"];
  getStatus(): TokenIntelligenceProviderStatus;
  analyzeAsset(request: TokenIntelligenceRequest): Promise<TokenIntelligenceResult>;
};

const verifiedSymbols = new Set(["USDC", "SOL", "PUSD", "AUDD"]);

export function normalizeTokenSymbol(symbol?: string) {
  return (symbol || "USDC").trim().toUpperCase();
}

export const sandboxTokenIntelligenceProvider: TokenIntelligenceProvider = {
  id: "sandbox-token-context",

  getStatus() {
    return {
      id: "sandbox-token-context",
      enabled: true,
      configured: true,
      status: "sandbox",
    };
  },

  async analyzeAsset(request) {
    const canonicalSymbol = normalizeTokenSymbol(request.symbol);
    const verifiedAsset = verifiedSymbols.has(canonicalSymbol);
    const priceAvailable = canonicalSymbol !== "UNKNOWN";
    return {
      canonicalSymbol,
      verifiedAsset,
      priceAvailable,
      riskLevel: verifiedAsset ? "low" : "unknown",
      riskSummary: verifiedAsset
        ? "Asset context is ready for a private vote and public verification path."
        : "Unknown asset. Keep the proposal review step active before voting.",
      labels: [
        verifiedAsset ? "Verified asset" : "Unknown asset",
        priceAvailable ? "Price available" : "Price unavailable",
        verifiedAsset ? "Risk summary: low" : "Risk summary: review needed",
      ],
      providerStatus: "sandbox",
    };
  },
};

function getTokensCompatibleConfig() {
  return {
    enabled: process.env.TOKENS_PROVIDER_ENABLED === "true",
    baseUrl: process.env.TOKENS_API_BASE_URL?.trim(),
    apiKey: process.env.TOKENS_API_KEY?.trim(),
  };
}

export const tokensCompatibleProvider: TokenIntelligenceProvider = {
  id: "tokens-compatible",

  getStatus() {
    const config = getTokensCompatibleConfig();
    const configured = Boolean(config.enabled && config.baseUrl && config.apiKey);
    return {
      id: "tokens-compatible",
      enabled: config.enabled,
      configured,
      status: configured ? "available" : "unavailable",
    };
  },

  async analyzeAsset(request) {
    const config = getTokensCompatibleConfig();
    if (!config.enabled || !config.baseUrl || !config.apiKey) {
      return sandboxTokenIntelligenceProvider.analyzeAsset(request);
    }

    const url = new URL("/v1/token-context", config.baseUrl);
    if (request.symbol) url.searchParams.set("symbol", request.symbol);
    if (request.mint) url.searchParams.set("mint", request.mint);
    url.searchParams.set("useCase", request.useCase);

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });
      if (!response.ok) return sandboxTokenIntelligenceProvider.analyzeAsset(request);
      const raw = (await response.json()) as Partial<TokenIntelligenceResult>;
      const canonicalSymbol = normalizeTokenSymbol(raw.canonicalSymbol || request.symbol);
      const verifiedAsset = raw.verifiedAsset === true;
      const priceAvailable = raw.priceAvailable !== false;
      return {
        canonicalSymbol,
        verifiedAsset,
        priceAvailable,
        riskLevel: raw.riskLevel === "medium" || raw.riskLevel === "low" ? raw.riskLevel : verifiedAsset ? "low" : "unknown",
        riskSummary: typeof raw.riskSummary === "string" ? raw.riskSummary : "Asset context is ready for review.",
        labels: [
          verifiedAsset ? "Verified asset" : "Unknown asset",
          priceAvailable ? "Price available" : "Price unavailable",
          `Risk summary: ${verifiedAsset ? "low" : "review needed"}`,
        ],
        providerStatus: "available",
      };
    } catch {
      return sandboxTokenIntelligenceProvider.analyzeAsset(request);
    }
  },
};

export function getTokenIntelligenceProvider() {
  return tokensCompatibleProvider.getStatus().configured ? tokensCompatibleProvider : sandboxTokenIntelligenceProvider;
}
