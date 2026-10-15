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
- Full npm graph: `0` critical, `0` high, `0` moderate, `17` low.
- Rust graph: `0` vulnerabilities.
- CI `ci-verify`: PASS on the reviewed branch.
- CI `agent-exchange-verify`: PASS on the reviewed branch.

## Remaining Low Findings

The remaining npm findings are development or transitive cryptographic-toolchain findings:

- `circomlibjs` -> `ethers 5.x` -> `elliptic`.
- Related `@ethersproject/*` packages used by the same ZK dependency line.

The available automated fix proposes a major downgrade of `circomlibjs`, not a compatible security upgrade. It was not applied because it could change Poseidon/proof behavior. A future replacement requires dedicated proof-vector, payroll, EVM verification, and Kernel regression tests.

## Release Boundary

No high, moderate, or critical npm findings remain in the current graph, and the production dependency gate is clean. The repository is not described as vulnerability-free until the legacy ZK dependency line is migrated and its proof behavior is revalidated.
