import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const forbiddenPaths = [
  "apps/web/src/app/gaming",
  "apps/web/public/game",
  "gaming",
  "apps/web/out/gaming",
  "apps/web/out/game",
];

for (const relativePath of forbiddenPaths) {
  assert.equal(existsSync(resolve(root, relativePath)), false, `public game path still exists: ${relativePath}`);
}

const commercialSurfaceFiles = [
  "apps/web/src/app/robots.ts",
  "apps/web/src/components/home-shell.tsx",
  "apps/web/src/components/product-command-center.tsx",
  "apps/web/src/components/project-operating-map.tsx",
  "apps/web/src/lib/site-data.ts",
];

for (const relativePath of commercialSurfaceFiles) {
  const source = readFileSync(resolve(root, relativePath), "utf8");
  assert.equal(/(?:href\s*[:=]\s*["'`]\/gaming|game\.privatedao\.org)/i.test(source), false, `game link remains in ${relativePath}`);
}

console.log("PUBLIC_GAME_SURFACE_REMOVED: PASS");
