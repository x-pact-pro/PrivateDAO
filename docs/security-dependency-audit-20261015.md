# Dependency Security Audit - 2026-10-15

## Scope

- Repository: `x-pact-pro/PrivateDAO`
- Branch: `codex/live-enterprise-evidence`
- Mainnet execution: disabled
- Production audit: `npm audit --omit=dev --audit-level=high`
- Full npm audit: `npm audit --audit-level=high --json`
- Rust audit: `cargo audit --json`

## Current Results

- Production npm dependencies: `0` vulnerabilities.
- Full npm graph after the Poseidon migration: `0` critical, `0` high, `0` moderate, `2` low.
- Rust graph: `0` reported vulnerabilities; `cargo audit` still reports upstream maintenance/yanked-version warnings documented below.
- CI `ci-verify`: PASS on the reviewed branch.
- CI `agent-exchange-verify`: PASS on the reviewed branch.

## Remaining Low Findings

The remaining npm findings are development-only test-runner findings:

- `mocha` -> `diff` (low denial-of-service advisory in a test-only dependency).

The former `circomlibjs` -> `ethers 5.x` -> `elliptic` chain was removed. `@iden3/js-crypto@1.3.3` is now used for the BN254 Poseidon primitive, with `@noble/hashes@2.2.0` pinned to satisfy its peer dependency. Its Poseidon implementation is explicitly identified as circomlib-compatible, and five fixed compatibility vectors pass.

The remaining `mocha` finding cannot be fixed by the currently compatible `ts-mocha@10.1.0` toolchain without a major test-runner migration. It does not ship in production runtime dependencies.

## Rust Upstream Warnings

`cargo audit` reports no Rust advisory classified as a vulnerability for the current graph. It does report four upstream warnings: `atomic-polyfill` and `bincode` are unmaintained, `libsecp256k1` is unmaintained, and `rand 0.7.3` has an unsoundness advisory. The first and third paths originate in Anchor/Solana and Ephemeral Rollups; the `rand` path is through `libsecp256k1` and Solana's recovery stack. `js-sys` and `wasm-bindgen` are yanked versions pulled through the Zcash/rollup dependency graph.

These are not safe local patch candidates: replacing them requires upstream Anchor/Solana, Ephemeral Rollups, or librustzcash-compatible releases and a full Rust, program, and Zcash regression run. No direct application dependency pins these crates, and no lockfile-only override was applied.

## Release Boundary

No high, moderate, or critical npm findings remain in the current graph, the production dependency gate is clean, and the legacy ZK dependency line has been migrated with fixed Poseidon vectors. The two remaining low findings are limited to the development test runner.
