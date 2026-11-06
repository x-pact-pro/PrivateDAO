import { Transaction, VersionedTransaction } from "@solana/web3.js";

// MagicBlock Payments API uses "mainnet" even though wallet RPC labels the network mainnet-beta.
export type MagicBlockCluster = "devnet" | "mainnet";
export type MagicBlockBalanceLocation = "base" | "ephemeral";

export type MagicBlockUnsignedTransaction = {
  version: string;
  transactionBase64: string;
  recentBlockhash?: string;
  lastValidBlockHeight?: number;
};

export type MagicBlockBalance = {
  address: string;
  mint: string;
  ata?: string;
  location: "base" | "ephemeral";
  balance: string | number;
};

const API_BASE = (process.env.NEXT_PUBLIC_MAGICBLOCK_API_BASE || "https://payments.magicblock.app").replace(/\/$/, "");

function decodeBase64(value: string) {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function request<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { Accept: "application/json", ...(init.body ? { "content-type": "application/json" } : {}), ...(init.headers || {}) },
    cache: "no-store",
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const record = body && typeof body === "object" ? body as { message?: unknown; error?: unknown } : null;
    const nestedError = record?.error && typeof record.error === "object"
      ? record.error as { message?: unknown; code?: unknown }
      : null;
    const message = [record?.message, typeof record?.error === "string" ? record.error : nestedError?.message]
      .find((value): value is string => typeof value === "string" && value.trim().length > 0);
    const code = nestedError?.code;
    throw new Error(message ? `${message}${typeof code === "string" ? ` (${code})` : ""}` : `MagicBlock request failed (HTTP ${response.status}).`);
  }
  return body as T;
}

export function magicBlockApiBase() {
  return API_BASE;
}

export async function getMagicBlockHealth() {
  return request<{ status: string }>("/health");
}

export async function getMagicBlockChallenge(pubkey: string, cluster: MagicBlockCluster) {
  return request<{ challenge: string; message?: string; expiresAt?: string }>(`/v1/spl/challenge?pubkey=${encodeURIComponent(pubkey)}&cluster=${cluster}`);
}

export async function loginMagicBlock(pubkey: string, challenge: string, signature: Uint8Array, cluster: MagicBlockCluster) {
  let binary = "";
  for (const byte of signature) binary += String.fromCharCode(byte);
  return request<{ token: string; expiresAt?: string }>("/v1/spl/login", {
    method: "POST",
    body: JSON.stringify({ pubkey, challenge, signature: btoa(binary), cluster }),
  });
}

export async function getMagicBlockBalance(address: string, mint: string, cluster: MagicBlockCluster, privateToken?: string) {
  const path = privateToken ? "/v1/spl/private-balance" : "/v1/spl/balance";
  return request<MagicBlockBalance>(`${path}?address=${encodeURIComponent(address)}&mint=${encodeURIComponent(mint)}&cluster=${cluster}`, privateToken ? { headers: { Authorization: `Bearer ${privateToken}` } } : undefined);
}

export async function buildMagicBlockAction(path: "/v1/spl/deposit" | "/v1/spl/transfer" | "/v1/spl/withdraw", body: Record<string, unknown>) {
  const normalized = { ...body };
  if (typeof normalized.amount === "string") {
    if (!/^\d+$/.test(normalized.amount)) throw new Error("MagicBlock amount must be an integer in token base units.");
    const amount = Number(normalized.amount);
    if (!Number.isSafeInteger(amount) || String(amount) !== normalized.amount) {
      throw new Error("MagicBlock amount exceeds the safe browser integer range.");
    }
    normalized.amount = amount;
  }
  return request<MagicBlockUnsignedTransaction>(path, { method: "POST", body: JSON.stringify(normalized) });
}

export function deserializeMagicBlockTransaction(value: string) {
  const raw = decodeBase64(value);
  try {
    return VersionedTransaction.deserialize(raw);
  } catch {
    return Transaction.from(raw);
  }
}
