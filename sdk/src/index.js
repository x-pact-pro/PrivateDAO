"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSalt32 = generateSalt32;
exports.computeVoteCommitment = computeVoteCommitment;
exports.voteChoiceToBool = voteChoiceToBool;
exports.voteBoolToChoice = voteBoolToChoice;
exports.hexEncode = hexEncode;
exports.hexDecode32 = hexDecode32;
exports.createVoteEnvelope = createVoteEnvelope;
exports.poseidonHash = poseidonHash;
exports.computeVoteOverlaySignals = computeVoteOverlaySignals;
exports.computeDelegationOverlaySignals = computeDelegationOverlaySignals;
exports.computeTallyOverlaySignals = computeTallyOverlaySignals;
exports.deriveAnonymousIdentityCommitment = deriveAnonymousIdentityCommitment;
exports.deriveProposalNullifier = deriveProposalNullifier;
exports.createMembershipSnapshot = createMembershipSnapshot;
exports.assertSnapshotUsable = assertSnapshotUsable;
exports.createAnonymousVoteEnvelope = createAnonymousVoteEnvelope;
const crypto_1 = require("crypto");
const circomlibjs_1 = require("circomlibjs");
let poseidonPromise = null;
function generateSalt32() {
    return (0, crypto_1.randomBytes)(32);
}
function computeVoteCommitment(vote, salt32, voter) {
    if (salt32.length !== 32) {
        throw new Error("salt must be 32 bytes");
    }
    const voteByte = Buffer.from([vote ? 1 : 0]);
    return (0, crypto_1.createHash)("sha256")
        .update(Buffer.concat([voteByte, salt32, voter.toBuffer()]))
        .digest();
}
function voteChoiceToBool(choice) {
    return choice === "yes";
}
function voteBoolToChoice(vote) {
    return vote ? "yes" : "no";
}
function hexEncode(bytes) {
    return bytes.toString("hex");
}
function hexDecode32(hex) {
    const normalized = hex.startsWith("0x") ? hex.slice(2) : hex;
    const bytes = Buffer.from(normalized, "hex");
    if (bytes.length !== 32) {
        throw new Error("expected 32 bytes");
    }
    return bytes;
}
function createVoteEnvelope(choice, voter) {
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
async function poseidonHash(...items) {
    const runtime = await getPoseidonRuntime();
    return runtime.hash(...items.map(toBigInt));
}
async function computeVoteOverlaySignals(input) {
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
async function computeDelegationOverlaySignals(input) {
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
async function computeTallyOverlaySignals(input) {
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
async function deriveAnonymousIdentityCommitment(input) {
    return poseidonHash(input.identitySecret, input.recoveryNonce, input.daoKey);
}
async function deriveProposalNullifier(input) {
    return poseidonHash(input.identitySecret, input.proposalId, input.daoKey);
}
function createMembershipSnapshot(input) {
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
function assertSnapshotUsable(snapshot, currentSlot) {
    const slot = toBigInt(currentSlot);
    if (slot < snapshot.frozenAtSlot) {
        throw new Error("membership snapshot is not active yet");
    }
    if (slot > snapshot.expiresAtSlot) {
        throw new Error("membership snapshot is stale");
    }
}
async function createAnonymousVoteEnvelope(input) {
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
        resultState: (input.tallyMode ?? "commitment-only") === "zk-result-proof"
            ? "ready-for-zk-result-proof"
            : "pending-encrypted-tally",
    };
}
async function getPoseidonRuntime() {
    if (!poseidonPromise) {
        poseidonPromise = (0, circomlibjs_1.buildPoseidon)().then((poseidon) => ({
            hash: (...items) => BigInt(poseidon.F.toString(poseidon(items))),
        }));
    }
    return poseidonPromise;
}
function toBigInt(value) {
    if (typeof value === "bigint")
        return value;
    if (typeof value === "number")
        return BigInt(value);
    return BigInt(value);
}
