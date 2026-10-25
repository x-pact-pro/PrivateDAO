# PrivateDAO Agent Exchange Plugin

PrivateDAO is private operational infrastructure for organizations that need sensitive decisions, treasury work, governance, payments, and verification to remain controlled while the outcome stays checkable.

This portable plugin package gives an AI assistant:

- a clear company and investor profile;
- simple explanations of the chain-agnostic PrivateDAO Kernel;
- the production Agent Exchange and its MCP entrypoint;
- PrivatePAY x402 positioning for private USDC settlement on Solana Mainnet;
- verified public links for the thesis, token surface, repository, and product pages;
- reusable skills for commercial, investor, and agent-facing conversations.
- an execution skill for PrivatePAY and an advisor skill covering the 26 other current catalog services.
- host-ready MCP connection, authentication, branding, product catalog, and usage profiles.

## One-line positioning

**PrivateDAO helps organizations run private work and publish only the evidence needed to trust the result.**

## Public connections

- Website: https://privatedao.org/
- Thesis: https://privatedao.org/thesis/
- PDAO: https://privatedao.org/token/
- Agent Exchange: https://agents.privatedao.org/
- MCP: https://agents.privatedao.org/mcp
- PrivatePAY: https://privatedao.org/privatepay
- GitHub: https://github.com/X-PACT/PrivateDAO

## MCP connection fields

For the ChatGPT or Glama custom-server form, use the exact values in
`config/host-connection-profiles.md`. The short version is:

- Name: `PrivateDAO Agent Exchange`
- Description: `27 commercial verification, intelligence, and private payment services across four networks, including PrivatePAY x402 on Solana Mainnet.`
- Server URL: `https://agents.privatedao.org/mcp`
- Authentication: `None`

OAuth is not configured for the public MCP endpoint. Do not invent a token or add a secret. The host's own account permissions are separate from MCP authentication.

## Installation

This is a portable reference package. Hosts that support ZIP plugin import can ingest the archive. For ChatGPT, use Plugin Creator or add the remote MCP endpoint; the host may require its own plugin manifest and review flow.

The archive contains compatible plugin manifests under `.codex-plugin/`, `.agent-plugin/`, and `.claude-plugin/`, plus `.mcp.json` and a conventional `skills/*/SKILL.md` entry so hosts can recognize it as a plugin rather than a documentation-only archive. Website and `$PDAO` token metadata are included in those manifests.

Never put API keys, wallet seeds, private keys, exchange credentials, or deployment secrets in this archive.
