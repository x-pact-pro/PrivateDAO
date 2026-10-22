import test from "node:test";
import assert from "node:assert/strict";
import { decodePaymentRequiredHeader } from "@x402/core/http";
import { PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { assertPrivatePayPaymentPayload, auditPrivatePayTrace, auditPreparedPrivatePayTransfer, createPrivatePayChallenge, createPrivatePayCheckout, createPrivatePayRequirements, decodePrivatePaySignature, preparePrivatePayDeposit, preparePrivatePayTransfer, preparePrivatePayWithdrawal, privatePayFacilitatorRequest, privatePayStatus, probePrivatePayRail, probePrivatePayStealthHandle, publicPrivatePayFacilitatorResult, requestPrivatePayCheckoutChallenge } from "../src/privatepay.mjs";
import { assertPrivatePayNetworkAdapter } from "../src/privatepay-networks.mjs";

const TEST_CONFIDENTIAL_MINT = new PublicKey(new Uint8Array(32).fill(7)).toBase58();
const TEST_TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const TEST_REQUEST_ID = "pp_0123456789abcdef0123456789abcdef";
const TEST_PROVIDER_COMMITMENT = "a".repeat(64);
const TEST_PAYER = new PublicKey(new Uint8Array(32).fill(8)).toBase58();
const TEST_PAYMENT_ID = "c".repeat(64);

function magicBlockCheckoutConfig(overrides = {}) {
  return {
    privatePayEnabled: true,
    privatePayPrivacyRail: "magicblock-private-ephemeral-rollup",
    privatePayFacilitatorUrl: "https://payments.example",
    privatePayFacilitatorApiKey: "merchant-api-key-fixture",
    privatePayProviderUrl: "https://payments.example",
    privatePayMerchantCheckoutEnabled: true,
    privatePayConformanceVerified: true,
    privatePayMainnetVerified: true,
    privatePayRelationshipPrivacyVerified: true,
    privatePayAmountPrivacyVerified: true,
    privatePayTimingPrivacyVerified: true,
    privatePayE2eVerified: true,
    privatePayConfidentialMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    usdcMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    privatePayProviderHandle: "provider-handle-fixture",
    privatePayProviderHandleVerified: true,
    privatePayPaymentIngress: new PublicKey(new Uint8Array(32).fill(6)).toBase58(),
    ...overrides,
  };
}

function response(status, payload, headers = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (name) => headers[name] || headers[name.toLowerCase()] || null },
    async json() { return payload; },
  };
}

function validFacilitatorPayload() {
  const accepted = {
    scheme: "privatepay",
    network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    asset: TEST_CONFIDENTIAL_MINT,
    amount: "1000",
    payTo: "privatepay:test-provider",
    maxTimeoutSeconds: 300,
    extra: { request_id: TEST_REQUEST_ID, provider_commitment: TEST_PROVIDER_COMMITMENT },
  };
  return {
    x402Version: 2,
    paymentPayload: {
      x402Version: 2,
      resource: { url: "api://example" },
      accepted,
      payload: {
        signature: "fixture-signature",
        request_id: TEST_REQUEST_ID,
        provider_commitment: TEST_PROVIDER_COMMITMENT,
        amount_commitment: "b".repeat(64),
      },
    },
    paymentRequirements: accepted,
  };
}

test("PrivatePAY is fail-closed without a reviewed privacy rail", () => {
  const config = { privatePayEnabled: false };
  const status = privatePayStatus(config);
  assert.equal(status.status, "not_ready");
  assert.equal(status.enabled, false);
  assert.deepEqual(status.supported_payment_networks, ["solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"]);
  assert.equal(status.network_scope, "solana_only_pending_independent_multichain_conformance");
  assert.ok(status.activation_blockers.includes("privacy rail is not configured"));
  assert.throws(
    () => createPrivatePayChallenge(config, { resource: "api://example", provider_id: "provider-1", amount_base_units: "1000" }),
    (error) => error.code === "PRIVATEPAY_NOT_READY" && error.statusCode === 503,
  );
});

test("PrivatePAY exposes Base and Robinhood identities without enabling unverified rails", () => {
  const status = privatePayStatus({ privatePayNetwork: "base", privatePayEnabled: false });
  assert.equal(status.network_matrix.base.caip2, "eip155:8453");
  assert.equal(status.network_matrix.base.activation_status, "adapter_contract_only");
  assert.equal(status.network_matrix.robinhood.caip2, "eip155:4663");
  assert.throws(() => assertPrivatePayNetworkAdapter({ privatePayNetwork: "base" }), (error) => error.code === "PRIVATEPAY_NETWORK_RAIL_UNVERIFIED");
  assert.throws(() => assertPrivatePayNetworkAdapter({ privatePayNetwork: "robinhood" }), (error) => error.code === "PRIVATEPAY_NETWORK_RAIL_UNVERIFIED");
});

test("MagicBlock merchant checkout follows the official payments contract", async () => {
  const calls = [];
  const result = await createPrivatePayCheckout(magicBlockCheckoutConfig(), {
    payer: TEST_PAYER,
    amount_base_units: "1000",
    resource: "https://agents.example/api/service/verify",
    external_reference: "job_fixture_1",
  }, async (url, options) => {
    calls.push({ url, options });
    return response(201, {
      id: TEST_PAYMENT_ID,
      status: "created",
      expiresAt: "2026-10-21T12:00:00.000Z",
      externalReference: "job_fixture_1",
      cluster: "mainnet-private",
      resource: "https://agents.example/api/service/verify",
    });
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://payments.example/v1/payments");
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.headers.authorization, "Bearer merchant-api-key-fixture");
  const body = JSON.parse(calls[0].options.body);
  assert.deepEqual({ amount: body.amount, cluster: body.cluster, payer: body.payer, externalReference: body.externalReference }, {
    amount: "1000", cluster: "mainnet-private", payer: TEST_PAYER, externalReference: "job_fixture_1",
  });
  assert.match(body.requestHash, /^[a-f0-9]{64}$/);
  assert.equal(result.payment_id, TEST_PAYMENT_ID);
  assert.doesNotMatch(JSON.stringify(result), /merchant-api-key-fixture|payer/);
});

test("MagicBlock checkout challenge returns the provider PAYMENT-REQUIRED header without signing", async () => {
  const calls = [];
  const header = "eyJ4NDAyVmVyc2lvbiI6Mn0=";
  const result = await requestPrivatePayCheckoutChallenge(magicBlockCheckoutConfig(), { payment_id: TEST_PAYMENT_ID }, async (url, options) => {
    calls.push({ url, options });
    return response(402, {}, { "PAYMENT-REQUIRED": header });
  });
  assert.equal(calls[0].url, `https://payments.example/v1/x402/payments/${TEST_PAYMENT_ID}/pay`);
  assert.equal(calls[0].options.method, "POST");
  assert.deepEqual(result, { payment_id: TEST_PAYMENT_ID, status: "payment_required", payment_required_header: header });
  assert.doesNotMatch(JSON.stringify(result), /privateKey|signature|transaction/);
});

test("MagicBlock merchant checkout never calls the provider while its explicit gate is off", async () => {
  let called = false;
  await assert.rejects(
    createPrivatePayCheckout(magicBlockCheckoutConfig({ privatePayMerchantCheckoutEnabled: false }), { payer: TEST_PAYER, amount_base_units: "1000", resource: "api://service", external_reference: "job_fixture_2" }, async () => { called = true; }),
    (error) => error.code === "PRIVATEPAY_CHECKOUT_DISABLED" && error.statusCode === 503,
  );
  assert.equal(called, false);
});

test("PrivatePAY rejects ordinary public USDC as the confidential asset", () => {
  const config = {
    privatePayEnabled: true,
    privatePayPrivacyRail: "reviewed-private-rail",
    privatePayFacilitatorUrl: "https://facilitator.example/",
    privatePayConfidentialMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    usdcMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  };
  const status = privatePayStatus(config);
  assert.equal(status.enabled, false);
  assert.equal(status.confidential_mint_configured, false);
  assert.ok(status.activation_blockers.includes("ordinary public USDC cannot be used as the confidential payment asset"));
});

test("PrivatePAY challenge has commitments only and no payment metadata", () => {
  const config = {
    privatePayEnabled: true,
    privatePayPrivacyRail: "token-2022-confidential-balances",
    privatePayFacilitatorUrl: "https://facilitator.example/",
    privatePayConformanceVerified: true,
    privatePayMainnetVerified: true,
    privatePayRelationshipPrivacyVerified: true,
    privatePayAmountPrivacyVerified: true,
    privatePayTimingPrivacyVerified: true,
    privatePayE2eVerified: true,
    privatePayConfidentialMint: TEST_CONFIDENTIAL_MINT, privatePayConfidentialMintProgram: TEST_TOKEN_2022_PROGRAM,
  };
  const result = createPrivatePayChallenge(config, { resource: "api://example", provider_id: "provider-1", amount_base_units: "1000", nonce: "n1" });
  assert.equal(result.x402Version, 2);
  assert.equal(result.scheme, "privatepay");
  assert.deepEqual(result.supported_payment_networks, ["solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"]);
  assert.equal(result.network_scope, "solana_only_pending_independent_multichain_conformance");
  assert.match(result.request_id, /^pp_[a-f0-9]{32}$/);
  assert.equal(result.resource_commitment.length, 35);
  assert.equal(result.provider_commitment.length, 64);
  assert.equal(result.amount_base_units, "1000");
  const requirements = createPrivatePayRequirements(config, { resource: "api://example", provider_id: "provider-1", amount_base_units: "1000" });
  assert.equal(requirements.requirements.accepts[0].scheme, "privatepay");
  assert.equal(decodePaymentRequiredHeader(requirements.header).accepts[0].amount, "1000");
  for (const key of [
    "payer", "recipient", "amount", "fee_payer", "payment_signature", "purchase_description",
    "deposit_signature", "withdrawal_signature", "deposit_at", "withdrawal_at", "network_fee",
    "fee_payer_address", "payer_address", "recipient_address",
  ]) assert.equal(Object.hasOwn(result, key), false);
  const publicJson = JSON.stringify({ result, requirements });
  for (const forbidden of ["deposit_signature", "withdrawal_signature", "fee_payer_address", "payer_address", "recipient_address", "network_fee"]) {
    assert.equal(publicJson.includes(forbidden), false);
  }
});

test("PrivatePAY rejects malformed payment signatures before any settlement", () => {
  assert.throws(() => decodePrivatePaySignature("not-base64"), (error) => error.code === "PRIVATEPAY_INVALID_PAYMENT_HEADER");
});

test("PrivatePAY binds the proof and rejects public payer metadata", () => {
  const payload = validFacilitatorPayload();
  assert.equal(assertPrivatePayPaymentPayload(payload), true);
  payload.paymentPayload.payload.payer = "public-payer-address";
  assert.throws(() => assertPrivatePayPaymentPayload(payload), (error) => error.code === "PRIVATEPAY_PUBLIC_METADATA");
});

test("PrivatePAY rejects a PaymentRequired wrapper in facilitator requests", () => {
  const payload = validFacilitatorPayload();
  payload.paymentRequirements = {
    x402Version: 2,
    resource: { url: "api://example" },
    accepts: [payload.paymentRequirements],
  };
  assert.throws(() => assertPrivatePayPaymentPayload(payload), (error) => error.code === "PRIVATEPAY_INVALID_FACILITATOR_PAYLOAD");
});

test("PrivatePAY binds the accepted destination to the quoted payTo", () => {
  const payload = validFacilitatorPayload();
  payload.paymentPayload.accepted = { ...payload.paymentPayload.accepted, payTo: "privatepay:attacker" };
  assert.throws(() => assertPrivatePayPaymentPayload(payload), (error) => error.code === "PRIVATEPAY_PAYMENT_MISMATCH");
});

test("PrivatePAY facilitator responses redact public settlement metadata", () => {
  const result = publicPrivatePayFacilitatorResult("settle", {
    success: true,
    transaction: "raw-chain-transaction",
    payer: "public-payer",
    amount: "1000",
    feePayer: "public-fee-payer",
  }, TEST_REQUEST_ID);
  assert.equal(result.success, true);
  assert.match(result.transaction, /^privatepay:[a-f0-9]{32}$/);
  assert.doesNotMatch(JSON.stringify(result), /raw-chain-transaction|public-payer|1000|feePayer/);
});

test("MagicBlock payment binds cluster and settlement mode to the quote", () => {
  const accepted = {
    scheme: "exact-magicblock",
    network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    asset: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    amount: "1000",
    payTo: "So11111111111111111111111111111111111111112",
    maxTimeoutSeconds: 300,
    extra: { request_id: TEST_REQUEST_ID, paymentId: TEST_PAYMENT_ID, cluster: "mainnet-private", settlement: "ephemeral-rollup" },
  };
  const payload = {
    x402Version: 2,
    paymentPayload: { x402Version: 2, accepted, payload: { paymentId: TEST_PAYMENT_ID, transaction: "AQ==" } },
    paymentRequirements: accepted,
  };
  assert.equal(assertPrivatePayPaymentPayload(payload), true);
  payload.paymentPayload.payload = { transaction: "AQ==" };
  assert.throws(() => assertPrivatePayPaymentPayload(payload), (error) => error.code === "PRIVATEPAY_INVALID_PAYMENT_PROOF");
  payload.paymentPayload.payload = { paymentId: TEST_PAYMENT_ID, transaction: "AQ==" };
  payload.paymentPayload.accepted = { ...accepted, extra: { ...accepted.extra, cluster: "mainnet-beta" } };
  assert.throws(() => assertPrivatePayPaymentPayload(payload), (error) => error.code === "PRIVATEPAY_PAYMENT_MISMATCH");
});

test("PrivatePAY remains fail-closed when x402 conformance is not verified", () => {
  const config = {
    privatePayEnabled: true,
    privatePayPrivacyRail: "reviewed-private-rail",
    privatePayFacilitatorUrl: "https://facilitator.example/",
    privatePayConfidentialMint: TEST_CONFIDENTIAL_MINT, privatePayConfidentialMintProgram: TEST_TOKEN_2022_PROGRAM,
    privatePayConformanceVerified: false,
  };
  const status = privatePayStatus(config);
  assert.equal(status.conformance_verified, false);
  assert.equal(status.enabled, false);
  assert.throws(
    () => createPrivatePayRequirements(config, { resource: "api://example", provider_id: "provider-1", amount_base_units: "1000" }),
    (error) => error.code === "PRIVATEPAY_NOT_READY" && error.statusCode === 503,
  );
});

test("PrivatePAY rejects a rail that has not independently passed Mainnet conformance", () => {
  const status = privatePayStatus({
    privatePayEnabled: true,
    privatePayPrivacyRail: "experimental-rail",
    privatePayFacilitatorUrl: "https://facilitator.example/",
    privatePayConfidentialMint: TEST_CONFIDENTIAL_MINT, privatePayConfidentialMintProgram: TEST_TOKEN_2022_PROGRAM,
    privatePayConformanceVerified: true,
    privatePayRelationshipPrivacyVerified: true,
    privatePayAmountPrivacyVerified: true,
    privatePayTimingPrivacyVerified: true,
    privatePayE2eVerified: true,
    privatePayMainnetVerified: false,
  });
  assert.equal(status.enabled, false);
  assert.ok(status.activation_blockers.includes("Mainnet privacy-rail conformance is not independently verified"));
});

test("PrivatePAY remains fail-closed until relationship, amount, timing, and E2E privacy evidence exist", () => {
  const config = {
    privatePayEnabled: true,
    privatePayPrivacyRail: "reviewed-private-rail",
    privatePayFacilitatorUrl: "https://facilitator.example/",
    privatePayConfidentialMint: TEST_CONFIDENTIAL_MINT, privatePayConfidentialMintProgram: TEST_TOKEN_2022_PROGRAM,
    privatePayConformanceVerified: true,
    privatePayMainnetVerified: true,
    privatePayRelationshipPrivacyVerified: true,
    privatePayAmountPrivacyVerified: true,
    privatePayTimingPrivacyVerified: false,
    privatePayE2eVerified: false,
  };
  const status = privatePayStatus(config);
  assert.equal(status.conformance_verified, true);
  assert.equal(status.privacy_audit_verified, false);
  assert.equal(status.privacy_checks.timing, false);
  assert.equal(status.privacy_checks.e2e, false);
  assert.equal(status.enabled, false);
  assert.ok(status.activation_blockers.includes("timing and network-fee correlation evidence is missing"));
  assert.ok(status.activation_blockers.includes("funded deposit/private-transfer/withdrawal E2E evidence is missing"));
});

test("PrivatePAY facilitator adapter rejects verify and settle before making a network call", async () => {
  let calls = 0;
  const payload = validFacilitatorPayload();
  await assert.rejects(
    () => privatePayFacilitatorRequest({ privatePayEnabled: true, privatePayPrivacyRail: "rail", privatePayFacilitatorUrl: "https://facilitator.example", privatePayConfidentialMint: TEST_CONFIDENTIAL_MINT, privatePayConfidentialMintProgram: TEST_TOKEN_2022_PROGRAM }, "verify", payload, async () => { calls += 1; }),
    (error) => error.code === "PRIVATEPAY_NOT_READY" && error.statusCode === 503,
  );
  await assert.rejects(
    () => privatePayFacilitatorRequest({ privatePayEnabled: true, privatePayPrivacyRail: "rail", privatePayFacilitatorUrl: "https://facilitator.example", privatePayConfidentialMint: TEST_CONFIDENTIAL_MINT, privatePayConfidentialMintProgram: TEST_TOKEN_2022_PROGRAM }, "settle", payload, async () => { calls += 1; }),
    (error) => error.code === "PRIVATEPAY_NOT_READY" && error.statusCode === 503,
  );
  assert.equal(calls, 0);
});

test("PrivatePAY facilitator adapter forwards only after the explicit conformance gate", async () => {
  const seen = [];
  const payload = validFacilitatorPayload();
  const result = await privatePayFacilitatorRequest({ privatePayEnabled: true, privatePayConformanceVerified: true, privatePayMainnetVerified: true, privatePayRelationshipPrivacyVerified: true, privatePayAmountPrivacyVerified: true, privatePayTimingPrivacyVerified: true, privatePayE2eVerified: true, privatePayPrivacyRail: "rail", privatePayFacilitatorUrl: "https://facilitator.example/", privatePayConfidentialMint: TEST_CONFIDENTIAL_MINT, privatePayConfidentialMintProgram: TEST_TOKEN_2022_PROGRAM }, "verify", payload, async (url, init) => {
    seen.push({ url, body: JSON.parse(init.body) });
    return { ok: true, status: 200, async json() { return { isValid: true }; } };
  });
  assert.deepEqual(result, { operation: "verify", isValid: true });
  assert.equal(seen[0].url, "https://facilitator.example/verify");
  assert.deepEqual(seen[0].body, payload);
});

test("PrivatePAY remains unavailable when the provider health or confidential mint check fails", async () => {
  const config = {
    privatePayEnabled: true,
    privatePayPrivacyRail: "token-2022-confidential-balances",
    privatePayFacilitatorUrl: "https://facilitator.example/",
    privatePayConfidentialMint: TEST_CONFIDENTIAL_MINT, privatePayConfidentialMintProgram: TEST_TOKEN_2022_PROGRAM,
    privatePayProviderUrl: "https://payments.example",
    privatePayCluster: "mainnet-beta",
  };
  const result = await probePrivatePayRail(config, async (url) => ({
    ok: url.endsWith("/health"),
    status: url.endsWith("/health") ? 200 : 500,
    async json() { return { initialized: false, kinds: [] }; },
  }));
  assert.equal(result.provider_health, "ok");
  assert.equal(result.mint_status, "http_500");
  assert.equal(result.facilitator_status, "http_500");
  assert.equal(result.operational, false);
  assert.equal(result.status, "not_ready");
});

test("PrivatePAY requires facilitator support for the exact custom scheme and network", async () => {
  const config = {
    privatePayEnabled: true,
    privatePayPrivacyRail: "token-2022-confidential-balances",
    privatePayFacilitatorUrl: "https://facilitator.example/",
    privatePayConfidentialMint: TEST_CONFIDENTIAL_MINT, privatePayConfidentialMintProgram: TEST_TOKEN_2022_PROGRAM,
    privatePayProviderUrl: "https://payments.example",
    privatePayCluster: "mainnet-beta",
  };
  const result = await probePrivatePayRail(config, async (url) => ({
    ok: true,
    status: 200,
    async json() {
      if (url.endsWith("/health")) return {};
      if (url.includes("is-mint-initialized")) return { initialized: true, tokenProgram: TEST_TOKEN_2022_PROGRAM, confidentialTransfer: true };
      return { kinds: [{ x402Version: 2, scheme: "exact", network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp" }] };
    },
  }));
  assert.equal(result.mint_status, "initialized_confidential_token2022");
  assert.equal(result.facilitator_status, "privatepay_not_supported");
  assert.equal(result.operational, false);
});

test("PrivatePAY probes an initialized MagicBlock stealth pool read-only", async () => {
  const seen = [];
  const result = await probePrivatePayStealthHandle({
    privatePayPrivacyRail: "magicblock-private-ephemeral-rollup",
    privatePayProviderUrl: "https://payments.example",
    privatePayProviderHandle: "provider@magicblock.id",
    privatePayStealthPoolToken: "bearer-fixture",
  }, async (url, init) => {
    seen.push({ url, init });
    return { ok: true, status: 200, async json() { return { exists: true }; } };
  });
  assert.equal(result.status, "initialized");
  assert.equal(result.exists, true);
  assert.equal(seen[0].url, "https://payments.example/v1/spl/stealth-pool?handle=provider%40magicblock.id&cluster=mainnet-private");
  assert.equal(seen[0].init.headers.authorization, "Bearer bearer-fixture");
});

test("PrivatePAY probes a public MagicBlock stealth pool without a bearer token", async () => {
  const result = await probePrivatePayStealthHandle({
    privatePayPrivacyRail: "magicblock-private-ephemeral-rollup",
    privatePayProviderUrl: "https://payments.example",
    privatePayProviderHandle: "provider@magicblock.id",
  }, async (url, init) => {
    assert.equal(url, "https://payments.example/v1/spl/stealth-pool?handle=provider%40magicblock.id&cluster=mainnet-private");
    assert.equal(init.headers, undefined);
    return { ok: true, status: 200, async json() { return { exists: true }; } };
  });
  assert.equal(result.status, "initialized");
  assert.equal(result.exists, true);
});

test("PrivatePAY probes MagicBlock mainnet-private x402 support without a Token-2022 mint probe", async () => {
  const config = {
    privatePayEnabled: true,
    privatePayPrivacyRail: "magicblock-private-ephemeral-rollup",
    privatePayFacilitatorUrl: "https://facilitator.example",
    privatePayConfidentialMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    usdcMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    privatePayProviderUrl: "https://payments.example",
    privatePayCluster: "mainnet-beta",
  };
  const seen = [];
  await probePrivatePayRail(config, async (url) => {
    seen.push(url);
    return { ok: true, status: 200, async json() {
      if (url.endsWith("/health")) return { status: "ok" };
      return { kinds: [{ x402Version: 2, scheme: "exact-magicblock", network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", extra: { cluster: "mainnet-private" } }] };
    } };
  });
  assert.ok(seen.includes("https://facilitator.example/v1/x402/supported"));
  assert.ok(!seen.some((url) => url.includes("is-mint-initialized")));
});

test("PrivatePAY emits the real MagicBlock x402 scheme and private-rollup requirements", () => {
  const config = {
    privatePayEnabled: true,
    privatePayPrivacyRail: "magicblock-private-ephemeral-rollup",
    privatePayFacilitatorUrl: "https://payments.magicblock.app",
    privatePayFacilitatorApiKey: "test-magicblock-key",
    privatePayProviderWallet: "4Nd1mYx6x8vJ1c6b4mP9bYxQm8mJ3WfGxqk9dYhT6pR2",
    privatePayProviderHandle: "provider@magicblock.id",
    privatePayProviderHandleVerified: true,
    privatePayPaymentIngress: "So11111111111111111111111111111111111111112",
    privatePayConfidentialMint: "EPjFWdd5AufSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    usdcMint: "EPjFWdd5AufSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    privatePayConformanceVerified: true,
    privatePayMainnetVerified: true,
    privatePayRelationshipPrivacyVerified: true,
    privatePayAmountPrivacyVerified: true,
    privatePayTimingPrivacyVerified: true,
    privatePayE2eVerified: true,
  };
  const result = createPrivatePayRequirements(config, { resource: "api://example", provider_id: "provider-1", amount_base_units: "1000" });
  const accepted = result.requirements.accepts[0];
  assert.equal(accepted.scheme, "exact-magicblock");
  assert.equal(accepted.network, "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp");
  assert.equal(accepted.asset, config.privatePayConfidentialMint);
  assert.equal(accepted.payTo, config.privatePayPaymentIngress);
  assert.notEqual(accepted.payTo, config.privatePayProviderWallet);
  assert.equal(JSON.stringify(result).includes(config.privatePayProviderWallet), false);
  assert.equal(accepted.extra.cluster, "mainnet-private");
  assert.equal(accepted.extra.settlement, "ephemeral-rollup");
});

test("PrivatePAY challenge has one explicit payment_required object and honest privacy wording", () => {
  const config = {
    privatePayEnabled: true,
    privatePayPrivacyRail: "magicblock-private-ephemeral-rollup",
    privatePayFacilitatorUrl: "https://payments.magicblock.app",
    privatePayFacilitatorApiKey: "test-magicblock-key",
    privatePayProviderWallet: "11111111111111111111111111111111",
    privatePayProviderHandle: "provider@magicblock.id",
    privatePayProviderHandleVerified: true,
    privatePayPaymentIngress: "So11111111111111111111111111111111111111112",
    privatePayConfidentialMint: "EPjFWdd5AufSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    usdcMint: "EPjFWdd5AufSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    privatePayConformanceVerified: true,
    privatePayMainnetVerified: true,
    privatePayRelationshipPrivacyVerified: true,
    privatePayAmountPrivacyVerified: true,
    privatePayTimingPrivacyVerified: true,
    privatePayE2eVerified: true,
  };
  const challenge = createPrivatePayChallenge(config, { resource: "api://example", provider_id: "provider-1", amount_base_units: "1000" });
  assert.equal(typeof challenge.payment_required, "object");
  assert.notEqual(challenge.payment_required, true);
  assert.match(challenge.public_disclosure, /unproven until the funded Mainnet conformance gates pass/);
});

test("PrivatePAY forwards MagicBlock verify to its versioned facilitator endpoint", async () => {
  const accepted = {
    scheme: "exact-magicblock",
    network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    asset: "EPjFWdd5AufSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    amount: "1000",
    payTo: "11111111111111111111111111111111",
    maxTimeoutSeconds: 300,
    extra: { request_id: TEST_REQUEST_ID, paymentId: TEST_PAYMENT_ID, cluster: "mainnet-private", settlement: "ephemeral-rollup" },
  };
  const payload = {
    x402Version: 2,
    paymentPayload: { x402Version: 2, accepted, payload: { paymentId: TEST_PAYMENT_ID, transaction: "AQ==" } },
    paymentRequirements: accepted,
  };
  const seen = [];
  const result = await privatePayFacilitatorRequest({
    privatePayEnabled: true,
    privatePayConformanceVerified: true,
    privatePayMainnetVerified: true,
    privatePayRelationshipPrivacyVerified: true,
    privatePayAmountPrivacyVerified: true,
    privatePayTimingPrivacyVerified: true,
    privatePayE2eVerified: true,
    privatePayPrivacyRail: "magicblock-private-ephemeral-rollup",
    privatePayFacilitatorUrl: "https://payments.magicblock.app",
    privatePayFacilitatorApiKey: "test-magicblock-key",
    privatePayMerchantId: "2BJ4ezxqV9YJXc38D9duKBkdn4su4jE1beKUHwH663sL",
    privatePayProviderHandle: "provider@magicblock.id",
    privatePayProviderHandleVerified: true,
    privatePayPaymentIngress: "So11111111111111111111111111111111111111112",
    privatePayConfidentialMint: accepted.asset,
    usdcMint: accepted.asset,
  }, "verify", payload, async (url, init) => {
    seen.push({ url, headers: init.headers, body: JSON.parse(init.body) });
    return { ok: true, status: 200, async json() { return { isValid: true }; } };
  });
  assert.equal(result.isValid, true);
  assert.equal(seen[0].url, "https://payments.magicblock.app/v1/x402/verify");
  assert.equal(seen[0].headers.authorization, "Bearer test-magicblock-key");
  assert.equal(seen[0].headers["x-merchant-id"], "2BJ4ezxqV9YJXc38D9duKBkdn4su4jE1beKUHwH663sL");
  assert.deepEqual(seen[0].body, payload);
});

test("PrivatePAY sends a MagicBlock stealth handle instead of the provider wallet", async () => {
  const config = {
    privatePayEnabled: true,
    privatePayRequireGasless: false,
    privatePayPrivacyRail: "magicblock-private-ephemeral-rollup",
    privatePayProviderWallet: "4Nd1mYx6x8vJ1c6b4mP9bYxQm8mJ3WfGxqk9dYhT6pR2",
    privatePayProviderHandle: "provider@magicblock.id",
    privatePayProviderHandleVerified: true,
    privatePayConfidentialMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    usdcMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  };
  let requestBody;
  await preparePrivatePayTransfer(config, {
    request_id: "pp_0123456789abcdef0123456789abcdef",
    payer: "11111111111111111111111111111111",
    amount_base_units: "10000",
    gasless: false,
  }, async (_url, init) => {
    requestBody = JSON.parse(init.body);
    return { ok: true, async json() { return { kind: "transfer", version: "v0", transactionBase64: "AQ==", requiredSigners: [], sendTo: "ephemeral" }; } };
  });
  assert.equal(requestBody.to, config.privatePayProviderHandle);
  assert.notEqual(requestBody.to, config.privatePayProviderWallet);
  assert.equal(requestBody.visibility, "private");
  assert.equal(requestBody.fromBalance, "base");
  assert.equal(requestBody.toBalance, "base");
});

test("PrivatePAY refuses a MagicBlock transfer without a stealth handle", async () => {
  await assert.rejects(
    () => preparePrivatePayTransfer({
      privatePayEnabled: true,
      privatePayRequireGasless: false,
      privatePayPrivacyRail: "magicblock-private-ephemeral-rollup",
      privatePayProviderWallet: "11111111111111111111111111111111",
      privatePayConfidentialMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      usdcMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    }, {
      request_id: "pp_0123456789abcdef0123456789abcdef",
      payer: "11111111111111111111111111111111",
      amount_base_units: "1",
      gasless: false,
    }, async () => { throw new Error("network must not be reached"); }),
    (error) => error.code === "PRIVATEPAY_PROVIDER_HANDLE_NOT_CONFIGURED" && error.statusCode === 503,
  );
});

test("PrivatePAY prepares a real provider transaction without exposing provider internals to the client contract", async () => {
  const config = {
    privatePayEnabled: true,
    privatePayRequireGasless: false,
    privatePayProviderUrl: "https://payments.magicblock.app",
    privatePayProviderWallet: "4Nd1mYx6x8vJ1c6b4mP9bYxQm8mJ3WfGxqk9dYhT6pR2",
    privatePayConfidentialMint: TEST_CONFIDENTIAL_MINT, privatePayConfidentialMintProgram: TEST_TOKEN_2022_PROGRAM,
    privatePayCluster: "mainnet",
    privatePayMinDelayMs: 120000,
    privatePayMaxDelayMs: 300000,
  };
  let requestBody;
  const result = await preparePrivatePayTransfer(config, {
    request_id: "pp_0123456789abcdef0123456789abcdef",
    payer: "11111111111111111111111111111111",
    amount_base_units: "10000",
  }, async (_url, init) => {
    requestBody = JSON.parse(init.body);
    return {
    ok: true,
    async json() { return { kind: "transfer", version: "v0", transactionBase64: "AQ==", requiredSigners: ["11111111111111111111111111111111"], validator: "MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57", fees: { lamports: "2039280", tokens: "10" } }; },
    };
  });
  assert.equal(result.request_id, "pp_0123456789abcdef0123456789abcdef");
  assert.equal(result.required_signers[0], "11111111111111111111111111111111");
  assert.equal(result.provider_fees.lamports, "2039280");
  assert.equal(result.privacy_audit.status, "not_audited");
  assert.equal(result.privacy_audit.release_ready, false);
  assert.equal(requestBody.minDelayMs, "120000");
  assert.equal(requestBody.maxDelayMs, "300000");
});

test("MagicBlock PrivatePAY never prepares the public mainnet cluster", async () => {
  const config = {
    privatePayEnabled: true,
    privatePayRequireGasless: false,
    privatePayPrivacyRail: "magicblock-private-ephemeral-rollup",
    privatePayProviderHandle: "provider@magicblock.id",
    privatePayProviderHandleVerified: true,
    privatePayProviderUrl: "https://payments.magicblock.app",
    privatePayConfidentialMint: "EPjFWdd5AufSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    usdcMint: "EPjFWdd5AufSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    privatePayCluster: "mainnet-beta",
  };
  let requestBody;
  await preparePrivatePayTransfer(config, {
    request_id: TEST_REQUEST_ID,
    payer: "11111111111111111111111111111111",
    amount_base_units: "1",
    gasless: false,
  }, async (_url, init) => {
    requestBody = JSON.parse(init.body);
    return { ok: true, async json() { return { kind: "transfer", version: "legacy", transactionBase64: "AQ==", requiredSigners: [] }; } };
  });
  assert.equal(requestBody.cluster, "mainnet-private");
  assert.equal(requestBody.visibility, "private");
});

test("PrivatePAY prepares deposit and withdrawal as separate unsigned audit legs", async () => {
  const config = {
    privatePayEnabled: true,
    privatePayProviderUrl: "https://payments.magicblock.app",
    privatePayPrivacyRail: "magicblock-private-ephemeral-rollup",
    privatePayConfidentialMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    usdcMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    privatePayCluster: "mainnet-beta",
  };
  const seen = [];
  const fetcher = async (url, init) => {
    seen.push({ url, body: JSON.parse(init.body) });
    const kind = url.endsWith("/deposit") ? "deposit" : "withdraw";
    return { ok: true, async json() { return { kind, version: "legacy", transactionBase64: "AQ==", requiredSigners: ["11111111111111111111111111111111"], sendTo: "base" }; } };
  };
  const input = { request_id: TEST_REQUEST_ID, owner: "11111111111111111111111111111111", amount_base_units: "10000" };
  const deposit = await preparePrivatePayDeposit(config, input, fetcher);
  const withdrawal = await preparePrivatePayWithdrawal(config, input, fetcher);
  assert.equal(deposit.phase, "deposit");
  assert.equal(withdrawal.phase, "withdraw");
  assert.deepEqual(seen.map((item) => item.url), ["https://payments.magicblock.app/v1/spl/deposit", "https://payments.magicblock.app/v1/spl/withdraw"]);
  assert.equal(seen[0].body.owner, input.owner);
  assert.equal(seen[0].body.amount, 10000);
  assert.equal(seen[0].body.cluster, "mainnet-private");
  assert.equal(seen[1].body.idempotent, true);
  assert.equal(seen[1].body.cluster, "mainnet-private");
  assert.equal(Object.hasOwn(deposit, "private_key"), false);
  assert.equal(Object.hasOwn(withdrawal, "private_key"), false);
});

test("PrivatePAY refuses a payer-funded prepare by default", async () => {
  await assert.rejects(
    () => preparePrivatePayTransfer({
      privatePayEnabled: true,
      privatePayProviderWallet: "11111111111111111111111111111111",
      privatePayConfidentialMint: TEST_CONFIDENTIAL_MINT, privatePayConfidentialMintProgram: TEST_TOKEN_2022_PROGRAM,
      privatePayProviderUrl: "https://payments.example",
    }, {
      request_id: "pp_0123456789abcdef0123456789abcdef",
      payer: "11111111111111111111111111111111",
      amount_base_units: "1",
      gasless: false,
    }, async () => { throw new Error("network must not be reached"); }),
    (error) => error.code === "PRIVATEPAY_GASLESS_REQUIRED" && error.statusCode === 503,
  );
});

test("PrivatePAY privacy audit marks the base fee payer and unproven amount as release blockers", () => {
  const payer = "11111111111111111111111111111111";
  const provider = "So11111111111111111111111111111111111111112";
  const message = new TransactionMessage({ payerKey: new PublicKey(payer), recentBlockhash: payer, instructions: [] }).compileToV0Message();
  const transaction = new VersionedTransaction(message);
  const audit = auditPreparedPrivatePayTransfer({ transaction_base64: Buffer.from(transaction.serialize()).toString("base64"), provider_fees: { lamports: "1" } }, { payer, provider });
  assert.equal(audit.status, "audited_boundary_only");
  assert.equal(audit.fee_payer, payer);
  assert.equal(audit.fee_payer_role, "payer");
  assert.equal(audit.payer_account_visible, true);
  assert.equal(audit.provider_account_visible, false);
  assert.equal(audit.relationship_protected, false);
  assert.equal(audit.amount_protected, false);
  assert.equal(audit.release_ready, false);
});

test("PrivatePAY trace audit covers deposit, transfer, withdrawal, timing, and network-fee leakage", () => {
  const payer = "11111111111111111111111111111111";
  const message = new TransactionMessage({ payerKey: new PublicKey(payer), recentBlockhash: payer, instructions: [] }).compileToV0Message();
  const encoded = Buffer.from(new VersionedTransaction(message).serialize()).toString("base64");
  const leg = {
    transaction_base64: encoded,
    last_valid_block_height: 123,
    provider_fees: { lamports: "5000" },
    submitted_at: "2026-10-20T12:00:00.000Z",
    amount_base_units: "1000",
  };
  const audit = auditPrivatePayTrace({ deposit: leg, transfer: leg, withdrawal: leg });
  assert.equal(audit.status, "audited_boundary_only");
  assert.equal(audit.release_ready, false);
  assert.equal(audit.legs.length, 3);
  assert.deepEqual(audit.legs.map((item) => item.label), ["deposit", "transfer", "withdrawal"]);
  assert.equal(audit.legs[0].fee_payer, payer);
  assert.equal(audit.legs[2].expiry_visible, true);
  assert.equal(audit.legs[1].network_fee_visibility, "quoted_fee_visible");
  assert.equal(audit.relationship_protected, false);
  assert.equal(audit.amount_protected, false);
  assert.equal(audit.timing_protected, false);
  assert.equal(audit.fee_payer_reused, true);
  assert.equal(audit.timing_correlation_detected, true);
  assert.ok(audit.linkability_signals.includes("fee_payer_reused_across_legs"));
  assert.ok(audit.linkability_signals.includes("legs_observed_within_five_minutes"));
  assert.ok(audit.linkability_signals.includes("amount_metadata_visible_in_trace"));
  assert.equal(audit.shared_account_counts["deposit:transfer"] >= 1, true);
});
