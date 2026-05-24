import { spawn, ChildProcess } from "child_process";
import path from "path";
import "dotenv/config";

const host = "127.0.0.1";
const port = 8791;
const base = `http://${host}:${port}`;

type ReadNodeConfigResponse = {
  ok: boolean;
  config: {
    host: string;
    port: number;
    allowedOrigin: string;
    readPath: string;
    programId: string;
    rpcEndpoints: string[];
    cacheTtlMs: number;
  };
};

async function main() {
  const child = startServer();
  try {
    const config = await waitForServer();
    const health = await getJson<{ ok: boolean; health: string; runtime: { readPath: string; programId: string } }>("/healthz");
    const overview = await getJson<{
      ok: boolean;
      source: string;
      overview: { proposals: number; confidentialPayouts: number };
    }>("/api/v1/ops/overview");
    const snapshot = await getJson<{
        ok: boolean;
        source: string;
        snapshot: {
          runtime: { programId: string; rpcPoolSize: number };
          overview: { proposals: number; magicblockConfigured: number };
          magicblock: { apiBase: string; health: string };
          profiles: Array<{ name: string; waveCount: number; waveSize: number }>;
          deployment: { sameDomainGuide: string; readApiPath: string };
        };
      }>("/api/v1/ops/snapshot");
    const profiles = await getJson<{
      ok: boolean;
      source: string;
      profiles: Array<{ name: string; waveCount: number; waveSize: number }>;
    }>("/api/v1/devnet/profiles");
    const magicblock = await getJson<{ ok: boolean; source: string; magicblock: { apiBase: string; health: string } }>(
      "/api/v1/magicblock/health",
    );
    const metrics = await getJson<{ ok: boolean; metrics: { requestsTotal: number; routeHits: Record<string, number> } }>(
      "/api/v1/metrics",
    );
    const proposals = await getJson<{ ok: boolean; count: number; proposals: Array<unknown> }>("/api/v1/proposals");

    assert(config.ok, "HTTP read node config route did not report ok");
    assert(config.config.readPath === "backend-indexer", "HTTP read node config did not report backend-indexer mode");
    assert(Boolean(config.config.programId), "HTTP read node config missing program id");
    assert(Array.isArray(config.config.rpcEndpoints) && config.config.rpcEndpoints.length >= 1, "HTTP read node config missing RPC endpoints");

    assert(health.ok && health.health === "healthy", "HTTP read node healthz failed");
    assert(health.runtime.readPath === "backend-indexer", "HTTP read node did not report backend-indexer mode");
    assert(Boolean(health.runtime.programId), "HTTP read node healthz missing program id");

    assert(overview.ok && overview.source === "backend-indexer", "HTTP ops overview missing backend source");
    assert(typeof overview.overview.proposals === "number", "HTTP ops overview missing proposal count");
    assert(typeof overview.overview.confidentialPayouts === "number", "HTTP ops overview missing confidential payout count");

    assert(snapshot.ok && snapshot.source === "backend-indexer", "HTTP ops snapshot missing backend source");
    assert(Boolean(snapshot.snapshot.runtime.programId), "HTTP ops snapshot missing program id");
    assert(snapshot.snapshot.runtime.rpcPoolSize >= 1, "HTTP ops snapshot missing RPC pool size");
    assert(Boolean(snapshot.snapshot.magicblock.apiBase), "HTTP ops snapshot missing MagicBlock API base");
    assert(snapshot.snapshot.deployment.readApiPath === "/api/v1", "HTTP ops snapshot readApiPath mismatch");
    assert(snapshot.snapshot.deployment.sameDomainGuide === "docs/read-node/same-domain-deploy.md", "HTTP ops snapshot same-domain guide mismatch");

    const profile350 = profiles.profiles.find((profile) => profile.name === "350");
    assert(profile350?.waveCount === 7 && profile350.waveSize === 50, "HTTP read node is missing the 350-wallet wave profile");

    assert(magicblock.ok && magicblock.source === "backend-indexer", "HTTP MagicBlock health missing backend source");
    assert(Boolean(magicblock.magicblock.apiBase), "HTTP MagicBlock health missing api base");

    assert(metrics.ok, "HTTP metrics route did not return ok");
    assert(metrics.metrics.requestsTotal >= 1, "HTTP metrics did not record requests");
    assert(Object.keys(metrics.metrics.routeHits).length >= 1, "HTTP metrics route did not track route hits");

    assert(proposals.ok && Array.isArray(proposals.proposals), "HTTP proposals route did not return a proposal array");
    assert(proposals.count === proposals.proposals.length, "HTTP proposals count mismatch");

    console.log("Read node HTTP verification: PASS");
  } finally {
    child.kill("SIGTERM");
    await onceExit(child);
  }
}

function startServer() {
  const tsNodeBin = path.resolve("node_modules/ts-node/dist/bin.js");
  const child = spawn(process.execPath, [tsNodeBin, "scripts/run-read-node.ts"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PRIVATE_DAO_READ_NODE_HOST: host,
      PRIVATE_DAO_READ_NODE_PORT: String(port),
      PRIVATE_DAO_READ_ALLOWED_ORIGIN: "*",
      PRIVATE_DAO_RPC_TIMEOUT_MS: process.env.PRIVATE_DAO_RPC_TIMEOUT_MS || "12000",
      PRIVATE_DAO_GET_MULTIPLE_ACCOUNTS_CHUNK_SIZE: process.env.PRIVATE_DAO_GET_MULTIPLE_ACCOUNTS_CHUNK_SIZE || "5",
      PRIVATE_DAO_READ_CACHE_TTL_MS: process.env.PRIVATE_DAO_READ_CACHE_TTL_MS || "60000",
      MAGICBLOCK_HTTP_TIMEOUT_MS: process.env.MAGICBLOCK_HTTP_TIMEOUT_MS || "2500",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", () => void 0);
  child.stderr.on("data", () => void 0);
  return child;
}

async function waitForServer(): Promise<ReadNodeConfigResponse> {
  const started = Date.now();
  while (Date.now() - started < 60_000) {
    try {
      const response = await fetch(`${base}/api/v1/config`);
      if (response.ok) {
        return (await response.json()) as ReadNodeConfigResponse;
      }
    } catch {
      // retry
    }
    await sleep(500);
  }
  throw new Error("Timed out waiting for the HTTP read node to expose /api/v1/config");
}

async function getJson<T>(route: string): Promise<T> {
  const response = await fetch(`${base}${route}`);
  if (!response.ok) {
    throw new Error(`HTTP read node route failed: ${route} -> ${response.status}`);
  }
  return (await response.json()) as T;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function onceExit(child: ChildProcess) {
  return new Promise<void>((resolve) => {
    if (child.exitCode !== null) {
      resolve();
      return;
    }
    child.once("exit", () => resolve());
    setTimeout(() => resolve(), 2_000);
  });
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
