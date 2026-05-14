# Supply-Chain Attestation

## Overview

- Generated at: `2026-05-14T23:22:47+03:00`
- Hash algorithm: `sha256`
- Package manager surface: `npm+yarn`
- Aggregate sha256: `287d88aee3627c2454ae0e21cb955fca08b6d1a74f25dcbe0ccc620ded5adc8f`

## Top-Level Package Surface

- Package name: `private-dao`
- Package version: `0.3.0`
- Dependencies: `4`
- Dev dependencies: `14`
- Scripts: `290`

## Lockfile Coverage

- Cargo lock: `Cargo.lock` with `217` packages
- npm lock: `package-lock.json` with lockfile version `3` and `346` packages
- Yarn lock: `yarn.lock` with `317` entries

## Tracked Integrity Files

- `Cargo.toml` | sha256 `6183b506b7f0e0e9ba1a97b2597f218a96ec1c9924bcc3dc78f94f08601ff1b2` | bytes `331`
- `Cargo.lock` | sha256 `7531013dda172fc3faf015a98acf0cef1b8fa7f393024cbf23b6f998371315f1` | bytes `57835`
- `Anchor.toml` | sha256 `bf5a0ec9663df3f2c7c655c697495a7a77dac6a03361cb8ff7950752cf1ddab3` | bytes `552`
- `package.json` | sha256 `b6892373d11fa729d38d5531da92e8eb0b06b043ab27e0d27fab01fb6e975ece` | bytes `27804`
- `yarn.lock` | sha256 `4fc221a0c2d51012b568cf69840581756506c220c3d86601307325c294c1c57f` | bytes `94062`
- `package-lock.json` | sha256 `c38ddfe1742f190f9c83c58ff4bfee6f9ba74bc6eaf1153484eebc1031bb8db1` | bytes `166993`

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
