import assert from "node:assert/strict";
import test from "node:test";
import nacl from "tweetnacl";
import { Keypair } from "@solana/web3.js";
import { MemoryStore } from "../src/storage.mjs";
import { createPdaoChallengeMessage, issuePdaoChallenge, verifyPdaoHolderAccess } from "../src/pdao-entitlement.mjs";

const config = {
  domain: "agents.privatedao.org",
  pdaoMint: "9isGuumtaqvJeJeyLF44fvfskk2cv5mYsopexMBfpump",
  marketDataUrl: "https://market.invalid",
  cluster: "mainnet-beta",
  mainnetGenesisHash: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d",
  treasury: "2BJ4ezxqV9YJXc38D9duKBkdn4su4jE1beKUHwH663sL",
  usdcMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  rpcPrimary: "https://rpc.invalid",
  rpcSecondary: "",
  rpcFallback: "",
};

test("PDAO holder access verifies the exact signed challenge, balance and one-time nonce", async () => {
  const previousFetch = global.fetch;
  const wallet = Keypair.generate();
  const input = { network: "solana-mainnet-beta", wallet: "11111111111111111111111111111111" };
  global.fetch = async (url, options = {}) => {
    if (url === config.marketDataUrl + "/tokens/" + config.pdaoMint) {
      return new Response(JSON.stringify({ pairs: [{ chainId: "solana", pairAddress: "pair", baseToken: { address: config.pdaoMint }, quoteToken: { address: config.usdcMint }, priceUsd: "0.00002721", liquidity: { usd: 14000 } }] }), { status: 200 });
    }
    const body = JSON.parse(options.body || "{}");
    if (body.method === "getGenesisHash") return new Response(JSON.stringify({ result: config.mainnetGenesisHash }), { status: 200 });
    if (body.method === "getTokenAccountsByOwner") return new Response(JSON.stringify({ result: { value: [{ account: { data: { parsed: { info: { mint: config.pdaoMint, tokenAmount: { amount: "1000000000000000", decimals: 9 } } } } } }] } }), { status: 200 });
    throw new Error(`unexpected fetch ${url} ${body.method || ""}`);
  };
  try {
    const storage = new MemoryStore();
    const challenge = await issuePdaoChallenge({ config, storage, wallet: wallet.publicKey.toBase58(), serviceId: "wallet.intelligence", input });
    const signature = nacl.sign.detached(new TextEncoder().encode(challenge.message), wallet.secretKey);
    const access = { wallet: challenge.wallet, message: challenge.message, nonce: challenge.nonce, signature: Buffer.from(signature).toString("base64") };
    const verified = await verifyPdaoHolderAccess({ config, storage, access, serviceId: "wallet.intelligence", input });
    assert.equal(verified.type, "pdao_holder_monthly");
    assert.equal(verified.token_mint, config.pdaoMint);
    assert.equal(verified.threshold_usd, 25);
    assert.equal(verified.balance_tokens, 1000000);
    assert.ok(Math.abs(verified.value_usd - 27.21) < 0.000001);
    await assert.rejects(() => verifyPdaoHolderAccess({ config, storage, access, serviceId: "wallet.intelligence", input }), /already used/);
  } finally {
    global.fetch = previousFetch;
  }
});

test("holder challenge message binds service and input hash", () => {
  const message = createPdaoChallengeMessage({ domain: "agents.privatedao.org", wallet: "11111111111111111111111111111111", serviceId: "wallet.intelligence", inputHash: "hash", nonce: "nonce", expiresAt: "2026-10-11T00:00:00.000Z" });
  assert.match(message, /purpose: pdao-token-holder-monthly-access/);
  assert.match(message, /service_id: wallet\.intelligence/);
  assert.match(message, /input_hash: hash/);
});
