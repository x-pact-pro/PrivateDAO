import test from "node:test";
import assert from "node:assert/strict";
import { deriveTransferQueue } from "@magicblock-labs/ephemeral-rollups-sdk";
import { PublicKey } from "@solana/web3.js";
import { derivePrivatePayQueuePda } from "../src/privatepay-mainnet.mjs";

test("PrivatePAY queue derivation matches the official MagicBlock SDK", () => {
  const mint = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  const validator = new PublicKey("MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo");
  const [officialQueue] = deriveTransferQueue(mint, validator);
  assert.equal(derivePrivatePayQueuePda(mint, validator), officialQueue.toBase58());
});
