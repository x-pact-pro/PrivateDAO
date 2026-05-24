// SPDX-License-Identifier: AGPL-3.0-or-later
import fs from "fs";
import path from "path";

function main() {
  const json = JSON.parse(fs.readFileSync(path.resolve("docs/read-node/snapshot.generated.json"), "utf8"));
  const markdown = fs.readFileSync(path.resolve("docs/read-node/snapshot.generated.md"), "utf8");
  const frontendModule = fs.readFileSync(path.resolve("apps/web/src/lib/read-node-proposal-context.generated.ts"), "utf8");

  if (json.readPath !== "backend-indexer") {
    throw new Error("read-node snapshot path mismatch");
  }

  if (!json.runtime?.programId) {
    throw new Error("read-node snapshot missing runtime program id");
  }

  if (typeof json.counts?.proposals !== "number") {
    throw new Error("read-node snapshot missing proposal counts");
  }

  if (typeof json.overview?.refheConfigured !== "number") {
    throw new Error("read-node snapshot missing REFHE overview");
  }

  if (!json.featuredProposalContexts?.payroll?.proposalAccount) {
    throw new Error("read-node snapshot missing featured payroll proposal context");
  }

  if (!json.featuredProposalContexts?.gaming?.proposalAccount) {
    throw new Error("read-node snapshot missing featured gaming proposal context");
  }

  if (!json.featuredProposalContexts?.grant?.proposalAccount) {
    throw new Error("read-node snapshot missing featured grant proposal context");
  }

  if (!Array.isArray(json.featuredProposalRegistry) || json.featuredProposalRegistry.length < 3) {
    throw new Error("read-node snapshot missing featured proposal registry");
  }

  if (!Array.isArray(json.proposalRegistry) || json.proposalRegistry.length < json.featuredProposalRegistry.length) {
    throw new Error("read-node snapshot missing full proposal registry");
  }

  if (!Array.isArray(json.proposals) || json.proposals.length < json.featuredProposalRegistry.length) {
    throw new Error("read-node snapshot missing proposal summary list");
  }

  const profile350 = Array.isArray(json.profiles) ? json.profiles.find((profile: any) => profile.name === "350") : null;
  if (!profile350 || profile350.waveCount !== 7 || profile350.waveSize !== 50) {
    throw new Error("read-node snapshot missing 350-wave profile");
  }

  if (!markdown.includes("# Read Node Snapshot")) {
    throw new Error("read-node markdown snapshot heading mismatch");
  }

  if (!markdown.includes("Confidential payout proposals")) {
    throw new Error("read-node markdown snapshot missing confidential payout coverage");
  }

  if (!markdown.includes("REFHE-configured proposals")) {
    throw new Error("read-node markdown snapshot missing REFHE coverage");
  }

  if (!markdown.includes("Testnet Load Profiles")) {
    throw new Error("read-node markdown snapshot missing Testnet load profile section");
  }

  if (!markdown.includes("Featured Proposal Contexts")) {
    throw new Error("read-node markdown snapshot missing featured proposal context section");
  }

  if (!markdown.includes("Proposal Registry")) {
    throw new Error("read-node markdown snapshot missing full proposal registry section");
  }

  if (!markdown.includes("Featured Proposal Registry")) {
    throw new Error("read-node markdown snapshot missing featured proposal registry section");
  }

  if (!frontendModule.includes("READ_NODE_FEATURED_PROPOSAL_CONTEXTS")) {
    throw new Error("read-node snapshot missing frontend proposal context module");
  }

  if (!frontendModule.includes("READ_NODE_PROPOSAL_REGISTRY")) {
    throw new Error("read-node snapshot missing frontend full proposal registry module");
  }

  if (!frontendModule.includes("READ_NODE_FEATURED_PROPOSAL_REGISTRY")) {
    throw new Error("read-node snapshot missing frontend proposal registry module");
  }

  console.log("Read-node snapshot verification: PASS");
}

main();
