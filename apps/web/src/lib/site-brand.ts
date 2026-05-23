import { supportedLocales } from "@/lib/i18n";

export const siteName = "PrivateDAO";
export const siteTitle = "PrivateDAO | Sovereign Encrypted Intelligence Infrastructure for Solana";
export const siteDescription =
  "PrivateDAO is sovereign encrypted intelligence and operational infrastructure for Solana: live web and Android execution for private governance, confidential payroll, encrypted payments, treasury policy, GamingDAO rewards, local-first AI decision support, Testnet proof, and on-chain verification.";
export const siteUrl = process.env.NEXT_PUBLIC_LIVE_SITE_URL?.replace(/\/+$/, "") ?? "https://privatedao.org";
export const defaultOgImage = `${siteUrl}/opengraph-image.png`;

export const siteKeywords = [
  "PrivateDAO",
  "Private DAO",
  "private governance",
  "confidential treasury",
  "treasury policy",
  "encrypted payments",
  "confidential payroll",
  "encrypted payroll",
  "private payroll",
  "GamingDAO",
  "gaming DAO rewards",
  "Android Solana app",
  "sovereign intelligence",
  "decision intelligence",
  "AI decision support",
  "wallet-first execution",
  "Solana Testnet app",
  "Solana Android app",
  "Solana encrypted payments",
  "Solana confidential payroll",
  "Solana private governance",
  "private voting",
  "Solana governance",
  "Solana treasury",
  "Solana DAO infrastructure",
  "DAO treasury infrastructure",
  "on-chain verification",
  "ZK verifier",
  "Squads multisig",
  "timelock enforcement",
  "Token-2022",
  "Anchor 1",
  "QVAC",
  "MagicBlock",
  "GoldRush",
  "Covalent GoldRush",
  "IKA",
  "Umbra",
  "Cloak",
  "Torque",
  "Solana Mobile",
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
    keywords: siteKeywords,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/search/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildSoftwareApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteName,
    alternateName: ["Private DAO", "PrivateDAO Solana"],
    url: siteUrl,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Android",
    description: siteDescription,
    keywords: siteKeywords.join(", "),
    softwareHelp: `${siteUrl}/learn/`,
    downloadUrl: `${siteUrl}/android/`,
    featureList: [
      "Solana Testnet wallet-first governance",
      "Private commit-reveal voting posture",
      "Confidential payroll and encrypted payments",
      "Treasury policy review and execution",
      "GamingDAO rewards and tournaments",
      "Local-first decision intelligence",
      "Reviewer-visible proof and runtime evidence",
      "Standalone Testnet ZK verifier receipt",
      "Squads multisig timelock enforcement proof",
      "PDAO Token-2022 fixed-supply governance mint",
    ],
    sameAs: [
      "https://github.com/X-PACT/PrivateDAO",
      "https://x.com/FahdX369",
      "https://www.youtube.com/@privatedao",
    ],
  };
}
