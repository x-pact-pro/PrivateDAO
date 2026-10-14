"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function main() {
    const jsonPath = path_1.default.resolve("docs/devnet-resilience-report.json");
    const markdownPath = path_1.default.resolve("docs/devnet-resilience-report.md");
    if (!fs_1.default.existsSync(jsonPath)) {
        throw new Error("missing devnet resilience report json");
    }
    if (!fs_1.default.existsSync(markdownPath)) {
        throw new Error("missing devnet resilience report markdown");
    }
    const report = JSON.parse(fs_1.default.readFileSync(jsonPath, "utf8"));
    const markdown = fs_1.default.readFileSync(markdownPath, "utf8");
    if (report.network !== "devnet") {
        throw new Error("devnet resilience report network mismatch");
    }
    if (report.programId !== "5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx") {
        throw new Error("devnet resilience report program mismatch");
    }
    if (report.governanceMint !== "") {
        throw new Error("devnet resilience report governance mint mismatch");
    }
    if (report.rpcMatrix.length < 2 || !report.rpcMatrix.every((entry) => entry.status === "healthy" && entry.blockhash)) {
        throw new Error("devnet resilience report rpc matrix is incomplete");
    }
    if (!report.summary.primaryHealthy || !report.summary.fallbackHealthy) {
        throw new Error("devnet resilience report is missing healthy rpc evidence");
    }
    if (!report.failover.recovered || !report.summary.failoverRecovered) {
        throw new Error("devnet resilience report is missing failover recovery evidence");
    }
    if (!report.failover.invalidRpcError) {
        throw new Error("devnet resilience report is missing invalid RPC error evidence");
    }
    if (!report.staleBlockhashRecovery.rejectedAsExpected || !report.summary.staleBlockhashRejected) {
        throw new Error("devnet resilience report is missing stale blockhash rejection evidence");
    }
    if (!report.summary.staleBlockhashRecovered || !report.staleBlockhashRecovery.recoveredTx) {
        throw new Error("devnet resilience report is missing stale blockhash recovery evidence");
    }
    if (report.staleBlockhashRecovery.probeBalanceDeltaLamports !== 1) {
        throw new Error("devnet resilience report probe balance delta is unexpected");
    }
    if (report.summary.unexpectedSuccesses !== 0) {
        throw new Error("devnet resilience report contains unexpected successes");
    }
    if (!markdown.includes("# Devnet Resilience Report") || !markdown.includes("Stale Blockhash Recovery")) {
        throw new Error("devnet resilience markdown report is incomplete");
    }
    console.log("Devnet resilience report verification: PASS");
}
main();
