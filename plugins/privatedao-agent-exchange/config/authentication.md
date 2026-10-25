# Authentication and Permission Settings

## MCP connection

The public MCP endpoint does not require an API key for discovery and read-only tools. Use the exact endpoint from `config/mcp-connection.json` and do not append credentials to it.

## Paid actions

Paid jobs use the quote-first flow. The assistant must show the quote and wait for explicit user approval before payment, wallet signing, or settlement.

## Wallet boundary

- The user signs in their own wallet or approved provider.
- PrivateDAO and the plugin never receive seed phrases or private keys.
- The assistant must not ask users to paste keys, exports, or secrets.
- A payment receipt is not proof until the service verifies it.

## Host-specific authentication

ChatGPT, Claude, Grok, Cursor, and other MCP hosts may add their own account or workspace authorization. Configure those permissions in the host, not inside this archive. Do not invent OAuth, API-key, or bearer-token values for this public endpoint.

## Fail-closed behavior

If the host cannot establish the MCP connection, the service catalog is stale, or the requested tool requires unavailable authorization, explain the limitation and do not simulate completion.
