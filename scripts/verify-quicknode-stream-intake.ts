import { createHmac } from "crypto";
import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import fs from "fs";

const PORT = Number(process.env.PRIVATE_DAO_QUICKNODE_VERIFY_PORT || 8798);
const TOKEN = "local-quicknode-stream-secret";
const PROGRAM_ID = "EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva";
const BASE_URL = `http://127.0.0.1:${PORT}`;

function makePayload(signature: string, computeUnitsConsumed: number) {
  return JSON.stringify({
    data: [
      {
        transactions: [
          {
            signature,
            slot: 410288417,
            meta: {
              err: null,
              computeUnitsConsumed,
              logMessages: [`Program ${PROGRAM_ID} invoke [1]`, `Program ${PROGRAM_ID} success`],
            },
          },
        ],
      },
    ],
  });
}

function hmacHeaders(payload: string, token = TOKEN) {
  const nonce = `verify-${Date.now()}`;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", Buffer.from(token)).update(nonce + timestamp + payload).digest("hex");
  return {
    "content-type": "application/json",
    "x-qn-nonce": nonce,
    "x-qn-timestamp": timestamp,
    "x-qn-signature": signature,
  };
}

async function waitForReadNode(child: ChildProcessWithoutNullStreams) {
  const deadline = Date.now() + 45_000;
  let lastError = "";
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`read-node exited early with code ${child.exitCode}`);
    }
    try {
      const response = await fetch(`${BASE_URL}/api/v1/quicknode/stream/stats`);
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`read-node QuickNode stream route did not become ready: ${lastError}`);
}

async function expectJson(url: string, init: RequestInit, expectedStatus: number) {
  const response = await fetch(url, init);
  const body = (await response.json()) as unknown;
  if (response.status !== expectedStatus) {
    throw new Error(`unexpected HTTP status for ${url}: expected ${expectedStatus}, got ${response.status}`);
  }
  return body as Record<string, unknown>;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const runbook = fs.readFileSync("docs/quicknode-stream-intelligence.md", "utf8");
  const surface = fs.readFileSync("apps/web/src/components/quicknode-stream-intelligence-surface.tsx", "utf8");
  assert(runbook.includes("production destination: `https://api.privatedao.org/api/v1/quicknode/stream`"), "QuickNode runbook is missing the API stream destination");
  assert(runbook.includes("do not use: `https://privatedao.org/`"), "QuickNode runbook must warn against posting streams to the static root domain");
  assert(surface.includes("Do not point QuickNode at privatedao.org; use the api subdomain."), "QuickNode surface is missing the static-root warning");

  const caddyfile = fs.readFileSync("deploy/primary-host/Caddyfile", "utf8");
  assert(caddyfile.includes("@quicknode_root"), "Caddyfile is missing QuickNode root POST matcher");
  assert(caddyfile.includes("rewrite * /api/v1/quicknode/stream"), "Caddyfile is missing QuickNode stream rewrite");

  const child = spawn("npm", ["run", "start:read-node"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      QUICKNODE_STREAM_TOKEN: TOKEN,
      PRIVATE_DAO_READ_NODE_PORT: String(PORT),
      PRIVATE_DAO_RUNTIME_STATE_DIR: `/tmp/privatedao-quicknode-verify-${process.pid}`,
    },
    stdio: "pipe",
    detached: true,
  });

  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  try {
    await waitForReadNode(child);

    const validPayload = makePayload("verify-hmac-valid", 11111);
    const valid = await expectJson(
      `${BASE_URL}/api/v1/quicknode/stream`,
      { method: "POST", headers: hmacHeaders(validPayload), body: validPayload },
      202,
    );
    assert(valid.ok === true, "valid HMAC payload was not accepted");
    assert((valid.summary as Record<string, unknown>)?.privateDaoTransactionCount === 1, "valid HMAC payload did not count PrivateDAO transaction");

    const invalidPayload = makePayload("verify-hmac-invalid", 22222);
    const invalid = await expectJson(
      `${BASE_URL}/api/v1/quicknode/stream`,
      { method: "POST", headers: hmacHeaders(invalidPayload, "wrong-token"), body: invalidPayload },
      401,
    );
    assert(invalid.ok === false, "invalid HMAC payload was accepted");

    const directTokenPayload = makePayload("verify-direct-token", 33333);
    const direct = await expectJson(
      `${BASE_URL}/api/v1/quicknode/stream`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-private-dao-stream-token": TOKEN,
        },
        body: directTokenPayload,
      },
      202,
    );
    assert(direct.ok === true, "direct token fallback payload was not accepted");

    const stats = await expectJson(`${BASE_URL}/api/v1/quicknode/stream/stats`, { method: "GET" }, 200);
    const statsBody = stats.stats as Record<string, unknown>;
    assert(statsBody.auth === "configured", "stream stats did not report configured auth");
    assert(statsBody.rawPayloadStorage === "disabled", "stream stats must keep raw payload storage disabled");
    assert((statsBody.acceptedAuthHeaders as string[]).includes("X-QN-Nonce + X-QN-Timestamp + X-QN-Signature"), "stream stats missing HMAC auth mode");

    console.log("QuickNode stream intake verification: PASS");
  } finally {
    try {
      if (child.pid) process.kill(-child.pid, "SIGTERM");
      else child.kill("SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
    if (stderr.trim()) {
      process.stderr.write(stderr);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
