# Live Devnet Proof

This note captures a real end-to-end governance run executed on Solana devnet from the repository surface using the verification wallet.

Use this file as the canonical legacy Devnet baseline lifecycle proof. The current reviewer-facing Anchor 1.0.1 Testnet program is `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`; see [`testnet-lifecycle-rehearsal-2026-05-07.md`](testnet-lifecycle-rehearsal-2026-05-07.md) and [`anchor-1-migration-evidence-2026-04-30.md`](anchor-1-migration-evidence-2026-04-30.md).

For the stricter additive hardening path, open:

- [`test-wallet-live-proof-v3.generated.md`](test-wallet-live-proof-v3.generated.md)
- [`governance-hardening-v3.md`](governance-hardening-v3.md)
- [`settlement-hardening-v3.md`](settlement-hardening-v3.md)

That packet proves the dedicated `Governance Hardening V3` and `Settlement Hardening V3` flows separately from this baseline note.

## Legacy Devnet Program Deployment

- Program ID: `5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx`
- Deploy transaction: `2CMEujY1CKnC8rH8BuLy4GvwYk3zfqMfAKaUjybcAvRhS1dnzg3Zd3GeMttBp4vkUbu69GkQtr3TWgbmBqGY8cyC`
- Deploy explorer: `https://solscan.io/tx/2CMEujY1CKnC8rH8BuLy4GvwYk3zfqMfAKaUjybcAvRhS1dnzg3Zd3GeMttBp4vkUbu69GkQtr3TWgbmBqGY8cyC?cluster=devnet`

## Live Governance Cycle

- DAO: `FZV9KmpeY1B31XvszQypp5T6nQN5C44JDLM4QWBEDvhx`
- DAO explorer: `https://solscan.io/account/FZV9KmpeY1B31XvszQypp5T6nQN5C44JDLM4QWBEDvhx?cluster=devnet`
- Governance mint: `AZUkprJDfJPgAp7L4z3TpCV3KHqLiA8RjHAVhK9HCvDt`
- Governance mint explorer: `https://solscan.io/account/AZUkprJDfJPgAp7L4z3TpCV3KHqLiA8RjHAVhK9HCvDt?cluster=devnet`
- Treasury PDA: `AZUroiNeGAjNdD84eEHnAKHHFwqAFmkjr2g1eoF7Ek5c`
- Treasury explorer: `https://solscan.io/account/AZUroiNeGAjNdD84eEHnAKHHFwqAFmkjr2g1eoF7Ek5c?cluster=devnet`
- Proposal PDA: `AegjmwkX1FknBJMDyH5yM6BMhyHsiUreNtz3d8iz3QrP`
- Proposal explorer: `https://solscan.io/account/AegjmwkX1FknBJMDyH5yM6BMhyHsiUreNtz3d8iz3QrP?cluster=devnet`

## Governance Mint Clarification

The canonical reviewer-facing Devnet DAO now uses `PDAO` itself as the actual on-chain governance mint. The live governance mint and the published PDAO mint are the same address:

- `AZUkprJDfJPgAp7L4z3TpCV3KHqLiA8RjHAVhK9HCvDt`

## Transaction Hashes

- `create-dao`: `5mcyVi3SbZo4hvpVMjH2eZH8FYeywdbbPz4ArmE5wHXH5X9EnP6gSq76ogBWYWVkVUwzrCchPnSdhGV1mFb48s5Q`
- Explorer: `https://solscan.io/tx/5mcyVi3SbZo4hvpVMjH2eZH8FYeywdbbPz4ArmE5wHXH5X9EnP6gSq76ogBWYWVkVUwzrCchPnSdhGV1mFb48s5Q?cluster=devnet`
- `mint-voting`: `reused-existing-governance-balance`
- Note: the live proof reused the verification wallet's existing PDAO balance rather than minting a separate governance token.
- `deposit`: `KHWqfteEQhsH7hk7onQymbmnYdtF8rLoPWwchoQz5XFy8eY3DufeaX8DPiiVS1or7XkMVjMrbH2rsEhPtrPfzi9`
- Explorer: `https://solscan.io/tx/KHWqfteEQhsH7hk7onQymbmnYdtF8rLoPWwchoQz5XFy8eY3DufeaX8DPiiVS1or7XkMVjMrbH2rsEhPtrPfzi9?cluster=devnet`
- `create-proposal`: `E93ikMXVJbtvz8ewAHA2BasZPVKYyUXe3Jy88h3b3AQubm7PSYFMNtDveBkRts7uYodwzb8cGZSVDoneKF16X2L`
- Explorer: `https://solscan.io/tx/E93ikMXVJbtvz8ewAHA2BasZPVKYyUXe3Jy88h3b3AQubm7PSYFMNtDveBkRts7uYodwzb8cGZSVDoneKF16X2L?cluster=devnet`
- `commit`: `3RMbrcYGx297hgcTrov9PqtUqM97ZFg6A21qxmepTboLQAoXov6toY2QTa8yU1i8zmQPvjR3ArNGpvR3jat79uTP`
- Explorer: `https://solscan.io/tx/3RMbrcYGx297hgcTrov9PqtUqM97ZFg6A21qxmepTboLQAoXov6toY2QTa8yU1i8zmQPvjR3ArNGpvR3jat79uTP?cluster=devnet`
- `reveal`: `5L3cxZZgwMRnJTxNXLQCyjQMXSAi6bwoskFoKsfaQ7JycYUPuGCkWAkr7qA18WkddfNdSPB5qHt3FVSiHq2eDGh5`
- Explorer: `https://solscan.io/tx/5L3cxZZgwMRnJTxNXLQCyjQMXSAi6bwoskFoKsfaQ7JycYUPuGCkWAkr7qA18WkddfNdSPB5qHt3FVSiHq2eDGh5?cluster=devnet`
- `finalize`: `4JSPRJQuSY5es74TcChBTzuGMMCr4RknHkmr6vFmtmbav4TRABDAnapmtgipYioEZzh4wmKfg2PMzZHCfJ7UruLG`
- Explorer: `https://solscan.io/tx/4JSPRJQuSY5es74TcChBTzuGMMCr4RknHkmr6vFmtmbav4TRABDAnapmtgipYioEZzh4wmKfg2PMzZHCfJ7UruLG?cluster=devnet`
- `execute`: `x1vhP6H3Regi6WHYx6LUGbeo4CCbJxWwtUVucPVjonnymyccpM8mpb7t3UpQpqksXBU7PYGPd86cPnZLYwRzBn9`
- Explorer: `https://solscan.io/tx/x1vhP6H3Regi6WHYx6LUGbeo4CCbJxWwtUVucPVjonnymyccpM8mpb7t3UpQpqksXBU7PYGPd86cPnZLYwRzBn9?cluster=devnet`

## ZK Proof Anchors On Devnet

The current Groth16 stack still generates and verifies proofs off-chain, but the proof material is now also anchored on-chain against the canonical governance proposal. Solscan can therefore show real proposal-bound zk proof transactions on Devnet today.

- `zk-anchor-vote`: `3L6SHDNuziEXQiiAWjega4UbjURkWpzYVG5kRKr4YWAekp1AdTvriMqNAtyRchNpzKstEPMp6cmDidFLRx8XDgfP`
- Explorer: `https://explorer.solana.com/tx/3L6SHDNuziEXQiiAWjega4UbjURkWpzYVG5kRKr4YWAekp1AdTvriMqNAtyRchNpzKstEPMp6cmDidFLRx8XDgfP?cluster=devnet`
- `zk-anchor-delegation`: `4nYrBo57V6fCueyu44Jm9XeSA15ti9G6n1ZQXG9AbsdT4e5JJa9vFdmdjpK6Snd27eJNwUSaNaCWWWt3bndTca3X`
- Explorer: `https://explorer.solana.com/tx/4nYrBo57V6fCueyu44Jm9XeSA15ti9G6n1ZQXG9AbsdT4e5JJa9vFdmdjpK6Snd27eJNwUSaNaCWWWt3bndTca3X?cluster=devnet`
- `zk-anchor-tally`: `WTt8i2v1FWitQG2yye28CVCVWVeKvMA7c3D9wm4Upkbf2keK8ae8FXaGK95FaDjnmfJB3L7evBCMtoJrfC3EUrV`
- Explorer: `https://explorer.solana.com/tx/WTt8i2v1FWitQG2yye28CVCVWVeKvMA7c3D9wm4Upkbf2keK8ae8FXaGK95FaDjnmfJB3L7evBCMtoJrfC3EUrV?cluster=devnet`

## Observed Invariants

- Proposal result: `Passed`
- `isExecuted = true`
- `yesCapital = 1000000000000000`
- `noCapital = 0`
- `revealCount = 1 / 1`
- Treasury balance moved from `0.2000 SOL` to `0.1500 SOL`
- Recipient balance increased from `59.8798 SOL` to `59.9298 SOL`

## Reproduction Command

```bash
ANCHOR_PROVIDER_URL="https://api.devnet.solana.com" \
ANCHOR_WALLET="operator-keypair.json" \
npm run live-proof -- --name PDAOCanonical20260404 --governance-mint AZUkprJDfJPgAp7L4z3TpCV3KHqLiA8RjHAVhK9HCvDt
```
