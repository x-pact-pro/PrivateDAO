import type { CapabilityId, NetworkId, ProductId, ProtocolCapability } from "./index.js";
import { getNetwork, isNetworkAvailable } from "./networks.js";

export type ProductAvailability = "available" | "planned";

export interface ProductDescriptor {
  id: ProductId;
  name: string;
  availability: ProductAvailability;
  networks: readonly NetworkId[];
  capabilities: readonly ProtocolCapability[];
}

const solanaDevnet = "solana-devnet" as NetworkId;
const solanaMainnet = "solana-mainnet-beta" as NetworkId;
const ethereumSepolia = "ethereum-sepolia" as NetworkId;
const arbitrumSepolia = "arbitrum-sepolia" as NetworkId;
const baseSepolia = "base-sepolia" as NetworkId;
const bnbTestnet = "bnb-testnet" as NetworkId;
const tempoTestnet = "tempo-testnet" as NetworkId;
const zcashTestnet = "zcash-testnet" as NetworkId;
const stellarTestnet = "stellar-testnet" as NetworkId;
const robinhoodTestnet = "robinhood-testnet" as NetworkId;
const hyperliquidTestnet = "hyperliquid-testnet" as NetworkId;
const hypercoreTestnet = "hypercore-testnet" as NetworkId;

function capability(
  id: CapabilityId,
  product: ProductId,
  requiresSignature: boolean,
  supportsAsync = true,
  networks: readonly NetworkId[] = [solanaDevnet],
): ProtocolCapability {
  return {
    id,
    version: "1.0",
    product,
    networks,
    requiresSignature,
    supportsAsync,
    receiptSchema: "privatedao.execution-receipt.v1",
  };
}

export const PRODUCT_CATALOG: readonly ProductDescriptor[] = [
  {
    id: "blind-verification",
    name: "Blind Verification",
    availability: "available",
    networks: [solanaDevnet, ethereumSepolia, arbitrumSepolia, tempoTestnet, baseSepolia, bnbTestnet, zcashTestnet, stellarTestnet, robinhoodTestnet, hyperliquidTestnet, hypercoreTestnet],
    capabilities: [
      capability("verification.blind.prove", "blind-verification", false, true, [solanaDevnet, ethereumSepolia, arbitrumSepolia, tempoTestnet, baseSepolia, bnbTestnet, zcashTestnet, stellarTestnet, robinhoodTestnet, hyperliquidTestnet, hypercoreTestnet]),
    ],
  },
  {
    id: "record-verification",
    name: "Record Verification",
    availability: "available",
    networks: [solanaDevnet, ethereumSepolia, arbitrumSepolia, tempoTestnet, baseSepolia, bnbTestnet, zcashTestnet, stellarTestnet, robinhoodTestnet, hyperliquidTestnet, hypercoreTestnet],
    capabilities: [
      capability("verification.record.create", "record-verification", false, true, [solanaDevnet, ethereumSepolia, arbitrumSepolia, tempoTestnet, baseSepolia, bnbTestnet, zcashTestnet, stellarTestnet, robinhoodTestnet, hyperliquidTestnet, hypercoreTestnet]),
      capability("verification.record.verify", "record-verification", false, true, [solanaDevnet, ethereumSepolia, arbitrumSepolia, tempoTestnet, baseSepolia, bnbTestnet, zcashTestnet, stellarTestnet, robinhoodTestnet, hyperliquidTestnet, hypercoreTestnet]),
    ],
  },
  {
    id: "payroll",
    name: "Confidential Payroll",
    availability: "available",
    // Calculation and approval are Kernel workflows and can run on every
    // configured test network. Private settlement is a separate capability
    // and is only exposed after its network-specific E2E gate passes.
    networks: [solanaDevnet, ethereumSepolia, arbitrumSepolia, tempoTestnet, baseSepolia, bnbTestnet, zcashTestnet, stellarTestnet, robinhoodTestnet, hyperliquidTestnet, hypercoreTestnet],
    capabilities: [
      capability("payroll.calculate", "payroll", false, true, [solanaDevnet, ethereumSepolia, arbitrumSepolia, tempoTestnet, baseSepolia, bnbTestnet, zcashTestnet, stellarTestnet, robinhoodTestnet, hyperliquidTestnet, hypercoreTestnet]),
      capability("payroll.approve", "payroll", true, true, [solanaDevnet, ethereumSepolia, arbitrumSepolia, tempoTestnet, baseSepolia, bnbTestnet, zcashTestnet, stellarTestnet, robinhoodTestnet, hyperliquidTestnet, hypercoreTestnet]),
      // Settlement is exposed only where a network-specific provider exists.
      // Stellar is Kernel-ready for XDR preparation/signing, but remains
      // unverified until an independent funded payout receipt is recorded.
      capability("payroll.settle", "payroll", true, true, [zcashTestnet, bnbTestnet, stellarTestnet]),
    ],
  },
  {
    id: "treasury",
    name: "Private Treasury",
    availability: "available",
    networks: [solanaDevnet, ethereumSepolia, arbitrumSepolia, tempoTestnet, baseSepolia, bnbTestnet, zcashTestnet, stellarTestnet, robinhoodTestnet, hyperliquidTestnet, hypercoreTestnet],
    capabilities: [capability("treasury.policy.check", "treasury", false, true, [solanaDevnet, ethereumSepolia, arbitrumSepolia, tempoTestnet, baseSepolia, bnbTestnet, zcashTestnet, stellarTestnet, robinhoodTestnet, hyperliquidTestnet, hypercoreTestnet])],
  },
  {
    id: "governance",
    name: "Private Governance",
    availability: "available",
    networks: [solanaDevnet, ethereumSepolia, arbitrumSepolia, tempoTestnet, baseSepolia, bnbTestnet, zcashTestnet, stellarTestnet, robinhoodTestnet, hyperliquidTestnet, hypercoreTestnet],
    capabilities: [capability("governance.proposal.execute", "governance", true, true, [solanaDevnet, ethereumSepolia, arbitrumSepolia, tempoTestnet, baseSepolia, bnbTestnet, zcashTestnet, stellarTestnet, robinhoodTestnet, hyperliquidTestnet, hypercoreTestnet])],
  },
  {
    id: "auction",
    name: "Private Auctions",
    availability: "available",
    networks: [solanaDevnet, ethereumSepolia, arbitrumSepolia, tempoTestnet, baseSepolia, bnbTestnet, zcashTestnet, stellarTestnet, robinhoodTestnet, hyperliquidTestnet, hypercoreTestnet],
    capabilities: [
      // The current endpoint issues commitments/proof data off-chain; it does
      // not submit the financial bid transaction.
      capability("auction.bid.commit", "auction", false, true, [solanaDevnet, ethereumSepolia, arbitrumSepolia, tempoTestnet, baseSepolia, bnbTestnet, zcashTestnet, stellarTestnet, robinhoodTestnet, hyperliquidTestnet, hypercoreTestnet]),
      // The current Kernel action proves an already-bound outcome. It does
      // not submit the financial settlement transaction.
      capability("auction.settle", "auction", false, true, [solanaDevnet, ethereumSepolia, arbitrumSepolia, tempoTestnet, baseSepolia, bnbTestnet, zcashTestnet, stellarTestnet, robinhoodTestnet, hyperliquidTestnet, hypercoreTestnet]),
    ],
  },
  {
    id: "agent",
    name: "Agent Marketplace",
    availability: "available",
    networks: [solanaDevnet, solanaMainnet],
    capabilities: [
      capability("agent.discover", "agent", false, true, [solanaDevnet, solanaMainnet]),
      capability("agent.invoke", "agent", true, true, [solanaDevnet, solanaMainnet]),
    ],
  },
];

export function validateProductCatalog(catalog: readonly ProductDescriptor[] = PRODUCT_CATALOG): string[] {
  const errors: string[] = [];
  const productIds = new Set<ProductId>();
  const capabilityIds = new Set<CapabilityId>();
  for (const product of catalog) {
    if (productIds.has(product.id)) errors.push(`duplicate product ${product.id}`);
    productIds.add(product.id);
    for (const network of product.networks) {
      try {
        getNetwork(network);
      } catch {
        errors.push(`${product.id}: unknown network ${network}`);
      }
      if (product.availability === "available" && !isNetworkAvailable(network)) {
        errors.push(`${product.id}: available product uses unavailable network ${network}`);
      }
    }
    for (const capability of product.capabilities) {
      if (capabilityIds.has(capability.id)) errors.push(`duplicate capability ${capability.id}`);
      capabilityIds.add(capability.id);
      if (capability.product !== product.id) errors.push(`${product.id}: capability ${capability.id} has a mismatched product`);
      for (const network of capability.networks) {
        if (!product.networks.includes(network)) errors.push(`${product.id}: capability ${capability.id} uses undeclared network ${network}`);
        if (product.availability === "available" && !isNetworkAvailable(network)) {
          errors.push(`${product.id}: capability ${capability.id} uses unavailable network ${network}`);
        }
      }
    }
  }
  return errors;
}

export function assertProductCatalogValid(catalog: readonly ProductDescriptor[] = PRODUCT_CATALOG): void {
  const errors = validateProductCatalog(catalog);
  if (errors.length > 0) throw new Error(`Invalid PrivateDAO product catalog:\n${errors.join("\n")}`);
}

assertProductCatalogValid();

export function listProducts(): readonly ProductDescriptor[] {
  return PRODUCT_CATALOG;
}

export function findProduct(productId: ProductId): ProductDescriptor {
  const product = PRODUCT_CATALOG.find((entry) => entry.id === productId);
  if (!product) throw new Error(`Unknown PrivateDAO product: ${productId}`);
  return product;
}

export function supportsProductCapability(productId: ProductId, network: NetworkId, capabilityId: CapabilityId): boolean {
  const product = findProduct(productId);
  return product.networks.includes(network) && product.capabilities.some((entry) => entry.id === capabilityId && entry.networks.includes(network));
}
