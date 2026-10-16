# PrivateDAO Agent Exchange Lambda

This directory is the canonical source for the independently deployed Agent
Exchange Lambda. It is intentionally separate from the commercial website and
the game runtime.

## Runtime

- Function: `PrivateDAOAgentExchange-Function-N2zgpQmMN41S`
- Runtime: Node.js 22
- Handler: `src/handler.handler`
- Release: `1.6.0` (CloudFormation-managed `$LATEST` revision)
- Domain: `agents.privatedao.org`
- Production execution network: Solana Mainnet
- Mainnet read-only intelligence: Ethereum Mainnet, Base Mainnet, and Arbitrum One
- Solana Agent identity: 8004 Agent #1471; this Lambda does not create or replace that identity

## Public surfaces

- `/marketplace` commercial service catalog
- `/connect` developer connection flow
- `/.well-known/agent-card.json` discovery card
- `/api/services` service catalog API
- `/api/network/health?network=ethereum-mainnet` sanitized provider health
- `/api/providers/status` sanitized OpenVINO, watsonx, MongoDB, and GitHub status
- `/api/integrations` commercial integration directory and relationship disclosures
- `/a2a`, `/mcp`, `/openapi.json` machine interfaces
- `/github/setup` GitHub App installation-only setup and callback
- `/api/github/webhook` signed installation and Marketplace lifecycle webhook
- `/api/github/context` authenticated read-only installation repository context
- `/api/registry/services` external seller service discovery
- `/api/seller/security-review` automated seller screening and quality score
- `/api/external/jobs` quote-first external seller execution

## AI client compatibility

The public MCP endpoint is a remote Streamable HTTP MCP server:

`https://agents.privatedao.org/mcp`

It supports the standard `initialize`, `ping`, notification, `tools/list`, and
`tools/call` lifecycle. Tool annotations identify read-only tools separately
from job creation, registration, logistics, and payment-related operations.
The semantic MCP tools `exchange_overview`, `pdao_services`,
`service_recommendation`, `provider_integrations`, `payment_guide`, and
`execution_guide` explain the marketplace before an autonomous agent takes
action.

External seller lifecycle tools are `external_services`,
`seller_update_services`, `seller_replace_endpoint`, and `seller_retire`.
Prices and payout addresses are seller-declared; the exchange does not infer
them. External paid execution records a seller settlement payable in the
receipt and does not broadcast an automatic payout transaction.

Seller ownership tokens are returned only once during initial registration and
only a hash is retained by PrivateDAO. A lost token cannot be recovered from
the registry. An administrator may use the protected
`POST /api/admin/registry/agents/{agentId}/owner-token/rotate` route to rotate
the token after the normal admin authentication check succeeds; the new token
must be delivered to the seller through a separate secure channel. Registration
updates without the token are rejected, while a healthy re-registration without
seller mutations remains idempotent. Payment, commercial publication, and
technical MCP verification remain separate states.

Seller screening accepts optional public `website_url`, `github_url`, and
`docs_url` metadata. It checks public HTTPS reachability, GitHub repository
visibility, MCP identity, discovered tool safety, and selected service
alignment. The result contains a bounded `quality_score` and a separate
`security_gate`. A passed result is automated screening only, not a security
audit, legal certification, or guarantee of safe behavior. `auto_publish` is
honored only after finalized listing payment and a passed screening gate;
otherwise the seller remains eligible for explicit publication.

Use the endpoint as a custom remote MCP app in ChatGPT developer mode, as a
remote HTTP MCP server in Claude, or as an OpenClaw `streamable-http` server.
No client-specific bridge or private credential is required for the public
read-only tools. Paid calls still follow the existing quote-first Solana
Mainnet USDC flow and must not be treated as free read operations.

OpenClaw configuration example:

```json5
{
  mcp: {
    servers: {
      privatedao: {
        url: "https://agents.privatedao.org/mcp",
        transport: "streamable-http",
        toolFilter: {
          include: ["pdao_services", "verify_basic", "job_status", "get_receipt", "search_agents", "agent_match", "network_stats"]
        }
      }
    }
  }
}
```

Claude and ChatGPT should be configured with the same remote endpoint and
should refresh the tool catalog after a server update. Write or payment-related
actions remain subject to the client confirmation and PrivateDAO payment gates.

## Deployment boundary

Deploy this integration independently. Do not package or replace the main
PrivateDAO website, `/game/`, or the game host when updating this Lambda.

Runtime secrets and DynamoDB configuration are supplied by the Lambda
environment and AWS Secrets Manager. No secret, private key, token, or
`node_modules` directory belongs in this repository directory.

The reproducible SAM reference is
`/home/x-pact/PrivateDAO-CANONICAL-LIVE-20260818/deployment/agent-exchange-template.yaml`.
Its `CodeUri` points to this canonical directory and declares the Telemetry and
RateLimits tables. Do not use the historical `deployment/` template reference
to `services/agent-exchange/`.

MongoDB is a production evidence-history provider when its connection secret is
configured; the runtime stores completed evidence with idempotent job indexing.
Production Lambda egress uses the private subnets in the canonical VPC template
through NAT Gateway EIP `13.53.64.203`; Atlas Network Access allows that EIP only.
Other integrations remain configuration-gated: IBM watsonx provides inference fallback, Intel
OpenVINO remains supported through `PDAO_INTEL_INFERENCE_URL`, and GitHub
repository evidence uses the public GitHub API (with an optional secret-backed
token for higher API limits). Provider identity and evidence persistence status
are included in completed results without returning credentials.

The GitHub App runtime additionally reads the JSON secret
`pdao/agent-exchange/github` through `AGENT_EXCHANGE_GITHUB_SECRET_ID`. Its
installation-runtime fields are `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`,
`GITHUB_APP_SLUG`, and `GITHUB_WEBHOOK_SECRET`. App JWTs and installation
access tokens remain server-side; only short-lived setup state and a hash of
the resulting connection token are persisted. Legacy `GITHUB_CLIENT_ID` and
`GITHUB_CLIENT_SECRET` fields may remain in AWS during migration, but are not
read by the runtime.

The existing Solana RPC secret may also contain `ALCHEMY_API_KEY`. The runtime
constructs network-specific Alchemy endpoints in `src/evm.mjs`; the key is
never returned in health evidence, receipts, Agent Card metadata, browser
bundles, or logs. Explicit `PDAO_EVM_*_RPC_URL` values take precedence when
configured securely.

The current payment rail remains Solana Mainnet USDC. A requested EVM target
network does not move the payment rail: paid jobs quote and verify payment on
Solana, then execute the read-only target service. EVM transaction simulation
and Jupiter swap quotes never sign or broadcast transactions. Solana
transaction simulation uses `simulateTransaction` with signature verification
disabled; it returns simulation logs and compute usage only.

Alchemy Data APIs are used opportunistically behind the EVM provider boundary
for token metadata and wallet token balances. If a Data API method is not
available, the service returns the bounded standard-RPC evidence instead of
inventing a value. Contract-code and `eth_call` metadata reads use a short
in-memory TTL cache; wallet balances and other mutable user data are never
shared through that cache. Runtime rate limits and sanitized provider metrics
are enforced server-side.

Agent #1471 metadata remains the canonical Solana identity. Its existing IPFS
URI and owner are preserved; no duplicate registration is created during
multi-chain expansion.

Before deployment, run `node --check src/handler.mjs`, package the source with
the Lambda runtime dependencies, and verify the public API and browser surfaces
after the update. Keep the previous Lambda package available for rollback.
