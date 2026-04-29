import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, "qvac-runtime-proof.generated.json");

function runtimeError(error) {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

async function main() {
  const proof = {
    schemaVersion: 1,
    project: "PrivateDAO",
    track: "qvac-sovereign-ai",
    generatedAt: new Date().toISOString(),
    node: process.version,
    platform: `${process.platform}/${process.arch}`,
    sdkPackage: "@qvac/sdk",
    sdkVersion: "0.9.1",
    sdkLoaded: false,
    exportedCapabilities: [],
    productUse: [
      "local pre-sign treasury operation brief",
      "offline multilingual operator guidance",
      "device-side invoice/payroll OCR and speech command lane",
      "no centralized AI endpoint required for sensitive DAO intent review"
    ],
    error: null
  };

  try {
    const qvac = await import("@qvac/sdk");
    proof.sdkLoaded = Boolean(qvac && typeof qvac === "object");
    proof.exportedCapabilities = Object.keys(qvac).sort().slice(0, 80);
  } catch (error) {
    proof.error = runtimeError(error);
  }

  await writeFile(outPath, `${JSON.stringify(proof, null, 2)}\n`);
  console.log(JSON.stringify(proof, null, 2));

  if (!proof.sdkLoaded) {
    process.exitCode = 1;
  }
}

void main();
