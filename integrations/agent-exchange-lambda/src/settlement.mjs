import { Keypair, PublicKey, Connection, Transaction, TransactionInstruction } from "@solana/web3.js";
import { assertMainnetConfig, derivedTreasuryTokenAccount } from "./solana.mjs";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
} from "./spl-token.mjs";

const USDC_DECIMALS = 6;
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

function associatedTokenAddress(mint, owner) {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )[0];
}

function parseSecretKey(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return Uint8Array.from(parsed);
    if (parsed && Array.isArray(parsed.secretKey)) return Uint8Array.from(parsed.secretKey);
    if (parsed && typeof parsed.secretKey === "string") return parseSecretKey(parsed.secretKey);
  } catch {
    // Secret Manager may contain a base58 key or a JSON array string.
  }
  if (/^[0-9a-f]+$/i.test(raw) && raw.length % 2 === 0) {
    return Uint8Array.from(raw.match(/.{2}/g).map((pair) => Number.parseInt(pair, 16)));
  }
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let bytes = [0];
  for (const char of raw) {
    const digit = alphabet.indexOf(char);
    if (digit < 0) return null;
    let carry = digit;
    for (let i = 0; i < bytes.length; i += 1) {
      const value = bytes[i] * 58 + carry;
      bytes[i] = value & 255;
      carry = value >> 8;
    }
    while (carry) { bytes.push(carry & 255); carry >>= 8; }
  }
  for (const char of raw) if (char === "1") bytes.push(0); else break;
  return Uint8Array.from(bytes.reverse());
}

function payoutKeypair(config) {
  const secret = parseSecretKey(config.payoutSignerSecret);
  if (!secret || ![32, 64].includes(secret.length)) throw new Error("payout signer secret is invalid");
  const keypair = secret.length === 32 ? Keypair.fromSeed(secret) : Keypair.fromSecretKey(secret);
  if (keypair.publicKey.toBase58() !== config.treasury) throw new Error("payout signer does not match the configured treasury");
  return keypair;
}

function atomicAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("seller settlement amount is invalid");
  return BigInt(Math.round(amount * 10 ** USDC_DECIMALS));
}

async function tokenBalance(connection, address) {
  try {
    const result = await connection.getTokenAccountBalance(new PublicKey(address), "finalized");
    return BigInt(result?.value?.amount || "0");
  } catch {
    return 0n;
  }
}

function settlementMemo(id) {
  return `PDAO_SETTLEMENT:${id}`;
}

function instructionText(instruction) {
  if (typeof instruction?.parsed === "string") return instruction.parsed;
  if (typeof instruction?.data === "string") return instruction.data;
  if (typeof instruction?.parsed?.info?.memo === "string") return instruction.parsed.info.memo;
  return "";
}

async function findFinalizedSettlement(connection, sourceAta, memo) {
  if (typeof connection.getSignaturesForAddress !== "function" || typeof connection.getTransaction !== "function") return null;
  const signatures = await connection.getSignaturesForAddress(new PublicKey(sourceAta), { limit: 100 }, "finalized");
  for (const item of signatures || []) {
    if (item?.err) continue;
    const transaction = await connection.getTransaction(item.signature, { commitment: "finalized", maxSupportedTransactionVersion: 0 });
    const instructions = transaction?.transaction?.message?.instructions || [];
    const matched = instructions.some((instruction) => instructionText(instruction) === memo);
    if (matched && !transaction?.meta?.err) return { signature: item.signature, fee: Number(transaction?.meta?.fee || 0) };
  }
  return null;
}

async function verifyFinalizedPayout(connection, signature, sourceAta, destinationAta, mint, amount, sourceBefore = null, destinationBefore = null) {
  const transaction = await connection.getTransaction(signature, { commitment: "finalized", maxSupportedTransactionVersion: 0 });
  if (!transaction || transaction.meta?.err) throw new Error("seller payout finality verification failed");
  const transfer = (transaction.transaction?.message?.instructions || []).find((instruction) => {
    const info = instruction?.parsed?.info;
    return instruction?.program === "spl-token" && info?.source === sourceAta.toBase58() && info?.destination === destinationAta.toBase58();
  });
  const transferInfo = transfer?.parsed?.info;
  const transferred = transferInfo?.tokenAmount?.amount || transferInfo?.amount;
  if (!transferInfo || (transferInfo.mint && transferInfo.mint !== mint.toBase58()) || transferred !== amount.toString()) {
    throw new Error("seller payout recipients or amount could not be verified");
  }
  const sourceAfter = await tokenBalance(connection, sourceAta);
  const destinationAfter = await tokenBalance(connection, destinationAta);
  if (sourceBefore !== null && sourceAfter > sourceBefore - amount) throw new Error("seller payout treasury debit could not be verified");
  if (destinationBefore !== null && destinationAfter < destinationBefore + amount) throw new Error("seller payout recipient credit could not be verified");
  return { fee: Number(transaction.meta?.fee || 0), sourceAfter, destinationAfter };
}

async function recordPayout(storage, settlement, signature, fee) {
  const settledAt = new Date().toISOString();
  const next = {
    ...settlement,
    status: "settled",
    payout_signature: signature,
    payout_network_fee_lamports: fee,
    payout_network_fee_policy: "platform_borne_automatic_settlement",
    settled_at: settledAt,
    claim_expires_at: null,
  };
  await storage.put("Registry", settlement.id, next);
  const revenue = await storage.get("Revenue", `rev_${settlement.job_id}`);
  if (revenue) {
    await storage.put("Revenue", revenue.id, {
      ...revenue,
      payoutNetworkFeeLamports: fee,
      payoutNetworkFeePolicy: "platform_borne_automatic_settlement",
      payoutSignature: signature,
      settlementStatus: "settled",
      settledAt,
    });
  }
  const receipts = await storage.list("Receipts");
  for (const receipt of receipts.filter((item) => item.job_id === settlement.job_id && item.seller_settlement?.id === settlement.id)) {
    await storage.put("Receipts", receipt.receipt_id, {
      ...receipt,
      payout_network_fee_lamports: fee,
      payout_network_fee_policy: "platform_borne_automatic_settlement",
      seller_settlement: { ...receipt.seller_settlement, payout_network_fee_lamports: fee, payout_network_fee_policy: "platform_borne_automatic_settlement", status: "settled", payout_signature: signature, settled_at: settledAt },
    });
  }
  return next;
}

export async function settleCandidate(config, storage, connection, signer, candidate) {
  const claimStartedAt = new Date().toISOString();
  const claimExpiresAt = new Date(Date.now() + 120000).toISOString();
  const claimed = await storage.claim("Registry", candidate.id, {
    expected_status: "payable_pending_scheduled_settlement",
    claim_started_at: claimStartedAt,
    claim_expires_at: claimExpiresAt,
    claim_installation_id: `settlement-${candidate.id}`,
  });
  if (!claimed || claimed.status !== "payable_pending_scheduled_settlement") return { status: "skipped" };
  const payout = claimed.payout;
  if (!payout?.address || payout.network !== "solana-mainnet-beta" || payout.asset !== "USDC") throw new Error("seller payout rail is invalid");
  if (payout.address === config.treasury) throw new Error("seller payout cannot equal the treasury");
  const destination = new PublicKey(payout.address);
  const mint = new PublicKey(config.usdcMint);
  const sourceAta = new PublicKey(await derivedTreasuryTokenAccount(config));
  const destinationAta = associatedTokenAddress(mint, destination);
  const amount = atomicAmount(claimed.seller_net_amount);
  const memo = settlementMemo(claimed.id);
  const existing = await findFinalizedSettlement(connection, sourceAta, memo);
  if (existing) {
    await verifyFinalizedPayout(connection, existing.signature, sourceAta, destinationAta, mint, amount);
    await recordPayout(storage, claimed, existing.signature, existing.fee);
    return { status: "settled", signature: existing.signature, fee: existing.fee };
  }
  const sourceBefore = await tokenBalance(connection, sourceAta);
  const destinationBefore = await tokenBalance(connection, destinationAta);
  if (sourceBefore < amount) throw new Error("treasury USDC balance is insufficient for seller settlement");
  const latest = await connection.getLatestBlockhash("finalized");
  const transaction = new Transaction({ recentBlockhash: latest.blockhash, feePayer: signer.publicKey });
  transaction.add(
    createAssociatedTokenAccountIdempotentInstruction(signer.publicKey, destinationAta, destination, mint, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID),
    createTransferCheckedInstruction(sourceAta, mint, destinationAta, signer.publicKey, amount, USDC_DECIMALS, [], TOKEN_PROGRAM_ID),
    new TransactionInstruction({ programId: MEMO_PROGRAM_ID, keys: [{ pubkey: signer.publicKey, isSigner: true, isWritable: false }], data: Buffer.from(memo) }),
  );
  transaction.sign(signer);
  if (typeof connection.simulateTransaction === "function") {
    const simulation = await connection.simulateTransaction(transaction);
    if (simulation?.value?.err) throw new Error("seller payout transaction simulation failed");
  }
  const signature = await connection.sendRawTransaction(transaction.serialize(), { skipPreflight: false, maxRetries: 3 });
  const confirmation = await connection.confirmTransaction({ signature, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight }, "finalized");
  if (confirmation.value.err) throw new Error("seller payout transaction failed");
  const verified = await verifyFinalizedPayout(connection, signature, sourceAta, destinationAta, mint, amount, sourceBefore, destinationBefore);
  await recordPayout(storage, claimed, signature, verified.fee);
  return { status: "settled", signature, fee: verified.fee };
}

export async function runScheduledSellerSettlements(config, storage, { limit = config.payoutBatchLimit } = {}) {
  if (!config.payoutSecretId || !config.payoutSignerSecret) return { status: "disabled", reason: "payout signer secret is not configured", scanned: 0, settled: 0, failed: 0 };
  assertMainnetConfig(config);
  const signer = payoutKeypair(config);
  const connection = new Connection(config.rpcPrimary, "finalized");
  const candidates = (await storage.list("Registry"))
    .filter((item) => item.kind === "seller_settlement" && item.status === "payable_pending_scheduled_settlement" && item.seller_net_amount > 0)
    .slice(0, limit);
  const result = { status: "completed", scanned: candidates.length, settled: 0, skipped: 0, failed: 0, failures: [] };
  for (const candidate of candidates) {
    try {
      const outcome = await settleCandidate(config, storage, connection, signer, candidate);
      if (outcome.status === "settled") result.settled += 1;
      else result.skipped += 1;
    } catch (error) {
      if (error.message === "conditional claim failed") { result.skipped += 1; continue; }
      result.failed += 1;
      result.failures.push({ settlement_id: candidate.id, reason: error.message });
    }
  }
  return result;
}
