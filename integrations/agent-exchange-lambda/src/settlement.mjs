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

export async function runScheduledSellerSettlements(config, storage, { limit = config.payoutBatchLimit } = {}) {
  if (!config.payoutSecretId || !config.payoutSignerSecret) return { status: "disabled", reason: "payout signer secret is not configured", scanned: 0, settled: 0, failed: 0 };
  assertMainnetConfig(config);
  const signer = payoutKeypair(config);
  const connection = new Connection(config.rpcPrimary, "finalized");
  const treasuryAta = await derivedTreasuryTokenAccount(config);
  const candidates = (await storage.list("Registry"))
    .filter((item) => item.kind === "seller_settlement" && item.status === "payable_pending_scheduled_settlement" && item.seller_net_amount > 0)
    .slice(0, limit);
  const result = { status: "completed", scanned: candidates.length, settled: 0, failed: 0, failures: [] };
  for (const candidate of candidates) {
    try {
      await storage.claim("Registry", candidate.id, { claim_started_at: new Date().toISOString(), claim_expires_at: new Date(Date.now() + 120000).toISOString(), claim_installation_id: `settlement-${candidate.id}` });
      const claimed = await storage.get("Registry", candidate.id);
      if (!claimed || claimed.status !== "payable_pending_scheduled_settlement") continue;
      const payout = claimed.payout;
      if (!payout?.address || payout.network !== "solana-mainnet-beta" || payout.asset !== "USDC") throw new Error("seller payout rail is invalid");
      if (payout.address === config.treasury) throw new Error("seller payout cannot equal the treasury");
      const destination = new PublicKey(payout.address);
      const destinationAta = associatedTokenAddress(new PublicKey(config.usdcMint), destination);
      const latest = await connection.getLatestBlockhash("finalized");
      const transaction = new Transaction({ recentBlockhash: latest.blockhash, feePayer: signer.publicKey });
      transaction.add(
        createAssociatedTokenAccountIdempotentInstruction(signer.publicKey, destinationAta, destination, new PublicKey(config.usdcMint), TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID),
        createTransferCheckedInstruction(new PublicKey(treasuryAta), new PublicKey(config.usdcMint), destinationAta, signer.publicKey, atomicAmount(claimed.seller_net_amount), USDC_DECIMALS, [], TOKEN_PROGRAM_ID),
        new TransactionInstruction({ programId: MEMO_PROGRAM_ID, keys: [{ pubkey: signer.publicKey, isSigner: true, isWritable: false }], data: Buffer.from(`PDAO_SETTLEMENT:${claimed.id}`) }),
      );
      transaction.sign(signer);
      const signature = await connection.sendRawTransaction(transaction.serialize(), { skipPreflight: false, maxRetries: 3 });
      const confirmation = await connection.confirmTransaction({ signature, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight }, "finalized");
      if (confirmation.value.err) throw new Error("seller payout transaction failed");
      const tx = await connection.getTransaction(signature, { commitment: "finalized", maxSupportedTransactionVersion: 0 });
      await storage.put("Registry", candidate.id, { ...claimed, status: "settled", payout_signature: signature, payout_network_fee_lamports: Number(tx?.meta?.fee || 0), settled_at: new Date().toISOString(), claim_expires_at: null });
      result.settled += 1;
    } catch (error) {
      result.failed += 1;
      result.failures.push({ settlement_id: candidate.id, reason: error.message });
    }
  }
  return result;
}
