# Supply-Chain Attestation

## Overview

- Generated at: `2026-05-28T03:11:37+03:00`
- Hash algorithm: `sha256`
- Package manager surface: `npm+yarn`
- Aggregate sha256: `57efaf84ab0f5c7fee3b904792af5e58ad546838a55adb6eeb1180edf3f51981`

## Top-Level Package Surface

- Package name: `private-dao`
- Package version: `0.3.0`
- Dependencies: `6`
- Dev dependencies: `15`
- Scripts: `320`

## Lockfile Coverage

- Cargo lock: `Cargo.lock` with `218` packages
- npm lock: `package-lock.json` with lockfile version `3` and `419` packages
- Yarn lock: `yarn.lock` with `386` entries

## Tracked Integrity Files

- `Cargo.toml` | sha256 `556ebaa0c9c63f5fe0380a3f3316fde593fe6215baeb3cb120ee220060fa9a3a` | bytes `367`
- `Cargo.lock` | sha256 `48991a08bd9de2e9346195e7caf6576bf879c1a8e32044e252fb781099c83785` | bytes `57962`
- `Anchor.toml` | sha256 `82978c4d84145c0c6ba7e344453bab78d77c870f58b8dbf91857739052bb6389` | bytes `759`
- `package.json` | sha256 `56229975f6f0feab4e26c32c08f47b250abd9048aaa02b984801289b48b47896` | bytes `30947`
- `yarn.lock` | sha256 `28eddaa9f97d7006610ba3b26e36bc11adac0ecebc0b4e1fc5d0b230ce031b7d` | bytes `115949`
- `package-lock.json` | sha256 `0a1daf1d4d18b1286896d83319376ee87906d3714c32d2bfdbad7e5a48728dc0` | bytes `203069`

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
