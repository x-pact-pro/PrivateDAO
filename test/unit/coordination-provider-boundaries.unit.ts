import { assert } from "chai";

import { getOraclePriceProvider } from "../../apps/web/src/lib/oracle/oracle-price-provider";
import { getConfidentialVestingProvider } from "../../apps/web/src/lib/providers/confidential-vesting-provider";
import { buildTransparencyReport, getTransparencyReport } from "../../apps/web/src/lib/reports/transparency-report";
import { getTokenIntelligenceProvider } from "../../apps/web/src/lib/tokens/token-intelligence-provider";

describe("coordination provider boundaries", () => {
  it("asset context fallback works without external token keys", async () => {
    const provider = getTokenIntelligenceProvider();
    const result = await provider.analyzeAsset({ symbol: "USDC", useCase: "treasury" });

    assert.equal(result.canonicalSymbol, "USDC");
    assert.equal(result.verifiedAsset, true);
    assert.include(result.labels, "Verified asset");
  });

  it("price context fallback gives a simple treasury value", async () => {
    const provider = getOraclePriceProvider();
    const result = await provider.getPriceContext({ symbol: "USDC", amount: "2500", useCase: "treasury" });

    assert.equal(result.priceAvailable, true);
    assert.equal(result.usdValue, 2500);
    assert.equal(result.providerStatus, "sandbox");
  });

  it("confidential vesting sandbox receipt hides raw recipient data", async () => {
    const provider = getConfidentialVestingProvider();
    const receipt = await provider.prepare({
      daoId: "dao-vesting",
      proposalId: "proposal-vesting",
      recipientAddress: "RecipientShouldNotLeak1111111111111111111",
      asset: "USDC",
      amount: "1000",
      mode: "confidential-vesting",
      vestingMonths: 6,
    });

    const serialized = JSON.stringify(receipt);
    assert.equal(receipt.sandbox, true);
    assert.include(receipt.labels, "Recipient hidden during coordination");
    assert.notInclude(serialized, "RecipientShouldNotLeak");
  });

  it("builds transparency reports with private and public boundaries", () => {
    const report = buildTransparencyReport(getTransparencyReport("confidential-vesting"));

    assert.equal(report.frame, "Public accountability / Private coordination");
    assert.include(report.privateDuringCoordination, "Recipient identity");
    assert.include(report.publicAfterCompletion, "proof hash");
  });
});
