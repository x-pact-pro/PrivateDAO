import { supportedLocales } from "@/lib/i18n";

export const siteName = "PrivateDAO";
export const siteTitle = "PrivateDAO | Sovereign Encrypted Intelligence Infrastructure for Solana";
export const siteDescription =
  "PrivateDAO is sovereign encrypted intelligence and operational infrastructure for Solana: live web and Android execution for private governance, confidential payroll, encrypted payments, gaming rewards, local-first AI, Testnet proof, and on-chain verification.";
export const siteUrl = process.env.NEXT_PUBLIC_LIVE_SITE_URL?.replace(/\/+$/, "") ?? "https://privatedao.org";
export const defaultOgImage = "/opengraph-image.png";

export const siteKeywords = [
  "PrivateDAO",
  "Private DAO",
  "private governance",
  "confidential treasury",
  "encrypted payments",
  "confidential payroll",
  "Android Solana app",
  "sovereign intelligence",
  "private voting",
  "Solana governance",
  "Solana treasury",
  "Token-2022",
  "Anchor 1",
  "QVAC",
  "MagicBlock",
  "REFHE",
  "ZK",
  "Fast RPC",
];

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    alternateName: ["Private DAO"],
    url: siteUrl,
    logo: `${siteUrl}/assets/logo.png`,
    sameAs: [
      "https://github.com/X-PACT/PrivateDAO",
      "https://www.youtube.com/@privatedao",
      "https://discord.gg/PbM8BC2A",
      "https://x.com/FahdX369",
    ],
  };
}

export function buildWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    alternateName: ["Private DAO"],
    url: siteUrl,
    inLanguage: supportedLocales.map((locale) => locale.code),
  };
}
