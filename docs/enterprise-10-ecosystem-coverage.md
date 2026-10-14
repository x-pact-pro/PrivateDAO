# Enterprise Product Coverage: Ten Ecosystems

Generated from the runtime catalog, application bindings, network inventory, and native capability registry. Agent Exchange is intentionally excluded.

A lane is **verified** only when it is declared, bound through kernel://, has an execution-capable provider, and has devnet/testnet/mainnet evidence. Legacy and unbound lanes remain visible as gaps and are not customer-executable through the Kernel gateway.

| Product | Ecosystem | Status | Executable / Declared | Capability lanes |
| --- | --- | --- | ---: | --- |
| blind-verification | solana | planned | 0/1 | verification.blind.prove: solana-devnet=kernel-gateway/implementation, solana-mainnet-beta=unbound/planned |
| blind-verification | ethereum | verified | 1/1 | verification.blind.prove: ethereum-sepolia=kernel-gateway/testnet_verified, ethereum-mainnet=unbound/planned |
| blind-verification | arbitrum | verified | 1/1 | verification.blind.prove: arbitrum-sepolia=kernel-gateway/testnet_verified, arbitrum-one=unbound/planned |
| blind-verification | bnb | verified | 1/1 | verification.blind.prove: bnb-testnet=kernel-gateway/testnet_verified, bnb-mainnet=unbound/planned |
| blind-verification | base | verified | 1/1 | verification.blind.prove: base-sepolia=kernel-gateway/testnet_verified, base-mainnet=unbound/planned |
| blind-verification | robinhood | planned | 0/0 | verification.blind.prove: robinhood-testnet=unbound/planned, robinhood-mainnet=unbound/planned |
| blind-verification | tempo | verified | 1/1 | verification.blind.prove: tempo-testnet=kernel-gateway/testnet_verified, tempo-mainnet=unbound/planned |
| blind-verification | zcash | planned | 0/0 | verification.blind.prove: zcash-testnet=unbound/planned |
| blind-verification | hyperliquid | verified | 1/1 | verification.blind.prove: hyperliquid-testnet=kernel-gateway/testnet_verified |
| blind-verification | stellar | planned | 0/0 | verification.blind.prove: stellar-testnet=unbound/planned |
| record-verification | solana | planned | 0/2 | verification.record.create: solana-devnet=kernel-gateway/implementation, solana-mainnet-beta=unbound/planned; verification.record.verify: solana-devnet=kernel-gateway/implementation, solana-mainnet-beta=unbound/planned |
| record-verification | ethereum | verified | 2/2 | verification.record.create: ethereum-sepolia=kernel-gateway/testnet_verified, ethereum-mainnet=unbound/planned; verification.record.verify: ethereum-sepolia=kernel-gateway/testnet_verified, ethereum-mainnet=unbound/planned |
| record-verification | arbitrum | verified | 2/2 | verification.record.create: arbitrum-sepolia=kernel-gateway/testnet_verified, arbitrum-one=unbound/planned; verification.record.verify: arbitrum-sepolia=kernel-gateway/testnet_verified, arbitrum-one=unbound/planned |
| record-verification | bnb | verified | 2/2 | verification.record.create: bnb-testnet=kernel-gateway/testnet_verified, bnb-mainnet=unbound/planned; verification.record.verify: bnb-testnet=kernel-gateway/testnet_verified, bnb-mainnet=unbound/planned |
| record-verification | base | verified | 2/2 | verification.record.create: base-sepolia=kernel-gateway/testnet_verified, base-mainnet=unbound/planned; verification.record.verify: base-sepolia=kernel-gateway/testnet_verified, base-mainnet=unbound/planned |
| record-verification | robinhood | planned | 0/0 | verification.record.create: robinhood-testnet=unbound/planned, robinhood-mainnet=unbound/planned; verification.record.verify: robinhood-testnet=unbound/planned, robinhood-mainnet=unbound/planned |
| record-verification | tempo | verified | 2/2 | verification.record.create: tempo-testnet=kernel-gateway/testnet_verified, tempo-mainnet=unbound/planned; verification.record.verify: tempo-testnet=kernel-gateway/testnet_verified, tempo-mainnet=unbound/planned |
| record-verification | zcash | planned | 0/0 | verification.record.create: zcash-testnet=unbound/planned; verification.record.verify: zcash-testnet=unbound/planned |
| record-verification | hyperliquid | verified | 2/2 | verification.record.create: hyperliquid-testnet=kernel-gateway/testnet_verified; verification.record.verify: hyperliquid-testnet=kernel-gateway/testnet_verified |
| record-verification | stellar | planned | 0/0 | verification.record.create: stellar-testnet=unbound/planned; verification.record.verify: stellar-testnet=unbound/planned |
| payroll | solana | partial | 2/3 | payroll.calculate: solana-devnet=kernel-gateway/devnet_verified, solana-mainnet-beta=unbound/planned; payroll.approve: solana-devnet=kernel-gateway/devnet_verified, solana-mainnet-beta=unbound/planned; payroll.settle: solana-devnet=legacy-provider/devnet_verified, solana-mainnet-beta=unbound/planned |
| payroll | ethereum | planned | 0/0 | payroll.calculate: ethereum-sepolia=unbound/planned, ethereum-mainnet=unbound/planned; payroll.approve: ethereum-sepolia=unbound/planned, ethereum-mainnet=unbound/planned; payroll.settle: ethereum-sepolia=unbound/planned, ethereum-mainnet=unbound/planned |
| payroll | arbitrum | planned | 0/0 | payroll.calculate: arbitrum-sepolia=unbound/planned, arbitrum-one=unbound/planned; payroll.approve: arbitrum-sepolia=unbound/planned, arbitrum-one=unbound/planned; payroll.settle: arbitrum-sepolia=unbound/planned, arbitrum-one=unbound/planned |
| payroll | bnb | partial | 1/3 | payroll.calculate: bnb-testnet=kernel-gateway/implementation, bnb-mainnet=unbound/planned; payroll.approve: bnb-testnet=kernel-gateway/implementation, bnb-mainnet=unbound/planned; payroll.settle: bnb-testnet=kernel-gateway/testnet_verified, bnb-mainnet=unbound/planned |
| payroll | base | planned | 0/0 | payroll.calculate: base-sepolia=unbound/planned, base-mainnet=unbound/planned; payroll.approve: base-sepolia=unbound/planned, base-mainnet=unbound/planned; payroll.settle: base-sepolia=unbound/planned, base-mainnet=unbound/planned |
| payroll | robinhood | planned | 0/0 | payroll.calculate: robinhood-testnet=unbound/planned, robinhood-mainnet=unbound/planned; payroll.approve: robinhood-testnet=unbound/planned, robinhood-mainnet=unbound/planned; payroll.settle: robinhood-testnet=unbound/planned, robinhood-mainnet=unbound/planned |
| payroll | tempo | planned | 0/0 | payroll.calculate: tempo-testnet=unbound/planned, tempo-mainnet=unbound/planned; payroll.approve: tempo-testnet=unbound/planned, tempo-mainnet=unbound/planned; payroll.settle: tempo-testnet=unbound/planned, tempo-mainnet=unbound/planned |
| payroll | zcash | planned | 0/0 | payroll.calculate: zcash-testnet=unbound/planned; payroll.approve: zcash-testnet=unbound/planned; payroll.settle: zcash-testnet=unbound/planned |
| payroll | hyperliquid | planned | 0/0 | payroll.calculate: hyperliquid-testnet=unbound/planned; payroll.approve: hyperliquid-testnet=unbound/planned; payroll.settle: hyperliquid-testnet=unbound/planned |
| payroll | stellar | planned | 0/0 | payroll.calculate: stellar-testnet=unbound/planned; payroll.approve: stellar-testnet=unbound/planned; payroll.settle: stellar-testnet=unbound/planned |
| treasury | solana | planned | 0/1 | treasury.policy.check: solana-devnet=kernel-gateway/implementation, solana-mainnet-beta=unbound/planned |
| treasury | ethereum | verified | 1/1 | treasury.policy.check: ethereum-sepolia=kernel-gateway/testnet_verified, ethereum-mainnet=unbound/planned |
| treasury | arbitrum | verified | 1/1 | treasury.policy.check: arbitrum-sepolia=kernel-gateway/testnet_verified, arbitrum-one=unbound/planned |
| treasury | bnb | verified | 1/1 | treasury.policy.check: bnb-testnet=kernel-gateway/testnet_verified, bnb-mainnet=unbound/planned |
| treasury | base | planned | 0/0 | treasury.policy.check: base-sepolia=unbound/planned, base-mainnet=unbound/planned |
| treasury | robinhood | verified | 1/1 | treasury.policy.check: robinhood-testnet=kernel-gateway/testnet_verified, robinhood-mainnet=unbound/planned |
| treasury | tempo | verified | 1/1 | treasury.policy.check: tempo-testnet=kernel-gateway/testnet_verified, tempo-mainnet=unbound/planned |
| treasury | zcash | planned | 0/0 | treasury.policy.check: zcash-testnet=unbound/planned |
| treasury | hyperliquid | planned | 0/0 | treasury.policy.check: hyperliquid-testnet=unbound/planned |
| treasury | stellar | planned | 0/0 | treasury.policy.check: stellar-testnet=unbound/planned |
| governance | solana | unbound | 0/1 | governance.proposal.execute: solana-devnet=unbound/implementation, solana-mainnet-beta=unbound/planned |
| governance | ethereum | verified | 1/1 | governance.proposal.execute: ethereum-sepolia=kernel-gateway/testnet_verified, ethereum-mainnet=unbound/planned |
| governance | arbitrum | verified | 1/1 | governance.proposal.execute: arbitrum-sepolia=kernel-gateway/testnet_verified, arbitrum-one=unbound/planned |
| governance | bnb | verified | 1/1 | governance.proposal.execute: bnb-testnet=kernel-gateway/testnet_verified, bnb-mainnet=unbound/planned |
| governance | base | planned | 0/0 | governance.proposal.execute: base-sepolia=unbound/planned, base-mainnet=unbound/planned |
| governance | robinhood | verified | 1/1 | governance.proposal.execute: robinhood-testnet=kernel-gateway/testnet_verified, robinhood-mainnet=unbound/planned |
| governance | tempo | verified | 1/1 | governance.proposal.execute: tempo-testnet=kernel-gateway/testnet_verified, tempo-mainnet=unbound/planned |
| governance | zcash | planned | 0/0 | governance.proposal.execute: zcash-testnet=unbound/planned |
| governance | hyperliquid | planned | 0/0 | governance.proposal.execute: hyperliquid-testnet=unbound/planned |
| governance | stellar | planned | 0/0 | governance.proposal.execute: stellar-testnet=unbound/planned |
| auction | solana | planned | 0/2 | auction.bid.commit: solana-devnet=kernel-gateway/implementation, solana-mainnet-beta=unbound/planned; auction.settle: solana-devnet=kernel-gateway/implementation, solana-mainnet-beta=unbound/planned |
| auction | ethereum | verified | 2/2 | auction.bid.commit: ethereum-sepolia=kernel-gateway/testnet_verified, ethereum-mainnet=unbound/planned; auction.settle: ethereum-sepolia=kernel-gateway/testnet_verified, ethereum-mainnet=unbound/planned |
| auction | arbitrum | verified | 2/2 | auction.bid.commit: arbitrum-sepolia=kernel-gateway/testnet_verified, arbitrum-one=unbound/planned; auction.settle: arbitrum-sepolia=kernel-gateway/testnet_verified, arbitrum-one=unbound/planned |
| auction | bnb | verified | 2/2 | auction.bid.commit: bnb-testnet=kernel-gateway/testnet_verified, bnb-mainnet=unbound/planned; auction.settle: bnb-testnet=kernel-gateway/testnet_verified, bnb-mainnet=unbound/planned |
| auction | base | planned | 0/0 | auction.bid.commit: base-sepolia=unbound/planned, base-mainnet=unbound/planned; auction.settle: base-sepolia=unbound/planned, base-mainnet=unbound/planned |
| auction | robinhood | verified | 2/2 | auction.bid.commit: robinhood-testnet=kernel-gateway/testnet_verified, robinhood-mainnet=unbound/planned; auction.settle: robinhood-testnet=kernel-gateway/testnet_verified, robinhood-mainnet=unbound/planned |
| auction | tempo | verified | 2/2 | auction.bid.commit: tempo-testnet=kernel-gateway/testnet_verified, tempo-mainnet=unbound/planned; auction.settle: tempo-testnet=kernel-gateway/testnet_verified, tempo-mainnet=unbound/planned |
| auction | zcash | planned | 0/0 | auction.bid.commit: zcash-testnet=unbound/planned; auction.settle: zcash-testnet=unbound/planned |
| auction | hyperliquid | planned | 0/0 | auction.bid.commit: hyperliquid-testnet=unbound/planned; auction.settle: hyperliquid-testnet=unbound/planned |
| auction | stellar | planned | 0/0 | auction.bid.commit: stellar-testnet=unbound/planned; auction.settle: stellar-testnet=unbound/planned |
