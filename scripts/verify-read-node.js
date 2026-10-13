"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// SPDX-License-Identifier: AGPL-3.0-or-later
const read_node_1 = require("./lib/read-node");
async function main() {
    const readNode = new read_node_1.PrivateDaoReadNode();
    const [runtime, proposals, overview, profiles, magicblock] = await Promise.all([
        readNode.getRuntimeSnapshot(),
        readNode.fetchProposals(),
        readNode.getOpsOverview(),
        Promise.resolve(readNode.getLoadProfiles()),
        readNode.getMagicBlockRuntime(),
    ]);
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
    console.log(`Read node verification: PASS (proposals=${proposals.length}, endpoint=${redactEndpoint(runtime.rpcEndpoint)}, refhe=${overview.refheConfigured}, magicblock=${magicblock.health})`);
}
function redactEndpoint(value) {
    try {
        const parsed = new URL(String(value));
        return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    }
    catch {
        return "<invalid-endpoint>";
    }
}
main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
