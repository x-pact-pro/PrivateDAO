import { prepareMagicBlockPrivatePayCrank } from "../src/privatepay-magicblock-crank.mjs";

const result = await prepareMagicBlockPrivatePayCrank({
  rpcUrl: process.env.PRIVATEPAY_MAGICBLOCK_TEE_RPC || undefined,
  authToken: process.env.PRIVATEPAY_MAGICBLOCK_TEE_TOKEN || "",
  mint: process.env.PRIVATEPAY_CONFIDENTIAL_MINT || "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  validator: process.env.PRIVATEPAY_MAINNET_VALIDATOR || "MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo",
});

console.log(JSON.stringify({
  status: result.status,
  readOnly: result.readOnly,
  rpcUrl: result.rpcUrl,
  mint: result.mint,
  validator: result.validator,
  transferQueue: result.transferQueue,
  magicFeeVault: result.magicFeeVault,
  payer: result.payer,
  blockhashContextSlot: result.blockhashContextSlot,
  lastValidBlockHeight: result.lastValidBlockHeight,
  transactionBytes: Buffer.from(result.transactionBase64, "base64").length,
}, null, 2));
