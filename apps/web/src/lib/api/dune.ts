export type DuneBalanceSnapshot = unknown;
export type DuneTransactionSnapshot = unknown;

async function safeJson<T>(response: Response): Promise<T | null> {
  return response.json().catch(() => null) as Promise<T | null>;
}

export async function fetchBalances(walletAddress: string): Promise<DuneBalanceSnapshot> {
  const endpoint = process.env.NEXT_PUBLIC_DUNE_BALANCES_ENDPOINT?.trim() || "https://api.privatedao.org/api/v1/dune/balances";
  const response = await fetch(`${endpoint}?wallet=${encodeURIComponent(walletAddress)}`);
  const body = await safeJson<DuneBalanceSnapshot & { error?: string }>(response);
  if (!response.ok) {
    throw new Error((body as { error?: string } | null)?.error ?? `Legacy analytics balances failed (${response.status}).`);
  }
  return body;
}

export async function fetchTransactions(walletAddress: string): Promise<DuneTransactionSnapshot> {
  const endpoint = process.env.NEXT_PUBLIC_DUNE_TRANSACTIONS_ENDPOINT?.trim() || "https://api.privatedao.org/api/v1/dune/transactions";
  const response = await fetch(`${endpoint}?wallet=${encodeURIComponent(walletAddress)}`);
  const body = await safeJson<DuneTransactionSnapshot & { error?: string }>(response);
  if (!response.ok) {
    throw new Error((body as { error?: string } | null)?.error ?? `Legacy analytics transactions failed (${response.status}).`);
  }
  return body;
}
