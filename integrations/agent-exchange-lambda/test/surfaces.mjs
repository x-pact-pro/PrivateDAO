import assert from "node:assert/strict";
import test from "node:test";
import { handler, paymentStatusCode, publicRegistryAgent, resetForTests } from "../src/handler.mjs";
import { SERVICES } from "../src/catalog.mjs";

const request = (path, method = "GET", body, headers = {}) =>
  handler({
    requestContext: { http: { method, path } },
    body: body ? JSON.stringify(body) : undefined,
    headers,
  });

test("human root is HTML while machine surfaces remain available", async () => {
  resetForTests();
  const root = await request("/");
  assert.equal(root.statusCode, 200);
  assert.match(root.headers["content-type"], /^text\/html/);
  assert.match(root.body, /PrivateDAO Agents/);
  assert.match(root.body, /Evidence for/);
  assert.match(root.body, /DISCOVER/);
  assert.match(root.body, /IBM watsonx/);
  assert.match(root.body, /pdao-language-picker/);
  assert.equal(root.headers["x-content-type-options"], "nosniff");
  assert.equal(root.headers["x-frame-options"], "DENY");
  assert.match(root.body, /href="https:\/\/privatedao\.org\/\?lang=en"/);
  const head = await request("/", "HEAD");
  assert.equal(head.statusCode, 200);
  assert.equal(head.body, "");
  assert.match(head.headers["content-type"], /^text\/html/);
  for (const language of ["en", "ar", "ru", "uk", "pl", "hi", "ko", "es", "it"]) {
    assert.match(root.body, new RegExp(`value="${language}"`));
  }
  const marketplace = await request("/marketplace");
  assert.match(marketplace.body, /https:\/\/privatedao\.org\/\?lang=en/);
  const integrationPage = await request("/integrations");
  assert.equal(integrationPage.statusCode, 200);
  assert.match(integrationPage.body, /Recognize the stack at a glance/);
  assert.doesNotMatch(integrationPage.body, /https:\/\/github\.com\/marketplace\/privatedao-agent-exchange/);
  // GitHub Marketplace publication is managed separately from the GitHub App runtime.\n  // Keep every public Agent Exchange surface away from the dead Marketplace URL until GitHub publishes it.\n  assert.doesNotMatch(root.body, /https:\/\/github\.com\/marketplace\/privatedao-agent-exchange/);\n  assert.doesNotMatch(marketplace.body, /https:\/\/github\.com\/marketplace\/privatedao-agent-exchange/);
  assert.match(integrationPage.body, /https:\/\/github\.com\/apps\/privatedao-agent-exchange/);
  const sellerPortal = await request("/sellers");
  assert.equal(sellerPortal.statusCode, 200);
  assert.match(sellerPortal.headers["content-security-policy"], /frame-ancestors 'none'/);
  assert.equal(sellerPortal.headers["x-content-type-options"], "nosniff");
  assert.equal(sellerPortal.headers["referrer-policy"], "no-referrer");
  assert.match(sellerPortal.body, /id="listingFee"/);
  assert.match(sellerPortal.body, /id="platformFee"/);
  assert.match(sellerPortal.body, /id="serviceLimit"/);
  assert.match(sellerPortal.body, /id="toolPicker"/);
  assert.match(sellerPortal.body, /id="metadataFile"/);
  assert.match(sellerPortal.body, /id="chooseMetadata"/);
  assert.match(sellerPortal.body, /metadataFile\.onchange=async/);
  assert.match(sellerPortal.body, /id="rotateCredential"/);
  assert.match(sellerPortal.body, /loadMarketplacePolicy/);
  assert.match(sellerPortal.body, /id="metadataFile"/);
  assert.match(sellerPortal.body, /viewport/);
  assert.match(sellerPortal.body, /max-width:650px/);
  assert.match(sellerPortal.body, /Select read-only commercial tools/);
  assert.match(sellerPortal.body, /!tool\.annotations\|\|tool\.annotations\.readOnlyHint!==false/);
  assert.match(sellerPortal.body, /'"':"&quot;"/);
  assert.match(sellerPortal.body, /api\/marketplace\/policy/);
  assert.match(sellerPortal.body, /additional_service_fee_usd:0/);
  assert.match(sellerPortal.body, /response\.ok&&result\.status==="paid"/);
  assert.match(sellerPortal.body, /Do not submit another payment/);
  assert.match(sellerPortal.body, /state\.paymentSignature=sent\.signature/);
  assert.match(sellerPortal.body, /Retry verification \(do not pay again\)/);
  assert.match(sellerPortal.body, /retry\.dataset\.retryBound/);
  assert.match(sellerPortal.body, /new MutationObserver\(bindPaymentRetry\)/);
  for (const asset of ["ibm-watsonx.svg", "openvino.svg", "mongodb.svg", "github.svg"]) {
    assert.match(root.body, new RegExp(`/assets/ecosystem/${asset}`), asset);
    assert.match(marketplace.body, new RegExp(`/assets/ecosystem/${asset}`), asset);
    assert.match(integrationPage.body, new RegExp(`/assets/ecosystem/${asset}`), asset);
    const response = await request(`/assets/ecosystem/${asset}`);
    assert.equal(response.statusCode, 200, asset);
    assert.match(response.body, /<svg\b/, asset);
  }
  for (const surface of [root.body, marketplace.body, integrationPage.body])
    assert.match(surface, /\/assets\/brand\/privatedao-official-logo\.jpg/);
  assert.match(integrationPage.body, /\/assets\/brand\/privatedao-official-banner\.jpg/);
  for (const asset of ["privatedao-official-logo.jpg", "privatedao-official-banner.jpg"]) {
    const response = await request(`/assets/brand/${asset}`);
    assert.equal(response.statusCode, 200, asset);
    assert.equal(response.headers["content-type"], "image/jpeg", asset);
    assert.equal(response.isBase64Encoded, true, asset);
  }
  for (const client of ["openai-knot.svg", "claude-symbol.svg", "grok-symbol.svg", "openclaw-symbol.png"]) {
    assert.match(root.body, new RegExp(`/assets/clients/${client}`), client);
    assert.match(marketplace.body, new RegExp(`/assets/clients/${client}`), client);
  }
  const catalog = JSON.parse((await request("/api/services")).body);
  const tokenService = catalog.services.find((service) => service.id === "token.intelligence");
  assert.equal(tokenService.payment_network, "solana-mainnet-beta");
  assert.deepEqual(tokenService.supported_target_networks, ["solana-mainnet-beta", "ethereum-mainnet", "base-mainnet", "arbitrum-mainnet"]);
  assert.equal(tokenService.input_schema.type, "object");
  assert.equal(tokenService.output_schema.type, "object");
  assert.deepEqual(tokenService.input_schema.required, ["network"]);
  assert.ok(tokenService.input_schema.anyOf.some((branch) => branch.required.includes("asset")));
  const walletService = catalog.services.find((service) => service.id === "wallet.intelligence");
  assert.deepEqual(walletService.input_schema.required, ["network"]);
  assert.ok(walletService.input_schema.anyOf.some((branch) => branch.required.includes("wallet")));
  const portfolioService = catalog.services.find((service) => service.id === "portfolio.intelligence");
  assert.deepEqual(portfolioService.input_schema.properties.assets.minItems, 1);
  const simulationService = catalog.services.find((service) => service.id === "transaction.simulate");
  assert.ok(simulationService.input_schema.anyOf.some((branch) => branch.required.includes("transaction")));
  assert.equal(simulationService.input_schema.anyOf.some((branch) => branch.required.includes("hash")), false);
  const inspectService = catalog.services.find((service) => service.id === "contract.inspect");
  assert.ok(inspectService.input_schema.anyOf.some((branch) => branch.required.includes("program")));
  const launchService = catalog.services.find((service) => service.id === "launch.check");
  assert.ok(launchService.input_schema.anyOf.some((branch) => branch.required.includes("mint")));
  for (const serviceId of [
    "token.intelligence",
    "wallet.intelligence",
    "risk.score",
    "transaction.simulate",
    "swap.quote",
    "market.snapshot",
  ]) {
    const service = catalog.services.find((candidate) => candidate.id === serviceId);
    assert.ok(service, `${serviceId} must be discoverable`);
    assert.equal(service.payment_network, "solana-mainnet-beta", `${serviceId} payment rail`);
    assert.ok(Array.isArray(service.supported_target_networks), `${serviceId} target network metadata`);
    assert.equal(service.input_schema.type, "object", `${serviceId} input schema`);
    assert.equal(service.output_schema.type, "object", `${serviceId} output schema`);
    assert.match(service.estimated_completion_behavior, /read_only/);
  }
  const partners = await request("/partners");
  assert.equal(partners.statusCode, 200);
  assert.match(partners.body, /Featured Partners/);
  const partnerApi = await request("/api/marketplace/partners");
  assert.equal(partnerApi.statusCode, 200);
  assert.deepEqual(JSON.parse(partnerApi.body).partners, []);
  for (const path of ["/agent-registry/register", "/pay/surface-test"]) {
    const response = await request(path);
    assert.equal(response.statusCode, 200, path);
    assert.match(response.body, /pdao-language-picker/, path);
  }
  assert.doesNotMatch(root.body, /\"status\":\"ok\"/);

  for (const path of [
    "/api/health",
    "/.well-known/agent-card.json",
    "/openapi.json",
    "/api/services",
    "/api/acquisition",
  ]) {
    const response = await request(path);
    assert.equal(response.statusCode, 200, path);
    assert.match(response.headers["content-type"], /^application\/json/, path);
  }
  const openapi = JSON.parse((await request("/openapi.json")).body);
  assert.ok(openapi.paths["/api/admin/registry/agents/{agentId}/owner-token/rotate"]);
  const providers = await request("/api/providers/status");
  assert.equal(providers.statusCode, 200);
  assert.ok(JSON.parse(providers.body).providers.some((provider) => provider.provider === "github"));
  const integrations = await request("/api/integrations");
  assert.equal(integrations.statusCode, 200);
  assert.equal(JSON.parse(integrations.body).integrations.length, 6);
  const githubService = catalog.services.find((service) => service.id === "github.repository");
  assert.ok(githubService.input_schema.anyOf.some((branch) => branch.required.includes("repository")));
  assert.equal((await request("/api/revenue")).statusCode, 404);
  assert.equal((await request("/api/treasury/status")).statusCode, 404);
});

test("agreements require the declared buyer and the production USDC rail", async () => {
  resetForTests();
  const unsupported = await request("/api/agreements", "POST", {
    buyerAgent: "buyer-fixture",
    providerAgent: "provider-fixture",
    service: "synthetic.service",
    price: 1,
    asset: "SOL",
  });
  assert.equal(unsupported.statusCode, 400);

  const created = await request("/api/agreements", "POST", {
    buyerAgent: "buyer-fixture",
    providerAgent: "provider-fixture",
    service: "synthetic.service",
    price: 1,
    asset: "USDC",
  });
  assert.equal(created.statusCode, 201);
  const agreement = JSON.parse(created.body);

  const missingBuyer = await request(`/api/agreements/${agreement.id}/accept`, "POST", {});
  assert.equal(missingBuyer.statusCode, 400);
  const wrongBuyer = await request(`/api/agreements/${agreement.id}/accept`, "POST", { buyerAgent: "other-fixture" });
  assert.equal(wrongBuyer.statusCode, 403);
  const accepted = await request(`/api/agreements/${agreement.id}/accept`, "POST", { buyerAgent: "buyer-fixture" });
  assert.equal(accepted.statusCode, 200);
  assert.equal(JSON.parse(accepted.body).status, "awaiting_payment");
});

test("agreements use the persisted marketplace platform fee policy", async () => {
  process.env.AGENT_EXCHANGE_TEST_ADMIN_TOKEN = "test-admin-token";
  resetForTests();
  try {
    const updated = await request("/api/admin/marketplace/policy", "PATCH", { platform_fee_bps: 900 }, { "x-pdao-admin-smoke": "test-admin-token" });
    assert.equal(updated.statusCode, 200, updated.body);
    const created = await request("/api/agreements", "POST", {
      buyerAgent: "buyer-policy-fixture",
      providerAgent: "provider-policy-fixture",
      service: "synthetic.service",
      price: 1,
      asset: "USDC",
    });
    assert.equal(created.statusCode, 201, created.body);
    const agreement = JSON.parse(created.body);
    assert.equal(agreement.platformFeeBps, 900);
    assert.equal(agreement.protocolFee, 0.09);
    assert.equal(agreement.providerAmount, 0.91);
  } finally {
    delete process.env.AGENT_EXCHANGE_TEST_ADMIN_TOKEN;
  }
});

test("legacy admin listings cannot advertise an unsupported payment asset", async () => {
  process.env.AGENT_EXCHANGE_TEST_ADMIN_TOKEN = "test-admin-token";
  resetForTests();
  const response = await request("/api/marketplace/listings", "POST", {
    agentId: "missing-fixture",
    service: "synthetic.service",
    endpoint: "https://example.com/mcp",
    asset: "SOL",
  }, { "x-pdao-admin-smoke": "test-admin-token" });
  assert.equal(response.statusCode, 400);
  delete process.env.AGENT_EXCHANGE_TEST_ADMIN_TOKEN;
});

test("malformed JSON returns a stable public error without parser internals", async () => {
  resetForTests();
  const response = await handler({ requestContext: { http: { method: "POST", path: "/" } }, body: "need_fuck=yes" });
  assert.equal(response.statusCode, 400);
  assert.match(response.body, /invalid JSON request body/);
  assert.doesNotMatch(response.body, /No number after minus sign|Unexpected token/);
});

test("MCP upstream errors are sanitized without exposing provider details", async () => {
  const originalFetch = global.fetch;
  resetForTests();
  global.fetch = async () => { throw new Error("Solana RPC 401 https://secret-provider.example/key=super-secret"); };
  try {
    const response = await request("/mcp", "POST", { jsonrpc: "2.0", id: 7, method: "tools/call", params: { name: "network_stats", arguments: {} } });
    const body = JSON.parse(response.body);
    assert.equal(body.result.isError, true);
    assert.equal(body.result.structuredContent.error, "upstream service temporarily unavailable");
    assert.doesNotMatch(response.body, /secret-provider|super-secret/);
  } finally {
    global.fetch = originalFetch;
  }
});

test("A2A upstream errors are sanitized without exposing provider details", async () => {
  const originalFetch = global.fetch;
  resetForTests();
  global.fetch = async () => { throw new Error("DynamoDB ValidationException: The provided key element does not match the schema; table=secret-table"); };
  try {
    const response = await request("/a2a", "POST", {
      jsonrpc: "2.0",
      id: 8,
      method: "message/send",
      params: { message: { metadata: { service_id: "verify.basic", input: { mint: "So11111111111111111111111111111111111111112", network: "solana-mainnet-beta" } } } },
    });
    const body = JSON.parse(response.body);
    assert.equal(response.statusCode, 502);
    assert.equal(body.error.code, -32000);
    assert.equal(body.error.message, "upstream service temporarily unavailable");
    assert.doesNotMatch(response.body, /ValidationException|secret-table|provided key element/i);
  } finally {
    global.fetch = originalFetch;
  }
});

test("a free job resolves to a public human receipt and verification page", async () => {
  resetForTests();
  const created = await request("/api/jobs", "POST", {
    service_id: "verify.basic",
    input: { record: { claim: "surface-test" } },
  });
  assert.equal(created.statusCode, 200);
  const payload = JSON.parse(created.body);
  assert.equal(payload.status, "completed");
  assert.match(payload.receipt.public_url, /\/receipts\//);
  assert.match(payload.receipt.verification_url, /\/verify\/receipt\//);
  for (const path of [
    new URL(payload.receipt.public_url).pathname,
    new URL(payload.receipt.verification_url).pathname,
    new URL(payload.receipt.job_url).pathname,
  ]) {
    const response = await request(path);
    assert.equal(response.statusCode, 200, path);
    assert.match(response.headers["content-type"], /^text\/html/);
    assert.match(response.body, /Receipt/);
  }
});

test("paid jobs validate before quoting and separate payment from target network", async () => {
  resetForTests();
  const quote = await request("/api/jobs", "POST", {
    service_id: "agent.research.report",
    input: { network: "ethereum-mainnet", asset: "0x0000000000000000000000000000000000000001" },
  });
  assert.equal(quote.statusCode, 402);
  const quoteBody = JSON.parse(quote.body);
  assert.equal(quoteBody.payment_intent.network, "solana-mainnet-beta");
  assert.equal(quoteBody.payment_intent.target_network, "ethereum-mainnet");

  const invalidNetwork = await request("/api/jobs", "POST", {
    service_id: "agent.research.report",
    input: { network: "unsupported-mainnet", asset: "0x0000000000000000000000000000000000000001" },
  });
  assert.equal(invalidNetwork.statusCode, 400);
  assert.doesNotMatch(invalidNetwork.body, /payment_intent/);

  const invalidAsset = await request("/api/jobs", "POST", {
    service_id: "agent.research.report",
    input: { network: "ethereum-mainnet", asset: "not-an-address" },
  });
  assert.equal(invalidAsset.statusCode, 400);
  assert.doesNotMatch(invalidAsset.body, /payment_intent/);
  const unsupportedEvm = await request("/api/jobs", "POST", {
    service_id: "launch.check",
    input: { network: "ethereum-mainnet", asset: "0x0000000000000000000000000000000000000001" },
  });
  assert.equal(unsupportedEvm.statusCode, 400);
  assert.match(unsupportedEvm.body, /launch\.check is not implemented on ethereum-mainnet/);
  assert.doesNotMatch(unsupportedEvm.body, /payment_intent/);
});

test("transaction simulation rejects a transaction hash before payment", async () => {
  resetForTests();
  const response = await request("/api/jobs", "POST", {
    service_id: "transaction.simulate",
    input: {
      network: "ethereum-mainnet",
      hash: "0x" + "1".repeat(64),
    },
  });
  assert.equal(response.statusCode, 400);
  assert.match(response.body, /unsigned transaction data is required for simulation/);
});

test("every paid job retains its validated input for post-payment execution", async () => {
  resetForTests();
  const created = await request("/api/jobs", "POST", {
    service_id: "forensics.trace",
    input: { wallet: "11111111111111111111111111111111", limit: 3 },
  });
  assert.equal(created.statusCode, 402);
  const quote = JSON.parse(created.body);
  assert.match(quote.payment_intent.jobId, /^job_/);
  const persisted = await request(`/api/jobs/${quote.payment_intent.jobId}`);
  assert.equal(persisted.statusCode, 200);
  const publicStatus = JSON.parse(persisted.body);
  assert.equal(publicStatus.execution_input, undefined);
  assert.equal(publicStatus.target_network, null);
  assert.match(publicStatus.input_hash, /^[a-f0-9]{64}$/);
});

test("service requests normalize accepted network aliases before quoting", async () => {
  resetForTests();
  const created = await request("/api/jobs", "POST", {
    service_id: "research.asset",
    input: { network: "ethereum:mainnet", asset: "0x0000000000000000000000000000000000000001" },
  });
  assert.equal(created.statusCode, 402);
  const body = JSON.parse(created.body);
  assert.equal(body.payment_intent.target_network, "ethereum-mainnet");
});

test("paid agent matching remains behind the paid job flow", async () => {
  resetForTests();
  const response = await request("/api/jobs", "POST", {
    service_id: "agent.match",
    input: { capabilities: ["chains"], network: "solana" },
  });
  assert.equal(response.statusCode, 402);
  assert.equal(JSON.parse(response.body).payment_intent.network, "solana-mainnet-beta");
});

test("payment cannot replace the input bound to a paid quote", async () => {
  resetForTests();
  const created = await request("/api/jobs", "POST", {
    service_id: "forensics.trace",
    input: { wallet: "11111111111111111111111111111111", limit: 3 },
  });
  const jobId = JSON.parse(created.body).payment_intent.jobId;
  const tampered = await request(`/api/jobs/${jobId}/payment`, "POST", {
    signature: "not-a-real-solana-signature",
    input: { wallet: "11111111111111111111111111111111", limit: 99 },
  });
  assert.equal(tampered.statusCode, 400);
  assert.match(tampered.body, /input does not match/);
});

test("every catalog capability has a stable detail page", async () => {
  resetForTests();
  for (const service of SERVICES) {
    const response = await request(`/services/${service.id.replaceAll(".", "-")}`);
    assert.equal(response.statusCode, 200, service.id);
    assert.match(response.headers["content-type"], /^text\/html/, service.id);
    assert.match(response.body, new RegExp(service.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), service.id);
  }
});

test("crawler files expose the intended public surfaces", async () => {
  resetForTests();
  const robots = await request("/robots.txt");
  assert.match(robots.body, /Sitemap: https:\/\/agents\.privatedao\.org\/sitemap\.xml/);
  const sitemap = await request("/sitemap.xml");
  assert.equal(sitemap.statusCode, 200);
  assert.match(sitemap.headers["content-type"], /^application\/xml/);
  assert.match(sitemap.body, /<loc>https:\/\/agents\.privatedao\.org\/<\/loc>/);
});

test("MCP and A2A machine entrypoints remain callable", async () => {
  resetForTests();
  for (const path of ["/connect", "/connect/chatgpt", "/connect/claude", "/connect/grok", "/connect/openclaw", "/mcp"]) {
    const page = await request(path);
    assert.equal(page.statusCode, 200, path);
    assert.match(page.headers["content-type"], /^text\/html/, path);
    assert.match(page.body, /agents\.privatedao\.org\/mcp/, path);
    assert.match(page.body, /streamable-http/, path);
  }
  const hub = await request("/connect");
  assert.match(hub.body, /ChatGPT/);
  assert.match(hub.body, /Claude/);
  assert.match(hub.body, /Grok/);
  assert.match(hub.body, /OpenClaw/);
  assert.ok((hub.body.match(/MCP VERIFIED/g) || []).length >= 8);
  assert.match(hub.body, /Client-Level MCP Verification/);
  for (const asset of ["openai-knot.svg", "claude-symbol.svg", "grok-symbol.svg", "openclaw-symbol.png"]) {
    assert.match(hub.body, new RegExp(`/assets/clients/${asset}`));
    const response = await request(`/assets/clients/${asset}`);
    assert.equal(response.statusCode, 200, asset);
    assert.ok(asset.endsWith(".png") ? response.isBase64Encoded : /^<svg/.test(response.body), asset);
  }
  assert.doesNotMatch(hub.body, /cdn\.simpleicons|claude\.ai\/favicon|grok\.com\/images\/favicon/);
  for (const path of ["/connect/chatgpt", "/connect/claude", "/connect/grok", "/connect/openclaw"]) {
    const page = await request(path);
    assert.match(page.body, /MCP VERIFIED/, path);
    assert.doesNotMatch(page.body, /not a verified Grok client result|No OpenClaw installation was available/, path);
  }
  const robots = await request("/robots.txt");
  assert.match(robots.body, /Allow: \/connect\/grok/);
  const sitemap = await request("/sitemap.xml");
  assert.match(sitemap.body, /<loc>https:\/\/agents\.privatedao\.org\/connect\/grok<\/loc>/);
  assert.match(sitemap.body, /<loc>https:\/\/agents\.privatedao\.org\/mcp<\/loc>/);
  const a2a = await request("/a2a", "POST", { jsonrpc: "2.0", id: 1, method: "message/send", params: { message: { parts: [{ text: "discover" }] } } });
  assert.equal(a2a.statusCode, 200);
  assert.match(a2a.headers["content-type"], /^application\/json/);
  const mcp = await request("/mcp", "POST", { jsonrpc: "2.0", id: 1, method: "tools/list" });
  assert.equal(mcp.statusCode, 200);
  assert.match(mcp.body, /pdao_services/);
  const api = JSON.parse((await request("/openapi.json")).body);
  assert.ok(api.components.schemas.CreateJobRequest);
  assert.ok(api.components.schemas.ServiceInput_token_intelligence);
  assert.deepEqual(api.components.schemas.PaymentRequest.required, ["signature"]);
  assert.ok(api.paths["/api/jobs"].post.requestBody);
  assert.equal(api.paths["/api/jobs/{jobId}"].get.responses["409"].description, "Job requires non-replaying recovery");
  assert.ok(api.paths["/api/jobs/{jobId}/payment"].post.requestBody);
  assert.equal(api.paths["/api/jobs/{jobId}/payment"].post.responses["409"].description.includes("non-replaying recovery"), true);
  assert.equal(api.paths["/api/external/jobs/{jobId}/payment"].post.responses["409"].description.includes("non-replaying recovery"), true);
});

test("browser MCP clients receive a complete CORS preflight response", async () => {
  resetForTests();
  const response = await request("/mcp", "OPTIONS", undefined, {
    origin: "https://mcp-singularity.cicada71.net",
    "access-control-request-method": "POST",
    "access-control-request-headers": "content-type,mcp-protocol-version,mcp-session-id",
  });
  assert.equal(response.statusCode, 204);
  assert.equal(response.headers["access-control-allow-origin"], "*");
  assert.match(response.headers["access-control-allow-methods"], /POST/);
  assert.match(response.headers["access-control-allow-headers"], /mcp-protocol-version/);
  assert.match(response.headers["access-control-allow-headers"], /mcp-session-id/);
});

test("MCP lifecycle, schemas, errors, and network aliases are protocol-safe", async () => {
  resetForTests();
  const initialize = await request("/mcp", "POST", { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test-client", version: "1" } } });
  assert.equal(initialize.statusCode, 200);
  assert.equal(JSON.parse(initialize.body).result.protocolVersion, "2025-06-18");
  const ping = await request("/mcp", "POST", { jsonrpc: "2.0", id: 11, method: "ping", params: {} });
  assert.equal(ping.statusCode, 200);
  assert.deepEqual(JSON.parse(ping.body).result, {});

  const initialized = await request("/mcp", "POST", { jsonrpc: "2.0", method: "notifications/initialized", params: {} });
  assert.equal(initialized.statusCode, 202);
  assert.equal(initialized.body, "");
  const cancelled = await request("/mcp", "POST", { jsonrpc: "2.0", method: "notifications/cancelled", params: {} });
  assert.equal(cancelled.statusCode, 202);
  assert.equal(cancelled.body, "");

  const listed = JSON.parse((await request("/mcp", "POST", { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} })).body).result.tools;
  assert.equal(listed.length, 20);
  for (const tool of listed) {
    assert.equal(tool.inputSchema.type, "object", tool.name);
    assert.ok(tool.inputSchema.properties, tool.name);
    assert.equal(typeof tool.annotations?.readOnlyHint, "boolean", `${tool.name} readOnlyHint`);
    assert.equal(typeof tool.annotations?.destructiveHint, "boolean", `${tool.name} destructiveHint`);
  }
  const byName = Object.fromEntries(listed.map((tool) => [tool.name, tool.inputSchema]));
  assert.deepEqual(byName.submit_payment.required, ["job_id", "signature"]);
  assert.deepEqual(byName.register_agent.anyOf, [{ required: ["mcpUrl"] }, { required: ["mcp_url"] }, { required: ["endpoint"] }]);
  assert.deepEqual(byName.logistics_request.required, ["capability"]);
  for (const toolName of ["exchange_overview", "service_recommendation", "provider_integrations", "payment_guide", "execution_guide"])
    assert.ok(byName[toolName], `${toolName} discovery tool`);

  const executionGuide = JSON.parse((await request("/mcp", "POST", { jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "execution_guide", arguments: {} } })).body);
  assert.deepEqual(executionGuide.result.structuredContent.states, ["awaiting_payment", "running", "completed", "recovery_required"]);
  assert.match(executionGuide.result.structuredContent.retry, /must not replay the service/);

  const safe = JSON.parse((await request("/mcp", "POST", { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "verify_basic", arguments: { record: { test: "mcp" } } } })).body);
  assert.equal(safe.result.isError, undefined);
  assert.match(safe.result.content[0].text, /VERIFIED/);

  const failed = JSON.parse((await request("/mcp", "POST", { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "verify_basic", arguments: {} } })).body);
  assert.equal(failed.result.isError, true);
  assert.match(failed.result.content[0].text, /mint or record is required/);
  assert.equal(failed.result.structuredContent.statusCode, 400);
  assert.equal(failed.result.structuredContent.upstreamStatus, undefined);

  const a2aValidation = await request("/a2a", "POST", { jsonrpc: "2.0", id: 6, method: "message/send", params: { message: { metadata: { service_id: "verify.basic", input: {} } } } });
  assert.equal(a2aValidation.statusCode, 400);
  assert.match(a2aValidation.body, /mint or record is required/);

  const match = JSON.parse((await request("/mcp", "POST", { jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "agent_match", arguments: { capabilities: ["chains"], network: "solana:mainnet-beta" } } })).body);
  assert.equal(match.result.isError, undefined);
});

test("agent invocation rejects malformed identifiers without leaking storage errors", async () => {
  resetForTests();
  const missing = await request("/api/agents/invoke", "POST", { tool: "read", arguments: {} });
  assert.equal(missing.statusCode, 400);
  assert.match(missing.body, /agent_id is required/);
  assert.doesNotMatch(missing.body, /DynamoDB|schema|provided key element/i);

  const unknown = await request("/api/agents/invoke", "POST", { agent_id: "missing-fixture", tool: "read", arguments: {} });
  assert.equal(unknown.statusCode, 400);
  assert.match(unknown.body, /verified agent required/);
  assert.doesNotMatch(unknown.body, /DynamoDB|schema|provided key element/i);
});

test("GitHub App and external seller boundaries fail closed without credentials or declarations", async () => {
  resetForTests();
  const setup = await request("/github/setup");
  assert.equal(setup.statusCode, 200);
  assert.match(setup.body, /Connect GitHub/);
  const oauthCallback = await request("/github/oauth/callback");
  assert.equal(oauthCallback.statusCode, 200);
  assert.match(oauthCallback.headers["content-type"], /^text\/html/);
  assert.match(oauthCallback.body, /GitHub user OAuth is not used/);
  const webhook = await request("/api/github/webhook", "POST", { action: "ping" }, { "x-github-event": "ping" });
  assert.equal(webhook.statusCode, 503);
  assert.doesNotMatch(webhook.body, /PRIVATE_KEY|access_token|client_secret/i);
  const services = JSON.parse((await request("/api/registry/services")).body);
  assert.deepEqual(services.services, []);
  const mcp = JSON.parse((await request("/mcp", "POST", { jsonrpc: "2.0", id: 1, method: "tools/list" })).body).result.tools;
  assert.ok(mcp.some((tool) => tool.name === "external_services"));
  assert.ok(mcp.some((tool) => tool.name === "seller_update_services"));
});

test("external seller ownership protects mutations and publishes declared services", async () => {
  resetForTests();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options = {}) => {
    const payload = JSON.parse(options.body || "{}");
    if (payload.method === "initialize")
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: payload.id, result: { protocolVersion: "2025-06-18", serverInfo: { name: "Fixture Seller", version: "1.0.0" }, capabilities: { tools: {} } } }), { status: 200, headers: { "content-type": "application/json", "mcp-session-id": "fixture-session" } });
    if (payload.method === "notifications/initialized") return new Response("", { status: 202 });
    if (payload.method === "tools/list")
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: payload.id, result: { tools: [{ name: "read", description: "Read-only fixture service", inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true } }, { name: "inspect", description: "Second safe fixture tool", inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true } }] } }), { status: 200, headers: { "content-type": "application/json", "mcp-session-id": "fixture-session" } });
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: payload.id, error: { code: -32601, message: "not supported in fixture" } }), { status: 404, headers: { "content-type": "application/json" } });
  };
  try {
    const registered = await request("/api/registry/register", "POST", { name: "Fixture Seller", mcp_url: "https://example.com/mcp", allowed_tools: ["read"] });
    assert.equal(registered.statusCode, 201);
    const record = JSON.parse(registered.body);
    assert.match(record.owner_token, /^[A-Za-z0-9_-]{32}$/);
    let ownerToken = record.owner_token;
    const directBeforeListing = await request("/api/agents/invoke", "POST", { agentId: record.id, tool: "read", arguments: {} });
    assert.equal(directBeforeListing.statusCode, 403);
    assert.match(directBeforeListing.body, /confirmed published marketplace listing/);
    const initialReadiness = await request(`/api/registry/agents/${record.id}/seller-readiness`);
    assert.equal(initialReadiness.statusCode, 200);
    assert.equal(JSON.parse(initialReadiness.body).ready_for_quote, false);
    assert.ok(JSON.parse(initialReadiness.body).missing.includes("commercial_services"));
    const technicalOnlyListings = JSON.parse((await request("/api/marketplace/listings")).body).listings;
    assert.equal(technicalOnlyListings.some((listing) => listing.agentId === record.id && listing.external), false);

    const withoutToken = await request("/api/registry/register", "POST", { agent_id: record.id, mcp_url: "https://example.com/mcp", commercial_services: [] });
    assert.equal(withoutToken.statusCode, 403);
    assert.match(withoutToken.body, /owner_token is required/);

    const updated = await request("/api/registry/register", "POST", {
      agent_id: record.id,
      mcp_url: "https://example.com/mcp",
      owner_token: ownerToken,
      commercial_services: [{ id: "read", title: "Read evidence", description: "A declared read-only seller service", price: 0.03, asset: "USDC", network: "solana-mainnet-beta" }],
      accepted_assets: ["USDC"],
    });
    assert.equal(updated.statusCode, 201);
    assert.equal(JSON.parse(updated.body).commercial_services[0].id, "read");
    const invalidDeclaredRegistration = await request("/api/registry/register", "POST", {
      agent_id: record.id,
      mcp_url: "https://example.com/mcp",
      owner_token: ownerToken,
      commercial_services: [{ id: "missing", tool: "missing", price: 0.03, asset: "USDC", network: "solana-mainnet-beta" }],
      accepted_assets: ["USDC"],
    });
    assert.equal(invalidDeclaredRegistration.statusCode, 400);
    assert.match(invalidDeclaredRegistration.body, /commercial service tool was not returned by tools\/list/);
    const preview = await request("/api/seller/metadata/preview", "POST", {
      mcp_url: "https://example.com/mcp",
      commercial_services: [{ id: "read", tool: "read", price: 0.03, asset: "USDC", network: "solana-mainnet-beta" }],
      accepted_assets: ["USDC"],
      payout: { address: "2BJ4ezxqV9YJXc38D9duKBkdn4su4jE1beKUHwH663sL", network: "solana-mainnet-beta", asset: "USDC" },
    });
    assert.equal(preview.statusCode, 200);
    assert.equal(JSON.parse(preview.body).status, "ready_for_registration");
    const unsupportedAcceptedAsset = await request("/api/seller/metadata/preview", "POST", {
      mcp_url: "https://example.com/mcp",
      commercial_services: [{ id: "read", tool: "read", price: 0.03, asset: "USDC", network: "solana-mainnet-beta" }],
      accepted_assets: ["SOL"],
      payout: { address: "2BJ4ezxqV9YJXc38D9duKBkdn4su4jE1beKUHwH663sL", network: "solana-mainnet-beta", asset: "USDC" },
    });
    assert.equal(unsupportedAcceptedAsset.statusCode, 400);
    assert.match(unsupportedAcceptedAsset.body, /accepted assets must be USDC/);
    const unsupportedServiceAsset = await request("/api/seller/metadata/preview", "POST", {
      mcp_url: "https://example.com/mcp",
      commercial_services: [{ id: "read", tool: "read", price: 0.03, asset: "SOL", network: "solana-mainnet-beta" }],
      accepted_assets: ["USDC"],
      payout: { address: "2BJ4ezxqV9YJXc38D9duKBkdn4su4jE1beKUHwH663sL", network: "solana-mainnet-beta", asset: "USDC" },
    });
    assert.equal(unsupportedServiceAsset.statusCode, 400);
    assert.match(unsupportedServiceAsset.body, /commercial service asset must be USDC/);
    const unsupportedPayoutRail = await request("/api/seller/metadata/preview", "POST", {
      mcp_url: "https://example.com/mcp",
      commercial_services: [{ id: "read", tool: "read", price: 0.03, asset: "USDC", network: "solana-mainnet-beta" }],
      accepted_assets: ["USDC"],
      payout: { address: "2BJ4ezxqV9YJXc38D9duKBkdn4su4jE1beKUHwH663sL", network: "ethereum:mainnet", asset: "USDC" },
    });
    assert.equal(unsupportedPayoutRail.statusCode, 400);
    assert.match(unsupportedPayoutRail.body, /payout network must be solana-mainnet-beta/);
    const malformedPublicKey = await request("/api/seller/metadata/preview", "POST", {
      mcp_url: "https://example.com/mcp",
      commercial_services: [{ id: "read", tool: "read", price: 0.03, asset: "USDC", network: "solana-mainnet-beta" }],
      accepted_assets: ["USDC"],
      payout: { address: "111111111111111111111111111111111111111111", network: "solana-mainnet-beta", asset: "USDC" },
    });
    assert.equal(malformedPublicKey.statusCode, 400);
    assert.match(malformedPublicKey.body, /valid Solana public address/);
    const invalidTool = await request("/api/seller/metadata/preview", "POST", {
      mcp_url: "https://example.com/mcp",
      commercial_services: [{ id: "missing", tool: "missing", price: 0.03, asset: "USDC", network: "solana-mainnet-beta" }],
      accepted_assets: ["USDC"],
      payout: { address: "2BJ4ezxqV9YJXc38D9duKBkdn4su4jE1beKUHwH663sL", network: "solana-mainnet-beta", asset: "USDC" },
    });
    assert.equal(invalidTool.statusCode, 200);
    assert.match(invalidTool.body, /tool was not returned by tools\/list/);
    const invalidPayout = await request("/api/seller/metadata/preview", "POST", {
      mcp_url: "https://example.com/mcp",
      commercial_services: [{ id: "read", tool: "read", price: 0.03, asset: "USDC", network: "solana-mainnet-beta" }],
      accepted_assets: ["USDC"],
      payout: { address: "2BJ4ezxqV9YJXc38D9duKBkdn4su4jE1beKUHwH663sL", network: "unsupported-network", asset: "USDC" },
    });
    assert.equal(invalidPayout.statusCode, 400);
    assert.match(invalidPayout.body, /payout network (?:is unsupported|must be solana-mainnet-beta)/);
    const configuredReadiness = await request(`/api/registry/agents/${record.id}/seller-readiness`);
    assert.equal(configuredReadiness.statusCode, 200);
    assert.equal(JSON.parse(configuredReadiness.body).ready_for_quote, false);
    assert.ok(JSON.parse(configuredReadiness.body).missing.includes("payout"));

  const services = JSON.parse((await request("/api/registry/services")).body).services;
  assert.deepEqual(services, []);
  const invalidAgreement = await request("/api/agreements", "POST", { buyerAgent: "buyer", providerAgent: "provider", service: "read", price: "not-a-number" });
  assert.equal(invalidAgreement.statusCode, 400);
  assert.match(invalidAgreement.body, /agreement price must be a finite non-negative number/);
  const missingSellerId = await request("/api/marketplace/seller-listings/quote", "POST", {});
  assert.equal(missingSellerId.statusCode, 400);
  assert.match(missingSellerId.body, /agent_id is required/);
  const missingTerms = await request("/api/marketplace/seller-listings/quote", "POST", { agent_id: record.id, owner_token: ownerToken, tier: "pro" });
  assert.equal(missingTerms.statusCode, 400);
  const missingPayoutTermsAccepted = await request("/api/marketplace/seller-listings/quote", "POST", { agent_id: record.id, owner_token: ownerToken, tier: "pro", accept_terms: true, terms_version: "seller-marketplace-v1" });
  assert.equal(missingPayoutTermsAccepted.statusCode, 400);
  assert.match(missingPayoutTermsAccepted.body, /payout configuration is required/);
  const configuredForQuote = await request(`/api/registry/agents/${record.id}/services`, "PATCH", { owner_token: ownerToken, services: [{ id: "read", title: "Read evidence", description: "A declared read-only seller service", price: 0.03, asset: "USDC", network: "solana-mainnet-beta" }], accepted_assets: ["USDC"], payout: { address: "2BJ4ezxqV9YJXc38D9duKBkdn4su4jE1beKUHwH663sL", network: "solana-mainnet-beta", asset: "USDC" } });
  assert.equal(configuredForQuote.statusCode, 200);
  const listingQuote = await request("/api/marketplace/seller-listings/quote", "POST", { agent_id: record.id, owner_token: ownerToken, tier: "pro", accept_terms: true, terms_version: "seller-marketplace-v1" });
  assert.equal(listingQuote.statusCode, 201);
  const listingQuoteBody = JSON.parse(listingQuote.body);
  assert.equal(listingQuoteBody.quote.amount, 10);
  assert.equal(listingQuoteBody.status, "awaiting_payment");
  const changedAfterQuote = await request(`/api/registry/agents/${record.id}/services`, "PATCH", { owner_token: ownerToken, services: [{ id: "read", title: "Read evidence v2", description: "Changed after quote", price: 0.03, asset: "USDC", network: "solana-mainnet-beta" }], accepted_assets: ["USDC"] });
  assert.equal(changedAfterQuote.statusCode, 200);
  const staleListingPayment = await request(`/api/marketplace/seller-listings/${listingQuoteBody.listing.id}/payment`, "POST", { quote_id: listingQuoteBody.quote.quote_id, signature: "3".repeat(88) });
  assert.equal(staleListingPayment.statusCode, 409);
  assert.match(staleListingPayment.body, /services changed after this listing quote/);
  const listings = JSON.parse((await request("/api/marketplace/listings")).body).listings;
  assert.equal(listings.some((listing) => listing.agentId === record.id && listing.externalSeller), false);

    const invalid = await request("/api/registry/register", "POST", { agent_id: record.id, mcp_url: "https://example.com/mcp", owner_token: "invalid-token-000000" });
    assert.equal(invalid.statusCode, 403);
    assert.match(invalid.body, /seller ownership token is invalid/);

    const refreshWithoutToken = await request(`/api/registry/agents/${record.id}/refresh`, "POST", {});
    assert.equal(refreshWithoutToken.statusCode, 403);
    assert.match(refreshWithoutToken.body, /valid owner_token is required/);

    const refreshed = await request(`/api/registry/agents/${record.id}/refresh`, "POST", { owner_token: ownerToken });
    assert.equal(refreshed.statusCode, 200);
    assert.equal(JSON.parse(refreshed.body).id, record.id);
    assert.deepEqual(JSON.parse(refreshed.body).allowed_tools, ["read"]);
    const rotated = await request(`/api/registry/agents/${record.id}/owner-token/rotate`, "POST", { owner_token: ownerToken });
    assert.equal(rotated.statusCode, 200);
    const rotatedBody = JSON.parse(rotated.body);
    assert.match(rotatedBody.owner_token, /^[A-Za-z0-9_-]{32}$/);
    const oldAfterRotation = await request(`/api/registry/agents/${record.id}/services`, "PATCH", { owner_token: ownerToken, services: [] });
    assert.equal(oldAfterRotation.statusCode, 403);
    ownerToken = rotatedBody.owner_token;
    const rotatedUpdate = await request(`/api/registry/agents/${record.id}/services`, "PATCH", { owner_token: ownerToken, services: [] });
    assert.equal(rotatedUpdate.statusCode, 200);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("external seller paid lifecycle quotes, executes once, and records attribution", async () => {
  resetForTests();
  const sellerPortal = await request("/sellers");
  assert.equal(sellerPortal.statusCode, 200);
  assert.match(sellerPortal.body, /Verify MCP and preview services/);
  assert.match(sellerPortal.body, /Select read-only commercial tools/);
  assert.match(sellerPortal.body, /Pay listing fee with wallet/);
  const originalFetch = globalThis.fetch;
  const treasury = "2BJ4ezxqV9YJXc38D9duKBkdn4su4jE1beKUHwH663sL";
  const mint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  const paymentSignature = "1".repeat(88);
  const listingPaymentSignature = "2".repeat(88);
  let expectedPaymentReference = "";
  let expectedTreasuryTokenAccount = "";
  let expectedAmountAtomic = "30000";
  let mcpCalls = 0;
  globalThis.fetch = async (url, options = {}) => {
    const target = String(url);
    if (target === "https://example.com/mcp") {
      const payload = JSON.parse(options.body || "{}");
      if (payload.method === "initialize")
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: payload.id, result: { protocolVersion: "2025-06-18", serverInfo: { name: "Fixture Seller", version: "1.0.0" }, capabilities: { tools: {} } } }), { status: 200, headers: { "content-type": "application/json", "mcp-session-id": "fixture-session" } });
      if (payload.method === "notifications/initialized") return new Response("", { status: 202 });
      if (payload.method === "tools/list")
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: payload.id, result: { tools: [
          { name: "read", description: "Read-only fixture service", inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true } },
          { name: "build_transfer", description: "Must never be enabled", inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true } },
        ] } }), { status: 200, headers: { "content-type": "application/json", "mcp-session-id": "fixture-session" } });
      if (payload.method === "tools/call") {
        mcpCalls += 1;
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: payload.id, result: { content: [{ type: "text", text: "fixture evidence" }] } }), { status: 200, headers: { "content-type": "application/json", "mcp-session-id": "fixture-session" } });
      }
    }
    const rpc = JSON.parse(options.body || "{}");
    if (rpc.method === "getTransaction") {
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: rpc.id, result: { slot: 1, blockTime: Math.floor(Date.now() / 1000), meta: { err: null }, transaction: { message: { instructions: [
        { program: "spl-memo", parsed: expectedPaymentReference },
        { program: "spl-token", parsed: { type: "transferChecked", info: { destination: expectedTreasuryTokenAccount, amount: expectedAmountAtomic, mint } } },
      ] } } } }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (rpc.method === "getAccountInfo")
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: rpc.id, result: { value: { data: { parsed: { info: { owner: treasury, mint } } } } } }), { status: 200, headers: { "content-type": "application/json" } });
    if (rpc.method === "getTokenAccountsByOwner")
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: rpc.id, result: { value: [{ pubkey: expectedTreasuryTokenAccount }] } }), { status: 200, headers: { "content-type": "application/json" } });
    throw new Error(`unexpected fixture request: ${target}`);
  };
  try {
    const registered = await request("/api/registry/register", "POST", { name: "Fixture Seller", mcp_url: "https://example.com/mcp" });
    const registeredBody = JSON.parse(registered.body);
    const updated = await request(`/api/registry/agents/${registeredBody.id}/services`, "PATCH", {
      owner_token: registeredBody.owner_token,
      services: [{ id: "read", tool: "read", title: "Read evidence", description: "Paid read-only seller service", price: 0.03, asset: "USDC", network: "solana-mainnet-beta" }],
      accepted_assets: ["USDC"],
      payout: { address: treasury, network: "solana-mainnet-beta", asset: "USDC" },
    });
    assert.equal(updated.statusCode, 200);
    const listingQuoteResponse = await request("/api/marketplace/seller-listings/quote", "POST", { agent_id: registeredBody.id, owner_token: registeredBody.owner_token, tier: "pro", accept_terms: true, terms_version: "seller-marketplace-v1" });
    assert.equal(listingQuoteResponse.statusCode, 201);
    const listingQuote = JSON.parse(listingQuoteResponse.body).quote;
    expectedPaymentReference = listingQuote.paymentReference;
    expectedTreasuryTokenAccount = listingQuote.treasuryTokenAccount;
    expectedAmountAtomic = String(listingQuote.amountAtomic);
    const listingId = JSON.parse(listingQuoteResponse.body).listing.id;
    const listed = await request(`/api/marketplace/seller-listings/${listingId}/payment`, "POST", { quote_id: listingQuote.quote_id, signature: listingPaymentSignature });
    assert.equal(listed.statusCode, 200);
    assert.equal(JSON.parse(listed.body).receipt.status, "VERIFIED");
    assert.equal(JSON.parse(listed.body).listing.commercial_publication_status, "eligible");
    const notYetPublic = JSON.parse((await request("/api/marketplace/listings")).body).listings;
    assert.equal(notYetPublic.some((item) => item.agentId === registeredBody.id), false);
    const listingReplay = await request(`/api/marketplace/seller-listings/${listingId}/payment`, "POST", { quote_id: listingQuote.quote_id, signature: listingPaymentSignature });
    assert.equal(listingReplay.statusCode, 200);
    assert.equal(JSON.parse(listingReplay.body).status, "paid");
    const dashboard = await request(`/api/seller/dashboard/${registeredBody.id}`, "GET", undefined, { "x-pdao-owner-token": registeredBody.owner_token });
    assert.equal(dashboard.statusCode, 200);
    assert.equal(JSON.parse(dashboard.body).listing.payment_status, "paid");
    const listingIntent = await request(`/api/marketplace/seller-listings/${listingId}/payment-intent`);
    assert.equal(listingIntent.statusCode, 200);
    assert.equal(JSON.parse(listingIntent.body).status, "paid");
    const unpublished = await request(`/api/registry/agents/${registeredBody.id}/unpublish`, "POST", { owner_token: registeredBody.owner_token });
    assert.equal(unpublished.statusCode, 200);
    assert.equal(JSON.parse(unpublished.body).commercial_publication_status, "unpublished");
    const unpublishedDashboard = JSON.parse((await request(`/api/seller/dashboard/${registeredBody.id}`, "GET", undefined, { "x-pdao-owner-token": registeredBody.owner_token })).body);
    assert.equal(unpublishedDashboard.listing.commercial_publication_status, "unpublished");
    assert.equal(unpublishedDashboard.listing.status, "unpublished");
    const payoutCleared = await request(`/api/registry/agents/${registeredBody.id}/services`, "PATCH", { owner_token: registeredBody.owner_token, services: [{ id: "read", tool: "read", title: "Read evidence", description: "Paid read-only seller service", price: 0.03, asset: "USDC", network: "solana-mainnet-beta" }], accepted_assets: ["USDC"], payout: null });
    assert.equal(payoutCleared.statusCode, 200);
    const blockedWithoutPayout = await request(`/api/registry/agents/${registeredBody.id}/publish`, "POST", { owner_token: registeredBody.owner_token });
    assert.equal(blockedWithoutPayout.statusCode, 400);
    assert.match(blockedWithoutPayout.body, /payout configuration is required/);
    const payoutRestored = await request(`/api/registry/agents/${registeredBody.id}/services`, "PATCH", { owner_token: registeredBody.owner_token, services: [{ id: "read", tool: "read", title: "Read evidence", description: "Paid read-only seller service", price: 0.03, asset: "USDC", network: "solana-mainnet-beta" }], accepted_assets: ["USDC"], payout: { address: treasury, network: "solana-mainnet-beta", asset: "USDC" } });
    assert.equal(payoutRestored.statusCode, 200);
    const republished = await request(`/api/registry/agents/${registeredBody.id}/publish`, "POST", { owner_token: registeredBody.owner_token });
    assert.equal(republished.statusCode, 200);
    assert.equal(JSON.parse(republished.body).commercial_publication_status, "published");
    const republishedDashboard = JSON.parse((await request(`/api/seller/dashboard/${registeredBody.id}`, "GET", undefined, { "x-pdao-owner-token": registeredBody.owner_token })).body);
    assert.equal(republishedDashboard.listing.commercial_publication_status, "published");
    assert.equal(republishedDashboard.listing.status, "active");
    const unpublishedBeforeRefresh = await request(`/api/registry/agents/${registeredBody.id}/unpublish`, "POST", { owner_token: registeredBody.owner_token });
    assert.equal(unpublishedBeforeRefresh.statusCode, 200);
    const refreshed = await request("/api/registry/register", "POST", {
      agent_id: registeredBody.id,
      owner_token: registeredBody.owner_token,
      name: "Fixture Seller",
      mcp_url: "https://example.com/mcp",
      commercial_services: [{ id: "read", tool: "read", title: "Read evidence", description: "Paid read-only seller service", price: 0.03, asset: "USDC", network: "solana-mainnet-beta" }],
      accepted_assets: ["USDC"],
      payout: { address: treasury, network: "solana-mainnet-beta", asset: "USDC" },
    });
    assert.equal(refreshed.statusCode, 201);
    assert.equal(JSON.parse(refreshed.body).commercial_publication_status, "unpublished");
    const republishedAfterRefresh = await request(`/api/registry/agents/${registeredBody.id}/publish`, "POST", { owner_token: registeredBody.owner_token });
    assert.equal(republishedAfterRefresh.statusCode, 200);
    assert.equal(JSON.parse(republishedAfterRefresh.body).commercial_publication_status, "published");
    const addedService = await request(`/api/registry/agents/${registeredBody.id}/services`, "PATCH", { owner_token: registeredBody.owner_token, services: [{ id: "read", tool: "read", title: "Read evidence", description: "Paid read-only seller service", price: 0.03, asset: "USDC", network: "solana-mainnet-beta" }, { id: "read_extra", tool: "read", title: "Read evidence extra", description: "Second declared service", price: 0.04, asset: "USDC", network: "solana-mainnet-beta" }], accepted_assets: ["USDC"], payout: { address: treasury, network: "solana-mainnet-beta", asset: "USDC" } });
    assert.equal(addedService.statusCode, 200);
    assert.equal(JSON.parse(addedService.body).listing_fee_status, "paid");
    assert.equal(JSON.parse(addedService.body).commercial_publication_status, "published");
    const publishWithUnlistedService = await request(`/api/registry/agents/${registeredBody.id}/publish`, "POST", { owner_token: registeredBody.owner_token });
    assert.equal(publishWithUnlistedService.statusCode, 402);
    assert.match(publishWithUnlistedService.body, /all commercial services must be included/);
    const alreadyPaid = await request("/api/marketplace/seller-listings/quote", "POST", { agent_id: registeredBody.id, owner_token: registeredBody.owner_token, tier: "pro", accept_terms: true, terms_version: "seller-marketplace-v1" });
    assert.equal(alreadyPaid.statusCode, 201);
    const additionalQuoteBody = JSON.parse(alreadyPaid.body);
    assert.equal(additionalQuoteBody.status, "paid");
    assert.equal(additionalQuoteBody.quote, undefined);
    assert.ok(additionalQuoteBody.listing.service_ids.includes("read_extra"));
    const additionalIntent = await request(`/api/marketplace/seller-listings/${listingId}/payment-intent`);
    assert.equal(additionalIntent.statusCode, 200);
    assert.equal(JSON.parse(additionalIntent.body).status, "paid");
    const service = JSON.parse((await request("/api/registry/services")).body).services[0];
    assert.equal(service.price, 0.03);
    assert.equal(service.asset, "USDC");
    assert.equal(service.seller_agent_id, registeredBody.id);
    const profile = JSON.parse((await request(`/api/registry/agents/${registeredBody.id}`)).body);
    assert.equal(profile.acceptedAssets[0], "USDC");
    assert.equal(profile.payout.address, treasury);
    const directPaidInvoke = await request("/api/agents/invoke", "POST", { agentId: registeredBody.id, tool: "read", arguments: { subject: "bypass-attempt" } });
    assert.equal(directPaidInvoke.statusCode, 402);
    assert.match(directPaidInvoke.body, /quote and finalized payment/);
    assert.equal(JSON.parse((await request("/mcp", "POST", { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "external_services", arguments: {} } })).body).result.isError, undefined);
    const created = await request("/api/external/jobs", "POST", { service_id: service.id, input: { subject: "fixture" } });
    assert.equal(created.statusCode, 201);
    const paymentIntent = JSON.parse(created.body).payment_intent;
    assert.equal(JSON.parse(created.body).status, "awaiting_payment");
    assert.equal(paymentIntent.amount, "0.030000");
    assert.equal(paymentIntent.network, "solana-mainnet-beta");
    assert.equal(paymentIntent.target_network, "solana-mainnet-beta");
    expectedPaymentReference = paymentIntent.paymentReference;
    expectedTreasuryTokenAccount = paymentIntent.treasuryTokenAccount;
    expectedAmountAtomic = String(Math.round(0.03 * 1e6));

    const paid = await request(`/api/external/jobs/${paymentIntent.jobId}/payment`, "POST", { signature: paymentSignature });
    assert.equal(paid.statusCode, 200, paid.body);
    const paidBody = JSON.parse(paid.body);
    assert.equal(paidBody.status, "completed");
    assert.equal(paidBody.receipt.status, "VERIFIED");
    assert.equal(paidBody.receipt.seller_agent_id, registeredBody.id);
    assert.equal(paidBody.receipt.seller_service_id, "read");
    assert.equal(paidBody.receipt.seller_settlement.status, "payable_pending_admin_settlement");
    assert.equal(paidBody.receipt.seller_settlement.gross_amount, 0.03);
    assert.equal(paidBody.receipt.seller_settlement.protocol_fee, 0.003);
    assert.equal(paidBody.receipt.seller_settlement.platform_fee_amount, 0.003);
    assert.equal(paidBody.receipt.seller_settlement.platform_fee_bps, 1000);
    assert.equal(paidBody.receipt.seller_settlement.seller_amount, 0.027);
    assert.equal(paidBody.receipt.seller_net_amount, 0.027);
    assert.equal(paidBody.receipt.target_network, "solana-mainnet-beta");
    assert.equal(paidBody.receipt.payment_signature, paymentSignature);
    assert.equal(mcpCalls, 1);
    const replay = await request(`/api/external/jobs/${paymentIntent.jobId}/payment`, "POST", { signature: paymentSignature });
    assert.equal(replay.statusCode, 200);
    assert.equal(JSON.parse(replay.body).status, "completed");
    assert.equal(mcpCalls, 1);

    const concurrentJob = await request("/api/external/jobs", "POST", { service_id: service.id, input: { subject: "concurrent-fixture" } });
    const concurrentIntent = JSON.parse(concurrentJob.body).payment_intent;
    expectedPaymentReference = concurrentIntent.paymentReference;
    expectedTreasuryTokenAccount = concurrentIntent.treasuryTokenAccount;
    expectedAmountAtomic = String(Math.round(0.03 * 1e6));
    const concurrentPayments = await Promise.all(Array.from({ length: 3 }, () => request(`/api/external/jobs/${concurrentIntent.jobId}/payment`, "POST", { signature: "4".repeat(88) })));
    assert.ok(concurrentPayments.every((response) => [200, 202, 409].includes(response.statusCode)));
    assert.ok(concurrentPayments.some((response) => response.statusCode === 200));
    assert.equal(mcpCalls, 2);

    const promotionQuoteResponse = await request("/api/marketplace/promotions/quote", "POST", { agent_id: registeredBody.id, owner_token: registeredBody.owner_token, package_id: "ecosystem_campaign" });
    assert.equal(promotionQuoteResponse.statusCode, 201);
    const promotionQuote = JSON.parse(promotionQuoteResponse.body).quote;
    assert.equal(promotionQuote.amount, 250);
    expectedPaymentReference = promotionQuote.paymentReference;
    expectedAmountAtomic = String(promotionQuote.amountAtomic);
    const promotionPayment = await request(`/api/partnerships/${JSON.parse(promotionQuoteResponse.body).campaign.id}/payment`, "POST", { quoteId: promotionQuote.quote_id, signature: "3".repeat(88) });
    assert.equal(promotionPayment.statusCode, 200);
    const promotionReceipt = JSON.parse(promotionPayment.body).receipt;
    assert.equal(promotionReceipt.status, "VERIFIED");
    assert.equal(promotionReceipt.promotion_package, "ecosystem_campaign");
    assert.equal(promotionReceipt.gross_amount, 250);
    const publicPartners = JSON.parse((await request("/api/marketplace/partners")).body).partners;
    assert.equal(publicPartners.length, 1);
    assert.equal(publicPartners[0].payment_status, "paid");
    assert.equal(Object.hasOwn(publicPartners[0], "payment_signature"), false);
    assert.equal(Object.hasOwn(publicPartners[0], "payment_quote_id"), false);
    const publicDiscovery = JSON.parse((await request("/api/discovery")).body).sponsored;
    const publicCampaign = publicDiscovery.find((item) => item.id === JSON.parse(promotionQuoteResponse.body).campaign.id);
    assert.equal(publicCampaign.payment_status, "paid");
    assert.equal(Object.hasOwn(publicCampaign, "payment_signature"), false);
    const edited = await request(`/api/registry/agents/${registeredBody.id}/services`, "PATCH", { owner_token: registeredBody.owner_token, services: [{ id: "read", tool: "read", title: "Read evidence edited", description: "Edited metadata", price: 0.09, asset: "USDC", network: "solana-mainnet-beta" }, { id: "read_extra", tool: "read", title: "Renamed service", description: "Renamed metadata", price: 0.11, asset: "USDC", network: "solana-mainnet-beta" }], accepted_assets: ["USDC"], payout: { address: treasury, network: "solana-mainnet-beta", asset: "USDC" } });
    assert.equal(edited.statusCode, 200);
    const editedQuote = await request("/api/marketplace/seller-listings/quote", "POST", { agent_id: registeredBody.id, owner_token: registeredBody.owner_token, tier: "pro", accept_terms: true, terms_version: "seller-marketplace-v1" });
    assert.equal(JSON.parse(editedQuote.body).status, "paid");
    const removed = await request(`/api/registry/agents/${registeredBody.id}/services`, "PATCH", { owner_token: registeredBody.owner_token, services: [{ id: "read", tool: "read", title: "Read evidence edited", price: 0.09, asset: "USDC", network: "solana-mainnet-beta" }], accepted_assets: ["USDC"], payout: { address: treasury, network: "solana-mainnet-beta", asset: "USDC" } });
    assert.equal(removed.statusCode, 200);
    const recreated = await request(`/api/registry/agents/${registeredBody.id}/services`, "PATCH", { owner_token: registeredBody.owner_token, services: [{ id: "read", tool: "read", title: "Read evidence edited", price: 0.09, asset: "USDC", network: "solana-mainnet-beta" }, { id: "read_extra", tool: "read", title: "Recreated service", price: 0.11, asset: "USDC", network: "solana-mainnet-beta" }], accepted_assets: ["USDC"], payout: { address: treasury, network: "solana-mainnet-beta", asset: "USDC" } });
    assert.equal(recreated.statusCode, 200);
    const recreatedQuote = await request("/api/marketplace/seller-listings/quote", "POST", { agent_id: registeredBody.id, owner_token: registeredBody.owner_token, tier: "pro", accept_terms: true, terms_version: "seller-marketplace-v1" });
    assert.equal(JSON.parse(recreatedQuote.body).status, "paid");
    const newService = await request(`/api/registry/agents/${registeredBody.id}/services`, "PATCH", { owner_token: registeredBody.owner_token, services: [{ id: "read", tool: "read", title: "Read evidence edited", price: 0.09, asset: "USDC", network: "solana-mainnet-beta" }, { id: "read_extra", tool: "read", title: "Recreated service", price: 0.11, asset: "USDC", network: "solana-mainnet-beta" }, { id: "read_new", tool: "read", title: "New service", price: 0.12, asset: "USDC", network: "solana-mainnet-beta" }], accepted_assets: ["USDC"], payout: { address: treasury, network: "solana-mainnet-beta", asset: "USDC" } });
    assert.equal(newService.statusCode, 200);
    const newServiceQuote = await request("/api/marketplace/seller-listings/quote", "POST", { agent_id: registeredBody.id, owner_token: registeredBody.owner_token, tier: "pro", accept_terms: true, terms_version: "seller-marketplace-v1" });
    assert.equal(JSON.parse(newServiceQuote.body).status, "paid");
    assert.ok(JSON.parse(newServiceQuote.body).listing.service_ids.includes("read_new"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("external seller listing pricing includes five services and bills each additional service once", async () => {
  process.env.AGENT_EXCHANGE_TEST_ADMIN_TOKEN = "test-admin-token";
  resetForTests();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options = {}) => {
    const payload = JSON.parse(options.body || "{}");
    if (payload.method === "initialize") return new Response(JSON.stringify({ jsonrpc: "2.0", id: payload.id, result: { protocolVersion: "2025-06-18", serverInfo: { name: "Pricing Fixture", version: "1.0.0" }, capabilities: { tools: {} } } }), { status: 200, headers: { "content-type": "application/json", "mcp-session-id": "pricing-session" } });
    if (payload.method === "notifications/initialized") return new Response("", { status: 202 });
    if (payload.method === "tools/list") return new Response(JSON.stringify({ jsonrpc: "2.0", id: payload.id, result: { tools: [{ name: "read", description: "Safe fixture", inputSchema: { type: "object" }, annotations: { readOnlyHint: true } }] } }), { status: 200, headers: { "content-type": "application/json", "mcp-session-id": "pricing-session" } });
    if (payload.method === "getAccountInfo") return new Response(JSON.stringify({ jsonrpc: "2.0", id: payload.id, result: { value: null } }), { status: 200 });
    throw new Error(`unexpected pricing fixture request: ${payload.method}`);
  };
  try {
    const policyUpdate = await request("/api/admin/marketplace/policy", "PATCH", { listing_fee_usd: 12 }, { "x-pdao-admin-smoke": "test-admin-token" });
    assert.equal(policyUpdate.statusCode, 200, policyUpdate.body);
    const firstPartyQuote = await request("/api/payments/quote", "POST", { service_id: "verify.deep", job_id: "first_party_fixture" });
    assert.equal(firstPartyQuote.statusCode, 200);
    const firstPartyBody = JSON.parse(firstPartyQuote.body);
    assert.equal(firstPartyBody.revenue_class, "first_party_service");
    assert.equal(firstPartyBody.platform_fee_bps, 0);
    assert.equal(firstPartyBody.seller_net_amount, null);
    const registered = JSON.parse((await request("/api/registry/register", "POST", { name: "Pricing Fixture", mcp_url: "https://example.com/mcp" })).body);
    const serviceSet = (count) => Array.from({ length: count }, (_item, index) => ({ id: `service_${index + 1}`, tool: "read", title: `Service ${index + 1}`, price: 0.01, asset: "USDC", network: "solana-mainnet-beta" }));
    for (const [count, expected] of [[1, 12], [5, 12]]) {
      const updated = await request(`/api/registry/agents/${registered.id}/services`, "PATCH", { owner_token: registered.owner_token, services: serviceSet(count), accepted_assets: ["USDC"], payout: { address: "2BJ4ezxqV9YJXc38D9duKBkdn4su4jE1beKUHwH663sL", network: "solana-mainnet-beta", asset: "USDC" } });
      assert.equal(updated.statusCode, 200, updated.body);
      const quoteResponse = await request("/api/marketplace/seller-listings/quote", "POST", { agent_id: registered.id, owner_token: registered.owner_token, tier: "pro", accept_terms: true, terms_version: "seller-marketplace-v1" });
      assert.equal(quoteResponse.statusCode, 201);
      assert.equal(JSON.parse(quoteResponse.body).quote.amount, expected);
    }
    const tooMany = await request(`/api/registry/agents/${registered.id}/services`, "PATCH", { owner_token: registered.owner_token, services: serviceSet(6), accepted_assets: ["USDC"], payout: { address: "2BJ4ezxqV9YJXc38D9duKBkdn4su4jE1beKUHwH663sL", network: "solana-mainnet-beta", asset: "USDC" } });
    assert.equal(tooMany.statusCode, 400);
    assert.match(tooMany.body, /at most 5 services/);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.AGENT_EXCHANGE_TEST_ADMIN_TOKEN;
  }
});

test("external seller ownership is isolated between synthetic sellers", async () => {
  resetForTests();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    const payload = JSON.parse(options.body || "{}");
    if (payload.method === "initialize")
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: payload.id, result: { protocolVersion: "2025-06-18", serverInfo: { name: String(url).includes("seller-b") ? "Seller B" : "Seller A", version: "1.0.0" }, capabilities: { tools: {} } } }), { status: 200, headers: { "content-type": "application/json", "mcp-session-id": "isolated-session" } });
    if (payload.method === "notifications/initialized") return new Response("", { status: 202 });
    if (payload.method === "tools/list")
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: payload.id, result: { tools: [{ name: "read", description: "Synthetic read-only tool", inputSchema: { type: "object" }, annotations: { readOnlyHint: true } }] } }), { status: 200, headers: { "content-type": "application/json", "mcp-session-id": "isolated-session" } });
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: payload.id, error: { code: -32601, message: "not supported" } }), { status: 404, headers: { "content-type": "application/json" } });
  };
  try {
    const first = JSON.parse((await request("/api/registry/register", "POST", { name: "Seller A", mcp_url: "https://example.com/mcp/seller-a" })).body);
    const second = JSON.parse((await request("/api/registry/register", "POST", { name: "Seller B", mcp_url: "https://example.com/mcp/seller-b" })).body);
    assert.notEqual(first.id, second.id);
    const publicSecond = JSON.parse((await request(`/api/registry/agents/${second.id}`)).body);
    assert.equal(Object.hasOwn(publicSecond, "owner_token_hash"), false);
    assert.equal(Object.hasOwn(publicSecond, "owner_token"), false);
    const crossMutation = await request(`/api/registry/agents/${second.id}/services`, "PATCH", { owner_token: first.owner_token, services: [] });
    assert.equal(crossMutation.statusCode, 403);
    const noToken = await request(`/api/registry/agents/${second.id}/services`, "PATCH", { services: [] });
    assert.equal(noToken.statusCode, 403);
    const unauthorizedAdmin = await request("/api/admin/marketplace/policy", "PATCH", { platform_fee_bps: 1 });
    assert.equal(unauthorizedAdmin.statusCode, 404);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("public seller metadata removes secret-shaped fields including camelCase variants", () => {
  const safe = publicRegistryAgent({
    ownerToken: "secret",
    apiKey: "secret",
    clientSecret: "secret",
    privateKey: "secret",
    credentialHash: "secret",
    input_hash: "public-proof",
    result_hash: "public-proof-2",
    nested: { ownerToken: "nested-secret", metadata: [{ apiKey: "nested-key", label: "safe" }] },
    display_name: "Synthetic Seller",
  });
  for (const key of ["ownerToken", "apiKey", "clientSecret", "privateKey", "credentialHash"]) {
    assert.equal(Object.hasOwn(safe, key), false, key);
  }
  assert.equal(safe.input_hash, "public-proof");
  assert.equal(safe.result_hash, "public-proof-2");
  assert.deepEqual(safe.nested, { metadata: [{ label: "safe" }] });
  assert.equal(safe.display_name, "Synthetic Seller");
});

test("payment finality responses are non-success until activation is complete", () => {
  assert.equal(paymentStatusCode({ status: "verifying" }), 202);
  assert.equal(paymentStatusCode({ status: "processing" }), 202);
  assert.equal(paymentStatusCode({ status: "recovery_required" }), 409);
  assert.equal(paymentStatusCode({ status: "paid" }), 200);
  assert.equal(paymentStatusCode({ status: "completed" }), 200);
});

test("admin marketplace policy is persisted and controls public terms", async () => {
  process.env.AGENT_EXCHANGE_TEST_ADMIN_TOKEN = "test-admin-token";
  resetForTests();
  try {
    const initial = JSON.parse((await request("/api/marketplace/policy")).body);
    assert.equal(initial.listing_fee_usd, 10);
    assert.equal(initial.platform_fee_bps, 1000);
    assert.equal(initial.additional_service_fee_usd, 0);
    assert.equal(initial.max_services_per_seller, 5);
    assert.equal(initial.promotion_packages.featured_listing.price_usd, 75);
    const updated = await request("/api/admin/marketplace/policy", "PATCH", { listing_fee_usd: 12, platform_fee_bps: 900 }, { "x-pdao-admin-smoke": "test-admin-token" });
    assert.equal(updated.statusCode, 200);
    assert.equal(JSON.parse(updated.body).listing_fee_usd, 12);
    assert.equal(JSON.parse(updated.body).platform_fee_bps, 900);
    const publicPolicy = JSON.parse((await request("/api/marketplace/policy")).body);
    assert.equal(publicPolicy.listing_fee_usd, 12);
    assert.equal(publicPolicy.platform_fee_bps, 900);
    assert.equal(publicPolicy.additional_service_fee_usd, 0);
    assert.equal(publicPolicy.promotion_packages.featured_listing.price_usd, 75);
  } finally {
    delete process.env.AGENT_EXCHANGE_TEST_ADMIN_TOKEN;
  }
});
