#!/usr/bin/env node

const baseUrl = (process.argv[2] ?? "https://api.privatedao.org").replace(/\/+$/, "");

const entryPaths = [
  "/",
  "/start/",
  "/judge/",
  "/security/",
  "/rpc-services/",
  "/api-status/",
  "/learn/",
  "/services/",
  "/android/",
  "/onboard/confirmed/",
];

const ignoredPrefixes = [
  "/_next",
  "/favicon",
  "/manifest",
  "/opengraph",
  "/apple-touch-icon",
];

function internalRouteFromHref(href) {
  if (!href.startsWith("/")) return null;
  if (ignoredPrefixes.some((prefix) => href.startsWith(prefix))) return null;
  const clean = href.split("#")[0].split("?")[0] || "/";
  return clean.startsWith("/") ? clean : `/${clean}`;
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response.text();
}

const links = new Map();

for (const path of entryPaths) {
  const html = await fetchText(`${baseUrl}${path}`);
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
  for (const href of hrefs) {
    const route = internalRouteFromHref(href);
    if (!route) continue;
    if (!links.has(route)) links.set(route, new Set());
    links.get(route).add(path);
  }
}

const failures = [];

for (const route of [...links.keys()].sort()) {
  const response = await fetch(`${baseUrl}${route}`, { redirect: "manual" });
  if (response.status >= 400) {
    failures.push({
      route,
      status: response.status,
      from: [...links.get(route)].sort(),
    });
  }
}

if (failures.length > 0) {
  console.error(JSON.stringify({ baseUrl, checked: links.size, failures }, null, 2));
  process.exit(1);
}

console.log(`Live entry link verification: PASS (${links.size} internal routes checked on ${baseUrl})`);
