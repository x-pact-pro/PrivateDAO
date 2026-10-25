import assert from "node:assert/strict";
import test from "node:test";
import { encodePaymentSignatureHeader } from "@x402/core/http";

process.env.NODE_ENV = "test";
process.env.AGENT_EXCHANGE_TEST_MODE = "true";
process.env.AGENT_EXCHANGE_ALLOW_TEST_STORAGE = "true";
process.env.AGENT_EXCHANGE_MCP_FETCH_FIXTURE = "true";
process.env.PRIVATEPAY_ENABLED = "true";
process.env.PRIVATEPAY_PRIVACY_RAIL = "magicblock-private-ephemeral-rollup";
process.env.PRIVATEPAY_FACILITATOR_URL = "https://payments.magicblock.app";
process.env.PRIVATEPAY_FACILITATOR_API_KEY = "fixture-merchant-key";
process.env.PRIVATEPAY_CONFIDENTIAL_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
process.env.PRIVATEPAY_PROVIDER_WALLET = "2BJ4ezxqV9YJXc38D9duKBkdn4su4jE1beKUHwH663sL";
process.env.PRIVATEPAY_PROVIDER_HANDLE = "provider@magicblock.id";
process.env.PRIVATEPAY_PROVIDER_HANDLE_VERIFIED = "true";
process.env.PRIVATEPAY_PAYMENT_INGRESS = "So11111111111111111111111111111111111111112";
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

const { handler, resetForTests } = await import("../src/handler.mjs");

const request = (path, method = "GET", body, headers = {}) => handler({
  requestContext: { http: { method, path } },
  headers,
  body: body === undefined ? undefined : JSON.stringify(body),
});

test("PrivatePAY prepare REST route exposes unsigned deposit and withdrawal legs", async () => {
  const originalFetch = globalThis.fetch;
  const seen = [];
  globalThis.fetch = async (url, options = {}) => {
    const target = String(url);
    if (target.endsWith("/v1/spl/deposit") || target.endsWith("/v1/spl/withdraw")) {
      seen.push({ target, body: JSON.parse(options.body || "{}") });
      const kind = target.endsWith("/deposit") ? "deposit" : "withdraw";
      return new Response(JSON.stringify({ kind, version: "legacy", transactionBase64: "AQ==", requiredSigners: ["11111111111111111111111111111111"], sendTo: "base" }), { status: 200, headers: { "content-type": "application/json" } });
    }
    throw new Error(`unexpected fixture request: ${target}`);
  };
  try {
    resetForTests();
    const input = { request_id: "pp_0123456789abcdef0123456789abcdef", payer: "11111111111111111111111111111111", amount_base_units: "1000" };
    const deposit = await request("/api/privatepay/x402/prepare", "POST", { ...input, phase: "deposit" });
    const withdrawal = await request("/api/privatepay/x402/prepare", "POST", { ...input, phase: "withdraw" });
    assert.equal(deposit.statusCode, 200, deposit.body);
    assert.equal(withdrawal.statusCode, 200, withdrawal.body);
    assert.equal(JSON.parse(deposit.body).phase, "deposit");
    assert.equal(JSON.parse(withdrawal.body).phase, "withdraw");
    assert.deepEqual(seen.map((item) => item.target), ["https://payments.magicblock.app/v1/spl/deposit", "https://payments.magicblock.app/v1/spl/withdraw"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("external PrivatePAY lifecycle keeps public receipts redacted and provider audit scoped", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    const target = String(url);
    if (target.endsWith("/v1/x402/verify"))
      return new Response(JSON.stringify({ isValid: true }), { status: 200, headers: { "content-type": "application/json" } });
    if (target.endsWith("/v1/x402/settle"))
      return new Response(JSON.stringify({ success: true, transaction: "private-tx", amount: "30000", feePayer: "fee-payer-private" }), { status: 200, headers: { "content-type": "application/json" } });
    const payload = JSON.parse(options.body || "{}");
    if (payload.method === "initialize")
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: payload.id, result: { protocolVersion: "2025-06-18", serverInfo: { name: "PrivatePAY Seller", version: "1.0.0" }, capabilities: { tools: {} } } }), { status: 200, headers: { "content-type": "application/json", "mcp-session-id": "fixture-session" } });
    if (payload.method === "notifications/initialized") return new Response("", { status: 202 });
    if (payload.method === "tools/list")
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: payload.id, result: { tools: [{ name: "read", description: "Safe read-only tool", inputSchema: { type: "object" }, annotations: { readOnlyHint: true } }] } }), { status: 200, headers: { "content-type": "application/json", "mcp-session-id": "fixture-session" } });
    if (payload.method === "tools/call")
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: payload.id, result: { structuredContent: { ok: true } } }), { status: 200, headers: { "content-type": "application/json", "mcp-session-id": "fixture-session" } });
    if (payload.method === "getTokenAccountsByOwner")
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: payload.id, result: { value: [{ pubkey: "2BJ4ezxqV9YJXc38D9duKBkdn4su4jE1beKUHwH663sL" }] } }), { status: 200, headers: { "content-type": "application/json" } });
    throw new Error(`unexpected fixture request: ${target}`);
  };
  try {
    resetForTests();
    const seller = JSON.parse((await request("/api/registry/register", "POST", { name: "PrivatePAY Seller", mcp_url: "https://example.com/mcp/privatepay" })).body);
    const updated = await request(`/api/registry/agents/${seller.id}/services`, "PATCH", {
      owner_token: seller.owner_token,
      services: [{ id: "read", tool: "read", title: "Private read", description: "Paid read-only tool", price: 0.03, asset: "USDC", network: "solana-mainnet-beta" }],
      accepted_assets: ["USDC"],
      payout: { address: "2BJ4ezxqV9YJXc38D9duKBkdn4su4jE1beKUHwH663sL", network: "solana-mainnet-beta", asset: "USDC" },
    });
    assert.equal(updated.statusCode, 200);
    const listing = await request("/api/marketplace/seller-listings/quote", "POST", { agent_id: seller.id, owner_token: seller.owner_token, tier: "free", accept_terms: true, terms_version: "seller-marketplace-v1" });
    assert.equal(listing.statusCode, 201, listing.body);
    const serviceId = `external.${seller.id}.read`;
    const created = await request("/api/external/jobs", "POST", { service_id: serviceId, payment_mode: "privatepay", input: { query: "private" } });
    assert.equal(created.statusCode, 402, created.body);
    const challenge = JSON.parse(created.body);
    const accepted = challenge.payment_required.accepts[0];
    const signature = encodePaymentSignatureHeader({
      x402Version: 2,
      resource: challenge.payment_required.resource,
      accepted,
      payload: {
        paymentId: accepted.extra.paymentId,
        transaction: Buffer.from("fixture-private-transfer").toString("base64"),
      },
    });
    const completed = await request(`/api/jobs/${challenge.payment_required.resource.url.split("/api/jobs/")[1].split("/")[0]}/privatepay`, "POST", undefined, { "PAYMENT-SIGNATURE": signature });
    assert.equal(completed.statusCode, 200, completed.body);
    const body = JSON.parse(completed.body);
    assert.equal(body.receipt.amount, 0);
    assert.equal(body.receipt.gross_amount, 0);
    assert.equal(body.receipt.payment_signature, null);
    assert.equal(body.receipt.service, "privatepay.x402");
    assert.equal(body.receipt.job_id, null);
    assert.equal(body.receipt.created_at, null);
    assert.equal(body.receipt.completed_at, null);
    assert.equal(body.receipt.target_network, null);
    assert.equal(body.receipt.seller_agent_id, null);
    assert.equal(body.receipt.seller_service_id, null);
    assert.equal(body.receipt.evidence_hash, null);
    assert.equal(Object.hasOwn(body.receipt, "seller_settlement"), false);
    assert.doesNotMatch(completed.body, /fixture-private-transfer|fee-payer-private|30000/);
    const audit = await request(`/api/seller/dashboard/${seller.id}/privatepay-audit`, "GET", undefined, { "x-pdao-owner-token": seller.owner_token });
    assert.equal(audit.statusCode, 200);
    const auditBody = JSON.parse(audit.body);
    assert.equal(auditBody.visibility, "provider_only");
    assert.equal(auditBody.records.length, 1);
    assert.equal(auditBody.records[0].settlement.transaction, "private-tx");
    assert.equal(auditBody.records[0].settlement.feePayer, "fee-payer-private");
    assert.equal(auditBody.records[0].privacy_boundary.payment_signature_exposed, false);
    assert.equal(Object.hasOwn(auditBody.records[0], "execution_input"), false);
    const dashboard = await request(`/api/seller/dashboard/${seller.id}`, "GET", undefined, { "x-pdao-owner-token": seller.owner_token });
    assert.equal(dashboard.statusCode, 200);
    const sales = JSON.parse(dashboard.body).sales;
    assert.equal(sales.settlement_count, 1);
    assert.equal(sales.gross_amount, 0.03);
    assert.equal(sales.platform_fee_amount, 0.003);
    assert.equal(sales.seller_net_amount, 0.027);
    assert.doesNotMatch(completed.body, /0\.03|0\.003|0\.027/);
    const unauthorized = await request(`/api/seller/dashboard/${seller.id}/privatepay-audit`);
    assert.equal(unauthorized.statusCode, 403);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
