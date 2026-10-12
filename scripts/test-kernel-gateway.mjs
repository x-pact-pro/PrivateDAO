import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";

const port = 8791;
const child = spawn(process.execPath, ["--import", "tsx", "scripts/kernel-gateway.ts"], {
  cwd: process.cwd(),
    env: { ...process.env, PDAO_KERNEL_GATEWAY_PORT: String(port), PDAO_KERNEL_EVM_BROWSER_ENABLED: "0" },
  stdio: ["ignore", "pipe", "pipe"],
  detached: true,
});

const request = (method, path, body) => new Promise((resolve, reject) => {
  const req = http.request({
    host: "127.0.0.1",
    port,
    path,
    method,
    headers: { "content-type": "application/json" },
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
  const prefixedHealth = await request("GET", "/api/healthz");
  assert.equal(prefixedHealth.status, 200);
  const zcashConfigured = Boolean(process.env.PDAO_ZCASH_ZALLET_BINARY && process.env.PDAO_ZCASH_ZALLET_DATA_DIR && process.env.PDAO_ZCASH_ZALLET_CONFIG);
  const expectedNetworks = ["solana-devnet", "ethereum-sepolia", "arbitrum-sepolia", "tempo-testnet", "base-sepolia", "bnb-testnet", "robinhood-testnet", "hyperliquid-testnet", "zcash-testnet", "stellar-testnet", "hypercore-testnet"];
  assert.deepEqual(health.networks, expectedNetworks);
  assert.equal(health.networkModes.length, expectedNetworks.length);
  assert.ok(Array.isArray(health.capabilityStatus));
  const stellarCapabilityStatus = health.capabilityStatus.filter((entry) => entry.network === "stellar-testnet");
  assert.equal(stellarCapabilityStatus.length, 10);
  const stellarPreparedOnly = stellarCapabilityStatus.filter((entry) => entry.capability === "payroll.settle");
  assert.equal(stellarPreparedOnly.length, 1);
  assert.equal(stellarPreparedOnly[0].status, "testnet_ready");
  assert.equal(stellarPreparedOnly[0].evidence, "runtime-only");
  assert.equal(stellarCapabilityStatus.filter((entry) => entry.capability !== "payroll.settle").every((entry) => entry.status === "testnet_verified" && entry.evidence === "testnet-e2e" && entry.supportsExecution && entry.supportsReceipt), true);
  const hypercoreCapabilityStatus = health.capabilityStatus.filter((entry) => entry.network === "hypercore-testnet");
  assert.equal(hypercoreCapabilityStatus.length, 9);
  assert.equal(hypercoreCapabilityStatus.every((entry) => entry.status === "testnet_ready" && entry.evidence === "runtime-only"), true);
  for (const network of expectedNetworks) {
    const mode = health.networkModes.find((entry) => entry.network === network);
    assert.ok(mode, `${network} must have a Kernel network mode`);
    if (network === "zcash-testnet") {
      assert.equal(mode.provider, zcashConfigured ? "privatedao-zcash-testnet-zallet" : "privatedao-kernel-policy");
      assert.equal(mode.onchainAdapter, zcashConfigured);
      assert.equal(mode.ready, false);
    } else if (["bnb-testnet", "robinhood-testnet", "hyperliquid-testnet", "hypercore-testnet"].includes(network)) {
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
    } else {
      assert.equal(mode.provider, "kernel-native");
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
    const preparePath = network === "solana-devnet" ? "/api/v1/executions/prepare" : "/v1/executions/prepare";
    const first = await request("POST", preparePath, { intent: baseIntent(network, requestId) });
    assert.equal(first.status, 200, `${network} prepare failed`);
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
        },
        payload: intentPayload,
        accounts: intentAccounts,
      },
    });
    assert.equal(prepared.status, 200, `${product}/${capability} Stellar prepare failed`);
    assert.equal(prepared.body.state, "awaiting_signature");
    assert.equal(prepared.body.unsignedPayload.network, "stellar-testnet");
    assert.equal(prepared.body.unsignedPayload.capability, capability);
    const submit = await request("POST", "/v1/executions/submit", {
      execution: prepared.body,
      signedPayload: null,
    });
    assert.equal(submit.status, 400, `${product}/${capability} must remain signature-gated`);
    const status = await request("GET", `/v1/executions/${encodeURIComponent(prepared.body.executionId)}/status`);
    assert.equal(status.status, 200);
    assert.equal(status.body.state, "awaiting_signature");
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
  assert.equal(governancePrepared.status, 200, "Zcash governance policy prepare failed");
  const governanceSubmit = await request("POST", "/v1/executions/submit", {
    execution: governancePrepared.body,
    signedPayload: { actorId: "authority-1", decision: "approve", signature: "test-signature" },
  });
  assert.equal(governanceSubmit.status, 200, "Zcash governance policy submit failed");
  const governanceReceipt = await request("GET", `/v1/executions/${encodeURIComponent(governancePrepared.body.executionId)}/receipt`);
  assert.equal(governanceReceipt.status, 200, "Zcash governance policy receipt failed");
  assert.equal(governanceReceipt.body.network, "zcash-testnet");
  assert.equal(governanceReceipt.body.result.onchainSettlement, false);

  const malformed = await request("POST", "/v1/executions/prepare", { intent: { context: { network: "not-enabled" } } });
  assert.equal(malformed.status, 400);
  const missing = await request("GET", "/v1/executions/missing/status");
  assert.equal(missing.status, 400);
  console.log(`KERNEL_GATEWAY_TEST: PASS stellar_product_capabilities=${stellarGatewayCapabilities}`);
} finally {
  try { process.kill(-child.pid, "SIGTERM"); } catch {}
  await new Promise((resolve) => setTimeout(resolve, 100));
}
