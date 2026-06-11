# PrivateDAO Privacy And Encryption Engineering Report

Date: 2026-06-11  
Audience: cryptography reviewers, privacy protocol teams, Solana engineers, security reviewers, judges  
Repository snapshot reviewed: `origin/main` at `7fb1025ff064c8c83efb2c59ce07ec780964c450`  
Primary posture: hide influence signals during coordination, reveal final outcomes and proofs after completion.

## 1. Executive Summary

PrivateDAO's privacy architecture is organized around a practical coordination thesis:

> Vote privately while it matters. Reveal transparently when it counts.

The current privacy/encryption stack includes:

- public-private-until-reveal governance mode
- commit/reveal voting posture
- ZK companion circuits and local Groth16 verification artifacts
- REFHE-style encrypted-computation settlement gate
- Ika/Encrypt approval and 2PC-MPC readiness lane
- Umbra-compatible private payout provider boundary
- Cloak-style private settlement rail language and routing
- Streamflow-compatible confidential vesting boundary
- private rooms with access-control and selective disclosure requirements

The strongest current claim is not "everything is fully private forever." The stronger and more accurate claim is:

> PrivateDAO preserves sensitive coordination before execution, then exposes outcomes and proof packets when disclosure is useful for accountability.

## 2. Core Product Privacy Modes

PrivateDAO models privacy as a workflow setting rather than a single monolithic primitive:

- `public-transparent`
- `public-private-until-reveal`
- `private-room`
- `vip-private-room`

During active private-until-reveal voting, the product must not show:

- vote counts
- percentages
- leading side
- voter addresses
- voter intent
- momentum
- whale participation
- partial results

After reveal, the system may show:

- final outcome
- aggregate counts where available
- proof status
- audit trail
- execution button if passed

This is a product-level privacy invariant, not just a UI preference.

## 3. ZK And Commit-Reveal

Primary evidence:

- `docs/zk-local-groth16-verification-2026-05-22.md`
- `zk/circuits/private_dao_vote_overlay.circom`
- `zk/circuits/private_dao_delegation_overlay.circom`
- `zk/circuits/private_dao_tally_overlay.circom`
- `zk/setup/*_vkey.json`
- `zk/proofs/*.proof.json`
- `zk/proofs/*.public.json`
- `scripts/zk/verify-sample.sh`
- `scripts/anchor-zk-proof.ts`
- `scripts/verify-zk-proof-on-chain.ts`

Verified local command:

```bash
npm run zk:verify:sample
```

The local Groth16 packet states that vote, delegation, and tally overlay proofs verify with `snarkJS: OK`.

The vote overlay circuit enforces:

- binary vote validity
- minimum voter weight
- Poseidon commitment binding over vote, salt, voter key, proposal ID, and DAO key
- proposal-scoped nullifier continuity
- eligibility hash binding

Current boundary:

- local ZK proof artifacts are real and repeatably verified
- Solana verifier CPI enforcement is tracked separately as a stricter production lane
- reviewer-facing copy must not collapse local proof verification into completed on-chain verifier enforcement

## 4. REFHE Settlement Gate

Primary evidence:

- `docs/refhe-security-model.md`
- `docs/frontier-integrations.generated.md`
- `docs/settlement-receipt-closure-packet.md`
- Anchor payout execution paths in `programs/private-dao/src/lib.rs`

REFHE adds an encrypted-computation settlement boundary for confidential payout execution.

The security model protects:

- proposal binding
- ciphertext hash binding
- execution gating
- verifier program binding
- immutable settlement boundary

Important boundary:

- REFHE does not claim fully homomorphic computation on Solana.
- REFHE does not claim PrivateDAO currently re-verifies encrypted computation on-chain.
- REFHE currently acts as a proposal-bound encrypted evaluation settlement gate.

This is still commercially meaningful: payroll, grants, rewards, and vendor payouts can be coordinated with encrypted metadata and public settlement proof rather than public private spreadsheets.

## 5. Ika / Encrypt / 2PC-MPC Lane

Primary evidence:

- `docs/backend-provider-readiness-2026-05-24.md`
- `docs/testnet-encrypted-integrations-activation-2026-05-23.md`
- `docs/privacy-execution-matrix-2026-05-26.md`
- `apps/web/src/lib/rpcfast-infrastructure.ts`
- historical Ika approval and readiness commits around 2026-05-27

Product role:

- approval and encryption lane for sensitive coordination
- future stronger 2PC-MPC execution and dWallet signing boundary
- encrypted approvals and private operation receipts inside reviewer-visible matrices

Current boundary:

- Ika/Encrypt is represented as an encrypted approval/readiness lane and route-level proof surface
- final Ika dWallet signing is not overclaimed as completed production settlement
- reports should distinguish readiness, proof-read routes, and future final signing

## 6. Umbra-Compatible Private Payout Boundary

Primary files:

- `apps/web/src/lib/providers/private-payout-provider.ts`
- `apps/web/src/lib/providers/umbra-provider.ts`
- `apps/web/src/lib/providers/sandbox-private-payout-provider.ts`
- `apps/web/src/app/api/private-payout/prepare/route.ts`
- `apps/web/src/app/api/private-payout/execute-testnet/route.ts`
- `apps/web/src/app/api/private-payout/status/route.ts`
- `docs/private-payout-provider.md`
- `docs/umbra-adapter-boundary.md`

PrivateDAO treats Umbra as a confidential payout and stealth settlement provider, not as the governance privacy primitive.

The provider interface includes:

- `prepareIntent(input)`
- `validateIntent(intent)`
- `executeTestnet(intent)`
- `buildReceipt(intent, executionResult)`
- `getProviderStatus()`

The receipt contains:

- provider
- network
- intent hash
- proposal ID
- DAO ID
- timestamp
- privacy mode
- public outcome
- proof URL
- explorer URL when available
- sandbox flag

Critical privacy property:

- raw recipient metadata is hashed and excluded from frontend receipts/logs
- sandbox receipts are explicitly labeled as sandbox
- the provider is disabled/unconfigured unless server-side Umbra env is present

## 7. Cloak-Style Private Settlement Rail

Product role:

- private payments and settlement lane for contributors, grants, rewards, and sensitive organizational actions

Current boundary:

- presented as a private settlement rail in the privacy execution matrix and product routes
- should remain behind proof/output language unless a concrete SDK/API execution receipt is present
- strongest current user-facing claim is confidential payout coordination with proof export, not universal private settlement finality

## 8. Streamflow-Compatible Confidential Vesting

Primary files:

- `apps/web/src/lib/providers/confidential-vesting-provider.ts`

The vesting boundary supports:

- public payout
- private payout
- confidential vesting

It hashes recipient address into the receipt hash and returns proof URLs that do not leak raw recipient metadata.

Current boundary:

- sandbox provider is active by default
- Streamflow-compatible provider activates only when server-side env is configured
- sandbox mode must never be labeled as real Streamflow execution

## 9. Private Rooms

Product role:

- invite-only, token-gated, or allowlist workspaces
- hidden proposal notes and hidden voting intent
- final reveal controlled by room policy
- proof export after completion

Security requirement:

- unauthorized users see only public labels, not room contents
- private room notes must not be sent to intelligence providers unless explicitly approved
- room names can be sensitive and should not be globally exposed

## 10. Historical Development Notes

Relevant recent commits include:

- `b97a2ed3a` - enforced visitor-repeatable privacy claims.
- `fa9c93200` - added on-chain privacy claim preparation endpoint.
- `003212c4b` - added selective disclosure privacy receipts.
- `f4099e951` - encrypted visitor claim attestations.
- `2287d0753` - added visitor-repeatable privacy claim console.
- `6989bfde5` - closed Testnet encrypted receipt evidence.
- `e829f3145` - recorded Ika Solana final approval.
- `7551a238b` - added MagicBlock engineering report and proof documentation discipline.

## 11. Upgrade Path

Recommended next upgrades:

1. Add a public proof artifact link from every ZK/commit-reveal UI state.
2. Add a browser-visible "what is hidden now / what reveals later" panel to governance, rooms, payroll, and payout flows.
3. Add automated tests that assert no hidden vote counts or percentages appear in active proposal HTML/JSON.
4. Add a receipt validator page for Umbra-compatible and Streamflow-compatible sandbox receipts.
5. Add a stronger Ika/Encrypt proof packet separating final dWallet signing from current approval/readiness lanes.

## 12. Engineering Conclusion

PrivateDAO's privacy stack is strongest when described as staged confidentiality:

```text
private context -> private vote/approval -> settlement gate -> public outcome/proof
```

The implementation already contains real ZK proof artifacts, REFHE settlement gating, private payout interfaces, vesting receipt boundaries, and privacy-mode UX rules. The next major cryptographic upgrade is deeper on-chain verifier enforcement and final external-provider settlement receipts, not more branding.

