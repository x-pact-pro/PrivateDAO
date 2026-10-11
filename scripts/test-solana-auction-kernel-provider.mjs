import assert from "node:assert/strict";

const { AuctionBidCommitProvider } = await import("../packages/privatedao-runtime/src/auction-bid-provider.ts");
const { AuctionOutcomeProofProvider } = await import("../packages/privatedao-runtime/src/auction-outcome-provider.ts");

const baseContext = (capability, requestId) => ({
  requestId,
  idempotencyKey: requestId,
  product: "auction",
  capability,
  network: "solana-devnet",
});

const bidProvider = new AuctionBidCommitProvider();
const bidIntent = {
  context: baseContext("auction.bid.commit", "solana-auction-kernel-bid"),
  payload: {
    config: { auctionId: "kernel-auction-test", asset: "USDC" },
    privateBids: [{ bidderRef: "bidder-a", amountCents: 100 }, { bidderRef: "bidder-b", amountCents: 150 }],
  },
  accounts: [],
};
const bidPrepared = await bidProvider.prepare(bidIntent);
await bidProvider.submit(bidPrepared, undefined);
const bidReceipt = await bidProvider.receipt(bidPrepared.executionId);
assert.equal(bidReceipt.state, "reconciled");
assert.equal(bidReceipt.result.privateDataExcluded, true);
assert.equal(bidReceipt.result.publicProofPackage.proofVersion, "sha256-commitment-v1");

const outcomeProvider = new AuctionOutcomeProofProvider();
const outcomeIntent = {
  context: baseContext("auction.settle", "solana-auction-kernel-outcome"),
  payload: {
    metadata: { auctionId: "kernel-auction-test", policy: "highest-valid-bid" },
    bids: [{ bidderRef: "bidder-a", amountCents: 100 }],
  },
  accounts: [],
};
const outcomePrepared = await outcomeProvider.prepare(outcomeIntent);
await outcomeProvider.submit(outcomePrepared, undefined);
const outcomeReceipt = await outcomeProvider.receipt(outcomePrepared.executionId);
assert.equal(outcomeReceipt.state, "reconciled");
assert.equal(outcomeReceipt.result.proofType, "sha256-commitment-v1");
assert.equal(outcomeReceipt.result.privateDataExcluded, true);

console.log("SOLANA_AUCTION_KERNEL_PROVIDER: PASS");
