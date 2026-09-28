const bool = (value, fallback = false) =>
  value == null ? fallback : value === "true" || value === "1";
const boundedNumber = (value, fallback, min, max) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

function alchemySolanaRpcUrl(apiKey) {
  return apiKey ? `https://solana-mainnet.g.alchemy.com/v2/${apiKey}` : "";
}

export function getConfig(env = process.env) {
  const evmRpcUrls = Object.fromEntries(
    [
      ["ethereum-mainnet", "PDAO_EVM_ETHEREUM_MAINNET_RPC_URL"],
      ["base-mainnet", "PDAO_EVM_BASE_MAINNET_RPC_URL"],
      ["arbitrum-mainnet", "PDAO_EVM_ARBITRUM_MAINNET_RPC_URL"],
    ].map(([network, key]) => [network, env[key] || ""]).filter(([, value]) => value),
  );
  return {
    region: env.AWS_REGION || "eu-north-1",
    domain: env.AGENT_DOMAIN || "agents.privatedao.org",
    treasury:
      env.SOLANA_TREASURY || "2BJ4ezxqV9YJXc38D9duKBkdn4su4jE1beKUHwH663sL",
    usdcMint:
      env.SOLANA_USDC_MINT || "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    pdaoMint: env.PDAO_MINT || "9isGuumtaqvJeJeyLF44fvfskk2cv5mYsopexMBfpump",
    cluster: "mainnet-beta",
    mainnetGenesisHash: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
    rpcPrimary:
      env.AGENT_GATEWAY_SOLANA_RPC_PRIMARY ||
      "https://api.mainnet-beta.solana.com",
    rpcWsPrimary: env.AGENT_GATEWAY_SOLANA_WS_PRIMARY || "",
    rpcSecretId:
      env.AGENT_EXCHANGE_SOLANA_RPC_SECRET_ID ||
      "pdao/agent-exchange/solana-rpc",
    adminSecretId:
      env.AGENT_EXCHANGE_ADMIN_SECRET_ID || "pdao/agent-exchange/admin-smoke",
    adminSmokeToken: "",
    rpcSecondary: env.AGENT_GATEWAY_SOLANA_RPC_SECONDARY || alchemySolanaRpcUrl(env.ALCHEMY_API_KEY),
    rpcFallback:
      env.AGENT_GATEWAY_SOLANA_RPC_FALLBACK ||
      "https://api.mainnet-beta.solana.com",
    alchemyApiKey: env.ALCHEMY_API_KEY || "",
    alchemySecretId: env.AGENT_EXCHANGE_ALCHEMY_SECRET_ID || "",
    evmRpcUrls,
    jupiterQuoteUrl: env.PDAO_JUPITER_QUOTE_URL || "https://quote-api.jup.ag/v6/quote",
    jupiterApiKey: env.PDAO_JUPITER_API_KEY || "",
    bedrockEnabled: bool(env.BEDROCK_ENABLED),
    bedrockModel: env.BEDROCK_MODEL_ID || "amazon.nova-micro-v1:0",
    intelInferenceUrl: env.PDAO_INTEL_INFERENCE_URL || "",
    intelOpenvinoModel: env.PDAO_INTEL_OPENVINO_MODEL || "",
    mongoSecretId: env.AGENT_EXCHANGE_MONGODB_SECRET_ID || "",
    mongoUri: env.MONGODB_URI || "",
    mongoDatabase: env.MONGODB_DATABASE || "privatedao_agent_exchange",
    mongoCollection: env.MONGODB_COLLECTION || "evidence",
    ibmSecretId: env.AGENT_EXCHANGE_IBM_SECRET_ID || "",
    ibmApiKey: env.IBM_WATSONX_API_KEY || "",
    ibmUrl: env.IBM_WATSONX_URL || "",
    ibmProjectId: env.IBM_WATSONX_PROJECT_ID || "",
    ibmModel: env.IBM_WATSONX_MODEL_ID || "ibm/granite-13b-chat-v2",
    githubSecretId: env.AGENT_EXCHANGE_GITHUB_SECRET_ID || "",
    githubAppId: Number(env.GITHUB_APP_ID || env.AGENT_EXCHANGE_GITHUB_APP_ID || 5049917),
    githubAppPrivateKey: env.GITHUB_APP_PRIVATE_KEY || "",
    githubWebhookSecret: env.GITHUB_WEBHOOK_SECRET || "",
    // Keep the fallback aligned with the existing GitHub App slug. A wrong
    // fallback produces a dead installation URL when the secret omits it.
    githubAppSlug: env.GITHUB_APP_SLUG || "privatedao-agent-exchange",
    githubToken: env.GITHUB_TOKEN || "",
    githubApiUrl: env.GITHUB_API_URL || "https://api.github.com",
    githubRepository: env.GITHUB_REPOSITORY || "",
    marketDataUrl: env.PDAO_MARKET_DATA_URL || "https://api.dexscreener.com/latest/dex",
    telegramNotifications: bool(env.PDAO_TELEGRAM_NOTIFICATIONS_ENABLED),
    discordNotifications: bool(env.PDAO_DISCORD_NOTIFICATIONS_ENABLED),
    tablePrefix: env.AGENT_EXCHANGE_TABLE_PREFIX || "PrivateDAOAgentExchange",
    tables: {
      Quotes: env.AGENT_EXCHANGE_QUOTES_TABLE || "",
      Payments: env.AGENT_EXCHANGE_PAYMENTS_TABLE || "",
      Receipts: env.AGENT_EXCHANGE_RECEIPTS_TABLE || "",
      Registry: env.AGENT_EXCHANGE_REGISTRY_TABLE || "",
      Jobs: env.AGENT_EXCHANGE_JOBS_TABLE || "",
      Campaigns: env.AGENT_EXCHANGE_CAMPAIGNS_TABLE || "",
      Listings: env.AGENT_EXCHANGE_LISTINGS_TABLE || "",
      Agreements: env.AGENT_EXCHANGE_AGREEMENTS_TABLE || "",
      Logistics: env.AGENT_EXCHANGE_LOGISTICS_TABLE || "",
      Revenue: env.AGENT_EXCHANGE_REVENUE_TABLE || "",
      Telemetry: env.AGENT_EXCHANGE_TELEMETRY_TABLE || "",
      RateLimits: env.AGENT_EXCHANGE_RATE_LIMITS_TABLE || "",
    },
    // Test storage must be explicitly enabled in a test process. A stray
    // storage flag in Lambda must never silently replace DynamoDB with memory.
    allowTestStorage: env.AGENT_EXCHANGE_TEST_MODE === "true" && bool(env.AGENT_EXCHANGE_ALLOW_TEST_STORAGE),
    maxBodyBytes: boundedNumber(env.AGENT_EXCHANGE_MAX_BODY_BYTES || 262144, 262144, 4096, 1048576),
    rateLimitPerMinute: boundedNumber(env.AGENT_EXCHANGE_RATE_LIMIT_PER_MINUTE || 120, 120, 10, 1000),
    priceMultiplier: boundedNumber(env.AGENT_EXCHANGE_PRICE_MULTIPLIER || 1, 1, 0.000001, 1000),
    marketplaceFeeBps: boundedNumber(env.AGENT_EXCHANGE_MARKETPLACE_FEE_BPS || 1000, 1000, 0, 10000),
  };
}

export async function hydrateConfig(config, env = process.env) {
  if (!env.AGENT_EXCHANGE_SOLANA_RPC_SECRET_ID && !config.alchemySecretId) return config;
  const [{ SecretsManagerClient, GetSecretValueCommand }] = await Promise.all([
    import("@aws-sdk/client-secrets-manager"),
  ]);
  const client = new SecretsManagerClient({ region: config.region });
  const parseSecret = (secret) => {
    const raw = String(secret || "").trim();
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {
      // Secrets stored as dotenv text remain supported for existing integrations.
    }
    return Object.fromEntries(
      raw.split(/\r?\n/)
        .filter((line) => line && !line.trim().startsWith("#"))
        .map((line) => {
          const i = line.indexOf("=");
          return i > 0 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : null;
        }).filter(Boolean),
    );
  };
  const values = env.AGENT_EXCHANGE_SOLANA_RPC_SECRET_ID
    ? parseSecret((await client.send(new GetSecretValueCommand({ SecretId: env.AGENT_EXCHANGE_SOLANA_RPC_SECRET_ID }))).SecretString)
    : {};
  if (values.AGENT_GATEWAY_SOLANA_RPC_PRIMARY)
    config.rpcPrimary = values.AGENT_GATEWAY_SOLANA_RPC_PRIMARY;
  if (values.AGENT_GATEWAY_SOLANA_WS_PRIMARY)
    config.rpcWsPrimary = values.AGENT_GATEWAY_SOLANA_WS_PRIMARY;
  if (values.ALCHEMY_API_KEY) {
    config.alchemyApiKey = values.ALCHEMY_API_KEY;
    if (!config.rpcSecondary) config.rpcSecondary = alchemySolanaRpcUrl(values.ALCHEMY_API_KEY);
  }
  for (const [network, key] of [
    ["ethereum-mainnet", "PDAO_EVM_ETHEREUM_MAINNET_RPC_URL"],
    ["base-mainnet", "PDAO_EVM_BASE_MAINNET_RPC_URL"],
    ["arbitrum-mainnet", "PDAO_EVM_ARBITRUM_MAINNET_RPC_URL"],
  ]) if (values[key]) config.evmRpcUrls[network] = values[key];
  if (config.alchemySecretId) {
    const alchemy = await client.send(new GetSecretValueCommand({ SecretId: config.alchemySecretId }));
    const alchemyValues = parseSecret(alchemy.SecretString);
    if (alchemyValues.ALCHEMY_API_KEY) {
      config.alchemyApiKey = alchemyValues.ALCHEMY_API_KEY;
      if (!config.rpcSecondary) config.rpcSecondary = alchemySolanaRpcUrl(alchemyValues.ALCHEMY_API_KEY);
    }
    for (const [network, key] of [
      ["ethereum-mainnet", "PDAO_EVM_ETHEREUM_MAINNET_RPC_URL"],
      ["base-mainnet", "PDAO_EVM_BASE_MAINNET_RPC_URL"],
      ["arbitrum-mainnet", "PDAO_EVM_ARBITRUM_MAINNET_RPC_URL"],
    ]) if (alchemyValues[key]) config.evmRpcUrls[network] = alchemyValues[key];
  }
  if (env.AGENT_EXCHANGE_ADMIN_SECRET_ID) {
    const admin = await client.send(
      new GetSecretValueCommand({
        SecretId: env.AGENT_EXCHANGE_ADMIN_SECRET_ID,
      }),
    );
    config.adminSmokeToken = admin.SecretString || "";
  }
  const parseOptional = (secret) => parseSecret(secret);
  const optionalSecrets = [
    [config.mongoSecretId, (values) => { if (values.MONGODB_URI) config.mongoUri = values.MONGODB_URI; if (values.MONGODB_DATABASE) config.mongoDatabase = values.MONGODB_DATABASE; if (values.MONGODB_COLLECTION) config.mongoCollection = values.MONGODB_COLLECTION; }],
    [config.ibmSecretId, (values) => { if (values.IBM_WATSONX_API_KEY) config.ibmApiKey = values.IBM_WATSONX_API_KEY; if (values.IBM_WATSONX_URL) config.ibmUrl = values.IBM_WATSONX_URL; if (values.IBM_WATSONX_PROJECT_ID) config.ibmProjectId = values.IBM_WATSONX_PROJECT_ID; if (values.IBM_WATSONX_MODEL_ID) config.ibmModel = values.IBM_WATSONX_MODEL_ID; }],
    [config.githubSecretId, (values) => { if (values.GITHUB_TOKEN) config.githubToken = values.GITHUB_TOKEN; if (values.GITHUB_REPOSITORY) config.githubRepository = values.GITHUB_REPOSITORY; if (values.GITHUB_APP_ID) config.githubAppId = Number(values.GITHUB_APP_ID); if (values.GITHUB_APP_PRIVATE_KEY) config.githubAppPrivateKey = values.GITHUB_APP_PRIVATE_KEY; if (values.GITHUB_WEBHOOK_SECRET) config.githubWebhookSecret = values.GITHUB_WEBHOOK_SECRET; if (values.GITHUB_APP_SLUG) config.githubAppSlug = values.GITHUB_APP_SLUG; }],
  ];
  for (const [secretId, apply] of optionalSecrets) {
    if (!secretId) continue;
    const optional = await client.send(new GetSecretValueCommand({ SecretId: secretId }));
    apply(parseOptional(optional.SecretString));
  }
  return config;
}
