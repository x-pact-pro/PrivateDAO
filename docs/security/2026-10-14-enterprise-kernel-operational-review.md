# Enterprise Kernel Operational Security Review

Date: 2026-10-16

## Scope

This review covers the provider-neutral runtime, product/application boundary,
the Agent Exchange separation, BNB and HyperEVM Testnet evidence, the Zcash
Testnet runner, and the Rust dependency graph used by the Zcash provider.

## Results

- Product modules are checked for Kernel gateway bindings and direct network
  access is rejected by the repository boundary checks.
- Agent Exchange is explicitly classified as `agent-exchange` and is excluded
  from the six-product enterprise evidence set.
- Product gateway reads and submissions now compare the caller-supplied context
  with the context recorded at preparation time, preventing execution-ID
  context substitution across products, capabilities, or networks.
- Zcash remains Testnet-only in the adapter and Mainnet construction is
  rejected. The product runner now has explicit product/capability selection,
  balance-readiness gating, dry-run output, stale-wallet-tip checks, and a
  default broadcast-off path. Foundation tests must not be presented as
  product-specific E2E.
- BNB Testnet and HyperEVM Testnet receipts are independently rechecked against
  chain IDs 97 and 998. HyperEVM evidence is not used for HyperCore claims.
- The actionable Rustls advisories were remediated by updating `rustls` from
  `0.23.45` to `0.23.46` in the lockfile.
- The `rkyv 0.7.46` vulnerability was remediated by a narrowly scoped local
  compatibility patch for `magicblock-delegation-program-api 3.1.0`. The
  patch changes only its `AlignedVec` dependency to `rkyv 0.8.18`; the
  MagicBlock public API and the ephemeral-rollups SDK version remain fixed.
- The patched auction crate passes `cargo check -p privatedao-auction --lib`.
  `cargo audit` reports no Rust vulnerabilities, with maintenance and
  unsoundness warnings recorded below.
- Root `npm audit --omit=dev` reports zero production vulnerabilities. The full
  root audit has only low-severity development findings after the Mocha and
  brace-expansion lockfile refresh. The current `apps/web` production
  lockfile reports three low findings, all in the MagicBlock/Phala/elliptic
  graph; those findings are not claimed as resolved.
- The enterprise evidence generator currently reports 60 rows across six
  products and ten ecosystems: 53 verified and 7 planned. Agent Exchange is
  excluded from those 60 rows. The generated native capability matrix is now
  synchronized with the runtime registry (`238` entries; `91` testnet
  verified, `10` devnet verified, `2` mainnet live).
- The boundary and runtime checks pass: `verify:application-bindings`,
  `test:enterprise-boundary`, `test:runtime`, `test:zcash:gateway-path`, and
  `verify:zcash:network-evidence`. The Zcash evidence verifier still reports
  `productLanesProven: false`.

## Remaining dependency findings

`cargo audit` now reports no vulnerabilities, but still reports maintenance
and unsoundness warnings in transitive Solana/MagicBlock dependencies:

- `libsecp256k1 0.6.0` and `rand 0.7.3` are pulled through
  `solana-secp256k1-recover` and `solana-program` on the same path.
- `atomic-polyfill`, `bincode`, `js-sys`, and `wasm-bindgen` have maintenance
  or yanked-release warnings in the transitive graph.

The local MagicBlock patch is intentionally limited to the vulnerable archive
container dependency. Replacing the remaining Solana cryptography or wire
format dependencies requires an upstream SDK compatibility change and must be
validated with the full Anchor and MagicBlock test suite. No keypairs were
generated and no deployment was performed during this review.

The web residual is isolated to `@phala/dcap-qvl` -> `elliptic`, pulled by the
MagicBlock SDK. `next` and `eslint-config-next` are pinned to the current
compatible 16.4.1 release, so the older Next.js and shell-quote alerts still
visible on the default GitHub branch do not describe this review branch. No
safe patched elliptic release is available for this dependency path; the
suggested MagicBlock downgrade would be a major compatibility change and was
not applied. The earlier ZK-related downgrade proposal remains rejected until
upstream compatibility and proof-vector tests exist.

## Evidence gaps

- Zcash has no independent product receipts in the repository. The isolated
  vault artifacts inspected on 2026-10-16 contain six failed product runs with
  no transaction IDs or receipts, so all seven Zcash enterprise rows remain
  planned rather than promoted.
- Hyperliquid Payroll has no independent organizational payroll deployment
  artifact, so that row remains planned. Existing HyperEVM evidence does not
  prove HyperCore or Payroll execution.
- The enterprise review branch is published as PR #149 and has passing
  `ci-verify` and `agent-exchange-verify` checks. No merge or deployment was
  performed.

## Release gate

This review does not authorize Mainnet transactions, wallet migration,
broadcast, or production deployment. The full organization identity and policy
system remains incomplete until its contracts, wallet lifecycle, delegation,
policy compilation, and cross-product E2E evidence are implemented and
independently tested.
