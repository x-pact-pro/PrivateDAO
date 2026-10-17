import assert from "node:assert/strict";
import { createServer } from "node:http";
import { handler, resetForTests } from "../../src/handler.mjs";
import { chromium } from "playwright";

const mcpUrl = "https://example.com/mcp";
const payout = "2BJ4ezxqV9YJXc38D9duKBkdn4su4jE1beKUHwH663sL";
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options = {}) => {
  if (String(url) !== mcpUrl) return originalFetch(url, options);
  const request = JSON.parse(options.body || "{}");
  if (request.method === "initialize") return new Response(JSON.stringify({ jsonrpc: "2.0", id: request.id, result: { protocolVersion: "2025-06-18", serverInfo: { name: "Browser Fixture Seller", version: "1.0.0" }, capabilities: { tools: {} } } }), { status: 200, headers: { "content-type": "application/json", "mcp-session-id": "browser-fixture" } });
  if (request.method === "notifications/initialized") return new Response("", { status: 202 });
  if (request.method === "tools/list") return new Response(JSON.stringify({ jsonrpc: "2.0", id: request.id, result: { tools: [
    { name: "read", description: "Read-only browser fixture", inputSchema: { type: "object", properties: {} }, annotations: { readOnlyHint: true } },
    { name: "build_transfer", description: "Blocked side-effect fixture", inputSchema: { type: "object" }, annotations: { readOnlyHint: false } },
  ] } }), { status: 200, headers: { "content-type": "application/json", "mcp-session-id": "browser-fixture" } });
  throw new Error(`unexpected MCP fixture method: ${request.method}`);
};

const server = createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const parsedUrl = new URL(request.url || "/", "http://127.0.0.1");
  const safePath = parsedUrl.pathname
    .split("/")
    .map((segment) => /^[A-Za-z0-9._-]+$/.test(segment) ? segment : "")
    .join("/") || "/";
  const result = await handler({ rawPath: safePath, requestContext: { http: { method: request.method, path: safePath } }, headers: request.headers, body: Buffer.concat(chunks).toString() || undefined });
  const headers = Object.fromEntries(Object.entries(result.headers || {}).filter(([, value]) => value !== undefined && value !== null));
  response.writeHead(result.statusCode || 200, headers);
  response.end(result.body ? Buffer.from(result.body, "utf8") : "");
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROME_PATH || "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
});

async function runViewport(viewport, label) {
  resetForTests();
  const page = await browser.newPage({ viewport });
  page.on("pageerror", (error) => console.error(`${label} browser page error: ${error.stack || error.message}`));
  try {
    await page.goto(`http://127.0.0.1:${port}/sellers`, { waitUntil: "domcontentloaded" });
    await page.fill("#agentName", "Browser Fixture Seller");
    await page.fill("#endpoint", mcpUrl);
    await page.click("#verify");
    await page.waitForSelector("#step2:not(.hidden)");
    const choices = page.locator('#tools input[type="checkbox"]');
    assert.equal(await choices.count(), 2);
    assert.equal(await choices.nth(0).isDisabled(), false);
    assert.equal(await choices.nth(1).isDisabled(), true);
    await choices.nth(0).check();
    await page.setInputFiles("#metadataFile", { name: "services.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify([{ id: "read", tool: "read", title: "Browser read", price: 0.02, asset: "USDC", network: "solana-mainnet-beta" }])) });
    await page.waitForFunction(() => document.querySelector("#metadataImport")?.value.includes("Browser read"));
    assert.match(await page.inputValue("#metadataImport"), /Browser read/);
    await page.waitForFunction(() => document.querySelector("#notice")?.textContent.includes("Metadata imported"));
    assert.match(await page.locator("#notice").textContent(), /Metadata imported/);
    await page.evaluate(() => {
      const result = document.querySelector("#paymentResult");
      result.innerHTML = '<button id="retryPayment" type="button">Retry verification (do not pay again)</button>';
    });
    await page.waitForFunction(() => document.querySelector("#retryPayment")?.dataset.retryBound === "1");
    await page.click("#to3");
    await page.fill("#payoutAddress", payout);
    await page.click("#to4");
    await page.check("#terms");
    const basicTier = page.locator('input[name="listingTier"][value="basic"]');
    if (await basicTier.count()) await basicTier.check();
    await page.click("#createQuote");
    await page.waitForSelector("#step5:not(.hidden)");
    assert.equal(await page.locator("#pay").isEnabled(), true);
    assert.match(await page.locator("#paymentSummary").textContent(), /Quote ready/);
    assert.equal(new URL(page.url()).search, "");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
    console.log(`Seller browser E2E ${label}: PASS`);
  } finally {
    await page.close();
  }
}

try {
  await runViewport({ width: 1280, height: 900 }, "desktop");
  await runViewport({ width: 390, height: 844 }, "mobile");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  globalThis.fetch = originalFetch;
}
