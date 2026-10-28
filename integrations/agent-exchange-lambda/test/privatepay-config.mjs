import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { handler, resetForTests } from "../src/handler.mjs";
import { getConfig } from "../src/config.mjs";
import { decodePrivatePayRequiredHeader, decodePrivatePaySignature, privatePayMagicBlockFacilitatorRequest } from "../src/privatepay.mjs";

const artifactPaths = [
  new URL("../scripts/privatepay-x402-status.mjs", import.meta.url),
  new URL("../scripts/privatepay-x402-verify-settle.mjs", import.meta.url),
  new URL("../scripts/privatepay-x402-submit.mjs", import.meta.url),
];

test("production deployment points PrivatePAY at the provisioned production secret", async () => {
  const artifacts = await Promise.all(artifactPaths.map((path) => readFile(path, "utf8")));
  for (const artifact of artifacts) {
    assert.match(artifact, /PRIVATEPAY_SECRET_ID \|\| "pdao\/agent-exchange\/privatepay-production"/);
    assert.doesNotMatch(artifact, /pdao\/agent-exchange\/privatepay["'`\s]/);
  }
});

test("public PrivatePAY errors expose safe readiness metadata without provider secrets", async () => {
  resetForTests();
  const response = await handler({
    requestContext: { http: { method: "POST", path: "/api/privatepay/x402" } },
    body: JSON.stringify({}),
  });
  const body = JSON.parse(response.body);
  assert.equal(response.statusCode, 503);
  assert.equal(body.code, "PRIVATEPAY_NOT_READY");
  assert.equal(body.privatepay_status.enabled, false);
  assert.ok(Array.isArray(body.privatepay_status.activation_blockers));
  assert.doesNotMatch(response.body, /secret|apiKey|authorization|private.?key/i);
});

test("PrivatePAY rejects oversized payment signatures before x402 schema parsing", () => {
  assert.throws(
    () => decodePrivatePaySignature("A".repeat(32769)),
    (error) => error?.code === "PRIVATEPAY_PAYMENT_HEADER_TOO_LARGE" && error?.statusCode === 413,
  );
});

function magicBlockConfig() {
  return {
    privatePayPrivacyRail: "magicblock-private-ephemeral-rollup",
    privatePayFacilitatorUrl: "https://payments.magicblock.app",
    privatePayProviderUrl: "https://payments.magicblock.app",
    privatePayFacilitatorApiKey: "test-only",
    privatePayMerchantId: "2BJ4ezxqV9YJXc38D9duKBkdn4su4jE1beKUHwH663sL",
    privatePayMerchantCheckoutEnabled: true,
    privatePayEnabled: true,
    privatePayConfidentialMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    usdcMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    privatePayConformanceVerified: true,
    privatePayMainnetVerified: true,
    privatePayMerchantAccountsDelegated: true,
    privatePayPublicTraceVerified: true,
    privatePayProviderMetadataDisclosureVerified: true,
    privatePayE2eVerified: true,
    privatePayProviderHandle: "merchant-private-handle",
    privatePayProviderHandleVerified: true,
    privatePayPaymentIngress: "3PmgnzCQUaTwoQUMeEta4qED99q6xbF6TbPN1LcaEzAm",
    privatePayProviderWallet: "2BJ4ezxqV9YJXc38D9duKBkdn4su4jE1beKUHwH663sL",
    privatePayTreasurySplitVerified: true,
    privatePayRequirePaymentBoundQuote: false,
    privatePayPdaoGateEnabled: false,
    privatePayCluster: "mainnet-beta",
  };
}

function providerPayload() {
  return {
    x402Version: 2,
    resource: { url: "https://agents.privatedao.org/api/privatepay/conformance", description: "PrivatePAY x402 resource", mimeType: "application/json" },
    accepted: {
      scheme: "exact-magicblock",
      network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      asset: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      amount: "500000",
      payTo: "2BJ4ezxqV9YJXc38D9duKBkdn4su4jE1beKUHwH663sL",
      maxTimeoutSeconds: 60,
      extra: { paymentId: "a".repeat(64), payer: "BkNcuvQZr6392aZCwcGnB6SQptV6vhWa7syJs5fgLz6", merchantId: "2BJ4ezxqV9YJXc38D9duKBkdn4su4jE1beKUHwH663sL", cluster: "mainnet-private", settlement: "ephemeral-rollup" },
    },
    payload: { paymentId: "a".repeat(64), transaction: "AQ==" },
  };
}

test("MagicBlock x402 forwarding preserves the provider payment id and exact requirements", async () => {
  const calls = [];
  const payload = providerPayload();
  const fetchImpl = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body), authorization: options.headers.authorization, merchant: options.headers["X-Merchant-Id"] });
    return { ok: true, status: 200, async json() { return { isValid: true, success: true, transaction: "provider-signature" }; } };
  };
  const verify = await privatePayMagicBlockFacilitatorRequest(magicBlockConfig(), "verify", payload, fetchImpl);
  const settle = await privatePayMagicBlockFacilitatorRequest(magicBlockConfig(), "settle", payload, fetchImpl);
  assert.equal(verify.isValid, true);
  assert.equal(settle.success, true);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls.map((call) => call.url), [
    "https://payments.magicblock.app/v1/x402/verify",
    "https://payments.magicblock.app/v1/x402/settle",
  ]);
  assert.equal(calls[0].body.paymentRequirements.extra.paymentId, payload.accepted.extra.paymentId);
  assert.equal(calls[0].body.paymentPayload.payload.transaction, "AQ==");
  assert.equal(calls[0].authorization, "Bearer test-only");
  assert.equal(calls[0].merchant, magicBlockConfig().privatePayMerchantId);
});

test("MagicBlock PAYMENT-REQUIRED decoding rejects malformed challenge data", () => {
  const requirements = { x402Version: 2, accepts: [{ scheme: "exact-magicblock" }] };
  const encoded = Buffer.from(JSON.stringify(requirements)).toString("base64url");
  assert.deepEqual(decodePrivatePayRequiredHeader(encoded), requirements);
  assert.throws(() => decodePrivatePayRequiredHeader("not-json"), (error) => error?.code === "PRIVATEPAY_INVALID_PAYMENT_REQUIRED");
});
