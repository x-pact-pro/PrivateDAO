# BNB Smart Chain Testnet Integration

## Scope

PrivateDAO uses BNB Smart Chain Testnet as an EVM-family network behind the
Kernel. The public product UX remains workflow-first: a customer selects a
product, workflow, and preferred network. The BNB adapter, signer boundary,
RPC, receipt handling, and reconciliation remain internal runtime concerns.

| Field | Value |
|---|---|
| Network | BNB Smart Chain Testnet |
| Chain ID | `97` |
| Native test asset | `tBNB` |
| RPC environment variable | `PDAO_EVM_BNB_TESTNET_RPC_URL` |
| Default public RPC used for evidence | `https://bsc-testnet-dataseed.bnbchain.org` |
| Explorer | `https://testnet.bscscan.com` |
| Adapter | `evm-bnb-testnet` |
| Mainnet execution | Disabled |

## Verified evidence

The committed artifact is:

`packages/evm-verification/deployments/phase-2-e2e-bnb-testnet.json`

It records real BNB Testnet transactions for:

- Record Verification: `0x14d077e2ac39c593e044b1ec274a0e56ea429fd07781463a1a7d04db1205c7c1`
- Blind Verification: `0x1c93bf12e64c6721972ddfcbe282fbad753e7213e04114a4d2786e43c859914b`

The artifact also records contract deployments, block numbers, successful
receipts, wrong-chain rejection, altered-proof rejection, expiry rejection,
and disposable-entry revocation.

The artifact `packages/evm-verification/deployments/organizational-bnb-testnet.json`
now records successful BNB Testnet organizational execution for Treasury,
Confidential Payroll, Governance, and Sealed Auction. Payroll binds an
off-chain batch commitment to a real Maker/Checker payout and settlement
receipt; employee records and policy details remain off-chain. The verifier
also reads the final state of all four organizational contracts and checks
replay rejection with read-only `eth_call`. Verify the organizational receipts
and deployed contract bytecode with:

```bash
npm run verify:bnb:organizational-evidence
```

## BNB rerun safety

The organizational E2E runner covers Treasury, Governance, and Sealed Auction.
The first attempt was correctly rejected before execution because funding was
below the configured minimum. It was later rerun after funding and completed
successfully. Do not rerun it unless a new evidence packet is intended.

Run the read-only readiness check first. It never broadcasts and reports the
public deployer address, chain ID, balance, minimum, and write count without
printing the signer:

```bash
set -a
. /home/x-pact/.privatedao-secret-vault/files/multichain-testnet.env
set +a
npm run verify:bnb:organizational-readiness
```

```bash
set -a
. /home/x-pact/.privatedao-secret-vault/files/multichain-testnet.env
set +a
PDAO_EVM_NETWORK=bnb-testnet \
PDAO_EVM_BNB_TESTNET_RPC_URL=https://bsc-testnet-dataseed.bnbchain.org \
npm run test:evm:organizational
```

The command must be run only with the secret environment loaded locally. Do
not commit the private key or an RPC URL containing credentials.

## Recovery and safety

EVM wallet recovery is tested through the common runtime recovery suite. The
adapter rejects a chain mismatch before signing. Mainnet descriptors remain
disabled, and a BNB Testnet receipt must be confirmed before it is used as
product evidence. A failed RPC, insufficient gas balance, or reverted receipt
must remain a failure state.
