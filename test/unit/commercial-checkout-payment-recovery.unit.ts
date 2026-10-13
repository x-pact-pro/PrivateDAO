import { assert } from "chai";
import { Keypair, Transaction, type Connection, type SignatureStatus } from "@solana/web3.js";

import {
  POST_SEND_BLOCKHASH_FALLBACK_MARGIN,
  sendBrowserPayment,
  waitForPaymentOutcome,
} from "../../apps/web/src/lib/network-adapters/solana-browser";
import {
  isTransactionSignature,
  paymentOutcome,
  type SentPayment,
} from "../../apps/web/src/lib/network-adapters/solana-payment-recovery";

type Status = Pick<SignatureStatus, "err" | "confirmationStatus"> | null;

const pending: SentPayment = {
  signature: "4kTpPngL1xnz26fEHoYnKVrR6qJBsHvET6MhFrNhsimfeW8XqpguM6Rhg7GPMyTNLor2sX7Vk2tXzkfmEMmYoi16",
  lastValidBlockHeight: 1_000,
};

function status(confirmationStatus: SignatureStatus["confirmationStatus"], err: SignatureStatus["err"] = null): Status {
  return { confirmationStatus, err };
}

/** A connection whose block height and signature status follow a script, one entry per poll. */
function scriptedConnection(polls: Array<{ blockHeight: number; status: Status } | Error>) {
  let index = 0;
  let current: { blockHeight: number; status: Status } | Error = polls[0];
  const calls = { blockHeight: 0, statuses: 0, searchTransactionHistory: [] as unknown[] };
  const connection = {
    async getBlockHeight() {
      current = polls[Math.min(index, polls.length - 1)];
      index += 1;
      calls.blockHeight += 1;
      if (current instanceof Error) throw current;
      return current.blockHeight;
    },
    async getSignatureStatuses(_signatures: string[], options?: { searchTransactionHistory?: boolean }) {
      calls.statuses += 1;
      calls.searchTransactionHistory.push(options?.searchTransactionHistory);
      if (current instanceof Error) throw current;
      return { context: { slot: 1 }, value: [current.status] };
    },
  };
  return { connection: connection as unknown as Connection, calls };
}

describe("commercial checkout payment recovery", () => {
  describe("paymentOutcome", () => {
    it("treats a finalized transaction as landed", () => {
      assert.equal(paymentOutcome(status("finalized"), 900, 1_000), "landed");
    });

    it("keeps waiting while the transaction is processed or confirmed, because the order API requires finality", () => {
      assert.equal(paymentOutcome(status("processed"), 900, 1_000), "pending");
      assert.equal(paymentOutcome(status("confirmed"), 900, 1_000), "pending");
    });

    it("reports a transaction that failed on-chain", () => {
      assert.equal(paymentOutcome(status("confirmed", { InstructionError: [0, "Custom"] }), 900, 1_000), "failed");
      assert.equal(paymentOutcome(status("finalized", { InstructionError: [0, "Custom"] }), 900, 1_000), "failed");
    });

    it("keeps waiting for an unseen transaction until the chain passes its last valid block height", () => {
      assert.equal(paymentOutcome(null, 900, 1_000), "pending");
      assert.equal(paymentOutcome(null, 1_000, 1_000), "pending");
      assert.equal(paymentOutcome(null, 1_001, 1_000), "dropped");
    });

    it("never reports a transaction that has a status as dropped", () => {
      assert.equal(paymentOutcome(status("confirmed"), 1_500, 1_000), "pending");
      assert.equal(paymentOutcome(status("finalized"), 1_500, 1_000), "landed");
    });
  });

  describe("isTransactionSignature", () => {
    it("accepts a base58 transaction signature", () => {
      assert.isTrue(isTransactionSignature(pending.signature));
      assert.isTrue(isTransactionSignature("1".repeat(64)));
    });

    it("rejects values restored from storage that cannot be a signature", () => {
      for (const value of [undefined, null, 42, "", "not a signature", "0OIl".repeat(22), pending.signature.slice(0, 40), `${pending.signature}/../x`, "1".repeat(89)]) {
        assert.isFalse(isTransactionSignature(value), String(value));
      }
    });
  });

  describe("waitForPaymentOutcome", () => {
    it("polls until the transaction is finalized", async () => {
      const { connection, calls } = scriptedConnection([
        { blockHeight: 900, status: null },
        { blockHeight: 901, status: status("confirmed") },
        { blockHeight: 935, status: status("finalized") },
      ]);
      assert.equal(await waitForPaymentOutcome(connection, pending, { pollMs: 1 }), "landed");
      assert.equal(calls.statuses, 3);
      assert.deepEqual(calls.searchTransactionHistory, [true, true, true]);
    });

    it("reports a dropped transaction once the chain passes its last valid block height", async () => {
      const { connection } = scriptedConnection([
        { blockHeight: 999, status: null },
        { blockHeight: 1_001, status: null },
      ]);
      assert.equal(await waitForPaymentOutcome(connection, pending, { pollMs: 1 }), "dropped");
    });

    it("reports a transaction that failed on-chain", async () => {
      const { connection } = scriptedConnection([{ blockHeight: 900, status: status("confirmed", { InstructionError: [1, "Custom"] }) }]);
      assert.equal(await waitForPaymentOutcome(connection, pending, { pollMs: 1 }), "failed");
    });

    it("keeps polling when an RPC request fails", async () => {
      const { connection } = scriptedConnection([
        new Error("429 Too Many Requests"),
        { blockHeight: 1_200, status: status("finalized") },
      ]);
      assert.equal(await waitForPaymentOutcome(connection, pending, { pollMs: 1 }), "landed");
    });

    it("never reports a payment as dropped when every RPC request fails", async () => {
      const { connection } = scriptedConnection([new Error("fetch failed")]);
      assert.equal(await waitForPaymentOutcome(connection, pending, { pollMs: 1, timeoutMs: 20 }), "pending");
    });

    it("returns pending when the outcome is still unknown at the timeout", async () => {
      const { connection } = scriptedConnection([{ blockHeight: 900, status: status("confirmed") }]);
      assert.equal(await waitForPaymentOutcome(connection, pending, { pollMs: 1, timeoutMs: 20 }), "pending");
    });

    it("stops polling when the signal is aborted", async () => {
      const { connection, calls } = scriptedConnection([{ blockHeight: 900, status: null }]);
      const controller = new AbortController();
      const waiting = waitForPaymentOutcome(connection, pending, { pollMs: 5, signal: controller.signal });
      controller.abort();
      let rejected = false;
      try {
        await waiting;
      } catch {
        rejected = true;
      }
      assert.isTrue(rejected);
      const pollsAtAbort = calls.statuses;
      await new Promise((resolve) => setTimeout(resolve, 20));
      assert.equal(calls.statuses, pollsAtAbort);
    });

    it("does not report an outcome that arrives after the signal was aborted", async () => {
      const { connection } = scriptedConnection([{ blockHeight: 900, status: status("finalized") }]);
      const controller = new AbortController();
      const waiting = waitForPaymentOutcome(connection, pending, { pollMs: 1, signal: controller.signal });
      controller.abort();
      let outcome: string | undefined;
      try {
        outcome = await waiting;
      } catch {
        outcome = undefined;
      }
      assert.isUndefined(outcome);
    });
  });

  describe("sendBrowserPayment", () => {
    function paymentConnection(postSendBlockhash: { blockhash: string; lastValidBlockHeight: number } | Error) {
      const events: string[] = [];
      const connection = {
        async getLatestBlockhash(commitment?: string) {
          events.push(`blockhash:${commitment}`);
          if (events.filter((event) => event.startsWith("blockhash")).length === 1) {
            return { blockhash: "11111111111111111111111111111111", lastValidBlockHeight: 1_000 };
          }
          if (postSendBlockhash instanceof Error) throw postSendBlockhash;
          return postSendBlockhash;
        },
      };
      return { connection: connection as unknown as Connection, events };
    }

    it("sets the blockhash and fee payer before the wallet signs and returns the signature with an expiry bound read after sending", async () => {
      const { connection, events } = paymentConnection({ blockhash: "newer", lastValidBlockHeight: 1_090 });
      const payer = Keypair.generate().publicKey;
      const transaction = new Transaction();
      const submitted = await sendBrowserPayment(connection, transaction, payer, async (sent) => {
        events.push("wallet");
        assert.equal(sent.recentBlockhash, "11111111111111111111111111111111");
        assert.isTrue(sent.feePayer?.equals(payer));
        return "5ignature";
      });
      assert.deepEqual(events, ["blockhash:confirmed", "wallet", "blockhash:processed"]);
      assert.deepEqual(submitted, { signature: "5ignature", lastValidBlockHeight: 1_090 });
    });

    it("never returns an expiry bound lower than the blockhash it signed with", async () => {
      const { connection } = paymentConnection({ blockhash: "lagging", lastValidBlockHeight: 990 });
      const submitted = await sendBrowserPayment(connection, new Transaction(), Keypair.generate().publicKey, async () => "5ignature");
      assert.equal(submitted.lastValidBlockHeight, 1_000);
    });

    it("still returns the signature when the expiry bound cannot be read after sending", async () => {
      const { connection } = paymentConnection(new Error("fetch failed"));
      const submitted = await sendBrowserPayment(connection, new Transaction(), Keypair.generate().publicKey, async () => "5ignature");
      assert.deepEqual(submitted, { signature: "5ignature", lastValidBlockHeight: 1_000 + POST_SEND_BLOCKHASH_FALLBACK_MARGIN });
    });

    it("passes a wallet rejection through", async () => {
      const { connection, events } = paymentConnection({ blockhash: "newer", lastValidBlockHeight: 1_090 });
      let message = "";
      try {
        await sendBrowserPayment(connection, new Transaction(), Keypair.generate().publicKey, async () => {
          throw new Error("User rejected the request.");
        });
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }
      assert.equal(message, "User rejected the request.");
      assert.deepEqual(events, ["blockhash:confirmed"]);
    });
  });
});
