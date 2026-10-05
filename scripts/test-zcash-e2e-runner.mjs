import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chmod, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repoRoot = new URL("..", import.meta.url).pathname;
const tmp = await mkdtemp(join(tmpdir(), "pdao-zcash-e2e-runner-"));

try {
  const callsPath = join(tmp, "calls.log");
  const outputPath = join(tmp, "dry-run-artifact.json");
  const fakeZallet = join(tmp, "fake-zallet.mjs");
  const fakeConfig = join(tmp, "zallet.toml");
  await writeFile(fakeConfig, "broadcast = false\n");
  await writeFile(fakeZallet, `#!/usr/bin/env node
import { appendFileSync } from "node:fs";
const rpcIndex = process.argv.indexOf("rpc");
const method = rpcIndex >= 0 ? process.argv[rpcIndex + 1] : "unknown";
appendFileSync(${JSON.stringify(callsPath)}, method + "\\n");
if (method === "getwalletinfo") {
  console.log(JSON.stringify({ locked: false }));
} else if (method === "getwalletstatus") {
  console.log(JSON.stringify({ node_tip: { height: 100 } }));
} else if (method === "z_gettotalbalance") {
  console.log(JSON.stringify({ orchard: "1.0" }));
} else if (method === "z_sendmany") {
  console.error("z_sendmany must not be called in dry-run");
  process.exit(9);
} else {
  console.log(JSON.stringify({ ok: true }));
}
`);
  await chmod(fakeZallet, 0o755);

  const baseEnv = {
    ...process.env,
    PDAO_ZCASH_ZALLET_BINARY: fakeZallet,
    PDAO_ZCASH_ZALLET_DATA_DIR: tmp,
    PDAO_ZCASH_ZALLET_CONFIG: fakeConfig,
    PDAO_ZCASH_SOURCE_ADDRESS: "utest1source",
    PDAO_ZCASH_RECIPIENT_ADDRESS: "utest1recipient",
    PDAO_ZCASH_E2E_OUTPUT: outputPath,
  };

  const noBalance = await runScript({ ...baseEnv, PDAO_ZCASH_DRY_RUN: "1" });
  assert.notEqual(noBalance.code, 0);
  assert.match(`${noBalance.stdout}\n${noBalance.stderr}`, /PDAO_ZCASH_ALLOW_BALANCE_CHECK=1/);
  await assert.rejects(() => stat(outputPath));

  const readinessOnly = await runScript({
    ...baseEnv,
    PDAO_ZCASH_ALLOW_BALANCE_CHECK: "1",
    PDAO_ZCASH_DRY_RUN: "1",
  });
  assert.equal(readinessOnly.code, 0);
  const calls = await readFile(callsPath, "utf8");
  assert.match(calls, /getwalletinfo/);
  assert.match(calls, /getwalletstatus/);
  assert.match(calls, /z_gettotalbalance/);
  assert.doesNotMatch(calls, /z_sendmany/);

  const artifact = JSON.parse(await readFile(outputPath, "utf8"));
  assert.equal(artifact.network, "zcash-testnet");
  assert.equal(artifact.state, "prepared");
  assert.equal(artifact.balanceReadinessChecked, true);
  assert.equal(artifact.broadcastAttempted, false);
  assert.equal(artifact.atomicAmount, "10000");
  assert.ok(Array.isArray(artifact.requiredSigners));
} finally {
  await rm(tmp, { recursive: true, force: true });
}

console.log("[zcash-e2e-runner] balance gate, dry-run artifact, and no-broadcast runner checks passed");

function runScript(env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", "scripts/run-zcash-testnet-e2e.mjs"], {
      cwd: repoRoot,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Zcash E2E runner test timeout"));
    }, 120_000);
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}
