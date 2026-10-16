import { createHash } from "crypto";

export type CommercialLicenseType = "TRIAL" | "COMMUNITY" | "PROFESSIONAL" | "ORGANIZATION" | "ENTERPRISE";

export type CommercialPaymentAsset =
  | "USDC_SOL"
  | "USDC_ETH"
  | "SOL"
  | "ETH"
  | "BTC"
  | "WBTC"
  | "ZEC"
  | "USDT"
  | "DAI";

export type CommercialPlan = {
  licenseType: Exclude<CommercialLicenseType, "TRIAL">;
  label: string;
  priceUsd: number | null;
  cadence: "free" | "monthly" | "custom";
  trialDays: number;
  includes: string[];
  restrictions?: string[];
};

export type CommercialPaymentAssetConfig = {
  asset: CommercialPaymentAsset;
  label: string;
  network: "Solana" | "Ethereum" | "Bitcoin" | "Zcash";
  primary: boolean;
  treasuryEnv: "PD_SOLANA_TREASURY" | "PD_ETHEREUM_TREASURY" | "PD_BITCOIN_TREASURY" | "PD_ZCASH_TREASURY";
  treasuryAddress?: string;
  configured: boolean;
};

export type CommercialCheckoutInput = {
  plan: CommercialLicenseType;
  asset: CommercialPaymentAsset;
  organizationName?: string;
  organizationId?: string;
};

export type CommercialPaymentReceipt = {
  receiptId: string;
  organizationId: string;
  licenseType: CommercialLicenseType;
  paymentAsset: CommercialPaymentAsset;
  paymentHash: string;
  treasuryAddress: string;
  verificationStatus: "verified" | "pending-review" | "rejected";
  subscriptionActivation: "trial-active" | "active" | "not-activated";
  licenseStart: string;
  licenseEnd: string;
  issuedAt: string;
};

export type CommercialSignedLicense = {
  licenseId: string;
  organizationId: string;
  licenseType: CommercialLicenseType;
  features: string[];
  issuedAt: string;
  expiresAt: string;
  signature: string;
  algorithm: "sha256";
};

const DEFAULT_SOLANA_TREASURY = "4gEqyhhdmLpgye8ubJzzD4zcNsY7JQoiLBBqnBHoYeUt";
const DEFAULT_ETHEREUM_TREASURY = "0x52031e91085A0b3A8A1E89Db935E8E42b715CC86";
const TRIAL_DAYS = 14;

export const commercialPlans: CommercialPlan[] = [
  {
    licenseType: "COMMUNITY",
    label: "Community Trial",
    priceUsd: 0,
    cadence: "free",
    trialDays: TRIAL_DAYS,
    includes: ["14-day trial", "1 organization", "1 room", "10 members", "5 proposals", "Basic proof records"],
    restrictions: ["Limited capacity", "No custom workflow templates", "No advanced intelligence", "No private deployment"],
  },
  {
    licenseType: "PROFESSIONAL",
    label: "Starter",
    priceUsd: 750,
    cadence: "monthly",
    trialDays: TRIAL_DAYS,
    includes: [
      "1 organization",
      "3 active workflows or rooms",
      "25 members",
      "250 proof events/month",
      "Proof Workflows",
      "Private Governance",
      "Treasury Coordination",
      "Basic verification pages",
      "Email support",
      "Customer-data proof connectors",
    ],
  },
  {
    licenseType: "ORGANIZATION",
    label: "Business",
    priceUsd: 3500,
    cadence: "monthly",
    trialDays: TRIAL_DAYS,
    includes: [
      "1 organization",
      "10 active workflows or rooms",
      "250 members",
      "5,000 proof events/month",
      "Proof Workflows",
      "Private Governance",
      "Treasury Coordination",
      "Audit-ready verification pages",
      "Intelligence add-on available",
      "Workflow builder",
      "Priority onboarding",
    ],
  },
  {
    licenseType: "ENTERPRISE",
    label: "Enterprise",
    priceUsd: null,
    cadence: "custom",
    trialDays: TRIAL_DAYS,
    includes: [
      "Custom monthly or annual contract",
      "Dedicated deployment",
      "SLA",
      "White-label",
      "Custom integrations",
      "Advanced compliance workflows",
      "Custom proof systems",
      "Custom usage/capacity limits",
    ],
  },
];

export const trialRestrictions = [
  "Limited rooms",
  "Limited proposals",
  "Limited reviewers",
  "Limited proof records",
  "No custom branding",
  "No advanced intelligence",
] as const;

export const commercialAddOns = [
  {
    label: "Intelligence Add-On",
    price: "$1,000/month",
    summary: "Workflow summaries, risk explanations, proposal summaries, treasury analysis, and audit-ready explanations.",
  },
  {
    label: "Extra proof capacity",
    price: "$350 / 1,000 proof events",
    summary: "Additional monthly verification capacity for workflows, rooms, treasury approvals, and reports.",
  },
  {
    label: "Private deployment setup",
    price: "From $25,000",
    summary: "Environment setup, activation, deployment documentation, and organization-bound license packaging.",
  },
  {
    label: "Custom connector",
    price: "From $7,500",
    summary: "Connect one customer data source, redacted JSON feed, workflow API, or treasury context provider.",
  },
] as const;

function envValue(key: CommercialPaymentAssetConfig["treasuryEnv"]) {
  return process.env[key]?.trim() || undefined;
}

export function getCommercialPaymentAssets(): CommercialPaymentAssetConfig[] {
  const solanaTreasury = envValue("PD_SOLANA_TREASURY") ?? DEFAULT_SOLANA_TREASURY;
  const ethereumTreasury = envValue("PD_ETHEREUM_TREASURY") ?? DEFAULT_ETHEREUM_TREASURY;
  const bitcoinTreasury = envValue("PD_BITCOIN_TREASURY");
  const zcashTreasury = envValue("PD_ZCASH_TREASURY");

  return [
    {
      asset: "USDC_SOL",
      label: "USDC on Solana",
      network: "Solana",
      primary: true,
      treasuryEnv: "PD_SOLANA_TREASURY",
      treasuryAddress: solanaTreasury,
      configured: Boolean(solanaTreasury),
    },
    {
      asset: "USDC_ETH",
      label: "USDC on Ethereum",
      network: "Ethereum",
      primary: true,
      treasuryEnv: "PD_ETHEREUM_TREASURY",
      treasuryAddress: ethereumTreasury,
      configured: Boolean(ethereumTreasury),
    },
    {
      asset: "SOL",
      label: "SOL",
      network: "Solana",
      primary: true,
      treasuryEnv: "PD_SOLANA_TREASURY",
      treasuryAddress: solanaTreasury,
      configured: Boolean(solanaTreasury),
    },
    {
      asset: "ETH",
      label: "ETH",
      network: "Ethereum",
      primary: true,
      treasuryEnv: "PD_ETHEREUM_TREASURY",
      treasuryAddress: ethereumTreasury,
      configured: Boolean(ethereumTreasury),
    },
    {
      asset: "BTC",
      label: "BTC",
      network: "Bitcoin",
      primary: false,
      treasuryEnv: "PD_BITCOIN_TREASURY",
      treasuryAddress: bitcoinTreasury,
      configured: Boolean(bitcoinTreasury),
    },
    {
      asset: "WBTC",
      label: "WBTC on Ethereum",
      network: "Ethereum",
      primary: false,
      treasuryEnv: "PD_ETHEREUM_TREASURY",
      treasuryAddress: ethereumTreasury,
      configured: Boolean(ethereumTreasury),
    },
    {
      asset: "ZEC",
      label: "ZEC",
      network: "Zcash",
      primary: false,
      treasuryEnv: "PD_ZCASH_TREASURY",
      treasuryAddress: zcashTreasury,
      configured: Boolean(zcashTreasury),
    },
    {
      asset: "USDT",
      label: "USDT on Ethereum",
      network: "Ethereum",
      primary: false,
      treasuryEnv: "PD_ETHEREUM_TREASURY",
      treasuryAddress: ethereumTreasury,
      configured: Boolean(ethereumTreasury),
    },
    {
      asset: "DAI",
      label: "DAI on Ethereum",
      network: "Ethereum",
      primary: false,
      treasuryEnv: "PD_ETHEREUM_TREASURY",
      treasuryAddress: ethereumTreasury,
      configured: Boolean(ethereumTreasury),
    },
  ];
}

export function getCommercialPlan(licenseType: CommercialLicenseType) {
  if (licenseType === "TRIAL") {
    return {
      licenseType: "TRIAL" as const,
      label: "Trial",
      priceUsd: 0,
      cadence: "free" as const,
      trialDays: TRIAL_DAYS,
      includes: ["14-day trial", "Limited rooms", "Limited proposals", "Customer-data proof demo", "Basic proof records"],
      restrictions: [...trialRestrictions],
    };
  }

  const plan = commercialPlans.find((item) => item.licenseType === licenseType);
  if (!plan) throw new Error("Unknown commercial license type.");
  return plan;
}

export function getPaymentAssetConfig(asset: CommercialPaymentAsset) {
  const config = getCommercialPaymentAssets().find((item) => item.asset === asset);
  if (!config) throw new Error("Unknown payment asset.");
  if (!config.treasuryAddress) throw new Error(`${config.label} treasury address is not configured.`);
  return config;
}

export function normalizeCommercialCheckout(input: CommercialCheckoutInput) {
  const plan = getCommercialPlan(input.plan);
  const asset = getPaymentAssetConfig(input.asset);
  const organizationId =
    input.organizationId?.trim() ||
    stableId(`${input.organizationName?.trim() || "private-dao-organization"}:${input.plan}:${input.asset}`).slice(0, 24);

  return {
    plan,
    asset,
    organizationId,
    organizationName: input.organizationName?.trim() || "PrivateDAO organization",
  };
}

export function stableId(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function buildCommercialCheckout(input: CommercialCheckoutInput) {
  const normalized = normalizeCommercialCheckout(input);
  const now = new Date();
  const checkoutId = stableId(
    [
      normalized.organizationId,
      normalized.plan.licenseType,
      normalized.asset.asset,
      normalized.asset.treasuryAddress,
      normalized.plan.priceUsd ?? "custom",
    ].join(":"),
  ).slice(0, 32);

  return {
    checkoutId,
    organizationId: normalized.organizationId,
    organizationName: normalized.organizationName,
    licenseType: normalized.plan.licenseType,
    priceUsd: normalized.plan.priceUsd,
    cadence: normalized.plan.cadence,
    trialDays: normalized.plan.trialDays,
    trialRestrictions,
    paymentAsset: normalized.asset.asset,
    paymentAssetLabel: normalized.asset.label,
    network: normalized.asset.network,
    treasuryAddress: normalized.asset.treasuryAddress,
    treasuryEnv: normalized.asset.treasuryEnv,
    memo: `PrivateDAO:${normalized.organizationId}:${normalized.plan.licenseType}:${checkoutId}`,
    issuedAt: now.toISOString(),
  };
}

export function validatePaymentHash(asset: CommercialPaymentAsset, paymentHash: string) {
  const hash = paymentHash.trim();
  if (!hash) return false;
  if (asset === "USDC_ETH" || asset === "ETH" || asset === "WBTC" || asset === "USDT" || asset === "DAI") {
    return /^0x[a-fA-F0-9]{64}$/.test(hash);
  }
  if (asset === "BTC" || asset === "ZEC") {
    return /^[a-fA-F0-9]{64}$/.test(hash);
  }
  return /^[1-9A-HJ-NP-Za-km-z]{64,128}$/.test(hash);
}

export function buildCommercialReceipt(input: {
  organizationId: string;
  licenseType: CommercialLicenseType;
  paymentAsset: CommercialPaymentAsset;
  paymentHash: string;
  treasuryAddress: string;
  verificationStatus: CommercialPaymentReceipt["verificationStatus"];
}) {
  const issuedAt = new Date();
  const licenseStart = issuedAt.toISOString();
  const licenseEnd = new Date(issuedAt.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const receiptId = stableId(
    [input.organizationId, input.licenseType, input.paymentAsset, input.paymentHash, input.treasuryAddress].join(":"),
  ).slice(0, 32);

  return {
    receiptId,
    organizationId: input.organizationId,
    licenseType: input.licenseType,
    paymentAsset: input.paymentAsset,
    paymentHash: input.paymentHash,
    treasuryAddress: input.treasuryAddress,
    verificationStatus: input.verificationStatus,
    subscriptionActivation: input.verificationStatus === "verified" ? "active" : "trial-active",
    licenseStart,
    licenseEnd,
    issuedAt: issuedAt.toISOString(),
  } satisfies CommercialPaymentReceipt;
}

export function buildCommercialSignedLicense(input: {
  organizationId: string;
  licenseType: CommercialLicenseType;
  licenseStart: string;
  licenseEnd: string;
}) {
  const plan = getCommercialPlan(input.licenseType);
  const features = plan.includes;
  const licenseId = stableId([input.organizationId, input.licenseType, input.licenseStart, input.licenseEnd].join(":")).slice(0, 32);
  const signingSecret = process.env.PD_LICENSE_SIGNING_SECRET?.trim() || "";
  if (!signingSecret) {
    throw new Error("Commercial license signing is not configured.");
  }
  const payload = JSON.stringify({
    licenseId,
    organizationId: input.organizationId,
    licenseType: input.licenseType,
    features,
    issuedAt: input.licenseStart,
    expiresAt: input.licenseEnd,
  });
  const signature = createHash("sha256").update(`${payload}:${signingSecret}`).digest("hex");

  return {
    licenseId,
    organizationId: input.organizationId,
    licenseType: input.licenseType,
    features,
    issuedAt: input.licenseStart,
    expiresAt: input.licenseEnd,
    signature,
    algorithm: "sha256",
  } satisfies CommercialSignedLicense;
}
