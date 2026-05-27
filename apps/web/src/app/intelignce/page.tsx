import { LegacyRouteRedirect } from "@/components/legacy-route-redirect";

export default function IntelligenceShortTypoLegacyPage() {
  return (
    <LegacyRouteRedirect
      title="Intelligence route preserved"
      description="This historical spelling now forwards to the live intelligence review gate before wallet execution."
      target="/intelligence"
      label="Open intelligence"
    />
  );
}
