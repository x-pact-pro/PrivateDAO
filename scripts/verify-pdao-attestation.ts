import fs from "fs";
import path from "path";

import { loadProofRegistry } from "./lib/proof-registry.js";

function main() {
  const proof = loadProofRegistry();
  const attestation = JSON.parse(
    fs.readFileSync(path.resolve("docs/pdao-attestation.generated.json"), "utf8"),
  ) as { project?: string; pdaoToken?: { network?: string; mint?: string; factsUrl?: string }; scope?: string };

  assert(attestation.project === "PrivateDAO", "PDAO attestation project mismatch");
  assert(attestation.pdaoToken?.network === "Solana Mainnet", "PDAO attestation network mismatch");
  assert(attestation.pdaoToken?.mint === "9isGuumtaqvJeJeyLF44fvfskk2cv5mYsopexMBfpump", "PDAO attestation mint mismatch");
  assert(attestation.pdaoToken?.mint === proof.pdaoToken?.mint, "PDAO attestation does not match proof registry");
  assert(attestation.pdaoToken?.factsUrl === "https://privatedao.org/token/", "PDAO attestation facts URL mismatch");
  assert(Boolean(attestation.scope?.includes("no investment")), "PDAO attestation scope is missing its risk boundary");
  console.log("PDAO attestation verification: PASS");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

main();
