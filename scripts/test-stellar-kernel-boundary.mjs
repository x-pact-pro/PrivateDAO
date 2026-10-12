import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const runtimeRoot = join(process.cwd(), "packages", "privatedao-runtime", "src");
const files = (await readdir(runtimeRoot)).filter((name) => name.endsWith(".ts"));
const transportOwner = "stellar-network.ts";
const forbidden = [
  /@stellar\/stellar-sdk/,
  /StellarHorizonTransport/,
  /new Horizon\.Server/,
];

const violations = [];
for (const file of files) {
  if (file === transportOwner || file === "index.ts") continue;
  const source = await readFile(join(runtimeRoot, file), "utf8");
  for (const pattern of forbidden) {
    if (pattern.test(source)) violations.push(`${file}: ${pattern}`);
  }
}

assert.deepEqual(violations, [], "Product/runtime modules must not bypass the Stellar adapter boundary.");
console.log(`STELLAR_KERNEL_BOUNDARY: PASS files=${files.length} transport_owner=${transportOwner}`);
