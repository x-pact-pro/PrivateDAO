import { spawn } from "node:child_process";

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
};

const binaryPath = required("PDAO_ZCASH_ZALLET_BINARY");
const dataDirectory = required("PDAO_ZCASH_ZALLET_DATA_DIR");
const configPath = required("PDAO_ZCASH_ZALLET_CONFIG");
const journalUnit = process.env.PDAO_ZCASH_ZALLET_UNIT?.trim() || "pdao-zallet-testnet.service";
const zebraUnit = process.env.PDAO_ZCASH_ZEBRA_UNIT?.trim() || "pdao-zebrad-testnet.service";

const status = await zalletRpc("getwalletstatus").catch((error) => ({ rpcError: error.message }));
const journal = await journalTail(journalUnit).catch(() => "");
const zebraJournal = await journalTail(zebraUnit).catch(() => "");
const scan = latestScan(journal);
const rate = scanRate(journal);
const tipRate = latestHeightRate(journal);
const latest = latestHeight(journal);
const zebraSync = latestZebraSync(zebraJournal);

const nodeTip = numberOrNull(status?.node_tip?.height);
const walletTip = numberOrNull(status?.wallet_tip?.height);
const fullySyncedHeight = numberOrNull(status?.fully_synced_height);
const scanStart = scan?.start ?? null;
const scanEnd = scan?.end ?? null;
const observedTip = nodeTip ?? latest ?? null;
const observedWalletHeight = walletTip ?? scanStart;
const balanceCheckLagThreshold = Number(process.env.PDAO_ZCASH_BALANCE_CHECK_LAG_THRESHOLD || "100");
const remainingBlocks = observedTip !== null && observedWalletHeight !== null
  ? Math.max(0, observedTip - observedWalletHeight)
  : null;
const estimatedCatchupMinutes = remainingBlocks !== null && rate.blocksPerMinute !== null && rate.blocksPerMinute > 0
  ? Math.ceil(remainingBlocks / rate.blocksPerMinute)
  : null;
const netCatchupBlocksPerMinute = rate.blocksPerMinute !== null && tipRate.blocksPerMinute !== null
  ? Math.round((rate.blocksPerMinute - tipRate.blocksPerMinute) * 100) / 100
  : null;
const estimatedNetCatchupMinutes = remainingBlocks !== null && netCatchupBlocksPerMinute !== null && netCatchupBlocksPerMinute > 0
  ? Math.ceil(remainingBlocks / netCatchupBlocksPerMinute)
  : null;
const readyForBalanceCheck = remainingBlocks !== null && remainingBlocks <= balanceCheckLagThreshold;
const readiness = readyForBalanceCheck
  ? "ready_for_explicit_balance_check"
  : remainingBlocks === null
    ? "unknown"
    : "syncing";

console.log(JSON.stringify({
  network: "zcash-testnet",
  service: journalUnit,
  zebraService: zebraUnit,
  zalletStatusRpc: "rpcError" in status ? "unavailable" : "available",
  zebraCurrentHeight: zebraSync?.currentHeight ?? null,
  zebraRemainingSyncBlocks: zebraSync?.remainingSyncBlocks ?? null,
  zebraSyncPercent: zebraSync?.syncPercent ?? null,
  nodeTip,
  walletTip,
  fullySyncedHeight,
  journalLatestHeight: latest,
  journalScanStart: scanStart,
  journalScanEnd: scanEnd,
  remainingBlocks,
  balanceCheckLagThreshold,
  readiness,
  readyForBalanceCheck,
  scanSamples: rate.samples,
  scanBlocksPerMinute: rate.blocksPerMinute,
  tipSamples: tipRate.samples,
  tipBlocksPerMinute: tipRate.blocksPerMinute,
  netCatchupBlocksPerMinute,
  estimatedCatchupMinutes,
  estimatedNetCatchupMinutes,
  balanceChecked: false,
  broadcastAttempted: false,
}, null, 2));

function numberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function latestScan(text) {
  const matches = [...text.matchAll(/Scanning blocks Verify\((\d+)\.\.(\d+)\)/g)];
  const last = matches.at(-1);
  return last ? { start: Number(last[1]), end: Number(last[2]) } : null;
}

function latestHeight(text) {
  const matches = [...text.matchAll(/Latest block height is (\d+)/g)];
  const last = matches.at(-1);
  return last ? Number(last[1]) : null;
}

function latestZebraSync(text) {
  const lines = text.split("\n").filter((line) => line.includes("zebrad::components::sync::progress"));
  const last = lines.at(-1);
  if (!last) return null;
  const height = last.match(/current_height=Height\((\d+)\)/);
  const remaining = last.match(/remaining_sync_blocks=(\d+)/);
  const percent = last.match(/sync_percent=([0-9.]+)%/);
  return {
    currentHeight: height ? Number(height[1]) : null,
    remainingSyncBlocks: remaining ? Number(remaining[1]) : null,
    syncPercent: percent ? Number(percent[1]) : null,
  };
}

function scanRate(text) {
  return rateFromJournal(text, /^(?<month>\w{3}) (?<day>\d{1,2}) (?<time>\d{2}:\d{2}:\d{2}).*Scanning blocks Verify\((?<value>\d+)\.\.\d+\)/);
}

function latestHeightRate(text) {
  return rateFromJournal(text, /^(?<month>\w{3}) (?<day>\d{1,2}) (?<time>\d{2}:\d{2}:\d{2}).*Latest block height is (?<value>\d+)/);
}

function rateFromJournal(text, pattern) {
  const entries = [];
  for (const line of text.split("\n")) {
    const match = line.match(pattern);
    if (!match?.groups) continue;
    const timestamp = Date.parse(`${match.groups.month} ${match.groups.day} ${new Date().getFullYear()} ${match.groups.time}`);
    const value = Number(match.groups.value);
    if (Number.isFinite(timestamp) && Number.isFinite(value)) entries.push({ timestamp, value });
  }
  if (entries.length < 2) return { samples: entries.length, blocksPerMinute: null };
  const first = entries[0];
  const last = entries.at(-1);
  const minutes = (last.timestamp - first.timestamp) / 60_000;
  const blocks = last.value - first.value;
  return {
    samples: entries.length,
    blocksPerMinute: minutes > 0 && blocks >= 0 ? Math.round((blocks / minutes) * 100) / 100 : null,
  };
}

function zalletRpc(method, params = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(binaryPath, [
      "-d", dataDirectory,
      "-c", configPath,
      "rpc", method,
      ...params.map((param) => JSON.stringify(param)),
    ], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`Zallet RPC timeout: ${method}`));
    }, 20_000);
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`Zallet RPC ${method} failed${stderr.trim() ? `: ${stderr.trim().slice(-400)}` : ""}`));
        return;
      }
      try {
        const parsed = JSON.parse(stdout);
        if (parsed && typeof parsed === "object" && "result" in parsed) resolve(parsed.result);
        else resolve(parsed);
      } catch {
        reject(new Error(`Zallet RPC ${method} returned invalid JSON.`));
      }
    });
  });
}

function journalTail(unit) {
  return new Promise((resolve, reject) => {
    const child = spawn("journalctl", ["--user", "-u", unit, "-n", "240", "--no-pager"], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("journalctl timeout"));
    }, 10_000);
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(stderr.trim() || "journalctl failed"));
      else resolve(stdout);
    });
  });
}
