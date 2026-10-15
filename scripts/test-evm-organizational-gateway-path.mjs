import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = await readFile(path.join(root, "scripts/run-evm-organizational-e2e.mjs"), "utf8");

for (const marker of [
  "await runtime.gateway.prepare(intent, providerId === checkerProviderId ? \"checker\" : \"maker\")",
  "await runtime.gateway.submit(prepared, prepared.unsignedPayload, role)",
  "await runtime.gateway.receipt({ executionId: prepared.executionId, intent: prepared.intent }, role)",
  'gatewayWrite(ownerProviderId, deployerWallet, "treasury"',
  'gatewayWrite(checkerProviderId, checkerWallet, "treasury"',
  'gatewayWrite(ownerProviderId, deployerWallet, "payroll"',
  'gatewayWrite(checkerProviderId, checkerWallet, "payroll"',
  'gatewayWrite(ownerProviderId, deployerWallet, "governance"',
  'gatewayWrite(ownerProviderId, deployerWallet, "auction"',
  'gatewayWrite(checkerProviderId, checkerWallet, "auction"',
  "const bidCommitHash = tempoTokenMode\n  ? await write(checkerWallet, auction.address, auctionAbi, \"commitBid\"",
  "  : await gatewayWrite(checkerProviderId, checkerWallet, \"auction\", \"auction.bid.commit\"",
  "const bidRevealHash = tempoTokenMode\n  ? await write(checkerWallet, auction.address, auctionAbi, \"revealBid\"",
  "  : await gatewayWrite(checkerProviderId, checkerWallet, \"auction\", \"auction.bid.commit\"",
]) {
  assert.ok(source.includes(marker), `missing Kernel Gateway marker: ${marker}`);
}

for (const forbidden of [
  "write(deployerWallet, payroll.address",
  "write(checkerWallet, payroll.address",
  "write(deployerWallet, governance.address",
  "write(checkerWallet, governance.address",
  "checkerWallet.writeContract({ address: auction.address",
]) {
  assert.equal(source.includes(forbidden), false, `product write bypasses Kernel Gateway: ${forbidden}`);
}

console.log("[evm-organizational-gateway-path] product writes are guarded by ProductExecutionGateway");
