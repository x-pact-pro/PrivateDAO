import assert from "node:assert/strict";
import {
  aggregateTokenBalances,
  formatTokenAmount,
  MAINNET_PDAO_MINT,
  MAINNET_USDC_MINT,
  tokenBalanceForMint,
} from "../apps/web/src/lib/pdao-wallet-assets.ts";

const balances = aggregateTokenBalances([
  { mint: MAINNET_USDC_MINT, amount: "500000", decimals: 6 },
  { mint: MAINNET_USDC_MINT, amount: "250000", decimals: 6 },
  { mint: MAINNET_PDAO_MINT, amount: "1000000", decimals: 6 },
  { mint: "ignored", amount: "not-an-integer", decimals: 6 },
]);

assert.equal(balances.length, 2);
assert.equal(formatTokenAmount(tokenBalanceForMint(balances, MAINNET_USDC_MINT).amountBaseUnits, 6), "0.75");
assert.equal(formatTokenAmount(tokenBalanceForMint(balances, MAINNET_PDAO_MINT).amountBaseUnits, 6), "1");
assert.equal(formatTokenAmount(tokenBalanceForMint([], "missing").amountBaseUnits, 6), "0");

console.log("pdao-wallet-assets: pass");
