import { readRepoJson } from "@/lib/repo-docs";

type MultisigSetupIntake = {
  status: string;
  productionMainnetClaimAllowed: boolean;
  network: string;
  rehearsalSource?: {
    network: string;
    implementation?: string | null;
    multisigAddress: string | null;
    creationSignature: string | null;
  };
  multisig: {
    requiredThreshold: number;
    requiredSignerCount: number;
    implementation: string | null;
    address: string | null;
    creationSignature: string | null;
    rehearsalSignature: string | null;
  };
  timelock: {
    minimumHours: number;
    configuredHours: number | null;
    configurationSignature: string | null;
    configurationReferenceUrl?: string | null;
  };
  signers: Array<{
    slot: number;
    role: string;
    publicKey: string | null;
    storageClass: string;
    backupProcedureDocumented: boolean;
  }>;
  authorityTransfers: Array<{
    surface: string;
    programId: string;
    destinationAuthority: string | null;
    transferSignature: string | null;
    postTransferReadout: string | null;
    postTransferReadoutReferenceUrl?: string | null;
  }>;
};

type MainnetBlockerRegister = {
  summary: string;
  blockers: Array<{
    id: string;
    category: string;
    severity: string;
    status: string;
    nextAction: string;
    evidence: string[];
  }>;
};

type CustodyObservedReadouts = {
  schemaVersion: number;
  project: string;
  targetNetwork: string;
  targetProgramId: string;
  observedReadouts: Array<{
    id: string;
    label: string;
    cluster: string;
    status: string;
    address: string;
    explorerUrl: string | null;
    observedAt: string;
    command: string;
    owner: string | null;
    authority: string | null;
    programDataAddress: string | null;
    lastDeploySlot: number | null;
    balanceSol: string | null;
    executable: boolean | null;
    error: string | null;
    note: string | null;
  }>;
};

export type CustodyProofLink = {
  label: string;
  href: string;
};

export type CanonicalCustodyProofSnapshot = {
  status: string;
  productionMainnetClaimAllowed: boolean;
  network: string;
  summary: string;
  multisig: {
    rehearsalSource: {
      network: string | null;
      implementation: string | null;
      address: string | null;
      addressExplorerUrl: string | null;
      creationSignature: string | null;
      creationExplorerUrl: string | null;
    };
    implementation: string | null;
    address: string | null;
    addressExplorerUrl: string | null;
    threshold: string;
    creationSignature: string | null;
    creationExplorerUrl: string | null;
    rehearsalSignature: string | null;
    rehearsalExplorerUrl: string | null;
  };
  timelock: {
    minimumHours: number;
    configuredHours: number | null;
    configurationSignature: string | null;
    configurationExplorerUrl: string | null;
    configurationReferenceUrl: string | null;
  };
  signers: Array<{
    slot: number;
    role: string;
    publicKey: string | null;
    publicKeyExplorerUrl: string | null;
    storageClass: string;
    backupProcedureDocumented: boolean;
  }>;
  authorityTransfers: Array<{
    surface: string;
    programId: string;
    programExplorerUrl: string;
    destinationAuthority: string | null;
    destinationExplorerUrl: string | null;
    transferSignature: string | null;
    transferExplorerUrl: string | null;
    postTransferReadout: string | null;
    postTransferReadoutReferenceUrl: string | null;
  }>;
  observedReadouts: CustodyObservedReadouts["observedReadouts"];
  completedItems: number;
  totalItems: number;
  pendingItems: string[];
  blocker: {
    id: string;
    severity: string;
    status: string;
    nextAction: string;
    evidence: string[];
  };
  rawSources: CustodyProofLink[];
};

function readJson<T>(relativePath: string): T {
  return readRepoJson<T>(relativePath);
}

function getClusterSuffix(network: string) {
  if (network === "mainnet-beta") {
    return "";
  }
  return `?cluster=${network}`;
}

function buildExplorerTxUrl(signature: string | null, network: string) {
  if (!signature) return null;
  return `https://explorer.solana.com/tx/${signature}${getClusterSuffix(network)}`;
}

function buildExplorerAccountUrl(address: string | null, network: string) {
  if (!address) return null;
  return `https://explorer.solana.com/address/${address}${getClusterSuffix(network)}`;
}

function prettySurface(surface: string) {
  return surface.split("-").join(" ");
}

export function getCanonicalCustodyProofSnapshot(): CanonicalCustodyProofSnapshot {
  const intake = readJson<MultisigSetupIntake>("docs/multisig-setup-intake.json");
  const blockers = readJson<MainnetBlockerRegister>("docs/mainnet-blockers.json");
  const observedReadouts = readJson<CustodyObservedReadouts>("docs/custody-observed-readouts.json");
  const custodyBlocker = blockers.blockers.find(
    (item) => item.id === "upgrade-authority-multisig",
  );

  if (!custodyBlocker) {
    throw new Error("Missing upgrade-authority-multisig blocker in mainnet-blockers.json");
  }

  const pendingItems: string[] = [];

  if (!intake.multisig.implementation || intake.multisig.implementation === "pending-selection") {
    pendingItems.push("chosen multisig implementation");
  }
  if (!intake.multisig.address) {
    pendingItems.push("multisig public address");
  }
  if (!intake.multisig.creationSignature) {
    pendingItems.push("multisig creation signature");
  }
  if (!intake.multisig.rehearsalSignature) {
    pendingItems.push("rehearsal signature");
  }
  if (!intake.timelock.configuredHours || intake.timelock.configuredHours < intake.timelock.minimumHours) {
    pendingItems.push(`timelock configuration of at least ${intake.timelock.minimumHours} hours`);
  }
  if (!intake.timelock.configurationSignature) {
    pendingItems.push("timelock configuration signature or readout");
  }
  if (intake.timelock.configurationSignature && !intake.timelock.configurationReferenceUrl) {
    pendingItems.push("timelock configuration reference url");
  }

  intake.signers.forEach((signer) => {
    if (!signer.publicKey) {
      pendingItems.push(`signer slot ${signer.slot} public key`);
    }
    if (!signer.backupProcedureDocumented) {
      pendingItems.push(`backup procedure for signer slot ${signer.slot}`);
    }
  });

  intake.authorityTransfers.forEach((transfer) => {
    if (!transfer.destinationAuthority) {
      pendingItems.push(`${prettySurface(transfer.surface)} destination authority`);
    }
    if (!transfer.transferSignature) {
      pendingItems.push(`${prettySurface(transfer.surface)} transfer signature`);
    }
    if (!transfer.postTransferReadout) {
      pendingItems.push(`${prettySurface(transfer.surface)} post-transfer readout`);
    }
    if (!transfer.postTransferReadoutReferenceUrl) {
      pendingItems.push(`${prettySurface(transfer.surface)} post-transfer readout reference`);
    }
  });

  const totalItems =
    7 +
    intake.signers.length * 2 +
    intake.authorityTransfers.length * 4;
  const completedItems = totalItems - pendingItems.length;

  return {
    status: intake.status,
    productionMainnetClaimAllowed: intake.productionMainnetClaimAllowed,
    network: intake.network,
    summary: blockers.summary,
    multisig: {
      rehearsalSource: {
        network: intake.rehearsalSource?.network ?? null,
        implementation: intake.rehearsalSource?.implementation ?? intake.multisig.implementation,
        address: intake.rehearsalSource?.multisigAddress ?? null,
        addressExplorerUrl: buildExplorerAccountUrl(
          intake.rehearsalSource?.multisigAddress ?? null,
          intake.rehearsalSource?.network ?? "devnet",
        ),
        creationSignature: intake.rehearsalSource?.creationSignature ?? null,
        creationExplorerUrl: buildExplorerTxUrl(
          intake.rehearsalSource?.creationSignature ?? null,
          intake.rehearsalSource?.network ?? "devnet",
        ),
      },
      implementation: intake.multisig.implementation,
      address: intake.multisig.address,
      addressExplorerUrl: buildExplorerAccountUrl(intake.multisig.address, intake.network),
      threshold: `${intake.multisig.requiredThreshold}-of-${intake.multisig.requiredSignerCount}`,
      creationSignature: intake.multisig.creationSignature,
      creationExplorerUrl: buildExplorerTxUrl(intake.multisig.creationSignature, intake.network),
      rehearsalSignature: intake.multisig.rehearsalSignature,
      rehearsalExplorerUrl: buildExplorerTxUrl(intake.multisig.rehearsalSignature, intake.network),
    },
    timelock: {
      minimumHours: intake.timelock.minimumHours,
      configuredHours: intake.timelock.configuredHours,
      configurationSignature: intake.timelock.configurationSignature,
      configurationExplorerUrl: buildExplorerTxUrl(
        intake.timelock.configurationSignature,
        intake.network,
      ),
      configurationReferenceUrl: intake.timelock.configurationReferenceUrl ?? null,
    },
    signers: intake.signers.map((signer) => ({
      ...signer,
      publicKeyExplorerUrl: buildExplorerAccountUrl(signer.publicKey, intake.network),
    })),
    authorityTransfers: intake.authorityTransfers.map((transfer) => ({
      ...transfer,
      programExplorerUrl: buildExplorerAccountUrl(transfer.programId, intake.network) ?? "",
      destinationExplorerUrl: buildExplorerAccountUrl(
        transfer.destinationAuthority,
        intake.network,
      ),
      transferExplorerUrl: buildExplorerTxUrl(transfer.transferSignature, intake.network),
      postTransferReadoutReferenceUrl: transfer.postTransferReadoutReferenceUrl ?? null,
    })),
    observedReadouts: observedReadouts.observedReadouts,
    completedItems,
    totalItems,
    pendingItems,
    blocker: {
      id: custodyBlocker.id,
      severity: custodyBlocker.severity,
      status: custodyBlocker.status,
      nextAction: custodyBlocker.nextAction,
      evidence: custodyBlocker.evidence,
    },
    rawSources: [
      {
        label: "Canonical intake JSON",
        href: "https://github.com/X-PACT/PrivateDAO/blob/main/docs/multisig-setup-intake.json",
      },
      {
        label: "Observed custody readouts",
        href: "https://github.com/X-PACT/PrivateDAO/blob/main/docs/custody-observed-readouts.json",
      },
      {
        label: "Canonical custody proof packet",
        href: "https://github.com/X-PACT/PrivateDAO/blob/main/docs/canonical-custody-proof.generated.md",
      },
      {
        label: "Production custody ceremony",
        href: "https://github.com/X-PACT/PrivateDAO/blob/main/docs/production-custody-ceremony.md",
      },
      {
        label: "Squads custody ceremony reference",
        href: "https://github.com/X-PACT/PrivateDAO/blob/main/docs/squads-devnet-multisig-ceremony.md",
      },
      {
        label: "Custody intake template",
        href: "https://github.com/X-PACT/PrivateDAO/blob/main/docs/custody-evidence-intake.template.json",
      },
      {
        label: "Authority transfer runbook",
        href: "https://github.com/X-PACT/PrivateDAO/blob/main/docs/authority-transfer-runbook.md",
      },
      {
        label: "Launch trust packet",
        href: "https://github.com/X-PACT/PrivateDAO/blob/main/docs/launch-trust-packet.generated.md",
      },
      {
        label: "Mainnet blocker register",
        href: "https://github.com/X-PACT/PrivateDAO/blob/main/docs/mainnet-blockers.md",
      },
    ],
  };
}
