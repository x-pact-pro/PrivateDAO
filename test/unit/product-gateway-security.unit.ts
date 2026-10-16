import assert from "node:assert/strict";
import { describe, it } from "mocha";
import { createPrivateDaoRuntime } from "../../packages/privatedao-runtime/src/runtime.js";
import { InMemoryProtocolRegistry } from "../../packages/privatedao-runtime/src/protocol.js";
import { ProductExecutionGateway } from "../../packages/privatedao-runtime/src/product-gateway.js";
import type { ExecutionIntent } from "../../packages/privatedao-runtime/src/index.js";

function intent(network = "solana-devnet" as const): ExecutionIntent {
  return {
    context: {
      requestId: "gateway-security-request",
      idempotencyKey: "gateway-security-idempotency",
      product: "record-verification",
      capability: "verification.record.create",
      organizationId: "org-security-test",
      actorId: "actor-security-test",
      network,
    },
    payload: {
      schemaVersion: "1",
      recordType: "security-test",
      recordId: "record-security-test",
      issuer: "PrivateDAO",
      issuedAt: "2026-10-15T00:00:00.000Z",
      payload: { classification: "public" },
      publicFieldPaths: ["classification"],
    },
    accounts: [],
  };
}

describe("ProductExecutionGateway security boundary", () => {
  it("rejects a capability on a network outside its protocol declaration", async () => {
    const runtime = createPrivateDaoRuntime();
    const protocols = new InMemoryProtocolRegistry();
    protocols.register({
      capability: {
        id: "verification.record.create",
        version: "1.0",
        product: "record-verification",
        networks: ["solana-mainnet-beta"],
        requiresSignature: false,
        supportsAsync: true,
        receiptSchema: "privatedao.execution-receipt.v1",
      },
      product: "record-verification",
      action: "verification.record.create",
      policy: { roles: ["maker"], permissions: ["execution.prepare"] },
    });
    const gateway = new ProductExecutionGateway(runtime.kernel, protocols);
    await assert.rejects(
      async () => gateway.prepare(intent(), "maker"),
      (error: unknown) => (error as { code?: string })?.code === "UNSUPPORTED_NETWORK",
    );
  });

  it("rejects status when a caller swaps the recorded execution context", async () => {
    const runtime = createPrivateDaoRuntime();
    const prepared = await runtime.gateway.prepare(intent(), "maker");
    const tampered = {
      ...prepared,
      intent: {
        ...prepared.intent,
        context: { ...prepared.intent.context, organizationId: "different-org" },
      },
    };
    await assert.rejects(
      async () => runtime.gateway.status(tampered, "auditor"),
      (error: unknown) => (error as { code?: string })?.code === "INVALID_INTENT",
    );
  });
});
