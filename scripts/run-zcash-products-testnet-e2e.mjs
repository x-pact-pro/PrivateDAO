import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const runner = path.join(root, "scripts/run-zcash-testnet-e2e.mjs");
const outputPath = process.env.PDAO_ZCASH_PRODUCTS_E2E_OUTPUT?.trim()
  || path.join(root, "docs/evidence/zcash-testnet-products-e2e.json");
const timeoutMs = Number(process.env.PDAO_ZCASH_PRODUCTS_E2E_TIMEOUT_MS || "1200000");
assert(Number.isInteger(timeoutMs) && timeoutMs >= 30_000, "PDAO_ZCASH_PRODUCTS_E2E_TIMEOUT_MS must be at least 30000.");

const products = [
  ["blind-verification", "verification.blind.prove"],
  ["record-verification", "verification.record.create"],
  ["payroll", "payroll.settle"],
  ["treasury", "treasury.policy.check"],
  ["governance", "governance.proposal.execute"],
  ["auction", "auction.settle"],
];

if (process.env.PDAO_ZCASH_NETWORK && process.env.PDAO_ZCASH_NETWORK !== "testnet") {
  throw new Error("Zcash product E2E is Testnet-only.");
}
if (process.env.PDAO_ZCASH_BROADCAST_ENABLED !== "1" && process.env.PDAO_ZCASH_DRY_RUN !== "1") {
  throw new Error("Set PDAO_ZCASH_DRY_RUN=1 or explicitly enable Testnet broadcast.");
}

const results = [];
for (const [product, capability] of products) {
  const result = await runOne(product, capability);
  results.push(result);
}

const artifact = {
  schema: "privatedao.zcash-testnet-products-e2e.v1",
  network: "zcash-testnet",
  environment: "testnet",
  generatedAt: new Date().toISOString(),
  broadcastEnabled: process.env.PDAO_ZCASH_BROADCAST_ENABLED === "1",
  products: results,
};
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({ schema: artifact.schema, network: artifact.network, productCount: results.length, outputPath }, null, 2));

const failures = results.filter((result) => result.status !== "pass");
if (failures.length > 0) {
  throw new Error(`${failures.length}/${results.length} Zcash product lanes failed; see ${outputPath} for per-lane diagnostics.`);
}

async function runOne(product, capability) {
  const tempOutput = `${outputPath}.${product}.json`;
  const env = {
    ...process.env,
    PDAO_ZCASH_NETWORK: "testnet",
    PDAO_ZCASH_PRODUCT: product,
    PDAO_ZCASH_CAPABILITY: capability,
    PDAO_ZCASH_E2E_OUTPUT: tempOutput,
  };
  const child = spawn(process.execPath, ["--import", "tsx", runner], {
    cwd: root,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
  const status = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`${product}/${capability} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("close", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal });
    });
  });
  if (status.code !== 0) {
    return {
      product,
      capability,
      status: "fail",
      exitCode: status.code,
      signal: status.signal,
      diagnostic: diagnosticTail(stdout, stderr),
    };
  }
  const evidence = JSON.parse(await readFile(tempOutput, "utf8"));
  assert.equal(evidence.network, "zcash-testnet");
  assert.equal(evidence.product, product);
  assert.equal(evidence.capability, capability);
  if (process.env.PDAO_ZCASH_DRY_RUN === "1") assert.equal(evidence.broadcastAttempted, false);
  return {
    product,
    capability,
    status: evidence.state === "finalized" || evidence.state === "prepared" ? "pass" : "fail",
    executionId: evidence.executionId,
    signature: evidence.signature,
    blockNumber: evidence.blockNumber,
    stdoutTail: stdout.trim().split("\n").slice(-3),
    stderrTail: stderr.trim().split("\n").slice(-3),
  };
}

function diagnosticTail(stdout, stderr) {
  const lines = `${stdout}\n${stderr}`
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.slice(-8);
}
