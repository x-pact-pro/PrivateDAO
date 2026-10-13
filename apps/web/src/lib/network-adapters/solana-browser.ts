import {
  Connection,
  type Commitment,
  type PublicKey,
  type Signer,
  type SendOptions,
  type Transaction,
  type TransactionConfirmationStrategy,
  type VersionedTransaction,
} from "@solana/web3.js";

import { paymentOutcome, type PaymentOutcome, type SentPayment } from "./solana-payment-recovery";

export type SolanaBrowserConnection = Connection;
export type SolanaWalletSendOptions = SendOptions & { signers?: Signer[] };
export type SolanaWalletSender = (
  transaction: Transaction,
  connection: SolanaBrowserConnection,
  options?: SolanaWalletSendOptions,
) => Promise<string>;

export function createSolanaBrowserConnection(endpoint: string, commitment: Commitment): SolanaBrowserConnection {
  return new Connection(endpoint, commitment);
}

export function readAccountInfo(connection: SolanaBrowserConnection, address: PublicKey, commitment: Commitment) {
  return connection.getAccountInfo(address, commitment);
}

export function readTokenAccountBalance(connection: SolanaBrowserConnection, address: PublicKey, commitment: Commitment) {
  return connection.getTokenAccountBalance(address, commitment);
}

export function estimateAccountRent(connection: SolanaBrowserConnection, dataLength: number, commitment?: Commitment) {
  return connection.getMinimumBalanceForRentExemption(dataLength, commitment);
}

export function latestBlockhash(connection: SolanaBrowserConnection, commitment: Commitment) {
  return connection.getLatestBlockhash(commitment);
}

export function recentBlockhash(connection: SolanaBrowserConnection, commitment: Commitment) {
  return connection.getRecentBlockhash(commitment);
}

export function submitSignedTransaction(
  connection: SolanaBrowserConnection,
  signed: Transaction | VersionedTransaction,
  options?: SendOptions,
) {
  return connection.sendRawTransaction(signed.serialize(), options);
}

export function confirmTransaction(
  connection: SolanaBrowserConnection,
  strategy: TransactionConfirmationStrategy,
  commitment: Commitment,
): ReturnType<Connection["confirmTransaction"]>;
export function confirmTransaction(
  connection: SolanaBrowserConnection,
  strategy: string,
  commitment: Commitment,
): ReturnType<Connection["confirmTransaction"]>;
export function confirmTransaction(
  connection: SolanaBrowserConnection,
  strategy: TransactionConfirmationStrategy | string,
  commitment: Commitment,
) {
  if (typeof strategy === "string") return connection.confirmTransaction(strategy, commitment);
  return connection.confirmTransaction(strategy, commitment);
}

export async function sendAndConfirmBrowserTransaction(
  connection: SolanaBrowserConnection,
  transaction: Transaction,
  sendTransaction: SolanaWalletSender,
  commitment: Commitment = "confirmed",
  confirmation: TransactionConfirmationStrategy | string | ((signature: string) => TransactionConfirmationStrategy) | undefined = undefined,
  options?: SolanaWalletSendOptions,
) {
  const signature = await sendTransaction(transaction, connection, options);
  const strategy = typeof confirmation === "function" ? confirmation(signature) : confirmation ?? signature;
  if (typeof strategy === "string") {
    await confirmTransaction(connection, strategy, commitment);
  } else {
    await confirmTransaction(connection, strategy, commitment);
  }
  return signature;
}

export function sendBrowserTransaction(
  connection: SolanaBrowserConnection,
  transaction: Transaction,
  sendTransaction: SolanaWalletSender,
  options?: SolanaWalletSendOptions,
) {
  return sendTransaction(transaction, connection, options);
}

export function readSignatureStatuses(
  connection: SolanaBrowserConnection,
  signatures: string[],
  options?: Parameters<Connection["getSignatureStatuses"]>[1],
) {
  return connection.getSignatureStatuses(signatures, options);
}

export function readTransaction(
  connection: SolanaBrowserConnection,
  signature: string,
  options: Parameters<Connection["getTransaction"]>[1],
) {
  return connection.getTransaction(signature, options);
}

export async function waitForFinalized(
  connection: SolanaBrowserConnection,
  signature: string,
  timeoutMs = 120_000,
  pollMs = 1_500,
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = (await connection.getSignatureStatuses([signature])).value[0];
    if (status?.err) throw new Error(`Solana transaction failed: ${JSON.stringify(status.err)}`);
    if (status?.confirmationStatus === "finalized") return status;
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  throw new Error(`Solana transaction did not reach Finalized within ${timeoutMs} milliseconds.`);
}

/** Blocks added to the expiry bound of a payment when it cannot be read after the wallet sends (about two minutes). */
export const POST_SEND_BLOCKHASH_FALLBACK_MARGIN = 300;

/**
 * Sends a payment through the wallet without waiting for confirmation, so the caller can save the signature before
 * anything else can fail. Returns the signature and the block height after which the payment can no longer land.
 */
export async function sendBrowserPayment(
  connection: SolanaBrowserConnection,
  transaction: Transaction,
  feePayer: PublicKey,
  sendTransaction: SolanaWalletSender,
  options?: SolanaWalletSendOptions,
): Promise<SentPayment> {
  const signedWith = await latestBlockhash(connection, "confirmed");
  transaction.recentBlockhash = signedWith.blockhash;
  transaction.feePayer = feePayer;
  const signature = await sendTransaction(transaction, connection, options);
  // A wallet may re-sign with a newer blockhash. None is newer than the latest one now, so once the chain passes
  // this height the payment can no longer land, whichever blockhash the wallet used.
  let lastValidBlockHeight = signedWith.lastValidBlockHeight + POST_SEND_BLOCKHASH_FALLBACK_MARGIN;
  try {
    const latest = await latestBlockhash(connection, "processed");
    lastValidBlockHeight = Math.max(signedWith.lastValidBlockHeight, latest.lastValidBlockHeight);
  } catch {
    // Keep the wider bound: waiting longer is safe, reporting a payment that later lands as dropped is not.
  }
  return { signature, lastValidBlockHeight };
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Polls a sent payment until it is finalized, fails on-chain or can no longer land. Returns `pending` when that is
 * still unknown at the timeout, for example while the RPC endpoint keeps failing. Rejects when `signal` aborts.
 */
export async function waitForPaymentOutcome(
  connection: SolanaBrowserConnection,
  payment: SentPayment,
  { pollMs = 2_000, timeoutMs = 180_000, signal }: { pollMs?: number; timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<PaymentOutcome> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    signal?.throwIfAborted();
    let outcome: PaymentOutcome = "pending";
    try {
      // Block height first: a status read after it cannot miss a payment that landed at or below that height.
      const blockHeight = await connection.getBlockHeight("confirmed");
      const statuses = await readSignatureStatuses(connection, [payment.signature], { searchTransactionHistory: true });
      outcome = paymentOutcome(statuses.value[0], blockHeight, payment.lastValidBlockHeight);
    } catch {
      // A failed RPC request says nothing about the payment: poll again.
    }
    // An abort during the requests wins, so a caller that stopped waiting never acts on the outcome.
    signal?.throwIfAborted();
    if (outcome !== "pending") return outcome;
    if (Date.now() >= deadline) return "pending";
    await sleep(pollMs, signal);
  }
}
