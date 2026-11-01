import assert from "node:assert/strict";
import test from "node:test";
import { encodePaymentRequiredHeader, encodePaymentSignatureHeader } from "@x402/core/http";

process.env.NODE_ENV = "test";
process.env.AGENT_EXCHANGE_TEST_MODE = "true";
process.env.AGENT_EXCHANGE_ALLOW_TEST_STORAGE = "true";
process.env.AGENT_EXCHANGE_RPC_FIXTURE = "true";
process.env.PRIVATEPAY_ENABLED = "true";
process.env.PRIVATEPAY_PRIVACY_RAIL = "magicblock-private-ephemeral-rollup";
process.env.PRIVATEPAY_FACILITATOR_URL = "https://privatepay-fixture.example";
process.env.PRIVATEPAY_CONFIDENTIAL_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
process.env.PRIVATEPAY_CONFIDENTIAL_MINT_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
process.env.PRIVATEPAY_CONFORMANCE_VERIFIED = "true";
process.env.PRIVATEPAY_MAINNET_VERIFIED = "true";
process.env.PRIVATEPAY_RELATIONSHIP_PRIVACY_VERIFIED = "true";
process.env.PRIVATEPAY_AMOUNT_PRIVACY_VERIFIED = "true";
process.env.PRIVATEPAY_TIMING_PRIVACY_VERIFIED = "true";
process.env.PRIVATEPAY_E2E_VERIFIED = "true";
process.env.PRIVATEPAY_TREASURY_SPLIT_VERIFIED = "true";
process.env.PRIVATEPAY_PUBLIC_TRACE_VERIFIED = "true";
process.env.PRIVATEPAY_PROVIDER_METADATA_DISCLOSURE_VERIFIED = "true";
process.env.PRIVATEPAY_MERCHANT_ACCOUNTS_DELEGATED = "true";
process.env.PRIVATEPAY_PDAO_GATE_ENABLED = "false";
process.env.PRIVATEPAY_REQUIRE_ONCHAIN_SETTLEMENT_PROOF = "false";
process.env.PRIVATEPAY_MERCHANT_CHECKOUT_ENABLED = "true";
process.env.PRIVATEPAY_FACILITATOR_API_KEY = "fixture-merchant-key";
process.env.PRIVATEPAY_PROVIDER_HANDLE = "provider@magicblock.id";
process.env.PRIVATEPAY_PROVIDER_HANDLE_VERIFIED = "true";
process.env.PRIVATEPAY_PAYMENT_INGRESS = "So11111111111111111111111111111111111111112";

const { handler, resetForTests } = await import("../src/handler.mjs");

function request(path, method = "GET", body, headers = {}) {
  return handler({
    requestContext: { http: { method, path } },
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("PrivatePAY product page separates free demo, live pricing, privacy scope, and x402 API flow", async () => {
  resetForTests();
  const response = await request("/services/privatepay-x402");
  assert.equal(response.statusCode, 200);
  assert.match(response.body, /Free demo/);
  assert.match(response.body, /no wallet.*no charge/i);
  assert.match(response.body, /Live payment/);
  assert.match(response.body, /2\.5% fee/);
  assert.match(response.body, /PAYMENT-SIGNATURE/);
  assert.match(response.body, /payment_id/);
  assert.match(response.body, /evidence_hash/);
  assert.match(response.body, /What PrivatePAY keeps private/);
  assert.match(response.body, /MagicBlock.s private rail/);
  assert.match(response.body, /Choose wallet and pay/);
  assert.match(response.body, /id="privatePayWallets"/);
  assert.match(response.body, /Open Phantom Mobile/);
  assert.match(response.body, /Open Solflare Mobile/);
  assert.match(response.body, /Choose the wallet you want to use/);
  assert.match(response.body, /typeof provider\.signTransaction==='function'/);
  assert.match(response.body, /Solflare/);
  assert.match(response.body, /Phantom/);
  assert.match(response.body, /wallet-standard:register-wallet/);
  assert.match(response.body, /temporarily unavailable|HTTP/);
  assert.doesNotMatch(response.body, /claim.*example/i);
});

test("PrivatePAY wallet balance lookup is read-only and rejects invalid wallets", async () => {
  resetForTests();
  const response = await handler({
    requestContext: { http: { method: "GET", path: "/api/privatepay/wallet-balance" } },
    queryStringParameters: { wallet: "not-a-solana-wallet" },
    headers: {},
  });
  assert.equal(response.statusCode, 400);
  assert.match(response.body, /valid Solana wallet|invalid Solana wallet/i);
});

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
    assert.equal(challenge.payment_required.accepts[0].scheme, "exact-magicblock");
    assert.equal(challenge.payment_required.accepts[0].amount, "550000");
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
        paymentId: challenge.payment_required.accepts[0].extra.paymentId,
        transaction: "AQID",
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
    if (target.endsWith("/v1/payments")) {
      return new Response(JSON.stringify({ id: "a".repeat(64), status: "created" }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (target.includes("/v1/x402/payments/") && target.endsWith("/pay")) {
      const accepted = {
        scheme: "exact-magicblock",
        network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
        asset: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        amount: "1000",
        payTo: "2BJ4ezxqV9YJXc38D9duKBkdn4su4jE1beKUHwH663sL",
        maxTimeoutSeconds: 60,
        extra: { paymentId: "a".repeat(64), cluster: "mainnet-private", settlement: "ephemeral-rollup", transaction: "AQID" },
      };
      return new Response(JSON.stringify({}), { status: 402, headers: { "content-type": "application/json", "PAYMENT-REQUIRED": encodePaymentRequiredHeader({ x402Version: 2, resource: { url: "api://generic" }, accepts: [accepted] }) } });
    }
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
    const input = { payer: "BkNcuvQZr6392aZCwcGnB6SQptV6vhWa7syJs5fgLz6", resource: "api://generic", provider_id: "provider-1", amount_base_units: "1000" };
    const unpaid = await request("/api/privatepay/x402", "POST", input);
    assert.equal(unpaid.statusCode, 402);
    const challenge = JSON.parse(unpaid.body);
    const paymentRequired = JSON.parse(Buffer.from(unpaid.headers["PAYMENT-REQUIRED"], "base64url").toString("utf8"));
    const signature = encodePaymentSignatureHeader({
      x402Version: 2,
      resource: paymentRequired.resource,
      accepted: paymentRequired.accepts[0],
      payload: {
        transaction: "AQID",
      },
    });
    const paid = await request("/api/privatepay/x402", "POST", input, { "PAYMENT-SIGNATURE": signature });
    assert.equal(paid.statusCode, 200);
    const body = JSON.parse(paid.body);
    assert.equal(body.status, "paid");
    assert.match(body.payment_response.transaction, /^privatepay:[a-f0-9]{32}$/);
    assert.doesNotMatch(paid.body, /raw-private-settlement|public-payer|1000/);
    assert.match(paid.headers["PAYMENT-RESPONSE"], /^[A-Za-z0-9+/=_-]+$/);
    assert.deepEqual(calls, ["verify", "settle"]);
    assert.equal(Object.hasOwn(facilitatorPayloads[0].paymentRequirements, "accepts"), false);
    assert.equal(facilitatorPayloads[0].paymentRequirements.amount, "1000");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
