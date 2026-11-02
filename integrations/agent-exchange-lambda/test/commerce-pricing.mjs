import assert from "node:assert/strict";
import test from "node:test";
import { buildCommercePricing, commercePricingForExistingQuote } from "../src/commerce-pricing.mjs";

test("builds one atomic total from service, verified MagicBlock fee, and PrivateDAO commission", () => {
  const quote = buildCommercePricing({
    serviceAmountBaseUnits: "150000",
    magicBlockFeeBaseUnits: "20000",
    magicBlockFeeStatus: "verified",
    magicBlockFeeSource: "provider_quote",
    privateDaoFeeBps: 250,
    privateDaoFeeFloorBaseUnits: "50000",
    requireVerifiedMagicBlockFee: true,
  });
  assert.equal(quote.service_base.base_units, "150000");
  assert.equal(quote.magicblock_fee.base_units, "20000");
  assert.equal(quote.private_dao_commission.base_units, "50000");
  assert.equal(quote.total.base_units, "220000");
  assert.equal(quote.authorization, "single_total_payment");
});

test("fails closed when an all-in quote lacks a verified MagicBlock fee", () => {
  assert.throws(
    () => buildCommercePricing({ serviceAmountBaseUnits: "150000", privateDaoFeeBps: 250, privateDaoFeeFloorBaseUnits: "50000", requireVerifiedMagicBlockFee: true }),
    (error) => error.code === "MAGICBLOCK_FEE_UNVERIFIED" && error.statusCode === 503,
  );
});

test("does not charge fees for a free service", () => {
  const quote = buildCommercePricing({ serviceAmountBaseUnits: "0", privateDaoFeeBps: 250, privateDaoFeeFloorBaseUnits: "50000" });
  assert.equal(quote.private_dao_commission.base_units, "0");
  assert.equal(quote.total.base_units, "0");
});

test("preserves the existing quote total while exposing its fee breakdown", () => {
  const quote = commercePricingForExistingQuote({
    serviceAmountBaseUnits: "500000",
    privateDaoFeeBps: 250,
    privateDaoFeeFloorBaseUnits: "50000",
    privateDaoFeeBaseUnits: "50000",
    totalBaseUnits: "550000",
  });
  assert.equal(quote.magicblock_fee.status, "not_observed");
  assert.equal(quote.total.base_units, "550000");
  assert.equal(quote.private_dao_commission.base_units, "50000");
});

test("includes processing fees in the line items and atomic total", () => {
  const quote = commercePricingForExistingQuote({
    serviceAmountBaseUnits: "2000000",
    privateDaoFeeBps: 250,
    privateDaoFeeFloorBaseUnits: "50000",
    privateDaoFeeBaseUnits: "50000",
    processingFeeBaseUnits: "20000",
    totalBaseUnits: "2070000",
  });
  assert.equal(quote.processing_fee.base_units, "20000");
  assert.equal(quote.total.base_units, "2070000");
});

test("adds marketplace commission to the buyer total without adding MagicBlock by default", () => {
  const quote = commercePricingForExistingQuote({
    serviceAmountBaseUnits: "30000",
    privateDaoFeeBaseUnits: "750",
    platformFeeBaseUnits: "3000",
    processingFeeBaseUnits: "0",
    totalBaseUnits: "33750",
  });
  assert.equal(quote.service_base.base_units, "30000");
  assert.equal(quote.platform_fee.base_units, "3000");
  assert.equal(quote.private_dao_commission.base_units, "750");
  assert.equal(quote.magicblock_fee.base_units, "0");
  assert.equal(quote.magicblock_fee.status, "not_observed");
  assert.equal(quote.total.base_units, "33750");
});
