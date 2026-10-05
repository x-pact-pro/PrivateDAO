import assert from "node:assert/strict";
import { Attribution } from "ox/erc8021";

const code = process.env.PDAO_BASE_BUILDER_CODE?.trim() || "bc_dxjpt7gf";
const suffix = Attribution.toDataSuffix({ codes: [code] });

assert.match(code, /^bc_[a-z0-9]+$/i);
assert.match(suffix, /^0x[0-9a-f]+$/i);
assert.equal(suffix.slice(-8).toLowerCase(), "80218021");
assert.notEqual(suffix, "0x");
console.log(JSON.stringify({ status: "pass", builderCode: code, suffixBytes: (suffix.length - 2) / 2, baseOnly: true, mainnetExecutionEnabled: false }));
