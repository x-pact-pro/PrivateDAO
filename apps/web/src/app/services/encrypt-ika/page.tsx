import { LegacyRouteRedirect } from "@/components/legacy-route-redirect";

export default function EncryptIkaLegacyPage() {
  return (
    <LegacyRouteRedirect
      title="Encrypt / Ika route preserved"
      description="The current Encrypt / Ika operations route contains REFHE receipts, Ika Solana final approval, and custody preparation."
      target="/services/encrypt-ika-operations"
      label="Open Encrypt / Ika operations"
    />
  );
}
