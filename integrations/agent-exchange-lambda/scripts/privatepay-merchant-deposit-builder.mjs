#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const apiBase = process.env.PRIVATEPAY_API_BASE || "https://payments.magicblock.app";
const owner = process.env.PRIVATEPAY_MERCHANT_ADDRESS || "2BJ4ezxqV9YJXc38D9duKBkdn4su4jE1beKUHwH663sL";
const mint = process.env.PRIVATEPAY_MINT || "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const cluster = process.env.PRIVATEPAY_CLUSTER || "mainnet-private";
const amount = Number(process.env.PRIVATEPAY_DEPOSIT_AMOUNT || "1");
const outputPath = resolve(process.env.PRIVATEPAY_DEPOSIT_OUTPUT || "output/privatepay/merchant-deposit-unsigned.json");

if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("PRIVATEPAY_DEPOSIT_AMOUNT must be a positive integer");

let response;
try {
  response = await fetch(new URL("/v1/spl/deposit", apiBase), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      owner,
      mint,
      amount,
      cluster,
    initIfMissing: true,
    initVaultIfMissing: false,
    initAtasIfMissing: true,
    idempotent: true,
    private: true,
    }),
  });
} catch (error) {
  console.error(`MagicBlock deposit builder unavailable: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 2;
  process.exit();
}
const body = await response.json().catch(() => ({}));
if (!response.ok || typeof body.transactionBase64 !== "string") {
  throw new Error(`MagicBlock deposit builder failed (${response.status})`);
}

const artifact = {
  generatedAt: new Date().toISOString(),
  apiBase,
  cluster,
  owner,
  mint,
  amountBaseUnits: amount,
  kind: body.kind || "deposit",
  sendTo: body.sendTo || "base",
  transactionBase64: body.transactionBase64,
  recentBlockhash: body.recentBlockhash || null,
  lastValidBlockHeight: body.lastValidBlockHeight || null,
  requiredSigners: Array.isArray(body.requiredSigners) ? body.requiredSigners : [],
  validator: body.validator || null,
  warning: "Unsigned transaction. Do not broadcast until the owner reviews and signs it.",
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({
  outputPath,
  status: response.status,
  owner,
  mint,
  cluster,
  amountBaseUnits: amount,
  requiredSigners: artifact.requiredSigners,
  lastValidBlockHeight: artifact.lastValidBlockHeight,
  signed: false,
  broadcast: false,
}, null, 2));
