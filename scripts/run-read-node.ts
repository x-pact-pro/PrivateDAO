// SPDX-License-Identifier: AGPL-3.0-or-later
import * as http from "http";
import { createHash } from "crypto";
import { readFile } from "fs/promises";
import { join } from "path";
import { URL } from "url";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { PrivateDaoReadNode } from "./lib/read-node";

const host = process.env.PRIVATE_DAO_READ_NODE_HOST || "127.0.0.1";
const port = Number(process.env.PRIVATE_DAO_READ_NODE_PORT || 8787);
const allowedOrigin = process.env.PRIVATE_DAO_READ_ALLOWED_ORIGIN || "*";
const rateWindowMs = Number(process.env.PRIVATE_DAO_READ_RATE_WINDOW_MS || 60_000);
const rateLimit = Number(process.env.PRIVATE_DAO_READ_RATE_LIMIT || 180);
const readNode = new PrivateDaoReadNode();
const memoProgramId = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const freshnessMinIntervalMs = Number(process.env.PRIVATE_DAO_FRESHNESS_MIN_INTERVAL_MS || 5 * 60_000);
const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

const rateMap = new Map<string, { count: number; resetAt: number }>();
const serverStartedAt = new Date().toISOString();
const visitorPingsMemory: VisitorPingRow[] = [];
let lastFreshnessPingMemory: FreshnessPingRow | null = null;
const metrics = {
  requestsTotal: 0,
  requestsFailed: 0,
  rateLimited: 0,
  blockedProbes: 0,
  routeHits: new Map<string, number>(),
};

type SupabaseRow = Record<string, string | number | boolean | null | Record<string, unknown> | unknown[]>;

type FreshnessPingRow = {
  tx_signature: string;
  slot: number;
  timestamp: string;
  visitor_ua?: string | null;
};

type VisitorPingRow = {
  session_id: string;
  page: string;
  timestamp: string;
  country_hint?: string | null;
};

type VisitorTransactionRow = {
  tx_signature: string;
  session_id: string;
  wallet_address?: string | null;
  wallet_name?: string | null;
  action: string;
  page: string;
  status: string;
  slot?: number | null;
  created_at?: string;
};

type LiveTransactionRow = {
  sig: string;
  instruction: string;
  wallet: string;
  slot: number;
  timestamp: string;
  wallet_type: string;
};

const suspiciousPathPatterns = [
  /^\/\.env(?:$|[/?#])/,
  /^\/\.git(?:$|[/?#])/,
  /^\/wp-admin(?:$|[/?#])/,
  /^\/wp-login\.php(?:$|[/?#])/,
  /^\/phpmyadmin(?:$|[/?#])/,
  /^\/admin(?:$|[/?#])/,
];

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
  if (suspiciousPathPatterns.some((pattern) => pattern.test(pathname))) {
    metrics.blockedProbes += 1;
    writeJson(res, 404, { ok: false, error: "Route not found", source: "blocked-probe" });
    return;
  }
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

function hasSupabaseRestConfig() {
  return Boolean(supabaseUrl && supabaseKey);
}

function supabaseHeaders(extra?: Record<string, string>) {
  return {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    Accept: "application/json",
    ...extra,
  };
}

async function supabaseInsert(table: string, row: SupabaseRow) {
  if (!hasSupabaseRestConfig()) {
    return { ok: false, source: "memory-fallback", error: "Supabase REST is not configured" };
  }
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: supabaseHeaders({
      "Content-Type": "application/json",
      Prefer: "return=representation",
    }),
    body: JSON.stringify(row),
  });
  const raw = (await response.json().catch(() => null)) as unknown;
  return { ok: response.ok, status: response.status, raw };
}

async function supabaseSelect<T>(table: string, query: string) {
  if (!hasSupabaseRestConfig()) return [] as T[];
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}${query}`, {
    method: "GET",
    headers: supabaseHeaders(),
  });
  if (!response.ok) return [] as T[];
  const raw = (await response.json().catch(() => [])) as unknown;
  return Array.isArray(raw) ? (raw as T[]) : ([] as T[]);
}

function hashVisitorSession(sessionId: string) {
  return createHash("sha256").update(sessionId).digest("hex");
}

async function latestFreshnessPing() {
  const rows = await supabaseSelect<FreshnessPingRow>(
    "freshness_pings",
    "?select=tx_signature,slot,timestamp,visitor_ua&order=timestamp.desc&limit=1",
  );
  if (rows[0]) {
    lastFreshnessPingMemory = rows[0];
    return rows[0];
  }
  return lastFreshnessPingMemory;
}

async function getFreshnessBotKeypair() {
  const jsonValue = process.env.PRIVATE_DAO_FRESHNESS_BOT_KEYPAIR_JSON?.trim();
  const keypairPath = process.env.PRIVATE_DAO_FRESHNESS_BOT_KEYPAIR_PATH?.trim();
  const raw = jsonValue || (keypairPath ? await readFile(keypairPath, "utf8") : "");
  if (!raw) {
    throw new Error("Freshness bot keypair is not configured.");
  }
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "number")) {
    throw new Error("Freshness bot keypair must be a JSON number array.");
  }
  return Keypair.fromSecretKey(Uint8Array.from(parsed));
}

async function sendFreshnessMemo(visitorUa: string) {
  const latest = await latestFreshnessPing();
  const nowMs = Date.now();
  if (latest && nowMs - new Date(latest.timestamp).getTime() < freshnessMinIntervalMs) {
    return {
      ok: true,
      throttled: true,
      tx: latest.tx_signature,
      slot: latest.slot,
      time: latest.timestamp,
      explorer: `https://explorer.solana.com/tx/${latest.tx_signature}?cluster=testnet`,
    };
  }

  const keypair = await getFreshnessBotKeypair();
  const connection = new Connection(process.env.SOLANA_RPC_URL || "https://api.testnet.solana.com", "confirmed");
  const time = new Date().toISOString();
  const transaction = new Transaction().add(
    new TransactionInstruction({
      keys: [{ pubkey: keypair.publicKey, isSigner: true, isWritable: true }],
      programId: memoProgramId,
      data: Buffer.from(`PrivateDAO proof-freshness | visitor | ${time}`, "utf8"),
    }),
  );
  const tx = await sendAndConfirmTransaction(connection, transaction, [keypair], {
    commitment: "confirmed",
  });
  const parsed = await connection
    .getParsedTransaction(tx, { commitment: "confirmed", maxSupportedTransactionVersion: 0 })
    .catch(() => null);
  const slot = parsed?.slot ?? (await connection.getSlot("confirmed"));
  const row: FreshnessPingRow = {
    tx_signature: tx,
    slot,
    timestamp: time,
    visitor_ua: visitorUa.slice(0, 180),
  };
  lastFreshnessPingMemory = row;
  await supabaseInsert("freshness_pings", row);
  return {
    ok: true,
    throttled: false,
    tx,
    slot,
    time,
    explorer: `https://explorer.solana.com/tx/${tx}?cluster=testnet`,
  };
}

async function handleVisitorPing(body: Record<string, unknown>, req: http.IncomingMessage) {
  const sessionIdRaw = stringField(body, "sessionId", createHash("sha256").update(`${Date.now()}:${Math.random()}`).digest("hex"));
  const page = stringField(body, "page", "/").slice(0, 180);
  const countryHint = stringField(body, "countryHint", "unknown").slice(0, 80);
  const row: VisitorPingRow = {
    session_id: hashVisitorSession(sessionIdRaw),
    page,
    timestamp: new Date().toISOString(),
    country_hint: countryHint || req.headers["cf-ipcountry"]?.toString() || null,
  };
  visitorPingsMemory.push(row);
  if (visitorPingsMemory.length > 5000) visitorPingsMemory.shift();
  const stored = await supabaseInsert("visitor_sessions", row);
  return { ok: true, source: stored.ok ? "supabase" : "memory-fallback", session: row.session_id.slice(0, 12), page };
}

async function handleVisitorTransactionReceipt(body: Record<string, unknown>) {
  const txSignature = stringField(body, "txSignature");
  if (!/^[1-9A-HJ-NP-Za-km-z]{64,96}$/.test(txSignature)) {
    throw new Error("txSignature must be a Solana base58 signature.");
  }
  const sessionIdRaw = stringField(body, "sessionId", "anonymous-session");
  const walletAddress = stringField(body, "walletAddress").slice(0, 64) || null;
  const walletName = stringField(body, "walletName", "unknown-wallet").slice(0, 80);
  const action = stringField(body, "action", "testnet-transaction").slice(0, 80);
  const page = stringField(body, "page", "/").slice(0, 180);
  const row: VisitorTransactionRow = {
    tx_signature: txSignature,
    session_id: hashVisitorSession(sessionIdRaw),
    wallet_address: walletAddress,
    wallet_name: walletName,
    action,
    page,
    status: stringField(body, "status", "confirmed").slice(0, 40),
    slot: typeof body.slot === "number" && Number.isFinite(body.slot) ? Math.round(body.slot) : null,
  };
  const stored = await supabaseInsert("visitor_transactions", row as SupabaseRow);
  return {
    ok: true,
    source: stored.ok ? "supabase" : "memory-fallback",
    tx: txSignature,
    action,
    walletName,
    explorer: `https://explorer.solana.com/tx/${txSignature}?cluster=testnet`,
  };
}

function stringArrayField(body: Record<string, unknown>, key: string) {
  const value = body[key];
  if (!Array.isArray(value)) return [] as string[];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim().slice(0, 120));
}

async function handleOnboardingRequest(body: Record<string, unknown>) {
  const tier = stringField(body, "tier", "open").slice(0, 40);
  const profile = stringField(body, "profile").slice(0, 80);
  const name = stringField(body, "name").slice(0, 120);
  const email = stringField(body, "email").slice(0, 160);
  if (!profile) throw new Error("profile is required.");
  if (!name) throw new Error("name is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("valid email is required.");

  const row = {
    tier,
    profile,
    challenges: stringArrayField(body, "challenges"),
    other_challenge: stringField(body, "otherChallenge").slice(0, 240) || null,
    treasury_size: stringField(body, "treasurySize", "prefer-not-to-say").slice(0, 80),
    voting_members: stringField(body, "votingMembers", "unknown").slice(0, 80),
    monthly_decisions: stringField(body, "monthlyDecisions", "unknown").slice(0, 80),
    current_setup: stringArrayField(body, "currentSetup"),
    preferred_chain: stringField(body, "preferredChain", "solana").slice(0, 80),
    developer_context: stringField(body, "developerContext", "unknown").slice(0, 120),
    name,
    email,
    organization: stringField(body, "organization").slice(0, 160) || null,
    website: stringField(body, "website").slice(0, 240) || null,
    telegram: stringField(body, "telegram").slice(0, 120) || null,
    timeline: stringField(body, "timeline", "testnet-exploration").slice(0, 120),
    source: stringField(body, "source", "privatedao-site").slice(0, 120),
    notes: stringField(body, "notes").slice(0, 2000) || null,
    utm_source: stringField(body, "utmSource").slice(0, 120) || null,
    status: "new",
  };
  const stored = await supabaseInsert("onboarding_requests", row);
  if (!stored.ok) {
    throw new Error("Onboarding request could not be stored.");
  }

  const telegramEndpoint = process.env.PRIVATE_DAO_TELEGRAM_WEBHOOK_URL?.trim();
  if (telegramEndpoint) {
    void fetch(telegramEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `New PrivateDAO onboarding: ${name} | ${tier} | ${row.treasury_size} | ${email}`,
      }),
    }).catch(() => null);
  }

  return {
    ok: true,
    source: "supabase",
    tier,
    next: "/onboard/confirmed/",
    message: "We received your governance brief. Expect a response within 24 hours.",
  };
}

async function visitorStats() {
  const rows =
    (await supabaseSelect<VisitorPingRow>(
      "visitor_sessions",
      "?select=session_id,page,timestamp,country_hint&order=timestamp.desc&limit=5000",
    )) || visitorPingsMemory;
  const sourceRows = rows.length ? rows : visitorPingsMemory;
  const now = Date.now();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayRows = sourceRows.filter((row) => new Date(row.timestamp).getTime() >= today.getTime());
  const activeRows = sourceRows.filter((row) => now - new Date(row.timestamp).getTime() <= 30 * 60_000);
  const totalSessions = new Set(sourceRows.map((row) => row.session_id)).size;
  const activeToday = new Set(todayRows.map((row) => row.session_id)).size;
  const activeNow = new Set(activeRows.map((row) => row.session_id)).size;
  const byDay = Array.from({ length: 7 }).map((_, offset) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - (6 - offset));
    const key = date.toISOString().slice(0, 10);
    const count = new Set(
      sourceRows.filter((row) => row.timestamp.slice(0, 10) === key).map((row) => row.session_id),
    ).size;
    return { date: key, sessions: count };
  });
  const pageCounts = new Map<string, number>();
  for (const row of sourceRows) pageCounts.set(row.page, (pageCounts.get(row.page) || 0) + 1);
  const topPages = Array.from(pageCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([page, visits]) => ({ page, visits }));
  const visitorTransactions = await supabaseSelect<VisitorTransactionRow>(
    "visitor_transactions",
    "?select=tx_signature,session_id,wallet_address,wallet_name,action,page,status,slot,created_at&order=created_at.desc&limit=5000",
  );
  const visitorTransactionsToday = visitorTransactions.filter((row) => {
    const createdAt = row.created_at || "";
    return createdAt ? new Date(createdAt).getTime() >= today.getTime() : false;
  });
  return {
    ok: true,
    source: rows.length ? "supabase" : "memory-fallback",
    privacy: "Counted privately — no IP address or personal data stored.",
    activeToday,
    activeNow,
    totalSessions,
    visitorTransactionsToday: visitorTransactionsToday.length,
    totalVisitorTransactions: visitorTransactions.length,
    latestVisitorTransactions: visitorTransactions.slice(0, 6).map((row) => ({
      ...row,
      explorer: `https://explorer.solana.com/tx/${row.tx_signature}?cluster=testnet`,
    })),
    byDay,
    topPages,
    generatedAt: new Date().toISOString(),
  };
}

async function latestLiveTransactions() {
  const rows = await supabaseSelect<LiveTransactionRow>(
    "live_transactions",
    "?select=sig,instruction,wallet,slot,timestamp,wallet_type&order=timestamp.desc&limit=10",
  );
  return {
    ok: true,
    source: rows.length ? "supabase-chain-watcher" : "not-yet-indexed",
    count: rows.length,
    transactions: rows.map((row) => ({
      ...row,
      explorer: `https://explorer.solana.com/tx/${row.sig}?cluster=testnet`,
    })),
  };
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
    url: process.env.UMBRA_CLAIM_PROXY_URL?.trim(),
    apiKey: process.env.UMBRA_API_KEY?.trim(),
    source: "umbra-claim-proxy",
  };
}

function getUmbraRelayerEndpoint() {
  return (process.env.UMBRA_RELAYER_API_ENDPOINT || "https://relayer.api-devnet.umbraprivacy.com").replace(/\/+$/, "");
}

async function fetchUmbraRelayerInfo() {
  const endpoint = getUmbraRelayerEndpoint();
  const response = await fetch(`${endpoint}/v1/relayer/info`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  const raw = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok) {
    throw new Error(
      (typeof raw?.error === "string" && raw.error) ||
        (typeof raw?.message === "string" && raw.message) ||
        `Umbra relayer info responded ${response.status}`,
    );
  }
  return {
    endpoint,
    address: typeof raw?.address === "string" ? raw.address : null,
    supportedMints: Array.isArray(raw?.supported_mints) ? raw.supported_mints.filter((item) => typeof item === "string") : [],
    activeStealthPoolIndices: Array.isArray(raw?.active_stealth_pool_indices)
      ? raw.active_stealth_pool_indices.filter((item) => typeof item === "string" || typeof item === "number")
      : [],
    raw,
  };
}

async function fetchUmbraRelayerHealth() {
  const endpoint = getUmbraRelayerEndpoint();
  const response = await fetch(`${endpoint}/v1/health`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  const raw = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok) {
    throw new Error(
      (typeof raw?.error === "string" && raw.error) ||
        (typeof raw?.message === "string" && raw.message) ||
        `Umbra relayer health responded ${response.status}`,
    );
  }
  return {
    endpoint,
    status: typeof raw?.status === "string" ? raw.status : "unknown",
    raw,
  };
}

async function fetchUmbraClaimStatus(requestId: string) {
  const endpoint = getUmbraRelayerEndpoint();
  const response = await fetch(`${endpoint}/v1/claims/${requestId}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  const raw = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok) {
    throw new Error(
      (typeof raw?.error === "string" && raw.error) ||
        (typeof raw?.message === "string" && raw.message) ||
        `Umbra claim status responded ${response.status}`,
    );
  }

  const status = typeof raw?.status === "string" ? raw.status : "unknown";
  return {
    endpoint,
    requestId,
    status,
    isTerminal: status === "completed" || status === "failed" || status === "timed_out",
    pollEveryMs: 3000,
    recommendedTimeoutMs: 120000,
    raw,
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

  const umbraRelayerInfo = rail === "umbra" ? await fetchUmbraRelayerInfo().catch((error) => ({ error: String((error as Error)?.message || error) })) : null;
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
          ? "getUmbraClient -> getUmbraRelayer -> claim factory -> POST /v1/claims -> poll /v1/claims/{request_id}"
          : "Cloak shielded pool -> private transfer/batch receipt",
      relayer: umbraRelayerInfo,
      claimLifecycle:
        rail === "umbra"
          ? [
              "received",
              "validating",
              "offsets_reserved",
              "building_tx",
              "tx_built",
              "submitting",
              "submitted",
              "awaiting_callback",
              "callback_received",
              "finalizing",
              "completed",
            ]
          : [],
      note:
        rail === "umbra"
          ? "Umbra relayer health is checked live. Claim submission still requires SDK-generated ZK proof_account_data and UTXO slot data; this endpoint intentionally does not fabricate cryptographic claim bodies."
          : "Set CLOAK_RELAY_URL on the hosted read-node to promote this endpoint from signed testnet intent receipt to live rail relay forwarding.",
    },
  };
}

function getApiKey(name: string) {
  return process.env[name]?.trim() || "";
}

function getStringParam(url: URL, name: string, fallback = "") {
  return url.searchParams.get(name)?.trim() || fallback;
}

async function fetchDuneSim(path: "balances" | "transactions", wallet: string) {
  const apiKey = getApiKey("DUNE_SIM_API_KEY");
  if (!apiKey) {
    return {
      ok: false,
      source: "dune-sim",
      configured: false,
      error: "DUNE_SIM_API_KEY is not configured on the read node.",
    };
  }
  const response = await fetch(`https://api.sim.dune.com/beta/svm/${path}/${encodeURIComponent(wallet)}`, {
    headers: {
      Accept: "application/json",
      "X-Sim-Api-Key": apiKey,
    },
  });
  const raw = (await response.json().catch(() => null)) as unknown;
  return {
    ok: response.ok,
    source: "dune-sim",
    configured: true,
    status: response.status,
    wallet,
    raw,
  };
}

async function fetchGoldRushQuery(body: Record<string, unknown>) {
  const apiKey = getApiKey("GOLDRUSH_API_KEY");
  const walletAddress = typeof body.walletAddress === "string" ? body.walletAddress : "";
  const chainName = typeof body.chainName === "string" ? body.chainName : "solana-mainnet";
  const queryType = typeof body.queryType === "string" ? body.queryType : "wallet-history";
  if (!walletAddress) {
    return { ok: false, source: "goldrush", error: "walletAddress is required." };
  }
  if (!apiKey) {
    return {
      ok: false,
      source: "goldrush",
      configured: false,
      error: "GOLDRUSH_API_KEY is not configured on the read node.",
    };
  }

  const [balancesResponse, txResponse] = await Promise.all([
    fetch(`https://api.covalenthq.com/v1/${encodeURIComponent(chainName)}/address/${encodeURIComponent(walletAddress)}/balances_v2/?key=${encodeURIComponent(apiKey)}`, {
      headers: { Accept: "application/json" },
    }),
    fetch(`https://api.covalenthq.com/v1/${encodeURIComponent(chainName)}/address/${encodeURIComponent(walletAddress)}/transactions_v3/?key=${encodeURIComponent(apiKey)}`, {
      headers: { Accept: "application/json" },
    }),
  ]);

  const balancesRaw = (await balancesResponse.json().catch(() => null)) as Record<string, unknown> | null;
  const txRaw = (await txResponse.json().catch(() => null)) as Record<string, unknown> | null;
  const balanceItems = Array.isArray((balancesRaw?.data as Record<string, unknown> | undefined)?.items)
    ? ((balancesRaw?.data as Record<string, unknown>).items as Array<Record<string, unknown>>)
    : [];
  const txItems = Array.isArray((txRaw?.data as Record<string, unknown> | undefined)?.items)
    ? ((txRaw?.data as Record<string, unknown>).items as Array<Record<string, unknown>>)
    : [];
  const balances = balanceItems.slice(0, 12).map((item) => ({
    symbol: typeof item.contract_ticker_symbol === "string" ? item.contract_ticker_symbol : undefined,
    name: typeof item.contract_name === "string" ? item.contract_name : undefined,
    quote: typeof item.quote === "number" ? item.quote : null,
    prettyBalance: typeof item.pretty_quote === "string" ? item.pretty_quote : null,
  }));
  const stablecoinHoldings = balances.filter((item) => ["USDC", "USDT", "PUSD", "AUDD"].includes(item.symbol || ""));
  const totalQuoteUsd = balances.reduce((sum, item) => sum + (typeof item.quote === "number" ? item.quote : 0), 0);

  return {
    ok: balancesResponse.ok || txResponse.ok,
    queryType,
    chainName,
    walletAddress,
    sources: {
      goldRush: balancesResponse.ok || txResponse.ok ? "live" : "degraded",
      duneSim: "available-through-/api/v1/dune/*",
    },
    summary: {
      assetCount: balances.length,
      stableAssetCount: stablecoinHoldings.length,
      totalQuoteUsd,
      previewTransactionCount: txItems.length,
    },
    riskSignals: txItems.length === 0 ? ["No recent transaction preview returned by GoldRush for this wallet."] : [],
    balances,
    stablecoinHoldings,
    transactions: txItems.slice(0, 8),
    stablecoinFlowPreview: txItems.slice(0, 8),
    raw: {
      balanceStatus: balancesResponse.status,
      transactionStatus: txResponse.status,
    },
  };
}

async function forwardTorqueEvent(body: Record<string, unknown>) {
  const apiKey = getApiKey("TORQUE_API_KEY");
  const configuredEndpoint = process.env.TORQUE_CUSTOM_EVENT_API_URL?.trim() || process.env.TORQUE_INGESTER_URL?.trim() || "https://ingest.torque.so/events";
  const endpoint = configuredEndpoint.endsWith("/events") ? configuredEndpoint : `${configuredEndpoint.replace(/\/+$/, "")}/events`;
  if (!apiKey) {
    return {
      ok: false,
      source: "torque",
      configured: false,
      error: "TORQUE_API_KEY is not configured on the read node.",
    };
  }
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });
  const raw = (await response.json().catch(() => null)) as unknown;
  return {
    ok: response.ok,
    source: "torque",
    endpoint,
    status: response.status,
    raw,
  };
}

async function fetchZerionPortfolio(wallet: string) {
  const apiKey = getApiKey("ZERION_API_KEY");
  if (!apiKey) {
    return {
      ok: false,
      source: "zerion",
      configured: false,
      error: "ZERION_API_KEY is not configured on the read node.",
    };
  }
  const response = await fetch(`https://api.zerion.io/v1/wallets/${encodeURIComponent(wallet)}/portfolio/?currency=usd`, {
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
    },
  });
  const raw = (await response.json().catch(() => null)) as unknown;
  return {
    ok: response.ok,
    source: "zerion",
    status: response.status,
    wallet,
    raw,
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

    if (req.method === "POST" && (pathname === "/api/goldrush/query" || pathname === "/api/v1/goldrush/query")) {
      const body = await readRequestJson(req);
      const query = await fetchGoldRushQuery(body);
      writeJson(res, query.ok ? 200 : 502, query);
      return;
    }

    if (req.method === "POST" && (pathname === "/api/torque/custom-event" || pathname === "/api/v1/torque/custom-event")) {
      const body = await readRequestJson(req);
      const result = await forwardTorqueEvent(body);
      writeJson(res, result.ok ? 200 : 502, result);
      return;
    }

    if (req.method === "POST" && pathname === "/api/v1/freshness/ping") {
      const body = await readRequestJson(req);
      const visitorUa = stringField(body, "visitorUa", String(req.headers["user-agent"] || "unknown"));
      const result = await sendFreshnessMemo(visitorUa);
      writeJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && pathname === "/api/v1/visitors/ping") {
      const body = await readRequestJson(req);
      const result = await handleVisitorPing(body, req);
      writeJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && pathname === "/api/v1/transactions/receipt") {
      const body = await readRequestJson(req);
      const result = await handleVisitorTransactionReceipt(body);
      writeJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && pathname === "/api/v1/onboard/request") {
      const body = await readRequestJson(req);
      const result = await handleOnboardingRequest(body);
      writeJson(res, 200, result);
      return;
    }

    if (req.method !== "GET") {
      writeJson(res, 405, { ok: false, error: "Method not allowed for this route" });
      return;
    }

    if (pathname === "/healthz" || pathname === "/api/health" || pathname === "/api/v1/health") {
      const runtime = await readNode.getRuntimeSnapshot();
      const [freshness, chain] = await Promise.all([
        latestFreshnessPing().catch(() => null),
        latestLiveTransactions().catch(() => ({ count: 0, transactions: [] })),
      ]);
      writeJson(res, 200, {
        ok: true,
        health: "healthy",
        runtime,
        liveProof: {
          freshnessEndpoint: "/api/v1/freshness/ping",
          visitorEndpoint: "/api/v1/visitors/ping",
          latestFreshness: freshness,
          chainWatcher: {
            endpoint: "/api/v1/chain/latest",
            latestIndexed: "transactions" in chain ? chain.transactions[0] || null : null,
          },
        },
      });
      return;
    }

    if (pathname === "/api/v1/runtime") {
      const runtime = await readNode.getRuntimeSnapshot(url.searchParams.get("refresh") === "1");
      writeJson(res, 200, { ok: true, runtime });
      return;
    }

    if (pathname === "/api/v1") {
      const [runtime, overview] = await Promise.all([
        readNode.getRuntimeSnapshot(url.searchParams.get("refresh") === "1"),
        readNode.getOpsOverview(url.searchParams.get("refresh") === "1"),
      ]);
      writeJson(res, 200, {
        ok: true,
        source: "backend-indexer",
        runtime,
        overview,
        endpoints: {
          health: "/api/v1/health",
          metrics: "/api/v1/metrics",
          proposals: "/api/v1/proposals",
          qvac: "/api/v1/qvac/runtime-proof",
          umbraRelayer: "/api/v1/umbra/relayer/health",
          privateSettlementIntent: "/api/v1/private-settlement/intent",
          freshnessPing: "/api/v1/freshness/ping",
          freshnessLatest: "/api/v1/freshness/latest",
          visitorPing: "/api/v1/visitors/ping",
          visitorStats: "/api/v1/visitors/stats",
          chainLatest: "/api/v1/chain/latest",
          transactionReceipt: "/api/v1/transactions/receipt",
          onboardRequest: "/api/v1/onboard/request",
        },
      });
      return;
    }

    if (pathname === "/api/v1/freshness/latest") {
      const latest = await latestFreshnessPing();
      writeJson(res, 200, {
        ok: true,
        source: latest ? "supabase-or-memory" : "not-yet-started",
        latest: latest
          ? {
              tx: latest.tx_signature,
              slot: latest.slot,
              time: latest.timestamp,
              explorer: `https://explorer.solana.com/tx/${latest.tx_signature}?cluster=testnet`,
            }
          : null,
        minIntervalMs: freshnessMinIntervalMs,
      });
      return;
    }

    if (pathname === "/api/v1/visitors/stats") {
      writeJson(res, 200, await visitorStats());
      return;
    }

    if (pathname === "/api/v1/chain/latest") {
      writeJson(res, 200, await latestLiveTransactions());
      return;
    }

	    if (pathname === "/api/v1/magicblock/health") {
	      const magicblock = await readNode.getMagicBlockRuntime(url.searchParams.get("refresh") === "1");
	      writeJson(res, 200, { ok: true, source: "backend-indexer", magicblock });
	      return;
	    }

    if (pathname === "/api/v1/umbra/relayer/info") {
      const relayer = await fetchUmbraRelayerInfo();
      writeJson(res, 200, {
        ok: true,
        source: "umbra-relayer",
        relayer,
        claimApi: {
          submit: `${relayer.endpoint}/v1/claims`,
          poll: `${relayer.endpoint}/v1/claims/{request_id}`,
          terminalStatuses: ["completed", "failed", "timed_out"],
        },
      });
      return;
    }

    if (pathname === "/api/v1/umbra/relayer/health") {
      const health = await fetchUmbraRelayerHealth();
      writeJson(res, 200, { ok: true, source: "umbra-relayer", health });
      return;
    }

    if (pathname === "/api/goldrush/query" || pathname === "/api/v1/goldrush/query") {
      if ((req.method as string) !== "POST") {
        writeJson(res, 405, { ok: false, error: "GoldRush query requires POST." });
        return;
      }
      const body = await readRequestJson(req);
      const query = await fetchGoldRushQuery(body);
      writeJson(res, query.ok ? 200 : 502, query);
      return;
    }

    if (pathname === "/api/dune/balances" || pathname === "/api/v1/dune/balances") {
      const wallet = getStringParam(url, "wallet");
      if (!wallet) {
        writeJson(res, 400, { ok: false, error: "wallet query parameter is required." });
        return;
      }
      const result = await fetchDuneSim("balances", wallet);
      writeJson(res, result.ok ? 200 : 502, result);
      return;
    }

    if (pathname === "/api/dune/transactions" || pathname === "/api/v1/dune/transactions") {
      const wallet = getStringParam(url, "wallet");
      if (!wallet) {
        writeJson(res, 400, { ok: false, error: "wallet query parameter is required." });
        return;
      }
      const result = await fetchDuneSim("transactions", wallet);
      writeJson(res, result.ok ? 200 : 502, result);
      return;
    }

    if (pathname === "/api/torque/custom-event" || pathname === "/api/v1/torque/custom-event") {
      if ((req.method as string) !== "POST") {
        writeJson(res, 405, { ok: false, error: "Torque custom event requires POST." });
        return;
      }
      const body = await readRequestJson(req);
      const result = await forwardTorqueEvent(body);
      writeJson(res, result.ok ? 200 : 502, result);
      return;
    }

    if (pathname === "/api/zerion/portfolio" || pathname === "/api/v1/zerion/portfolio") {
      const wallet = getStringParam(url, "wallet");
      if (!wallet) {
        writeJson(res, 400, { ok: false, error: "wallet query parameter is required." });
        return;
      }
      const result = await fetchZerionPortfolio(wallet);
      writeJson(res, result.ok ? 200 : 502, result);
      return;
    }

    const umbraClaimStatusMatch = pathname.match(/^\/api\/v1\/umbra\/claims\/([^/]+)$/);
    if (umbraClaimStatusMatch) {
      const requestId = umbraClaimStatusMatch[1];
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
        writeJson(res, 400, { ok: false, source: "umbra-relayer", error: "Invalid Umbra claim request_id UUID." });
        return;
      }
      const claim = await fetchUmbraClaimStatus(requestId);
      writeJson(res, 200, { ok: true, source: "umbra-relayer", claim });
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
      const proofPath = join(process.cwd(), "docs/qvac-runtime-proof.generated.json");
      const proof = await readFile(proofPath, "utf8")
        .then((content) => JSON.parse(content) as unknown)
        .catch((error) => ({
          schemaVersion: 1,
          project: "PrivateDAO",
          track: "qvac-sovereign-ai",
          sdkLoaded: false,
          source: "qvac-runtime-proof-missing",
          nextAction: "Run npm install and npm run probe:qvac-runtime before publishing the read node.",
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
            blockedProbes: metrics.blockedProbes,
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
          blockedProbes: metrics.blockedProbes,
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
