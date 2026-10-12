import type { PrivatePayoutProviderId } from "@/lib/providers/private-payout-provider";
import { assertKnownPrivatePayoutProvider } from "@/lib/providers/private-payout-provider";
import { sandboxPrivatePayoutProvider } from "@/lib/providers/sandbox-private-payout-provider";
import { umbraPrivatePayoutProvider } from "@/lib/providers/umbra-provider";

export async function getPrivatePayoutProvider(provider?: PrivatePayoutProviderId | "default") {
  assertKnownPrivatePayoutProvider(provider);
  if (provider === "sandbox-testnet") return sandboxPrivatePayoutProvider;
  if (provider === "umbra") {
    if (process.env.PDAO_ENABLE_LEGACY_UMBRA !== "1") {
      throw new Error("Umbra is a legacy Solana payout rail and is disabled for current product execution.");
    }
    return umbraPrivatePayoutProvider;
  }

  // No current product defaults to Umbra. Sandbox execution is intentionally
  // opt-in; a missing active settlement adapter must fail closed rather than
  // silently producing a deterministic receipt.
  if (process.env.NODE_ENV !== "production" && process.env.PRIVATE_DAO_PAYOUT_MODE === "sandbox") {
    return sandboxPrivatePayoutProvider;
  }

  throw new Error("No active Solana private-payout provider is configured; Umbra is legacy-disabled and settlement must use an approved Kernel adapter.");
}

export async function getPrivatePayoutProviderStatuses() {
  return Promise.all([
    umbraPrivatePayoutProvider.getProviderStatus(),
    sandboxPrivatePayoutProvider.getProviderStatus(),
  ]);
}
