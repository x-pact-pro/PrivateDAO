# Supply-Chain Attestation

## Overview

- Generated at: `2026-10-14T21:43:13+03:00`
- Hash algorithm: `sha256`
- Package manager surface: `npm+yarn`
- Aggregate sha256: `06cc7a3714781c8f93a4962ecc94a9b2cc16a4a49635fadd91ebae30f2bd50fc`

## Top-Level Package Surface

- Package name: `private-dao`
- Package version: `0.3.0`
- Dependencies: `16`
- Dev dependencies: `15`
- Scripts: `361`

## Lockfile Coverage

- Cargo lock: `Cargo.lock` with `590` packages
- npm lock: `package-lock.json` with lockfile version `3` and `621` packages
- Yarn lock: `yarn.lock` with `584` entries

## Tracked Integrity Files

- `Cargo.toml` | sha256 `30b256a478b15b9f03c3f8f6b49c16944dd14470f339a09a274619f14db7416e` | bytes `532`
- `Cargo.lock` | sha256 `5c7ef22d9b595205b844cd297b0128079cbbc9247527c848a60f61b092337de2` | bytes `164838`
- `Anchor.toml` | sha256 `1394f6f58180033c5e9184c0ee4fee1f080be78e9ee67ad92b69255c6a0ec964` | bytes `963`
- `package.json` | sha256 `d07f9bfec5feced2eb94fefc266fdc5d62497109ecff5b667e5b26b7a5a649a2` | bytes `35550`
- `yarn.lock` | sha256 `d5beb1f2f677016c69b265269703912b4c77cfc4670786ccc42014bd5521a590` | bytes `189199`
- `package-lock.json` | sha256 `a154762360d1e264e390ad33d26de7faef2214efa34ae61a7711234568f6b4c7` | bytes `316495`

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
