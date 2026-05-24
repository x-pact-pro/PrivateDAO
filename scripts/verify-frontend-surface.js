"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const ROOT_INDEX = path_1.default.resolve("index.html");
const HOME_SHELL = path_1.default.resolve("apps/web/src/components/home-shell.tsx");
const SITE_HEADER = path_1.default.resolve("apps/web/src/components/site-header.tsx");
const COMMAND_CENTER = path_1.default.resolve("apps/web/src/components/command-center.tsx");
const PROOF_CENTER = path_1.default.resolve("apps/web/src/components/proof-center.tsx");
const SECURITY_CENTER = path_1.default.resolve("apps/web/src/components/security-center.tsx");
const DIAGNOSTICS_CENTER = path_1.default.resolve("apps/web/src/components/diagnostics-center.tsx");
const SERVICES_SURFACE = path_1.default.resolve("apps/web/src/components/services-surface.tsx");
const CURATED_DOCUMENTS = path_1.default.resolve("apps/web/src/lib/curated-documents.ts");
const SITE_DATA = path_1.default.resolve("apps/web/src/lib/site-data.ts");
const SITE_FOOTER = path_1.default.resolve("apps/web/src/components/site-footer.tsx");
function main() {
    const rootIndex = fs_1.default.readFileSync(ROOT_INDEX, "utf8");
    const homeShell = fs_1.default.readFileSync(HOME_SHELL, "utf8");
    const siteHeader = fs_1.default.readFileSync(SITE_HEADER, "utf8");
    const commandCenter = fs_1.default.readFileSync(COMMAND_CENTER, "utf8");
    const proofCenter = fs_1.default.readFileSync(PROOF_CENTER, "utf8");
    const securityCenter = fs_1.default.readFileSync(SECURITY_CENTER, "utf8");
    const diagnosticsCenter = fs_1.default.readFileSync(DIAGNOSTICS_CENTER, "utf8");
    const servicesSurface = fs_1.default.readFileSync(SERVICES_SURFACE, "utf8");
    const curatedDocuments = fs_1.default.readFileSync(CURATED_DOCUMENTS, "utf8");
    const siteData = fs_1.default.readFileSync(SITE_DATA, "utf8");
    const siteFooter = fs_1.default.readFileSync(SITE_FOOTER, "utf8");
    if (!homeShell.includes("Superteam Poland") && !homeShell.includes('eyebrow="Why PrivateDAO"')) {
        throw new Error("home shell is missing the achievement surface for Superteam Poland");
    }
    const checks = [
        [rootIndex, "__next_f.push", "root live surface is missing the exported Next.js app payload"],
        [siteHeader, 'href: "/documents"', "site header is missing the Documents route"],
        [siteHeader, 'href: "/learn"', "site header is missing the Learn route"],
        [siteHeader, 'href: "/story"', "site header is missing the Story route"],
        [siteHeader, 'href: "/community"', "site header is missing the Community route"],
        [siteHeader, 'href: "/products"', "site header is missing the Products route"],
        [siteHeader, 'href: "/network"', "site header is missing the Network route"],
        [homeShell, "Powered by the live stack", "home shell is missing the integrated tech section"],
        [homeShell, "Public good", "home shell is missing the Solana-style value section"],
        [homeShell, "The shortest path from landing page to a real Testnet action", "home shell is missing the focused route-entry narrative"],
        [commandCenter, "Command Center", "command center surface is missing"],
        [proofCenter, "Proof center", "proof center surface is missing"],
        [securityCenter, "Security architecture", "security center surface is missing"],
        [diagnosticsCenter, "Operational diagnostics", "diagnostics center surface is missing"],
        [servicesSurface, "content.commercialTitle", "services surface is missing"],
        [siteData, "Governance Hardening V3", "site data is missing Governance V3"],
        [siteData, "Settlement Hardening V3", "site data is missing Settlement V3"],
        [siteData, "Core integrations", "site data is missing the integrations packet surface"],
        [siteData, "Pilot Program", "site data is missing the Pilot Program surface"],
        [siteData, "Pricing Model", "site data is missing the Pricing Model surface"],
        [siteData, "REFHE", "site data is missing REFHE"],
        [siteData, "MagicBlock", "site data is missing MagicBlock"],
        [siteData, "Fast RPC", "site data is missing Fast RPC"],
        [siteData, "https://www.youtube.com/@privatedao", "site data is missing the official YouTube channel"],
        [curatedDocuments, 'slug: "reviewer-fast-path"', "curated documents are missing reviewer-fast-path"],
        [curatedDocuments, 'slug: "audit-packet"', "curated documents are missing the audit packet"],
        [curatedDocuments, 'slug: "live-proof-v3"', "curated documents are missing live proof V3"],
        [curatedDocuments, 'slug: "trust-package"', "curated documents are missing trust package"],
        [curatedDocuments, 'slug: "service-catalog"', "curated documents are missing service catalog"],
        [curatedDocuments, 'slug: "frontier-integrations"', "curated documents are missing frontier integrations"],
        [siteData, "https://discord.gg/GjJykUtTTt", "site data is missing the Discord server link"],
        [siteData, "https://arena.colosseum.org/projects/explore/praivatedao", "site data is missing the Colosseum project link"],
        [siteData, "https://superteam.fun/earn/t/Private-dao-1", "site data is missing the Superteam Earn profile link"],
        [siteData, "https://x.com/privateDAOOS", "site data is missing the X profile link"],
        [siteData, "https://t.me/Fahdkotb", "site data is missing the Telegram contact link"],
        [siteFooter, "communityLinks.map", "site footer is missing centralized community link rendering"],
    ];
    const hasGithubPagesPrefix = rootIndex.includes("/PrivateDAO/_next/");
    const hasRootDomainPrefix = rootIndex.includes("/_next/");
    if (!hasGithubPagesPrefix && !hasRootDomainPrefix) {
        throw new Error("root live surface is missing both root-domain and GitHub Pages Next asset prefixes");
    }
    for (const [body, fragment, message] of checks) {
        if (!body.includes(fragment)) {
            throw new Error(message);
        }
    }
    const includesAny = (body, fragments) => fragments.some((fragment) => body.includes(fragment));
    if (!includesAny(homeShell, ["Private governance on Solana", "Governed"])) {
        throw new Error("home shell is missing the primary product badge surface");
    }
    if (!includesAny(homeShell, ["Open verification view", "Review Proof"])) {
        throw new Error("home shell is missing the verification CTA");
    }
    if (!includesAny(homeShell, [
        "The public story explains the product, cryptography, and commercial corridors in one watch surface.",
        "Proof and runtime surfaces remain open for judges, operators, and partners after every action.",
    ])) {
        throw new Error("home shell is missing the hosted story and verification narrative section");
    }
    console.log("Frontend surface verification: PASS");
}
main();
