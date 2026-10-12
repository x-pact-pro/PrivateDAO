import { runtimeCatalog } from "./runtime-catalog.generated";

export type RuntimeProductId = (typeof runtimeCatalog.products)[number]["id"];
export type RuntimeNetworkId = (typeof runtimeCatalog.networks)[number]["id"];
export type RuntimeCapabilityId = (typeof runtimeCatalog.products)[number]["capabilities"][number]["id"];
export type RuntimeBindingMode = "kernel-gateway" | "legacy-provider" | "unbound";

const VERIFIED_EVIDENCE = new Set<string>(["devnet_verified", "testnet_verified", "mainnet_live"]);

export function getRuntimeProduct(productId: RuntimeProductId) {
  const product = runtimeCatalog.products.find((entry) => entry.id === productId);
  if (!product) throw new Error(`Unknown PrivateDAO runtime product: ${productId}`);
  return product;
}

export function getRuntimeCapability(productId: RuntimeProductId, capabilityId: RuntimeCapabilityId) {
  const capability = getRuntimeProduct(productId).capabilities.find((entry) => entry.id === capabilityId);
  if (!capability) throw new Error(`Unknown PrivateDAO runtime capability: ${capabilityId}`);
  return capability;
}

export function isRuntimeCapabilityExecutable(
  productId: RuntimeProductId,
  capabilityId: RuntimeCapabilityId,
  network: RuntimeNetworkId,
): boolean {
  return getRuntimeCapability(productId, capabilityId).applicationBindings.some(
    (binding) => binding.network === network && binding.mode === "kernel-gateway" && binding.supportsExecution && VERIFIED_EVIDENCE.has(binding.evidenceStatus),
  );
}

export function isRuntimeCapabilityLegacyRoute(
  productId: RuntimeProductId,
  capabilityId: RuntimeCapabilityId,
  network: RuntimeNetworkId,
): boolean {
  return getRuntimeCapability(productId, capabilityId).applicationBindings.some(
    (binding) => binding.network === network && (binding.mode as RuntimeBindingMode) === "legacy-provider",
  );
}

export function isRuntimeProductAvailable(productId: RuntimeProductId): boolean {
  const product = getRuntimeProduct(productId);
  if (product.availability !== "available") return false;

  // A product is advertised as available only when every declared capability
  // has at least one Kernel-backed application lane. A legacy or unbound
  // capability can remain visible as roadmap/context, but must not create a
  // misleading "Available now" claim in the commercial surface.
  return product.capabilities.every((capability) =>
    capability.applicationBindings.some((binding) => (binding.mode as RuntimeBindingMode) === "kernel-gateway" && binding.supportsExecution && VERIFIED_EVIDENCE.has(binding.evidenceStatus)),
  );
}

export function getRuntimeProductIds(): readonly RuntimeProductId[] {
  return runtimeCatalog.products.map((product) => product.id);
}
