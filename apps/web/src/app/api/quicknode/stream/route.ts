import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

function getAuthToken(request: Request) {
  const headerToken =
    request.headers.get("x-quicknode-security-token") ??
    request.headers.get("x-private-dao-stream-token") ??
    "";
  const authorization = request.headers.get("authorization") ?? "";
  const bearerToken = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice("bearer ".length)
    : "";
  return (bearerToken || headerToken).trim();
}

function safeTokenEquals(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

function requireAuthorized(request: Request) {
  const expectedToken = process.env.QUICKNODE_STREAM_TOKEN?.trim();
  if (!expectedToken) {
    return { ok: false as const, status: 503, error: "QUICKNODE_STREAM_TOKEN is not configured." };
  }

  const receivedToken = getAuthToken(request);
  if (!receivedToken || !safeTokenEquals(receivedToken, expectedToken)) {
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

function getTransactionSignature(transaction: QuickNodeStreamTransaction) {
  return (
    transaction.signature ??
    transaction.transaction?.signatures?.[0] ??
    "unknown-signature"
  );
}

function extractTransactions(entry: unknown): QuickNodeStreamTransaction[] {
  if (Array.isArray(entry)) {
    return entry.flatMap(extractTransactions);
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

function getProgramIds(transaction: QuickNodeStreamTransaction) {
  const ids = new Set<string>();
  for (const invocation of transaction.programInvocations ?? []) {
    if (invocation.programId) ids.add(invocation.programId);
  }
  for (const instruction of transaction.transaction?.message?.instructions ?? []) {
    if (instruction.programId) ids.add(instruction.programId);
  }
  for (const log of transaction.meta?.logMessages ?? []) {
    const match = log.match(/^Program\s+([1-9A-HJ-NP-Za-km-z]{32,44})\s+/);
    if (match?.[1]) ids.add(match[1]);
  }
  return Array.from(ids);
}

function summarizeQuickNodePayload(payload: QuickNodeStreamPayload) {
  const entries = asArray(payload.data);
  const blocks = entries.filter((entry) => !Array.isArray(entry) && "blockhash" in asObject(entry)) as QuickNodeStreamBlock[];
  const transactions = entries.flatMap(extractTransactions);
  const privateDaoProgramId =
    process.env.NEXT_PUBLIC_PRIVATE_DAO_PROGRAM_ID?.trim() ??
    process.env.PRIVATE_DAO_PROGRAM_ID?.trim() ??
    "EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva";

  const programMatches = transactions.filter((transaction) =>
    getProgramIds(transaction).includes(privateDaoProgramId),
  );
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
    sampleSignatures: transactions.slice(0, 8).map(getTransactionSignature),
    privateDaoSignatures: programMatches.slice(0, 8).map(getTransactionSignature),
    dataUse:
      "QuickNode Streams feed PrivateDAO runtime intelligence, proof freshness, and reviewer-visible operational telemetry. Raw payloads are not persisted by this endpoint.",
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "PrivateDAO QuickNode Stream intake",
    network: "solana-testnet",
    dataset: "Programs + Logs / Block",
    auth: process.env.QUICKNODE_STREAM_TOKEN ? "configured" : "missing-env",
    destination: "/api/quicknode/stream",
  });
}

export async function POST(request: Request) {
  const auth = requireAuthorized(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const payload = (await request.json()) as QuickNodeStreamPayload;
    const summary = summarizeQuickNodePayload(payload);
    return NextResponse.json({ ok: true, summary }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Invalid QuickNode stream payload.",
      },
      { status: 400 },
    );
  }
}
