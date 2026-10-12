import assert from "node:assert/strict";
import { StellarHorizonTransport } from "../packages/privatedao-runtime/src/index.ts";

const hangingFetch = (_input, init) => new Promise((_resolve, reject) => {
  init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
});

const transport = new StellarHorizonTransport(hangingFetch, "https://horizon-testnet.stellar.org", false, 250);
const health = await transport.health();

assert.equal(health.ok, false);
assert.match(health.reason || "", /timed out after 250ms/i);
console.log("STELLAR_TIMEOUT: PASS bounded_request=250ms");
