import { LegacyRouteRedirect } from "@/components/legacy-route-redirect";

export default function IkaLegacyPage() {
  return (
    <LegacyRouteRedirect
      title="Ika route preserved"
      description="Ika and 2PC-MPC operations now live inside the canonical Encrypt / Ika execution route with Solana final approval proof."
      target="/services/encrypt-ika-operations"
      label="Open Encrypt / Ika"
    />
  );
}
