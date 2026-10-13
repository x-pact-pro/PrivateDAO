# PrivateDAO Architecture and Operational Security Review

Date: 2026-10-13

## Repository boundary

The reviewed source is the canonical live checkout:
`source/commercial-core`.

PrivateDAO Agent Exchange is an independent Lambda/package boundary under
`integrations/agent-exchange-lambda`. The six commercial products are owned by
`packages/privatedao-runtime` and enter network execution through the Kernel
Gateway and family/network adapters. Agent Exchange is not a commercial
product binding and its Solana marketplace/payment rail is not reused as a
product settlement adapter.

## Required execution boundary

The enforced product path is:

`product -> protocol capability/policy -> Kernel Gateway -> family adapter -> network adapter -> provider/wallet -> RPC/node -> receipt/reconciliation`

The current static boundary verifier reports 11 product modules with zero
direct network calls and 107 declared Kernel bindings. The application
binding verifier reports seven application products: six commercial products
plus the separately bounded Agent Exchange surface.

## Network evidence

The commercial matrix currently covers six products across the declared
network IDs. Eight networks have complete product-specific Testnet/Devnet
evidence: Solana Devnet, Ethereum Sepolia, Arbitrum Sepolia, BNB Testnet,
Base Sepolia, Robinhood Testnet, Tempo Testnet, and Stellar Testnet.

The verifier intentionally reports these remaining gaps:

- Zcash Testnet: six product-specific receipts are missing; a Payroll receipt
  alone does not prove the other products.
- HyperEVM/Testnet: Payroll, Treasury, Governance, and Auction need fresh
  funded receipts.
- HyperCore/Testnet: native product submission, confirmation, and receipt
  reconciliation are not implemented. HyperEVM evidence must not be reused as
  HyperCore evidence.

These are evidence gaps, not reasons to downgrade the products to a fake
success state.

## Security checks

The following checks passed at review time:

- Agent Exchange tests: 71/71.
- JavaScript dependency audit: 0 vulnerabilities.
- tracked-secret verification.
- security remediation verification.
- security-boundary verification.
- production/operations surface verification.
- application bindings and product-to-Kernel boundary verification.
- Rust auction crate check and test with `--locked`.

The execution-boundary review also closed two high-risk configuration paths:

- Kernel Gateway execution routes now fail closed when no gateway token is
  configured. Unauthenticated mode is explicit and rejected in production.
  Caller-supplied role headers/body fields are ignored; the gateway role is
  operator-configured through `PDAO_KERNEL_GATEWAY_ROLE`.
- Server-side EVM signing now requires explicit contract and function
  allowlists through `PDAO_KERNEL_EVM_ALLOWED_CONTRACTS` and
  `PDAO_KERNEL_EVM_ALLOWED_FUNCTIONS`. Browser signing remains a separate
  wallet path. This prevents a generic gateway request from selecting an
  arbitrary contract/function when server signing is enabled.
- The legacy HMAC license helper no longer has a repository-known fallback
  secret; it fails closed unless `PD_LICENSE_SIGNING_SECRET` is injected.
- Enterprise license issuance now requires the control-plane issuer secret;
  an unset `PRIVADAO_LICENSE_ISSUER_SECRET` cannot silently disable request
  authorization.
- The primary-host Caddy edge injects the host-local gateway token on every
  read-node API proxy route; the token is not exposed to browser code.
- Production Gateway CORS now defaults to `https://privatedao.org`; wildcard
  origin is limited to explicit development/test modes.
- `verify-remote-primary-host.sh` now fails unless an unauthenticated
  `/api/v1/executions/prepare` request returns HTTP 401.
- Hyperliquid HyperEVM organizational E2E now enforces a `0.05 HYPE`
  operational funding floor to avoid starting a multi-transaction run with
  insufficient gas.

The corresponding regression coverage passes for unauthorized execution,
browser readiness, EVM allowlist rejection/acceptance, and the complete
runtime typecheck. Production must provide a non-empty
`PDAO_KERNEL_GATEWAY_TOKEN` and the EVM allowlists before enabling server-side
EVM execution.

The current live API was checked separately and still reflects the previous
deployment: an unauthenticated prepare request returned HTTP 400 rather than
the required 401, and the live CORS headers still advertised the old role
header. The source fixes are committed but require the normal production
deployment process before the remote verification can pass.

The previously vulnerable `rkyv 0.7.46` dependency was replaced by the
patched 0.8 series through the vendored MagicBlock API package. Cargo now
resolves `rkyv 0.8.18`.

Cargo audit still reports upstream maintenance/yanked-package warnings in the
Solana/MagicBlock dependency tree. They are not direct PrivateDAO dependencies
and were not upgraded independently because doing so would change the
upstream compatibility surface. They remain release-review items.

## Release boundary

This review did not deploy infrastructure, change DNS/WAF, enable wallet
broadcasting, or alter blockchain state. The two pre-existing worktree changes
outside this review remain unstaged and untouched:

- `scripts/publish-web-live-surface.sh`
- `scripts/verify-base-evidence.mjs`
