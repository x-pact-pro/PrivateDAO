type PageCheck = {
  name: string;
  url: string;
  requiredFragments: string[];
  forbiddenFragments?: string[];
};

type ApiCheck = {
  name: string;
  method: "GET" | "POST";
  url: string;
  body?: unknown;
  validate: (payload: any) => string | null;
};

type HostCheck = {
  name: string;
  url: string;
  redirect?: RequestRedirect;
  validate: (response: Response) => string | null;
};

const ROOT_DOMAIN = process.env.PRIVATE_DAO_ROOT_DOMAIN || "privatedao.org";
const API_DOMAIN = process.env.PRIVATE_DAO_API_DOMAIN || "api.privatedao.org";
const ROOT = `https://${ROOT_DOMAIN}`;
const API = `https://${API_DOMAIN}`;
const REQUEST_TIMEOUT_MS = Number(process.env.PRIVATE_DAO_LIVE_EXECUTION_TIMEOUT_MS || 20_000);
const GLOBAL_FORBIDDEN_PAGE_FRAGMENTS = [
  "app.privatedao.xyz",
  "No custody ceremony evidence",
  "Evidence completion: 0/6",
  "0/6 custody gates",
];

const HOST_CHECKS: HostCheck[] = [
  {
    name: "canonical-root",
    url: `${ROOT}/`,
    validate: (response) => (response.status === 200 ? null : `canonical root returned HTTP ${response.status}`),
  },
  {
    name: "www-canonical-redirect",
    url: `https://www.${ROOT_DOMAIN}/`,
    redirect: "manual",
    validate: (response) => {
      const location = response.headers.get("location");
      if (![301, 308].includes(response.status)) return `www host returned HTTP ${response.status}, expected permanent redirect`;
      if (location !== `${ROOT}/`) return `www host redirect mismatch: ${location}`;
      return null;
    },
  },
  {
    name: "api-readiness-host",
    url: `${API}/api/v1/readiness`,
    validate: (response) => (response.status === 200 ? null : `API readiness host returned HTTP ${response.status}`),
  },
];

const PAGE_CHECKS: PageCheck[] = [
  {
    name: "home",
    url: `${ROOT}/`,
    requiredFragments: ["PrivateDAO", "Testnet", "Open Judge"],
  },
  {
    name: "judge",
    url: `${ROOT}/judge/`,
    requiredFragments: ["PrivateDAO", "Testnet", "REFHE", "On-chain claim console"],
  },
  {
    name: "encrypt-ika",
    url: `${ROOT}/services/encrypt-ika-operations/`,
    requiredFragments: ["Encrypt", "Ika", "REFHE"],
  },
  {
    name: "magicblock",
    url: `${ROOT}/services/magicblock-private-payments/`,
    requiredFragments: ["MagicBlock", "Testnet", "challenge/login"],
  },
  {
    name: "umbra",
    url: `${ROOT}/services/umbra-confidential-payout/`,
    requiredFragments: ["Umbra", "PrivateDAO", "Solana Testnet", "Verify Testnet rail"],
  },
  {
    name: "eitherway",
    url: `${ROOT}/services/eitherway-live-dapp/`,
    requiredFragments: ["Eitherway", "wallet-first", "Testnet"],
  },
  {
    name: "consumer-governance-ux",
    url: `${ROOT}/services/consumer-governance-ux/`,
    requiredFragments: ["Consumer", "wallet-first", "Android"],
  },
  {
    name: "pusd-stablecoin",
    url: `${ROOT}/services/pusd-stablecoin/`,
    requiredFragments: ["PUSD", "payroll", "treasury"],
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
    name: "proof",
    url: `${ROOT}/proof/`,
    requiredFragments: ["Proof", "Testnet", "MagicBlock"],
  },
  {
    name: "security",
    url: `${ROOT}/security/`,
    requiredFragments: ["Security", "Testnet", "4/6"],
  },
  {
    name: "android",
    url: `${ROOT}/android/`,
    requiredFragments: ["Android", "Testnet", "PrivateDAO"],
  },
  {
    name: "api-status",
    url: `${ROOT}/api-status/`,
    requiredFragments: ["API Status", "QuickNode", "Testnet"],
  },
  {
    name: "main-frontier-closure",
    url: `${ROOT}/services/main-frontier-closure/`,
    requiredFragments: ["Frontier", "Superteam", "Encrypt"],
  },
  {
    name: "confidential-payments",
    url: `${ROOT}/services/confidential-payments/`,
    requiredFragments: ["Confidential", "payments", "Testnet"],
  },
  {
    name: "services-claim-console",
    url: `${ROOT}/services/`,
    requiredFragments: ["On-chain claim console", "Encrypt + anchor on-chain", "Get Testnet SOL"],
  },
  {
    name: "runtime-infrastructure",
    url: `${ROOT}/services/runtime-infrastructure/`,
    requiredFragments: ["Runtime", "QuickNode", "Testnet"],
  },
  {
    name: "trust",
    url: `${ROOT}/trust/`,
    requiredFragments: ["Trust", "Testnet", "Security"],
  },
  {
    name: "frontier",
    url: `${ROOT}/frontier/`,
    requiredFragments: ["Frontier", "PrivateDAO", "Testnet"],
  },
  {
    name: "submission",
    url: `${ROOT}/submission/`,
    requiredFragments: ["Submission", "PrivateDAO", "Testnet"],
  },
  {
    name: "frontier-track-closure-document",
    url: `${ROOT}/documents/frontier-track-closure-matrix-2026-05-25/`,
    requiredFragments: ["Frontier", "Encrypt", "MagicBlock"],
  },
  {
    name: "encrypted-integrations-activation-document",
    url: `${ROOT}/documents/testnet-encrypted-integrations-activation-2026-05-23/`,
    requiredFragments: ["Testnet", "REFHE", "MagicBlock"],
  },
  {
    name: "privacy-execution-matrix-document",
    url: `${ROOT}/documents/privacy-execution-matrix-2026-05-26/`,
    requiredFragments: ["privacy", "execution", "matrix"],
  },
  {
    name: "read-node-backend-cutover-document",
    url: `${ROOT}/documents/read-node-backend-cutover/`,
    requiredFragments: ["https://api.privatedao.org/api/v1", "https://privatedao.org/", "Read-Node Backend Cutover Packet"],
    forbiddenFragments: ["app.privatedao.xyz"],
  },
  {
    name: "qvac-sovereign-ai",
    url: `${ROOT}/services/qvac-sovereign-ai/`,
    requiredFragments: ["QVAC", "AI", "PrivateDAO"],
  },
  {
    name: "refhe-payroll-proof",
    url: `${ROOT}/services/refhe-payroll-proof/`,
    requiredFragments: ["REFHE", "payroll", "proof"],
  },
  {
    name: "umbra-private-payments",
    url: `${ROOT}/services/umbra-private-payments/`,
    requiredFragments: ["Umbra", "private", "payments", "Solana Testnet"],
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
  {
    name: "legacy-judges",
    url: `${ROOT}/judges/`,
    requiredFragments: ["PrivateDAO"],
  },
  {
    name: "legacy-reviewer",
    url: `${ROOT}/reviewer/`,
    requiredFragments: ["PrivateDAO"],
  },
  {
    name: "legacy-arena",
    url: `${ROOT}/arena/`,
    requiredFragments: ["PrivateDAO"],
  },
  {
    name: "legacy-colosseum",
    url: `${ROOT}/colosseum/`,
    requiredFragments: ["PrivateDAO"],
  },
  {
    name: "legacy-tracks",
    url: `${ROOT}/tracks/`,
    requiredFragments: ["PrivateDAO"],
  },
  {
    name: "legacy-demo",
    url: `${ROOT}/demo/`,
    requiredFragments: ["PrivateDAO"],
  },
  {
    name: "legacy-whiteprint",
    url: `${ROOT}/whiteprint/`,
    requiredFragments: ["PrivateDAO"],
  },
  {
    name: "legacy-dao-ui-template",
    url: `${ROOT}/dao-ui-template/`,
    requiredFragments: ["PrivateDAO"],
  },
  {
    name: "legacy-governance-template",
    url: `${ROOT}/governance-template/`,
    requiredFragments: ["PrivateDAO"],
  },
  {
    name: "legacy-payment-template",
    url: `${ROOT}/payment-template/`,
    requiredFragments: ["PrivateDAO"],
  },
  {
    name: "legacy-runtime-template",
    url: `${ROOT}/runtime-template/`,
    requiredFragments: ["PrivateDAO"],
  },
  {
    name: "legacy-wallet-template",
    url: `${ROOT}/wallet-template/`,
    requiredFragments: ["PrivateDAO"],
  },
  {
    name: "legacy-devnet-billing-rehearsal",
    url: `${ROOT}/services/devnet-billing-rehearsal/`,
    requiredFragments: ["PrivateDAO"],
  },
  {
    name: "legacy-testnet-billing-rehearsal",
    url: `${ROOT}/services/testnet-billing-rehearsal/`,
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
    validate: (payload) => {
      if (payload?.ok !== true) return "cryptographic readiness did not return ok=true";
      const rails = Array.isArray(payload?.rails) ? payload.rails : [];
      const torque = rails.find((entry: any) => entry?.id === "torque-growth-relay");
      if (torque?.status !== "server-relay-delivery-verified") return `Torque cryptographic rail status mismatch: ${torque?.status}`;
      if (torque?.lastIngestionId !== "4e660492-af75-4a28-9cb2-a81f7779be38") return "Torque cryptographic rail ingestion evidence mismatch";
      const ika = rails.find((entry: any) => entry?.id === "ika-2pc-mpc");
      if (ika?.proof !== "/api/v1/ika/custody/prepare") return "Ika cryptographic rail must point to custody prepare proof";
      return null;
    },
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
      for (const entry of services) {
        if (entry?.testnetExecutable !== true) return `${entry?.service} is not marked testnetExecutable`;
        if (entry?.visitorRepeatable !== true) return `${entry?.service} is not marked visitorRepeatable`;
        if (typeof entry?.executionProofClass !== "string" || entry.executionProofClass.length < 8) {
          return `${entry?.service} missing executionProofClass`;
        }
        if (typeof entry?.blockchainVerificationUrl !== "string" || !entry.blockchainVerificationUrl.includes("cluster=testnet")) {
          return `${entry?.service} missing Testnet blockchainVerificationUrl`;
        }
        if (typeof entry?.currentOnchainStatus !== "string" || entry.currentOnchainStatus.length < 8) {
          return `${entry?.service} missing currentOnchainStatus`;
        }
      }
      const onchainServices = services.filter((entry: any) => entry?.executionProofClass === "onchain-signature");
      if (onchainServices.length < 2) return "privacy execution matrix must include at least two on-chain signature privacy rails";
      return null;
    },
  },
  {
    name: "privacy-execution-claims",
    method: "GET",
    url: `${API}/api/v1/privacy-execution-claims`,
    validate: (payload) => {
      if (payload?.ok !== true) return "privacy execution claims did not return ok=true";
      if (payload?.cluster !== "testnet") return `privacy execution claims cluster mismatch: ${payload?.cluster}`;
      const claims = Array.isArray(payload?.claims) ? payload.claims : [];
      if (claims.length < 7) return `privacy execution claims too small: ${claims.length}`;
      if (typeof payload?.claimPolicy !== "string" || !payload.claimPolicy.includes("AES-GCM")) {
        return "privacy execution claims policy must mention AES-GCM encrypted claim packets";
      }
      if (!Array.isArray(payload?.mustPass) || !payload.mustPass.some((entry: string) => entry.includes("PDAO_ENCRYPTED_CLAIM_V1"))) {
        return "privacy execution claims must enforce PDAO_ENCRYPTED_CLAIM_V1";
      }
      for (const claim of claims) {
        if (claim?.visitorRepeatable !== true) return `${claim?.service} claim is not visitor-repeatable`;
        if (typeof claim?.proofClass !== "string" || claim.proofClass.length < 8) return `${claim?.service} missing proofClass`;
        if (typeof claim?.blockchainVerificationUrl !== "string" || !claim.blockchainVerificationUrl.includes("cluster=testnet")) {
          return `${claim?.service} missing Testnet blockchain verification URL`;
        }
        if (claim.proofClass === "onchain-signature") {
          const evidence = claim?.onchainEvidence || {};
          const hasTx = Object.values(evidence).some((value) => typeof value === "string" && value.length > 40);
          if (!hasTx) return `${claim?.service} on-chain claim missing transaction evidence`;
        }
      }
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
      if (proof?.network !== "testnet") return `MagicBlock proof network must be testnet, got ${proof?.network}`;
      if (proof?.runtime?.cluster !== "testnet") return `MagicBlock runtime cluster must be testnet, got ${proof?.runtime?.cluster}`;
      if (proof?.summary?.allFinalized !== true) return "MagicBlock proof transactions are not all finalized";
      if (proof?.corridorAccount?.owner !== "EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva") return "MagicBlock corridor owner mismatch";
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
    name: "private-settlement-intent",
    method: "POST",
    url: `${API}/api/v1/private-settlement/intent`,
    body: {
      rail: "umbra",
      asset: "USDC",
      amount: "1.25",
      recipient: "4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD",
      operationType: "live-service-execution-gate",
      memo: "PrivateDAO live privacy matrix check",
    },
    validate: (payload) => {
      if (payload?.ok !== true) return "Private settlement intent did not return ok=true";
      if (payload?.receipt?.rail !== "umbra") return `Private settlement rail mismatch: ${payload?.receipt?.rail}`;
      if (payload?.receipt?.network !== "testnet") return `Private settlement network mismatch: ${payload?.receipt?.network}`;
      if (typeof payload?.receipt?.executionReference !== "string") return "Private settlement intent missing execution reference";
      return null;
    },
  },
  {
    name: "qvac-runtime-proof",
    method: "GET",
    url: `${API}/api/v1/qvac/runtime-proof`,
    validate: (payload) => (payload?.ok === true ? null : "QVAC runtime proof did not return ok=true"),
  },
  {
    name: "goldrush-wallet-intelligence",
    method: "POST",
    url: `${API}/api/v1/goldrush/query`,
    body: {
      walletAddress: "4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD",
      chainName: "solana-testnet",
      queryType: "wallet-history",
    },
    validate: (payload) => {
      if (payload?.ok !== true) return "GoldRush wallet intelligence did not return ok=true";
      const sources = payload?.sources || {};
      if (typeof sources.goldRush !== "string") return "GoldRush response missing goldRush source state";
      if (sources.zerion !== "live") return `GoldRush fallback Zerion state mismatch: ${sources.zerion}`;
      if (sources.solanaRpc !== "live") return `GoldRush fallback Solana RPC state mismatch: ${sources.solanaRpc}`;
      if (typeof payload?.summary?.previewTransactionCount !== "number") return "GoldRush response missing transaction preview count";
      return null;
    },
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
      if (typeof payload?.summary?.totalPositionsUsd !== "number") return "Zerion portfolio missing normalized summary";
      if (!payload?.positionsDistributionByChain || typeof payload.positionsDistributionByChain !== "object") return "Zerion portfolio missing chain distribution";
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
  {
    name: "ika-custody-prepare",
    method: "POST",
    url: `${API}/api/v1/ika/custody/prepare`,
    body: {
      network: "testnet",
      curve: "SECP256K1",
      custodyMode: "shared-dwallet",
      operationLabel: "PrivateDAO live matrix dWallet custody check",
    },
    validate: (payload) => {
      if (payload?.ok !== true) return "Ika custody prepare did not return ok=true";
      if (payload?.source !== "ika-sdk-live-readiness") return `Ika custody source mismatch: ${payload?.source}`;
      if (payload?.network !== "testnet") return `Ika custody network mismatch: ${payload?.network}`;
      if (payload?.sdk?.initialized !== true) return "Ika custody SDK not initialized";
      if (typeof payload?.routeId !== "string" || !payload.routeId.startsWith("ika-custody-")) return "Ika custody route id missing";
      return null;
    },
  },
];

async function main() {
  const startedAt = new Date().toISOString();
  const hostResults = [];
  const pageResults = [];
  const apiResults = [];

  for (const check of HOST_CHECKS) {
    hostResults.push(await runHostCheck(check));
  }

  for (const check of PAGE_CHECKS) {
    pageResults.push(await runPageCheck(check));
  }

  for (const check of API_CHECKS) {
    apiResults.push(await runApiCheck(check));
  }

  const failures = [...hostResults, ...pageResults, ...apiResults].filter((result) => !result.ok);
  const payload = {
    project: "PrivateDAO",
    startedAt,
    completedAt: new Date().toISOString(),
    rootDomain: ROOT_DOMAIN,
    apiDomain: API_DOMAIN,
    hostResults,
    pageResults,
    apiResults,
    summary: {
      hostsChecked: hostResults.length,
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

async function runHostCheck(check: HostCheck) {
  const started = Date.now();
  try {
    const response = await fetchWithTimeout(check.url, { redirect: check.redirect });
    const validationError = check.validate(response);
    return {
      kind: "host",
      name: check.name,
      url: check.url,
      status: response.status,
      ok: !validationError,
      ms: Date.now() - started,
      location: response.headers.get("location"),
      validationError,
    };
  } catch (error) {
    return failure("host", check.name, check.url, started, error);
  }
}

async function runPageCheck(check: PageCheck) {
  const started = Date.now();
  try {
    const response = await fetchWithTimeout(check.url);
    const body = await response.text();
    const missingFragments = check.requiredFragments.filter((fragment) => !body.includes(fragment));
    const forbiddenFragments = [...GLOBAL_FORBIDDEN_PAGE_FRAGMENTS, ...(check.forbiddenFragments || [])].filter((fragment) =>
      body.includes(fragment),
    );
    const hasNotFound = /\b404\b|not found/i.test(body);
    const ok = response.ok && missingFragments.length === 0 && forbiddenFragments.length === 0 && !hasNotFound;
    return {
      kind: "page",
      name: check.name,
      url: check.url,
      status: response.status,
      ok,
      ms: Date.now() - started,
      bytes: body.length,
      missingFragments,
      forbiddenFragments,
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

function failure(kind: "host" | "page" | "api", name: string, url: string, started: number, error: unknown) {
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
