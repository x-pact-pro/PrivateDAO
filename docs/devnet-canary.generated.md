# Devnet Canary Report

- network: devnet
- program id: `5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx`
- primary rpc: `https://api.devnet.solana.com`
- fallback rpc: `https://solana-rpc.rpcfast.com?api_key=ejQYiCn3yUFJUYyG3yw6C72hZNDzxoSFLy7VX9ETQOJOSFwQK2eh0Dl0XXAdU2uv`
- primary healthy: yes
- fallback healthy: yes
- anchor accounts present: yes
- unexpected failures: 0

## RPC Health

- primary slot: 464664596
- primary blockhash: `DvexQKLSAyKZX5Mqf8bvMLALwxVZVxBZsZ1AXV1qkvDB`
- primary version latency: 1017 ms
- primary blockhash latency: 186 ms
- fallback slot: 421925996
- fallback blockhash: `67XrpdDxVViWzGHfXSSd1UM17bdEtRsB5v1Y7ARxLP62`
- fallback version latency: 829 ms
- fallback blockhash latency: 359 ms

## Anchor Checks

- program: `5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx` | exists: yes | owner: `BPFLoaderUpgradeab1e11111111111111111111111` | lamports: 1141440 | data length: 36
- verification-wallet: `4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD` | exists: yes | owner: `11111111111111111111111111111111` | lamports: 27196764058 | data length: 0
- dao: `FZV9KmpeY1B31XvszQypp5T6nQN5C44JDLM4QWBEDvhx` | exists: yes | owner: `5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx` | lamports: 2352480 | data length: 210
- treasury: `AZUroiNeGAjNdD84eEHnAKHHFwqAFmkjr2g1eoF7Ek5c` | exists: yes | owner: `11111111111111111111111111111111` | lamports: 150000000 | data length: 0
- proposal: `AegjmwkX1FknBJMDyH5yM6BMhyHsiUreNtz3d8iz3QrP` | exists: yes | owner: `5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx` | lamports: 10565280 | data length: 1390
- governance-mint: `AZUkprJDfJPgAp7L4z3TpCV3KHqLiA8RjHAVhK9HCvDt` | exists: yes | owner: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb` | lamports: 3563520 | data length: 371

## Governance Mint Supply

- mint: `AZUkprJDfJPgAp7L4z3TpCV3KHqLiA8RjHAVhK9HCvDt`
- ui amount: `1000000`
- decimals: `9`
- status: `captured`

## Interpretation

This read-only canary checks live legacy Devnet RPC health and canonical archived PrivateDAO anchors without mutating protocol state. The current PDAO Token-2022 mint is on Testnet, so it is intentionally excluded from this legacy Devnet account-presence gate.
