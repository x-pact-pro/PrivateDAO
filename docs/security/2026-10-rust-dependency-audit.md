# Rust Dependency Security Audit

Date: 2026-10-13

## Scope

The Solana auction program and its `ephemeral-rollups-sdk` dependency tree
were checked with `cargo check --locked` and `cargo audit`.

## Remediation

`magicblock-delegation-program-api` 3.1.0 previously pulled `rkyv` 0.7.46,
which is affected by RustSec advisory RUSTSEC-2026-0235. The package is now
vendored under `vendor/magicblock-delegation-program-api` with the dependency
constraint raised to the patched `rkyv` 0.8 series. Cargo resolves 0.8.18 in
the lockfile.

The patched dependency was compiled successfully for
`programs/privatedao-auction`.

## Remaining audit warnings

`cargo audit` reports unmaintained or yanked transitive dependencies from the
Solana/MagicBlock toolchain (`atomic-polyfill`, `bincode`, `libsecp256k1`,
`rand 0.7`, `js-sys`, and `wasm-bindgen`). They are not direct PrivateDAO
dependencies. Upgrading them independently would require an upstream
Solana/MagicBlock compatibility change and was not applied speculatively.

Any future feature enabling MagicBlock `diff` or `encryption` must be treated
as a new security review because it expands the archive and cryptographic
surface.
