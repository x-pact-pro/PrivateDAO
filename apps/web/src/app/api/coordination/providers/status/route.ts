import { NextResponse } from "next/server";

import { getOraclePriceProvider } from "@/lib/oracle/oracle-price-provider";
import { getConfidentialVestingProvider } from "@/lib/providers/confidential-vesting-provider";
import { getPrivatePayoutProviderStatuses } from "@/lib/providers/private-payout-registry";
import { getTokenIntelligenceProvider } from "@/lib/tokens/token-intelligence-provider";

export const dynamic = "force-static";

export async function GET() {
  const tokenProvider = getTokenIntelligenceProvider();
  const priceProvider = getOraclePriceProvider();
  const vestingProvider = getConfidentialVestingProvider();
  const payoutProviders = await getPrivatePayoutProviderStatuses();

  return NextResponse.json({
    ok: true,
    productFrame: "Private coordination layer for DAOs with public verification.",
    userVisibleFlow: "Context before decisions, private coordination during decisions, public proof after execution.",
    providers: {
      assetContext: tokenProvider.getStatus(),
      priceContext: priceProvider.getStatus(),
      privatePayout: payoutProviders,
      confidentialVesting: vestingProvider.getStatus(),
    },
  });
}
