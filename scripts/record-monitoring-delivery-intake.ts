import fs from "fs";
import path from "path";

type MonitoringDeliveryIntake = {
  project: string;
  environment: string;
  status: string;
  owners: Array<{
    role: string;
    scope: string;
    status: string;
  }>;
  deliveryRequirements: Array<{
    id: string;
    label: string;
    status: string;
    evidence: string;
  }>;
  transcriptRequirements: string[];
};

function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    throw new Error("usage: npm run record:monitoring-delivery -- <intake-json-path>");
  }

  const incoming = readJson<MonitoringDeliveryIntake>(inputPath);
  const outputPath = path.resolve("docs/monitoring-delivery-intake.json");

  if (incoming.project !== "PrivateDAO") {
    throw new Error("monitoring delivery intake project mismatch");
  }

  if (incoming.environment !== "solana-testnet-production-candidate") {
    throw new Error("monitoring delivery intake must remain solana-testnet-production-candidate scoped");
  }

  fs.writeFileSync(outputPath, JSON.stringify(incoming, null, 2) + "\n");
  console.log("Recorded monitoring delivery intake");
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.resolve(relativePath), "utf8")) as T;
}

main();
