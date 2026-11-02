const USDC_DECIMALS = 6;

function parseBaseUnits(value, name) {
  const text = String(value ?? "0").trim();
  if (!/^\d+$/.test(text)) throw new TypeError(`${name} must be a non-negative integer string`);
  return BigInt(text);
}

function parseBps(value, name) {
  const number = Number(value ?? 0);
  if (!Number.isInteger(number) || number < 0 || number > 10000) {
    throw new TypeError(`${name} must be an integer between 0 and 10000`);
  }
  return BigInt(number);
}

function amount(baseUnits) {
  const value = parseBaseUnits(baseUnits, "amountBaseUnits");
  return { base_units: value.toString(), usdc: Number(value) / 10 ** USDC_DECIMALS };
}

/**
 * Build the single-authorization commerce price used by Agent Exchange,
 * PrivatePAY, and PDAO Wallet. Fee values are always represented in atomic
 * USDC units so the displayed total and the x402 amount cannot diverge.
 */
export function buildCommercePricing({
  serviceAmountBaseUnits,
  privateDaoFeeBps = 0,
  privateDaoFeeFloorBaseUnits = 0,
  magicBlockFeeBaseUnits = null,
  magicBlockFeeStatus = "not_observed",
  magicBlockFeeSource = null,
  platformFeeBaseUnits = 0,
  processingFeeBaseUnits = 0,
  requireVerifiedMagicBlockFee = false,
}) {
  const service = parseBaseUnits(serviceAmountBaseUnits, "serviceAmountBaseUnits");
  const privateDaoBps = parseBps(privateDaoFeeBps, "privateDaoFeeBps");
  const floor = parseBaseUnits(privateDaoFeeFloorBaseUnits, "privateDaoFeeFloorBaseUnits");
  const platform = parseBaseUnits(platformFeeBaseUnits, "platformFeeBaseUnits");
  const processing = parseBaseUnits(processingFeeBaseUnits, "processingFeeBaseUnits");
  const status = String(magicBlockFeeStatus || "not_observed");
  const verified = status === "verified";

  if (requireVerifiedMagicBlockFee && !verified) {
    const error = new Error("MagicBlock fee is not verified for this quote");
    error.code = "MAGICBLOCK_FEE_UNVERIFIED";
    error.statusCode = 503;
    throw error;
  }
  if (verified && magicBlockFeeBaseUnits == null) {
    const error = new Error("A verified MagicBlock fee must include atomic USDC units");
    error.code = "MAGICBLOCK_FEE_MISSING";
    error.statusCode = 502;
    throw error;
  }

  const magicBlock = parseBaseUnits(magicBlockFeeBaseUnits ?? "0", "magicBlockFeeBaseUnits");
  const calculatedPrivateDao = (service * privateDaoBps + 9999n) / 10000n;
  const privateDao = service === 0n ? 0n : calculatedPrivateDao > floor ? calculatedPrivateDao : floor;
  const total = service + magicBlock + privateDao + platform + processing;
  return {
    version: "universal-x402-commerce-v1",
    currency: "USDC",
    decimals: USDC_DECIMALS,
    authorization: "single_total_payment",
    service_base: amount(service),
    magicblock_fee: { ...amount(magicBlock), status, source: magicBlockFeeSource },
    private_dao_commission: amount(privateDao),
    platform_fee: amount(platform),
    processing_fee: amount(processing),
    total: amount(total),
    fee_policy: {
      private_dao_fee_bps: Number(privateDaoBps),
      private_dao_fee_floor_base_units: floor.toString(),
      magicblock_fee_required_for_all_in_quote: Boolean(requireVerifiedMagicBlockFee),
    },
  };
}

export function commercePricingForExistingQuote({
  serviceAmountBaseUnits,
  privateDaoFeeBps = 0,
  privateDaoFeeFloorBaseUnits = 0,
  privateDaoFeeBaseUnits,
  processingFeeBaseUnits = 0,
  totalBaseUnits,
}) {
  const pricing = buildCommercePricing({
    serviceAmountBaseUnits,
    privateDaoFeeBps,
    privateDaoFeeFloorBaseUnits,
    processingFeeBaseUnits,
  });
  if (privateDaoFeeBaseUnits != null) pricing.private_dao_commission = amount(privateDaoFeeBaseUnits);
  if (totalBaseUnits != null) pricing.total = amount(totalBaseUnits);
  return pricing;
}
