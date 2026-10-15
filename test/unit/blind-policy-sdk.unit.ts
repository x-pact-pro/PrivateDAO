import { assert } from "chai";

import { createBlindPolicyClient } from "../../packages/blind-policy-sdk/src/index";

describe("blind policy SDK request identity", () => {
  it("uses unique UUID-backed idempotency keys by default", async () => {
    const keys: string[] = [];
    const fetchImpl: typeof fetch = async (_input, init) => {
      keys.push(new Headers(init?.headers).get("Idempotency-Key") ?? "");
      return new Response(JSON.stringify({ ok: true, status: "accepted" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
    const client = createBlindPolicyClient({ fetchImpl });
    const request = {
      schema_version: "1" as const,
      record_type: "test",
      record_id: "record-1",
      issuer: "test-suite",
      issued_at: "2026-01-01T00:00:00.000Z",
      payload: { value: "redacted" },
    };

    await client.verifyRecord(request);
    await client.verifyRecord(request);

    assert.lengthOf(keys, 2);
    assert.match(keys[0], /^record_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.notEqual(keys[0], keys[1]);
  });
});
