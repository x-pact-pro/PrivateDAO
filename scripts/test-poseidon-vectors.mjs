#!/usr/bin/env node
import assert from "node:assert/strict";
import { Poseidon } from "@iden3/js-crypto";

const vectors = [
  {
    inputs: [0n],
    expected: "19014214495641488759237505126948346942972912379615652741039992445865937985820",
  },
  {
    inputs: [1n],
    expected: "18586133768512220936620570745912940619677854269274689475585506675881198879027",
  },
  {
    inputs: [1n, 2n],
    expected: "7853200120776062878684798364095072458815029376092732009249414926327459813530",
  },
  {
    inputs: [11n, 22n, 100n, 100n, 100n, 1n, 80n, 888n],
    expected: "5407410153584307640454041504439160525541602322783356890786093354964441658668",
  },
  {
    inputs: [123456789n, 987654321n, 42n, 7n],
    expected: "3711414781370734064223168029261236478683584498287960762629335023030382665374",
  },
];

for (const { inputs, expected } of vectors) {
  assert.equal(Poseidon.hash(inputs).toString(), expected, `Poseidon vector mismatch: ${inputs.join(",")}`);
}

console.log(`Poseidon compatibility vectors: PASS (${vectors.length})`);
