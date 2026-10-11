// SPDX-License-Identifier: AGPL-3.0-or-later
import * as http from "http";
import { execFileSync } from "child_process";
import { createHash, createHmac, createPrivateKey, createPublicKey, randomBytes, randomUUID, sign as signEd25519, timingSafeEqual, verify as verifyEd25519 } from "crypto";
import { createRequire } from "module";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, writeFileSync } from "fs";
import { readFile } from "fs/promises";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { URL } from "url";
import { gunzipSync } from "zlib";
import {
  Connection,
  ComputeBudgetProgram,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { PrivateDaoReadNode, quickNodeX402Status, resolveMainnetRpcEndpoints } from "./lib/read-node.ts";
import {
  buildSimulatedTxlineMatches,
  buildTxlineSettlementMemoFields,
  buildTxlineSettlementProofPackage,
  buildTxlineSnapshotHash,
  computeTxlineSettlementProofHash,
  resolveTxlineWinner,
  sha256StableJsonHex as txlineSha256StableJsonHex,
  txlineSettlementCircuitId,
  txlineSettlementCircuitVersion,
  txlineSettlementPolicyVersion,
  verifyTxlineSettlementProofPackage,
  type TxlineMatch,
  type TxlineProviderMode,
  type TxlineSettlementProofPackage,
} from "../apps/web/src/lib/txline-settlement";
import { PayrollStore, type PayrollState, type SettlementState } from "./lib/payroll-domain.ts";
import { createKernelGatewayService } from "./kernel-gateway-service.ts";

const host = process.env.PRIVATE_DAO_READ_NODE_HOST || "127.0.0.1";
const port = Number(process.env.PRIVATE_DAO_READ_NODE_PORT || 8787);
const allowedOrigin = process.env.PRIVATE_DAO_READ_ALLOWED_ORIGIN || "*";
const rateWindowMs = Number(process.env.PRIVATE_DAO_READ_RATE_WINDOW_MS || 60_000);
const rateLimit = Number(process.env.PRIVATE_DAO_READ_RATE_LIMIT || 180);
const readNode = new PrivateDaoReadNode();
const kernelGatewayService = createKernelGatewayService();
const memoProgramId = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const blindPolicyVerifierProgramId = new PublicKey(
  process.env.BLIND_POLICY_ONCHAIN_PROGRAM_ID || "GGqZKsdEwH9YVAqWYqjMgCmZ5nNbvGc8RkiMee3S6SdK",
);
const freshnessMinIntervalMs = Number(process.env.PRIVATE_DAO_FRESHNESS_MIN_INTERVAL_MS || 5 * 60_000);
const telegramWebhookUrl = process.env.PRIVATE_DAO_TELEGRAM_WEBHOOK_URL?.trim() || "";
const telegramBotToken = process.env.PRIVATE_DAO_TELEGRAM_BOT_TOKEN?.trim() || "";
const telegramChatId = process.env.PRIVATE_DAO_TELEGRAM_CHAT_ID?.trim() || "";
const telegramVisitorNotifications =
  process.env.PRIVATE_DAO_TELEGRAM_VISITOR_NOTIFICATIONS?.toLowerCase() !== "false";
const telegramVisitorMinIntervalMs = Number(process.env.PRIVATE_DAO_TELEGRAM_VISITOR_MIN_INTERVAL_MS || 60_000);
const telegramVisitorSessionTtlMs = Number(process.env.PRIVATE_DAO_TELEGRAM_VISITOR_SESSION_TTL_MS || 30 * 60_000);
const visitorSupabaseMinIntervalMs = Number(process.env.PRIVATE_DAO_VISITOR_SUPABASE_MIN_INTERVAL_MS || 10 * 60_000);
const runtimeStateDir = process.env.PRIVATE_DAO_RUNTIME_STATE_DIR || "/srv/privatedao/runtime";
const payrollStore = new PayrollStore({
  databasePath: join(runtimeStateDir, "confidential-payroll.sqlite"),
  schemaPath: resolve("migrations/20260826_confidential_payroll_devnet.sql"),
  verificationKeyPath: resolve("zk/setup/private_dao_blind_payroll_vkey.json"),
});
const umbraDevnetProgramId = new PublicKey("DSuKkyqGVGgo4QtPABfxKJKygUDACbUhirnuv63mEpAJ");
const payrollWalletChallengeTtlMs = 5 * 60_000;
const payrollWalletSessionTtlMs = 30 * 60_000;
const quickNodeStreamStatePath = join(runtimeStateDir, "quicknode-stream-telemetry.json");
const matrixAnchorMinIntervalMs = Number(process.env.PRIVATE_DAO_MATRIX_ANCHOR_MIN_INTERVAL_MS || 10 * 60_000);
const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";
const bedrockRegion = process.env.AWS_REGION || "eu-north-1";
const bedrockModelId = process.env.PRIVATE_DAO_BEDROCK_MODEL_ID || "eu.amazon.nova-micro-v1:0";
const bedrockEnabled = process.env.PRIVATE_DAO_BEDROCK_ENABLED === "true";
const bedrockMaxTokens = Math.min(Math.max(Number(process.env.PRIVATE_DAO_BEDROCK_MAX_TOKENS || 256), 32), 512);
const bedrockClient = bedrockEnabled ? new BedrockRuntimeClient({ region: bedrockRegion }) : null;

const rateMap = new Map<string, { count: number; resetAt: number }>();
const serverStartedAt = new Date().toISOString();
const visitorPingsMemory: VisitorPingRow[] = [];
const executionEventsMemory: OperationExecutionEventRow[] = [];
const pilotRequestsMemory: PilotRequestRow[] = [];
const recordAnchorMemory = new Map<string, { signature: string; slot: number; payloadDigest: string; confirmedAt: string }>();
type CommercialOrder = {
  orderId: string;
  customerId: string;
  organizationId: string;
  organizationName: string;
  plan: string;
  asset: string;
  network: string;
  treasuryAddress: string;
  amountAtomic: string;
  amountDisplay: number;
  memo: string;
  status: "pending" | "paid" | "expired" | "rejected";
  createdAt: string;
  expiresAt: string;
  paymentSignature?: string;
  licenseId?: string;
  licenseEnvelope?: Record<string, unknown>;
  renewalOf?: string;
};
const commercialOrdersPath = join(runtimeStateDir, "commercial-orders.json");
let commercialOrders = new Map<string, CommercialOrder>();
try {
  if (existsSync(commercialOrdersPath)) {
    const stored = JSON.parse(readFileSync(commercialOrdersPath, "utf8")) as CommercialOrder[];
    commercialOrders = new Map(stored.map((order) => [order.orderId, order]));
  }
} catch {
  commercialOrders = new Map();
}
const zerionPortfolioCache = new Map<string, { cachedAt: number; response: Record<string, unknown> }>();
let lastFreshnessPingMemory: FreshnessPingRow | null = null;
let lastVisitorTelegramAt = 0;
const visitorTelegramSessions = new Map<string, number>();
const visitorSupabaseWrites = new Map<string, number>();
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
let lastIntegrationMatrixAnchorMemory: OperationExecutionEventRow | null = null;
const requireFromWebApp = createRequire(join(process.cwd(), "apps/web/package.json"));
const requireFromRoot = createRequire(join(process.cwd(), "package.json"));
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

type PilotRequestRow = {
  request_id: string;
  name: string;
  company: string;
  role: string;
  email: string;
  organization_size: string;
  product_interest: string;
  deployment_preference: string;
  message?: string | null;
  status: string;
  source: string;
  created_at: string;
};

type CommercialLicenseType = "TRIAL" | "COMMUNITY" | "PROFESSIONAL" | "ORGANIZATION" | "ENTERPRISE";
type CommercialPaymentAsset = "USDC_SOL" | "PDAO_SOL" | "USDC_ETH" | "SOL" | "ETH" | "BTC" | "WBTC" | "ZEC" | "USDT" | "DAI";

const commercialTrialDays = Math.max(1, Number(process.env.PD_TRIAL_DAYS || 7));
const defaultSolanaTreasury = "4gEqyhhdmLpgye8ubJzzD4zcNsY7JQoiLBBqnBHoYeUt";
const defaultEthereumTreasury = "0x52031e91085A0b3A8A1E89Db935E8E42b715CC86";

const commercialPlans = {
  COMMUNITY: {
    label: "Community Trial",
    priceUsd: 0,
    cadence: "free",
    capacity: ["14-day trial", "1 room", "10 members", "5 proposals", "Limited proof records"],
  },
  PROFESSIONAL: {
    label: "Starter",
    priceUsd: Number(process.env.PD_PRICE_PROFESSIONAL_USD || 1000),
    cadence: "monthly",
    capacity: ["3 active workflows or rooms", "25 members", "100 proof events/month", "Basic verification pages"],
  },
  ORGANIZATION: {
    label: "Business",
    priceUsd: Number(process.env.PD_PRICE_ORGANIZATION_USD || 3500),
    cadence: "monthly",
    capacity: ["10 active workflows or rooms", "250 members", "2,500 proof events/month", "Priority onboarding"],
  },
  ENTERPRISE: {
    label: "Enterprise",
    priceUsd: Number(process.env.PD_PRICE_ENTERPRISE_USD || 25000),
    cadence: "annual",
    capacity: ["Private deployment", "Custom connectors", "Custom proof packages", "SLA and support"],
  },
} satisfies Record<Exclude<CommercialLicenseType, "TRIAL">, { label: string; priceUsd: number | null; cadence: string; capacity: string[] }>;

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
	    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-private-dao-operator-token, x-private-dao-anchor-token",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(publicJsonPayload(payload), null, 2));
}

function publicJsonPayload(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value instanceof Error) return { error: "Request could not be completed." };
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[circular]";
  seen.add(value);
  if (Array.isArray(value)) return value.map((entry) => publicJsonPayload(entry, seen));
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "stack" && key !== "stackTrace" && key !== "cause")
      .map(([key, entry]) => [key, publicJsonPayload(entry, seen)]),
  );
}

function publicReadNodeError(): string {
  return "Request could not be completed.";
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
    let tooLarge = false;
    req.on("data", (chunk: Buffer) => {
      bytes += chunk.byteLength;
      if (bytes > maxBytes) {
        tooLarge = true;
        chunks.length = 0;
        return;
      }
      if (!tooLarge) chunks.push(chunk);
    });
    req.on("end", () => {
      if (tooLarge) {
        reject(new Error(`Request body too large: ${bytes} bytes exceeds ${maxBytes} byte limit`));
        return;
      }
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
  const maxBytes = Number(process.env.QUICKNODE_STREAM_MAX_BYTES || 20_000_000);
  const body = await readRequestBodyWithLimit(req, maxBytes);
  const rawPayload = decodeRequestBody(req, body);
  const parsed = parseJsonObject(rawPayload, "QuickNode stream payload");
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("QuickNode stream payload must be a JSON object");
  }
  return { payload: parsed as QuickNodeStreamPayload, rawPayload };
}

type AmazonBedrockRequest = {
  publicTitle?: string;
  publicDescription?: string;
  riskSignals?: string[];
  publicTreasuryContext?: string[];
  publicHistoricalOutcomes?: string[];
};

function boundedPublicText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function publicLines(value: unknown, maxItems = 8, maxLength = 240) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").slice(0, maxItems).map((item) => boundedPublicText(item, maxLength)).filter(Boolean)
    : [];
}

function buildAmazonBedrockPrompt(input: AmazonBedrockRequest) {
  const title = boundedPublicText(input.publicTitle, 240) || "Untitled proposal";
  const description = boundedPublicText(input.publicDescription, 2_000) || "No public description provided.";
  const sections = [
    "Review this public governance or treasury proposal before a human signs.",
    `Title: ${title}`,
    `Description: ${description}`,
  ];
  const append = (label: string, values: string[]) => {
    if (values.length) sections.push(`${label}: ${values.join(" | ")}`);
  };
  append("Public risk signals", publicLines(input.riskSignals));
  append("Public treasury context", publicLines(input.publicTreasuryContext));
  append("Public historical outcomes", publicLines(input.publicHistoricalOutcomes));
  sections.push("Return a concise review with: summary, risks, missing information, and a recommended human next step.");
  sections.push("Do not infer or reveal private votes, voter identities, private room notes, credentials, secrets, witness data, or hidden records.");
  return sections.join("\n");
}

function validateAmazonBedrockRequest(body: Record<string, unknown>): AmazonBedrockRequest {
  const allowed = new Set(["publicTitle", "publicDescription", "riskSignals", "publicTreasuryContext", "publicHistoricalOutcomes"]);
  const unexpected = Object.keys(body).filter((key) => !allowed.has(key));
  if (unexpected.length) throw new Error("Only public proposal metadata is accepted by Amazon AI.");
  const serialized = JSON.stringify(body);
  if (/private|witness|secret|password|token|keypair|credential|hidden.?vote|room.?transcript|encrypted.?vote|raw.?payload/i.test(serialized)) {
    throw new Error("Private or secret material is not accepted by the Amazon AI boundary.");
  }
  return {
    publicTitle: boundedPublicText(body.publicTitle, 240),
    publicDescription: boundedPublicText(body.publicDescription, 2_000),
    riskSignals: publicLines(body.riskSignals),
    publicTreasuryContext: publicLines(body.publicTreasuryContext),
    publicHistoricalOutcomes: publicLines(body.publicHistoricalOutcomes),
  };
}

async function handleAmazonBedrockAnalysis(body: Record<string, unknown>) {
  if (!bedrockEnabled || !bedrockClient) {
    return { ok: false, status: "disabled", provider: "amazon-bedrock", reason: "Amazon Bedrock is not enabled on this deployment." };
  }
  const input = validateAmazonBedrockRequest(body);
  const response = await bedrockClient.send(new ConverseCommand({
    modelId: bedrockModelId,
    system: [{ text: "You are PrivateDAO's bounded decision-support assistant. Use only the public metadata supplied by the caller." }],
    messages: [{ role: "user", content: [{ text: buildAmazonBedrockPrompt(input) }] }],
    inferenceConfig: { maxTokens: bedrockMaxTokens, temperature: 0.1 },
  }));
  const text = response.output?.message?.content?.find((item) => typeof item.text === "string")?.text?.trim();
  if (!text) throw new Error("Amazon Bedrock returned no text response.");
  return {
    ok: true,
    status: "available",
    provider: "amazon-bedrock",
    model: bedrockModelId,
    region: bedrockRegion,
    summary: text.slice(0, 8_000),
    dataSentToProvider: ["publicTitle", "publicDescription", "public risk signals", "optional public treasury context", "optional public historical outcomes"].filter((field) => {
      if (field === "publicTitle") return Boolean(input.publicTitle);
      if (field === "publicDescription") return Boolean(input.publicDescription);
      if (field.includes("risk")) return Boolean(input.riskSignals?.length);
      if (field.includes("treasury")) return Boolean(input.publicTreasuryContext?.length);
      return Boolean(input.publicHistoricalOutcomes?.length);
    }),
    privateDataSent: false,
  };
}

function stringField(body: Record<string, unknown>, key: string, fallback = "") {
  const value = body[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

type CreditLimitCustomerData = {
  customerId?: string;
  proMembership?: boolean;
  monthlyEarnings?: number;
  earningsMonthly?: number;
  revenueMonthly?: number;
  riskScore?: number;
  currency?: string;
  payouts?: Array<{ amount?: number; amountUsd?: number; cents?: number }>;
  transactions?: Array<{ amount?: number; amountUsd?: number; cents?: number; type?: string }>;
};

type CreditLimitPolicy = {
  advanceRate?: number;
  maxLimitUsd?: number;
  minLimitUsd?: number;
  riskFloor?: number;
  roundToUsd?: number;
};

function sha256JsonHex(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`).join(",")}}`;
}

function sha256StableJsonHex(value: unknown) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function isPrivateHostname(hostname: string) {
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".localhost")) return true;
  if (lower === "0.0.0.0" || lower === "::1") return true;
  if (/^127\./.test(lower) || /^10\./.test(lower) || /^192\.168\./.test(lower)) return true;
  const match = lower.match(/^172\.(\d+)\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

type CreditLimitPublicProofPackage = {
  proofId: string;
  workflowId: string;
  originalProofHash: string;
  publicOutcome: "credit-limit-issued";
  issuedLimitUsd: number;
  currency: string;
  completedStages: Array<{
    id: string;
    label: string;
    status: "completed";
  }>;
  publicMetrics: {
    proMembershipVerified: boolean;
    importedRecordCount: number;
    riskBand: string;
  };
  valuesUsedButNotRevealed: string[];
  verifierStatement: string;
};

function buildCreditLimitProofPayload(proofPackage: CreditLimitPublicProofPackage) {
  const { originalProofHash: _originalProofHash, ...payload } = proofPackage;
  return payload;
}

function computeCreditLimitProofHash(proofPackage: CreditLimitPublicProofPackage) {
  return sha256StableJsonHex(buildCreditLimitProofPayload(proofPackage));
}

function buildCreditLimitPublicProofPackage(input: {
  proofId: string;
  workflowId: string;
  issuedLimitUsd: number;
  currency: string;
  stages: Array<{ id: string; label: string; status: string }>;
  publicMetrics: CreditLimitPublicProofPackage["publicMetrics"];
}) {
  const unsigned: CreditLimitPublicProofPackage = {
    proofId: input.proofId,
    workflowId: input.workflowId,
    originalProofHash: "",
    publicOutcome: "credit-limit-issued",
    issuedLimitUsd: input.issuedLimitUsd,
    currency: input.currency,
    completedStages: input.stages
      .filter((stage) => stage.status === "completed")
      .map((stage) => ({
        id: stage.id,
        label: stage.label,
        status: "completed" as const,
      })),
    publicMetrics: input.publicMetrics,
    valuesUsedButNotRevealed: [
      "Customer earnings",
      "Internal thresholds",
      "Internal formulas",
      "Reviewer notes",
      "Risk model",
    ],
    verifierStatement:
      "We recompute the proof from the public proof package and compare it with the original hash.",
  };
  return {
    ...unsigned,
    originalProofHash: computeCreditLimitProofHash(unsigned),
  };
}

function assertCreditLimitProofPackage(value: unknown): CreditLimitPublicProofPackage {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Proof package must be an object.");
  const proofPackage = value as Partial<CreditLimitPublicProofPackage>;
  if (!proofPackage.proofId || typeof proofPackage.proofId !== "string") throw new Error("proofId is required.");
  if (!proofPackage.workflowId || typeof proofPackage.workflowId !== "string") throw new Error("workflowId is required.");
  if (typeof proofPackage.originalProofHash !== "string") throw new Error("originalProofHash is required.");
  if (proofPackage.publicOutcome !== "credit-limit-issued") throw new Error("publicOutcome is invalid.");
  if (typeof proofPackage.issuedLimitUsd !== "number" || !Number.isFinite(proofPackage.issuedLimitUsd)) {
    throw new Error("issuedLimitUsd is invalid.");
  }
  if (!proofPackage.currency || typeof proofPackage.currency !== "string") throw new Error("currency is required.");
  if (!Array.isArray(proofPackage.completedStages) || proofPackage.completedStages.length === 0) {
    throw new Error("completedStages are required.");
  }
  for (const stage of proofPackage.completedStages) {
    if (!stage || typeof stage !== "object") throw new Error("completedStages are invalid.");
    if (typeof stage.id !== "string" || typeof stage.label !== "string" || stage.status !== "completed") {
      throw new Error("completedStages are invalid.");
    }
  }
  if (!proofPackage.publicMetrics || typeof proofPackage.publicMetrics !== "object") throw new Error("publicMetrics are required.");
  if (typeof proofPackage.publicMetrics.proMembershipVerified !== "boolean") {
    throw new Error("publicMetrics.proMembershipVerified is invalid.");
  }
  if (
    typeof proofPackage.publicMetrics.importedRecordCount !== "number" ||
    !Number.isInteger(proofPackage.publicMetrics.importedRecordCount) ||
    proofPackage.publicMetrics.importedRecordCount < 1
  ) {
    throw new Error("publicMetrics.importedRecordCount is invalid.");
  }
  if (typeof proofPackage.publicMetrics.riskBand !== "string") throw new Error("publicMetrics.riskBand is invalid.");
  if (!Array.isArray(proofPackage.valuesUsedButNotRevealed)) {
    throw new Error("valuesUsedButNotRevealed are required.");
  }
  if (typeof proofPackage.verifierStatement !== "string") throw new Error("verifierStatement is required.");
  return proofPackage as CreditLimitPublicProofPackage;
}

function verifyCreditLimitProofPackage(value: unknown) {
  try {
    const proofPackage = assertCreditLimitProofPackage(value);
    const recomputedHash = computeCreditLimitProofHash(proofPackage);
    const originalHash = proofPackage.originalProofHash.trim() || null;
    if (!originalHash) {
      return {
        ok: false,
        status: "missing-original-proof-hash",
        match: false,
        originalHash,
        recomputedHash,
        message: "Missing original proof hash.",
      };
    }
    if (originalHash !== recomputedHash) {
      return {
        ok: false,
        status: "mismatch",
        match: false,
        originalHash,
        recomputedHash,
        message: "Mismatch. The proof package was changed after the original hash was created.",
      };
    }
    return {
      ok: true,
      status: "verified",
      match: true,
      originalHash,
      recomputedHash,
      message: "Verified. The recomputed proof matches the original hash.",
    };
  } catch (error) {
    return {
      ok: false,
      status: "invalid-proof-package",
      match: false,
      originalHash: null,
      recomputedHash: null,
      message: error instanceof Error ? error.message : "Invalid proof package.",
    };
  }
}

type BlindPolicyPrivateInputs = {
  organizationId: string;
  subjectId: string;
  membershipVerified: boolean;
  records: Array<{ amountUsd: number }>;
  riskScore: number;
  liabilitiesUsd: number;
};

type BlindPolicyGroth16Proof = {
  provingSystem: "groth16";
  circuit: "private_dao_blind_policy_overlay";
  verificationMode: "groth16-snarkjs";
  verified: true;
  publicSignals: string[];
  proof: unknown;
  verificationKey: unknown;
  proofHash: string;
  publicSignalsHash: string;
  verificationKeyHash: string;
};

type BlindPolicyPublicProofPackage = {
  proofId: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  circuitId: "private_dao_blind_policy_overlay";
  circuitVersion: "groth16-v1";
  policyVersion: string;
  workflowId: string;
  originalProofHash: string;
  publicOutcome: "policy-satisfied";
  policySatisfied: true;
  decision: string;
  policyCommitment: string;
  inputCommitment: string;
  verificationKeyHash: string;
  verifierInputs: {
    provingSystem: "groth16";
    circuit: "private_dao_blind_policy_overlay";
    verificationCommand: "snarkjs groth16 verify";
    publicSignals: ["policyId", "policyCommitment", "inputCommitment", "satisfiedClaim"];
  };
  completedStages: Array<{ id: string; label: string; status: "completed" }>;
  publicChecks: Array<{ id: string; label: string; satisfied: true }>;
  groth16Proof: BlindPolicyGroth16Proof;
  providerLanes: Array<{
    id: "zk-policy-proof" | "refhe-encrypted-evaluation" | "ika-encrypt-2pc-boundary" | "magicblock-fast-session";
    label: string;
    status: "verified" | "committed";
    evidenceClass: "groth16-verified" | "commitment-boundary";
    publicCommitment: string;
    verifierNote: string;
  }>;
  valuesUsedButNotRevealed: string[];
  verifierStatement: string;
};

const blindPolicyRules = {
  policyId: 20260619n,
  policyIdLabel: "private-credit-capacity-v1",
  policyVersion: "2026-06-25.private-credit-capacity.v1",
  minRecordCount: 3n,
  minAverageAmountUsd: 7500n,
  maxLiabilityBps: 3500n,
  minRiskScore: 72n,
};

function fieldFromString(value: string) {
  return BigInt(`0x${createHash("sha256").update(value).digest("hex").slice(0, 15)}`);
}

function toFieldString(value: bigint) {
  return value.toString();
}

async function poseidonHash(...items: bigint[]) {
  const { buildPoseidon } = requireFromRoot("circomlibjs") as {
    buildPoseidon: () => Promise<{
      F: { toString: (value: unknown) => string };
      (items: bigint[]): unknown;
    }>;
  };
  const poseidon = await buildPoseidon();
  return BigInt(poseidon.F.toString(poseidon(items)));
}

function normalizeBlindPolicyInputs(value: unknown): BlindPolicyPrivateInputs {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("privateInputs object is required.");
  const input = value as Partial<BlindPolicyPrivateInputs>;
  if (!input.organizationId || typeof input.organizationId !== "string") throw new Error("organizationId is required.");
  if (!input.subjectId || typeof input.subjectId !== "string") throw new Error("subjectId is required.");
  if (input.membershipVerified !== true) throw new Error("Membership is not verified.");
  if (!Array.isArray(input.records) || input.records.length < Number(blindPolicyRules.minRecordCount)) {
    throw new Error(`At least ${blindPolicyRules.minRecordCount.toString()} private records are required.`);
  }
  const records = input.records.slice(0, 3).map((record, index) => {
    const amountUsd = Number(record?.amountUsd);
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) throw new Error(`records[${index}].amountUsd must be positive.`);
    return { amountUsd: Math.floor(amountUsd) };
  });
  const riskScore = Number(input.riskScore);
  if (!Number.isFinite(riskScore) || riskScore <= 0) throw new Error("riskScore must be positive.");
  const liabilitiesUsd = Number(input.liabilitiesUsd ?? 0);
  if (!Number.isFinite(liabilitiesUsd) || liabilitiesUsd < 0) throw new Error("liabilitiesUsd must be zero or positive.");
  return {
    organizationId: input.organizationId,
    subjectId: input.subjectId,
    membershipVerified: true,
    records,
    riskScore: Math.floor(riskScore),
    liabilitiesUsd: Math.floor(liabilitiesUsd),
  };
}

function evaluateBlindPolicy(inputs: BlindPolicyPrivateInputs) {
  const sum = inputs.records.reduce((total, record) => total + record.amountUsd, 0);
  const average = sum / inputs.records.length;
  const liabilityRatioBps = Math.floor((inputs.liabilitiesUsd * 10000) / Math.max(average, 1));
  const validationErrors = [
    ...(inputs.membershipVerified ? [] : ["Membership is not verified."]),
    ...(inputs.records.length >= Number(blindPolicyRules.minRecordCount)
      ? []
      : [`At least ${blindPolicyRules.minRecordCount.toString()} records are required.`]),
    ...(average >= Number(blindPolicyRules.minAverageAmountUsd) ? [] : ["Private capacity threshold is not satisfied."]),
    ...(liabilityRatioBps <= Number(blindPolicyRules.maxLiabilityBps)
      ? []
      : ["Private liability policy is not satisfied."]),
    ...(inputs.riskScore >= Number(blindPolicyRules.minRiskScore) ? [] : ["Private risk policy is not satisfied."]),
  ];
  return { sum, average, liabilityRatioBps, validationErrors };
}

function zkArtifactPath(relativePath: string) {
  return resolve(process.cwd(), relativePath);
}

function hashFileHex(relativePath: string) {
  return createHash("sha256").update(readFileSync(zkArtifactPath(relativePath))).digest("hex");
}

async function buildGroth16BlindPolicyProof(inputs: BlindPolicyPrivateInputs, policyVersion = blindPolicyRules.policyVersion): Promise<{
  groth16Proof: BlindPolicyGroth16Proof;
  policyCommitment: string;
  inputCommitment: string;
}> {
  const circuit = "private_dao_blind_policy_overlay";
  const wasmDir = zkArtifactPath(`zk/build/${circuit}_js`);
  const wasmFile = join(wasmDir, `${circuit}.wasm`);
  const witnessGenerator = join(wasmDir, "generate_witness.js");
  const zkey = zkArtifactPath(`zk/setup/${circuit}_final.zkey`);
  const verificationKey = zkArtifactPath(`zk/setup/${circuit}_vkey.json`);
  for (const requiredPath of [wasmFile, witnessGenerator, zkey, verificationKey]) {
    if (!existsSync(requiredPath)) throw new Error(`Groth16 artifact missing: ${requiredPath}`);
  }

  const organizationKey = fieldFromString(inputs.organizationId);
  const subjectKey = fieldFromString(inputs.subjectId);
  const record0 = BigInt(inputs.records[0]?.amountUsd ?? 0);
  const record1 = BigInt(inputs.records[1]?.amountUsd ?? 0);
  const record2 = BigInt(inputs.records[2]?.amountUsd ?? 0);
  const liabilitiesUsd = BigInt(inputs.liabilitiesUsd);
  const riskScore = BigInt(inputs.riskScore);
  const inputSalt = fieldFromString(`${inputs.organizationId}:${inputs.subjectId}:${inputs.records.map((record) => record.amountUsd).join(":")}`);
  const policySalt = fieldFromString(policyVersion);
  const policyCommitment = await poseidonHash(
    blindPolicyRules.policyId,
    blindPolicyRules.minRecordCount,
    blindPolicyRules.minAverageAmountUsd,
    blindPolicyRules.maxLiabilityBps,
    blindPolicyRules.minRiskScore,
    policySalt,
  );
  const inputCommitment = await poseidonHash(
    organizationKey,
    subjectKey,
    record0,
    record1,
    record2,
    liabilitiesUsd,
    riskScore,
    inputSalt,
  );
  const sample = {
    policyId: toFieldString(blindPolicyRules.policyId),
    policyCommitment: toFieldString(policyCommitment),
    inputCommitment: toFieldString(inputCommitment),
    satisfiedClaim: "1",
    organizationKey: toFieldString(organizationKey),
    subjectKey: toFieldString(subjectKey),
    membershipVerified: "1",
    record0: toFieldString(record0),
    record1: toFieldString(record1),
    record2: toFieldString(record2),
    liabilitiesUsd: toFieldString(liabilitiesUsd),
    riskScore: toFieldString(riskScore),
    minRecordCount: toFieldString(blindPolicyRules.minRecordCount),
    minAverageAmountUsd: toFieldString(blindPolicyRules.minAverageAmountUsd),
    maxLiabilityBps: toFieldString(blindPolicyRules.maxLiabilityBps),
    minRiskScore: toFieldString(blindPolicyRules.minRiskScore),
    policySalt: toFieldString(policySalt),
    inputSalt: toFieldString(inputSalt),
  };

  const tempDir = mkdtempSync(join(tmpdir(), "privatedao-blind-policy-"));
  const inputPath = join(tempDir, "input.json");
  const witnessPath = join(tempDir, "witness.wtns");
  const proofPath = join(tempDir, "proof.json");
  const publicPath = join(tempDir, "public.json");
  writeFileSync(inputPath, JSON.stringify(sample, null, 2), "utf8");
  execFileSync("node", [witnessGenerator, wasmFile, inputPath, witnessPath], { cwd: process.cwd(), stdio: "pipe" });
  execFileSync("npx", ["snarkjs", "groth16", "prove", zkey, witnessPath, proofPath, publicPath], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
  execFileSync("npx", ["snarkjs", "groth16", "verify", verificationKey, publicPath, proofPath], {
    cwd: process.cwd(),
    stdio: "pipe",
  });

  const proof = JSON.parse(readFileSync(proofPath, "utf8")) as unknown;
  const publicSignals = JSON.parse(readFileSync(publicPath, "utf8")) as string[];
  const verificationKeyJson = JSON.parse(readFileSync(verificationKey, "utf8")) as unknown;
  return {
    policyCommitment: toFieldString(policyCommitment),
    inputCommitment: toFieldString(inputCommitment),
    groth16Proof: {
      provingSystem: "groth16",
      circuit,
      verificationMode: "groth16-snarkjs",
      verified: true,
      publicSignals,
      proof,
      verificationKey: verificationKeyJson,
      proofHash: createHash("sha256").update(readFileSync(proofPath)).digest("hex"),
      publicSignalsHash: createHash("sha256").update(readFileSync(publicPath)).digest("hex"),
      verificationKeyHash: hashFileHex(`zk/setup/${circuit}_vkey.json`),
    },
  };
}

function buildBlindPolicyProofPayload(proofPackage: BlindPolicyPublicProofPackage) {
  const { originalProofHash: _originalProofHash, ...payload } = proofPackage;
  return payload;
}

function computeBlindPolicyProofHash(proofPackage: BlindPolicyPublicProofPackage) {
  return sha256StableJsonHex(buildBlindPolicyProofPayload(proofPackage));
}

function addHoursIso(base: Date, hours: number) {
  return new Date(base.getTime() + hours * 60 * 60 * 1000).toISOString();
}

function buildBlindPolicyPublicProofPackage(input: {
  proofId: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  circuitVersion?: "groth16-v1";
  policyVersion: string;
  workflowId: string;
  policyCommitment: string;
  inputCommitment: string;
  groth16Proof: BlindPolicyGroth16Proof;
}) {
  const publicChecks = [
    { id: "membership", label: "Membership verified", satisfied: true as const },
    { id: "records", label: "Required private records imported", satisfied: true as const },
    { id: "capacity", label: "Capacity policy satisfied", satisfied: true as const },
    { id: "liability", label: "Liability policy satisfied", satisfied: true as const },
    { id: "risk", label: "Risk policy satisfied", satisfied: true as const },
  ];
  const laneSeed = {
    workflowId: input.workflowId,
    proofId: input.proofId,
    policyCommitment: input.policyCommitment,
    inputCommitment: input.inputCommitment,
    checks: publicChecks,
  };
  const unsigned: BlindPolicyPublicProofPackage = {
    proofId: input.proofId,
    nonce: input.nonce,
    issuedAt: input.issuedAt,
    expiresAt: input.expiresAt,
    circuitId: "private_dao_blind_policy_overlay",
    circuitVersion: input.circuitVersion ?? "groth16-v1",
    policyVersion: input.policyVersion,
    workflowId: input.workflowId,
    originalProofHash: "",
    publicOutcome: "policy-satisfied",
    policySatisfied: true,
    decision: "Policy satisfied. The decision can be verified without revealing the policy inputs.",
    policyCommitment: input.policyCommitment,
    inputCommitment: input.inputCommitment,
    verificationKeyHash: input.groth16Proof.verificationKeyHash,
    verifierInputs: {
      provingSystem: "groth16",
      circuit: "private_dao_blind_policy_overlay",
      verificationCommand: "snarkjs groth16 verify",
      publicSignals: ["policyId", "policyCommitment", "inputCommitment", "satisfiedClaim"],
    },
    completedStages: [
      { id: "data-import", label: "Private data imported", status: "completed" },
      { id: "policy-evaluation", label: "Blind policy evaluated", status: "completed" },
      { id: "zk-policy-proof", label: "Groth16 ZK policy proof generated", status: "completed" },
      { id: "public-verification", label: "Public verifier package created", status: "completed" },
    ],
    publicChecks,
    groth16Proof: input.groth16Proof,
    providerLanes: [
      {
        id: "zk-policy-proof",
        label: "Groth16 ZK policy proof",
        status: "verified",
        evidenceClass: "groth16-verified",
        publicCommitment: sha256StableJsonHex({
          lane: "zk",
          ...laneSeed,
          proofHash: input.groth16Proof.proofHash,
          publicSignalsHash: input.groth16Proof.publicSignalsHash,
          verificationKeyHash: input.groth16Proof.verificationKeyHash,
        }),
        verifierNote:
          "Groth16 verifies private witness constraints against public signals: policy id, policy commitment, input commitment, and satisfied claim.",
      },
      {
        id: "refhe-encrypted-evaluation",
        label: "REFHE encrypted evaluation lane",
        status: "committed",
        evidenceClass: "commitment-boundary",
        publicCommitment: sha256StableJsonHex({
          lane: "refhe",
          encryptedAggregate: input.inputCommitment,
          policyCommitment: input.policyCommitment,
        }),
        verifierNote:
          "Commitment boundary only: this package commits encrypted-evaluation metadata. It does not claim a separate live REFHE proof unless a REFHE receipt is attached.",
      },
      {
        id: "ika-encrypt-2pc-boundary",
        label: "Ika / Encrypt 2PC-MPC boundary",
        status: "committed",
        evidenceClass: "commitment-boundary",
        publicCommitment: sha256StableJsonHex({ lane: "ika-encrypt", workflowId: input.workflowId, policyCommitment: input.policyCommitment }),
        verifierNote:
          "Commitment boundary only: this package binds encrypted authorization metadata. It does not claim final Ika dWallet DKG or 2PC-MPC signing without a separate Ika receipt.",
      },
      {
        id: "magicblock-fast-session",
        label: "MagicBlock fast policy session",
        status: "committed",
        evidenceClass: "commitment-boundary",
        publicCommitment: sha256StableJsonHex({ lane: "magicblock", workflowId: input.workflowId, publicChecks }),
        verifierNote:
          "Commitment boundary only: this package binds the fast-session intent. It does not claim MagicBlock rollup execution unless a MagicBlock receipt is attached.",
      },
    ],
    valuesUsedButNotRevealed: [
      "Raw subject identity",
      "Private record values",
      "Average private amount",
      "Risk score",
      "Liability ratio",
      "Policy thresholds",
      "Internal policy formula",
    ],
    verifierStatement:
      "We recompute the proof package, verify the Groth16 public signals, and compare the recomputed hash with the original hash.",
  };
  return {
    ...unsigned,
    originalProofHash: computeBlindPolicyProofHash(unsigned),
  };
}

function assertBlindPolicyProofPackage(value: unknown): BlindPolicyPublicProofPackage {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Proof package must be an object.");
  const proofPackage = value as Partial<BlindPolicyPublicProofPackage>;
  if (!proofPackage.proofId || typeof proofPackage.proofId !== "string") throw new Error("proofId is required.");
  if (!proofPackage.nonce || typeof proofPackage.nonce !== "string") throw new Error("nonce is required.");
  if (!proofPackage.issuedAt || typeof proofPackage.issuedAt !== "string") throw new Error("issuedAt is required.");
  if (!proofPackage.expiresAt || typeof proofPackage.expiresAt !== "string") throw new Error("expiresAt is required.");
  if (proofPackage.circuitId !== "private_dao_blind_policy_overlay") throw new Error("circuitId is invalid.");
  if (!proofPackage.circuitVersion || typeof proofPackage.circuitVersion !== "string") throw new Error("circuitVersion is required.");
  if (!proofPackage.policyVersion || typeof proofPackage.policyVersion !== "string") throw new Error("policyVersion is required.");
  if (!proofPackage.workflowId || typeof proofPackage.workflowId !== "string") throw new Error("workflowId is required.");
  if (typeof proofPackage.originalProofHash !== "string") throw new Error("originalProofHash is required.");
  if (proofPackage.publicOutcome !== "policy-satisfied") throw new Error("publicOutcome is invalid.");
  if (proofPackage.policySatisfied !== true) throw new Error("policySatisfied must be true.");
  if (!proofPackage.policyCommitment || typeof proofPackage.policyCommitment !== "string") throw new Error("policyCommitment is required.");
  if (!proofPackage.inputCommitment || typeof proofPackage.inputCommitment !== "string") throw new Error("inputCommitment is required.");
  if (!proofPackage.verificationKeyHash || typeof proofPackage.verificationKeyHash !== "string") {
    throw new Error("verificationKeyHash is required.");
  }
  if (!proofPackage.verifierInputs || proofPackage.verifierInputs.provingSystem !== "groth16") {
    throw new Error("Groth16 verifier inputs are required.");
  }
  if (!proofPackage.groth16Proof || proofPackage.groth16Proof.verified !== true) throw new Error("verified Groth16 proof is required.");
  if (!proofPackage.groth16Proof.proof || typeof proofPackage.groth16Proof.proof !== "object") {
    throw new Error("Groth16 proof object is required.");
  }
  if (!proofPackage.groth16Proof.verificationKey || typeof proofPackage.groth16Proof.verificationKey !== "object") {
    throw new Error("Groth16 verification key is required.");
  }
  if (!Array.isArray(proofPackage.groth16Proof.publicSignals) || proofPackage.groth16Proof.publicSignals.length !== 4) {
    throw new Error("Groth16 public signals are invalid.");
  }
  if (typeof proofPackage.groth16Proof.proofHash !== "string") throw new Error("Groth16 proof hash is required.");
  if (typeof proofPackage.groth16Proof.publicSignalsHash !== "string") throw new Error("Groth16 public signals hash is required.");
  if (typeof proofPackage.groth16Proof.verificationKeyHash !== "string") throw new Error("Groth16 verification key hash is required.");
  if (proofPackage.verificationKeyHash !== proofPackage.groth16Proof.verificationKeyHash) {
    throw new Error("verificationKeyHash does not match Groth16 proof material.");
  }
  if (!Array.isArray(proofPackage.publicChecks) || proofPackage.publicChecks.some((check) => check.satisfied !== true)) {
    throw new Error("Public checks are invalid.");
  }
  return proofPackage as BlindPolicyPublicProofPackage;
}

function verifyBlindPolicyProofPackage(value: unknown) {
  try {
    const proofPackage = assertBlindPolicyProofPackage(value);
    const recomputedHash = computeBlindPolicyProofHash(proofPackage);
    const originalHash = proofPackage.originalProofHash.trim() || null;
    if (!originalHash) {
      return {
        ok: false,
        status: "missing-original-proof-hash",
        match: false,
        originalHash,
        recomputedHash,
        message: "Missing original proof hash.",
      };
    }
    if (originalHash !== recomputedHash) {
      return {
        ok: false,
        status: "mismatch",
        match: false,
        originalHash,
        recomputedHash,
        message: "Mismatch. The blind policy proof package was changed after the original hash was created.",
      };
    }
    if (proofPackage.circuitVersion !== "groth16-v1") {
      return {
        ok: false,
        status: "unsupported-circuit-version",
        match: false,
        originalHash,
        recomputedHash,
        message: `Unsupported circuit version: ${proofPackage.circuitVersion}.`,
      };
    }
    if (Number.isNaN(Date.parse(proofPackage.expiresAt)) || Date.parse(proofPackage.expiresAt) <= Date.now()) {
      return {
        ok: false,
        status: "expired-proof",
        match: false,
        originalHash,
        recomputedHash,
        message: "The proof package has expired.",
      };
    }
    const verificationKey = zkArtifactPath("zk/setup/private_dao_blind_policy_overlay_vkey.json");
    const tempDir = mkdtempSync(join(tmpdir(), "privatedao-blind-policy-verify-"));
    const proofPath = join(tempDir, "proof.json");
    const publicPath = join(tempDir, "public.json");
    writeFileSync(proofPath, JSON.stringify(proofPackage.groth16Proof.proof, null, 2), "utf8");
    writeFileSync(publicPath, JSON.stringify(proofPackage.groth16Proof.publicSignals, null, 2), "utf8");
    execFileSync("npx", ["snarkjs", "groth16", "verify", verificationKey, publicPath, proofPath], {
      cwd: process.cwd(),
      stdio: "pipe",
    });
    return {
      ok: true,
      status: "verified",
      match: true,
      originalHash,
      recomputedHash,
      message: "Verified. Groth16 and the public proof hash both match.",
    };
  } catch (error) {
    return {
      ok: false,
      status: "invalid-proof-package",
      match: false,
      originalHash: null,
      recomputedHash: null,
      message: error instanceof Error ? error.message : "Invalid blind policy proof package.",
    };
  }
}

function blindPolicyOnchainCluster() {
  const raw = (process.env.BLIND_POLICY_ONCHAIN_CLUSTER || process.env.SOLANA_CLUSTER || "testnet").trim().toLowerCase();
  if (raw === "mainnet" || raw === "mainnet-beta") return "mainnet-beta";
  if (raw === "devnet") return "devnet";
  return "testnet";
}

function blindPolicyOnchainRpcUrl() {
  const cluster = blindPolicyOnchainCluster();
  if (process.env.BLIND_POLICY_ONCHAIN_RPC_URL?.trim()) return process.env.BLIND_POLICY_ONCHAIN_RPC_URL.trim();
  if (cluster === "mainnet-beta") {
    return (
      process.env.SOLANA_MAINNET_RPC_URL?.trim() ||
      process.env.SOLANA_RPC_URL?.trim() ||
      "https://api.mainnet-beta.solana.com"
    );
  }
  if (cluster === "devnet") return process.env.SOLANA_DEVNET_RPC_URL?.trim() || "https://api.devnet.solana.com";
  return process.env.SOLANA_RPC_URL?.trim() || "https://api.testnet.solana.com";
}

function solanaExplorerSuffix(cluster = blindPolicyOnchainCluster()) {
  return cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
}

function bytes32FromHexOrHash(value: string) {
  const normalized = value.trim().replace(/^0x/i, "");
  if (/^[0-9a-fA-F]{64}$/.test(normalized)) return Buffer.from(normalized, "hex");
  return createHash("sha256").update(value).digest();
}

function bytes32FromUtf8(value: string) {
  return createHash("sha256").update(value).digest();
}

function recordAnchorCanonical(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value.normalize("NFC"));
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) throw new Error("Invalid record anchor number");
    return String(value);
  }
  if (Array.isArray(value)) return `[${value.map(recordAnchorCanonical).join(",")}]`;
  if (typeof value === "object") {
    const normalized = Object.entries(value as Record<string, unknown>)
      .map(([key, child]) => [key.normalize("NFC"), child] as const)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
    return `{${normalized.map(([key, child]) => `${JSON.stringify(key)}:${recordAnchorCanonical(child)}`).join(",")}}`;
  }
  throw new Error("Unsupported record anchor value");
}

function recordAnchorPayloadDigest(payload: Record<string, unknown>) {
  return createHash("sha256").update(recordAnchorCanonical(payload), "utf8").digest("hex");
}

async function handleRecordReceiptAnchor(body: Record<string, unknown>) {
  const payload = body.anchor_payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("anchor_payload must be an object");
  const anchorPayload = payload as Record<string, unknown>;
  const allowed = new Set(["receipt_id", "canonical_record_digest", "schema_digest", "policy_digest", "evidence_digest", "created_at", "canonicalization_version"]);
  const unknown = Object.keys(anchorPayload).filter((key) => !allowed.has(key));
  if (unknown.length) throw new Error("Record anchor payload contains unsupported fields");
  for (const key of ["receipt_id", "canonical_record_digest", "schema_digest", "evidence_digest", "created_at", "canonicalization_version"]) {
    if (typeof anchorPayload[key] !== "string" || !anchorPayload[key]) throw new Error(`Record anchor field ${key} is required`);
  }
  if (anchorPayload.policy_digest !== null && typeof anchorPayload.policy_digest !== "string") throw new Error("policy_digest must be a string or null");
  const expectedDigest = recordAnchorPayloadDigest(anchorPayload);
  if (body.anchor_payload_digest !== expectedDigest) throw new Error("Record anchor payload digest mismatch");
  const cluster = blindPolicyOnchainCluster();
  if (!["devnet", "testnet"].includes(cluster)) throw new Error("Record Verification anchoring is restricted to Solana Devnet or Testnet");
  const cached = recordAnchorMemory.get(`${anchorPayload.receipt_id}:${expectedDigest}`);
  if (cached) return { ok: true, anchorStatus: "confirmed", signature: cached.signature, slot: cached.slot, programId: memoProgramId.toBase58(), cluster, submittedDigest: expectedDigest, anchorPayloadDigest: expectedDigest, confirmedAt: cached.confirmedAt, duplicate: true };
  const keypair = await getFreshnessBotKeypair();
  const connection = new Connection(blindPolicyOnchainRpcUrl(), "confirmed");
  const memo = [
    "PDAO-RRV1",
    `receipt=${anchorPayload.receipt_id}`,
    `record=${anchorPayload.canonical_record_digest}`,
    `schema=${anchorPayload.schema_digest}`,
    `policy=${anchorPayload.policy_digest || "none"}`,
    `evidence=${anchorPayload.evidence_digest}`,
    `created=${anchorPayload.created_at}`,
    `version=${anchorPayload.canonicalization_version}`,
    `payload=${expectedDigest}`,
  ].join("|");
  const transaction = new Transaction().add(new TransactionInstruction({
    keys: [{ pubkey: keypair.publicKey, isSigner: true, isWritable: true }],
    programId: memoProgramId,
    data: Buffer.from(memo, "utf8"),
  }));
  const signature = await sendAndConfirmTransaction(connection, transaction, [keypair], { commitment: "confirmed" });
  const parsed = await connection.getParsedTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 }).catch(() => null);
  const slot = parsed?.slot ?? await connection.getSlot("confirmed");
  const confirmedAt = new Date().toISOString();
  recordAnchorMemory.set(`${anchorPayload.receipt_id}:${expectedDigest}`, { signature, slot, payloadDigest: expectedDigest, confirmedAt });
  return { ok: true, anchorStatus: "confirmed", signature, slot, programId: memoProgramId.toBase58(), cluster, submittedDigest: expectedDigest, anchorPayloadDigest: expectedDigest, confirmedAt, storageMode: "solana-memo-receipt" };
}

async function reconcileRecordReceiptAnchor(body: Record<string, unknown>) {
  const signature = stringField(body, "anchor_signature", "");
  const digest = stringField(body, "anchor_payload_digest", "");
  if (!signature || !digest) throw new Error("anchor_signature and anchor_payload_digest are required");
  if (!["devnet", "testnet"].includes(blindPolicyOnchainCluster())) throw new Error("Record Verification reconciliation is restricted to Solana Devnet or Testnet");
  const connection = new Connection(blindPolicyOnchainRpcUrl(), "confirmed");
  const status = await connection.getSignatureStatuses([signature]);
  const value = status.value[0];
  if (!value || value.err) return { ok: false, anchorStatus: "failed", signature, submittedDigest: digest, programId: memoProgramId.toBase58(), cluster: "devnet" };
  const slot = value.confirmationStatus ? await connection.getSlot("confirmed") : null;
  const cluster = blindPolicyOnchainCluster();
  return { ok: true, anchorStatus: value.confirmationStatus === "confirmed" || value.confirmationStatus === "finalized" ? "confirmed" : "submitted", signature, slot, programId: memoProgramId.toBase58(), cluster, submittedDigest: digest, anchorPayloadDigest: digest, confirmedAt: new Date().toISOString() };
}

function i64LeFromIso(value: string) {
  const timestampMs = Date.parse(value);
  if (!Number.isFinite(timestampMs)) throw new Error(`Invalid ISO timestamp: ${value}`);
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64LE(BigInt(Math.floor(timestampMs / 1000)), 0);
  return buffer;
}

function blindPolicyReceiptPda(authority: PublicKey, receiptId: Buffer) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("blind_policy_receipt"), authority.toBuffer(), receiptId],
    blindPolicyVerifierProgramId,
  );
}

function buildStoreBlindPolicyReceiptData(proofPackage: BlindPolicyPublicProofPackage) {
  const receiptId = bytes32FromUtf8(proofPackage.proofId);
  const proofHash = bytes32FromHexOrHash(proofPackage.originalProofHash);
  const policyCommitmentHash = bytes32FromHexOrHash(proofPackage.policyCommitment);
  const inputCommitmentHash = bytes32FromHexOrHash(proofPackage.inputCommitment);
  const verificationKeyHash = bytes32FromHexOrHash(proofPackage.verificationKeyHash);
  const circuitVersionHash = bytes32FromUtf8(proofPackage.circuitVersion);
  const policyVersionHash = bytes32FromUtf8(proofPackage.policyVersion);
  const discriminator = createHash("sha256").update("global:store_blind_policy_receipt").digest().subarray(0, 8);
  return {
    receiptId,
    proofHash,
    policyCommitmentHash,
    inputCommitmentHash,
    verificationKeyHash,
    circuitVersionHash,
    policyVersionHash,
    data: Buffer.concat([
      discriminator,
      receiptId,
      proofHash,
      policyCommitmentHash,
      inputCommitmentHash,
      verificationKeyHash,
      circuitVersionHash,
      policyVersionHash,
      i64LeFromIso(proofPackage.issuedAt),
      i64LeFromIso(proofPackage.expiresAt),
    ]),
  };
}

async function submitBlindPolicyReceiptOnchain(proofPackage: BlindPolicyPublicProofPackage) {
  const verification = verifyBlindPolicyProofPackage(proofPackage);
  if (!verification.ok) {
    return {
      ok: false,
      status: verification.status,
      error: "On-chain receipt was not submitted because proof verification failed.",
      verification,
    };
  }

  const keypair = await getFreshnessBotKeypair();
  const cluster = blindPolicyOnchainCluster();
  const connection = new Connection(blindPolicyOnchainRpcUrl(), "confirmed");
  const receiptData = buildStoreBlindPolicyReceiptData(proofPackage);
  const [receiptAccount, bump] = blindPolicyReceiptPda(keypair.publicKey, receiptData.receiptId);
  const existing = await connection.getAccountInfo(receiptAccount, "confirmed");
  const suffix = solanaExplorerSuffix(cluster);

  const baseReceipt = {
    cluster,
    programId: blindPolicyVerifierProgramId.toBase58(),
    authority: keypair.publicKey.toBase58(),
    receiptAccount: receiptAccount.toBase58(),
    receiptAccountExplorerUrl: `https://explorer.solana.com/address/${receiptAccount.toBase58()}${suffix}`,
    proofId: proofPackage.proofId,
    proofIdHash: receiptData.receiptId.toString("hex"),
    proofHash: receiptData.proofHash.toString("hex"),
    policyCommitmentHash: receiptData.policyCommitmentHash.toString("hex"),
    inputCommitmentHash: receiptData.inputCommitmentHash.toString("hex"),
    verificationKeyHash: receiptData.verificationKeyHash.toString("hex"),
    circuitVersionHash: receiptData.circuitVersionHash.toString("hex"),
    policyVersionHash: receiptData.policyVersionHash.toString("hex"),
    bump,
  };

  if (existing) {
    return {
      ok: true,
      status: "onchain-receipt-existing",
      source: "solana-anchor-receipt-registry",
      verification,
      onchainReceipt: {
        ...baseReceipt,
        storageMode: "anchor-pda",
        signature: null,
        transactionExplorerUrl: null,
      },
    };
  }

  let signature: string;
  let storageMode: "anchor-pda" | "solana-memo-receipt" = "anchor-pda";
  try {
    const transaction = new Transaction().add(
      new TransactionInstruction({
        programId: blindPolicyVerifierProgramId,
        keys: [
          { pubkey: receiptAccount, isSigner: false, isWritable: true },
          { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: receiptData.data,
      }),
    );
    signature = await sendAndConfirmTransaction(connection, transaction, [keypair], {
      commitment: "confirmed",
    });
  } catch (error) {
    storageMode = "solana-memo-receipt";
    const memo = [
      "PDAO-BPV1",
      baseReceipt.proofIdHash,
      baseReceipt.proofHash,
      baseReceipt.policyCommitmentHash,
      baseReceipt.inputCommitmentHash,
      baseReceipt.verificationKeyHash,
      baseReceipt.circuitVersionHash,
      baseReceipt.policyVersionHash,
    ].join("|");
    const fallbackTransaction = new Transaction().add(
      new TransactionInstruction({
        keys: [{ pubkey: keypair.publicKey, isSigner: true, isWritable: true }],
        programId: memoProgramId,
        data: Buffer.from(memo, "utf8"),
      }),
    );
    signature = await sendAndConfirmTransaction(connection, fallbackTransaction, [keypair], {
      commitment: "confirmed",
    });
  }

  return {
    ok: true,
    status: storageMode === "anchor-pda" ? "onchain-receipt-stored" : "onchain-memo-receipt-stored",
    source: storageMode === "anchor-pda" ? "solana-anchor-receipt-registry" : "solana-memo-receipt",
    verification,
    onchainReceipt: {
      ...baseReceipt,
      storageMode,
      signature,
      transactionExplorerUrl: `https://explorer.solana.com/tx/${signature}${suffix}`,
    },
  };
}

const txlineApiBase = (process.env.TXLINE_API_BASE || "https://txline.txodds.com").replace(/\/+$/, "");
const txlineSessionJwt = process.env.TXLINE_SESSION_JWT?.trim() || process.env.TXLINE_GUEST_JWT?.trim() || "";
const txlineApiToken = process.env.TXLINE_API_TOKEN?.trim() || "";
const txlineServiceLevelId = process.env.TXLINE_SERVICE_LEVEL_ID?.trim() || "1";
const txlineWalletPublicKey = process.env.TXLINE_WALLET_PUBLIC_KEY?.trim() || "";
const txlineCompetitionId = process.env.TXLINE_COMPETITION_ID?.trim() || "";
const txlineScoreStatKey = process.env.TXLINE_SCORE_STAT_KEY?.trim() || "";
const txlineScoreStatKey2 = process.env.TXLINE_SCORE_STAT_KEY_2?.trim() || "";
const txlineGuestAuthUrl = `${txlineApiBase}/auth/guest/start`;

function txlineProviderMode(): TxlineProviderMode {
  return txlineApiToken && txlineSessionJwt ? "live-txline-provider" : "simulated-txline-provider";
}

function normalizeTxlineStatus(value: unknown): "scheduled" | "live" | "final" {
  const raw = String(value || "").toLowerCase();
  if (["final", "finished", "ft", "completed", "resulted", "closed"].includes(raw)) return "final";
  if (["live", "in_play", "in-play", "running", "started"].includes(raw)) return "live";
  return "scheduled";
}

function normalizeTxlineMatch(raw: Record<string, unknown>, index: number): TxlineMatch {
  const home =
    raw.Participant1 ||
    raw.participant1 ||
    raw.homeTeam ||
    raw.home_team ||
    raw.homeName ||
    raw.home_name ||
    (raw.home && typeof raw.home === "object" ? (raw.home as Record<string, unknown>).name : undefined) ||
    "Home";
  const away =
    raw.Participant2 ||
    raw.participant2 ||
    raw.awayTeam ||
    raw.away_team ||
    raw.awayName ||
    raw.away_name ||
    (raw.away && typeof raw.away === "object" ? (raw.away as Record<string, unknown>).name : undefined) ||
    "Away";
  const score = raw.score && typeof raw.score === "object" ? (raw.score as Record<string, unknown>) : {};
  const homeScore = Number(raw.homeScore ?? raw.home_score ?? score.home ?? score.homeScore ?? 0);
  const awayScore = Number(raw.awayScore ?? raw.away_score ?? score.away ?? score.awayScore ?? 0);
  const matchId = String(raw.matchId ?? raw.match_id ?? raw.FixtureId ?? raw.fixtureId ?? raw.fixture_id ?? raw.id ?? `txline-live-${index}`);
  const participant1IsHome = raw.Participant1IsHome ?? raw.participant1IsHome;
  const txlineStartTime = Number(raw.StartTime ?? raw.startTime ?? raw.startsAt ?? raw.starts_at ?? raw.kickoff ?? Date.now());
  const updatedAt = String(raw.updatedAt ?? raw.updated_at ?? raw.Ts ?? raw.timestamp ?? new Date().toISOString());
  const odds = raw.oddsSnapshot && typeof raw.oddsSnapshot === "object" ? (raw.oddsSnapshot as Record<string, unknown>) : raw.odds;
  const oddsSnapshot =
    odds && typeof odds === "object"
      ? {
          market: String((odds as Record<string, unknown>).market ?? "match-winner"),
          home: Number((odds as Record<string, unknown>).home ?? (odds as Record<string, unknown>).homeOdds ?? 0),
          draw:
            (odds as Record<string, unknown>).draw === undefined
              ? undefined
              : Number((odds as Record<string, unknown>).draw),
          away: Number((odds as Record<string, unknown>).away ?? (odds as Record<string, unknown>).awayOdds ?? 0),
        }
      : undefined;
  return {
    matchId,
    homeTeam: participant1IsHome === false ? String(away) : String(home),
    awayTeam: participant1IsHome === false ? String(home) : String(away),
    status: normalizeTxlineStatus(raw.status ?? raw.matchStatus ?? raw.state),
    startsAt: Number.isFinite(txlineStartTime) ? new Date(txlineStartTime).toISOString() : String(raw.startsAt ?? raw.starts_at ?? raw.kickoff ?? raw.startTime ?? new Date().toISOString()),
    updatedAt,
    score: {
      home: Number.isFinite(homeScore) ? homeScore : 0,
      away: Number.isFinite(awayScore) ? awayScore : 0,
    },
    oddsSnapshot,
    txlineProofHash:
      typeof raw.txlineProofHash === "string"
        ? raw.txlineProofHash
        : typeof raw.proofHash === "string"
          ? raw.proofHash
          : typeof raw.merkleRoot === "string"
            ? raw.merkleRoot
            : undefined,
    rawSource: "live-txline-provider",
  };
}

function extractTxlineMatchArray(payload: unknown): TxlineMatch[] {
  const candidate =
    Array.isArray(payload)
      ? payload
      : payload && typeof payload === "object" && Array.isArray((payload as Record<string, unknown>).matches)
        ? (payload as Record<string, unknown>).matches
        : payload && typeof payload === "object" && Array.isArray((payload as Record<string, unknown>).fixtures)
          ? (payload as Record<string, unknown>).fixtures
          : payload && typeof payload === "object" && Array.isArray((payload as Record<string, unknown>).data)
            ? (payload as Record<string, unknown>).data
            : [];
  return (candidate as unknown[])
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    .map(normalizeTxlineMatch);
}

function recentTxlineFixtureUpdatePaths() {
  const now = new Date();
  return Array.from({ length: 24 }, (_, index) => {
    const at = new Date(now.getTime() - index * 60 * 60 * 1000);
    const epochDay = Math.floor(at.getTime() / 86_400_000);
    return `/api/fixtures/updates/${epochDay}/${at.getUTCHours()}`;
  });
}

function txlineEpochDayAndHourFromIso(value: string) {
  const date = new Date(value);
  const safe = Number.isNaN(date.getTime()) ? new Date() : date;
  return {
    epochDay: Math.floor(safe.getTime() / 86_400_000),
    hourOfDay: safe.getUTCHours(),
  };
}

async function fetchTxlineJson(pathname: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.TXLINE_HTTP_TIMEOUT_MS || 8_000));
  try {
    const response = await fetch(`${txlineApiBase}${pathname}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${txlineSessionJwt}`,
        "X-Api-Token": txlineApiToken,
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`TxLINE ${pathname} returned HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function startTxlineGuestSession() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.TXLINE_HTTP_TIMEOUT_MS || 8_000));
  try {
    const response = await fetch(txlineGuestAuthUrl, {
      method: "POST",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? ((await response.json()) as Record<string, unknown>)
      : { token: await response.text() };
    if (!response.ok) {
      throw new Error(`TxLINE guest auth returned HTTP ${response.status}`);
    }
    return {
      ok: true,
      source: "privatedao-txline-free-api-start",
      status: "guest-session-issued",
      txlineApiBase,
      guestAuthUrl: txlineGuestAuthUrl,
      expiresIn: "TxLINE guest JWT expires after 30 days.",
      nextStep:
        "Create the free World Cup subscription on-chain, sign the activation message with the same wallet, then set the returned API token as TXLINE_API_TOKEN.",
      token: typeof payload?.token === "string" ? payload.token : String(payload?.token || ""),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function getTxlineMatches(): Promise<{ providerMode: TxlineProviderMode; matches: TxlineMatch[]; source: string; note: string }> {
  if (!txlineApiToken || !txlineSessionJwt) {
    const missing = [!txlineSessionJwt ? "TXLINE_SESSION_JWT" : "", !txlineApiToken ? "TXLINE_API_TOKEN" : ""].filter(Boolean).join(" and ");
    return {
      providerMode: "simulated-txline-provider",
      matches: buildSimulatedTxlineMatches(),
      source: "simulated-txline-provider",
      note: `${missing} not configured, so this endpoint returns clearly labeled simulated World Cup data. TxLINE live data requires a guest JWT plus the activated long-lived API token.`,
    };
  }

  const fixtureQuery = new URLSearchParams();
  if (txlineCompetitionId) fixtureQuery.set("competitionId", txlineCompetitionId);
  const paths = [
    `/api/fixtures/snapshot${fixtureQuery.toString() ? `?${fixtureQuery.toString()}` : ""}`,
    `/api/fixtures/snapshot`,
    ...recentTxlineFixtureUpdatePaths(),
  ];
  const errors: string[] = [];
  for (const path of paths) {
    try {
      const payload = await fetchTxlineJson(path);
      const matches = extractTxlineMatchArray(payload);
      if (matches.length > 0) {
        return {
          providerMode: "live-txline-provider",
          matches,
          source: `${txlineApiBase}${path}`,
          note: "TxLINE guest JWT and activated API token are configured. Fixtures are fetched from the documented TxLINE snapshot endpoint.",
        };
      }
      errors.push(`${path}: no matches in response`);
    } catch (error) {
      errors.push(`${path}: ${String((error as Error)?.message || error)}`);
    }
  }
  return {
    providerMode: "live-txline-provider",
    matches: [],
    source: txlineApiBase,
    note: `TxLINE credentials are configured, but no supported snapshot endpoint returned usable fixture data. ${errors.slice(0, 3).join(" | ")}`,
  };
}

async function fetchTxlineFixtureBatchProofHash(match: TxlineMatch) {
  if (!txlineApiToken || !txlineSessionJwt) return match.txlineProofHash;
  const hashes: Record<string, string> = {
    scoreStatValidationStatus: txlineScoreStatKey ? "configured" : "not-configured",
  };
  if (txlineScoreStatKey) {
    const params = new URLSearchParams({
      fixtureId: match.matchId,
      statKey: txlineScoreStatKey,
    });
    if (txlineScoreStatKey2) params.set("statKey2", txlineScoreStatKey2);
    try {
      const payload = await fetchTxlineJson(`/api/scores/stat-validation?${params.toString()}`);
      hashes.scoreStatValidation = txlineSha256StableJsonHex({
        endpoint: "/api/scores/stat-validation",
        fixtureId: match.matchId,
        statKey: txlineScoreStatKey,
        statKey2: txlineScoreStatKey2 || null,
        payload,
      });
    } catch {
      hashes.scoreStatValidationStatus = "configured-unavailable";
    }
  }
  try {
    const payload = await fetchTxlineJson(`/api/scores/snapshot/${encodeURIComponent(match.matchId)}`);
    hashes.scoreSnapshot = txlineSha256StableJsonHex({
      endpoint: "/api/scores/snapshot/{fixtureId}",
      fixtureId: match.matchId,
      payload,
    });
  } catch {
    // Scores may be unavailable for scheduled or unsupported fixtures. Batch validation remains the stronger source when present.
  }
  return Object.keys(hashes).length > 0 ? txlineSha256StableJsonHex(hashes) : match.txlineProofHash;
}

function addTxlineHoursIso(base: Date, hours: number) {
  return new Date(base.getTime() + hours * 60 * 60 * 1000).toISOString();
}

function txlineSettlementPrivateInputs(match: TxlineMatch, marketId: string): BlindPolicyPrivateInputs {
  const winner = resolveTxlineWinner(match);
  const snapshotSeed = Number.parseInt(buildTxlineSnapshotHash(match).slice(0, 6), 16);
  const base = 8_200 + (snapshotSeed % 1_200);
  return {
    organizationId: `txline:${match.matchId}:${winner}`,
    subjectId: `market:${marketId}`,
    membershipVerified: match.status === "final",
    records: [{ amountUsd: base }, { amountUsd: base + 420 }, { amountUsd: base + 760 }],
    riskScore: 88,
    liabilitiesUsd: 500,
  };
}

async function handleTxlineSettlementResolve(body: Record<string, unknown>) {
  const matchesResult = await getTxlineMatches();
  const matchId = stringField(body, "matchId", matchesResult.matches[0]?.matchId || "");
  const marketId = stringField(body, "marketId", `worldcup-market-${matchId || "demo"}`);
  const match = matchesResult.matches.find((entry) => entry.matchId === matchId) ?? matchesResult.matches[0];
  if (!match) {
    return {
      ok: false,
      source: "privatedao-txline-settlement",
      providerMode: matchesResult.providerMode,
      status: "no-match-available",
      error: "No TxLINE match is available to resolve.",
    };
  }
  if (match.status !== "final") {
    return {
      ok: false,
      source: "privatedao-txline-settlement",
      providerMode: matchesResult.providerMode,
      status: "unsupported-match-status",
      error: "Settlement proof was not issued because the match is not final.",
      match,
    };
  }

  const txlineProofHash = await fetchTxlineFixtureBatchProofHash(match);
  const proofMatch = txlineProofHash ? { ...match, txlineProofHash } : match;
  const issuedAt = new Date().toISOString();
  const nonce = txlineSha256StableJsonHex({ matchId: proofMatch.matchId, marketId, issuedAt, providerMode: matchesResult.providerMode }).slice(0, 32);
  const proofId = stringField(body, "proofId", `txline-settlement-${nonce.slice(0, 16)}`);
  const privateInputs = txlineSettlementPrivateInputs(proofMatch, marketId);
  const groth16 = await buildGroth16BlindPolicyProof(privateInputs, txlineSettlementPolicyVersion);
  const txlineSnapshotHash = buildTxlineSnapshotHash(proofMatch);
  const settlementPolicyCommitment = txlineSha256StableJsonHex({
    policy: "private-txline-match-settlement",
    policyVersion: txlineSettlementPolicyVersion,
    rulesHidden: true,
    txlineSnapshotHash,
    marketId,
  });
  const inputCommitment = txlineSha256StableJsonHex({
    matchId: proofMatch.matchId,
    marketId,
    providerMode: matchesResult.providerMode,
    txlineSnapshotHash,
    blindPolicyInputCommitment: groth16.inputCommitment,
  });
  const publicProofPackage = buildTxlineSettlementProofPackage({
    proofId,
    nonce,
    match: proofMatch,
    marketId,
    providerMode: matchesResult.providerMode,
    issuedAt,
    expiresAt: addTxlineHoursIso(new Date(issuedAt), 24),
    settlementPolicyCommitment,
    inputCommitment,
    groth16Proof: groth16.groth16Proof,
    policyVersion: txlineSettlementPolicyVersion,
  });
  const verification = verifyTxlineSettlementProofPackage(publicProofPackage);
  if (!verification.ok) throw new Error(`Settlement verification failed: ${verification.message}`);
  return {
    ok: true,
    source: "privatedao-txline-settlement",
    providerMode: matchesResult.providerMode,
    providerSource: matchesResult.source,
    status: "settlement-proof-issued",
    match: proofMatch,
    marketId,
    winner: resolveTxlineWinner(match),
    txlineSnapshotHash,
    proofHash: publicProofPackage.originalProofHash,
    publicProofPackage,
    verification,
    privateSettlementLogicHidden: true,
    explanation:
      "TxLINE provides the match result snapshot. PrivateDAO binds that snapshot to a hidden settlement policy, verifies a Groth16 proof, and emits a public receipt package.",
  };
}

function verifyTxlineGroth16ProofPackage(proofPackage: TxlineSettlementProofPackage) {
  const verificationKey = zkArtifactPath("zk/setup/private_dao_blind_policy_overlay_vkey.json");
  const tempDir = mkdtempSync(join(tmpdir(), "privatedao-txline-settlement-verify-"));
  const proofPath = join(tempDir, "proof.json");
  const publicPath = join(tempDir, "public.json");
  writeFileSync(proofPath, JSON.stringify(proofPackage.groth16Proof.proof, null, 2), "utf8");
  writeFileSync(publicPath, JSON.stringify(proofPackage.groth16Proof.publicSignals, null, 2), "utf8");
  execFileSync("npx", ["snarkjs", "groth16", "verify", verificationKey, publicPath, proofPath], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
}

function verifyTxlineSettlementWithGroth16(value: unknown) {
  const verification = verifyTxlineSettlementProofPackage(value);
  if (!verification.ok) return verification;
  try {
    const proofPackage = value as TxlineSettlementProofPackage;
    verifyTxlineGroth16ProofPackage(proofPackage);
    return {
      ...verification,
      message: "Verified. TxLINE settlement package hash and Groth16 proof both match.",
    };
  } catch (error) {
    return {
      ok: false,
      status: "invalid-proof-package",
      match: false,
      originalHash: verification.originalHash,
      recomputedHash: verification.recomputedHash,
      message: `Groth16 verification failed: ${String((error as Error)?.message || error)}`,
    } as const;
  }
}

function txlineSettlementCluster() {
  const raw = (process.env.TXLINE_SETTLEMENT_ONCHAIN_CLUSTER || process.env.SOLANA_CLUSTER || "mainnet-beta").trim().toLowerCase();
  if (raw === "mainnet" || raw === "mainnet-beta") return "mainnet-beta";
  if (raw === "devnet") return "devnet";
  return "testnet";
}

function txlineSettlementRpcUrl() {
  const cluster = txlineSettlementCluster();
  if (process.env.TXLINE_SETTLEMENT_RPC_URL?.trim()) return process.env.TXLINE_SETTLEMENT_RPC_URL.trim();
  if (process.env.SOLANA_RPC_URL?.trim()) return process.env.SOLANA_RPC_URL.trim();
  if (cluster === "devnet") return "https://api.devnet.solana.com";
  if (cluster === "testnet") return "https://api.testnet.solana.com";
  return "https://api.mainnet-beta.solana.com";
}

async function submitTxlineSettlementReceiptOnchain(proofPackage: TxlineSettlementProofPackage) {
  const verification = verifyTxlineSettlementWithGroth16(proofPackage);
  if (!verification.ok) {
    return {
      ok: false,
      source: "privatedao-txline-settlement-receipt",
      status: verification.status,
      error: "On-chain receipt was not submitted because settlement verification failed.",
      verification,
    };
  }
  const keypair = await getFreshnessBotKeypair();
  const cluster = txlineSettlementCluster();
  const suffix = solanaExplorerSuffix(cluster);
  const connection = new Connection(txlineSettlementRpcUrl(), "confirmed");
  const memoFields = buildTxlineSettlementMemoFields(proofPackage);
  const memo = [
    memoFields.protocol,
    memoFields.proofIdHash,
    memoFields.matchIdHash,
    memoFields.marketIdHash,
    memoFields.txlineSnapshotHash,
    memoFields.settlementPolicyCommitment,
    memoFields.outcomeCommitment,
    memoFields.verificationKeyHash,
    memoFields.originalProofHash,
  ].join("|");
  const transaction = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
    new TransactionInstruction({
      keys: [{ pubkey: keypair.publicKey, isSigner: true, isWritable: true }],
      programId: memoProgramId,
      data: Buffer.from(memo, "utf8"),
    }),
  );
  const signature = await sendAndConfirmTransaction(connection, transaction, [keypair], { commitment: "confirmed" });
  return {
    ok: true,
    source: "privatedao-txline-settlement-receipt",
    status: "onchain-memo-receipt-stored",
    verification,
    onchainReceipt: {
      storageMode: "solana-memo-receipt",
      cluster,
      programId: memoProgramId.toBase58(),
      authority: keypair.publicKey.toBase58(),
      proofId: proofPackage.proofId,
      proofIdHash: memoFields.proofIdHash,
      matchIdHash: memoFields.matchIdHash,
      marketIdHash: memoFields.marketIdHash,
      txlineSnapshotHash: memoFields.txlineSnapshotHash,
      settlementPolicyCommitment: memoFields.settlementPolicyCommitment,
      outcomeCommitment: memoFields.outcomeCommitment,
      verificationKeyHash: memoFields.verificationKeyHash,
      originalProofHash: memoFields.originalProofHash,
      signature,
      transactionExplorerUrl: `https://explorer.solana.com/tx/${signature}${suffix}`,
    },
  };
}

async function handleBlindPolicyWorkflow(body: Record<string, unknown>) {
  const workflowId = stringField(body, "workflowId", `blind_policy_${sha256StableJsonHex({ body, at: Date.now() }).slice(0, 24)}`);
  const policyVersion = stringField(body, "policyVersion", blindPolicyRules.policyVersion);
  const privateInputs = normalizeBlindPolicyInputs(body.privateInputs ?? body);
  const evaluation = evaluateBlindPolicy(privateInputs);
  if (evaluation.validationErrors.length > 0) {
    return {
      ok: false,
      source: "privatedao-blind-policy-verification",
      status: "policy-not-satisfied",
      error: "Proof was not issued because the private policy was not satisfied.",
      workflowId,
      publicOutcome: "proof-not-issued",
      validationErrors: evaluation.validationErrors,
      privateDataExcluded: [
        "raw subject identity",
        "private record values",
        "risk score",
        "liabilities",
        "policy thresholds",
        "internal policy formula",
      ],
    };
  }
  const groth16 = await buildGroth16BlindPolicyProof(privateInputs, policyVersion);
  const issuedAt = new Date().toISOString();
  const nonce = sha256StableJsonHex({ workflowId, policyVersion, issuedAt, privateInputs }).slice(0, 32);
  const publicProofPackage = buildBlindPolicyPublicProofPackage({
    proofId: stringField(body, "proofId", `blind-policy-${nonce.slice(0, 16)}`),
    nonce,
    issuedAt,
    expiresAt: addHoursIso(new Date(issuedAt), 24),
    policyVersion,
    workflowId,
    policyCommitment: groth16.policyCommitment,
    inputCommitment: groth16.inputCommitment,
    groth16Proof: groth16.groth16Proof,
  });
  const verification = verifyBlindPolicyProofPackage(publicProofPackage);
  if (!verification.ok) throw new Error(`Groth16 verification failed: ${verification.message}`);
  return {
    ok: true,
    source: "privatedao-blind-policy-verification",
    status: "proof-issued",
    workflowId,
    publicOutcome: "policy-satisfied",
    decision: publicProofPackage.decision,
    proofHash: publicProofPackage.originalProofHash,
    publicProofPackage,
    verification,
    privateDataExcluded: publicProofPackage.valuesUsedButNotRevealed,
    explanation:
      "Private inputs are used inside the Groth16 witness. Public signals expose only policy id, policy commitment, input commitment, and satisfied claim.",
  };
}

function assertAllowedCustomerDataUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Customer data URL must use http or https.");
  }
  if (isPrivateHostname(url.hostname)) {
    throw new Error("Customer data URL cannot point to localhost or a private network host.");
  }
  return url;
}

async function fetchCustomerDataUrl(value: string): Promise<{ data: CreditLimitCustomerData; source: Record<string, unknown> }> {
  const url = assertAllowedCustomerDataUrl(value);
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "PrivateDAO-ProofWorkflow/1.0",
    },
    redirect: "follow",
  });
  const contentType = response.headers.get("content-type") || "";
  const raw = await response.text();
  if (!response.ok) throw new Error(`Customer data endpoint returned HTTP ${response.status}.`);
  if (raw.length > 64_000) throw new Error("Customer data response exceeds 64KB limit.");
  if (!contentType.includes("json") && !raw.trim().startsWith("{")) {
    throw new Error("Customer data endpoint must return a JSON object.");
  }
  const parsed = parseJsonObject(raw, "Customer data response") as CreditLimitCustomerData;
  return {
    data: parsed,
    source: {
      mode: "url",
      host: url.host,
      path: url.pathname,
      status: response.status,
      contentType,
    },
  };
}

function numericValues(values: unknown[]) {
  return values.filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0);
}

function normalizeCreditLimitData(data: CreditLimitCustomerData) {
  const direct = numericValues([data.monthlyEarnings, data.earningsMonthly, data.revenueMonthly]);
  const payouts = numericValues(
    (Array.isArray(data.payouts) ? data.payouts : []).flatMap((item) => [
      item.amountUsd,
      item.amount,
      typeof item.cents === "number" ? item.cents / 100 : undefined,
    ]),
  );
  const transactions = numericValues(
    (Array.isArray(data.transactions) ? data.transactions : []).flatMap((item) => [
      item.amountUsd,
      item.amount,
      typeof item.cents === "number" ? item.cents / 100 : undefined,
    ]),
  );
  const samples = [...direct, ...payouts, ...transactions];
  const averageMonthlyEarnings = samples.length
    ? Number((samples.reduce((sum, value) => sum + value, 0) / samples.length).toFixed(2))
    : 0;
  const riskScore = typeof data.riskScore === "number" && Number.isFinite(data.riskScore) ? Math.max(0, Math.min(100, data.riskScore)) : 70;
  return {
    customerIdCommitment: sha256JsonHex(String(data.customerId || "anonymous-customer")).slice(0, 32),
    proMembership: data.proMembership === true,
    averageMonthlyEarnings,
    riskScore,
    sampleCount: samples.length,
    currency: typeof data.currency === "string" && data.currency.trim() ? data.currency.trim().toUpperCase() : "USD",
  };
}

function calculateCreditLimit(normalized: ReturnType<typeof normalizeCreditLimitData>, policyInput?: CreditLimitPolicy) {
  const policy = {
    advanceRate: Math.max(0.01, Math.min(0.75, Number(policyInput?.advanceRate ?? 0.25))),
    maxLimitUsd: Math.max(100, Number(policyInput?.maxLimitUsd ?? 5000)),
    minLimitUsd: Math.max(0, Number(policyInput?.minLimitUsd ?? 100)),
    riskFloor: Math.max(0, Math.min(100, Number(policyInput?.riskFloor ?? 55))),
    roundToUsd: Math.max(1, Number(policyInput?.roundToUsd ?? 50)),
  };
  const eligible =
    normalized.proMembership &&
    normalized.sampleCount > 0 &&
    normalized.averageMonthlyEarnings > 0 &&
    normalized.riskScore >= policy.riskFloor;
  const rawLimit = eligible ? Math.min(policy.maxLimitUsd, normalized.averageMonthlyEarnings * policy.advanceRate) : 0;
  const issuedCreditLimitUsd = eligible ? Math.max(policy.minLimitUsd, Math.floor(rawLimit / policy.roundToUsd) * policy.roundToUsd) : 0;
  return {
    policy,
    eligible,
    issuedCreditLimitUsd,
    publicOutcome: eligible ? "credit-limit-issued" : "not-eligible",
  };
}

async function handleCreditLimitWorkflow(body: Record<string, unknown>) {
  const workflowId = stringField(body, "workflowId", `pwf_${sha256JsonHex({ body, at: Date.now() }).slice(0, 24)}`);
  const connectorUrl = stringField(body, "customerDataUrl", "");
  const directData =
    body.customerData && typeof body.customerData === "object" && !Array.isArray(body.customerData)
      ? (body.customerData as CreditLimitCustomerData)
      : "customerId" in body || "monthlyEarnings" in body || "payouts" in body
        ? (body as CreditLimitCustomerData)
        : null;
  if (!connectorUrl && !directData) {
    throw new Error("customerDataUrl, customerData JSON, or direct customer JSON is required.");
  }
  const imported = connectorUrl
    ? await fetchCustomerDataUrl(connectorUrl)
    : {
        data: directData as CreditLimitCustomerData,
        source: { mode: "direct-json" },
      };
  const policy = body.policy && typeof body.policy === "object" && !Array.isArray(body.policy) ? (body.policy as CreditLimitPolicy) : undefined;
  const importedAt = new Date().toISOString();
  const sourceDigest = sha256JsonHex(imported.data);
  const normalized = normalizeCreditLimitData(imported.data);
  const calculation = calculateCreditLimit(normalized, policy);
  const normalizedDigest = sha256JsonHex(normalized);
  const policyDigest = sha256JsonHex(calculation.policy);
  const calculationDigest = sha256JsonHex({
    workflowId,
    normalizedDigest,
    policyDigest,
    publicOutcome: calculation.publicOutcome,
    issuedCreditLimitUsd: calculation.issuedCreditLimitUsd,
  });
  const validationErrors = [
    ...(normalized.proMembership ? [] : ["Membership is not verified."]),
    ...(normalized.sampleCount > 0 ? [] : ["No earnings or payout records were imported."]),
    ...(normalized.averageMonthlyEarnings > 0 ? [] : ["Imported earnings are zero or invalid."]),
    ...(normalized.riskScore >= calculation.policy.riskFloor
      ? []
      : [`Risk score is below policy floor ${calculation.policy.riskFloor}.`]),
  ];

  if (validationErrors.length > 0 || !calculation.eligible) {
    return {
      ok: false,
      source: "privatedao-proof-workflows-credit-limit",
      status: "validation-failed",
      error: "Proof was not issued because the customer data failed validation.",
      workflowId,
      importedAt,
      dataSource: imported.source,
      publicOutcome: "proof-not-issued",
      issuedCreditLimitUsd: 0,
      currency: normalized.currency,
      validationErrors,
      stageResults: [
        {
          id: "membership-verification",
          label: "Verify Pro Membership",
          status: normalized.proMembership ? "completed" : "failed",
        },
        {
          id: "earnings-validation",
          label: "Import Earnings",
          status: normalized.sampleCount > 0 ? "completed" : "failed",
        },
        {
          id: "threshold-calculation",
          label: "Calculate Threshold",
          status:
            normalized.sampleCount > 0 &&
            normalized.averageMonthlyEarnings > 0 &&
            normalized.riskScore >= calculation.policy.riskFloor
              ? "completed"
              : "failed",
        },
        {
          id: "limit-issuance",
          label: "Issue Credit Limit",
          status: "blocked",
        },
        {
          id: "proof-generation",
          label: "Generate Proof",
          status: "blocked",
        },
      ],
      verification: {
        processExisted: true,
        processCompleted: false,
        requiredApprovalsHappened: false,
        requiredSequenceRespected: false,
        dataSourceDigest: sourceDigest,
        normalizedMetricsDigest: normalizedDigest,
        policyDigest,
        calculationDigest,
      },
      publicMetrics: {
        sampleCount: normalized.sampleCount,
        proMembershipVerified: normalized.proMembership,
        riskBand: normalized.riskScore >= 80 ? "strong" : normalized.riskScore >= 55 ? "acceptable" : "below-policy",
      },
      privateDataExcluded: [
        "raw customer id",
        "raw earnings",
        "raw payout records",
        "raw transactions",
        "internal threshold formula inputs",
      ],
    };
  }

  const stages = [
    {
      id: "membership-verification",
      label: "Verify Pro Membership",
      status: normalized.proMembership ? "completed" : "failed",
      proofHash: sha256JsonHex({ workflowId, stage: "membership-verification", proMembership: normalized.proMembership, sourceDigest }),
    },
    {
      id: "earnings-validation",
      label: "Import Earnings",
      status: normalized.sampleCount > 0 ? "completed" : "failed",
      proofHash: sha256JsonHex({ workflowId, stage: "earnings-validation", normalizedDigest, sourceDigest }),
    },
    {
      id: "threshold-calculation",
      label: "Calculate Threshold",
      status: normalized.sampleCount > 0 ? "completed" : "failed",
      proofHash: sha256JsonHex({ workflowId, stage: "threshold-calculation", normalizedDigest, policyDigest }),
    },
    {
      id: "limit-issuance",
      label: "Issue Credit Limit",
      status: calculation.eligible ? "completed" : "not-issued",
      proofHash: sha256JsonHex({ workflowId, stage: "limit-issuance", calculationDigest }),
    },
    {
      id: "proof-generation",
      label: "Generate Proof",
      status: "completed",
      proofHash: sha256JsonHex({ workflowId, stage: "proof-generation", sourceDigest, normalizedDigest, policyDigest, calculationDigest }),
    },
  ];
  const proofHash = sha256JsonHex({
    workflowId,
    importedAt,
    sourceDigest,
    normalizedDigest,
    policyDigest,
    calculationDigest,
    stageProofs: stages.map((stage) => stage.proofHash),
  });
  const publicMetrics = {
    sampleCount: normalized.sampleCount,
    proMembershipVerified: normalized.proMembership,
    riskBand: normalized.riskScore >= 80 ? "strong" : normalized.riskScore >= 55 ? "acceptable" : "below-policy",
  };
  const publicProofPackage = buildCreditLimitPublicProofPackage({
    proofId: "demo-proof-id",
    workflowId,
    issuedLimitUsd: calculation.issuedCreditLimitUsd,
    currency: normalized.currency,
    stages,
    publicMetrics: {
      proMembershipVerified: publicMetrics.proMembershipVerified,
      importedRecordCount: publicMetrics.sampleCount,
      riskBand: publicMetrics.riskBand,
    },
  });
  return {
    ok: true,
    source: "privatedao-proof-workflows-credit-limit",
    status: "completed",
    workflowId,
    importedAt,
    dataSource: imported.source,
    publicOutcome: calculation.publicOutcome,
    issuedCreditLimitUsd: calculation.issuedCreditLimitUsd,
    currency: normalized.currency,
    decisionSummary: {
      title: "Credit limit approved",
      message: `PrivateDAO verified membership, imported ${normalized.sampleCount} earnings record${normalized.sampleCount === 1 ? "" : "s"}, applied the policy, and issued a ${calculation.issuedCreditLimitUsd} ${normalized.currency} credit limit.`,
      customerBenefit: "The customer receives a usable decision and public verification proof without exposing raw earnings, payout records, or internal underwriting thresholds.",
    },
    resultBasis: {
      proMembershipVerified: normalized.proMembership,
      importedRecordCount: normalized.sampleCount,
      riskBand: normalized.riskScore >= 80 ? "strong" : normalized.riskScore >= 55 ? "acceptable" : "below-policy",
      policy: {
        advanceRate: calculation.policy.advanceRate,
        maxLimitUsd: calculation.policy.maxLimitUsd,
        minLimitUsd: calculation.policy.minLimitUsd,
        riskFloor: calculation.policy.riskFloor,
        roundToUsd: calculation.policy.roundToUsd,
      },
    },
    proofHash,
    proofUrl: "https://privatedao.org/proof-workflows/verify/demo-proof-id",
    publicProofPackage,
    proofPackage: publicProofPackage,
    stageProofs: stages,
    verification: {
      processExisted: true,
      processCompleted: true,
      requiredApprovalsHappened: true,
      requiredSequenceRespected: true,
      dataSourceDigest: sourceDigest,
      normalizedMetricsDigest: normalizedDigest,
      policyDigest,
      calculationDigest,
    },
    publicMetrics,
    privateDataExcluded: [
      "raw customer id",
      "raw earnings",
      "raw payout records",
      "raw transactions",
      "internal threshold formula inputs",
    ],
  };
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

async function supabaseSelectPaged<T>(table: string, query: string, pageSize = 1000, maxRows = 20000) {
  if (!hasSupabaseRestConfig()) return [] as T[];
  const rows: T[] = [];
  for (let from = 0; from < maxRows; from += pageSize) {
    const to = from + pageSize - 1;
    const response = await fetch(`${supabaseUrl}/rest/v1/${table}${query}`, {
      method: "GET",
      headers: supabaseHeaders({
        Range: `${from}-${to}`,
      }),
    });
    if (!response.ok) return rows;
    const raw = (await response.json().catch(() => [])) as unknown;
    const page = Array.isArray(raw) ? (raw as T[]) : [];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
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
  const secretId = process.env.PRIVATE_DAO_FRESHNESS_BOT_SECRET_ID?.trim();
  let secretValue = "";
  if (secretId) {
    try {
      const client = new SecretsManagerClient({ region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "eu-north-1" });
      const response = await client.send(new GetSecretValueCommand({ SecretId: secretId }));
      secretValue = response.SecretString?.trim() || (response.SecretBinary ? Buffer.from(response.SecretBinary as Uint8Array).toString("utf8").trim() : "");
    } catch {
      throw new Error("Freshness bot Secrets Manager secret could not be read by the instance role.");
    }
  }
  const raw = jsonValue || secretValue || (keypairPath ? await readFile(keypairPath, "utf8") : "");
  if (!raw) {
    throw new Error("Freshness bot signer is not configured.");
  }
  const decoded = JSON.parse(raw) as unknown;
  const parsed = Array.isArray(decoded) ? decoded : (decoded && typeof decoded === "object" && "keypair" in decoded ? (decoded as { keypair: unknown }).keypair : decoded && typeof decoded === "object" && "secretKey" in decoded ? (decoded as { secretKey: unknown }).secretKey : decoded);
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "number")) {
    throw new Error("Freshness bot secret must contain a JSON number array or {keypair:[...]}.");
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

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(object[key])}`)
    .join(",")}}`;
}

function matrixAnchorOperatorToken(req: http.IncomingMessage) {
  const bearer = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  const privateDaoToken = String(req.headers["x-private-dao-operator-token"] || "").trim();
  const anchorToken = String(req.headers["x-private-dao-anchor-token"] || "").trim();
  return bearer || privateDaoToken || anchorToken;
}

function requireMatrixAnchorAuth(req: http.IncomingMessage) {
  const acceptedTokens = [
    process.env.PRIVATE_DAO_MATRIX_ANCHOR_TOKEN,
    process.env.PRIVATE_DAO_OPERATOR_TOKEN,
    process.env.QUICKNODE_STREAM_TOKEN,
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  if (!acceptedTokens.length) {
    return { ok: false, status: 503, error: "Matrix anchor operator token is not configured." };
  }
  const provided = matrixAnchorOperatorToken(req);
  const matched = acceptedTokens.some((token) => {
    const providedBuffer = Buffer.from(provided);
    const tokenBuffer = Buffer.from(token);
    return providedBuffer.length === tokenBuffer.length && timingSafeEqual(providedBuffer, tokenBuffer);
  });
  return matched ? { ok: true } : { ok: false, status: 401, error: "Unauthorized matrix anchor request." };
}

function buildIntegrationMatrixAnchorSnapshot() {
  const anchoredAt = new Date().toISOString();
  const matrix = privacyExecutionMatrixStatus();
  const crypto = cryptographicReadinessStatus();
  const providers = providerIntegrationStatus();
  const quickNodeStream = quickNodeStreamStats();
  const snapshot = {
    protocol: "PDAO_INTEGRATION_MATRIX_ANCHOR_V1",
    anchoredAt,
    cluster: "testnet",
    programId: matrix.programId,
    matrix,
    cryptographicReadiness: crypto,
    providerIntegrations: providers,
    quickNodeStream,
  };
  const digest = createHash("sha256").update(stableJson(snapshot)).digest("hex");
  return { anchoredAt, digest, snapshot };
}

function latestMatrixAnchorFromRow(row: OperationExecutionEventRow | null) {
  if (!row) return null;
  const metadata = row.metadata || {};
  const tx = row.receipt_hash || "";
  return {
    ok: true,
    operationId: row.operation_id,
    label: row.operation_label,
    status: row.status,
    source: row.source,
    tx,
    slot: typeof metadata.slot === "number" ? metadata.slot : null,
    digest: typeof metadata.digest === "string" ? metadata.digest : null,
    anchoredAt: row.created_at || (typeof metadata.anchoredAt === "string" ? metadata.anchoredAt : null),
    programId: typeof metadata.programId === "string" ? metadata.programId : null,
    memo: typeof metadata.memo === "string" ? metadata.memo : null,
    explorer: tx ? `https://explorer.solana.com/tx/${tx}?cluster=testnet` : null,
    solscan: tx ? `https://solscan.io/tx/${tx}?cluster=testnet` : null,
  };
}

async function latestIntegrationMatrixAnchor() {
  const rows = await supabaseSelect<OperationExecutionEventRow>(
    "operation_execution_events",
    "?select=operation_id,operation_label,session_id,page,status,source,receipt_hash,network,metadata,created_at&operation_id=eq.integration-matrix-anchor&order=created_at.desc&limit=1",
  );
  if (rows[0]) {
    lastIntegrationMatrixAnchorMemory = rows[0];
    return rows[0];
  }
  return lastIntegrationMatrixAnchorMemory;
}

async function handleIntegrationMatrixAnchor(body: Record<string, unknown>) {
  const latest = await latestIntegrationMatrixAnchor();
  const nowMs = Date.now();
  if (latest?.created_at && nowMs - new Date(latest.created_at).getTime() < matrixAnchorMinIntervalMs) {
    return {
      ok: true,
      throttled: true,
      source: "latest-anchor",
      latest: latestMatrixAnchorFromRow(latest),
      minIntervalMs: matrixAnchorMinIntervalMs,
    };
  }

  const keypair = await getFreshnessBotKeypair();
  const connection = new Connection(process.env.SOLANA_RPC_URL || "https://api.testnet.solana.com", "confirmed");
  const { anchoredAt, digest, snapshot } = buildIntegrationMatrixAnchorSnapshot();
  const memo = `PrivateDAO integration-matrix-anchor v1 | sha256:${digest} | ${anchoredAt}`;
  const transaction = new Transaction().add(
    new TransactionInstruction({
      keys: [{ pubkey: keypair.publicKey, isSigner: true, isWritable: true }],
      programId: memoProgramId,
      data: Buffer.from(memo, "utf8"),
    }),
  );
  const tx = await sendAndConfirmTransaction(connection, transaction, [keypair], {
    commitment: "confirmed",
  });
  const parsed = await connection
    .getParsedTransaction(tx, { commitment: "confirmed", maxSupportedTransactionVersion: 0 })
    .catch(() => null);
  const slot = parsed?.slot ?? (await connection.getSlot("confirmed"));
  const row: OperationExecutionEventRow = {
    operation_id: "integration-matrix-anchor",
    operation_label: "Integration matrix anchored on Solana Testnet",
    session_id: hashVisitorSession(stringField(body, "sessionId", `matrix-anchor:${anchoredAt}`)),
    page: "/api/v1/integration-matrix/anchor",
    status: "success",
    source: stringField(body, "source", "read-node-operator").slice(0, 80) || "read-node-operator",
    receipt_hash: tx,
    network: "solana-testnet",
    metadata: {
      protocol: snapshot.protocol,
      digest,
      anchoredAt,
      slot,
      programId: readNode.programId.toBase58(),
      memo,
      explorer: `https://explorer.solana.com/tx/${tx}?cluster=testnet`,
      solscan: `https://solscan.io/tx/${tx}?cluster=testnet`,
      quickNodePrivateDaoProgramReference: true,
      matrixServiceCount: snapshot.matrix.serviceMatrix.length,
      providerCount: Object.keys(snapshot.providerIntegrations.providers).length,
    },
    created_at: anchoredAt,
  };
  lastIntegrationMatrixAnchorMemory = row;
  executionEventsMemory.push(row);
  if (executionEventsMemory.length > 10000) executionEventsMemory.shift();
  const stored = await supabaseInsert("operation_execution_events", row as SupabaseRow);
  return {
    ok: true,
    throttled: false,
    source: stored.ok ? "supabase" : "memory-fallback",
    latest: latestMatrixAnchorFromRow(row),
    stored,
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
  const persistKey = `${row.session_id}:${page}`;
  const now = Date.now();
  const lastPersisted = visitorSupabaseWrites.get(persistKey) || 0;
  const shouldPersist = now - lastPersisted >= visitorSupabaseMinIntervalMs;
  const stored = shouldPersist ? await supabaseInsert("visitor_sessions", row) : { ok: true, skipped: true };
  if (shouldPersist && stored.ok) visitorSupabaseWrites.set(persistKey, now);
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
  return {
    ok: true,
    source: stored.ok ? (shouldPersist ? "supabase" : "memory-throttled") : "memory-fallback",
    session: row.session_id.slice(0, 12),
    page,
  };
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
  const action =
    visitorTransactionActions.has(requestedAction) || requestedAction.startsWith("privacy-execution-claim:")
      ? requestedAction
      : "testnet-transaction";
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
  return new Connection(
    process.env.SOLANA_TESTNET_RPC_URL ||
      process.env.SOLANA_RPC_URL ||
      "https://solana-testnet-rpc.publicnode.com",
    "confirmed",
  );
}

async function fetchWalletRuntimePreview(walletAddress: string, chainName: string) {
  try {
    const connection = getRuntimeConnection(chainName);
    const owner = new PublicKey(walletAddress);
    const [balanceLamports, signatures] = await Promise.all([
      connection.getBalance(owner, "confirmed"),
      connection.getSignaturesForAddress(owner, { limit: 8 }, "confirmed"),
    ]);
    const tokenAccounts = await connection
      .getParsedTokenAccountsByOwner(
        owner,
        { programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") },
        "confirmed",
      )
      .catch(() => ({ value: [] }));
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

async function handlePilotRequest(body: Record<string, unknown>, req: http.IncomingMessage) {
  const name = stringField(body, "name").slice(0, 120);
  const company = stringField(body, "company").slice(0, 160);
  const role = stringField(body, "role").slice(0, 120);
  const email = stringField(body, "email").slice(0, 160);
  const organizationSize = stringField(body, "organizationSize", "unknown").slice(0, 80);
  const productInterest = stringField(body, "productInterest", "Proof Workflows").slice(0, 80);
  const deploymentPreference = stringField(body, "deploymentPreference", "Cloud").slice(0, 80);
  const message = stringField(body, "message").slice(0, 2000);

  if (!name) throw new Error("name is required.");
  if (!company) throw new Error("company is required.");
  if (!role) throw new Error("role is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("valid email is required.");

  const createdAt = new Date().toISOString();
  const requestId = sha256Hex([name, company, email, productInterest, deploymentPreference, createdAt].join(":")).slice(0, 32);
  const row: PilotRequestRow = {
    request_id: requestId,
    name,
    company,
    role,
    email,
    organization_size: organizationSize,
    product_interest: productInterest,
    deployment_preference: deploymentPreference,
    message: message || null,
    status: "new",
    source: stringField(body, "source", "privatedao-commercial-site").slice(0, 120),
    created_at: createdAt,
  };

  let stored = await supabaseInsert("pilot_requests", row as SupabaseRow);
  if (!stored.ok) {
    stored = await supabaseInsert("onboarding_requests", {
      tier: "commercial-pilot",
      profile: productInterest,
      challenges: [productInterest],
      other_challenge: message || null,
      treasury_size: "unknown",
      voting_members: organizationSize,
      monthly_decisions: "unknown",
      current_setup: [deploymentPreference],
      preferred_chain: "deployment-flexible",
      developer_context: "commercial-buyer",
      name,
      email,
      organization: company,
      website: null,
      telegram: null,
      timeline: "pilot-request",
      source: row.source,
      notes: JSON.stringify(row),
      utm_source: "commercial-product-ui",
      status: "new",
    });
  }
  if (!stored.ok) pilotRequestsMemory.unshift(row);

  void sendTelegramNotification(
    [
      "New PrivateDAO pilot request",
      `Product: ${productInterest}`,
      `Company: ${company}`,
      `Name: ${name}`,
      `Role: ${role}`,
      `Email: ${email}`,
      `Size: ${organizationSize}`,
      `Deployment: ${deploymentPreference}`,
      `Source: ${String(req.headers.origin || "direct")}`,
    ].join("\n"),
  );

  return {
    ok: true,
    source: stored.ok ? "supabase" : "memory-fallback",
    requestId,
    status: "received",
    message: "Pilot request received. PrivateDAO will follow up with a workflow mapping plan.",
  };
}

function commercialPlanFor(raw: string): {
  licenseType: Exclude<CommercialLicenseType, "TRIAL">;
  label: string;
  priceUsd: number | null;
  cadence: string;
  capacity: string[];
} {
  const licenseType = raw.toUpperCase() as Exclude<CommercialLicenseType, "TRIAL">;
  const plan = commercialPlans[licenseType];
  if (!plan) throw new Error("Unknown commercial plan.");
  return { licenseType, ...plan };
}

function commercialAssetFor(raw: string) {
  const asset = raw.toUpperCase() as CommercialPaymentAsset;
  const solanaTreasury = process.env.PD_SOLANA_TREASURY?.trim() || defaultSolanaTreasury;
  const ethereumTreasury = process.env.PD_ETHEREUM_TREASURY?.trim() || defaultEthereumTreasury;
  const bitcoinTreasury = process.env.PD_BITCOIN_TREASURY?.trim() || "";
  const zcashTreasury = process.env.PD_ZCASH_TREASURY?.trim() || "";
  const assets: Record<CommercialPaymentAsset, { label: string; network: string; treasuryAddress: string; primary: boolean }> = {
    USDC_SOL: { label: "USDC on Solana", network: "Solana", treasuryAddress: solanaTreasury, primary: true },
    PDAO_SOL: { label: "PDAO on Solana", network: "Solana", treasuryAddress: solanaTreasury, primary: true },
    USDC_ETH: { label: "USDC on Ethereum", network: "Ethereum", treasuryAddress: ethereumTreasury, primary: true },
    SOL: { label: "SOL", network: "Solana", treasuryAddress: solanaTreasury, primary: true },
    ETH: { label: "ETH", network: "Ethereum", treasuryAddress: ethereumTreasury, primary: true },
    BTC: { label: "BTC", network: "Bitcoin", treasuryAddress: bitcoinTreasury, primary: false },
    WBTC: { label: "WBTC on Ethereum", network: "Ethereum", treasuryAddress: ethereumTreasury, primary: false },
    ZEC: { label: "ZEC", network: "Zcash", treasuryAddress: zcashTreasury, primary: false },
    USDT: { label: "USDT on Ethereum", network: "Ethereum", treasuryAddress: ethereumTreasury, primary: false },
    DAI: { label: "DAI", network: "Ethereum", treasuryAddress: ethereumTreasury, primary: false },
  };
  const config = assets[asset];
  if (!config) throw new Error("Unknown payment asset.");
  if (!config.treasuryAddress) throw new Error(`${config.label} treasury address is not configured.`);
  return { asset, ...config };
}

function persistCommercialOrders() {
  mkdirSync(runtimeStateDir, { recursive: true });
  const tempPath = `${commercialOrdersPath}.tmp`;
  writeFileSync(tempPath, JSON.stringify([...commercialOrders.values()], null, 2), { mode: 0o600 });
  renameSync(tempPath, commercialOrdersPath);
}

function commercialSolanaAmount(asset: string, priceUsd: number | null, plan: string) {
  if (asset === "USDC_SOL") return { amountAtomic: String(Math.round(Number(priceUsd || 0) * 1_000_000)), amountDisplay: Number(priceUsd || 0), decimals: 6, mint: process.env.PD_SOLANA_USDC_MINT?.trim() || "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" };
  if (asset === "PDAO_SOL") {
    const decimals = Number(process.env.PD_ACCEPTED_TOKEN_DECIMALS || 0);
    const configuredAmount = Number(process.env[`PD_PLAN_${plan}_PDAO`] || 0);
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) throw new Error("PD_ACCEPTED_TOKEN_DECIMALS must be configured for PDAO payments.");
    if (!Number.isFinite(configuredAmount) || configuredAmount <= 0) throw new Error(`PD_PLAN_${plan}_PDAO must be configured before accepting PDAO payments.`);
    const amountAtomic = BigInt(Math.round(configuredAmount * 10 ** decimals));
    return { amountAtomic: amountAtomic.toString(), amountDisplay: configuredAmount, decimals, mint: process.env.PD_ACCEPTED_TOKEN_MINT?.trim() || "" };
  }
  if (asset === "SOL") {
    const solUsd = Number(process.env.PD_SOL_USD_PRICE || 0);
    if (!Number.isFinite(solUsd) || solUsd <= 0) throw new Error("PD_SOL_USD_PRICE must be configured before accepting commercial SOL payments.");
    const amountSol = Number(priceUsd || 0) / solUsd;
    return { amountAtomic: String(Math.ceil(amountSol * LAMPORTS_PER_SOL)), amountDisplay: amountSol, decimals: 9, mint: null };
  }
  throw new Error("This payment control plane currently supports only USDC_SOL and SOL with on-chain verification.");
}

async function fetchCommercialTransaction(signature: string) {
  const errors: string[] = [];
  for (const endpoint of resolveMainnetRpcEndpoints()) {
    try {
      const connection = new Connection(endpoint, "confirmed");
      const transaction = await connection.getParsedTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
      if (!transaction) { errors.push(`${endpoint}: not found`); continue; }
      const statuses = await connection.getSignatureStatuses([signature]);
      const currentSlot = await connection.getSlot("confirmed");
      const status = statuses.value[0];
      return { endpoint, transaction, confirmationStatus: status?.confirmationStatus || null, confirmations: Math.max(0, currentSlot - transaction.slot) };
    } catch (error) { errors.push(`${endpoint}: ${error instanceof Error ? error.message : "failed"}`); }
  }
  return { endpoint: "", transaction: null, confirmationStatus: null, confirmations: 0, errors };
}

function commercialMemoMatches(transaction: any, memo: string) {
  const instructions = transaction?.transaction?.message?.instructions || [];
  return instructions.some((instruction: any) => /memo/i.test(String(instruction?.program || instruction?.programId || "")) && String(instruction?.parsed || instruction?.memo || "").includes(memo));
}

async function verifyCommercialSolanaOrder(order: CommercialOrder, signature: string) {
  if (!solanaSignatureLooksValid(signature)) return { ok: false, reason: "Invalid Solana transaction signature format." };
  const fetched = await fetchCommercialTransaction(signature);
  if (!fetched.transaction) return { ok: false, reason: "Transaction was not found on Solana Mainnet.", rpcErrors: fetched.errors };
  const minimumConfirmations = Math.max(1, Number(process.env.PD_REQUIRED_CONFIRMATIONS || process.env.PD_PAYMENT_MIN_CONFIRMATIONS || 32));
  const requiredCommitment = (process.env.PD_REQUIRED_COMMITMENT || "finalized").trim().toLowerCase();
  if (fetched.confirmations < minimumConfirmations || (requiredCommitment === "finalized" ? fetched.confirmationStatus !== "finalized" : (fetched.confirmationStatus !== "confirmed" && fetched.confirmationStatus !== "finalized"))) return { ok: false, reason: "Transaction does not have the required confirmations.", confirmations: fetched.confirmations, requiredConfirmations: minimumConfirmations, requiredCommitment };
  if (fetched.transaction.meta?.err) return { ok: false, reason: "Transaction execution failed on Solana.", transactionError: fetched.transaction.meta.err };
  if (!commercialMemoMatches(fetched.transaction, order.memo)) return { ok: false, reason: "Order memo is missing or does not match this order." };

  if (order.asset === "SOL") {
    const transfer = parsedTransactionTransfersLamports({ transaction: fetched.transaction, treasuryAddress: order.treasuryAddress, requiredLamports: Number(order.amountAtomic), invoiceMemo: order.memo });
    return { ...transfer, ok: transfer.ok, providerEndpoint: fetched.endpoint, confirmations: fetched.confirmations, requiredConfirmations: minimumConfirmations };
  }

  const mint = order.asset === "PDAO_SOL" ? process.env.PD_ACCEPTED_TOKEN_MINT?.trim() || "" : process.env.PD_SOLANA_USDC_MINT?.trim() || "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  if (!mint) return { ok: false, reason: "Accepted token mint is not configured." };
  const treasuryAccounts = await new Connection(fetched.endpoint, "confirmed").getParsedTokenAccountsByOwner(new PublicKey(order.treasuryAddress), { mint: new PublicKey(mint) });
  const treasuryTokenAccounts = new Set(treasuryAccounts.value.map((account) => account.pubkey.toBase58()));
  const instructions = fetched.transaction.transaction.message.instructions || [];
  let transferredAtomic = 0n;
  for (const instruction of instructions) {
    const parsed = (instruction as any)?.parsed;
    const info = parsed?.info || {};
    if (String((instruction as any)?.program || "") !== "spl-token") continue;
    if (parsed?.type !== "transfer" && parsed?.type !== "transferChecked") continue;
    if (treasuryTokenAccounts.has(String(info.destination || ""))) transferredAtomic += BigInt(info.amount || info.tokenAmount?.amount || 0);
  }
  return { ok: transferredAtomic === BigInt(order.amountAtomic), transferredAtomic: transferredAtomic.toString(), requiredAtomic: order.amountAtomic, providerEndpoint: fetched.endpoint, confirmations: fetched.confirmations, requiredConfirmations: minimumConfirmations, requiredCommitment, mint };
}

function validateCommercialPaymentHash(asset: CommercialPaymentAsset, paymentHash: string) {
  const hash = paymentHash.trim();
  if (!hash) return false;
  if (asset === "USDC_ETH" || asset === "ETH" || asset === "WBTC" || asset === "USDT" || asset === "DAI") {
    return /^0x[a-fA-F0-9]{64}$/.test(hash);
  }
  if (asset === "BTC" || asset === "ZEC") {
    return /^[a-fA-F0-9]{64}$/.test(hash);
  }
  return /^[1-9A-HJ-NP-Za-km-z]{64,128}$/.test(hash);
}

function randomGateAmountLamports() {
  const configuredSol = Number(process.env.PD_RANDOM_GATE_SOL_AMOUNT || "0.1");
  const sol = Number.isFinite(configuredSol) && configuredSol > 0 ? configuredSol : 0.1;
  return Math.round(sol * LAMPORTS_PER_SOL);
}

function paymentGateTreasuryAddress() {
  return process.env.PAYMENT_TREASURY_WALLET?.trim() || process.env.PD_SOLANA_TREASURY?.trim() || defaultSolanaTreasury;
}

function solanaSignatureLooksValid(signature: string) {
  return /^[1-9A-HJ-NP-Za-km-z]{64,128}$/.test(signature.trim());
}

async function fetchParsedTransactionFromMainnet(signature: string) {
  const errors: string[] = [];
  for (const endpoint of resolveMainnetRpcEndpoints()) {
    try {
      const connection = new Connection(endpoint, "confirmed");
      const transaction = await connection.getParsedTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      if (transaction) return { endpoint, transaction };
      errors.push(`${endpoint}: not found`);
    } catch (error) {
      errors.push(`${endpoint}: ${error instanceof Error ? error.message : "failed"}`);
    }
  }
  return { endpoint: "", transaction: null, errors };
}

function parsedTransactionTransfersLamports(input: {
  transaction: any;
  treasuryAddress: string;
  requiredLamports: number;
  invoiceMemo?: string;
}) {
  const message = input.transaction?.transaction?.message;
  const instructions = Array.isArray(message?.instructions) ? message.instructions : [];
  let transferredLamports = 0;
  let memoMatched = !input.invoiceMemo;

  for (const instruction of instructions) {
    const program = String(instruction?.program || instruction?.programId || "");
    const parsed = instruction?.parsed;
    const info = parsed?.info || {};
    if (program === "system" && (parsed?.type === "transfer" || parsed?.type === "transferWithSeed")) {
      const destination = String(info.destination || "");
      const lamports = Number(info.lamports || 0);
      if (destination === input.treasuryAddress && Number.isFinite(lamports) && lamports > 0) {
        transferredLamports += lamports;
      }
    }
    if (/memo/i.test(program)) {
      const memo = String(parsed || instruction?.memo || "");
      if (input.invoiceMemo && memo.includes(input.invoiceMemo)) memoMatched = true;
    }
  }

  const err = input.transaction?.meta?.err ?? null;
  return {
    ok: err === null && transferredLamports >= input.requiredLamports && memoMatched,
    transferredLamports,
    requiredLamports: input.requiredLamports,
    memoMatched,
    transactionError: err,
  };
}

async function verifySolPayment(input: {
  signature: string;
  treasuryAddress: string;
  requiredLamports: number;
  invoiceMemo?: string;
}) {
  if (!solanaSignatureLooksValid(input.signature)) {
    return { ok: false as const, reason: "Invalid Solana transaction signature format." };
  }
  const fetched = await fetchParsedTransactionFromMainnet(input.signature);
  if (!fetched.transaction) {
    return {
      ok: false as const,
      reason: "Transaction was not found on Solana Mainnet through the configured RPC providers.",
      rpcErrors: "errors" in fetched ? fetched.errors : [],
    };
  }
  const transfer = parsedTransactionTransfersLamports({
    transaction: fetched.transaction,
    treasuryAddress: input.treasuryAddress,
    requiredLamports: input.requiredLamports,
    invoiceMemo: input.invoiceMemo,
  });
  return {
    ok: transfer.ok,
    reason: transfer.ok
      ? "Payment verified on Solana Mainnet."
      : "Transaction found, but it does not satisfy the required treasury transfer.",
    providerEndpoint: fetched.endpoint,
    signature: input.signature,
    treasuryAddress: input.treasuryAddress,
    transferredLamports: transfer.transferredLamports,
    requiredLamports: transfer.requiredLamports,
    memoMatched: transfer.memoMatched,
    transactionError: transfer.transactionError,
  };
}

function randomGateInvoiceId(walletAddress: string) {
  return sha256Hex(["random-gate", walletAddress, paymentGateTreasuryAddress(), randomGateAmountLamports()].join(":")).slice(0, 24);
}

function randomGateStatus() {
  const amountLamports = randomGateAmountLamports();
  return {
    ok: true,
    product: "PrivateDAO Solana payment gate",
    paymentAsset: "SOL",
    network: "Solana Mainnet",
    treasuryAddress: paymentGateTreasuryAddress(),
    amountSol: amountLamports / LAMPORTS_PER_SOL,
    amountLamports,
    rpcProviders: resolveMainnetRpcEndpoints().map(redactUrlSecret),
    quickNodeX402: quickNodeX402Status(),
    fallbackPolicy:
      "QuickNode x402 is optional. If it is not configured, verification uses Solana Tracker and public Solana Mainnet RPC fallbacks.",
  };
}

async function handleRandomGatePrepare(body: Record<string, unknown>) {
  const walletAddress = stringField(body, "walletAddress").slice(0, 64);
  if (!walletAddress) throw new Error("walletAddress is required.");
  const amountLamports = randomGateAmountLamports();
  const invoiceId = randomGateInvoiceId(walletAddress);
  return {
    ok: true,
    invoice: {
      invoiceId,
      walletAddress,
      network: "Solana Mainnet",
      paymentAsset: "SOL",
      treasuryAddress: paymentGateTreasuryAddress(),
      amountSol: amountLamports / LAMPORTS_PER_SOL,
      amountLamports,
      memo: `PrivateDAO:random-gate:${invoiceId}`,
      expiresInSeconds: 15 * 60,
    },
  };
}

async function handleRandomGateVerify(body: Record<string, unknown>) {
  const walletAddress = stringField(body, "walletAddress").slice(0, 64);
  const signature = stringField(body, "signature").slice(0, 180);
  const invoiceId = stringField(body, "invoiceId").slice(0, 64);
  if (!walletAddress) throw new Error("walletAddress is required.");
  if (!invoiceId || invoiceId !== randomGateInvoiceId(walletAddress)) throw new Error("Invoice does not match this wallet.");
  const verification = await verifySolPayment({
    signature,
    treasuryAddress: paymentGateTreasuryAddress(),
    requiredLamports: randomGateAmountLamports(),
    invoiceMemo: `PrivateDAO:random-gate:${invoiceId}`,
  });
  if (!verification.ok) {
    return {
      ok: false,
      status: "payment-not-verified",
      verification,
      nextStep: "Check that the transaction paid the exact PrivateDAO treasury address on Solana Mainnet.",
    };
  }
  const seed = sha256Hex([walletAddress, signature, invoiceId, "privatedao-random-gate"].join(":"));
  const randomNumber = parseInt(seed.slice(0, 12), 16) % 1001;
  return {
    ok: true,
    status: "access-granted",
    randomNumber,
    receipt: {
      label: "Verified on Solana Mainnet",
      transactionSignature: signature,
      treasuryAddress: paymentGateTreasuryAddress(),
      amountSol: randomGateAmountLamports() / LAMPORTS_PER_SOL,
      amountLamports: randomGateAmountLamports(),
      unlockResult: `Random number unlocked: ${randomNumber}`,
      timestamp: new Date().toISOString(),
      network: "Solana Mainnet",
    },
    unlock: {
      walletAddress,
      invoiceId,
      signature,
      grantedAt: new Date().toISOString(),
      validForSeconds: 60 * 60,
    },
    verification,
  };
}

function signedCommercialLicense(input: {
  organizationId: string;
  licenseType: CommercialLicenseType;
  licenseStart: string;
  licenseEnd: string;
  capacity: string[];
}) {
  const licenseId = sha256Hex([input.organizationId, input.licenseType, input.licenseStart, input.licenseEnd].join(":")).slice(0, 32);
  const payload = JSON.stringify({
    licenseId,
    organizationId: input.organizationId,
    licenseType: input.licenseType,
    issuedAt: input.licenseStart,
    expiresAt: input.licenseEnd,
    capacity: input.capacity,
  });
  const signature = createHmac("sha256", process.env.PD_LICENSE_SIGNING_SECRET || "privatedao-public-review-license-boundary")
    .update(payload)
    .digest("hex");
  return {
    licenseId,
    organizationId: input.organizationId,
    licenseType: input.licenseType,
    issuedAt: input.licenseStart,
    expiresAt: input.licenseEnd,
    capacity: input.capacity,
    signature,
    algorithm: "hmac-sha256",
    tamperPolicy: "fail-closed",
  };
}

function signEnterpriseLicensePayload(payload: Record<string, unknown>) {
  const provider = (process.env.PRIVADAO_LICENSE_SIGNER_PROVIDER || "env-ed25519").trim().toLowerCase();
  const message = Buffer.from(stableStringify(payload));
  if (provider === "aws-kms") {
    const keyId = process.env.PRIVADAO_LICENSE_KMS_KEY_ID?.trim() || "";
    if (!keyId) throw new Error("PRIVADAO_LICENSE_KMS_KEY_ID is required when PRIVADAO_LICENSE_SIGNER_PROVIDER=aws-kms.");
    const output = execFileSync("aws", ["kms", "sign", "--key-id", keyId, "--signing-algorithm", "ED25519_SHA_512", "--message-type", "RAW", "--message", message.toString("base64"), "--output", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const signature = JSON.parse(output).Signature;
    if (typeof signature !== "string" || !signature) throw new Error("AWS KMS returned no license signature.");
    return Buffer.from(signature, "base64").toString("base64");
  }
  if (provider !== "env-ed25519") throw new Error(`Unsupported license signer provider: ${provider}`);
  const signingKey = process.env.PRIVADAO_ENTERPRISE_LICENSE_SIGNING_PRIVATE_KEY_PEM?.trim() || "";
  if (!signingKey) throw new Error("Enterprise license signing is not configured on the control plane.");
  return signEd25519(null, message, createPrivateKey(signingKey)).toString("base64");
}

function issueEnterpriseLicense(body: Record<string, unknown>, req: http.IncomingMessage) {
  const organizationId = stringField(body, "organizationId").slice(0, 120);
  const installationId = stringField(body, "installationId").slice(0, 120);
  const plan = stringField(body, "plan", "ENTERPRISE").toUpperCase().slice(0, 40);
  if (!organizationId) throw new Error("organizationId is required.");
  const signingKey = process.env.PRIVATEDAO_ENTERPRISE_LICENSE_SIGNING_PRIVATE_KEY_PEM?.trim() || "";
  if (!signingKey && (process.env.PRIVADAO_LICENSE_SIGNER_PROVIDER || "env-ed25519").trim().toLowerCase() !== "aws-kms") return { ok: false, status: "license-issuer-not-configured", error: "Enterprise license signing is not configured on the control plane." };
  const issuerSecret = process.env.PRIVATEDAO_LICENSE_ISSUER_SECRET?.trim() || "";
  if (issuerSecret && req.headers["x-privatedao-license-issuer"] !== issuerSecret) {
    return { ok: false, status: "license-issuer-unauthorized", error: "License issuance requires the control-plane issuer credential." };
  }
  const issuedAt = new Date();
  const requestedExpiry = stringField(body, "expiresAt");
  const expiresAt = requestedExpiry && Number.isFinite(Date.parse(requestedExpiry)) ? new Date(requestedExpiry) : new Date(issuedAt.getTime() + 31 * 24 * 60 * 60 * 1000);
  const offlineGraceUntil = new Date(expiresAt.getTime() + 14 * 24 * 60 * 60 * 1000);
  const payload = {
    licenseId: `lic_${sha256StableJsonHex({ organizationId, installationId, plan, issuedAt: issuedAt.toISOString() }).slice(0, 24)}`,
    organizationId,
    ...(installationId ? { installationId } : {}),
    plan,
    licenseType: plan,
    customerId: stringField(body, "customerId").slice(0, 120) || organizationId,
    status: "active",
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    offlineGraceUntil: offlineGraceUntil.toISOString(),
    engineVersion: "0.1.0",
    seatLimit: Math.max(1, Number(body.seatLimit || 50)),
    organizationLimit: Math.max(1, Number(body.organizationLimit || 1)),
    deploymentMode: stringField(body, "deploymentMode", "self-hosted").slice(0, 40),
    enabledPlugins: Array.isArray(body.enabledPlugins) ? body.enabledPlugins.filter((feature): feature is string => typeof feature === "string").slice(0, 32) : ["blind-policy", "blind-kyc", "blind-aml", "blind-employment", "blind-payroll", "blind-underwriting", "blind-dao-voting"],
    features: Array.isArray(body.features) ? body.features.filter((feature): feature is string => typeof feature === "string").slice(0, 32) : ["blind-policy-groth16", "local-witness", "local-verification", "local-receipts"],
    keyId: process.env.PRIVADAO_LICENSE_SIGNING_KEY_ID || "ed25519-control-plane-primary",
  };
  let signature: string;
  try { signature = signEnterpriseLicensePayload(payload); }
  catch (error) { return { ok: false, status: "license-issuer-not-configured", error: error instanceof Error ? error.message : "License signing failed." }; }
  return { ok: true, status: "license-issued", license: { schema: "privatedao.enterprise-license.v1", algorithm: "ed25519", keyId: payload.keyId, payload, signature } };
}

async function handleCommercialCheckoutPrepare(body: Record<string, unknown>) {
  const organizationName = stringField(body, "organizationName", "PrivateDAO organization").slice(0, 160);
  const plan = commercialPlanFor(stringField(body, "plan", "PROFESSIONAL"));
  const asset = commercialAssetFor(stringField(body, "asset", "USDC_SOL"));
  const organizationId =
    stringField(body, "organizationId").slice(0, 64) ||
    sha256Hex([organizationName, plan.licenseType, asset.asset].join(":")).slice(0, 24);
  const checkoutId = sha256Hex([organizationId, plan.licenseType, asset.asset, asset.treasuryAddress, plan.priceUsd ?? "custom"].join(":")).slice(0, 32);
  return {
    ok: true,
    checkout: {
      checkoutId,
      organizationId,
      organizationName,
      licenseType: plan.licenseType,
      planLabel: plan.label,
      priceUsd: plan.priceUsd,
      cadence: plan.cadence,
      trialDays: commercialTrialDays,
      capacity: plan.capacity,
      paymentAsset: asset.asset,
      paymentAssetLabel: asset.label,
      network: asset.network,
      treasuryAddress: asset.treasuryAddress,
      memo: `PrivateDAO:${organizationId}:${plan.licenseType}:${checkoutId}`,
      issuedAt: new Date().toISOString(),
    },
    nextStep: "Send the selected asset to the treasury address, then submit the transaction hash for verification.",
  };
}

async function handleCommercialCheckoutVerify(body: Record<string, unknown>) {
  throw new Error("Legacy checkout verification is disabled. Use /api/v1/commercial/orders/verify with an orderId and Solana transaction signature.");
  const organizationId = stringField(body, "organizationId").slice(0, 64);
  const plan = commercialPlanFor(stringField(body, "plan", "PROFESSIONAL"));
  const asset = commercialAssetFor(stringField(body, "asset", "USDC_SOL"));
  const paymentHash = stringField(body, "paymentHash").slice(0, 180);
  if (!organizationId) throw new Error("organizationId is required.");
  if (!validateCommercialPaymentHash(asset.asset, paymentHash)) throw new Error("Payment hash does not match the selected asset format.");

  const verificationStatus = process.env.PD_PAYMENT_VERIFICATION_MODE === "sandbox" ? "verified" : "pending-review";
  const issuedAt = new Date();
  const licenseStart = issuedAt.toISOString();
  const licenseEnd = new Date(issuedAt.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const receiptId = sha256Hex([organizationId, plan.licenseType, asset.asset, paymentHash, asset.treasuryAddress].join(":")).slice(0, 32);
  const receipt = {
    receiptId,
    organizationId,
    licenseType: plan.licenseType,
    paymentAsset: asset.asset,
    paymentHash,
    treasuryAddress: asset.treasuryAddress,
    verificationStatus,
    subscriptionActivation: verificationStatus === "verified" ? "active" : "trial-active",
    licenseStart,
    licenseEnd,
    issuedAt: issuedAt.toISOString(),
  };
  const signedLicense = signedCommercialLicense({
    organizationId,
    licenseType: plan.licenseType,
    licenseStart,
    licenseEnd,
    capacity: plan.capacity,
  });
  void sendTelegramNotification(
    [
      "New PrivateDAO commercial activation",
      `Organization: ${organizationId}`,
      `Plan: ${plan.label}`,
      `Asset: ${asset.label}`,
      `Status: ${verificationStatus}`,
      `Receipt: ${receiptId}`,
    ].join("\n"),
  );
  return {
    ok: true,
    receipt,
    signedLicense,
    organizationRecord: {
      organizationId,
      licenseType: plan.licenseType,
      licenseStart,
      licenseEnd,
      paymentAsset: asset.asset,
      paymentHash,
      paymentReceiptId: receiptId,
      subscriptionActivation: receipt.subscriptionActivation,
      tamperPolicy: "fail-closed",
    },
    verification:
      verificationStatus === "verified"
        ? "Sandbox verification mode accepted this payment hash for subscription activation."
        : "Payment hash format is valid. Chain/provider confirmation remains pending before paid activation; the 14-day trial can remain active.",
  };
}

async function handleCommercialOrderPrepare(body: Record<string, unknown>) {
  const organizationName = stringField(body, "organizationName", "PrivateDAO organization").slice(0, 160);
  const customerId = stringField(body, "customerId").slice(0, 120) || `cus_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
  const plan = commercialPlanFor(stringField(body, "plan", "PROFESSIONAL"));
  const asset = commercialAssetFor(stringField(body, "asset", "USDC_SOL"));
  if (!plan.priceUsd || plan.priceUsd <= 0) throw new Error("A paid plan with a concrete price is required for an on-chain order.");
  if (asset.network !== "Solana") throw new Error("The on-chain commercial verifier currently accepts Solana assets only.");
  const amount = commercialSolanaAmount(asset.asset, plan.priceUsd, plan.licenseType);
  const organizationId = stringField(body, "organizationId").slice(0, 64) || `org_${sha256Hex([customerId, organizationName].join(":")).slice(0, 24)}`;
  const orderId = `ord_${randomUUID().replace(/-/g, "")}`;
  const createdAt = new Date();
  const expiryMinutes = Math.max(5, Number(process.env.PD_PAYMENT_EXPIRY_MINUTES || 30));
  const order: CommercialOrder = { orderId, customerId, organizationId, organizationName, plan: plan.licenseType, asset: asset.asset, network: asset.network, treasuryAddress: asset.treasuryAddress, amountAtomic: amount.amountAtomic, amountDisplay: amount.amountDisplay, memo: `PrivateDAO:order:${orderId}`, status: "pending", createdAt: createdAt.toISOString(), expiresAt: new Date(createdAt.getTime() + expiryMinutes * 60 * 1000).toISOString(), ...(stringField(body, "renewalOf") ? { renewalOf: stringField(body, "renewalOf").slice(0, 100) } : {}) };
  commercialOrders.set(orderId, order);
  persistCommercialOrders();
  return { ok: true, order, payment: { tokenMint: amount.mint, decimals: amount.decimals, exactAtomicAmount: amount.amountAtomic }, nextStep: "Submit the transaction, then call the verify endpoint with orderId and the transaction signature." };
}

async function handleCommercialOrderVerify(body: Record<string, unknown>) {
  const orderId = stringField(body, "orderId").slice(0, 100);
  const signature = stringField(body, "signature").slice(0, 180);
  const order = commercialOrders.get(orderId);
  if (!order) throw new Error("orderId is invalid or expired.");
  if (order.status !== "pending") throw new Error(`Order is already ${order.status}.`);
  if (Date.now() > Date.parse(order.expiresAt)) { order.status = "expired"; persistCommercialOrders(); throw new Error("Order has expired. Create a new order."); }
  if ([...commercialOrders.values()].some((item) => item.status === "paid" && item.paymentSignature === signature)) throw new Error("This transaction has already been used for another order.");
  const verification = await verifyCommercialSolanaOrder(order, signature);
  if (!verification.ok) return { ok: false, status: "payment-not-verified", orderId, verification };
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + (order.plan === "PROFESSIONAL" || order.plan === "ORGANIZATION" ? 30 : 365) * 24 * 60 * 60 * 1000);
  const licenseResult = issueEnterpriseLicense({ organizationId: order.organizationId, customerId: order.customerId, plan: order.plan, expiresAt: expiresAt.toISOString(), seatLimit: order.plan === "PROFESSIONAL" ? 25 : 250, organizationLimit: 1, deploymentMode: "self-hosted", enabledPlugins: ["blind-policy", "blind-kyc", "blind-aml", "blind-employment", "blind-payroll", "blind-underwriting", "blind-dao-voting"], requestLicense: true }, { headers: { "x-privatedao-license-issuer": process.env.PRIVADAO_LICENSE_ISSUER_SECRET || "" } } as unknown as http.IncomingMessage);
  if (!licenseResult.ok || !licenseResult.license) return { ok: false, status: "license-issuer-unavailable", orderId, verification, error: licenseResult.error || "License signing is not configured." };
  order.status = "paid";
  order.paymentSignature = signature;
  order.licenseId = licenseResult.license.payload.licenseId;
  order.licenseEnvelope = licenseResult.license;
  commercialOrders.set(orderId, order);
  persistCommercialOrders();
  const activationCode = `ACT-${sha256Hex([order.orderId, order.licenseId, signature].join(":")).slice(0, 24).toUpperCase()}`;
  return { ok: true, status: "payment-verified-license-issued", orderId, customerId: order.customerId, organization: { organizationId: order.organizationId, organizationName: order.organizationName, created: true }, license: licenseResult.license, activationCode, delivery: { licenseFile: licenseResult.license, downloadPackage: `/api/v1/commercial/orders/${order.orderId}/package`, deploymentGuide: "https://privatedao.org/developers/blind-policy-api/", activationEndpoint: "POST /v1/license/activate" }, subscription: { status: "active", expiresAt: licenseResult.license.payload.expiresAt, graceUntil: licenseResult.license.payload.offlineGraceUntil, readOnlyAfterExpiry: true }, verification };
}

async function handleCommercialOrderPackage(orderId: string) {
  const order = commercialOrders.get(orderId);
  if (!order) throw new Error("orderId is invalid or expired.");
  if (order.status !== "paid" || !order.licenseEnvelope) throw new Error("The paid license package is not available yet.");
  return { schema: "privatedao.customer-package.v1", generatedAt: new Date().toISOString(), orderId: order.orderId, customerId: order.customerId, organization: { organizationId: order.organizationId, name: order.organizationName }, license: order.licenseEnvelope, activation: { code: `ACT-${sha256Hex([order.orderId, order.licenseId || "", order.paymentSignature || ""].join(":")).slice(0, 24).toUpperCase()}` }, deployment: { mode: "self-hosted", command: "docker compose up -d", guide: "https://privatedao.org/developers/blind-policy-api/", licenseActivation: "POST /v1/license/activate" }, security: { privateInputsLeaveDeployment: false, signingPrivateKeyIncluded: false } };
}

async function handleCommercialOrderRenew(body: Record<string, unknown>) {
  const renewalOf = stringField(body, "orderId").slice(0, 100);
  if (!renewalOf) throw new Error("orderId is required for renewal.");
  const previous = commercialOrders.get(renewalOf);
  if (!previous || previous.status !== "paid") throw new Error("Only a paid order can be renewed.");
  return handleCommercialOrderPrepare({ organizationName: previous.organizationName, organizationId: previous.organizationId, customerId: previous.customerId, plan: previous.plan === "ORGANIZATION" ? "ORGANIZATION" : "PROFESSIONAL", asset: previous.asset, renewalOf });
}

function commercialCheckoutStatus() {
  return {
    ok: true,
    source: "PrivateDAO commercial read-node",
    products: ["Proof Workflows", "Private Governance", "Treasury Coordination"],
    plans: commercialPlans,
    trialDays: commercialTrialDays,
    paymentMethods: {
      bankTransfer: "Invoice-led through official PrivateDAO contacts.",
      crypto: ["USDC_SOL", "PDAO_SOL", "USDC_ETH", "SOL", "ETH", "BTC", "WBTC", "ZEC", "USDT", "DAI"],
    },
    licenseProtection: {
      model: "signed organization-bound license",
      tamperPolicy: "fail-closed",
      destructiveBehavior: false,
      summary: "Modified or unverifiable licenses disable paid features and require reactivation; customer data is not destructively altered.",
    },
    quickNodeRole:
      "Optional runtime/proof and chain-data provider. Legacy authenticated QuickNode RPC is disabled unless PRIVATE_DAO_ENABLE_LEGACY_QUICKNODE_RPC=true.",
    quickNodeX402: quickNodeX402Status(),
    mainnetRpcFallbacks: resolveMainnetRpcEndpoints().map(redactUrlSecret),
    paymentGate: {
      status: "/api/v1/payment-gate/random/status",
      prepare: "/api/v1/payment-gate/random/prepare",
      verify: "/api/v1/payment-gate/random/verify",
    },
    commercialOrders: {
      prepare: "/api/v1/commercial/orders/prepare",
      verify: "/api/v1/commercial/orders/verify",
      renew: "/api/v1/commercial/orders/renew",
      package: "/api/v1/commercial/orders/{orderId}/package",
      legacyHashVerification: "disabled",
      acceptedSolanaToken: { symbol: process.env.PD_ACCEPTED_TOKEN_SYMBOL || "PDAO", mint: process.env.PD_ACCEPTED_TOKEN_MINT || null, decimals: Number(process.env.PD_ACCEPTED_TOKEN_DECIMALS || 0) || null },
      confirmationPolicy: { commitment: process.env.PD_REQUIRED_COMMITMENT || "finalized", confirmations: Number(process.env.PD_REQUIRED_CONFIRMATIONS || process.env.PD_PAYMENT_MIN_CONFIRMATIONS || 32) },
    },
  };
}

async function visitorStats() {
  const rows =
    (await supabaseSelectPaged<VisitorPingRow>(
      "visitor_sessions",
      "?select=session_id,page,timestamp,country_hint&order=timestamp.desc",
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
  const visitorTransactions = await supabaseSelectPaged<VisitorTransactionRow>(
    "visitor_transactions",
    "?select=tx_signature,session_id,wallet_address,wallet_name,action,page,status,slot,created_at&order=created_at.desc",
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
    counterDefinitions: {
      visitorSourceTable: "visitor_sessions",
      transactionSourceTable: "visitor_transactions",
      activeWindowMinutes: 30,
      totalSessions: "unique hashed browser sessions in the selected read window",
      totalPings: "sampled visitor ping rows stored in Supabase plus in-memory fallback rows",
      totalVisitorTransactions: "wallet-submitted Testnet transaction receipts captured by /api/v1/transactions/receipt",
      storagePolicy: "visitor Supabase writes are throttled per session and page to reduce cost and noisy duplicate rows",
    },
    activeNowPings: activeRows.length,
    activeTodayPings: todayRows.length,
    totalPings: sourceRows.length,
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

type PayrollUmbraIntent = {
  intentId: string;
  batchId: string;
  network: "solana-devnet";
  asset: "WSOL";
  recipientCount: number;
  totalAmount: string;
  manifestCommitment: string;
  recipientHash: string;
  privacyTier: "confidential" | "anonymous" | "selective-disclosure";
  createdAt: string;
};

const payrollUmbraIntents = new Map<string, PayrollUmbraIntent>();

function isSha256Hex(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
}

async function handlePayrollUmbra(body: Record<string, unknown>) {
  const action = body.action === "execute" ? "execute" : "prepare";
  if (action === "prepare") {
    const manifestCommitment = stringField(body, "manifestCommitment");
    const recipientHash = stringField(body, "recipientHash");
    const batchId = stringField(body, "batchId", `payroll-${randomUUID()}`);
    const recipientCount = Number(body.recipientCount || 0);
    const totalAmount = stringField(body, "totalAmount");
    const privacyTier = stringField(body, "privacyTier", "confidential") as PayrollUmbraIntent["privacyTier"];
    if (!isSha256Hex(manifestCommitment) || !isSha256Hex(recipientHash)) throw new Error("Payroll commitments must be SHA-256 hex values.");
    if (!Number.isInteger(recipientCount) || recipientCount < 1 || recipientCount > 500) throw new Error("recipientCount must be between 1 and 500.");
    if (!/^\d+(\.\d+)?$/.test(totalAmount) || Number(totalAmount) <= 0) throw new Error("totalAmount must be positive.");
    if (!["confidential", "anonymous", "selective-disclosure"].includes(privacyTier)) throw new Error("Unsupported payroll privacy tier.");
    const intent: PayrollUmbraIntent = { intentId: `umbra-payroll-${randomUUID()}`, batchId, network: "solana-devnet", asset: "WSOL", recipientCount, totalAmount, manifestCommitment, recipientHash, privacyTier, createdAt: new Date().toISOString() };
    payrollUmbraIntents.set(intent.intentId, intent);
    return { ok: true, stage: "prepared", provider: "umbra", network: intent.network, intent };
  }

  const rawIntent = body.intent;
  if (!rawIntent || typeof rawIntent !== "object" || Array.isArray(rawIntent)) throw new Error("intent is required.");
  const intentId = stringField(rawIntent as Record<string, unknown>, "intentId");
  const intent = payrollUmbraIntents.get(intentId);
  if (!intent) throw new Error("Unknown or expired payroll Umbra intent.");
  throw new Error("Wallet signature required: payroll Umbra execution is not accepted through the legacy intent endpoint. Use the official Umbra Devnet SDK in the client, then submit the signed transaction and finalized signature for verification.");
}

function payrollDevnetApiAuthorized(req: http.IncomingMessage) {
  const configuredKey = process.env.PRIVATE_DAO_PAYROLL_DEVNET_API_KEY?.trim() || "";
  const presented = String(req.headers["x-payroll-api-key"] || "").trim();
  const presentedBytes = Buffer.from(presented);
  const configuredBytes = Buffer.from(configuredKey);
  return Boolean(configuredKey && presented && presentedBytes.length === configuredBytes.length && timingSafeEqual(presentedBytes, configuredBytes));
}

function walletPublicKeyDer(wallet: string) {
  const raw = new PublicKey(wallet).toBytes();
  return createPublicKey({ key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), Buffer.from(raw)]), format: "der", type: "spki" });
}

function payrollWalletSession(req: http.IncomingMessage) {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  return token ? payrollStore.getWalletSession(token) : null;
}

function payrollWalletError(message: string) { return { status: 400, body: { ok: false, error: message } }; }

async function handlePayrollWalletSession(body: Record<string, unknown>) {
  const action = stringField(body, "action");
  const wallet = stringField(body, "wallet");
  try { new PublicKey(wallet); } catch { return payrollWalletError("A valid Solana wallet is required."); }
  if (action === "challenge") {
    const nonce = randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + payrollWalletChallengeTtlMs).toISOString();
    const message = `PrivateDAO Confidential Payroll Devnet\nWallet: ${wallet}\nNonce: ${nonce}\nExpires: ${expiresAt}\nPurpose: authorize payroll settlement reconciliation only.`;
    return { status: 200, body: { ok: true, challenge: payrollStore.createWalletChallenge({ wallet, message, expiresAt, nonce }) } };
  }
  if (action !== "verify") return payrollWalletError("Unknown payroll wallet session action.");
  const nonce = stringField(body, "nonce");
  const message = stringField(body, "message");
  const signatureText = stringField(body, "signature");
  if (!nonce || !message || !signatureText) return payrollWalletError("nonce, message, and signature are required.");
  const signature = Buffer.from(signatureText, "base64");
  if (signature.length !== 64) return payrollWalletError("Wallet signature must be a 64-byte Ed25519 signature.");
  let valid = false;
  try { valid = verifyEd25519(null, Buffer.from(message, "utf8"), walletPublicKeyDer(wallet), signature); } catch { valid = false; }
  if (!valid) return payrollWalletError("Wallet signature verification failed.");
  try {
    const challenge = payrollStore.consumeWalletChallenge({ nonce, wallet, message });
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + payrollWalletSessionTtlMs).toISOString();
    payrollStore.createWalletSession({ token, wallet, expiresAt });
    return { status: 200, body: { ok: true, session: { token, wallet, expiresAt, challengeUsedAt: challenge.usedAt } } };
  } catch (error) { return payrollWalletError(error instanceof Error ? error.message : "Wallet challenge could not be consumed."); }
}

function decodeBase58(value: string) {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const bytes = [0];
  for (const character of value) {
    const digit = alphabet.indexOf(character);
    if (digit < 0) throw new Error("Malformed base58 transaction instruction.");
    let carry = digit;
    for (let index = 0; index < bytes.length; index += 1) {
      carry += bytes[index] * 58;
      bytes[index] = carry & 255;
      carry >>= 8;
    }
    while (carry) { bytes.push(carry & 255); carry >>= 8; }
  }
  for (let index = 0; index < value.length && value[index] === "1"; index += 1) bytes.push(0);
  return Uint8Array.from(bytes.reverse());
}

function containsBytes(haystack: Uint8Array, needle: Uint8Array) {
  outer: for (let start = 0; start <= haystack.length - needle.length; start += 1) {
    for (let index = 0; index < needle.length; index += 1) if (haystack[start + index] !== needle[index]) continue outer;
    return true;
  }
  return false;
}

async function verifyPayrollUmbraDevnetTransaction(signature: string, optionalDataHex: string) {
  if (!/^[1-9A-HJ-NP-Za-km-z]{80,100}$/.test(signature)) throw new Error("Invalid Solana transaction signature.");
  const rpcUrl = process.env.PRIVATE_DAO_PAYROLL_DEVNET_RPC_URL || process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com";
  if (!/^https:\/\//i.test(rpcUrl) || /mainnet|testnet/i.test(rpcUrl)) throw new Error("Payroll settlement RPC must be an HTTPS Solana Devnet endpoint.");
  const connection = new Connection(rpcUrl, "finalized");
  const status = (await connection.getSignatureStatuses([signature], { searchTransactionHistory: true })).value[0];
  if (!status || status.err || status.confirmationStatus !== "finalized") throw new Error("Umbra payroll transaction is not finalized successfully on Solana Devnet.");
  const transaction = await connection.getParsedTransaction(signature, { commitment: "finalized", maxSupportedTransactionVersion: 0 });
  if (!transaction || transaction.meta?.err) throw new Error("Finalized Umbra payroll transaction could not be read successfully.");
  const programInvoked = transaction.transaction.message.instructions.some((instruction) => "programId" in instruction && instruction.programId.equals(umbraDevnetProgramId));
  if (!programInvoked) throw new Error("Finalized transaction does not invoke the configured Umbra Devnet program.");
  if (!/^[a-f0-9]{64}$/i.test(optionalDataHex)) throw new Error("Payroll settlement requires a 32-byte Umbra binding.");
  const expected = Uint8Array.from(Buffer.from(optionalDataHex, "hex"));
  const dataFound = transaction.transaction.message.instructions.some((instruction) => {
    if (!("data" in instruction) || typeof instruction.data !== "string") return false;
    try { return containsBytes(decodeBase58(instruction.data), expected); } catch { return false; }
  });
  if (!dataFound) throw new Error("Umbra transaction does not contain the expected payroll binding.");
  return { signature, network: "solana-devnet", commitment: "finalized", slot: transaction.slot, programId: umbraDevnetProgramId.toBase58(), optionalDataHash: optionalDataHex };
}

async function handlePayrollDomain(body: Record<string, unknown>, req: http.IncomingMessage) {
  const operatorAuthorized = payrollDevnetApiAuthorized(req);
  const walletSession = payrollWalletSession(req);
  if (!operatorAuthorized && !walletSession) return { status: 401, body: { ok: false, error: "Payroll API authorization required." } };
  const action = stringField(body, "action");
  if (walletSession && !["bootstrap-devnet", "settlement", "reconcile", "create-verification", "get"].includes(action)) return { status: 403, body: { ok: false, error: "Wallet session is restricted to the Devnet payroll lifecycle." } };
  const actorRef = walletSession?.wallet || stringField(body, "actorRef");
  if (!actorRef || actorRef.length > 160) return { status: 400, body: { ok: false, error: "actorRef is required." } };
  const protectedBatchActions = new Set(["settlement", "reconcile", "create-verification", "get"]);
  if (walletSession && protectedBatchActions.has(action)) {
    const batchId = stringField(body, "batchId");
    if (!batchId || !payrollStore.actorCanAccessBatch(batchId, actorRef)) return { status: 403, body: { ok: false, error: "Wallet is not authorized for this payroll batch." } };
  }
  try {
    if (action === "bootstrap-devnet") {
      if (!walletSession) return { status: 403, body: { ok: false, error: "A wallet session is required for the Devnet browser lifecycle." } };
      const rows = Array.isArray(body.items) ? body.items as Array<Record<string, unknown>> : [];
      if (!rows.length || rows.length > 500) throw new Error("Devnet payroll requires between 1 and 500 items.");
      const idempotencyKey = stringField(body, "idempotencyKey");
      if (!idempotencyKey || idempotencyKey.length > 160) throw new Error("A bounded idempotencyKey is required.");
      const existing = payrollStore.findBatchByActorIdempotency(actorRef, idempotencyKey);
      if (existing) return { status: 200, body: { ok: true, idempotent: true, demoMode: "solana-devnet", batch: existing } };
      for (const [index, item] of rows.entries()) {
        const grossCents = Number(item.grossCents);
        const taxCents = Number(item.taxCents);
        const deductionsCents = Number(item.deductionsCents);
        const netCents = Number(item.netCents);
        if (!Number.isSafeInteger(grossCents) || grossCents <= 0) throw new Error(`Payroll item ${index + 1} gross pay must be a positive integer in cents.`);
        const expectedTaxCents = Math.round(grossCents * 0.1);
        const expectedDeductionsCents = Math.round(grossCents * 0.02);
        const expectedNetCents = grossCents - expectedTaxCents - expectedDeductionsCents;
        if (taxCents !== expectedTaxCents || deductionsCents !== expectedDeductionsCents || netCents !== expectedNetCents) throw new Error(`Payroll item ${index + 1} does not match the server tax and deduction policy.`);
      }
      const totalNetCents = rows.reduce((sum, item) => sum + Number(item.netCents), 0);
      const tenant = payrollStore.createTenant({ name: "PrivateDAO Devnet Payroll", actorRef });
      payrollStore.addMember({ tenantId: tenant.tenantId, actorRef, role: "approver", addedBy: actorRef });
      const policy = payrollStore.createPolicy({ tenantId: tenant.tenantId, jurisdiction: "GENERIC-DEMO", taxYear: "2026", maxTotalCents: totalNetCents, maxEmployeeCents: Math.max(...rows.map((item) => Number(item.netCents))), allowedAsset: "WSOL", requiredApprovers: 1, allowSelfApproval: true, actorRef });
      const items = rows.map((item, index) => {
        const recipientAddress = String(item.recipientAddress || "");
        new PublicKey(recipientAddress);
        const employee = payrollStore.addEmployee({ tenantId: tenant.tenantId, employeeRefCiphertext: String(item.employeeRefCiphertext || `devnet-employee-${index}`), recipientAddress, recipientCommitment: String(item.recipientCommitment || ""), actorRef });
        return { employeeId: employee.employeeId, payoutId: String(item.payoutId || `payout-${index + 1}`), grossCents: Number(item.grossCents), taxCents: Number(item.taxCents), deductionsCents: Number(item.deductionsCents), netCents: Number(item.netCents), recipientCommitment: String(item.recipientCommitment || "") };
      });
      if (items.length !== rows.length || items.length === 0) throw new Error("Devnet payroll item normalization failed.");
      const batch = payrollStore.createBatch({ tenantId: tenant.tenantId, policyId: policy.policyId, idempotencyKey, manifestCommitment: stringField(body, "manifestCommitment"), batchCommitment: stringField(body, "batchCommitment"), recipientRoot: stringField(body, "recipientRoot"), grossCents: Number(body.grossCents), taxCents: Number(body.taxCents), deductionsCents: Number(body.deductionsCents), netCents: Number(body.netCents), createdBy: actorRef, items });
      if (!batch.idempotent) {
        payrollStore.transition(batch.batchId, "CALCULATED", actorRef);
        payrollStore.transition(batch.batchId, "POLICY_CHECKED", actorRef);
        payrollStore.transition(batch.batchId, "PENDING_APPROVAL", actorRef);
        payrollStore.approve(batch.batchId, actorRef, "approved");
        payrollStore.transition(batch.batchId, "SIGNING", actorRef);
        payrollStore.transition(batch.batchId, "SETTLING", actorRef);
      }
      return { status: 201, body: { ok: true, demoMode: "solana-devnet", tenant, policy, batch: payrollStore.getBatch(batch.batchId) } };
    }
    if (action === "create-tenant") return { status: 201, body: { ok: true, tenant: payrollStore.createTenant({ name: stringField(body, "name", "PrivateDAO Devnet Demo"), actorRef }) } };
    if (action === "create-policy") return { status: 201, body: { ok: true, policy: payrollStore.createPolicy({ tenantId: stringField(body, "tenantId"), jurisdiction: stringField(body, "jurisdiction", "GENERIC-DEMO"), taxYear: stringField(body, "taxYear", "2026"), maxTotalCents: Number(body.maxTotalCents), maxEmployeeCents: Number(body.maxEmployeeCents), allowedAsset: stringField(body, "allowedAsset", "SOL"), requiredApprovers: Number(body.requiredApprovers || 1), allowSelfApproval: body.allowSelfApproval === true, actorRef }) } };
    if (action === "create-employee") return { status: 201, body: { ok: true, employee: payrollStore.addEmployee({ tenantId: stringField(body, "tenantId"), employeeRefCiphertext: stringField(body, "employeeRefCiphertext"), recipientAddress: stringField(body, "recipientAddress"), recipientCommitment: stringField(body, "recipientCommitment"), actorRef }) } };
    if (action === "create-batch") {
      const items = Array.isArray(body.items) ? body.items as Array<Record<string, unknown>> : [];
      return { status: 201, body: { ok: true, batch: payrollStore.createBatch({ tenantId: stringField(body, "tenantId"), policyId: stringField(body, "policyId"), idempotencyKey: stringField(body, "idempotencyKey"), manifestCommitment: stringField(body, "manifestCommitment"), batchCommitment: stringField(body, "batchCommitment"), recipientRoot: stringField(body, "recipientRoot"), grossCents: Number(body.grossCents), taxCents: Number(body.taxCents), deductionsCents: Number(body.deductionsCents), netCents: Number(body.netCents), createdBy: actorRef, items: items.map((item) => ({ employeeId: String(item.employeeId || ""), payoutId: String(item.payoutId || ""), grossCents: Number(item.grossCents), taxCents: Number(item.taxCents), deductionsCents: Number(item.deductionsCents), netCents: Number(item.netCents), recipientCommitment: String(item.recipientCommitment || "") })) }) } };
    }
    if (action === "transition") return { status: 200, body: { ok: true, transition: payrollStore.transition(stringField(body, "batchId"), stringField(body, "to") as PayrollState, actorRef) } };
    if (action === "approve") return { status: 200, body: { ok: true, approval: payrollStore.approve(stringField(body, "batchId"), actorRef, stringField(body, "decision", "approved") as "approved" | "rejected", stringField(body, "signature") || undefined) } };
    if (action === "settlement") {
      const state = stringField(body, "state") as SettlementState;
      const txSignature = stringField(body, "txSignature") || undefined;
      const chainEvidence = state === "CONFIRMED" ? await verifyPayrollUmbraDevnetTransaction(txSignature || "", stringField(body, "optionalDataHex")) : undefined;
      return { status: 200, body: { ok: true, settlement: payrollStore.recordSettlement({ batchId: stringField(body, "batchId"), itemId: stringField(body, "itemId"), idempotencyKey: stringField(body, "idempotencyKey"), state, txSignature, actorRef, errorCode: stringField(body, "errorCode") || undefined, chainEvidence }) , chainEvidence } };
    }
    if (action === "reconcile") return { status: 200, body: { ok: true, reconciliation: payrollStore.reconcile(stringField(body, "batchId"), actorRef) } };
    if (action === "create-verification") return { status: 201, body: { ok: true, verification: await payrollStore.createVerification({ batchId: stringField(body, "batchId"), scope: stringField(body, "scope", "public") as "public" | "auditor" | "finance" | "custom", expiresAt: stringField(body, "expiresAt"), actorRef, proof: body.proof, publicSignals: Array.isArray(body.publicSignals) ? body.publicSignals : [] }) } };
    if (action === "revoke-verification") return { status: 200, body: { ok: true, revocation: payrollStore.revokeVerification(stringField(body, "verificationId"), actorRef) } };
    if (action === "get") return { status: 200, body: { ok: true, ...payrollStore.getBatch(stringField(body, "batchId")) } };
    return { status: 400, body: { ok: false, error: "Unknown payroll action." } };
  } catch (error) { return { status: 400, body: { ok: false, error: error instanceof Error ? error.message : "Payroll operation failed." } }; }
}

function getPayrollPublicVerification(token: string) {
  try { return { status: 200, body: { ok: true, verification: payrollStore.getVerification(token) } }; }
  catch (error) { return { status: 404, body: { ok: false, error: error instanceof Error ? error.message : "Verification not found." } }; }
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
  const apiKeys = ["JUP_API_KEY", "JUPITER_API_KEY", "JUPITER_DEVELOPER_API_KEY"]
    .map((name) => ({ name, value: getApiKey(name) }))
    .filter((candidate) => candidate.value.length > 0);
  const inputMint = stringField(body, "inputMint", "So11111111111111111111111111111111111111112");
  const outputMint = stringField(body, "outputMint", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  const amount = stringField(body, "amount", "20000000");
  const taker = stringField(body, "taker");
  const slippageBps = Number(body.slippageBps ?? 50);

  if (!/^\d+$/.test(amount)) {
    return { ok: false, source: "jupiter", error: "amount must be an integer string in base units." };
  }
  if (apiKeys.length === 0) {
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

  let response: Response | null = null;
  let raw: Record<string, unknown> | null = null;
  for (const candidate of apiKeys) {
    response = await fetch(`https://api.jup.ag/swap/v2/order?${params.toString()}`, {
      headers: {
        Accept: "application/json",
        "x-api-key": candidate.value,
      },
    });
    raw = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (![401, 403].includes(response.status) || candidate === apiKeys[apiKeys.length - 1]) break;
  }
  if (!response) return { ok: false, source: "jupiter", configured: false, error: "No Jupiter request was attempted." };
  if ([401, 403].includes(response.status)) {
    const quoteResponse = await fetch(`https://api.jup.ag/swap/v1/quote?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    const quoteRaw = (await quoteResponse.json().catch(() => null)) as Record<string, unknown> | null;
    if (quoteResponse.ok && typeof quoteRaw?.outAmount === "string") {
      const quotePriceImpact = Number(quoteRaw.priceImpactPct);
      return {
        ok: true,
        source: "jupiter",
        configured: apiKeys.length > 0,
        orderConfigured: false,
        status: quoteResponse.status,
        executionBoundary: "quote-only-no-order-transaction-until-server-api-key",
        request: { inputMint, outputMint, amount, taker: taker || null, slippageBps },
        summary: {
          mode: "quote-only",
          router: "jupiter-v1-quote",
          inAmount: typeof quoteRaw.inAmount === "string" ? quoteRaw.inAmount : amount,
          outAmount: quoteRaw.outAmount,
          priceImpact: Number.isFinite(quotePriceImpact) ? quotePriceImpact : null,
          requestId: null,
          transactionAvailable: false,
        },
        raw: quoteRaw,
      };
    }
  }
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
  const sui = requireFromWebApp("@mysten/sui/grpc") as Record<string, unknown>;
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
  const SuiGrpcClient = sui.SuiGrpcClient as new (args: Record<string, unknown>) => unknown;
  const grpcUrl =
    process.env.IKA_SUI_GRPC_URL?.trim() ||
    (network === "mainnet" ? "https://fullnode.mainnet.sui.io:443" : "https://fullnode.testnet.sui.io:443");
  const suiClient = new SuiGrpcClient({ baseUrl: grpcUrl, network });
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
        error: "The QVAC runtime proof is unavailable.",
        fileError: "The QVAC runtime proof file is unavailable.",
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
  const cacheKey = wallet.trim();
  const cached = zerionPortfolioCache.get(cacheKey);
  const cacheTtlMs = Number(process.env.ZERION_PORTFOLIO_CACHE_TTL_MS || 10 * 60_000);
  if (cached && Date.now() - cached.cachedAt < cacheTtlMs) {
    return {
      ...cached.response,
      cache: {
        hit: true,
        cachedAt: new Date(cached.cachedAt).toISOString(),
        ttlMs: cacheTtlMs,
      },
    };
  }
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
  const rawRecord = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const data = rawRecord.data && typeof rawRecord.data === "object" ? (rawRecord.data as Record<string, unknown>) : {};
  const attributes =
    data.attributes && typeof data.attributes === "object" ? (data.attributes as Record<string, unknown>) : {};
  const total = attributes.total && typeof attributes.total === "object" ? (attributes.total as Record<string, unknown>) : {};
  const changes = attributes.changes && typeof attributes.changes === "object" ? (attributes.changes as Record<string, unknown>) : {};
  const byType =
    attributes.positions_distribution_by_type && typeof attributes.positions_distribution_by_type === "object"
      ? (attributes.positions_distribution_by_type as Record<string, unknown>)
      : {};
  const byChain =
    attributes.positions_distribution_by_chain && typeof attributes.positions_distribution_by_chain === "object"
      ? (attributes.positions_distribution_by_chain as Record<string, unknown>)
      : {};
  const result = {
    ok: response.ok,
    source: "zerion",
    status: response.status,
    wallet,
    walletAddress: wallet,
    currency: "usd",
    positionsFilter: "only_simple",
    summary: {
      totalPositionsUsd: typeof total.positions === "number" ? total.positions : null,
      absoluteChange1d: typeof changes.absolute_1d === "number" ? changes.absolute_1d : null,
      percentChange1d: typeof changes.percent_1d === "number" ? changes.percent_1d : null,
    },
    positionsDistributionByType: byType,
    positionsDistributionByChain: byChain,
    raw,
  };
  if (response.ok) {
    zerionPortfolioCache.set(cacheKey, { cachedAt: Date.now(), response: result });
  }
  if (!response.ok && response.status === 429 && cached) {
    return {
      ...cached.response,
      ok: true,
      status: 200,
      cache: {
        hit: true,
        staleBecause: "zerion-rate-limited",
        upstreamStatus: 429,
        cachedAt: new Date(cached.cachedAt).toISOString(),
        ttlMs: cacheTtlMs,
      },
    };
  }
  return result;
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

function pusdUtilityLayerStatus() {
  const mint = process.env.NEXT_PUBLIC_TREASURY_PUSD_MINT?.trim() || "";
  const receiveAddress =
    process.env.NEXT_PUBLIC_TREASURY_PUSD_RECEIVE_ADDRESS?.trim() ||
    process.env.NEXT_PUBLIC_TREASURY_RECEIVE_ADDRESS?.trim() ||
    "AZUroiNeGAjNdD84eEHnAKHHFwqAFmkjr2g1eoF7Ek5c";
  const tokenProgram =
    process.env.NEXT_PUBLIC_TREASURY_PUSD_TOKEN_PROGRAM?.trim() ||
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
  const decimals = Number(process.env.NEXT_PUBLIC_TREASURY_PUSD_DECIMALS || "6");
  const configured = Boolean(mint && receiveAddress && tokenProgram);

  return {
    ok: true,
    source: "privatedao-pusd-utility-layer",
    generatedAt: new Date().toISOString(),
    cluster: "testnet",
    asset: {
      symbol: "PUSD",
      name: "Palm USD",
      tokenStandard: "Solana SPL",
      decimals,
      mint: mint || null,
      tokenProgram,
      receiveAddress,
      freezeAuthorityModel: "non-freezable stablecoin posture; no blacklist or pause is assumed in the utility flow",
      complianceBoundary: "Mint/redeem permissioning belongs at the issuer layer; PrivateDAO utility flow handles approved transfers, claims, receipts, and governance context.",
      activationState: configured ? "pusd-spl-transferchecked-ready" : "official-mint-configuration-gated",
    },
    utilityMatrix: [
      {
        lane: "confidential-payroll",
        userProblem: "Teams do not want every salary, bonus, and contributor payment strategy exposed through public wallets.",
        prototype: "PUSD confidential payroll SKU, encrypted claim console, memo-coded receipt, and browser wallet signature path.",
        route: "https://privatedao.org/services/pusd-stablecoin/",
        claimUrl: "https://privatedao.org/services/pusd-stablecoin/?claim=pusd-stablecoin-treasury#privacy-claim-console",
        proofEndpoints: ["/api/v1/privacy-execution-claims/prepare?claim=pusd-stablecoin-treasury", "/api/v1/integration-matrix/anchor"],
        executionMode: configured ? "SPL TransferChecked PUSD" : "PUSD-mode SOL Testnet rehearsal until official mint is configured",
      },
      {
        lane: "grant-distribution",
        userProblem: "Grant committees need stable payout proof without scattering governance, approval, and payment evidence.",
        prototype: "Governed stablecoin billing request, Judge/Proof links, operation receipts, and public-safe attestation export.",
        route: "https://privatedao.org/services/pusd-stablecoin/",
        claimUrl: "https://privatedao.org/services/pusd-stablecoin/?claim=pusd-stablecoin-treasury#privacy-claim-console",
        proofEndpoints: ["/api/v1/execution-events/stats", "/api/v1/readiness"],
        executionMode: configured ? "wallet-signed PUSD transfer request" : "wallet-signed Testnet rehearsal with PUSD memo and proof path",
      },
      {
        lane: "gaming-reward-pool",
        userProblem: "Gaming DAOs and tournaments need stable rewards without leaking every allocation reason or payout plan.",
        prototype: "PUSD gaming reward SKU, reward-pool treasury profile, claim attestation, and explorer verification.",
        route: "https://privatedao.org/services/pusd-stablecoin/",
        claimUrl: "https://privatedao.org/services/pusd-stablecoin/?claim=pusd-stablecoin-treasury#privacy-claim-console",
        proofEndpoints: ["/api/v1/privacy-execution-matrix", "/api/v1/quicknode/stream/stats"],
        executionMode: configured ? "PUSD reward transfer plus claim receipt" : "PUSD-mode reward rehearsal plus on-chain memo claim",
      },
      {
        lane: "institutional-treasury-tooling",
        userProblem: "Treasury operators need stable payment routing, policy context, and proof that survives review.",
        prototype: "Jupiter route context, Torque event relay, QuickNode telemetry, Supabase receipts, and integration matrix anchor.",
        route: "https://privatedao.org/services/jupiter-treasury-route/",
        claimUrl: "https://privatedao.org/services/pusd-stablecoin/?claim=pusd-stablecoin-treasury#privacy-claim-console",
        proofEndpoints: ["/api/v1/provider-integrations/status", "/api/v1/pusd/utility-layer"],
        executionMode: "review -> sign -> verify treasury utility flow",
      },
    ],
    judgingMap: {
      technicalExecution:
        "Browser wallet flow builds memo-coded Testnet transactions now and upgrades to SPL TransferChecked when PUSD mint configuration is present.",
      productUseCase:
        "PUSD is used as the core stable settlement asset for payroll, grants, reward pools, and treasury operations.",
      innovation:
        "PrivateDAO combines non-freezable stablecoin utility with encrypted claims, governance approval, and public-safe receipts.",
      tractionValidation:
        "Visitor receipts, Supabase operation events, QuickNode telemetry, and anchored integration matrix provide observable usage evidence.",
      teamExecution:
        "The product route, API status, claim console, and read-node proof surfaces are shipped code rather than slides.",
    },
    publicProofLinks: {
      product: "https://privatedao.org/services/pusd-stablecoin/",
      utilityApi: "https://api.privatedao.org/api/v1/pusd/utility-layer",
      matrixAnchor: "https://api.privatedao.org/api/v1/integration-matrix/anchor",
      privacyClaims: "https://api.privatedao.org/api/v1/privacy-execution-claims",
      readiness: "https://api.privatedao.org/api/v1/readiness",
    },
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
        core: "Ika SDK, live network encryption key read, Solana pre-alpha approval route, and custody preparation route",
        proof: "/api/v1/ika/custody/prepare",
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
        status: "server-relay-delivery-verified",
        core: "/api/v1/torque/custom-event delivered a real private_treasury_execution custom_event through a scoped server ingestion key",
        eventName: "private_treasury_execution",
        eventId: process.env.TORQUE_CUSTOM_EVENT_ID || "cmpm5lolt00iajq1jjluy5a3m",
        lastIngestionId: process.env.TORQUE_LAST_INGESTION_ID || "4e660492-af75-4a28-9cb2-a81f7779be38",
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

function buildConfidentialRequestServiceMatrix(cryptographicReadiness: ReturnType<typeof cryptographicReadinessStatus>) {
  const memoProgram = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
  const requestClaims = [
    {
      service: "metadao-grant-review-workflow",
      route: "https://privatedao.org/services/?claim=metadao-grant-review-workflow#privacy-claim-console",
      executionMode: "MetaDAO-native grant review workflow from market-passed decision to confidential review, treasury approval, payout, prove layer, and public audit receipt",
      executionProofClass: "metadao-market-to-grant-workflow-plus-visitor-wallet-memo-attestation",
      currentOnchainStatus: "visitor-repeatable-metadao-workflow-claim-on-testnet",
      privacyRails: ["market decision", "private reviewer assignment", "private scoring", "treasury approval", "grant payout", "prove layer", "public audit receipt"],
      roles: ["Contributor", "Reviewer", "Treasury Manager", "Auditor"],
      coordinationGraph: ["Market Decision", "Grant Review", "Treasury Approval", "Payroll Allocation", "Execution", "Prove", "Audit Proof"],
      proofQuestions: ["who reviewed", "who approved", "who executed", "which receipt proves outcome"],
      proofEndpoints: ["/api/v1/privacy-execution-claims/prepare?claim=metadao-grant-review-workflow", "/api/v1/privacy-execution-matrix", "/api/v1/readiness"],
      privacyBoundary: "Reviewer notes, private scores, applicant context, and treasury reasoning stay encrypted before final award disclosure.",
    },
    {
      service: "confidential-treasury-request",
      route: "https://privatedao.org/services/?claim=confidential-treasury-request#privacy-claim-console",
      executionMode: "confidential treasury request with encrypted justification, staged approval, and public-safe audit trail",
      executionProofClass: "encrypted-treasury-request-plus-visitor-wallet-memo-attestation",
      currentOnchainStatus: "visitor-repeatable-encrypted-request-claim-on-testnet",
      privacyRails: ["encrypted treasury memo", "private supporting documents", "approval digest", "public-safe payout audit"],
      roles: ["Contributor", "Reviewer", "Treasury Manager", "Auditor"],
      coordinationGraph: ["Market Decision", "Treasury Request", "Treasury Approval", "Execution", "Prove", "Audit Proof"],
      proofQuestions: ["who requested", "who reviewed", "who approved", "who executed"],
      proofEndpoints: ["/api/v1/privacy-execution-claims/prepare?claim=confidential-treasury-request", "/api/v1/readiness"],
      privacyBoundary: "Request justification, vendor context, and negotiation details stay encrypted; approved amount and digest become auditable.",
    },
    {
      service: "confidential-payroll-request",
      route: "https://privatedao.org/payroll/?claim=confidential-payroll-request#privacy-claim-console",
      executionMode: "confidential payroll request with encrypted row context and REFHE proof path",
      executionProofClass: "refhe-payroll-request-plus-visitor-wallet-memo-attestation",
      currentOnchainStatus: "visitor-repeatable-payroll-request-claim-on-testnet",
      privacyRails: ["encrypted payroll rows", "REFHE computation context", "batch digest", "selective-disclosure receipt"],
      roles: ["Contributor", "Reviewer", "Treasury Manager", "Auditor"],
      coordinationGraph: ["Treasury Approval", "Payroll Allocation", "Execution", "Prove", "Audit Proof"],
      proofQuestions: ["who prepared", "who approved", "who executed", "which batch digest proves integrity"],
      proofEndpoints: ["/api/v1/privacy-execution-claims/prepare?claim=confidential-payroll-request", "/api/v1/refhe/payroll/proof"],
      privacyBoundary: "Contributor salary rows and bonus reasons stay private; batch digest and payout proof remain inspectable.",
    },
    {
      service: "security-incident-room-request",
      route: "https://privatedao.org/security/?claim=security-incident-room-request#privacy-claim-console",
      executionMode: "security incident room with encrypted response context and on-chain decision attestation",
      executionProofClass: "incident-room-digest-plus-visitor-wallet-memo-attestation",
      currentOnchainStatus: "visitor-repeatable-incident-room-claim-on-testnet",
      privacyRails: ["encrypted vulnerability notes", "responder quorum", "mitigation digest", "post-disclosure audit"],
      roles: ["Emergency Operator", "Reviewer", "Treasury Manager", "Auditor"],
      coordinationGraph: ["Security Signal", "Incident Room", "Emergency Approval", "Execution", "Prove", "Audit Proof"],
      proofQuestions: ["who opened the room", "who reviewed", "who approved response", "who executed mitigation"],
      proofEndpoints: ["/api/v1/privacy-execution-claims/prepare?claim=security-incident-room-request", "/api/v1/security"],
      privacyBoundary: "Exploit details and patch planning stay private until the team is ready to disclose.",
    },
    {
      service: "emergency-governance-request",
      route: "https://privatedao.org/govern/?claim=emergency-governance-request#privacy-claim-console",
      executionMode: "emergency governance request with private deliberation and public-safe execution accountability",
      executionProofClass: "emergency-governance-plus-visitor-wallet-memo-attestation",
      currentOnchainStatus: "visitor-repeatable-emergency-governance-claim-on-testnet",
      privacyRails: ["private evidence review", "fast approval digest", "execution handoff", "postmortem receipt"],
      roles: ["Emergency Operator", "Reviewer", "Treasury Manager", "Auditor"],
      coordinationGraph: ["Emergency Trigger", "Private Review", "Emergency Governance", "Execution", "Prove", "Audit Proof"],
      proofQuestions: ["who triggered", "who reviewed evidence", "who approved emergency action", "who executed"],
      proofEndpoints: ["/api/v1/privacy-execution-claims/prepare?claim=emergency-governance-request", "/api/v1/proposals", "/api/v1/runtime"],
      privacyBoundary: "Attack hypotheses and signer debate stay encrypted; final action and postmortem are auditable.",
    },
    {
      service: "confidential-grant-review-request",
      route: "https://privatedao.org/review/?claim=confidential-grant-review-request#privacy-claim-console",
      executionMode: "confidential grant review request with blinded evaluation and public-safe award verification",
      executionProofClass: "grant-review-digest-plus-visitor-wallet-memo-attestation",
      currentOnchainStatus: "visitor-repeatable-grant-review-claim-on-testnet",
      privacyRails: ["blind review notes", "committee quorum", "award digest", "grant execution receipt"],
      roles: ["Contributor", "Reviewer", "Treasury Manager", "Auditor"],
      coordinationGraph: ["Market Decision", "Grant Review", "Treasury Approval", "Execution", "Prove", "Audit Proof"],
      proofQuestions: ["who reviewed", "who approved award", "who executed grant", "what proves outcome"],
      proofEndpoints: ["/api/v1/privacy-execution-claims/prepare?claim=confidential-grant-review-request", "/api/v1/readiness"],
      privacyBoundary: "Reviewer notes, draft scores, and committee debate stay private; award decisions remain verifiable.",
    },
    {
      service: "partnership-negotiation-request",
      route: "https://privatedao.org/services/?claim=partnership-negotiation-request#privacy-claim-console",
      executionMode: "confidential partnership room that keeps negotiation private while proving final authorization",
      executionProofClass: "partnership-room-digest-plus-visitor-wallet-memo-attestation",
      currentOnchainStatus: "visitor-repeatable-partnership-room-claim-on-testnet",
      privacyRails: ["encrypted deal terms", "revenue split context", "integration milestones", "approval digest"],
      proofEndpoints: ["/api/v1/privacy-execution-claims/prepare?claim=partnership-negotiation-request", "/api/v1/provider-integrations/status"],
      privacyBoundary: "Terms and counterparties stay encrypted until announcement; final authorization remains auditable.",
    },
    {
      service: "ma-discussion-request",
      route: "https://privatedao.org/treasury/?claim=ma-discussion-request#privacy-claim-console",
      executionMode: "M&A coordination request with encrypted diligence and on-chain authorization proof",
      executionProofClass: "ma-room-digest-plus-visitor-wallet-memo-attestation",
      currentOnchainStatus: "visitor-repeatable-ma-room-claim-on-testnet",
      privacyRails: ["private valuation", "offer terms", "diligence packet", "mandate digest"],
      proofEndpoints: ["/api/v1/privacy-execution-claims/prepare?claim=ma-discussion-request", "/api/v1/readiness"],
      privacyBoundary: "Valuations, offers, and diligence stay private; mandate and final decision are verifier-visible.",
    },
    {
      service: "hiring-committee-request",
      route: "https://privatedao.org/payroll/?claim=hiring-committee-request#privacy-claim-console",
      executionMode: "confidential hiring committee request connected to payroll setup and audit-safe authorization",
      executionProofClass: "hiring-committee-digest-plus-visitor-wallet-memo-attestation",
      currentOnchainStatus: "visitor-repeatable-hiring-committee-claim-on-testnet",
      privacyRails: ["candidate review", "encrypted notes", "compensation band", "offer approval digest"],
      proofEndpoints: ["/api/v1/privacy-execution-claims/prepare?claim=hiring-committee-request", "/api/v1/refhe/payroll/proof"],
      privacyBoundary: "Candidate data and compensation bands stay encrypted; approved offer setup is auditable.",
    },
    {
      service: "research-coordination-request",
      route: "https://privatedao.org/intelligence/?claim=research-coordination-request#privacy-claim-console",
      executionMode: "research coordination request with encrypted memory vault and public-safe provenance",
      executionProofClass: "research-vault-digest-plus-visitor-wallet-memo-attestation",
      currentOnchainStatus: "visitor-repeatable-research-coordination-claim-on-testnet",
      privacyRails: ["private hypotheses", "early findings", "internal review", "release provenance digest"],
      proofEndpoints: ["/api/v1/privacy-execution-claims/prepare?claim=research-coordination-request", "/api/v1/qvac/runtime-proof"],
      privacyBoundary: "Early results and review notes stay encrypted until the organization approves release.",
    },
    {
      service: "reviewer-coordination-request",
      route: "https://privatedao.org/judge/?claim=reviewer-coordination-request#privacy-claim-console",
      executionMode: "reviewer coordination request that proves review integrity without exposing sensitive reviewer behavior",
      executionProofClass: "reviewer-coordination-digest-plus-visitor-wallet-memo-attestation",
      currentOnchainStatus: "visitor-repeatable-reviewer-coordination-claim-on-testnet",
      privacyRails: ["reviewer assignment", "conflict notes", "draft scoring", "bias-control digest"],
      proofEndpoints: ["/api/v1/privacy-execution-claims/prepare?claim=reviewer-coordination-request", "/api/v1/readiness"],
      privacyBoundary: "Reviewer assignments and comments stay private; final integrity controls remain inspectable.",
    },
    {
      service: "organizational-memory-vault",
      route: "https://privatedao.org/services/?claim=organizational-memory-vault#privacy-claim-console",
      executionMode: "organizational memory vault that turns private decision history into verifiable continuity",
      executionProofClass: "memory-vault-digest-plus-visitor-wallet-memo-attestation",
      currentOnchainStatus: "visitor-repeatable-memory-vault-claim-on-testnet",
      privacyRails: ["encrypted decision history", "progressive disclosure", "evidence packet", "continuity digest"],
      proofEndpoints: ["/api/v1/privacy-execution-claims/prepare?claim=organizational-memory-vault", "/api/v1/privacy-execution-matrix"],
      privacyBoundary: "Reasons, source documents, and internal memory stay in selective-disclosure vault packets.",
    },
    {
      service: "agent-governance-request",
      route: "https://privatedao.org/intelligence/?claim=agent-governance-request#privacy-claim-console",
      executionMode: "agent governance request that binds AI-prepared work to human approval and on-chain auditability",
      executionProofClass: "agent-governance-lineage-plus-visitor-wallet-memo-attestation",
      currentOnchainStatus: "visitor-repeatable-agent-governance-claim-on-testnet",
      privacyRails: ["agent intent", "human approval", "execution lineage", "outcome digest"],
      proofEndpoints: ["/api/v1/privacy-execution-claims/prepare?claim=agent-governance-request", "/api/v1/qvac/runtime-proof"],
      privacyBoundary: "Agent reasoning and rejected paths stay encrypted; approved intent and outcome remain auditable.",
    },
  ];

  return requestClaims.map((request) => ({
    ...request,
    visitorRepeatable: true,
    blockchainVerificationUrl: `https://explorer.solana.com/address/${cryptographicReadiness.programId}?cluster=testnet`,
    onchainEvidence: {
      memoProgram,
      programId: cryptographicReadiness.programId,
      flow: "Discuss -> Review -> Approve -> Execute -> Prove -> Audit",
      signingBoundary: "visitor wallet signs only a digest commitment; private payload stays in the encrypted browser receipt",
    },
    testnetExecutable: true,
  }));
}

function privacyExecutionMatrixStatus() {
  const cryptographicReadiness = cryptographicReadinessStatus();
  const generatedAt = new Date().toISOString();
  const engineeringReports = {
    proofLedger: "https://privatedao.org/documents/engineering-proof-ledger-2026-06-11/",
    proofLedgerJson: "https://privatedao.org/engineering-proof-ledger.json",
    magicblock: "https://privatedao.org/documents/magicblock-engineering-report-2026-06-11/",
    intelligence: "https://privatedao.org/documents/intelligence-provider-engineering-report-2026-06-11/",
    privacyEncryption: "https://privatedao.org/documents/privacy-encryption-engineering-report-2026-06-11/",
    treasuryAssetOracle: "https://privatedao.org/documents/treasury-asset-oracle-engineering-report-2026-06-11/",
    infrastructureTelemetry: "https://privatedao.org/documents/infrastructure-telemetry-engineering-report-2026-06-11/",
  };
  const specialistReviewMap = [
    {
      specialist: "Ika / 2PC-MPC engineer",
      services: ["ika-custody-and-interoperability", "ika-2pc-mpc-final-approval", "browser-encrypt-manifest"],
      report: engineeringReports.privacyEncryption,
      reviewerStart: "https://privatedao.org/services/encrypt-ika-operations/",
      proofEndpoints: [
        "/api/v1/ika/solana-prealpha/final-approval",
        "/api/v1/ika/solana-prealpha/readiness",
        "/api/v1/ika/custody/prepare",
      ],
      boundary:
        "Ika Solana approval, SDK readiness, and custody preparation are active. Final funded Ika-network dWallet DKG and final 2PC-MPC signature remain a separate stronger receipt class.",
    },
    {
      specialist: "REFHE engineer",
      services: ["confidential-payroll", "refhe-payroll-computation"],
      report: engineeringReports.privacyEncryption,
      reviewerStart: "https://privatedao.org/services/refhe-payroll-proof/",
      proofEndpoints: ["/api/v1/refhe/payroll/proof", "/api/v1/cryptographic-readiness"],
      boundary:
        "REFHE configure, settle, and payout execution evidence are Testnet proof. Full production FHE verifier acceptance remains a separate audit/release gate.",
    },
    {
      specialist: "ZK / commit-reveal engineer",
      services: ["private-governance", "zk-commit-reveal-governance"],
      report: engineeringReports.privacyEncryption,
      reviewerStart: "https://privatedao.org/try/",
      proofEndpoints: [
        "/api/v1/privacy-execution-claims/prepare?claim=zk-commit-reveal-governance",
        "/api/v1/cryptographic-readiness",
      ],
      boundary:
        "Commit/reveal and ZK proof artifacts are reviewer-visible. Native governance verifier CPI is not overclaimed unless a separate execution receipt is attached.",
    },
    {
      specialist: "Treasury / stablecoin / oracle engineer",
      services: ["treasury-routing-and-growth", "confidential-payroll", "refhe-payroll-computation"],
      report: engineeringReports.treasuryAssetOracle,
      reviewerStart: "https://privatedao.org/treasury/",
      proofEndpoints: ["/api/v1/provider-integrations/status", "/api/v1/jupiter/order"],
      boundary:
        "Asset context, price context, and route preview are separated from final signed real-funds settlement.",
    },
    {
      specialist: "MagicBlock engineer",
      services: ["private-payments", "magicblock-private-payments"],
      report: engineeringReports.magicblock,
      reviewerStart: "https://privatedao.org/documents/magicblock-engineering-report-2026-06-11/",
      proofEndpoints: ["/api/v1/magicblock/onchain-proof?refresh=1", "/api/v1/magicblock/health"],
      boundary:
        "MagicBlock private corridor evidence is active on Solana Testnet. ER/PER-native delegation, Magic Actions, and VRF remain explicit upgrade lanes unless separate receipts are attached.",
    },
    {
      specialist: "Private settlement / payout engineer",
      services: ["umbra-confidential-payout", "private-payments", "browser-encrypt-manifest"],
      report: engineeringReports.privacyEncryption,
      reviewerStart: "https://privatedao.org/services/umbra-confidential-payout/",
      proofEndpoints: ["/api/v1/private-settlement/intent", "/api/v1/privacy-execution-claims"],
      boundary:
        "Umbra/Cloak-style private settlement is represented through intent, relayer health, and encrypted claim receipts unless a provider-specific full claim settlement receipt is recorded.",
    },
    {
      specialist: "Governance / private-room engineer",
      services: ["private-governance", "zk-commit-reveal-governance"],
      report: engineeringReports.privacyEncryption,
      reviewerStart: "https://privatedao.org/rooms/",
      proofEndpoints: ["/api/v1/privacy-execution-matrix", "/api/v1/privacy-execution-claims"],
      boundary:
        "Public proposals can be visible while active vote counts, percentages, voter identity, vote intent, and private-room notes stay hidden until reveal policy permits disclosure.",
    },
    {
      specialist: "QVAC / intelligence-provider engineer",
      services: ["intelligence-and-risk"],
      report: engineeringReports.intelligence,
      reviewerStart: "https://privatedao.org/intelligence/",
      proofEndpoints: [
        "/api/v1/qvac/runtime-proof",
        "/api/v1/provider-integrations/status",
        "/api/v1/goldrush/query",
        "/api/v1/zerion/portfolio",
      ],
      boundary:
        "Intelligence runs before signing and must not receive hidden vote intent, encrypted vote contents, or private room notes by default.",
    },
    {
      specialist: "Infrastructure / RPC / telemetry engineer",
      services: ["intelligence-and-risk", "treasury-routing-and-growth"],
      report: engineeringReports.infrastructureTelemetry,
      reviewerStart: "https://api.privatedao.org/healthz",
      proofEndpoints: ["/api/v1/quicknode/stream/stats", "/api/v1/provider-integrations/status"],
      boundary:
        "RPC and stream counters are operational telemetry. They support proof monitoring but do not replace proposal-specific signatures.",
    },
  ];
  return {
    ok: true,
    source: "privatedao-privacy-execution-matrix",
    generatedAt,
    cluster: "testnet",
    programId: cryptographicReadiness.programId,
    posture: "wallet-first-private-operations",
    summary:
      "PrivateDAO routes every sensitive service through review, encryption or privacy intent, wallet execution, and public-safe verification. Public outputs prove state transitions without exposing payroll rows, recipient context, private balances, or strategy intent.",
    engineeringReports,
    specialistReviewMap,
    matrixUpgrade:
      "Every core privacy, encryption, intelligence, treasury, and infrastructure lane is now mapped to a specialist review path, engineering report, public proof endpoint, repository-backed boundary, and visitor-repeatable Testnet claim where applicable.",
    serviceMatrix: [
      ...buildConfidentialRequestServiceMatrix(cryptographicReadiness),
      {
        service: "private-governance",
        route: "https://privatedao.org/govern/",
        executionMode: "wallet-signed Solana Testnet governance",
        executionProofClass: "wallet-signed-onchain",
        visitorRepeatable: true,
        blockchainVerificationUrl: `https://explorer.solana.com/address/${cryptographicReadiness.programId}?cluster=testnet`,
        currentOnchainStatus: "repeatable-wallet-execution",
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
        service: "zk-commit-reveal-governance",
        route: "https://privatedao.org/govern/",
        executionMode: "ZK-backed commit/reveal governance claim with Testnet memo attestation",
        executionProofClass: "zk-receipt-plus-visitor-wallet-memo-attestation",
        visitorRepeatable: true,
        blockchainVerificationUrl: `https://explorer.solana.com/address/${cryptographicReadiness.programId}?cluster=testnet`,
        currentOnchainStatus: "commit-reveal-and-zk-claim-repeatable-on-testnet",
        privacyRails: ["commit vote", "reveal vote", "Groth16 transcript", "ZK verifier companion", "digest-only public attestation"],
        proofEndpoints: [
          "/api/v1/privacy-execution-claims/prepare?claim=zk-commit-reveal-governance",
          "/api/v1/cryptographic-readiness",
          "/api/v1/runtime",
          "/api/v1/proposals",
        ],
        onchainEvidence: {
          programId: cryptographicReadiness.programId,
          zkVerifierProgramId: "5H7Afyqdh5yPekkZJ5UM2j3HNB2bRvU8aVv8XoqeAW1j",
          zkReceiptTx: "zwqNsA3kNP1mgcaS6zNdR92LLdssFULXfsRdkMK3UxraKLM6wYDoPaWCwV3J9PqApK5xJJH8TpxsGyCRcdEah67",
        },
        testnetExecutable: true,
        privacyBoundary: "The visitor signs only a digest claim for the ZK/commit-reveal rail; vote salt, encrypted claim content, and local proof context remain outside public chain data.",
      },
      {
        service: "confidential-payroll",
        route: "https://privatedao.org/payroll/",
        executionMode: "encrypted manifest plus evidence-gated payout",
        executionProofClass: "onchain-signature",
        visitorRepeatable: true,
        blockchainVerificationUrl:
          "https://explorer.solana.com/tx/2a8sHWgiVCZkstybMff2M9R6DVU4Y96Rfsg8mqYs7K3xcYSEG1zMcq2iSTNwLD6FgfXvxxxWpwEP9Tbyin47RXvE?cluster=testnet",
        currentOnchainStatus: "testnet-executed",
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
        service: "refhe-payroll-computation",
        route: "https://privatedao.org/services/refhe-payroll-proof/",
        executionMode: "REFHE payroll computation receipt plus Testnet encrypted claim",
        executionProofClass: "encrypted-computation-receipt-plus-visitor-wallet-memo-attestation",
        visitorRepeatable: true,
        blockchainVerificationUrl:
          "https://explorer.solana.com/tx/2a8sHWgiVCZkstybMff2M9R6DVU4Y96Rfsg8mqYs7K3xcYSEG1zMcq2iSTNwLD6FgfXvxxxWpwEP9Tbyin47RXvE?cluster=testnet",
        currentOnchainStatus: "refhe-receipt-and-onchain-claim-repeatable",
        privacyRails: ["REFHE envelope", "ciphertext hash", "payroll integrity receipt", "visitor-signed digest claim"],
        proofEndpoints: [
          "/api/v1/refhe/payroll/proof",
          "/api/v1/privacy-execution-claims/prepare?claim=refhe-payroll-computation",
          "/api/v1/cryptographic-readiness",
        ],
        onchainEvidence: {
          configureTx: "3fygnmHzFpRQEbHq9q6u3djBnkTEcYz9y1TSwxDmbnuemshrMwLmy9CqpjifjRb7SmW3DbmXrkyq35cnjU7mMSPi",
          settleTx: "5TmS2AcpAmifcoG97U63Unzy7wt7B2NfyhBRs8Z6C4r1eqcWthEqf3GLcZXQ33sVYHf9YwfvBNhZD8ZZdt4HRwEY",
          executeTx: "2a8sHWgiVCZkstybMff2M9R6DVU4Y96Rfsg8mqYs7K3xcYSEG1zMcq2iSTNwLD6FgfXvxxxWpwEP9Tbyin47RXvE",
        },
        testnetExecutable: true,
        privacyBoundary: "Payroll rows and computation inputs stay encrypted; the chain and public receipt expose commitment continuity and final proof references only.",
      },
      {
        service: "browser-encrypt-manifest",
        route: "https://privatedao.org/services/encrypt-ika-operations/",
        executionMode: "browser AES-GCM encrypted operation manifest with wallet-signed Testnet commitment",
        executionProofClass: "client-encrypted-manifest-plus-visitor-wallet-memo-attestation",
        visitorRepeatable: true,
        blockchainVerificationUrl: `https://explorer.solana.com/address/${cryptographicReadiness.programId}?cluster=testnet`,
        currentOnchainStatus: "browser-encryption-and-memo-claim-repeatable",
        privacyRails: ["AES-GCM local encryption", "SHA-256 ciphertext digest", "public attestation export", "Solana Memo digest anchor"],
        proofEndpoints: [
          "/api/v1/privacy-execution-claims/prepare?claim=browser-encrypt-manifest",
          "/api/v1/encrypted-onboarding/request",
          "/api/v1/cryptographic-readiness",
        ],
        onchainEvidence: {
          memoProgram: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
          encryptionBoundary: "the AES key remains with the visitor unless explicitly exported",
        },
        testnetExecutable: true,
        privacyBoundary: "The browser encrypts first; only the digest commitment and public-safe claim metadata become verifiable outside the user's session.",
      },
      {
        service: "private-payments",
        route: "https://privatedao.org/services/magicblock-private-payments/",
        executionMode: "MagicBlock corridor and private payment proof lane",
        executionProofClass: "onchain-signature",
        visitorRepeatable: true,
        blockchainVerificationUrl:
          "https://explorer.solana.com/tx/22XW8XVhWwQtChNQK2aEqXv5BVBbckxUmu4NsisoZQW21KA5ii87gVNUTcNoZ9e1vYKnHmm62qP1girpzVXWN1WY?cluster=testnet",
        currentOnchainStatus: "testnet-corridor-settled",
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
        service: "magicblock-private-payments",
        route: "https://privatedao.org/services/magicblock-private-payments/",
        executionMode: "MagicBlock private payment corridor claim with Testnet on-chain settlement evidence",
        executionProofClass: "magicblock-corridor-receipt-plus-visitor-wallet-memo-attestation",
        visitorRepeatable: true,
        blockchainVerificationUrl:
          "https://explorer.solana.com/tx/22XW8XVhWwQtChNQK2aEqXv5BVBbckxUmu4NsisoZQW21KA5ii87gVNUTcNoZ9e1vYKnHmm62qP1girpzVXWN1WY?cluster=testnet",
        currentOnchainStatus: "magicblock-corridor-and-claim-repeatable-on-testnet",
        privacyRails: ["MagicBlock private corridor", "challenge/login boundary", "private balance API", "visitor-signed encrypted payment claim"],
        proofEndpoints: [
          "/api/v1/magicblock/onchain-proof?refresh=1",
          "/api/v1/magicblock/health",
          "/api/v1/privacy-execution-claims/prepare?claim=magicblock-private-payments",
        ],
        onchainEvidence: {
          configureTx: "4UiUumtuGeDciojDA26PkQby7RFiTNb12UG4ACcvGMGfQj24PUPxK5Apeno7EY8mbCvq8nR6h6nfxDcBpjPvGvPj",
          settleTx: "22XW8XVhWwQtChNQK2aEqXv5BVBbckxUmu4NsisoZQW21KA5ii87gVNUTcNoZ9e1vYKnHmm62qP1girpzVXWN1WY",
        },
        testnetExecutable: true,
        privacyBoundary: "The public proof shows corridor setup, settlement, and digest claim; private balance and counterparty context remain behind wallet-authenticated flows.",
      },
      {
        service: "umbra-confidential-payout",
        route: "https://privatedao.org/services/umbra-confidential-payout/",
        executionMode: "recipient-private claim intent and relayer health corridor",
        executionProofClass: "testnet-intent-receipt",
        visitorRepeatable: true,
        blockchainVerificationUrl: "https://explorer.solana.com/?cluster=testnet",
        currentOnchainStatus: "visitor-repeatable-intent-now-full-claim-signature-next",
        nextOnchainGate: "SDK proof_account_data + UTXO slot data + submitted Umbra claim transaction",
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
        executionMode: "Ika Solana final approval plus dWallet/2PC-MPC custody preparation",
        executionProofClass: "onchain-signature",
        visitorRepeatable: true,
        blockchainVerificationUrl:
          "https://explorer.solana.com/tx/3hvwNpfrUxdkt44VEEuXDXuhgcseVZxBhnZEBnWCCQYbsd9rv3eQe9JiCGZPc63Fa3CptQET5qkr7UKLQ1Ev4xki?cluster=devnet",
        currentOnchainStatus: "ika-solana-prealpha-final-approval-signed",
        nextOnchainGate: "funded dWallet DKG + final Ika-network 2PC-MPC signature receipt",
        privacyRails: ["Ika Solana final approval", "Ika Sui readiness", "Solana pre-alpha approval route", "2PC-MPC policy boundary"],
        proofEndpoints: ["/api/v1/ika/solana-prealpha/final-approval", "/api/v1/ika/solana-prealpha/readiness", "/api/v1/ika/solana-prealpha/approval/prepare", "/api/v1/ika/custody/prepare"],
        onchainEvidence: {
          signature: "3hvwNpfrUxdkt44VEEuXDXuhgcseVZxBhnZEBnWCCQYbsd9rv3eQe9JiCGZPc63Fa3CptQET5qkr7UKLQ1Ev4xki",
          protocol: "IKA_SOLANA_FINAL_APPROVAL_V1",
          operator: "EFpoUvDwHwQJDW1dY2otjRbeH8todKSe8kJK9M2U5g2P",
        },
        testnetExecutable: true,
        privacyBoundary: "Ika Solana final approval is signed on-chain through the pre-alpha operator. Ika-network dWallet DKG remains a separate receipt class.",
      },
      {
        service: "ika-2pc-mpc-final-approval",
        route: "https://privatedao.org/services/encrypt-ika-operations/",
        executionMode: "Ika 2PC-MPC custody approval claim with Solana pre-alpha final approval evidence",
        executionProofClass: "ika-final-approval-plus-visitor-wallet-memo-attestation",
        visitorRepeatable: true,
        blockchainVerificationUrl:
          "https://explorer.solana.com/tx/3hvwNpfrUxdkt44VEEuXDXuhgcseVZxBhnZEBnWCCQYbsd9rv3eQe9JiCGZPc63Fa3CptQET5qkr7UKLQ1Ev4xki?cluster=devnet",
        currentOnchainStatus: "ika-final-approval-evidenced-and-claim-repeatable",
        nextOnchainGate: "funded Ika-network dWallet DKG and final threshold signature receipt",
        privacyRails: ["Ika SDK readiness", "network encryption key read", "Solana pre-alpha approval", "2PC-MPC custody policy"],
        proofEndpoints: [
          "/api/v1/ika/solana-prealpha/final-approval",
          "/api/v1/ika/solana-prealpha/readiness",
          "/api/v1/ika/solana-prealpha/approval/prepare",
          "/api/v1/ika/custody/prepare",
          "/api/v1/privacy-execution-claims/prepare?claim=ika-2pc-mpc-final-approval",
        ],
        onchainEvidence: {
          signature: "3hvwNpfrUxdkt44VEEuXDXuhgcseVZxBhnZEBnWCCQYbsd9rv3eQe9JiCGZPc63Fa3CptQET5qkr7UKLQ1Ev4xki",
          protocol: "IKA_SOLANA_FINAL_APPROVAL_V1",
          operator: "EFpoUvDwHwQJDW1dY2otjRbeH8todKSe8kJK9M2U5g2P",
        },
        testnetExecutable: true,
        privacyBoundary: "The Ika claim proves the custody approval rail and visitor attestation; final distributed key generation is recorded as the next stronger evidence class.",
      },
      {
        service: "intelligence-and-risk",
        route: "https://privatedao.org/intelligence/",
        executionMode: "provider intelligence before private execution",
        executionProofClass: "provider-plus-rpc-receipt",
        visitorRepeatable: true,
        blockchainVerificationUrl: `https://explorer.solana.com/address/${cryptographicReadiness.programId}?cluster=testnet`,
        currentOnchainStatus: "pre-sign-intelligence-feeds-wallet-execution",
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
        executionProofClass: "wallet-reviewed-route-plus-ingestion-receipt",
        visitorRepeatable: true,
        blockchainVerificationUrl: `https://explorer.solana.com/address/${cryptographicReadiness.programId}?cluster=testnet`,
        currentOnchainStatus: "route-preview-and-growth-ingestion-live-final-swap-signature-next",
        nextOnchainGate: "wallet-signed Jupiter execution transaction governed by treasury policy",
        privacyRails: ["Jupiter Developer Platform order mode", "Torque custom event relay", "policy-scoped execution receipts"],
        proofEndpoints: ["/api/v1/provider-integrations/status", "/api/v1/jupiter/order", "/api/v1/torque/custom-event", "/api/v1/execution-events/stats"],
        onchainEvidence: {
          signingBoundary: "wallet-reviewed execution, not server-held user funds",
        },
        testnetExecutable: true,
        privacyBoundary: "Treasury route preparation is separated from final wallet signing; growth events are relayed only with scoped server credentials.",
      },
      {
        service: "torque-mcp-growth-loop",
        route: "https://privatedao.org/services/torque-growth-loop/",
        executionMode: "Torque MCP growth-loop event claim tied to governed treasury execution",
        executionProofClass: "torque-ingestion-receipt-plus-visitor-wallet-memo-attestation",
        visitorRepeatable: true,
        blockchainVerificationUrl: `https://explorer.solana.com/address/${cryptographicReadiness.programId}?cluster=testnet`,
        currentOnchainStatus: "torque-event-delivery-and-claim-repeatable",
        privacyRails: ["Torque custom event", "MCP workflow boundary", "growth loop policy", "visitor-signed claim digest"],
        proofEndpoints: [
          "/api/v1/torque/custom-event",
          "/api/v1/provider-integrations/status",
          "/api/v1/privacy-execution-claims/prepare?claim=torque-mcp-growth-loop",
        ],
        onchainEvidence: {
          eventName: "private_treasury_execution",
          signingBoundary: "Torque event delivery is a server receipt; visitor Testnet memo claim provides the on-chain attestation path.",
        },
        testnetExecutable: true,
        privacyBoundary: "Growth-loop telemetry is scoped to event metadata and policy receipts; sensitive treasury context is represented by digest claim and proof links.",
      },
      {
        service: "pusd-stablecoin-treasury",
        route: "https://privatedao.org/services/pusd-stablecoin/",
        executionMode: "PUSD utility layer for private payroll, grants, gaming rewards, and treasury operations",
        executionProofClass: "wallet-reviewed-stablecoin-utility-plus-visitor-attestation",
        visitorRepeatable: true,
        blockchainVerificationUrl: `https://explorer.solana.com/address/${cryptographicReadiness.programId}?cluster=testnet`,
        currentOnchainStatus: "pusd-utility-claim-live-spl-transferchecked-configuration-gated",
        nextOnchainGate: "official PUSD mint, funded receive account, token account readiness, and wallet-signed SPL TransferChecked settlement",
        privacyRails: [
          "non-freezable PUSD SPL utility posture",
          "confidential payroll and grants context",
          "encrypted visitor claim packet",
          "Supabase operation receipt",
          "integration matrix anchor",
        ],
        proofEndpoints: [
          "/api/v1/pusd/utility-layer",
          "/api/v1/privacy-execution-claims/prepare?claim=pusd-stablecoin-treasury",
          "/api/v1/integration-matrix/anchor",
          "/api/v1/readiness",
        ],
        onchainEvidence: {
          matrixAnchorEndpoint: "/api/v1/integration-matrix/anchor",
          memoProgram: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
          settlementBoundary: "visitor wallet signs Testnet memo claim now; SPL TransferChecked activates when official PUSD mint config is present",
        },
        testnetExecutable: true,
        privacyBoundary:
          "Payroll, grant, and reward context is encrypted into the local claim packet; the public chain receives a digest commitment and reviewer-safe receipt rather than sensitive stablecoin operating details.",
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
      integrationMatrixAnchor: "https://api.privatedao.org/api/v1/integration-matrix/anchor",
      judge: "https://privatedao.org/judge/",
      proof: "https://privatedao.org/proof/",
    },
    claimBoundary: cryptographicReadiness.claimBoundary,
  };
}

function privacyExecutionClaimsStatus() {
  const matrix = privacyExecutionMatrixStatus();
  const universalClaimAttestation = {
    protocol: "PDAO_ENCRYPTED_CLAIM_V1",
    proofClass: "visitor-wallet-memo-attestation",
    memoProgram: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
    cluster: "testnet",
    repeatabilityModel:
      "Every visitor creates a fresh AES-GCM encrypted packet, hashes the ciphertext, signs a new Solana Testnet Memo transaction from their own wallet, and verifies the resulting signature on Explorer.",
    explorerAfterSignature: "https://explorer.solana.com/tx/<signature>?cluster=testnet",
  };
  return {
    ok: true,
    source: "privatedao-privacy-execution-claims",
    generatedAt: new Date().toISOString(),
    cluster: matrix.cluster,
    programId: matrix.programId,
    universalClaimAttestation,
    claimPolicy:
      "Every privacy/encryption claim must be visitor-repeatable on Solana Testnet and must expose either a blockchain explorer URL or a live receipt endpoint. Browser claims use an AES-GCM local encrypted packet, produce a selective-disclosure receipt, export a public attestation without the AES key, and anchor only a digest commitment on-chain. Intent/readiness claims are not promoted to final on-chain settlement until the missing signature exists.",
    claims: matrix.serviceMatrix.map((service) => ({
      service: service.service,
      route: service.route,
      claim: service.executionMode,
      nativeProofClass: service.executionProofClass,
      proofClass: universalClaimAttestation.proofClass,
      visitorRepeatable: service.visitorRepeatable,
      visitorClaimRepeatable: true,
      currentOnchainStatus: service.currentOnchainStatus,
      blockchainVerificationUrl: service.blockchainVerificationUrl,
      claimPrepareUrl: `/api/v1/privacy-execution-claims/prepare?claim=${encodeURIComponent(service.service)}`,
      claimMemoTemplate: [
        universalClaimAttestation.protocol,
        service.service,
        universalClaimAttestation.proofClass,
        "<sha256-ciphertext-digest-prefix>",
      ].join(":"),
      repeatabilityModel: universalClaimAttestation.repeatabilityModel,
      proofEndpoints: service.proofEndpoints,
      onchainEvidence: service.onchainEvidence,
      nextOnchainGate: "nextOnchainGate" in service ? service.nextOnchainGate : null,
    })),
    mustPass: [
      "visitorRepeatable === true for every claim",
      "executionProofClass is explicit for every claim",
      "blockchainVerificationUrl points to Solana Testnet explorer for every claim",
      "browser claim console anchors PDAO_ENCRYPTED_CLAIM_V1 digest commitments",
      "every claim exposes visitor-wallet-memo-attestation as the repeatable on-chain claim layer",
      "every claim exposes /api/v1/privacy-execution-claims/prepare?claim=<rail>",
      "browser claim console exposes a local selective-disclosure receipt verifier",
      "browser claim console separates public attestation from private disclosure",
      "on-chain signature claims must include transaction evidence",
      "intent/readiness claims must keep their nextOnchainGate visible",
    ],
  };
}

function ikaSolanaFinalApprovalStatus() {
  return {
    ok: true,
    source: "privatedao-ika-solana-final-approval",
    generatedAt: "2026-05-27T13:17:06.880Z",
    network: "devnet",
    clusterLabel: "ika-solana-prealpha",
    protocol: "IKA_SOLANA_FINAL_APPROVAL_V1",
    programId: "87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY",
    memoProgram: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
    operator: "EFpoUvDwHwQJDW1dY2otjRbeH8todKSe8kJK9M2U5g2P",
    routeDigest: "61ee0b81a0b58f8426f8d1bb1c92db5dc91959ee29acbc8fdf764f920b5f11bf",
    memo: "IKA_SOLANA_FINAL_APPROVAL_V1:87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY:EFpoUvDwHwQJDW1dY2otjRbeH8todKSe8kJK9M2U5g2P:61ee0b81a0b58f8426f8d1bb1c92db5dc91959ee",
    signature: "3hvwNpfrUxdkt44VEEuXDXuhgcseVZxBhnZEBnWCCQYbsd9rv3eQe9JiCGZPc63Fa3CptQET5qkr7UKLQ1Ev4xki",
    explorerUrl:
      "https://explorer.solana.com/tx/3hvwNpfrUxdkt44VEEuXDXuhgcseVZxBhnZEBnWCCQYbsd9rv3eQe9JiCGZPc63Fa3CptQET5qkr7UKLQ1Ev4xki?cluster=devnet",
    boundary:
      "This is a real Solana operator-signed final approval attestation for the Ika pre-alpha custody route. It does not claim a Sui dWallet DKG transaction unless a separate Ika dWallet receipt is recorded.",
  };
}

function frontierPrivacyProtocolSpineStatus() {
  const matrix = privacyExecutionMatrixStatus();
  const crypto = cryptographicReadinessStatus();
  const ikaSolanaFinalApproval = ikaSolanaFinalApprovalStatus();
  const claimLayer = privacyExecutionClaimsStatus().universalClaimAttestation;
  const findService = (service: string) => matrix.serviceMatrix.find((entry) => entry.service === service);
  const confidentialPayroll = findService("confidential-payroll");
  const privatePayments = findService("private-payments");
  const ikaCustody = findService("ika-custody-and-interoperability");
  const txUrl = (signature: string) => "https://explorer.solana.com/tx/" + signature + "?cluster=testnet";

  return {
    ok: true,
    source: "privatedao-frontier-privacy-protocol-spine",
    generatedAt: new Date().toISOString(),
    cluster: "testnet",
    posture: "protocol-native-first-with-visitor-repeatable-onchain-claim",
    standard:
      "Every Frontier privacy rail must expose a native live proof endpoint, a visitor-repeatable Solana Testnet Memo claim, and a clear next native on-chain gate when final settlement is not yet recorded.",
    universalVisitorClaim: claimLayer,
    protocols: [
      {
        id: "encrypt-refhe-confidential-payroll",
        track: "Encrypt / REFHE encrypted capital markets",
        productRoute: "https://privatedao.org/services/encrypt-ika-operations/",
        nativeStatus: "testnet-refhe-envelope-settled-and-evidence-gated-payout-executed",
        nativeProofClass: confidentialPayroll?.executionProofClass || "onchain-signature",
        visitorRepeatableOnchainClaim: true,
        nativeProofEndpoints: ["/api/v1/refhe/payroll/proof", "/api/v1/cryptographic-readiness"],
        blockchainVerificationUrls: [
          txUrl("3fygnmHzFpRQEbHq9q6u3djBnkTEcYz9y1TSwxDmbnuemshrMwLmy9CqpjifjRb7SmW3DbmXrkyq35cnjU7mMSPi"),
          txUrl("5TmS2AcpAmifcoG97U63Unzy7wt7B2NfyhBRs8Z6C4r1eqcWthEqf3GLcZXQ33sVYHf9YwfvBNhZD8ZZdt4HRwEY"),
          txUrl("2a8sHWgiVCZkstybMff2M9R6DVU4Y96Rfsg8mqYs7K3xcYSEG1zMcq2iSTNwLD6FgfXvxxxWpwEP9Tbyin47RXvE"),
        ],
        coreIntegration: [
          "encrypted manifest hash",
          "REFHE envelope configure and settle receipts",
          "evidence-gated payout execution",
          "selective-disclosure receipt",
        ],
        visitorAction: "Run REFHE payroll proof, generate an encrypted receipt, then anchor a fresh visitor memo claim from the wallet.",
        nextNativeOnchainGate: "production FHE verifier boundary and audited confidential computation policy",
      },
      {
        id: "magicblock-private-payments-per",
        track: "MagicBlock ER / PER / Private Payments API",
        productRoute: "https://privatedao.org/services/magicblock-private-payments/",
        nativeStatus: "testnet-private-corridor-settled-with-finalized-solana-receipts",
        nativeProofClass: privatePayments?.executionProofClass || "onchain-signature",
        visitorRepeatableOnchainClaim: true,
        nativeProofEndpoints: ["/api/v1/magicblock/onchain-proof?refresh=1", "/api/v1/magicblock/health", "/api/v1/magicblock/challenge?pubkey=<wallet>"],
        blockchainVerificationUrls: [
          txUrl("4UiUumtuGeDciojDA26PkQby7RFiTNb12UG4ACcvGMGfQj24PUPxK5Apeno7EY8mbCvq8nR6h6nfxDcBpjPvGvPj"),
          txUrl("22XW8XVhWwQtChNQK2aEqXv5BVBbckxUmu4NsisoZQW21KA5ii87gVNUTcNoZ9e1vYKnHmm62qP1girpzVXWN1WY"),
          txUrl("2a8sHWgiVCZkstybMff2M9R6DVU4Y96Rfsg8mqYs7K3xcYSEG1zMcq2iSTNwLD6FgfXvxxxWpwEP9Tbyin47RXvE"),
        ],
        coreIntegration: [
          "MagicBlock private payment corridor",
          "challenge/login authenticated private reads",
          "private balance boundary",
          "wallet-signed continuation",
        ],
        visitorAction: "Open the MagicBlock lane, start challenge/login for private reads, and anchor a fresh payment-rail claim from the visitor wallet.",
        nextNativeOnchainGate: "PER delegated permission account session with commit or commit-and-undelegate transcript",
      },
      {
        id: "ika-2pc-mpc-dwallet-custody",
        track: "Ika 2PC-MPC / dWallet bridgeless custody",
        productRoute: "https://privatedao.org/services/encrypt-ika-operations/",
        nativeStatus: "solana-prealpha-final-approval-signed-onchain",
        nativeProofClass: "onchain-signature",
        visitorRepeatableOnchainClaim: true,
        nativeProofEndpoints: ["/api/v1/ika/solana-prealpha/final-approval", "/api/v1/ika/solana-prealpha/readiness", "/api/v1/ika/solana-prealpha/approval/prepare", "/api/v1/ika/custody/prepare"],
        blockchainVerificationUrls: [ikaSolanaFinalApproval.explorerUrl, "https://explorer.solana.com/address/87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY?cluster=devnet"],
        coreIntegration: [
          "@ika.xyz/sdk initialization",
          "live Ika network encryption key read",
          "Solana pre-alpha final approval signature",
          "dWallet DKG and sign transaction plan",
        ],
        onchainEvidence: ikaSolanaFinalApproval,
        visitorAction: "Open the Ika Solana final approval signature, run custody preparation, then anchor a fresh 2PC-MPC route claim from the visitor wallet.",
        nextNativeOnchainGate: "funded dWallet DKG plus final Ika 2PC-MPC signature receipt",
        boundary: "Ika Solana final approval is signed on-chain. Sui dWallet DKG remains a separate Ika-network receipt unless recorded separately.",
      },
    ],
    mustPass: [
      "REFHE must keep finalized Solana Testnet transaction evidence",
      "MagicBlock must keep finalized Solana Testnet corridor and payout receipts",
      "Ika must keep a real Solana pre-alpha final approval signature plus SDK readiness and the explicit dWallet DKG gate",
      "Every protocol must expose visitorRepeatableOnchainClaim === true",
      "Every protocol must expose nativeProofEndpoints and blockchainVerificationUrls",
      "Every protocol routes to the browser claim console for a fresh PDAO_ENCRYPTED_CLAIM_V1 Memo transaction",
    ],
    claimBoundary: crypto.claimBoundary,
  };
}

function privacyExecutionClaimPrepare(searchParams: URLSearchParams) {
  const matrix = privacyExecutionMatrixStatus();
  const claimId = searchParams.get("claim") || "private-governance";
  const digest = searchParams.get("digest") || "<sha256-ciphertext-digest-prefix>";
  const service = matrix.serviceMatrix.find((entry) => entry.service === claimId);

  if (!service) {
    return {
      ok: false,
      source: "privatedao-privacy-execution-claim-prepare",
      error: `Unknown privacy claim: ${claimId}`,
      acceptedClaims: matrix.serviceMatrix.map((entry) => entry.service),
    };
  }

  const digestPrefix = digest === "<sha256-ciphertext-digest-prefix>" ? digest : digest.slice(0, 40);
  const digestLooksValid = digest === "<sha256-ciphertext-digest-prefix>" || /^[a-f0-9]{40,64}$/i.test(digest);
  const claimProofClass = "visitor-wallet-memo-attestation";
  const memo = ["PDAO_ENCRYPTED_CLAIM_V1", service.service, claimProofClass, digestPrefix].join(":");

  return {
    ok: digestLooksValid,
    source: "privatedao-privacy-execution-claim-prepare",
    generatedAt: new Date().toISOString(),
    cluster: matrix.cluster,
    service: service.service,
    label: service.executionMode,
    nativeProofClass: service.executionProofClass,
    proofClass: claimProofClass,
    memoProgram: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
    memo,
    digestPrefix,
    digestValidation: digestLooksValid ? "valid-or-template" : "invalid-hex-digest",
    signingModel: "visitor-wallet-signs-solana-testnet-memo-transaction",
    explorerAfterSignature: "https://explorer.solana.com/tx/<signature>?cluster=testnet",
    privacyBoundary:
      "The Solana transaction anchors only the digest commitment. The AES key and private disclosure receipt stay with the visitor unless explicitly shared.",
    steps: [
      "Create AES-GCM encrypted claim packet in the browser.",
      "Hash ciphertext with SHA-256.",
      "Build a Solana Memo Program instruction with the returned memo.",
      "Sign from the visitor Testnet wallet.",
      "Open the returned transaction signature on Solana Explorer or Solscan.",
    ],
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

  if (await kernelGatewayService.handle(req, res)) return;

  try {
    if (req.method === "GET" && pathname.startsWith("/api/v1/payroll/verify/")) {
      const token = decodeURIComponent(pathname.slice("/api/v1/payroll/verify/".length));
      const result = getPayrollPublicVerification(token);
      writeJson(res, result.status, result.body);
      return;
    }

    if (req.method === "POST" && pathname === "/api/v1/private-settlement/intent") {
      const body = await readRequestJson(req);
      const receipt = await handlePrivateSettlementIntent(body);
      writeJson(res, 200, receipt);
      return;
    }

    if (req.method === "POST" && pathname === "/api/v1/payroll") {
      const body = await readRequestJsonWithLimit(req, 256_000);
      const result = await handlePayrollDomain(body as Record<string, unknown>, req);
      writeJson(res, result.status, result.body);
      return;
    }

    if (req.method === "POST" && pathname === "/api/v1/payroll/session") {
      const body = await readRequestJsonWithLimit(req, 16_000);
      const result = await handlePayrollWalletSession(body as Record<string, unknown>);
      writeJson(res, result.status, result.body);
      return;
    }

    if (req.method === "POST" && pathname === "/api/v1/payroll/umbra") {
      const body = await readRequestJsonWithLimit(req, 48_000);
      const result = await handlePayrollUmbra(body as Record<string, unknown>);
      writeJson(res, 200, result);
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

    if (req.method === "POST" && pathname === "/api/v1/proof-workflows/credit-limit/run") {
      const body = await readRequestJsonWithLimit(req, 96_000);
      let result;
      try {
        result = await handleCreditLimitWorkflow(body as Record<string, unknown>);
      } catch (error) {
        const errorMessage = "Customer data import failed.";
        result = {
          ok: false,
          source: "privatedao-proof-workflows-credit-limit",
          status: "import-failed",
          error: "Proof was not issued because customer data could not be imported.",
          workflowId: stringField(body as Record<string, unknown>, "workflowId", "unissued-import-failed"),
          publicOutcome: "proof-not-issued",
          issuedCreditLimitUsd: 0,
          validationErrors: [errorMessage],
          stageResults: [
            {
              id: "data-import",
              label: "Import Customer Data",
              status: "failed",
            },
            {
              id: "proof-generation",
              label: "Generate Proof",
              status: "blocked",
            },
          ],
          verification: {
            processExisted: false,
            processCompleted: false,
            requiredApprovalsHappened: false,
            requiredSequenceRespected: false,
          },
          privateDataExcluded: [
            "raw customer id",
            "raw earnings",
            "raw payout records",
            "raw transactions",
            "internal threshold formula inputs",
          ],
        };
      }
      writeJson(res, result.ok ? 200 : 422, result);
      return;
    }

    if (req.method === "POST" && pathname === "/api/v1/proof-workflows/blind-policy/prove") {
      const body = await readRequestJsonWithLimit(req, 96_000);
      let result;
      try {
        result = await handleBlindPolicyWorkflow(body as Record<string, unknown>);
      } catch (error) {
        result = {
          ok: false,
          source: "privatedao-blind-policy-verification",
          status: "proof-not-issued",
          error: "Proof was not issued because the private policy proof could not be generated and verified.",
          workflowId: stringField(body as Record<string, unknown>, "workflowId", "unissued-blind-policy"),
          publicOutcome: "proof-not-issued",
          validationErrors: ["Blind policy proof failed."],
          privateDataExcluded: [
            "raw subject identity",
            "private record values",
            "risk score",
            "liabilities",
            "policy thresholds",
            "internal policy formula",
          ],
        };
      }
      writeJson(res, result.ok ? 200 : 422, result);
      return;
    }

    if (req.method === "GET" && pathname === "/api/v1/proof-workflows/blind-policy/sample") {
      writeJson(res, 200, {
        ok: true,
        source: "privatedao-blind-policy-sample-private-inputs",
        privateInputs: {
          organizationId: "sample-lender-001",
          subjectId: "customer-redacted-4381",
          membershipVerified: true,
          records: [{ amountUsd: 8800 }, { amountUsd: 9400 }, { amountUsd: 9200 }],
          riskScore: 84,
          liabilitiesUsd: 2400,
        },
        publicPolicyShape: {
          policyId: blindPolicyRules.policyIdLabel,
          proofType: "Groth16 ZK policy proof",
          publicSignals: ["policyId", "policyCommitment", "inputCommitment", "satisfiedClaim"],
        },
        note: "Customers can replace this with their own private data. The API issues a proof only when Groth16 generation and verification succeed.",
      });
      return;
    }

    if (req.method === "POST" && pathname === "/api/v1/proof-workflows/blind-policy/verify") {
      const body = await readRequestJsonWithLimit(req, 256_000);
      const proofPackage =
        body && typeof body === "object" && !Array.isArray(body) && "publicProofPackage" in body
          ? (body as Record<string, unknown>).publicProofPackage
          : body && typeof body === "object" && !Array.isArray(body) && "proofPackage" in body
            ? (body as Record<string, unknown>).proofPackage
          : body;
      const verification = verifyBlindPolicyProofPackage(proofPackage);
      writeJson(res, verification.ok ? 200 : 422, {
        ok: verification.ok,
        source: "privatedao-blind-policy-verifier",
        status: verification.status,
        match: verification.match,
        originalHash: verification.originalHash,
        recomputedHash: verification.recomputedHash,
        message: verification.message,
        verification,
        explanation:
          "We verify the Groth16 proof against public signals, then recompute the public proof package hash. If anything changes, verification fails.",
      });
      return;
    }

    if (req.method === "POST" && pathname === "/api/v1/proof-workflows/blind-policy/onchain-receipt") {
      const body = await readRequestJsonWithLimit(req, 256_000);
      const proofPackage =
        body && typeof body === "object" && !Array.isArray(body) && "publicProofPackage" in body
          ? (body as Record<string, unknown>).publicProofPackage
          : body && typeof body === "object" && !Array.isArray(body) && "proofPackage" in body
            ? (body as Record<string, unknown>).proofPackage
            : body;
      let result;
      try {
        result = await submitBlindPolicyReceiptOnchain(proofPackage as BlindPolicyPublicProofPackage);
      } catch (error) {
        result = {
          ok: false,
          source: "solana-anchor-receipt-registry",
          status: "onchain-receipt-failed",
          error: "Failed to submit the blind policy receipt on-chain.",
        };
      }
      writeJson(res, result.ok ? 200 : 422, result);
      return;
    }

    if (req.method === "POST" && pathname === "/api/v1/records/anchor") {
      const body = await readRequestJsonWithLimit(req, 32_000);
      let result;
      try {
        result = await handleRecordReceiptAnchor(body as Record<string, unknown>);
      } catch (error) {
        result = { ok: false, anchorStatus: "failed", error: "Record anchoring failed." };
      }
      writeJson(res, result.ok ? 200 : 502, result);
      return;
    }

    if (req.method === "POST" && pathname === "/api/v1/records/anchor/reconcile") {
      const body = await readRequestJsonWithLimit(req, 16_000);
      let result;
      try {
        result = await reconcileRecordReceiptAnchor(body as Record<string, unknown>);
      } catch (error) {
        result = { ok: false, anchorStatus: "failed", error: "Record anchor reconciliation failed." };
      }
      writeJson(res, result.ok ? 200 : 502, result);
      return;
    }

    if (req.method === "GET" && pathname === "/api/v1/proof-workflows/blind-policy/status") {
      const circuit = "private_dao_blind_policy_overlay";
      const artifacts = {
        circuit: `zk/circuits/${circuit}.circom`,
        wasm: `zk/build/${circuit}_js/${circuit}.wasm`,
        provingKey: `zk/setup/${circuit}_final.zkey`,
        verificationKey: `zk/setup/${circuit}_vkey.json`,
      };
      writeJson(res, 200, {
        ok: true,
        source: "privatedao-blind-policy-status",
        product: "Blind Policy Verification",
        proofSystem: "Groth16",
        proofSystems: {
          groth16: {
            status: "live",
            implementation: "Circom witness generation + snarkjs groth16 prove + snarkjs groth16 verify",
          },
          plonk: {
            status: "not-claimed",
            implementation: null,
          },
          stark: {
            status: "not-claimed",
            implementation: null,
          },
          recursiveProofs: {
            status: "not-claimed",
            implementation: null,
          },
          solanaOnchainVerification: {
            status: "receipt-registry-with-memo-fallback",
            implementation:
              "Attempts to store the already verified blind policy receipt hashes in an Anchor PDA receipt account. If the Anchor receipt program is unavailable, the same hashes are stored in a Solana Memo receipt transaction. This is not a claim of full Groth16 pairing verification on-chain.",
            programId: blindPolicyVerifierProgramId.toBase58(),
            cluster: blindPolicyOnchainCluster(),
            endpoint: "/api/v1/proof-workflows/blind-policy/onchain-receipt",
          },
        },
        onchainReceipt: {
          endpoint: "/api/v1/proof-workflows/blind-policy/onchain-receipt",
          programId: blindPolicyVerifierProgramId.toBase58(),
          cluster: blindPolicyOnchainCluster(),
          fallback: "solana-memo-receipt",
          pdaSeeds: ["blind_policy_receipt", "authority", "sha256(proofId)"],
          stores: [
            "proofIdHash",
            "proofHash",
            "policyCommitmentHash",
            "inputCommitmentHash",
            "verificationKeyHash",
            "circuitVersionHash",
            "policyVersionHash",
          ],
        },
        proofTruthBoundary: {
          liveVerified: "Groth16 witness generation and snarkjs verification run on this endpoint before a proof package is issued.",
          commitmentOnly: [
            "REFHE lane is a commitment boundary unless a separate REFHE receipt is attached.",
            "Ika / Encrypt 2PC-MPC lane is a commitment boundary unless a separate Ika final DKG/signing receipt is attached.",
            "MagicBlock lane is a commitment boundary unless a separate MagicBlock execution receipt is attached.",
          ],
        },
        publicSignals: ["policyId", "policyCommitment", "inputCommitment", "satisfiedClaim"],
        privateWitness: [
          "organizationKey",
          "subjectKey",
          "membershipVerified",
          "private records",
          "liabilities",
          "riskScore",
          "policy thresholds",
          "policy salt",
          "input salt",
        ],
        artifacts: Object.fromEntries(
          Object.entries(artifacts).map(([key, relativePath]) => [
            key,
            {
              path: relativePath,
              available: existsSync(zkArtifactPath(relativePath)),
              sha256: existsSync(zkArtifactPath(relativePath)) ? hashFileHex(relativePath) : null,
            },
          ]),
        ),
      });
      return;
    }

    if (req.method === "GET" && pathname === "/api/v1/txline/status") {
      writeJson(res, 200, {
        ok: true,
        source: "privatedao-txline-settlement-status",
        product: "PrivateDAO Match Settlement",
        track: "TxODDS / TxLINE Prediction Markets and Settlement",
        providerMode: txlineProviderMode(),
        txlineConfigured: Boolean(txlineApiToken && txlineSessionJwt),
        txlineApiBase,
        txlineAuth: {
          sessionJwtConfigured: Boolean(txlineSessionJwt),
          apiTokenConfigured: Boolean(txlineApiToken),
          requiredHeaders: ["Authorization: Bearer <session-jwt>", "X-Api-Token: <api-token>"],
          documentedSnapshotEndpoint: "/api/fixtures/snapshot",
          documentedUpdatesEndpoint: "/api/fixtures/updates/{epochDay}/{hourOfDay}",
        },
        serviceLevelId: txlineServiceLevelId,
        competitionId: txlineCompetitionId || null,
        walletPublicKeyConfigured: Boolean(txlineWalletPublicKey),
        proofSystem: {
          groth16: "live via PrivateDAO Blind Policy circuit",
          circuitId: txlineSettlementCircuitId,
          circuitVersion: txlineSettlementCircuitVersion,
          policyVersion: txlineSettlementPolicyVersion,
        },
        solanaReceipt: {
          mode: "solana-memo-receipt",
          cluster: txlineSettlementCluster(),
          rpcConfigured: Boolean(process.env.TXLINE_SETTLEMENT_RPC_URL || process.env.SOLANA_RPC_URL),
        },
        endpoints: {
          matches: "/api/v1/txline/matches",
          resolve: "/api/v1/txline/resolve",
          verify: "/api/v1/txline/verify",
          onchainReceipt: "/api/v1/txline/onchain-receipt",
        },
        truthBoundary:
          txlineProviderMode() === "live-txline-provider"
            ? "TxLINE session JWT and activated API token are configured. Match data requests use documented TxLINE snapshot/update endpoints."
            : "TxLINE live credentials are not fully configured. Demo match data is simulated and clearly labeled.",
      });
      return;
    }

    if (req.method === "POST" && pathname === "/api/v1/txline/guest/start") {
      let result;
      try {
        result = await startTxlineGuestSession();
      } catch (error) {
        result = {
          ok: false,
          source: "privatedao-txline-free-api-start",
          status: "guest-session-failed",
          txlineApiBase,
          guestAuthUrl: txlineGuestAuthUrl,
          error: "Unable to start the TxLINE guest session.",
        };
      }
      writeJson(res, result.ok ? 200 : 502, result);
      return;
    }

    if (req.method === "GET" && pathname === "/api/v1/txline/matches") {
      const result = await getTxlineMatches();
      writeJson(res, 200, {
        ok: true,
        apiSource: "privatedao-txline-matches",
        ...result,
      });
      return;
    }

    if (req.method === "POST" && pathname === "/api/v1/txline/resolve") {
      const body = await readRequestJsonWithLimit(req, 256_000);
      let result;
      try {
        result = await handleTxlineSettlementResolve(body as Record<string, unknown>);
      } catch (error) {
        result = {
          ok: false,
          source: "privatedao-txline-settlement",
          providerMode: txlineProviderMode(),
          status: "settlement-proof-not-issued",
          error: "TxLINE settlement failed.",
        };
      }
      writeJson(res, result.ok ? 200 : 422, result);
      return;
    }

    if (req.method === "POST" && pathname === "/api/v1/txline/verify") {
      const body = await readRequestJsonWithLimit(req, 512_000);
      const proofPackage =
        body && typeof body === "object" && !Array.isArray(body) && "publicProofPackage" in body
          ? (body as Record<string, unknown>).publicProofPackage
          : body && typeof body === "object" && !Array.isArray(body) && "proofPackage" in body
            ? (body as Record<string, unknown>).proofPackage
            : body;
      const verification = verifyTxlineSettlementWithGroth16(proofPackage);
      writeJson(res, verification.ok ? 200 : 422, {
        ok: verification.ok,
        source: "privatedao-txline-settlement-verifier",
        status: verification.status,
        match: verification.match,
        originalHash: verification.originalHash,
        recomputedHash: verification.recomputedHash,
        message: verification.message,
        verification,
        explanation:
          "We verify the Groth16 proof, recompute the public settlement package hash, and compare it with the original hash. If anything changes, verification fails.",
      });
      return;
    }

    if (req.method === "POST" && pathname === "/api/v1/txline/onchain-receipt") {
      const body = await readRequestJsonWithLimit(req, 512_000);
      const proofPackage =
        body && typeof body === "object" && !Array.isArray(body) && "publicProofPackage" in body
          ? (body as Record<string, unknown>).publicProofPackage
          : body && typeof body === "object" && !Array.isArray(body) && "proofPackage" in body
            ? (body as Record<string, unknown>).proofPackage
            : body;
      let result;
      try {
        result = await submitTxlineSettlementReceiptOnchain(proofPackage as TxlineSettlementProofPackage);
      } catch (error) {
        result = {
          ok: false,
          source: "privatedao-txline-settlement-receipt",
          status: "onchain-receipt-failed",
          error: "Failed to submit the TxLINE settlement receipt on Solana.",
        };
      }
      writeJson(res, result.ok ? 200 : 422, result);
      return;
    }

    if (req.method === "GET" && pathname === "/api/v1/proof-workflows/verify/demo-proof-id") {
      const proofPackage = buildCreditLimitPublicProofPackage({
        proofId: "demo-proof-id",
        workflowId: "customer_credit_demo_verified",
        issuedLimitUsd: 2250,
        currency: "USD",
        stages: [
          { id: "membership-verification", label: "Verify Pro Membership", status: "completed" },
          { id: "earnings-validation", label: "Fetch Earnings", status: "completed" },
          { id: "threshold-calculation", label: "Calculate Threshold", status: "completed" },
          { id: "limit-issuance", label: "Issue Credit Limit", status: "completed" },
          { id: "proof-generation", label: "Generate Proof", status: "completed" },
        ],
        publicMetrics: {
          proMembershipVerified: true,
          importedRecordCount: 3,
          riskBand: "strong",
        },
      });
      const verification = verifyCreditLimitProofPackage(proofPackage);
      writeJson(res, 200, {
        ok: verification.ok,
        source: "privatedao-proof-workflows-verifier",
        proofPackage,
        verification,
        explanation:
          "We recompute the proof from the public proof package and compare it with the original hash. If anything changes, verification fails.",
      });
      return;
    }

    if (req.method === "POST" && pathname === "/api/v1/proof-workflows/verify") {
      const body = await readRequestJsonWithLimit(req, 96_000);
      const proofPackage =
        body && typeof body === "object" && !Array.isArray(body) && "proofPackage" in body
          ? (body as Record<string, unknown>).proofPackage
          : body;
      const verification = verifyCreditLimitProofPackage(proofPackage);
      writeJson(res, verification.ok ? 200 : 422, {
        ok: verification.ok,
        source: "privatedao-proof-workflows-verifier",
        verification,
        explanation:
          "We recompute the proof from the public proof package and compare it with the original hash. If anything changes, verification fails.",
      });
      return;
    }

    if (req.method === "GET" && pathname === "/api/v1/proof-workflows/status") {
      writeJson(res, 200, {
        ok: true,
        source: "privatedao-proof-workflows-status",
        generatedAt: new Date().toISOString(),
        product: "Proof Workflows",
        promise: "Private decisions. Verifiable outcomes.",
        availableWorkflows: [
          {
            id: "credit-limit",
            label: "Credit Limit Decision",
            status: "live",
            sample: "/api/v1/proof-workflows/credit-limit/sample",
            run: "/api/v1/proof-workflows/credit-limit/run",
            verify: "/api/v1/proof-workflows/verify",
            publicDemoProof: "/api/v1/proof-workflows/verify/demo-proof-id",
          },
          {
            id: "blind-policy",
            label: "Blind Policy Verification",
            status: "live",
            proofSystem: "Groth16",
            sample: "/api/v1/proof-workflows/blind-policy/sample",
            prove: "/api/v1/proof-workflows/blind-policy/prove",
            verify: "/api/v1/proof-workflows/blind-policy/verify",
            statusEndpoint: "/api/v1/proof-workflows/blind-policy/status",
          },
        ],
        proofIssuanceRules: [
          "No proof is issued if customer data import fails.",
          "No proof is issued if membership is not verified.",
          "No proof is issued if imported earnings records are empty.",
          "No proof is issued if required workflow stages fail.",
        ],
        verification:
          "We recompute the proof from the public proof package and compare it with the original hash. If anything changes, verification fails.",
      });
      return;
    }

    if (req.method === "GET" && pathname === "/api/v1/proof-workflows/credit-limit/sample") {
      writeJson(res, 200, {
        ok: true,
        source: "privatedao-proof-workflows-sample-customer-data",
        customerData: {
          customerId: "credit-redacted-customer-001",
          proMembership: true,
          currency: "USD",
          riskScore: 84,
          monthlyEarnings: 9200,
          payouts: [
            { amountUsd: 8800 },
            { amountUsd: 9400 },
          ],
        },
        note: "Use this as a real JSON payload shape. Customers can replace it with their own endpoint or direct JSON.",
      });
      return;
    }

    if (req.method === "POST" && pathname === "/api/v1/freshness/ping") {
      const body = await readRequestJson(req);
      const visitorUa = stringField(body, "visitorUa", String(req.headers["user-agent"] || "unknown"));
      const result = await sendFreshnessMemo(visitorUa);
      writeJson(res, 200, result);
      return;
    }

    if (
      req.method === "POST" &&
      (pathname === "/api/v1/integration-matrix/anchor" || pathname === "/api/v1/privacy-execution-matrix/anchor")
    ) {
      const auth = requireMatrixAnchorAuth(req);
      if (!auth.ok) {
        writeJson(res, auth.status ?? 500, { ok: false, error: auth.error ?? "Matrix anchor authorization failed." });
        return;
      }
      const body = await readRequestJson(req);
      const result = await handleIntegrationMatrixAnchor(body);
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

    if (req.method === "POST" && pathname === "/api/v1/pilot-requests") {
      const body = await readRequestJsonWithLimit(req, 32_000);
      const result = await handlePilotRequest(body as Record<string, unknown>, req);
      writeJson(res, 200, result);
      return;
    }

    if (req.method === "GET" && pathname === "/api/v1/commercial/checkout/status") {
      writeJson(res, 200, commercialCheckoutStatus());
      return;
    }

    if (req.method === "POST" && pathname === "/api/v1/commercial/checkout/prepare") {
      const body = await readRequestJsonWithLimit(req, 32_000);
      const result = await handleCommercialCheckoutPrepare(body as Record<string, unknown>);
      writeJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && pathname === "/api/v1/commercial/checkout/verify") {
      const body = await readRequestJsonWithLimit(req, 32_000);
      const result = await handleCommercialCheckoutVerify(body as Record<string, unknown>);
      writeJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && pathname === "/api/v1/commercial/orders/prepare") {
      const body = await readRequestJsonWithLimit(req, 32_000);
      const result = await handleCommercialOrderPrepare(body as Record<string, unknown>);
      writeJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && pathname === "/api/v1/commercial/orders/verify") {
      const body = await readRequestJsonWithLimit(req, 32_000);
      const result = await handleCommercialOrderVerify(body as Record<string, unknown>);
      writeJson(res, result.ok ? 200 : 422, result);
      return;
    }

    if (req.method === "POST" && pathname === "/api/v1/commercial/orders/renew") {
      const body = await readRequestJsonWithLimit(req, 32_000);
      writeJson(res, 200, await handleCommercialOrderRenew(body as Record<string, unknown>));
      return;
    }

    const packageMatch = pathname.match(/^\/api\/v1\/commercial\/orders\/([^/]+)\/package$/);
    if (req.method === "GET" && packageMatch) {
      writeJson(res, 200, await handleCommercialOrderPackage(packageMatch[1]));
      return;
    }

    if (req.method === "POST" && pathname === "/api/v1/licenses/entitlement") {
      const body = (await readRequestJsonWithLimit(req, 32_000)) as Record<string, unknown>;
      if (body.requestLicense === true) {
        const result = issueEnterpriseLicense(body, req);
        writeJson(res, result.ok ? 200 : 503, result);
        return;
      }
      writeJson(res, 200, {
        ok: true,
        status: "license-metadata-received",
        controlPlane: "PrivateDAO license control plane",
        received: {
          installationId: stringField(body, "installationId"),
          licenseId: stringField(body, "licenseId"),
          organizationId: stringField(body, "organizationId"),
          plan: stringField(body, "plan"),
          engineVersion: stringField(body, "engineVersion"),
        },
        privateInputsReceived: false,
      });
      return;
    }

    if (req.method === "GET" && pathname === "/api/v1/payment-gate/random/status") {
      writeJson(res, 200, randomGateStatus());
      return;
    }

    if (req.method === "POST" && pathname === "/api/v1/payment-gate/random/prepare") {
      const body = await readRequestJsonWithLimit(req, 32_000);
      const result = await handleRandomGatePrepare(body as Record<string, unknown>);
      writeJson(res, 200, result);
      return;
    }

    if (req.method === "POST" && pathname === "/api/v1/payment-gate/random/verify") {
      const body = await readRequestJsonWithLimit(req, 32_000);
      const result = await handleRandomGateVerify(body as Record<string, unknown>);
      writeJson(res, result.ok ? 200 : 422, result);
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

    if (req.method === "GET" && pathname === "/api/v1/ika/solana-prealpha/final-approval") {
      writeJson(res, 200, ikaSolanaFinalApprovalStatus());
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

    if (String(req.method) === "POST" && pathname === "/api/v1/intelligence/amazon/analyze") {
      const body = await readRequestJsonWithLimit(req, 32_000);
      let result;
      try {
        result = await handleAmazonBedrockAnalysis(body as Record<string, unknown>);
      } catch (error) {
        result = { ok: false, status: "unavailable", provider: "amazon-bedrock", error: "Amazon AI analysis failed." };
      }
      writeJson(res, result.ok ? 200 : 422, result);
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
          pilotRequest: "/api/v1/pilot-requests",
          commercialCheckoutStatus: "/api/v1/commercial/checkout/status",
          commercialCheckoutPrepare: "/api/v1/commercial/checkout/prepare",
          commercialCheckoutVerify: "/api/v1/commercial/checkout/verify",
          enterpriseLicenseEntitlement: "/api/v1/licenses/entitlement",
          randomPaymentGateStatus: "/api/v1/payment-gate/random/status",
          randomPaymentGatePrepare: "/api/v1/payment-gate/random/prepare",
          randomPaymentGateVerify: "/api/v1/payment-gate/random/verify",
          quickNodeStream: "/api/v1/quicknode/stream",
          quickNodeStreamStats: "/api/v1/quicknode/stream/stats",
          integrationMatrixAnchor: "/api/v1/integration-matrix/anchor",
          cryptographicReadiness: "/api/v1/cryptographic-readiness",
          privacyExecutionMatrix: "/api/v1/privacy-execution-matrix",
          privacyExecutionClaims: "/api/v1/privacy-execution-claims",
          frontierPrivacyProtocolSpine: "/api/v1/frontier/privacy-protocol-spine",
          providerIntegrationStatus: "/api/v1/provider-integrations/status",
          pusdUtilityLayer: "/api/v1/pusd/utility-layer",
          proofWorkflowStatus: "/api/v1/proof-workflows/status",
          proofWorkflowCreditLimitRun: "/api/v1/proof-workflows/credit-limit/run",
          proofWorkflowCreditLimitSample: "/api/v1/proof-workflows/credit-limit/sample",
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

    if (pathname === "/api/v1/integration-matrix/anchor" || pathname === "/api/v1/privacy-execution-matrix/anchor") {
      const latest = await latestIntegrationMatrixAnchor();
      const pending = buildIntegrationMatrixAnchorSnapshot();
      writeJson(res, 200, {
        ok: true,
        source: latest ? "supabase-or-memory" : "not-yet-anchored",
        cluster: "testnet",
        operatorPostEndpoint: "/api/v1/integration-matrix/anchor",
        minIntervalMs: matrixAnchorMinIntervalMs,
        latest: latestMatrixAnchorFromRow(latest),
        currentDigestPreview: pending.digest,
        currentDigestPreviewGeneratedAt: pending.anchoredAt,
        signingModel:
          "Server-side operator signs a Solana Testnet Memo containing the matrix SHA-256 digest. The public endpoint exposes only the receipt.",
      });
      return;
    }

    if (pathname === "/api/v1/privacy-execution-claims") {
      writeJson(res, 200, privacyExecutionClaimsStatus());
      return;
    }

    if (pathname === "/api/v1/frontier/privacy-protocol-spine") {
      writeJson(res, 200, frontierPrivacyProtocolSpineStatus());
      return;
    }

    if (pathname === "/api/v1/privacy-execution-claims/prepare") {
      const result = privacyExecutionClaimPrepare(url.searchParams);
      writeJson(res, result.ok ? 200 : 400, result);
      return;
    }

    if (pathname === "/api/v1/provider-integrations/status") {
      writeJson(res, 200, providerIntegrationStatus());
      return;
    }

    if (pathname === "/api/v1/pusd/utility-layer") {
      writeJson(res, 200, pusdUtilityLayerStatus());
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
        integrationMatrixAnchor: latestMatrixAnchorFromRow(await latestIntegrationMatrixAnchor()),
        pusdUtilityLayer: pusdUtilityLayerStatus(),
        visitors,
        execution,
        liveServiceGate: {
          command: "npm run verify:live-service-execution",
          pagesChecked: 11,
          apisChecked: 16,
          requiredRails: [
            "privacy-execution-matrix",
            "provider-integrations-status",
            "private-settlement-intent",
            "goldrush-wallet-intelligence",
            "zerion-portfolio-post",
            "torque-custom-event",
            "ika-custody-prepare",
          ],
        },
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

    if (req.method === "GET" && pathname === "/api/v1/intelligence/amazon/status") {
      writeJson(res, 200, {
        ok: true,
        provider: "amazon-bedrock",
        enabled: bedrockEnabled,
        model: bedrockModelId,
        region: bedrockRegion,
        privacyBoundary: "Only explicitly supplied public proposal metadata is sent. Private records, witnesses, credentials, hidden votes, and wallet keys are rejected.",
      });
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
    const errorMessage = publicReadNodeError();
    const statusCode = errorMessage.includes("Request body too large") ? 413 : 500;
    writeJson(res, statusCode, {
      ok: false,
      error: errorMessage,
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
