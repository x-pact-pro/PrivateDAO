import assert from "node:assert/strict";
import test from "node:test";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "../src/spl-token.mjs";

const key = (value) => new PublicKey(value);
const payer = key("11111111111111111111111111111111");
const mint = key("So11111111111111111111111111111111111111112");
const source = key("SysvarRent111111111111111111111111111111111");
const destination = key("SysvarC1ock11111111111111111111111111111111");

test("production-local SPL transfer and ATA instructions have canonical layout", () => {
  const transfer = createTransferCheckedInstruction(source, mint, destination, payer, 30000n, 6);
  assert.equal(transfer.programId.toBase58(), TOKEN_PROGRAM_ID.toBase58());
  assert.deepEqual([...transfer.data], [12, 0x30, 0x75, 0, 0, 0, 0, 0, 0, 6]);
  const ata = getAssociatedTokenAddressSync(mint, payer);
  const createAta = createAssociatedTokenAccountIdempotentInstruction(payer, ata, payer, mint);
  assert.equal(createAta.programId.toBase58(), ASSOCIATED_TOKEN_PROGRAM_ID.toBase58());
  assert.deepEqual(createAta.keys.map((item) => item.pubkey.toBase58()), [
    payer.toBase58(), ata.toBase58(), payer.toBase58(), mint.toBase58(),
    SystemProgram.programId.toBase58(), TOKEN_PROGRAM_ID.toBase58(),
  ]);
  assert.deepEqual([...createAta.data], [1]);
});
