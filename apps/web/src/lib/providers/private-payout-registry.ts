import type { PrivatePayoutProviderId } from "@/lib/providers/private-payout-provider";
import { assertKnownPrivatePayoutProvider } from "@/lib/providers/private-payout-provider";
import { sandboxPrivatePayoutProvider } from "@/lib/providers/sandbox-private-payout-provider";
import { umbraPrivatePayoutProvider } from "@/lib/providers/umbra-provider";

export async function getPrivatePayoutProvider(provider?: PrivatePayoutProviderId | "default") {
  assertKnownPrivatePayoutProvider(provider);
  if (provider === "sandbox-testnet") return sandboxPrivatePayoutProvider;
  if (provider === "umbra") return umbraPrivatePayoutProvider;

  const status = await umbraPrivatePayoutProvider.getProviderStatus();
  return status.configured ? umbraPrivatePayoutProvider : sandboxPrivatePayoutProvider;
}

export async function getPrivatePayoutProviderStatuses() {
  return Promise.all([
    umbraPrivatePayoutProvider.getProviderStatus(),
    sandboxPrivatePayoutProvider.getProviderStatus(),
  ]);
}
