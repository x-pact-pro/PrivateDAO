import { LegacyRouteRedirect } from "@/components/legacy-route-redirect";

export default function PalmUsdHyphenLegacyPage() {
  return (
    <LegacyRouteRedirect
      title="Palm USD route preserved"
      description="Palm USD and PUSD treasury work now routes through the governed PUSD stablecoin operating lane."
      target="/services/pusd-stablecoin"
      label="Open PUSD stablecoin lane"
    />
  );
}
