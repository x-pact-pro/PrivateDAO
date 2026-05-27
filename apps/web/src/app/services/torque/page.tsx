import { LegacyRouteRedirect } from "@/components/legacy-route-redirect";

export default function TorqueLegacyPage() {
  return (
    <LegacyRouteRedirect
      title="Torque route preserved"
      description="Torque custom events now route through the live growth loop with server-side delivery evidence."
      target="/services/torque-growth-loop"
      label="Open Torque growth loop"
    />
  );
}
