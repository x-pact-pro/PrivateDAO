# Installation and Distribution

## ZIP package

The archive is a portable knowledge/skills package. It contains no credentials and is intentionally small; it is far below the 100MB upload limit shown in the ChatGPT interface.

The archive includes `.codex-plugin/plugin.json`, `.agent-plugin/plugin.json`, `.claude-plugin/plugin.json`, `.mcp.json`, and `skills/privatedao/SKILL.md` so plugin hosts that require a recognized manifest or skill directory can index it.

Website and token metadata are included in each compatible manifest:

- Website: `https://privatedao.org/`
- Token: `$PDAO`
- Token page: `https://privatedao.org/token/`

## ChatGPT

1. Open Plugins and choose Add (+).
2. If the account offers Plugin Creator, create a plugin and add the remote MCP app at `https://agents.privatedao.org/mcp`.
3. If ZIP upload is enabled for the workspace, upload `privatedao-agent-plugin.zip`.
4. Review the included instructions and skills.
5. Test `list_catalog`, `privatepay_status`, and a read-only service before enabling paid actions.
6. Workspace owners/admins must publish or install the plugin for other members.

### Custom MCP form values

Use `config/host-connection-profiles.md` as the source of truth. The connection is:

- Name: `PrivateDAO Agent Exchange`
- Description: `27 commercial verification, intelligence, and private payment services across four networks, including PrivatePAY x402 on Solana Mainnet.`
- Server URL: `https://agents.privatedao.org/mcp`
- Authentication: `None`

Upload `assets/PrivateDAO_MCP_Icon_256.png` when the host requests an icon. Leave advanced OAuth settings empty unless a future deployment publishes an OAuth issuer and client configuration.

## Other AI clients

Use the same MCP URL with any client that supports Streamable HTTP MCP. Use the discovery document for machine-readable connection metadata.

## Distribution boundary

Uploading a package does not make it globally visible to every user. Public directory listing, workspace availability, app permissions, and action approval are controlled by the host platform.
