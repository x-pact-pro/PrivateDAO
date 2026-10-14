import fs from "fs";
import path from "path";

import { loadProofRegistry } from "./lib/proof-registry.js";

type PdaoMetadata = {
  name: string;
  symbol: string;
  description: string;
  external_url: string;
  attributes: Array<{ trait_type: string; value: string }>;
  properties?: {
    category?: string;
    files?: Array<{ uri: string; type?: string }>;
  };
};

function main() {
  const proof = loadProofRegistry();
  if (!proof.pdaoToken) {
    throw new Error("proof registry is missing the PDAO token surface");
  }

  const metadataPath = path.resolve("docs/assets/pdao-token.json");
  if (!fs.existsSync(metadataPath)) {
    throw new Error("missing docs/assets/pdao-token.json");
  }

  const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8")) as PdaoMetadata;
  const readme = fs.readFileSync(path.resolve("README.md"), "utf8");
  const tokenDoc = fs.readFileSync(path.resolve("docs/token.md"), "utf8");
  const pdaoDoc = fs.readFileSync(path.resolve("docs/pdao-token.md"), "utf8");

  assert(metadata.name === "PDAO", "PDAO metadata name mismatch");
  assert(metadata.symbol === "PDAO", "PDAO metadata symbol mismatch");
  assert(metadata.external_url === "https://privatedao.org/token/", "PDAO metadata external URL mismatch");
  const privateDaoProgramId = proof.pdaoToken.privateDaoProgramId ?? proof.programId;
  const pdaoNetwork = proof.pdaoToken.network ?? "Solana Mainnet";

  assert(
    metadata.attributes.some((entry) => entry.trait_type === "Network" && entry.value === pdaoNetwork),
    "PDAO metadata is missing the expected network",
  );
  assert(
    metadata.attributes.some((entry) => entry.trait_type === "Mint" && entry.value === proof.pdaoToken?.mint),
    "PDAO metadata is missing the live mint",
  );

  for (const fragment of [
    "docs/pdao-token.md",
    "docs/pdao-attestation.generated.json",
    proof.pdaoToken.mint,
    "9isGuumtaqvJeJeyLF44fvfskk2cv5mYsopexMBfpump",
  ]) {
    assert(readme.includes(fragment), `README is missing token surface fragment: ${fragment}`);
  }

  for (const fragment of [
    "PrivateDAO Token Architecture",
    "Current Public Identity",
  ]) {
    assert(tokenDoc.includes(fragment), `docs/token.md is missing token architecture fragment: ${fragment}`);
  }

  for (const fragment of [
    proof.pdaoToken.mint,
    "Public PDAO token identity",
    "Solana Mainnet",
    "docs/assets/pdao-token.json",
  ]) {
    assert(pdaoDoc.includes(fragment), `docs/pdao-token.md is missing token surface fragment: ${fragment}`);
  }

  console.log("PDAO token surface verification: PASS");
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

main();
