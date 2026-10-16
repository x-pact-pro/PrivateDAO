# Cryptographic Dependency Boundary

PrivateDAO keeps the production ZK path separate from the browser TEE path.

## Verified boundary

- Root Poseidon provider: `@iden3/js-crypto@1.3.3`.
- Root hash peer: `@noble/hashes@2.2.0`.
- Web proof helpers: `poseidon-lite@0.2.1` and `snarkjs`.
- No `circomlibjs` or `ethers` package is present in either lockfile graph.
- No Poseidon/Groth16 package above depends on `elliptic`.
- The only remaining web `elliptic@6.6.1` path is:
  `@magicblock-labs/ephemeral-rollups-sdk@0.17.3` ->
  `@phala/dcap-qvl@0.3.9` -> `elliptic`.

## Why this is not auto-downgraded

`npm audit fix` proposes MagicBlock `0.8.5`, which is a major downgrade from
the active `0.17.3` integration. The currently published Phala QVL upgrade
still retains the `elliptic` dependency. Replacing it with another curve
library would be a cryptographic implementation migration and requires
upstream compatibility plus complete proof and attestation vector testing.

That change is intentionally not performed by an automated dependency fix.
The current mitigation is containment: the residual is TEE-only, excluded from
the Poseidon/Groth16 graph, and guarded by
`scripts/test-zk-dependency-boundary.mjs`.

## Acceptance rule

Any future upgrade that changes MagicBlock, Phala QVL, elliptic, Poseidon, or
Groth16 dependencies must rerun the boundary test, ZK proof vectors, TEE
attestation checks, and the web production build before it is accepted.
