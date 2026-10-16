import { randomBytes } from "node:crypto";
import nacl from "tweetnacl";
import { Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { digest } from "./canonical.mjs";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction, createTransferCheckedInstruction } from "./spl-token.mjs";
import { assertBatchOpen } from "./settlement.mjs";

const USDC_DECIMALS = 6;
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const OWNER_CHALLENGE_TTL_MS = 5 * 60 * 1000;

function b64(value) { return Buffer.from(value).toString("base64"); }
function fromB64(value) { return Uint8Array.from(Buffer.from(String(value || ""), "base64")); }
function key(value, field) { try { return new PublicKey(String(value)); } catch { throw Object.assign(new Error(`${field} is invalid`), { statusCode: 400 }); } }
function ata(mint, owner) { return PublicKey.findProgramAddressSync([owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()], ASSOCIATED_TOKEN_PROGRAM_ID)[0]; }
function atomic(value) { const n = Number(value); if (!Number.isFinite(n) || n <= 0) throw Object.assign(new Error("settlement amount is invalid"), { statusCode: 400 }); return BigInt(Math.round(n * 10 ** USDC_DECIMALS)); }

export async function issueOwnerSettlementChallenge(config, storage, wallet) {
  const owner = key(wallet, "owner wallet");
  if (owner.toBase58() !== config.treasury) throw Object.assign(new Error("only the configured Treasury wallet may approve settlements"), { statusCode: 403 });
  const allowed = await storage.consumeRateLimit(`owner-settlement-challenge:${owner.toBase58()}`, 5, 60_000);
  if (!allowed.allowed) throw Object.assign(new Error("too many owner challenges"), { statusCode: 429 });
  const nonce = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + OWNER_CHALLENGE_TTL_MS).toISOString();
  const message = ["PrivateDAO Agent Exchange owner settlement approval", `Treasury: ${owner.toBase58()}`, `Nonce: ${nonce}`, `Expires: ${expiresAt}`].join("\n");
  await storage.put("SettlementChallenges", `owner_challenge_${nonce}`, { id: `owner_challenge_${nonce}`, kind: "owner_settlement_challenge", wallet: owner.toBase58(), nonce, message, expires_at: expiresAt, created_at: new Date().toISOString() }, true);
  return { wallet: owner.toBase58(), nonce, message, expires_at: expiresAt };
}

export async function verifyOwnerHeaders(config, storage, headers = {}) {
  const origin = headers.origin || headers.Origin;
  if (origin && origin !== `https://${config.domain}` && origin !== `http://${config.domain}` && origin !== "http://localhost" && origin !== "http://127.0.0.1")
    throw Object.assign(new Error("cross-origin owner settlement request rejected"), { statusCode: 403 });
  const wallet = headers["x-pdao-owner-wallet"] || headers["X-Pdao-Owner-Wallet"] || headers["X-PDAO-Owner-Wallet"];
  const message = headers["x-pdao-owner-message"] || headers["X-Pdao-Owner-Message"] || headers["X-PDAO-Owner-Message"];
  const signature = headers["x-pdao-owner-signature"] || headers["X-Pdao-Owner-Signature"] || headers["X-PDAO-Owner-Signature"];
  if (!wallet || !message || !signature) throw Object.assign(new Error("owner wallet signature is required"), { statusCode: 403 });
  const owner = key(wallet, "owner wallet");
  if (owner.toBase58() !== config.treasury) throw Object.assign(new Error("owner wallet signature is required"), { statusCode: 403 });
  const nonceLine = String(message).split("\n").find((line) => line.startsWith("Nonce: "));
  const nonce = nonceLine?.slice("Nonce: ".length);
  const challenge = nonce ? await storage.get("SettlementChallenges", `owner_challenge_${nonce}`) : null;
  if (!challenge || challenge.wallet !== owner.toBase58() || challenge.message !== message || Date.parse(challenge.expires_at) <= Date.now()) throw Object.assign(new Error("owner approval challenge is missing or expired"), { statusCode: 403 });
  let valid = false;
  try { valid = nacl.sign.detached.verify(Buffer.from(message), fromB64(signature), owner.toBytes()); } catch { valid = false; }
  if (!valid) throw Object.assign(new Error("owner wallet signature is invalid"), { statusCode: 403 });
  return owner.toBase58();
}

async function audit(storage, action, batch, actor, details = {}) {
  const entry = { id: `settlement_audit_${randomBytes(16).toString("hex")}`, kind: "settlement_audit", action, batch_id: batch.id, actor_wallet: actor, created_at: new Date().toISOString(), details };
  await storage.put("AuditLog", entry.id, entry, true);
}

export async function listSettlementBatches(config, storage) {
  const batches = (await storage.list("SettlementBatches")).filter((item) => item.kind === "settlement_batch");
  return batches.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

export async function transitionSettlementBatch(config, storage, batchId, action, actor) {
  const batch = assertBatchOpen(await storage.get("SettlementBatches", batchId));
  if (batch.treasury !== config.treasury || batch.usdc_mint !== config.usdcMint) throw Object.assign(new Error("settlement batch policy does not match the configured Treasury"), { statusCode: 409 });
  const allowed = { approve: ["pending_owner_approval", "deferred"], reject: ["pending_owner_approval", "deferred"], defer: ["pending_owner_approval", "approved"] };
  if (!allowed[action]?.includes(batch.status)) throw Object.assign(new Error(`batch cannot be ${action}d from ${batch.status}`), { statusCode: 409 });
  const claim = { claim_started_at: new Date().toISOString(), claim_expires_at: new Date(Date.now() + 60_000).toISOString(), claim_installation_id: `owner-settlement:${randomBytes(12).toString("hex")}` };
  try { await storage.claim("SettlementBatches", batch.id, claim); } catch { throw Object.assign(new Error("another owner action is already in progress for this batch"), { statusCode: 409 }); }
  const claimed = await storage.get("SettlementBatches", batch.id);
  if (claimed?.claim_installation_id !== claim.claim_installation_id) throw Object.assign(new Error("another owner action is already in progress for this batch"), { statusCode: 409 });
  const nextStatus = action === "approve" ? "approved" : action === "reject" ? "rejected" : "deferred";
  const { claim_started_at, claim_expires_at, claim_installation_id, ...withoutClaim } = batch;
  const next = { ...withoutClaim, status: nextStatus, [`${action}_at`]: new Date().toISOString(), [`${action}_by`]: actor, ...(action === "defer" ? { defer_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() } : {}) };
  await storage.put("SettlementBatches", batch.id, next);
  await audit(storage, `batch_${action}`, next, actor);
  return settlementBatchResponse(next);
}

function expectedTransfers(batch, config) {
  const mint = key(config.usdcMint, "USDC mint");
  const treasury = key(config.treasury, "Treasury");
  const source = ata(mint, treasury);
  return batch.entries.map((entry) => ({ settlement_id: entry.settlement_id, destination: ata(mint, key(entry.payout.address, "payout address")), owner: entry.payout.address, amount: atomic(entry.seller_net_amount), source, mint }));
}

export async function prepareSettlementBatch(config, storage, batchId, actor) {
  const batch = assertBatchOpen(await storage.get("SettlementBatches", batchId));
  if (batch.treasury !== config.treasury || batch.usdc_mint !== config.usdcMint) throw Object.assign(new Error("settlement batch policy does not match the configured Treasury"), { statusCode: 409 });
  if (!["approved", "prepared"].includes(batch.status)) throw Object.assign(new Error("batch must be owner-approved before preparing a transaction"), { statusCode: 409 });
  if (!batch.entries.length) throw Object.assign(new Error("settlement batch is empty"), { statusCode: 400 });
  const connection = new Connection(config.rpcPrimary, "confirmed");
  const latest = await connection.getLatestBlockhash("confirmed");
  const treasury = key(config.treasury, "Treasury");
  const mint = key(config.usdcMint, "USDC mint");
  const transaction = new Transaction({ recentBlockhash: latest.blockhash, feePayer: treasury });
  for (const item of expectedTransfers(batch, config)) {
    transaction.add(
      createAssociatedTokenAccountIdempotentInstruction(treasury, item.destination, key(item.owner, "payout address"), mint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID),
      createTransferCheckedInstruction(item.source, mint, item.destination, treasury, item.amount, USDC_DECIMALS, [], TOKEN_PROGRAM_ID),
      new TransactionInstruction({ programId: MEMO_PROGRAM_ID, keys: [{ pubkey: treasury, isSigner: true, isWritable: false }], data: Buffer.from(`PDAO_SETTLEMENT:${item.settlement_id}`) }),
    );
  }
  const simulation = await connection.simulateTransaction(transaction, { sigVerify: false, replaceRecentBlockhash: false });
  if (simulation.value?.err) throw Object.assign(new Error("settlement transaction simulation failed"), { statusCode: 502, details: simulation.value.err });
  const unsigned = transaction.serialize({ requireAllSignatures: false, verifySignatures: false });
  const next = { ...batch, status: "prepared", prepared_at: new Date().toISOString(), prepared_by: actor, recent_blockhash: latest.blockhash, last_valid_block_height: latest.lastValidBlockHeight, transaction_digest: digest(unsigned.toString("base64")) };
  await storage.put("SettlementBatches", batch.id, next);
  await audit(storage, "batch_prepare", next, actor, { transaction_digest: next.transaction_digest });
  return { batch: settlementBatchResponse(next), transaction_base64: unsigned.toString("base64"), recent_blockhash: latest.blockhash, last_valid_block_height: latest.lastValidBlockHeight, wallet: config.treasury, network: "solana-mainnet-beta", asset: "USDC", owner_approval_is_not_broadcast: true };
}

function decodeTransferInstruction(instruction) {
  if (!instruction || String(instruction.programId) !== TOKEN_PROGRAM_ID.toBase58() || instruction.data.length < 10 || instruction.data[0] !== 12) return null;
  return { source: instruction.keys[0]?.pubkey?.toBase58(), mint: instruction.keys[1]?.pubkey?.toBase58(), destination: instruction.keys[2]?.pubkey?.toBase58(), amount: instruction.data.readBigUInt64LE(1), decimals: instruction.data[9] };
}

function assertSignedTransactionMatches(transaction, batch, config) {
  if (transaction.feePayer?.toBase58() !== config.treasury || !transaction.verifySignatures()) throw Object.assign(new Error("signed transaction must be signed by the configured Treasury wallet"), { statusCode: 400 });
  if (transaction.recentBlockhash !== batch.recent_blockhash) throw Object.assign(new Error("signed transaction does not match the prepared blockhash"), { statusCode: 400 });
  const allowedPrograms = new Set([TOKEN_PROGRAM_ID.toBase58(), ASSOCIATED_TOKEN_PROGRAM_ID.toBase58(), MEMO_PROGRAM_ID.toBase58()]);
  if (transaction.instructions.some((instruction) => !allowedPrograms.has(instruction.programId.toBase58()))) throw Object.assign(new Error("signed transaction contains an unexpected program"), { statusCode: 400 });
  const expected = expectedTransfers(batch, config);
  const transfers = transaction.instructions.map(decodeTransferInstruction).filter(Boolean);
  if (transfers.length !== expected.length) throw Object.assign(new Error("signed transaction transfer count does not match the immutable batch"), { statusCode: 400 });
  for (const item of expected) {
    const found = transfers.find((candidate) => candidate.destination === item.destination.toBase58() && candidate.amount === item.amount && candidate.mint === item.mint.toBase58() && candidate.source === item.source.toBase58() && candidate.decimals === USDC_DECIMALS);
    if (!found) throw Object.assign(new Error("signed transaction recipients or amounts do not match the immutable batch"), { statusCode: 400 });
  }
}

async function finalizeBatch(config, storage, batch, actor, signature) {
  const next = { ...batch, status: "settled", payout_signature: signature, settled_at: new Date().toISOString(), settled_by: actor };
  await storage.put("SettlementBatches", batch.id, next);
  for (const entry of batch.entries) {
    const item = await storage.get("Registry", entry.settlement_id);
    if (item && item.kind === "seller_settlement" && item.status === "payable_pending_scheduled_settlement") await storage.put("Registry", item.id, { ...item, status: "settled", payout_signature: signature, settled_at: next.settled_at });
  }
  await audit(storage, "batch_settled", next, actor, { signature });
  return settlementBatchResponse(next);
}

export async function submitSignedSettlementBatch(config, storage, batchId, signedTransactionBase64, actor) {
  let batch = assertBatchOpen(await storage.get("SettlementBatches", batchId));
  if (!["prepared", "broadcast_pending"].includes(batch.status)) throw Object.assign(new Error("batch must be prepared before signed submission"), { statusCode: 409 });
  const transaction = Transaction.from(Buffer.from(String(signedTransactionBase64 || ""), "base64"));
  assertSignedTransactionMatches(transaction, batch, config);
  const connection = new Connection(config.rpcPrimary, "confirmed");
  if (batch.status === "broadcast_pending" && batch.payout_signature) return reconcileSettlementBatch(config, storage, batchId, actor);
  if (!(await connection.isBlockhashValid(transaction.recentBlockhash, "confirmed")).value) throw Object.assign(new Error("signed transaction has expired; prepare a new transaction"), { statusCode: 409 });
  const signature = await connection.sendRawTransaction(transaction.serialize(), { skipPreflight: false, maxRetries: 3 });
  batch = { ...batch, status: "broadcast_pending", payout_signature: signature, broadcast_at: new Date().toISOString(), broadcast_by: actor };
  await storage.put("SettlementBatches", batch.id, batch);
  await audit(storage, "batch_broadcast", batch, actor, { signature });
  return reconcileSettlementBatch(config, storage, batch.id, actor);
}

export async function reconcileSettlementBatch(config, storage, batchId, actor) {
  const batch = assertBatchOpen(await storage.get("SettlementBatches", batchId));
  if (batch.status !== "broadcast_pending" || !batch.payout_signature) throw Object.assign(new Error("batch has no broadcast transaction to reconcile"), { statusCode: 409 });
  const connection = new Connection(config.rpcPrimary, "confirmed");
  const confirmation = await connection.confirmTransaction(batch.payout_signature, "finalized");
  if (confirmation.value?.err) throw Object.assign(new Error("settlement transaction failed on chain"), { statusCode: 502 });
  const tx = await connection.getParsedTransaction(batch.payout_signature, { commitment: "finalized", maxSupportedTransactionVersion: 0 });
  if (!tx?.meta || tx.meta.err) throw Object.assign(new Error("finalized settlement transaction evidence is unavailable"), { statusCode: 503 });
  const expected = expectedTransfers(batch, config);
  const actual = (tx.transaction.message.instructions || []).filter((instruction) => instruction.programId?.toBase58?.() === TOKEN_PROGRAM_ID.toBase58() && instruction.parsed?.type === "transferChecked").map((instruction) => ({
    destination: instruction.parsed.info.destination,
    mint: instruction.parsed.info.mint,
    amount: BigInt(instruction.parsed.info.tokenAmount.amount),
    decimals: Number(instruction.parsed.info.tokenAmount.decimals),
  }));
  if (actual.length !== expected.length || expected.some((item) => !actual.some((candidate) => candidate.destination === item.destination.toBase58() && candidate.mint === item.mint.toBase58() && candidate.amount === item.amount && candidate.decimals === USDC_DECIMALS)))
    throw Object.assign(new Error("finalized settlement recipients or amounts do not match the immutable batch"), { statusCode: 502 });
  return finalizeBatch(config, storage, { ...batch, payout_network_fee_lamports: Number(tx.meta.fee || 0) }, actor, batch.payout_signature);
}

export function settlementBatchResponse(batch) {
  return { ...batch, totals: { ...batch.totals, amount_atomic: String(batch.totals?.amount_atomic ?? 0) }, entries: batch.entries || [] };
}
