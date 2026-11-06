import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, Transaction, TransactionInstruction, VersionedTransaction } from "@solana/web3.js";

type SolanaTransaction = Transaction | VersionedTransaction;

export type ExactSolanaPaymentChallenge = {
  scheme?: string;
  network?: string;
  asset?: string;
  amount?: string;
  payTo?: string;
  extra?: { paymentId?: string };
};

function feePayerOf(transaction: SolanaTransaction) {
  if (transaction instanceof VersionedTransaction) return transaction.message.staticAccountKeys[0] || null;
  return transaction.feePayer || null;
}

function u64FromLittleEndian(bytes: Uint8Array) {
  let value = BigInt(0);
  for (let index = 0; index < 8; index += 1) value += BigInt(bytes[index] || 0) << BigInt(index * 8);
  return value;
}

function transferCheckedMatches(
  instruction: TransactionInstruction,
  payer: PublicKey,
  challenge: ExactSolanaPaymentChallenge,
  expectedAmount: string,
) {
  if (!instruction.programId.equals(TOKEN_PROGRAM_ID) && !instruction.programId.equals(TOKEN_2022_PROGRAM_ID)) return false;
  if (instruction.data.length < 10 || instruction.data[0] !== 12 || instruction.keys.length < 4) return false;
  const mint = new PublicKey(challenge.asset!);
  const payTo = new PublicKey(challenge.payTo!);
  const destinationAta = getAssociatedTokenAddressSync(mint, payTo, false, instruction.programId, ASSOCIATED_TOKEN_PROGRAM_ID);
  const destination = instruction.keys[2].pubkey;
  return instruction.keys[1].pubkey.equals(mint)
    && instruction.keys[0].isWritable
    && instruction.keys[2].isWritable
    && instruction.keys[3].isSigner
    && instruction.keys[3].pubkey.equals(payer)
    && (destination.equals(payTo) || destination.equals(destinationAta))
    && u64FromLittleEndian(instruction.data.slice(1, 9)) === BigInt(expectedAmount);
}

function instructionsOf(transaction: SolanaTransaction) {
  if (transaction instanceof Transaction) return transaction.instructions;
  if (transaction.message.addressTableLookups.length > 0) {
    throw new Error("The payment transaction uses unresolved address lookups. No wallet transaction was signed.");
  }
  const keys = transaction.message.staticAccountKeys;
  const header = transaction.message.header;
  const writableSignedCount = header.numRequiredSignatures - header.numReadonlySignedAccounts;
  const writableUnsignedStart = keys.length - header.numReadonlyUnsignedAccounts;
  return transaction.message.compiledInstructions.map((instruction) => new TransactionInstruction({
    programId: keys[instruction.programIdIndex],
    keys: instruction.accountKeyIndexes.map((index) => ({
      pubkey: keys[index],
      isSigner: index < header.numRequiredSignatures,
      isWritable: index < header.numRequiredSignatures
        ? index < writableSignedCount
        : index < writableUnsignedStart,
    })),
    data: Buffer.from(instruction.data),
  }));
}

export function assertLocalFeePayer(transaction: SolanaTransaction, expectedAddress: string) {
  const expected = new PublicKey(expectedAddress);
  const actual = feePayerOf(transaction);
  if (!actual || !actual.equals(expected)) {
    throw new Error("The wallet transaction payer does not match the connected wallet.");
  }
}

export function assertExactSolanaPaymentChallenge(challenge: ExactSolanaPaymentChallenge, expectedAmount: string) {
  if (challenge.scheme !== "exact") throw new Error("The payment challenge is not an exact quote. No wallet transaction was signed.");
  if (challenge.network !== "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp") throw new Error("The payment challenge is not for Solana Mainnet. No wallet transaction was signed.");
  if (!challenge.asset || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(challenge.asset)) throw new Error("The payment challenge has no valid Solana payment asset. No wallet transaction was signed.");
  if (!challenge.payTo || typeof challenge.payTo !== "string") throw new Error("The payment challenge has no payment destination. No wallet transaction was signed.");
  if (!challenge.extra?.paymentId || !/^[A-Za-z0-9:_-]{8,128}$/.test(challenge.extra.paymentId)) throw new Error("The payment challenge has no valid payment id. No wallet transaction was signed.");
  if (challenge.amount !== expectedAmount) throw new Error("The payment challenge amount does not match the selected service price. No wallet transaction was signed.");
}

export function assertExactSolanaPaymentTransaction(
  transaction: SolanaTransaction,
  challenge: ExactSolanaPaymentChallenge,
  expectedPayer: string,
  expectedAmount: string,
) {
  assertExactSolanaPaymentChallenge(challenge, expectedAmount);
  const payer = new PublicKey(expectedPayer);
  const matches = instructionsOf(transaction).filter((instruction) => transferCheckedMatches(instruction, payer, challenge, expectedAmount));
  if (matches.length !== 1) {
    throw new Error("The payment transaction does not contain exactly one matching token transfer. No wallet transaction was signed.");
  }
}

export function assertMagicBlockPrivateChallenge(challenge: ExactSolanaPaymentChallenge & { extra?: { paymentId?: string; cluster?: string; settlement?: string } }, expectedAmount: string) {
  assertExactSolanaPaymentChallenge({ ...challenge, scheme: challenge.scheme === "exact-magicblock" ? "exact" : challenge.scheme }, expectedAmount);
  if (challenge.scheme !== "exact-magicblock" || challenge.extra?.cluster !== "mainnet-private" || challenge.extra?.settlement !== "ephemeral-rollup") {
    throw new Error("The payment challenge is not for the reviewed MagicBlock private settlement rail. No wallet transaction was signed.");
  }
}
