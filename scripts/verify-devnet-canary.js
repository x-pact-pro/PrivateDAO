"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function main() {
    const jsonPath = path_1.default.resolve("docs/devnet-canary.generated.json");
    const mdPath = path_1.default.resolve("docs/devnet-canary.generated.md");
    if (!fs_1.default.existsSync(jsonPath) || !fs_1.default.existsSync(mdPath)) {
        throw new Error("devnet canary artifacts are missing");
    }
    const canary = JSON.parse(fs_1.default.readFileSync(jsonPath, "utf8"));
    const markdown = fs_1.default.readFileSync(mdPath, "utf8");
    if (canary.network !== "devnet") {
        throw new Error("devnet canary network mismatch");
    }
    if (canary.programId !== "5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx") {
        throw new Error("devnet canary program mismatch");
    }
    if (canary.primaryRpc.label !== "primary" || canary.fallbackRpc.label !== "fallback") {
        throw new Error("devnet canary rpc labels are invalid");
    }
    if (!canary.primaryRpc.blockhash || !canary.fallbackRpc.blockhash || canary.primaryRpc.slot <= 0 || canary.fallbackRpc.slot <= 0) {
        throw new Error("devnet canary rpc health is incomplete");
    }
    if (!canary.summary.primaryHealthy || !canary.summary.fallbackHealthy) {
        throw new Error("devnet canary is missing healthy rpc evidence");
    }
    if (!canary.summary.anchorAccountsPresent || canary.anchors.length < 6 || canary.anchors.some((entry) => !entry.exists)) {
        throw new Error("devnet canary anchor checks are incomplete");
    }
    if (canary.tokenSupply.mint !== "") {
        throw new Error("devnet canary governance mint mismatch");
    }
    if (canary.summary.unexpectedFailures !== 0) {
        throw new Error("devnet canary contains unexpected failures");
    }
    if (!markdown.includes("# Devnet Canary Report") || !markdown.includes("read-only canary")) {
        throw new Error("devnet canary markdown report is incomplete");
    }
    console.log("Devnet canary verification: PASS");
}
main();
