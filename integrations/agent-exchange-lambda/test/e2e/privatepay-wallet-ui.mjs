import assert from "node:assert/strict";
import { createServer } from "node:http";
import { chromium } from "playwright";

process.env.NODE_ENV = "test";
process.env.AGENT_EXCHANGE_TEST_MODE = "true";
process.env.AGENT_EXCHANGE_ALLOW_TEST_STORAGE = "true";
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
process.env.PRIVATEPAY_MERCHANT_CHECKOUT_ENABLED = "true";
process.env.PRIVATEPAY_FACILITATOR_API_KEY = "fixture-merchant-key";
process.env.PRIVATEPAY_PROVIDER_HANDLE = "provider@magicblock.id";
process.env.PRIVATEPAY_PROVIDER_HANDLE_VERIFIED = "true";
process.env.PRIVATEPAY_PAYMENT_INGRESS = "So11111111111111111111111111111111111111112";

const { handler, resetForTests } = await import("../../src/handler.mjs");

const server = createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const url = new URL(request.url || "/", "http://127.0.0.1");
  const result = await handler({ rawPath: url.pathname, requestContext: { http: { method: request.method, path: url.pathname } }, headers: request.headers, body: Buffer.concat(chunks).toString() || undefined });
  response.writeHead(result.statusCode || 200, Object.fromEntries(Object.entries(result.headers || {}).filter(([, value]) => value != null)));
  response.end(result.body || "");
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", headless: true });

try {
  for (const [viewport, label] of [[{ width: 1366, height: 900 }, "desktop"], [{ width: 390, height: 844 }, "mobile"]]) {
    resetForTests();
    const page = await browser.newPage({ viewport });
    await page.addInitScript(() => {
      const makeWallet = (name, address) => ({ name, publicKey: { toString: () => address }, async connect() { return { publicKey: this.publicKey }; }, async signTransaction() { throw new Error("visual test must not sign"); } });
      window.phantom = { solana: makeWallet("Phantom", "11111111111111111111111111111111") };
      window.solflare = { solana: makeWallet("Solflare", "11111111111111111111111111111111") };
      window.__pdaoStandardWallets = [{
        name: "Jupiter Wallet",
        chains: ["solana:mainnet"],
        accounts: [{ address: "11111111111111111111111111111111" }],
        features: {
          "standard:connect": { async connect() { return { accounts: [{ address: "11111111111111111111111111111111" }] }; } },
          "solana:signTransaction": { async signTransaction() { throw new Error("visual test must not sign"); } },
        },
      }];
    });
    await page.goto(`http://127.0.0.1:${port}/services/privatepay-x402`, { waitUntil: "domcontentloaded" });
    await page.click("#privatePayPay");
    await page.waitForSelector("#privatePayWallets:not([hidden])");
    assert.equal(await page.locator("#privatePayWallets button").count(), 3);
    assert.match(await page.locator("#privatePayWallets").textContent(), /Solflare/);
    assert.match(await page.locator("#privatePayWallets").textContent(), /Phantom/);
    assert.match(await page.locator("#privatePayWallets").textContent(), /Jupiter Wallet/);
    assert.equal(await page.locator("#servicePaymentStatus").textContent(), "Choose the wallet you want to use.");
    assert.match(await page.locator("#privatePayMobileWallets").textContent(), /Open Phantom Mobile/);
    assert.match(await page.locator("#privatePayMobileWallets").textContent(), /Open Solflare Mobile/);
    const layout = await page.evaluate(() => ({ width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    assert.ok(layout.scrollWidth <= layout.width + 1, JSON.stringify(layout));
    await page.screenshot({ path: `/tmp/privatepay-wallet-chooser-${label}.png`, fullPage: true });
    await page.close();
  }
  console.log("PrivatePAY wallet chooser visual test: PASS");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
