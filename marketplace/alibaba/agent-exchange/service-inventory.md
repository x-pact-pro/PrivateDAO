# Agent Exchange Service Inventory

Source: `integrations/agent-exchange-lambda/src/catalog.mjs` on 2026-10-22.

The catalog contains 27 entries: 26 ordinary capabilities plus the separately gated PrivatePay x402 rail. Prices below are the current service prices and are not Alibaba subscription prices.

| ID | Access | Current price | Network boundary |
| --- | --- | ---: | --- |
| verify.basic | Free | 0 USDC | Solana, Ethereum, Base, Arbitrum |
| verify.deep | Paid | 0.25 USDC | Solana, Ethereum, Base, Arbitrum |
| token.intelligence | Paid | 0.03 USDC | Solana, Ethereum, Base, Arbitrum |
| risk.score | Paid | 0.02 USDC | Solana, Ethereum, Base, Arbitrum |
| wallet.intelligence | Paid | 0.05 USDC | Solana, Ethereum, Base, Arbitrum |
| wallet.bot.classify | Paid | 1 USDC | Solana, Ethereum, Base, Arbitrum |
| contract.inspect | Paid | 0.08 USDC | Solana, Ethereum, Base, Arbitrum |
| launch.check | Paid | 0.03 USDC | Solana, Ethereum, Base, Arbitrum |
| market.snapshot | Paid | 0.01 USDC | Solana, Ethereum, Base, Arbitrum |
| research.asset | Paid | 0.10 USDC | Solana, Ethereum, Base, Arbitrum |
| research.wallet | Paid | 0.10 USDC | Solana, Ethereum, Base, Arbitrum |
| contract.explain | Paid | 0.10 USDC | Solana, Ethereum, Base, Arbitrum |
| transaction.explain | Paid | 0.05 USDC | Solana, Ethereum, Base, Arbitrum |
| anomaly.detect | Paid | 0.15 USDC | Solana, Ethereum, Base, Arbitrum |
| agent.research.report | Paid | 0.25 USDC | Solana, Ethereum, Base, Arbitrum |
| portfolio.intelligence | Paid | 0.20 USDC | Solana, Ethereum, Base, Arbitrum |
| swap.quote | Paid | 0.01 USDC | Solana, Ethereum, Base, Arbitrum |
| transaction.simulate | Paid | 0.02 USDC | Solana, Ethereum, Base, Arbitrum |
| decision.context | Paid | 0.10 USDC | Solana, Ethereum, Base, Arbitrum |
| receipt.verify | Free | 0 USDC | Solana, Ethereum, Base, Arbitrum |
| sealkeeper.reputation | Free/gated | 0 USDC | SealKeeper read-only boundary |
| github.repository | Paid | 0.08 USDC | Network-independent read-only |
| forensics.trace | Paid | 0.75 USDC | Solana, Ethereum, Base, Arbitrum |
| agent.match | Paid | 0.10 USDC | Solana, Ethereum, Base, Arbitrum |
| sponsored.discovery | Paid | 5 USDC | Solana, Ethereum, Base, Arbitrum |
| intelligence.synthesize | Paid | 1 USDC | Solana, Ethereum, Base, Arbitrum |

## Common execution boundary

Every service has a typed input schema and service manifest. Paid execution is quote-first, uses the declared USDC payment rail, and returns an independently verifiable receipt. Target network selection is separate from the payment network. PrivatePay is excluded from this table because its lifecycle is independently gated.
