import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site-brand";

export const dynamic = "force-static";

// Keep the public index focused on current commercial surfaces. Historical and
// technical routes remain available for compatibility but are not promoted.
const coreRoutes = [
  "",
  "/products",
  "/verify/payroll",
  "/verify/record",
  "/payroll",
  "/treasury",
  "/govern",
  "/auctions",
  "/proof-workflows/blind-policy",
  "/products/record-verification",
  "/blind-verification",
  "/confidential-payroll",
  "/private-treasury",
  "/private-governance",
  "/sealed-auctions",
  "/agents",
  "/wallet",
  "/developers",
  "/docs",
  "/architecture",
  "/networks",
  "/status",
  "/security",
  "/research",
  "/research/organizational-privacy-vs-transaction-privacy",
  "/research/confidential-payroll-that-remains-verifiable",
  "/research/private-governance-without-opaque-outcomes",
  "/investors",
  "/roadmap",
  "/whitepaper",
  "/token",
  "/thesis",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/legal",
] as const;

function withCanonicalSlash(path: string) {
  if (path === "") return `${siteUrl}/`;
  if (/\.[a-z0-9]+$/i.test(path)) return `${siteUrl}${path}`;
  return `${siteUrl}${path.replace(/\/+$/, "")}/`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const coreEntries: MetadataRoute.Sitemap = coreRoutes.map((path) => ({
    url: withCanonicalSlash(path),
    lastModified: now,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : ["/products", "/confidential-payroll", "/private-treasury", "/private-governance", "/sealed-auctions", "/blind-verification", "/products/record-verification", "/agents"].includes(path) ? 0.9 : 0.7,
  }));

  return coreEntries;
}
