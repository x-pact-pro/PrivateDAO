import { assert } from "chai";

import { getPrivatePayoutProvider } from "../../apps/web/src/lib/providers/private-payout-registry";

describe("private payout provider", () => {
  it("uses the clearly labeled sandbox only when explicitly selected", async () => {
    const provider = await getPrivatePayoutProvider("sandbox-testnet");
    const status = await provider.getProviderStatus();

    assert.equal(status.provider, "sandbox-testnet");
    assert.equal(status.sandbox, true);
  });

  it("fails closed when the legacy Solana private-payout provider is unavailable", async () => {
    try {
      await getPrivatePayoutProvider("default");
      assert.fail("expected the disabled legacy Solana provider to fail closed");
    } catch (error) {
      assert.match(error instanceof Error ? error.message : String(error), /No active Solana private-payout provider is configured/);
    }
  });

  it("hashes intents deterministically and excludes raw recipient metadata from receipts", async () => {
    const provider = await getPrivatePayoutProvider("sandbox-testnet");
    const input = {
      daoId: "dao-1",
      proposalId: "proposal-1",
      operationType: "payroll" as const,
      asset: "USDC" as const,
      amount: "10",
      recipientAddress: "Recipient111111111111111111111111111111111",
      recipientMetadata: { legalName: "Hidden Recipient", email: "hidden@example.com" },
      privacyMode: "proof-only" as const,
      publicOutcome: "approved payroll",
    };

    const first = await provider.prepareIntent(input);
    const second = await provider.prepareIntent(input);
    assert.equal(first.intentHash, second.intentHash);

    const execution = await provider.executeTestnet(first);
    const receipt = await provider.buildReceipt(first, execution);
    const serialized = JSON.stringify(receipt);

    assert.equal(receipt.sandbox, true);
    assert.notInclude(serialized, input.recipientAddress);
    assert.notInclude(serialized, "Hidden Recipient");
    assert.notInclude(serialized, "hidden@example.com");
  });

  it("rejects unknown providers", async () => {
    try {
      await getPrivatePayoutProvider("unknown" as never);
      assert.fail("expected provider selection to fail");
    } catch (error) {
      assert.match(error instanceof Error ? error.message : String(error), /Unknown private payout provider/);
    }
  });
});
