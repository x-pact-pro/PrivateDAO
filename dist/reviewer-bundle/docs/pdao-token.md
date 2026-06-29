# PDAO Token Surface

PrivateDAO now documents and publishes a live Testnet Token-2022 governance voting token profile for reviewer and product surfaces. The previous Devnet mint is preserved below as archived continuity evidence only; the current reviewer-facing token surface is the Testnet mint.

## Token Metadata

- Name: `PrivateDAO Governance Token`
- Network: `Testnet`
- Utility: `Governance Voting Token`
- Platform: `DeAura`

## Live Testnet Deployment

- Mint: `DFYvBdivHCe4bSErgCiKm2RhwGEcZYbBPFQzLNr37Bie`
- Program: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb` (`Token-2022`)
- Decimals: `9`
- Metadata URI: `https://privatedao.org/assets/pdao-token.json`
- Verification wallet / metadata update authority: `4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD`
- Mint authority: `disabled`
- Mint-authority disable transaction: `2qFb2dKVEmD2hzmN9d6bajHuxLrk5aqKBvqM1Xb71VNTCfY39XgVV49koPigjoa2Vn41PNMmhp7qxK5KMBxNYvj4`
- Associated token account: `CeXqKvdjrVYsPZEX2ysBNs6jubofEXEk4emE2qdS4pVg`
- Current initial supply: `1,000,000 PDAO`
- Published metadata asset: `docs/assets/pdao-token.json`
- Canonical live governance DAO: `FEz2hCLGpDhJ3cdAm5CCWFzrKv8vDDzmmt9UjdF2fApZ`

## Program Identity Boundary

- PrivateDAO governance program: `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`
- Token-2022 program: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`

Legacy Devnet PDAO token issuance evidence remains archived and must not be read as the current Testnet token surface:

- Legacy Devnet mint: `AZUkprJDfJPgAp7L4z3TpCV3KHqLiA8RjHAVhK9HCvDt`
- Legacy Devnet token account: `F4q77ZMJdC7eoEUw3CCR7DbKGTggyExjuMGKBEiM2ct4`
- Legacy Devnet governance program: `5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx`

These are intentionally different:

- the PrivateDAO governance program id is the on-chain protocol identity
- the Token-2022 program id is the mint program used by the live PDAO token surface

The presence of both ids does not indicate a duplicate PrivateDAO deployment.

## Verified Testnet Transactions

- `create-token`: `5hYpAkcK7h7sQBP8zCtejDi4F6z7wiurbuqDvgFbGNqjB6bPVu9BGab7iXiXUbBqLYT71VjCPwRjNyeVhqU7sCVE`
- `initialize-metadata`: `5uH1aCevn3GCcrzAUdtWxdQ8e8DngYsFB49nQxNvebB9abzGaMR4e3i2V18jophnuaHEaYGwxgFVUKYJ5cn7jWKN`
- `create-account`: `4TX4uB1YDYFPqyqA3krngaPNA8XWffWBU5gq5bEjAmWg7kv1ZoVFiZ8SdKyQewJGR2GqNxnj6fyYvzFMHs4EuizA`
- `mint-initial-supply`: `2aCsyLrFy2myKd4YR1Sqg6SigvH2F6ivaw86CnRDtHUPoAAFeENkVCAKLVbZM9rsKaH7tPsmWc8JsjMN5G6KB4To`
- `disable-mint-authority`: `2qFb2dKVEmD2hzmN9d6bajHuxLrk5aqKBvqM1Xb71VNTCfY39XgVV49koPigjoa2Vn41PNMmhp7qxK5KMBxNYvj4`

## Generated Attestation

- Machine-readable attestation: `docs/pdao-attestation.generated.json`

These transactions are confirmed on Solana Testnet and were executed from the verification wallet above.

## Intended Role In PrivateDAO

`PDAO` is the symbol for the live Token-2022 governance voting token, named `PrivateDAO Governance Token`, for the current Testnet-facing reviewer path and the canonical token identity for the product surface.

It is intended to represent:

- governance participation
- token-gated proposal creation
- token-gated voting rights
- a clearer user-facing governance token identity across docs and frontend surfaces

## What This Does Not Change

This token note does not change the protocol's generalized DAO-configured governance-mint semantics:

- no contract interfaces are changed
- no PDA derivations are changed
- no account layouts are changed
- DAO-level governance mint logic remains the on-chain source of truth

PrivateDAO still supports DAO-configured governance mints at the protocol level. The current canonical Devnet DAO now uses `PDAO` itself as that live governance mint.

## Reviewer Interpretation

Reviewers should read this note as:

- a formal token identity for the Testnet governance surface
- the actual live governance mint for the current canonical Testnet path
- not a claim of a protocol-native fee token
- not a claim of speculative tokenomics
- not a replacement for DAO-specific governance-mint enforcement on-chain
- not a claim that every DAO in the protocol must use this mint

## Product Positioning

`PDAO` is intentionally framed as a governance voting token, not a monetization token.

That keeps the token surface aligned with what PrivateDAO actually does today:

- proposal participation
- voting rights
- governance execution control
- private governance coordination

## Consumer Utility Interpretation

For community-facing product surfaces, `PDAO` should be read as:

- the community participation key
- the proposal-access token
- the voting-rights token
- the token that makes treasury decisions accountable to actual members

That framing is stronger than treating the token as a decorative badge, because it ties the user experience directly to:

- who can propose
- who can vote
- who can influence community treasury outcomes

## Launch Surface

What is already true today:

- the token is live on Testnet
- it is published through the DeAura launch path
- its metadata and attestation surfaces are reviewer-visible
- its mint authority is disabled

What remains external to repository code:

- any public distribution page outside the repository itself
- market traction and trading-volume milestones

Those should be attached as operational launch evidence rather than fabricated inside repository docs.

## Verification Commands

```bash
spl-token display --program-2022 DFYvBdivHCe4bSErgCiKm2RhwGEcZYbBPFQzLNr37Bie --url https://api.testnet.solana.com --output json-compact
curl -fsSL https://privatedao.org/assets/pdao-token.json
solana confirm --url https://api.testnet.solana.com 5hYpAkcK7h7sQBP8zCtejDi4F6z7wiurbuqDvgFbGNqjB6bPVu9BGab7iXiXUbBqLYT71VjCPwRjNyeVhqU7sCVE
solana confirm --url https://api.testnet.solana.com 5uH1aCevn3GCcrzAUdtWxdQ8e8DngYsFB49nQxNvebB9abzGaMR4e3i2V18jophnuaHEaYGwxgFVUKYJ5cn7jWKN
solana confirm --url https://api.testnet.solana.com 4TX4uB1YDYFPqyqA3krngaPNA8XWffWBU5gq5bEjAmWg7kv1ZoVFiZ8SdKyQewJGR2GqNxnj6fyYvzFMHs4EuizA
solana confirm --url https://api.testnet.solana.com 2aCsyLrFy2myKd4YR1Sqg6SigvH2F6ivaw86CnRDtHUPoAAFeENkVCAKLVbZM9rsKaH7tPsmWc8JsjMN5G6KB4To
solana confirm --url https://api.testnet.solana.com 2qFb2dKVEmD2hzmN9d6bajHuxLrk5aqKBvqM1Xb71VNTCfY39XgVV49koPigjoa2Vn41PNMmhp7qxK5KMBxNYvj4
```
