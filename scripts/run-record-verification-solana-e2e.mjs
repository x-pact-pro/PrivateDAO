import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access } from "node:fs/promises";

const env = { ...process.env };
const port = Number(env.RECORD_TEST_PORT || 18891);
const missing = [];
if (env.PDAO_RECORD_ANCHOR_BROADCAST_ENABLED !== "1") missing.push("PDAO_RECORD_ANCHOR_BROADCAST_ENABLED=1");
if (env.PDAO_RECORD_ANCHOR_E2E_APPROVED !== "1") missing.push("PDAO_RECORD_ANCHOR_E2E_APPROVED=1");
if (!env.PDAO_RECORD_ANCHOR_KEYPAIR_PATH) missing.push("PDAO_RECORD_ANCHOR_KEYPAIR_PATH");
if (env.PDAO_RECORD_ANCHOR_KEYPAIR_PATH) {
  try { await access(env.PDAO_RECORD_ANCHOR_KEYPAIR_PATH); } catch { missing.push("PDAO_RECORD_ANCHOR_KEYPAIR_PATH must point to an existing secure file"); }
}
if (missing.length > 0) {
  console.error(`Solana Record E2E refused before signer access: ${missing.join(", ")}`);
  process.exitCode = 2;
} else {
  const service = spawn(process.execPath, ["--import", "tsx", "scripts/record-anchor-service.mjs"], {
    env: { ...env, RECORD_TEST_PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serviceOutput = "";
  service.stdout.on("data", (chunk) => { serviceOutput += chunk.toString(); });
  service.stderr.on("data", (chunk) => { serviceOutput += chunk.toString(); });
  try {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (serviceOutput.includes("record-anchor-service listening")) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.match(serviceOutput, /record-anchor-service listening/);
    const result = await new Promise((resolve) => {
      const test = spawn(process.execPath, ["scripts/test-record-verification-solana-e2e.mjs"], {
        env: { ...env, RECORD_TEST_PORT: String(port), PRIVATEDAO_RECORD_ANCHOR_URL: `http://127.0.0.1:${port}` },
        stdio: "inherit",
      });
      test.once("exit", (code, signal) => resolve({ code: code ?? 1, signal }));
    });
    if (result.signal) throw new Error(`Solana Record E2E terminated by ${result.signal}`);
    process.exitCode = result.code;
  } finally {
    service.kill("SIGTERM");
    await new Promise((resolve) => service.once("exit", resolve));
  }
}
