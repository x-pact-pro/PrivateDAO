// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * live-devnet-proof-v3.ts
 * Runs two real Testnet flows against the deployed program:
 * 1. Governance Hardening V3 lifecycle with token-supply quorum and dedicated rebate vault
 * 2. Settlement Hardening V3 lifecycle with strict settlement snapshot and evidence-gated execution
 */
import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Keypair, Transaction } from "@solana/web3.js";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import {
  canonicalPayoutFieldsHash,
  computeProposalCommitment,
  deriveDaoGovernancePolicyV3Pda,
  deriveDaoSecurityPolicyPda,
  deriveDaoSettlementPolicyV3Pda,
  deriveMagicBlockPrivatePaymentCorridorPda,
  deriveProposalGovernancePolicySnapshotV3Pda,
  deriveProposalSettlementPolicySnapshotV3Pda,
  deriveRefheEnvelopePda,
  deriveRevealRebateVaultV3Pda,
  deriveSettlementConsumptionRecordPda,
  deriveSettlementEvidencePda,
  formatSol,
  formatTimestamp,
  currentClusterLabel,
  parseArgs,
  proposalStatusLabel,
  resolveTokenProgramForMint,
  solscanAccountUrl,
  solscanTxUrl,
  workspaceProgram,
} from "./utils";

type GovernanceV3Payload = {
  dao: string;
  governanceMint: string;
  treasury: string;
  proposal: string;
  governancePolicy: string;
  governanceSnapshot: string;
  revealRebateVault: string;
  recipientWallet: string;
  timings: {
    votingEnd: number;
    revealEnd: number;
    executionUnlocksAt: number;
  };
  transactions: Record<string, string>;
  invariants: {
    status: string;
    isExecuted: boolean;
    eligibleCapital: string;
    yesCapital: string;
    revealCount: string;
    commitCount: string;
    revealVaultBeforeLamports: number;
    revealVaultAfterLamports: number;
    treasuryBeforeExecuteLamports: number;
    treasuryAfterExecuteLamports: number;
    recipientBeforeLamports: number;
    recipientAfterLamports: number;
  };
};

type SettlementV3Payload = {
  dao: string;
  treasury: string;
  proposal: string;
  governancePolicy: string;
  governanceSnapshot: string;
  revealRebateVault: string;
  securityPolicy: string;
  settlementPolicy: string;
  settlementSnapshot: string;
  payoutPlan: string;
  refheEnvelope: string;
  magicblockCorridor: string;
  settlementEvidence: string;
  settlementConsumptionRecord: string;
  settlementRecipient: string;
  timings: {
    votingEnd: number;
    revealEnd: number;
    executionUnlocksAt: number;
  };
  transactions: Record<string, string>;
  invariants: {
    status: string;
    isExecuted: boolean;
    payoutStatus: string;
    eligibleCapital: string;
    revealCount: string;
    commitCount: string;
    revealVaultBeforeLamports: number;
    revealVaultAfterLamports: number;
    treasuryBeforeExecuteLamports: number;
    treasuryAfterExecuteLamports: number;
    recipientBeforeLamports: number;
    recipientAfterLamports: number;
    evidenceStatus: string;
    evidenceConsumed: boolean;
    treasuryTokenBeforeAmount: string;
    treasuryTokenAfterAmount: string;
    recipientTokenBeforeAmount: string;
    recipientTokenAfterAmount: string;
  };
};

type ProofV3 = {
  generatedAt: string;
  mode: string;
  cluster: string;
  anchorVersion: string;
  operatorWallet: string;
  programId: string;
  governanceV3: GovernanceV3Payload;
  settlementV3: SettlementV3Payload;
};

function randomHash(): number[] {
  return [...crypto.randomBytes(32)];
}

async function waitUntil(targetUnix: number, label: string) {
  for (;;) {
    const now = Math.floor(Date.now() / 1000);
    if (now >= targetUnix) return;
    const remaining = targetUnix - now;
    console.log(`   Waiting for ${label}: ${remaining}s`);
    await new Promise((resolve) => setTimeout(resolve, Math.min(remaining, 2) * 1000));
  }
}

function shortDaoSuffix(prefix: string, tag: string): string {
  const compact = `${prefix}-${tag}-${Date.now().toString(36).slice(-4)}`;
  return compact.slice(0, 24);
}

async function getOrCreateVoterAtaWithRetry(
  connection: anchor.web3.Connection,
  payer: anchor.web3.Keypair,
  mint: PublicKey,
  owner: PublicKey,
  tokenProgram: PublicKey,
) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        mint,
        owner,
        false,
        "finalized",
        undefined,
        tokenProgram,
      );
    } catch (error) {
      lastError = error;
      if (attempt === 3) break;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
  }
  throw lastError;
}

async function fundEphemeralWallet(
  provider: anchor.AnchorProvider,
  payer: anchor.web3.Keypair,
  recipient: PublicKey,
  lamports: number,
) {
  const tx = await provider.sendAndConfirm(
    new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: provider.wallet.publicKey,
        toPubkey: recipient,
        lamports,
      }),
    ),
    [payer],
  );
  return tx;
}

async function runGovernanceV3Flow(params: {
  provider: anchor.AnchorProvider;
  program: any;
  payer: anchor.web3.Keypair;
  walletPk: PublicKey;
  mint: PublicKey;
  tokenProgram: PublicKey;
  voterTokenAccountAddress: PublicKey;
  namePrefix: string;
  depositSol: number;
  treasuryAmountSol: number;
  quorum: number;
  durationSeconds: number;
  revealWindowSeconds: number;
  executionDelaySeconds: number;
}): Promise<GovernanceV3Payload> {
  const {
    provider,
    program,
    payer,
    walletPk,
    mint,
    tokenProgram,
    voterTokenAccountAddress,
    namePrefix,
    depositSol,
    treasuryAmountSol,
    quorum,
    durationSeconds,
    revealWindowSeconds,
    executionDelaySeconds,
  } = params;

  const governanceRecipient = Keypair.generate();
  await fundEphemeralWallet(provider, payer, governanceRecipient.publicKey, Math.round(0.005 * LAMPORTS_PER_SOL));

  const daoName = shortDaoSuffix(namePrefix, "gv3");
  const [daoPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("dao"), walletPk.toBuffer(), Buffer.from(daoName)],
    program.programId,
  );
  const [treasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("treasury"), daoPda.toBuffer()],
    program.programId,
  );
  const [governancePolicyPda] = [deriveDaoGovernancePolicyV3Pda(daoPda, program.programId)];
  const [revealRebateVaultPda] = [deriveRevealRebateVaultV3Pda(daoPda, program.programId)];

  const createDaoTx = await program.methods
    .initializeDao(
      daoName,
      quorum,
      new BN(0),
      new BN(revealWindowSeconds),
      new BN(executionDelaySeconds),
      { tokenWeighted: {} },
    )
    .accounts({
      dao: daoPda,
      governanceToken: mint,
      authority: walletPk,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log(`   Settlement V3 create DAO: ${createDaoTx}`);

  const governancePolicyTx = await program.methods
    .initializeDaoGovernancePolicyV3(
      { tokenSupplyParticipation: {} },
      { dedicatedVaultRequired: {} },
      new BN(1_000_000),
    )
    .accounts({
      dao: daoPda,
      daoGovernancePolicyV3: governancePolicyPda,
      authority: walletPk,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const fundVaultTx = await program.methods
    .fundRevealRebateVaultV3(new BN(2_000_000))
    .accounts({
      dao: daoPda,
      daoGovernancePolicyV3: governancePolicyPda,
      revealRebateVault: revealRebateVaultPda,
      funder: walletPk,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const depositTx = await program.methods
    .depositTreasury(new BN(Math.floor(depositSol * LAMPORTS_PER_SOL)))
    .accounts({
      dao: daoPda,
      treasury: treasuryPda,
      depositor: walletPk,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const dao = await program.account.dao.fetch(daoPda);
  const [proposalPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("proposal"), daoPda.toBuffer(), dao.proposalCount.toArrayLike(Buffer, "le", 8)],
    program.programId,
  );
  const createProposalTx = await program.methods
    .createProposal(
      "Governance Hardening V3 live proof",
      "Live Devnet proof for token-supply quorum, dedicated reveal rebate vault, and V3 finalize path.",
      new BN(durationSeconds),
      {
        actionType: { sendSol: {} },
        amountLamports: new BN(Math.floor(treasuryAmountSol * LAMPORTS_PER_SOL)),
        recipient: governanceRecipient.publicKey,
        tokenMint: null,
      },
    )
    .accounts({
      dao: daoPda,
      proposal: proposalPda,
      proposerTokenAccount: voterTokenAccountAddress,
      proposer: walletPk,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const governanceSnapshotPda = deriveProposalGovernancePolicySnapshotV3Pda(proposalPda, program.programId);
  const snapshotTx = await program.methods
    .snapshotProposalGovernancePolicyV3()
    .accounts({
      dao: daoPda,
      daoGovernancePolicyV3: governancePolicyPda,
      proposal: proposalPda,
      governanceToken: mint,
      proposalGovernancePolicySnapshotV3: governanceSnapshotPda,
      operator: walletPk,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const salt = crypto.randomBytes(32);
  const commitment = computeProposalCommitment(true, salt, walletPk, proposalPda);
  const [voteRecordPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vote"), proposalPda.toBuffer(), walletPk.toBuffer()],
    program.programId,
  );
  const [delegationMarkerPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("delegation"), proposalPda.toBuffer(), walletPk.toBuffer()],
    program.programId,
  );
  const commitTx = await program.methods
    .commitVote([...commitment], null)
    .accounts({
      dao: daoPda,
      proposal: proposalPda,
      voterRecord: voteRecordPda,
      delegationMarker: delegationMarkerPda,
      voterTokenAccount: voterTokenAccountAddress,
      voter: walletPk,
      tokenProgram,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  let proposal = await program.account.proposal.fetch(proposalPda);
  await waitUntil(proposal.votingEnd.toNumber() + 1, "governance V3 reveal phase");

  const revealVaultBefore = await provider.connection.getBalance(revealRebateVaultPda);
  const recipientBefore = await provider.connection.getBalance(governanceRecipient.publicKey);
  const treasuryBeforeExecute = await provider.connection.getBalance(treasuryPda);

  const revealTx = await program.methods
    .revealVoteV3(true, [...salt])
    .accounts({
      proposal: proposalPda,
      voterRecord: voteRecordPda,
      proposalGovernancePolicySnapshotV3: governanceSnapshotPda,
      revealRebateVault: revealRebateVaultPda,
      revealer: walletPk,
    })
    .rpc();

  proposal = await program.account.proposal.fetch(proposalPda);
  await waitUntil(proposal.revealEnd.toNumber() + 1, "governance V3 finalize phase");

  const finalizeTx = await program.methods
    .finalizeProposalV3()
    .accounts({
      dao: daoPda,
      proposal: proposalPda,
      proposalGovernancePolicySnapshotV3: governanceSnapshotPda,
      finalizer: walletPk,
    })
    .rpc();

  proposal = await program.account.proposal.fetch(proposalPda);
  await waitUntil(proposal.executionUnlocksAt.toNumber() + 1, "governance V3 execution unlock");

  const executeTx = await program.methods
    .executeProposal()
    .accounts({
      dao: daoPda,
      proposal: proposalPda,
      treasury: treasuryPda,
      executor: walletPk,
      treasuryRecipient: governanceRecipient.publicKey,
      treasuryTokenAccount: treasuryPda,
      recipientTokenAccount: treasuryPda,
      confidentialPayoutPlan: PublicKey.findProgramAddressSync(
        [Buffer.from("payout-plan"), proposalPda.toBuffer()],
        program.programId,
      )[0],
      tokenProgram,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const finalProposal = await program.account.proposal.fetch(proposalPda);
  const governanceSnapshot = await program.account.proposalGovernancePolicySnapshotV3.fetch(governanceSnapshotPda);
  const revealVaultAfter = await provider.connection.getBalance(revealRebateVaultPda);
  const treasuryAfterExecute = await provider.connection.getBalance(treasuryPda);
  const recipientAfter = await provider.connection.getBalance(governanceRecipient.publicKey);

  return {
    dao: daoPda.toBase58(),
    governanceMint: mint.toBase58(),
    treasury: treasuryPda.toBase58(),
    proposal: proposalPda.toBase58(),
    governancePolicy: governancePolicyPda.toBase58(),
    governanceSnapshot: governanceSnapshotPda.toBase58(),
    revealRebateVault: revealRebateVaultPda.toBase58(),
    recipientWallet: governanceRecipient.publicKey.toBase58(),
    timings: {
      votingEnd: finalProposal.votingEnd.toNumber(),
      revealEnd: finalProposal.revealEnd.toNumber(),
      executionUnlocksAt: finalProposal.executionUnlocksAt.toNumber(),
    },
    transactions: {
      createDao: createDaoTx,
      initializeGovernancePolicyV3: governancePolicyTx,
      fundRevealRebateVaultV3: fundVaultTx,
      deposit: depositTx,
      createProposal: createProposalTx,
      snapshotGovernancePolicyV3: snapshotTx,
      commit: commitTx,
      revealV3: revealTx,
      finalizeV3: finalizeTx,
      execute: executeTx,
    },
    invariants: {
      status: proposalStatusLabel(finalProposal.status),
      isExecuted: finalProposal.isExecuted,
      eligibleCapital: governanceSnapshot.eligibleCapital.toString(),
      yesCapital: finalProposal.yesCapital.toString(),
      revealCount: finalProposal.revealCount.toString(),
      commitCount: finalProposal.commitCount.toString(),
      revealVaultBeforeLamports: revealVaultBefore,
      revealVaultAfterLamports: revealVaultAfter,
      treasuryBeforeExecuteLamports: treasuryBeforeExecute,
      treasuryAfterExecuteLamports: treasuryAfterExecute,
      recipientBeforeLamports: recipientBefore,
      recipientAfterLamports: recipientAfter,
    },
  };
}

async function runSettlementV3Flow(params: {
  provider: anchor.AnchorProvider;
  program: any;
  walletPk: PublicKey;
  mint: PublicKey;
  tokenProgram: PublicKey;
  voterTokenAccountAddress: PublicKey;
  namePrefix: string;
}): Promise<SettlementV3Payload> {
  const {
    provider,
    program,
    walletPk,
    mint,
    tokenProgram,
    voterTokenAccountAddress,
    namePrefix,
  } = params;

  const attestors = [walletPk, PublicKey.default, PublicKey.default, PublicKey.default, PublicKey.default];
  const settlementRecipient = Keypair.generate();
  const fundRecipientTx = await provider.sendAndConfirm(
    new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: walletPk,
        toPubkey: settlementRecipient.publicKey,
        lamports: Math.round(0.005 * LAMPORTS_PER_SOL),
      }),
    ),
    [],
  );

  const daoName = shortDaoSuffix(namePrefix, "sv3");
  const [daoPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("dao"), walletPk.toBuffer(), Buffer.from(daoName)],
    program.programId,
  );
  const [treasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("treasury"), daoPda.toBuffer()],
    program.programId,
  );
  const securityPolicyPda = deriveDaoSecurityPolicyPda(daoPda, program.programId);
  const governancePolicyPda = deriveDaoGovernancePolicyV3Pda(daoPda, program.programId);
  const settlementPolicyPda = deriveDaoSettlementPolicyV3Pda(daoPda, program.programId);
  const revealRebateVaultPda = deriveRevealRebateVaultV3Pda(daoPda, program.programId);

  const createDaoTx = await program.methods
    .initializeDao(
      daoName,
      51,
      new BN(0),
      new BN(6),
      new BN(0),
      { tokenWeighted: {} },
    )
    .accounts({
      dao: daoPda,
      governanceToken: mint,
      authority: walletPk,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const initSecurityPolicyTx = await program.methods
    .initializeDaoSecurityPolicy(
      { strictRequired: {} },
      { thresholdAttestedRequired: {} },
      { strictRequired: {} },
      { noCancelAfterParticipation: {} },
      attestors,
      1,
      1,
      attestors,
      1,
      1,
      new BN(3600),
      new BN(3600),
    )
    .accounts({
      dao: daoPda,
      daoSecurityPolicy: securityPolicyPda,
      authority: walletPk,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log(`   Settlement V3 init security policy: ${initSecurityPolicyTx}`);

  const initGovernancePolicyTx = await program.methods
    .initializeDaoGovernancePolicyV3(
      { tokenSupplyParticipation: {} },
      { dedicatedVaultRequired: {} },
      new BN(1_000_000),
    )
    .accounts({
      dao: daoPda,
      daoGovernancePolicyV3: governancePolicyPda,
      authority: walletPk,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log(`   Settlement V3 init governance policy: ${initGovernancePolicyTx}`);

  const fundVaultTx = await program.methods
    .fundRevealRebateVaultV3(new BN(2_000_000))
    .accounts({
      dao: daoPda,
      daoGovernancePolicyV3: governancePolicyPda,
      revealRebateVault: revealRebateVaultPda,
      funder: walletPk,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log(`   Settlement V3 fund rebate vault: ${fundVaultTx}`);

  const initSettlementPolicyTx = await program.methods
    .initializeDaoSettlementPolicyV3(new BN(0), new BN(60_000_000), true, true)
    .accounts({
      dao: daoPda,
      daoSettlementPolicyV3: settlementPolicyPda,
      authority: walletPk,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log(`   Settlement V3 init settlement policy: ${initSettlementPolicyTx}`);

  const dao = await program.account.dao.fetch(daoPda);
  const [proposalPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("proposal"), daoPda.toBuffer(), dao.proposalCount.toArrayLike(Buffer, "le", 8)],
    program.programId,
  );
  const createProposalTx = await program.methods
    .createProposal(
      "Settlement Hardening V3 + REFHE + MagicBlock live proof",
      "Execute a token confidential payout only after REFHE settlement, MagicBlock corridor settlement, and strict settlement evidence.",
      new BN(45),
      null,
    )
    .accounts({
      dao: daoPda,
      proposal: proposalPda,
      proposerTokenAccount: voterTokenAccountAddress,
      proposer: walletPk,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log(`   Settlement V3 create proposal: ${createProposalTx}`);

  const payoutPlanPda = PublicKey.findProgramAddressSync(
    [Buffer.from("payout-plan"), proposalPda.toBuffer()],
    program.programId,
  )[0];
  const refheEnvelopePda = deriveRefheEnvelopePda(proposalPda, program.programId);
  const magicblockCorridorPda = deriveMagicBlockPrivatePaymentCorridorPda(proposalPda, program.programId);
  const governanceSnapshotPda = deriveProposalGovernancePolicySnapshotV3Pda(proposalPda, program.programId);
  const settlementSnapshotPda = deriveProposalSettlementPolicySnapshotV3Pda(proposalPda, program.programId);

  const manifestHash = randomHash();
  const ciphertextHash = randomHash();
  const configurePayoutTx = await program.methods
    .configureConfidentialPayoutPlan(
      { bonus: {} },
      { token: {} },
      settlementRecipient.publicKey,
      mint,
      2,
      new BN(50_000_000),
      "box://privatedao/testnet/encrypted-integrations-v3/token-bonus-epoch-1",
      manifestHash,
      ciphertextHash,
    )
    .accounts({
      dao: daoPda,
      proposal: proposalPda,
      confidentialPayoutPlan: payoutPlanPda,
      operator: walletPk,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log(`   Settlement V3 configure payout: ${configurePayoutTx}`);

  const treasuryTokenAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    (provider.wallet as anchor.Wallet).payer,
    mint,
    treasuryPda,
    true,
    "confirmed",
    undefined,
    tokenProgram,
  );
  const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    (provider.wallet as anchor.Wallet).payer,
    mint,
    settlementRecipient.publicKey,
    false,
    "confirmed",
    undefined,
    tokenProgram,
  );
  await mintTo(
    provider.connection,
    (provider.wallet as anchor.Wallet).payer,
    mint,
    treasuryTokenAccount.address,
    (provider.wallet as anchor.Wallet).payer,
    60_000_000n,
    [],
    undefined,
    tokenProgram,
  );

  const configureRefheTx = await program.methods
    .configureRefheEnvelope(
      "box://privatedao/testnet/encrypted-integrations-v3/refhe-epoch-1",
      randomHash(),
      ciphertextHash,
      randomHash(),
    )
    .accounts({
      dao: daoPda,
      proposal: proposalPda,
      confidentialPayoutPlan: payoutPlanPda,
      refheEnvelope: refheEnvelopePda,
      operator: walletPk,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log(`   Settlement V3 configure REFHE: ${configureRefheTx}`);

  const configureMagicBlockTx = await program.methods
    .configureMagicblockPrivatePaymentCorridor(
      "https://payments.magicblock.app",
      currentClusterLabel(),
      walletPk,
      settlementRecipient.publicKey,
      randomHash(),
      new BN(50_000_000),
      new BN(50_000_000),
      new BN(50_000_000),
    )
    .accounts({
      dao: daoPda,
      proposal: proposalPda,
      confidentialPayoutPlan: payoutPlanPda,
      magicblockPrivatePaymentCorridor: magicblockCorridorPda,
      operator: walletPk,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log(`   Settlement V3 configure MagicBlock corridor: ${configureMagicBlockTx}`);

  const snapshotGovernanceTx = await program.methods
    .snapshotProposalGovernancePolicyV3()
    .accounts({
      dao: daoPda,
      daoGovernancePolicyV3: governancePolicyPda,
      proposal: proposalPda,
      governanceToken: mint,
      proposalGovernancePolicySnapshotV3: governanceSnapshotPda,
      operator: walletPk,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log(`   Settlement V3 snapshot governance: ${snapshotGovernanceTx}`);

  const snapshotSettlementTx = await program.methods
    .snapshotProposalSettlementPolicyV3()
    .accounts({
      dao: daoPda,
      daoSettlementPolicyV3: settlementPolicyPda,
      proposal: proposalPda,
      confidentialPayoutPlan: payoutPlanPda,
      proposalSettlementPolicySnapshotV3: settlementSnapshotPda,
      operator: walletPk,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log(`   Settlement V3 snapshot settlement: ${snapshotSettlementTx}`);

  const depositTx = await program.methods
    .depositTreasury(new BN(100_000_000))
    .accounts({
      dao: daoPda,
      treasury: treasuryPda,
      depositor: walletPk,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log(`   Settlement V3 deposit treasury: ${depositTx}`);

  const salt = crypto.randomBytes(32);
  const commitment = computeProposalCommitment(true, salt, walletPk, proposalPda);
  const voteRecordPda = PublicKey.findProgramAddressSync(
    [Buffer.from("vote"), proposalPda.toBuffer(), walletPk.toBuffer()],
    program.programId,
  )[0];
  const delegationMarkerPda = PublicKey.findProgramAddressSync(
    [Buffer.from("delegation"), proposalPda.toBuffer(), walletPk.toBuffer()],
    program.programId,
  )[0];

  const commitTx = await program.methods
    .commitVote([...commitment], null)
    .accounts({
      dao: daoPda,
      proposal: proposalPda,
      voterRecord: voteRecordPda,
      delegationMarker: delegationMarkerPda,
      voterTokenAccount: voterTokenAccountAddress,
      voter: walletPk,
      tokenProgram,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log(`   Settlement V3 commit: ${commitTx}`);

  let proposal = await program.account.proposal.fetch(proposalPda);
  await waitUntil(proposal.votingEnd.toNumber() + 1, "settlement V3 reveal phase");

  const revealVaultBefore = await provider.connection.getBalance(revealRebateVaultPda);
  const recipientBefore = await provider.connection.getBalance(settlementRecipient.publicKey);
  const treasuryBeforeExecute = await provider.connection.getBalance(treasuryPda);

  const revealTx = await program.methods
    .revealVoteV3(true, [...salt])
    .accounts({
      proposal: proposalPda,
      voterRecord: voteRecordPda,
      proposalGovernancePolicySnapshotV3: governanceSnapshotPda,
      revealRebateVault: revealRebateVaultPda,
      revealer: walletPk,
    })
    .rpc();

  proposal = await program.account.proposal.fetch(proposalPda);
  await waitUntil(proposal.revealEnd.toNumber() + 1, "settlement V3 finalize phase");

  const finalizeTx = await program.methods
    .finalizeProposalV3()
    .accounts({
      dao: daoPda,
      proposal: proposalPda,
      proposalGovernancePolicySnapshotV3: governanceSnapshotPda,
      finalizer: walletPk,
    })
    .rpc();

  const settleRefheTx = await program.methods
    .settleRefheEnvelope(randomHash(), randomHash(), randomHash(), program.programId)
    .accounts({
      dao: daoPda,
      proposal: proposalPda,
      confidentialPayoutPlan: payoutPlanPda,
      refheEnvelope: refheEnvelopePda,
      operator: walletPk,
    })
    .rpc();

  const settleMagicBlockTx = await program.methods
    .settleMagicblockPrivatePaymentCorridor(
      settlementRecipient.publicKey,
      Keypair.generate().publicKey,
      "4J3YVTFs2Y5zZp5x6b7mQk2u1oD9c8N7e6w5r4t3s2q1p0LmNoPkJiHgFeDcBa987654321111111111",
      "2qwYfTQ3h1x5b8c6d7e9fLmNoPkJiHgFeDcBa987654321111111111111111111111111111111111111",
      "5mN9vB6xC3zA1sD2fG4hJ6kL8qW0eR2tY4uI6oP8aS0dF2gH4jK6lN8mQ0rT2yU4iO6pA8sD0fG2hJ4kL",
    )
    .accounts({
      dao: daoPda,
      proposal: proposalPda,
      confidentialPayoutPlan: payoutPlanPda,
      magicblockPrivatePaymentCorridor: magicblockCorridorPda,
      operator: walletPk,
    })
    .rpc();

  const payoutPlan = await program.account.confidentialPayoutPlan.fetch(payoutPlanPda);
  const settlementId = crypto.randomBytes(32);
  const settlementEvidencePda = deriveSettlementEvidencePda(
    proposalPda,
    payoutPlanPda,
    settlementId,
    program.programId,
  );
  const settlementConsumptionPda = deriveSettlementConsumptionRecordPda(
    settlementEvidencePda,
    program.programId,
  );
  const payoutFieldsHash = canonicalPayoutFieldsHash(daoPda, proposalPda, payoutPlanPda, payoutPlan);
  const treasuryTokenBefore = await provider.connection.getTokenAccountBalance(treasuryTokenAccount.address);
  const recipientTokenBefore = await provider.connection.getTokenAccountBalance(recipientTokenAccount.address);

  const recordSettlementEvidenceTx = await program.methods
    .recordSettlementEvidenceV2(
      { refheAttested: {} },
      [...settlementId],
      randomHash(),
      [...payoutFieldsHash],
    )
    .accounts({
      dao: daoPda,
      daoSecurityPolicy: securityPolicyPda,
      proposal: proposalPda,
      confidentialPayoutPlan: payoutPlanPda,
      settlementEvidence: settlementEvidencePda,
      recorder: walletPk,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  proposal = await program.account.proposal.fetch(proposalPda);
  if (proposal.executionUnlocksAt.toNumber() > 0) {
    await waitUntil(proposal.executionUnlocksAt.toNumber() + 1, "settlement V3 execution unlock");
  }

  const executeTx = await program.methods
    .executeConfidentialPayoutPlanV3()
    .accounts({
      dao: daoPda,
      proposal: proposalPda,
      confidentialPayoutPlan: payoutPlanPda,
      proposalSettlementPolicySnapshotV3: settlementSnapshotPda,
      settlementEvidence: settlementEvidencePda,
      settlementConsumptionRecord: settlementConsumptionPda,
      treasury: treasuryPda,
      executor: walletPk,
      settlementRecipient: settlementRecipient.publicKey,
      treasuryTokenAccount: treasuryTokenAccount.address,
      recipientTokenAccount: recipientTokenAccount.address,
      refheEnvelope: refheEnvelopePda,
      magicblockPrivatePaymentCorridor: magicblockCorridorPda,
      tokenProgram,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const finalProposal = await program.account.proposal.fetch(proposalPda);
  const finalPayoutPlan = await program.account.confidentialPayoutPlan.fetch(payoutPlanPda);
  const governanceSnapshot = await program.account.proposalGovernancePolicySnapshotV3.fetch(governanceSnapshotPda);
  const settlementEvidence = await program.account.settlementEvidence.fetch(settlementEvidencePda);
  const settlementConsumptionRecord = await program.account.settlementConsumptionRecord.fetch(settlementConsumptionPda);
  const revealVaultAfter = await provider.connection.getBalance(revealRebateVaultPda);
  const treasuryAfterExecute = await provider.connection.getBalance(treasuryPda);
  const recipientAfter = await provider.connection.getBalance(settlementRecipient.publicKey);
  const treasuryTokenAfter = await provider.connection.getTokenAccountBalance(treasuryTokenAccount.address);
  const recipientTokenAfter = await provider.connection.getTokenAccountBalance(recipientTokenAccount.address);

  return {
    dao: daoPda.toBase58(),
    treasury: treasuryPda.toBase58(),
    proposal: proposalPda.toBase58(),
    governancePolicy: governancePolicyPda.toBase58(),
    governanceSnapshot: governanceSnapshotPda.toBase58(),
    revealRebateVault: revealRebateVaultPda.toBase58(),
    securityPolicy: securityPolicyPda.toBase58(),
    settlementPolicy: settlementPolicyPda.toBase58(),
    settlementSnapshot: settlementSnapshotPda.toBase58(),
    payoutPlan: payoutPlanPda.toBase58(),
    refheEnvelope: refheEnvelopePda.toBase58(),
    magicblockCorridor: magicblockCorridorPda.toBase58(),
    settlementEvidence: settlementEvidencePda.toBase58(),
    settlementConsumptionRecord: settlementConsumptionPda.toBase58(),
    settlementRecipient: settlementRecipient.publicKey.toBase58(),
    timings: {
      votingEnd: finalProposal.votingEnd.toNumber(),
      revealEnd: finalProposal.revealEnd.toNumber(),
      executionUnlocksAt: finalProposal.executionUnlocksAt.toNumber(),
    },
    transactions: {
      fundRecipient: fundRecipientTx,
      createDao: createDaoTx,
      initializeSecurityPolicyV2: initSecurityPolicyTx,
      initializeGovernancePolicyV3: initGovernancePolicyTx,
      fundRevealRebateVaultV3: fundVaultTx,
      initializeSettlementPolicyV3: initSettlementPolicyTx,
      createProposal: createProposalTx,
      configureConfidentialPayoutPlan: configurePayoutTx,
      configureRefheEnvelope: configureRefheTx,
      snapshotGovernancePolicyV3: snapshotGovernanceTx,
      snapshotSettlementPolicyV3: snapshotSettlementTx,
      deposit: depositTx,
      commit: commitTx,
      revealV3: revealTx,
      finalizeV3: finalizeTx,
      settleRefheEnvelope: settleRefheTx,
      configureMagicBlockPrivatePaymentCorridor: configureMagicBlockTx,
      settleMagicBlockPrivatePaymentCorridor: settleMagicBlockTx,
      recordSettlementEvidenceV2: recordSettlementEvidenceTx,
      executeV3: executeTx,
    },
    invariants: {
      status: proposalStatusLabel(finalProposal.status),
      isExecuted: finalProposal.isExecuted,
      payoutStatus: JSON.stringify(finalPayoutPlan.status),
      eligibleCapital: governanceSnapshot.eligibleCapital.toString(),
      revealCount: finalProposal.revealCount.toString(),
      commitCount: finalProposal.commitCount.toString(),
      revealVaultBeforeLamports: revealVaultBefore,
      revealVaultAfterLamports: revealVaultAfter,
      treasuryBeforeExecuteLamports: treasuryBeforeExecute,
      treasuryAfterExecuteLamports: treasuryAfterExecute,
      recipientBeforeLamports: recipientBefore,
      recipientAfterLamports: recipientAfter,
      evidenceStatus: JSON.stringify(settlementEvidence.status),
      evidenceConsumed: settlementConsumptionRecord.evidence.equals(settlementEvidencePda),
      treasuryTokenBeforeAmount: treasuryTokenBefore.value.amount,
      treasuryTokenAfterAmount: treasuryTokenAfter.value.amount,
      recipientTokenBeforeAmount: recipientTokenBefore.value.amount,
      recipientTokenAfterAmount: recipientTokenAfter.value.amount,
    },
  };
}

async function main() {
  const {
    name = `V3Proof${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`,
    quorum = 51,
    deposit = 0.2,
    treasuryAmount = 0.05,
    mintAmount = 1000,
    governanceMint: governanceMintArg,
    jsonOut,
  } = parseArgs();

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = workspaceProgram();
  const payer = (provider.wallet as anchor.Wallet).payer;
  const walletPk = provider.wallet.publicKey;

  const cluster = currentClusterLabel();

  console.log(`\n=== PrivateDAO live ${cluster} proof V3 ===`);
  console.log(`Wallet:    ${walletPk.toBase58()}`);
  console.log(`Program:   ${program.programId.toBase58()}`);

  const mint = governanceMintArg
    ? new PublicKey(String(governanceMintArg))
    : await createMint(provider.connection, payer, walletPk, null, 6);
  const tokenProgram = await resolveTokenProgramForMint(provider.connection, mint);
  const voterAta = await getOrCreateVoterAtaWithRetry(provider.connection, payer, mint, walletPk, tokenProgram);
  if (!governanceMintArg) {
    await mintTo(
      provider.connection,
      payer,
      mint,
      voterAta.address,
      payer,
      BigInt(Number(mintAmount)) * 1_000_000n,
      [],
      undefined,
      tokenProgram,
    );
  }

  const governanceV3 = await runGovernanceV3Flow({
    provider,
    program,
    payer,
    walletPk,
    mint,
    tokenProgram,
    voterTokenAccountAddress: voterAta.address,
    namePrefix: String(name),
    depositSol: Number(deposit),
    treasuryAmountSol: Number(treasuryAmount),
    quorum: Number(quorum),
    durationSeconds: 8,
    revealWindowSeconds: 6,
    executionDelaySeconds: 5,
  });

  const settlementV3 = await runSettlementV3Flow({
    provider,
    program,
    walletPk,
    mint,
    tokenProgram,
    voterTokenAccountAddress: voterAta.address,
    namePrefix: String(name),
  });

  const payload: ProofV3 = {
    generatedAt: new Date().toISOString(),
    mode: `test-wallet-${cluster}-encrypted-integrations-v3`,
    cluster,
    anchorVersion: "1.0.1",
    operatorWallet: walletPk.toBase58(),
    programId: program.programId.toBase58(),
    governanceV3,
    settlementV3,
  };

  if (jsonOut) {
    const outPath = path.resolve(String(jsonOut));
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n");
    console.log(`\nJSON proof:      ${path.relative(process.cwd(), outPath)}`);
  }

  console.log(`\n=== Live proof V3 complete ===`);
  console.log(`Governance V3 DAO:       ${governanceV3.dao}`);
  console.log(`                         ${solscanAccountUrl(governanceV3.dao)}`);
  console.log(`Governance V3 Proposal:  ${governanceV3.proposal}`);
  console.log(`                         ${solscanAccountUrl(governanceV3.proposal)}`);
  console.log(`Governance V3 Execute:   ${governanceV3.transactions.execute}`);
  console.log(`                         ${solscanTxUrl(governanceV3.transactions.execute)}`);
  console.log(`Settlement V3 DAO:       ${settlementV3.dao}`);
  console.log(`                         ${solscanAccountUrl(settlementV3.dao)}`);
  console.log(`Settlement V3 Proposal:  ${settlementV3.proposal}`);
  console.log(`                         ${solscanAccountUrl(settlementV3.proposal)}`);
  console.log(`Settlement V3 Execute:   ${settlementV3.transactions.executeV3}`);
  console.log(`                         ${solscanTxUrl(settlementV3.transactions.executeV3)}`);
  console.log(`Governance recipient delta: ${formatSol(governanceV3.invariants.recipientAfterLamports - governanceV3.invariants.recipientBeforeLamports)}`);
  console.log(`Settlement recipient delta: ${formatSol(settlementV3.invariants.recipientAfterLamports - settlementV3.invariants.recipientBeforeLamports)}`);
  console.log(`Governance unlock: ${formatTimestamp(governanceV3.timings.executionUnlocksAt)}`);
  console.log(`Settlement unlock: ${formatTimestamp(settlementV3.timings.executionUnlocksAt)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
