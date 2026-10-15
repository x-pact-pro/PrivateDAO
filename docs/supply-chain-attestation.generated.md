# Supply-Chain Attestation

## Overview

- Generated at: `2026-10-15T06:46:33+03:00`
- Hash algorithm: `sha256`
- Package manager surface: `npm+yarn`
- Aggregate sha256: `1309f92af41e983c2cf9c941a563cde87fcb6e362586687fe530e5f059d4c82c`

## Top-Level Package Surface

- Package name: `private-dao`
- Package version: `0.3.0`
- Dependencies: `17`
- Dev dependencies: `15`
- Scripts: `380`

## Lockfile Coverage

- Cargo lock: `Cargo.lock` with `592` packages
- npm lock: `package-lock.json` with lockfile version `3` and `646` packages
- Yarn lock: `yarn.lock` with `614` entries

## Tracked Integrity Files

- `Cargo.toml` | sha256 `682b0d2d4f93a905e1476f061407bbd8191315f1b1e5450d0e5a97b46b02067e` | bytes `622`
- `Cargo.lock` | sha256 `6cafcd04f9d1f3cc95481af42a43c7616cabeaa167acd9cf3c21fd9b193d5a39` | bytes `165118`
- `Anchor.toml` | sha256 `1394f6f58180033c5e9184c0ee4fee1f080be78e9ee67ad92b69255c6a0ec964` | bytes `963`
- `package.json` | sha256 `be75f208a1c8a32921f0ef4acd4df188706a0594aa62ed3ca6e9181a2b60d174` | bytes `37472`
- `yarn.lock` | sha256 `da5b52f780e55d5213c6bf7246a7abee671eb6c6c49c0c7c6f1b41de084e6d48` | bytes `196445`
- `package-lock.json` | sha256 `94e4576902ff4bd1070bd7fac76e18ce7a1669b99d7b6a2a1d27742cfedf97ea` | bytes `328219`

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
