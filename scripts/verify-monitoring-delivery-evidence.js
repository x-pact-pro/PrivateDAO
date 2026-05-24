"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function main() {
    const jsonPath = path_1.default.resolve("docs/monitoring-delivery.generated.json");
    const mdPath = path_1.default.resolve("docs/monitoring-delivery.generated.md");
    if (!fs_1.default.existsSync(jsonPath) || !fs_1.default.existsSync(mdPath)) {
        throw new Error("missing monitoring delivery evidence artifacts");
    }
    const evidence = JSON.parse(fs_1.default.readFileSync(jsonPath, "utf8"));
    const markdown = fs_1.default.readFileSync(mdPath, "utf8");
    assert(evidence.project === "PrivateDAO", "monitoring delivery evidence project mismatch");
    assert(evidence.environment === "solana-testnet-production-candidate", "monitoring delivery evidence environment mismatch");
    assert(evidence.status === "testnet-probe-closure-alert-delivery-pending", "monitoring delivery evidence status mismatch");
    assert(evidence.summary.ownerCount >= 1, "monitoring delivery evidence missing owners");
    assert(evidence.summary.deliveryRequirementCount >= 1, "monitoring delivery evidence missing delivery requirements");
    assert(evidence.summary.closedRequirementCount >= 2, "monitoring delivery evidence should close live Testnet probe requirements");
    assert((evidence.summary.partialRequirementCount ?? 0) >= 1, "monitoring delivery evidence should separate partial alert-delivery requirements");
    assert(evidence.summary.transcriptRequirementCount >= 1, "monitoring delivery evidence missing transcript requirements");
    assert(evidence.providerAssignments?.activePrimaryRpc?.includes("solana-testnet.quiknode.pro"), "monitoring delivery evidence must use current QuickNode Testnet active RPC");
    assert(evidence.providerAssignments?.fallbackRpc === "https://api.testnet.solana.com", "monitoring delivery evidence must use Solana Testnet fallback");
    assert(evidence.deliveryRequirements.some((item) => item.status === "partial" && item.evidence.includes("transcript")), "monitoring delivery evidence must keep transcript-bound requirements partial");
    assert(evidence.supportingArtifacts?.includes("docs/backend-provider-readiness-2026-05-24.md"), "monitoring delivery evidence missing backend provider readiness artifact");
    assert(evidence.commands.includes("npm run build:monitoring-delivery"), "monitoring delivery evidence missing build command");
    assert(evidence.commands.includes("npm run verify:monitoring-delivery"), "monitoring delivery evidence missing verify command");
    assert(markdown.includes("# Monitoring Delivery Evidence"), "monitoring delivery markdown missing title");
    assert(markdown.includes("Claim Boundary"), "monitoring delivery markdown missing claim boundary");
    assert(markdown.includes("partial delivery requirements"), "monitoring delivery markdown missing partial count");
    assert(evidence.claimBoundary.includes("external alert routing") && evidence.claimBoundary.includes("pending"), "monitoring claim boundary must preserve external alert routing boundary");
    console.log("Monitoring delivery evidence verification: PASS");
}
function assert(condition, message) {
    if (!condition)
        throw new Error(message);
}
main();
