import fs from "fs";

function read(path: string) {
  return fs.readFileSync(path, "utf8");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const program = read("programs/private-dao/src/lib.rs");
const voting = read("programs/private-dao/src/voting.rs");
const utils = read("programs/private-dao/src/utils.rs");
const errors = read("programs/private-dao/src/error.rs");
const treasury = read("programs/private-dao/src/treasury.rs");
const demo = read("tests/demo.ts");
const privateDaoTest = read("tests/private-dao.ts");
const remediation = read("docs/security-audit-remediation-2026-04-08.md");
const kernelGateway = read("scripts/kernel-gateway-service.ts");
const readNode = read("scripts/run-read-node.ts");
const caddy = read("deploy/primary-host/Caddyfile");
const primaryEnv = read("deploy/primary-host/.env.example");

assert(
  demo.includes("function makeCommitment(vote: boolean, salt: Buffer, voter: PublicKey, proposal: PublicKey): Buffer"),
  "demo commitment helper must accept proposal pubkey",
);
assert(
  demo.includes("salt, proposal.toBuffer(), voter.toBuffer()"),
  "demo commitment helper must bind proposal pubkey",
);
assert(!demo.includes("salt, voter.toBuffer()])"), "demo commitment helper must not use legacy voter-only binding");

assert(
  voting.includes("&& now < p.voting_end") &&
    voting.includes("&& p.commit_count == 0") &&
    voting.includes("&& p.reveal_count == 0"),
  "legacy cancel_proposal must reject cancellation after participation starts",
);
assert(
  privateDaoTest.includes("rejects legacy cancellation after a commit has been recorded"),
  "missing regression test for legacy cancellation after commit",
);

assert(
  utils.includes("fn validate_supported_token_program(program_id: &Pubkey) -> Result<()>") &&
    utils.includes("anchor_spl::token::ID || *program_id == anchor_spl::token_2022::ID"),
  "token execution paths must pin supported token programs",
);
assert(
  errors.includes("Only the DAO authority may record zk_enforced receipts") &&
    errors.includes("Only the DAO authority may enable zk_enforced mode"),
  "zk_enforced paths must remain authority-only in error messages and policy",
);
assert(
  errors.includes("zk_enforced receipts must identify the verifier program boundary"),
  "zk_enforced verifier-program requirement must be documented in the program error surface",
);
assert(
  treasury.includes("*ctx.accounts.refhe_envelope.owner == crate::ID") &&
    treasury.includes("*ctx.accounts.magicblock_private_payment_corridor.owner == crate::ID"),
  "optional REFHE/MagicBlock companion accounts must be program-owned before deserialization",
);

assert(
  kernelGateway.includes("this.requiredToken.length > 0 && req.headers[\"x-pdao-gateway-token\"] === this.requiredToken") &&
    kernelGateway.includes("const explicitlyNonProduction = runtimeMode === \"development\" || runtimeMode === \"test\"") &&
    kernelGateway.includes("https://privatedao.org"),
  "Kernel Gateway execution must fail closed unless a token is configured or explicit non-production mode is active",
);
assert(
  !readNode.includes('process.env.PD_LICENSE_SIGNING_SECRET || "privatedao-public-review-license-boundary"') &&
    readNode.includes("License issuance requires a configured control-plane issuer credential.") &&
    readNode.includes("License issuance requires the control-plane issuer credential."),
  "license signing and issuance must not use a repository-known fallback or optional issuer authorization",
);
assert(
  readNode.includes("PRIVATE_DAO_READ_ALLOWED_ORIGIN?.trim()") &&
    readNode.includes("https://privatedao.org") &&
    readNode.includes("explicitlyNonProduction ? \"*\""),
  "read-node CORS must be explicit in production and wildcard only in non-production modes",
);
assert(
  (caddy.match(/header_up X-PDAO-Gateway-Token \{env\.PDAO_KERNEL_GATEWAY_TOKEN\}/g) || []).length === 4,
  "every primary read-node proxy route must inject the host-local Kernel Gateway token",
);
assert(
  primaryEnv.includes("NODE_ENV=production") &&
    primaryEnv.includes("PDAO_KERNEL_GATEWAY_TOKEN=") &&
    primaryEnv.includes("PDAO_KERNEL_GATEWAY_ALLOW_UNAUTHENTICATED=0") &&
    primaryEnv.includes("PDAO_KERNEL_EVM_BROADCAST_ENABLED=0") &&
    primaryEnv.includes("PDAO_ZCASH_BROADCAST_ENABLED=0"),
  "primary production env example must keep gateway auth and broadcast fail-closed",
);

assert(
  program.includes("pub const VOTER_WEIGHT_EXPIRY_SLOTS: u64 = 10_000") &&
    voting.includes("Clock::get()?.slot + VOTER_WEIGHT_EXPIRY_SLOTS"),
  "voter weight expiry must use the bounded 10,000-slot constant",
);
assert(
  utils.includes("((x as u128 + (n / x) as u128) / 2) as u64"),
  "isqrt Newton step must use widened arithmetic",
);

for (const required of [
  "Confirmed And Fixed",
  "Commitment Hash Mismatch In Demo Test",
  "Late Legacy Cancellation",
  "Token Program Pinning",
  "Optional REFHE / MagicBlock Account Ownership",
  "Reviewed But Not Claimed As Fully Solved",
]) {
  assert(remediation.includes(required), `security remediation doc missing section: ${required}`);
}

console.log("Security remediation verification: PASS");
