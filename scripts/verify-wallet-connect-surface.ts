import fs from "fs";
import http from "http";
import path from "path";

import { chromium, type Browser } from "playwright-core";

const ROOT = process.cwd();
const WEB_OUT_DIR = path.resolve(ROOT, "apps/web/out");
const SURFACE_DIR = process.env.PDAO_WALLET_SURFACE_DIR
  ? path.resolve(process.env.PDAO_WALLET_SURFACE_DIR)
  : fs.existsSync(WEB_OUT_DIR)
    ? WEB_OUT_DIR
    : path.resolve(ROOT);

const CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function findChrome(): string {
  const candidates = [
    process.env.CHROME_PATH,
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/brave-browser",
  ].filter(Boolean) as string[];

  const chrome = candidates.find((candidate) => fs.existsSync(candidate));
  if (!chrome) {
    throw new Error(`No Chrome-compatible browser found. Checked: ${candidates.join(", ")}`);
  }
  return chrome;
}

function createStaticServer() {
  return http.createServer((req, res) => {
    try {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      const normalizedPath =
        url.pathname === "/"
          ? "/index.html"
          : url.pathname === "/PrivateDAO/" || url.pathname === "/PrivateDAO"
            ? "/index.html"
            : url.pathname.startsWith("/PrivateDAO/")
              ? url.pathname.slice("/PrivateDAO".length)
              : url.pathname;
      const requestedPath = decodeURIComponent(normalizedPath);
      const candidatePath = path.resolve(SURFACE_DIR, `.${requestedPath}`);
      const resolvedPath =
        fs.existsSync(candidatePath) && fs.statSync(candidatePath).isDirectory()
          ? path.join(candidatePath, "index.html")
          : candidatePath;

      if (!resolvedPath.startsWith(`${SURFACE_DIR}${path.sep}`) && resolvedPath !== SURFACE_DIR) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }

      if (!fs.existsSync(resolvedPath) || fs.statSync(resolvedPath).isDirectory()) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const ext = path.extname(resolvedPath);
      res.writeHead(200, { "content-type": CONTENT_TYPES[ext] || "application/octet-stream" });
      fs.createReadStream(resolvedPath).pipe(res);
    } catch (error) {
      res.writeHead(500);
      res.end("Internal test server error.");
    }
  });
}

function listen(server: http.Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Unable to resolve wallet-surface server port."));
        return;
      }
      resolve(address.port);
    });
  });
}

function close(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function main() {
  const chrome = findChrome();
  const server = createStaticServer();
  const port = await listen(server);
  // The brand home is intentionally wallet-free. Verify the dedicated
  // wallet-first product route instead of waiting for a control that cannot
  // exist on the home page.
  const url = `http://127.0.0.1:${port}/PrivateDAO/services/eitherway-live-dapp/`;
  let browser: Browser | undefined;

  try {
    browser = await chromium.launch({
      executablePath: chrome,
      headless: true,
    });
    for (const viewport of [{ name: "desktop", width: 1440, height: 1200 }, { name: "mobile", width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const failures: string[] = [];

      page.on("pageerror", (error) => {
        if (!error.message.includes("Minified React error #418")) failures.push(`[pageerror] ${error.message}`);
      });
      page.on("requestfailed", (request) => {
        if (request.method() === "HEAD" || isAllowedExternalRequest(request.url())) return;
        const errorText = request.failure()?.errorText || "";
        if (!errorText.includes("net::ERR_ABORTED")) failures.push(`${request.method()} ${request.url()} :: ${errorText}`);
      });

      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(5000);
      const button = page.locator("[data-wallet-connect-trigger='true']").first();
      const buttonText = (await button.textContent())?.trim();
      if (!buttonText?.toLowerCase().includes("connect")) throw new Error(`${viewport.name}: wallet trigger label is ${buttonText ?? "empty"}`);
      if (await button.isDisabled()) throw new Error(`${viewport.name}: wallet trigger stayed disabled after hydration.`);
      await button.click();
      const picker = page.getByRole("heading", { name: /choose a supported wallet/i });
      await picker.waitFor({ state: "visible", timeout: 5000 });
      const pickerText = await page.locator("body").innerText();
      for (const walletName of ["Solflare", "Phantom", "Glow", "Backpack"]) {
        if (!pickerText.includes(walletName)) throw new Error(`${viewport.name}: wallet picker is missing ${walletName}.`);
      }
      await page.getByRole("button", { name: /open all wallet options/i }).click();
      const walletModal = page.locator(".wallet-adapter-modal:visible").first();
      await walletModal.waitFor({ state: "visible", timeout: 5000 });
      const walletModalText = await walletModal.innerText();
      if (!walletModalText.includes("Solflare") && !walletModalText.includes("Phantom")) {
        throw new Error(`${viewport.name}: adapter modal did not expose a Solana wallet option.`);
      }
      if (failures.length > 0) throw new Error(`${viewport.name}: wallet surface emitted failures:\n${failures.join("\n")}`);
      await page.close();
    }

    console.log("Wallet connect surface verification: PASS desktop+mobile");
  } finally {
    await browser?.close().catch(() => undefined);
    await close(server);
  }
}

function isAllowedExternalRequest(requestUrl: string): boolean {
  try {
    const url = new URL(requestUrl);
    if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") return true;
    if (url.hostname !== "api.privatedao.org") return false;
    return url.pathname.startsWith("/api/v1/freshness/") || url.pathname.startsWith("/api/v1/visitors/");
  } catch {
    return false;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
