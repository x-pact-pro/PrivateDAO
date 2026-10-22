import assert from "node:assert/strict";
import test from "node:test";
import { encodePaymentSignatureHeader } from "@x402/core/http";

process.env.NODE_ENV = "test";
process.env.AGENT_EXCHANGE_TEST_MODE = "true";
process.env.AGENT_EXCHANGE_ALLOW_TEST_STORAGE = "true";
process.env.AGENT_EXCHANGE_RPC_FIXTURE = "true";
process.env.PRIVATEPAY_ENABLED = "true";
process.env.PRIVATEPAY_PRIVACY_RAIL = "fixture-reviewed-mainnet-rail";
process.env.PRIVATEPAY_FACILITATOR_URL = "https://privatepay-fixture.example";
process.env.PRIVATEPAY_CONFIDENTIAL_MINT = "US517G5965aydkZ46HS38QLi7UQiSojurfbQfKCELFx";
process.env.PRIVATEPAY_CONFIDENTIAL_MINT_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
process.env.PRIVATEPAY_CONFORMANCE_VERIFIED = "true";
process.env.PRIVATEPAY_MAINNET_VERIFIED = "true";
process.env.PRIVATEPAY_RELATIONSHIP_PRIVACY_VERIFIED = "true";
process.env.PRIVATEPAY_AMOUNT_PRIVACY_VERIFIED = "true";
process.env.PRIVATEPAY_TIMING_PRIVACY_VERIFIED = "true";
process.env.PRIVATEPAY_E2E_VERIFIED = "true";
process.env.PRIVATEPAY_TREASURY_SPLIT_VERIFIED = "true";

const { handler, resetForTests } = await import("../src/handler.mjs");

function request(path, method = "GET", body, headers = {}) {
  return handler({
    requestContext: { http: { method, path } },
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("PrivatePAY job lifecycle verifies, settles, executes once, and redacts public payment data", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const target = String(url);
    if (target.endsWith("/verify")) {
      calls.push("verify");
      return new Response(JSON.stringify({ isValid: true }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (target.endsWith("/settle")) {
      calls.push("settle");
      return new Response(JSON.stringify({ success: true, transaction: "private-settlement-fixture" }), { status: 200, headers: { "content-type": "application/json" } });
    }
    const payload = JSON.parse(init.body || "{}");
    if (payload.method === "getAccountInfo")
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { value: null } }), { status: 200, headers: { "content-type": "application/json" } });
    throw new Error(`unexpected fixture request: ${target}`);
  };
  try {
    resetForTests();
    const created = await request("/api/jobs", "POST", {
      service_id: "verify.deep",
      payment_mode: "privatepay",
      input: { record: { lifecycle: "privatepay-fixture" } },
    });
    assert.equal(created.statusCode, 402);
    assert.match(created.headers["PAYMENT-REQUIRED"], /^[A-Za-z0-9+/=_-]+$/);
    const challenge = JSON.parse(created.body);
    assert.equal(challenge.error, "payment_required");
    assert.equal(challenge.payment_required.accepts[0].scheme, "privatepay");
    assert.equal(challenge.payment_required.accepts[0].amount, "300000");
    assert.equal(Object.hasOwn(challenge, "payment_intent"), false);
    const jobId = challenge.payment_required.resource.url.split("/api/jobs/")[1].split("/")[0];

    const intent = await request(`/api/jobs/${jobId}/payment-intent`);
    assert.equal(intent.statusCode, 200);
    const privateIntent = JSON.parse(intent.body);
    assert.equal(privateIntent.paymentMode, "privatepay");
    assert.equal(Object.hasOwn(privateIntent, "paymentIntent"), false);
    assert.match(privateIntent.submitPaymentUrl, /\/privatepay$/);

    const paymentSignature = encodePaymentSignatureHeader({
      x402Version: 2,
      resource: challenge.payment_required.resource,
      accepted: challenge.payment_required.accepts[0],
      payload: {
        signature: "fixture-signed-locally",
        request_id: challenge.request_id,
        provider_commitment: challenge.payment_required.accepts[0].extra.provider_commitment,
        amount_commitment: "b".repeat(64),
      },
    });
    const completed = await request(`/api/jobs/${jobId}/privatepay`, "POST", undefined, { "PAYMENT-SIGNATURE": paymentSignature });
    assert.equal(completed.statusCode, 200);
    const result = JSON.parse(completed.body);
    assert.equal(result.status, "completed");
    assert.equal(result.receipt.status, "VERIFIED");
    assert.equal(result.receipt.payment_mode, "privatepay");
    assert.equal(result.receipt.amount, 0);
    assert.equal(result.receipt.gross_amount, 0);
    assert.equal(result.receipt.payment_signature, null);
    assert.deepEqual(calls, ["verify", "settle"]);

    const publicJob = await request(`/api/jobs/${jobId}`);
    assert.equal(publicJob.statusCode, 200);
    assert.doesNotMatch(publicJob.body, /privatepay_requirements|privatepay_payment_required_header|private-settlement-fixture/);
    const publicJobBody = JSON.parse(publicJob.body);
    assert.equal(publicJobBody.payment_mode, "privatepay");
    assert.equal(publicJobBody.privacy_boundary, "service_identity_and_purchase_timing_redacted_from_public_job_status");
    assert.equal(Object.hasOwn(publicJobBody, "service_id"), false);
    assert.equal(Object.hasOwn(publicJobBody, "created_at"), false);

    const publicReceipt = await request(`/api/receipts/${result.receipt.receipt_id}`);
    assert.equal(publicReceipt.statusCode, 200);
    const publicReceiptBody = JSON.parse(publicReceipt.body);
    assert.equal(publicReceiptBody.service, "privatepay.x402");
    assert.equal(publicReceiptBody.job_id, null);
    assert.equal(publicReceiptBody.created_at, null);
    assert.equal(publicReceiptBody.completed_at, null);
    assert.equal(publicReceiptBody.target_network, null);
    assert.equal(publicReceiptBody.seller_agent_id, null);
    assert.equal(publicReceiptBody.evidence_hash, null);

    const mcpReceipt = await request("/mcp", "POST", {
      jsonrpc: "2.0",
      id: 11,
      method: "tools/call",
      params: { name: "get_receipt", arguments: { receipt_id: result.receipt.receipt_id } },
    });
    assert.equal(mcpReceipt.statusCode, 200);
    const mcpReceiptBody = JSON.parse(mcpReceipt.body).result.structuredContent;
    assert.equal(mcpReceiptBody.service, "privatepay.x402");
    assert.equal(mcpReceiptBody.job_id, null);
    assert.equal(mcpReceiptBody.created_at, null);
    assert.equal(mcpReceiptBody.evidence_hash, null);

    const humanReceipt = await request(`/receipts/${result.receipt.receipt_id}`);
    assert.equal(humanReceipt.statusCode, 200);
    assert.match(humanReceipt.body, /privatepay\.x402/);
    assert.doesNotMatch(humanReceipt.body, /verify\.deep|privatepay-fixture|solana-mainnet-beta|2026-/);
    const humanVerification = await request(`/verify/receipt/${result.receipt.receipt_id}`);
    assert.equal(humanVerification.statusCode, 200);
    assert.match(humanVerification.body, /privatepay\.x402/);
    assert.doesNotMatch(humanVerification.body, /verify\.deep|privatepay-fixture|solana-mainnet-beta|2026-/);

    const replay = await request(`/api/jobs/${jobId}/privatepay`, "POST", undefined, { "PAYMENT-SIGNATURE": paymentSignature });
    assert.equal(replay.statusCode, 200);
    assert.equal(JSON.parse(replay.body).receipt.receipt_id, result.receipt.receipt_id);
    assert.deepEqual(calls, ["verify", "settle"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("generic PrivatePAY x402 endpoint performs verify and settle with a redacted response", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  let facilitatorPayloads = [];
  globalThis.fetch = async (url, init = {}) => {
    const target = String(url);
    if (target.endsWith("/verify")) {
      calls.push("verify");
      facilitatorPayloads.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ isValid: true }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (target.endsWith("/settle")) {
      calls.push("settle");
      facilitatorPayloads.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ success: true, transaction: "raw-private-settlement", payer: "public-payer" }), { status: 200, headers: { "content-type": "application/json" } });
    }
    throw new Error(`unexpected fixture request: ${target}`);
  };
  try {
    resetForTests();
    const unpaid = await request("/api/privatepay/x402", "POST", { resource: "api://generic", provider_id: "provider-1", amount_base_units: "1000" });
    assert.equal(unpaid.statusCode, 402);
    const challenge = JSON.parse(unpaid.body);
    const signature = encodePaymentSignatureHeader({
      x402Version: 2,
      resource: challenge.x402.resource,
      accepted: challenge.x402.accepts[0],
      payload: {
        signature: "fixture-signed-generic",
        request_id: challenge.request_id,
        provider_commitment: challenge.x402.accepts[0].extra.provider_commitment,
        amount_commitment: "c".repeat(64),
      },
    });
    const paid = await request("/api/privatepay/x402", "POST", { resource: "api://generic", provider_id: "provider-1", amount_base_units: "1000" }, { "PAYMENT-SIGNATURE": signature });
    assert.equal(paid.statusCode, 200);
    const body = JSON.parse(paid.body);
    assert.equal(body.status, "paid");
    assert.match(body.payment_response.transaction, /^privatepay:[a-f0-9]{32}$/);
    assert.doesNotMatch(paid.body, /raw-private-settlement|public-payer|1000/);
    assert.match(paid.headers["PAYMENT-RESPONSE"], /^[A-Za-z0-9+/=_-]+$/);
    assert.deepEqual(calls, ["verify", "settle"]);
    assert.equal(Object.hasOwn(facilitatorPayloads[0].paymentRequirements, "accepts"), false);
    assert.equal(facilitatorPayloads[0].paymentRequirements.maxTimeoutSeconds, 300);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
