import fs from "fs";
import path from "path";

function resolveExpectedCluster() {
  const raw = (process.env.SOLANA_CLUSTER || process.env.NEXT_PUBLIC_SOLANA_NETWORK || "testnet").toLowerCase();
  return raw === "devnet" ? "devnet" : "testnet";
}

function main() {
  const expectedCluster = resolveExpectedCluster();
  const auditPacketPath = path.resolve("docs/audit-packet.generated.md");
  const proofRegistryPath = path.resolve("docs/proof-registry.json");
  const attestationPath = path.resolve("docs/review-attestation.generated.json");
  const cryptographicManifestPath = path.resolve("docs/cryptographic-manifest.generated.json");
  const zkRegistryPath = path.resolve("docs/zk-registry.generated.json");
  const zkTranscriptPath = path.resolve("docs/zk-transcript.generated.md");
  const zkAttestationPath = path.resolve("docs/zk-attestation.generated.json");
  const mainnetReadinessReportPath = path.resolve("docs/mainnet-readiness.generated.md");
  const deploymentAttestationPath = path.resolve("docs/deployment-attestation.generated.json");
  const goLiveAttestationPath = path.resolve("docs/go-live-attestation.generated.json");
  const releaseCeremonyJsonPath = path.resolve("docs/release-ceremony-attestation.generated.json");
  const releaseCeremonyMdPath = path.resolve("docs/release-ceremony-attestation.generated.md");
  const canonicalCustodyProofJsonPath = path.resolve("docs/canonical-custody-proof.generated.json");
  const canonicalCustodyProofMdPath = path.resolve("docs/canonical-custody-proof.generated.md");
  const trackJudgeFirstOpeningsJsonPath = path.resolve("docs/track-judge-first-openings.generated.json");
  const trackJudgeFirstOpeningsMdPath = path.resolve("docs/track-judge-first-openings.generated.md");
  const trackReviewerPackets = [
    "colosseum-frontier",
    "privacy-track",
    "rpc-infrastructure",
  ].flatMap((slug) => [
    path.resolve(`docs/track-reviewer-packets/${slug}.generated.json`),
    path.resolve(`docs/track-reviewer-packets/${slug}.generated.md`),
  ]);
  const custodyReviewerPacketJsonPath = path.resolve("docs/custody-proof-reviewer-packet.generated.json");
  const custodyReviewerPacketMdPath = path.resolve("docs/custody-proof-reviewer-packet.generated.md");
  const treasuryReviewerPacketJsonPath = path.resolve("docs/treasury-reviewer-packet.generated.json");
  const treasuryReviewerPacketMdPath = path.resolve("docs/treasury-reviewer-packet.generated.md");
  const reviewerTelemetryPacketJsonPath = path.resolve("docs/reviewer-telemetry-packet.generated.json");
  const reviewerTelemetryPacketMdPath = path.resolve("docs/reviewer-telemetry-packet.generated.md");
  const ecosystemFocusAlignmentJsonPath = path.resolve("docs/ecosystem-focus-alignment.generated.json");
  const ecosystemFocusAlignmentMdPath = path.resolve("docs/ecosystem-focus-alignment.generated.md");
  const runtimeAttestationPath = path.resolve("docs/runtime-attestation.generated.json");
  const readNodeSnapshotJsonPath = path.resolve("docs/read-node/snapshot.generated.json");
  const readNodeSnapshotMdPath = path.resolve("docs/read-node/snapshot.generated.md");
  const frontierIntegrationsJsonPath = path.resolve("docs/frontier-integrations.generated.json");
  const frontierIntegrationsMdPath = path.resolve("docs/frontier-integrations.generated.md");
  const colosseumCompetitiveSourcePath = path.resolve("docs/competitive/source.json");
  const colosseumCompetitiveJsonPath = path.resolve("docs/competitive/analysis.generated.json");
  const colosseumCompetitiveMdPath = path.resolve("docs/competitive/analysis.generated.md");
  const realDeviceRuntimeSourcePath = path.resolve("docs/runtime/real-device-captures.json");
  const realDeviceRuntimeJsonPath = path.resolve("docs/runtime/real-device.generated.json");
  const realDeviceRuntimeMdPath = path.resolve("docs/runtime/real-device.generated.md");
  const magicBlockRuntimeSourcePath = path.resolve("docs/magicblock/runtime-captures.json");
  const magicBlockRuntimeJsonPath = path.resolve("docs/magicblock/runtime.generated.json");
  const magicBlockRuntimeMdPath = path.resolve("docs/magicblock/runtime.generated.md");
  const zkEnforcedRuntimeSourcePath = path.resolve("docs/zk/enforced-runtime-captures.json");
  const zkEnforcedRuntimeJsonPath = path.resolve("docs/zk/enforced-runtime.generated.json");
  const zkEnforcedRuntimeMdPath = path.resolve("docs/zk/enforced-runtime.generated.md");
  const zkExternalClosureSourcePath = path.resolve("docs/zk/external-closure.json");
  const zkExternalClosureJsonPath = path.resolve("docs/zk/external-closure.generated.json");
  const zkExternalClosureMdPath = path.resolve("docs/zk/external-closure.generated.md");
  const runtimeEvidenceJsonPath = path.resolve("docs/runtime-evidence.generated.json");
  const runtimeEvidenceMdPath = path.resolve("docs/runtime-evidence.generated.md");
  const operationalEvidenceJsonPath = path.resolve("docs/operational-evidence.generated.json");
  const operationalEvidenceMdPath = path.resolve("docs/operational-evidence.generated.md");
  const mainnetAcceptanceJsonPath = path.resolve("docs/mainnet-acceptance-matrix.generated.json");
  const mainnetAcceptanceMdPath = path.resolve("docs/mainnet-acceptance-matrix.generated.md");
  const mainnetProofPackageJsonPath = path.resolve("docs/mainnet-proof-package.generated.json");
  const mainnetProofPackageMdPath = path.resolve("docs/mainnet-proof-package.generated.md");
  const releaseDrillJsonPath = path.resolve("docs/release-drill.generated.json");
  const releaseDrillMdPath = path.resolve("docs/release-drill.generated.md");
  const pdaoAttestationPath = path.resolve("docs/pdao-attestation.generated.json");
  const walletMatrixJsonPath = path.resolve("docs/wallet-compatibility-matrix.generated.json");
  const walletMatrixMdPath = path.resolve("docs/wallet-compatibility-matrix.generated.md");
  const devnetCanaryJsonPath = path.resolve("docs/devnet-canary.generated.json");
  const devnetCanaryMdPath = path.resolve("docs/devnet-canary.generated.md");
  const supplyChainJsonPath = path.resolve("docs/supply-chain-attestation.generated.json");
  const supplyChainMdPath = path.resolve("docs/supply-chain-attestation.generated.md");
  const devnetWalletRegistryPath = path.resolve("docs/devnet-wallet-registry.json");
  const devnetBootstrapPath = path.resolve("docs/devnet-bootstrap.json");
  const devnetTxRegistryPath = path.resolve("docs/devnet-tx-registry.json");
  const adversarialReportPath = path.resolve("docs/adversarial-report.json");
  const zkProofRegistryPath = path.resolve("docs/zk-proof-registry.json");
  const performanceMetricsPath = path.resolve("docs/performance-metrics.json");
  const loadTestReportPath = path.resolve("docs/load-test-report.md");
  const devnetMultiProposalReportJsonPath = path.resolve("docs/devnet-multi-proposal-report.json");
  const devnetMultiProposalReportMdPath = path.resolve("docs/devnet-multi-proposal-report.md");
  const devnetRaceReportJsonPath = path.resolve("docs/devnet-race-report.json");
  const devnetRaceReportMdPath = path.resolve("docs/devnet-race-report.md");
  const devnetResilienceReportJsonPath = path.resolve("docs/devnet-resilience-report.json");
  const devnetResilienceReportMdPath = path.resolve("docs/devnet-resilience-report.md");

  if (!fs.existsSync(auditPacketPath)) {
    throw new Error("missing generated audit packet");
  }
  if (!fs.existsSync(proofRegistryPath)) {
    throw new Error("missing proof registry");
  }
  if (!fs.existsSync(attestationPath)) {
    throw new Error("missing generated review attestation");
  }
  if (!fs.existsSync(cryptographicManifestPath)) {
    throw new Error("missing generated cryptographic manifest");
  }
  if (!fs.existsSync(zkRegistryPath)) {
    throw new Error("missing generated zk registry");
  }
  if (!fs.existsSync(zkTranscriptPath)) {
    throw new Error("missing generated zk transcript");
  }
  if (!fs.existsSync(zkAttestationPath)) {
    throw new Error("missing generated zk attestation");
  }
  if (!fs.existsSync(mainnetReadinessReportPath)) {
    throw new Error("missing generated mainnet readiness report");
  }
  if (!fs.existsSync(deploymentAttestationPath)) {
    throw new Error("missing generated deployment attestation");
  }
  if (!fs.existsSync(goLiveAttestationPath)) {
    throw new Error("missing generated go-live attestation");
  }
  if (!fs.existsSync(releaseCeremonyJsonPath) || !fs.existsSync(releaseCeremonyMdPath)) {
    throw new Error("missing release ceremony attestation artifacts");
  }
  if (!fs.existsSync(canonicalCustodyProofJsonPath) || !fs.existsSync(canonicalCustodyProofMdPath)) {
    throw new Error("missing canonical custody proof artifacts");
  }
  if (!fs.existsSync(trackJudgeFirstOpeningsJsonPath) || !fs.existsSync(trackJudgeFirstOpeningsMdPath)) {
    throw new Error("missing track judge-first openings artifacts");
  }
  if (trackReviewerPackets.some((filePath) => !fs.existsSync(filePath))) {
    throw new Error("missing track reviewer packet artifacts");
  }
  if (!fs.existsSync(custodyReviewerPacketJsonPath) || !fs.existsSync(custodyReviewerPacketMdPath)) {
    throw new Error("missing custody proof reviewer packet artifacts");
  }
  if (!fs.existsSync(treasuryReviewerPacketJsonPath) || !fs.existsSync(treasuryReviewerPacketMdPath)) {
    throw new Error("missing treasury reviewer packet artifacts");
  }
  if (!fs.existsSync(reviewerTelemetryPacketJsonPath) || !fs.existsSync(reviewerTelemetryPacketMdPath)) {
    throw new Error("missing reviewer telemetry packet artifacts");
  }
  if (!fs.existsSync(ecosystemFocusAlignmentJsonPath) || !fs.existsSync(ecosystemFocusAlignmentMdPath)) {
    throw new Error("missing ecosystem focus alignment artifacts");
  }
  if (!fs.existsSync(runtimeAttestationPath)) {
    throw new Error("missing generated runtime attestation");
  }
  if (!fs.existsSync(readNodeSnapshotJsonPath) || !fs.existsSync(readNodeSnapshotMdPath)) {
    throw new Error("missing read-node snapshot artifacts");
  }
  if (!fs.existsSync(frontierIntegrationsJsonPath) || !fs.existsSync(frontierIntegrationsMdPath)) {
    throw new Error("missing Frontier integration evidence artifacts");
  }
  if (!fs.existsSync(colosseumCompetitiveSourcePath) || !fs.existsSync(colosseumCompetitiveJsonPath) || !fs.existsSync(colosseumCompetitiveMdPath)) {
    throw new Error("missing Colosseum competitive analysis artifacts");
  }
  if (!fs.existsSync(realDeviceRuntimeSourcePath) || !fs.existsSync(realDeviceRuntimeJsonPath) || !fs.existsSync(realDeviceRuntimeMdPath)) {
    throw new Error("missing real-device runtime artifacts");
  }
  if (!fs.existsSync(magicBlockRuntimeSourcePath) || !fs.existsSync(magicBlockRuntimeJsonPath) || !fs.existsSync(magicBlockRuntimeMdPath)) {
    throw new Error("missing MagicBlock runtime artifacts");
  }
  if (!fs.existsSync(zkEnforcedRuntimeSourcePath) || !fs.existsSync(zkEnforcedRuntimeJsonPath) || !fs.existsSync(zkEnforcedRuntimeMdPath)) {
    throw new Error("missing zk-enforced runtime artifacts");
  }
  if (!fs.existsSync(zkExternalClosureSourcePath) || !fs.existsSync(zkExternalClosureJsonPath) || !fs.existsSync(zkExternalClosureMdPath)) {
    throw new Error("missing zk external closure artifacts");
  }
  if (!fs.existsSync(runtimeEvidenceJsonPath) || !fs.existsSync(runtimeEvidenceMdPath)) {
    throw new Error("missing generated runtime evidence artifacts");
  }
  if (!fs.existsSync(operationalEvidenceJsonPath) || !fs.existsSync(operationalEvidenceMdPath)) {
    throw new Error("missing generated operational evidence artifacts");
  }
  if (!fs.existsSync(mainnetAcceptanceJsonPath) || !fs.existsSync(mainnetAcceptanceMdPath)) {
    throw new Error("missing mainnet acceptance matrix artifacts");
  }
  if (!fs.existsSync(mainnetProofPackageJsonPath) || !fs.existsSync(mainnetProofPackageMdPath)) {
    throw new Error("missing mainnet proof package artifacts");
  }
  if (!fs.existsSync(releaseDrillJsonPath) || !fs.existsSync(releaseDrillMdPath)) {
    throw new Error("missing generated release drill artifacts");
  }
  if (!fs.existsSync(pdaoAttestationPath)) {
    throw new Error("missing generated PDAO attestation");
  }
  if (!fs.existsSync(walletMatrixJsonPath) || !fs.existsSync(walletMatrixMdPath)) {
    throw new Error("missing wallet compatibility matrix artifacts");
  }
  if (!fs.existsSync(devnetCanaryJsonPath) || !fs.existsSync(devnetCanaryMdPath)) {
    throw new Error("missing devnet canary artifacts");
  }
  if (!fs.existsSync(supplyChainJsonPath) || !fs.existsSync(supplyChainMdPath)) {
    throw new Error("missing supply-chain attestation artifacts");
  }
  if (!fs.existsSync(devnetWalletRegistryPath)) {
    throw new Error("missing devnet wallet registry");
  }
  if (!fs.existsSync(devnetBootstrapPath)) {
    throw new Error("missing devnet bootstrap report");
  }
  if (!fs.existsSync(devnetTxRegistryPath)) {
    throw new Error("missing devnet tx registry");
  }
  if (!fs.existsSync(adversarialReportPath)) {
    throw new Error("missing adversarial report");
  }
  if (!fs.existsSync(zkProofRegistryPath)) {
    throw new Error("missing zk proof registry");
  }
  if (!fs.existsSync(performanceMetricsPath)) {
    throw new Error("missing performance metrics report");
  }
  if (!fs.existsSync(loadTestReportPath)) {
    throw new Error("missing load test report");
  }
  if (!fs.existsSync(devnetMultiProposalReportJsonPath)) {
    throw new Error("missing devnet multi-proposal report");
  }
  if (!fs.existsSync(devnetMultiProposalReportMdPath)) {
    throw new Error("missing devnet multi-proposal markdown report");
  }
  if (!fs.existsSync(devnetRaceReportJsonPath)) {
    throw new Error("missing devnet race report");
  }
  if (!fs.existsSync(devnetRaceReportMdPath)) {
    throw new Error("missing devnet race markdown report");
  }
  if (!fs.existsSync(devnetResilienceReportJsonPath)) {
    throw new Error("missing devnet resilience report");
  }
  if (!fs.existsSync(devnetResilienceReportMdPath)) {
    throw new Error("missing devnet resilience markdown report");
  }

  const auditPacket = fs.readFileSync(auditPacketPath, "utf8");
  const proofRegistry = JSON.parse(fs.readFileSync(proofRegistryPath, "utf8")) as {
    governanceMint: string;
    pdaoToken?: {
      privateDaoProgramId?: string;
      mint: string;
      programId: string;
    };
  };
  const attestation = JSON.parse(fs.readFileSync(attestationPath, "utf8")) as {
    project: string;
    programId: string;
    verificationWallet: string;
    pdaoToken?: {
      mint: string;
      programId: string;
      tokenAccount: string;
      metadataUri: string;
      decimals: number;
      supplyUi: string;
      transactionLabels: string[];
    };
    gateCount: number;
    packageCounts: Record<string, number>;
    zk?: {
      stackVersion: number;
      entryCount: number;
      verificationDocs?: string[];
      layers: Array<{ layer: string; circuit: string; publicSignalCount: number }>;
    };
    runtimeDocs?: string[];
    securityDocs?: string[];
    operationsDocs?: string[];
    cryptographicIntegrity?: {
      algorithm: string;
      entryCount: number;
      aggregateSha256: string;
    };
  };
  const cryptographicManifest = JSON.parse(fs.readFileSync(cryptographicManifestPath, "utf8")) as {
    project: string;
    algorithm: string;
    entryCount: number;
    aggregateSha256: string;
    files: Array<{ path: string; sha256: string }>;
  };
  const zkRegistry = JSON.parse(fs.readFileSync(zkRegistryPath, "utf8")) as {
    project: string;
    zkStackVersion: number;
    entryCount: number;
    entries: Array<{ circuit: string; layer: string; publicSignalCount: number }>;
  };
  const zkTranscript = fs.readFileSync(zkTranscriptPath, "utf8");
  const mainnetReadinessReport = fs.readFileSync(mainnetReadinessReportPath, "utf8");
  const deploymentAttestation = JSON.parse(fs.readFileSync(deploymentAttestationPath, "utf8")) as {
    project: string;
    programId: string;
    verificationWallet: string;
    gateCount: number;
    runtimeDocs: string[];
  };
  const goLiveAttestation = JSON.parse(fs.readFileSync(goLiveAttestationPath, "utf8")) as {
    project: string;
    programId: string;
    verificationWallet: string;
    decision: string;
    criteriaDocs: string[];
    runtimeDocs: string[];
    blockers: Array<{ name: string; status: string }>;
  };
  const runtimeAttestation = JSON.parse(fs.readFileSync(runtimeAttestationPath, "utf8")) as {
    project: string;
    programId: string;
    verificationWallet: string;
    diagnosticsPage: string;
    runtimeDocs: string[];
    supportedWallets: Array<{ id: string; label: string }>;
  };
  const readNodeSnapshot = JSON.parse(fs.readFileSync(readNodeSnapshotJsonPath, "utf8")) as {
    readPath: string;
    runtime?: { programId?: string };
    counts?: { proposals?: number; confidentialPayouts?: number };
  };
  const readNodeSnapshotMd = fs.readFileSync(readNodeSnapshotMdPath, "utf8");
  const frontierIntegrations = JSON.parse(fs.readFileSync(frontierIntegrationsJsonPath, "utf8")) as {
    project: string;
    network?: string;
    programId: string;
    verificationWallet: string;
    readNode: {
      readPath: string;
      rpcEndpoint: string;
      rpcPoolSize: number;
      overview: { confidentialPayouts: number; magicblockSettled: number; refheSettled: number };
    };
    simpleGovernance: {
      txChecks: Array<{ confirmed: boolean }>;
      accountChecks?: Array<{ label: string; exists: boolean; executable?: boolean }>;
      lifecycleStatus: string;
      verificationStatus: string;
    };
    confidentialOperations: {
      txChecks: Array<{ confirmed: boolean }>;
      accountChecks?: Array<{ label: string; exists: boolean; executable?: boolean }>;
      status: string;
      refheStatus: string;
      magicblockStatus: string;
    };
    zk: { anchorCount: number; anchorChecks: Array<{ confirmed: boolean; account: { exists: boolean } }>; status: string };
    docs: string[];
    commands: string[];
  };
  const frontierIntegrationsMd = fs.readFileSync(frontierIntegrationsMdPath, "utf8");
  const runtimeEvidence = JSON.parse(fs.readFileSync(runtimeEvidenceJsonPath, "utf8")) as {
    project: string;
    programId: string;
    verificationWallet: string;
    diagnosticsPage: string;
    walletCount: number;
    walletLabels: string[];
    matrixStatuses: Array<{ id: string; label: string; status: string; diagnosticsVisible: boolean; selectorVisible: boolean }>;
    devnetCanary: { network: string; primaryHealthy: boolean; fallbackHealthy: boolean; anchorAccountsPresent: boolean; unexpectedFailures: number };
    resilience: { fallbackRecovered: boolean; staleBlockhashRecovered: boolean; staleBlockhashRejected: boolean; unexpectedFailures: number };
    operational: {
      walletCount: number;
      totalTxCount: number;
      totalAttemptCount: number;
      zkProofCount: number;
      adversarialScenarioCount: number;
      unexpectedAdversarialSuccesses: number;
      finalizeSingleWinner: boolean;
      executeSingleWinner: boolean;
      failoverRecovered: boolean;
      staleBlockhashRecovered: boolean;
    };
    docs: string[];
    commands: string[];
  };
  const zkEnforcedRuntime = JSON.parse(fs.readFileSync(zkEnforcedRuntimeJsonPath, "utf8")) as {
    project: string;
    network: string;
    summary: {
      targetCount: number;
      completedTargetCount: number;
      modeActivationSuccessCount: number;
      finalizeSuccessCount: number;
      diagnosticsCaptureCount: number;
      pendingTargets: string[];
    };
    targets: Array<{ id: string; walletLabel: string; environmentType: string; status: string }>;
    captures: Array<{
      walletLabel: string;
      environmentType: string;
      network: string;
      proposalPublicKey: string;
      receiptModes: { vote: string; delegation: string; tally: string };
      modeActivationResult: string;
      finalizeResult: string;
      diagnosticsSnapshotCaptured: boolean;
      enableModeTxSignature?: string | null;
      finalizeTxSignature?: string | null;
      explorerUrls?: { enableMode?: string | null; finalize?: string | null };
      capturedAt: string;
    }>;
    requiredDocs: string[];
    commands: string[];
    status: string;
  };
  const zkEnforcedRuntimeMd = fs.readFileSync(zkEnforcedRuntimeMdPath, "utf8");
  const operationalEvidence = JSON.parse(fs.readFileSync(operationalEvidenceJsonPath, "utf8")) as {
    project: string;
    network: string;
    transactionSummary: { walletCount: number; totalTxCount: number; totalAttemptCount: number };
    voting: { fullLifecycleReport: string; txRegistry: string };
    zk: {
      verificationMode: string;
      proofCount: number;
      onchainAnchorCount: number;
      onchainAnchorProposal: string | null;
    };
    adversarial: { totalScenarios: number; unexpectedSuccesses: number };
    resilience: { failoverRecovered: boolean; staleBlockhashRecovered: boolean };
    collisions: { finalizeSingleWinner: boolean; executeSingleWinner: boolean };
    docs: string[];
    commands: string[];
  };
  const runtimeEvidenceMd = fs.readFileSync(runtimeEvidenceMdPath, "utf8");
  const operationalEvidenceMd = fs.readFileSync(operationalEvidenceMdPath, "utf8");
  const mainnetAcceptance = JSON.parse(fs.readFileSync(mainnetAcceptanceJsonPath, "utf8")) as {
    project: string;
    programId: string;
    verificationWallet: string;
    acceptanceDecision: string;
    summary: { acceptedInRepo: number; pendingExternal: number; notInRepo: number; runtimeWalletCount: number };
    rows: Array<{ layer: string; status: string; evidence: string[]; rationale: string }>;
  };
  const mainnetAcceptanceMd = fs.readFileSync(mainnetAcceptanceMdPath, "utf8");
  const mainnetProofPackage = JSON.parse(fs.readFileSync(mainnetProofPackageJsonPath, "utf8")) as {
    project: string;
    packageDecision: string;
    coreArtifacts: string[];
    summary: { acceptedInRepo: number; pendingExternal: number; notInRepo: number };
    readinessAnchor: { project: string; programId: string; verificationWallet: string };
    commands: string[];
  };
  const mainnetProofPackageMd = fs.readFileSync(mainnetProofPackageMdPath, "utf8");
  const releaseDrill = JSON.parse(fs.readFileSync(releaseDrillJsonPath, "utf8")) as {
    project: string;
    mode: string;
    releaseCommit: string;
    releaseBranch: string;
    programId: string;
    verificationWallet: string;
    deployTx: string;
    stages: Array<{ stage: string; status: string }>;
    mandatoryGates: string[];
    unresolvedBlockers: Array<{ name: string; status: string }>;
    drillDocs: string[];
  };
  const releaseDrillMd = fs.readFileSync(releaseDrillMdPath, "utf8");
  const releaseCeremony = JSON.parse(fs.readFileSync(releaseCeremonyJsonPath, "utf8")) as {
    project: string;
    releaseCommit: string;
    releaseBranch: string;
    programId: string;
    verificationWallet: string;
    deployTx: string;
    ceremonyDocs: string[];
    mandatoryGates: string[];
    observedGateCount: number;
    deploymentGateCount: number;
    goLiveDecision: string;
    unresolvedBlockers: Array<{ name: string; status: string }>;
  };
  const releaseCeremonyMd = fs.readFileSync(releaseCeremonyMdPath, "utf8");
  const pdaoAttestation = JSON.parse(fs.readFileSync(pdaoAttestationPath, "utf8")) as {
    project: string;
    privateDaoProgramId: string;
    verificationWallet: string;
    pdaoToken: {
      name: string;
      symbol: string;
      platform: string;
      mint: string;
      tokenProgramId: string;
      metadataAssetPath: string;
      metadataUri: string;
      supplyUi: string;
      transactionLabels: string[];
    };
    programBoundary: {
      privateDaoProgramId: string;
      tokenProgramId: string;
      explanation: string;
    };
    verificationDocs: string[];
  };
  const walletMatrix = JSON.parse(fs.readFileSync(walletMatrixJsonPath, "utf8")) as {
    programId: string;
    diagnosticsPage: string;
    entries: Array<{ id: string; label: string; diagnosticsVisible: boolean; selectorVisible: boolean }>;
  };
  const walletMatrixMd = fs.readFileSync(walletMatrixMdPath, "utf8");
  const supplyChain = JSON.parse(fs.readFileSync(supplyChainJsonPath, "utf8")) as {
    project: string;
    algorithm: string;
    topLevel: { name: string; dependencies: number; devDependencies: number; scripts: number };
    lockfiles: {
      cargo: { path: string; packageCount: number };
      npm: { path: string; lockfileVersion: number; packageCount: number };
      yarn: { path: string; entryCount: number };
    };
    files: Array<{ path: string; sha256: string; bytes: number }>;
    reviewCommands: string[];
  };
  const supplyChainMd = fs.readFileSync(supplyChainMdPath, "utf8");
  const devnetCanary = JSON.parse(fs.readFileSync(devnetCanaryJsonPath, "utf8")) as {
    network: string;
    programId: string;
    primaryRpc: { label: string; blockhash: string; slot: number };
    fallbackRpc: { label: string; blockhash: string; slot: number };
    anchors: Array<{ label: string; exists: boolean }>;
    tokenSupply: { mint: string };
    summary: {
      primaryHealthy: boolean;
      fallbackHealthy: boolean;
      anchorAccountsPresent: boolean;
      unexpectedFailures: number;
    };
  };
  const devnetCanaryMd = fs.readFileSync(devnetCanaryMdPath, "utf8");
  const devnetWalletRegistry = JSON.parse(fs.readFileSync(devnetWalletRegistryPath, "utf8")) as {
    network: string;
    wallets: Array<{ wallet_index: number; public_key: string; role: string; funding: { success: boolean } }>;
  };
  const devnetBootstrap = JSON.parse(fs.readFileSync(devnetBootstrapPath, "utf8")) as {
    network: string;
    program_id: string;
    governance_mint: string;
    dao_public_key: string;
    proposal_public_key: string;
    transactions: Record<string, string>;
  };
  const devnetTxRegistry = JSON.parse(fs.readFileSync(devnetTxRegistryPath, "utf8")) as {
    network: string;
    entries: Array<{ tx_signature: string; action: string }>;
  };
  const adversarialReport = JSON.parse(fs.readFileSync(adversarialReportPath, "utf8")) as {
    total_scenarios: number;
    rejected: number;
    scenarios: Array<{ outcome: string; scenario: string }>;
  };
  const zkProofRegistry = JSON.parse(fs.readFileSync(zkProofRegistryPath, "utf8")) as {
    verification_mode: string;
    entries: Array<{ layer: string; proof_hash: string; public_inputs_hash: string }>;
    onchain_proof_anchors?: {
      proposal_public_key: string;
      entries: Array<{
        layer: string;
        anchor_pda: string;
        tx_signature: string;
        explorer_url: string;
      }>;
    };
  };
  const performanceMetrics = JSON.parse(fs.readFileSync(performanceMetricsPath, "utf8")) as {
    walletCount: number;
    totalTxCount: number;
    totalAttemptCount: number;
  };
  const loadTestReport = fs.readFileSync(loadTestReportPath, "utf8");
  const devnetMultiProposalReport = JSON.parse(fs.readFileSync(devnetMultiProposalReportJsonPath, "utf8")) as {
    network: string;
    programId: string;
    governanceMint: string;
    proposals: Array<{ proposalPublicKey: string; executeTx: string }>;
    summary: {
      proposalCount: number;
      executedCount: number;
      crossProposalRejections: number;
      unexpectedSuccesses: number;
    };
  };
  const devnetMultiProposalReportMd = fs.readFileSync(devnetMultiProposalReportMdPath, "utf8");
  const devnetRaceReport = JSON.parse(fs.readFileSync(devnetRaceReportJsonPath, "utf8")) as {
    network: string;
    programId: string;
    governanceMint: string;
    finalizeRace: { successCount: number; rejectedCount: number };
    executeRace: { successCount: number; rejectedCount: number };
    summary: {
      finalizeSingleWinner: boolean;
      executeSingleWinner: boolean;
      unexpectedSuccesses: number;
    };
  };
  const devnetRaceReportMd = fs.readFileSync(devnetRaceReportMdPath, "utf8");
  const devnetResilienceReport = JSON.parse(fs.readFileSync(devnetResilienceReportJsonPath, "utf8")) as {
    network: string;
    programId: string;
    governanceMint: string;
    primaryRpc: string;
    fallbackRpc: string;
    rpcMatrix: Array<{ label: string; status: string; blockhash: string }>;
    failover: { recovered: boolean; invalidRpcError: string; fallbackBlockhash: string };
    staleBlockhashRecovery: {
      rejectedAsExpected: boolean;
      staleError: string;
      recoveredTx: string;
      probeBalanceDeltaLamports: number;
    };
    summary: {
      primaryHealthy: boolean;
      fallbackHealthy: boolean;
      failoverRecovered: boolean;
      staleBlockhashRejected: boolean;
      staleBlockhashRecovered: boolean;
      unexpectedSuccesses: number;
    };
  };
  const devnetResilienceReportMd = fs.readFileSync(devnetResilienceReportMdPath, "utf8");
  const zkAttestation = JSON.parse(fs.readFileSync(zkAttestationPath, "utf8")) as {
    project: string;
    zkStackVersion: number;
    provingSystem: string;
    layerCount: number;
    layers: Array<{ layer: string; circuit: string; publicSignalCount: number }>;
  };

  if (attestation.project !== "PrivateDAO") {
    throw new Error("generated attestation project mismatch");
  }

  if (attestation.programId !== "5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx") {
    throw new Error("generated attestation program id mismatch");
  }

  if (attestation.verificationWallet !== "4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD") {
    throw new Error("generated attestation verification wallet mismatch");
  }

  if (!attestation.pdaoToken) {
    throw new Error("generated attestation is missing the PDAO token summary");
  }

  if (attestation.pdaoToken.mint !== proofRegistry.pdaoToken?.mint) {
    throw new Error("generated attestation PDAO mint mismatch");
  }

  if (attestation.pdaoToken.programId !== proofRegistry.pdaoToken?.programId) {
    throw new Error("generated attestation PDAO program mismatch");
  }

  if (attestation.pdaoToken.transactionLabels.length < 4) {
    throw new Error("generated attestation PDAO transaction labels are incomplete");
  }

  if (devnetWalletRegistry.network !== "devnet" || devnetWalletRegistry.wallets.length !== 50) {
    throw new Error("devnet wallet registry is incomplete");
  }

  if (!devnetWalletRegistry.wallets.every((wallet) => wallet.funding.success)) {
    throw new Error("devnet wallet registry contains unfunded wallets");
  }

  if (devnetBootstrap.network !== "devnet" || devnetBootstrap.program_id !== attestation.programId) {
    throw new Error("devnet bootstrap report does not match canonical program state");
  }

  if (devnetBootstrap.governance_mint !== proofRegistry.governanceMint) {
    throw new Error("devnet bootstrap governance mint does not match the Devnet proof registry mint");
  }

  if (devnetTxRegistry.network !== "devnet" || devnetTxRegistry.entries.length < 40) {
    throw new Error("devnet tx registry is unexpectedly weak");
  }

  if (adversarialReport.total_scenarios <= 0 || adversarialReport.rejected <= 0) {
    throw new Error("adversarial report is missing rejection evidence");
  }

  if (zkProofRegistry.verification_mode !== "offchain-groth16" || zkProofRegistry.entries.length < 5) {
    throw new Error("zk proof registry is unexpectedly weak");
  }

  if (!zkProofRegistry.entries.every((entry) => entry.proof_hash && entry.public_inputs_hash)) {
    throw new Error("zk proof registry entries are incomplete");
  }

  if (
    !zkProofRegistry.onchain_proof_anchors ||
    zkProofRegistry.onchain_proof_anchors.entries.length < 3 ||
    !zkProofRegistry.onchain_proof_anchors.entries.every(
      (entry: { tx_signature: string; anchor_pda: string }) => entry.tx_signature && entry.anchor_pda
    )
  ) {
    throw new Error("zk proof registry is missing on-chain proof anchors");
  }

  if (performanceMetrics.walletCount !== 50 || performanceMetrics.totalTxCount < 40 || performanceMetrics.totalAttemptCount < 50) {
    throw new Error("performance metrics are unexpectedly weak");
  }

  if (!loadTestReport.includes("# Devnet Load Test Report") || !loadTestReport.includes("number of wallets: 50")) {
    throw new Error("load test report is missing the expected overview");
  }

  if (walletMatrix.programId !== attestation.programId || !walletMatrix.diagnosticsPage.endsWith("/diagnostics/")) {
    throw new Error("wallet compatibility matrix does not match canonical runtime state");
  }

  if (walletMatrix.entries.length < 5 || walletMatrix.entries.some((entry) => !entry.diagnosticsVisible || !entry.selectorVisible)) {
    throw new Error("wallet compatibility matrix is unexpectedly weak");
  }

  if (!walletMatrixMd.includes("# Wallet Compatibility Matrix")) {
    throw new Error("wallet compatibility matrix markdown is invalid");
  }

  if (devnetCanary.network !== "devnet" || devnetCanary.programId !== attestation.programId) {
    throw new Error("devnet canary does not match canonical program state");
  }

  if (!devnetCanary.summary.primaryHealthy || !devnetCanary.summary.fallbackHealthy) {
    throw new Error("devnet canary is missing healthy runtime evidence");
  }

  if (devnetCanary.summary.unexpectedFailures !== 0 || devnetCanary.anchors.length < 6) {
    throw new Error("devnet canary is unexpectedly weak");
  }

  if (!devnetCanary.primaryRpc.blockhash || !devnetCanary.fallbackRpc.blockhash || devnetCanary.primaryRpc.slot <= 0 || devnetCanary.fallbackRpc.slot <= 0) {
    throw new Error("devnet canary rpc health is incomplete");
  }

  if (devnetCanary.tokenSupply.mint !== proofRegistry.governanceMint) {
    throw new Error("devnet canary governance mint does not match the Devnet proof registry mint");
  }

  if (!devnetCanaryMd.includes("# Devnet Canary Report")) {
    throw new Error("devnet canary markdown report is invalid");
  }

  if (devnetMultiProposalReport.network !== "devnet" || devnetMultiProposalReport.programId !== attestation.programId) {
    throw new Error("devnet multi-proposal report does not match canonical program state");
  }

  if (devnetMultiProposalReport.governanceMint !== proofRegistry.governanceMint) {
    throw new Error("devnet multi-proposal report governance mint does not match the Devnet proof registry mint");
  }

  if (devnetMultiProposalReport.summary.proposalCount < 3 || devnetMultiProposalReport.summary.executedCount < 3) {
    throw new Error("devnet multi-proposal report is unexpectedly weak");
  }

  if (devnetMultiProposalReport.summary.crossProposalRejections < 3 || devnetMultiProposalReport.summary.unexpectedSuccesses !== 0) {
    throw new Error("devnet multi-proposal report is missing cross-proposal rejection coverage");
  }

  if (!devnetMultiProposalReport.proposals.every((proposal) => proposal.proposalPublicKey && proposal.executeTx)) {
    throw new Error("devnet multi-proposal report contains incomplete proposal execution evidence");
  }

  if (!devnetMultiProposalReportMd.includes("# Devnet Multi-Proposal Report") || !devnetMultiProposalReportMd.includes("cross-proposal rejections")) {
    throw new Error("devnet multi-proposal markdown report is missing reviewer-facing summary text");
  }

  if (devnetRaceReport.network !== "devnet" || devnetRaceReport.programId !== attestation.programId) {
    throw new Error("devnet race report does not match canonical program state");
  }

  if (devnetRaceReport.governanceMint !== proofRegistry.governanceMint) {
    throw new Error("devnet race report governance mint does not match the Devnet proof registry mint");
  }

  if (!devnetRaceReport.summary.finalizeSingleWinner || !devnetRaceReport.summary.executeSingleWinner) {
    throw new Error("devnet race report does not prove single-winner collision behavior");
  }

  if (devnetRaceReport.summary.unexpectedSuccesses !== 0) {
    throw new Error("devnet race report contains unexpected successes");
  }

  if (devnetRaceReport.finalizeRace.successCount !== 1 || devnetRaceReport.executeRace.successCount !== 1) {
    throw new Error("devnet race report winning counts are invalid");
  }

  if (devnetRaceReport.finalizeRace.rejectedCount < 1 || devnetRaceReport.executeRace.rejectedCount < 1) {
    throw new Error("devnet race report is missing rejected collision attempts");
  }

  if (
    !devnetRaceReportMd.includes("# Devnet Race Report") ||
    !devnetRaceReportMd.includes("one winning finalize") ||
    !devnetRaceReportMd.includes("one winning execute")
  ) {
    throw new Error("devnet race markdown report is missing reviewer-facing collision wording");
  }

  if (devnetResilienceReport.network !== "devnet" || devnetResilienceReport.programId !== attestation.programId) {
    throw new Error("devnet resilience report does not match canonical program state");
  }

  if (devnetResilienceReport.governanceMint !== proofRegistry.governanceMint) {
    throw new Error("devnet resilience report governance mint does not match the Devnet proof registry mint");
  }

  if (!devnetResilienceReport.summary.primaryHealthy || !devnetResilienceReport.summary.fallbackHealthy) {
    throw new Error("devnet resilience report is missing healthy RPC evidence");
  }

  if (!devnetResilienceReport.summary.failoverRecovered || !devnetResilienceReport.failover.recovered) {
    throw new Error("devnet resilience report is missing failover recovery evidence");
  }

  if (!devnetResilienceReport.failover.invalidRpcError || !devnetResilienceReport.failover.fallbackBlockhash) {
    throw new Error("devnet resilience report failover details are incomplete");
  }

  if (!devnetResilienceReport.summary.staleBlockhashRejected || !devnetResilienceReport.staleBlockhashRecovery.rejectedAsExpected) {
    throw new Error("devnet resilience report is missing stale blockhash rejection evidence");
  }

  if (!devnetResilienceReport.summary.staleBlockhashRecovered || !devnetResilienceReport.staleBlockhashRecovery.recoveredTx) {
    throw new Error("devnet resilience report is missing stale blockhash recovery evidence");
  }

  if (devnetResilienceReport.staleBlockhashRecovery.probeBalanceDeltaLamports !== 1) {
    throw new Error("devnet resilience report probe balance delta is unexpected");
  }

  if (devnetResilienceReport.summary.unexpectedSuccesses !== 0 || devnetResilienceReport.rpcMatrix.length < 2) {
    throw new Error("devnet resilience report is unexpectedly weak");
  }

  if (
    !devnetResilienceReportMd.includes("# Devnet Resilience Report") ||
    !devnetResilienceReportMd.includes("Failover Recovery") ||
    !devnetResilienceReportMd.includes("Stale Blockhash Recovery")
  ) {
    throw new Error("devnet resilience markdown report is missing reviewer-facing resilience wording");
  }

  if (attestation.gateCount < 8) {
    throw new Error("generated attestation gate count is unexpectedly low");
  }

  if (cryptographicManifest.project !== "PrivateDAO") {
    throw new Error("generated cryptographic manifest project mismatch");
  }

  if (cryptographicManifest.algorithm !== "sha256") {
    throw new Error("generated cryptographic manifest algorithm mismatch");
  }

  if (cryptographicManifest.entryCount < 10 || cryptographicManifest.files.length !== cryptographicManifest.entryCount) {
    throw new Error("generated cryptographic manifest entry count is unexpectedly low");
  }

  if (!attestation.cryptographicIntegrity) {
    throw new Error("generated attestation is missing cryptographic integrity summary");
  }

  if (!attestation.zk) {
    throw new Error("generated attestation is missing zk summary");
  }

  if (attestation.packageCounts.zk <= 0) {
    throw new Error("generated attestation zk package count is invalid");
  }

  if (attestation.zk.stackVersion < 1 || attestation.zk.entryCount < 3 || attestation.zk.layers.length < 3) {
    throw new Error("generated attestation zk summary is unexpectedly weak");
  }

  if (!attestation.zk.verificationDocs || attestation.zk.verificationDocs.length < 4) {
    throw new Error("generated attestation zk verification docs are missing");
  }

  if (!attestation.zk.verificationDocs.includes("docs/zk-attestation.generated.json")) {
    throw new Error("generated attestation is missing the zk attestation doc");
  }

  if (!attestation.runtimeDocs || !attestation.runtimeDocs.includes("docs/wallet-runtime.md")) {
    throw new Error("generated attestation runtime docs are missing");
  }
  if (!attestation.runtimeDocs.includes("docs/governance-hardening-v3.md")) {
    throw new Error("generated attestation is missing the governance V3 doc");
  }
  if (!attestation.runtimeDocs.includes("docs/settlement-hardening-v3.md")) {
    throw new Error("generated attestation is missing the settlement V3 doc");
  }
  if (!attestation.runtimeDocs.includes("docs/test-wallet-live-proof-v3.generated.md")) {
    throw new Error("generated attestation is missing the dedicated V3 live proof doc");
  }
  if (!attestation.runtimeDocs.includes("docs/runtime-evidence.generated.md")) {
    throw new Error("generated attestation is missing the runtime evidence doc");
  }
  if (!attestation.runtimeDocs.includes("docs/runtime/real-device.generated.md")) {
    throw new Error("generated attestation is missing the real-device runtime doc");
  }
  if (!attestation.runtimeDocs.includes("docs/magicblock/runtime.generated.md")) {
    throw new Error("generated attestation is missing the MagicBlock runtime doc");
  }
  if (!attestation.runtimeDocs.includes("docs/operational-evidence.generated.md")) {
    throw new Error("generated attestation is missing the operational evidence doc");
  }
  if (!attestation.runtimeDocs.includes("docs/wallet-compatibility-matrix.generated.md")) {
    throw new Error("generated attestation is missing the wallet matrix doc");
  }
  if (!attestation.runtimeDocs.includes("docs/devnet-canary.generated.md")) {
    throw new Error("generated attestation is missing the devnet canary doc");
  }
  if (!attestation.runtimeDocs.includes("docs/go-live-attestation.generated.json")) {
    throw new Error("generated attestation is missing the go-live attestation doc");
  }
  if (!attestation.runtimeDocs.includes("docs/runtime-attestation.generated.json")) {
    throw new Error("generated attestation is missing the runtime attestation doc");
  }
  if (!attestation.runtimeDocs.includes("docs/pdao-attestation.generated.json")) {
    throw new Error("generated attestation is missing the PDAO attestation doc");
  }
  if (!attestation.operationsDocs || !attestation.operationsDocs.includes("docs/release-ceremony.md")) {
    throw new Error("generated attestation is missing the release ceremony doc");
  }
  if (!attestation.operationsDocs.includes("docs/governance-hardening-v3.md")) {
    throw new Error("generated attestation operations docs are missing the governance V3 doc");
  }
  if (!attestation.operationsDocs.includes("docs/settlement-hardening-v3.md")) {
    throw new Error("generated attestation operations docs are missing the settlement V3 doc");
  }
  if (!attestation.operationsDocs.includes("docs/test-wallet-live-proof-v3.generated.md")) {
    throw new Error("generated attestation operations docs are missing the dedicated V3 live proof doc");
  }
  if (!attestation.operationsDocs.includes("docs/release-ceremony-attestation.generated.md")) {
    throw new Error("generated attestation is missing the release ceremony attestation doc");
  }
  if (!attestation.operationsDocs.includes("docs/release-drill.generated.md")) {
    throw new Error("generated attestation is missing the release drill doc");
  }
  if (!attestation.securityDocs || !attestation.securityDocs.includes("docs/cryptographic-posture.md")) {
    throw new Error("generated attestation is missing the cryptographic posture doc");
  }
  if (!attestation.securityDocs.includes("docs/governance-hardening-v3.md")) {
    throw new Error("generated attestation security docs are missing the governance V3 doc");
  }
  if (!attestation.securityDocs.includes("docs/settlement-hardening-v3.md")) {
    throw new Error("generated attestation security docs are missing the settlement V3 doc");
  }
  if (!attestation.securityDocs.includes("docs/supply-chain-security.md")) {
    throw new Error("generated attestation is missing the supply-chain security doc");
  }
  if (!attestation.securityDocs.includes("docs/supply-chain-attestation.generated.md")) {
    throw new Error("generated attestation is missing the supply-chain attestation doc");
  }

  if (zkRegistry.project !== "PrivateDAO") {
    throw new Error("generated zk registry project mismatch");
  }

  if (zkRegistry.zkStackVersion < 1) {
    throw new Error("generated zk registry version mismatch");
  }

  if (zkRegistry.entryCount !== zkRegistry.entries.length || zkRegistry.entries.length < 3) {
    throw new Error("generated zk registry entry count mismatch");
  }

  for (const entry of zkRegistry.entries) {
    if (!entry.circuit || !entry.layer || entry.publicSignalCount <= 0) {
      throw new Error(`generated zk registry entry is invalid for ${entry.circuit || "unknown-circuit"}`);
    }
  }

  if (attestation.cryptographicIntegrity.algorithm !== cryptographicManifest.algorithm) {
    throw new Error("generated attestation cryptographic algorithm mismatch");
  }

  if (attestation.cryptographicIntegrity.entryCount !== cryptographicManifest.entryCount) {
    throw new Error("generated attestation cryptographic entry count mismatch");
  }

  if (attestation.cryptographicIntegrity.aggregateSha256 !== cryptographicManifest.aggregateSha256) {
    throw new Error("generated attestation cryptographic aggregate mismatch");
  }

  for (const manifestFile of [
    "docs/go-live-criteria.md",
    "docs/investor-pitch-deck.md",
    "docs/operational-drillbook.md",
    "docs/operational-evidence.generated.md",
    "docs/operational-evidence.generated.json",
    "docs/runtime-attestation.generated.json",
    "docs/go-live-attestation.generated.json",
    "docs/mainnet-blockers.json",
    "docs/mainnet-blockers.md",
    "docs/launch-ops-checklist.json",
    "docs/launch-ops-checklist.md",
    "docs/authority-transfer-runbook.md",
    "docs/monitoring-alert-rules.json",
    "docs/monitoring-alert-rules.md",
    "docs/wallet-e2e-test-plan.md",
  ]) {
    if (!cryptographicManifest.files.some((entry) => entry.path === manifestFile)) {
      throw new Error(`generated cryptographic manifest is missing ${manifestFile}`);
    }
  }

  if (!attestation.runtimeDocs.includes("docs/mainnet-blockers.json")) {
    throw new Error("generated attestation is missing the mainnet blocker register");
  }
  if (!attestation.securityDocs.includes("docs/mainnet-blockers.md")) {
    throw new Error("generated attestation is missing the human mainnet blocker register");
  }
  if (!attestation.operationsDocs?.includes("docs/launch-ops-checklist.md")) {
    throw new Error("generated attestation is missing the launch ops checklist");
  }
  if (!attestation.operationsDocs?.includes("docs/monitoring-alert-rules.md")) {
    throw new Error("generated attestation is missing the monitoring alert rules");
  }

  for (const [pkg, count] of Object.entries(attestation.packageCounts)) {
    if (count <= 0) {
      throw new Error(`generated attestation package count is invalid for ${pkg}`);
    }
  }

  if (!auditPacket.includes("# Audit Packet")) {
    throw new Error("generated audit packet content is invalid");
  }

  if (!auditPacket.includes("## ZK Package")) {
    throw new Error("generated audit packet is missing the ZK package section");
  }

  if (!auditPacket.includes("## PDAO Token Surface")) {
    throw new Error("generated audit packet is missing the PDAO token section");
  }
  if (!auditPacket.includes("docs/pdao-attestation.generated.json")) {
    throw new Error("generated audit packet is missing the PDAO attestation reference");
  }

  if (!auditPacket.includes("### ZK Review Commands")) {
    throw new Error("generated audit packet is missing the ZK review command section");
  }

  if (!auditPacket.includes("docs/mainnet-readiness.generated.md")) {
    throw new Error("generated audit packet is missing the mainnet readiness report reference");
  }
  if (!auditPacket.includes("docs/go-live-attestation.generated.json")) {
    throw new Error("generated audit packet is missing the go-live attestation reference");
  }
  if (!auditPacket.includes("docs/devnet-multi-proposal-report.json")) {
    throw new Error("generated audit packet is missing the devnet multi-proposal reference");
  }
  if (!auditPacket.includes("docs/devnet-race-report.json")) {
    throw new Error("generated audit packet is missing the devnet race reference");
  }
  if (!auditPacket.includes("docs/devnet-resilience-report.json")) {
    throw new Error("generated audit packet is missing the devnet resilience reference");
  }
  if (!auditPacket.includes("docs/wallet-compatibility-matrix.generated.json")) {
    throw new Error("generated audit packet is missing the wallet matrix reference");
  }
  if (!auditPacket.includes("docs/devnet-canary.generated.json")) {
    throw new Error("generated audit packet is missing the devnet canary reference");
  }
  if (!auditPacket.includes("docs/supply-chain-attestation.generated.json")) {
    throw new Error("generated audit packet is missing the supply-chain attestation reference");
  }
  if (!auditPacket.includes("docs/cryptographic-posture.md")) {
    throw new Error("generated audit packet is missing the cryptographic posture reference");
  }
  if (!auditPacket.includes("docs/release-ceremony-attestation.generated.json")) {
    throw new Error("generated audit packet is missing the release ceremony attestation reference");
  }
  if (!auditPacket.includes("docs/runtime-evidence.generated.json")) {
    throw new Error("generated audit packet is missing the runtime evidence reference");
  }
  if (!auditPacket.includes("docs/runtime/real-device.generated.json")) {
    throw new Error("generated audit packet is missing the real-device runtime reference");
  }
  if (!auditPacket.includes("docs/operational-evidence.generated.json")) {
    throw new Error("generated audit packet is missing the operational evidence reference");
  }
  if (!auditPacket.includes("docs/release-drill.generated.json")) {
    throw new Error("generated audit packet is missing the release drill reference");
  }

  if (!zkTranscript.includes("# ZK Transcript")) {
    throw new Error("generated zk transcript content is invalid");
  }

  if (!mainnetReadinessReport.includes("# Mainnet Readiness Report")) {
    throw new Error("generated mainnet readiness report content is invalid");
  }

  if (mainnetAcceptance.project !== "PrivateDAO") {
    throw new Error("generated mainnet acceptance matrix project mismatch");
  }
  if (mainnetAcceptance.programId !== attestation.programId) {
    throw new Error("generated mainnet acceptance matrix program mismatch");
  }
  if (mainnetAcceptance.verificationWallet !== attestation.verificationWallet) {
    throw new Error("generated mainnet acceptance matrix verification wallet mismatch");
  }
  if (mainnetAcceptance.summary.acceptedInRepo < 5 || mainnetAcceptance.summary.pendingExternal < 2) {
    throw new Error("generated mainnet acceptance matrix summary is unexpectedly weak");
  }
  if (!mainnetAcceptance.rows.some((row) => row.layer === "governance-lifecycle" && row.status === "accepted-in-repo")) {
    throw new Error("generated mainnet acceptance matrix is missing the governance lifecycle row");
  }
  if (!mainnetAcceptance.rows.some((row) => row.layer === "real-device-wallet-qa" && row.status === "pending-external")) {
    throw new Error("generated mainnet acceptance matrix is missing the real-device-wallet-qa row");
  }
  if (!mainnetAcceptance.rows.some((row) => row.layer === "external-audit" && row.status === "pending-external")) {
    throw new Error("generated mainnet acceptance matrix is missing the external-audit row");
  }
  if (!mainnetAcceptance.rows.some((row) => row.layer === "strategy-engine-and-live-performance" && row.status === "not-in-repo")) {
    throw new Error("generated mainnet acceptance matrix is missing the strategy boundary row");
  }
  if (
    !mainnetAcceptanceMd.includes("# Mainnet Acceptance Matrix") ||
    !mainnetAcceptanceMd.includes("docs/external-readiness-intake.md") ||
    !mainnetAcceptanceMd.includes("docs/runtime/real-device.generated.md") ||
    !mainnetAcceptanceMd.includes("real-device-wallet-qa") ||
    !mainnetAcceptanceMd.includes("docs/test-wallet-live-proof-v3.generated.md") ||
    !mainnetAcceptanceMd.includes("docs/governance-hardening-v3.md") ||
    !mainnetAcceptanceMd.includes("docs/settlement-hardening-v3.md")
  ) {
    throw new Error("generated mainnet acceptance matrix markdown is invalid");
  }

  if (mainnetProofPackage.project !== "PrivateDAO") {
    throw new Error("generated mainnet proof package project mismatch");
  }
  if (mainnetProofPackage.readinessAnchor.programId !== attestation.programId) {
    throw new Error("generated mainnet proof package program mismatch");
  }
  if (mainnetProofPackage.readinessAnchor.verificationWallet !== attestation.verificationWallet) {
    throw new Error("generated mainnet proof package verification wallet mismatch");
  }
  if (!mainnetProofPackage.coreArtifacts.includes("docs/mainnet-acceptance-matrix.generated.md")) {
    throw new Error("generated mainnet proof package is missing the acceptance matrix");
  }
  if (!mainnetProofPackage.coreArtifacts.includes("docs/test-wallet-live-proof-v3.generated.md")) {
    throw new Error("generated mainnet proof package is missing the dedicated V3 live proof");
  }
  if (!mainnetProofPackage.coreArtifacts.includes("docs/governance-hardening-v3.md")) {
    throw new Error("generated mainnet proof package is missing the governance V3 doc");
  }
  if (!mainnetProofPackage.coreArtifacts.includes("docs/settlement-hardening-v3.md")) {
    throw new Error("generated mainnet proof package is missing the settlement V3 doc");
  }
  if (!mainnetProofPackage.coreArtifacts.includes("docs/external-readiness-intake.md")) {
    throw new Error("generated mainnet proof package is missing the external readiness intake");
  }
  if (!mainnetProofPackage.commands.includes("npm run verify:mainnet-proof-package")) {
    throw new Error("generated mainnet proof package is missing its verification command");
  }
  if (
    !mainnetProofPackageMd.includes("# Mainnet Proof Package") ||
    !mainnetProofPackageMd.includes("docs/mainnet-acceptance-matrix.generated.md") ||
    !mainnetProofPackageMd.includes("docs/runtime-evidence.generated.md") ||
    !mainnetProofPackageMd.includes("docs/runtime/real-device.generated.md") ||
    !mainnetProofPackageMd.includes("docs/test-wallet-live-proof-v3.generated.md") ||
    !mainnetProofPackageMd.includes("docs/governance-hardening-v3.md") ||
    !mainnetProofPackageMd.includes("docs/settlement-hardening-v3.md")
  ) {
    throw new Error("generated mainnet proof package markdown is invalid");
  }

  if (deploymentAttestation.project !== "PrivateDAO") {
    throw new Error("generated deployment attestation project mismatch");
  }

  if (deploymentAttestation.programId !== "5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx") {
    throw new Error("generated deployment attestation program mismatch");
  }

  if (deploymentAttestation.verificationWallet !== "4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD") {
    throw new Error("generated deployment attestation verification wallet mismatch");
  }

  if (!deploymentAttestation.runtimeDocs.includes("docs/wallet-runtime.md")) {
    throw new Error("generated deployment attestation is missing wallet runtime docs");
  }
  if (!deploymentAttestation.runtimeDocs.includes("docs/go-live-criteria.md")) {
    throw new Error("generated deployment attestation is missing go-live criteria docs");
  }

  if (goLiveAttestation.project !== "PrivateDAO") {
    throw new Error("generated go-live attestation project mismatch");
  }

  if (goLiveAttestation.programId !== "5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx") {
    throw new Error("generated go-live attestation program mismatch");
  }

  if (goLiveAttestation.verificationWallet !== "4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD") {
    throw new Error("generated go-live attestation verification wallet mismatch");
  }

  if (goLiveAttestation.decision !== "blocked-pending-external-steps") {
    throw new Error("generated go-live attestation decision is unexpectedly weak");
  }

  if (!goLiveAttestation.criteriaDocs.includes("docs/go-live-criteria.md")) {
    throw new Error("generated go-live attestation is missing go-live criteria docs");
  }

  if (!goLiveAttestation.runtimeDocs.includes("docs/wallet-runtime.md")) {
    throw new Error("generated go-live attestation is missing wallet runtime docs");
  }

  if (!goLiveAttestation.blockers.some((entry) => entry.name === "externalAudit" && entry.status === "pending")) {
    throw new Error("generated go-live attestation is missing the external-audit blocker");
  }

  if (runtimeAttestation.project !== "PrivateDAO") {
    throw new Error("generated runtime attestation project mismatch");
  }

  if (runtimeAttestation.programId !== "5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx") {
    throw new Error("generated runtime attestation program mismatch");
  }

  if (runtimeAttestation.verificationWallet !== "4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD") {
    throw new Error("generated runtime attestation verification wallet mismatch");
  }

  if (!runtimeAttestation.diagnosticsPage.endsWith("/diagnostics/")) {
    throw new Error("generated runtime attestation diagnostics page mismatch");
  }

  if (!runtimeAttestation.supportedWallets.some((entry) => entry.id === "phantom")) {
    throw new Error("generated runtime attestation is missing Phantom support");
  }
  if (!runtimeAttestation.runtimeDocs.includes("docs/read-node/snapshot.generated.md")) {
    throw new Error("generated runtime attestation is missing the read-node snapshot doc");
  }
  if (readNodeSnapshot.readPath !== "backend-indexer") {
    throw new Error("read-node snapshot read path mismatch");
  }
  if (!readNodeSnapshot.runtime?.programId) {
    throw new Error("read-node snapshot is missing the runtime program id");
  }
  if (typeof readNodeSnapshot.counts?.proposals !== "number") {
    throw new Error("read-node snapshot is missing proposal counts");
  }
  if (typeof readNodeSnapshot.counts?.confidentialPayouts !== "number") {
    throw new Error("read-node snapshot is missing confidential payout counts");
  }
  if (!readNodeSnapshotMd.includes("# Read Node Snapshot")) {
    throw new Error("read-node snapshot markdown heading mismatch");
  }
  if (!readNodeSnapshotMd.includes("Confidential payout proposals")) {
    throw new Error("read-node snapshot markdown is missing confidential payout coverage");
  }

  if (frontierIntegrations.project !== "PrivateDAO") {
    throw new Error("Frontier integration evidence project mismatch");
  }
  const artifactCluster =
    frontierIntegrations.network === "devnet"
      ? "devnet"
      : frontierIntegrations.network === "testnet"
        ? "testnet"
        : null;
  if (!artifactCluster) {
    throw new Error("Frontier integration evidence network mismatch");
  }
  const expectedFrontierProgram =
    artifactCluster === "testnet"
      ? "EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva"
      : runtimeAttestation.programId;
  if (frontierIntegrations.programId !== expectedFrontierProgram) {
    throw new Error("Frontier integration evidence program mismatch");
  }
  if (frontierIntegrations.verificationWallet !== runtimeAttestation.verificationWallet) {
    throw new Error("Frontier integration evidence verification wallet mismatch");
  }
  if (frontierIntegrations.readNode.readPath !== "backend-indexer" || !frontierIntegrations.readNode.rpcEndpoint || frontierIntegrations.readNode.rpcPoolSize < 1) {
    throw new Error("Frontier integration evidence read-node surface is incomplete");
  }
  if (artifactCluster !== expectedCluster) {
    console.warn(
      `Frontier integration evidence cluster (${artifactCluster}) differs from expected runtime (${expectedCluster}); validating against artifact cluster.`,
    );
  }
  if (frontierIntegrations.readNode.overview.confidentialPayouts < 1 || frontierIntegrations.readNode.overview.magicblockSettled < 1 || frontierIntegrations.readNode.overview.refheSettled < 1) {
    throw new Error("Frontier integration evidence backend coverage is unexpectedly weak");
  }
  if (frontierIntegrations.simpleGovernance.txChecks.length < 5) {
    throw new Error("Frontier integration evidence simple governance tx coverage is unexpectedly weak");
  }
  if (!frontierIntegrations.simpleGovernance.accountChecks?.some((entry) => entry.label === "program" && entry.exists && entry.executable)) {
    throw new Error("Frontier integration evidence program account is not live");
  }
  if (!frontierIntegrations.simpleGovernance.accountChecks?.some((entry) => entry.label === "simple-proposal" && entry.exists)) {
    throw new Error("Frontier integration evidence simple proposal account is not live");
  }
  if (!frontierIntegrations.simpleGovernance.lifecycleStatus) {
    throw new Error("Frontier integration evidence simple governance lifecycle status is missing");
  }
  if (
    frontierIntegrations.simpleGovernance.verificationStatus !== `verified-${artifactCluster}-governance-path` &&
    frontierIntegrations.simpleGovernance.verificationStatus !== `degraded-${artifactCluster}-governance-path`
  ) {
    throw new Error("Frontier integration evidence simple governance path status is invalid");
  }
  if (
    frontierIntegrations.confidentialOperations.txChecks.length < 5 ||
    frontierIntegrations.confidentialOperations.refheStatus !== "Settled" ||
    frontierIntegrations.confidentialOperations.magicblockStatus !== "Settled"
  ) {
    throw new Error("Frontier integration evidence confidential path is degraded");
  }
  for (const label of ["confidential-proposal", "confidential-payout-plan", "refhe-envelope", "magicblock-corridor"]) {
    if (!frontierIntegrations.confidentialOperations.accountChecks?.some((entry) => entry.label === label && entry.exists)) {
      throw new Error(`Frontier integration evidence missing live account: ${label}`);
    }
  }
  if (
    frontierIntegrations.confidentialOperations.status !== `verified-${artifactCluster}-confidential-path` &&
    frontierIntegrations.confidentialOperations.status !== `degraded-${artifactCluster}-confidential-path`
  ) {
    throw new Error("Frontier integration evidence confidential path status is invalid");
  }
  if (
    frontierIntegrations.zk.anchorCount < 3 ||
    (frontierIntegrations.zk.status !== `proof-anchors-recorded-on-${artifactCluster}` &&
      frontierIntegrations.zk.status !== "proof-anchor-gap-detected")
  ) {
    throw new Error("Frontier integration evidence zk anchor path status is invalid");
  }
  if (!frontierIntegrations.docs.includes("docs/magicblock/private-payments.md") || !frontierIntegrations.docs.includes("docs/refhe-protocol.md") || !frontierIntegrations.docs.includes("docs/rpc-architecture.md")) {
    throw new Error("Frontier integration evidence docs are incomplete");
  }
  if (!frontierIntegrations.commands.includes("npm run verify:frontier-integrations")) {
    throw new Error("Frontier integration evidence commands are incomplete");
  }
  if (!frontierIntegrationsMd.includes("# Frontier Integration Evidence") || !frontierIntegrationsMd.includes("Confidential MagicBlock + REFHE Path")) {
    throw new Error("Frontier integration evidence markdown is invalid");
  }

  if (runtimeEvidence.project !== "PrivateDAO") {
    throw new Error("generated runtime evidence project mismatch");
  }

  if (runtimeEvidence.programId !== runtimeAttestation.programId) {
    throw new Error("generated runtime evidence program mismatch");
  }

  if (runtimeEvidence.verificationWallet !== runtimeAttestation.verificationWallet) {
    throw new Error("generated runtime evidence verification wallet mismatch");
  }

  if (runtimeEvidence.diagnosticsPage !== runtimeAttestation.diagnosticsPage) {
    throw new Error("generated runtime evidence diagnostics page mismatch");
  }

  if (runtimeEvidence.walletCount !== runtimeAttestation.supportedWallets.length) {
    throw new Error("generated runtime evidence wallet count mismatch");
  }

  if (runtimeEvidence.walletLabels.length !== runtimeEvidence.walletCount) {
    throw new Error("generated runtime evidence wallet labels are incomplete");
  }

  if (!runtimeEvidence.walletLabels.includes("Phantom") || !runtimeEvidence.walletLabels.includes("Solflare")) {
    throw new Error("generated runtime evidence is missing key wallet labels");
  }

  if (runtimeEvidence.matrixStatuses.length < runtimeEvidence.walletCount) {
    throw new Error("generated runtime evidence matrix summary is incomplete");
  }

  if (runtimeEvidence.devnetCanary.network !== "devnet" || runtimeEvidence.devnetCanary.unexpectedFailures !== 0) {
    throw new Error("generated runtime evidence canary summary is invalid");
  }

  if (
    !runtimeEvidence.resilience.fallbackRecovered ||
    !runtimeEvidence.resilience.staleBlockhashRejected ||
    !runtimeEvidence.resilience.staleBlockhashRecovered ||
    runtimeEvidence.resilience.unexpectedFailures !== 0
  ) {
    throw new Error("generated runtime evidence resilience summary is invalid");
  }

  if (
    runtimeEvidence.operational.walletCount < 50 ||
    runtimeEvidence.operational.totalAttemptCount < 200 ||
    runtimeEvidence.operational.zkProofCount < 1 ||
    runtimeEvidence.operational.adversarialScenarioCount < 1 ||
    runtimeEvidence.operational.unexpectedAdversarialSuccesses !== 0 ||
    !runtimeEvidence.operational.finalizeSingleWinner ||
    !runtimeEvidence.operational.executeSingleWinner
  ) {
    throw new Error("generated runtime evidence operational summary is invalid");
  }

  for (const doc of [
    "docs/wallet-runtime.md",
    "docs/runtime/real-device.md",
    "docs/runtime/real-device-captures.json",
    "docs/runtime/real-device.generated.md",
    "docs/runtime/real-device.generated.json",
    "docs/magicblock/private-payments.md",
    "docs/magicblock/runtime-evidence.md",
    "docs/magicblock/runtime-captures.json",
    "docs/magicblock/runtime.generated.md",
    "docs/magicblock/runtime.generated.json",
    "docs/runtime-attestation.generated.json",
    "docs/operational-evidence.generated.md",
    "docs/operational-evidence.generated.json",
    "docs/wallet-compatibility-matrix.generated.md",
    "docs/devnet-canary.generated.md",
    "docs/devnet-resilience-report.md",
    "docs/fair-voting.md",
  ]) {
    if (!runtimeEvidence.docs.includes(doc)) {
      throw new Error(`generated runtime evidence is missing ${doc}`);
    }
  }

  for (const command of [
    "npm run build:wallet-matrix",
    "npm run verify:wallet-matrix",
    "npm run build:real-device-runtime",
    "npm run verify:real-device-runtime",
    "npm run build:magicblock-runtime",
    "npm run verify:magicblock-runtime",
    "npm run build:devnet-canary",
    "npm run verify:devnet-canary",
    "npm run test:devnet:resilience",
    "npm run verify:devnet:resilience-report",
    "npm run verify:runtime-surface",
    "npm run verify:all",
  ]) {
    if (!runtimeEvidence.commands.includes(command)) {
      throw new Error(`generated runtime evidence is missing ${command}`);
    }
  }

  if (
    !runtimeEvidenceMd.includes("# Runtime Evidence Package") ||
    !runtimeEvidenceMd.includes("Devnet Canary Summary") ||
    !runtimeEvidenceMd.includes("Real-Device Runtime Intake") ||
    !runtimeEvidenceMd.includes("MagicBlock Runtime Intake") ||
    !runtimeEvidenceMd.includes("Resilience Summary") ||
    !runtimeEvidenceMd.includes("Operational Summary")
  ) {
    throw new Error("generated runtime evidence markdown is invalid");
  }

  const magicBlockRuntime = JSON.parse(fs.readFileSync(magicBlockRuntimeJsonPath, "utf8")) as {
    project: string;
    network: string;
    summary: {
      targetCount: number;
      executeSuccessCount: number;
    };
    requiredDocs: string[];
    commands: string[];
    captures: Array<{
      network: string;
      proposalPublicKey: string;
      corridorPda: string;
      settlementWallet: string;
      depositResult: string;
      privateTransferResult: string;
      settleResult: string;
      executeResult: string;
      depositTxSignature?: string | null;
      transferTxSignature?: string | null;
      settleTxSignature?: string | null;
      executeTxSignature?: string | null;
      validator?: string | null;
      transferQueue?: string | null;
      explorerUrls?: {
        deposit?: string | null;
        transfer?: string | null;
        settle?: string | null;
        execute?: string | null;
      };
    }>;
  };

  if (magicBlockRuntime.project !== "PrivateDAO" || magicBlockRuntime.network !== "devnet") {
    throw new Error("generated MagicBlock runtime evidence header mismatch");
  }

  if (magicBlockRuntime.summary.targetCount < 5) {
    throw new Error("generated MagicBlock runtime evidence target count is unexpectedly low");
  }

  for (const doc of [
    "docs/magicblock/private-payments.md",
    "docs/magicblock/operator-flow.md",
    "docs/magicblock/runtime-evidence.md",
    "docs/magicblock/runtime-captures.json",
  ]) {
    if (!magicBlockRuntime.requiredDocs.includes(doc)) {
      throw new Error(`generated MagicBlock runtime evidence is missing ${doc}`);
    }
  }

  for (const command of [
    "npm run build:magicblock-runtime",
    "npm run verify:magicblock-runtime",
    "npm run record:magicblock-runtime -- <capture-json-path>",
    "npm run configure:magicblock",
    "npm run settle:magicblock",
  ]) {
    if (!magicBlockRuntime.commands.includes(command)) {
      throw new Error(`generated MagicBlock runtime evidence is missing ${command}`);
    }
  }

  for (const capture of magicBlockRuntime.captures) {
    if (capture.network !== "devnet") {
      throw new Error("generated MagicBlock runtime capture must remain devnet-scoped");
    }
    if (!capture.proposalPublicKey || !capture.corridorPda || !capture.settlementWallet) {
      throw new Error("generated MagicBlock runtime capture is missing core corridor metadata");
    }
    if (capture.depositResult === "success" && (!capture.depositTxSignature || !capture.explorerUrls?.deposit?.includes("devnet"))) {
      throw new Error("successful MagicBlock deposit missing explorer evidence");
    }
    if (capture.privateTransferResult === "success" && (!capture.transferTxSignature || !capture.explorerUrls?.transfer?.includes("devnet"))) {
      throw new Error("successful MagicBlock transfer missing explorer evidence");
    }
    if (capture.settleResult === "success") {
      if (!capture.settleTxSignature || !capture.explorerUrls?.settle?.includes("devnet")) {
        throw new Error("successful MagicBlock settlement missing explorer evidence");
      }
      if (!capture.validator || !capture.transferQueue) {
        throw new Error("successful MagicBlock settlement missing validator or queue binding");
      }
    }
    if (capture.executeResult === "success" && (!capture.executeTxSignature || !capture.explorerUrls?.execute?.includes("devnet"))) {
      throw new Error("successful MagicBlock execution missing explorer evidence");
    }
  }

  if (zkEnforcedRuntime.project !== "PrivateDAO" || zkEnforcedRuntime.network !== "devnet") {
    throw new Error("generated zk-enforced runtime evidence header mismatch");
  }

  if (zkEnforcedRuntime.summary.targetCount < 5) {
    throw new Error("generated zk-enforced runtime evidence target count is unexpectedly low");
  }

  for (const doc of [
    "docs/zk/enforced-runtime-evidence.md",
    "docs/zk/enforced-runtime-captures.json",
    "docs/zk/enforced-operator-flow.md",
    "docs/phase-c-hardening.md",
  ]) {
    if (!zkEnforcedRuntime.requiredDocs.includes(doc)) {
      throw new Error(`generated zk-enforced runtime evidence is missing ${doc}`);
    }
  }

  for (const command of [
    "npm run build:zk-enforced-runtime",
    "npm run verify:zk-enforced-runtime",
    "npm run record:zk-enforced-runtime -- <capture-json-path>",
    "npm run configure:zk-mode -- --proposal <PDA> --mode zk_enforced",
    "npm run anchor:zk-verify:enforced",
  ]) {
    if (!zkEnforcedRuntime.commands.includes(command)) {
      throw new Error(`generated zk-enforced runtime evidence is missing ${command}`);
    }
  }

  for (const capture of zkEnforcedRuntime.captures) {
    if (capture.network !== "devnet") {
      throw new Error("generated zk-enforced runtime capture must remain devnet-scoped");
    }
    if (!capture.proposalPublicKey) {
      throw new Error("generated zk-enforced runtime capture missing proposal public key");
    }
    if (capture.modeActivationResult === "success") {
      if (capture.receiptModes.vote !== "zk_enforced" || capture.receiptModes.delegation !== "zk_enforced" || capture.receiptModes.tally !== "zk_enforced") {
        throw new Error("successful zk-enforced runtime activation must carry stronger receipts");
      }
      if (!capture.enableModeTxSignature || !capture.explorerUrls?.enableMode?.includes("devnet")) {
        throw new Error("successful zk-enforced runtime activation missing explorer evidence");
      }
    }
    if (capture.finalizeResult === "success") {
      if (!capture.finalizeTxSignature || !capture.explorerUrls?.finalize?.includes("devnet")) {
        throw new Error("successful zk-enforced runtime finalize missing explorer evidence");
      }
    }
  }

  if (
    !zkEnforcedRuntimeMd.includes("# ZK-Enforced Runtime Evidence") ||
    !zkEnforcedRuntimeMd.includes("Target Matrix") ||
    !zkEnforcedRuntimeMd.includes("Honest Boundary")
  ) {
    throw new Error("generated zk-enforced runtime markdown is invalid");
  }

  if (operationalEvidence.project !== "PrivateDAO") {
    throw new Error("generated operational evidence project mismatch");
  }

  if (operationalEvidence.network !== "devnet") {
    throw new Error("generated operational evidence network mismatch");
  }

  if (operationalEvidence.transactionSummary.walletCount < 50 || operationalEvidence.transactionSummary.totalAttemptCount < 200) {
    throw new Error("generated operational evidence transaction summary is invalid");
  }

  if (operationalEvidence.voting.fullLifecycleReport !== "docs/load-test-report.md" || operationalEvidence.voting.txRegistry !== "docs/devnet-tx-registry.json") {
    throw new Error("generated operational evidence voting references are invalid");
  }

  if (
    operationalEvidence.zk.verificationMode !== "offchain-groth16" ||
    operationalEvidence.zk.proofCount < 1 ||
    operationalEvidence.zk.onchainAnchorCount < 3
  ) {
    throw new Error("generated operational evidence zk summary is invalid");
  }

  if (operationalEvidence.adversarial.unexpectedSuccesses !== 0) {
    throw new Error("generated operational evidence adversarial summary is invalid");
  }

  if (!operationalEvidence.resilience.failoverRecovered || !operationalEvidence.resilience.staleBlockhashRecovered) {
    throw new Error("generated operational evidence resilience summary is invalid");
  }

  if (!operationalEvidence.collisions.finalizeSingleWinner || !operationalEvidence.collisions.executeSingleWinner) {
    throw new Error("generated operational evidence collision summary is invalid");
  }

  for (const doc of [
    "docs/load-test-report.md",
    "docs/devnet-bootstrap.json",
    "docs/devnet-tx-registry.json",
    "docs/performance-metrics.json",
    "docs/adversarial-report.json",
    "docs/zk-proof-registry.json",
    "docs/devnet-multi-proposal-report.md",
    "docs/devnet-race-report.md",
    "docs/devnet-resilience-report.md",
  ]) {
    if (!operationalEvidence.docs.includes(doc)) {
      throw new Error(`generated operational evidence is missing ${doc}`);
    }
  }

  for (const command of [
    "npm run test:devnet:all",
    "npm run test:devnet:multi",
    "npm run test:devnet:race",
    "npm run test:devnet:resilience",
    "npm run build:operational-evidence",
    "npm run verify:operational-evidence",
  ]) {
    if (!operationalEvidence.commands.includes(command)) {
      throw new Error(`generated operational evidence is missing ${command}`);
    }
  }

  if (
    !operationalEvidenceMd.includes("# Operational Evidence Package") ||
    !operationalEvidenceMd.includes("Voting And Lifecycle Evidence") ||
    !operationalEvidenceMd.includes("ZK Companion Evidence") ||
    !operationalEvidenceMd.includes("Resilience Evidence") ||
    !operationalEvidenceMd.includes("Collision Evidence")
  ) {
    throw new Error("generated operational evidence markdown is invalid");
  }

  if (pdaoAttestation.project !== "PrivateDAO") {
    throw new Error("generated PDAO attestation project mismatch");
  }

  if (pdaoAttestation.privateDaoProgramId !== proofRegistry.pdaoToken?.privateDaoProgramId) {
    throw new Error("generated PDAO attestation governance program mismatch");
  }

  if (pdaoAttestation.verificationWallet !== "4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD") {
    throw new Error("generated PDAO attestation verification wallet mismatch");
  }

  if (!pdaoAttestation.pdaoToken.name.includes("PrivateDAO") || pdaoAttestation.pdaoToken.symbol !== "PDAO") {
    throw new Error("generated PDAO attestation token identity mismatch");
  }

  if (pdaoAttestation.pdaoToken.platform !== "DeAura") {
    throw new Error("generated PDAO attestation platform mismatch");
  }

  if (pdaoAttestation.pdaoToken.mint !== proofRegistry.pdaoToken?.mint) {
    throw new Error("generated PDAO attestation mint mismatch");
  }

  if (pdaoAttestation.pdaoToken.tokenProgramId !== proofRegistry.pdaoToken?.programId) {
    throw new Error("generated PDAO attestation token program mismatch");
  }

  if (pdaoAttestation.pdaoToken.metadataAssetPath !== "docs/assets/pdao-token.json") {
    throw new Error("generated PDAO attestation metadata asset path mismatch");
  }

  if (pdaoAttestation.pdaoToken.metadataUri !== "https://privatedao.org/assets/pdao-token.json") {
    throw new Error("generated PDAO attestation metadata URI mismatch");
  }

  if (pdaoAttestation.pdaoToken.supplyUi !== "1000000" || pdaoAttestation.pdaoToken.transactionLabels.length < 4) {
    throw new Error("generated PDAO attestation supply summary is incomplete");
  }

  if (pdaoAttestation.programBoundary.privateDaoProgramId !== pdaoAttestation.privateDaoProgramId) {
    throw new Error("generated PDAO attestation boundary governance mismatch");
  }

  if (!pdaoAttestation.programBoundary.explanation.includes("Token-2022")) {
    throw new Error("generated PDAO attestation boundary explanation is incomplete");
  }

  if (!pdaoAttestation.verificationDocs.includes("docs/assets/pdao-token.json")) {
    throw new Error("generated PDAO attestation is missing the metadata asset reference");
  }

  if (zkAttestation.project !== "PrivateDAO") {
    throw new Error("generated zk attestation project mismatch");
  }

  if (zkAttestation.zkStackVersion !== zkRegistry.zkStackVersion || zkAttestation.layerCount !== zkRegistry.entryCount) {
    throw new Error("generated zk attestation summary mismatch");
  }

  if (zkAttestation.provingSystem !== "groth16" || zkAttestation.layers.length < 3) {
    throw new Error("generated zk attestation proving summary is unexpectedly weak");
  }

  if (!cryptographicManifest.files.some((entry) => entry.path === "docs/zk-registry.generated.json")) {
    throw new Error("generated cryptographic manifest is missing the zk registry");
  }

  if (!cryptographicManifest.files.some((entry) => entry.path === "docs/zk-transcript.generated.md")) {
    throw new Error("generated cryptographic manifest is missing the zk transcript");
  }

  if (!cryptographicManifest.files.some((entry) => entry.path === "docs/zk-attestation.generated.json")) {
    throw new Error("generated cryptographic manifest is missing the zk attestation");
  }

  if (!cryptographicManifest.files.some((entry) => entry.path === "docs/deployment-attestation.generated.json")) {
    throw new Error("generated cryptographic manifest is missing the deployment attestation");
  }
  if (!cryptographicManifest.files.some((entry) => entry.path === "docs/pdao-attestation.generated.json")) {
    throw new Error("generated cryptographic manifest is missing the PDAO attestation");
  }
  if (!cryptographicManifest.files.some((entry) => entry.path === "docs/assets/pdao-token.json")) {
    throw new Error("generated cryptographic manifest is missing the PDAO metadata asset");
  }
  if (!cryptographicManifest.files.some((entry) => entry.path === "docs/devnet-multi-proposal-report.json")) {
    throw new Error("generated cryptographic manifest is missing the multi-proposal report");
  }
  if (!cryptographicManifest.files.some((entry) => entry.path === "docs/devnet-race-report.json")) {
    throw new Error("generated cryptographic manifest is missing the race report");
  }
  if (!cryptographicManifest.files.some((entry) => entry.path === "docs/devnet-resilience-report.json")) {
    throw new Error("generated cryptographic manifest is missing the resilience report");
  }
  if (!cryptographicManifest.files.some((entry) => entry.path === "docs/wallet-compatibility-matrix.generated.json")) {
    throw new Error("generated cryptographic manifest is missing the wallet matrix");
  }
  if (!cryptographicManifest.files.some((entry) => entry.path === "docs/devnet-canary.generated.json")) {
    throw new Error("generated cryptographic manifest is missing the devnet canary");
  }
  if (!cryptographicManifest.files.some((entry) => entry.path === "docs/runtime/real-device.generated.json")) {
    throw new Error("generated cryptographic manifest is missing the real-device runtime evidence");
  }
  if (!cryptographicManifest.files.some((entry) => entry.path === "docs/magicblock/runtime.generated.json")) {
    throw new Error("generated cryptographic manifest is missing the MagicBlock runtime evidence");
  }
  if (!cryptographicManifest.files.some((entry) => entry.path === "docs/cryptographic-posture.md")) {
    throw new Error("generated cryptographic manifest is missing the cryptographic posture note");
  }
  if (!cryptographicManifest.files.some((entry) => entry.path === "docs/supply-chain-attestation.generated.json")) {
    throw new Error("generated cryptographic manifest is missing the supply-chain attestation");
  }
  if (!cryptographicManifest.files.some((entry) => entry.path === "docs/release-ceremony-attestation.generated.json")) {
    throw new Error("generated cryptographic manifest is missing the release ceremony attestation");
  }
  for (const launchOpsFile of [
    "docs/launch-ops-checklist.json",
    "docs/launch-ops-checklist.md",
    "docs/authority-transfer-runbook.md",
    "docs/monitoring-alert-rules.json",
    "docs/monitoring-alert-rules.md",
    "docs/wallet-e2e-test-plan.md",
  ]) {
    if (!cryptographicManifest.files.some((entry) => entry.path === launchOpsFile)) {
      throw new Error(`generated cryptographic manifest is missing ${launchOpsFile}`);
    }
  }

  if (supplyChain.project !== "PrivateDAO" || supplyChain.algorithm !== "sha256") {
    throw new Error("generated supply-chain attestation summary mismatch");
  }
  if (supplyChain.topLevel.name !== "private-dao" || supplyChain.topLevel.dependencies <= 0) {
    throw new Error("generated supply-chain attestation top-level package summary is incomplete");
  }
  if (supplyChain.lockfiles.cargo.path !== "Cargo.lock" || supplyChain.lockfiles.cargo.packageCount <= 0) {
    throw new Error("generated supply-chain attestation cargo summary is incomplete");
  }
  if (!supplyChain.lockfiles.npm.path.endsWith("package-lock.json") || supplyChain.lockfiles.npm.packageCount <= 0) {
    throw new Error("generated supply-chain attestation npm summary is incomplete");
  }
  if (supplyChain.lockfiles.yarn.path !== "yarn.lock" || supplyChain.lockfiles.yarn.entryCount <= 0) {
    throw new Error("generated supply-chain attestation yarn summary is incomplete");
  }
  if (!supplyChain.files.some((entry) => entry.path === "Cargo.lock")) {
    throw new Error("generated supply-chain attestation is missing Cargo.lock");
  }
  if (!supplyChain.files.some((entry) => entry.path === supplyChain.lockfiles.npm.path)) {
    throw new Error("generated supply-chain attestation is missing package-lock.json");
  }
  if (!supplyChain.files.some((entry) => entry.path === "yarn.lock")) {
    throw new Error("generated supply-chain attestation is missing yarn.lock");
  }
  if (!supplyChain.reviewCommands.includes("npm run verify:supply-chain-attestation")) {
    throw new Error("generated supply-chain attestation is missing its verification command");
  }
  if (!supplyChainMd.includes("# Supply-Chain Attestation")) {
    throw new Error("generated supply-chain attestation markdown is invalid");
  }
  if (!supplyChainMd.includes("Aggregate sha256")) {
    throw new Error("generated supply-chain attestation markdown is missing aggregate sha256");
  }

  if (releaseCeremony.project !== "PrivateDAO") {
    throw new Error("generated release ceremony attestation project mismatch");
  }
  if (releaseCeremony.programId !== "5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx") {
    throw new Error("generated release ceremony attestation program mismatch");
  }
  if (releaseCeremony.verificationWallet !== "4Mm5YTRbJuyA8NcWM85wTnx6ZQMXNph2DSnzCCKLhsMD") {
    throw new Error("generated release ceremony attestation verification wallet mismatch");
  }
  if (releaseCeremony.releaseCommit.length < 7 || releaseCeremony.releaseBranch.length < 1) {
    throw new Error("generated release ceremony attestation git summary is incomplete");
  }
  if (!releaseCeremony.ceremonyDocs.includes("docs/release-ceremony.md")) {
    throw new Error("generated release ceremony attestation is missing release-ceremony.md");
  }
  if (!releaseCeremony.ceremonyDocs.includes("docs/mainnet-cutover-runbook.md")) {
    throw new Error("generated release ceremony attestation is missing the cutover runbook");
  }
  if (!releaseCeremony.mandatoryGates.includes("npm run check:mainnet")) {
    throw new Error("generated release ceremony attestation is missing check:mainnet");
  }
  if (releaseCeremony.goLiveDecision !== "blocked-pending-external-steps") {
    throw new Error("generated release ceremony go-live decision mismatch");
  }
  if (!releaseCeremony.unresolvedBlockers.some((entry) => entry.name === "externalAudit")) {
    throw new Error("generated release ceremony attestation is missing the externalAudit blocker");
  }
  if (!releaseCeremonyMd.includes("# Release Ceremony Attestation")) {
    throw new Error("generated release ceremony markdown is invalid");
  }

  if (releaseDrill.project !== "PrivateDAO") {
    throw new Error("generated release drill project mismatch");
  }
  if (releaseDrill.mode !== "repository-simulated-drill") {
    throw new Error("generated release drill mode mismatch");
  }
  if (releaseDrill.programId !== releaseCeremony.programId) {
    throw new Error("generated release drill program mismatch");
  }
  if (releaseDrill.verificationWallet !== releaseCeremony.verificationWallet) {
    throw new Error("generated release drill verification wallet mismatch");
  }
  if (releaseDrill.releaseCommit !== releaseCeremony.releaseCommit || releaseDrill.releaseBranch !== releaseCeremony.releaseBranch) {
    throw new Error("generated release drill git summary mismatch");
  }
  if (!releaseDrill.stages.some((entry) => entry.stage === "commit-freeze" && entry.status === "simulated-pass")) {
    throw new Error("generated release drill is missing commit-freeze stage");
  }
  if (!releaseDrill.stages.some((entry) => entry.stage === "mainnet-cutover" && entry.status === "blocked-external-step")) {
    throw new Error("generated release drill is missing mainnet-cutover blocked stage");
  }
  if (!releaseDrill.unresolvedBlockers.some((entry) => entry.name === "externalAudit")) {
    throw new Error("generated release drill is missing the externalAudit blocker");
  }
  for (const gate of [
    "npm run verify:live-proof",
    "npm run verify:release-manifest",
    "npm run verify:review-links",
    "npm run verify:review-surface",
    "npm run check:mainnet",
  ]) {
    if (!releaseDrill.mandatoryGates.includes(gate)) {
      throw new Error(`generated release drill is missing ${gate}`);
    }
  }
  for (const doc of [
    "docs/release-ceremony.md",
    "docs/release-ceremony-attestation.generated.md",
    "docs/mainnet-cutover-runbook.md",
    "docs/operator-checklist.md",
    "docs/go-live-criteria.md",
    "docs/mainnet-readiness.generated.md",
  ]) {
    if (!releaseDrill.drillDocs.includes(doc)) {
      throw new Error(`generated release drill is missing ${doc}`);
    }
  }
  if (
    !releaseDrillMd.includes("# Release Drill Evidence") ||
    !releaseDrillMd.includes("repository-simulated-drill") ||
    !releaseDrillMd.includes("Unresolved Blockers")
  ) {
    throw new Error("generated release drill markdown is invalid");
  }

  for (const manifestFile of [
    "docs/runtime-evidence.generated.json",
    "docs/runtime-evidence.generated.md",
    "docs/release-drill.generated.json",
    "docs/release-drill.generated.md",
  ]) {
    if (!cryptographicManifest.files.some((entry) => entry.path === manifestFile)) {
      throw new Error(`generated cryptographic manifest is missing ${manifestFile}`);
    }
  }

  console.log("Generated artifact verification: PASS");
}

main();
