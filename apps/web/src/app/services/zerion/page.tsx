import { LegacyRouteRedirect } from "@/components/legacy-route-redirect";

export default function ZerionLegacyPage() {
  return (
    <LegacyRouteRedirect
      title="Zerion route preserved"
      description="Zerion portfolio and policy work now routes through the bounded agent policy lane."
      target="/services/zerion-agent-policy"
      label="Open Zerion policy"
    />
  );
}
