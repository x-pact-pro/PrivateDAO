import assert from "node:assert/strict";
import { encodeFunctionData, parseAbi } from "viem";
import { ViemEvmTransport } from "../packages/privatedao-runtime/src/evm-viem-transport.ts";
import { BrowserEvmTransport } from "../packages/privatedao-runtime/src/browser-evm-transport.ts";

const signer = "0x1111111111111111111111111111111111111111";
const browserAccount = "0x2222222222222222222222222222222222222222";
const browserAbi = parseAbi(["function createProposal(bytes32,bytes32,uint64,uint64,uint256)"]);
const browserArgs = ["0x" + "05".repeat(32), "0x" + "06".repeat(32), 100, 200, 1];
const clients = {
  publicClient: {
    async getChainId() { return 84532; },
    async getTransaction() {
      return {
        chainId: 84532,
        from: browserAccount,
        to: "0x9887bcfe7daad364202d5d3102de180c389ecb20",
        input: encodeFunctionData({ abi: browserAbi, functionName: "createProposal", args: browserArgs }),
        value: 0n,
      };
    },
    async waitForTransactionReceipt() { return { status: "success", blockNumber: 42n }; },
    async estimateContractGas() { return 100000n; },
    async getGasPrice() { return 1n; },
  },
  walletClient: {
    async writeContract() { return "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; },
  },
};

const transport = new ViemEvmTransport(
  clients.publicClient,
  clients.walletClient,
  "base-sepolia",
  "84532",
  "testnet",
  "https://sepolia.basescan.org",
  "ETH",
  signer,
);

const baseIntent = (capability, payload) => ({
  context: { requestId: `test-${capability}`, idempotencyKey: `test-${capability}`, product: capability.startsWith("auction") ? "auction" : "governance", capability, actorId: "test", network: "base-sepolia" },
  payload,
  accounts: [],
});

const proposal = await transport.prepare(baseIntent("governance.proposal.execute", {
  kind: "contract-write",
  address: "0x9887bcfe7daad364202d5d3102de180c389ecb20",
    abi: browserAbi,
  functionName: "createProposal",
  args: ["0x" + "01".repeat(32), "0x" + "02".repeat(32), 100, 200, 1],
}));
assert.equal(proposal.signingMode, "server");
assert.deepEqual(proposal.requiredSigners, []);
assert.equal(proposal.unsignedPayload.account, signer);

const securedTransport = new ViemEvmTransport(
  clients.publicClient,
  clients.walletClient,
  "base-sepolia",
  "84532",
  "testnet",
  "https://sepolia.basescan.org",
  "ETH",
  signer,
  {
    requireAllowlist: true,
    allowedContracts: ["0x9887bcfe7daad364202d5d3102de180c389ecb20"],
    allowedFunctions: ["createProposal"],
  },
);
await assert.rejects(
  () => securedTransport.prepare(baseIntent("governance.proposal.execute", {
    kind: "contract-write",
    address: "0x1234567890123456789012345678901234567890",
    abi: [],
    functionName: "drain",
    args: [],
  })),
  /not allowlisted/,
);
const securedProposal = await securedTransport.prepare(baseIntent("governance.proposal.execute", {
  kind: "contract-write",
  address: "0x9887bcfe7daad364202d5d3102de180c389ecb20",
  abi: [],
  functionName: "createProposal",
  args: [],
}));
await securedTransport.submit(securedProposal, securedProposal.unsignedPayload);

const bid = await transport.prepare(baseIntent("auction.bid.commit", {
  kind: "contract-write",
  address: "0xcfb3e7af09f206614cf7a3cf8a93f92379c1c374",
  abi: ["function commitBid(bytes32,bytes32)"],
  functionName: "commitBid",
  args: ["0x" + "03".repeat(32), "0x" + "04".repeat(32)],
}));
assert.equal(bid.unsignedPayload.account, signer);

await assert.rejects(
  () => new ViemEvmTransport(clients.publicClient, clients.walletClient, "base-sepolia", "84532", "testnet", "https://sepolia.basescan.org", "ETH").prepare(baseIntent("governance.proposal.execute", { kind: "contract-write", address: "0x123", abi: [], functionName: "x", args: [] })),
  /EVM contract write requires a configured signer account/,
);

const browserTransport = new BrowserEvmTransport(clients.publicClient, "base-sepolia", "84532", "https://sepolia.basescan.org", "ETH");
const browserPreparation = await browserTransport.prepare(baseIntent("governance.proposal.execute", {
  kind: "contract-write",
  address: "0x9887bcfe7daad364202d5d3102de180c389ecb20",
  abi: browserAbi,
  functionName: "createProposal",
  args: browserArgs,
  account: browserAccount,
}));
assert.equal(browserPreparation.signingMode, "browser");
assert.equal(browserPreparation.requiredSigners[0].address, "0x2222222222222222222222222222222222222222");
const browserSubmission = await browserTransport.submit(browserPreparation, {
  kind: "browser-evm-transaction",
  hash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
});
assert.deepEqual(browserSubmission.signatures, ["0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"]);
const browserReceipt = await browserTransport.receipt(browserPreparation.executionId);
assert.equal(browserReceipt.network, "base-sepolia");
assert.equal(browserReceipt.provider, "privatedao-browser-evm");

const mismatchedClient = {
  ...clients.publicClient,
  async getTransaction() {
    const transaction = await clients.publicClient.getTransaction();
    return { ...transaction, from: signer };
  },
};
const mismatchedTransport = new BrowserEvmTransport(mismatchedClient, "base-sepolia", "84532", "https://sepolia.basescan.org", "ETH");
const mismatchedPreparation = await mismatchedTransport.prepare(baseIntent("governance.proposal.execute", {
  kind: "contract-write",
  address: "0x9887bcfe7daad364202d5d3102de180c389ecb20",
  abi: browserAbi,
  functionName: "createProposal",
  args: browserArgs,
  account: browserAccount,
}));
await mismatchedTransport.submit(mismatchedPreparation, { kind: "browser-evm-transaction", hash: "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc" });
await assert.rejects(() => mismatchedTransport.receipt(mismatchedPreparation.executionId), /signer does not match/);

console.log("EVM_GATEWAY_PRODUCT_CAPABILITIES: PASS");
