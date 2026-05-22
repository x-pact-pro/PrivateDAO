import fs from "fs";
import path from "path";
import { PublicKey } from "@solana/web3.js";

type NullableString = string | null;

type MultisigSetupIntake = {
  schemaVersion: number;
  project: string;
  status: string;
  productionMainnetClaimAllowed: boolean;
  network: string;
  custodyTarget: string;
  multisig: {
    requiredThreshold: number;
    requiredSignerCount: number;
    implementation: string;
    address: NullableString;
    creationSignature: NullableString;
    rehearsalSignature: NullableString;
  };
  timelock: {
    minimumHours: number;
    configuredHours: number | null;
    configurationSignature: NullableString;
    configurationReferenceUrl?: NullableString;
    shorteningPolicy: string;
  };
  signers: Array<{
    slot: number;
    role: string;
    publicKey: NullableString;
    storageClass: string;
    backupProcedureDocumented: boolean;
  }>;
  authorityTransfers: Array<{
    surface: string;
    programId: string;
    destinationAuthority: NullableString;
    transferSignature: NullableString;
    postTransferReadout: NullableString;
    postTransferReadoutReferenceUrl?: NullableString;
  }>;
  backupProcedures: {
    seedPhrasesInRepository: boolean;
    privateKeysInRepository: boolean;
    hardwareOrColdStorageRequired: boolean;
    signerReplacementProcedureDocumented: boolean;
    releasePacketBackupRequired: boolean;
  };
  completionRule: string;
};

const REQUIRED_TRANSFER_SURFACES = new Set([
  "program-upgrade-authority",
  "dao-authority",
  "treasury-operator-authority",
]);

const ALLOWED_STATUSES = new Set(["pending-external", "ready-for-transfer", "complete"]);
const COLD_STORAGE_CLASSES = new Set(["cold", "hardware", "cold-or-hardware"]);

function main(): void {
  const jsonPath = path.resolve("docs/multisig-setup-intake.json");
  const markdownPath = path.resolve("docs/multisig-setup-intake.md");
  assertFile(jsonPath);
  assertFile(markdownPath);

  const intake = readJson<MultisigSetupIntake>(jsonPath);
  const markdown = fs.readFileSync(markdownPath, "utf8");

  assert(intake.schemaVersion === 1, "unexpected multisig intake schema version");
  assert(intake.project === "PrivateDAO", "multisig intake must be bound to PrivateDAO");
  assert(ALLOWED_STATUSES.has(intake.status), `unsupported multisig intake status: ${intake.status}`);
  assert(
    intake.network === "mainnet-beta" || intake.network === "testnet",
    "custody intake must target mainnet-beta or the current reviewer-facing testnet ceremony",
  );
  assert(intake.productionMainnetClaimAllowed === false, "multisig intake must not allow production mainnet claims by itself");
  assert(intake.custodyTarget.includes("program-upgrade-authority"), "custody target must include program upgrade authority");

  assert(intake.multisig.requiredThreshold === 2, "production multisig threshold must be 2");
  assert(intake.multisig.requiredSignerCount === 3, "production multisig signer count must be 3");
  assert(intake.timelock.minimumHours >= 48, "production timelock minimum must be at least 48 hours");
  assert(
    intake.timelock.shorteningPolicy.includes("must-not-shorten"),
    "timelock shortening policy must reject undocumented shortening",
  );

  assert(intake.signers.length === 3, "multisig intake must define exactly 3 signer slots");
  const signerSlots = new Set<number>();
  const signerKeys = new Set<string>();
  let populatedSignerKeys = 0;

  for (const signer of intake.signers) {
    assert(!signerSlots.has(signer.slot), `duplicate signer slot ${signer.slot}`);
    signerSlots.add(signer.slot);
    assertNonEmpty(signer.role, `signer ${signer.slot} role`);
    assert(COLD_STORAGE_CLASSES.has(signer.storageClass), `signer ${signer.slot} must use cold/hardware storage class`);

    if (signer.publicKey) {
      assertPublicKey(signer.publicKey, `signer ${signer.slot} publicKey`);
      assert(!signerKeys.has(signer.publicKey), `duplicate signer public key: ${signer.publicKey}`);
      signerKeys.add(signer.publicKey);
      populatedSignerKeys += 1;
    }
  }

  assertTransferSurfaces(intake);
  assertBackupRules(intake);
  assertNoSecretMaterial(JSON.stringify(intake, null, 2));

  if (intake.status === "complete" || intake.status === "ready-for-transfer") {
    assert(intake.multisig.implementation !== "pending-selection", "completed/ready intake needs multisig implementation");
    assertNonEmpty(intake.multisig.address ?? "", "multisig address");
    assertPublicKey(intake.multisig.address ?? "", "multisig address");
    assert(populatedSignerKeys === 3, "completed/ready intake requires all 3 signer public keys");
    assert(
      typeof intake.timelock.configuredHours === "number" && intake.timelock.configuredHours >= 48,
      "completed/ready intake requires configured timelock >= 48 hours",
    );
  }

  if (intake.status === "complete") {
    assertNonEmpty(intake.multisig.creationSignature ?? "", "multisig creation signature");
    assertNonEmpty(intake.multisig.rehearsalSignature ?? "", "multisig rehearsal signature");
    assertNonEmpty(intake.timelock.configurationSignature ?? "", "timelock configuration signature");
    assertReference(intake.timelock.configurationReferenceUrl ?? "", "timelock configuration reference");
    for (const transfer of intake.authorityTransfers) {
      assertNonEmpty(transfer.destinationAuthority ?? "", `${transfer.surface} destinationAuthority`);
      assertPublicKey(transfer.destinationAuthority ?? "", `${transfer.surface} destinationAuthority`);
      assertNonEmpty(transfer.transferSignature ?? "", `${transfer.surface} transferSignature`);
      assertNonEmpty(transfer.postTransferReadout ?? "", `${transfer.surface} postTransferReadout`);
      assertReference(
        transfer.postTransferReadoutReferenceUrl ?? "",
        `${transfer.surface} postTransferReadoutReferenceUrl`,
      );
    }
  }

  assert(markdown.includes("2-of-3"), "multisig intake markdown must name 2-of-3");
  assert(markdown.includes("48+ hours"), "multisig intake markdown must name the 48+ hour timelock");
  assert(markdown.includes("pending-external"), "multisig intake markdown must preserve pending-external boundary");
  assert(markdown.includes("no seed phrases"), "multisig intake markdown must forbid seed phrases");
  assert(markdown.includes("no private keys"), "multisig intake markdown must forbid private keys");

  console.log(
    `Multisig setup intake verification: PASS (${intake.status}, ${populatedSignerKeys}/3 signer keys populated)`,
  );
}

function assertTransferSurfaces(intake: MultisigSetupIntake): void {
  const surfaces = new Set<string>();
  for (const transfer of intake.authorityTransfers) {
    assert(!surfaces.has(transfer.surface), `duplicate authority transfer surface: ${transfer.surface}`);
    surfaces.add(transfer.surface);
    assert(REQUIRED_TRANSFER_SURFACES.has(transfer.surface), `unexpected authority transfer surface: ${transfer.surface}`);
    assertPublicKey(transfer.programId, `${transfer.surface} programId`);
    if (transfer.destinationAuthority) {
      assertPublicKey(transfer.destinationAuthority, `${transfer.surface} destinationAuthority`);
    }
  }

  for (const requiredSurface of REQUIRED_TRANSFER_SURFACES) {
    assert(surfaces.has(requiredSurface), `missing authority transfer surface: ${requiredSurface}`);
  }
}

function assertBackupRules(intake: MultisigSetupIntake): void {
  assert(intake.backupProcedures.seedPhrasesInRepository === false, "seed phrases must never be allowed in repository");
  assert(intake.backupProcedures.privateKeysInRepository === false, "private keys must never be allowed in repository");
  assert(intake.backupProcedures.hardwareOrColdStorageRequired === true, "hardware/cold storage must be required");
  assert(
    intake.backupProcedures.signerReplacementProcedureDocumented === true,
    "signer replacement procedure must be documented",
  );
  assert(intake.backupProcedures.releasePacketBackupRequired === true, "release packet backup must be required");
  assert(intake.completionRule.includes("Never add seed phrases or private keys"), "completion rule must forbid secrets");
}

function assertNoSecretMaterial(serialized: string): void {
  const forbidden = [
    "seed phrase",
    "mnemonic",
    "private key",
    "secret key",
    "keypair json",
  ];

  for (const marker of forbidden) {
    const allowedContext = marker === "seed phrase" || marker === "private key" || marker === "keypair json";
    if (!allowedContext && serialized.toLowerCase().includes(marker)) {
      throw new Error(`multisig intake contains forbidden secret marker: ${marker}`);
    }
  }
}

function assertPublicKey(value: string, label: string): void {
  try {
    new PublicKey(value);
  } catch (error) {
    throw new Error(`${label} is not a valid Solana public key: ${(error as Error).message}`);
  }
}

function assertReference(value: string, label: string): void {
  assertNonEmpty(value, label);
  const normalized = value.trim();
  const isHttp = normalized.startsWith("https://");
  const isRepoDoc = normalized.startsWith("docs/");
  assert(isHttp || isRepoDoc, `${label} must be an https URL or docs/ path`);
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.resolve(relativePath), "utf8")) as T;
}

function assertFile(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`missing required file: ${path.relative(process.cwd(), filePath)}`);
  }
}

function assertNonEmpty(value: string, label: string): void {
  assert(typeof value === "string" && value.trim().length > 0, `missing ${label}`);
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

main();
