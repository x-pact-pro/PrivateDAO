export const custodyEvidenceStorageKey = "privatedao.custody.evidence";
export const custodyEvidenceUpdatedEvent = "privatedao:custody-evidence-updated";

export const custodyProgramId = "EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva";
export const custodySignerSlots = [
  { slot: 1, role: "founder-operator" },
  { slot: 2, role: "independent-security-or-ops-signer" },
  { slot: 3, role: "recovery-or-governance-signer" },
] as const;
export const custodyAuthorityTransferSurfaces = [
  "program-upgrade-authority",
  "dao-authority",
  "treasury-operator-authority",
] as const;

type CustodyAuthorityTransferSurface = (typeof custodyAuthorityTransferSurfaces)[number];

export type CustodySignerEvidence = {
  slot: number;
  role: string;
  publicKey: string;
  storageClass: "cold-or-hardware";
  backupProcedureDocumented: boolean;
};

export type CustodyAuthorityTransferEvidence = {
  surface: CustodyAuthorityTransferSurface;
  programId: string;
  destinationAuthority: string;
  transferSignature: string;
  postTransferReadout: string;
  postTransferReadoutReferenceUrl: string;
};

export type CustodyEvidence = {
  multisigAddress: string;
  threshold: string;
  signerRoster: string;
  upgradeTransferSignature: string;
  treasuryTransferSignature: string;
  postTransferReadouts: string;
  multisigImplementation: string;
  multisigCreationSignature: string;
  rehearsalSignature: string;
  timelockConfiguredHours: string;
  timelockConfigurationSignature: string;
  timelockConfigurationReferenceUrl: string;
  signers: CustodySignerEvidence[];
  authorityTransfers: CustodyAuthorityTransferEvidence[];
};

type LegacyCustodyEvidence = Partial<
  Pick<
    CustodyEvidence,
    | "multisigAddress"
    | "threshold"
    | "signerRoster"
    | "upgradeTransferSignature"
    | "treasuryTransferSignature"
    | "postTransferReadouts"
  >
>;

type RawCustodyEvidence = Partial<CustodyEvidence> & LegacyCustodyEvidence;

const base58Pattern = /^[1-9A-HJ-NP-Za-km-z]+$/;

function createEmptySigners(): CustodySignerEvidence[] {
  return custodySignerSlots.map((signer) => ({
    slot: signer.slot,
    role: signer.role,
    publicKey: "",
    storageClass: "cold-or-hardware",
    backupProcedureDocumented: false,
  }));
}

function createEmptyAuthorityTransfers(): CustodyAuthorityTransferEvidence[] {
  return custodyAuthorityTransferSurfaces.map((surface) => ({
    surface,
    programId: custodyProgramId,
    destinationAuthority: "",
    transferSignature: "",
    postTransferReadout: "",
    postTransferReadoutReferenceUrl: "",
  }));
}

export const emptyCustodyEvidence: CustodyEvidence = {
  multisigAddress: "",
  threshold: "2-of-3",
  signerRoster: "",
  upgradeTransferSignature: "",
  treasuryTransferSignature: "",
  postTransferReadouts: "",
  multisigImplementation: "pending-selection",
  multisigCreationSignature: "",
  rehearsalSignature: "",
  timelockConfiguredHours: "",
  timelockConfigurationSignature: "",
  timelockConfigurationReferenceUrl: "",
  signers: createEmptySigners(),
  authorityTransfers: createEmptyAuthorityTransfers(),
};

export const currentTestnetCustodyEvidence: CustodyEvidence = normalizeCustodyEvidence({
  multisigAddress: "CALHrBqx6jbzcPn2NVcinqSAHeod65v9LcDuTxsdPqBv",
  threshold: "2-of-3",
  multisigImplementation: "Squads Protocol v4",
  multisigCreationSignature: "67S63JAUNvvCED3hE9h6bCXW9iJ3EYzJLARvj8Lki5x2dJEgLnrfES9mp6bAxfsH6vfmor2ocqNaEd68uVN68DNJ",
  timelockConfiguredHours: "48",
  timelockConfigurationSignature: "67S63JAUNvvCED3hE9h6bCXW9iJ3EYzJLARvj8Lki5x2dJEgLnrfES9mp6bAxfsH6vfmor2ocqNaEd68uVN68DNJ",
  timelockConfigurationReferenceUrl:
    "https://explorer.solana.com/tx/67S63JAUNvvCED3hE9h6bCXW9iJ3EYzJLARvj8Lki5x2dJEgLnrfES9mp6bAxfsH6vfmor2ocqNaEd68uVN68DNJ?cluster=testnet",
  signers: [
    {
      slot: 1,
      role: "founder-operator",
      publicKey: "4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD",
      storageClass: "cold-or-hardware",
      backupProcedureDocumented: true,
    },
    {
      slot: 2,
      role: "independent-security-or-ops-signer",
      publicKey: "BBBPcpUnnBi3CWUhcv6vLTqaY9pugAGuhgw2Axjpvcr2",
      storageClass: "cold-or-hardware",
      backupProcedureDocumented: true,
    },
    {
      slot: 3,
      role: "recovery-or-governance-signer",
      publicKey: "2KpA69UB55tfWUSkKj5j7Tvebd3eG22hEs9hjXUq7pf5",
      storageClass: "cold-or-hardware",
      backupProcedureDocumented: true,
    },
  ],
  authorityTransfers: [
    {
      surface: "program-upgrade-authority",
      programId: custodyProgramId,
      destinationAuthority: "CALHrBqx6jbzcPn2NVcinqSAHeod65v9LcDuTxsdPqBv",
      transferSignature: "EzwLLrAchBpj3eLTUFuv1uo9rSLKgKNbQgp1DkCevJycT31Eou9TSJsJsEfMjLt4q87pKwXaZUTqCZ1NduNc1vy",
      postTransferReadout:
        "Program Id: EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva; Authority: CALHrBqx6jbzcPn2NVcinqSAHeod65v9LcDuTxsdPqBv",
      postTransferReadoutReferenceUrl:
        "https://explorer.solana.com/tx/EzwLLrAchBpj3eLTUFuv1uo9rSLKgKNbQgp1DkCevJycT31Eou9TSJsJsEfMjLt4q87pKwXaZUTqCZ1NduNc1vy?cluster=testnet",
    },
    {
      surface: "dao-authority",
      programId: custodyProgramId,
      destinationAuthority: "",
      transferSignature: "",
      postTransferReadout: "",
      postTransferReadoutReferenceUrl: "",
    },
    {
      surface: "treasury-operator-authority",
      programId: custodyProgramId,
      destinationAuthority: "",
      transferSignature: "",
      postTransferReadout: "",
      postTransferReadoutReferenceUrl: "",
    },
  ],
});

export function looksLikeSolanaAddress(value: string) {
  const normalized = value.trim();
  return normalized.length >= 32 && normalized.length <= 44 && base58Pattern.test(normalized);
}

export function looksLikeSolanaSignature(value: string) {
  const normalized = value.trim();
  return normalized.length >= 64 && normalized.length <= 88 && base58Pattern.test(normalized);
}

export function looksLikeReference(value: string) {
  const normalized = value.trim();
  return normalized.startsWith("https://") || normalized.startsWith("docs/");
}

export function normalizeThreshold(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function findAuthorityTransfer(
  authorityTransfers: CustodyAuthorityTransferEvidence[],
  surface: CustodyAuthorityTransferSurface,
) {
  return (
    authorityTransfers.find((transfer) => transfer.surface === surface) ?? {
      surface,
      programId: custodyProgramId,
      destinationAuthority: "",
      transferSignature: "",
      postTransferReadout: "",
      postTransferReadoutReferenceUrl: "",
    }
  );
}

function summarizeSignerRoster(signers: CustodySignerEvidence[]) {
  const populated = signers.filter((signer) => signer.publicKey.trim().length > 0);
  if (!populated.length) {
    return "";
  }

  return signers
    .map((signer) => {
      const key = signer.publicKey.trim() || "pending";
      const backup = signer.backupProcedureDocumented ? "backup documented" : "backup pending";
      return `Slot ${signer.slot} (${signer.role}): ${key} · ${backup}`;
    })
    .join("\n");
}

function summarizePostTransferReadouts(authorityTransfers: CustodyAuthorityTransferEvidence[]) {
  const populated = authorityTransfers.filter(
    (transfer) =>
      transfer.postTransferReadout.trim().length > 0 ||
      transfer.postTransferReadoutReferenceUrl.trim().length > 0,
  );
  if (!populated.length) {
    return "";
  }

  return authorityTransfers
    .map((transfer) => {
      const readout = transfer.postTransferReadout.trim() || "pending";
      const reference = transfer.postTransferReadoutReferenceUrl.trim() || "pending";
      return `${transfer.surface}: ${readout} [${reference}]`;
    })
    .join("\n");
}

function synchronizeEvidence(evidence: CustodyEvidence): CustodyEvidence {
  const upgradeTransfer = findAuthorityTransfer(evidence.authorityTransfers, "program-upgrade-authority");
  const treasuryTransfer = findAuthorityTransfer(evidence.authorityTransfers, "treasury-operator-authority");

  return {
    ...evidence,
    multisigAddress: evidence.multisigAddress.trim() || evidence.multisigAddress,
    threshold: evidence.threshold.trim() || "2-of-3",
    signerRoster: summarizeSignerRoster(evidence.signers) || evidence.signerRoster,
    upgradeTransferSignature:
      upgradeTransfer.transferSignature.trim() || evidence.upgradeTransferSignature,
    treasuryTransferSignature:
      treasuryTransfer.transferSignature.trim() || evidence.treasuryTransferSignature,
    postTransferReadouts:
      summarizePostTransferReadouts(evidence.authorityTransfers) || evidence.postTransferReadouts,
  };
}

function normalizeSigners(signers?: Partial<CustodySignerEvidence>[]) {
  return custodySignerSlots.map((slot) => {
    const existing = signers?.find((signer) => signer.slot === slot.slot);
    return {
      slot: slot.slot,
      role: slot.role,
      publicKey: existing?.publicKey?.trim() ?? "",
      storageClass: "cold-or-hardware" as const,
      backupProcedureDocumented: existing?.backupProcedureDocumented ?? false,
    };
  });
}

function normalizeAuthorityTransfers(authorityTransfers?: Partial<CustodyAuthorityTransferEvidence>[]) {
  return custodyAuthorityTransferSurfaces.map((surface) => {
    const existing = authorityTransfers?.find((transfer) => transfer.surface === surface);
    return {
      surface,
      programId: existing?.programId?.trim() || custodyProgramId,
      destinationAuthority: existing?.destinationAuthority?.trim() ?? "",
      transferSignature: existing?.transferSignature?.trim() ?? "",
      postTransferReadout: existing?.postTransferReadout?.trim() ?? "",
      postTransferReadoutReferenceUrl: existing?.postTransferReadoutReferenceUrl?.trim() ?? "",
    };
  });
}

function normalizeCustodyEvidence(parsed?: RawCustodyEvidence) {
  const normalized: CustodyEvidence = {
    ...emptyCustodyEvidence,
    multisigAddress: parsed?.multisigAddress?.trim() ?? "",
    threshold: parsed?.threshold?.trim() || "2-of-3",
    signerRoster: parsed?.signerRoster?.trim() ?? "",
    upgradeTransferSignature: parsed?.upgradeTransferSignature?.trim() ?? "",
    treasuryTransferSignature: parsed?.treasuryTransferSignature?.trim() ?? "",
    postTransferReadouts: parsed?.postTransferReadouts?.trim() ?? "",
    multisigImplementation:
      typeof parsed?.multisigImplementation === "string"
        ? parsed.multisigImplementation.trim() || "pending-selection"
        : "pending-selection",
    multisigCreationSignature:
      typeof parsed?.multisigCreationSignature === "string"
        ? parsed.multisigCreationSignature.trim()
        : "",
    rehearsalSignature:
      typeof parsed?.rehearsalSignature === "string"
        ? parsed.rehearsalSignature.trim()
        : "",
    timelockConfiguredHours:
      typeof parsed?.timelockConfiguredHours === "string"
        ? parsed.timelockConfiguredHours.trim()
        : "",
    timelockConfigurationSignature:
      typeof parsed?.timelockConfigurationSignature === "string"
        ? parsed.timelockConfigurationSignature.trim()
        : "",
    timelockConfigurationReferenceUrl:
      typeof parsed?.timelockConfigurationReferenceUrl === "string"
        ? parsed.timelockConfigurationReferenceUrl.trim()
        : "",
    signers: Array.isArray(parsed?.signers) ? normalizeSigners(parsed.signers) : createEmptySigners(),
    authorityTransfers: Array.isArray(parsed?.authorityTransfers)
      ? normalizeAuthorityTransfers(parsed.authorityTransfers)
      : createEmptyAuthorityTransfers(),
  };

  return synchronizeEvidence(normalized);
}

function mergeCustodyEvidenceWithCurrent(parsed: RawCustodyEvidence) {
  const parsedSigners = Array.isArray(parsed.signers) ? parsed.signers : [];
  const parsedTransfers = Array.isArray(parsed.authorityTransfers) ? parsed.authorityTransfers : [];

  return normalizeCustodyEvidence({
    ...currentTestnetCustodyEvidence,
    ...parsed,
    signers: currentTestnetCustodyEvidence.signers.map((currentSigner) => {
      const parsedSigner = parsedSigners.find((signer) => signer.slot === currentSigner.slot);
      return {
        ...currentSigner,
        ...parsedSigner,
        publicKey: parsedSigner?.publicKey?.trim() || currentSigner.publicKey,
        backupProcedureDocumented:
          parsedSigner?.backupProcedureDocumented ?? currentSigner.backupProcedureDocumented,
      };
    }),
    authorityTransfers: currentTestnetCustodyEvidence.authorityTransfers.map((currentTransfer) => {
      const parsedTransfer = parsedTransfers.find((transfer) => transfer.surface === currentTransfer.surface);
      return {
        ...currentTransfer,
        ...parsedTransfer,
        destinationAuthority:
          parsedTransfer?.destinationAuthority?.trim() || currentTransfer.destinationAuthority,
        transferSignature:
          parsedTransfer?.transferSignature?.trim() || currentTransfer.transferSignature,
        postTransferReadout:
          parsedTransfer?.postTransferReadout?.trim() || currentTransfer.postTransferReadout,
        postTransferReadoutReferenceUrl:
          parsedTransfer?.postTransferReadoutReferenceUrl?.trim() ||
          currentTransfer.postTransferReadoutReferenceUrl,
      };
    }),
  });
}

export function readCustodyEvidence(): CustodyEvidence {
  if (typeof window === "undefined") {
    return currentTestnetCustodyEvidence;
  }

  try {
    const raw = window.localStorage.getItem(custodyEvidenceStorageKey);
    if (!raw) return currentTestnetCustodyEvidence;
    return mergeCustodyEvidenceWithCurrent(JSON.parse(raw) as RawCustodyEvidence);
  } catch {
    return currentTestnetCustodyEvidence;
  }
}

export function writeCustodyEvidence(evidence: CustodyEvidence) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const normalized = normalizeCustodyEvidence(evidence);
    window.localStorage.setItem(custodyEvidenceStorageKey, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent(custodyEvidenceUpdatedEvent, { detail: normalized }));
  } catch {
    // ignore storage issues in constrained browsers
  }
}

export function getCustodyEvidenceCompletion(evidence: CustodyEvidence) {
  const upgradeTransfer = findAuthorityTransfer(evidence.authorityTransfers, "program-upgrade-authority");
  const treasuryTransfer = findAuthorityTransfer(evidence.authorityTransfers, "treasury-operator-authority");
  const allTransfersHaveReadouts = evidence.authorityTransfers.every(
    (transfer) =>
      transfer.postTransferReadout.trim().length > 0 &&
      looksLikeReference(transfer.postTransferReadoutReferenceUrl),
  );

  const checks = {
    multisigAddress:
      evidence.multisigImplementation.trim().length > 0 &&
      evidence.multisigImplementation !== "pending-selection" &&
      looksLikeSolanaAddress(evidence.multisigAddress) &&
      looksLikeSolanaSignature(evidence.multisigCreationSignature),
    threshold:
      normalizeThreshold(evidence.threshold) === "2-of-3" &&
      Number(evidence.timelockConfiguredHours) >= 48 &&
      looksLikeSolanaSignature(evidence.timelockConfigurationSignature) &&
      looksLikeReference(evidence.timelockConfigurationReferenceUrl),
    signerRoster: evidence.signers.every(
      (signer) =>
        looksLikeSolanaAddress(signer.publicKey) &&
        signer.storageClass === "cold-or-hardware" &&
        signer.backupProcedureDocumented,
    ),
    upgradeTransferSignature:
      looksLikeSolanaAddress(upgradeTransfer.destinationAuthority) &&
      looksLikeSolanaSignature(upgradeTransfer.transferSignature),
    treasuryTransferSignature:
      looksLikeSolanaAddress(treasuryTransfer.destinationAuthority) &&
      looksLikeSolanaSignature(treasuryTransfer.transferSignature),
    postTransferReadouts: allTransfersHaveReadouts,
  };

  const completed = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;

  return {
    checks,
    completed,
    total,
    ratio: completed / total,
  };
}

function resolveCustodyIngestionStatus(evidence: CustodyEvidence) {
  const completion = getCustodyEvidenceCompletion(evidence);
  if (completion.completed === completion.total) {
    return "complete";
  }

  const anyStructuredProgress =
    evidence.multisigImplementation !== "pending-selection" ||
    evidence.multisigAddress.trim().length > 0 ||
    evidence.signers.some((signer) => signer.publicKey.trim().length > 0) ||
    evidence.authorityTransfers.some(
      (transfer) =>
        transfer.destinationAuthority.trim().length > 0 ||
        transfer.transferSignature.trim().length > 0 ||
        transfer.postTransferReadout.trim().length > 0,
    );

  return anyStructuredProgress ? "ready-for-transfer" : "external-ceremony-gate";
}

export function buildCustodyEvidenceIntakePayload(evidence: CustodyEvidence) {
  const normalized = normalizeCustodyEvidence(evidence);

  return {
    schemaVersion: 1,
    project: "PrivateDAO",
    status: resolveCustodyIngestionStatus(normalized),
    productionMainnetClaimAllowed: false,
    network: "mainnet-beta",
    custodyTarget: "program-upgrade-authority-and-production-ops-authorities",
    multisig: {
      requiredThreshold: 2,
      requiredSignerCount: 3,
      implementation: normalized.multisigImplementation || "pending-selection",
      address: normalized.multisigAddress.trim() || null,
      creationSignature: normalized.multisigCreationSignature.trim() || null,
      rehearsalSignature: normalized.rehearsalSignature.trim() || null,
    },
    timelock: {
      minimumHours: 48,
      configuredHours: normalized.timelockConfiguredHours.trim()
        ? Number(normalized.timelockConfiguredHours)
        : null,
      configurationSignature: normalized.timelockConfigurationSignature.trim() || null,
      configurationReferenceUrl: normalized.timelockConfigurationReferenceUrl.trim() || null,
      shorteningPolicy: "must-not-shorten-without-documented-governance-policy",
    },
    signers: normalized.signers.map((signer) => ({
      slot: signer.slot,
      role: signer.role,
      publicKey: signer.publicKey.trim() || null,
      storageClass: signer.storageClass,
      backupProcedureDocumented: signer.backupProcedureDocumented,
    })),
    authorityTransfers: normalized.authorityTransfers.map((transfer) => ({
      surface: transfer.surface,
      programId: transfer.programId,
      destinationAuthority: transfer.destinationAuthority.trim() || null,
      transferSignature: transfer.transferSignature.trim() || null,
      postTransferReadout: transfer.postTransferReadout.trim() || null,
      postTransferReadoutReferenceUrl: transfer.postTransferReadoutReferenceUrl.trim() || null,
    })),
    backupProcedures: {
      seedPhrasesInRepository: false,
      privateKeysInRepository: false,
      hardwareOrColdStorageRequired: true,
      signerReplacementProcedureDocumented: true,
      releasePacketBackupRequired: true,
    },
    completionRule:
      "This intake is not complete until the multisig address, 3 public signer keys, 2-of-3 threshold, 48+ hour timelock configuration, rehearsal signature, transfer signatures, and post-transfer authority readouts are recorded. Never add seed phrases or private keys here.",
  };
}

export function buildCustodyEvidenceJson(evidence: CustodyEvidence) {
  return `${JSON.stringify(buildCustodyEvidenceIntakePayload(evidence), null, 2)}\n`;
}

export function buildCustodyEvidenceMarkdown(evidence: CustodyEvidence) {
  const payload = buildCustodyEvidenceIntakePayload(evidence);

  return [
    "# PrivateDAO Custody Evidence Intake",
    "",
    "This packet is structured to map directly into `docs/multisig-setup-intake.json`.",
    "It must contain only public keys, public transaction signatures, and reviewer-safe readout references.",
    "",
    `- status: \`${payload.status}\``,
    `- threshold: \`${payload.multisig.requiredThreshold}-of-${payload.multisig.requiredSignerCount}\``,
    `- multisig implementation: \`${payload.multisig.implementation}\``,
    `- multisig address: \`${payload.multisig.address ?? "pending"}\``,
    `- timelock configured hours: \`${payload.timelock.configuredHours ?? "pending"}\``,
    "",
    "## Signers",
    "",
    ...payload.signers.map(
      (signer) =>
        `- Slot ${signer.slot} (${signer.role}): \`${signer.publicKey ?? "pending"}\` · backup documented: \`${signer.backupProcedureDocumented}\``,
    ),
    "",
    "## Authority transfers",
    "",
    ...payload.authorityTransfers.map(
      (transfer) =>
        `- ${transfer.surface}: destination=\`${transfer.destinationAuthority ?? "pending"}\`, tx=\`${transfer.transferSignature ?? "pending"}\`, readout ref=\`${transfer.postTransferReadoutReferenceUrl ?? "pending"}\``,
    ),
    "",
    "## Apply in repo",
    "",
    "1. Save the JSON packet as `docs/custody-evidence-intake.json`.",
    "2. Run `npm run apply:custody-evidence-intake`.",
    "3. Review the rebuilt canonical custody proof and launch trust packet.",
    "",
    "Never place seed phrases, private keys, or hot-wallet exports in this packet.",
    "",
  ].join("\n");
}

export function buildCustodyNarrative(evidence: CustodyEvidence) {
  const completion = getCustodyEvidenceCompletion(evidence);

  if (completion.completed === 0) {
    return {
      headline: "Custody workflow exists, but no structured ceremony evidence is recorded yet.",
      summary:
        "The product now exposes a strict custody ingestion path, but the mainnet boundary stays blocked until real multisig details, signer keys, transfer signatures, and readout references are recorded.",
      badge: "Pending external",
    };
  }

  if (completion.completed < completion.total) {
    return {
      headline: `Structured custody evidence is partially recorded: ${completion.completed}/${completion.total} gates passed.`,
      summary:
        "Reviewer confidence improves once the packet is structured and reproducible, but the launch boundary must remain explicit until every signer, transfer, and readout reference is complete.",
      badge: "Partially evidenced",
    };
  }

  return {
    headline: "Structured custody evidence packet is fully populated and ready to apply.",
    summary:
      "The remaining task is operational, not editorial: place the packet into the repo-backed intake, run the apply command, and confirm the rebuilt custody proof and launch trust packet.",
    badge: "Ready to apply",
  };
}
