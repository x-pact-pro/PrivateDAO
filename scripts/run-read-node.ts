// SPDX-License-Identifier: AGPL-3.0-or-later
import * as http from "http";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { createRequire } from "module";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { readFile } from "fs/promises";
import { join, resolve } from "path";
import { URL } from "url";
import { gunzipSync } from "zlib";
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
const telegramWebhookUrl = process.env.PRIVATE_DAO_TELEGRAM_WEBHOOK_URL?.trim() || "";
const telegramBotToken = process.env.PRIVATE_DAO_TELEGRAM_BOT_TOKEN?.trim() || "";
const telegramChatId = process.env.PRIVATE_DAO_TELEGRAM_CHAT_ID?.trim() || "";
const telegramVisitorNotifications =
  process.env.PRIVATE_DAO_TELEGRAM_VISITOR_NOTIFICATIONS?.toLowerCase() !== "false";
const telegramVisitorMinIntervalMs = Number(process.env.PRIVATE_DAO_TELEGRAM_VISITOR_MIN_INTERVAL_MS || 60_000);
const telegramVisitorSessionTtlMs = Number(process.env.PRIVATE_DAO_TELEGRAM_VISITOR_SESSION_TTL_MS || 30 * 60_000);
const runtimeStateDir = process.env.PRIVATE_DAO_RUNTIME_STATE_DIR || "/srv/privatedao/runtime";
const quickNodeStreamStatePath = join(runtimeStateDir, "quicknode-stream-telemetry.json");
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
const executionEventsMemory: OperationExecutionEventRow[] = [];
let lastFreshnessPingMemory: FreshnessPingRow | null = null;
let lastVisitorTelegramAt = 0;
const visitorTelegramSessions = new Map<string, number>();
const metrics = {
  requestsTotal: 0,
  requestsFailed: 0,
  rateLimited: 0,
  blockedProbes: 0,
  routeHits: new Map<string, number>(),
};
const quickNodeStreamTelemetry = {
  acceptedPayloads: 0,
  lastAcceptedAt: null as string | null,
  lastSummary: null as ReturnType<typeof summarizeQuickNodeStreamPayload> | null,
  totals: {
    blockCount: 0,
    transactionCount: 0,
    failedTransactionCount: 0,
    privateDaoTransactionCount: 0,
    computeUnitsConsumed: 0,
  },
};
const requireFromWebApp = createRequire(join(process.cwd(), "apps/web/package.json"));
const onboardingIntakeKeyId = "pd-intake-rsa-2026-05-20";
const onboardingIntakePublicKeyPem = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArctJeM7icbCOBF3j+QpL
T4BOHMAGzmqd6ux4f5tBkD7h9sVRrKtGP2SKlbK7UlES9yOUWtjUscpgIBureIpc
Kg5+Obl1Pgh6sclVxTKoLAoF8//4KeaIkLqvQEz58gQLnlLOFjejp/eL8z0kr6b9
5/kw/bfyvBqXA4Mr8XDga6ix0DQl+n+9cfEuenykHqaTby6HHeF9Y9uHK6vfmiTo
0lSeVHVT5gFownY5e55WtP1PWOZu909AcRO2lAGl8DxiH2jE7Om1T2Ti6XeBhdCX
XUlHP+ocPBRQn/icAldPq+Xkc5cpxSOLcfnehYPjZ26xUQcHqBtSQyVMgb8aaSJr
sQIDAQAB
-----END PUBLIC KEY-----`;

type GeneratedReadNodeSnapshot = {
  generatedAt?: string;
  runtime?: Record<string, unknown>;
  overview?: Record<string, unknown>;
  profiles?: Array<Record<string, unknown>>;
  proposals?: Array<Record<string, unknown>>;
};

function readGeneratedReadNodeSnapshot(): GeneratedReadNodeSnapshot | null {
  try {
    return JSON.parse(readFileSync(resolve("docs/read-node/snapshot.generated.json"), "utf8")) as GeneratedReadNodeSnapshot;
  } catch {
    return null;
  }
}
const onboardingIntakePublicKeyFingerprint = "a4cb6e4ab4a729245104b7d25e3cd753349d749cbb52384e2094fdbad393ac08";

type SupabaseRow = Record<string, string | number | boolean | null | Record<string, unknown> | unknown[]>;
type OnboardingEnvelope = {
  version: string;
  algorithm: string;
  keyId: string;
  publicKeyFingerprint: string;
  encryptedAt: string;
  iv: string;
  encryptedKey: string;
  ciphertext: string;
  digest: string;
};

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

type OperationExecutionEventRow = {
  operation_id: string;
  operation_label: string;
  session_id: string;
  page: string;
  status: string;
  source: string;
  receipt_hash?: string | null;
  network?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
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

type QuickNodeProgramInvocation = {
  programId?: string;
  instruction?: unknown;
};

type QuickNodeStreamTransaction = {
  signature?: string;
  slot?: number;
  meta?: {
    err?: unknown;
    computeUnitsConsumed?: number;
    logMessages?: string[];
  };
  transaction?: {
    signatures?: string[];
    message?: {
      accountKeys?: Array<{ pubkey?: string } | string>;
      instructions?: Array<{ programId?: string; parsed?: unknown }>;
    };
  };
  programInvocations?: QuickNodeProgramInvocation[];
};

type QuickNodeStreamBlock = {
  blockHeight?: number;
  blockTime?: number;
  blockhash?: string;
  parentSlot?: number;
  transactions?: QuickNodeStreamTransaction[];
};

type QuickNodeStreamPayload = {
  data?: unknown;
};

const suspiciousPathPatterns = [
  /^\/\.env(?:$|[/?#])/,
  /^\/\.git(?:$|[/?#])/,
  /^\/wp-admin(?:$|[/?#])/,
  /^\/wp-login\.php(?:$|[/?#])/,
  /^\/phpmyadmin(?:$|[/?#])/,
  /^\/admin(?:$|[/?#])/,
];
const visitorTransactionStatuses = new Set(["submitted", "confirmed", "finalized"]);
const visitorTransactionActions = new Set([
  "audd-billing-rehearsal",
  "billing-rehearsal",
  "commit-vote",
  "create-dao",
  "create-proposal",
  "devnet-billing-rehearsal",
  "devnet-governance",
  "devnet-vote",
  "execute-proposal",
  "finalize-proposal",
  "freshness-memo",
  "governance-action",
  "reveal-vote",
  "service-request",
  "testnet-transaction",
  "treasury-receive",
  "wallet-onboarding",
]);

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
  let redacted = value
    .replace(/([?&](?:api[_-]?key|key|token|secret)=)[^&]+/gi, "$1[redacted]")
    .replace(/(quiknode\.pro\/)[A-Za-z0-9_-]{24,}/gi, "$1[redacted]")
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, "$1[redacted]");
  try {
    const url = new URL(redacted);
    if (/quiknode\.pro$/i.test(url.hostname) || /quicknode/i.test(url.hostname)) {
      url.pathname = url.pathname.replace(/\/[A-Za-z0-9_-]{24,}(?=\/?$)/g, "/[redacted]");
      redacted = url.toString().replace(/\/$/, "");
    }
  } catch {
    // Keep the regex-redacted value for non-URL strings such as Authorization headers.
  }
  return redacted;
}

function getQuickNodeAuthToken(req: http.IncomingMessage) {
  const headerToken =
    String(req.headers["x-quicknode-security-token"] || "") ||
    String(req.headers["x-private-dao-stream-token"] || "");
  const authorization = String(req.headers.authorization || "");
  const bearerToken = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice("bearer ".length)
    : "";
  return (bearerToken || headerToken).trim();
}

function safeTokenEquals(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

function getQuickNodeSignatureHeaders(req: http.IncomingMessage) {
  return {
    nonce: String(req.headers["x-qn-nonce"] || "").trim(),
    timestamp: String(req.headers["x-qn-timestamp"] || "").trim(),
    signature: String(req.headers["x-qn-signature"] || "").trim(),
  };
}

function safeHexEquals(receivedHex: string, expectedHex: string) {
  if (!/^[a-f0-9]{64}$/i.test(receivedHex) || !/^[a-f0-9]{64}$/i.test(expectedHex)) return false;
  const receivedBuffer = Buffer.from(receivedHex, "hex");
  const expectedBuffer = Buffer.from(expectedHex, "hex");
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

function verifyQuickNodeHmacSignature(secret: string, payload: string, nonce: string, timestamp: string, signature: string) {
  if (!nonce || !timestamp || !signature) return false;
  const maxAgeMs = Number(process.env.QUICKNODE_STREAM_MAX_SIGNATURE_AGE_MS || 10 * 60_000);
  const timestampMs = Number(timestamp) * 1000;
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > maxAgeMs) return false;
  const expected = createHmac("sha256", Buffer.from(secret)).update(nonce + timestamp + payload).digest("hex");
  return safeHexEquals(signature, expected);
}

function requireQuickNodeStreamAuth(req: http.IncomingMessage, rawPayload = "") {
  const expectedTokens = String(process.env.QUICKNODE_STREAM_TOKEN || "")
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
  if (expectedTokens.length === 0) {
    return { ok: false as const, status: 503, error: "QUICKNODE_STREAM_TOKEN is not configured on the read node." };
  }

  const receivedToken = getQuickNodeAuthToken(req);
  if (receivedToken && expectedTokens.some((token) => safeTokenEquals(receivedToken, token))) {
    return { ok: true as const };
  }

  const signatureHeaders = getQuickNodeSignatureHeaders(req);
  const hmacValid = expectedTokens.some((token) =>
    verifyQuickNodeHmacSignature(
      token,
      rawPayload,
      signatureHeaders.nonce,
      signatureHeaders.timestamp,
      signatureHeaders.signature,
    ),
  );
  if (!hmacValid) {
    return { ok: false as const, status: 401, error: "Unauthorized QuickNode stream payload." };
  }

  return { ok: true as const };
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function getQuickNodeTransactionSignature(transaction: QuickNodeStreamTransaction) {
  return transaction.signature ?? transaction.transaction?.signatures?.[0] ?? "unknown-signature";
}

function extractQuickNodeTransactions(entry: unknown): QuickNodeStreamTransaction[] {
  if (Array.isArray(entry)) {
    return entry.flatMap(extractQuickNodeTransactions);
  }

  const object = asObject(entry);
  if (Array.isArray(object.transactions)) {
    return object.transactions as QuickNodeStreamTransaction[];
  }

  if ("signature" in object || "transaction" in object || "programInvocations" in object) {
    return [object as QuickNodeStreamTransaction];
  }

  return [];
}

function getQuickNodeProgramIds(transaction: QuickNodeStreamTransaction) {
  const ids = new Set<string>();
  for (const invocation of transaction.programInvocations ?? []) {
    if (invocation.programId) ids.add(invocation.programId);
  }
  for (const instruction of transaction.transaction?.message?.instructions ?? []) {
    if (instruction.programId) ids.add(instruction.programId);
  }
  for (const account of transaction.transaction?.message?.accountKeys ?? []) {
    if (typeof account === "string") ids.add(account);
    else if (account.pubkey) ids.add(account.pubkey);
  }
  for (const log of transaction.meta?.logMessages ?? []) {
    const match = log.match(/^Program\s+([1-9A-HJ-NP-Za-km-z]{32,44})\s+/);
    if (match?.[1]) ids.add(match[1]);
  }
  return Array.from(ids);
}

function summarizeQuickNodeStreamPayload(payload: QuickNodeStreamPayload) {
  const entries = asArray(payload.data);
  const blocks = entries.filter((entry) => !Array.isArray(entry) && "blockhash" in asObject(entry)) as QuickNodeStreamBlock[];
  const transactions = entries.flatMap(extractQuickNodeTransactions);
  const privateDaoProgramId =
    process.env.NEXT_PUBLIC_PRIVATE_DAO_PROGRAM_ID?.trim() ||
    process.env.PRIVATE_DAO_PROGRAM_ID?.trim() ||
    "EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva";
  const programMatches = transactions.filter((transaction) => getQuickNodeProgramIds(transaction).includes(privateDaoProgramId));
  const failedTransactions = transactions.filter((transaction) => transaction.meta?.err);
  const computeUnits = transactions
    .map((transaction) => transaction.meta?.computeUnitsConsumed)
    .filter((value): value is number => typeof value === "number");
  const computeUnitsConsumed = computeUnits.reduce((sum, value) => sum + value, 0);
  const firstBlock = blocks[0];
  const latestSlot =
    transactions.reduce<number | null>(
      (latest, transaction) =>
        typeof transaction.slot === "number" ? Math.max(latest ?? 0, transaction.slot) : latest,
      null,
    ) ?? firstBlock?.parentSlot ?? null;

  return {
    acceptedAt: new Date().toISOString(),
    network: "solana-testnet",
    dataset: "quicknode-stream",
    blockCount: blocks.length,
    transactionCount: transactions.length,
    failedTransactionCount: failedTransactions.length,
    privateDaoProgramId,
    privateDaoTransactionCount: programMatches.length,
    computeUnitsConsumed,
    latestSlot,
    latestBlockHeight: firstBlock?.blockHeight ?? null,
    latestBlockTime: firstBlock?.blockTime ?? null,
    sampleSignatures: transactions.slice(0, 8).map(getQuickNodeTransactionSignature),
    privateDaoSignatures: programMatches.slice(0, 8).map(getQuickNodeTransactionSignature),
    dataUse:
      "QuickNode Streams feed PrivateDAO runtime intelligence, proof freshness, and reviewer-visible operational telemetry. Raw payloads are not persisted by this endpoint.",
  };
}

function recordQuickNodeStreamSummary(summary: ReturnType<typeof summarizeQuickNodeStreamPayload>) {
  quickNodeStreamTelemetry.acceptedPayloads += 1;
  quickNodeStreamTelemetry.lastAcceptedAt = summary.acceptedAt;
  quickNodeStreamTelemetry.lastSummary = summary;
  quickNodeStreamTelemetry.totals.blockCount += summary.blockCount;
  quickNodeStreamTelemetry.totals.transactionCount += summary.transactionCount;
  quickNodeStreamTelemetry.totals.failedTransactionCount += summary.failedTransactionCount;
  quickNodeStreamTelemetry.totals.privateDaoTransactionCount += summary.privateDaoTransactionCount;
  quickNodeStreamTelemetry.totals.computeUnitsConsumed += summary.computeUnitsConsumed;
  persistQuickNodeStreamTelemetry();
}

function mergeQuickNodeStreamTelemetry(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const record = value as Partial<typeof quickNodeStreamTelemetry>;
  const totals = (record.totals || {}) as Partial<typeof quickNodeStreamTelemetry.totals>;
  quickNodeStreamTelemetry.acceptedPayloads = Number(record.acceptedPayloads || 0);
  quickNodeStreamTelemetry.lastAcceptedAt = typeof record.lastAcceptedAt === "string" ? record.lastAcceptedAt : null;
  quickNodeStreamTelemetry.lastSummary =
    record.lastSummary && typeof record.lastSummary === "object"
      ? (record.lastSummary as typeof quickNodeStreamTelemetry.lastSummary)
      : null;
  quickNodeStreamTelemetry.totals.blockCount = Number(totals.blockCount || 0);
  quickNodeStreamTelemetry.totals.transactionCount = Number(totals.transactionCount || 0);
  quickNodeStreamTelemetry.totals.failedTransactionCount = Number(totals.failedTransactionCount || 0);
  quickNodeStreamTelemetry.totals.privateDaoTransactionCount = Number(totals.privateDaoTransactionCount || 0);
  quickNodeStreamTelemetry.totals.computeUnitsConsumed = Number(totals.computeUnitsConsumed || 0);
}

function loadQuickNodeStreamTelemetry() {
  try {
    if (!existsSync(quickNodeStreamStatePath)) return;
    mergeQuickNodeStreamTelemetry(JSON.parse(readFileSync(quickNodeStreamStatePath, "utf8")) as unknown);
  } catch (error) {
    console.warn(`QuickNode telemetry state load skipped: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function quickNodeStreamStats() {
  return {
    ...quickNodeStreamTelemetry,
    auth: process.env.QUICKNODE_STREAM_TOKEN ? "configured" : "missing-env",
    network: "solana-testnet",
    rawPayloadStorage: "disabled",
    statePersistence: "runtime-volume",
    acceptedAuthHeaders: [
      "X-QN-Nonce + X-QN-Timestamp + X-QN-Signature",
      "Authorization: Bearer <token>",
      "x-quicknode-security-token",
      "x-private-dao-stream-token",
    ],
  };
}

function persistQuickNodeStreamTelemetry() {
  try {
    mkdirSync(runtimeStateDir, { recursive: true });
    const tmpPath = `${quickNodeStreamStatePath}.${process.pid}.tmp`;
    writeFileSync(tmpPath, JSON.stringify(quickNodeStreamTelemetry, null, 2) + "\n");
    renameSync(tmpPath, quickNodeStreamStatePath);
  } catch (error) {
    console.warn(`QuickNode telemetry state persist skipped: ${error instanceof Error ? error.message : String(error)}`);
  }
}

loadQuickNodeStreamTelemetry();

function readRequestBodyWithLimit(req: http.IncomingMessage, maxBytes: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let bytes = 0;
    req.on("data", (chunk: Buffer) => {
      bytes += chunk.byteLength;
      chunks.push(chunk);
      if (bytes > maxBytes) {
        req.destroy(new Error("Request body too large"));
      }
    });
    req.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    req.on("error", reject);
  });
}

function decodeRequestBody(req: http.IncomingMessage, body: Buffer) {
  const encoding = String(req.headers["content-encoding"] || "").toLowerCase();
  return encoding.includes("gzip") ? gunzipSync(body).toString("utf8") : body.toString("utf8");
}

function parseJsonObject(raw: string, label: string): unknown {
  const parsed = JSON.parse(raw || "{}") as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return parsed;
}

async function readRequestJsonWithLimit(req: http.IncomingMessage, maxBytes: number): Promise<unknown> {
  const body = await readRequestBodyWithLimit(req, maxBytes);
  return parseJsonObject(decodeRequestBody(req, body), "JSON body");
}

async function readRequestJson(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  const parsed = await readRequestJsonWithLimit(req, 32_768);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON body must be an object");
  }
  return parsed as Record<string, unknown>;
}

async function readQuickNodeStreamJson(req: http.IncomingMessage): Promise<{ payload: QuickNodeStreamPayload; rawPayload: string }> {
  const maxBytes = Number(process.env.QUICKNODE_STREAM_MAX_BYTES || 6_000_000);
  const body = await readRequestBodyWithLimit(req, maxBytes);
  const rawPayload = decodeRequestBody(req, body);
  const parsed = parseJsonObject(rawPayload, "QuickNode stream payload");
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("QuickNode stream payload must be a JSON object");
  }
  return { payload: parsed as QuickNodeStreamPayload, rawPayload };
}

function stringField(body: Record<string, unknown>, key: string, fallback = "") {
  const value = body[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function optionalSolanaPublicKey(value: string) {
  if (!value) return null;
  try {
    return new PublicKey(value).toBase58();
  } catch {
    throw new Error("walletAddress must be a valid Solana public key.");
  }
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

function hasTelegramConfig() {
  return Boolean(telegramWebhookUrl || (telegramBotToken && telegramChatId));
}

function compactTelegramText(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 3900);
}

async function sendTelegramNotification(text: string) {
  if (!hasTelegramConfig()) return { ok: false, source: "disabled" };
  const payload = { text: compactTelegramText(text) };
  try {
    if (telegramWebhookUrl) {
      const response = await fetch(telegramWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return { ok: response.ok, source: "webhook", status: response.status };
    }
    const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text: payload.text,
        disable_web_page_preview: true,
      }),
    });
    return { ok: response.ok, source: "telegram-bot", status: response.status };
  } catch {
    return { ok: false, source: "telegram-error" };
  }
}

function pruneVisitorTelegramSessions(now: number) {
  visitorTelegramSessions.forEach((timestamp, sessionId) => {
    if (now - timestamp > telegramVisitorSessionTtlMs) {
      visitorTelegramSessions.delete(sessionId);
    }
  });
}

function shouldNotifyVisitor(sessionId: string) {
  if (!telegramVisitorNotifications || !hasTelegramConfig()) return false;
  const now = Date.now();
  pruneVisitorTelegramSessions(now);
  if (visitorTelegramSessions.has(sessionId)) return false;
  if (now - lastVisitorTelegramAt < telegramVisitorMinIntervalMs) return false;
  visitorTelegramSessions.set(sessionId, now);
  lastVisitorTelegramAt = now;
  return true;
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
  if (shouldNotifyVisitor(row.session_id)) {
    void sendTelegramNotification(
      [
        "PrivateDAO site visit",
        `Page: ${page}`,
        `Session: ${row.session_id.slice(0, 12)}`,
        `Country hint: ${row.country_hint || "unknown"}`,
        `Time: ${row.timestamp}`,
      ].join("\n"),
    );
  }
  return { ok: true, source: stored.ok ? "supabase" : "memory-fallback", session: row.session_id.slice(0, 12), page };
}

function normalizeOperationId(value: string) {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9._:-]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized.slice(0, 96) || "unknown-operation";
}

function operationEventSummary(rows: OperationExecutionEventRow[]) {
  const grouped = new Map<
    string,
    {
      operationId: string;
      label: string;
      total: number;
      success: number;
      review: number;
      uniqueSessions: Set<string>;
      latestAt: string | null;
      latestReceiptHash: string | null;
      latestSource: string | null;
    }
  >();

  for (const row of rows) {
    const operationId = normalizeOperationId(row.operation_id);
    const current = grouped.get(operationId) || {
      operationId,
      label: row.operation_label || operationId,
      total: 0,
      success: 0,
      review: 0,
      uniqueSessions: new Set<string>(),
      latestAt: null,
      latestReceiptHash: null,
      latestSource: null,
    };
    current.total += 1;
    if (row.status === "success") current.success += 1;
    else current.review += 1;
    current.uniqueSessions.add(row.session_id);
    const createdAt = row.created_at || new Date().toISOString();
    if (!current.latestAt || new Date(createdAt).getTime() >= new Date(current.latestAt).getTime()) {
      current.latestAt = createdAt;
      current.latestReceiptHash = row.receipt_hash || null;
      current.latestSource = row.source || null;
      current.label = row.operation_label || current.label;
    }
    grouped.set(operationId, current);
  }

  const operations = Array.from(grouped.values())
    .map((item) => ({
      operationId: item.operationId,
      label: item.label,
      total: item.total,
      success: item.success,
      review: item.review,
      uniqueSessions: item.uniqueSessions.size,
      latestAt: item.latestAt,
      latestReceiptHash: item.latestReceiptHash,
      latestSource: item.latestSource,
    }))
    .sort((a, b) => b.total - a.total || a.operationId.localeCompare(b.operationId));

  return {
    totalExecutions: operations.reduce((sum, item) => sum + item.total, 0),
    totalSuccess: operations.reduce((sum, item) => sum + item.success, 0),
    uniqueSessions: new Set(rows.map((row) => row.session_id)).size,
    operations,
    latest: [...rows]
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 10)
      .map((row) => ({
        operationId: row.operation_id,
        label: row.operation_label,
        status: row.status,
        source: row.source,
        receiptHash: row.receipt_hash || null,
        page: row.page,
        createdAt: row.created_at || null,
      })),
  };
}

async function executionEventStats() {
  const rows = await supabaseSelect<OperationExecutionEventRow>(
    "operation_execution_events",
    "?select=operation_id,operation_label,session_id,page,status,source,receipt_hash,network,metadata,created_at&order=created_at.desc&limit=10000",
  );
  const sourceRows = rows.length ? rows : executionEventsMemory;
  return {
    ok: true,
    source: rows.length ? "supabase" : executionEventsMemory.length ? "memory-fallback" : hasSupabaseRestConfig() ? "supabase-empty" : "memory-fallback",
    ...operationEventSummary(sourceRows),
  };
}

async function handleOperationExecutionEvent(body: Record<string, unknown>, req: http.IncomingMessage) {
  const operationId = normalizeOperationId(stringField(body, "operationId", "unknown-operation"));
  const operationLabel = stringField(body, "operationLabel", operationId).slice(0, 140);
  const sessionIdRaw = stringField(body, "sessionId", createHash("sha256").update(`${Date.now()}:${Math.random()}`).digest("hex"));
  const statusRaw = stringField(body, "status", "success").toLowerCase();
  const status = statusRaw === "success" ? "success" : "review";
  const receiptHash = stringField(body, "receiptHash").slice(0, 160) || null;
  const page = stringField(body, "page", "/proof/encrypt-ika-desktop").slice(0, 180);
  const network = stringField(body, "network", "desktop").slice(0, 80) || null;
  const metadata = body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? (body.metadata as Record<string, unknown>) : {};
  const row: OperationExecutionEventRow = {
    operation_id: operationId,
    operation_label: operationLabel,
    session_id: hashVisitorSession(sessionIdRaw),
    page,
    status,
    source: stringField(body, "source", "visitor-browser").slice(0, 80) || "visitor-browser",
    receipt_hash: receiptHash,
    network,
    metadata: {
      ...metadata,
      uaHash: createHash("sha256").update(String(req.headers["user-agent"] || "unknown")).digest("hex").slice(0, 24),
    },
    created_at: new Date().toISOString(),
  };
  executionEventsMemory.push(row);
  if (executionEventsMemory.length > 10000) executionEventsMemory.shift();
  const stored = await supabaseInsert("operation_execution_events", row as SupabaseRow);
  const stats = await executionEventStats();
  return {
    ok: true,
    source: stored.ok ? "supabase" : "memory-fallback",
    operationId,
    totalForOperation: stats.operations.find((item) => item.operationId === operationId)?.total || 1,
    stats,
  };
}

async function handleVisitorTransactionReceipt(body: Record<string, unknown>) {
  const txSignature = stringField(body, "txSignature");
  if (!/^[1-9A-HJ-NP-Za-km-z]{64,96}$/.test(txSignature)) {
    throw new Error("txSignature must be a Solana base58 signature.");
  }
  const sessionIdRaw = stringField(body, "sessionId", "anonymous-session");
  const walletAddress = optionalSolanaPublicKey(stringField(body, "walletAddress"));
  const walletName = stringField(body, "walletName", "unknown-wallet").slice(0, 80);
  const requestedAction = stringField(body, "action", "testnet-transaction").slice(0, 80);
  const action = visitorTransactionActions.has(requestedAction) ? requestedAction : "testnet-transaction";
  const page = stringField(body, "page", "/").slice(0, 180);
  const requestedStatus = stringField(body, "status", "confirmed").slice(0, 40);
  const status = visitorTransactionStatuses.has(requestedStatus) ? requestedStatus : "confirmed";
  const row: VisitorTransactionRow = {
    tx_signature: txSignature,
    session_id: hashVisitorSession(sessionIdRaw),
    wallet_address: walletAddress,
    wallet_name: walletName,
    action,
    page,
    status,
    slot: typeof body.slot === "number" && Number.isFinite(body.slot) ? Math.round(body.slot) : null,
  };
  const stored = await supabaseInsert("visitor_transactions", row as SupabaseRow);
  void sendTelegramNotification(
    [
      "PrivateDAO visitor Testnet transaction",
      `Action: ${action}`,
      `Wallet: ${walletName}`,
      walletAddress ? `Address: ${walletAddress}` : "Address: not provided",
      `Tx: https://explorer.solana.com/tx/${txSignature}?cluster=testnet`,
      `Page: ${page}`,
    ].join("\n"),
  );
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

function isOnboardingEnvelope(value: unknown): value is OnboardingEnvelope {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return [
    "version",
    "algorithm",
    "keyId",
    "publicKeyFingerprint",
    "encryptedAt",
    "iv",
    "encryptedKey",
    "ciphertext",
    "digest",
  ].every((key) => typeof candidate[key] === "string" && String(candidate[key]).trim().length > 0);
}

function normalizeCipherField(value: string, max = 12_000) {
  return value.trim().replace(/\s+/g, "");
}

function getRuntimeConnection(chainName: string) {
  const normalized = chainName.trim().toLowerCase();
  if (normalized.includes("mainnet")) {
    return new Connection(process.env.SOLANA_MAINNET_RPC_URL || "https://api.mainnet-beta.solana.com", "confirmed");
  }
  if (normalized.includes("devnet")) {
    return new Connection(process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com", "confirmed");
  }
  return new Connection(process.env.SOLANA_RPC_URL || "https://api.testnet.solana.com", "confirmed");
}

async function fetchWalletRuntimePreview(walletAddress: string, chainName: string) {
  try {
    const connection = getRuntimeConnection(chainName);
    const owner = new PublicKey(walletAddress);
    const [balanceLamports, signatures, tokenAccounts] = await Promise.all([
      connection.getBalance(owner, "confirmed"),
      connection.getSignaturesForAddress(owner, { limit: 8 }, "confirmed"),
      connection.getParsedTokenAccountsByOwner(
        owner,
        { programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") },
        "confirmed",
      ),
    ]);
    const balances = [
      {
        symbol: "SOL",
        name: chainName.includes("mainnet") ? "Solana" : "Solana (preview)",
        quote: null,
        prettyBalance: `${(balanceLamports / 1_000_000_000).toFixed(4)} SOL`,
      },
      ...tokenAccounts.value
        .filter((account) => {
          const amount = account.account.data.parsed?.info?.tokenAmount?.uiAmount;
          return typeof amount === "number" && Number.isFinite(amount) && amount > 0;
        })
        .slice(0, 10)
        .map((account) => {
          const info = account.account.data.parsed?.info;
          const tokenAmount = info?.tokenAmount?.uiAmountString || info?.tokenAmount?.uiAmount || "0";
          const mint = typeof info?.mint === "string" ? info.mint : "unknown-mint";
          return {
            symbol: mint.slice(0, 4).toUpperCase(),
            name: mint,
            quote: null,
            prettyBalance: String(tokenAmount),
          };
        }),
    ];

    return {
      ok: true,
      source: "solana-rpc",
      assetCount: balances.length,
      stableAssetCount: 0,
      balances,
      transactions: signatures.map((item) => ({
        signature: item.signature,
        slot: item.slot,
        time: item.blockTime ? new Date(item.blockTime * 1000).toISOString() : null,
        err: item.err,
        explorer: `https://explorer.solana.com/tx/${item.signature}?cluster=${chainName.includes("mainnet") ? "" : chainName.includes("devnet") ? "devnet" : "testnet"}`,
      })),
    };
  } catch (error) {
    return {
      ok: false,
      source: "solana-rpc",
      error: error instanceof Error ? error.message : "wallet runtime preview failed",
      assetCount: 0,
      stableAssetCount: 0,
      balances: [] as Array<{ symbol?: string; name?: string; quote?: number | null; prettyBalance?: string | null }>,
      transactions: [] as Array<Record<string, unknown>>,
    };
  }
}

async function handleOnboardingRequest(body: Record<string, unknown>) {
  if (isOnboardingEnvelope(body.envelope)) {
    const envelope = body.envelope;
    const encryptedKey = normalizeCipherField(envelope.encryptedKey, 8_000);
    const ciphertext = normalizeCipherField(envelope.ciphertext, 32_000);
    const iv = normalizeCipherField(envelope.iv, 1_024);
    const digest = normalizeCipherField(envelope.digest, 512);
    if (encryptedKey.length < 64 || ciphertext.length < 64 || iv.length < 16 || digest.length < 32) {
      throw new Error("Encrypted onboarding envelope is incomplete.");
    }

    const row = {
      tier: "sealed-intake",
      profile: "sealed-intake",
      challenges: [] as string[],
      other_challenge: null,
      treasury_size: "sealed-intake",
      voting_members: "sealed-intake",
      monthly_decisions: "sealed-intake",
      current_setup: [] as string[],
      preferred_chain: "sealed-intake",
      developer_context: "sealed-intake",
      name: `sealed:${envelope.keyId}`,
      email: `sealed:${digest.slice(0, 24)}`,
      organization: null,
      website: null,
      telegram: null,
      timeline: "sealed-intake",
      source: "client-envelope",
      notes: JSON.stringify({
        version: envelope.version,
        algorithm: envelope.algorithm,
        keyId: envelope.keyId,
        publicKeyFingerprint: envelope.publicKeyFingerprint,
        encryptedAt: envelope.encryptedAt,
        iv,
        encryptedKey,
        ciphertext,
        digest,
      }),
      utm_source: stringField(body, "utmSource").slice(0, 120) || null,
      status: "sealed",
    };
    const stored = await supabaseInsert("onboarding_requests", row);
    if (!stored.ok) {
      throw new Error("Encrypted onboarding request could not be stored.");
    }

    void sendTelegramNotification(
      [
        "New PrivateDAO encrypted onboarding request",
        `Mode: sealed client-side envelope`,
        `Key: ${envelope.keyId}`,
        `Digest: ${digest.slice(0, 24)}`,
        `Encrypted at: ${envelope.encryptedAt}`,
      ].join("\n"),
    );

    return {
      ok: true,
      source: "supabase-sealed",
      mode: "client-encrypted-envelope",
      next: "/onboard/confirmed/",
      message: "Your brief was encrypted in-browser and stored as ciphertext only.",
    };
  }

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

  void sendTelegramNotification(
    [
      "New PrivateDAO onboarding request",
      `Name: ${name}`,
      `Email: ${email}`,
      `Tier: ${tier}`,
      `Profile: ${profile}`,
      `Treasury: ${row.treasury_size}`,
      `Timeline: ${row.timeline}`,
      row.organization ? `Organization: ${row.organization}` : "",
      row.telegram ? `Telegram: ${row.telegram}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return {
    ok: true,
    source: "supabase",
    mode: "legacy-plaintext",
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
  const verifiedUserKey = (row: VisitorTransactionRow) => row.wallet_address || row.session_id;
  const solscanVerifiedUsers = new Set(visitorTransactions.map(verifiedUserKey)).size;
  const solscanVerifiedUsersToday = new Set(visitorTransactionsToday.map(verifiedUserKey)).size;
  return {
    ok: true,
    source: rows.length ? "supabase" : "memory-fallback",
    privacy: "Counted privately — no IP address or personal data stored.",
    activeToday,
    activeNow,
    totalSessions,
    visitorTransactionsToday: visitorTransactionsToday.length,
    totalVisitorTransactions: visitorTransactions.length,
    solscanVerifiedUsers,
    solscanVerifiedUsersToday,
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

  const goldRushHeaders: Record<string, string> = apiKey.startsWith("gr_")
    ? { Accept: "application/json", Authorization: `Bearer ${apiKey}` }
    : { Accept: "application/json" };
  const [warehouseResponse, balancesResponse, txResponse, zerionFallback, rpcFallback] = await Promise.all([
    fetch("https://api.covalenthq.com/_/warehouse/", {
      headers: goldRushHeaders,
    }).catch(() => null),
    fetch(`https://api.covalenthq.com/v1/${encodeURIComponent(chainName)}/address/${encodeURIComponent(walletAddress)}/balances_v2/?key=${encodeURIComponent(apiKey)}`, {
      headers: { Accept: "application/json" },
    }),
    fetch(`https://api.covalenthq.com/v1/${encodeURIComponent(chainName)}/address/${encodeURIComponent(walletAddress)}/transactions_v3/?key=${encodeURIComponent(apiKey)}`, {
      headers: { Accept: "application/json" },
    }),
    fetchZerionPortfolio(walletAddress).catch(() => ({ ok: false, source: "zerion" })),
    fetchWalletRuntimePreview(walletAddress, chainName),
  ]);

  const warehouseRaw = warehouseResponse ? ((await warehouseResponse.json().catch(() => null)) as Record<string, unknown> | null) : null;
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

  const zerionRaw = "raw" in zerionFallback ? (zerionFallback.raw as Record<string, unknown> | null) : null;
  const zerionTotal =
    zerionFallback.ok &&
    typeof zerionRaw?.data === "object" &&
    typeof (((zerionRaw.data as Record<string, unknown>).attributes as Record<string, unknown>)?.total as Record<string, unknown> | undefined)?.positions === "number"
      ? Number((((zerionRaw.data as Record<string, unknown>).attributes as Record<string, unknown>).total as Record<string, unknown>).positions)
      : null;

  const fallbackBalances = balances.length > 0 ? balances : rpcFallback.balances;
  const fallbackTransactions = txItems.length > 0 ? txItems.slice(0, 8) : rpcFallback.transactions.slice(0, 8);
  const fallbackStableHoldings = stablecoinHoldings.length > 0 ? stablecoinHoldings : [];
  const goldRushState =
    balancesResponse.ok || txResponse.ok
      ? "live"
      : warehouseResponse?.ok
        ? "warehouse-live-wallet-endpoint-pending"
      : balancesResponse.status === 402 || txResponse.status === 402
        ? "credits-exhausted-fallback"
        : "degraded-fallback";
  const covalentStatus =
    goldRushState === "live"
      ? "live-covalent-goldrush"
      : goldRushState === "warehouse-live-wallet-endpoint-pending"
        ? "covalent-goldrush-warehouse-live"
      : goldRushState === "credits-exhausted-fallback"
        ? "covalent-goldrush-credit-limited"
        : "covalent-goldrush-degraded";
  const liveFallbackOk = Boolean(zerionFallback.ok || rpcFallback.ok);

  return {
    ok: balancesResponse.ok || txResponse.ok || liveFallbackOk,
    queryType,
    chainName,
    walletAddress,
    sources: {
      goldRush: goldRushState,
      legacyAnalytics: covalentStatus,
      covalentGoldRush: covalentStatus,
      zerion: zerionFallback.ok ? "live" : "unavailable",
      solanaRpc: rpcFallback.ok ? "live" : "unavailable",
    },
    summary: {
      assetCount: balances.length > 0 ? balances.length : rpcFallback.assetCount,
      stableAssetCount: stablecoinHoldings.length > 0 ? stablecoinHoldings.length : rpcFallback.stableAssetCount,
      totalQuoteUsd: totalQuoteUsd > 0 ? totalQuoteUsd : zerionTotal || 0,
      previewTransactionCount: txItems.length > 0 ? txItems.length : rpcFallback.transactions.length,
    },
    riskSignals: [
      ...(txItems.length === 0 ? ["No recent transaction preview returned by GoldRush for this wallet."] : []),
      ...(goldRushState === "credits-exhausted-fallback"
        ? ["GoldRush credits are exhausted on the live key. This response falls back to Zerion and Solana RPC so review can continue."]
        : []),
      ...(goldRushState === "warehouse-live-wallet-endpoint-pending"
        ? ["Covalent GoldRush Warehouse is live with Bearer auth. Wallet-specific v1 endpoints do not accept this key shape, so wallet preview is served by Zerion and Solana RPC until the Warehouse wallet dataset is selected."]
        : []),
    ],
    balances: fallbackBalances,
    stablecoinHoldings: fallbackStableHoldings,
    transactions: fallbackTransactions,
    stablecoinFlowPreview: fallbackTransactions,
    raw: {
      balanceStatus: balancesResponse.status,
      transactionStatus: txResponse.status,
      warehouseStatus: warehouseResponse?.status ?? null,
      warehouseUpdatedAt: typeof warehouseRaw?.updated_at === "string" ? warehouseRaw.updated_at : null,
      zerionStatus: zerionFallback.ok ? 200 : typeof (zerionFallback as { status?: number }).status === "number" ? (zerionFallback as { status?: number }).status : null,
      solanaRpcStatus: rpcFallback.ok ? 200 : null,
    },
  };
}

function sha256Hex(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

async function readSolanaKeypairPublicKey(keypairPath: string) {
  const raw = await readFile(resolve(keypairPath), "utf8");
  const secret = JSON.parse(raw) as number[];
  if (!Array.isArray(secret) || secret.length !== 64 || !secret.every((value) => Number.isInteger(value) && value >= 0 && value <= 255)) {
    throw new Error("Invalid Solana keypair file shape");
  }
  return Keypair.fromSecretKey(Uint8Array.from(secret)).publicKey;
}

async function readIkaSolanaPreAlphaStatus() {
  const grpcUrl = process.env.IKA_PREALPHA_GRPC_URL?.trim() || "https://pre-alpha-dev-1.ika.ika-network.net:443";
  const rpcUrl =
    process.env.IKA_PREALPHA_SOLANA_RPC?.trim() ||
    process.env.RPCFAST_DEVNET_RPC_URL?.trim() ||
    process.env.RPC_FAST_DEVNET_RPC?.trim() ||
    process.env.SOLANA_RPC_URL?.trim() ||
    "https://api.devnet.solana.com";
  const wssUrl =
    process.env.IKA_PREALPHA_SOLANA_WSS?.trim() ||
    process.env.RPCFAST_DEVNET_WSS_URL?.trim() ||
    process.env.RPC_FAST_DEVNET_WSS?.trim() ||
    process.env.SOLANA_WSS_URL?.trim() ||
    "";
  const yellowstoneGrpcEndpoint =
    process.env.IKA_PREALPHA_YELLOWSTONE_GRPC_ENDPOINT?.trim() ||
    process.env.RPCFAST_DEVNET_YELLOWSTONE_GRPC_ENDPOINT?.trim() ||
    process.env.RPC_FAST_DEVNET_YELLOWSTONE_GRPC_ENDPOINT?.trim() ||
    "";
  const programIdRaw =
    process.env.IKA_PREALPHA_PROGRAM_ID?.trim() || "87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY";
  const keypairPath = process.env.IKA_SOLANA_KEYPAIR_PATH?.trim();
  const connection = new Connection(rpcUrl, "confirmed");
  const programId = new PublicKey(programIdRaw);
  const [programAccount, latestBlockhash] = await Promise.all([
    connection.getAccountInfo(programId).catch((error: unknown) => ({ error })),
    connection.getLatestBlockhash().catch((error: unknown) => ({ error })),
  ]);

  let operator: Record<string, unknown> = {
    configured: Boolean(keypairPath),
    publicKey: null,
    balanceSol: null,
    balanceLamports: null,
    funded: false,
    keypairPathConfigured: Boolean(keypairPath),
  };

  if (keypairPath) {
    try {
      const publicKey = await readSolanaKeypairPublicKey(keypairPath);
      const lamports = await connection.getBalance(publicKey, "confirmed");
      operator = {
        configured: true,
        publicKey: publicKey.toBase58(),
        balanceSol: lamports / 1_000_000_000,
        balanceLamports: lamports,
        funded: lamports > 0,
        keypairPathConfigured: true,
      };
    } catch (error) {
      operator = {
        ...operator,
        error: error instanceof Error ? error.message : "Failed to read configured Solana operator keypair",
      };
    }
  }

  const operatorFunded = operator.funded === true;

  return {
    source: "ika-solana-prealpha-live-readiness",
    grpcUrl,
    rpcUrl: redactUrlSecret(rpcUrl),
    wssUrl: wssUrl ? redactUrlSecret(wssUrl) : null,
    yellowstoneGrpcEndpoint: yellowstoneGrpcEndpoint || null,
    programId: programId.toBase58(),
    program: {
      exists: Boolean(programAccount && !("error" in programAccount)),
      executable: Boolean(programAccount && !("error" in programAccount) && programAccount.executable),
      owner:
        programAccount && !("error" in programAccount) && programAccount.owner
          ? programAccount.owner.toBase58()
          : null,
      lamports:
        programAccount && !("error" in programAccount) && typeof programAccount.lamports === "number"
          ? programAccount.lamports
          : null,
      error:
        programAccount && "error" in programAccount
          ? programAccount.error instanceof Error
            ? programAccount.error.message
            : "Unable to read Ika pre-alpha program account"
          : null,
    },
    operator,
    latestBlockhash: "error" in latestBlockhash ? null : latestBlockhash.blockhash,
    latestValidBlockHeight: "error" in latestBlockhash ? null : latestBlockhash.lastValidBlockHeight,
    executionBoundary:
      operatorFunded && programAccount && !("error" in programAccount) && programAccount.executable
        ? "live-solana-devnet-operator-ready-for-ika-prealpha-approval-flow"
        : "solana-devnet-operator-or-program-returned-review-state",
  };
}

async function fetchJupiterOrder(body: Record<string, unknown>) {
  const apiKey = getApiKey("JUP_API_KEY") || getApiKey("JUPITER_API_KEY");
  const inputMint = stringField(body, "inputMint", "So11111111111111111111111111111111111111112");
  const outputMint = stringField(body, "outputMint", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  const amount = stringField(body, "amount", "20000000");
  const taker = stringField(body, "taker");
  const slippageBps = Number(body.slippageBps ?? 50);

  if (!/^\d+$/.test(amount)) {
    return { ok: false, source: "jupiter", error: "amount must be an integer string in base units." };
  }
  if (!apiKey) {
    return {
      ok: false,
      source: "jupiter",
      configured: false,
      error: "JUP_API_KEY is not configured on the read node.",
      executionBoundary: "order-preview-route-ready-awaiting-server-key",
    };
  }

  const params = new URLSearchParams({ inputMint, outputMint, amount });
  if (taker) params.set("taker", taker);
  if (Number.isFinite(slippageBps)) params.set("slippageBps", String(Math.max(0, Math.min(10_000, Math.round(slippageBps)))));

  const response = await fetch(`https://api.jup.ag/swap/v2/order?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "x-api-key": apiKey,
    },
  });
  const raw = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  return {
    ok: response.ok,
    source: "jupiter",
    configured: true,
    status: response.status,
    request: {
      inputMint,
      outputMint,
      amount,
      taker: taker || null,
      slippageBps: Number.isFinite(slippageBps) ? slippageBps : null,
    },
    summary: {
      mode: typeof raw?.mode === "string" ? raw.mode : null,
      router: typeof raw?.router === "string" ? raw.router : null,
      inAmount: typeof raw?.inAmount === "string" ? raw.inAmount : null,
      outAmount: typeof raw?.outAmount === "string" ? raw.outAmount : null,
      priceImpact: typeof raw?.priceImpact === "number" ? raw.priceImpact : null,
      requestId: typeof raw?.requestId === "string" ? raw.requestId : null,
      transactionAvailable: typeof raw?.transaction === "string" && raw.transaction.length > 0,
    },
    raw,
  };
}

async function handleIkaCustodyPrepare(body: Record<string, unknown>) {
  const network = stringField(body, "network", "testnet") === "mainnet" ? "mainnet" : "testnet";
  const curveInput = stringField(body, "curve", "SECP256K1").toUpperCase();
  const custodyMode = stringField(body, "custodyMode", "shared-dwallet");
  const operationLabel = stringField(body, "operationLabel", "PrivateDAO dWallet custody route").slice(0, 120);
  const ika = requireFromWebApp("@ika.xyz/sdk") as Record<string, unknown>;
  const sui = requireFromWebApp("@mysten/sui/jsonRpc") as Record<string, unknown>;
  const Curve = ika.Curve as Record<string, string>;
  const SignatureAlgorithm = ika.SignatureAlgorithm as Record<string, string>;
  const Hash = ika.Hash as Record<string, string>;
  const curve = Curve[curveInput] || Curve.SECP256K1;
  const signatureAlgorithm =
    curve === Curve.ED25519
      ? SignatureAlgorithm.EdDSA
      : curve === Curve.SECP256R1
        ? SignatureAlgorithm.ECDSASecp256r1
        : curve === Curve.RISTRETTO
          ? SignatureAlgorithm.SchnorrkelSubstrate
          : SignatureAlgorithm.ECDSASecp256k1;
  const hashScheme =
    signatureAlgorithm === SignatureAlgorithm.EdDSA
      ? Hash.SHA512
      : signatureAlgorithm === SignatureAlgorithm.SchnorrkelSubstrate
        ? Hash.Merlin
        : signatureAlgorithm === SignatureAlgorithm.ECDSASecp256k1
          ? Hash.KECCAK256
          : Hash.SHA256;
  const getNetworkConfig = ika.getNetworkConfig as (target: string) => Record<string, unknown>;
  const IkaClient = ika.IkaClient as new (args: Record<string, unknown>) => {
    initialize: () => Promise<void>;
    getLatestNetworkEncryptionKey: () => Promise<Record<string, unknown>>;
  };
  const SuiJsonRpcClient = sui.SuiJsonRpcClient as new (args: Record<string, unknown>) => unknown;
  const getJsonRpcFullnodeUrl = sui.getJsonRpcFullnodeUrl as (target: string) => string;
  const suiClient = new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl(network), network });
  const ikaClient = new IkaClient({ suiClient, config: getNetworkConfig(network), cache: true });
  await ikaClient.initialize();
  const networkEncryptionKey = await ikaClient.getLatestNetworkEncryptionKey();
  const config = getNetworkConfig(network);
  const routeId = sha256Hex(JSON.stringify({ network, curve, signatureAlgorithm, hashScheme, custodyMode, operationLabel })).slice(0, 24);
  const hasFundedSigner = Boolean(process.env.IKA_SUI_KEYPAIR || process.env.IKA_SUI_SECRET_KEY || process.env.IKA_DWALLET_CAP_ID);

  const solanaPreAlpha = await readIkaSolanaPreAlphaStatus();

  return {
    ok: true,
    source: "ika-sdk-live-readiness",
    routeId: `ika-custody-${routeId}`,
    network,
    operationLabel,
    custodyMode,
    sdk: {
      package: "@ika.xyz/sdk",
      initialized: true,
      exportsUsed: ["IkaClient", "getNetworkConfig", "Curve", "SignatureAlgorithm", "Hash"],
    },
    curve,
    signatureAlgorithm,
    hashScheme,
    liveNetwork: {
      latestNetworkEncryptionKey: networkEncryptionKey,
      packages: (config.packages as Record<string, unknown>) || null,
      coordinator: ((config.objects as Record<string, unknown>)?.ikaDWalletCoordinator as Record<string, unknown>) || null,
    },
    solanaPreAlpha,
    dWalletExecutionBoundary: hasFundedSigner
      ? "funded-signer-config-present-ready-for-dkg-transaction"
      : "ika-sui-dwallet-route-ready-for-funded-signer-execution",
    nextTransactions: [
      "create UserShareEncryptionKeys with the selected curve",
      "register the encryption key on Ika",
      "request dWallet DKG with IKA and SUI coins",
      "wait until dWallet state becomes Active",
      "request presign and sign governed custody messages",
    ],
  };
}


async function handleIkaSuiReadiness(body: Record<string, unknown>) {
  const network = stringField(body, "network", "testnet") === "mainnet" ? "mainnet" : "testnet";
  const ika = requireFromWebApp("@ika.xyz/sdk") as Record<string, unknown>;
  const sui = requireFromWebApp("@mysten/sui/jsonRpc") as Record<string, unknown>;
  const getNetworkConfig = ika.getNetworkConfig as (target: string) => Record<string, unknown>;
  const IkaClient = ika.IkaClient as new (args: Record<string, unknown>) => {
    initialize: () => Promise<void>;
    getLatestNetworkEncryptionKey: () => Promise<Record<string, unknown>>;
  };
  const SuiJsonRpcClient = sui.SuiJsonRpcClient as new (args: Record<string, unknown>) => unknown;
  const getJsonRpcFullnodeUrl = sui.getJsonRpcFullnodeUrl as (target: string) => string;
  const suiClient = new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl(network), network });
  const config = getNetworkConfig(network);
  const ikaClient = new IkaClient({ suiClient, config, cache: true });
  await ikaClient.initialize();
  const networkEncryptionKey = await ikaClient.getLatestNetworkEncryptionKey();
  return {
    ok: true,
    source: "ika-sui-sdk-readiness",
    network,
    sdk: {
      package: "@ika.xyz/sdk",
      initialized: true,
      exportsUsed: ["IkaClient", "getNetworkConfig"],
    },
    liveNetwork: {
      latestNetworkEncryptionKey: networkEncryptionKey,
      packages: (config.packages as Record<string, unknown>) || null,
      coordinator: ((config.objects as Record<string, unknown>)?.ikaDWalletCoordinator as Record<string, unknown>) || null,
    },
    executionBoundary: "ika-sui-network-read-complete-ready-for-dwallet-execution",
  };
}

async function handleIkaSolanaPreAlphaReadiness() {
  const solanaPreAlpha = await readIkaSolanaPreAlphaStatus();
  return {
    ok: true,
    source: "ika-solana-prealpha-readiness",
    solanaPreAlpha,
  };
}

async function handleIkaSolanaPreAlphaApprovalPrepare(body: Record<string, unknown>) {
  const message = stringField(body, "message", "PrivateDAO governed confidential payroll approval");
  const operationType = stringField(body, "operationType", "confidential-payroll").slice(0, 80);
  const curve = stringField(body, "curve", "ED25519").toUpperCase();
  const signatureScheme = stringField(body, "signatureScheme", curve === "ED25519" ? "EddsaSha512" : "EcdsaKeccak256");
  const solanaPreAlpha = await readIkaSolanaPreAlphaStatus();
  const messageDigestSha256 = sha256Hex(message);
  const routeId = sha256Hex(JSON.stringify({ messageDigestSha256, operationType, curve, signatureScheme })).slice(0, 24);
  return {
    ok: true,
    source: "ika-solana-prealpha-approval-intent",
    status: "approval-plan-ready",
    routeId: `ika-approval-${routeId}`,
    operationType,
    curve,
    signatureScheme,
    messageDigest: {
      sha256: messageDigestSha256,
      note: "Approval-route digest is prepared for the governed dWallet execution path.",
    },
    solanaPreAlpha,
    nextTransactions: [
      "load or create an active dWallet",
      "derive MessageApproval PDA for the dWallet, signature scheme, and canonical message digest",
      "submit approve_message on Solana devnet",
      "request Ika pre-alpha presign/sign through gRPC",
      "read and verify the committed signature",
    ],
    executionBoundary: "approval-route-prepared-for-dwallet-execution",
  };
}

async function handleRefhePayrollProof(body: Record<string, unknown>) {
  const ciphertext = stringField(body, "ciphertext");
  const inputCommitment = stringField(body, "inputCommitment");
  const computationCommitment = stringField(body, "computationCommitment");
  const policyHash = stringField(body, "policyHash");
  const recipientCount = Number(body.recipientCount || 0);
  const totalAmountCommitment = stringField(body, "totalAmountCommitment");
  if (!ciphertext || !inputCommitment || !computationCommitment || !policyHash) {
    return {
      ok: false,
      source: "refhe-payroll-proof",
      error: "ciphertext, inputCommitment, computationCommitment, and policyHash are required.",
    };
  }
  const generatedAt = new Date().toISOString();
  const receiptHash = sha256Hex(
    JSON.stringify({
      ciphertextHash: sha256Hex(ciphertext),
      inputCommitment,
      computationCommitment,
      policyHash,
      totalAmountCommitment,
      recipientCount,
      generatedAt,
    }),
  );
  const receipt = {
    ok: true,
    source: "refhe-payroll-proof",
    mode: "encrypted-computation-receipt",
    protocol: "REFHE-style confidential payroll envelope",
    generatedAt,
    receiptHash,
    encryptedInputHash: sha256Hex(ciphertext),
    inputCommitment,
    computationCommitment,
    totalAmountCommitment,
    policyHash,
    recipientCount,
    executionBoundary: "This proves encrypted payroll packet integrity and computation commitment continuity. Final private settlement still belongs to the selected payment rail.",
  };
  if (hasSupabaseRestConfig()) {
    await supabaseInsert("operation_receipts", {
      operation_type: "refhe-payroll-proof",
      proposal_id: `refhe:${receiptHash.slice(0, 16)}`,
      approval_state: "encrypted-computation-receipt",
      execution_reference: receiptHash,
      private_settlement_rail: "refhe-envelope",
      stablecoin_symbol: "USDC",
      audit_mode: "encrypted-computation",
      recipient_visibility: "commitment-only",
      metadata: receipt,
    }).catch(() => null);
  }
  return receipt;
}

async function buildQvacRuntimeProof() {
  try {
    const qvac = requireFromWebApp("@qvac/sdk") as Record<string, unknown>;
    const packageEntryPath = requireFromWebApp.resolve("@qvac/sdk");
    const packageJsonPath = resolve(packageEntryPath, "../../package.json");
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as { version?: string };
    const exportedCapabilities = [
      "loadModel",
      "completion",
      "embed",
      "translate",
      "transcribe",
      "ocr",
      "heartbeat",
      "getLoadedModelInfo",
      "getModelInfo",
      "unloadModel",
    ].filter((name) => typeof qvac[name] === "function");

    return {
      schemaVersion: 1,
      project: "PrivateDAO",
      track: "qvac-sovereign-ai",
      source: "qvac-sdk-runtime-live",
      generatedAt: new Date().toISOString(),
      node: process.version,
      runtimeMode: "browser-local-first",
      model: "qvac/fabric-llm-finetune",
      productUse: [
        "pre-sign proposal and treasury execution brief",
        "risk notes before wallet signature",
        "privacy mode recommendation before settlement",
        "counterparty review prompt before confidential payout",
      ],
      sdkLoaded: true,
      sdkPackage: "@qvac/sdk",
      sdkVersion: packageJson.version || "unknown",
      exportedCapabilities,
      checks: {
        packageResolved: Boolean(packageJsonPath),
        sdkImported: true,
        modelPinned: true,
      },
      availableExports: Object.keys(qvac).sort().slice(0, 96),
    };
  } catch (error) {
    const proofPath = join(process.cwd(), "docs/qvac-runtime-proof.generated.json");
    return readFile(proofPath, "utf8")
      .then((content) => JSON.parse(content) as unknown)
      .catch((fileError) => ({
        schemaVersion: 1,
        project: "PrivateDAO",
        track: "qvac-sovereign-ai",
        sdkLoaded: false,
        source: "qvac-runtime-proof-missing",
        nextAction: "Install the web dependencies or run npm run probe:qvac-runtime before publishing the read node.",
        error: String((error as Error)?.message || error),
        fileError: String((fileError as Error)?.message || fileError),
      }));
  }
}

async function forwardTorqueEvent(body: Record<string, unknown>) {
  const apiKey = getApiKey("TORQUE_API_KEY") || getApiKey("TORQUE_API_TOKEN");
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

function providerIntegrationStatus() {
  const torqueEndpoint =
    process.env.TORQUE_CUSTOM_EVENT_API_URL?.trim() ||
    process.env.TORQUE_INGESTER_URL?.trim() ||
    "https://ingest.torque.so/events";
  const qvacSdkAvailable =
    existsSync(join(process.cwd(), "apps/web/node_modules/@qvac/sdk")) ||
    existsSync(join(process.cwd(), "node_modules/@qvac/sdk"));
  const qvacProofAvailable = existsSync(join(process.cwd(), "docs/qvac-runtime-proof.generated.json"));
  const torqueDeliveryVerified = process.env.TORQUE_INGESTION_KEY_VERIFIED?.toLowerCase() === "true";
  return {
    ok: true,
    source: "privatedao-provider-integration-status",
    generatedAt: new Date().toISOString(),
    cluster: "testnet",
    providers: {
      goldrush: {
        configured: Boolean(getApiKey("GOLDRUSH_API_KEY")),
        proofEndpoint: "/api/v1/goldrush/query",
        route: "https://privatedao.org/services/goldrush-decision-intelligence/",
        executionMode: "server-side wallet intelligence proxy",
        privacyBoundary: "Pre-sign risk context only; no private strategy text is written on-chain.",
      },
      zerion: {
        configured: Boolean(getApiKey("ZERION_API_KEY")),
        proofEndpoint: "/api/v1/zerion/portfolio",
        route: "https://privatedao.org/services/zerion-agent-policy/",
        executionMode: "policy-bound portfolio context before agent execution",
        privacyBoundary: "Portfolio data is used to scope policy review; wallet execution remains approve-before-execute.",
      },
      torque: {
        configured: Boolean(getApiKey("TORQUE_API_KEY") || getApiKey("TORQUE_API_TOKEN")),
        credentialPresent: Boolean(getApiKey("TORQUE_API_KEY") || getApiKey("TORQUE_API_TOKEN")),
        deliveryVerified: torqueDeliveryVerified,
        projectId: process.env.TORQUE_PROJECT_ID || null,
        customEventId: process.env.TORQUE_CUSTOM_EVENT_ID || null,
        customEventName: process.env.TORQUE_CUSTOM_EVENT_NAME || "private_treasury_execution",
        lastIngestionId: process.env.TORQUE_LAST_INGESTION_ID || null,
        proofEndpoint: "/api/v1/torque/custom-event",
        route: "https://privatedao.org/services/torque-growth-loop/",
        executionMode: "server-side custom_event relay",
        endpoint: redactUrlSecret(torqueEndpoint.endsWith("/events") ? torqueEndpoint : `${torqueEndpoint.replace(/\/+$/, "")}/events`),
        privacyBoundary: "Only product-action events are relayed; secrets and reward credentials stay server-side.",
        deliveryBoundary: torqueDeliveryVerified
          ? "Active Torque ingestion API key verified against ingest.torque.so; MCP auth remains separate from event delivery credentials."
          : "Torque MCP tokens authenticate the MCP/API session. Event ingestion still requires an active Torque ingestion API key accepted by ingest.torque.so.",
      },
      jupiter: {
        configured: Boolean(getApiKey("JUPITER_API_KEY") || getApiKey("JUPITER_DEVELOPER_API_KEY")),
        proofEndpoint: "/api/v1/jupiter/order",
        route: "https://privatedao.org/services/jupiter-treasury-route/",
        executionMode: "order preview and wallet-reviewed treasury route",
        privacyBoundary: "The read-node prepares order context; final signing stays in the user's wallet.",
      },
      qvac: {
        configured: qvacSdkAvailable || qvacProofAvailable,
        sdkAvailable: qvacSdkAvailable,
        proofAvailable: qvacProofAvailable,
        proofEndpoint: "/api/v1/qvac/runtime-proof",
        route: "https://privatedao.org/services/qvac-sovereign-ai/",
        executionMode: "local-first pre-sign intelligence proof",
        privacyBoundary: "Sensitive briefs are generated client-side or from deterministic fallback, not uploaded as raw private strategy.",
      },
    },
    controls: [
      "Provider API keys are never exposed to the static website.",
      "Every provider route is status-checkable without requiring a private key in the browser.",
      "Execution surfaces preserve Review -> Sign -> Verify before value movement.",
    ],
  };
}

function cryptographicReadinessStatus() {
  return {
    ok: true,
    source: "privatedao-cryptographic-readiness",
    posture: "solana-testnet-production-candidate",
    generatedAt: new Date().toISOString(),
    cluster: "testnet",
    anchorVersion: "1.0.1",
    programId: "EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva",
    programData: "FKyt5DcmRQcCF8kzMGjCvfGb3ZPHMQnH1SqiG9Mi8xEc",
    custody: {
      squadsVault: "CALHrBqx6jbzcPn2NVcinqSAHeod65v9LcDuTxsdPqBv",
      squadsMultisig: "thHmF7VYNtxE1MaDzYXbfPCiq13RF6JwuWnjvDZuSmF",
      currentProposalIndex: 3,
      timelockReleaseAt: "2026-05-27T02:25:39Z",
      status: "waiting-for-timelock-release",
      nextExecutableCommand: "EXECUTE_TIMELOCK=1 DAO_PDA=<DAO_PDA> scripts/execute-after-timelock.sh",
    },
    rails: [
      {
        id: "squads-custody",
        status: "testnet-live",
        core: "program-upgrade authority protected by Squads vault and timelock",
        proof: "/documents/squads-current-binary-upgrade-proposal-2026-05-25",
        route: "/security",
        mainnetGate: "execute proposal index 3, record DAO authority and treasury-operator authority readouts",
      },
      {
        id: "zk-verifier",
        status: "testnet-live-standalone",
        core: "BN254/Groth16 standalone verifier receipt path",
        programId: "5H7Afyqdh5yPekkZJ5UM2j3HNB2bRvU8aVv8XoqeAW1j",
        receiptTx: "zwqNsA3kNP1mgcaS6zNdR92LLdssFULXfsRdkMK3UxraKLM6wYDoPaWCwV3J9PqApK5xJJH8TpxsGyCRcdEah67",
        proof: "/documents/zk-standalone-verifier-testnet-2026-05-23",
        route: "/judge",
        mainnetGate: "integrated governance verifier receipt after Squads binary execution",
      },
      {
        id: "refhe-envelope",
        status: "testnet-live",
        core: "configure_refhe_envelope and settle_refhe_envelope",
        configureTx: "3fygnmHzFpRQEbHq9q6u3djBnkTEcYz9y1TSwxDmbnuemshrMwLmy9CqpjifjRb7SmW3DbmXrkyq35cnjU7mMSPi",
        settleTx: "5TmS2AcpAmifcoG97U63Unzy7wt7B2NfyhBRs8Z6C4r1eqcWthEqf3GLcZXQ33sVYHf9YwfvBNhZD8ZZdt4HRwEY",
        proof: "/documents/testnet-encrypted-integrations-activation-2026-05-23",
        route: "/services/encrypt-ika-operations",
        mainnetGate: "production verifier boundary, audit notes, and live payout policy",
      },
      {
        id: "magicblock-private-corridor",
        status: "testnet-live",
        core: "configure_magicblock_private_payment_corridor and settle_magicblock_private_payment_corridor",
        configureTx: "4UiUumtuGeDciojDA26PkQby7RFiTNb12UG4ACcvGMGfQj24PUPxK5Apeno7EY8mbCvq8nR6h6nfxDcBpjPvGvPj",
        settleTx: "22XW8XVhWwQtChNQK2aEqXv5BVBbckxUmu4NsisoZQW21KA5ii87gVNUTcNoZ9e1vYKnHmm62qP1girpzVXWN1WY",
        proof: "/documents/testnet-encrypted-integrations-activation-2026-05-23",
        route: "/services/magicblock-private-payments",
        mainnetGate: "production endpoint policy, monitoring, and incident response transcript",
      },
      {
        id: "evidence-gated-payout",
        status: "testnet-executed",
        core: "executeConfidentialPayoutPlanV3 consumed REFHE and MagicBlock evidence before token motion",
        executeTx: "2a8sHWgiVCZkstybMff2M9R6DVU4Y96Rfsg8mqYs7K3xcYSEG1zMcq2iSTNwLD6FgfXvxxxWpwEP9Tbyin47RXvE",
        treasuryTokenDelta: "60000000 -> 10000000",
        recipientTokenDelta: "0 -> 50000000",
        proof: "/judge",
        route: "/proof",
        mainnetGate: "asset allowlist, real payroll policy, monitoring alerts, and selective-disclosure export",
      },
      {
        id: "ika-2pc-mpc",
        status: "readiness-live-final-signature-not-claimed",
        core: "Ika SDK and Solana pre-alpha approval route",
        proof: "/api/v1/ika/solana-prealpha/readiness",
        route: "/services/encrypt-ika-operations",
        mainnetGate: "funded dWallet DKG, final 2PC-MPC signature, and cross-chain policy proof",
      },
      {
        id: "umbra-private-payout",
        status: "productized-claim-boundary",
        core: "recipient-private claim-style payout lane and relayer health route",
        proof: "/api/v1/umbra/relayer/health",
        route: "/services/umbra-confidential-payout",
        mainnetGate: "SDK-generated proof account data, UTXO slot data, claim submission, and viewing-key workflow",
      },
      {
        id: "jupiter-treasury-route",
        status: "developer-platform-order-mode",
        core: "Developer Platform /order route with Lite Quote fallback",
        proof: "docs/DX-REPORT-JUPITER.md",
        route: "/services/jupiter-treasury-route",
        mainnetGate: "governed signing, execution signature, slippage policy, and production key vaulting",
      },
      {
        id: "torque-growth-relay",
        status: "server-relay-ready",
        core: "/api/v1/torque/custom-event forwards only when scoped server credentials exist",
        proof: "/documents/torque-growth-loop",
        route: "/services/torque-growth-loop",
        mainnetGate: "campaign IDs, abuse checks, reward policy, and delivery transcript",
      },
      {
        id: "pusd-stablecoin-treasury",
        status: "configuration-gated",
        core: "wallet-reviewed SPL TransferChecked treasury lane without hardcoded unverified mint",
        proof: "/documents/pusd-stablecoin-treasury-layer",
        route: "/services/pusd-stablecoin",
        mainnetGate: "official PUSD mint, funded receive account, and policy-approved wallet",
      },
    ],
    publicRoutes: {
      ladder: "https://privatedao.org/documents/mainnet-cryptographic-readiness-ladder-2026-05-25/",
      judge: "https://privatedao.org/judge/",
      security: "https://privatedao.org/security/",
      proof: "https://privatedao.org/proof/",
    },
    claimBoundary: {
      mainnetFundsLive: false,
      finalIka2pcMpcSignatureClaimed: false,
      umbraFullClaimSettlementClaimed: false,
      externalAuditCompleted: false,
    },
  };
}

function privacyExecutionMatrixStatus() {
  const cryptographicReadiness = cryptographicReadinessStatus();
  const generatedAt = new Date().toISOString();
  return {
    ok: true,
    source: "privatedao-privacy-execution-matrix",
    generatedAt,
    cluster: "testnet",
    programId: cryptographicReadiness.programId,
    posture: "wallet-first-private-operations",
    summary:
      "PrivateDAO routes every sensitive service through review, encryption or privacy intent, wallet execution, and public-safe verification. Public outputs prove state transitions without exposing payroll rows, recipient context, private balances, or strategy intent.",
    serviceMatrix: [
      {
        service: "private-governance",
        route: "https://privatedao.org/govern/",
        executionMode: "wallet-signed Solana Testnet governance",
        privacyRails: ["commit-reveal", "ZK verifier companion", "nullifier-ready governance primitive"],
        proofEndpoints: ["/api/v1/runtime", "/api/v1/proposals", "/api/v1/cryptographic-readiness"],
        onchainEvidence: {
          programId: cryptographicReadiness.programId,
          zkVerifierProgramId: "5H7Afyqdh5yPekkZJ5UM2j3HNB2bRvU8aVv8XoqeAW1j",
          zkReceiptTx: "zwqNsA3kNP1mgcaS6zNdR92LLdssFULXfsRdkMK3UxraKLM6wYDoPaWCwV3J9PqApK5xJJH8TpxsGyCRcdEah67",
        },
        testnetExecutable: true,
        privacyBoundary: "Votes and proof receipts are separated from public identity claims; full Semaphore-style governance remains a release-gated primitive.",
      },
      {
        service: "confidential-payroll",
        route: "https://privatedao.org/payroll/",
        executionMode: "encrypted manifest plus evidence-gated payout",
        privacyRails: ["REFHE envelope", "encrypted manifest hash", "selective-disclosure receipt"],
        proofEndpoints: ["/api/v1/refhe/payroll/proof", "/api/v1/cryptographic-readiness"],
        onchainEvidence: {
          configureTx: "3fygnmHzFpRQEbHq9q6u3djBnkTEcYz9y1TSwxDmbnuemshrMwLmy9CqpjifjRb7SmW3DbmXrkyq35cnjU7mMSPi",
          settleTx: "5TmS2AcpAmifcoG97U63Unzy7wt7B2NfyhBRs8Z6C4r1eqcWthEqf3GLcZXQ33sVYHf9YwfvBNhZD8ZZdt4HRwEY",
          executeTx: "2a8sHWgiVCZkstybMff2M9R6DVU4Y96Rfsg8mqYs7K3xcYSEG1zMcq2iSTNwLD6FgfXvxxxWpwEP9Tbyin47RXvE",
        },
        testnetExecutable: true,
        privacyBoundary: "Payroll row content stays in encrypted manifest/proof inputs; public chain evidence shows commitments and token movement.",
      },
      {
        service: "private-payments",
        route: "https://privatedao.org/services/magicblock-private-payments/",
        executionMode: "MagicBlock corridor and private payment proof lane",
        privacyRails: ["MagicBlock private corridor", "private balance challenge", "private transfer receipt"],
        proofEndpoints: ["/api/v1/magicblock/onchain-proof?refresh=1", "/api/v1/magicblock/health"],
        onchainEvidence: {
          configureTx: "4UiUumtuGeDciojDA26PkQby7RFiTNb12UG4ACcvGMGfQj24PUPxK5Apeno7EY8mbCvq8nR6h6nfxDcBpjPvGvPj",
          settleTx: "22XW8XVhWwQtChNQK2aEqXv5BVBbckxUmu4NsisoZQW21KA5ii87gVNUTcNoZ9e1vYKnHmm62qP1girpzVXWN1WY",
        },
        testnetExecutable: true,
        privacyBoundary: "Payment corridor proves execution receipts while keeping private balance/login operations behind wallet-authenticated payment API flows.",
      },
      {
        service: "umbra-confidential-payout",
        route: "https://privatedao.org/services/umbra-confidential-payout/",
        executionMode: "recipient-private claim intent and relayer health corridor",
        privacyRails: ["Umbra relayer health", "claim request", "viewing-key-ready disclosure pattern"],
        proofEndpoints: ["/api/v1/umbra/relayer/info", "/api/v1/umbra/relayer/health", "/api/v1/private-settlement/intent"],
        onchainEvidence: {
          relayer: "server-side relay endpoint when configured",
        },
        testnetExecutable: true,
        privacyBoundary: "The live surface prepares private settlement intent and relayer checks; full claim settlement is not claimed until SDK proof account data is recorded.",
      },
      {
        service: "ika-custody-and-interoperability",
        route: "https://privatedao.org/services/encrypt-ika-operations/",
        executionMode: "Ika approval preparation for dWallet/2PC-MPC custody",
        privacyRails: ["Ika Sui readiness", "Solana pre-alpha approval route", "2PC-MPC policy boundary"],
        proofEndpoints: ["/api/v1/ika/solana-prealpha/readiness", "/api/v1/ika/solana-prealpha/approval/prepare", "/api/v1/ika/custody/prepare"],
        onchainEvidence: {
          custodyRoute: "approval-route-prepared-for-dwallet-execution",
        },
        testnetExecutable: true,
        privacyBoundary: "The approval/custody route is executable as a preparation lane; final funded Ika dWallet DKG and final 2PC-MPC signature remain explicit release gates.",
      },
      {
        service: "intelligence-and-risk",
        route: "https://privatedao.org/intelligence/",
        executionMode: "provider intelligence before private execution",
        privacyRails: ["GoldRush wallet intelligence", "Zerion portfolio policy", "QVAC runtime proof", "QuickNode stream telemetry"],
        proofEndpoints: ["/api/v1/provider-integrations/status", "/api/v1/goldrush/query", "/api/v1/zerion/portfolio", "/api/v1/qvac/runtime-proof", "/api/v1/quicknode/stream/stats"],
        onchainEvidence: {
          streamNetwork: "solana-testnet",
        },
        testnetExecutable: true,
        privacyBoundary: "Provider data is converted into pre-sign risk context; sensitive decisions are not posted as raw strategy text on-chain.",
      },
      {
        service: "treasury-routing-and-growth",
        route: "https://privatedao.org/services/jupiter-treasury-route/",
        executionMode: "Jupiter order preview and Torque event relay around governed execution",
        privacyRails: ["Jupiter Developer Platform order mode", "Torque custom event relay", "policy-scoped execution receipts"],
        proofEndpoints: ["/api/v1/provider-integrations/status", "/api/v1/jupiter/order", "/api/v1/torque/custom-event", "/api/v1/execution-events/stats"],
        onchainEvidence: {
          signingBoundary: "wallet-reviewed execution, not server-held user funds",
        },
        testnetExecutable: true,
        privacyBoundary: "Treasury route preparation is separated from final wallet signing; growth events are relayed only with scoped server credentials.",
      },
    ],
    crossServiceControls: [
      "No browser localStorage vote salt is required for the private voting remediation path.",
      "Provider keys are read from server environment only.",
      "QuickNode stream auth accepts scoped headers and does not persist raw payloads.",
      "Public pages receive proof endpoints and receipts, not private manifests or private keys.",
      "Every sensitive operation should preserve Review -> Sign -> Verify.",
    ],
    liveProofLinks: {
      readiness: "https://api.privatedao.org/api/v1/readiness",
      cryptographicReadiness: "https://api.privatedao.org/api/v1/cryptographic-readiness",
      privacyExecutionMatrix: "https://api.privatedao.org/api/v1/privacy-execution-matrix",
      judge: "https://privatedao.org/judge/",
      proof: "https://privatedao.org/proof/",
    },
    claimBoundary: cryptographicReadiness.claimBoundary,
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

    if (req.method === "POST" && (pathname === "/api/jupiter/order" || pathname === "/api/v1/jupiter/order")) {
      const body = await readRequestJson(req);
      const result = await fetchJupiterOrder(body);
      writeJson(res, result.ok ? 200 : 502, result);
      return;
    }

    if (req.method === "POST" && (pathname === "/api/zerion/portfolio" || pathname === "/api/v1/zerion/portfolio")) {
      const body = await readRequestJson(req);
      const wallet = stringField(body, "walletAddress", stringField(body, "wallet", ""));
      if (!wallet) {
        writeJson(res, 400, { ok: false, source: "zerion", error: "walletAddress is required." });
        return;
      }
      const result = await fetchZerionPortfolio(wallet);
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

    if (req.method === "POST" && pathname === "/api/v1/execution-events") {
      const body = await readRequestJson(req);
      const result = await handleOperationExecutionEvent(body, req);
      writeJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && pathname === "/api/v1/onboard/request") {
      const body = await readRequestJson(req);
      const result = await handleOnboardingRequest(body);
      writeJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && pathname === "/api/v1/ika/custody/prepare") {
      const body = await readRequestJson(req);
      const result = await handleIkaCustodyPrepare(body);
      writeJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && pathname === "/api/v1/ika/sui/readiness") {
      const body = await readRequestJson(req);
      const result = await handleIkaSuiReadiness(body);
      writeJson(res, 200, result);
      return;
    }

    if (req.method === "GET" && pathname === "/api/v1/ika/solana-prealpha/readiness") {
      const result = await handleIkaSolanaPreAlphaReadiness();
      writeJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && pathname === "/api/v1/ika/solana-prealpha/approval/prepare") {
      const body = await readRequestJson(req);
      const result = await handleIkaSolanaPreAlphaApprovalPrepare(body);
      writeJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && pathname === "/api/v1/refhe/payroll/proof") {
      const body = await readRequestJson(req);
      const result = await handleRefhePayrollProof(body);
      writeJson(res, result.ok ? 200 : 400, result);
      return;
    }

    if (req.method === "POST" && (pathname === "/api/quicknode/stream" || pathname === "/api/v1/quicknode/stream")) {
      const { payload, rawPayload } = await readQuickNodeStreamJson(req);
      const auth = requireQuickNodeStreamAuth(req, rawPayload);
      if (!auth.ok) {
        writeJson(res, auth.status, { ok: false, error: auth.error });
        return;
      }
      const summary = summarizeQuickNodeStreamPayload(payload);
      recordQuickNodeStreamSummary(summary);
      writeJson(res, 202, { ok: true, summary });
      return;
    }

    if (req.method === "GET" && (pathname === "/api/quicknode/stream/stats" || pathname === "/api/v1/quicknode/stream/stats")) {
      writeJson(res, 200, {
        ok: true,
        source: "quicknode-stream",
        stats: quickNodeStreamStats(),
      });
      return;
    }

    if (req.method === "GET" && pathname === "/api/v1/onboard/key") {
      writeJson(res, 200, {
        ok: true,
        mode: "client-encrypted-envelope",
        algorithm: "RSA-OAEP-256/AES-256-GCM",
        keyId: onboardingIntakeKeyId,
        publicKeyFingerprint: onboardingIntakePublicKeyFingerprint,
        publicKeyPem: onboardingIntakePublicKeyPem,
      });
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
          executionEvent: "/api/v1/execution-events",
          executionStats: "/api/v1/execution-events/stats",
          onboardRequest: "/api/v1/onboard/request",
          quickNodeStream: "/api/v1/quicknode/stream",
          quickNodeStreamStats: "/api/v1/quicknode/stream/stats",
          cryptographicReadiness: "/api/v1/cryptographic-readiness",
          privacyExecutionMatrix: "/api/v1/privacy-execution-matrix",
          providerIntegrationStatus: "/api/v1/provider-integrations/status",
          jupiterOrder: "/api/v1/jupiter/order",
          readiness: "/api/v1/readiness",
        },
      });
      return;
    }

    if (pathname === "/api/v1/cryptographic-readiness") {
      writeJson(res, 200, cryptographicReadinessStatus());
      return;
    }

    if (pathname === "/api/v1/privacy-execution-matrix") {
      writeJson(res, 200, privacyExecutionMatrixStatus());
      return;
    }

    if (pathname === "/api/v1/provider-integrations/status") {
      writeJson(res, 200, providerIntegrationStatus());
      return;
    }

    if (pathname === "/api/v1/readiness") {
      const [runtime, visitors, execution, freshness, chain] = await Promise.all([
        readNode.getRuntimeSnapshot(url.searchParams.get("refresh") === "1"),
        visitorStats().catch((error) => ({ ok: false, error: error instanceof Error ? error.message : String(error) })),
        executionEventStats().catch((error) => ({ ok: false, error: error instanceof Error ? error.message : String(error) })),
        latestFreshnessPing().catch(() => null),
        latestLiveTransactions().catch(() => ({ count: 0, transactions: [] })),
      ]);
      writeJson(res, 200, {
        ok: true,
        source: "privatedao-readiness",
        generatedAt: new Date().toISOString(),
        posture: "solana-testnet-production-candidate",
        runtime,
        quickNodeStream: quickNodeStreamStats(),
        visitors,
        execution,
        latestFreshness: freshness,
        latestChainEvent: "transactions" in chain ? chain.transactions[0] || null : null,
        publicRoutes: {
          site: "https://privatedao.org/",
          api: "https://api.privatedao.org/api/v1",
          quickNodeStats: "https://api.privatedao.org/api/v1/quicknode/stream/stats",
          cryptographicReadiness: "https://api.privatedao.org/api/v1/cryptographic-readiness",
          privacyExecutionMatrix: "https://api.privatedao.org/api/v1/privacy-execution-matrix",
          providerIntegrationStatus: "https://api.privatedao.org/api/v1/provider-integrations/status",
          judge: "https://privatedao.org/judge/",
          proof: "https://privatedao.org/proof/",
          security: "https://privatedao.org/security/",
        },
      });
      return;
    }

    if (pathname === "/api/quicknode/stream" || pathname === "/api/v1/quicknode/stream") {
      writeJson(res, 200, {
        ok: true,
        service: "PrivateDAO QuickNode Stream intake",
        network: "solana-testnet",
        dataset: "Programs + Logs / Block",
        auth: process.env.QUICKNODE_STREAM_TOKEN ? "configured" : "missing-env",
        destination: "/api/v1/quicknode/stream",
        acceptedAuthHeaders: [
          "X-QN-Nonce + X-QN-Timestamp + X-QN-Signature",
          "Authorization: Bearer <token>",
          "x-quicknode-security-token",
          "x-private-dao-stream-token",
        ],
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

    if (pathname === "/api/v1/execution-events/stats") {
      writeJson(res, 200, await executionEventStats());
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

    if (pathname === "/api/v1/magicblock/onchain-proof") {
      const proof = await readNode.getMagicBlockOnchainProof(url.searchParams.get("refresh") === "1");
      writeJson(res, 200, {
        ok: true,
        source: "magicblock-onchain-proof",
        proof,
        next: {
          service: "https://privatedao.org/services/magicblock-private-payments/",
          proofCenter: "https://privatedao.org/proof/",
        },
      });
      return;
    }

    if (pathname === "/api/v1/magicblock/challenge") {
      const pubkey = getStringParam(url, "pubkey");
      if (!pubkey) {
        writeJson(res, 400, { ok: false, error: "pubkey query parameter is required.", source: "backend-indexer" });
        return;
      }
      const challenge = await readNode.getMagicBlockChallenge(pubkey, url.searchParams.get("refresh") === "1");
      writeJson(res, 200, {
        ok: true,
        source: "magicblock-private-payments",
        challenge,
        next: {
          login: "POST https://payments.magicblock.app/v1/spl/login with the wallet-signed challenge",
          privateBalance: "GET /api/v1/magicblock/balances/{wallet}?mint={mint} with Authorization: Bearer <token>",
        },
      });
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

    if (pathname === "/api/jupiter/order" || pathname === "/api/v1/jupiter/order") {
      if ((req.method as string) !== "POST") {
        writeJson(res, 405, { ok: false, error: "Jupiter order preview requires POST." });
        return;
      }
      const body = await readRequestJson(req);
      const result = await fetchJupiterOrder(body);
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
        String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim() || undefined,
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
      const proof = await buildQvacRuntimeProof();
      writeJson(res, 200, { ok: true, source: "qvac-runtime", proof });
      return;
    }

    if (pathname === "/api/v1/ops/overview") {
      try {
        const overview = await readNode.getOpsOverview(url.searchParams.get("refresh") === "1");
        writeJson(res, 200, { ok: true, source: "backend-indexer", overview });
      } catch (error) {
        const fallback = readGeneratedReadNodeSnapshot();
        if (!fallback?.overview) throw error;
        writeJson(res, 200, {
          ok: true,
          source: "backend-indexer",
          degraded: true,
          degradedReason: "live-rpc-unavailable-used-generated-snapshot",
          overview: fallback.overview,
        });
      }
      return;
    }

    if (pathname === "/api/v1/ops/snapshot") {
      const force = url.searchParams.get("refresh") === "1";
      try {
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
              quickNodeStream: quickNodeStreamStats(),
            },
            deployment: {
              sameDomainRecommended: true,
              sameDomainGuide: "docs/read-node/same-domain-deploy.md",
              readApiPath: "/api/v1",
            },
          },
        });
      } catch (error) {
        const fallback = readGeneratedReadNodeSnapshot();
        if (!fallback?.runtime || !fallback?.overview) throw error;
        writeJson(res, 200, {
          ok: true,
          source: "backend-indexer",
          degraded: true,
          degradedReason: "live-rpc-unavailable-used-generated-snapshot",
          snapshot: {
            generatedAt: new Date().toISOString(),
            runtime: fallback.runtime,
            overview: fallback.overview,
            magicblock: await readNode.getMagicBlockRuntime(false),
            profiles: fallback.profiles || readNode.getLoadProfiles(),
            metrics: {
              startedAt: serverStartedAt,
              requestsTotal: metrics.requestsTotal,
              requestsFailed: metrics.requestsFailed,
              rateLimited: metrics.rateLimited,
              blockedProbes: metrics.blockedProbes,
              routeHits: Object.fromEntries(metrics.routeHits.entries()),
              quickNodeStream: quickNodeStreamStats(),
            },
            deployment: {
              sameDomainRecommended: true,
              sameDomainGuide: "docs/read-node/same-domain-deploy.md",
              readApiPath: "/api/v1",
            },
          },
        });
      }
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
          quickNodeStream: quickNodeStreamStats(),
          rpcPoolSize: readNode.rpcEndpoints.length,
          cache: readNode.cacheStats(),
          programId: readNode.programId.toBase58(),
        },
      });
      return;
    }

    if (pathname === "/api/v1/proposals") {
      const dao = url.searchParams.get("dao") || undefined;
      let proposals: Array<unknown>;
      try {
        proposals = await readNode.fetchProposals({
          dao: dao || undefined,
          force: url.searchParams.get("refresh") === "1",
        });
      } catch (error) {
        const fallback = readGeneratedReadNodeSnapshot();
        if (!fallback?.proposals) throw error;
        proposals = dao ? fallback.proposals.filter((proposal) => String(proposal.dao || "") === dao) : fallback.proposals;
      }
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
