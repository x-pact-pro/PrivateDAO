import fs from "node:fs";
import path from "node:path";

function resolveRepoDocsPath(relativePath: string) {
  const normalizedPath = path.posix.normalize(relativePath.split("\\").join("/"));
  if (!normalizedPath.startsWith("docs/")) {
    throw new Error(`Unsupported repository document path outside docs/: ${relativePath}`);
  }

  const docsRelativePath = normalizedPath.slice("docs/".length);
  const repoRoot = /* turbopackIgnore: true */ process.cwd();
  const candidates = [
    path.join(repoRoot, "docs", docsRelativePath),
    path.join(repoRoot, "..", "..", "docs", docsRelativePath),
  ];
  const filePath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!filePath) {
    throw new Error(`Unable to resolve repository document path: ${relativePath}`);
  }

  return filePath;
}

export function readRepoJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(resolveRepoDocsPath(relativePath), "utf8")) as T;
}

export function readOptionalRepoJson<T>(relativePath: string): T | null {
  try {
    return readRepoJson<T>(relativePath);
  } catch {
    return null;
  }
}
