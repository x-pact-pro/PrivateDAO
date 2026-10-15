# Supply-Chain Attestation

## Overview

- Generated at: `2026-10-16T00:05:42+03:00`
- Hash algorithm: `sha256`
- Package manager surface: `npm+yarn`
- Aggregate sha256: `3067c4416c0287b7a90d57eab68f8d846d0458b41dfbb34f054a715cd8677a5c`

## Top-Level Package Surface

- Package name: `private-dao`
- Package version: `0.3.0`
- Dependencies: `19`
- Dev dependencies: `14`
- Scripts: `390`

## Lockfile Coverage

- Cargo lock: `Cargo.lock` with `592` packages
- npm lock: `package-lock.json` with lockfile version `3` and `599` packages
- Yarn lock: `yarn.lock` with `559` entries

## Tracked Integrity Files

- `Cargo.toml` | sha256 `682b0d2d4f93a905e1476f061407bbd8191315f1b1e5450d0e5a97b46b02067e` | bytes `622`
- `Cargo.lock` | sha256 `6cafcd04f9d1f3cc95481af42a43c7616cabeaa167acd9cf3c21fd9b193d5a39` | bytes `165118`
- `Anchor.toml` | sha256 `1394f6f58180033c5e9184c0ee4fee1f080be78e9ee67ad92b69255c6a0ec964` | bytes `963`
- `package.json` | sha256 `3bdca1cc61f315e454af7691df7c00b35465365cbb6c45830c2f07b391ec8a52` | bytes `38433`
- `yarn.lock` | sha256 `09d372cb017e116cffb132c237fa639632908c3193c073030ea2176e59615226` | bytes `174784`
- `package-lock.json` | sha256 `b27ac51cbbb2d4352040318efa5cb5622769a9eab6b72b52504bdc20b631607e` | bytes `294258`

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
