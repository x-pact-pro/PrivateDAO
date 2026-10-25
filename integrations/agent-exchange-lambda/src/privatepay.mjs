import { digest } from "./canonical.mjs";
import { decodePaymentSignatureHeader, encodePaymentRequiredHeader } from "@x402/core/http";
import { parsePaymentPayload, parsePaymentRequirements } from "@x402/core/schemas";
import { VersionedTransaction } from "@solana/web3.js";
import { assertPrivatePayNetworkAdapter, privatePayNetworkMatrix } from "./privatepay-networks.mjs";
import { DEFAULT_PRIVATEPAY_TEE_RPC, findPrivatePaySettlement, getPrivatePaySignatureStatus, isSolanaTransactionSignature, verifyPrivatePayPaymentBoundQuote } from "./privatepay-mainnet.mjs";
import { privatePayAutopilotStatus } from "./privatepay-autopilot.mjs";

const PRIVATEPAY_SERVICE_ID = "privatepay.x402";
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const MAGICBLOCK_PRIVACY_RAIL = "magicblock-private-ephemeral-rollup";
const MAGICBLOCK_SCHEME = "exact-magicblock";
const MAGICBLOCK_PRIVATE_CLUSTER = "mainnet-private";
const PRIVATEPAY_ID = /^[a-f0-9]{64}$/;
const MAX_PAYMENT_SIGNATURE_HEADER_BYTES = 32768;

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

const SOLANA_MAINNET_CAIP2 = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";

// MagicBlock's REST API names Solana mainnet "mainnet", while x402 and the
// rest of Agent Exchange use the canonical "mainnet-beta" network id.
function providerCluster(config) {
  const cluster = String(config.privatePayCluster || "").trim();
  return cluster === "mainnet-beta" || !cluster ? "mainnet" : cluster;
}

function privateTransferCluster(config) {
  const cluster = String(config.privatePayCluster || "").trim();
  // Only the transfer leg runs inside the PER. Deposits and withdrawals must
  // remain on the Solana base layer so the provider can build the correct
  // entry/exit transactions.
  if (isMagicBlockRail(config) && (!cluster || cluster === "mainnet" || cluster === "mainnet-beta")) return MAGICBLOCK_PRIVATE_CLUSTER;
  return providerCluster(config);
}

function isMagicBlockRail(config) {
  return String(config.privatePayPrivacyRail || "").trim() === MAGICBLOCK_PRIVACY_RAIL;
}

function validStealthHandle(value) {
  const handle = String(value || "");
  if (!handle || Buffer.byteLength(handle, "utf8") > 255) return false;
  return !/[\u0000-\u001f\u007f]/u.test(handle);
}

function privatePayScheme(config) {
  return isMagicBlockRail(config) ? MAGICBLOCK_SCHEME : "privatepay";
}

function amountBaseUnits(input) {
  const value = String(input.amount_base_units || input.amountBaseUnits || "").trim();
  if (!/^\d+$/.test(value) || BigInt(value) <= 0n || BigInt(value) > 1000000000000n)
    throw Object.assign(new Error("a bounded positive amount_base_units value is required"), { statusCode: 400 });
  return value;
}

function privatePayProviderUrl(config, path) {
  return `${String(config.privatePayProviderUrl || "").replace(/\/$/, "")}${path}`;
}

function confidentialMintProblem(config, mint) {
  if (!SOLANA_ADDRESS.test(mint)) return "confidential payment asset is not a valid Solana mint address";
  if (isMagicBlockRail(config)) {
    if (String(config.usdcMint || "") !== mint) return "MagicBlock private x402 requires the configured USDC mint";
    return null;
  }
  if (String(config.usdcMint || "") === mint) return "ordinary public USDC cannot be used as the confidential payment asset";
  if (String(config.privatePayConfidentialMintProgram || "") !== TOKEN_2022_PROGRAM_ID)
    return "confidential payment asset must be verified as a Token-2022 mint with the Confidential Balances extension";
  return null;
}

function clientRefId(requestId) {
  const value = BigInt(`0x${digest(requestId).slice(0, 15)}`) % 1000000000000000n;
  return String(value || 1n);
}

function decodePrivatePayLeg(label, prepared) {
  const encoded = String(prepared?.transaction_base64 || "");
  if (!encoded) return { label, status: "not_audited", reason: "transaction bytes are missing" };
  let transaction;
  try {
    transaction = VersionedTransaction.deserialize(Buffer.from(encoded, "base64"));
  } catch {
    return { label, status: "not_audited", reason: "transaction bytes could not be decoded as a Solana versioned transaction" };
  }
  const staticAccounts = transaction.message.staticAccountKeys.map((key) => key.toBase58());
  const observedTimes = [prepared?.submitted_at, prepared?.confirmed_at, prepared?.block_time, prepared?.blockTime]
    .map((value) => Date.parse(String(value || ""))).filter(Number.isFinite);
  const amountFields = ["amount", "amount_base_units", "amountBaseUnits", "amountAtomic", "public_amount_base_units"]
    .filter((key) => Object.hasOwn(prepared || {}, key));
  return {
    label,
    status: "audited_boundary_only",
    fee_payer: staticAccounts[0] || null,
    static_accounts: staticAccounts,
    static_account_count: staticAccounts.length,
    instruction_count: transaction.message.compiledInstructions.length,
    recent_blockhash_visible: true,
    expiry_visible: prepared?.last_valid_block_height !== undefined && prepared?.last_valid_block_height !== null,
    network_fee_visibility: prepared?.provider_fees?.lamports ? "quoted_fee_visible" : "not_observed",
    observed_times: observedTimes,
    amount_fields_visible: amountFields,
  };
}

export function auditPreparedPrivatePayTransfer(prepared, { payer = "", provider = "" } = {}) {
  const leg = decodePrivatePayLeg("transfer", prepared);
  if (leg.status !== "audited_boundary_only") return { ...leg, release_ready: false };
  const { static_accounts: staticAccounts, ...publicLeg } = leg;
  const feePayer = publicLeg.fee_payer;
  const payerIsFeePayer = Boolean(payer && feePayer === payer);
  const audit = {
    status: "audited_boundary_only",
    release_ready: false,
    ...publicLeg,
    fee_payer: feePayer,
    fee_payer_role: payerIsFeePayer ? "payer" : "sponsor_or_other_account",
    payer_account_visible: Boolean(payer && staticAccounts.includes(payer)),
    provider_account_visible: Boolean(provider && staticAccounts.includes(provider)),
    relationship_protected: false,
    amount_protected: false,
    amount_visibility: "unproven_custom_program_data",
    timing_visibility: "recent_blockhash_and_expiry_are_visible",
    network_fee_visibility: prepared.provider_fees?.lamports ? "quoted_fee_visible" : "not_observed",
    reasons: [
      payerIsFeePayer
        ? "The payer is the base transaction fee payer and is therefore publicly observable."
        : "A sponsor or other fee payer is publicly observable; any relay-fee transfer and sponsor reuse still require correlation analysis.",
      "Custom private-program instruction data was not independently decoded into a zero-knowledge privacy proof.",
      "A prepared transaction cannot prove withdrawal unlinkability or timing resistance.",
    ],
  };
  return audit;
}

function auditPrivatePayLeg(label, prepared) {
  return decodePrivatePayLeg(label, prepared);
}

export function auditPrivatePayTrace(trace = {}) {
  const legs = ["deposit", "transfer", "withdrawal"].map((label) => auditPrivatePayLeg(label, trace[label]));
  const complete = legs.every((leg) => leg.status === "audited_boundary_only");
  const decodedLegs = legs.filter((leg) => leg.status === "audited_boundary_only");
  const feePayers = decodedLegs.map((leg) => leg.fee_payer).filter(Boolean);
  const uniqueFeePayers = new Set(feePayers);
  const sharedAccountCounts = {};
  for (let i = 0; i < decodedLegs.length; i += 1) {
    for (let j = i + 1; j < decodedLegs.length; j += 1) {
      const shared = decodedLegs[i].static_accounts.filter((account) => decodedLegs[j].static_accounts.includes(account));
      sharedAccountCounts[`${decodedLegs[i].label}:${decodedLegs[j].label}`] = new Set(shared).size;
    }
  }
  const observedTimes = decodedLegs.flatMap((leg) => leg.observed_times || []).sort((a, b) => a - b);
  const timingSpanMs = observedTimes.length > 1 ? observedTimes.at(-1) - observedTimes[0] : null;
  const timingCorrelation = timingSpanMs !== null && timingSpanMs <= 300000;
  const amountFieldsVisible = decodedLegs.flatMap((leg) => leg.amount_fields_visible || []);
  const linkabilitySignals = [];
  if (uniqueFeePayers.size < feePayers.length) linkabilitySignals.push("fee_payer_reused_across_legs");
  if (Object.values(sharedAccountCounts).some((count) => count > 0)) linkabilitySignals.push("static_accounts_shared_across_legs");
  if (timingCorrelation) linkabilitySignals.push("legs_observed_within_five_minutes");
  if (amountFieldsVisible.length) linkabilitySignals.push("amount_metadata_visible_in_trace");
  return {
    status: complete ? "audited_boundary_only" : "not_audited",
    release_ready: false,
    relationship_protected: false,
    amount_protected: false,
    timing_protected: false,
    network_fee_correlation: "unproven",
    fee_payer_reused: uniqueFeePayers.size < feePayers.length,
    shared_account_counts: sharedAccountCounts,
    timing_span_ms: timingSpanMs,
    timing_correlation_detected: timingCorrelation,
    amount_fields_visible: amountFieldsVisible,
    linkability_signals: linkabilitySignals,
    legs,
    reasons: [
      "Deposits and withdrawals must be analyzed separately because public entry and exit can link a user to a private balance.",
      "A visible fee payer, blockhash, expiry, or close timing can create a correlation signal even when transfer amounts are encrypted.",
      "No trace is release-ready until an independent funded E2E run proves payer/provider unlinkability, amount confidentiality, and bounded timing correlation.",
    ],
  };
}

export async function preparePrivatePayTransfer(config, input = {}, fetchImpl = fetch) {
  assertPrivatePayNetworkAdapter(config);
  if (config.privatePayEnabled !== true)
    throw Object.assign(new Error("PrivatePAY is disabled until the privacy rail is explicitly enabled"), { statusCode: 503, code: "PRIVATEPAY_NOT_READY" });
  const payer = String(input.payer || "").trim();
  const magicBlockRail = isMagicBlockRail(config);
  const providerWallet = String(config.privatePayProviderWallet || "").trim();
  const providerHandle = String(config.privatePayProviderHandle || "").trim();
  const recipient = magicBlockRail ? providerHandle : providerWallet;
  const mint = String(config.privatePayConfidentialMint || "").trim();
  const requestId = String(input.request_id || "").trim();
  if (!SOLANA_ADDRESS.test(payer))
    throw Object.assign(new Error("payer must be a valid Solana address"), { statusCode: 400, code: "PRIVATEPAY_INVALID_PAYER" });
  if (magicBlockRail) {
    if (!validStealthHandle(providerHandle))
      throw Object.assign(new Error("MagicBlock PrivatePAY provider stealth handle is not configured"), { statusCode: 503, code: "PRIVATEPAY_PROVIDER_HANDLE_NOT_CONFIGURED" });
    if (config.privatePayProviderHandleVerified !== true)
      throw Object.assign(new Error("MagicBlock PrivatePAY provider stealth handle has not been verified as initialized"), { statusCode: 503, code: "PRIVATEPAY_PROVIDER_HANDLE_UNVERIFIED" });
  } else if (!SOLANA_ADDRESS.test(recipient)) {
    throw Object.assign(new Error("PrivatePAY provider wallet is not configured"), { statusCode: 503, code: "PRIVATEPAY_PROVIDER_WALLET_NOT_CONFIGURED" });
  }
  if (!SOLANA_ADDRESS.test(mint))
    throw Object.assign(new Error("PrivatePAY confidential mint is not configured"), { statusCode: 503, code: "PRIVATEPAY_MINT_NOT_CONFIGURED" });
  if (!isMagicBlockRail(config) && String(config.usdcMint || "") === mint)
    throw Object.assign(new Error("PrivatePAY cannot use ordinary public USDC as its confidential mint"), { statusCode: 503, code: "PRIVATEPAY_PUBLIC_MINT" });
  if (!isMagicBlockRail(config) && String(config.privatePayConfidentialMintProgram || "") !== TOKEN_2022_PROGRAM_ID)
    throw Object.assign(new Error("PrivatePAY requires a verified Token-2022 Confidential Balances mint"), { statusCode: 503, code: "PRIVATEPAY_MINT_PROGRAM_NOT_VERIFIED" });
  if (!/^pp_[a-f0-9]{32}$/.test(requestId))
    throw Object.assign(new Error("request_id from a valid PrivatePAY challenge is required"), { statusCode: 400, code: "PRIVATEPAY_INVALID_REQUEST" });
  if (config.privatePayRequireGasless !== false && input.gasless !== true)
    throw Object.assign(new Error("PrivatePAY requires a verified gasless sponsor so the payer is not the public fee payer"), { statusCode: 503, code: "PRIVATEPAY_GASLESS_REQUIRED" });
  const amount = amountBaseUnits(input);
  const minDelayMs = Math.max(0, Math.floor(Number(config.privatePayMinDelayMs || 0)));
  const maxDelayMs = Math.max(minDelayMs, Math.floor(Number(config.privatePayMaxDelayMs || 0)));
  const body = {
    from: payer,
    to: recipient,
    mint,
    amount: Number(amount),
    visibility: "private",
    fromBalance: "base",
    toBalance: "base",
    cluster: privateTransferCluster(config),
    initIfMissing: false,
    initAtasIfMissing: false,
    initVaultIfMissing: false,
    clientRefId: clientRefId(requestId),
    split: Math.min(15, Math.max(1, Number(input.split || 1))),
    minDelayMs: String(minDelayMs),
    maxDelayMs: String(maxDelayMs),
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
  const prepared = {
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
  return { ...prepared, privacy_audit: auditPreparedPrivatePayTransfer(prepared, { payer, provider: magicBlockRail ? "" : recipient }) };
}

function assertPrivatePayBuilderInput(config, input = {}) {
  if (config.privatePayEnabled !== true)
    throw Object.assign(new Error("PrivatePAY is disabled until the privacy rail is explicitly enabled"), { statusCode: 503, code: "PRIVATEPAY_NOT_READY" });
  const owner = String(input.owner || input.payer || "").trim();
  if (!SOLANA_ADDRESS.test(owner))
    throw Object.assign(new Error("owner must be a valid Solana address"), { statusCode: 400, code: "PRIVATEPAY_INVALID_OWNER" });
  const mint = String(config.privatePayConfidentialMint || "").trim();
  if (!SOLANA_ADDRESS.test(mint))
    throw Object.assign(new Error("PrivatePAY confidential mint is not configured"), { statusCode: 503, code: "PRIVATEPAY_MINT_NOT_CONFIGURED" });
  if (!isMagicBlockRail(config) && String(config.usdcMint || "") === mint)
    throw Object.assign(new Error("PrivatePAY cannot use ordinary public USDC as its confidential mint"), { statusCode: 503, code: "PRIVATEPAY_PUBLIC_MINT" });
  if (!isMagicBlockRail(config) && String(config.privatePayConfidentialMintProgram || "") !== TOKEN_2022_PROGRAM_ID)
    throw Object.assign(new Error("PrivatePAY requires a verified Token-2022 Confidential Balances mint"), { statusCode: 503, code: "PRIVATEPAY_MINT_PROGRAM_NOT_VERIFIED" });
  const requestId = String(input.request_id || "").trim();
  if (!/^pp_[a-f0-9]{32}$/.test(requestId))
    throw Object.assign(new Error("request_id from a valid PrivatePAY challenge is required"), { statusCode: 400, code: "PRIVATEPAY_INVALID_REQUEST" });
  return { owner, mint, requestId, amount: amountBaseUnits(input) };
}

async function preparePrivatePayBaseTransaction(config, kind, path, body, requestId, fetchImpl) {
  const response = await fetchImpl(privatePayProviderUrl(config, path), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw Object.assign(new Error(`PrivatePAY provider rejected ${kind} preparation (${response.status})`), { statusCode: 503, code: "PRIVATEPAY_PROVIDER_REJECTED", provider_status: response.status });
  if (payload.kind !== kind || typeof payload.transactionBase64 !== "string" || !Array.isArray(payload.requiredSigners))
    throw Object.assign(new Error(`PrivatePAY provider returned an invalid ${kind} transaction`), { statusCode: 503, code: "PRIVATEPAY_INVALID_PROVIDER_RESPONSE" });
  return {
    request_id: requestId,
    phase: kind,
    transaction_base64: payload.transactionBase64,
    version: payload.version,
    send_to: payload.sendTo,
    required_signers: payload.requiredSigners,
    validator: payload.validator || null,
    recent_blockhash: payload.recentBlockhash || null,
    last_valid_block_height: payload.lastValidBlockHeight || null,
    provider_fees: payload.fees || null,
    privacy_boundary: "The base-chain entry/exit and fee payer remain observable; this unsigned leg is not evidence of unlinkability until a funded E2E trace is independently analyzed.",
  };
}

export async function preparePrivatePayDeposit(config, input = {}, fetchImpl = fetch) {
  const { owner, mint, requestId, amount } = assertPrivatePayBuilderInput(config, input);
  const body = {
    owner,
    mint,
    amount: Number(amount),
    cluster: isMagicBlockRail(config) ? MAGICBLOCK_PRIVATE_CLUSTER : providerCluster(config),
    initIfMissing: false,
    initVaultIfMissing: false,
    initAtasIfMissing: false,
    idempotent: true,
  };
  return preparePrivatePayBaseTransaction(config, "deposit", "/v1/spl/deposit", body, requestId, fetchImpl);
}

export async function preparePrivatePayWithdrawal(config, input = {}, fetchImpl = fetch) {
  const { owner, mint, requestId, amount } = assertPrivatePayBuilderInput(config, input);
  const body = {
    owner,
    mint,
    amount: Number(amount),
    cluster: isMagicBlockRail(config) ? MAGICBLOCK_PRIVATE_CLUSTER : providerCluster(config),
    initIfMissing: false,
    initAtasIfMissing: false,
    idempotent: true,
  };
  return preparePrivatePayBaseTransaction(config, "withdraw", "/v1/spl/withdraw", body, requestId, fetchImpl);
}

export function createPrivatePayRequirements(config, input = {}) {
  assertPrivatePayNetworkAdapter(config);
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
  const magicBlockRail = isMagicBlockRail(config);
  const requestId = `pp_${digest({ resource, providerId, amount, nonce: input.nonce || null }).slice(0, 32)}`;
  const requirements = {
    x402Version: 2,
    accepts: [{
      scheme: privatePayScheme(config),
      network: SOLANA_MAINNET_CAIP2,
      asset: config.privatePayConfidentialMint,
      amount,
      payTo: magicBlockRail ? config.privatePayPaymentIngress : `privatepay:${digest(providerId).slice(0, 32)}`,
      maxTimeoutSeconds: 300,
      extra: {
        privacy_rail: config.privatePayPrivacyRail,
        provider_commitment: digest(providerId),
        request_id: requestId,
        paymentId: digest({ requestId, resource, providerId, amount }),
        ...(magicBlockRail ? { cluster: MAGICBLOCK_PRIVATE_CLUSTER, settlement: "ephemeral-rollup", paymentFlow: "upfront" } : {}),
      },
    }],
    resource: { url: resource, description: "PrivatePAY x402 resource", mimeType: String(input.mime_type || "application/json") },
    extensions: { privatepay: { request_id: requestId, provider_visibility: "authenticated_provider_only" } },
  };
  return { request_id: requestId, requirements, header: encodePaymentRequiredHeader(requirements) };
}

function assertMerchantCheckoutReady(config) {
  if (!isMagicBlockRail(config))
    throw Object.assign(new Error("merchant checkout is currently implemented only for the reviewed MagicBlock rail"), { statusCode: 503, code: "PRIVATEPAY_CHECKOUT_RAIL_UNSUPPORTED" });
  if (config.privatePayMerchantCheckoutEnabled !== true)
    throw Object.assign(new Error("PrivatePAY merchant checkout is disabled until explicit activation"), { statusCode: 503, code: "PRIVATEPAY_CHECKOUT_DISABLED" });
  const status = privatePayStatus(config);
  if (!status.enabled)
    throw Object.assign(new Error("PrivatePAY merchant checkout is fail-closed until the privacy and x402 gates pass"), { statusCode: 503, code: "PRIVATEPAY_NOT_READY", status });
  if (!nonEmpty(config.privatePayFacilitatorApiKey))
    throw Object.assign(new Error("MagicBlock merchant API credential is not configured"), { statusCode: 503, code: "PRIVATEPAY_MERCHANT_CREDENTIAL_MISSING" });
}

function merchantHeaders(config) {
  const headers = {
    "content-type": "application/json",
    authorization: `Bearer ${config.privatePayFacilitatorApiKey}`,
  };
  if (nonEmpty(config.privatePayMerchantId)) headers["X-Merchant-Id"] = config.privatePayMerchantId;
  return headers;
}

function readResponseHeader(response, name) {
  if (response?.headers && typeof response.headers.get === "function") return response.headers.get(name) || response.headers.get(name.toLowerCase()) || "";
  const headers = response?.headers || {};
  return headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()] || "";
}

function checkoutResponseBody(payload) {
  const id = String(payload?.id || "").trim();
  if (!PRIVATEPAY_ID.test(id))
    throw Object.assign(new Error("MagicBlock returned an invalid checkout id"), { statusCode: 503, code: "PRIVATEPAY_INVALID_CHECKOUT_RESPONSE" });
  return {
    payment_id: id,
    status: nonEmpty(payload.status) ? payload.status : "created",
    expires_at: payload.expiresAt || payload.expires_at || null,
    external_reference: payload.externalReference || payload.external_reference || null,
    cluster: payload.cluster || MAGICBLOCK_PRIVATE_CLUSTER,
    resource: payload.resource || null,
  };
}

export async function createPrivatePayCheckout(config, input = {}, fetchImpl = fetch) {
  assertMerchantCheckoutReady(config);
  const payer = String(input.payer || "").trim();
  if (!SOLANA_ADDRESS.test(payer))
    throw Object.assign(new Error("payer must be a valid Solana address"), { statusCode: 400, code: "PRIVATEPAY_INVALID_PAYER" });
  const resource = String(input.resource || "").trim();
  if (!resource || resource.length > 2048)
    throw Object.assign(new Error("resource must be a non-empty URI of at most 2048 characters"), { statusCode: 400, code: "PRIVATEPAY_INVALID_RESOURCE" });
  const externalReference = String(input.external_reference || input.externalReference || "").trim();
  if (!externalReference || externalReference.length > 128)
    throw Object.assign(new Error("external_reference must be 1-128 characters"), { statusCode: 400, code: "PRIVATEPAY_INVALID_EXTERNAL_REFERENCE" });
  const description = String(input.description || "PrivatePAY x402 service payment").trim();
  if (description.length > 256)
    throw Object.assign(new Error("description must be at most 256 characters"), { statusCode: 400, code: "PRIVATEPAY_INVALID_DESCRIPTION" });
  const expiresInSeconds = Math.min(86400, Math.max(60, Math.floor(Number(input.expires_in_seconds || input.expiresInSeconds || 3600))));
  if (!Number.isFinite(expiresInSeconds))
    throw Object.assign(new Error("expires_in_seconds must be a finite number"), { statusCode: 400, code: "PRIVATEPAY_INVALID_EXPIRY" });
  const amount = amountBaseUnits(input);
  const body = {
    amount,
    cluster: MAGICBLOCK_PRIVATE_CLUSTER,
    description,
    resource,
    requestHash: digest({ amount, payer, resource, externalReference }),
    expiresInSeconds,
    payer,
    externalReference,
  };
  const response = await fetchImpl(privatePayProviderUrl(config, "/v1/payments"), {
    method: "POST",
    headers: merchantHeaders(config),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw Object.assign(new Error(`MagicBlock rejected checkout creation (${response.status})`), { statusCode: 503, code: "PRIVATEPAY_CHECKOUT_REJECTED", provider_status: response.status });
  return checkoutResponseBody(payload);
}

export async function requestPrivatePayCheckoutChallenge(config, input = {}, fetchImpl = fetch) {
  assertMerchantCheckoutReady(config);
  const paymentId = String(input.payment_id || input.paymentId || "").trim();
  if (!PRIVATEPAY_ID.test(paymentId))
    throw Object.assign(new Error("payment_id must be the 64-hex MagicBlock checkout id"), { statusCode: 400, code: "PRIVATEPAY_INVALID_CHECKOUT_ID" });
  const response = await fetchImpl(privatePayProviderUrl(config, `/v1/x402/payments/${paymentId}/pay`), {
    method: "POST",
    headers: merchantHeaders(config),
    body: JSON.stringify({}),
    signal: AbortSignal.timeout(8000),
  });
  const paymentRequiredHeader = readResponseHeader(response, "PAYMENT-REQUIRED");
  if (response.status === 402) {
    if (!paymentRequiredHeader)
      throw Object.assign(new Error("MagicBlock returned 402 without PAYMENT-REQUIRED"), { statusCode: 503, code: "PRIVATEPAY_MISSING_PAYMENT_REQUIRED" });
    return { payment_id: paymentId, status: "payment_required", payment_required_header: paymentRequiredHeader };
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw Object.assign(new Error(`MagicBlock rejected checkout challenge (${response.status})`), { statusCode: 503, code: "PRIVATEPAY_CHALLENGE_REJECTED", provider_status: response.status });
  return { payment_id: paymentId, status: nonEmpty(payload.status) ? payload.status : "accepted" };
}

export function decodePrivatePaySignature(header) {
  const encoded = String(header || "");
  if (Buffer.byteLength(encoded, "utf8") > MAX_PAYMENT_SIGNATURE_HEADER_BYTES)
    throw Object.assign(new Error("PAYMENT-SIGNATURE header exceeds the bounded size limit"), { statusCode: 413, code: "PRIVATEPAY_PAYMENT_HEADER_TOO_LARGE" });
  try {
    return decodePaymentSignatureHeader(encoded);
  } catch {
    throw Object.assign(new Error("valid PAYMENT-SIGNATURE header is required"), { statusCode: 400, code: "PRIVATEPAY_INVALID_PAYMENT_HEADER" });
  }
}

function assertFacilitatorPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    throw Object.assign(new Error("x402 facilitator payload must be an object"), { statusCode: 400, code: "PRIVATEPAY_INVALID_FACILITATOR_PAYLOAD" });
  if (payload.x402Version !== 2 || !payload.paymentPayload || !payload.paymentRequirements)
    throw Object.assign(new Error("x402 v2 paymentPayload and paymentRequirements are required"), { statusCode: 400, code: "PRIVATEPAY_INVALID_FACILITATOR_PAYLOAD" });
  if (!parsePaymentPayload(payload.paymentPayload).success || !parsePaymentRequirements(payload.paymentRequirements).success)
    throw Object.assign(new Error("x402 v2 facilitator payload does not match the official payment schemas"), { statusCode: 400, code: "PRIVATEPAY_INVALID_FACILITATOR_PAYLOAD" });
}

export function assertPrivatePayPaymentPayload(payload) {
  assertFacilitatorPayload(payload);
  const payment = payload.paymentPayload;
  const requirements = payload.paymentRequirements;
  const accepted = payment.accepted || payment;
  const required = requirements;
  const requestId = required.extra?.request_id;
  if (!required || accepted.scheme !== required.scheme || !["privatepay", MAGICBLOCK_SCHEME].includes(required.scheme) || accepted.network !== SOLANA_MAINNET_CAIP2)
    throw Object.assign(new Error("PrivatePAY payment does not match the required scheme or Mainnet network"), { statusCode: 400, code: "PRIVATEPAY_PAYMENT_MISMATCH" });
  if (accepted.asset !== required.asset || accepted.amount !== required.amount || accepted.payTo !== required.payTo || accepted.extra?.request_id !== required.extra?.request_id)
    throw Object.assign(new Error("PrivatePAY payment does not match the quoted requirements"), { statusCode: 400, code: "PRIVATEPAY_PAYMENT_MISMATCH" });
  if (required.scheme === MAGICBLOCK_SCHEME && (accepted.extra?.cluster !== required.extra?.cluster || accepted.extra?.settlement !== required.extra?.settlement))
    throw Object.assign(new Error("MagicBlock payment does not match the quoted private settlement rail"), { statusCode: 400, code: "PRIVATEPAY_PAYMENT_MISMATCH" });
  const privatePayload = payment.payload;
  if (required.scheme === MAGICBLOCK_SCHEME) {
    if (!privatePayload || typeof privatePayload !== "object" || Array.isArray(privatePayload)
      || !PRIVATEPAY_ID.test(String(privatePayload.paymentId || ""))
      || privatePayload.paymentId !== accepted.extra?.paymentId
      || typeof privatePayload.transaction !== "string"
      || privatePayload.transaction.length > 1644
      || !/^[A-Za-z0-9+/]+={0,2}$/.test(privatePayload.transaction))
      throw Object.assign(new Error("MagicBlock x402 payment payload is required"), { statusCode: 400, code: "PRIVATEPAY_INVALID_PAYMENT_PROOF" });
    return true;
  }
  if (!privatePayload || typeof privatePayload !== "object" || Array.isArray(privatePayload) || typeof privatePayload.signature !== "string" || !privatePayload.signature.trim())
    throw Object.assign(new Error("PrivatePAY payment proof is required"), { statusCode: 400, code: "PRIVATEPAY_INVALID_PAYMENT_PROOF" });
  if (privatePayload.request_id !== requestId || privatePayload.provider_commitment !== required.extra?.provider_commitment)
    throw Object.assign(new Error("PrivatePAY payment proof is not bound to this request or provider"), { statusCode: 400, code: "PRIVATEPAY_PAYMENT_MISMATCH" });
  if (!/^[a-f0-9]{64}$/.test(String(privatePayload.amount_commitment || "")))
    throw Object.assign(new Error("PrivatePAY amount commitment is required"), { statusCode: 400, code: "PRIVATEPAY_INVALID_AMOUNT_COMMITMENT" });
  const serialized = JSON.stringify(privatePayload).toLowerCase();
  for (const forbidden of ["payer", "recipient", "fee_payer", "fee_payer_address", "network_fee", "amount_base_units", "amount_atomic"]) {
    if (serialized.includes(`\"${forbidden}\"`))
      throw Object.assign(new Error("PrivatePAY proof contains public transaction metadata"), { statusCode: 400, code: "PRIVATEPAY_PUBLIC_METADATA" });
  }
  return true;
}

export async function privatePayFacilitatorRequest(config, operation, payload, fetchImpl = fetch) {
  if (!new Set(["verify", "settle"]).has(operation))
    throw Object.assign(new Error("unsupported PrivatePAY facilitator operation"), { statusCode: 400, code: "PRIVATEPAY_INVALID_FACILITATOR_OPERATION" });
  const status = privatePayStatus(config);
  if (!status.enabled)
    throw Object.assign(new Error("PrivatePAY facilitator is disabled until x402 conformance is verified"), { statusCode: 503, code: "PRIVATEPAY_NOT_READY", status });
  assertFacilitatorPayload(payload);
  assertPrivatePayPaymentPayload(payload);
  const base = String(config.privatePayFacilitatorUrl || "").replace(/\/$/, "");
  const endpoint = isMagicBlockRail(config) ? `/v1/x402/${operation}` : `/${operation}`;
  const headers = { "content-type": "application/json" };
  if (nonEmpty(config.privatePayFacilitatorApiKey)) {
    headers.authorization = `Bearer ${config.privatePayFacilitatorApiKey}`;
    if (isMagicBlockRail(config) && nonEmpty(config.privatePayMerchantId)) headers["x-merchant-id"] = config.privatePayMerchantId;
  }
  const response = await fetchImpl(`${base}${endpoint}`, {
    method: "POST",
    headers,
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

function settlementTransactionSignature(settlement) {
  for (const key of ["transaction", "signature", "transactionSignature", "tx_signature"]) {
    const value = settlement?.[key];
    if (isSolanaTransactionSignature(value)) return value;
  }
  return "";
}

export async function verifyPrivatePayMainnetSettlement(config, { requestId, amountBaseUnits, settlement } = {}, fetchImpl = fetch) {
  if (config.privatePayRequireOnchainSettlementProof !== true) {
    return { required: false, verified: false, status: "not_required" };
  }
  const signature = settlementTransactionSignature(settlement);
  if (!signature) {
    throw Object.assign(new Error("PrivatePAY facilitator did not return a verifiable Mainnet transaction signature"), {
      statusCode: 503,
      code: "PRIVATEPAY_SETTLEMENT_SIGNATURE_MISSING",
    });
  }
  const rpcUrl = config.privatePayRpcUrl || (isMagicBlockRail(config) ? DEFAULT_PRIVATEPAY_TEE_RPC : undefined);
  const result = await findPrivatePaySettlement({
    rpcUrl,
    mint: config.usdcMint,
    validator: settlement?.validator || settlement?.validatorIdentity || "",
    queuePda: settlement?.transferQueue || settlement?.queuePda || "",
    requestId,
    amountBaseUnits,
    transactionSignature: signature,
    fetchImpl,
  });
  if (result.status === "settlement_found") return { required: true, verified: true, verificationMode: "finalized_queue_instruction", ...result };

  // MagicBlock x402 direct settlements finalize on the TEE rail without an
  // observable ExecuteReadyQueuedTransfer queue instruction. Verify the
  // provider signature's finalized, error-free status as the fallback while
  // retaining the exact checkout binding performed before settlement.
  const direct = await getPrivatePaySignatureStatus({ rpcUrl: rpcUrl || DEFAULT_PRIVATEPAY_TEE_RPC, transactionSignature: signature, fetchImpl });
  if (direct.finalized) {
    const quoteBinding = config.privatePayRequirePaymentBoundQuote === true
      ? await verifyPrivatePayPaymentBoundQuote({
        rpcUrl: rpcUrl || DEFAULT_PRIVATEPAY_TEE_RPC,
        paymentId: settlement?.paymentId || settlement?.payment_id || settlement?.id,
        settlementSignature: signature,
        network: settlement?.network || SOLANA_MAINNET_CAIP2,
        mint: settlement?.mint || config.usdcMint,
        amountBaseUnits,
        finalizedSlot: direct.slot,
        fetchImpl,
      })
      : { required: false, verified: false, status: "not_required" };
    if (quoteBinding.required && quoteBinding.verified !== true) {
      throw Object.assign(new Error("PrivatePAY settlement is finalized but its payment-bound TDX quote was not verified"), {
        statusCode: 503,
        code: "PRIVATEPAY_PAYMENT_QUOTE_BINDING_FAILED",
        quoteBinding,
      });
    }
    return {
      required: true,
      verified: true,
      verificationMode: "finalized_tee_signature_status",
      queueVerification: result,
      quoteBinding,
      ...direct,
    };
  }
  throw Object.assign(new Error("PrivatePAY settlement signature was not finalized on the selected Mainnet rail"), {
    statusCode: 503,
    code: "PRIVATEPAY_SETTLEMENT_NOT_VERIFIED_ONCHAIN",
    verification: { queue: result, direct },
  });
}

export function publicPrivatePayFacilitatorResult(operation, result, requestId = "") {
  const value = result && typeof result === "object" ? result : {};
  if (operation === "verify") {
    return { operation, isValid: value.isValid === true, privacy_boundary: "facilitator settlement metadata is provider-only" };
  }
  return {
    operation,
    success: value.success === true,
    network: value.network || null,
    transaction: value.transaction
      ? `privatepay:${digest({ request_id: requestId, transaction: value.transaction }).slice(0, 32)}`
      : null,
    privacy_boundary: "facilitator settlement metadata is provider-only",
  };
}

export function privatePayStatus(config) {
  const networkMatrix = privatePayNetworkMatrix(config);
  const privacyRail = String(config.privatePayPrivacyRail || "").trim();
  const facilitatorUrl = String(config.privatePayFacilitatorUrl || "").trim();
  const confidentialMint = String(config.privatePayConfidentialMint || "").trim();
  const conformanceVerified = config.privatePayConformanceVerified === true;
  const mainnetVerified = config.privatePayMainnetVerified === true;
  const merchantAccountsDelegated = config.privatePayMerchantAccountsDelegated === true;
  const privacyChecks = {
    public_trace: config.privatePayPublicTraceVerified === true,
    provider_metadata_disclosed: config.privatePayProviderMetadataDisclosureVerified === true,
    e2e: config.privatePayE2eVerified === true,
  };
  const mintProblem = confidentialMintProblem(config, confidentialMint);
  const facilitatorCredentialReady = !isMagicBlockRail(config) || nonEmpty(config.privatePayFacilitatorApiKey);
  const stealthHandleConfigured = !isMagicBlockRail(config) || validStealthHandle(config.privatePayProviderHandle);
  const stealthHandleVerified = !isMagicBlockRail(config) || config.privatePayProviderHandleVerified === true;
  const paymentIngress = String(config.privatePayPaymentIngress || "").trim();
  const paymentIngressConfigured = !isMagicBlockRail(config)
    || (SOLANA_ADDRESS.test(paymentIngress) && paymentIngress !== String(config.privatePayProviderWallet || "").trim());
  const configured = nonEmpty(privacyRail) && nonEmpty(facilitatorUrl) && !mintProblem;
  const privacyAuditVerified = Object.values(privacyChecks).every(Boolean);
  const activationBlockers = [];
  if (!nonEmpty(privacyRail)) activationBlockers.push("privacy rail is not configured");
  if (!nonEmpty(facilitatorUrl)) activationBlockers.push("x402 facilitator URL is not configured");
  if (!confidentialMint) activationBlockers.push("confidential payment asset is not configured");
  else if (mintProblem) activationBlockers.push(mintProblem);
  if (!conformanceVerified) activationBlockers.push("x402 v2 verify/settle conformance is not independently verified");
  if (!facilitatorCredentialReady) activationBlockers.push("MagicBlock merchant API credential is not configured");
  if (!stealthHandleConfigured) activationBlockers.push("MagicBlock provider stealth handle is not configured");
  if (!stealthHandleVerified) activationBlockers.push("MagicBlock provider stealth handle initialization has not been independently verified");
  if (!paymentIngressConfigured) activationBlockers.push("MagicBlock x402 payment ingress must be a separate valid Solana account");
  if (config.privatePayTreasurySplitVerified === false) activationBlockers.push("PrivatePAY commercial fee split to the PrivateDAO treasury is not independently verified");
  if (!mainnetVerified) activationBlockers.push("Mainnet privacy-rail conformance is not independently verified");
  if (!merchantAccountsDelegated) activationBlockers.push("MagicBlock merchant payment accounts are not independently verified as delegated");
  if (!privacyChecks.public_trace) activationBlockers.push("public settlement trace evidence is missing");
  if (!privacyChecks.provider_metadata_disclosed) activationBlockers.push("provider-side payment metadata disclosure is not acknowledged");
  if (!privacyChecks.e2e) activationBlockers.push("funded deposit/private-transfer/withdrawal E2E evidence is missing");
  if (config.privatePayEnabled !== true) activationBlockers.push("explicit production activation is disabled");
  const enabled = configured && conformanceVerified && mainnetVerified && privacyAuditVerified && facilitatorCredentialReady && stealthHandleConfigured && stealthHandleVerified && paymentIngressConfigured && config.privatePayTreasurySplitVerified !== false && merchantAccountsDelegated && config.privatePayEnabled === true;
  const status = !configured
    ? "not_ready"
    : enabled
      ? "enabled"
    : activationBlockers.length === 1 && activationBlockers[0] === "explicit production activation is disabled"
      ? "ready_pending_explicit_enable"
      : privacyAuditVerified && conformanceVerified
        ? "configured_pending_explicit_enable"
        : "configured_pending_verification";
  const requiredBeforeActivation = [
    "MagicBlock Private Ephemeral Rollup or another reviewed shielded/pooled rail with provider audit access",
    "real x402 v2 facilitator verify/settle conformance test",
    "authenticated MagicBlock merchant API credential when the MagicBlock rail is selected",
    "independent verification that the merchant payment accounts are delegated to the selected MagicBlock validator",
    "independent Mainnet privacy-rail conformance evidence; Devnet or experimental deployments are insufficient",
    "funded testnet end-to-end proof",
    "independent evidence that the settlement has no public Solana trace",
    "explicit disclosure that the facilitator can view authenticated payment metadata",
    "public wording that does not promise provider-side unlinkability or amount confidentiality",
    "independent evidence for deposit, private transfer, and withdrawal",
    "provider audit access and abuse/AML policy",
    "payment-bound MagicBlock TDX Quote verification when PRIVATEPAY_REQUIRE_PAYMENT_BOUND_QUOTE is enabled",
  ];
  return {
    service_id: PRIVATEPAY_SERVICE_ID,
    protocol: "x402-v2",
    supported_payment_networks: [SOLANA_MAINNET_CAIP2],
    network_scope: "solana_only_pending_independent_multichain_conformance",
    network_matrix: networkMatrix,
    status,
    conformance_verified: conformanceVerified,
    mainnet_verified: mainnetVerified,
    merchant_accounts_delegated: merchantAccountsDelegated,
    privacy_audit_verified: privacyAuditVerified,
    payment_bound_quote_required: config.privatePayRequirePaymentBoundQuote === true,
    autopilot: privatePayAutopilotStatus(config),
    privacy_checks: privacyChecks,
    activation_blockers: activationBlockers,
    enabled,
    commercial_fee_model: { type: "percentage_with_minimum", fee_bps: config.privatePayFeeBps, minimum_usd: config.privatePayMinimumFeeUsd, treasury_split_verified: config.privatePayTreasurySplitVerified === true },
    privacy_rail: privacyRail || null,
    facilitator_configured: nonEmpty(facilitatorUrl),
    provider_handle_configured: stealthHandleConfigured,
    provider_handle_verified: stealthHandleVerified,
    payment_ingress_configured: paymentIngressConfigured,
    confidential_mint_configured: !mintProblem,
    confidential_mint_program: isMagicBlockRail(config) ? "magicblock-delegated-usdc" : String(config.privatePayConfidentialMintProgram || "") || null,
    public_chain_boundary: isMagicBlockRail(config)
      ? "MagicBlock mainnet-private keeps the private transfer inside its ephemeral-rollup rail; base-layer deposits, withdrawals, fee sponsorship, timing, and account identities still require independent linkability analysis"
      : "ordinary SPL USDC transfers remain publicly linkable; they are never used as the private rail",
    provider_visibility: "provider_only_after_authenticated_access",
    buyer_visibility: "public response contains only a request commitment and settlement status",
    required_before_activation: enabled ? [] : requiredBeforeActivation,
  };
}

export function createPrivatePayChallenge(config, input = {}) {
  const { request_id: requestId, requirements, header } = createPrivatePayRequirements(config, input);
  return {
    x402Version: 2,
    request_id: requestId,
    scheme: privatePayScheme(config),
    supported_payment_networks: [SOLANA_MAINNET_CAIP2],
    network_scope: "solana_only_pending_independent_multichain_conformance",
    privacy_mode: isMagicBlockRail(config) ? "magicblock_private_ephemeral_rollup" : "confidential_transfer",
    payment_required: requirements,
    payment_required_header: header,
    resource_commitment: requirements.extensions.privatepay.request_id,
    provider_commitment: requirements.accepts[0].extra.provider_commitment,
    amount_base_units: requirements.accepts[0].amount,
    expires_at: new Date(Date.now() + 300000).toISOString(),
    public_disclosure: "The reviewed MagicBlock rail keeps the tested settlement out of public Solana transaction data. This does not hide payment metadata from the authenticated provider or eliminate network-level timing inference.",
    provider_disclosure: "The provider may view the payer, recipient, amount, and settled request through authenticated access.",
  };
}

export async function probePrivatePayStealthHandle(config, fetchImpl = fetch) {
  if (!isMagicBlockRail(config)) return { status: "not_applicable", exists: false };
  const handle = String(config.privatePayProviderHandle || "").trim();
  if (!validStealthHandle(handle)) return { status: "invalid_handle", exists: false };
  const token = String(config.privatePayStealthPoolToken || "").trim();
  const base = String(config.privatePayProviderUrl || "").replace(/\/$/, "");
  const url = `${base}/v1/spl/stealth-pool?handle=${encodeURIComponent(handle)}&cluster=${encodeURIComponent(MAGICBLOCK_PRIVATE_CLUSTER)}`;
  try {
    const init = {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    };
    if (token) init.headers = { authorization: `Bearer ${token}` };
    const response = await fetchImpl(url, init);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return { status: `http_${response.status}`, exists: false };
    const exists = body?.exists === true;
    return { status: exists ? "initialized" : "not_initialized", exists };
  } catch {
    return { status: "unavailable", exists: false };
  }
}

export async function probePrivatePayRail(config, fetchImpl = fetch) {
  const status = privatePayStatus(config);
  const stealthHandleProbe = await probePrivatePayStealthHandle(config, fetchImpl);
  if (!status.facilitator_configured || !status.confidential_mint_configured) {
    return { ...status, provider_health: "not_checked", mint_status: "not_checked", facilitator_status: "not_checked", stealth_handle_status: stealthHandleProbe.status, operational: false };
  }
  const base = String(config.privatePayProviderUrl || "").replace(/\/$/, "");
  const facilitator = String(config.privatePayFacilitatorUrl || "").replace(/\/$/, "");
  const mint = encodeURIComponent(config.privatePayConfidentialMint);
  const cluster = encodeURIComponent(providerCluster(config));
  const result = { ...status, provider_health: "unavailable", mint_status: "unavailable", facilitator_status: "unavailable", stealth_handle_status: stealthHandleProbe.status, operational: false };
  try {
    const health = await fetchImpl(`${base}/health`, { signal: AbortSignal.timeout(5000) });
    result.provider_health = health.ok ? "ok" : `http_${health.status}`;
  } catch {
    result.provider_health = "unavailable";
  }
  if (isMagicBlockRail(config)) {
    result.mint_status = String(config.privatePayConfidentialMint || "") === String(config.usdcMint || "")
      ? "delegated_usdc_private_rollup"
      : "unexpected_asset";
  } else {
    try {
      const mintCheck = await fetchImpl(`${base}/v1/spl/is-mint-initialized?mint=${mint}&cluster=${cluster}`, { signal: AbortSignal.timeout(5000) });
      if (!mintCheck.ok) result.mint_status = `http_${mintCheck.status}`;
      else {
        const body = await mintCheck.json();
        const extensions = Array.isArray(body?.extensions) ? body.extensions.map((value) => String(value)) : [];
        const confidential = body?.confidentialTransfer === true || extensions.includes("confidentialTransfer") || extensions.includes("confidential_transfer");
        result.mint_status = body?.initialized !== true
          ? "not_initialized"
          : body?.tokenProgram !== TOKEN_2022_PROGRAM_ID || !confidential
            ? "not_confidential_token2022_mint"
            : "initialized_confidential_token2022";
      }
    } catch {
      result.mint_status = "unavailable";
    }
  }
  try {
    const supportedPath = isMagicBlockRail(config) ? "/v1/x402/supported" : "/supported";
    const supported = await fetchImpl(`${facilitator}${supportedPath}`, { signal: AbortSignal.timeout(5000) });
    if (!supported.ok) result.facilitator_status = `http_${supported.status}`;
    else {
      const body = await supported.json();
      const supportedKind = Array.isArray(body?.kinds) && body.kinds.some((kind) =>
        kind?.x402Version === 2 && kind?.scheme === privatePayScheme(config) && kind?.network === SOLANA_MAINNET_CAIP2
        && (!isMagicBlockRail(config) || kind?.extra?.cluster === MAGICBLOCK_PRIVATE_CLUSTER));
      result.facilitator_status = supportedKind
        ? (isMagicBlockRail(config) ? "exact_magicblock_v2_mainnet_private" : "privatepay_v2_mainnet")
        : "privatepay_not_supported";
    }
  } catch {
    result.facilitator_status = "unavailable";
  }
  result.operational = result.provider_health === "ok"
    && (isMagicBlockRail(config) ? result.mint_status === "delegated_usdc_private_rollup" && result.facilitator_status === "exact_magicblock_v2_mainnet_private" && result.stealth_handle_status === "initialized" : result.mint_status === "initialized_confidential_token2022" && result.facilitator_status === "privatepay_v2_mainnet")
    && status.enabled;
  if (!result.operational) result.status = "not_ready";
  return result;
}

export { PRIVATEPAY_SERVICE_ID };
