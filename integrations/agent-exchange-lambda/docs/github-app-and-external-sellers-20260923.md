# PrivateDAO Agent Exchange: GitHub App and external seller operations

## GitHub App runtime

- App identity: PrivateDAO Agent Exchange, App ID 5049917.
- Setup URL: `https://agents.privatedao.org/github/setup`.
- Installation setup/callback: `https://agents.privatedao.org/github/setup`.
- App/Marketplace webhook: `https://agents.privatedao.org/api/github/webhook`.
- Repository context: `POST https://agents.privatedao.org/api/github/context`.
- Public repository evidence remains available through `github.repository` and does not require an installation.

The runtime uses an App JWT only for GitHub App identity and short-lived installation tokens for installation resources. Installation tokens are cached in process memory until shortly before their one-hour expiry and are never written to DynamoDB or returned by an API. `/github/setup` creates short-lived state before sending a user to GitHub's installation URL; GitHub returns the installation ID and state to the setup URL, where the App API verifies the installation, generates an installation token, records the selected repositories, and consumes the state once. No GitHub user OAuth token or authorization-code exchange is used.

### Secret loading

Lambda reads the JSON secret `pdao/agent-exchange/github` through the
`AGENT_EXCHANGE_GITHUB_SECRET_ID` environment reference. The installation-runtime
fields are `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`,
`GITHUB_APP_SLUG`, and `GITHUB_WEBHOOK_SECRET`. The PEM and webhook secret are
never stored in source, browser assets, or logs. Legacy OAuth fields remain in
the AWS secret during migration but are not read by the installation-only
runtime.

The implemented repository boundary is read-only. The live GitHub App metadata reports `contents: read` and `metadata: read`; organization, account, issues, pull requests, actions, administration, and write permissions are not required. The code handles `installation`, `installation_repositories`, and Marketplace purchase events. Installation `164152168` is present and active on `X-PACT`, with one selected private repository. Webhook HMAC remains independent from installation authentication.

## External seller lifecycle

External MCP sellers register a stable `agent_...` identity. A new registration returns an owner token once; only its hash is retained. Seller updates require that token. Supported operations are registration, refresh, service/pricing publication, accepted-asset update, payout update, endpoint replacement, and retirement. Retired records are excluded from registry search, matching, discovery, and marketplace active listings.

Commercial service metadata is explicit: service/tool ID, title, description, price or free flag, asset, payment network, accepted assets, input/output schemas, MCP execution tool, and seller identity. The exchange never infers a price from a tool name or from an absent seller declaration.

An external paid request is quote-first and uses the existing finalized Solana Mainnet USDC verification rail. The buyer pays the exchange treasury quoted in the payment intent; the result receipt names the seller and records gross amount, protocol fee, net payable amount, payout declaration, and settlement status. This release records `payable_pending_admin_settlement`; it does not broadcast an automatic seller payout transaction. This boundary avoids signing or moving funds without a separately approved payout rail.

## Pilot-provider handoff

Before publishing any pilot provider's commercial services, provide the exact values for each tool: public display title, description, free/paid status, numeric price, asset, payment network, accepted assets, input schema, output schema, and the seller payout address. No price or payout address is invented by the exchange. A Registry record or interoperability test does not make the provider an official PrivateDAO partner or sponsored placement; official directory entries come only from `integrationDirectory()` and paid promotion is separately disclosed.
