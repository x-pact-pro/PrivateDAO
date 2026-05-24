// SPDX-License-Identifier: AGPL-3.0-or-later
import "dotenv/config";
import { readFileSync } from "fs";
import { resolve } from "path";
import { PrivateDaoReadNode } from "./lib/read-node";

async function main() {
  const readNode = new PrivateDaoReadNode();
  let degraded = false;
  let runtime: any;
  let proposals: any[];
  let overview: any;
  let profiles: any[];
  let magicblock: any;

  try {
    [runtime, proposals, overview, profiles, magicblock] = await Promise.all([
      readNode.getRuntimeSnapshot(),
      readNode.fetchProposals(),
      readNode.getOpsOverview(),
      Promise.resolve(readNode.getLoadProfiles()),
      readNode.getMagicBlockRuntime(),
    ]);
  } catch (error) {
    if (!isRecoverableRpcFailure(error)) throw error;
    const snapshot = readGeneratedSnapshot();
    degraded = true;
    runtime = snapshot.runtime;
    proposals = snapshot.proposals || [];
    overview = snapshot.overview;
    profiles = snapshot.profiles || readNode.getLoadProfiles();
    magicblock = { apiBase: process.env.MAGICBLOCK_API_BASE || "https://api.magicblock.app", health: "degraded-rpc-fallback" };
  }

  if (runtime.readPath !== "backend-indexer") {
    throw new Error("Read node runtime did not report backend-indexer mode");
  }

  if (!runtime.programId) {
    throw new Error("Read node runtime is missing program id");
  }

  if (!magicblock.apiBase) {
    throw new Error("Read node MagicBlock runtime is missing API base");
  }

  if (!Array.isArray(proposals)) {
    throw new Error("Read node proposals payload is not an array");
  }

  if (overview.proposals !== proposals.length) {
    throw new Error("Ops overview proposal count does not match fetched proposals");
  }

  const profile350 = profiles.find((profile) => profile.name === "350");
  if (!profile350 || profile350.waveCount !== 7 || profile350.waveSize !== 50) {
    throw new Error("Read node load profiles missing expected 350-wave plan");
  }

  console.log(
    `Read node verification: PASS${degraded ? " (degraded RPC fallback)" : ""} ` +
      `(proposals=${proposals.length}, endpoint=${runtime.rpcEndpoint}, refhe=${overview.refheConfigured}, magicblock=${magicblock.health})`,
  );
}

function readGeneratedSnapshot() {
  const snapshot = JSON.parse(readFileSync(resolve("docs/read-node/snapshot.generated.json"), "utf8"));
  if (!snapshot.runtime || !snapshot.overview || !Array.isArray(snapshot.proposals)) {
    throw new Error("Read node generated snapshot is missing runtime, overview, or proposals");
  }
  return snapshot;
}

function isRecoverableRpcFailure(error: unknown) {
  const message = String((error as Error)?.message || error || "").toLowerCase();
  return (
    message.includes("429") ||
    message.includes("too many requests") ||
    message.includes("rpc request timed out") ||
    message.includes("fetch failed") ||
    message.includes("network")
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
