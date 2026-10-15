# Supply-Chain Attestation

## Overview

- Generated at: `2026-10-15T23:04:21+03:00`
- Hash algorithm: `sha256`
- Package manager surface: `npm+yarn`
- Aggregate sha256: `9ced5c9a3820217f4f9b5b58fa5095b8bd13d0393b3dd95c1ae7477f8bfad1e8`

## Top-Level Package Surface

- Package name: `private-dao`
- Package version: `0.3.0`
- Dependencies: `19`
- Dev dependencies: `14`
- Scripts: `388`

## Lockfile Coverage

- Cargo lock: `Cargo.lock` with `592` packages
- npm lock: `package-lock.json` with lockfile version `3` and `599` packages
- Yarn lock: `yarn.lock` with `614` entries

## Tracked Integrity Files

- `Cargo.toml` | sha256 `682b0d2d4f93a905e1476f061407bbd8191315f1b1e5450d0e5a97b46b02067e` | bytes `622`
- `Cargo.lock` | sha256 `6cafcd04f9d1f3cc95481af42a43c7616cabeaa167acd9cf3c21fd9b193d5a39` | bytes `165118`
- `Anchor.toml` | sha256 `1394f6f58180033c5e9184c0ee4fee1f080be78e9ee67ad92b69255c6a0ec964` | bytes `963`
- `package.json` | sha256 `0f3a9433549fedf1ae2876a07915e6cf8dce8bbdc26dbadae9a98f3f9ad3bc5a` | bytes `38232`
- `yarn.lock` | sha256 `da5b52f780e55d5213c6bf7246a7abee671eb6c6c49c0c7c6f1b41de084e6d48` | bytes `196445`
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
