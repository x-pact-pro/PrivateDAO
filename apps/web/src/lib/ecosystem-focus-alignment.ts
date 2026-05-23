import { readRepoJson } from "@/lib/repo-docs";

export type EcosystemFocusArea = {
  slug: string;
  title: string;
  fit: "strong" | "moderate" | "selective";
  whatWorksNow: string;
  whyItMatters: string;
  exactGap: string;
  bestRoutes: string[];
};

type EcosystemFocusPayload = {
  generatedAt: string;
  title: string;
  summary: string;
  focusAreas: EcosystemFocusArea[];
};

function readJson<T>(relativePath: string): T {
  return readRepoJson<T>(relativePath);
}

export function getEcosystemFocusAlignment() {
  return readJson<EcosystemFocusPayload>("docs/ecosystem-focus-alignment.generated.json");
}
