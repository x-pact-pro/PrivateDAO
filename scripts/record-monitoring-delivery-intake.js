"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function main() {
    const inputPath = process.argv[2];
    if (!inputPath) {
        throw new Error("usage: npm run record:monitoring-delivery -- <intake-json-path>");
    }
    const incoming = readJson(inputPath);
    const outputPath = path_1.default.resolve("docs/monitoring-delivery-intake.json");
    if (incoming.project !== "PrivateDAO") {
        throw new Error("monitoring delivery intake project mismatch");
    }
    if (incoming.environment !== "solana-testnet-production-candidate") {
        throw new Error("monitoring delivery intake must remain solana-testnet-production-candidate scoped");
    }
    fs_1.default.writeFileSync(outputPath, JSON.stringify(incoming, null, 2) + "\n");
    console.log("Recorded monitoring delivery intake");
}
function readJson(relativePath) {
    return JSON.parse(fs_1.default.readFileSync(path_1.default.resolve(relativePath), "utf8"));
}
main();
