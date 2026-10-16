import assert from "node:assert/strict";
import test from "node:test";
import { Keypair } from "@solana/web3.js";
import { MemoryStore } from "../src/storage.mjs";
import { runScheduledSellerSettlements } from "../src/settlement.mjs";

const baseConfig = {
  cluster: "mainnet-beta",
  treasury: "2BJ4ezxqV9YJXc38D9duKBkdn4su4jE1beKUHwH663sL",
  usdcMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  rpcPrimary: "https://api.mainnet-beta.solana.com",
  rpcSecondary: "",
  rpcFallback: "https://api.mainnet-beta.solana.com",
  payoutBatchLimit: 20,
};

test("scheduled settlement fails closed when the payout signer is not configured", async () => {
  const result = await runScheduledSellerSettlements({ ...baseConfig, payoutSecretId: "", payoutSignerSecret: "" }, new MemoryStore());
  assert.deepEqual(result, { status: "disabled", reason: "payout signer secret is not configured", scanned: 0, settled: 0, failed: 0 });
});

test("scheduled settlement rejects a signer that is not the configured treasury", async () => {
  const signer = Keypair.generate();
  await assert.rejects(
    () => runScheduledSellerSettlements({ ...baseConfig, payoutSecretId: "test-only", payoutSignerSecret: JSON.stringify([...signer.secretKey]) }, new MemoryStore()),
    /payout signer does not match the configured treasury/,
  );
});
