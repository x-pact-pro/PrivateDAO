// SPDX-License-Identifier: Apache-2.0
import { PublicKey } from "@solana/web3.js";
import { createHash, randomBytes } from "crypto";
import { buildPoseidon } from "circomlibjs";

export type VoteChoice = "yes" | "no";
export type ZkCircuitName =
  | "private_dao_vote_overlay"
  | "private_dao_delegation_overlay"
  | "private_dao_tally_overlay";
export type AnonymousTallyMode =
  | "commitment-only"
  | "threshold-decryption"
  | "zk-result-proof";

export interface AnonymousMembershipSnapshot {
  dao: string;
  proposal: string;
  epoch: bigint;
  merkleRoot: bigint;
  frozenAtSlot: bigint;
  expiresAtSlot: bigint;
  memberCount: number;
  eligibleWeight: bigint;
}

export interface AnonymousVoteEnvelope {
  proposalId: bigint;
  daoKey: bigint;
  snapshotRoot: bigint;
  snapshotEpoch: bigint;
  nullifier: bigint;
  voteCommitment: bigint;
  eligibilityHash: bigint;
  tallyMode: AnonymousTallyMode;
  resultState: "pending-encrypted-tally" | "ready-for-zk-result-proof";
}

type PoseidonRuntime = {
  hash: (...items: bigint[]) => bigint;
};

let poseidonPromise: Promise<PoseidonRuntime> | null = null;

export function generateSalt32(): Buffer {
  return randomBytes(32);
}

export function computeVoteCommitment(vote: boolean, salt32: Buffer, voter: PublicKey): Buffer {
  if (salt32.length !== 32) {
    throw new Error("salt must be 32 bytes");
  }

  const voteByte = Buffer.from([vote ? 1 : 0]);
  return createHash("sha256")
    .update(Buffer.concat([voteByte, salt32, voter.toBuffer()]))
    .digest();
}

export function voteChoiceToBool(choice: VoteChoice): boolean {
  return choice === "yes";
}

export function voteBoolToChoice(vote: boolean): VoteChoice {
  return vote ? "yes" : "no";
}

export function hexEncode(bytes: Buffer): string {
  return bytes.toString("hex");
}

export function hexDecode32(hex: string): Buffer {
  const normalized = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = Buffer.from(normalized, "hex");
  if (bytes.length !== 32) {
    throw new Error("expected 32 bytes");
  }
  return bytes;
}

export function createVoteEnvelope(choice: VoteChoice, voter: PublicKey) {
  const salt32 = generateSalt32();
  const commitment = computeVoteCommitment(voteChoiceToBool(choice), salt32, voter);
  return {
    choice,
    voter: voter.toBase58(),
    salt32,
    saltHex: hexEncode(salt32),
    commitment,
    commitmentHex: hexEncode(commitment),
  };
}

export async function poseidonHash(...items: Array<bigint | number | string>): Promise<bigint> {
  const runtime = await getPoseidonRuntime();
  return runtime.hash(...items.map(toBigInt));
}

export async function computeVoteOverlaySignals(input: {
  proposalId: bigint | number | string;
  daoKey: bigint | number | string;
  minWeight: bigint | number | string;
  vote: bigint | number | string;
  salt: bigint | number | string;
  voterKey: bigint | number | string;
  weight: bigint | number | string;
}) {
  const proposalId = toBigInt(input.proposalId);
  const daoKey = toBigInt(input.daoKey);
  const minWeight = toBigInt(input.minWeight);
  const vote = toBigInt(input.vote);
  const salt = toBigInt(input.salt);
  const voterKey = toBigInt(input.voterKey);
  const weight = toBigInt(input.weight);

  return {
    proposalId,
    daoKey,
    minWeight,
    commitment: await poseidonHash(vote, salt, voterKey, proposalId, daoKey),
    nullifier: await poseidonHash(voterKey, proposalId, daoKey),
    eligibilityHash: await poseidonHash(voterKey, weight, daoKey),
  };
}

export async function computeDelegationOverlaySignals(input: {
  proposalId: bigint | number | string;
  daoKey: bigint | number | string;
  minWeight: bigint | number | string;
  delegatorKey: bigint | number | string;
  delegateeKey: bigint | number | string;
  salt: bigint | number | string;
  delegatedWeight: bigint | number | string;
  active: bigint | number | string;
}) {
  const proposalId = toBigInt(input.proposalId);
  const daoKey = toBigInt(input.daoKey);
  const minWeight = toBigInt(input.minWeight);
  const delegatorKey = toBigInt(input.delegatorKey);
  const delegateeKey = toBigInt(input.delegateeKey);
  const salt = toBigInt(input.salt);
  const delegatedWeight = toBigInt(input.delegatedWeight);
  const active = toBigInt(input.active);

  return {
    proposalId,
    daoKey,
    minWeight,
    active,
    delegationCommitment: await poseidonHash(delegatorKey, delegateeKey, proposalId, daoKey, salt),
    delegationNullifier: await poseidonHash(delegatorKey, proposalId, daoKey),
    delegateeBinding: await poseidonHash(delegateeKey, proposalId, daoKey),
    weightCommitment: await poseidonHash(delegateeKey, delegatedWeight, daoKey),
  };
}

export async function computeTallyOverlaySignals(input: {
  proposalId: bigint | number | string;
  daoKey: bigint | number | string;
  vote0: bigint | number | string;
  vote1: bigint | number | string;
  salt0: bigint | number | string;
  salt1: bigint | number | string;
  voterKey0: bigint | number | string;
  voterKey1: bigint | number | string;
  weight0: bigint | number | string;
  weight1: bigint | number | string;
}) {
  const proposalId = toBigInt(input.proposalId);
  const daoKey = toBigInt(input.daoKey);
  const vote0 = toBigInt(input.vote0);
  const vote1 = toBigInt(input.vote1);
  const salt0 = toBigInt(input.salt0);
  const salt1 = toBigInt(input.salt1);
  const voterKey0 = toBigInt(input.voterKey0);
  const voterKey1 = toBigInt(input.voterKey1);
  const weight0 = toBigInt(input.weight0);
  const weight1 = toBigInt(input.weight1);

  const commitment0 = await poseidonHash(vote0, salt0, voterKey0, proposalId, daoKey);
  const commitment1 = await poseidonHash(vote1, salt1, voterKey1, proposalId, daoKey);
  const nullifier0 = await poseidonHash(voterKey0, proposalId, daoKey);
  const nullifier1 = await poseidonHash(voterKey1, proposalId, daoKey);

  return {
    proposalId,
    daoKey,
    commitment0,
    commitment1,
    yesWeightTotal: vote0 * weight0 + vote1 * weight1,
    noWeightTotal: (1n - vote0) * weight0 + (1n - vote1) * weight1,
    nullifierAccumulator: await poseidonHash(nullifier0, nullifier1),
  };
}

export async function deriveAnonymousIdentityCommitment(input: {
  identitySecret: bigint | number | string;
  recoveryNonce: bigint | number | string;
  daoKey: bigint | number | string;
}) {
  return poseidonHash(input.identitySecret, input.recoveryNonce, input.daoKey);
}

export async function deriveProposalNullifier(input: {
  identitySecret: bigint | number | string;
  proposalId: bigint | number | string;
  daoKey: bigint | number | string;
}) {
  return poseidonHash(input.identitySecret, input.proposalId, input.daoKey);
}

export function createMembershipSnapshot(input: {
  dao: string;
  proposal: string;
  epoch: bigint | number | string;
  merkleRoot: bigint | number | string;
  frozenAtSlot: bigint | number | string;
  votingWindowSlots: bigint | number | string;
  memberCount: number;
  eligibleWeight: bigint | number | string;
}): AnonymousMembershipSnapshot {
  const frozenAtSlot = toBigInt(input.frozenAtSlot);
  const votingWindowSlots = toBigInt(input.votingWindowSlots);
  if (input.memberCount < 0) {
    throw new Error("memberCount cannot be negative");
  }
  if (votingWindowSlots <= 0n) {
    throw new Error("votingWindowSlots must be positive");
  }

  return {
    dao: input.dao,
    proposal: input.proposal,
    epoch: toBigInt(input.epoch),
    merkleRoot: toBigInt(input.merkleRoot),
    frozenAtSlot,
    expiresAtSlot: frozenAtSlot + votingWindowSlots,
    memberCount: input.memberCount,
    eligibleWeight: toBigInt(input.eligibleWeight),
  };
}

export function assertSnapshotUsable(
  snapshot: AnonymousMembershipSnapshot,
  currentSlot: bigint | number | string,
) {
  const slot = toBigInt(currentSlot);
  if (slot < snapshot.frozenAtSlot) {
    throw new Error("membership snapshot is not active yet");
  }
  if (slot > snapshot.expiresAtSlot) {
    throw new Error("membership snapshot is stale");
  }
}

export async function createAnonymousVoteEnvelope(input: {
  identitySecret: bigint | number | string;
  proposalId: bigint | number | string;
  daoKey: bigint | number | string;
  vote: 0 | 1;
  voteSalt: bigint | number | string;
  voterKey: bigint | number | string;
  weight: bigint | number | string;
  minWeight: bigint | number | string;
  snapshot: AnonymousMembershipSnapshot;
  currentSlot: bigint | number | string;
  tallyMode?: AnonymousTallyMode;
}): Promise<AnonymousVoteEnvelope> {
  assertSnapshotUsable(input.snapshot, input.currentSlot);
  if (input.vote !== 0 && input.vote !== 1) {
    throw new Error("anonymous vote must be 0 or 1");
  }

  const signals = await computeVoteOverlaySignals({
    proposalId: input.proposalId,
    daoKey: input.daoKey,
    minWeight: input.minWeight,
    vote: input.vote,
    salt: input.voteSalt,
    voterKey: input.voterKey,
    weight: input.weight,
  });

  return {
    proposalId: signals.proposalId,
    daoKey: signals.daoKey,
    snapshotRoot: input.snapshot.merkleRoot,
    snapshotEpoch: input.snapshot.epoch,
    nullifier: await deriveProposalNullifier({
      identitySecret: input.identitySecret,
      proposalId: input.proposalId,
      daoKey: input.daoKey,
    }),
    voteCommitment: signals.commitment,
    eligibilityHash: signals.eligibilityHash,
    tallyMode: input.tallyMode ?? "commitment-only",
    resultState:
      (input.tallyMode ?? "commitment-only") === "zk-result-proof"
        ? "ready-for-zk-result-proof"
        : "pending-encrypted-tally",
  };
}

async function getPoseidonRuntime() {
  if (!poseidonPromise) {
    poseidonPromise = buildPoseidon().then((poseidon: any) => ({
      hash: (...items: bigint[]) => BigInt(poseidon.F.toString(poseidon(items))),
    }));
  }
  return poseidonPromise;
}

function toBigInt(value: bigint | number | string): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  return BigInt(value);
}
