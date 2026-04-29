import type { MetadataRoute } from "next";

import { getCuratedDocuments, isIndexableCuratedDocumentSlug } from "@/lib/curated-documents";
import { siteUrl } from "@/lib/site-brand";

export const dynamic = "force-static";

const coreRoutes = [
  "",
  "/start",
  "/judge",
  "/trust",
  "/govern",
  "/execute",
  "/intelligence",
  "/treasury",
  "/payroll",
  "/compliance",
  "/gaming",
  "/gaming/tournaments",
  "/gaming/inventory",
  "/developers",
  "/rpc-services",
  "/command-center",
  "/android",
  "/services",
  "/services/privacy-sdk-api-starter",
  "/services/qvac-sovereign-ai",
  "/services/umbra-confidential-payout",
  "/services/cloak-private-settlement",
  "/services/audd-stablecoin",
  "/services/pusd-stablecoin",
  "/services/jupiter-treasury-route",
  "/services/torque-growth-loop",
  "/services/zerion-agent-policy",
  "/services/runtime-infrastructure",
  "/proof",
  "/security",
  "/products",
  "/community",
  "/learn",
  "/documents",
  "/awards",
  "/story",
];

function withCanonicalSlash(path: string) {
  if (path === "") return `${siteUrl}/`;
  return `${siteUrl}${path.replace(/\/+$/, "")}/`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const coreEntries: MetadataRoute.Sitemap = coreRoutes.map((path) => ({
    url: withCanonicalSlash(path),
    lastModified: now,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : path === "/start" || path === "/services" || path === "/proof" ? 0.9 : 0.7,
  }));

  const documentEntries: MetadataRoute.Sitemap = getCuratedDocuments()
    .filter((document) => isIndexableCuratedDocumentSlug(document.slug))
    .map((document) => ({
    url: withCanonicalSlash(`/documents/${document.slug}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: document.category === "Reviewer core" || document.category === "Trust" ? 0.8 : 0.6,
  }));

  return [...coreEntries, ...documentEntries];
}
