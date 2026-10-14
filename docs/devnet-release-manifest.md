# Devnet Release Manifest

## Purpose

This manifest records the live Devnet deployment surface that reviewers and operators should treat as the current canonical reference.

It exists to reduce ambiguity between:

- the deployed program
- the live governance proof
- the dedicated additive V3 proof
- the review-facing strategy config
- the proof links exposed in the frontend and README

## Canonical Devnet References

- Program ID: `5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx`
- Deployment transaction: `2CMEujY1CKnC8rH8BuLy4GvwYk3zfqMfAKaUjybcAvRhS1dnzg3Zd3GeMttBp4vkUbu69GkQtr3TWgbmBqGY8cyC`
- Verification wallet: `4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD`

## Live Governance Proof References

- DAO PDA: `FZV9KmpeY1B31XvszQypp5T6nQN5C44JDLM4QWBEDvhx`
- Governance mint: ``
- Treasury PDA: `AZUroiNeGAjNdD84eEHnAKHHFwqAFmkjr2g1eoF7Ek5c`
- Proposal PDA: `AegjmwkX1FknBJMDyH5yM6BMhyHsiUreNtz3d8iz3QrP`

## Live PDAO Token References

- PDAO mint: ``
- PDAO program: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb` (`Token-2022`)
- PDAO token account: `F4q77ZMJdC7eoEUw3CCR7DbKGTggyExjuMGKBEiM2ct4`
- PDAO metadata URI: `https://privatedao.org/assets/pdao-token.json`
- PDAO initial supply: `1,000,000 PDAO`
- PDAO mint authority: `disabled`
- Mint-authority disable transaction: `dnv2vXPkFRM5fd42vgA4Cjkx85UCDTvFssYcS97ArZFQNGRVDd3DRzAUuvUVX1QFUAYcTpayJhbnomLCgjp2jj2`

## Program Boundary Note

- PrivateDAO governance program: `5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx`
- PDAO token program: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`

These are intentionally different. The Token-2022 id belongs to the PDAO mint surface and does not represent a second PrivateDAO governance deployment.

## Live PDAO Token Transactions

- `pdao-create-token`: `5zGeSePpx2q3dFTNBi8Vmn8ucd9B3jEW6MKqrCUWtQQa3FipwDPFVKRrAoWQhJagBVqKMfUcWxVfpA6Q2vymanA6`
- `pdao-create-account`: `45gM6Jo3SSbwxzqyGRSMhTmz47r8wsaAMikdkbSQ2AyoXMEA3JAJM9X6eufjwnKY5QYU6QCFTjAfR9cVExKu2rhn`
- `pdao-initialize-metadata`: `4kgVoRGATdVAWVoYAYGqWnJBpDHiiRmFyQ3rgRz2uWEGdsx3Hosg5Ro7JGY7xSygD1vUUsGCduseCMWYx4MbXgur`
- `pdao-mint-initial-supply`: `7LF3U3kooWfnRwaziceyRzKrHKhFQ6q6hfYeR6vU5gudjTPKYbw6kmXCxvvfurnQBnCBTCWH54rabcDqx1TBbLA`
- `pdao-disable-mint-authority`: `dnv2vXPkFRM5fd42vgA4Cjkx85UCDTvFssYcS97ArZFQNGRVDd3DRzAUuvUVX1QFUAYcTpayJhbnomLCgjp2jj2`

## Live Lifecycle Transactions

- `create-dao`: `5mcyVi3SbZo4hvpVMjH2eZH8FYeywdbbPz4ArmE5wHXH5X9EnP6gSq76ogBWYWVkVUwzrCchPnSdhGV1mFb48s5Q`
- `mint-voting`: `reused-existing-governance-balance`
- `deposit`: `KHWqfteEQhsH7hk7onQymbmnYdtF8rLoPWwchoQz5XFy8eY3DufeaX8DPiiVS1or7XkMVjMrbH2rsEhPtrPfzi9`
- `create-proposal`: `E93ikMXVJbtvz8ewAHA2BasZPVKYyUXe3Jy88h3b3AQubm7PSYFMNtDveBkRts7uYodwzb8cGZSVDoneKF16X2L`
- `commit`: `3RMbrcYGx297hgcTrov9PqtUqM97ZFg6A21qxmepTboLQAoXov6toY2QTa8yU1i8zmQPvjR3ArNGpvR3jat79uTP`
- `reveal`: `5L3cxZZgwMRnJTxNXLQCyjQMXSAi6bwoskFoKsfaQ7JycYUPuGCkWAkr7qA18WkddfNdSPB5qHt3FVSiHq2eDGh5`
- `finalize`: `4JSPRJQuSY5es74TcChBTzuGMMCr4RknHkmr6vFmtmbav4TRABDAnapmtgipYioEZzh4wmKfg2PMzZHCfJ7UruLG`
- `execute`: `x1vhP6H3Regi6WHYx6LUGbeo4CCbJxWwtUVucPVjonnymyccpM8mpb7t3UpQpqksXBU7PYGPd86cPnZLYwRzBn9`

## Repository Cross-Checks

These values are expected to match:

- [live-proof.md](docs/live-proof.md)
- [test-wallet-live-proof-v3.generated.md](docs/test-wallet-live-proof-v3.generated.md)
- [ranger-strategy-config.devnet.json](docs/ranger-strategy-config.devnet.json)
- [ranger-submission-bundle.generated.md](docs/ranger-submission-bundle.generated.md)
- [README.md](README.md)

## Additive V3 References

- Governance Hardening V3: [governance-hardening-v3.md](docs/governance-hardening-v3.md)
- Settlement Hardening V3: [settlement-hardening-v3.md](docs/settlement-hardening-v3.md)
- Dedicated V3 Devnet proof: [test-wallet-live-proof-v3.generated.md](docs/test-wallet-live-proof-v3.generated.md)

## Operator Use

Use this manifest when:

- reviewing whether the repo points to the correct live program
- validating that the strategy package references the same verification wallet
- checking that reviewer-facing docs are synchronized
- preparing a submission package or audit handoff

## Honest Boundary

This manifest documents the current live Devnet release surface.

It is not a claim that:

- mainnet has already been cut over
- external audit is complete
- strategy-side PnL evidence is embedded in this manifest
