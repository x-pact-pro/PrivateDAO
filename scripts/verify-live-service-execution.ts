type PageCheck = {
  name: string;
  url: string;
  requiredFragments: string[];
};

type ApiCheck = {
  name: string;
  method: "GET" | "POST";
  url: string;
  body?: unknown;
  validate: (payload: any) => string | null;
};

const ROOT_DOMAIN = process.env.PRIVATE_DAO_ROOT_DOMAIN || "privatedao.org";
const API_DOMAIN = process.env.PRIVATE_DAO_API_DOMAIN || "api.privatedao.org";
const ROOT = `https://${ROOT_DOMAIN}`;
const API = `https://${API_DOMAIN}`;
const REQUEST_TIMEOUT_MS = Number(process.env.PRIVATE_DAO_LIVE_EXECUTION_TIMEOUT_MS || 20_000);

const PAGE_CHECKS: PageCheck[] = [
  {
    name: "home",
    url: `${ROOT}/`,
    requiredFragments: ["PrivateDAO", "Testnet", "Open Judge"],
  },
  {
    name: "judge",
    url: `${ROOT}/judge/`,
    requiredFragments: ["PrivateDAO", "Testnet", "REFHE"],
  },
  {
    name: "encrypt-ika",
    url: `${ROOT}/services/encrypt-ika-operations/`,
    requiredFragments: ["Encrypt", "Ika", "REFHE"],
  },
  {
    name: "umbra",
    url: `${ROOT}/services/umbra-confidential-payout/`,
    requiredFragments: ["Umbra", "PrivateDAO"],
  },
  {
    name: "jupiter",
    url: `${ROOT}/services/jupiter-treasury-route/`,
    requiredFragments: ["Jupiter", "PrivateDAO"],
  },
  {
    name: "goldrush",
    url: `${ROOT}/services/goldrush-decision-intelligence/`,
    requiredFragments: ["GoldRush", "intelligence", "Encrypt"],
  },
  {
    name: "zerion",
    url: `${ROOT}/services/zerion-agent-policy/`,
    requiredFragments: ["Zerion", "Policy", "Solana"],
  },
  {
    name: "torque",
    url: `${ROOT}/services/torque-growth-loop/`,
    requiredFragments: ["Torque", "custom_events", "read-node"],
  },
  {
    name: "legacy-review",
    url: `${ROOT}/review/`,
    requiredFragments: ["PrivateDAO", "Testnet"],
  },
  {
    name: "legacy-payments",
    url: `${ROOT}/payments/`,
    requiredFragments: ["PrivateDAO"],
  },
  {
    name: "legacy-business-model",
    url: `${ROOT}/business-model/`,
    requiredFragments: ["PrivateDAO"],
  },
];

const API_CHECKS: ApiCheck[] = [
  {
    name: "readiness",
    method: "GET",
    url: `${API}/api/v1/readiness`,
    validate: (payload) => (payload?.ok === true ? null : "readiness did not return ok=true"),
  },
  {
    name: "cryptographic-readiness",
    method: "GET",
    url: `${API}/api/v1/cryptographic-readiness`,
    validate: (payload) => (payload?.ok === true ? null : "cryptographic readiness did not return ok=true"),
  },
  {
    name: "privacy-execution-matrix",
    method: "GET",
    url: `${API}/api/v1/privacy-execution-matrix`,
    validate: (payload) => {
      if (payload?.ok !== true) return "privacy execution matrix did not return ok=true";
      const services = Array.isArray(payload?.serviceMatrix) ? payload.serviceMatrix : [];
      const required = [
        "private-governance",
        "confidential-payroll",
        "private-payments",
        "umbra-confidential-payout",
        "ika-custody-and-interoperability",
        "intelligence-and-risk",
        "treasury-routing-and-growth",
      ];
      const missing = required.filter((service) => !services.some((entry: any) => entry?.service === service));
      if (missing.length) return `privacy execution matrix missing ${missing.join(", ")}`;
      if (payload?.cluster !== "testnet") return `privacy execution matrix cluster mismatch: ${payload?.cluster}`;
      return null;
    },
  },
  {
    name: "provider-integrations-status",
    method: "GET",
    url: `${API}/api/v1/provider-integrations/status`,
    validate: (payload) => {
      if (payload?.ok !== true) return "provider integrations status did not return ok=true";
      const providers = payload?.providers || {};
      for (const provider of ["goldrush", "zerion", "torque", "jupiter", "qvac"]) {
        if (!providers?.[provider]?.proofEndpoint) return `provider status missing proof endpoint for ${provider}`;
        if (!providers?.[provider]?.route) return `provider status missing route for ${provider}`;
      }
      if (providers?.torque?.deliveryVerified !== true) return "Torque delivery is not verified";
      if (providers?.torque?.customEventName !== "private_treasury_execution") return "Torque custom event name mismatch";
      if (providers?.torque?.customEventId !== "cmpm5lolt00iajq1jjluy5a3m") return "Torque custom event id mismatch";
      if (providers?.torque?.lastIngestionId !== "4e660492-af75-4a28-9cb2-a81f7779be38") return "Torque ingestion evidence mismatch";
      if (payload?.cluster !== "testnet") return `provider status cluster mismatch: ${payload?.cluster}`;
      return null;
    },
  },
  {
    name: "magicblock-onchain-proof",
    method: "GET",
    url: `${API}/api/v1/magicblock/onchain-proof?refresh=1`,
    validate: (payload) => {
      const proof = payload?.proof;
      if (payload?.ok !== true) return "MagicBlock proof did not return ok=true";
      if (proof?.network !== "devnet") return `MagicBlock proof network must be devnet, got ${proof?.network}`;
      if (proof?.runtime?.cluster !== "devnet") return `MagicBlock runtime cluster must be devnet, got ${proof?.runtime?.cluster}`;
      if (proof?.summary?.allFinalized !== true) return "MagicBlock proof transactions are not all finalized";
      return null;
    },
  },
  {
    name: "umbra-relayer-health",
    method: "GET",
    url: `${API}/api/v1/umbra/relayer/health`,
    validate: (payload) => (payload?.ok === true ? null : "Umbra relayer health did not return ok=true"),
  },
  {
    name: "qvac-runtime-proof",
    method: "GET",
    url: `${API}/api/v1/qvac/runtime-proof`,
    validate: (payload) => (payload?.ok === true ? null : "QVAC runtime proof did not return ok=true"),
  },
  {
    name: "zerion-portfolio-post",
    method: "POST",
    url: `${API}/api/v1/zerion/portfolio`,
    body: {
      walletAddress: "4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD",
    },
    validate: (payload) => {
      if (payload?.ok !== true) return "Zerion portfolio POST did not return ok=true";
      if (payload?.source !== "zerion") return `Zerion source mismatch: ${payload?.source}`;
      if (payload?.status !== 200) return `Zerion upstream status mismatch: ${payload?.status}`;
      return null;
    },
  },
  {
    name: "jupiter-order-preview",
    method: "POST",
    url: `${API}/api/v1/jupiter/order`,
    body: {
      inputMint: "So11111111111111111111111111111111111111112",
      outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      amount: "1000000",
      slippageBps: 50,
    },
    validate: (payload) => {
      if (payload?.ok !== true) return "Jupiter order preview did not return ok=true";
      if (payload?.configured !== true) return "Jupiter order preview is not configured";
      if (typeof payload?.summary?.router !== "string" || payload.summary.router.length === 0) return "Jupiter order preview missing router";
      if (typeof payload?.summary?.requestId !== "string") return "Jupiter order preview missing request id";
      return null;
    },
  },
  {
    name: "quicknode-stream-stats",
    method: "GET",
    url: `${API}/api/v1/quicknode/stream/stats`,
    validate: (payload) => {
      if (payload?.ok !== true) return "QuickNode stream stats did not return ok=true";
      if (payload?.stats?.auth !== "configured") return "QuickNode stream auth is not configured";
      if (payload?.stats?.network !== "solana-testnet") return `QuickNode stream network mismatch: ${payload?.stats?.network}`;
      return null;
    },
  },
  {
    name: "torque-custom-event",
    method: "POST",
    url: `${API}/api/v1/torque/custom-event`,
    body: {
      userPubkey: "4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD",
      timestamp: 1779770400000,
      eventName: "private_treasury_execution",
      data: {
        amount: 2100,
        type: "live_service_execution_gate",
        success: true,
      },
    },
    validate: (payload) => {
      if (payload?.ok !== true) return "Torque custom event did not return ok=true";
      if (payload?.status !== 202) return `Torque upstream status mismatch: ${payload?.status}`;
      if (payload?.raw?.status !== "ACCEPTED") return `Torque raw status mismatch: ${payload?.raw?.status}`;
      if (typeof payload?.raw?.ingestionId !== "string") return "Torque custom event missing ingestion id";
      return null;
    },
  },
  {
    name: "refhe-payroll-proof",
    method: "POST",
    url: `${API}/api/v1/refhe/payroll/proof`,
    body: {
      ciphertext: "00aabbccddeeff001122334455667788",
      inputCommitment: "live-execution-check-input-commitment",
      computationCommitment: "live-execution-check-computation-commitment",
      policyHash: "live-execution-check-policy-hash",
      totalAmountCommitment: "live-execution-check-total-amount",
      recipientCount: 1,
    },
    validate: (payload) => {
      const receiptHash = payload?.receiptHash || payload?.receipt?.receiptHash;
      if (payload?.ok !== true) return "REFHE payroll proof did not return ok=true";
      if (typeof receiptHash !== "string" || receiptHash.length < 32) return "REFHE payroll proof missing receipt hash";
      return null;
    },
  },
  {
    name: "ika-approval-prepare",
    method: "POST",
    url: `${API}/api/v1/ika/solana-prealpha/approval/prepare`,
    body: {
      network: "testnet",
      policy: "live-execution-check",
      amount: "1",
    },
    validate: (payload) => {
      const routeId = payload?.routeId || payload?.plan?.routeId;
      if (payload?.ok !== true) return "Ika approval prepare did not return ok=true";
      if (typeof routeId !== "string" || !routeId.startsWith("ika-approval-")) return "Ika approval prepare missing route id";
      return null;
    },
  },
];

async function main() {
  const startedAt = new Date().toISOString();
  const pageResults = [];
  const apiResults = [];

  for (const check of PAGE_CHECKS) {
    pageResults.push(await runPageCheck(check));
  }

  for (const check of API_CHECKS) {
    apiResults.push(await runApiCheck(check));
  }

  const failures = [...pageResults, ...apiResults].filter((result) => !result.ok);
  const payload = {
    project: "PrivateDAO",
    startedAt,
    completedAt: new Date().toISOString(),
    rootDomain: ROOT_DOMAIN,
    apiDomain: API_DOMAIN,
    pageResults,
    apiResults,
    summary: {
      pagesChecked: pageResults.length,
      apisChecked: apiResults.length,
      failures: failures.length,
    },
  };

  console.log(JSON.stringify(payload, null, 2));
  if (failures.length > 0) {
    process.exit(1);
  }
}

async function runPageCheck(check: PageCheck) {
  const started = Date.now();
  try {
    const response = await fetchWithTimeout(check.url);
    const body = await response.text();
    const missingFragments = check.requiredFragments.filter((fragment) => !body.includes(fragment));
    const hasNotFound = /\b404\b|not found/i.test(body);
    const ok = response.ok && missingFragments.length === 0 && !hasNotFound;
    return {
      kind: "page",
      name: check.name,
      url: check.url,
      status: response.status,
      ok,
      ms: Date.now() - started,
      bytes: body.length,
      missingFragments,
      hasNotFound,
    };
  } catch (error) {
    return failure("page", check.name, check.url, started, error);
  }
}

async function runApiCheck(check: ApiCheck) {
  const started = Date.now();
  try {
    const response = await fetchWithTimeout(check.url, {
      method: check.method,
      headers: check.body ? { "content-type": "application/json" } : undefined,
      body: check.body ? JSON.stringify(check.body) : undefined,
    });
    const text = await response.text();
    let payload: any = null;
    try {
      payload = JSON.parse(text);
    } catch {
      return {
        kind: "api",
        name: check.name,
        url: check.url,
        status: response.status,
        ok: false,
        ms: Date.now() - started,
        error: "response was not JSON",
      };
    }
    const validationError = response.ok ? check.validate(payload) : `HTTP ${response.status}`;
    return {
      kind: "api",
      name: check.name,
      url: check.url,
      status: response.status,
      ok: !validationError,
      ms: Date.now() - started,
      validationError,
      summary: summarizeApiPayload(check.name, payload),
    };
  } catch (error) {
    return failure("api", check.name, check.url, started, error);
  }
}

async function fetchWithTimeout(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function failure(kind: "page" | "api", name: string, url: string, started: number, error: unknown) {
  return {
    kind,
    name,
    url,
    status: null,
    ok: false,
    ms: Date.now() - started,
    error: error instanceof Error ? error.message : String(error),
  };
}

function summarizeApiPayload(name: string, payload: any) {
  if (name === "magicblock-onchain-proof") {
    return {
      network: payload?.proof?.network,
      runtimeCluster: payload?.proof?.runtime?.cluster,
      finalized: payload?.proof?.summary?.finalized,
      checked: payload?.proof?.summary?.checked,
      allFinalized: payload?.proof?.summary?.allFinalized,
    };
  }
  if (name === "quicknode-stream-stats") {
    return {
      auth: payload?.stats?.auth,
      network: payload?.stats?.network,
      acceptedPayloads: payload?.stats?.acceptedPayloads,
      privateDaoTransactionCount: payload?.stats?.totals?.privateDaoTransactionCount,
    };
  }
  if (name === "zerion-portfolio-post") {
    return {
      ok: payload?.ok,
      source: payload?.source,
      status: payload?.status,
      wallet: payload?.wallet,
    };
  }
  if (name === "jupiter-order-preview") {
    return {
      ok: payload?.ok,
      configured: payload?.configured,
      status: payload?.status,
      router: payload?.summary?.router,
      requestId: payload?.summary?.requestId,
      transactionAvailable: payload?.summary?.transactionAvailable,
    };
  }
  if (name === "provider-integrations-status") {
    const providers = payload?.providers || {};
    return {
      source: payload?.source,
      goldrush: providers?.goldrush?.configured,
      zerion: providers?.zerion?.configured,
      torque: providers?.torque?.configured,
      jupiter: providers?.jupiter?.configured,
      qvac: providers?.qvac?.configured,
    };
  }
  if (name === "refhe-payroll-proof") {
    return {
      receiptHash: payload?.receiptHash || payload?.receipt?.receiptHash,
      executionBoundary: payload?.executionBoundary || payload?.receipt?.executionBoundary,
    };
  }
  if (name === "ika-approval-prepare") {
    return {
      routeId: payload?.routeId || payload?.plan?.routeId,
      status: payload?.status || payload?.plan?.status,
      network: payload?.network || payload?.plan?.network,
    };
  }
  return {
    ok: payload?.ok,
    source: payload?.source || payload?.status || payload?.project,
  };
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
