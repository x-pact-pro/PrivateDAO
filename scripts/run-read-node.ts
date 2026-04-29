// SPDX-License-Identifier: AGPL-3.0-or-later
import * as http from "http";
import { createHash } from "crypto";
import { readFile } from "fs/promises";
import { join } from "path";
import { URL } from "url";
import { PrivateDaoReadNode } from "./lib/read-node";

const host = process.env.PRIVATE_DAO_READ_NODE_HOST || "127.0.0.1";
const port = Number(process.env.PRIVATE_DAO_READ_NODE_PORT || 8787);
const allowedOrigin = process.env.PRIVATE_DAO_READ_ALLOWED_ORIGIN || "*";
const rateWindowMs = Number(process.env.PRIVATE_DAO_READ_RATE_WINDOW_MS || 60_000);
const rateLimit = Number(process.env.PRIVATE_DAO_READ_RATE_LIMIT || 180);
const readNode = new PrivateDaoReadNode();

const rateMap = new Map<string, { count: number; resetAt: number }>();
const serverStartedAt = new Date().toISOString();
const metrics = {
  requestsTotal: 0,
  requestsFailed: 0,
  rateLimited: 0,
  routeHits: new Map<string, number>(),
};

function writeJson(res: http.ServerResponse, statusCode: number, payload: unknown) {
  res.writeHead(statusCode, {
	    "Content-Type": "application/json; charset=utf-8",
	    "Access-Control-Allow-Origin": allowedOrigin,
	    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload, null, 2));
}

function normalizeIp(req: http.IncomingMessage): string {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.socket.remoteAddress || "unknown";
}

function markRoute(pathname: string) {
  metrics.requestsTotal += 1;
  metrics.routeHits.set(pathname, (metrics.routeHits.get(pathname) || 0) + 1);
}

function enforceRateLimit(req: http.IncomingMessage): string | null {
  const ip = normalizeIp(req);
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || entry.resetAt <= now) {
    rateMap.set(ip, { count: 1, resetAt: now + rateWindowMs });
    return null;
  }
  if (entry.count >= rateLimit) {
    return ip;
  }
  entry.count += 1;
  return null;
}

function routeNotFound(res: http.ServerResponse, pathname: string) {
  writeJson(res, 404, { ok: false, error: `Unknown route: ${pathname}` });
}

function redactUrlSecret(value: string) {
  return value
    .replace(/([?&](?:api[_-]?key|key|token|secret)=)[^&]+/gi, "$1[redacted]")
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, "$1[redacted]");
}

function readRequestJson(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
      if (Buffer.concat(chunks).byteLength > 32_768) {
        req.destroy(new Error("Request body too large"));
      }
    });
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8") || "{}";
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          reject(new Error("JSON body must be an object"));
          return;
        }
        resolve(parsed as Record<string, unknown>);
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function stringField(body: Record<string, unknown>, key: string, fallback = "") {
  const value = body[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function privateRailRelayConfig(rail: string) {
  if (rail === "cloak") {
    return {
      url: process.env.CLOAK_RELAY_URL?.trim(),
      apiKey: process.env.CLOAK_API_KEY?.trim(),
      source: "cloak-relay",
    };
  }
  return {
    url: process.env.UMBRA_RELAY_URL?.trim(),
    apiKey: process.env.UMBRA_API_KEY?.trim(),
    source: "umbra-relay",
  };
}

async function handlePrivateSettlementIntent(body: Record<string, unknown>) {
  const rail = stringField(body, "rail", "umbra");
  if (rail !== "umbra" && rail !== "cloak") throw new Error("rail must be umbra or cloak");

  const asset = stringField(body, "asset", "USDC").toUpperCase();
  if (!["PUSD", "AUDD", "USDC", "USDT", "SOL"].includes(asset)) throw new Error("Unsupported settlement asset");

  const amount = stringField(body, "amount", "0");
  if (!/^\d+(\.\d+)?$/.test(amount)) throw new Error("Invalid settlement amount");

  const recipient = stringField(body, "recipient");
  if (recipient.length < 20) throw new Error("Recipient is required");

  const createdAt = new Date().toISOString();
  const intent = {
    rail,
    network: process.env.PRIVATE_DAO_SETTLEMENT_NETWORK || "testnet",
    operationType: stringField(body, "operationType", "private-settlement"),
    asset,
    amount,
    recipient,
    memo: stringField(body, "memo", "PrivateDAO private settlement"),
    auditMode: stringField(body, "auditMode", rail === "umbra" ? "confidential-payout" : "selective-disclosure"),
    recipientVisibility: stringField(body, "recipientVisibility", rail === "umbra" ? "recipient-private" : "private-by-default"),
    createdAt,
  };

  const relay = privateRailRelayConfig(rail);
  if (relay.url) {
    const response = await fetch(relay.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(relay.apiKey ? { Authorization: `Bearer ${relay.apiKey}` } : {}),
      },
      body: JSON.stringify(intent),
    });
    const raw = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!response.ok) {
      throw new Error(
        (typeof raw?.error === "string" && raw.error) ||
          (typeof raw?.message === "string" && raw.message) ||
          `${relay.source} responded ${response.status}`,
      );
    }
    return {
      ok: true,
      mode: "relay-live",
      source: relay.source,
      receipt: {
        ...intent,
        executionReference:
          (typeof raw?.signature === "string" && raw.signature) ||
          (typeof raw?.reference === "string" && raw.reference) ||
          `${rail}-${Date.now()}`,
        raw,
      },
    };
  }

  const receiptHash = createHash("sha256").update(JSON.stringify(intent)).digest("hex");
  return {
    ok: true,
    mode: "testnet-intent-receipt",
    source: `${rail}-read-node-receipt`,
    receipt: {
      ...intent,
      executionReference: `${rail}-${receiptHash.slice(0, 24)}`,
      receiptHash,
      sdkPath:
        rail === "umbra"
          ? "getUmbraClient -> register/deposit/create receiver-claimable UTXO"
          : "Cloak shielded pool -> private transfer/batch receipt",
      note:
        "Set UMBRA_RELAY_URL/CLOAK_RELAY_URL on the hosted read-node to promote this endpoint from signed testnet intent receipt to live rail relay forwarding.",
    },
  };
}

async function handle(req: http.IncomingMessage, res: http.ServerResponse) {
  if (req.method === "OPTIONS") {
    writeJson(res, 200, { ok: true });
    return;
  }

  if (req.method !== "GET" && req.method !== "POST") {
    writeJson(res, 405, { ok: false, error: "Method not allowed" });
    return;
  }

  const limitedIp = enforceRateLimit(req);
  if (limitedIp) {
    metrics.rateLimited += 1;
    writeJson(res, 429, { ok: false, error: `Rate limit exceeded for ${limitedIp}` });
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || `${host}:${port}`}`);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  markRoute(pathname);

	  try {
    if (req.method === "POST" && pathname === "/api/v1/private-settlement/intent") {
      const body = await readRequestJson(req);
      const receipt = await handlePrivateSettlementIntent(body);
      writeJson(res, 200, receipt);
      return;
    }

    if (req.method !== "GET") {
      writeJson(res, 405, { ok: false, error: "Method not allowed for this route" });
      return;
    }

	    if (pathname === "/healthz") {
      const runtime = await readNode.getRuntimeSnapshot();
      writeJson(res, 200, { ok: true, health: "healthy", runtime });
      return;
    }

    if (pathname === "/api/v1/runtime") {
      const runtime = await readNode.getRuntimeSnapshot(url.searchParams.get("refresh") === "1");
      writeJson(res, 200, { ok: true, runtime });
      return;
    }

    if (pathname === "/api/v1/magicblock/health") {
      const magicblock = await readNode.getMagicBlockRuntime(url.searchParams.get("refresh") === "1");
      writeJson(res, 200, { ok: true, source: "backend-indexer", magicblock });
      return;
    }

    const magicBlockMintMatch = pathname.match(/^\/api\/v1\/magicblock\/mints\/([^/]+)\/status$/);
    if (magicBlockMintMatch) {
      const status = await readNode.getMagicBlockMintStatus(
        magicBlockMintMatch[1],
        url.searchParams.get("validator") || undefined,
        url.searchParams.get("refresh") === "1",
      );
      writeJson(res, 200, { ok: true, source: "backend-indexer", status });
      return;
    }

    const magicBlockBalanceMatch = pathname.match(/^\/api\/v1\/magicblock\/balances\/([^/]+)$/);
    if (magicBlockBalanceMatch) {
      const mint = url.searchParams.get("mint");
      if (!mint) {
        writeJson(res, 400, { ok: false, error: "Missing required mint query parameter", source: "backend-indexer" });
        return;
      }
      const balances = await readNode.getMagicBlockBalances(
        magicBlockBalanceMatch[1],
        mint,
        url.searchParams.get("refresh") === "1",
      );
      writeJson(res, 200, { ok: true, source: "backend-indexer", balances });
      return;
    }

	    if (pathname === "/api/v1/config") {
      writeJson(res, 200, {
        ok: true,
        config: {
          host,
          port,
          allowedOrigin,
	          readPath: "backend-indexer",
	          programId: readNode.programId.toBase58(),
	          rpcEndpoints: readNode.rpcEndpoints.map(redactUrlSecret),
	          cacheTtlMs: readNode.cacheTtlMs,
	        },
      });
	      return;
	    }

    if (pathname === "/api/v1/qvac/runtime-proof") {
      const proofPath = join(process.cwd(), "services/qvac-runtime/qvac-runtime-proof.generated.json");
      const proof = await readFile(proofPath, "utf8")
        .then((content) => JSON.parse(content) as unknown)
        .catch((error) => ({
          schemaVersion: 1,
          project: "PrivateDAO",
          track: "qvac-sovereign-ai",
          sdkLoaded: false,
          source: "qvac-runtime-proof-missing",
          nextAction: "Run npm install and npm run probe inside services/qvac-runtime with Node.js >=22.17.",
          error: String((error as Error)?.message || error),
        }));
      writeJson(res, 200, { ok: true, source: "qvac-runtime", proof });
      return;
    }

    if (pathname === "/api/v1/ops/overview") {
      const overview = await readNode.getOpsOverview(url.searchParams.get("refresh") === "1");
      writeJson(res, 200, { ok: true, source: "backend-indexer", overview });
      return;
    }

    if (pathname === "/api/v1/ops/snapshot") {
      const force = url.searchParams.get("refresh") === "1";
      const [runtime, overview] = await Promise.all([
        readNode.getRuntimeSnapshot(force),
        readNode.getOpsOverview(force),
      ]);
      const profiles = readNode.getLoadProfiles();
      const magicblock = await readNode.getMagicBlockRuntime(force);
      writeJson(res, 200, {
        ok: true,
        source: "backend-indexer",
        snapshot: {
          generatedAt: new Date().toISOString(),
          runtime,
          overview,
          magicblock,
          profiles,
          metrics: {
            startedAt: serverStartedAt,
            requestsTotal: metrics.requestsTotal,
            requestsFailed: metrics.requestsFailed,
            rateLimited: metrics.rateLimited,
            routeHits: Object.fromEntries(metrics.routeHits.entries()),
          },
          deployment: {
            sameDomainRecommended: true,
            sameDomainGuide: "docs/read-node/same-domain-deploy.md",
            readApiPath: "/api/v1",
          },
        },
      });
      return;
    }

    if (pathname === "/api/v1/devnet/profiles") {
      const profiles = readNode.getLoadProfiles();
      writeJson(res, 200, { ok: true, source: "backend-indexer", profiles });
      return;
    }

    if (pathname === "/api/v1/metrics") {
      writeJson(res, 200, {
        ok: true,
        metrics: {
          startedAt: serverStartedAt,
          requestsTotal: metrics.requestsTotal,
          requestsFailed: metrics.requestsFailed,
          rateLimited: metrics.rateLimited,
          routeHits: Object.fromEntries(metrics.routeHits.entries()),
          rpcPoolSize: readNode.rpcEndpoints.length,
          cache: readNode.cacheStats(),
          programId: readNode.programId.toBase58(),
        },
      });
      return;
    }

    if (pathname === "/api/v1/proposals") {
      const dao = url.searchParams.get("dao") || undefined;
      const proposals = await readNode.fetchProposals({
        dao: dao || undefined,
        force: url.searchParams.get("refresh") === "1",
      });
      writeJson(res, 200, {
        ok: true,
        source: "backend-indexer",
        count: proposals.length,
        proposals,
      });
      return;
    }

    const proposalMatch = pathname.match(/^\/api\/v1\/proposals\/([^/]+)$/);
    if (proposalMatch) {
      const proposal = await readNode.fetchProposal(proposalMatch[1]);
      writeJson(res, 200, { ok: true, source: "backend-indexer", proposal });
      return;
    }

    const daoMatch = pathname.match(/^\/api\/v1\/daos\/([^/]+)$/);
    if (daoMatch) {
      const dao = await readNode.fetchDao(daoMatch[1]);
      writeJson(res, 200, { ok: true, source: "backend-indexer", dao });
      return;
    }

    const readinessMatch = pathname.match(/^\/api\/v1\/daos\/([^/]+)\/wallets\/([^/]+)\/readiness$/);
    if (readinessMatch) {
      const readiness = await readNode.fetchWalletReadiness(readinessMatch[1], readinessMatch[2]);
      writeJson(res, 200, { ok: true, source: "backend-indexer", readiness });
      return;
    }

    routeNotFound(res, pathname);
  } catch (error) {
    metrics.requestsFailed += 1;
    writeJson(res, 500, {
      ok: false,
      error: String((error as Error)?.message || error || "Unhandled read node error"),
      source: "backend-indexer",
    });
  }
}

const server = http.createServer((req, res) => {
  void handle(req, res);
});

server.listen(port, host, () => {
  console.log(`PrivateDAO read node listening on http://${host}:${port}`);
  console.log(`Program ID: ${readNode.programId.toBase58()}`);
  console.log(`RPC pool: ${readNode.rpcEndpoints.map(redactUrlSecret).join(", ")}`);
});
