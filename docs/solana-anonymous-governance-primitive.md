# Solana-Native Anonymous Governance Primitive

PrivateDAO should not present anonymous voting as a single UI feature. The reusable primitive is a Solana governance layer with six explicit parts: membership lifecycle, vote proof, nullifier registry, tally mode, identity recovery, and performance gates.

## MVP Contract

1. Register an identity commitment for eligible members.
2. Freeze a Merkle membership root per proposal.
3. Produce an anonymous vote envelope tied to the frozen root.
4. Derive a proposal-scoped nullifier that prevents double voting.
5. Keep the vote hidden as a commitment while the vote is open.
6. Mark the result as pending until encrypted tally or a ZK result proof closes it.

The SDK entrypoints added for this layer are:

- `createMembershipSnapshot`
- `assertSnapshotUsable`
- `deriveAnonymousIdentityCommitment`
- `deriveProposalNullifier`
- `createAnonymousVoteEnvelope`

## Circuit And Setup Assumptions

The current repo contains local Groth16 overlay circuits for vote, delegation, and tally paths. They are useful reviewer evidence and development scaffolding, but production anonymous governance requires a full external circuit audit and a ceremony statement before being marketed as a finalized privacy protocol.

Required production gates:

- Circuit audit: vote validity, membership inclusion, nullifier uniqueness, delegation authorization, and tally integrity.
- Trusted setup: either a documented Groth16 ceremony transcript or migration to a setup model with clearly stated assumptions.
- Test vectors: deterministic vectors for membership roots, nullifiers, vote commitments, and invalid vote rejection.
- Verifier boundary: if on-chain verifier CPI is not deployed, public copy must state that proofs are generated and verified in the current supported layer, not imply stronger enforcement.

## Membership Lifecycle

Each proposal must use a frozen membership snapshot. New members can be admitted into the next epoch, not silently added to an already-open vote. Exits revoke future epoch membership but do not rewrite historical roots.

Operational rules:

- `frozenAtSlot` defines when the root becomes active.
- `expiresAtSlot` prevents stale roots after the voting window.
- `epoch` separates proposal-time eligibility from later DAO membership changes.
- The UI must show eligible, voted, and result-pending states from the snapshot, not from mutable live membership alone.

## Tally Roadmap

The current primitive supports private vote submission and a pending result envelope. A complete governance result needs one of these closure modes:

- `commitment-only`: reviewer/demo mode; vote is committed, result remains pending.
- `threshold-decryption`: encrypted votes are decrypted by a threshold committee after close.
- `zk-result-proof`: final yes/no totals are published with a proof that they match the hidden commitments and unique nullifiers.

The product should default to honest status labels: "anonymous submission live" is different from "anonymous final tally live."

## UX Recovery Model

The browser must not store raw voting salts or identity secrets in localStorage. The preferred MVP is local encrypted identity material plus an exportable backup phrase that is separate from the wallet seed phrase.

Recovery policy:

- Wallet proves user presence.
- Encrypted identity backup restores the ZK identity secret.
- Losing both wallet access and identity backup means the user can re-register in a future epoch but cannot recover old anonymous-vote authority.
- Mobile and desktop use the same snapshot/nullifier rules so Android is a first-class client, not a separate demo.

## Solana Performance Gates

Before claiming production verifier readiness, record:

- Compute units for proof verification.
- Serialized proof transaction size.
- Priority fee envelope.
- Account count and writable account list.
- Whether the verifier fits in one instruction or requires batching/relayer support.

## Product Packaging

The reviewer-facing message is:

> Solana-native anonymous governance primitive: reusable SDK, Anchor instruction path, frozen membership roots, nullifier registry, and result-tally roadmap.

This framing is stronger than saying "PrivateDAO has private voting" because it gives the ecosystem something reusable: a primitive other DAOs can adopt.
