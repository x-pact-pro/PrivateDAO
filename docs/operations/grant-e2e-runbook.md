# Grant E2E Runbook

This runbook closes only the evidence gaps listed in
`docs/generated/grant-evidence-index.md`. It does not include Agent Exchange,
which has a separate MCP/A2A deployment and payment boundary.

## Evidence rule

An entry is `verified` only when a committed artifact contains a real
transaction hash or independently checkable proof identifier. RPC health,
contract deployment, policy preparation, a dry run, or a synthetic receipt is
not sufficient.

## Required secret injection

Inject secrets through the approved CI/AWS secret store only. Never put them in
`.env`, Git, artifacts, logs, or command arguments.

- EVM signer: `PDAO_EVM_DEPLOYER_PRIVATE_KEY`
- Per-network RPC: the `PDAO_EVM_*_RPC_URL` variable for the selected network
- Zcash wallet/provider configuration: the existing secure local/provider
  secret pattern, with `PDAO_ZCASH_NETWORK=testnet`

The commands below must be run in an isolated testnet job with broadcast
approval and a funded testnet signer. They are not local dry-run commands.

For the local secure-vault layout, run a command through
`scripts/run-with-secure-testnet-env.sh`. It requires both secret files to be
owned by the current user with mode `0600`, loads them only into the child
process, and rejects unsupported networks. It never prints the environment.

## Missing execution lanes

### Solana Devnet

Run the real Kernel/provider workflows for `treasury`, `governance`, and
`auction`, then commit only the public evidence artifact. Keep Agent Exchange
payments and agent identity evidence out of this matrix.

### Hyperliquid HyperEVM Testnet

Set:

```bash
PDAO_EVM_NETWORK=hyperliquid-testnet
```

The secure wrapper can set the network in the shell before invocation:

```bash
PDAO_EVM_NETWORK=hyperliquid-testnet \
  scripts/run-with-secure-testnet-env.sh \
  node scripts/run-evm-organizational-e2e.mjs
```

Run the organizational E2E runner. It must produce a fresh
`packages/evm-verification/deployments/organizational-hyperliquid-testnet.json`
with confirmed receipts for Payroll, Treasury, Governance, and Auction. The
existing HyperEVM Blind/Record artifact cannot prove the other products.

### Zcash Testnet

Run the isolated Zallet/Zaino-backed product runner with the existing Testnet
wallet and explicit broadcast approval. It must produce independent receipts
for Blind Verification, Record Verification, Treasury, Governance, and
Auction. The existing Payroll receipt does not upgrade the other products.

### HyperCore Testnet

HyperCore is not HyperEVM. The current adapter supports health, action
preparation, and guarded signing, but it does not yet implement product
execution or product-specific receipts. A real implementation must add the
native action mapping, confirmation/reconciliation, and six product evidence
records before any row can become `verified`.

## Verification after each run

```bash
npm run build:grant-evidence-index
npm run verify:grant-evidence-index
npm run verify:11-network-e2e
npm run release:verify
```

Do not mark the goal complete unless the evidence index reports zero `ready`
and zero `missing` rows, and every network result is independently checkable.

## Production boundary

Production authority is AWS EC2. GitHub is source control and CI evidence,
not the hosting authority for `privatedao.org`. No DNS, WAF, AWS, or production
deployment change is implied by this runbook.
