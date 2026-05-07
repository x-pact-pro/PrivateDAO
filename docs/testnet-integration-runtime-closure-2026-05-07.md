# Testnet Integration Runtime Closure - 2026-05-07

This packet records the current live integration state after refreshing the PrivateDAO Solana Testnet lifecycle and AWS read-node configuration.

## Fresh Testnet Governance Proof

- Program: `EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva`
- Operator: `4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD`
- DAO: `2gDRTWaNRjiySVdvqoSXnnUYF8CFSaJUxwG6LBg8P1gG`
- Proposal: `27FtqDFgsKTqQXUSTPGatffYiQ5mQbuq4PFS4AzHX4uR`
- Execute tx: [`3eeRGRZK5V3THvYj3AodnFB5CfdZ3PNrpywPCpjoHfxsXNBCqsZMxwW9XznbXeL1XiNNzgMvQU924MNE7b5CTnE9`](https://solscan.io/tx/3eeRGRZK5V3THvYj3AodnFB5CfdZ3PNrpywPCpjoHfxsXNBCqsZMxwW9XznbXeL1XiNNzgMvQU924MNE7b5CTnE9?cluster=testnet)
- Transaction count in lifecycle: `9`
- Treasury delta lamports: `5000000`
- Recipient delta lamports: `5000000`

## Live Endpoint Status

- health: `ok` · HTTP `200` · https://api.privatedao.org/api/v1/health
- qvac: `ok` · HTTP `200` · https://api.privatedao.org/api/v1/qvac/runtime-proof
- duneBalances: `ok` · HTTP `200` · https://api.privatedao.org/api/v1/dune/balances?wallet=2oq56CUPwsnxbHAdmbQswFR3DWAQ3EBinrNDNSAJMTTS
- duneTransactions: `ok` · HTTP `200` · https://api.privatedao.org/api/v1/dune/transactions?wallet=2oq56CUPwsnxbHAdmbQswFR3DWAQ3EBinrNDNSAJMTTS
- goldRush: `ok` · HTTP `200` · https://api.privatedao.org/api/v1/goldrush/query
- zerion: `ok` · HTTP `200` · https://api.privatedao.org/api/v1/zerion/portfolio?wallet=2oq56CUPwsnxbHAdmbQswFR3DWAQ3EBinrNDNSAJMTTS
- umbraRelayer: `ok` · HTTP `200` · https://api.privatedao.org/api/v1/umbra/relayer/info
- magicblock: `ok` · HTTP `200` · https://api.privatedao.org/api/v1/magicblock/health
- cloakIntent: `ok` · HTTP `200` · https://api.privatedao.org/api/v1/private-settlement/intent
- umbraIntent: `ok` · HTTP `200` · https://api.privatedao.org/api/v1/private-settlement/intent
- torque: `not-ok` · HTTP `502` · https://api.privatedao.org/api/v1/torque/custom-event

## Truth Boundaries

- umbra: Live relayer info and intent receipt are proven. Full Umbra claim submission still requires SDK-generated proof_account_data and UTXO slot data from a real Umbra pool claim.
- cloak: Read-node accepts POST and returns a deterministic Testnet intent receipt. No CLOAK_RELAY_URL is configured, so this is not a live Cloak relay execution.
- torque: Read-node is configured and reaches Torque, but the submitted event name is not registered for this API key unless Torque dashboard configuration is updated.
- zkVerifier: ZK proof anchors exist in prior Devnet evidence. Full on-chain verifier CPI remains a separate integration boundary.

## Source Files

- `docs/testnet-lifecycle-rehearsal-2026-05-07.json`
- `docs/testnet-lifecycle-rehearsal-2026-05-07.md`
- `docs/testnet-integration-runtime-closure-2026-05-07.json`
