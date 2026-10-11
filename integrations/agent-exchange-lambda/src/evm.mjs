import { normalizeNetworkId } from "./network-capabilities.mjs";

const EVM_NETWORKS = Object.freeze({
  "ethereum-mainnet": { chainId: "0x1", label: "Ethereum Mainnet", alchemySlug: "eth-mainnet", env: "PDAO_EVM_ETHEREUM_MAINNET_RPC_URL" },
  "base-mainnet": { chainId: "0x2105", label: "Base Mainnet", alchemySlug: "base-mainnet", env: "PDAO_EVM_BASE_MAINNET_RPC_URL" },
  "arbitrum-mainnet": { chainId: "0xa4b1", label: "Arbitrum One", alchemySlug: "arb-mainnet", env: "PDAO_EVM_ARBITRUM_MAINNET_RPC_URL" },
});

const hexAddress = /^0x[0-9a-fA-F]{40}$/;
const hexData = /^0x(?:[0-9a-fA-F]{2})*$/;
const rpcCache = new Map();
const rpcStats = { calls: 0, retries: 0, cacheHits: 0, cacheMisses: 0, byMethod: {} };
const cacheableMethods = new Set(["eth_getCode", "eth_call"]);
const MAX_RPC_ATTEMPTS = 2;
const EVM_EXECUTABLE_SERVICES = new Set([
  "token.intelligence",
  "risk.score",
  "wallet.intelligence",
  "wallet.bot.classify",
  "contract.inspect",
  "launch.check",
  "forensics.trace",
  "transaction.simulate",
  "swap.quote",
]);

const EVM_CHAIN_IDS = Object.freeze({
  "ethereum-mainnet": "1",
  "base-mainnet": "8453",
  "arbitrum-mainnet": "42161",
});

function retryableError(message, retryable = false) {
  const error = new Error(message);
  error.retryable = retryable;
  return error;
}

function retryDelay(attempt) {
  return new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
}

export function evmNetwork(id) {
  return EVM_NETWORKS[normalizeNetworkId(id)] || null;
}

export function evmNetworks() {
  return Object.entries(EVM_NETWORKS).map(([id, value]) => ({ id, ...value }));
}

export function isEvmServiceSupported(serviceId) {
  return EVM_EXECUTABLE_SERVICES.has(serviceId);
}

export function evmRpcUrl(config, network) {
  const normalizedNetwork = normalizeNetworkId(network);
  const definition = evmNetwork(normalizedNetwork);
  if (!definition) throw new Error(`unsupported EVM network: ${network}`);
  const explicit = config.evmRpcUrls?.[normalizedNetwork];
  if (explicit) return explicit;
  if (config.alchemyApiKey) return `https://${definition.alchemySlug}.g.alchemy.com/v2/${config.alchemyApiKey}`;
  throw new Error(`RPC is not configured for ${network}`);
}

async function rpcCall(url, method, params = []) {
  let lastError;
  for (let attempt = 0; attempt < MAX_RPC_ATTEMPTS; attempt += 1) {
    rpcStats.calls += 1;
    rpcStats.byMethod[method] = (rpcStats.byMethod[method] || 0) + 1;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        throw retryableError(`EVM RPC HTTP ${response.status}`, response.status === 429 || response.status >= 500);
      }
      const body = await response.json();
      if (body.error) {
        const code = Number(body.error.code);
        throw retryableError(`EVM RPC ${body.error.code}: ${body.error.message}`, code === -32005 || code === -32603);
      }
      return body.result;
    } catch (error) {
      lastError = error;
      if (!error.retryable || attempt === MAX_RPC_ATTEMPTS - 1) break;
      rpcStats.retries += 1;
      await retryDelay(attempt);
    }
  }
  throw lastError || new Error("EVM RPC request failed");
}

async function alchemyData(config, network, method, params = []) {
  if (!config.alchemyApiKey || config.evmRpcUrls?.[network]) return null;
  try {
    return await rpcCall(evmRpcUrl(config, network), method, params);
  } catch {
    return null;
  }
}

async function read(config, network, method, params = []) {
  const definition = evmNetwork(network);
  const url = evmRpcUrl(config, network);
  const chainKey = `${network}:eth_chainId`;
  const cachedChain = rpcCache.get(chainKey);
  const chainId = cachedChain && cachedChain.expiresAt > Date.now()
    ? (rpcStats.cacheHits++, cachedChain.value)
    : await rpcCall(url, "eth_chainId");
  if (!cachedChain || cachedChain.expiresAt <= Date.now())
    rpcCache.set(chainKey, { value: chainId, expiresAt: Date.now() + 60000 });
  if (chainId.toLowerCase() !== definition.chainId) throw new Error(`chain ID mismatch for ${network}`);
  const providerClass = config.evmRpcUrls?.[network] ? "configured-rpc" : "alchemy";
  const dataKey = cacheableMethods.has(method) ? `${network}:${method}:${JSON.stringify(params)}` : null;
  const cachedData = dataKey ? rpcCache.get(dataKey) : null;
  if (cachedData && cachedData.expiresAt > Date.now()) {
    rpcStats.cacheHits += 1;
    return { result: cachedData.value, chainId, providerClass };
  }
  if (dataKey) rpcStats.cacheMisses += 1;
  const result = await rpcCall(url, method, params);
  if (dataKey) rpcCache.set(dataKey, { value: result, expiresAt: Date.now() + 30000 });
  return { result, chainId, providerClass };
}

export function evmRuntimeStats() {
  return { calls: rpcStats.calls, retries: rpcStats.retries, cache_hits: rpcStats.cacheHits, cache_misses: rpcStats.cacheMisses, by_method: { ...rpcStats.byMethod } };
}

export async function evmRead(config, network, method, params = []) {
  return read(config, network, method, params);
}

function decodeUint(result) {
  return result && result !== "0x" ? BigInt(result).toString() : null;
}

function decodeString(result) {
  if (!result || result === "0x") return null;
  try {
    const bytes = result.slice(2);
    if (bytes.length < 128) return null;
    const offset = Number.parseInt(bytes.slice(0, 64), 16) * 2;
    const length = Number.parseInt(bytes.slice(offset, offset + 64), 16) * 2;
    return Buffer.from(bytes.slice(offset + 64, offset + 64 + length), "hex").toString("utf8").replace(/\0+$/, "");
  } catch { return null; }
}

async function tokenCalls(config, network, asset) {
  if (!hexAddress.test(asset)) throw new Error("valid EVM token address is required");
  const [code, decimals, supply, name, symbol, block] = await Promise.all([
    read(config, network, "eth_getCode", [asset, "latest"]),
    read(config, network, "eth_call", [{ to: asset, data: "0x313ce567" }, "latest"]),
    read(config, network, "eth_call", [{ to: asset, data: "0x18160ddd" }, "latest"]),
    read(config, network, "eth_call", [{ to: asset, data: "0x06fdde03" }, "latest"]),
    read(config, network, "eth_call", [{ to: asset, data: "0x95d89b41" }, "latest"]),
    read(config, network, "eth_blockNumber"),
  ]);
  const metadata = await alchemyData(config, network, "alchemy_getTokenMetadata", [asset]);
  const evidence = {
    network,
    asset,
    contract_present: code.result !== "0x",
    bytecode_bytes: Math.max(0, (code.result?.length || 2) / 2 - 1),
    decimals: decodeUint(decimals.result),
    total_supply: decodeUint(supply.result),
    name: decodeString(name.result),
    symbol: decodeString(symbol.result),
    provider_metadata: metadata && typeof metadata === "object" ? {
      name: metadata.name || null,
      symbol: metadata.symbol || null,
      decimals: metadata.decimals ?? null,
      logo: metadata.logo || null,
    } : null,
    evidence_confidence: "rpc-confirmed",
    provider_class: code.providerClass,
    observed_at: new Date().toISOString(),
  };
  if (block.result !== undefined) evidence.block_number = block.result;
  return evidence;
}

export async function executeEvmService(config, serviceId, input = {}) {
  const network = normalizeNetworkId(input.network || "");
  const definition = evmNetwork(network);
  if (!definition) throw new Error("supported EVM network is required");
  if (serviceId === "swap.quote") return evmSwapQuote(config, network, input);
  const asset = input.asset || input.token || input.contract;
  if (["token.intelligence", "risk.score", "market.snapshot"].includes(serviceId)) {
    const evidence = await tokenCalls(config, network, asset);
    if (serviceId === "risk.score") {
      const factors = {
        contract_present: evidence.contract_present,
        standard_metadata_available: Boolean(evidence.decimals && evidence.total_supply),
        evidence_confidence: evidence.evidence_confidence,
      };
      return { ...evidence, factors, methodology: "deterministic-evm-observations-v1", score: null, score_status: "insufficient-evidence", score_reason: "RPC metadata alone cannot support a numerical token-risk score." };
    }
    return evidence;
  }
  if (serviceId === "wallet.intelligence") {
    const address = input.wallet || input.address;
    if (!hexAddress.test(address || "")) throw new Error("valid EVM wallet address is required");
    const [balance, nonce, code, block] = await Promise.all([
      read(config, network, "eth_getBalance", [address, "latest"]),
      read(config, network, "eth_getTransactionCount", [address, "latest"]),
      read(config, network, "eth_getCode", [address, "latest"]),
      read(config, network, "eth_blockNumber"),
    ]);
    const tokenBalances = await alchemyData(config, network, "alchemy_getTokenBalances", [address, "DEFAULT_TOKENS"]);
    const evidence = {
      network,
      address,
      native_balance_wei: decodeUint(balance.result),
      transaction_count: Number.parseInt(nonce.result, 16),
      is_contract: code.result !== "0x",
      token_balances: Array.isArray(tokenBalances?.tokenBalances)
        ? tokenBalances.tokenBalances.map((item) => ({
          contract_address: item.contractAddress || null,
          token_balance: item.tokenBalance || null,
          error: item.error || null,
        }))
        : null,
      token_balance_source: tokenBalances ? "alchemy-data-api" : null,
      evidence_confidence: "rpc-confirmed",
      provider_class: balance.providerClass,
      observed_at: new Date().toISOString(),
    };
    if (block.result !== undefined) evidence.block_number = block.result;
    return evidence;
  }
  if (["contract.inspect", "launch.check"].includes(serviceId)) {
    const evidence = await tokenCalls(config, network, input.asset || input.token || input.contract || input.mint || input.program || input.address);
    if (serviceId === "contract.inspect") return {
      network,
      address: evidence.asset,
      exists: evidence.contract_present,
      owner: null,
      executable: evidence.contract_present,
      bytecode_bytes: evidence.bytecode_bytes,
      provider_class: evidence.provider_class,
      evidence_confidence: evidence.evidence_confidence,
      observed_at: new Date().toISOString(),
    };
    return {
      network,
      asset: evidence.asset,
      valid: evidence.contract_present,
      authority_flags: { contract_present: evidence.contract_present, standard_metadata_available: Boolean(evidence.decimals && evidence.total_supply) },
      evidence_confidence: evidence.evidence_confidence,
      provider_class: evidence.provider_class,
      observed_at: new Date().toISOString(),
    };
  }
  if (serviceId === "forensics.trace") {
    const address = input.wallet || input.address;
    if (!hexAddress.test(address || "")) throw new Error("valid EVM address is required");
    const [balance, nonce, block, transfers] = await Promise.all([
      read(config, network, "eth_getBalance", [address, "latest"]),
      read(config, network, "eth_getTransactionCount", [address, "latest"]),
      read(config, network, "eth_blockNumber"),
      alchemyData(config, network, "alchemy_getAssetTransfers", [{ fromAddress: address, category: ["external", "erc20", "erc721", "erc1155"], withMetadata: true, maxCount: "0x32" }]),
    ]);
    return { network, address, native_balance_wei: decodeUint(balance.result), transaction_count: Number.parseInt(nonce.result, 16), block_number: block.result, transfers: transfers?.transfers || null, provider_class: balance.providerClass, evidence_confidence: "rpc-confirmed", observed_at: new Date().toISOString() };
  }
  if (serviceId === "transaction.simulate") {
    const tx = input.transaction || input.unsignedTransaction;
    if (!tx || typeof tx !== "object" || Array.isArray(tx))
      throw new Error("EVM simulation requires an unsigned transaction object");
    if (tx.to && !hexAddress.test(tx.to)) throw new Error("valid EVM transaction.to is required");
    if (tx.from && !hexAddress.test(tx.from)) throw new Error("valid EVM transaction.from is required");
    if (tx.data && !hexData.test(tx.data)) throw new Error("transaction.data must be hex");
    const call = { ...(tx.from ? { from: tx.from } : {}), ...(tx.to ? { to: tx.to } : {}), ...(tx.data ? { data: tx.data } : {}), ...(tx.value ? { value: tx.value } : {}) };
    const [result, gas, block] = await Promise.all([
      read(config, network, "eth_call", [call, "latest"]),
      read(config, network, "eth_estimateGas", [call]),
      read(config, network, "eth_blockNumber"),
    ]);
    const evidence = { network, simulated: true, would_broadcast: false, return_data: result.result, estimated_gas: gas.result, evidence_confidence: "rpc-confirmed", provider_class: result.providerClass, observed_at: new Date().toISOString() };
    if (block.result !== undefined) evidence.block_number = block.result;
    return evidence;
  }
  throw new Error(`service ${serviceId} is not implemented for EVM`);
}

async function evmSwapQuote(config, network, input = {}) {
  const address = /^0x[0-9a-fA-F]{40}$/;
  const inputToken = String(input.inputMint || input.inputToken || input.input_token || "");
  const outputToken = String(input.outputMint || input.outputToken || input.output_token || "");
  const amount = String(input.amount || "");
  if (!address.test(inputToken) || !address.test(outputToken)) throw new Error("valid EVM input and output token addresses are required");
  if (!/^[1-9][0-9]*$/.test(amount)) throw new Error("positive base-unit amount is required");
  const url = new URL(config.lifiQuoteUrl);
  const chainId = EVM_CHAIN_IDS[network];
  for (const [key, value] of Object.entries({
    fromChain: chainId,
    toChain: chainId,
    fromToken: inputToken,
    toToken: outputToken,
    fromAddress: input.fromAddress || input.wallet || "0x0000000000000000000000000000000000000001",
    toAddress: input.toAddress || input.fromAddress || input.wallet || "0x0000000000000000000000000000000000000001",
    fromAmount: amount,
    order: "CHEAPEST",
    slippage: (Math.min(5000, Math.max(1, Number(input.slippageBps || 50))) / 10000).toString(),
    allowBridges: "none",
    integrator: "PrivateDAO-Agent-Exchange",
  })) url.searchParams.set(key, String(value));
  const headers = { accept: "application/json" };
  if (config.lifiApiKey) headers["x-lifi-api-key"] = config.lifiApiKey;
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`EVM quote provider HTTP ${response.status}`);
  const quote = await response.json();
  if (!quote?.estimate?.toAmount) throw new Error("EVM quote provider returned no executable estimate");
  return {
    network,
    provider: "LI.FI quote API",
    quote_only: true,
    execution: "disabled",
    input_token: inputToken,
    output_token: outputToken,
    amount_in: amount,
    amount_out: quote.estimate.toAmount,
    amount_out_min: quote.estimate.toAmountMin || null,
    slippage_bps: Math.min(5000, Math.max(1, Number(input.slippageBps || 50))),
    route: quote.tool || quote.type || null,
    gas_costs: Array.isArray(quote.estimate.gasCosts) ? quote.estimate.gasCosts.map((item) => ({ amount: item.amount || null, amount_usd: item.amountUSD || null, token: item.token?.symbol || null })) : [],
    fee_costs: Array.isArray(quote.estimate.feeCosts) ? quote.estimate.feeCosts.map((item) => ({ amount: item.amount || null, amount_usd: item.amountUSD || null, token: item.token?.symbol || null })) : [],
    transaction_request_exposed: false,
    observed_at: new Date().toISOString(),
  };
}

export async function evmHealth(config, network) {
  const definition = evmNetwork(network);
  if (!definition) throw new Error(`unsupported EVM network: ${network}`);
  const started = Date.now();
  const [chain, block, gas] = await Promise.all([
    read(config, network, "eth_chainId"),
    read(config, network, "eth_blockNumber"),
    read(config, network, "eth_gasPrice"),
  ]);
  return { network, label: definition.label, chain_id: chain.result, block_number: block.result, gas_price_wei: decodeUint(gas.result), latency_ms: Date.now() - started, provider: chain.providerClass, status: "rpc_healthy", observed_at: new Date().toISOString() };
}
