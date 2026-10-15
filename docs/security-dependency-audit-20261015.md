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
- Rust graph: `0` vulnerabilities.
- CI `ci-verify`: PASS on the reviewed branch.
- CI `agent-exchange-verify`: PASS on the reviewed branch.

## Remaining Low Findings

The remaining npm findings are development-only test-runner findings:

- `mocha` -> `diff` (low denial-of-service advisory in a test-only dependency).

The former `circomlibjs` -> `ethers 5.x` -> `elliptic` chain was removed. `@iden3/js-crypto@1.3.3` is now used for the BN254 Poseidon primitive, with `@noble/hashes@2.2.0` pinned to satisfy its peer dependency. Its Poseidon implementation is explicitly identified as circomlib-compatible, and five fixed compatibility vectors pass.

The remaining `mocha` finding cannot be fixed by the currently compatible `ts-mocha@10.1.0` toolchain without a major test-runner migration. It does not ship in production runtime dependencies.

## Release Boundary

No high, moderate, or critical npm findings remain in the current graph, the production dependency gate is clean, and the legacy ZK dependency line has been migrated with fixed Poseidon vectors. The two remaining low findings are limited to the development test runner.
