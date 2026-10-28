#!/usr/bin/env node

import { execFile } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { promisify } from "node:util";
import { dirname, resolve } from "node:path";
import { getPrivatePaySignatureStatus } from "../src/privatepay-mainnet.mjs";

const run = promisify(execFile);
const publicStatusUrl = process.env.PRIVATEPAY_PUBLIC_STATUS_URL || "https://agents.privatedao.org/api/privatepay/status";
const artifactPath = resolve(process.env.PRIVATEPAY_DEPOSIT_OUTPUT || "output/privatepay/merchant-deposit-unsigned.json");
const outputPath = resolve(process.env.PRIVATEPAY_EVIDENCE_OUTPUT || "../../../../evidence/privatepay/PrivatePAY-live-release-audit-latest.json");

const checkedAt = new Date().toISOString();
let delegation;
try {
  const { stdout } = await run(process.execPath, ["scripts/privatepay-delegation-audit.mjs"], { maxBuffer: 1024 * 1024 });
  delegation = JSON.parse(stdout);
} catch (error) {
  if (!error?.stdout) throw error;
  delegation = JSON.parse(error.stdout);
}

let publicStatus;
try {
  const response = await fetch(publicStatusUrl, { headers: { accept: "application/json" } });
  const body = await response.json().catch(() => ({}));
  publicStatus = { httpStatus: response.status, ...body };
} catch (error) {
  publicStatus = { httpStatus: null, error: error instanceof Error ? error.message : String(error) };
}

let x402Status;
try {
  const { stdout } = await run(process.execPath, ["scripts/privatepay-x402-status.mjs"], { maxBuffer: 1024 * 1024 });
  x402Status = JSON.parse(stdout);
} catch (error) {
  x402Status = { status: null, paymentId: null, error: error instanceof Error ? error.message : String(error) };
}

let freshDepositSimulation;
try {
  const depositResponse = await fetch(`${process.env.PRIVATEPAY_API_BASE || "https://payments.magicblock.app"}/v1/spl/deposit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      owner: "2BJ4ezxqV9YJXc38D9duKBkdn4su4jE1beKUHwH663sL",
      mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      amount: 1,
      cluster: "mainnet-private",
      initIfMissing: true,
      initVaultIfMissing: false,
      initAtasIfMissing: true,
      idempotent: true,
      private: true,
    }),
  });
  const deposit = await depositResponse.json();
  if (!depositResponse.ok || typeof deposit.transactionBase64 !== "string") throw new Error(`deposit builder returned HTTP ${depositResponse.status}`);
  const rpcResponse = await fetch("https://api.mainnet-beta.solana.com", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "simulateTransaction",
      params: [deposit.transactionBase64, { encoding: "base64", sigVerify: false, replaceRecentBlockhash: false, commitment: "confirmed" }],
    }),
  });
  const rpc = await rpcResponse.json();
  const value = rpc.result?.value;
  freshDepositSimulation = {
    builderHttpStatus: depositResponse.status,
    recentBlockhash: deposit.recentBlockhash ?? null,
    lastValidBlockHeight: deposit.lastValidBlockHeight ?? null,
    simulationErr: value?.err ?? rpc.error ?? null,
    unitsConsumed: value?.unitsConsumed ?? null,
    logCount: Array.isArray(value?.logs) ? value.logs.length : null,
    successful: value?.err === null,
  };
} catch (error) {
  freshDepositSimulation = { successful: false, error: error instanceof Error ? error.message : String(error) };
}

let independentTeeRpc = null;
const settlementSignature = x402Status?.payment?.signature || x402Status?.payment?.settlementSignature || "";
if (settlementSignature) {
  try {
    independentTeeRpc = await getPrivatePaySignatureStatus({ transactionSignature: settlementSignature });
  } catch (error) {
    independentTeeRpc = { readOnly: true, finalized: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function probeSettlementVisibility(signature) {
  if (!signature) return null;
  const endpoints = [
    { name: "tee", url: "https://mainnet-tee.magicblock.app" },
    { name: "public", url: "https://api.mainnet-beta.solana.com" },
  ];
  const results = [];
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getTransaction",
          params: [signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "finalized" }],
        }),
        signal: AbortSignal.timeout(8000),
      });
      const body = await response.json().catch(() => ({}));
      const transaction = body.result || null;
      const message = transaction?.transaction?.message || null;
      const meta = transaction?.meta || null;
      results.push({
        endpoint: endpoint.name,
        rpcUrl: endpoint.url,
        httpStatus: response.status,
        found: Boolean(transaction),
        slot: transaction?.slot ?? null,
        accountKeyCount: Array.isArray(message?.accountKeys) ? message.accountKeys.length : 0,
        instructionCount: Array.isArray(message?.instructions) ? message.instructions.length : 0,
        logCount: Array.isArray(meta?.logMessages) ? meta.logMessages.length : 0,
        tokenBalanceCount: (Array.isArray(meta?.preTokenBalances) ? meta.preTokenBalances.length : 0) + (Array.isArray(meta?.postTokenBalances) ? meta.postTokenBalances.length : 0),
        detailRedacted: Boolean(transaction) && !message?.accountKeys?.length && !message?.instructions?.length && !meta?.logMessages?.length,
        error: body.error?.message || null,
      });
    } catch (error) {
      results.push({ endpoint: endpoint.name, rpcUrl: endpoint.url, httpStatus: null, found: false, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return { transactionSignature: signature, results };
}

const settlementVisibility = await probeSettlementVisibility(settlementSignature);

const artifact = JSON.parse(await readFile(artifactPath, "utf8"));
const evidence = {
  checkedAt,
  merchantReady: delegation.merchantReady ?? null,
  publicStatus: {
    httpStatus: publicStatus.httpStatus,
    status: publicStatus.status ?? null,
    enabled: publicStatus.enabled ?? null,
    operational: publicStatus.operational ?? null,
    mainnet_verified: publicStatus.mainnet_verified ?? null,
    privacy_audit_verified: publicStatus.privacy_audit_verified ?? null,
    payment_bound_quote_required: publicStatus.payment_bound_quote_required ?? null,
    merchant_accounts_delegated: publicStatus.merchant_accounts_delegated ?? null,
    privacy_checks: publicStatus.privacy_checks ?? null,
    activation_blockers: publicStatus.activation_blockers ?? publicStatus.blockers ?? null,
    commercial_fee_model: publicStatus.commercial_fee_model ?? null,
    facilitator_status: publicStatus.facilitator_status ?? null,
    error: publicStatus.error ?? null,
  },
  x402Status,
  independentTeeRpc,
  settlementVisibility,
  delegation,
  freshDepositSimulation,
  unsignedArtifact: {
    generatedAt: artifact.generatedAt ?? null,
    owner: artifact.owner ?? null,
    mint: artifact.mint ?? null,
    cluster: artifact.cluster ?? null,
    amountBaseUnits: artifact.amountBaseUnits ?? null,
    recentBlockhash: artifact.recentBlockhash ?? null,
    lastValidBlockHeight: artifact.lastValidBlockHeight ?? null,
    requiredSigners: artifact.requiredSigners ?? [],
    signed: false,
    broadcast: false,
  },
  perEvidenceModel: {
    authenticate: {
      status: x402Status?.payment?.status === "paid" ? "PASS" : "INCONCLUSIVE",
      evidence: "Provider status is read-only evidence of the recorded x402 payment state; wallet approval is not repeated by this collector.",
    },
    execute: {
      status: independentTeeRpc?.finalized === true ? "PASS" : "INCONCLUSIVE",
      evidence: independentTeeRpc?.finalized === true
        ? "The recorded settlement signature is finalized on the MagicBlock TEE RPC with err=null."
        : "No independently finalized TEE signature status was available for the recorded payment.",
      signature: independentTeeRpc?.transactionSignature ?? null,
      slot: independentTeeRpc?.slot ?? null,
    },
    attest: {
      status: "INCONCLUSIVE",
      evidence: "A finalized TEE signature status does not itself prove payment-bound TDX execution or unlinkability, amount confidentiality, and timing privacy.",
    },
  },
  releaseDecision: delegation.merchantReady === true && publicStatus.enabled === true ? "candidate" : "blocked",
  notes: [
    "Read-only evidence collection; no wallet signing or transaction broadcast was performed.",
    "A successful sigVerify=false simulation proves the fresh transaction is executable by the RPC; it does not prove owner authorization or settlement.",
    "A successful unsigned artifact response does not prove merchant delegation or x402 settlement.",
    "The x402 status is read-only provider evidence; a paid status is not by itself a privacy audit or merchant commission receipt.",
    "TEE signature status is recorded independently when the provider exposes a settlement signature; transaction detail remains provider-private.",
    "Public activation is enabled only while the live privacy gates and explicit production enablement remain true; TDX payment-bound attestation is reported separately and remains inconclusive unless verified.",
  ],
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({ outputPath, checkedAt, releaseDecision: evidence.releaseDecision, merchantReady: delegation.merchantReady, publicStatus: evidence.publicStatus.status }, null, 2));
