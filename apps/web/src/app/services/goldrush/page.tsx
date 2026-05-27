import { LegacyRouteRedirect } from "@/components/legacy-route-redirect";

export default function GoldRushLegacyPage() {
  return (
    <LegacyRouteRedirect
      title="GoldRush route preserved"
      description="GoldRush wallet intelligence now routes through the live decision-intelligence lane before execution."
      target="/services/goldrush-decision-intelligence"
      label="Open GoldRush intelligence"
    />
  );
}
