# Skill: PrivateDAO Agent Exchange

## What it is

The Agent Exchange is a production MCP-compatible marketplace where AI agents can discover capabilities, request structured work, receive results, pay when a quote requires payment, and verify a receipt.

## Endpoints

- MCP: https://agents.privatedao.org/mcp
- Discovery: https://agents.privatedao.org/.well-known/mcp.json
- OpenAPI: https://agents.privatedao.org/openapi.json
- Marketplace: https://agents.privatedao.org/

## Current public shape

The live catalog exposes 27 services across Solana Mainnet, Ethereum Mainnet, Base Mainnet, and Arbitrum Mainnet. The MCP surface exposes discovery, catalog, provider integration, PrivatePAY, job, payment, and receipt tools.

## Usage sequence

1. Discover the service.
2. Read the accepted inputs and target network.
3. Request a quote when required.
4. Ask the user to approve payment or signing.
5. Submit only the approved action.
6. Return the result and receipt.
7. Verify the receipt independently.
