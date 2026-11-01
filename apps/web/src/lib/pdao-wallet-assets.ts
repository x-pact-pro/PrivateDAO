export const MAINNET_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const MAINNET_PDAO_MINT = "9isGuumtaqvJeJeyLF44fvfskk2cv5mYsopexMBfpump";

export type WalletTokenBalance = {
  mint: string;
  amountBaseUnits: bigint;
  decimals: number;
};

export function aggregateTokenBalances(
  accounts: Array<{ mint?: unknown; amount?: unknown; decimals?: unknown }>,
): WalletTokenBalance[] {
  const balances = new Map<string, WalletTokenBalance>();

  for (const account of accounts) {
    if (typeof account.mint !== "string" || typeof account.amount !== "string") continue;
    if (!/^\d+$/.test(account.amount)) continue;
    const decimals = typeof account.decimals === "number" && Number.isInteger(account.decimals) && account.decimals >= 0
      ? account.decimals
      : 0;
    const current = balances.get(account.mint);
    balances.set(account.mint, {
      mint: account.mint,
      amountBaseUnits: (current?.amountBaseUnits ?? BigInt(0)) + BigInt(account.amount),
      decimals: current?.decimals ?? decimals,
    });
  }

  return [...balances.values()].sort((left, right) => left.mint.localeCompare(right.mint));
}

export function formatTokenAmount(amountBaseUnits: bigint, decimals: number, maximumFractionDigits = 6) {
  if (decimals === 0) return amountBaseUnits.toLocaleString("en-US");
  const divisor = BigInt(10) ** BigInt(decimals);
  const whole = amountBaseUnits / divisor;
  const remainder = amountBaseUnits % divisor;
  const fraction = remainder.toString().padStart(decimals, "0").slice(0, maximumFractionDigits).replace(/0+$/, "");
  return fraction ? `${whole.toLocaleString("en-US")}.${fraction}` : whole.toLocaleString("en-US");
}

export function tokenBalanceForMint(balances: WalletTokenBalance[], mint: string) {
  return balances.find((balance) => balance.mint === mint) ?? { mint, amountBaseUnits: BigInt(0), decimals: 6 };
}
