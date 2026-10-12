import { runtimeCatalog } from "@/lib/runtime-catalog.generated";

const VERIFIED_EVIDENCE = new Set<string>(["devnet_verified", "testnet_verified", "mainnet_live"]);

export const dynamic = "force-static";

/**
 * Machine-readable projection of the canonical Kernel catalog. This endpoint
 * describes contracts and declared availability; it does not claim that a
 * transaction was executed or that a provider exists at runtime.
 */
export function GET() {
  return Response.json({
    schemaVersion: "privatedao.runtime-catalog.v1",
    generatedFrom: runtimeCatalog.generatedFrom,
    products: runtimeCatalog.products.map((product) => ({
      ...product,
      capabilities: product.capabilities.map((capability) => {
        const modes: string[] = capability.applicationBindings.map((binding) => binding.mode);
        const evidenceBacked = capability.applicationBindings.some(
          (binding) => binding.mode === "kernel-gateway" && binding.supportsExecution && VERIFIED_EVIDENCE.has(binding.evidenceStatus),
        );
        const executionStatus = evidenceBacked
          ? "kernel-bound"
          : modes.includes("legacy-provider")
            ? "legacy-provider"
            : "unbound";
        return {
          ...capability,
          executionStatus,
          // Legacy routes remain discoverable for compatibility, but are not
          // advertised as Kernel-backed execution.
          executable: executionStatus === "kernel-bound",
          evidenceBacked,
          legacyRouteAvailable: executionStatus === "legacy-provider",
        };
      }),
    })),
    networks: runtimeCatalog.networks,
    paymentRails: runtimeCatalog.paymentRails,
  });
}
