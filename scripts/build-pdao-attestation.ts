import fs from "fs";
import path from "path";

import { loadProofRegistry } from "./lib/proof-registry.js";

type PdaoMetadata = {
  name: string;
  symbol: string;
  description: string;
  image: string;
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

  const metadataBody = fs.readFileSync(metadataPath);
  const metadata = JSON.parse(metadataBody.toString("utf8")) as PdaoMetadata;

  const attestation = {
    project: "PrivateDAO",
    pdaoToken: {
      name: metadata.name,
      symbol: metadata.symbol,
      network: proof.pdaoToken.network ?? "Solana Mainnet",
      mint: proof.pdaoToken.mint,
      factsUrl: "https://privatedao.org/token/",
    },
    scope: "Public token identity only; no investment or performance claim.",
    verificationDocs: [
      "docs/token.md",
      "docs/pdao-token.md",
      "docs/assets/pdao-token.json",
    ],
  };

  const outPath = path.resolve("docs/pdao-attestation.generated.json");
  fs.writeFileSync(outPath, JSON.stringify(attestation, null, 2) + "\n");
  console.log(`Wrote PDAO attestation: ${path.relative(process.cwd(), outPath)}`);
}

main();
