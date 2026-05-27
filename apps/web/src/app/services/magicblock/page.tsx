import { LegacyRouteRedirect } from "@/components/legacy-route-redirect";

export default function MagicBlockLegacyPage() {
  return (
    <LegacyRouteRedirect
      title="MagicBlock route preserved"
      description="MagicBlock private payments now route through the live Testnet private-payments surface."
      target="/services/magicblock-private-payments"
      label="Open MagicBlock private payments"
    />
  );
}
