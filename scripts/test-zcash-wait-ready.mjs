import assert from "node:assert/strict";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const repoRoot = new URL("..", import.meta.url).pathname;
const tmp = await mkdtemp(join(tmpdir(), "pdao-zcash-wait-"));

try {
  const readyScript = join(tmp, "ready.mjs");
  const syncingScript = join(tmp, "syncing.mjs");
  await writeFile(readyScript, `console.log(JSON.stringify({ readiness: "ready_for_explicit_balance_check", readyForBalanceCheck: true, remainingBlocks: 0, balanceChecked: false, broadcastAttempted: false }));\n`);
  await writeFile(syncingScript, `console.log(JSON.stringify({ readiness: "syncing", readyForBalanceCheck: false, remainingBlocks: 1000, balanceChecked: false, broadcastAttempted: false }));\n`);
  await chmod(readyScript, 0o755);
  await chmod(syncingScript, 0o755);

  const ready = await runWait({ PDAO_ZCASH_STATUS_SCRIPT: readyScript, PDAO_ZCASH_WAIT_TIMEOUT_MS: "5000", PDAO_ZCASH_WAIT_INTERVAL_MS: "100" });
  assert.equal(ready.code, 0);
  assert.match(ready.stdout, /ready_for_explicit_balance_check/);

  const timeout = await runWait({ PDAO_ZCASH_STATUS_SCRIPT: syncingScript, PDAO_ZCASH_WAIT_TIMEOUT_MS: "500", PDAO_ZCASH_WAIT_INTERVAL_MS: "100" });
  assert.equal(timeout.code, 2);
  assert.match(timeout.stderr, /timeout_waiting_for_zcash_sync/);
} finally {
  await rm(tmp, { recursive: true, force: true });
}

console.log("[zcash-wait-ready] ready and timeout wait paths passed");

function runWait(extraEnv) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/wait-zcash-testnet-ready.mjs"], {
      cwd: repoRoot,
      env: { ...process.env, ...extraEnv },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("wait-ready test timeout"));
    }, 15_000);
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}
