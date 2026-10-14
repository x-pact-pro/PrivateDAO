# Supply-Chain Attestation

## Overview

- Generated at: `2026-10-15T01:40:09+03:00`
- Hash algorithm: `sha256`
- Package manager surface: `npm+yarn`
- Aggregate sha256: `ec91ffec865b69816a58e4053dea2282aca69d5c0c71c2e13943f3f5e9267008`

## Top-Level Package Surface

- Package name: `private-dao`
- Package version: `0.3.0`
- Dependencies: `17`
- Dev dependencies: `15`
- Scripts: `374`

## Lockfile Coverage

- Cargo lock: `Cargo.lock` with `590` packages
- npm lock: `package-lock.json` with lockfile version `3` and `648` packages
- Yarn lock: `yarn.lock` with `588` entries

## Tracked Integrity Files

- `Cargo.toml` | sha256 `30b256a478b15b9f03c3f8f6b49c16944dd14470f339a09a274619f14db7416e` | bytes `532`
- `Cargo.lock` | sha256 `5c7ef22d9b595205b844cd297b0128079cbbc9247527c848a60f61b092337de2` | bytes `164838`
- `Anchor.toml` | sha256 `1394f6f58180033c5e9184c0ee4fee1f080be78e9ee67ad92b69255c6a0ec964` | bytes `963`
- `package.json` | sha256 `8f1f12c65af10a1721d58c16dc0cfa676a507ac7d1e6dc4b62e0c1a659410382` | bytes `36702`
- `package-lock.json` | sha256 `6f48ffdc2b31be3cc32ba04b373e69ee5d9cae8f13d90dcf36a0dbce95d36cec` | bytes `328063`
- `yarn.lock` | sha256 `eaffb50cba8a04e58fbbcf7b12d854ca1659723f0815dd5f141528b6d6e98514` | bytes `190062`

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
