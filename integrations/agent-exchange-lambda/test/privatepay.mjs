import test from "node:test";
import assert from "node:assert/strict";
import { decodePaymentRequiredHeader } from "@x402/core/http";
import { createPrivatePayChallenge, createPrivatePayRequirements, decodePrivatePaySignature, preparePrivatePayTransfer, privatePayStatus, probePrivatePayRail } from "../src/privatepay.mjs";

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
});
