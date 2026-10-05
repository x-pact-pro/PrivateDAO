# PrivateDAO EVM Testnet Funding Pack

This pack prepares the remaining EVM testnets for real PrivateDAO E2E runs. It
does not read balances, call RPC endpoints, sign transactions, deploy contracts,
or broadcast anything.

## Public deployer address

Generate the public address from the secure environment only:

```bash
PDAO_EVM_DEPLOYER_PRIVATE_KEY=... npm run prepare:testnet:funding
```

Alternatively, avoid loading a private key and provide a known public address:

```bash
PDAO_EVM_TEST_WALLET=0x... npm run prepare:testnet:funding
```

The script prints only the public address and the funding manifest. It never
prints or writes the private key.

## Recommended funding

These are practical test budgets for the current real E2E runner, including
contract deployment, proof/record writes, negative checks, and revocations.
They are recommendations, not evidence that a wallet is funded.

| Network | Chain ID | Asset | Recommended amount | E2E lane |
| --- | ---: | --- | --- | --- |
| Ethereum Sepolia | 11155111 | ETH | 0.05 | `test:evm:phase2` |
| Base Sepolia | 84532 | ETH | 0.02 | `test:evm:phase2` |
| Arbitrum Sepolia | 421614 | ETH | 0.02 | `test:evm:phase2` |
| Robinhood Testnet | 46630 | ETH | 0.05 | `test:evm:phase2` |
| Hyperliquid HyperEVM Testnet | 998 | HYPE | 0.05 | `test:evm:phase2` |
| Tempo Moderato | 42431 | AlphaUSD | 5 | `test:evm:phase2` |

Tempo is different: the runner uses the official native Tempo client and the
fee token `0x20c0000000000000000000000000000000000001`. It does not use a
native `msg.value` balance for readiness. The runner also uses AlphaUSD for
the tokenized Treasury and auction flows.

## After funding

Set only the RPC variables for the networks being tested, then run one lane at
a time:

```bash
PDAO_EVM_NETWORKS=robinhood-testnet npm run test:evm:phase2
PDAO_EVM_NETWORKS=hyperliquid-testnet npm run test:evm:phase2
PDAO_EVM_NETWORKS=bnb-testnet npm run test:evm:phase2
PDAO_EVM_NETWORKS=tempo-testnet npm run test:evm:phase2
```

The runner requires an explicit HTTPS RPC URL, checks the network chain ID,
and writes deployment evidence only after confirmed on-chain assertions. No
network is promoted to E2E verified from funding or RPC health alone.

## Current boundary

Funding is an external prerequisite. Until a real run produces confirmed
receipts and verification evidence, the networks above remain `FUNDING_REQUIRED`
or `E2E_UNVERIFIED`. Zcash is intentionally excluded from this pack while its
isolated Testnet wallet remains under the separate user-approved flow.
