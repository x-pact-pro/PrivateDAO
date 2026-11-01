import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";

const port = 8791;
// `ccp` can wrap process.execPath; use the actual Node command for the child.
const child = spawn(process.env.PDAO_NODE_BIN || "node", ["--import", "tsx", "scripts/kernel-gateway.ts"], {
  cwd: process.cwd(),
    env: {
      ...process.env,
      PDAO_KERNEL_GATEWAY_PORT: String(port),
      PDAO_KERNEL_GATEWAY_TOKEN: "gateway-test-token",
      PDAO_KERNEL_GATEWAY_ALLOW_UNAUTHENTICATED: "1",
      NODE_ENV: "production",
      PDAO_KERNEL_EVM_ENABLED: "0",
    },
  stdio: ["ignore", "pipe", "pipe"],
  detached: true,
});

const request = (method, path, body, token = "gateway-test-token", origin) => new Promise((resolve, reject) => {
  const req = http.request({
    host: "127.0.0.1",
    port,
    path,
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { "x-pdao-gateway-token": token } : {}),
      ...(origin ? { origin } : {}),
    },
  }, (res) => {
    let data = "";
    res.on("data", (chunk) => { data += chunk; });
    res.on("end", () => resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} }));
  });
  req.on("error", reject);
  if (body !== undefined) req.write(JSON.stringify(body));
  req.end();
});

const waitForHealth = async () => {
  for (let attempt = 0; attempt < 600; attempt += 1) {
    try {
      const response = await request("GET", "/healthz");
      if (response.status === 200) return response.body;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("Kernel gateway did not become healthy.");
};

try {
  const health = await waitForHealth();
  const unauthorized = await request("POST", "/v1/executions/prepare", { intent: {} }, null);
  assert.equal(unauthorized.status, 401, "execution routes must require the gateway token");
  const crossOrigin = await request("POST", "/v1/executions/prepare", { intent: {} }, "gateway-test-token", "https://evil.example");
  assert.equal(crossOrigin.status, 401, "execution routes must reject a cross-origin request even with an edge token");
  const sameOrigin = await request("POST", "/v1/executions/prepare", { intent: {} }, "gateway-test-token", "https://privatedao.org");
  assert.notEqual(sameOrigin.status, 401, "the configured PrivateDAO browser origin must reach normal request validation");
  const walletUnavailable = await request("POST", "/v1/wallet/executions/prepare", { intent: {}, walletRequest: {} });
  assert.equal(walletUnavailable.status, 503, "wallet routes must fail closed until MongoDB and Cognito are configured");
  const recoveryUnavailable = await request("POST", "/v1/wallet/recovery/request", { walletId: "wallet_test", mode: "b2b" });
  assert.equal(recoveryUnavailable.status, 503, "wallet recovery must fail closed until MongoDB and Cognito are configured");
  assert.deepEqual(health.wallet, {
    configured: false,
    ready: false,
    readinessReason: "not_configured",
    durableStore: "mongodb",
    identity: "aws-cognito",
  });
  const prefixedHealth = await request("GET", "/api/healthz");
  assert.equal(prefixedHealth.status, 200);
  const zcashConfigured = Boolean(process.env.PDAO_ZCASH_ZALLET_BINARY && process.env.PDAO_ZCASH_ZALLET_DATA_DIR && process.env.PDAO_ZCASH_ZALLET_CONFIG);
  const expectedNetworks = ["solana-devnet", "ethereum-sepolia", "arbitrum-sepolia", "tempo-testnet", "base-sepolia", "bnb-testnet", "robinhood-testnet", "hyperliquid-testnet", "zcash-testnet", "stellar-testnet", "hypercore-testnet"];
  assert.deepEqual(health.networks, expectedNetworks);
  assert.equal(health.networkModes.length, expectedNetworks.length);
  assert.ok(Array.isArray(health.capabilityStatus));
  const stellarCapabilityStatus = health.capabilityStatus.filter((entry) => entry.network === "stellar-testnet");
  assert.equal(stellarCapabilityStatus.length, 0, "unbound Stellar product capabilities must not be advertised");
  const hypercoreCapabilityStatus = health.capabilityStatus.filter((entry) => entry.network === "hypercore-testnet");
  assert.equal(hypercoreCapabilityStatus.length, 0, "HyperCore native actions must not be advertised as product capabilities yet");
  for (const network of expectedNetworks) {
    const mode = health.networkModes.find((entry) => entry.network === network);
    assert.ok(mode, `${network} must have a Kernel network mode`);
    if (network === "zcash-testnet") {
      assert.equal(mode.provider, zcashConfigured ? "privatedao-zcash-testnet-zallet" : "privatedao-kernel-policy");
      assert.equal(mode.onchainAdapter, zcashConfigured);
      assert.equal(mode.ready, false);
    } else if (network === "hypercore-testnet") {
      assert.equal(mode.provider, "privatedao-kernel-policy");
      assert.equal(mode.onchainAdapter, false);
      assert.equal(mode.ready, false);
    } else if (network === "stellar-testnet") {
      assert.equal(mode.provider, "privatedao-stellar-testnet-horizon");
      assert.equal(mode.onchainAdapter, true);
      assert.equal(mode.ready, true);
    } else if (network === "solana-devnet") {
      assert.equal(mode.provider, "kernel-native");
      assert.equal(mode.onchainAdapter, false);
      assert.equal(mode.ready, false);
    } else if (["ethereum-sepolia", "arbitrum-sepolia", "tempo-testnet", "base-sepolia", "bnb-testnet", "robinhood-testnet", "hyperliquid-testnet"].includes(network)) {
      assert.equal(mode.provider, `privatedao-evm-${network}-browser`);
      assert.equal(mode.onchainAdapter, true);
      assert.equal(mode.ready, true);
    } else {
      assert.equal(mode.provider, "privatedao-kernel-policy");
      assert.equal(mode.onchainAdapter, false);
      assert.equal(mode.ready, false);
    }
  }
  assert.equal(health.zcash.configured, zcashConfigured);
  assert.equal(health.zcash.policyReady, true);
  assert.equal(health.zcash.testnetOnly, true);
  assert.equal(health.zcash.broadcastEnabled, false);
  assert.equal(health.stellar.configured, true);
  assert.equal(health.stellar.ready, true);
  assert.equal(health.stellar.testnetOnly, true);
  assert.equal(health.stellar.broadcastEnabled, false);

  const baseIntent = (network, requestId) => ({
    context: {
      requestId,
      idempotencyKey: requestId,
      product: "payroll",
      capability: "payroll.calculate",
      actorId: "gateway-test",
      network,
    },
    payload: {
      lines: [{ employeeRef: "employee-1", grossCents: 10000 }],
      policy: {
        network,
        jurisdiction: "demo",
        taxYear: "2026",
        taxRateBps: 1000,
        deductionRateBps: 500,
        maxTotalCents: 20000,
        maxEmployeeCents: 15000,
        allowedAsset: "USDC",
        rounding: "half-up",
      },
    },
    accounts: [],
  });

  for (const network of health.networks) {
    const requestId = `gateway-${network}`;
    if (["ethereum-sepolia", "arbitrum-sepolia", "tempo-testnet", "base-sepolia", "bnb-testnet", "robinhood-testnet", "hyperliquid-testnet", "zcash-testnet", "stellar-testnet", "hypercore-testnet"].includes(network)) {
      const unsupported = await request("POST", "/v1/executions/prepare", { intent: baseIntent(network, requestId) });
      assert.equal(unsupported.status, 400, `${network} must reject an unbound payroll capability`);
      continue;
    }
    const preparePath = network === "solana-devnet" ? "/api/v1/executions/prepare" : "/v1/executions/prepare";
    const first = await request("POST", preparePath, { intent: baseIntent(network, requestId) });
    assert.equal(first.status, 200, `${network} prepare failed: ${JSON.stringify(first.body)}`);
    const repeated = await request("POST", "/v1/executions/prepare", { intent: baseIntent(network, requestId) });
    assert.equal(repeated.status, 200, `${network} idempotent prepare failed`);
    assert.equal(repeated.body.executionId, first.body.executionId);

    const submit = await request("POST", "/v1/executions/submit", { execution: first.body, signedPayload: null });
    if (network === "stellar-testnet") {
      assert.equal(submit.status, 400, "Stellar submit must remain fail-closed");
      const status = await request("GET", `/v1/executions/${encodeURIComponent(first.body.executionId)}/status`);
      assert.equal(status.status, 200);
      assert.equal(status.body.state, "awaiting_signature");
      continue;
    }
    assert.equal(submit.status, 200, `${network} submit failed`);
    const status = await request("GET", `/v1/executions/${encodeURIComponent(first.body.executionId)}/status`);
    assert.equal(status.status, 200);
    assert.equal(status.body.state, "reconciled");
    const receipt = await request("GET", `/v1/executions/${encodeURIComponent(first.body.executionId)}/receipt`);
    assert.equal(receipt.status, 200);
    assert.equal(receipt.body.network, network);
  }

  const stellarProductIntents = [
    ["blind-verification", "verification.blind.prove"],
    ["record-verification", "verification.record.create"],
    ["record-verification", "verification.record.verify"],
    ["payroll", "payroll.calculate"],
    ["payroll", "payroll.approve"],
    ["payroll", "payroll.settle"],
    ["treasury", "treasury.policy.check"],
    ["governance", "governance.proposal.execute"],
    ["auction", "auction.bid.commit"],
    ["auction", "auction.settle"],
  ];
  let stellarGatewayCapabilities = 0;
  for (const [product, capability] of stellarProductIntents) {
    const requestId = `gateway-stellar-${capability}`;
    const intentPayload = capability === "governance.proposal.execute"
      ? { proposalId: "stellar-proposal-1", proposalHash: "stellar-proposal-hash", policyHash: "stellar-policy-hash", requiredApprovals: 1 }
      : { kind: "readiness-probe", capability };
    const intentAccounts = capability === "governance.proposal.execute"
      ? [{ role: "authority", address: "stellar-authority-test", network: "stellar-testnet" }]
      : [];
    const prepared = await request("POST", "/v1/executions/prepare", {
      intent: {
        context: {
          requestId,
          idempotencyKey: requestId,
          product,
          capability,
          actorId: "gateway-stellar-test",
          network: "stellar-testnet",
          provider: "privatedao-stellar-testnet-horizon",
        },
        payload: intentPayload,
        accounts: intentAccounts,
      },
    });
    assert.equal(prepared.status, 400, `${product}/${capability} must remain unbound until application evidence exists`);
    stellarGatewayCapabilities += 1;
  }
  assert.equal(stellarGatewayCapabilities, 10);

  const governanceRequest = "gateway-zcash-governance";
  const governanceIntent = {
    context: {
      requestId: governanceRequest,
      idempotencyKey: governanceRequest,
      product: "governance",
      capability: "governance.proposal.execute",
      actorId: "gateway-test",
      network: "zcash-testnet",
    },
    payload: { proposalId: "proposal-1", proposalHash: "hash-1", policyHash: "policy-1", requiredApprovals: 1 },
    accounts: [{ role: "authority", address: "authority-1", network: "zcash-testnet" }],
  };
  const governancePrepared = await request("POST", "/v1/executions/prepare", { intent: governanceIntent });
  assert.equal(governancePrepared.status, 400, "Zcash governance must remain unbound until application evidence exists");

  const malformed = await request("POST", "/v1/executions/prepare", { intent: { context: { network: "not-enabled" } } });
  assert.equal(malformed.status, 400);
  const missing = await request("GET", "/v1/executions/missing/status");
  assert.equal(missing.status, 400);
  console.log(`KERNEL_GATEWAY_TEST: PASS stellar_product_capabilities=${stellarGatewayCapabilities}`);
} finally {
  try { process.kill(-child.pid, "SIGTERM"); } catch {}
  await new Promise((resolve) => setTimeout(resolve, 100));
}
