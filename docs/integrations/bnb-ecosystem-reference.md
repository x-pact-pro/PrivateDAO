# BNB Ecosystem Reference Boundary

This note records the BNB ecosystem products supplied as research context for
PrivateDAO engineers. It prevents external BNB tools from being mistaken for
PrivateDAO products, dependencies, partnerships, or verified capabilities.

## Supplied Reference Set

| Ecosystem reference | Networks named in the supplied material | Reference card | PrivateDAO interpretation |
|---|---|---|---|
| BNB Agent Studio | BSC | `bnbchain-studio/` | External agent tooling reference only |
| BNB Agent SDK | BSC, opBNB | `bnbagent-sdk/` | External SDK reference only |
| Greenfield SDK | Greenfield | `greenfield-sdk/` | External storage reference only |
| MCP & Ask AI | BSC, opBNB, Greenfield | `mcp/` | Documentation/distribution reference; not a dependency of PrivateDAO MCP |
| MPP SDK | BSC, opBNB | `mpp-sdk/` | Future machine-payment research; not enabled as a payment rail |
| Scaled UI Amount / ERC-8056 | BSC | `scaled-ui-amount/` | Presentation/attribution research; no current binding |
| Privacy at Scale | BSC | `privacy-at-scale/` | Research reference; no implementation claim |

## What Is Actually Integrated

PrivateDAO's current BNB integration is BNB Smart Chain Testnet, chain ID
`97`, through the shared EVM lifecycle and the dedicated
`evm-bnb-testnet` adapter. The current on-chain product evidence is listed in
[`../architecture/product-network-evidence.md`](../architecture/product-network-evidence.md)
and verified by the committed deployment artifacts.

The following are separate from that integration:

- opBNB is not automatically supported because BSC is supported.
- Greenfield is not an EVM product execution path.
- External BNB MCP or Ask AI services are not PrivateDAO Agent Exchange
  services.
- No BNB ecosystem partnership is claimed without an executed agreement and
  independently verifiable evidence.

## Review Rule

An engineer may promote a BNB capability only when the repository contains a
real adapter, a Kernel binding, a network-specific receipt artifact, and an
independent verifier. Configuration, documentation, or RPC health alone is
insufficient.
