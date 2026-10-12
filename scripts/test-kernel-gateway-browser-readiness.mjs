import assert from "node:assert/strict";
import http from "node:http";

process.env.PDAO_KERNEL_EVM_BROWSER_ENABLED = "1";
process.env.PDAO_KERNEL_EVM_NETWORKS = "arbitrum-sepolia,robinhood-testnet,hyperliquid-testnet";
process.env.PDAO_HYPERCORE_API_ENABLED = "1";
process.env.PDAO_HYPERCORE_API_URL = "https://api.hyperliquid-testnet.xyz/info";

const { KernelGatewayService } = await import("./kernel-gateway-service.ts");
const service = new KernelGatewayService();
const server = http.createServer((request, response) => void service.handle(request, response));

function request(port, method, path, payload) {
  return new Promise((resolve, reject) => {
    const body = payload === undefined ? "" : JSON.stringify(payload);
    const request = http.request({
      host: "127.0.0.1",
      port,
      path,
      method,
      headers: body ? { "content-type": "application/json", "content-length": Buffer.byteLength(body) } : {},
    }, (response) => {
      let body = "";
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => {
        try { resolve({ status: response.statusCode, body: JSON.parse(body) }); } catch (error) { reject(error); }
      });
    });
    request.on("error", reject);
    if (body) request.write(body);
    request.end();
  });
}

try {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const result = await request(port, "GET", "/healthz");
  assert.equal(result.status, 200);
  for (const network of ["arbitrum-sepolia", "robinhood-testnet", "hyperliquid-testnet"]) {
    const mode = result.body.networkModes.find((entry) => entry.network === network);
    assert(mode, `${network} health mode is missing`);
    assert.equal(mode.onchainAdapter, true, `${network} browser adapter is not attached to Kernel`);
    assert.equal(mode.ready, true, `${network} RPC-backed adapter is not healthy`);
    assert.match(mode.provider, /-browser$/);
  }
  assert.equal(result.body.evm.broadcastEnabled, false);
  assert.equal(result.body.hypercore.nativeReadAdapter, "privatedao-hyperliquid-core-testnet");
  assert.equal(result.body.hypercore.ready, true);
  assert.equal(result.body.hypercore.executionEnabled, false);
  for (const network of ["arbitrum-sepolia", "robinhood-testnet", "hyperliquid-testnet", "hypercore-testnet"]) {
    const policy = await request(port, "POST", "/v1/executions/prepare", {
      intent: {
        context: {
          requestId: `browser-policy-${network}`,
          idempotencyKey: `browser-policy-${network}`,
          product: "governance",
          capability: "governance.proposal.execute",
          actorId: "browser-readiness-test",
          network,
        },
        payload: { proposalId: "proposal-1", proposalHash: "hash-1", policyHash: "policy-1", requiredApprovals: 1 },
        accounts: [{ role: "authority", address: "authority-1", network }],
      },
    });
    assert.equal(policy.status, 200, `${network} must use the Kernel policy path until product contracts exist`);
    assert.equal(policy.body.requiredSigners?.[0]?.address, "authority-1");
  }
  const robinhoodContractWrite = await request(port, "POST", "/v1/executions/prepare", {
    intent: {
      context: {
        requestId: "robinhood-contract-write-routing",
        idempotencyKey: "robinhood-contract-write-routing",
        product: "governance",
        capability: "governance.proposal.execute",
        actorId: "browser-readiness-test",
        network: "robinhood-testnet",
      },
      payload: {
        kind: "contract-write",
        address: "0x1111111111111111111111111111111111111111",
        abi: [],
        functionName: "execute",
        args: [],
        account: "0x2222222222222222222222222222222222222222",
      },
      accounts: [{ role: "payer", address: "0x2222222222222222222222222222222222222222", network: "robinhood-testnet" }],
    },
  });
  assert.equal(robinhoodContractWrite.status, 200, "Robinhood contract writes must route through the EVM adapter");
  assert.equal(robinhoodContractWrite.body.signingMode, "browser");
  assert.equal(robinhoodContractWrite.body.requiredSigners?.[0]?.address, "0x2222222222222222222222222222222222222222");
  console.log("KERNEL_GATEWAY_BROWSER_READINESS: PASS");
} finally {
  await new Promise((resolve) => server.close(resolve));
}
