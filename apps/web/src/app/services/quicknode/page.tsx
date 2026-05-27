import { LegacyRouteRedirect } from "@/components/legacy-route-redirect";

export default function QuickNodeLegacyPage() {
  return (
    <LegacyRouteRedirect
      title="QuickNode route preserved"
      description="QuickNode RPC and stream telemetry now route through runtime infrastructure and API status proof."
      target="/services/runtime-infrastructure"
      label="Open runtime infrastructure"
    />
  );
}
