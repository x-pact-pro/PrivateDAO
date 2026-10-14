import fs from "fs";
import path from "path";

const CURRENT_PROGRAM_ID = "EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva";
const CURRENT_PDAO_MINT = "9isGuumtaqvJeJeyLF44fvfskk2cv5mYsopexMBfpump";

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function main() {
  const doc = read("docs/current-network-state-2026-05-24.md");
  const anchorToml = read("Anchor.toml");
  const source = read("programs/private-dao/src/lib.rs");
  const webConstants = read("apps/web/src/lib/onchain-parity.generated.ts");
  const androidSurface = read("apps/web/src/lib/android-surface.ts");
  const judge = read("apps/web/src/app/judge/page.tsx");

  for (const value of [CURRENT_PROGRAM_ID, CURRENT_PDAO_MINT]) {
    assert(doc.includes(value), `current network state doc is missing ${value}`);
  }

  for (const [label, body] of [
    ["Anchor.toml", anchorToml],
    ["program declare_id", source],
    ["web constants", webConstants],
    ["Android surface", androidSurface],
    ["judge page", judge],
  ] as const) {
    assert(body.includes(CURRENT_PROGRAM_ID), `${label} is not aligned to the current Testnet program`);
  }

  assert(webConstants.includes(CURRENT_PDAO_MINT), "web constants are not aligned to the current PDAO mint");
  console.log("Current network state verification: PASS");
}

main();
