# Alibaba Cloud Marketplace Readiness

Date: 2026-10-22

## Executive decision

| Product | Technical posture | Commercial posture | Decision |
| --- | --- | --- | --- |
| Agent Exchange | Existing live SaaS/API/MCP surfaces; SPI adapter implemented and disabled by default | Copy, plans, onboarding, and lifecycle package prepared | CONDITIONAL GO after Alibaba callback sandbox and Seller approval |
| PrivatePay | Provider adapter and x402 boundaries exist, but the live provider evidence previously remained pending | Independent package prepared with honest gated language | NO-GO for production activation until funded settled E2E and privacy audit pass |

## Existing service inventory

The canonical service catalog in `integrations/agent-exchange-lambda/src/catalog.mjs` is the source of truth for 27 entries: 26 ordinary first-party capabilities plus the separately gated PrivatePay x402 rail. Runtime execution and schemas are implemented in the Agent Exchange Lambda modules. The public machine surfaces are:

- OpenAPI: `https://agents.privatedao.org/openapi.json`
- MCP: `https://agents.privatedao.org/mcp`
- A2A: `https://agents.privatedao.org/a2a`
- Service catalog: `https://agents.privatedao.org/api/services`

The catalog separates free read-only capabilities, paid quote-first services, seller services, and the gated PrivatePay capability. After the latest release, live checks returned HTTP 200 for the root, marketplace, demo, holder benefits, and PrivatePay status surfaces. The root, marketplace, and demo also expose the wallet-free AI-agent demo card and its read-only token-safety flow. This is surface evidence, not proof that every paid provider path is production-live.

## E2E classification

| Area | Result | Evidence |
| --- | --- | --- |
| Service catalog and schemas | PASS | `src/catalog.mjs`, `test/service-execution.mjs`, `test/surfaces.mjs` |
| MCP initialize/tools/list/call boundary | PASS in repository tests | `test/service-execution.mjs`, `test/smoke.mjs` |
| Auth, accounts, favorites, cart | PASS in repository tests; Mongo required in production | `test/accounts.mjs`, `src/accounts.mjs` |
| Rate limits and quotas | PASS in repository tests | `src/runtime-controls.mjs`, tests |
| Quote, USDC payment binding, receipt verification | PASS in repository tests | `test/service-execution.mjs`, `test/settlement.mjs` |
| Provider failure and retry behavior | PASS in repository tests | provider and service tests |
| PrivatePay local lifecycle | PASS in repository tests | `test/privatepay-job.mjs`, `test/privatepay.mjs` |
| PrivatePay provider verify/settle | BLOCKED for production claim | live status remains `not_ready`; release flags remain fail-closed because settled provider, privacy, timing, fee-correlation, and treasury-split evidence are incomplete |
| Alibaba real Seller Portal callback | NOT RUN | Seller Portal secret and sandbox callback access are account-owned |

The focused release checks completed with 30/30 surface tests and 38/38 PrivatePay tests passing. A broader repository gate was not completed because the root check requires unavailable TypeScript tooling and then enters unrelated long-running Rust checks; it was stopped without changing production. Tests are not a substitute for funded production E2E evidence.

## Implemented changes

- Added `src/alibaba-marketplace.mjs` with documented Alibaba SPI token validation, lifecycle normalization, idempotent instance handling, and tenant-scoped records.
- Added `/api/alibaba/spi`; it returns 404 unless `ALIBABA_MARKETPLACE_ENABLED=true`.
- Added secret-manager support through `AGENT_EXCHANGE_ALIBABA_SECRET_ID` and `ALIBABA_MARKETPLACE_SPI_SECRET`.
- Added `AlibabaInstances` persistence table configuration.
- Added tests for authentication, idempotency, lifecycle transitions, and rejection before persistence.
- Added copy-ready Agent Exchange and PrivatePay listing packages.
- Added a catalog-derived service inventory; it records 26 ordinary capabilities plus gated PrivatePay without inflating the service count.
- Added the commercial PrivatePay surface without changing USDC settlement or enabling the rail.
- Added and deployed the wallet-free AI-agent demo spotlight to the root, marketplace, and `/demo` surfaces. Lambda version `266` is active behind both production API integrations; version `265` remains available for rollback.
- Verified live HTTP 200 responses and the read-only `/api/demo/token` report after deployment. The live `/api/privatepay/status` response remains fail-closed with `enabled: false` and `status: not_ready`.

## Pricing proposal

Agent Exchange: Basic $49/month, Pro $149/month, Enterprise contact sales.

PrivatePay: Developer $99/month, Business $399/month, Enterprise contact sales, plus the disclosed 2.5% fee with a $0.05 USDC minimum when activated.

These are proposed Alibaba SKUs only. Existing Production prices and PDAO benefits remain unchanged. Alibaba commission, tax, refund, and Co-Sell terms require Seller Portal confirmation; no universal 3% assumption is made.

## Account-owner requirements

1. Confirm the Alibaba Seller and Co-Sell account is authorized for SaaS SPI products.
2. Create the two products, SKUs, EULAs, support contacts, and refund terms in Seller Portal.
3. Generate the SPI security secret and store it as `ALIBABA_MARKETPLACE_SPI_SECRET` in the configured secret.
4. Provide the Seller Portal callback test or sandbox event for each lifecycle action.
5. Approve the proposed prices and Marketplace economics.
6. For PrivatePay, provide a settled provider receipt and complete the privacy/treasury release review.
7. Explicitly approve the Production flag change and final Marketplace submission.

## Official references

- https://www.alibabacloud.com/help/en/marketplace/overview-of-publishing-saas-products
- https://www.alibabacloud.com/help/en/marketplace/publish-saas-products-in-spi-mode
- https://www.alibabacloud.com/help/en/marketplace/spi-security-scheme
- https://www.alibabacloud.com/help/en/marketplace/createinstance
- https://www.alibabacloud.com/help/en/marketplace/renewinstance
- https://www.alibabacloud.com/help/en/marketplace/guidebook-for-sales-information-configuration
- https://www.alibabacloud.com/help/en/marketplace/publish-api-to-api-gateway
