# PrivateDAO Agent Exchange

## Seller Portal Copy Pack

**Product name:** PrivateDAO Agent Exchange

**Product type:** SaaS with API and MCP access. Recommended access method: Alibaba Cloud Marketplace SPI mode. Alibaba provisions one isolated service instance per order; the instance maps to the existing Agent Exchange entitlement boundary.

**Product URL:** https://agents.privatedao.org

**API surfaces:**

- OpenAPI: https://agents.privatedao.org/openapi.json
- MCP: https://agents.privatedao.org/mcp
- A2A: https://agents.privatedao.org/a2a
- Marketplace: https://agents.privatedao.org/marketplace

**Short description:**

PrivateDAO Agent Exchange is a production-oriented SaaS/API/MCP marketplace for bounded agent services. Buyers discover a capability, submit a typed request, approve a quote when payment is required, and receive a machine-readable result with an independently verifiable receipt.

**Long description:**

Agent Exchange exposes real, bounded capabilities for verification, token and wallet intelligence, transaction and contract analysis, research, market context, evidence synthesis, agent workflows, and external seller listings. Each capability publishes an input contract, supported network boundary, execution status, payment behavior, and output contract. The service supports browser users and autonomous agents through OpenAPI, MCP, and A2A surfaces.

Ordinary paid execution remains quote-first and settles in USDC on the declared Solana payment rail. PDAO holder access, credits, discounts, and governance coordination are separate product benefits and do not replace the payment asset. PrivatePay is presented separately and remains activation-gated until its provider conformance and settlement evidence pass the production release gate.

## Plans and pricing proposal

These are proposed Alibaba subscription SKUs and do not change current Production prices:

| SKU | New subscription | Renewal | Included use | Overage posture |
| --- | ---: | ---: | --- | --- |
| Exchange Basic | $49/month | $49/month | 2,000 successful service requests | Quote-first paid executions remain metered by the existing service price |
| Exchange Pro | $149/month | $149/month | 10,000 successful service requests, higher quota | Same service-price settlement; no unbounded external-provider use |
| Exchange Enterprise | Contact sales | Contact sales | Tenant-specific quota, support review, and integration planning | Contracted only |

Alibaba Marketplace fees, taxes, and Co-Sell economics must be confirmed in the Seller account; this pack does not assume a universal 3% rate.

## Provisioning and lifecycle

The SPI adapter is `/api/alibaba/spi`. It validates the Marketplace token, accepts `createInstance`, `renewInstance`, `expireInstance`, `releaseInstance`, and `orderPay`, persists an idempotent instance record, and returns the instance identifier. The adapter is disabled until `ALIBABA_MARKETPLACE_ENABLED=true` and the SPI secret is supplied through the deployment secret path.

The customer instance is an entitlement record, not a new wallet, signing key, or treasury. Tenant requests must carry the provisioned instance identity through the authenticated application session. Expiration and release suspend the Alibaba entitlement without deleting audit evidence.

## Security and privacy

- SPI token validation follows Alibaba's documented sorted-parameter MD5 construction.
- Repeated callbacks are idempotent by `instanceId`/`orderBizId`.
- Secrets are read from deployment secret storage and are never returned in public responses.
- Customer inputs, receipts, and seller credentials remain behind the existing tenant and authorization boundaries.
- Provider and network failures are returned as bounded errors; the service does not silently claim completion.
- No compliance certification or SLA is claimed by this package.

## User guide

1. Open the product URL and choose a service or product workflow.
2. Inspect the input schema and supported network.
3. Run the public read-only demo where applicable.
4. Use the API or MCP endpoint with the provisioned Alibaba entitlement.
5. Approve a quote only when the service requires payment.
6. Verify the returned receipt independently.

## Evidence and demo

- Live product: https://agents.privatedao.org
- Live marketplace: https://agents.privatedao.org/marketplace
- Live read-only demo: https://agents.privatedao.org/demo
- API specification: https://agents.privatedao.org/openapi.json
- MCP endpoint: https://agents.privatedao.org/mcp

These are the product's real surfaces. No mock screenshots or placeholder endpoints are included.

## Submission checklist

- [ ] Seller identity and Co-Sell agreement verified in Alibaba Seller Portal.
- [ ] Product category, EULA, support contact, and refund policy approved.
- [ ] SPI callback URL configured as `https://agents.privatedao.org/api/alibaba/spi`.
- [ ] `ALIBABA_MARKETPLACE_ENABLED=true` enabled only after Seller Portal test callbacks pass.
- [ ] `AGENT_EXCHANGE_ALIBABA_SECRET_ID` points to the secret containing `ALIBABA_MARKETPLACE_SPI_SECRET`.
- [ ] Create, renew, expire, release, and duplicate callback tests recorded.
- [ ] SKU prices, taxes, trial, renewal, and support commitments reviewed by the account owner.
- [ ] Final submission remains pending explicit maintainer approval.
