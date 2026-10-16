import { InMemoryProviderRegistry, PrivateDaoKernel, type KernelOptions } from "./kernel.js";
import { ProductExecutionGateway } from "./product-gateway.js";
import { registerCatalogCapabilities } from "./product-registry.js";
import { InMemoryProtocolRegistry, type ProtocolRegistry } from "./protocol.js";
import type { ProviderRegistry } from "./index.js";
import { PayrollCalculationProvider } from "./payroll-provider.js";
import { TreasuryPolicyProvider } from "./treasury-policy-provider.js";
import { RecordCreationProvider, RecordVerificationProvider } from "./record-provider.js";
import { AgentDiscoveryProvider } from "./agent-provider.js";
import { BlindPolicyProofProvider } from "./blind-policy-provider.js";
import { AuctionOutcomeProofProvider } from "./auction-outcome-provider.js";
import { AuctionBidCommitProvider } from "./auction-bid-provider.js";
import { PayrollApprovalProvider } from "./payroll-approval-provider.js";
import { GovernanceProposalProvider } from "./governance-proposal-provider.js";
import { PayrollSettlementProvider } from "./payroll-settlement-provider.js";

/**
 * Single composition boundary for PrivateDAO applications.
 *
 * Product code receives the gateway, never a provider or an RPC client. A
 * caller must register a real provider before preparing any execution; this
 * factory deliberately does not create a test-only provider or fallback
 * success path.
 */
export interface PrivateDaoRuntime {
  readonly providers: ProviderRegistry;
  readonly protocols: ProtocolRegistry;
  readonly kernel: PrivateDaoKernel;
  readonly gateway: ProductExecutionGateway;
}

export function createPrivateDaoRuntime(providers?: ProviderRegistry, options: KernelOptions = {}): PrivateDaoRuntime {
  const providerRegistry = providers ?? new InMemoryProviderRegistry();
  if (!providers && providerRegistry instanceof InMemoryProviderRegistry) {
    providerRegistry.register(new PayrollCalculationProvider());
    providerRegistry.register(new PayrollApprovalProvider());
    providerRegistry.register(new GovernanceProposalProvider());
    providerRegistry.register(new PayrollSettlementProvider());
    providerRegistry.register(new TreasuryPolicyProvider());
    providerRegistry.register(new RecordCreationProvider());
    providerRegistry.register(new RecordVerificationProvider());
    providerRegistry.register(new AgentDiscoveryProvider());
    providerRegistry.register(new BlindPolicyProofProvider());
    providerRegistry.register(new AuctionOutcomeProofProvider());
    providerRegistry.register(new AuctionBidCommitProvider());
  }
  const protocols = new InMemoryProtocolRegistry();
  registerCatalogCapabilities(protocols);
  const kernel = new PrivateDaoKernel(providerRegistry, options);
  return {
    providers: providerRegistry,
    protocols,
    kernel,
    gateway: new ProductExecutionGateway(kernel, protocols),
  };
}
