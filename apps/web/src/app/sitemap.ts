import type { MetadataRoute } from "next";

import { getCuratedDocuments, isIndexableCuratedDocumentSlug } from "@/lib/curated-documents";
import { siteUrl } from "@/lib/site-brand";

export const dynamic = "force-static";

const coreRoutes = [
  "",
  "/start",
  "/about",
  "/judge",
  "/futardio",
  "/trust",
  "/whitepaper",
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
  "/legal",
  "/rpc-services",
  "/command-center",
  "/api-status",
  "/dashboard",
  "/diagnostics",
  "/analytics",
  "/assistant",
  "/live",
  "/custody",
  "/engage",
  "/android",
  "/services",
  "/services/confidential-payments",
  "/services/consumer-governance-ux",
  "/services/eitherway-live-dapp",
  "/services/encrypt-ika-operations",
  "/services/goldrush-decision-intelligence",
  "/services/jupiter-treasury-route",
  "/services/magicblock-private-payments",
  "/services/main-frontier-closure",
  "/services/privacy-sdk-api-starter",
  "/services/qvac-sovereign-ai",
  "/services/refhe-payroll-proof",
  "/services/umbra-confidential-payout",
  "/services/cloak-private-settlement",
  "/services/audd-stablecoin",
  "/services/pusd-stablecoin",
  "/services/torque-growth-loop",
  "/services/zerion-agent-policy",
  "/services/runtime-infrastructure",
  "/services/solrouter-encrypted-ai",
  "/proof",
  "/security",
  "/products",
  "/community",
  "/learn",
  "/documents",
  "/awards",
  "/benefit",
  "/versus",
  "/revenue",
  "/pricing",
  "/onboard",
  "/onboard/confirmed",
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
    priority:
      path === ""
        ? 1
        : path === "/start" ||
            path === "/services" ||
            path === "/proof" ||
            path === "/judge" ||
            path === "/rpc-services" ||
            path === "/api-status" ||
            path === "/intelligence" ||
            path === "/android"
          ? 0.9
          : 0.7,
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
