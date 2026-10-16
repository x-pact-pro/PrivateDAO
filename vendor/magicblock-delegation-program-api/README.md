# PrivateDAO MagicBlock Compatibility Patch

This is a narrowly scoped compatibility copy of
`magicblock-delegation-program-api` `3.1.0` from the upstream MagicBlock
delegation-program release.

The only dependency change is `rkyv` from the vulnerable `0.7.x` line to
`0.8.18`. The crate is used by the existing `ephemeral-rollups-sdk 0.17.3`
path and keeps the same public API. It is patched locally until MagicBlock
publishes a compatible upstream release.

Validation performed in this repository:

- `cargo check -p privatedao-auction --lib`
- `cargo audit --json` with zero vulnerabilities reported

Do not add application logic or cryptography to this compatibility copy.
