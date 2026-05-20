# Supply-Chain Attestation

## Overview

- Generated at: `2026-05-20T19:31:40+03:00`
- Hash algorithm: `sha256`
- Package manager surface: `npm+yarn`
- Aggregate sha256: `f7bcfc429df8016ff0a6fd817110f89399ba68db0e9779bbbe7b3f554c09b8da`

## Top-Level Package Surface

- Package name: `private-dao`
- Package version: `0.3.0`
- Dependencies: `6`
- Dev dependencies: `14`
- Scripts: `290`

## Lockfile Coverage

- Cargo lock: `Cargo.lock` with `217` packages
- npm lock: `package-lock.json` with lockfile version `3` and `373` packages
- Yarn lock: `yarn.lock` with `340` entries

## Tracked Integrity Files

- `Cargo.toml` | sha256 `6183b506b7f0e0e9ba1a97b2597f218a96ec1c9924bcc3dc78f94f08601ff1b2` | bytes `331`
- `Cargo.lock` | sha256 `7531013dda172fc3faf015a98acf0cef1b8fa7f393024cbf23b6f998371315f1` | bytes `57835`
- `Anchor.toml` | sha256 `bf5a0ec9663df3f2c7c655c697495a7a77dac6a03361cb8ff7950752cf1ddab3` | bytes `552`
- `package.json` | sha256 `6d0c3769ab9b5e7fd1ac3dc55cf4ce70e8795aa1bf2d2a3abe30013483fea3ca` | bytes `27864`
- `yarn.lock` | sha256 `c709a6983ae046cdb10f6eec1406435aa51f2f0dd3da7319b3ed8aaaa0fc64d2` | bytes `101287`
- `package-lock.json` | sha256 `d7c820b55e67e9383d179814c797f7c64fc6325b9319fef439335d561d36a9aa` | bytes `180225`

## Review Commands

- `npm run build:supply-chain-attestation`
- `npm run verify:supply-chain-attestation`
- `npm run build:cryptographic-manifest`
- `npm run verify:cryptographic-manifest`
- `npm run verify:all`

## Notes

- Lockfile integrity is reviewer-visible and machine-verified.
- This attestation does not replace external dependency auditing.
- The current posture remains classical-cryptography based rather than post-quantum.
