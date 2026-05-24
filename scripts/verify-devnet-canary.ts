import fs from "fs";
import path from "path";

type Canary = {
  network: string;
  programId: string;
  primaryRpc: { label: string; url: string; version: string; slot: number; blockhash: string };
  fallbackRpc: { label: string; url: string; version: string; slot: number; blockhash: string };
  anchors: Array<{ label: string; address: string; exists: boolean }>;
  tokenSupply: { mint: string; uiAmountString: string; decimals: number };
  summary: {
    primaryHealthy: boolean;
    fallbackHealthy: boolean;
    anchorAccountsPresent: boolean;
    unexpectedFailures: number;
  };
};

function main() {
  const jsonPath = path.resolve("docs/devnet-canary.generated.json");
  const mdPath = path.resolve("docs/devnet-canary.generated.md");

  if (!fs.existsSync(jsonPath) || !fs.existsSync(mdPath)) {
    throw new Error("devnet canary artifacts are missing");
  }

  const canary = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as Canary;
  const markdown = fs.readFileSync(mdPath, "utf8");

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
  const requiredLegacyAnchors = canary.anchors.filter((entry) => entry.label !== "pdao-token-account");
  if (requiredLegacyAnchors.length < 6 || requiredLegacyAnchors.some((entry) => !entry.exists)) {
    throw new Error("devnet canary anchor checks are incomplete");
  }
  if (canary.tokenSupply.mint !== "AZUkprJDfJPgAp7L4z3TpCV3KHqLiA8RjHAVhK9HCvDt") {
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
