import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const sourceRoot = "dist/web-mirror-root";
const outRoot = "dist/github-pages-redirect";
const targetOrigin = "https://privatedao.org";

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, files);
    else files.push(path);
  }
  return files;
}

function routeFromIndexFile(file) {
  const rel = relative(sourceRoot, file).replace(/\\/g, "/");
  if (rel === "index.html") return "/";
  if (!rel.endsWith("/index.html")) return null;
  return `/${rel.slice(0, -"/index.html".length)}/`;
}

const htmlFiles = walk(sourceRoot).filter((file) => file.endsWith(".html"));
const knownRoutes = Array.from(
  new Set(
    htmlFiles
      .map(routeFromIndexFile)
      .filter(Boolean)
      .filter((route) => !route.startsWith("/404/") && route !== "/_not-found/")
  )
).sort();

const passthroughFiles = [
  "/ai.json",
  "/evidence.json",
  "/ownership.json",
  "/rights.txt",
  "/llms.txt",
  "/robots.txt",
  "/sitemap.xml",
  "/opengraph-image.png",
  "/twitter-image.png",
  "/manifest.webmanifest",
  "/favicon.ico",
];

const redirectScript = `
(function () {
  var targetOrigin = ${JSON.stringify(targetOrigin)};
  var knownRoutes = new Set(${JSON.stringify(knownRoutes)});
  var passthroughFiles = new Set(${JSON.stringify(passthroughFiles)});
  var rawPath = window.location.pathname || "/";
  var path = rawPath.replace(/^\\/PrivateDAO(?=\\/|$)/, "") || "/";
  if (!path.startsWith("/")) path = "/" + path;
  var search = window.location.search || "";
  var hash = window.location.hash || "";
  var cleanPath = path.endsWith("/") || /\\.[a-z0-9]+$/i.test(path) ? path : path + "/";
  var destination;
  if (path === "/" || cleanPath === "/") {
    destination = targetOrigin + "/";
  } else if (knownRoutes.has(cleanPath)) {
    destination = targetOrigin + cleanPath + search + hash;
  } else if (passthroughFiles.has(path)) {
    destination = targetOrigin + path;
  } else {
    destination = targetOrigin + "/thesis/";
  }
  window.location.replace(destination);
})();`;

function html({ title, canonical, body }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="canonical" href="${canonical}" />
    <title>${title}</title>
    <meta name="robots" content="noindex, follow" />
    <meta property="og:title" content="PrivateDAO - Make Your DAO Private Where It Matters" />
    <meta property="og:description" content="Create a public DAO or private room on Solana. Hide vote counts and voter intent during decisions, then reveal outcomes and proof when it counts." />
    <meta property="og:image" content="${targetOrigin}/opengraph-image.png" />
    <script>${redirectScript}</script>
  </head>
  <body>
    ${body}
  </body>
</html>
`;
}

rmSync(outRoot, { recursive: true, force: true });
mkdirSync(outRoot, { recursive: true });

writeFileSync(join(outRoot, ".nojekyll"), "");
writeFileSync(
  join(outRoot, "index.html"),
  html({
    title: "PrivateDAO",
    canonical: `${targetOrigin}/`,
    body: `<main><h1>PrivateDAO</h1><p>Redirecting to the official PrivateDAO website.</p><p><a href="${targetOrigin}/">Open PrivateDAO</a></p></main>`,
  })
);
writeFileSync(
  join(outRoot, "404.html"),
  html({
    title: "PrivateDAO route recovery",
    canonical: `${targetOrigin}/thesis/`,
    body: `<main><h1>PrivateDAO route recovery</h1><p>Historical links are routed to the official PrivateDAO website.</p><p><a href="${targetOrigin}/thesis/">Open PrivateDAO thesis</a></p></main>`,
  })
);
writeFileSync(
  join(outRoot, "routes.json"),
  `${JSON.stringify({ targetOrigin, generatedAt: new Date().toISOString(), knownRoutes }, null, 2)}\n`
);

console.log(`Built GitHub Pages redirect artifact with ${knownRoutes.length} known routes.`);
