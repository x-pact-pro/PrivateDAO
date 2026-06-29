import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const target = resolve("apps/web/node_modules/@qvac/sdk/dist/client/rpc/node-rpc-client.js");
const timeoutMs = Number(process.env.QVAC_INIT_TIMEOUT_MS || 180_000);
const source = await readFile(target, "utf8");
const patched = source.replace(
  /const RPC_INIT_TIMEOUT_MS = [0-9_]+;/,
  `const RPC_INIT_TIMEOUT_MS = ${timeoutMs};`,
);

if (patched === source && !source.includes(`const RPC_INIT_TIMEOUT_MS = ${timeoutMs};`)) {
  throw new Error(`Could not patch QVAC init timeout in ${target}`);
}

await writeFile(target, patched);
console.log(`Patched QVAC RPC init timeout to ${timeoutMs}ms`);
