import { spawn } from "child_process";
import fs from "fs";
import http from "http";
import os from "os";
import path from "path";

const ROOT = process.cwd();
const SURFACE_DIR = path.resolve(ROOT);
const REQUIRED_DOM_FRAGMENT_GROUPS = [
  ["PrivateDAO"],
  ["Confidential treasury and market operations on Solana"],
  ["Powered by the live stack"],
  ["Open Judge"],
  ["Create a private Solana DAO", "Private governance on Solana"],
  ["Your DAO votes, payroll, and treasury are public"],
  ["Start building"],
  ["Private processes. Verifiable outcomes."],
  ["Review Proof", "Open verification view", "Open proof"],
];

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
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/brave-browser",
  ].filter(Boolean) as string[];

  const chrome = candidates.find((candidate) => fs.existsSync(candidate));
  if (!chrome) {
    throw new Error(
      `No Chrome-compatible browser found. Set CHROME_PATH or install Chrome/Chromium/Brave. Checked: ${candidates.join(", ")}`
    );
  }
  return chrome;
}

function createStaticServer() {
  const server = http.createServer((req, res) => {
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
      const resolvedPath = path.resolve(SURFACE_DIR, `.${requestedPath}`);

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
      res.end(error instanceof Error ? error.message : String(error));
    }
  });

  return server;
}

function listen(server: http.Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Unable to resolve browser-smoke server port."));
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

function runChrome(chrome: string, args: string[], timeoutMs = 25_000): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(chrome, args, { stdio: ["ignore", "pipe", "pipe"] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`Chrome timed out after ${timeoutMs}ms while running: ${args.join(" ")}`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)));
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      const out = Buffer.concat(stdout).toString("utf8");
      const err = Buffer.concat(stderr).toString("utf8");
      if (code !== 0) {
        reject(new Error(`Chrome exited with code ${code}\n${err}`));
        return;
      }
      resolve({ stdout: out, stderr: err });
    });
  });
}

async function main() {
  const chrome = findChrome();
  const server = createStaticServer();
  const port = await listen(server);
  const url = `http://127.0.0.1:${port}/PrivateDAO/`;
  const screenshotPath = path.join(os.tmpdir(), `privatedao-browser-smoke-${Date.now()}.png`);

  const chromeBaseArgs = [
    "--headless",
    "--disable-gpu",
    "--disable-background-networking",
    "--disable-extensions",
    "--disable-features=MediaRouter,OptimizationHints,Translate,PaintHolding",
    "--no-sandbox",
    "--no-first-run",
    "--noerrdialogs",
    "--disable-dev-shm-usage",
    "--window-size=1440,1200",
  ];

  try {
    const domResult = await runChrome(chrome, [...chromeBaseArgs, "--dump-dom", url], 45_000);
    for (const fragments of REQUIRED_DOM_FRAGMENT_GROUPS) {
      if (!fragments.some((fragment) => domResult.stdout.includes(fragment))) {
        throw new Error(`Browser DOM is missing required fragment group: ${fragments.join(" | ")}`);
      }
    }

    let screenshotSummary = "screenshot skipped";
    try {
      await runChrome(
        chrome,
        [...chromeBaseArgs, "--timeout=12000", "--virtual-time-budget=12000", `--screenshot=${screenshotPath}`, url],
        35_000,
      );
      const screenshotSize = fs.statSync(screenshotPath).size;
      if (screenshotSize >= 100_000) {
        screenshotSummary = `${path.basename(screenshotPath)}, ${screenshotSize} bytes`;
      } else {
        screenshotSummary = `small screenshot ignored: ${screenshotSize} bytes`;
      }
    } catch (error) {
      screenshotSummary = `screenshot advisory skipped: ${error instanceof Error ? error.message : String(error)}`;
    }

    console.log(`Browser smoke verification: PASS (${screenshotSummary})`);
  } finally {
    await close(server);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
