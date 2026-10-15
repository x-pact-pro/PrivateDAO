# Enterprise Kernel Operational Security Review

Date: 2026-10-15

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
- The patched auction crate passes `cargo check -p privatedao-auction --lib`,
  and `cargo audit --json` reports zero vulnerabilities for the workspace.
- Root `npm audit --omit=dev` reports no production vulnerabilities. The
  separate `apps/web` production lockfile now has the direct critical findings
  remediated (Next, shell-quote, sharp, source-map-js, and brace-expansion),
  but still reports 12 transitive findings in the React Native/MagicBlock
  dependency graph. Those remaining findings are recorded below and are not
  claimed as resolved.

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

The web residuals are isolated to transitive packages pulled by the Solana
wallet adapter and MagicBlock SDK: React Native/Metro, `micromatch`/`braces`,
`@phala/dcap-qvl`, and `elliptic`. The web lockfile uses the patched versions
available without changing application APIs; the remaining upstream findings
have no compatible non-vulnerable upgrade identified in this review.

## Release gate

This review does not authorize Mainnet transactions, wallet migration,
broadcast, or production deployment. The full organization identity and policy
system remains incomplete until its contracts, wallet lifecycle, delegation,
policy compilation, and cross-product E2E evidence are implemented and
independently tested.
