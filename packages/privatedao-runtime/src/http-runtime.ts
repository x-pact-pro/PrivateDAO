import { PRODUCT_CATALOG } from "./catalog.js";
import { findApplicationBinding } from "./application-bindings.js";
import { TransportBackedNetworkAdapter } from "./adapters.js";
import { HttpExecutionTransport, type HttpExecutionTransportOptions } from "./http-transport.js";
import { InMemoryProviderRegistry } from "./kernel.js";
import type { CapabilityId, NetworkId, PrivateDaoRuntime, ProviderId } from "./index.js";
import { createPrivateDaoRuntime } from "./runtime.js";

export interface HttpBackedRuntimeOptions extends HttpExecutionTransportOptions {
  providerId: ProviderId;
  network: NetworkId;
  capabilities: readonly CapabilityId[];
}

/**
 * Production composition boundary for a provider exposed by an HTTP service.
 * The service remains responsible for network access, signing, persistence,
 * and observed receipts; this factory only wires its lifecycle into Kernel.
 */
export function createHttpBackedPrivateDaoRuntime(options: HttpBackedRuntimeOptions): PrivateDaoRuntime {
  const catalogCapabilities = PRODUCT_CATALOG.flatMap((product) => product.capabilities);
  const requested = new Set(options.capabilities);
  const unknown = options.capabilities.filter(
    (capability) => !catalogCapabilities.some((entry) => entry.id === capability && entry.networks.includes(options.network)),
  );
  if (unknown.length > 0) {
    throw new Error(`HTTP provider capabilities are not declared for ${options.network}: ${unknown.join(", ")}`);
  }

  const capabilities = catalogCapabilities.filter(
    (capability) => requested.has(capability.id) && capability.networks.includes(options.network),
  );
  if (capabilities.length === 0) {
    throw new Error(`HTTP provider has no declared capabilities for ${options.network}.`);
  }
  const nonGateway = capabilities.filter((capability) => {
    const product = PRODUCT_CATALOG.find((entry) => entry.capabilities.some((candidate) => candidate.id === capability.id));
    return !product || findApplicationBinding(product.id, capability.id, options.network).mode !== "kernel-gateway";
  });
  if (nonGateway.length > 0) {
    throw new Error(`HTTP provider capabilities must use a Kernel gateway binding: ${nonGateway.map((capability) => capability.id).join(", ")}`);
  }

  const transport = new HttpExecutionTransport(options);
  const provider = new TransportBackedNetworkAdapter({
    id: options.providerId,
    network: options.network,
    capabilities,
    transport,
  });
  const providers = new InMemoryProviderRegistry();
  providers.register(provider);
  return createPrivateDaoRuntime(providers);
}
