import {
  deriveTransferQueue,
  ensureTransferQueueCrankIx,
  getAuthToken,
  magicFeeVaultPdaFromValidator,
} from "@magicblock-labs/ephemeral-rollups-sdk";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import nacl from "tweetnacl";

export const DEFAULT_MAGICBLOCK_TEE_RPC = "https://mainnet-tee.magicblock.app";

function publicKey(value, name) {
  try {
    return new PublicKey(value);
  } catch {
    throw new Error(`${name} must be a valid Solana public key`);
  }
}

function rpcWithToken(rpcUrl, authToken) {
  const url = new URL(String(rpcUrl || DEFAULT_MAGICBLOCK_TEE_RPC));
  if (authToken) url.searchParams.set("token", String(authToken));
  return url.toString();
}

export async function createMagicBlockThrowawayToken(rpcUrl = DEFAULT_MAGICBLOCK_TEE_RPC) {
  const signer = Keypair.generate();
  const { token } = await getAuthToken(
    String(rpcUrl),
    signer.publicKey,
    async (message) => nacl.sign.detached(message, signer.secretKey),
  );
  if (!token) throw new Error("MagicBlock did not return a throwaway auth token");
  return token;
}

/**
 * Builds the official SDK crank transaction. It never broadcasts and never
 * returns the ephemeral payer secret key.
 */
export async function prepareMagicBlockPrivatePayCrank({
  rpcUrl = DEFAULT_MAGICBLOCK_TEE_RPC,
  authToken = "",
  mint,
  validator,
} = {}) {
  const mintKey = publicKey(mint, "mint");
  const validatorKey = publicKey(validator, "validator");
  const [transferQueue] = deriveTransferQueue(mintKey, validatorKey);
  const magicFeeVault = magicFeeVaultPdaFromValidator(validatorKey);
  const payer = Keypair.generate();
  const connection = new Connection(rpcWithToken(rpcUrl, authToken), "confirmed");
  const { context, value } = await connection.getLatestBlockhashAndContext("confirmed");
  const transaction = new Transaction({ feePayer: payer.publicKey })
    .add(ensureTransferQueueCrankIx(payer.publicKey, transferQueue, magicFeeVault));
  transaction.recentBlockhash = value.blockhash;
  transaction.lastValidBlockHeight = value.lastValidBlockHeight;
  transaction.sign(payer);

  return {
    status: "prepared",
    readOnly: true,
    rpcUrl: String(rpcUrl || DEFAULT_MAGICBLOCK_TEE_RPC),
    mint: mintKey.toBase58(),
    validator: validatorKey.toBase58(),
    transferQueue: transferQueue.toBase58(),
    magicFeeVault: magicFeeVault.toBase58(),
    payer: payer.publicKey.toBase58(),
    blockhashContextSlot: context.slot,
    recentBlockhash: value.blockhash,
    lastValidBlockHeight: value.lastValidBlockHeight,
    transactionBase64: transaction.serialize().toString("base64"),
  };
}
