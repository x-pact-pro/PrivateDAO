# Alibaba Cloud Marketplace Preparation

This directory contains copy-ready packages for two independent products:

- `agent-exchange/`: SaaS with API and MCP access.
- `privatepay/`: independent SaaS/API payment capability.

Alibaba documentation currently distinguishes SaaS SPI mode, license mode, and API products. SPI is the closest fit for these products because each purchase creates an entitlement instance and Alibaba sends lifecycle callbacks. Agent Exchange should remain a unified SaaS product with API/MCP access rather than 26 separate listings. PrivatePay should remain a separate product because it has a different risk boundary, activation gate, and fee model.

The code adapter is `integrations/agent-exchange-lambda/src/alibaba-marketplace.mjs` and the callback route is `/api/alibaba/spi`. It is fail-closed by default.
