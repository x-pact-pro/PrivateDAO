import fs from "fs";
import path from "path";

const root = process.cwd();
const responsePath = path.join(root, "docs/security-response-capability-2026-05-22.md");
const remediationPath = path.join(root, "docs/security-remediation-2026-05-22.md");
const curatedPath = path.join(root, "apps/web/src/lib/curated-documents.ts");
const securityPagePath = path.join(root, "apps/web/src/app/security/page.tsx");
const multisigJsonPath = path.join(root, "docs/multisig-setup-intake.json");

function main() {
  const response = read(responsePath);
  const remediation = read(remediationPath);
  const curated = read(curatedPath);
  const securityPage = read(securityPagePath);
  const multisig = JSON.parse(read(multisigJsonPath)) as {
    status: string;
    testnetAuthorityPrecheck?: {
      programId?: string;
      observedAuthority?: string;
      closureStatus?: string;
    };
    authorityTransfers?: Array<{ surface: string; programId: string; transferSignature: string | null }>;
  };

  assertIncludes(response, "27e979c072cacc5661e856fdba4310a387a93335", "response commit hash");
  assertIncludes(response, "npm run verify:security-boundaries:2026-05-22", "response verification gate");
  assertIncludes(response, "Browser-persisted governance state is redacted", "response remediation control");
  assertIncludes(response, "What is not claimed by this packet", "response claim boundary");
  assertIncludes(response, "Authority: 4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD", "response authority readout");
  assertIncludes(remediation, "# Security Remediation 2026-05-22", "remediation packet title");
  assertIncludes(curated, "security-response-capability-2026-05-22", "curated document route");
  assertIncludes(securityPage, "/documents/security-response-capability-2026-05-22", "security page link");

  assert(multisig.status === "pending-external", "multisig status must remain pending-external until transfer evidence exists");
  assert(
    multisig.testnetAuthorityPrecheck?.programId === "EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva",
    "multisig precheck must target the current Testnet program",
  );
  assert(
    multisig.testnetAuthorityPrecheck?.observedAuthority === "4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD",
    "multisig precheck must preserve the observed single authority",
  );
  assert(
    multisig.testnetAuthorityPrecheck?.closureStatus === "single-authority-observed",
    "multisig precheck must not claim closure",
  );

  const upgradeTransfer = multisig.authorityTransfers?.find((transfer) => transfer.surface === "program-upgrade-authority");
  assert(
    upgradeTransfer?.programId === "EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva",
    "upgrade transfer must target current Testnet program",
  );
  assert(upgradeTransfer.transferSignature === null, "upgrade transfer signature must stay null until a real transaction exists");

  console.log("Security response capability verification: PASS");
}

function read(filePath: string) {
  return fs.readFileSync(filePath, "utf8");
}

function assertIncludes(content: string, needle: string, label: string) {
  assert(content.includes(needle), `missing ${label}: ${needle}`);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

main();
