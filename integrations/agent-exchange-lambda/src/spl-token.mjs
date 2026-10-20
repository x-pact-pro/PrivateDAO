import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";

export const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

const u64le = (value) => {
  const bytes = new Uint8Array(8);
  let remaining = BigInt(value);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
  if (remaining !== 0n) throw new RangeError("token amount exceeds u64");
  return bytes;
};

export function getAssociatedTokenAddressSync(mint, owner, allowOwnerOffCurve = false, programId = TOKEN_PROGRAM_ID, associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID) {
  if (!allowOwnerOffCurve && !PublicKey.isOnCurve(owner.toBytes())) throw new Error("owner cannot be off curve");
  return PublicKey.findProgramAddressSync([owner.toBuffer(), programId.toBuffer(), mint.toBuffer()], associatedTokenProgramId)[0];
}

export function createAssociatedTokenAccountIdempotentInstruction(payer, associatedToken, owner, mint, programId = TOKEN_PROGRAM_ID, associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID) {
  return new TransactionInstruction({
    programId: associatedTokenProgramId,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: associatedToken, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: programId, isSigner: false, isWritable: false },
    ],
    data: new Uint8Array([1]),
  });
}

export function createTransferCheckedInstruction(source, mint, destination, owner, amount, decimals, multiSigners = [], programId = TOKEN_PROGRAM_ID) {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) throw new RangeError("token decimals must fit u8");
  const data = new Uint8Array(10);
  data[0] = 12;
  data.set(u64le(amount), 1);
  data[9] = decimals;
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: multiSigners.length === 0, isWritable: false },
      ...multiSigners.map((signer) => ({ pubkey: signer, isSigner: true, isWritable: false })),
    ],
    data,
  });
}
