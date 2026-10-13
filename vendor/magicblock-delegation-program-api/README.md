# Vendored MagicBlock delegation API

This is the `magicblock-delegation-program-api` 3.1.0 package used by
`ephemeral-rollups-sdk`.

PrivateDAO vendors this package only to pin its `rkyv` dependency to the
patched 0.8 series. The selected PrivateDAO features do not enable the
package's `diff` or `encryption` features, but the dependency is still built
and must remain on a supported security line.

Do not enable additional features here without rerunning `cargo check` and
`cargo audit`.
