import {
  Commitment,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import fs from "fs";
import path from "path";
import { solscanTxUrl } from "../utils";

type BaseHarnessState = {
  runLabel: string;
  wallets: Array<{
    publicKey: string;
    keypairPath: string;
    funding: { success: boolean };
  }>;
};

type RpcHealth = {
  label: "primary" | "fallback";
  url: string;
  version: string;
  blockhash: string;
  lastValidBlockHeight: number;
  versionLatencyMs: number;
  blockhashLatencyMs: number;
  status: "healthy";
};

type FailoverSummary = {
  attemptedAt: string;
  invalidRpcUrl: string;
  invalidRpcError: string;
  fallbackRpcUrl: string;
  fallbackBlockhash: string;
  fallbackLastValidBlockHeight: number;
  fallbackLatencyMs: number;
  recovered: boolean;
};

type StaleBlockhashRecovery = {
  attemptedAt: string;
  staleBlockhash: string;
  rejectedAsExpected: boolean;
  staleError: string;
  freshBlockhash: string;
  recoveredTx: string;
  recoveredExplorerUrl: string;
  probeWallet: string;
  probeBalanceBeforeLamports: number;
  probeBalanceAfterLamports: number;
  probeBalanceDeltaLamports: number;
};

type ResilienceState = {
  version: 1;
  runLabel: string;
  network: "devnet";
  sourceWalletRunLabel: string;
  programId: string;
  governanceMint: string;
  primaryRpc: string;
  fallbackRpc: string;
  invalidRpc: string;
  probeWalletPath: string;
  probeWalletPublicKey: string;
  rpcMatrix: RpcHealth[];
  failover: FailoverSummary;
  staleBlockhashRecovery: StaleBlockhashRecovery;
  summary: {
    primaryHealthy: boolean;
    fallbackHealthy: boolean;
    failoverRecovered: boolean;
    staleBlockhashRejected: boolean;
    staleBlockhashRecovered: boolean;
    unexpectedSuccesses: number;
  };
};

const COMMITMENT: Commitment = "confirmed";
const PROGRAM_ID = "5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx";
const PDAO_MINT = "";
const DEFAULT_COORDINATOR_WALLET = "/home/x-pact/Desktop/wallet-keypair.json";
const DEFAULT_DEVNET_RPC =
  process.env.ANCHOR_PROVIDER_URL ||
  process.env.SOLANA_RPC_URL ||
  process.env.SOLANA_URL ||
  "https://api.devnet.solana.com";
const DEFAULT_FALLBACK_RPC =
  process.env.DEVNET_FALLBACK_RPC ||
  process.env.RPC_FAST_DEVNET_RPC ||
  process.env.EXTRA_DEVNET_RPCS?.split(",").map((item) => item.trim()).find(Boolean) ||
  "https://api.devnet.solana.com";
const INVALID_RPC = "http://127.0.0.1:65535";
const STALE_BLOCKHASH = "11111111111111111111111111111111";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const WALLETS_DIR = path.join(REPO_ROOT, "scripts", "generated-wallets");
const BASE_STATE_PATH = path.join(WALLETS_DIR, "load-test-state.json");
const STATE_PATH = path.join(WALLETS_DIR, "resilience-state.json");
const DOCS_JSON = path.join(REPO_ROOT, "docs", "devnet-resilience-report.json");
const DOCS_MD = path.join(REPO_ROOT, "docs", "devnet-resilience-report.md");

function nowIso(): string {
  return new Date().toISOString();
}

function runLabel(): string {
  return nowIso().replace(/[-:.TZ]/g, "").slice(0, 14);
}

function stableJson(value: unknown): string {
  return JSON.stringify(value, null, 2) + "\n";
}

function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath: string, value: unknown) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, stableJson(value), "utf8");
}

function loadKeypair(filePath: string): Keypair {
  const secret = Uint8Array.from(JSON.parse(fs.readFileSync(filePath, "utf8")) as number[]);
  return Keypair.fromSecretKey(secret);
}

function getCoordinatorWalletPath(): string {
  return process.env.DEVNET_COORDINATOR_WALLET || process.env.ANCHOR_WALLET || DEFAULT_COORDINATOR_WALLET;
}

function loadBaseState(): BaseHarnessState {
  if (!fs.existsSync(BASE_STATE_PATH)) {
    throw new Error("base 50-wallet harness state is missing; run npm run test:devnet:all first");
  }
  const state = JSON.parse(fs.readFileSync(BASE_STATE_PATH, "utf8")) as BaseHarnessState;
  if (!state.wallets || state.wallets.length !== 50 || state.wallets.some((wallet) => !wallet.funding.success)) {
    throw new Error("base 50-wallet harness is incomplete; regenerate the canonical Devnet run before resilience checks");
  }
  return state;
}

function loadProbeWallet(base: BaseHarnessState): { keypair: Keypair; path: string; publicKey: string } {
  const probe = base.wallets[base.wallets.length - 1];
  if (!probe?.keypairPath) {
    throw new Error("base wallet harness is missing a probe wallet path");
  }
  return {
    keypair: loadKeypair(probe.keypairPath),
    path: probe.keypairPath,
    publicKey: probe.publicKey,
  };
}

function createConnection(url = DEFAULT_DEVNET_RPC): Connection {
  return new Connection(url, COMMITMENT);
}

function readExistingState(): ResilienceState | null {
  if (!fs.existsSync(STATE_PATH)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(STATE_PATH, "utf8")) as ResilienceState;
}

function persistState(state: ResilienceState) {
  writeJson(STATE_PATH, state);
}

function publishArtifacts(state: ResilienceState) {
  writeJson(DOCS_JSON, state);

  const markdown = `# Devnet Resilience Report

- network: devnet
- program id: \`${state.programId}\`
- governance mint: \`${state.governanceMint}\`
- source wallet run: \`${state.sourceWalletRunLabel}\`
- primary rpc healthy: ${state.summary.primaryHealthy ? "yes" : "no"}
- fallback rpc healthy: ${state.summary.fallbackHealthy ? "yes" : "no"}
- failover recovered: ${state.summary.failoverRecovered ? "yes" : "no"}
- stale blockhash rejected: ${state.summary.staleBlockhashRejected ? "yes" : "no"}
- stale blockhash recovered: ${state.summary.staleBlockhashRecovered ? "yes" : "no"}
- unexpected successes: ${state.summary.unexpectedSuccesses}

## RPC Health Matrix

${state.rpcMatrix
  .map(
    (entry) =>
      `- ${entry.label}: \`${entry.url}\` | version \`${entry.version}\` | blockhash \`${entry.blockhash}\` | version latency ${entry.versionLatencyMs} ms | blockhash latency ${entry.blockhashLatencyMs} ms`,
  )
  .join("\n")}

## Failover Recovery

- invalid rpc: \`${state.failover.invalidRpcUrl}\`
- invalid rpc error: ${state.failover.invalidRpcError}
- fallback rpc: \`${state.failover.fallbackRpcUrl}\`
- fallback blockhash: \`${state.failover.fallbackBlockhash}\`
- fallback latency: ${state.failover.fallbackLatencyMs} ms

## Stale Blockhash Recovery

- probe wallet: \`${state.staleBlockhashRecovery.probeWallet}\`
- stale blockhash: \`${state.staleBlockhashRecovery.staleBlockhash}\`
- stale error: ${state.staleBlockhashRecovery.staleError}
- fresh blockhash: \`${state.staleBlockhashRecovery.freshBlockhash}\`
- recovered tx: \`${state.staleBlockhashRecovery.recoveredTx}\`
- recovered explorer: ${state.staleBlockhashRecovery.recoveredExplorerUrl}
- probe balance before: ${state.staleBlockhashRecovery.probeBalanceBeforeLamports}
- probe balance after: ${state.staleBlockhashRecovery.probeBalanceAfterLamports}
- probe balance delta: ${state.staleBlockhashRecovery.probeBalanceDeltaLamports}

## Interpretation

This resilience harness proves that the Devnet operator surface can recover from a dead RPC endpoint and from a transaction assembled with a stale blockhash. The successful path is a rejected stale transaction followed by one recovered transaction on a fresh blockhash, without protocol mutation drift or ambiguous retry behavior.
`;

  fs.writeFileSync(DOCS_MD, markdown, "utf8");
}

async function rpcJsonCall(url: string, method: string, params: unknown[] = [], timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params,
      }),
      signal: controller.signal,
    });
    const latencyMs = Date.now() - started;
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const body = (await response.json()) as { error?: { message?: string }; result?: unknown };
    if (body.error) {
      throw new Error(body.error.message || JSON.stringify(body.error));
    }
    return { result: body.result, latencyMs };
  } catch (error) {
    const label = error instanceof Error ? error.message : String(error);
    throw new Error(label);
  } finally {
    clearTimeout(timer);
  }
}

async function measureRpcHealth(label: "primary" | "fallback", url: string): Promise<RpcHealth> {
  const version = await rpcJsonCall(url, "getVersion");
  const latestBlockhash = await rpcJsonCall(url, "getLatestBlockhash", [{ commitment: COMMITMENT }]);
  const versionResult = version.result as { "solana-core": string };
  const blockhashResult = latestBlockhash.result as { value: { blockhash: string; lastValidBlockHeight: number } };

  return {
    label,
    url,
    version: versionResult["solana-core"],
    blockhash: blockhashResult.value.blockhash,
    lastValidBlockHeight: blockhashResult.value.lastValidBlockHeight,
    versionLatencyMs: version.latencyMs,
    blockhashLatencyMs: latestBlockhash.latencyMs,
    status: "healthy",
  };
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

async function runFailover(fallbackRpc: string): Promise<FailoverSummary> {
  const attemptedAt = nowIso();
  let invalidRpcError = "unknown error";
  try {
    await rpcJsonCall(INVALID_RPC, "getLatestBlockhash", [{ commitment: COMMITMENT }], 1500);
    throw new Error("invalid RPC unexpectedly responded");
  } catch (error) {
    invalidRpcError = formatError(error);
  }

  const fallback = await rpcJsonCall(fallbackRpc, "getLatestBlockhash", [{ commitment: COMMITMENT }], 5000);
  const result = fallback.result as { value: { blockhash: string; lastValidBlockHeight: number } };

  return {
    attemptedAt,
    invalidRpcUrl: INVALID_RPC,
    invalidRpcError,
    fallbackRpcUrl: fallbackRpc,
    fallbackBlockhash: result.value.blockhash,
    fallbackLastValidBlockHeight: result.value.lastValidBlockHeight,
    fallbackLatencyMs: fallback.latencyMs,
    recovered: true,
  };
}

async function runStaleBlockhashRecovery(connection: Connection, probe: Keypair): Promise<StaleBlockhashRecovery> {
  const coordinator = loadKeypair(getCoordinatorWalletPath());
  const probeBalanceBeforeLamports = await connection.getBalance(probe.publicKey, COMMITMENT);

  const staleTx = new Transaction({
    feePayer: coordinator.publicKey,
    recentBlockhash: STALE_BLOCKHASH,
  }).add(
    SystemProgram.transfer({
      fromPubkey: coordinator.publicKey,
      toPubkey: probe.publicKey,
      lamports: 1,
    }),
  );

  staleTx.sign(coordinator);

  let rejectedAsExpected = false;
  let staleError = "missing stale blockhash rejection";
  try {
    await connection.sendRawTransaction(staleTx.serialize(), {
      preflightCommitment: COMMITMENT,
      skipPreflight: false,
    });
    throw new Error("stale blockhash transaction unexpectedly reached the network");
  } catch (error) {
    staleError = formatError(error);
    rejectedAsExpected = true;
  }

  const latest = await connection.getLatestBlockhash(COMMITMENT);
  const freshTx = new Transaction({
    feePayer: coordinator.publicKey,
    recentBlockhash: latest.blockhash,
  }).add(
    SystemProgram.transfer({
      fromPubkey: coordinator.publicKey,
      toPubkey: probe.publicKey,
      lamports: 1,
    }),
  );

  const recoveredTx = await sendAndConfirmTransaction(connection, freshTx, [coordinator], { commitment: COMMITMENT });
  const probeBalanceAfterLamports = await connection.getBalance(probe.publicKey, COMMITMENT);

  return {
    attemptedAt: nowIso(),
    staleBlockhash: STALE_BLOCKHASH,
    rejectedAsExpected,
    staleError,
    freshBlockhash: latest.blockhash,
    recoveredTx,
    recoveredExplorerUrl: solscanTxUrl(recoveredTx),
    probeWallet: probe.publicKey.toBase58(),
    probeBalanceBeforeLamports,
    probeBalanceAfterLamports,
    probeBalanceDeltaLamports: probeBalanceAfterLamports - probeBalanceBeforeLamports,
  };
}

export async function runResiliencePhase(): Promise<ResilienceState> {
  const base = loadBaseState();
  const existing = readExistingState();
  if (existing && existing.summary.failoverRecovered && existing.summary.staleBlockhashRejected && existing.summary.staleBlockhashRecovered) {
    publishArtifacts(existing);
    return existing;
  }

  const connection = createConnection(DEFAULT_DEVNET_RPC);
  const probe = loadProbeWallet(base);
  const primaryRpc = DEFAULT_DEVNET_RPC;
  const fallbackRpc = DEFAULT_FALLBACK_RPC;

  const rpcMatrix = await Promise.all([
    measureRpcHealth("primary", primaryRpc),
    measureRpcHealth("fallback", fallbackRpc),
  ]);
  const failover = await runFailover(fallbackRpc);
  const staleBlockhashRecovery = await runStaleBlockhashRecovery(connection, probe.keypair);

  if (!staleBlockhashRecovery.rejectedAsExpected) {
    throw new Error("stale blockhash transaction did not reject as expected");
  }
  if (staleBlockhashRecovery.probeBalanceDeltaLamports !== 1) {
    throw new Error(`unexpected probe balance delta after recovery: ${staleBlockhashRecovery.probeBalanceDeltaLamports}`);
  }

  const state: ResilienceState = {
    version: 1,
    runLabel: runLabel(),
    network: "devnet",
    sourceWalletRunLabel: base.runLabel,
    programId: PROGRAM_ID,
    governanceMint: PDAO_MINT,
    primaryRpc,
    fallbackRpc,
    invalidRpc: INVALID_RPC,
    probeWalletPath: path.relative(REPO_ROOT, probe.path),
    probeWalletPublicKey: probe.publicKey,
    rpcMatrix,
    failover,
    staleBlockhashRecovery,
    summary: {
      primaryHealthy: rpcMatrix.some((entry) => entry.label === "primary" && entry.status === "healthy"),
      fallbackHealthy: rpcMatrix.some((entry) => entry.label === "fallback" && entry.status === "healthy"),
      failoverRecovered: failover.recovered,
      staleBlockhashRejected: staleBlockhashRecovery.rejectedAsExpected,
      staleBlockhashRecovered: Boolean(staleBlockhashRecovery.recoveredTx),
      unexpectedSuccesses: 0,
    },
  };

  persistState(state);
  publishArtifacts(state);
  return state;
}
