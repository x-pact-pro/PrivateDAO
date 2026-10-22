# PrivatePay

## Seller Portal Copy Pack

**Product name:** PrivateDAO PrivatePay x402

**Product type:** SaaS/API independent product. Recommended access method: Alibaba Cloud Marketplace SPI mode for subscription entitlement, with the payment API remaining a separately authenticated capability.

**Product URL:** https://agents.privatedao.org/services/privatepay-x402

**Short description:**

PrivatePay is a gated x402 payment capability for agent services. It is designed to prove payment authorization while limiting public payment metadata; ordinary service settlement remains USDC and every production release requires provider, privacy, and treasury evidence.

**Long description:**

PrivatePay provides structured payment requirements, provider-backed verification, settlement status, and redacted public responses for compatible agent services. The current implementation includes the MagicBlock adapter, x402 challenge/verify/settle boundaries, deposit/transfer/withdraw preparation, privacy audit fields, replay protection, and explicit release gates for mainnet conformance, relationship privacy, amount privacy, timing privacy, E2E evidence, and treasury split verification.

The product must not be marketed as active private settlement until those gates are independently proven on the exact production provider path. Public USDC service payments and PDAO holder benefits remain separate from PrivatePay. PDAO is not a payment substitute and is not linked to treasury signing authority.

## Plans and pricing proposal

| SKU | New subscription | Renewal | Included use | Usage fee |
| --- | ---: | ---: | --- | ---: |
| PrivatePay Developer | $99/month | $99/month | 1,000 payment intents and provider-status calls | 2.5% of quoted service subtotal, minimum $0.05 USDC when the rail is activated |
| PrivatePay Business | $399/month | $399/month | 10,000 payment intents and priority support review | Same disclosed usage fee; network/provider costs are separate |
| PrivatePay Enterprise | Contact sales | Contact sales | Contracted limits and security review | Contracted only |

These prices are a proposal for Alibaba listing only. They do not alter the current production feature flags or ordinary Agent Exchange service prices. Marketplace fees, taxes, settlement timing, and Co-Sell economics must be confirmed in Seller Portal.

## Current technical boundary

- Network target: Solana mainnet-private provider path as proven by the exact MagicBlock contract, not public Solana USDC.
- Protocol: x402 request/verify/settle with provider-specific private-payment extensions.
- Public response: redacted request and settlement identifiers only.
- Release condition: all explicit PrivatePay gates and a successful funded provider E2E run with a settled result.
- Current public status: activation gated; no production activation claim.

## Security and privacy

- No private keys are accepted by the API.
- Public ordinary USDC is rejected as a confidential asset for the private rail.
- Proofs are bound to the quoted request, destination, network, and replay state.
- Provider audit data is scoped separately from public receipts.
- Deposit, transfer, withdrawal, timing, fee payer, and amount leakage are release-audit dimensions.
- A pending provider settlement is not reported as paid.

## Provisioning and lifecycle

The Alibaba SPI adapter provisions a subscription entitlement only. It does not enable PrivatePay. Activation requires the operator to set the reviewed production flags and provider secret after the release checklist passes. Renewals extend entitlement; expiry and release suspend access. All callbacks are authenticated and idempotent.

## User guide

1. Purchase a supported subscription in Alibaba Marketplace.
2. Wait for the service instance to become active.
3. Obtain the API credential through the approved onboarding flow.
4. Request payment requirements for a compatible service.
5. Follow the x402 challenge and provider verification flow.
6. Treat only a confirmed settled response as paid.

## Evidence and demo

- Product page: https://agents.privatedao.org/services/privatepay-x402
- Marketplace: https://agents.privatedao.org/marketplace
- Integration guide: https://sealkeeper.run/docs/integrate

No private-payment production capability is claimed by this pack without an independently reviewable settlement receipt.

## Submission checklist

- [ ] Provider contract and mainnet-private x402 support verified.
- [ ] Funded E2E settlement receipt captured for the exact production merchant.
- [ ] Privacy audit passes for payer/recipient relationship, amount, timing, fee payer, and network fees.
- [ ] Treasury split and fee accounting independently verified.
- [ ] `ALIBABA_MARKETPLACE_ENABLED=true` and SPI secret enabled only after callback tests.
- [ ] PrivatePay production flags enabled only after the release gate is signed.
- [ ] EULA, refund policy, security contact, and support response commitments approved.
- [ ] Final submission remains pending explicit maintainer approval.
