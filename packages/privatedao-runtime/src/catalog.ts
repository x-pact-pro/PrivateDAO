import type { CapabilityId, NetworkId, ProductId, ProtocolCapability } from "./index.js";
import { getNetwork, isNetworkAvailable } from "./networks.js";

export type ProductAvailability = "available" | "planned";
export type ProductDomain = "enterprise" | "agent-exchange";

export interface ProductDescriptor {
  id: ProductId;
  name: string;
  domain: ProductDomain;
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
const hyperliquidTestnet = "hyperliquid-testnet" as NetworkId;
const robinhoodTestnet = "robinhood-testnet" as NetworkId;
const tempoTestnet = "tempo-testnet" as NetworkId;

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
    domain: "enterprise",
    availability: "available",
    networks: [solanaDevnet, ethereumSepolia, arbitrumSepolia, tempoTestnet, baseSepolia, bnbTestnet, hyperliquidTestnet],
    capabilities: [
      capability("verification.blind.prove", "blind-verification", false, true, [solanaDevnet, ethereumSepolia, arbitrumSepolia, tempoTestnet, baseSepolia, bnbTestnet, hyperliquidTestnet]),
    ],
  },
  {
    id: "record-verification",
    name: "Record Verification",
    domain: "enterprise",
    availability: "available",
    networks: [solanaDevnet, ethereumSepolia, arbitrumSepolia, tempoTestnet, baseSepolia, bnbTestnet, hyperliquidTestnet],
    capabilities: [
      capability("verification.record.create", "record-verification", false, true, [solanaDevnet, ethereumSepolia, arbitrumSepolia, tempoTestnet, baseSepolia, bnbTestnet, hyperliquidTestnet]),
      capability("verification.record.verify", "record-verification", false, true, [solanaDevnet, ethereumSepolia, arbitrumSepolia, tempoTestnet, baseSepolia, bnbTestnet, hyperliquidTestnet]),
    ],
  },
  {
    id: "payroll",
    name: "Confidential Payroll",
    domain: "enterprise",
    availability: "available",
    networks: [solanaDevnet, bnbTestnet],
    capabilities: [
      capability("payroll.calculate", "payroll", false, true, [solanaDevnet, bnbTestnet]),
      capability("payroll.approve", "payroll", true, true, [solanaDevnet, bnbTestnet]),
      capability("payroll.settle", "payroll", true, true, [solanaDevnet, bnbTestnet]),
    ],
  },
  {
    id: "treasury",
    name: "Private Treasury",
    domain: "enterprise",
    availability: "available",
    networks: [solanaDevnet, ethereumSepolia, arbitrumSepolia, robinhoodTestnet, tempoTestnet, bnbTestnet],
    capabilities: [capability("treasury.policy.check", "treasury", false, true, [solanaDevnet, ethereumSepolia, arbitrumSepolia, robinhoodTestnet, tempoTestnet, bnbTestnet])],
  },
  {
    id: "governance",
    name: "Private Governance",
    domain: "enterprise",
    availability: "available",
    networks: [solanaDevnet, ethereumSepolia, arbitrumSepolia, robinhoodTestnet, tempoTestnet, bnbTestnet],
    capabilities: [capability("governance.proposal.execute", "governance", true, true, [solanaDevnet, ethereumSepolia, arbitrumSepolia, robinhoodTestnet, tempoTestnet, bnbTestnet])],
  },
  {
    id: "auction",
    name: "Private Auctions",
    domain: "enterprise",
    availability: "available",
    networks: [solanaDevnet, ethereumSepolia, arbitrumSepolia, robinhoodTestnet, tempoTestnet, bnbTestnet],
    capabilities: [
      // The current endpoint issues commitments/proof data off-chain; it does
      // not submit the financial bid transaction.
      capability("auction.bid.commit", "auction", false, true, [solanaDevnet, ethereumSepolia, arbitrumSepolia, robinhoodTestnet, tempoTestnet, bnbTestnet]),
      // The current Kernel action proves an already-bound outcome. It does
      // not submit the financial settlement transaction.
      capability("auction.settle", "auction", false, true, [solanaDevnet, ethereumSepolia, arbitrumSepolia, robinhoodTestnet, tempoTestnet, bnbTestnet]),
    ],
  },
  {
    id: "agent",
    name: "Agent Marketplace",
    domain: "agent-exchange",
    availability: "available",
    networks: [solanaDevnet, solanaMainnet],
    capabilities: [
      capability("agent.discover", "agent", false, true, [solanaDevnet, solanaMainnet]),
      capability("agent.invoke", "agent", true, true, [solanaDevnet, solanaMainnet]),
    ],
  },
];

export const ENTERPRISE_PRODUCT_IDS = [
  "blind-verification",
  "record-verification",
  "payroll",
  "treasury",
  "governance",
  "auction",
] as const satisfies readonly ProductId[];

export const AGENT_EXCHANGE_PRODUCT_IDS = ["agent"] as const satisfies readonly ProductId[];

export function isEnterpriseProduct(productId: ProductId): boolean {
  return (ENTERPRISE_PRODUCT_IDS as readonly ProductId[]).includes(productId);
}

export function validateProductCatalog(catalog: readonly ProductDescriptor[] = PRODUCT_CATALOG): string[] {
  const errors: string[] = [];
  const productIds = new Set<ProductId>();
  const capabilityIds = new Set<CapabilityId>();
  for (const product of catalog) {
    if (productIds.has(product.id)) errors.push(`duplicate product ${product.id}`);
    productIds.add(product.id);
    const expectedDomain = product.id === "agent" ? "agent-exchange" : "enterprise";
    if (product.domain !== expectedDomain) errors.push(`${product.id}: domain must be ${expectedDomain}`);
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
