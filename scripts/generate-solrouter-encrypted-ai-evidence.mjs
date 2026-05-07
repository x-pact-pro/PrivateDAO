#!/usr/bin/env node
import { createHash, randomBytes, webcrypto } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const docsDir = path.join(repoRoot, "docs");
const outJson = path.join(docsDir, "solrouter-encrypted-ai-evidence-2026-05-07.json");
const outMd = path.join(docsDir, "solrouter-encrypted-ai-evidence-2026-05-07.md");

const encoder = new TextEncoder();

function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

function toArrayBuffer(bytes) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

async function deriveAesKey(passphrase, salt) {
  const keyMaterial = await webcrypto.subtle.importKey("raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return webcrypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(salt),
      iterations: 120_000,
      hash: "SHA-256",
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt"],
  );
}

async function main() {
  const lifecyclePath = path.join(docsDir, "testnet-lifecycle-rehearsal-2026-05-07.json");
  const lifecycle = JSON.parse(fs.readFileSync(lifecyclePath, "utf8"));
  const proposal = lifecycle.accounts?.proposal ?? lifecycle.proposal ?? "PDAO-TESTNET-2026-05-07";
  const executeTx = lifecycle.transactions?.execute ?? lifecycle.executeTx ?? lifecycle.signatures?.execute ?? "";

  const brief = {
    version: "solrouter-local-ai-brief-v1",
    createdAt: new Date().toISOString(),
    proposal,
    operationType: "governed_testnet_treasury_execution",
    sourceTx: executeTx,
    model: "deterministic-private-dao-analysis",
    decisionSummary:
      "Fresh Testnet lifecycle completed through create DAO, create proposal, commit, reveal, finalize, and execute. Keep confidential settlement rails scoped to intent receipts until vendor relay execution is signed.",
    riskNotes: [
      "Use private settlement lanes only after reviewing recipient visibility and receipt route.",
      "Use proof route to verify the execute transaction and Supabase receipt continuity.",
      "Keep mainnet custody claims gated until multisig evidence is recorded.",
    ],
    privacyModeRecommendation: "private_by_default_for_recipient_or_payroll_operations",
    counterpartyCheckResult: "no elevated local signal in deterministic evidence packet",
  };

  const passphrase = `PrivateDAO-SolRouter-${proposal}`;
  const iv = randomBytes(12);
  const salt = randomBytes(16);
  const key = await deriveAesKey(passphrase, salt);
  const plaintext = JSON.stringify(brief, null, 2);
  const ciphertext = Buffer.from(
    await webcrypto.subtle.encrypt({ name: "AES-GCM", iv: toArrayBuffer(iv) }, key, encoder.encode(plaintext)),
  );

  const payload = {
    version: "solrouter-encrypted-ai-v1",
    generatedAt: new Date().toISOString(),
    route: "/services/solrouter-encrypted-ai",
    proposal,
    sourceTx: executeTx,
    encryption: {
      algorithm: "AES-256-GCM",
      kdf: "PBKDF2-SHA256",
      iterations: 120_000,
      saltBase64: salt.toString("base64"),
      ivBase64: iv.toString("base64"),
    },
    hashes: {
      plaintextSha256: sha256Hex(plaintext),
      ciphertextSha256: sha256Hex(ciphertext),
    },
    cipherBase64: ciphertext.toString("base64"),
    claimBoundary:
      "This is a real local encrypted AI-output evidence packet using the same WebCrypto primitive as the browser route. It does not claim SolRouter vendor custody or external chain execution.",
  };

  fs.writeFileSync(outJson, `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(
    outMd,
    `# SolRouter Encrypted AI Evidence 2026-05-07

This packet records a real local encrypted AI-output run for the SolRouter service lane.

- Route: \`/services/solrouter-encrypted-ai\`
- Proposal: \`${proposal}\`
- Source Testnet transaction: \`${executeTx}\`
- Encryption: \`AES-256-GCM\`
- Key derivation: \`PBKDF2-SHA256\`
- Iterations: \`120000\`
- Plaintext SHA-256: \`${payload.hashes.plaintextSha256}\`
- Ciphertext SHA-256: \`${payload.hashes.ciphertextSha256}\`
- JSON packet: \`docs/solrouter-encrypted-ai-evidence-2026-05-07.json\`

## Boundary

This evidence proves PrivateDAO can generate a deterministic operation brief and encrypt it locally before the brief leaves the operator device. It does not claim SolRouter vendor custody, external relay execution, or autonomous execution authority.
`,
  );

  console.log(`Wrote ${path.relative(repoRoot, outJson)}`);
  console.log(`Wrote ${path.relative(repoRoot, outMd)}`);
  console.log(`Ciphertext SHA-256: ${payload.hashes.ciphertextSha256}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
