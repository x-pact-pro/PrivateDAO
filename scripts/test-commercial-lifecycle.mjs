import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

const port = 8897;
const stateDir = await mkdtemp(`${tmpdir()}/privatedao-commercial-`);
const env = {
  ...process.env,
  PRIVATE_DAO_READ_NODE_PORT: String(port),
  PRIVATE_DAO_RUNTIME_STATE_DIR: stateDir,
  PD_SOLANA_NETWORK: "mainnet",
  PD_SOLANA_TREASURY: "2BJ4ezxqV9YJXc38D9duKBkdn4su4jE1beKUHwH663sL",
  PD_ACCEPTED_TOKEN_MINT: "9isGuumtaqvJeJeyLF44fvfskk2cv5mYsopexMBfpump",
  PD_ACCEPTED_TOKEN_SYMBOL: "PDAO",
  PD_ACCEPTED_TOKEN_DECIMALS: "6",
  PD_PLAN_PROFESSIONAL_PDAO: "1000",
  PD_REQUIRED_CONFIRMATIONS: "32",
  PD_REQUIRED_COMMITMENT: "finalized",
  PD_PAYMENT_EXPIRY_MINUTES: "30",
};
const child = spawn(process.execPath, ["--import", "tsx", "scripts/run-read-node.ts"], { cwd: process.cwd(), env, stdio: ["ignore", "pipe", "pipe"] });
let output = "";
child.stdout.on("data", (chunk) => { output += chunk.toString(); });
child.stderr.on("data", (chunk) => { output += chunk.toString(); });

async function waitForHealth() {
  // The read-node performs a cold TypeScript/SQLite initialization before it
  // binds the socket. Keep the readiness budget separate from request timeouts
  // so a slow local cold start is not reported as a service failure.
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (output.includes(`PrivateDAO read node listening on http://127.0.0.1:${port}`)) return;
    if (child.exitCode !== null) {
      throw new Error(`read-node exited before becoming healthy (code ${child.exitCode}): ${output.slice(-2000)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`read-node did not become healthy: ${output.slice(-1000)}`);
}

function assert(condition, message) { if (!condition) throw new Error(message); }

try {
  await waitForHealth();
  const prepare = await fetch(`http://127.0.0.1:${port}/api/v1/commercial/orders/prepare`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ organizationName: "Commercial lifecycle test", plan: "PROFESSIONAL", asset: "PDAO_SOL" }),
  });
  const prepared = await prepare.json();
  assert(prepare.ok && prepared.ok, "order prepare failed");
  assert(prepared.order?.orderId?.startsWith("ord_"), "orderId was not generated");
  assert(prepared.order?.treasuryAddress === env.PD_SOLANA_TREASURY, "treasury binding mismatch");
  assert(prepared.payment?.tokenMint === env.PD_ACCEPTED_TOKEN_MINT, "accepted token mint mismatch");
  assert(prepared.payment?.exactAtomicAmount === "1000000000", "PDAO atomic amount mismatch");
  assert(Date.parse(prepared.order.expiresAt) > Date.now(), "order expiry was not created");

  const invalid = await fetch(`http://127.0.0.1:${port}/api/v1/commercial/orders/verify`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ orderId: prepared.order.orderId, signature: "invalid" }),
  });
  const invalidBody = await invalid.json();
  assert(invalid.status === 422 && invalidBody.status === "payment-not-verified", "invalid payment was not rejected");
  console.log("Commercial lifecycle preflight: PASS (order, PDAO binding, expiry, invalid payment rejection)");
} finally {
  child.kill("SIGTERM");
  await new Promise((resolve) => setTimeout(resolve, 500));
  child.kill("SIGKILL");
  await Promise.race([new Promise((resolve) => child.once("exit", resolve)), new Promise((resolve) => setTimeout(resolve, 1000))]);
  await rm(stateDir, { recursive: true, force: true });
}
