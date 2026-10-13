import { supportedLocales } from "@/lib/i18n";

export const siteName = "PrivateDAO";
export const siteTitle = "PrivateDAO | Private decisions. Verifiable outcomes.";
export const siteDescription =
  "PrivateDAO is software and Web3 infrastructure for organizations that need private workflows, controlled execution, and verifiable outcomes.";
export const siteUrl = process.env.NEXT_PUBLIC_LIVE_SITE_URL?.replace(/\/+$/, "") ?? "https://privatedao.org";
export const defaultOgImage = `${siteUrl}/assets/privatedao-social-card.png`;
export const companyLocation = "Warsaw, Poland";
export const founderName = "Fahd Kotb";
export const agentExchangeUrl = "https://agents.privatedao.org";
export const contactEmails = {
  general: "fahd@privatedao.org",
  support: "fahd@privatedao.org",
  sales: "fahd@privatedao.org",
  business: "fahd@privatedao.org",
  partners: "fahd@privatedao.org",
  developers: "fahd@privatedao.org",
  security: "fahd@privatedao.org",
  legal: "fahd@privatedao.org",
  careers: "fahd@privatedao.org",
  billing: "fahd@privatedao.org",
} as const;

export const siteKeywords = [
  "PrivateDAO",
  "Private DAO",
  "confidential payroll",
  "private treasury",
  "private governance",
  "confidential auctions",
  "blind verification",
  "record verification",
  "private organizational workflows",
  "trusted business outcomes",
  "enterprise privacy",
  "secure approvals",
  "private operations",
  "private governance",
  "treasury coordination",
  "حوكمة خاصة",
  "تصويت خاص",
  "خزينة مشفرة",
  "برايفيت داو",
];

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    alternateName: ["Private DAO"],
    url: siteUrl,
    email: contactEmails.general,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Warsaw",
      addressCountry: "PL",
    },
    founder: {
      "@type": "Person",
      name: "Fahd Kotb",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "business inquiries",
      email: contactEmails.business,
      url: `${siteUrl}/contact/`,
    },
    logo: `${siteUrl}/assets/privatedao-brand-mark-20260918.jpeg`,
    sameAs: [
      "https://github.com/X-PACT/PrivateDAO",
      "https://www.youtube.com/@privatedao",
      "https://discord.gg/GjJykUtTTt",
      "https://discord.gg/dpD5c7Gfcc",
      "https://x.com/privateDAOOS",
      "https://t.me/privateDAOOS",
      "https://t.me/PrivateDAOO",
      "https://t.me/Fahdkotb",
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
  };
}

export function buildSoftwareApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteName,
    alternateName: ["Private DAO"],
    url: siteUrl,
    codeRepository: "https://github.com/X-PACT/PrivateDAO",
    applicationCategory: "Organizational Workflow Verification Software",
    operatingSystem: "Web, Android",
    description:
      "PrivateDAO helps organizations run sensitive payroll, treasury, governance, transaction, and verification workflows without exposing the data behind them.",
    copyrightYear: 2026,
    copyrightHolder: {
      "@type": "Person",
      name: "Fahd Kotb",
    },
    creator: {
      "@type": "Person",
      name: "Fahd Kotb",
    },
    maintainer: {
      "@type": "Organization",
      name: "X-PACT",
      url: "https://github.com/X-PACT",
    },
    license: "https://github.com/X-PACT/PrivateDAO/blob/main/LICENSE",
    keywords: siteKeywords.join(", "),
    softwareHelp: `${siteUrl}/whitepaper/`,
    featureList: [
      "Record Verification for critical records and public receipts",
      "Proof Workflows for private claims and approvals",
      "Private Governance for proposals, rooms, and organizational decisions",
      "Treasury Coordination for requests, approvals, and evidence",
      "API and SDK integration surfaces",
      "Walletless public receipt verification",
    ],
    sameAs: [
      "https://github.com/X-PACT/PrivateDAO",
      "https://x.com/privateDAOOS",
      "https://www.youtube.com/@privatedao",
      "https://discord.gg/GjJykUtTTt",
      "https://discord.gg/dpD5c7Gfcc",
      "https://discord.gg/PRcD9nFeVf",
      "https://t.me/privateDAOOS",
      "https://t.me/PrivateDAOO",
      "https://t.me/Fahdkotb",
    ],
  };
}
