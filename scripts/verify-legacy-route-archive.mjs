import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const archiveRoot = path.join(root, "docs/archive/legacy-routes/20260909");

const archivedTracks = [
  "100xdevs",
  "adevar-audit-credits",
  "colosseum-frontier",
  "consumer-apps",
  "dune-analytics",
  "eitherway-live-dapp",
  "encrypt-ika",
  "poland-grants",
  "privacy-track",
  "ranger-drift",
  "ranger-main",
  "rpc-infrastructure",
  "solrouter-encrypted-ai",
  "startup-accelerator",
  "superteam-poland",
  "umbra-confidential-payout",
];

const errors = [];

function requireFile(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    errors.push(`missing file: ${relativePath}`);
  }
  return absolutePath;
}

function requireRedirect(relativePath) {
  const absolutePath = requireFile(relativePath);
  if (!fs.existsSync(absolutePath)) return;
  const html = fs.readFileSync(absolutePath, "utf8");
  if (!html.includes('http-equiv="refresh"')) errors.push(`missing refresh redirect: ${relativePath}`);
  if (!html.includes('rel="canonical"')) errors.push(`missing canonical redirect: ${relativePath}`);
  if (html.includes("docs/archive/legacy-routes")) errors.push(`redirect points into archive: ${relativePath}`);
}

function assertOnlyIndex(relativeDir) {
  const absoluteDir = path.join(root, relativeDir);
  if (!fs.existsSync(absoluteDir) || !fs.statSync(absoluteDir).isDirectory()) {
    errors.push(`missing route directory: ${relativeDir}`);
    return;
  }
  const entries = fs.readdirSync(absoluteDir).sort();
  if (entries.length !== 1 || entries[0] !== "index.html") {
    errors.push(`${relativeDir} contains non-redirect content: ${entries.join(", ") || "empty"}`);
  }
}

function assertRedirectSurface(relativeDir, allowedEntries) {
  const absoluteDir = path.join(root, relativeDir);
  if (!fs.existsSync(absoluteDir) || !fs.statSync(absoluteDir).isDirectory()) {
    errors.push(`missing route directory: ${relativeDir}`);
    return;
  }
  const entries = fs.readdirSync(absoluteDir).sort();
  const expected = [...allowedEntries].sort();
  if (JSON.stringify(entries) !== JSON.stringify(expected)) {
    errors.push(`${relativeDir} contains unexpected content: ${entries.join(", ") || "empty"}`);
  }
}

requireRedirect("integrations/index.html");
assertRedirectSurface("integrations", ["index.html"]);
requireRedirect("tracks/index.html");
const trackEntries = fs.readdirSync(path.join(root, "tracks")).sort();
const expectedTrackEntries = ["index.html", ...archivedTracks].sort();
if (JSON.stringify(trackEntries) !== JSON.stringify(expectedTrackEntries)) {
  errors.push(`tracks contains unexpected content: ${trackEntries.join(", ")}`);
}

for (const slug of archivedTracks) {
  const archivePath = path.join(archiveRoot, "tracks", slug);
  const archiveIndex = path.join(archivePath, "index.html");
  if (!fs.existsSync(archiveIndex)) errors.push(`missing archived snapshot: docs/archive/legacy-routes/20260909/tracks/${slug}/index.html`);
  requireRedirect(`tracks/${slug}/index.html`);
  assertOnlyIndex(`tracks/${slug}`);
}

const archiveFiles = fs.existsSync(archiveRoot)
  ? fs.readdirSync(archiveRoot, { recursive: true }).filter((entry) => typeof entry === "string")
  : [];
if (archiveFiles.length === 0) errors.push("legacy archive is empty");
for (const entry of archiveFiles) {
  if (/\.(env|pem|key|p12|pfx)$/i.test(entry) || /(^|\/)(id|wallet|secret|token)[^/]*\.json$/i.test(entry)) {
    errors.push(`secret-like archive filename: ${entry}`);
  }
}

if (errors.length > 0) {
  console.error(`[legacy-route-archive] FAIL\n${errors.map((error) => `- ${error}`).join("\n")}`);
  process.exit(1);
}

console.log(`[legacy-route-archive] PASS archived_tracks=${archivedTracks.length} archive_files=${archiveFiles.length} active_redirect_surfaces=${archivedTracks.length + 2}`);
