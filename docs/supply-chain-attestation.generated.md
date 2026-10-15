# Supply-Chain Attestation

## Overview

- Generated at: `2026-10-15T02:41:17+03:00`
- Hash algorithm: `sha256`
- Package manager surface: `npm+yarn`
- Aggregate sha256: `aedf8821bb1fb1ed206362b284559d3019d8c818b431af5a4e7f7a36d8c5ed8d`

## Top-Level Package Surface

- Package name: `private-dao`
- Package version: `0.3.0`
- Dependencies: `17`
- Dev dependencies: `15`
- Scripts: `374`

## Lockfile Coverage

- Cargo lock: `Cargo.lock` with `592` packages
- npm lock: `package-lock.json` with lockfile version `3` and `648` packages
- Yarn lock: `yarn.lock` with `614` entries

## Tracked Integrity Files

- `Cargo.toml` | sha256 `682b0d2d4f93a905e1476f061407bbd8191315f1b1e5450d0e5a97b46b02067e` | bytes `622`
- `Cargo.lock` | sha256 `6cafcd04f9d1f3cc95481af42a43c7616cabeaa167acd9cf3c21fd9b193d5a39` | bytes `165118`
- `Anchor.toml` | sha256 `1394f6f58180033c5e9184c0ee4fee1f080be78e9ee67ad92b69255c6a0ec964` | bytes `963`
- `package.json` | sha256 `8f1f12c65af10a1721d58c16dc0cfa676a507ac7d1e6dc4b62e0c1a659410382` | bytes `36702`
- `yarn.lock` | sha256 `da5b52f780e55d5213c6bf7246a7abee671eb6c6c49c0c7c6f1b41de084e6d48` | bytes `196445`
- `package-lock.json` | sha256 `6f48ffdc2b31be3cc32ba04b373e69ee5d9cae8f13d90dcf36a0dbce95d36cec` | bytes `328063`

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
