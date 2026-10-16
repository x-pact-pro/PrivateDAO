import assert from "node:assert/strict";
import test from "node:test";
import { Keypair, PublicKey } from "@solana/web3.js";
import { MemoryStore } from "../src/storage.mjs";
import { runScheduledSellerSettlements, settleCandidate } from "../src/settlement.mjs";

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

test("automatic settlement claims atomically and records verified payout fee separately", async () => {
  const signer = Keypair.generate();
  const seller = Keypair.generate();
  const mint = new PublicKey(baseConfig.usdcMint);
  const sourceAta = PublicKey.findProgramAddressSync([
    signer.publicKey.toBuffer(), new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").toBuffer(), mint.toBuffer(),
  ], new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"))[0];
  const destinationAta = PublicKey.findProgramAddressSync([
    seller.publicKey.toBuffer(), new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").toBuffer(), mint.toBuffer(),
  ], new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"))[0];
  const balances = new Map([[sourceAta.toBase58(), 10000000n], [destinationAta.toBase58(), 0n]]);
  const signature = "settlement-signature";
  const connection = {
    async getSignaturesForAddress() { return []; },
    async getTokenAccountBalance(address) { return { value: { amount: String(balances.get(new PublicKey(address).toBase58()) || 0n) } }; },
    async getLatestBlockhash() { return { blockhash: "11111111111111111111111111111111", lastValidBlockHeight: 10 }; },
    async simulateTransaction() { return { value: { err: null } }; },
    async sendRawTransaction() { balances.set(sourceAta.toBase58(), 9000000n); balances.set(destinationAta.toBase58(), 1000000n); return signature; },
    async confirmTransaction() { return { value: { err: null } }; },
    async getTransaction() { return { meta: { err: null, fee: 5000 }, transaction: { message: { instructions: [{ program: "spl-token", parsed: { info: { source: sourceAta.toBase58(), destination: destinationAta.toBase58(), mint: baseConfig.usdcMint, tokenAmount: { amount: "1000000" } } } }] } } }; },
  };
  const storage = new MemoryStore();
  await storage.put("Registry", "seller_settlement_job_1", { id: "seller_settlement_job_1", kind: "seller_settlement", job_id: "job_1", status: "payable_pending_scheduled_settlement", seller_net_amount: 1, payout: { address: seller.publicKey.toBase58(), network: "solana-mainnet-beta", asset: "USDC" } });
  await storage.put("Revenue", "rev_job_1", { id: "rev_job_1", settlementStatus: "payable_pending_scheduled_settlement" });
  await storage.put("Receipts", "receipt_job_1", { receipt_id: "receipt_job_1", job_id: "job_1", seller_settlement: { id: "seller_settlement_job_1", status: "payable_pending_scheduled_settlement" } });
  const outcome = await settleCandidate({ ...baseConfig, treasury: signer.publicKey.toBase58() }, storage, connection, signer, await storage.get("Registry", "seller_settlement_job_1"));
  assert.equal(outcome.status, "settled");
  const settled = await storage.get("Registry", "seller_settlement_job_1");
  assert.equal(settled.status, "settled");
  assert.equal(settled.payout_network_fee_lamports, 5000);
  assert.equal(settled.payout_network_fee_policy, "platform_borne_automatic_settlement");
  assert.equal((await storage.get("Revenue", "rev_job_1")).payoutNetworkFeeLamports, 5000);
  assert.equal((await storage.get("Revenue", "rev_job_1")).settlementStatus, "settled");
  assert.equal((await storage.get("Receipts", "receipt_job_1")).payout_network_fee_lamports, 5000);
  assert.equal((await storage.get("Receipts", "receipt_job_1")).seller_settlement.status, "settled");
});

test("expired claim cannot be reused for a settlement whose status changed", async () => {
  const storage = new MemoryStore();
  await storage.put("Registry", "settlement", { id: "settlement", status: "settled" });
  await assert.rejects(() => storage.claim("Registry", "settlement", { expected_status: "payable_pending_scheduled_settlement", claim_expires_at: new Date(0).toISOString() }), /conditional claim failed/);
});
