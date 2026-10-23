# PrivateDAO Agent Exchange: Alibaba Marketplace Listing Pack

Status: draft for seller-portal review. This file is packaging and evidence, not a
Marketplace submission or a legal acceptance of the Co-Sell Agreement.

## Product

**PrivateDAO Agent Exchange** is a unified multichain intelligence and verification
SaaS surface exposed through API, MCP, A2A, and dashboard workflows. The existing
direct Agent Exchange services keep their service IDs and quote-first USDC
settlement. Alibaba Marketplace billing is a separate commercial channel.

## PDAO Cloud modules

| Module | Services | Proposed monthly price |
| --- | ---: | ---: |
| PDAO Verify | 5 | $49 |
| PDAO Forensics Cloud | 5 | $149 |
| PDAO Multichain Intelligence | 7 | $99 |
| PDAO Decision & Transaction | 5 | $129 |
| PDAO Agent Network | 4 | $79 |
| PrivateDAO Enterprise Suite | all 26 | $399 |

The service catalog is machine-readable at `/api/marketplace/packaging`. The
interactive website demo is intentionally wallet-free and does not submit a
transaction; it links users to the actual marketplace/API path after showing a
sample report.

## Metered add-ons

- `sponsored.discovery`: $5 per disclosed placement.
- `wallet.bot.classify`: $1 per call.
- `intelligence.synthesize`: $1 per call.

Prices above are proposed commercial packaging, not a claim about Alibaba's final
customer price. Final marketplace pricing, taxes, billing records, and settlement
follow the seller-portal configuration and executed agreement.

## Utility and settlement boundaries

- USDC remains the payment and settlement asset for direct services and PrivatePay.
- Ordinary services do not require PDAO.
- PDAO can provide verified access, credits, discounts, rewards, reputation, and
  governance coordination after the existing entitlement checks pass.
- No PDAO token price is used to determine a payment without a trusted oracle.
- PDAO never holds or controls a treasury private key.
- If entitlement verification fails, the system falls back to the ordinary USDC
  path and does not grant a discount.
- `privatepay.x402` remains a separate product from the 26-service Agent Exchange.

## Co-Sell agreement gates

The supplied `cosell.pdf` states that listed Products run on Alibaba Cloud
Platform (page 1), and Schedule 4 limits products not deployed on Alibaba Cloud to
the Basic Program (page 25). The current VPS is useful for development, testing,
and operational staging, but it does not by itself satisfy Alibaba Cloud
deployment evidence.

Before claiming a Cloud Integration Program listing, obtain all of the following:

1. A deployed Alibaba Cloud runtime and repeatable health evidence.
2. Seller Portal approval and the required product/security documentation.
3. A reviewed EULA, data-processing terms, support contacts, and update policy.
4. An operating support rotation that can meet the agreement's S1/S2/S3 response
   obligations in Schedule 3 (page 23).
5. Founder/legal approval of pricing, fees, taxes, and the final agreement.

No key, wallet seed, cloud secret, Seller Portal credential, or private endpoint
belongs in this repository or this listing pack.

## Evidence checklist

- [x] Five branded PDAO modules map to exactly 26 unique existing service IDs.
- [x] Public API packaging metadata is exposed by the backend.
- [x] Wallet-free sample demo is present on the home and Agent Exchange surfaces.
- [x] Seven-day PDAO qualification default remains separate from the 30-day offer.
- [ ] Frontend production build green on a clean dependency install.
- [ ] Alibaba Cloud runtime deployment and health evidence.
- [ ] Seller Portal listing, approval, and legal acceptance.
- [ ] Production marketplace subscription activation, tenant mapping, and metering.
