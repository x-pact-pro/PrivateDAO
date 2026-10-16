#!/usr/bin/env node
import { createHash, randomBytes } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
const requireWeb = createRequire(new URL("../apps/web/package.json", import.meta.url));
const { Keypair, Connection, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } = requireWeb("@solana/web3.js");
const nacl = requireWeb("tweetnacl");
const { createSyncNativeInstruction } = requireWeb("@solana/spl-token");
const { createSignerFromPrivateKeyBytes, getUmbraClient } = requireWeb("@umbra-privacy/sdk");
const depositOps = requireWeb("@umbra-privacy/sdk/deposit");
const registration = requireWeb("@umbra-privacy/sdk/registration");
const { Poseidon } = requireWeb("@iden3/js-crypto");
const { groth16 } = requireWeb("snarkjs");

const API = (process.env.PDAO_PAYROLL_API_BASE_URL || "https://api.privatedao.org/api/v1").replace(/\/+$/, "");
const RPC = process.env.SOLANA_DEVNET_RPC_URL || "https://api.devnet.solana.com";
const WS = process.env.SOLANA_DEVNET_WS_URL || RPC.replace(/^http/, "ws");
const KEYPAIR_PATH = process.env.PDAO_DEVNET_KEYPAIR_PATH || "/home/x-pact/.config/solana/id.json";
const EXPECTED_WALLET = "4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD";
const RECIPIENTS = [
  "B3STL1akxLGLvPpKd6Grz19jjVySkWrGgHFwGNK8yEZ",
  "4pbnWy5XqdajtjeF6wFonPYj2WAJcU1zVYrDCcJN2HHv",
  "FjTWJeYtmZALuyq96y8L9Pzqgkfkb7XWbszkpamkYW8q",
];
// Keep the live test deliberately small: this is real Devnet WSOL, not a simulated receipt.
const grossCents = 5;
const taxCents = 1;
const deductionsCents = 0;
const netCents = 4;
const NET_BASE_UNITS = BigInt(process.env.PDAO_PAYROLL_E2E_NET_BASE_UNITS || "100000");
const MIN_BALANCE_LAMPORTS = BigInt(process.env.PDAO_PAYROLL_E2E_MIN_BALANCE_LAMPORTS || "50000000");
if (NET_BASE_UNITS <= 0n) {
  throw new Error("Devnet E2E amount configuration must be positive and safe.");
}
const runId = `devnet-e2e-${Date.now()}-${randomBytes(4).toString("hex")}`;

function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function json(value) { return JSON.stringify(value); }
function base64(bytes) { return Buffer.from(bytes).toString("base64"); }
async function api(path, init = {}) {
  const response = await fetch(`${API}${path}`, { ...init, headers: { "Content-Type": "application/json", ...(init.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${path} HTTP ${response.status}: ${json(body)}`);
  return body;
}
async function finalized(connection, signature) {
  const started = Date.now();
  while (Date.now() - started < 180000) {
    const status = (await connection.getSignatureStatuses([signature], { searchTransactionHistory: true })).value[0];
    if (status?.err) throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
    if (status?.confirmationStatus === "finalized") return status;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error(`Transaction did not finalize: ${signature}`);
}
async function verifyFinalized(connection, signatures) {
  const statuses = (await connection.getSignatureStatuses(signatures, { searchTransactionHistory: true })).value;
  const rows = statuses.map((status, index) => ({ signature: signatures[index], confirmationStatus: status?.confirmationStatus || null, err: status?.err || null, slot: status?.slot || null }));
  if (rows.some((row) => row.confirmationStatus !== "finalized" || row.err)) throw new Error(`On-chain verification failed: ${json(rows)}`);
  return { allFinalized: true, rows };
}

async function ensureWrappedSol(connection, keypair, requiredLamports) {
  const mint = new PublicKey("So11111111111111111111111111111111111111112");
  const accounts = await connection.getParsedTokenAccountsByOwner(keypair.publicKey, { mint }, "finalized");
  const account = accounts.value[0];
  if (!account) throw new Error("The Devnet wallet has no WSOL token account; create one before running payroll E2E.");
  const currentLamports = BigInt(account.account.data.parsed.info.tokenAmount.amount);
  if (currentLamports >= requiredLamports) return { ata: account.pubkey.toBase58(), signature: null, wrappedLamports: currentLamports.toString() };
  const topUpLamports = requiredLamports - currentLamports;
  const transaction = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: keypair.publicKey, toPubkey: account.pubkey, lamports: Number(topUpLamports) }),
    createSyncNativeInstruction(account.pubkey),
  );
  const signature = await sendAndConfirmTransaction(connection, transaction, [keypair], { commitment: "finalized" });
  return { ata: account.pubkey.toBase58(), signature, wrappedLamports: requiredLamports.toString() };
}

function createDevnetCallbackMonitor(connection) {
  return {
    async prepareMonitor(computationAddress, options = {}) {
      const address = new PublicKey(String(computationAddress));
      const seen = new Set(
        (await connection.getSignaturesForAddress(address, { limit: 20 }, "confirmed"))
          .map((entry) => entry.signature),
      );
      const startedAt = Date.now();
      let stopped = false;

      return {
        async awaitComputation() {
          while (!stopped && Date.now() - startedAt < 180000) {
            if (options.signal?.aborted) {
              return { status: "timed-out", elapsedMs: Date.now() - startedAt };
            }
            const signatures = await connection.getSignaturesForAddress(address, { limit: 20 }, "confirmed");
            for (const entry of signatures) {
              if (seen.has(entry.signature) || entry.err !== null) continue;
              const transaction = await connection.getTransaction(entry.signature, {
                commitment: "confirmed",
                maxSupportedTransactionVersion: 0,
              });
              const logs = transaction?.meta?.logMessages || [];
              if (logs.some((line) => line.includes("Instruction: CallbackComputation"))) {
                return {
                  status: "finalized",
                  elapsedMs: Date.now() - startedAt,
                  queuedSlot: 0n,
                  callbackSignature: entry.signature,
                };
              }
              seen.add(entry.signature);
            }
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
          return { status: "timed-out", elapsedMs: Date.now() - startedAt };
        },
        cleanup() {
          stopped = true;
        },
      };
    },
  };
}
async function prove(manifestCommitment, settlementRoot, policyHash) {
  const root = new URL("..", import.meta.url).pathname;
  const [wasm, zkey, vkeyBytes] = await Promise.all([
    readFile(`${root}/apps/web/public/zk/private_dao_blind_payroll.wasm`),
    readFile(`${root}/apps/web/public/zk/private_dao_blind_payroll_final.zkey`),
    readFile(`${root}/apps/web/public/zk/private_dao_blind_payroll_vkey.json`),
  ]);
  const field = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
  const fieldFrom = (value) => (BigInt(`0x${value.slice(0, 62)}`) % field).toString();
  const hash = (...values) => Poseidon.hash(values.map((value) => BigInt(value))).toString();
  const payrollKey = fieldFrom(manifestCommitment);
  const batchKey = fieldFrom(settlementRoot);
  const salt = fieldFrom(policyHash);
  const publicSignals = [hash(payrollKey, "1", salt), hash(batchKey, "0", payrollKey), "0", "1"];
  const input = { payrollCommitment: publicSignals[0], batchCommitment: publicSignals[1], maxVariance: "0", approvedClaim: "1", payrollKey, batchKey, variance: "0", approved: "1", salt };
  const { proof } = await groth16.fullProve(input, wasm, zkey);
  const verified = await groth16.verify(JSON.parse(vkeyBytes.toString("utf8")), publicSignals, proof);
  if (!verified) throw new Error("Groth16 local verification failed.");
  return { proof, publicSignals, proofType: "groth16-private-dao-blind-payroll-v1", verificationKeyHash: sha256(vkeyBytes) };
}

async function main() {
  const keyData = JSON.parse(await readFile(KEYPAIR_PATH, "utf8"));
  const keypair = Keypair.fromSecretKey(Uint8Array.from(keyData));
  const wallet = keypair.publicKey.toBase58();
  if (wallet !== EXPECTED_WALLET) throw new Error(`Signer mismatch: configured keypair resolves to ${wallet}, expected ${EXPECTED_WALLET}.`);
  const connection = new Connection(RPC, "finalized");
  const balance = await connection.getBalance(keypair.publicKey, "finalized");
  if (balance < MIN_BALANCE_LAMPORTS) throw new Error(`Insufficient Devnet SOL for controlled E2E: ${balance} lamports.`);

  const challenge = await api("/payroll/session", { method: "POST", body: json({ action: "challenge", wallet }) });
  const challengeSignature = nacl.sign.detached(Buffer.from(challenge.challenge.message), keypair.secretKey);
  const auth = await api("/payroll/session", { method: "POST", body: json({ action: "verify", wallet, nonce: challenge.challenge.nonce, message: challenge.challenge.message, signature: base64(challengeSignature) }) });
  const bearer = { Authorization: `Bearer ${auth.session.token}` };

  const itemValues = RECIPIENTS.map((recipientAddress, index) => ({ employeeId: `${runId}-employee-${index + 1}`, recipientAddress, employeeRefCiphertext: `${runId}-${index + 1}`, payoutId: `${runId}-payout-${index + 1}`, grossCents, taxCents, deductionsCents, netCents, recipientCommitment: sha256(recipientAddress) }));
  const batchCommitment = sha256(json(itemValues.map(({ recipientAddress: _a, employeeRefCiphertext: _b, ...item }) => item)));
  const recipientRoot = sha256(itemValues.map((item) => item.recipientCommitment).sort().join("|"));
  const manifestCommitment = sha256(json({ version: "devnet-e2e-v1", batchCommitment, recipientRoot, encrypted: true }));
  const intent = await api("/payroll/umbra", { method: "POST", body: json({ action: "prepare", asset: "WSOL", recipientCount: 3, totalAmount: (Number(NET_BASE_UNITS * 3n) / 1e9).toFixed(9), manifestCommitment, recipientHash: sha256(RECIPIENTS.slice().sort().join("|")), privacyTier: "selective-disclosure", requiresAudit: true, unlinkabilityRequired: false, encryption: { algorithm: "AES-256-GCM", keyDerivation: "PBKDF2-SHA256-120000", ciphertextHash: sha256("encrypted-devnet-e2e") } }) });
  const bootstrap = await api("/payroll", { method: "POST", headers: bearer, body: json({ action: "bootstrap-devnet", manifestCommitment, batchCommitment, recipientRoot, grossCents: grossCents * 3, taxCents: taxCents * 3, deductionsCents: deductionsCents * 3, netCents: netCents * 3, idempotencyKey: `script-${runId}-${sha256(wallet + manifestCommitment).slice(0, 24)}`, items: itemValues, rows: itemValues, payrollItems: itemValues }) });
  const batchId = bootstrap.batch.batch.batch_id;
  const signer = await createSignerFromPrivateKeyBytes(keypair.secretKey);
  const client = await getUmbraClient(
    { signer, network: "devnet", rpcUrl: RPC, rpcSubscriptionsUrl: WS, deferMasterSeedSignature: true },
    { computationMonitor: createDevnetCallbackMonitor(connection) },
  );
  const wrap = await ensureWrappedSol(connection, keypair, NET_BASE_UNITS * BigInt(RECIPIENTS.length));
  const register = registration.getUserRegistrationFunction({ client });
  try { await register({ confidential: true, anonymous: false }); } catch (error) { if (!/already|exist|registered/i.test(String(error?.message || error))) throw error; }
  const deposit = depositOps.getATAIntoETADirectDepositorFunction({ client });
  const settlements = [];
  const existingBatch = await api("/payroll", { method: "POST", headers: bearer, body: json({ action: "get", batchId }) });
  for (const [index, item] of existingBatch.items.entries()) {
    if (["CONFIRMED", "CLAIMABLE", "CLAIMED"].includes(item.settlement_state) && item.tx_signature) {
      settlements.push({ payoutId: item.payout_id, recipient: RECIPIENTS[index], signature: item.tx_signature, state: item.settlement_state, reused: true });
      continue;
    }
    const binding = sha256(json({ version: "payroll-umbra-binding-v1", batchId, itemId: item.item_id, payoutId: item.payout_id, recipientCommitment: itemValues[index].recipientCommitment, netCents: itemValues[index].netCents }));
    const optionalData = Uint8Array.from(Buffer.from(binding, "hex"));
    const result = await deposit(RECIPIENTS[index], "So11111111111111111111111111111111111111112", NET_BASE_UNITS, { optionalData });
    const signature = String(result.queueSignature || result.signatures?.[0] || "");
    if (!signature) throw new Error(`Umbra returned no signature for payout ${index + 1}.`);
    console.error(JSON.stringify({ stage: "settlement-submitted", index: index + 1, signature }));
    await finalized(connection, signature);
    const settlement = await api("/payroll", { method: "POST", headers: bearer, body: json({ action: "settlement", batchId, itemId: item.item_id, idempotencyKey: `script-${item.item_id}`, state: "CONFIRMED", txSignature: signature, optionalDataHex: binding }) });
    settlements.push({ payoutId: item.payout_id, recipient: RECIPIENTS[index], signature, state: settlement.settlement.state });
  }
  const reconciliation = await api("/payroll", { method: "POST", headers: bearer, body: json({ action: "reconcile", batchId }) });
  if (reconciliation.reconciliation.confirmedCount !== 3 || reconciliation.reconciliation.failedCount !== 0 || !reconciliation.reconciliation.allConfirmed) throw new Error(`Reconciliation failed: ${json(reconciliation.reconciliation)}`);
  const chainVerification = await verifyFinalized(connection, settlements.map((settlement) => settlement.signature));
  const batch = await api("/payroll", { method: "POST", headers: bearer, body: json({ action: "get", batchId }) });
  const settlementItems = batch.items.slice().sort((a, b) => String(a.payout_id).localeCompare(String(b.payout_id))).map((item) => ({ payoutId: item.payout_id, netCents: item.net_cents, recipientCommitment: item.recipient_commitment, txSignature: item.tx_signature }));
  const settlementRoot = sha256(json(settlementItems));
  const proof = await prove(String(batch.batch.manifest_commitment), settlementRoot, String(batch.batch.policy_hash));
  const verification = await api("/payroll", { method: "POST", headers: bearer, body: json({ action: "create-verification", batchId, scope: "public", expiresAt: new Date(Date.now() + 86400000).toISOString(), proof: proof.proof, publicSignals: proof.publicSignals }) });
  const token = verification.verification.verificationUrl.split("token=")[1];
  const publicVerification = await api(`/payroll/verify/${decodeURIComponent(token)}`);
  const evidence = { generatedAt: new Date().toISOString(), runId, network: "solana-devnet", wallet, balanceLamports: balance, wrap, batchId, intentId: intent.intent?.intentId, settlements, reconciliation: reconciliation.reconciliation, chainVerification, proof: { proofType: proof.proofType, verificationKeyHash: proof.verificationKeyHash, publicSignals: proof.publicSignals }, verification: verification.verification, publicVerification: publicVerification.verification, explorerUrls: [...(wrap.signature ? [`https://explorer.solana.com/tx/${wrap.signature}?cluster=devnet`] : []), ...settlements.map((row) => `https://explorer.solana.com/tx/${row.signature}?cluster=devnet`)] };
  await mkdir(new URL("../docs/generated/", import.meta.url), { recursive: true });
  await writeFile(new URL("../docs/generated/payroll-devnet-e2e.generated.json", import.meta.url), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, network: evidence.network, runId, wallet, batchId, settlements, reconciliation: evidence.reconciliation, chainVerification, verificationUrl: verification.verification.verificationUrl, publicVerification: evidence.publicVerification.status, evidencePath: "docs/generated/payroll-devnet-e2e.generated.json" }, null, 2));
}

function describeError(error) {
  if (!(error instanceof Error)) return { message: String(error) };
  const errorRecord = error;
  const causeRecord = error.cause instanceof Error ? error.cause : undefined;
  const cause = error.cause instanceof Error
    ? { name: error.cause.name, message: error.cause.message }
    : error.cause === undefined
      ? undefined
      : { message: String(error.cause) };
  return {
    name: error.name,
    message: error.message,
    code: typeof error.code === "string" ? error.code : undefined,
    stage: typeof error.stage === "string" ? error.stage : undefined,
    simulationErr: errorRecord.simulationErr ?? causeRecord?.simulationErr,
    simulationLogs: Array.isArray(errorRecord.simulationLogs)
      ? errorRecord.simulationLogs.slice(0, 120)
      : Array.isArray(causeRecord?.simulationLogs)
        ? causeRecord.simulationLogs.slice(0, 120)
        : undefined,
    cause,
  };
}

main().catch((error) => { console.error(JSON.stringify({ ok: false, error: describeError(error) })); process.exit(1); });
