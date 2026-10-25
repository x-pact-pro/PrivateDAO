# Host Connection Profiles

Use these values when adding PrivateDAO Agent Exchange as a custom MCP server.

## ChatGPT, Glama, Claude, Cursor, and compatible MCP clients

| Field | Value |
|---|---|
| Name | `PrivateDAO Agent Exchange` |
| Description | `27 commercial verification, intelligence, and private payment services across four networks, including PrivatePAY x402 on Solana Mainnet.` |
| Connection mode | `Server URL` / `Streamable HTTP` |
| Server URL | `https://agents.privatedao.org/mcp` |
| Authentication | `None` for public discovery and read-only tools |
| Discovery | `https://agents.privatedao.org/.well-known/mcp.json` |
| OpenAPI | `https://agents.privatedao.org/openapi.json` |
| Agent card | `https://agents.privatedao.org/.well-known/agent-card.json` |
| Icon | `assets/PrivateDAO_MCP_Icon_256.png` |

Do not select OAuth or add an API key unless the host or a future PrivateDAO deployment explicitly provides those values. The public MCP surface is intentionally credential-free for discovery and read-only tools. Paid, wallet, and state-changing actions remain quote-first and require explicit user confirmation in the host.

## ChatGPT custom server form

- **Icon:** upload `assets/PrivateDAO_MCP_Icon_256.png`.
- **Name:** `PrivateDAO Agent Exchange`.
- **Description:** paste the description above.
- **Connection:** select `Server URL` and paste the MCP URL above.
- **Authentication:** select `None`.
- **Advanced OAuth settings:** leave unused.

## Glama health profile

Use the same server URL. Select `None` for authentication and test with `tools/list`. A successful HTTP 200 response is enough for public tool discovery. The endpoint must not be represented as OAuth-protected when no OAuth issuer or client registration exists.

## Safety boundary

The host may have its own login, workspace permissions, or connector approval. Those are host controls, not PrivateDAO credentials. Never put wallet seeds, private keys, API secrets, or deployment credentials in a connector form or this package.
