// SPDX-License-Identifier: AGPL-3.0-or-later
import { Connection, PublicKey, type ConfirmedSignatureInfo, type ParsedTransactionWithMeta } from "@solana/web3.js";

const programId = new PublicKey(process.env.PRIVATE_DAO_PROGRAM_ID || "EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva");
const rpcEndpoints = (process.env.PRIVATE_DAO_CHAIN_WATCHER_RPC_URLS || process.env.SOLANA_RPC_URL || "https://api.testnet.solana.com")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);
const pollMs = Number(process.env.PRIVATE_DAO_CHAIN_WATCHER_POLL_MS || 30_000);
const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

const seen = new Set<string>();
let lastSyncAt = "";

type LiveTxRow = {
  sig: string;
  instruction: string;
  wallet: string;
  slot: number;
  timestamp: string;
  wallet_type: string;
};

function headers(extra?: Record<string, string>) {
  return {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    Accept: "application/json",
    ...extra,
  };
}

async function supabaseGet<T>(table: string, query: string) {
  if (!supabaseUrl || !supabaseKey) return [] as T[];
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}${query}`, {
    headers: headers(),
  });
  if (!response.ok) return [] as T[];
  const raw = (await response.json().catch(() => [])) as unknown;
  return Array.isArray(raw) ? (raw as T[]) : ([] as T[]);
}

async function supabasePost(table: string, row: Record<string, unknown>) {
  if (!supabaseUrl || !supabaseKey) throw new Error("Supabase REST is not configured");
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal" }),
    body: JSON.stringify(row),
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Supabase insert ${table} failed ${response.status}: ${message}`);
  }
}

async function supabasePatch(table: string, query: string, row: Record<string, unknown>) {
  if (!supabaseUrl || !supabaseKey) return;
  await fetch(`${supabaseUrl}/rest/v1/${table}${query}`, {
    method: "PATCH",
    headers: headers({ "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify(row),
  }).catch(() => null);
}

function classifyInstruction(tx: ParsedTransactionWithMeta | null) {
  const logs = tx?.meta?.logMessages?.join("\n").toLowerCase() || "";
  if (logs.includes("create") && logs.includes("dao")) return "create-dao";
  if (logs.includes("proposal")) return "create-proposal";
  if (logs.includes("commit")) return "commit-vote";
  if (logs.includes("reveal")) return "reveal-vote";
  if (logs.includes("execute")) return "execute";
  if (logs.includes("payout") || logs.includes("settlement")) return "payout";
  return "program-interaction";
}

function primarySigner(tx: ParsedTransactionWithMeta | null, fallback: ConfirmedSignatureInfo) {
  const signer = tx?.transaction.message.accountKeys.find((account) => account.signer);
  return signer?.pubkey.toBase58() || fallback.signature.slice(0, 32);
}

async function withConnection<T>(operation: (connection: Connection) => Promise<T>) {
  let lastError: unknown = null;
  for (const endpoint of rpcEndpoints) {
    try {
      return await operation(new Connection(endpoint, "confirmed"));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function syncOnce() {
  const signatures = await withConnection((connection) => connection.getSignaturesForAddress(programId, { limit: 10 }));
  for (const signature of signatures.reverse()) {
    if (seen.has(signature.signature)) continue;
    const existing = await supabaseGet<{ sig: string }>(
      "live_transactions",
      `?select=sig&sig=eq.${encodeURIComponent(signature.signature)}&limit=1`,
    );
    if (existing.length) {
      seen.add(signature.signature);
      continue;
    }
    const tx = await withConnection((connection) =>
      connection.getParsedTransaction(signature.signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 }),
    );
    const row: LiveTxRow = {
      sig: signature.signature,
      instruction: classifyInstruction(tx),
      wallet: primarySigner(tx, signature),
      slot: signature.slot,
      timestamp: signature.blockTime ? new Date(signature.blockTime * 1000).toISOString() : new Date().toISOString(),
      wallet_type: "wallet-signed-testnet",
    };
    await supabasePost("live_transactions", row);
    seen.add(signature.signature);
    console.log(`[chain-watcher] indexed ${row.instruction} ${row.sig}`);
  }
  const latest = signatures[0];
  if (latest) {
    lastSyncAt = new Date().toISOString();
    await supabasePatch("proof_stats", "?id=eq.global", {
      last_tx_signature: latest.signature,
      last_tx_time: latest.blockTime ? new Date(latest.blockTime * 1000).toISOString() : lastSyncAt,
      last_tx_slot: latest.slot,
      freshness_seconds: latest.blockTime ? Math.max(0, Math.floor(Date.now() / 1000) - latest.blockTime) : 0,
      updated_at: lastSyncAt,
    });
  }
}

async function main() {
  console.log(`[chain-watcher] watching ${programId.toBase58()} every ${pollMs}ms`);
  await syncOnce().catch((error) => console.error("[chain-watcher] initial sync failed", error));
  setInterval(() => {
    void syncOnce().catch((error) => console.error("[chain-watcher] sync failed", error));
  }, pollMs);
}

void main();

process.on("SIGTERM", () => {
  console.log(`[chain-watcher] stopping; last sync ${lastSyncAt || "never"}`);
  process.exit(0);
});
