import test from "node:test";
import assert from "node:assert/strict";
import nacl from "tweetnacl";
import { Keypair } from "@solana/web3.js";
import { MemoryStore } from "../src/storage.mjs";
import { buildSettlementBatch, runScheduledSettlementReport } from "../src/settlement.mjs";
import { issueOwnerSettlementChallenge, transitionSettlementBatch, verifyOwnerHeaders } from "../src/owner-settlement.mjs";

const treasury = "2BJ4ezxqV9YJXc38D9duKBkdn4su4jE1beKUHwH663sL";
const usdcMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const seller = Keypair.generate().publicKey.toBase58();
const config = { treasury, usdcMint, rpcPrimary: "https://api.devnet.solana.com" };
const payable = (id = "settlement_1") => ({ id, kind: "seller_settlement", status: "payable_pending_scheduled_settlement", seller_agent_id: "agent_seller", job_id: "job_1", gross_amount: 1, platform_fee_amount: 0.1, processing_fee_amount: 0, network_fee_lamports: 5000, seller_net_amount: 0.9, payout: { address: seller, network: "solana-mainnet-beta", asset: "USDC" }, created_at: "2026-01-01T00:00:00.000Z" });

test("scheduled report creates an immutable batch without a signer or broadcast", async () => {
  const store = new MemoryStore();
  await store.put("Registry", "settlement_1", payable());
  const result = await runScheduledSettlementReport(config, store, { now: new Date("2026-01-08T00:00:00.000Z") });
  assert.equal(result.status, "created");
  assert.equal(result.batch.status, "pending_owner_approval");
  assert.equal(result.batch.immutable, true);
  assert.equal(result.batch.entries[0].amount_atomic, "900000");
  assert.equal(result.batch.totals.network_fee_lamports, 5000);
  assert.equal((await store.list("SettlementBatches")).length, 1);
  assert.equal((await store.list("AuditLog"))[0].sensitive_data_included, false);
});

test("report excludes failed, disputed, refunded, invalid, and already reserved entries", async () => {
  const store = new MemoryStore();
  await store.put("Registry", "good", payable("good"));
  await store.put("Registry", "failed", { ...payable("failed"), execution_status: "failed" });
  await store.put("Registry", "refund", { ...payable("refund"), refund_id: "refund_1" });
  await store.put("Registry", "invalid", { ...payable("invalid"), payout: { address: treasury, network: "solana-mainnet-beta", asset: "USDC" } });
  const first = await runScheduledSettlementReport(config, store, { now: new Date("2026-01-08T00:00:00.000Z") });
  assert.deepEqual(first.batch.settlement_ids, ["good"]);
  const second = await runScheduledSettlementReport(config, store, { now: new Date("2026-01-15T00:00:00.000Z") });
  assert.equal(second.status, "empty");
});

test("owner approval changes accounting state but never broadcasts or exposes a signer", async () => {
  const store = new MemoryStore();
  const owner = Keypair.generate();
  const ownerConfig = { ...config, treasury: owner.publicKey.toBase58() };
  const batch = buildSettlementBatch({ settlements: [payable()], treasury: ownerConfig.treasury, usdcMint, periodStart: "2026-01-01", periodEnd: "2026-01-08", batchId: "settlement_batch_test" });
  await store.put("SettlementBatches", batch.id, batch);
  const challenge = await issueOwnerSettlementChallenge(ownerConfig, store, owner.publicKey.toBase58());
  const signature = nacl.sign.detached(Buffer.from(challenge.message), owner.secretKey);
  const actor = await verifyOwnerHeaders(ownerConfig, store, { "x-pdao-owner-wallet": owner.publicKey.toBase58(), "x-pdao-owner-message": challenge.message, "x-pdao-owner-signature": Buffer.from(signature).toString("base64") });
  const approved = await transitionSettlementBatch(ownerConfig, store, batch.id, "approve", actor);
  assert.equal(approved.status, "approved");
  assert.equal("payoutSignerSecret" in ownerConfig, false);
  assert.equal((await store.get("Registry", "settlement_1")), null);
});

test("owner approval rejects cross-origin requests, invalid signatures, and concurrent claims", async () => {
  const store = new MemoryStore();
  const owner = Keypair.generate();
  const ownerConfig = { ...config, treasury: owner.publicKey.toBase58(), domain: "agents.privatedao.org" };
  const batch = buildSettlementBatch({ settlements: [payable()], treasury: ownerConfig.treasury, usdcMint, periodStart: "2026-01-01", periodEnd: "2026-01-08", batchId: "settlement_batch_security" });
  await store.put("SettlementBatches", batch.id, batch);
  const challenge = await issueOwnerSettlementChallenge(ownerConfig, store, owner.publicKey.toBase58());
  const signature = nacl.sign.detached(Buffer.from(challenge.message), owner.secretKey);
  const headers = { "x-pdao-owner-wallet": owner.publicKey.toBase58(), "x-pdao-owner-message": challenge.message, "x-pdao-owner-signature": Buffer.from(signature).toString("base64") };
  await assert.rejects(() => verifyOwnerHeaders(ownerConfig, store, { ...headers, origin: "https://evil.example" }), /cross-origin/);
  await assert.rejects(() => verifyOwnerHeaders(ownerConfig, store, { ...headers, "x-pdao-owner-signature": Buffer.from(nacl.sign.detached(Buffer.from("wrong"), owner.secretKey)).toString("base64") }), /invalid/);
  await store.claim("SettlementBatches", batch.id, { claim_started_at: new Date().toISOString(), claim_expires_at: new Date(Date.now() + 60_000).toISOString(), claim_installation_id: "other-owner-action" });
  await assert.rejects(() => transitionSettlementBatch(ownerConfig, store, batch.id, "approve", owner.publicKey.toBase58()), /already in progress/);
});
