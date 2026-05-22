import { assert } from "chai";

import {
  assertSnapshotUsable,
  createAnonymousVoteEnvelope,
  createMembershipSnapshot,
  deriveAnonymousIdentityCommitment,
  deriveProposalNullifier,
} from "../../sdk/src";

describe("anonymous governance primitive SDK", () => {
  it("freezes membership roots per proposal and rejects stale roots", async () => {
    const snapshot = createMembershipSnapshot({
      dao: "EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva",
      proposal: "FEz2hCLGpDhJ3cdAm5CCWFzrKv8vDDzmmt9UjdF2fApZ",
      epoch: 7,
      merkleRoot: 123456789,
      frozenAtSlot: 410124745,
      votingWindowSlots: 2_000,
      memberCount: 3,
      eligibleWeight: 30,
    });

    assertSnapshotUsable(snapshot, 410124800);
    assert.throws(() => assertSnapshotUsable(snapshot, 410130000), /stale/);

    const identityCommitment = await deriveAnonymousIdentityCommitment({
      identitySecret: 991,
      recoveryNonce: 44,
      daoKey: 20260523,
    });
    const nullifier = await deriveProposalNullifier({
      identitySecret: 991,
      proposalId: 1001,
      daoKey: 20260523,
    });

    const envelope = await createAnonymousVoteEnvelope({
      identitySecret: 991,
      proposalId: 1001,
      daoKey: 20260523,
      vote: 1,
      voteSalt: 123,
      voterKey: 456,
      weight: 10,
      minWeight: 1,
      snapshot,
      currentSlot: 410124900,
      tallyMode: "zk-result-proof",
    });

    assert.equal(envelope.snapshotRoot, snapshot.merkleRoot);
    assert.equal(envelope.snapshotEpoch, 7n);
    assert.equal(envelope.nullifier, nullifier);
    assert.notEqual(identityCommitment, 0n);
    assert.notEqual(envelope.voteCommitment, 0n);
    assert.equal(envelope.resultState, "ready-for-zk-result-proof");
  });
});
