import assert from "node:assert/strict";

const base = String(process.env.AGENT_EXCHANGE_PUBLIC_BASE_URL || "https://agents.privatedao.org").replace(/\/$/, "");

async function read(path) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(20_000) });
      const text = await response.text();
      assert.equal(response.ok, true, `${path} returned HTTP ${response.status}`);
      return { response, text, json: () => JSON.parse(text) };
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  throw new Error(`${path} unavailable after 3 attempts: ${lastError?.cause?.code || lastError?.message || "unknown error"}`);
}

const health = (await read("/api/health")).json();
assert.equal(health.status, "ok");
assert.equal(health.marketplace, "active");
assert.equal(health.paymentVerification, "finalized-usdc");

const services = (await read("/api/services")).json();
assert.ok(Array.isArray(services.services) && services.services.length >= 24, "service catalog is incomplete");
const privatePayService = services.services.find((service) => service.id === "privatepay.x402");
assert.ok(privatePayService, "PrivatePAY service is missing from the catalog");
const privatePayStatus = (await read("/api/privatepay/status")).json();

const providers = (await read("/api/providers/status")).json();
const accountProviders = providers.providers.filter((provider) => provider.provider === "mongodb" && provider.role === "visitor-accounts-favorites-cart");
assert.equal(accountProviders.length, 1, "visitor account provider is missing or duplicated");
assert.equal(accountProviders[0].status, "configured", "visitor accounts are not configured");

const policy = (await read("/api/marketplace/policy")).json();
assert.equal(policy.seller_tiers?.free?.listing_fee_usd, 0, "free seller listing is not free");
for (const tier of ["basic", "pro"]) assert.ok(policy.seller_tiers?.[tier], `${tier} seller tier is missing`);

const sellerPage = (await read("/sellers")).text;
for (const tier of ["free", "basic", "pro"]) assert.match(sellerPage, new RegExp(`value=["']${tier}["']`), `${tier} is missing from seller UI`);

assert.match((await read("/robots.txt")).text, /Allow: \/sellers/);
assert.match((await read("/sitemap.xml")).text, /\/sellers/);

console.log(JSON.stringify({ base, status: "pass", marketplace: health.marketplace, paymentVerification: health.paymentVerification, services: services.services.length, privatePay: { catalogStatus: privatePayService.status, readiness: privatePayStatus.status, enabled: privatePayStatus.enabled, operational: privatePayStatus.operational }, accountProvider: accountProviders[0].status, sellerTiers: Object.keys(policy.seller_tiers).sort() }));
