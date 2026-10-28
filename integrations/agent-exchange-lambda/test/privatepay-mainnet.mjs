import test from "node:test";
import assert from "node:assert/strict";
import { createPrivatePayAttestationBinding, derivePrivatePayQueuePda, findPrivatePaySettlement, getPrivatePaySignatureStatus, privatePayClientRefId, SPL_PP_PROGRAM_ID, verifyPrivatePayAttestationReportData } from "../src/privatepay-mainnet.mjs";

const mint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const validator = "MAS1Dtq9reoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57";
const requestId = "pp_0123456789abcdef0123456789abcdef";

function rpcFixture({ logs = [], queuePda: customQueuePda = "" } = {}) {
  const queue = derivePrivatePayQueuePda(mint, validator);
  return async (_url, options) => {
    const body = JSON.parse(options.body);
    const results = {
      getIdentity: { identity: validator },
      getAccountInfo: { value: { owner: SPL_PP_PROGRAM_ID } },
      getSignaturesForAddress: [{ signature: "5Qb6mC9Yf2K3q5jG8v9m2s4a6d8f1h3j5k7p9r2t4w6y8u", slot: 42, err: null }],
      getTransaction: { meta: { logMessages: logs, preTokenBalances: [], postTokenBalances: [] } },
    };
    if (body.method === "getAccountInfo" && body.params[0] !== (customQueuePda || queue)) throw new Error("unexpected queue PDA");
    if (!(body.method in results)) throw new Error(`unexpected RPC method ${body.method}`);
    return { ok: true, async json() { return { result: results[body.method] }; } };
  };
}

test("derives the Mainnet queue and deterministic client reference", () => {
  assert.equal(derivePrivatePayQueuePda(mint, validator), derivePrivatePayQueuePda(mint, validator));
  assert.match(privatePayClientRefId(requestId), /^\d+$/);
});

test("does not accept a queue transaction without the settlement instruction", async () => {
  const result = await findPrivatePaySettlement({ mint, validator, requestId, amountBaseUnits: "1000000", fetchImpl: rpcFixture({ logs: ["Program log: unrelated"] }) });
  assert.equal(result.status, "not_found");
  assert.equal(result.readOnly, true);
});

test("accepts a matching finalized ExecuteReadyQueuedTransfer", async () => {
  const ref = privatePayClientRefId(requestId);
  const result = await findPrivatePaySettlement({ mint, validator, requestId, amountBaseUnits: "1000000", fetchImpl: rpcFixture({ logs: [`Program log: ${"Instruction: ExecuteReadyQueuedTransfer"}`, `Program log: client_ref_id: ${ref}`, "Program log: amount: 1000000"] }) });
  assert.equal(result.status, "settlement_found");
  assert.equal(result.settlement.clientRefMatches, true);
  assert.equal(result.settlement.amountMatches, true);
});

test("rejects a settlement with a mismatched amount", async () => {
  const ref = privatePayClientRefId(requestId);
  const result = await findPrivatePaySettlement({ mint, validator, requestId, amountBaseUnits: "2000000", fetchImpl: rpcFixture({ logs: [`Instruction: ExecuteReadyQueuedTransfer`, `client_ref_id: ${ref}`, "amount: 1000000"] }) });
  assert.equal(result.status, "not_found");
});

test("uses a provider-supplied queue PDA when the provider contract differs from local derivation", async () => {
  const providerQueue = "xkHohgjxvBtvr9x6NJwXNNGJYYiDdLJbCTaNvxCRm2S";
  const ref = privatePayClientRefId(requestId);
  const result = await findPrivatePaySettlement({
    mint,
    validator,
    queuePda: providerQueue,
    requestId,
    amountBaseUnits: "1000000",
    fetchImpl: rpcFixture({
      queuePda: providerQueue,
      logs: [`Instruction: ExecuteReadyQueuedTransfer`, `client_ref_id: ${ref}`, "amount: 1000000"],
    }),
  });
  assert.equal(result.queuePda, providerQueue);
  assert.equal(result.status, "settlement_found");
});

test("accepts a finalized direct TEE signature status", async () => {
  const signature = "3NkW9R5uaCm7awswcG4SZVXmUP2xvoqUZLr9PYmz3EoTGJrcTj1douGxxXi9hAVNNySk63gousujgDsoxqBJk6Hp";
  const result = await getPrivatePaySignatureStatus({
    rpcUrl: "https://mainnet-tee.magicblock.app",
    transactionSignature: signature,
    fetchImpl: async (_url, options) => {
      const body = JSON.parse(options.body);
      assert.equal(body.method, "getSignatureStatuses");
      return { ok: true, async json() { return { result: { value: [{ slot: 42, confirmationStatus: "finalized", err: null }] } }; } };
    },
  });
  assert.equal(result.finalized, true);
  assert.equal(result.slot, 42);
});

test("does not accept an errored or non-finalized direct signature", async () => {
  const signature = "3NkW9R5uaCm7awswcG4SZVXmUP2xvoqUZLr9PYmz3EoTGJrcTj1douGxxXi9hAVNNySk63gousujgDsoxqBJk6Hp";
  const result = await getPrivatePaySignatureStatus({
    transactionSignature: signature,
    fetchImpl: async () => ({ ok: true, async json() { return { result: { value: [{ slot: 42, confirmationStatus: "confirmed", err: { InstructionError: [0, "Custom"] } }] } }; } }),
  });
  assert.equal(result.finalized, false);
});

test("PrivatePAY attestation binding is deterministic and report-data verifiable", () => {
  const input = {
    paymentId: "payment-1",
    settlementSignature: "settlement-1",
    network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    mint,
    amountBaseUnits: "500000",
    finalizedSlot: "403506746",
    nonce: "nonce-1",
  };
  const first = createPrivatePayAttestationBinding(input);
  const second = createPrivatePayAttestationBinding({ ...input });
  assert.deepEqual(first, second);
  const reportDataHex = `${first.bindingSha256}${first.nonceDigest}`;
  assert.deepEqual(verifyPrivatePayAttestationReportData({ reportDataHex, ...first }), {
    verified: true,
    code: "REPORTDATA_MATCH",
  });
  assert.deepEqual(verifyPrivatePayAttestationReportData({ reportDataHex: `${"0".repeat(64)}${first.nonceDigest}`, ...first }), {
    verified: false,
    code: "REPORTDATA_MISMATCH",
  });
});

test("PrivatePAY attestation binding changes when freshness nonce changes", () => {
  const base = {
    paymentId: "payment-1",
    settlementSignature: "settlement-1",
    network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    mint,
    amountBaseUnits: "500000",
    finalizedSlot: "403506746",
  };
  const one = createPrivatePayAttestationBinding({ ...base, nonce: "nonce-1" });
  const two = createPrivatePayAttestationBinding({ ...base, nonce: "nonce-2" });
  assert.notEqual(one.bindingSha256, two.bindingSha256);
  assert.notEqual(one.nonceDigest, two.nonceDigest);
});
