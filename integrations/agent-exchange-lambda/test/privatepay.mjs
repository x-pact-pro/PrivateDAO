import test from "node:test";
import assert from "node:assert/strict";
import { decodePaymentRequiredHeader } from "@x402/core/http";
import { PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { auditPrivatePayTrace, auditPreparedPrivatePayTransfer, createPrivatePayChallenge, createPrivatePayRequirements, decodePrivatePaySignature, preparePrivatePayTransfer, privatePayFacilitatorRequest, privatePayStatus, probePrivatePayRail } from "../src/privatepay.mjs";

test("PrivatePAY is fail-closed without a reviewed privacy rail", () => {
  const config = { privatePayEnabled: false };
  const status = privatePayStatus(config);
  assert.equal(status.status, "not_ready");
  assert.equal(status.enabled, false);
  assert.throws(
    () => createPrivatePayChallenge(config, { resource: "api://example", provider_id: "provider-1", amount_base_units: "1000" }),
    (error) => error.code === "PRIVATEPAY_NOT_READY" && error.statusCode === 503,
  );
});

test("PrivatePAY challenge has commitments only and no payment metadata", () => {
  const config = {
    privatePayEnabled: true,
    privatePayPrivacyRail: "token-2022-confidential-balances",
    privatePayFacilitatorUrl: "https://facilitator.example/",
    privatePayConformanceVerified: true,
    privatePayRelationshipPrivacyVerified: true,
    privatePayAmountPrivacyVerified: true,
    privatePayTimingPrivacyVerified: true,
    privatePayE2eVerified: true,
    privatePayConfidentialMint: "mint-commitment",
  };
  const result = createPrivatePayChallenge(config, { resource: "api://example", provider_id: "provider-1", amount_base_units: "1000", nonce: "n1" });
  assert.equal(result.x402Version, 2);
  assert.equal(result.scheme, "privatepay");
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

test("PrivatePAY remains fail-closed when x402 conformance is not verified", () => {
  const config = {
    privatePayEnabled: true,
    privatePayPrivacyRail: "reviewed-private-rail",
    privatePayFacilitatorUrl: "https://facilitator.example/",
    privatePayConfidentialMint: "mint-commitment",
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

test("PrivatePAY remains fail-closed until relationship, amount, timing, and E2E privacy evidence exist", () => {
  const config = {
    privatePayEnabled: true,
    privatePayPrivacyRail: "reviewed-private-rail",
    privatePayFacilitatorUrl: "https://facilitator.example/",
    privatePayConfidentialMint: "mint-commitment",
    privatePayConformanceVerified: true,
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
});

test("PrivatePAY facilitator adapter rejects verify and settle before making a network call", async () => {
  let calls = 0;
  const payload = { x402Version: 2, paymentPayload: {}, paymentRequirements: {} };
  await assert.rejects(
    () => privatePayFacilitatorRequest({ privatePayEnabled: true, privatePayPrivacyRail: "rail", privatePayFacilitatorUrl: "https://facilitator.example", privatePayConfidentialMint: "mint" }, "verify", payload, async () => { calls += 1; }),
    (error) => error.code === "PRIVATEPAY_NOT_READY" && error.statusCode === 503,
  );
  await assert.rejects(
    () => privatePayFacilitatorRequest({ privatePayEnabled: true, privatePayPrivacyRail: "rail", privatePayFacilitatorUrl: "https://facilitator.example", privatePayConfidentialMint: "mint" }, "settle", payload, async () => { calls += 1; }),
    (error) => error.code === "PRIVATEPAY_NOT_READY" && error.statusCode === 503,
  );
  assert.equal(calls, 0);
});

test("PrivatePAY facilitator adapter forwards only after the explicit conformance gate", async () => {
  const seen = [];
  const payload = { x402Version: 2, paymentPayload: { scheme: "privatepay" }, paymentRequirements: { scheme: "privatepay" } };
  const result = await privatePayFacilitatorRequest({ privatePayEnabled: true, privatePayConformanceVerified: true, privatePayRelationshipPrivacyVerified: true, privatePayAmountPrivacyVerified: true, privatePayTimingPrivacyVerified: true, privatePayE2eVerified: true, privatePayPrivacyRail: "rail", privatePayFacilitatorUrl: "https://facilitator.example/", privatePayConfidentialMint: "mint" }, "verify", payload, async (url, init) => {
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
    privatePayConfidentialMint: "mint-commitment",
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
    privatePayConfidentialMint: "mint-commitment",
    privatePayProviderUrl: "https://payments.example",
    privatePayCluster: "mainnet-beta",
  };
  const result = await probePrivatePayRail(config, async (url) => ({
    ok: true,
    status: 200,
    async json() {
      if (url.endsWith("/health")) return {};
      if (url.includes("is-mint-initialized")) return { initialized: true };
      return { kinds: [{ x402Version: 2, scheme: "exact", network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp" }] };
    },
  }));
  assert.equal(result.mint_status, "initialized");
  assert.equal(result.facilitator_status, "privatepay_not_supported");
  assert.equal(result.operational, false);
});

test("PrivatePAY prepares a real provider transaction without exposing provider internals to the client contract", async () => {
  const config = {
    privatePayEnabled: true,
    privatePayProviderUrl: "https://payments.magicblock.app",
    privatePayProviderWallet: "4Nd1mYx6x8vJ1c6b4mP9bYxQm8mJ3WfGxqk9dYhT6pR2",
    privatePayConfidentialMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    privatePayCluster: "mainnet",
  };
  const result = await preparePrivatePayTransfer(config, {
    request_id: "pp_0123456789abcdef0123456789abcdef",
    payer: "11111111111111111111111111111111",
    amount_base_units: "10000",
  }, async () => ({
    ok: true,
    async json() { return { kind: "transfer", version: "v0", transactionBase64: "AQ==", requiredSigners: ["11111111111111111111111111111111"], validator: "MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57", fees: { lamports: "2039280", tokens: "10" } }; },
  }));
  assert.equal(result.request_id, "pp_0123456789abcdef0123456789abcdef");
  assert.equal(result.required_signers[0], "11111111111111111111111111111111");
  assert.equal(result.provider_fees.lamports, "2039280");
  assert.equal(result.privacy_audit.status, "not_audited");
  assert.equal(result.privacy_audit.release_ready, false);
});

test("PrivatePAY privacy audit marks the base fee payer and unproven amount as release blockers", () => {
  const payer = "11111111111111111111111111111111";
  const provider = "So11111111111111111111111111111111111111112";
  const message = new TransactionMessage({ payerKey: new PublicKey(payer), recentBlockhash: payer, instructions: [] }).compileToV0Message();
  const transaction = new VersionedTransaction(message);
  const audit = auditPreparedPrivatePayTransfer({ transaction_base64: Buffer.from(transaction.serialize()).toString("base64"), provider_fees: { lamports: "1" } }, { payer, provider });
  assert.equal(audit.status, "audited_boundary_only");
  assert.equal(audit.fee_payer, payer);
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
  const leg = { transaction_base64: encoded, last_valid_block_height: 123, provider_fees: { lamports: "5000" } };
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
});
