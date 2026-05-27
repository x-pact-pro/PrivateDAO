import { LegacyRouteRedirect } from "@/components/legacy-route-redirect";

export default function IntelligenceTypoLegacyPage() {
  return (
    <LegacyRouteRedirect
      title="Intelligence route preserved"
      description="This typo-preserved route now forwards to the live intelligence review gate before wallet execution."
      target="/intelligence"
      label="Open intelligence"
    />
  );
}
