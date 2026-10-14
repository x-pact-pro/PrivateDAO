import { spawn } from "node:child_process";

const timeoutMs = Number(process.env.PDAO_ZCASH_WAIT_TIMEOUT_MS || "3600000");
const intervalMs = Number(process.env.PDAO_ZCASH_WAIT_INTERVAL_MS || "60000");
const startedAt = Date.now();
const deadline = startedAt + timeoutMs;

if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error("PDAO_ZCASH_WAIT_TIMEOUT_MS must be a positive number.");
if (!Number.isFinite(intervalMs) || intervalMs <= 0) throw new Error("PDAO_ZCASH_WAIT_INTERVAL_MS must be a positive number.");

let lastStatus = null;
while (Date.now() <= deadline) {
  lastStatus = await runStatus();
  const summary = {
    checkedAt: new Date().toISOString(),
    readiness: lastStatus.readiness,
    readyForBalanceCheck: lastStatus.readyForBalanceCheck,
    remainingBlocks: lastStatus.remainingBlocks,
    netCatchupBlocksPerMinute: lastStatus.netCatchupBlocksPerMinute,
    estimatedNetCatchupMinutes: lastStatus.estimatedNetCatchupMinutes,
    balanceChecked: lastStatus.balanceChecked,
    broadcastAttempted: lastStatus.broadcastAttempted,
  };
  console.log(JSON.stringify(summary));
  if (lastStatus.readyForBalanceCheck === true) {
    console.log(JSON.stringify({
      final: true,
      reason: "ready_for_explicit_balance_check",
      elapsedMs: Date.now() - startedAt,
      status: lastStatus,
    }, null, 2));
    process.exit(0);
  }
  await delay(intervalMs);
}

console.error(JSON.stringify({
  final: true,
  reason: "timeout_waiting_for_zcash_sync",
  elapsedMs: Date.now() - startedAt,
  status: lastStatus,
}, null, 2));
process.exit(2);

function runStatus() {
  return new Promise((resolve, reject) => {
    const statusScript = process.env.PDAO_ZCASH_STATUS_SCRIPT || "scripts/check-zcash-testnet-sync.mjs";
    const child = spawn(process.execPath, [statusScript], {
      cwd: new URL("..", import.meta.url).pathname,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Zcash status check timeout"));
    }, 30_000);
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Zcash status check exited with ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error("Zcash status check returned invalid JSON."));
      }
    });
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
