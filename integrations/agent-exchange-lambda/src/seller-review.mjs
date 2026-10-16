import { assertPublicHttps, fetchPublicHttps } from "./url-safety.mjs";

const MAX_TEXT_BYTES = 65536;
const GITHUB_HOST = "github.com";

function finding(code, severity, message) {
  return { code, severity, message };
}

function trimUrl(value) {
  const text = String(value || "").trim();
  return text ? text.slice(0, 500) : null;
}

async function checkUrl(value, label, { required = false } = {}) {
  const urlText = trimUrl(value);
  if (!urlText) return required ? { ok: false, findings: [finding(`${label}_missing`, "high", `${label} is required`)] } : { ok: false, skipped: true, findings: [] };
  let url;
  try { url = await assertPublicHttps(urlText); }
  catch { return { ok: false, findings: [finding(`${label}_unsafe_url`, "critical", `${label} must be a public HTTPS URL`)] }; }
  try {
    const response = await fetchPublicHttps(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
      headers: { accept: "text/html,application/json,text/plain" },
    });
    const redirected = response.status >= 300 && response.status < 400;
    const text = (await response.text()).slice(0, MAX_TEXT_BYTES);
    return {
      ok: response.ok && !redirected,
      url: url.href,
      status: response.status,
      content_type: response.headers.get("content-type") || "",
      bytes_checked: Buffer.byteLength(text),
      findings: response.ok && !redirected
        ? []
        : [finding(`${label}_unreachable`, response.status >= 500 ? "high" : "medium", `${label} did not return a direct successful HTTPS response`)],
    };
  } catch {
    return { ok: false, url: url.href, findings: [finding(`${label}_unreachable`, "high", `${label} could not be reached safely`)] };
  }
}

function githubParts(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname.toLowerCase() !== GITHUB_HOST) return null;
    const parts = url.pathname.split("/").filter(Boolean).slice(0, 2);
    if (parts.length !== 2 || parts.some((part) => !/^[A-Za-z0-9_.-]{1,100}$/.test(part))) return null;
    return parts;
  } catch { return null; }
}

async function checkGithub(value) {
  const urlText = trimUrl(value);
  if (!urlText) return { ok: false, skipped: true, findings: [] };
  const parts = githubParts(urlText);
  if (!parts) return { ok: false, findings: [finding("github_url_invalid", "high", "GitHub URL must identify a public github.com repository")] };
  const apiUrl = new URL(`https://api.github.com/repos/${encodeURIComponent(parts[0])}/${encodeURIComponent(parts[1])}`);
  try {
    const response = await fetchPublicHttps(apiUrl, {
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
      headers: { accept: "application/vnd.github+json", "user-agent": "PrivateDAO-Agent-Exchange/1.0" },
    });
    if (!response.ok) return { ok: false, findings: [finding("github_unreachable", "high", "GitHub repository metadata could not be verified publicly")] };
    const repo = await response.json();
    const findings = [];
    if (repo.private) findings.push(finding("github_private", "high", "GitHub repository is not public"));
    if (repo.archived) findings.push(finding("github_archived", "medium", "GitHub repository is archived"));
    if (!repo.license) findings.push(finding("github_license_missing", "low", "Repository has no detected open-source license"));
    return {
      ok: !repo.private,
      url: `https://github.com/${parts[0]}/${parts[1]}`,
      repository: { full_name: String(repo.full_name || `${parts[0]}/${parts[1]}`).slice(0, 220), default_branch: String(repo.default_branch || "").slice(0, 100), archived: Boolean(repo.archived), has_license: Boolean(repo.license), stars: Number(repo.stargazers_count || 0) },
      findings,
    };
  } catch {
    return { ok: false, findings: [finding("github_unreachable", "high", "GitHub repository metadata could not be verified safely")] };
  }
}

export async function reviewSellerSubmission({ endpoint, websiteUrl, githubUrl, docsUrl, discovery, services = [] }) {
  const findings = [];
  const endpointResult = {
    ok: Boolean(discovery?.protocolVersion && discovery?.serverInfo?.name),
    url: trimUrl(endpoint),
    transport: "MCP Streamable HTTP",
    verified_by: "initialize + tools/list",
    findings: [],
  };
  if (!endpointResult.ok) endpointResult.findings.push(finding("mcp_handshake_incomplete", "critical", "MCP handshake did not produce a complete server identity"));
  const website = await checkUrl(websiteUrl, "website");
  const docs = await checkUrl(docsUrl, "docs");
  const github = await checkGithub(githubUrl);
  findings.push(...endpointResult.findings, ...website.findings, ...docs.findings, ...github.findings);

  const safeTools = Array.isArray(discovery?.tools) ? discovery.tools.filter((tool) => tool?.annotations?.readOnlyHint !== false && !/(?:build|sign|send|transfer|withdraw|swap|write|delete|destroy|execute|submit|approve|govern|vote|publish|deploy|close|cancel)/i.test(tool.name || "")) : [];
  const unsafeTools = Array.isArray(discovery?.tools) ? discovery.tools.filter((tool) => !safeTools.includes(tool)) : [];
  if (!discovery?.protocolVersion || !discovery?.serverInfo?.name) findings.push(finding("mcp_handshake_incomplete", "critical", "MCP handshake did not produce a complete server identity"));
  if (unsafeTools.length) findings.push(finding("unsafe_tools_discovered", "critical", "The endpoint exposes tools outside the read-only policy"));
  if (!services.length) findings.push(finding("services_missing", "high", "At least one service must be selected"));
  if (services.some((service) => !safeTools.some((tool) => tool.name === service.tool))) findings.push(finding("service_not_read_only", "critical", "A selected service is not in the verified read-only tool set"));
  if (!website.ok && !github.ok) findings.push(finding("public_identity_missing", "high", "Provide a reachable website or public GitHub repository for review"));

  const critical = findings.filter((item) => item.severity === "critical");
  const high = findings.filter((item) => item.severity === "high");
  const score = Math.max(0, Math.min(100, 100 - critical.length * 35 - high.length * 18 - findings.filter((item) => item.severity === "medium").length * 8 - findings.filter((item) => item.severity === "low").length * 3 + (website.ok ? 5 : 0) + (github.ok ? 10 : 0) + (docs.ok ? 5 : 0)));
  return {
    version: "seller-review-v1",
    status: critical.length || high.length || score < 70 ? "blocked" : "passed",
    security_gate: critical.length ? "blocked" : "automated_screening_passed",
    quality_score: score,
    quality_band: score >= 90 ? "excellent" : score >= 70 ? "good" : score >= 50 ? "needs_review" : "insufficient",
    findings,
    checks: { mcp_endpoint: endpointResult, website, github, docs, discovered_tool_count: discovery?.tools?.length || 0, safe_tool_count: safeTools.length },
    reviewed_at: new Date().toISOString(),
    disclaimer: "Automated screening is not a security audit, legal certification, or guarantee of safe behavior.",
  };
}
