# DAO And Treasury Authority Handoff - Testnet Readiness

Date: 2026-05-23

This note records the exact custody state after the Squads Testnet program-upgrade transfer and the code-level remediation added for DAO operating authority.

## Verified Live Custody State

- Cluster: Solana Testnet
- Program ID: `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`
- ProgramData: `FKyt5DcmRQcCF8kzMGjCvfGb3ZPHMQnH1SqiG9Mi8xEc`
- Program upgrade authority: `CALHrBqx6jbzcPn2NVcinqSAHeod65v9LcDuTxsdPqBv`
- Squads multisig: `thHmF7VYNtxE1MaDzYXbfPCiq13RF6JwuWnjvDZuSmF`
- Threshold: 2-of-3
- Timelock: 48 hours
- Program upgrade transfer signature: `EzwLLrAchBpj3eLTUFuv1uo9rSLKgKNbQgp1DkCevJycT31Eou9TSJsJsEfMjLt4q87pKwXaZUTqCZ1NduNc1vy`

## Latest Testnet DAO Readout

- Create DAO signature: `5Q9NqqK2AXgVG4NxPkP1aZERNFzE7DhWSFaQzjSjg8Ciafv8AkDJfLRKxoyg8Hd6Kffem9DQK3AUB45KdRU71U5K`
- DAO account: `FEz2hCLGpDhJ3cdAm5CCWFzrKv8vDDzmmt9UjdF2fApZ`
- Governance mint: `C7CRWqe5XBpDaZECpjtoutQum92z5Nkh7reebwjmwLiP`
- Current DAO authority on the live deployed build: `2KpA69UB55tfWUSkKj5j7Tvebd3eG22hEs9hjXUq7pf5`
- Derived treasury PDA: `46F4oV4edtepPTGqLBfFJeBKdccgfnkk9e4WK7Z1MZD3`
- Treasury account status at review time: not initialized on Testnet because no deposit account has been created for this DAO yet.

## Remediation Added In Code

The program now includes `transfer_dao_authority(new_authority)` guarded by the current DAO authority signer. The instruction updates `Dao.authority` and emits `DaoAuthorityTransferred`.

This authority is the operator authority for security policy, ZK-enforced mode, confidential payout configuration, REFHE envelopes, and MagicBlock settlement corridors. SOL/SPL treasury movement remains proposal/PDA-bound; the treasury PDA is derived from the DAO and is not a standalone signer key that can be "moved" like a wallet.

## PDA Continuity Fix

`CreateProposal` previously constrained the DAO account with seeds that included `dao.authority`. That made authority rotation unsafe: once authority changed, existing DAO PDA validation would no longer match the original seed authority.

The fix removes authority-derived PDA validation from `CreateProposal` and keeps proposal creation bound to a program-owned `Dao` account plus governance-token ownership constraints. A regression test now transfers DAO authority and then creates a proposal against the same DAO.

## Deployment Boundary

The live Testnet program is now upgrade-controlled by Squads. That is the desired custody posture, but it also means this new DAO authority-transfer instruction cannot be activated by a single deployer key. The activation path is:

1. Build the upgraded program artifact.
2. Create a Squads upgrade proposal from the 2-of-3 multisig.
3. Execute the upgrade after threshold approval and timelock.
4. Call `transfer_dao_authority` on the target DAO.
5. Record the resulting `DaoAuthorityTransferred` signature in custody evidence.

No document should claim the DAO operating authority has already moved on Testnet until steps 3-5 are complete.
