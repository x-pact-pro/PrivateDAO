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
- `npm audit --omit=dev` reports no production vulnerabilities when the Node
  dependency tree is installed.

## Remaining dependency findings

`cargo audit` still reports one vulnerability and maintenance warnings in
transitive Solana/MagicBlock dependencies:

- `rkyv 0.7.46` is pulled through `magicblock-delegation-program-api` and
  `ephemeral-rollups-sdk` by `programs/privatedao-auction`.
- `libsecp256k1 0.6.0` and `rand 0.7.3` are pulled through
  `solana-secp256k1-recover` and `solana-program` on the same path.
- `atomic-polyfill`, `bincode`, `js-sys`, and `wasm-bindgen` have maintenance
  or yanked-release warnings in the transitive graph.

The current audit result is one vulnerability and six allowed warnings. The
repository has no direct `rkyv` dependency, so a safe fix requires an upstream
MagicBlock/Solana compatibility upgrade rather than a direct override.

These cannot be safely replaced with an arbitrary direct dependency without
validating the Anchor and MagicBlock ABI compatibility. The next remediation
must upgrade the upstream Solana/MagicBlock stack as a compatibility change,
then rerun the full program build and tests. No keypairs were generated and no
deployment was performed during this review.

## Release gate

This review does not authorize Mainnet transactions, wallet migration,
broadcast, or production deployment. The full organization identity and policy
system remains incomplete until its contracts, wallet lifecycle, delegation,
policy compilation, and cross-product E2E evidence are implemented and
independently tested.
