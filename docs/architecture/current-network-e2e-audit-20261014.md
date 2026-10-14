# PrivateDAO Network E2E Audit

Date: 2026-10-14

## Scope

This audit covers the six commercial products only:

- blind-verification
- record-verification
- payroll
- treasury
- governance
- auction

Agent Exchange is a separate system and is excluded from the commercial
capability matrix.

## Boundary evidence

- Product modules: 11
- Direct product network calls: 0
- Declared application bindings: 107
- Kernel bindings: 107
- Required path: `product -> protocol -> kernel -> adapter`
- Commercial matrix: PASS
- Security remediation gate: PASS
- npm audit: 0 vulnerabilities

## Network status

| Network | Commercial status | Evidence |
| --- | --- | --- |
| Solana Devnet | 6/6 verified | Devnet E2E artifacts |
| Ethereum Sepolia | 6/6 verified | Testnet E2E artifacts |
| Arbitrum Sepolia | 6/6 verified | Testnet E2E artifacts |
| BNB Testnet | 6/6 verified | Testnet E2E artifacts |
| Base Sepolia | 6/6 verified | Testnet E2E artifacts |
| Robinhood Testnet | 6/6 verified | Testnet E2E artifacts |
| Tempo Testnet | 6/6 verified | Testnet E2E artifacts |
| Zcash Testnet | 6/6 verified | Isolated Zallet/Zebra E2E receipts |
| Stellar Testnet | 6/6 verified | Horizon-confirmed product evidence |
| Hyperliquid HyperEVM | 2/6 products verified | Record and blind verification only |
| HyperCore Testnet | 0/6 products verified | Health/readiness only |

## HyperEVM blocker

The real organizational runner is `scripts/run-evm-organizational-e2e.mjs`.
It requires a funded Testnet signer before it can deploy and execute the
Treasury, Payroll, Governance, and Auction flows. The current signer balance
was read-only checked at `0.0091429054 HYPE`; the runner's operational floor
is `0.05 HYPE`. No transaction was sent when the balance was below the floor.

After funding, run:

```bash
PDAO_EVM_NETWORK=hyperliquid-testnet \
PDAO_EVM_HYPERLIQUID_TESTNET_RPC_URL=https://rpc.hyperliquid-testnet.xyz/evm \
bash scripts/run-with-secure-testnet-env.sh npm run test:evm:organizational
npm run verify:hyperliquid:organizational-evidence
```

The verifier requires chain ID 998, successful receipts for every recorded
step, final product state readback, and replay rejection. It does not promote
registry status by itself.

## HyperCore boundary

HyperCore is not HyperEVM. The current adapter supports official Testnet
health, native action validation, and guarded EIP-712 preparation/signing.
Native product execution and product-specific receipt/reconciliation are not
implemented, so all HyperCore commercial rows remain `testnet_ready`.

Do not use HyperEVM contract receipts as HyperCore evidence. A future Native
HyperCore implementation must provide a real supported action, confirmation
response, and product-specific receipt for each promoted capability.

## Agent Exchange production check

The production MCP endpoint was checked as an independent surface:

- `initialize`: HTTP 200
- `notifications/initialized`: HTTP 202 with no response body
- `tools/list`: HTTP 200, 20 tools
- read-only `verify_basic` call: HTTP 200, JSON-RPC compliant result

Production URLs:

- `https://privatedao.org/`
- `https://agents.privatedao.org/mcp`

## Security notes

RustSec reports only allowed upstream/transitive warnings from the
Solana/MagicBlock dependency tree (`atomic-polyfill`, `bincode`,
`libsecp256k1`, `rand 0.7`, `js-sys`, and `wasm-bindgen`). They are not direct
PrivateDAO dependencies and were not upgraded speculatively because of the
Solana compatibility surface. The existing remediation record is in
`docs/security/2026-10-rust-dependency-audit.md`.

## Current conclusion

The Kernel/provider boundary and Agent Exchange separation are verified. The
commercial matrix is not fully complete until HyperEVM receives fresh funded
evidence and HyperCore has a genuine Native product execution path.
