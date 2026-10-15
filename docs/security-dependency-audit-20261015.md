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
- CI `agent-exchange-verify`: PASS on commit `4644bc37e`.
- CI `ci-verify`: PASS on commit `4644bc37e`.

## Remaining Low Findings

The remaining npm findings are development-only test-runner findings:

- `mocha` -> `diff` (low denial-of-service advisory in a test-only dependency).

The former `circomlibjs` -> `ethers 5.x` -> `elliptic` chain was removed. `@iden3/js-crypto@1.3.3` is now used for the BN254 Poseidon primitive, with `@noble/hashes@2.2.0` pinned to satisfy its peer dependency. Its Poseidon implementation is explicitly identified as circomlib-compatible, and five fixed compatibility vectors pass.

The boundary is enforced by `npm run test:zk-dependency-boundary`: it fails if
the legacy packages return to the root graph or if the pinned Poseidon
provider drifts. This is a guard, not a cryptographic substitute for the
upstream TEE dependency review described below.

The remaining `mocha` finding cannot be fixed by the currently compatible `ts-mocha@10.1.0` toolchain without a major test-runner migration. It does not ship in production runtime dependencies.

## Web Dependency Graph

The web application has a separate `apps/web/package-lock.json` and must be
audited independently. Its current audit reports 16 findings: 3 low and 13
high. The findings are not the removed Poseidon chain.

- `elliptic` is pulled by `@phala/dcap-qvl@0.3.9`, which is pulled by
  `@magicblock-labs/ephemeral-rollups-sdk@0.17.3`. The current MagicBlock
  release still declares that dependency; a lockfile override would change an
  attestation dependency without an upstream compatibility guarantee.
- `sharp` is pulled by `@xenova/transformers`; the web lockfile pins the
  current compatible override, but the upstream advisory remains until a
  patched compatible release is available.
- `shell-quote`, `source-map-js`, `braces`, `brace-expansion`, and the
  `fast-glob`/`micromatch` chain are transitive tooling or framework paths.
  Existing compatible overrides are retained; no unsafe downgrade was added.
- `next` and the React Native/Metro packages are framework or optional-wallet
  dependency paths. They require a coordinated framework upgrade and a full
  web build/browser regression run, not a selective lockfile substitution.

The web audit is therefore **not clean**. The production claim is limited to
the root runtime graph; it must not be generalized to the web graph until the
upstream fixes are released and validated.

`npm audit fix --prefix apps/web --package-lock-only --dry-run --json` proposed
zero lockfile changes and left the same 16 findings. The available automated
Next fix is a major downgrade to `eslint-config-next@14.2.35`, and the available
MagicBlock fix is a major move to `@magicblock-labs/ephemeral-rollups-sdk@0.8.5`.
Neither is an acceptable security migration without a coordinated framework,
wallet, TEE-attestation, and browser-regression review.

## Rust Upstream Warnings

`cargo audit` reports no Rust advisory classified as a vulnerability for the current graph. It does report four upstream warnings: `atomic-polyfill` and `bincode` are unmaintained, `libsecp256k1` is unmaintained, and `rand 0.7.3` has an unsoundness advisory. The first and third paths originate in Anchor/Solana and Ephemeral Rollups; the `rand` path is through `libsecp256k1` and Solana's recovery stack. `js-sys` and `wasm-bindgen` are yanked versions pulled through the Zcash/rollup dependency graph.

These are not safe local patch candidates: replacing them requires upstream Anchor/Solana, Ephemeral Rollups, or librustzcash-compatible releases and a full Rust, program, and Zcash regression run. No direct application dependency pins these crates, and no lockfile-only override was applied.

## Release Boundary

The root production dependency gate is clean, and the legacy ZK dependency
line has been migrated with fixed Poseidon vectors. The separate web graph
still has unresolved upstream findings listed above, so the repository-wide
security review remains open.
