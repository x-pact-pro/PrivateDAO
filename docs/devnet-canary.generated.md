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

- primary slot: 463724265
- primary blockhash: `6xQzMwZs5NiTChj2sHWKZGwPDTkyyZf93vP1DjVr74GE`
- primary version latency: 998 ms
- primary blockhash latency: 153 ms
- fallback slot: 421033369
- fallback blockhash: `3PM6RjxF6ghRqVRu4vRiHnJnPYMpBnmY25nht7tsX4ZU`
- fallback version latency: 722 ms
- fallback blockhash latency: 516 ms

## Anchor Checks

- program: `5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx` | exists: yes | owner: `BPFLoaderUpgradeab1e11111111111111111111111` | lamports: 1141440 | data length: 36
- verification-wallet: `4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD` | exists: yes | owner: `11111111111111111111111111111111` | lamports: 17194528633 | data length: 0
- dao: `FZV9KmpeY1B31XvszQypp5T6nQN5C44JDLM4QWBEDvhx` | exists: yes | owner: `5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx` | lamports: 2352480 | data length: 210
- treasury: `AZUroiNeGAjNdD84eEHnAKHHFwqAFmkjr2g1eoF7Ek5c` | exists: yes | owner: `11111111111111111111111111111111` | lamports: 150000000 | data length: 0
- proposal: `AegjmwkX1FknBJMDyH5yM6BMhyHsiUreNtz3d8iz3QrP` | exists: yes | owner: `5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx` | lamports: 10565280 | data length: 1390
- governance-mint: `AZUkprJDfJPgAp7L4z3TpCV3KHqLiA8RjHAVhK9HCvDt` | exists: yes | owner: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb` | lamports: 3563520 | data length: 371
- pdao-token-account: `F4q77ZMJdC7eoEUw3CCR7DbKGTggyExjuMGKBEiM2ct4` | exists: yes | owner: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb` | lamports: 2074080 | data length: 170

## Governance Mint Supply

- mint: `AZUkprJDfJPgAp7L4z3TpCV3KHqLiA8RjHAVhK9HCvDt`
- ui amount: `1000000`
- decimals: `9`
- status: `captured`

## Interpretation

This read-only canary checks live Devnet RPC health and canonical PrivateDAO anchors without mutating protocol state. It exists to provide a sustainable operational signal between heavier multi-wallet stress runs.
