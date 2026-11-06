import {
  Connection,
  type Commitment,
  type Finality,
  type PublicKey,
  type Signer,
  type SendOptions,
  type TokenAccountsFilter,
  type Transaction,
  type TransactionConfirmationStrategy,
  type VersionedTransaction,
} from "@solana/web3.js";

export type SolanaBrowserConnection = Connection;
export type SolanaWalletSendOptions = SendOptions & { signers?: Signer[] };
export type SolanaWalletSender = (
  transaction: Transaction | VersionedTransaction,
  connection: SolanaBrowserConnection,
  options?: SolanaWalletSendOptions,
) => Promise<string>;

export function createSolanaBrowserConnection(endpoint: string, commitment: Commitment): SolanaBrowserConnection {
  return new Connection(endpoint, commitment);
}

export function readAccountInfo(connection: SolanaBrowserConnection, address: PublicKey, commitment: Commitment) {
  return connection.getAccountInfo(address, commitment);
}

export function readBalance(connection: SolanaBrowserConnection, address: PublicKey, commitment: Commitment) {
  return connection.getBalance(address, commitment);
}

export function readParsedTokenAccountsByOwner(
  connection: SolanaBrowserConnection,
  owner: PublicKey,
  filter: TokenAccountsFilter,
  commitment: Commitment,
) {
  return connection.getParsedTokenAccountsByOwner(owner, filter, commitment);
}

export function readSignaturesForAddress(
  connection: SolanaBrowserConnection,
  address: PublicKey,
  options: Parameters<Connection["getSignaturesForAddress"]>[1],
  commitment: Finality,
) {
  return connection.getSignaturesForAddress(address, options, commitment);
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

export function confirmBrowserTransaction(
  connection: SolanaBrowserConnection,
  strategy: TransactionConfirmationStrategy,
  commitment: Commitment,
): ReturnType<Connection["confirmTransaction"]>;
export function confirmBrowserTransaction(
  connection: SolanaBrowserConnection,
  strategy: string,
  commitment: Commitment,
): ReturnType<Connection["confirmTransaction"]>;
export function confirmBrowserTransaction(
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
    await confirmBrowserTransaction(connection, strategy, commitment);
  } else {
    await confirmBrowserTransaction(connection, strategy, commitment);
  }
  return signature;
}

export function sendBrowserTransaction(
  connection: SolanaBrowserConnection,
  transaction: Transaction | VersionedTransaction,
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
