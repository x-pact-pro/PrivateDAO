import http from "node:http";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction, sendAndConfirmTransaction } from "@solana/web3.js";
import { canonicalizeRecord, compileSchema, digestObject, digestPolicy, digestSchema, evaluatePolicy, selectPublicFields } from "../apps/web/src/lib/record-verification.ts";

const host = "127.0.0.1";
const port = Number(process.env.RECORD_TEST_PORT || 18891);
const cluster = String(process.env.RECORD_TEST_CLUSTER || "devnet").trim();
const rpcUrl = String(process.env.SOLANA_DEVNET_RPC_URL || process.env.PDAO_RECORD_ANCHOR_RPC_URL || "https://api.devnet.solana.com").trim();
const signerPath = String(process.env.PDAO_RECORD_ANCHOR_KEYPAIR_PATH || "").trim();
const broadcastEnabled = process.env.PDAO_RECORD_ANCHOR_BROADCAST_ENABLED === "1"
  && process.env.PDAO_RECORD_ANCHOR_E2E_APPROVED === "1";
const memoProgramId = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const receipts = new Map();

if (!host || !["devnet", "testnet"].includes(cluster)) throw new Error("Record anchor service only supports Solana Devnet/Testnet.");
if (!/^https:\/\//i.test(rpcUrl) || (cluster === "devnet" && !rpcUrl.includes("devnet")) || (cluster === "testnet" && !rpcUrl.includes("testnet"))) {
  throw new Error("Record anchor service requires an HTTPS RPC matching the selected Solana cluster.");
}

async function loadSigner() {
  if (!signerPath) throw new Error("PDAO_RECORD_ANCHOR_KEYPAIR_PATH is required for broadcast-enabled operation.");
  const raw = JSON.parse(await readFile(signerPath, "utf8"));
  if (!Array.isArray(raw) || raw.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) throw new Error("Signer keypair file is malformed.");
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

async function body(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (Buffer.concat(chunks).length > 512 * 1024) throw new Error("request_too_large");
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function anchorDigest(digest, signer) {
  if (!broadcastEnabled) throw new Error("record_anchor_broadcast_disabled");
  if (!signer) throw new Error("record_anchor_signer_unavailable");
  const connection = new Connection(rpcUrl, "confirmed");
  const memo = `PDAO-RECORD-V1:${digest}`;
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  const transaction = new Transaction({ feePayer: signer.publicKey, blockhash, lastValidBlockHeight })
    .add(new TransactionInstruction({ keys: [], programId: memoProgramId, data: Buffer.from(memo, "utf8") }));
  const signature = await sendAndConfirmTransaction(connection, transaction, [signer], { commitment: "confirmed" });
  const confirmed = await connection.getTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
  if (!confirmed || confirmed.meta?.err) throw new Error("record_anchor_not_confirmed");
  return { signature, slot: confirmed.slot, publicKey: signer.publicKey.toBase58() };
}

async function createReceipt(input) {
  const record = input.record;
  const schema = input.schema;
  if (!record || !schema || !input.organizationId) throw new Error("record_schema_and_organization_are_required");
  const canonical = await canonicalizeRecord(record);
  const validate = compileSchema(schema);
  if (!validate(canonical.normalized_payload)) throw new Error("record_schema_invalid");
  const schemaDigest = await digestSchema(schema);
  const policy = input.policy;
  const policyEvaluation = evaluatePolicy(policy, canonical.normalized_payload, canonical.canonical_digest);
  if (!policyEvaluation.passed) throw new Error("record_policy_failed");
  const policyDigest = await digestPolicy(policy);
  const evidenceDigest = await digestObject({
    canonicalDigest: canonical.canonical_digest,
    schemaDigest,
    policyDigest: policyDigest || null,
    organizationId: input.organizationId,
  });
  const signer = broadcastEnabled ? await loadSigner() : undefined;
  const anchor = await anchorDigest(evidenceDigest, signer);
  const receipt = {
    receipt_id: `record-${randomUUID()}`,
    record_type: record.record_type,
    record_id: record.record_id,
    issuer: record.issuer,
    canonicalization_version: canonical.canonicalization_version,
    canonical_record_digest: canonical.canonical_digest,
    schema_id: String(input.schemaId || "record-schema"),
    schema_version: record.schema_version,
    schema_digest: schemaDigest,
    verification_status: "VERIFIED",
    evidence_digest: evidenceDigest,
    created_at: new Date().toISOString(),
    anchor_network: "solana",
    anchor_reference: anchor.signature,
    anchor_status: "confirmed",
    anchor_signature: anchor.signature,
    anchor_slot: anchor.slot,
    anchor_program_id: memoProgramId.toBase58(),
    anchor_cluster: cluster,
    anchor_confirmed_at: new Date().toISOString(),
    anchor_payload_digest: evidenceDigest,
    public_fields: selectPublicFields(record.payload, input.public_fields || []),
  };
  receipts.set(receipt.receipt_id, { receipt, record, schema, input });
  return receipt;
}

async function handle(req, res) {
  const url = new URL(req.url || "/", `http://${host}:${port}`);
  try {
    if (req.method === "GET" && url.pathname === "/healthz") return json(res, 200, { ok: true, network: `solana-${cluster}`, broadcastEnabled });
    if (req.method === "POST" && url.pathname === "/v1/records/verify") return json(res, 201, { receipt: await createReceipt(await body(req)) });
    const match = url.pathname.match(/^\/v1\/receipts\/([^/]+)(\/reverify)?$/);
    if (req.method === "GET" && match && !match[2]) {
      const item = receipts.get(decodeURIComponent(match[1]));
      return item ? json(res, 200, { receipt: item.receipt }) : json(res, 404, { error: "receipt_not_found" });
    }
    if (req.method === "POST" && match?.[2]) {
      const item = receipts.get(decodeURIComponent(match[1]));
      if (!item) return json(res, 404, { error: "receipt_not_found" });
      const candidate = await body(req);
      const canonical = await canonicalizeRecord(candidate.record);
      return json(res, 200, { status: canonical.canonical_digest === item.receipt.canonical_record_digest ? "VALID" : "INVALID" });
    }
    return json(res, 404, { error: "not_found" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "request_failed";
    const status = message === "record_anchor_broadcast_disabled" ? 503 : 400;
    return json(res, status, { error: message });
  }
}

http.createServer((req, res) => { void handle(req, res); }).listen(port, host, () => {
  console.log(`record-anchor-service listening on http://${host}:${port} network=solana-${cluster} broadcastEnabled=${broadcastEnabled}`);
});
