import { LegacyRouteRedirect } from "@/components/legacy-route-redirect";

export default function DevnetBillingRehearsalLegacyPage() {
  return (
    <LegacyRouteRedirect
      title="Billing rehearsal route preserved"
      description="This historical billing route now forwards to the current Testnet billing rehearsal so old links keep working without creating a duplicate payment surface."
      target="/services/testnet-billing-rehearsal"
      label="Open current billing route"
    />
  );
}
