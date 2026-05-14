#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const mode = process.argv[2] || "root";
const root = path.resolve(mode === "github" ? "dist/web-mirror-github" : "dist/web-mirror-root");

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const next = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(next, files);
    if (entry.isFile() && entry.name.endsWith(".html")) files.push(next);
  }
  return files;
}

function hasTarget(rawHref) {
  const pathname = rawHref.split("#")[0].split("?")[0];
  if (!pathname || pathname === "/") return fs.existsSync(path.join(root, "index.html"));
  const relativePath = decodeURIComponent(pathname).replace(/^\/+/, "");
  const candidates = [
    path.join(root, relativePath),
    path.join(root, relativePath, "index.html"),
    path.join(root, `${relativePath}.html`),
  ];
  return candidates.some((candidate) => fs.existsSync(candidate));
}

function isInternalRoute(rawHref) {
  if (!rawHref.startsWith("/")) return false;
  if (rawHref.startsWith("/_next/")) return false;
  if (rawHref.startsWith("/assets/")) return false;
  if (rawHref.startsWith("/favicon")) return false;
  if (rawHref.startsWith("/manifest")) return false;
  if (rawHref.startsWith("/robots")) return false;
  if (rawHref.startsWith("/sitemap")) return false;
  return true;
}

if (!fs.existsSync(root)) {
  console.error(`Missing web mirror root: ${root}`);
  process.exit(1);
}

const missing = [];
const seen = new Set();
const totals = { html: 0, links: 0, internal: 0 };
const linkPattern = /(?:href|src)=["']([^"']+)["']/g;

for (const file of walk(root)) {
  totals.html += 1;
  const html = fs.readFileSync(file, "utf8");
  for (const match of html.matchAll(linkPattern)) {
    const href = match[1];
    totals.links += 1;
    if (/^(https?:|mailto:|tel:|data:|blob:|javascript:)/i.test(href) || href.startsWith("#")) continue;
    if (!isInternalRoute(href)) continue;
    totals.internal += 1;
    const route = href.split("#")[0].split("?")[0];
    const key = `${file} ${route}`;
    if (!seen.has(key) && !hasTarget(route)) {
      seen.add(key);
      missing.push({ from: path.relative(root, file), href: route });
    }
  }
}

if (missing.length > 0) {
  console.error(JSON.stringify({ ok: false, root, totals, missingCount: missing.length, missing }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, root, totals, missingCount: 0 }, null, 2));
