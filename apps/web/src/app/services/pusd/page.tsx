import { LegacyRouteRedirect } from "@/components/legacy-route-redirect";

export default function PusdLegacyPage() {
  return (
    <LegacyRouteRedirect
      title="PUSD route preserved"
      description="The active PUSD route keeps payroll, grants, rewards, wallet signing, and proof continuity in one stablecoin operating lane."
      target="/services/pusd-stablecoin"
      label="Open PUSD stablecoin lane"
    />
  );
}
