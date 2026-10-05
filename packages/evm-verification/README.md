# PrivateDAO EVM Verification

This package contains the Phase 2 Sepolia/Base Sepolia verification contracts.

- `PrivateDaoBlindPolicyGroth16Verifier.sol` is generated from the committed
  `private_dao_blind_policy_overlay_final.zkey` with `snarkjs`.
- `BlindVerificationRegistry.sol` verifies the real Groth16 proof and binds
  its public policy field to the product, schema, record, chain ID, and deployed
  verifier address.
- `RecordVerificationRegistry.sol` anchors a selective-disclosure record digest
  with chain and contract domain separation, expiry, and owner revocation.
- `scripts/run-e2e.mjs` is a real deployment and E2E runner. It requires funded
  testnet credentials and fails closed when they are absent.

## Real testnet E2E

Set these variables outside the repository:

```text
PDAO_EVM_DEPLOYER_PRIVATE_KEY=0x...
PDAO_EVM_ETHEREUM_SEPOLIA_RPC_URL=https://...
PDAO_EVM_BASE_SEPOLIA_RPC_URL=https://...
```

Then run:

```bash
npm run compile:evm-verification
npm run test:evm:phase2
```

The runner checks the RPC chain IDs, deploys independent contracts to the
explicitly selected standard-EVM testnets, generates a Groth16 proof from the committed WASM/zkey, verifies and
anchors it, anchors and verifies a record digest, tests wrong-chain,
altered-proof, cross-network replay, expired-input rejection, and executes
owner revocation against disposable record and blind-proof entries before
asserting that both become invalid. It writes
deployment evidence only after confirmed on-chain transactions.

No Mainnet configuration is accepted by this runner. No public RPC fallback is
used. No mock receipt or synthetic success path exists.

### Base Builder Code attribution

Base Sepolia E2E transactions from the registered deployer wallet use the
official ERC-8021 `dataSuffix` through `ox/erc8021`. The public Builder Code is
stored in `base-builder-code.json` and can be overridden with
`PDAO_BASE_BUILDER_CODE`; `PDAO_BASE_BUILDER_WALLET` must match the wallet that
Base registered for that code. A mismatched wallet fails closed. Checker EOAs
are not attributed unless a separate Builder Code is explicitly configured.

Run the local contract-free check with:

```bash
npm run test:base:builder-code
```

Historical Base evidence predates this wiring and is therefore labelled as not
attributed. Future Base receipts expose the configured Builder Code in the
evidence record. Attribution can be verified in Base's dashboard or by
decoding the transaction input suffix; it does not change contract calldata
semantics.

The generic runner can be selected with `PDAO_EVM_NETWORKS` for Ethereum
Sepolia, Base Sepolia, Arbitrum Sepolia, BNB Testnet, Robinhood Testnet,
Hyperliquid HyperEVM Testnet, or Tempo Testnet. Hyperliquid uses the standard
EVM runner with HYPE gas on chain 998. Tempo uses the native `viem/tempo` client and AlphaUSD fee
token, not the standard EVM gas-balance path. Tempo Testnet is only promoted
after the same contract-write, receipt, proof, expiry, wrong-chain, altered-
proof, and revocation checks pass on the Tempo chain itself.

The organizational Treasury, Governance, and Sealed Auction E2E runner uses
`PDAO_EVM_NETWORK` for one standard-EVM testnet at a time:

```bash
PDAO_EVM_NETWORK=arbitrum-sepolia \
PDAO_EVM_ARBITRUM_SEPOLIA_RPC_URL=https://... \
npm run test:evm:organizational
```

Supported values are `ethereum-sepolia`, `arbitrum-sepolia`, `bnb-testnet`,
`base-sepolia`, `robinhood-testnet`, `hyperliquid-testnet`, and
`tempo-testnet`. Hyperliquid uses HYPE as the native gas asset on chain 998.
Tempo uses the
AlphaUSD TIP-20 token and the tokenized Treasury/Auction contracts because
Tempo rejects native `msg.value` transfers. The runner requires a funded
testnet deployer, writes a network-specific evidence file only after all
receipts and state assertions pass, and rejects unsupported or Mainnet
networks.

## Current evidence boundary

Ethereum Sepolia has a committed `testnet_verified` artifact at
`deployments/phase-2-e2e-ethereum-sepolia.json`. Its record and blind
transactions were independently read from a public Sepolia RPC and returned
successful receipts:

- Record anchor: [`0x96d67851c8567e575ffabaabe506c4104c42edeb464c606be2d64ec73d3fc043`](https://sepolia.etherscan.io/tx/0x96d67851c8567e575ffabaabe506c4104c42edeb464c606be2d64ec73d3fc043)
- Blind proof anchor: [`0x042400bd1be2f7dffeee536e13ade5610d84ee28ca2192ee37b70c93c2fc07a7`](https://sepolia.etherscan.io/tx/0x042400bd1be2f7dffeee536e13ade5610d84ee28ca2192ee37b70c93c2fc07a7)
- Disposable record revocation: [`0x3fcf9b0283ea8a1dc68fd40325d0640c87736e6c0a3d53ecac6c981439443bf2`](https://sepolia.etherscan.io/tx/0x3fcf9b0283ea8a1dc68fd40325d0640c87736e6c0a3d53ecac6c981439443bf2)
- Disposable blind-proof revocation: [`0x7bb8e17d3ffac17f5aec0fd18addb27c8371999e66fb99397def65cd8420e6ce`](https://sepolia.etherscan.io/tx/0x7bb8e17d3ffac17f5aec0fd18addb27c8371999e66fb99397def65cd8420e6ce)

The public verification URLs are application-bound at
`/verify/evm?network=...&type=...&id=...`. The page loads the published
network manifest, calls the configured registry's `isValid(bytes32)` view
method against the selected testnet, and discloses only network, chain ID,
verification ID, and validity state. The JSON manifest under
`/evm-verification/` is the public evidence artifact; the HTML response is
expected to be the application shell because the verification check runs in
the browser. No source record or private inputs are returned.

Ethereum Sepolia and Base Sepolia are application-bound for the two verified
verification products. Hyperliquid HyperEVM and Robinhood remain unverified
until funded real deployments and independent E2E evidence are available. No
capability is upgraded from documentation alone.

Tempo Testnet has a committed `testnet_verified` artifact at
`deployments/phase-2-e2e-tempo-testnet.json`. The run deployed independent
Verifier, Blind Registry, and Record Registry contracts and confirmed the
verification lifecycle on chain 42431. Its application verification route
uses the Tempo RPC and testnet explorer; it does not imply confidential
settlement or Mainnet readiness.
