# Supply-Chain Attestation

## Overview

- Generated at: `2026-11-01T09:17:38+02:00`
- Hash algorithm: `sha256`
- Package manager surface: `npm+yarn`
- Aggregate sha256: `288f0d458cdac6d506b5fdfa8a971183d0def407c0cb21585ccee4497d265331`

## Top-Level Package Surface

- Package name: `private-dao`
- Package version: `0.3.0`
- Dependencies: `21`
- Dev dependencies: `15`
- Scripts: `370`

## Lockfile Coverage

- Cargo lock: `Cargo.lock` with `590` packages
- npm lock: `package-lock.json` with lockfile version `3` and `666` packages
- Yarn lock: `yarn.lock` with `605` entries

## Tracked Integrity Files

- `Cargo.toml` | sha256 `30b256a478b15b9f03c3f8f6b49c16944dd14470f339a09a274619f14db7416e` | bytes `532`
- `Cargo.lock` | sha256 `5c7ef22d9b595205b844cd297b0128079cbbc9247527c848a60f61b092337de2` | bytes `164838`
- `Anchor.toml` | sha256 `1394f6f58180033c5e9184c0ee4fee1f080be78e9ee67ad92b69255c6a0ec964` | bytes `963`
- `package.json` | sha256 `98af66d1d1ed94c730460b0d4bbb6ccc08b7497c2623dde837f2c645b9b0ebc1` | bytes `36553`
- `package-lock.json` | sha256 `fceab9cac6c84b1c98f22e9557d5e0f362539430030014279cb0bf48f5dcca5b` | bytes `336797`
- `yarn.lock` | sha256 `8af8369c0dca26b0e3b05e62cdff152b7190e8de4b1dda1ed744897af5fc723b` | bytes `194257`

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
