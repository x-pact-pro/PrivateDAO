import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

import { createPrivateDaoRuntime } from "../packages/privatedao-runtime/src/index.ts";
import { computeAuctionResultCommitment } from "../apps/web/src/lib/auction-outcome-proof.ts";

const network = "solana-devnet";
const runId = `solana-enterprise-${Date.now()}`;
const runtime = createPrivateDaoRuntime();

function context(product, capability, provider) {
  const requestId = `${runId}-${product}`;
  return {
    requestId,
    idempotencyKey: requestId,
    product,
    capability,
    network,
    provider,
    organizationId: "privatedao-enterprise-e2e",
    actorId: "kernel-e2e-runner",
  };
}

async function execute(intent) {
  const prepared = await runtime.gateway.prepare(intent, "maker");
  const submitted = await runtime.gateway.submit(prepared, prepared.unsignedPayload, "maker");
  const receipt = await runtime.gateway.receipt({ executionId: submitted.executionId, intent: prepared.intent }, "maker");
  assert.equal(receipt.state, "reconciled");
  return receipt;
}

const treasuryReceipt = await execute({
  context: context("treasury", "treasury.policy.check", "privatedao-treasury-policy"),
  payload: {
    amountCents: 2500,
    budgetCents: 10000,
    maxTransactionCents: 5000,
    recipientCount: 2,
    maxRecipientCount: 5,
    requestedAsset: "SOL",
    allowedAsset: "SOL",
  },
  accounts: [],
});
assert.equal(treasuryReceipt.result?.passed, true);

const bidderA = new Uint8Array(32).fill(0x11);
const bidderB = new Uint8Array(32).fill(0x22);
const metadata = {
  auctionId: new Uint8Array(32).fill(0x31),
  rulesDigest: new Uint8Array(32).fill(0x32),
  policyDigest: new Uint8Array(32).fill(0x33),
  winnerCommitment: bidderB,
  winningAmount: 20,
  bidCount: 2,
  deadline: Math.floor(Date.now() / 1000) + 3600,
};
const bids = [
  { bidderCommitment: bidderA, amount: 10 },
  { bidderCommitment: bidderB, amount: 20 },
];
const outcomeMetadata = {
  ...metadata,
  resultCommitment: computeAuctionResultCommitment(metadata),
};
const serializedOutcomeMetadata = Object.fromEntries(
  Object.entries(outcomeMetadata).map(([key, value]) => [key, value instanceof Uint8Array ? Array.from(value) : value]),
);

const bidReceipt = await execute({
  context: context("auction", "auction.bid.commit", "privatedao-auction-bid-commit"),
  payload: {
    config: { auctionId: `${runId}-auction`, network, asset: "SOL" },
    privateBids: [
      { bidderId: "bidder-a", amount: 10, salt: "salt-a" },
      { bidderId: "bidder-b", amount: 20, salt: "salt-b" },
    ],
  },
  accounts: [],
});
assert.equal(bidReceipt.result?.ok, true);
assert.equal(bidReceipt.result?.privateDataExcluded, true);

const outcomeReceipt = await execute({
  context: context("auction", "auction.settle", "privatedao-auction-outcome-proof"),
  payload: {
    metadata: serializedOutcomeMetadata,
    bids: bids.map((bid) => ({ ...bid, bidderCommitment: Array.from(bid.bidderCommitment) })),
  },
  accounts: [],
});
assert.equal(outcomeReceipt.result?.ok, true);
assert.equal(outcomeReceipt.result?.privateDataExcluded, true);

const artifact = {
  schema: "privatedao.solana-devnet.enterprise-policy-auction-e2e.v1",
  generatedAt: new Date().toISOString(),
  network,
  gateway: "ProductExecutionGateway",
  state: "reconciled",
  products: {
    treasury: {
      capability: "treasury.policy.check",
      provider: treasuryReceipt.provider,
      passed: treasuryReceipt.result?.passed === true,
      signatures: treasuryReceipt.signatures.length,
    },
    auction: {
      capabilities: ["auction.bid.commit", "auction.settle"],
      providers: [bidReceipt.provider, outcomeReceipt.provider],
      bidProofHash: bidReceipt.result?.proofHash ?? null,
      outcomeProofType: outcomeReceipt.result?.proofType ?? null,
      privateDataExcluded: outcomeReceipt.result?.privateDataExcluded === true,
      signatures: bidReceipt.signatures.length + outcomeReceipt.signatures.length,
    },
  },
  evidenceClass: "kernel-provider-e2e",
  broadcastAttempted: false,
  inputMaterialHash: createHash("sha256").update(runId).digest("hex"),
};

await mkdir("docs/evidence", { recursive: true });
await writeFile("docs/evidence/solana-devnet-enterprise-policy-auction-e2e.json", `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({ status: "PASS", ...artifact }, null, 2));
