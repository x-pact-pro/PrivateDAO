import assert from "node:assert/strict";
import fs from "node:fs";

const rootPackage = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const rootLock = JSON.parse(fs.readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
const webLock = JSON.parse(fs.readFileSync(new URL("../apps/web/package-lock.json", import.meta.url), "utf8"));

const rootPackages = rootLock.packages ?? {};
const webPackages = webLock.packages ?? {};

const poseidonProviders = new Set(["@iden3/js-crypto", "@noble/hashes", "poseidon-lite", "snarkjs"]);

assert.equal(rootPackage.dependencies["@iden3/js-crypto"], "1.3.3", "Poseidon provider must remain pinned");
assert.equal(rootPackage.dependencies["@noble/hashes"], "2.2.0", "Poseidon hash peer must remain pinned");
assert.equal(rootPackages["node_modules/@iden3/js-crypto"]?.version, "1.3.3", "lockfile Poseidon provider drifted");
assert.equal(rootPackages["node_modules/@noble/hashes"]?.version, "2.2.0", "lockfile hash peer drifted");

for (const packageName of ["circomlibjs", "ethers", "elliptic"]) {
  assert.equal(rootPackages[`node_modules/${packageName}`], undefined, `${packageName} must not return to the root graph`);
}

for (const packageName of ["circomlibjs", "ethers"]) {
  assert.equal(webPackages[`node_modules/${packageName}`], undefined, `${packageName} must not return to the web graph`);
}

assert.equal(
  webPackages["node_modules/@magicblock-labs/ephemeral-rollups-sdk"]?.version,
  "0.17.3",
  "MagicBlock web integration changed; re-audit TEE dependencies before upgrading",
);
assert.equal(
  webPackages["node_modules/@phala/dcap-qvl"]?.version,
  "0.3.9",
  "Phala TEE dependency changed; rerun attestation and web audit before accepting the upgrade",
);
assert.equal(
  webPackages["node_modules/elliptic"]?.version,
  "6.6.1",
  "The remaining web elliptic boundary changed; rerun the TEE audit before accepting the upgrade",
);
assert.equal(
  webPackages["node_modules/@phala/dcap-qvl"]?.dependencies?.elliptic,
  "^6.6.1",
  "Web elliptic must remain attributable to the Phala TEE dependency",
);

// elliptic is an accepted, isolated TEE residual. It must never become part of
// the Poseidon/Groth16 dependency boundary without a reviewed vector migration.
for (const packageName of poseidonProviders) {
  const packageRecord = rootPackages[`node_modules/${packageName}`] ?? webPackages[`node_modules/${packageName}`];
  assert.ok(packageRecord, `${packageName} must remain present in its declared cryptographic graph`);
  const dependencies = Object.keys(packageRecord.dependencies ?? {});
  assert.equal(dependencies.includes("elliptic"), false, `${packageName} must not depend on elliptic`);
}

assert.equal(
  webPackages["node_modules/@magicblock-labs/ephemeral-rollups-sdk"]?.dependencies?.["@phala/dcap-qvl"],
  "^0.3.9",
  "The TEE residual must remain attributable to MagicBlock -> Phala",
);

console.log("ZK dependency boundary: PASS");
console.log("Root Poseidon graph: @iden3/js-crypto 1.3.3 + @noble/hashes 2.2.0");
console.log("Web elliptic boundary: MagicBlock 0.17.3 -> Phala DCAP QVL 0.3.9 (isolated TEE residual; excluded from ZK)");
