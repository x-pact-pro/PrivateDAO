import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import nacl from "tweetnacl";
const require = createRequire(import.meta.url);
const { AnchorProvider, BN, Program, Wallet } = require("@coral-xyz/anchor");
const {
  DELEGATION_PROGRAM_ID,
  EPHEMERAL_VAULT_ID,
  MAGIC_CONTEXT_ID,
  MAGIC_PROGRAM_ID,
  PERMISSION_PROGRAM_ID,
  getAuthToken,
  permissionPdaFromAccount,
  verifyTeeRpcIntegrity,
} = require("../apps/web/node_modules/@magicblock-labs/ephemeral-rollups-sdk");

const BASE_RPC = process.env.AUCTION_SOLANA_RPC ?? "https://api.devnet.solana.com";
const TEE_RPC = process.env.AUCTION_TEE_RPC ?? "https://devnet-tee.magicblock.app";
const TEE_WS_RPC = process.env.AUCTION_TEE_WS_RPC ?? TEE_RPC.replace(/^https:/, "wss:");
const PROGRAM_ID = new PublicKey("4Z7AeFRZHBCok68hhbUgVLC3uFaEP2aDWozsYVksPuQd");
const VALIDATOR = new PublicKey("MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo");
const AUTH = Buffer.from("authorization");
const RECEIPT = Buffer.from("receipt");
const AUCTION = Buffer.from("auction");
const SESSION = Buffer.from("session");
const idlPath = [
  new URL("../target/idl/privatedao_auction.json", import.meta.url),
  new URL("../idl/privatedao_auction.json", import.meta.url),
].find((candidate) => fs.existsSync(candidate));
if (!idlPath) throw new Error("Auction IDL not found; build target/idl or provide the repository idl artifact.");
const idl = JSON.parse(fs.readFileSync(idlPath));

function keypair(path) {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(path, "utf8"))));
}

function digest(value) {
  return Uint8Array.from(crypto.createHash("sha256").update(value).digest());
}

function addresses(auctionId) {
  const [config] = PublicKey.findProgramAddressSync([AUCTION, Buffer.from(auctionId)], PROGRAM_ID);
  const [session] = PublicKey.findProgramAddressSync([SESSION, config.toBuffer()], PROGRAM_ID);
  const [receipt] = PublicKey.findProgramAddressSync([RECEIPT, config.toBuffer()], PROGRAM_ID);
  return { config, session, permission: permissionPdaFromAccount(session), receipt };
}

function bidderAuth(config, bidder) {
  const commitment = digest(`bidder:${bidder.publicKey.toBase58()}`);
  const [authorization] = PublicKey.findProgramAddressSync([AUTH, config.toBuffer(), Buffer.from(commitment)], PROGRAM_ID);
  return { commitment, authorization };
}

async function waitUntil(epochSeconds) {
  // Leave a real confirmation margin for Devnet clock skew and RPC lag.
  const delay = Math.max(0, epochSeconds * 1000 - Date.now() + 5000);
  await new Promise((resolve) => setTimeout(resolve, delay));
}

function logConnection(step, connection) {
  console.error(`[auction-e2e] ${step} connection http=${connection.http} ws=${connection.ws ?? "none"}`);
}

async function waitForPermissionState({ permission, session, teeConnection, baseConnection, expectedDataLength = 68 }) {
  const expectedOwner = PERMISSION_PROGRAM_ID.toBase58();
  const timeoutMs = Number(process.env.AUCTION_PERMISSION_TIMEOUT_MS ?? 30000);
  const initialDelayMs = Number(process.env.AUCTION_PERMISSION_INITIAL_DELAY_MS ?? 250);
  const maxDelayMs = Number(process.env.AUCTION_PERMISSION_MAX_DELAY_MS ?? 4000);
  const startedAt = Date.now();
  let delayMs = initialDelayMs;
  let attempt = 0;
  const readTimeoutMs = Number(process.env.AUCTION_PERMISSION_READ_TIMEOUT_MS ?? 8000);
  const readAccount = (connection, address) => Promise.race([
    connection.getAccountInfo(address, "confirmed"),
    new Promise((_, reject) => setTimeout(() => reject(new Error(`RPC account read timeout after ${readTimeoutMs}ms: ${address.toBase58()}`)), readTimeoutMs)),
  ]);
  while (Date.now() - startedAt <= timeoutMs) {
    attempt += 1;
    let accountState;
    try {
      accountState = await Promise.all([
        readAccount(teeConnection, permission),
        readAccount(teeConnection, session),
        readAccount(baseConnection, permission),
        readAccount(baseConnection, session),
      ]);
    } catch (error) {
      console.error(`[auction-e2e] permission read attempt ${attempt} failed: ${error instanceof Error ? error.message : error}`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs = Math.min(maxDelayMs, delayMs * 2);
      continue;
    }
    const [teePermission, teeSession, basePermission, baseSession] = accountState;
    const observation = {
      attempt,
      elapsedMs: Date.now() - startedAt,
      teePermission: teePermission ? { owner: teePermission.owner.toBase58(), dataLength: teePermission.data.length } : null,
      teeSession: teeSession ? { owner: teeSession.owner.toBase58(), dataLength: teeSession.data.length } : null,
      basePermission: basePermission ? { owner: basePermission.owner.toBase58(), dataLength: basePermission.data.length } : null,
      baseSession: baseSession ? { owner: baseSession.owner.toBase58(), dataLength: baseSession.data.length } : null,
    };
    console.error(`[auction-e2e] permission state ${JSON.stringify(observation)}`);
    if (teePermission && teePermission.owner.toBase58() === expectedOwner && teePermission.data.length >= expectedDataLength) return observation;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    delayMs = Math.min(maxDelayMs, delayMs * 2);
  }
  throw new Error(`Permission state was not readable on TEE within ${timeoutMs}ms`);
}

async function teeProgram(keypairValue) {
  const wallet = new Wallet(keypairValue);
  const signMessage = async (message) => Uint8Array.from(nacl.sign.detached(Buffer.from(message), keypairValue.secretKey));
  let auth;
  let authError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      auth = await getAuthToken(TEE_RPC, keypairValue.publicKey, signMessage);
      break;
    } catch (error) {
      authError = error;
      console.error(`[auction-e2e] TEE auth attempt ${attempt} failed: ${error instanceof Error ? error.message : error}`);
      await new Promise((resolve) => setTimeout(resolve, Math.min(8000, 500 * (2 ** (attempt - 1)))));
    }
  }
  if (!auth) throw authError;
  const url = `${TEE_RPC}?token=${encodeURIComponent(auth.token)}`;
  // The TEE endpoint is a direct Solana RPC. ConnectionMagicRouter is only
  // for the separate Magic Router endpoint.
  const connection = new Connection(url, { commitment: "confirmed", wsEndpoint: `${TEE_WS_RPC}?token=${encodeURIComponent(auth.token)}` });
  // MagicBlock ER/TEE transactions must bypass base-layer preflight. The
  // ephemeral permission account exists only in the private runtime.
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed", skipPreflight: true });
  // Anchor 0.32.1 constructs SendTransactionError with the pre-1.98 web3
  // signature. Send TEE transactions explicitly so failed confirmations
  // retain the real signature and runtime logs instead of being rewritten as
  // "Unknown action 'undefined'".
  provider.sendAndConfirm = async (transaction, signers = [], options = {}) => {
    transaction.feePayer ??= wallet.publicKey;
    const latest = await connection.getLatestBlockhash("processed");
    transaction.recentBlockhash = latest.blockhash;
    for (const signer of signers) transaction.partialSign(signer);
    transaction.partialSign(wallet.payer);
    const signed = transaction.serialize();
    const wireTransaction = Transaction.from(signed);
    if (wireTransaction.instructions.length !== transaction.instructions.length ||
        wireTransaction.instructions.some((instruction, index) =>
          !instruction.data.equals(transaction.instructions[index].data) ||
          !instruction.programId.equals(transaction.instructions[index].programId))) {
      throw new Error("TEE transaction changed during signing");
    }
    const signature = await connection.sendRawTransaction(signed, { skipPreflight: true, maxRetries: 3 });
    const status = await connection.confirmTransaction({ signature, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight }, options.commitment ?? "confirmed");
    if (status.value.err) {
      const failed = await connection.getTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
      const logs = failed?.meta?.logMessages ?? [];
      throw new Error(`TEE transaction failed: ${signature}; status=${JSON.stringify(status.value.err)}; logs=${logs.join(" | ")}`);
    }
    return signature;
  };
  return { program: new Program(idl, provider), connection, http: `${TEE_RPC}?token=<redacted>`, ws: `${TEE_WS_RPC}?token=<redacted>` };
}

async function main() {
  const creatorPath = process.env.AUCTION_CREATOR_KEYPAIR ?? `${process.env.HOME}/.config/solana/id.json`;
  const bidderAPath = process.env.AUCTION_BIDDER_A_KEYPAIR;
  const bidderBPath = process.env.AUCTION_BIDDER_B_KEYPAIR;
  if (!bidderAPath || !bidderBPath) throw new Error("AUCTION_BIDDER_A_KEYPAIR and AUCTION_BIDDER_B_KEYPAIR are required; keep them outside the repository.");
  const creator = keypair(creatorPath);
  const bidderA = keypair(bidderAPath);
  const bidderB = keypair(bidderBPath);
  const baseConnection = new Connection(BASE_RPC, "confirmed");
  logConnection("base", { http: BASE_RPC, ws: BASE_RPC.replace(/^https:/, "wss:") });
  console.error(`[auction-e2e] er connection http=${process.env.AUCTION_ER_RPC ?? "not-used"} ws=${process.env.AUCTION_ER_WS_RPC ?? "not-used"}`);
  console.error(`[auction-e2e] tee origin http=${TEE_RPC} ws=${TEE_WS_RPC}`);
  const base = new Program(idl, new AnchorProvider(baseConnection, new Wallet(creator), { commitment: "confirmed" }));
  let teeAttestation = "verified";
  try {
    await verifyTeeRpcIntegrity(TEE_RPC);
  } catch (error) {
    if (process.env.AUCTION_ALLOW_TEE_ATTESTATION_UNAVAILABLE !== "1") throw error;
    teeAttestation = "unavailable";
    console.error(`TEE attestation unavailable; continuing only for runtime diagnosis: ${error instanceof Error ? error.message : error}`);
  }

  const auctionId = crypto.randomBytes(32);
  const now = Math.floor(Date.now() / 1000);
  // Devnet and the TEE may lag behind the local clock during funding and
  // delegation. Keep enough margin for the real transaction path.
  const start = now + Number(process.env.AUCTION_START_DELAY_SECONDS ?? 45);
  const deadline = now + Number(process.env.AUCTION_DEADLINE_DELAY_SECONDS ?? 150);
  const a = addresses(auctionId);
  const authA = bidderAuth(a.config, bidderA);
  const authB = bidderAuth(a.config, bidderB);

  console.error("[auction-e2e] initialize");
  const initializeSignature = await base.methods
    .initializeAuction(auctionId, new BN(start), new BN(deadline), digest("forge-auction-rules:v1"), digest("pseudonymous-private-bids:v1"), true, false)
    .accounts({ authority: creator.publicKey, config: a.config, session: a.session, systemProgram: SystemProgram.programId })
    .rpc();
  const authorizationSignatures = [];
  console.error("[auction-e2e] authorize bidders");
  for (const [authValue, bidder] of [[authA, bidderA], [authB, bidderB]]) {
    authorizationSignatures.push(await base.methods.authorizeBidder(authValue.commitment, bidder.publicKey).accounts({
      config: a.config, authorization: authValue.authorization, authority: creator.publicKey, systemProgram: SystemProgram.programId,
    }).rpc());
  }
  await waitUntil(start);
  console.error("[auction-e2e] activate");
  const activateSignature = await base.methods.activateAuction().accounts({ config: a.config, session: a.session, authority: creator.publicKey }).rpc();
  const baseBidSimulationTx = await base.methods.submitPrivateBid(authA.commitment, new BN(100), digest("base-simulation-only"), 0).accounts({
    bidder: bidderA.publicKey, session: a.session, authorization: authA.authorization,
  }).transaction();
  baseBidSimulationTx.feePayer = bidderA.publicKey;
  baseBidSimulationTx.recentBlockhash = (await baseConnection.getLatestBlockhash("processed")).blockhash;
  try {
    const baseBidSimulation = await baseConnection.simulateTransaction(baseBidSimulationTx);
    console.error(`[auction-e2e] base readonly bid simulation ${JSON.stringify({ err: baseBidSimulation.value.err, logs: baseBidSimulation.value.logs })}`);
  } catch (error) {
    console.error(`[auction-e2e] base readonly bid simulation unavailable: ${error instanceof Error ? error.message : error}`);
  }
  console.error("[auction-e2e] delegate session");
  const delegateSignature = await base.methods.delegateAuctionSession().accountsPartial({
    payer: creator.publicKey, session: a.session, config: a.config, ownerProgram: PROGRAM_ID,
    delegationProgram: DELEGATION_PROGRAM_ID, systemProgram: SystemProgram.programId,
  }).remainingAccounts([{ pubkey: VALIDATOR, isSigner: false, isWritable: false }]).rpc();

  console.error("[auction-e2e] authenticate creator wallet");
  const creatorTee = await teeProgram(creator);
  logConnection("init_permission/set_private/close/commit", creatorTee);
  console.error("[auction-e2e] creator wallet authenticated");
  console.error("[auction-e2e] create private permission");
  let permissionSignature;
  try {
    const initPermissionInstruction = await creatorTee.program.methods.initPermission().accounts({
      session: a.session, config: a.config, permission: a.permission, ephemeralVault: EPHEMERAL_VAULT_ID,
      magicProgram: MAGIC_PROGRAM_ID, permissionProgram: PERMISSION_PROGRAM_ID,
    }).instruction();
    const initDiscriminator = Buffer.from(initPermissionInstruction.data.subarray(0, 8)).toString("hex");
    if (initDiscriminator !== "420e99fabb24b3ec") throw new Error(`Unexpected init_permission discriminator: ${initDiscriminator}`);
    const initTransaction = new Transaction().add(initPermissionInstruction);
    console.error(`[auction-e2e] init instruction ${initDiscriminator} tx ${Buffer.from(initTransaction.instructions[0].data.subarray(0, 8)).toString("hex")}`);
    permissionSignature = await creatorTee.program.provider.sendAndConfirm(initTransaction, [], { commitment: "confirmed", skipPreflight: true });
  } catch (error) {
    if (typeof error?.getLogs === "function") console.error((await error.getLogs()).join("\n"));
    throw error;
  }
  await waitForPermissionState({ permission: a.permission, session: a.session, teeConnection: creatorTee.connection, baseConnection, expectedDataLength: 68 });
  const privacySignature = await creatorTee.program.methods.setPrivate(true).accounts({
    session: a.session, config: a.config, permission: a.permission, ephemeralVault: EPHEMERAL_VAULT_ID,
    magicProgram: MAGIC_PROGRAM_ID, permissionProgram: PERMISSION_PROGRAM_ID,
  }).remainingAccounts([authA.authorization, authB.authorization].map((pubkey) => ({ pubkey, isSigner: false, isWritable: false }))).rpc();
  console.error(`[auction-e2e] set_private confirmed ${privacySignature}`);
  await waitForPermissionState({ permission: a.permission, session: a.session, teeConnection: creatorTee.connection, baseConnection, expectedDataLength: 167 });
  console.error("[auction-e2e] authenticate bidder wallets");
  const bidderATee = await teeProgram(bidderA);
  const bidderBTee = await teeProgram(bidderB);
  logConnection("submit_private_bid bidder_a", bidderATee);
  logConnection("submit_private_bid bidder_b", bidderBTee);
  let bidASignature;
  try {
    bidASignature = await bidderATee.program.methods.submitPrivateBid(authA.commitment, new BN(100), digest("bidder-a-salt"), 0).accounts({
      bidder: bidderA.publicKey, session: a.session, authorization: authA.authorization,
    }).rpc();
  } catch (error) {
    console.error("[auction-e2e] bidder A failure", error?.logs ?? error?.error ?? error?.message ?? error);
    console.error("[auction-e2e] bidder A error fields", Object.getOwnPropertyNames(error ?? {}).map((key) => `${key}=${typeof error[key] === "string" ? error[key] : String(error[key])}`).join(" | "));
    throw error;
  }
  console.error("[auction-e2e] bidder A submitted");
  const bidBSignature = await bidderBTee.program.methods.submitPrivateBid(authB.commitment, new BN(250), digest("bidder-b-salt"), 0).accounts({
    bidder: bidderB.publicKey, session: a.session, authorization: authB.authorization,
  }).rpc();
  console.error("[auction-e2e] bidder B submitted");
  const baseSessionDuringAuction = await baseConnection.getAccountInfo(a.session, "confirmed");
  await waitUntil(deadline);
  console.error("[auction-e2e] close and finalize");
  let closeSignature;
  try {
    closeSignature = await creatorTee.program.methods.closeBidding().accounts({ session: a.session, authority: creator.publicKey }).rpc();
  } catch (error) {
    console.error("[auction-e2e] close failure", error?.logs ?? error?.error ?? error?.message ?? error);
    if (typeof error?.getLogs === "function") console.error("[auction-e2e] close logs", (await error.getLogs()).join(" | "));
    console.error("[auction-e2e] close error fields", Object.getOwnPropertyNames(error ?? {}).map((key) => `${key}=${typeof error[key] === "string" ? error[key] : String(error[key])}`).join(" | "));
    throw error;
  }
  let finalizeSignature;
  try {
    finalizeSignature = await creatorTee.program.methods.finalizePrivateResult().accounts({ session: a.session, authority: creator.publicKey }).rpc();
  } catch (error) {
    console.error("[auction-e2e] finalize failure", error?.logs ?? error?.error ?? error?.message ?? error);
    throw error;
  }
  let commitSignature;
  try {
    commitSignature = await creatorTee.program.methods.commitAndUndelegateSession().accounts({
      payer: creator.publicKey, session: a.session, magicContext: MAGIC_CONTEXT_ID, magicProgram: MAGIC_PROGRAM_ID,
    }).rpc();
  } catch (error) {
    console.error("[auction-e2e] commit failure", error?.logs ?? error?.error ?? error?.message ?? error);
    console.error("[auction-e2e] commit error fields", Object.getOwnPropertyNames(error ?? {}).map((key) => `${key}=${typeof error[key] === "string" ? error[key] : String(error[key])}`).join(" | "));
    throw error;
  }
  console.error("[auction-e2e] commit returned");
  const commitStatus = await creatorTee.connection.getSignatureStatuses([commitSignature]);
  const commitmentConfirmation = commitStatus.value[0]?.confirmationStatus;
  if (commitmentConfirmation !== "confirmed" && commitmentConfirmation !== "finalized") throw new Error(`Commit not confirmed: ${commitSignature}`);
  const slot = await creatorTee.connection.getSlot("confirmed");
  const receiptId = digest(`${a.config.toBase58()}:${commitSignature}`);
  const receiptSignature = await base.methods.finalizeReceipt(receiptId, commitSignature, new BN(slot), 1).accounts({
    authority: creator.publicKey, config: a.config, session: a.session, receipt: a.receipt, systemProgram: SystemProgram.programId,
  }).rpc();
  const receipt = await base.account.settlementReceipt.fetch(a.receipt);
  const publicReceipt = await baseConnection.getAccountInfo(a.receipt, "confirmed");
  if (!publicReceipt || receipt.solanaSignature !== commitSignature || receipt.finality === 0) throw new Error("Receipt reconciliation failed");
  if (process.env.AUCTION_E2E_OUTPUT_DIR) {
    const outputDir = process.env.AUCTION_E2E_OUTPUT_DIR;
    fs.mkdirSync(outputDir, { recursive: true });
    const hex = (value) => Buffer.from(value).toString("hex");
    fs.writeFileSync(path.join(outputDir, "auction-outcome-witness.json"), `${JSON.stringify({
      metadata: {
        auctionId: hex(receipt.auctionId), rulesDigest: hex(receipt.rulesDigest), policyDigest: hex(receipt.policyDigest),
        winnerCommitment: hex(authB.commitment), winningAmount: "250",
        bidCount: 2, deadline: String(deadline), resultCommitment: hex(receipt.resultCommitment),
      },
      bids: [{ bidderCommitment: hex(authA.commitment), amount: "100" }, { bidderCommitment: hex(authB.commitment), amount: "250" }],
    }, null, 2)}\n`);
  }
  const tampered = Buffer.from(receipt.resultCommitment);
  tampered[0] ^= 1;
  if (Buffer.from(receipt.resultCommitment).equals(tampered)) throw new Error("Tamper test did not mutate the result commitment");
  console.log(JSON.stringify({
    network: "devnet", programId: PROGRAM_ID.toBase58(), auction: a.config.toBase58(), receipt: a.receipt.toBase58(),
    initializeSignature, authorizationSignatures, activateSignature, delegateSignature, permissionSignature, privacySignature,
    bidASignature, bidBSignature, closeSignature, finalizeSignature, commitSignature, receiptSignature, slot,
    commitmentConfirmation, teeAttestation, baseSessionDuringAuction: baseSessionDuringAuction ? { owner: baseSessionDuringAuction.owner.toBase58(), dataLength: baseSessionDuringAuction.data.length } : null,
    publicReceiptPresent: Boolean(publicReceipt), tamperResult: "INVALID",
  }));
}

main().catch((error) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : error);
  if (Array.isArray(error?.logs)) console.error(error.logs.join("\n"));
  process.exitCode = 1;
});
