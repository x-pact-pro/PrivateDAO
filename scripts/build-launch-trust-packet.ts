import fs from "fs";
import path from "path";

type MultisigIntake = {
  status: string;
  productionMainnetClaimAllowed: boolean;
  rehearsalSource?: {
    network: string;
    implementation?: string | null;
    multisigAddress: string | null;
    creationSignature: string | null;
  };
  multisig: {
    requiredThreshold: number;
    requiredSignerCount: number;
    implementation: string;
    address: string | null;
  };
  timelock: {
    minimumHours: number;
    configuredHours: number | null;
  };
  signers: Array<{ publicKey: string | null }>;
  authorityTransfers: Array<{ surface: string; transferSignature: string | null; postTransferReadout: string | null }>;
};

type LaunchChecklist = {
  decision: string;
  items: Array<{ id: string; status: string }>;
};

type MainnetBlockers = {
  decision: string;
  productionMainnetClaimAllowed: boolean;
  blockers: Array<{ id: string; status: string; nextAction: string }>;
};

type RealDeviceEvidence = {
  status: string;
  summary: {
    targetCount: number;
    completedTargetCount: number;
    pendingTargets: string[];
  };
};

type CanonicalCustodyProof = {
  observedReadouts: Array<{
    id: string;
    cluster: string;
    status: string;
    address: string;
    authority: string | null;
  }>;
};

function main() {
  const multisig = readJson<MultisigIntake>("docs/multisig-setup-intake.json");
  const launchOps = readJson<LaunchChecklist>("docs/launch-ops-checklist.json");
  const blockers = readJson<MainnetBlockers>("docs/mainnet-blockers.json");
  const realDevice = readJson<RealDeviceEvidence>("docs/runtime/real-device.generated.json");
  const canonicalCustody = readJson<CanonicalCustodyProof>("docs/canonical-custody-proof.generated.json");
  const testnetProgramReadout = canonicalCustody.observedReadouts.find((entry) => entry.id === "testnet-program");
  const mainnetProgramReadout = canonicalCustody.observedReadouts.find((entry) => entry.id === "mainnet-program");

  const payload = {
    project: "PrivateDAO",
    generatedAt: new Date().toISOString(),
    decision: blockers.decision,
    productionMainnetClaimAllowed: blockers.productionMainnetClaimAllowed,
    custody: {
      status: multisig.status,
      implementation: multisig.multisig.implementation,
      rehearsalImplementation: multisig.rehearsalSource?.implementation ?? multisig.multisig.implementation,
      rehearsalNetwork: multisig.rehearsalSource?.network ?? "devnet",
      rehearsalMultisigAddress: multisig.rehearsalSource?.multisigAddress ?? null,
      rehearsalCreationSignature: multisig.rehearsalSource?.creationSignature ?? null,
      threshold: `${multisig.multisig.requiredThreshold}-of-${multisig.multisig.requiredSignerCount}`,
      multisigAddress: multisig.multisig.address,
      signerSlotsConfigured: multisig.signers.filter((entry) => Boolean(entry.publicKey)).length,
      pendingAuthorityTransfers: multisig.authorityTransfers.filter((entry) => !entry.transferSignature).map((entry) => entry.surface),
      minimumTimelockHours: multisig.timelock.minimumHours,
      configuredTimelockHours: multisig.timelock.configuredHours,
      observedTestnetAuthority: testnetProgramReadout?.authority ?? null,
      observedMainnetProgramStatus: mainnetProgramReadout?.status ?? "unknown",
    },
    runtime: {
      status: realDevice.status,
      completedTargetCount: realDevice.summary.completedTargetCount,
      targetCount: realDevice.summary.targetCount,
      pendingTargets: realDevice.summary.pendingTargets,
    },
    audit: {
      status: blockers.blockers.find((entry) => entry.id === "external-audit-completion")?.status ?? "pending-external",
      pendingAction:
        blockers.blockers.find((entry) => entry.id === "external-audit-completion")?.nextAction ??
        "Complete the external audit and record closure.",
    },
    pilot: {
      status: launchOps.decision === "blocked-external-steps" ? "repo-ready-pending-external-target" : "unexpected",
      lifecycle: ["Create DAO", "Submit proposal", "Private vote", "Execute treasury"],
      packs: [
        "Grant Committee Pack",
        "Fund Governance Pack",
        "Gaming DAO Pack",
        "Enterprise DAO Pack",
      ],
    },
    v3Evidence: {
      governance: "docs/governance-hardening-v3.md",
      settlement: "docs/settlement-hardening-v3.md",
      liveProof: "docs/test-wallet-live-proof-v3.generated.md",
      status: "devnet-proven",
      boundary: "test-wallet-devnet-only",
    },
    linkedDocs: [
      "docs/multisig-setup-intake.md",
      "docs/canonical-custody-proof.generated.md",
      "docs/custody-proof-reviewer-packet.generated.md",
      "docs/custody-observed-readouts.json",
      "docs/production-custody-ceremony.md",
      "docs/authority-transfer-runbook.md",
      "docs/external-audit-engagement.md",
      "docs/audit-handoff.md",
      "docs/governance-hardening-v3.md",
      "docs/settlement-hardening-v3.md",
      "docs/test-wallet-live-proof-v3.generated.md",
      "docs/runtime/real-device.md",
      "docs/pilot-onboarding-playbook.md",
      "docs/pilot-program.md",
      "docs/trust-package.md",
      "docs/mainnet-blockers.md",
    ],
    requiredExternalInputs: [
      "3 production signer public keys",
      "chosen multisig implementation and address",
      "48+ hour timelock configuration evidence",
      "authority transfer signatures, explorer links, and readouts",
      "real-device wallet captures",
      "external audit report or signed memo",
      "first pilot DAO target and operator contact",
    ],
    commands: [
      "npm run build:launch-trust-packet",
      "npm run verify:launch-trust-packet",
      "npm run build:custody-proof-reviewer-packet",
      "npm run verify:custody-proof-reviewer-packet",
      "npm run verify:multisig-intake",
      "npm run verify:launch-ops",
      "npm run verify:mainnet-blockers",
      "npm run verify:real-device-runtime",
      "npm run check:mainnet",
    ],
  };

  fs.writeFileSync(path.resolve("docs/launch-trust-packet.generated.json"), JSON.stringify(payload, null, 2) + "\n");
  fs.writeFileSync(path.resolve("docs/launch-trust-packet.generated.md"), buildMarkdown(payload));
  console.log("Wrote launch trust packet");
}

function buildMarkdown(payload: {
  project: string;
  generatedAt: string;
  decision: string;
  productionMainnetClaimAllowed: boolean;
    custody: {
      status: string;
      implementation: string;
      rehearsalImplementation: string;
      rehearsalNetwork: string;
      rehearsalMultisigAddress: string | null;
      rehearsalCreationSignature: string | null;
      threshold: string;
    multisigAddress: string | null;
    signerSlotsConfigured: number;
    pendingAuthorityTransfers: string[];
    minimumTimelockHours: number;
    configuredTimelockHours: number | null;
    observedTestnetAuthority: string | null;
    observedMainnetProgramStatus: string;
  };
  runtime: {
    status: string;
    completedTargetCount: number;
    targetCount: number;
    pendingTargets: string[];
  };
  audit: { status: string; pendingAction: string };
  pilot: { status: string; lifecycle: string[]; packs: string[] };
  v3Evidence: {
    governance: string;
    settlement: string;
    liveProof: string;
    status: string;
    boundary: string;
  };
  linkedDocs: string[];
  requiredExternalInputs: string[];
  commands: string[];
}) {
  return `# Launch Trust Packet

## Overview

- project: \`${payload.project}\`
- generated at: \`${payload.generatedAt}\`
- current decision: \`${payload.decision}\`
- production mainnet claim allowed: \`${payload.productionMainnetClaimAllowed}\`

## Custody Snapshot

- custody status: \`${payload.custody.status}\`
- multisig implementation: \`${payload.custody.implementation}\`
- rehearsal implementation: \`${payload.custody.rehearsalImplementation}\`
- rehearsal network: \`${payload.custody.rehearsalNetwork}\`
- rehearsal multisig address: \`${payload.custody.rehearsalMultisigAddress ?? "pending"}\`
- rehearsal creation signature: \`${payload.custody.rehearsalCreationSignature ?? "pending"}\`
- threshold target: \`${payload.custody.threshold}\`
- multisig address: \`${payload.custody.multisigAddress ?? "pending"}\`
- signer slots configured: \`${payload.custody.signerSlotsConfigured}\`
- minimum timelock hours: \`${payload.custody.minimumTimelockHours}\`
- configured timelock hours: \`${payload.custody.configuredTimelockHours ?? "pending"}\`
- observed Testnet authority: \`${payload.custody.observedTestnetAuthority ?? "pending"}\`
- observed target-network program status: \`${payload.custody.observedMainnetProgramStatus}\`

Pending authority transfers:

${payload.custody.pendingAuthorityTransfers.map((entry) => `- \`${entry}\``).join("\n")}

## Runtime Snapshot

- runtime status: \`${payload.runtime.status}\`
- completed targets: \`${payload.runtime.completedTargetCount}/${payload.runtime.targetCount}\`

Pending real-device targets:

${payload.runtime.pendingTargets.map((entry) => `- ${entry}`).join("\n")}

## Audit Snapshot

- audit status: \`${payload.audit.status}\`
- next action: ${payload.audit.pendingAction}

## Pilot Snapshot

- pilot status: \`${payload.pilot.status}\`

Lifecycle to prove for the first pilot:

${payload.pilot.lifecycle.map((entry, index) => `${index + 1}. ${entry}`).join("\n")}

Available use-case packs:

${payload.pilot.packs.map((entry) => `- ${entry}`).join("\n")}

## Additive V3 Evidence

- governance hardening: \`${payload.v3Evidence.governance}\`
- settlement hardening: \`${payload.v3Evidence.settlement}\`
- dedicated live proof: \`${payload.v3Evidence.liveProof}\`
- V3 evidence status: \`${payload.v3Evidence.status}\`
- V3 evidence boundary: \`${payload.v3Evidence.boundary}\`

## Required External Inputs

${payload.requiredExternalInputs.map((entry) => `- ${entry}`).join("\n")}

## Linked Docs

${payload.linkedDocs.map((entry) => `- \`${entry}\``).join("\n")}

## Canonical Commands

${payload.commands.map((entry) => `- \`${entry}\``).join("\n")}

## Honest Boundary

This packet proves that the repository is operationally prepared for custody, audit, runtime capture, and pilot onboarding.

It does not claim those external actions have already happened until the corresponding addresses, signatures, captures, and audit outputs are recorded.
`;
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.resolve(relativePath), "utf8")) as T;
}

main();
