import { digest } from "./canonical.mjs";
import { decodePaymentSignatureHeader, encodePaymentRequiredHeader } from "@x402/core/http";

const PRIVATEPAY_SERVICE_ID = "privatepay.x402";
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

const SOLANA_MAINNET_CAIP2 = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";

function amountBaseUnits(input) {
  const value = String(input.amount_base_units || input.amountBaseUnits || "").trim();
  if (!/^\d+$/.test(value) || BigInt(value) <= 0n || BigInt(value) > 1000000000000n)
    throw Object.assign(new Error("a bounded positive amount_base_units value is required"), { statusCode: 400 });
  return value;
}

function privatePayProviderUrl(config, path) {
  return `${String(config.privatePayProviderUrl || "").replace(/\/$/, "")}${path}`;
}

function clientRefId(requestId) {
  const value = BigInt(`0x${digest(requestId).slice(0, 15)}`) % 1000000000000000n;
  return String(value || 1n);
}

export async function preparePrivatePayTransfer(config, input = {}, fetchImpl = fetch) {
  if (config.privatePayEnabled !== true)
    throw Object.assign(new Error("PrivatePAY is disabled until the privacy rail is explicitly enabled"), { statusCode: 503, code: "PRIVATEPAY_NOT_READY" });
  const payer = String(input.payer || "").trim();
  const recipient = String(config.privatePayProviderWallet || "").trim();
  const mint = String(config.privatePayConfidentialMint || "").trim();
  const requestId = String(input.request_id || "").trim();
  if (!SOLANA_ADDRESS.test(payer))
    throw Object.assign(new Error("payer must be a valid Solana address"), { statusCode: 400, code: "PRIVATEPAY_INVALID_PAYER" });
  if (!SOLANA_ADDRESS.test(recipient))
    throw Object.assign(new Error("PrivatePAY provider wallet is not configured"), { statusCode: 503, code: "PRIVATEPAY_PROVIDER_WALLET_NOT_CONFIGURED" });
  if (!SOLANA_ADDRESS.test(mint))
    throw Object.assign(new Error("PrivatePAY confidential mint is not configured"), { statusCode: 503, code: "PRIVATEPAY_MINT_NOT_CONFIGURED" });
  if (!/^pp_[a-f0-9]{32}$/.test(requestId))
    throw Object.assign(new Error("request_id from a valid PrivatePAY challenge is required"), { statusCode: 400, code: "PRIVATEPAY_INVALID_REQUEST" });
  const amount = amountBaseUnits(input);
  const body = {
    from: payer,
    to: recipient,
    mint,
    amount: Number(amount),
    visibility: "private",
    fromBalance: "base",
    toBalance: "base",
    cluster: config.privatePayCluster || "mainnet",
    initIfMissing: false,
    initAtasIfMissing: false,
    initVaultIfMissing: false,
    clientRefId: clientRefId(requestId),
    split: Math.min(15, Math.max(1, Number(input.split || 1))),
    gasless: input.gasless === true,
  };
  const response = await fetchImpl(privatePayProviderUrl(config, "/v1/spl/transfer"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw Object.assign(new Error(`PrivatePAY provider rejected transfer preparation (${response.status})`), { statusCode: 503, code: "PRIVATEPAY_PROVIDER_REJECTED", provider_status: response.status });
  if (payload.kind !== "transfer" || typeof payload.transactionBase64 !== "string" || !Array.isArray(payload.requiredSigners))
    throw Object.assign(new Error("PrivatePAY provider returned an invalid transfer transaction"), { statusCode: 503, code: "PRIVATEPAY_INVALID_PROVIDER_RESPONSE" });
  return {
    request_id: requestId,
    transaction_base64: payload.transactionBase64,
    version: payload.version,
    send_to: payload.sendTo,
    from_balance: body.fromBalance,
    to_balance: body.toBalance,
    required_signers: payload.requiredSigners,
    validator: payload.validator || null,
    recent_blockhash: payload.recentBlockhash || null,
    last_valid_block_height: payload.lastValidBlockHeight || null,
    provider_fees: payload.fees || null,
    privacy_boundary: "The base-chain deposit and fee payer remain observable; the private rollup transfer is not a public payer-to-provider transfer. Do not claim full unlinkability until a funded deposit, private transfer, and withdrawal have been independently analyzed.",
  };
}

export function createPrivatePayRequirements(config, input = {}) {
  const status = privatePayStatus(config);
  if (!status.enabled) {
    throw Object.assign(new Error("PrivatePAY is fail-closed until a reviewed privacy rail and x402 facilitator are configured"), {
      statusCode: 503,
      code: "PRIVATEPAY_NOT_READY",
      status,
    });
  }
  const resource = String(input.resource || "").trim();
  const providerId = String(input.provider_id || "").trim();
  if (!resource || !providerId) throw Object.assign(new Error("resource and provider_id are required"), { statusCode: 400 });
  const amount = amountBaseUnits(input);
  const requestId = `pp_${digest({ resource, providerId, amount, nonce: input.nonce || null }).slice(0, 32)}`;
  const requirements = {
    x402Version: 2,
    accepts: [{
      scheme: "privatepay",
      network: SOLANA_MAINNET_CAIP2,
      asset: config.privatePayConfidentialMint,
      amount,
      payTo: `privatepay:${digest(providerId).slice(0, 32)}`,
      maxTimeoutSeconds: 300,
      extra: { privacy_rail: config.privatePayPrivacyRail, provider_commitment: digest(providerId), request_id: requestId },
    }],
    resource: { url: resource, description: "PrivatePAY x402 resource", mimeType: String(input.mime_type || "application/json") },
    extensions: { privatepay: { request_id: requestId, provider_visibility: "authenticated_provider_only" } },
  };
  return { request_id: requestId, requirements, header: encodePaymentRequiredHeader(requirements) };
}

export function decodePrivatePaySignature(header) {
  try {
    return decodePaymentSignatureHeader(String(header || ""));
  } catch {
    throw Object.assign(new Error("valid PAYMENT-SIGNATURE header is required"), { statusCode: 400, code: "PRIVATEPAY_INVALID_PAYMENT_HEADER" });
  }
}

function assertFacilitatorPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    throw Object.assign(new Error("x402 facilitator payload must be an object"), { statusCode: 400, code: "PRIVATEPAY_INVALID_FACILITATOR_PAYLOAD" });
  if (payload.x402Version !== 2 || !payload.paymentPayload || !payload.paymentRequirements)
    throw Object.assign(new Error("x402 v2 paymentPayload and paymentRequirements are required"), { statusCode: 400, code: "PRIVATEPAY_INVALID_FACILITATOR_PAYLOAD" });
}

export async function privatePayFacilitatorRequest(config, operation, payload, fetchImpl = fetch) {
  if (!new Set(["verify", "settle"]).has(operation))
    throw Object.assign(new Error("unsupported PrivatePAY facilitator operation"), { statusCode: 400, code: "PRIVATEPAY_INVALID_FACILITATOR_OPERATION" });
  assertFacilitatorPayload(payload);
  const status = privatePayStatus(config);
  if (!status.enabled)
    throw Object.assign(new Error("PrivatePAY facilitator is disabled until x402 conformance is verified"), { statusCode: 503, code: "PRIVATEPAY_NOT_READY", status });
  const base = String(config.privatePayFacilitatorUrl || "").replace(/\/$/, "");
  const response = await fetchImpl(`${base}/${operation}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok)
    throw Object.assign(new Error(`PrivatePAY facilitator rejected ${operation} (${response.status})`), { statusCode: 503, code: "PRIVATEPAY_FACILITATOR_REJECTED", facilitator_status: response.status });
  if (!result || typeof result !== "object" || Array.isArray(result))
    throw Object.assign(new Error(`PrivatePAY facilitator returned an invalid ${operation} response`), { statusCode: 503, code: "PRIVATEPAY_INVALID_FACILITATOR_RESPONSE" });
  return { operation, ...result };
}

export function privatePayStatus(config) {
  const privacyRail = String(config.privatePayPrivacyRail || "").trim();
  const facilitatorUrl = String(config.privatePayFacilitatorUrl || "").trim();
  const confidentialMint = String(config.privatePayConfidentialMint || "").trim();
  const conformanceVerified = config.privatePayConformanceVerified === true;
  const configured = nonEmpty(privacyRail) && nonEmpty(facilitatorUrl) && nonEmpty(confidentialMint);
  return {
    service_id: PRIVATEPAY_SERVICE_ID,
    protocol: "x402-v2",
    status: configured ? "configured_pending_live_conformance" : "not_ready",
    conformance_verified: conformanceVerified,
    enabled: configured && conformanceVerified && config.privatePayEnabled === true,
    privacy_rail: privacyRail || null,
    facilitator_configured: nonEmpty(facilitatorUrl),
    confidential_mint_configured: nonEmpty(confidentialMint),
    public_chain_boundary: "ordinary SPL USDC transfers remain publicly linkable; they are never used as the private rail",
    provider_visibility: "provider_only_after_authenticated_access",
    buyer_visibility: "public response contains only a request commitment and settlement status",
    required_before_activation: [
      "MagicBlock Private Ephemeral Rollup or another reviewed shielded/pooled rail with provider audit access",
      "real x402 v2 facilitator verify/settle conformance test",
      "funded testnet end-to-end proof",
      "provider audit access and abuse/AML policy",
    ],
  };
}

export function createPrivatePayChallenge(config, input = {}) {
  const { request_id: requestId, requirements, header } = createPrivatePayRequirements(config, input);
  return {
    x402Version: 2,
    request_id: requestId,
    payment_required: true,
    scheme: "privatepay",
    privacy_mode: "confidential_transfer",
    payment_required: requirements,
    payment_required_header: header,
    resource_commitment: requirements.extensions.privatepay.request_id,
    provider_commitment: requirements.accepts[0].extra.provider_commitment,
    amount_base_units: requirements.accepts[0].amount,
    expires_at: new Date(Date.now() + 300000).toISOString(),
    public_disclosure: "The public chain must not expose payer, recipient, or transfer amount; the paying agent and provider may see the agreed amount.",
    provider_disclosure: "The provider may view the settled request through authenticated access.",
  };
}

export async function probePrivatePayRail(config, fetchImpl = fetch) {
  const status = privatePayStatus(config);
  if (!status.facilitator_configured || !status.confidential_mint_configured) {
    return { ...status, provider_health: "not_checked", mint_status: "not_checked", facilitator_status: "not_checked", operational: false };
  }
  const base = String(config.privatePayProviderUrl || "").replace(/\/$/, "");
  const facilitator = String(config.privatePayFacilitatorUrl || "").replace(/\/$/, "");
  const mint = encodeURIComponent(config.privatePayConfidentialMint);
  const cluster = encodeURIComponent(config.privatePayCluster || "mainnet-beta");
  const result = { ...status, provider_health: "unavailable", mint_status: "unavailable", facilitator_status: "unavailable", operational: false };
  try {
    const health = await fetchImpl(`${base}/health`, { signal: AbortSignal.timeout(5000) });
    result.provider_health = health.ok ? "ok" : `http_${health.status}`;
  } catch {
    result.provider_health = "unavailable";
  }
  try {
    const mintCheck = await fetchImpl(`${base}/v1/spl/is-mint-initialized?mint=${mint}&cluster=${cluster}`, { signal: AbortSignal.timeout(5000) });
    if (!mintCheck.ok) result.mint_status = `http_${mintCheck.status}`;
    else {
      const body = await mintCheck.json();
      result.mint_status = body?.initialized === true ? "initialized" : "not_initialized";
    }
  } catch {
    result.mint_status = "unavailable";
  }
  try {
    const supported = await fetchImpl(`${facilitator}/supported`, { signal: AbortSignal.timeout(5000) });
    if (!supported.ok) result.facilitator_status = `http_${supported.status}`;
    else {
      const body = await supported.json();
      const supportedKind = Array.isArray(body?.kinds) && body.kinds.some((kind) =>
        kind?.x402Version === 2 && kind?.scheme === "privatepay" && kind?.network === SOLANA_MAINNET_CAIP2);
      result.facilitator_status = supportedKind ? "privatepay_v2_mainnet" : "privatepay_not_supported";
    }
  } catch {
    result.facilitator_status = "unavailable";
  }
  result.operational = result.provider_health === "ok"
    && result.mint_status === "initialized"
    && result.facilitator_status === "privatepay_v2_mainnet"
    && status.enabled;
  if (!result.operational) result.status = "not_ready";
  return result;
}

export { PRIVATEPAY_SERVICE_ID };
