import { createHash } from "node:crypto";

export type AuctionProofRecord = {
  ok: true;
  status: "proof-issued";
  publicOutcome: "auction-finalized";
  proofHash: string;
  publicProofPackage: Record<string, unknown>;
  privateDataExcluded: true;
  explanation: string;
};

export type AuctionOutcomeRecord = {
  ok: true;
  proofType: "sha256-commitment-v1";
  publicSignals: readonly string[];
  proof: Record<string, unknown>;
  privateDataExcluded: true;
  binding: string;
};

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
    .join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}

function positiveAmount(value: unknown, label: string): number {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error(`${label} must be positive.`);
  return amount;
}

export function buildKernelAuctionBidProof(payload: unknown): AuctionProofRecord {
  const input = record(payload, "Auction bid payload");
  const config = record(input.config, "Auction config");
  const auctionId = String(config.auctionId ?? "").trim();
  if (!auctionId) throw new Error("auctionId is required.");
  if (!Array.isArray(input.privateBids) || input.privateBids.length === 0) throw new Error("privateBids are required.");

  const bids = input.privateBids.map((raw, index) => {
    const bid = record(raw, `privateBids[${index}]`);
    const bidderRef = String(bid.bidderRef ?? bid.bidderId ?? "").trim();
    if (!bidderRef) throw new Error(`privateBids[${index}].bidderRef is required.`);
    const amountCents = positiveAmount(bid.amountCents ?? bid.amount, `privateBids[${index}].amountCents`);
    return { bidderRef, amountCents };
  });
  const winner = bids.reduce((best, bid) => bid.amountCents > best.amountCents ? bid : best, bids[0]);
  const commitments = bids.map((bid) => ({
    bidderCommitment: sha256({ auctionId, bidderRef: bid.bidderRef }),
    bidCommitment: sha256({ auctionId, bidderRef: bid.bidderRef, amountCents: bid.amountCents }),
  }));
  const publicProofPackage = {
    proofVersion: "sha256-commitment-v1",
    auctionId,
    asset: String(config.asset ?? "USDC"),
    publicOutcome: "auction-finalized",
    winnerCommitment: commitments[bids.indexOf(winner)].bidderCommitment,
    winningAmountCents: winner.amountCents,
    totalSealedBids: bids.length,
    commitments,
    privateDataExcluded: true,
  };
  const proofHash = sha256(publicProofPackage);
  return {
    ok: true,
    status: "proof-issued",
    publicOutcome: "auction-finalized",
    proofHash,
    publicProofPackage: { ...publicProofPackage, proofHash },
    privateDataExcluded: true,
    explanation: "PrivateDAO recomputed a SHA-256 commitment proof. Bidder references and amounts are not included in the public package except for the selected public outcome.",
  };
}

export function buildKernelAuctionOutcomeProof(payload: unknown): AuctionOutcomeRecord {
  const input = record(payload, "Auction outcome payload");
  const metadata = record(input.metadata, "Auction outcome metadata");
  if (!Array.isArray(input.bids) || input.bids.length === 0) throw new Error("bids are required.");
  const publicMetadata = Object.fromEntries(Object.entries(metadata).filter(([key]) => !/private|secret|salt|amount/i.test(key)));
  const digest = sha256({ metadata: publicMetadata, bidCount: input.bids.length });
  return {
    ok: true,
    proofType: "sha256-commitment-v1",
    publicSignals: [digest, String(input.bids.length)],
    proof: { scheme: "sha256-commitment-v1", digest, bidCount: input.bids.length },
    privateDataExcluded: true,
    binding: "Kernel-local commitment over the public auction metadata and sealed-bid count; this is not a Groth16 proof and does not claim token settlement.",
  };
}
