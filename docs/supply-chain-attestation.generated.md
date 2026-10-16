# Supply-Chain Attestation

## Overview

- Generated at: `2026-10-16T04:29:53+03:00`
- Hash algorithm: `sha256`
- Package manager surface: `npm+yarn`
- Aggregate sha256: `91e8ea7f8e690db3594256986618c9c65ac242f9a30c373e4b3c7a2266356308`

## Top-Level Package Surface

- Package name: `private-dao`
- Package version: `0.3.0`
- Dependencies: `19`
- Dev dependencies: `14`
- Scripts: `394`

## Lockfile Coverage

- Cargo lock: `Cargo.lock` with `592` packages
- npm lock: `package-lock.json` with lockfile version `3` and `599` packages
- Yarn lock: `yarn.lock` with `539` entries

## Tracked Integrity Files

- `Cargo.toml` | sha256 `682b0d2d4f93a905e1476f061407bbd8191315f1b1e5450d0e5a97b46b02067e` | bytes `622`
- `Cargo.lock` | sha256 `60e9843d209c1fec2ceec73bda230d322aa806d06de1b914bfdee2e221136401` | bytes `165132`
- `Anchor.toml` | sha256 `1394f6f58180033c5e9184c0ee4fee1f080be78e9ee67ad92b69255c6a0ec964` | bytes `963`
- `package.json` | sha256 `dec3b39aa0f2e27ba9dc713a0b1b82207598ecf480c87d139aef11de72d2a6a0` | bytes `38845`
- `yarn.lock` | sha256 `eef6ae437c1307befe884c290c0e726a42e8929df28227b9eec6d0c04bec07bc` | bytes `168514`
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
