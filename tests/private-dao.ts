// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 X-PACT. AGPL-3.0-or-later.
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  createMint, createAccount, createAssociatedTokenAccountInstruction, getAssociatedTokenAddressSync, mintTo,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as crypto from "crypto";
import { assert } from "chai";
import BN from "bn.js";

const ZERO_PUBKEY = new PublicKey(new Uint8Array(32));

// commitment = sha256(vote_byte || salt_32 || proposal_pubkey_32 || voter_pubkey_32)
function computeCommitment(vote: boolean, salt: Buffer, voter: PublicKey, proposal: PublicKey): Buffer {
  return crypto
    .createHash("sha256")
    .update(Buffer.concat([Buffer.from([vote ? 1 : 0]), salt, proposal.toBuffer(), voter.toBuffer()]))
    .digest();
}

function randomSalt(): Buffer { return crypto.randomBytes(32); }
function uniqueDaoName(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e5).toString(36)}`;
}
function hashParts(parts: Buffer[]): Buffer {
  const hash = crypto.createHash("sha256");
  for (const part of parts) hash.update(part);
  return hash.digest();
}

function canonicalProofDomain(dao: PublicKey, proposal: PublicKey): Buffer {
  return hashParts([
    Buffer.from("PrivateDAO::proof-payload:v1"),
    dao.toBuffer(),
    proposal.toBuffer(),
  ]);
}

function canonicalProposalPayloadHash(dao: PublicKey, proposal: PublicKey, version = 2): Buffer {
  return hashParts([
    Buffer.from("PrivateDAO::proof-payload:v1"),
    dao.toBuffer(),
    proposal.toBuffer(),
    Buffer.from([version]),
  ]);
}

function payoutTypeSeed(payoutType: { [key: string]: unknown }): number {
  if ("salary" in payoutType) return 1;
  if ("bonus" in payoutType) return 2;
  if ("grant" in payoutType) return 3;
  if ("payroll" in payoutType) return 4;
  throw new Error(`unsupported payout type: ${Object.keys(payoutType)[0] ?? "unknown"}`);
}

function assetTypeSeed(assetType: { [key: string]: unknown }): number {
  if ("sol" in assetType) return 1;
  if ("token" in assetType) return 2;
  throw new Error(`unsupported asset type: ${Object.keys(assetType)[0] ?? "unknown"}`);
}

function canonicalPayoutFieldsHash(
  dao: PublicKey,
  proposal: PublicKey,
  payoutPlan: PublicKey,
  payoutType: { [key: string]: unknown },
  assetType: { [key: string]: unknown },
  settlementRecipient: PublicKey,
  tokenMint: PublicKey | null,
  recipientCount: number,
  totalAmount: BN,
  manifestHash: number[],
  ciphertextHash: number[],
): Buffer {
  return hashParts([
    Buffer.from("PrivateDAO::payout-payload:v1"),
    dao.toBuffer(),
    proposal.toBuffer(),
    payoutPlan.toBuffer(),
    Buffer.from([payoutTypeSeed(payoutType)]),
    Buffer.from([assetTypeSeed(assetType)]),
    settlementRecipient.toBuffer(),
    (tokenMint ?? ZERO_PUBKEY).toBuffer(),
    Buffer.from(Uint16Array.of(recipientCount).buffer),
    totalAmount.toArrayLike(Buffer, "le", 8),
    Buffer.from(manifestHash),
    Buffer.from(ciphertextHash),
  ]);
}

describe("PrivateDAO", () => {
  const provider  = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program   = anchor.workspace.PrivateDao as any;
  const authority = provider.wallet as anchor.Wallet;

  const DAO_NAME = uniqueDaoName("TestDAO");
  let governanceMint: PublicKey;
  let voter1 = Keypair.generate();
  let voter2 = Keypair.generate();
  let voter3 = Keypair.generate();
  let authorityTokenAta: PublicKey;
  let v1Ata: PublicKey, v2Ata: PublicKey, v3Ata: PublicKey;
  let daoPda: PublicKey;
  let proposalPda: PublicKey;
  let salt1: Buffer, salt2: Buffer, salt3: Buffer;

  async function prepareSettlementV3Scenario(options?: {
    minEvidenceAgeSeconds?: number;
    maxPayoutAmount?: number;
    totalAmount?: number;
  }) {
    const minEvidenceAgeSeconds = options?.minEvidenceAgeSeconds ?? 0;
    const maxPayoutAmount = options?.maxPayoutAmount ?? 60_000_000;
    const totalAmount = options?.totalAmount ?? 50_000_000;
    const payoutDaoName = uniqueDaoName("SettleV3");
    const [payoutDaoPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dao"), authority.publicKey.toBuffer(), Buffer.from(payoutDaoName)],
      program.programId,
    );

    await program.methods
      .initializeDao(
        payoutDaoName,
        51,
        new BN(0),
        new BN(90),
        new BN(0),
        { tokenWeighted: {} },
      )
      .accounts({
        dao: payoutDaoPda,
        governanceToken: governanceMint,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const [securityPolicyPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dao-security-policy"), payoutDaoPda.toBuffer()],
      program.programId,
    );
    const attestors = [
      authority.publicKey,
      ZERO_PUBKEY,
      ZERO_PUBKEY,
      ZERO_PUBKEY,
      ZERO_PUBKEY,
    ];

    await program.methods
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
        dao: payoutDaoPda,
        daoSecurityPolicy: securityPolicyPda,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const [settlementPolicyPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dao-settlement-policy-v3"), payoutDaoPda.toBuffer()],
      program.programId,
    );
    await program.methods
      .initializeDaoSettlementPolicyV3(
        new BN(minEvidenceAgeSeconds),
        new BN(maxPayoutAmount),
        true,
        false,
      )
      .accounts({
        dao: payoutDaoPda,
        daoSettlementPolicyV3: settlementPolicyPda,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const payoutDao = await program.account["dao"].fetch(payoutDaoPda);
    const [payoutProposalPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), payoutDaoPda.toBuffer(), payoutDao.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );
    await program.methods
      .createProposal(
        "Settlement hardening V3 payout",
        "Execute a confidential salary batch only after strict settlement evidence and a proposal-scoped settlement policy snapshot are present.",
        new BN(75),
        null,
      )
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        proposerTokenAccount: authorityTokenAta,
        proposer: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const [payoutPlanPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("payout-plan"), payoutProposalPda.toBuffer()],
      program.programId,
    );
    const [refheEnvelopePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("refhe-envelope"), payoutProposalPda.toBuffer()],
      program.programId,
    );
    const [settlementSnapshotPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal-settlement-policy-v3"), payoutProposalPda.toBuffer()],
      program.programId,
    );
    const [treasuryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury"), payoutDaoPda.toBuffer()],
      program.programId,
    );
    const [magicBlockCorridorPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("magicblock-corridor"), payoutProposalPda.toBuffer()],
      program.programId,
    );

    const settlementRecipient = Keypair.generate();
    await provider.sendAndConfirm(new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: authority.publicKey,
        toPubkey: settlementRecipient.publicKey,
        lamports: Math.round(0.005 * LAMPORTS_PER_SOL),
      }),
    ), []);

    const manifestHash = [...crypto.randomBytes(32)];
    const ciphertextHash = [...crypto.randomBytes(32)];
    await program.methods
      .configureConfidentialPayoutPlan(
        { salary: {} },
        { sol: {} },
        settlementRecipient.publicKey,
        null,
        2,
        new BN(totalAmount),
        "box://privatedao/payroll/settlement-v3-epoch-1",
        manifestHash,
        ciphertextHash,
      )
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        confidentialPayoutPlan: payoutPlanPda,
        operator: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .configureRefheEnvelope(
        "box://privatedao/refhe/settlement-v3-epoch-1",
        [...crypto.randomBytes(32)],
        ciphertextHash,
        [...crypto.randomBytes(32)],
      )
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        confidentialPayoutPlan: payoutPlanPda,
        refheEnvelope: refheEnvelopePda,
        operator: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .snapshotProposalSettlementPolicyV3()
      .accounts({
        dao: payoutDaoPda,
        daoSettlementPolicyV3: settlementPolicyPda,
        proposal: payoutProposalPda,
        confidentialPayoutPlan: payoutPlanPda,
        proposalSettlementPolicySnapshotV3: settlementSnapshotPda,
        operator: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .depositTreasury(new BN(100_000_000))
      .accounts({
        dao: payoutDaoPda,
        treasury: treasuryPda,
        depositor: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const [votePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), payoutProposalPda.toBuffer(), authority.publicKey.toBuffer()],
      program.programId,
    );
    const [delegationMarkerPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("delegation"), payoutProposalPda.toBuffer(), authority.publicKey.toBuffer()],
      program.programId,
    );
    const salarySalt = randomSalt();
    await program.methods
      .commitVote([...computeCommitment(true, salarySalt, authority.publicKey, payoutProposalPda)], null)
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        voterRecord: votePda,
        delegationMarker: delegationMarkerPda,
        voterTokenAccount: authorityTokenAta,
        voter: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const created = await program.account["proposal"].fetch(payoutProposalPda);
    await waitUntilUnix(created.votingEnd);

    await program.methods
      .revealVote(true, [...salarySalt])
      .accounts({
        proposal: payoutProposalPda,
        voterRecord: votePda,
        revealer: authority.publicKey,
      })
      .rpc();

    const revealed = await program.account["proposal"].fetch(payoutProposalPda);
    await waitUntilUnix(revealed.revealEnd);

    await program.methods
      .finalizeProposal()
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        finalizer: authority.publicKey,
      })
      .rpc();

    await program.methods
      .settleRefheEnvelope(
        [...crypto.randomBytes(32)],
        [...crypto.randomBytes(32)],
        [...crypto.randomBytes(32)],
        program.programId,
      )
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        confidentialPayoutPlan: payoutPlanPda,
        refheEnvelope: refheEnvelopePda,
        operator: authority.publicKey,
      })
      .rpc();

    const settlementId = [...crypto.randomBytes(32)];
    const payoutFieldsHash = canonicalPayoutFieldsHash(
      payoutDaoPda,
      payoutProposalPda,
      payoutPlanPda,
      { salary: {} },
      { sol: {} },
      settlementRecipient.publicKey,
      null,
      2,
      new BN(totalAmount),
      manifestHash,
      ciphertextHash,
    );
    const [settlementEvidencePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("settlement-evidence"),
        payoutProposalPda.toBuffer(),
        payoutPlanPda.toBuffer(),
        Buffer.from(settlementId),
      ],
      program.programId,
    );
    const [settlementConsumptionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("settlement-consumption"), settlementEvidencePda.toBuffer()],
      program.programId,
    );

    await program.methods
      .recordSettlementEvidenceV2(
        { refheAttested: {} },
        settlementId,
        [...crypto.randomBytes(32)],
        [...payoutFieldsHash],
      )
      .accounts({
        dao: payoutDaoPda,
        daoSecurityPolicy: securityPolicyPda,
        proposal: payoutProposalPda,
        confidentialPayoutPlan: payoutPlanPda,
        settlementEvidence: settlementEvidencePda,
        recorder: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return {
      payoutDaoPda,
      payoutProposalPda,
      payoutPlanPda,
      refheEnvelopePda,
      settlementSnapshotPda,
      settlementEvidencePda,
      settlementConsumptionPda,
      treasuryPda,
      magicBlockCorridorPda,
      settlementRecipient,
      totalAmount,
    };
  }

  async function prepareSettlementV2Scenario(options?: {
    settlementTtlSeconds?: number;
    totalAmount?: number;
  }) {
    const settlementTtlSeconds = options?.settlementTtlSeconds ?? 3600;
    const totalAmount = options?.totalAmount ?? 50_000_000;
    const payoutDaoName = uniqueDaoName("SettleV2");
    const [payoutDaoPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dao"), authority.publicKey.toBuffer(), Buffer.from(payoutDaoName)],
      program.programId,
    );

    await program.methods
      .initializeDao(
        payoutDaoName,
        51,
        new BN(0),
        new BN(90),
        new BN(0),
        { tokenWeighted: {} },
      )
      .accounts({
        dao: payoutDaoPda,
        governanceToken: governanceMint,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const [securityPolicyPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dao-security-policy"), payoutDaoPda.toBuffer()],
      program.programId,
    );
    const attestors = [
      authority.publicKey,
      ZERO_PUBKEY,
      ZERO_PUBKEY,
      ZERO_PUBKEY,
      ZERO_PUBKEY,
    ];

    await program.methods
      .initializeDaoSecurityPolicy(
        { strictRequired: {} },
        { thresholdAttestedRequired: {} },
        { thresholdAttestedRequired: {} },
        { noCancelAfterParticipation: {} },
        attestors,
        1,
        1,
        attestors,
        1,
        1,
        new BN(3600),
        new BN(settlementTtlSeconds),
      )
      .accounts({
        dao: payoutDaoPda,
        daoSecurityPolicy: securityPolicyPda,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const payoutDao = await program.account["dao"].fetch(payoutDaoPda);
    const [payoutProposalPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), payoutDaoPda.toBuffer(), payoutDao.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );

    await program.methods
      .createProposal(
        "Settlement hardening V2 payout",
        "Execute a confidential payout only after a strict execution policy snapshot and verified settlement evidence.",
        new BN(75),
        null,
      )
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        proposerTokenAccount: authorityTokenAta,
        proposer: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const [payoutPlanPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("payout-plan"), payoutProposalPda.toBuffer()],
      program.programId,
    );
    const [executionSnapshotPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal-policy-snapshot"), payoutProposalPda.toBuffer()],
      program.programId,
    );
    const [treasuryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury"), payoutDaoPda.toBuffer()],
      program.programId,
    );

    const settlementRecipient = Keypair.generate();
    await provider.sendAndConfirm(new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: authority.publicKey,
        toPubkey: settlementRecipient.publicKey,
        lamports: Math.round(0.005 * LAMPORTS_PER_SOL),
      }),
    ), []);

    const manifestHash = [...crypto.randomBytes(32)];
    const ciphertextHash = [...crypto.randomBytes(32)];

    await program.methods
      .configureConfidentialPayoutPlan(
        { salary: {} },
        { sol: {} },
        settlementRecipient.publicKey,
        null,
        2,
        new BN(totalAmount),
        "box://privatedao/payroll/settlement-v2-epoch-1",
        manifestHash,
        ciphertextHash,
      )
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        confidentialPayoutPlan: payoutPlanPda,
        operator: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .snapshotProposalExecutionPolicy()
      .accounts({
        dao: payoutDaoPda,
        daoSecurityPolicy: securityPolicyPda,
        proposal: payoutProposalPda,
        proposalExecutionPolicySnapshot: executionSnapshotPda,
        operator: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .depositTreasury(new BN(100_000_000))
      .accounts({
        dao: payoutDaoPda,
        treasury: treasuryPda,
        depositor: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const [votePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), payoutProposalPda.toBuffer(), authority.publicKey.toBuffer()],
      program.programId,
    );
    const [delegationMarkerPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("delegation"), payoutProposalPda.toBuffer(), authority.publicKey.toBuffer()],
      program.programId,
    );
    const salarySalt = randomSalt();

    await program.methods
      .commitVote([...computeCommitment(true, salarySalt, authority.publicKey, payoutProposalPda)], null)
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        voterRecord: votePda,
        delegationMarker: delegationMarkerPda,
        voterTokenAccount: authorityTokenAta,
        voter: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const created = await program.account["proposal"].fetch(payoutProposalPda);
    await waitUntilUnix(created.votingEnd);

    await program.methods
      .revealVote(true, [...salarySalt])
      .accounts({
        proposal: payoutProposalPda,
        voterRecord: votePda,
        revealer: authority.publicKey,
      })
      .rpc();

    const revealed = await program.account["proposal"].fetch(payoutProposalPda);
    await waitUntilUnix(revealed.revealEnd);

    await program.methods
      .finalizeProposal()
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        finalizer: authority.publicKey,
      })
      .rpc();

    const settlementId = [...crypto.randomBytes(32)];
    const evidenceHash = [...crypto.randomBytes(32)];
    const payoutFieldsHash = [
      ...canonicalPayoutFieldsHash(
        payoutDaoPda,
        payoutProposalPda,
        payoutPlanPda,
        { salary: {} },
        { sol: {} },
        settlementRecipient.publicKey,
        null,
        2,
        new BN(totalAmount),
        manifestHash,
        ciphertextHash,
      ),
    ];
    const [settlementEvidencePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("settlement-evidence"),
        payoutProposalPda.toBuffer(),
        payoutPlanPda.toBuffer(),
        Buffer.from(settlementId),
      ],
      program.programId,
    );
    const [settlementConsumptionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("settlement-consumption"), settlementEvidencePda.toBuffer()],
      program.programId,
    );

    await program.methods
      .recordSettlementEvidenceV2(
        { thresholdAttestation: {} },
        settlementId,
        evidenceHash,
        payoutFieldsHash,
      )
      .accounts({
        dao: payoutDaoPda,
        daoSecurityPolicy: securityPolicyPda,
        proposal: payoutProposalPda,
        confidentialPayoutPlan: payoutPlanPda,
        settlementEvidence: settlementEvidencePda,
        recorder: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return {
      payoutDaoPda,
      payoutProposalPda,
      payoutPlanPda,
      executionSnapshotPda,
      settlementEvidencePda,
      settlementConsumptionPda,
      treasuryPda,
      settlementRecipient,
      totalAmount,
    };
  }

  async function prepareSettlementV2TokenScenario(options?: {
    settlementTtlSeconds?: number;
    totalAmount?: number;
  }) {
    const settlementTtlSeconds = options?.settlementTtlSeconds ?? 3600;
    const totalAmount = options?.totalAmount ?? 250_000_000;
    const payoutDaoName = uniqueDaoName("SettleTok");
    const [payoutDaoPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dao"), authority.publicKey.toBuffer(), Buffer.from(payoutDaoName)],
      program.programId,
    );

    await program.methods
      .initializeDao(
        payoutDaoName,
        51,
        new BN(0),
        new BN(90),
        new BN(0),
        { tokenWeighted: {} },
      )
      .accounts({
        dao: payoutDaoPda,
        governanceToken: governanceMint,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const [securityPolicyPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dao-security-policy"), payoutDaoPda.toBuffer()],
      program.programId,
    );
    const attestors = [
      authority.publicKey,
      ZERO_PUBKEY,
      ZERO_PUBKEY,
      ZERO_PUBKEY,
      ZERO_PUBKEY,
    ];

    await program.methods
      .initializeDaoSecurityPolicy(
        { strictRequired: {} },
        { thresholdAttestedRequired: {} },
        { thresholdAttestedRequired: {} },
        { noCancelAfterParticipation: {} },
        attestors,
        1,
        1,
        attestors,
        1,
        1,
        new BN(3600),
        new BN(settlementTtlSeconds),
      )
      .accounts({
        dao: payoutDaoPda,
        daoSecurityPolicy: securityPolicyPda,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const payoutDao = await program.account["dao"].fetch(payoutDaoPda);
    const [payoutProposalPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), payoutDaoPda.toBuffer(), payoutDao.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );

    await program.methods
      .createProposal(
        "Settlement hardening V2 token payout",
        "Execute a confidential token payout only after a strict execution policy snapshot and verified settlement evidence.",
        new BN(75),
        null,
      )
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        proposerTokenAccount: authorityTokenAta,
        proposer: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const [payoutPlanPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("payout-plan"), payoutProposalPda.toBuffer()],
      program.programId,
    );
    const [executionSnapshotPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal-policy-snapshot"), payoutProposalPda.toBuffer()],
      program.programId,
    );
    const [treasuryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury"), payoutDaoPda.toBuffer()],
      program.programId,
    );

    const settlementRecipient = Keypair.generate();
    const wrongRecipientOwner = Keypair.generate();
    await provider.sendAndConfirm(new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: authority.publicKey,
        toPubkey: settlementRecipient.publicKey,
        lamports: Math.round(0.005 * LAMPORTS_PER_SOL),
      }),
      SystemProgram.transfer({
        fromPubkey: authority.publicKey,
        toPubkey: wrongRecipientOwner.publicKey,
        lamports: Math.round(0.005 * LAMPORTS_PER_SOL),
      }),
    ), []);

    const manifestHash = [...crypto.randomBytes(32)];
    const ciphertextHash = [...crypto.randomBytes(32)];

    await program.methods
      .configureConfidentialPayoutPlan(
        { salary: {} },
        { token: {} },
        settlementRecipient.publicKey,
        governanceMint,
        3,
        new BN(totalAmount),
        "box://privatedao/payroll/settlement-v2-token-epoch-1",
        manifestHash,
        ciphertextHash,
      )
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        confidentialPayoutPlan: payoutPlanPda,
        operator: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .snapshotProposalExecutionPolicy()
      .accounts({
        dao: payoutDaoPda,
        daoSecurityPolicy: securityPolicyPda,
        proposal: payoutProposalPda,
        proposalExecutionPolicySnapshot: executionSnapshotPda,
        operator: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const treasuryAta = getAssociatedTokenAddressSync(governanceMint, treasuryPda, true);
    const recipientAta = getAssociatedTokenAddressSync(governanceMint, settlementRecipient.publicKey);
    const wrongOwnerRecipientAta = getAssociatedTokenAddressSync(governanceMint, wrongRecipientOwner.publicKey);
    await provider.sendAndConfirm(new Transaction().add(
      createAssociatedTokenAccountInstruction(authority.publicKey, treasuryAta, treasuryPda, governanceMint),
      createAssociatedTokenAccountInstruction(authority.publicKey, recipientAta, settlementRecipient.publicKey, governanceMint),
      createAssociatedTokenAccountInstruction(authority.publicKey, wrongOwnerRecipientAta, wrongRecipientOwner.publicKey, governanceMint),
    ), []);
    await mintTo(provider.connection, authority.payer, governanceMint, treasuryAta, authority.payer, BigInt(totalAmount + 100_000_000));

    const wrongMint = await createMint(provider.connection, authority.payer, authority.publicKey, null, 6);
    const wrongMintRecipientAta = getAssociatedTokenAddressSync(wrongMint, settlementRecipient.publicKey);
    await provider.sendAndConfirm(new Transaction().add(
      createAssociatedTokenAccountInstruction(authority.publicKey, wrongMintRecipientAta, settlementRecipient.publicKey, wrongMint),
    ), []);
    await mintTo(provider.connection, authority.payer, wrongMint, wrongMintRecipientAta, authority.payer, 10_000_000n);

    const [votePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), payoutProposalPda.toBuffer(), authority.publicKey.toBuffer()],
      program.programId,
    );
    const [delegationMarkerPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("delegation"), payoutProposalPda.toBuffer(), authority.publicKey.toBuffer()],
      program.programId,
    );
    const payrollSalt = randomSalt();

    await program.methods
      .commitVote([...computeCommitment(true, payrollSalt, authority.publicKey, payoutProposalPda)], null)
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        voterRecord: votePda,
        delegationMarker: delegationMarkerPda,
        voterTokenAccount: authorityTokenAta,
        voter: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const created = await program.account["proposal"].fetch(payoutProposalPda);
    await waitUntilUnix(created.votingEnd);

    await program.methods
      .revealVote(true, [...payrollSalt])
      .accounts({
        proposal: payoutProposalPda,
        voterRecord: votePda,
        revealer: authority.publicKey,
      })
      .rpc();

    const revealed = await program.account["proposal"].fetch(payoutProposalPda);
    await waitUntilUnix(revealed.revealEnd);

    await program.methods
      .finalizeProposal()
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        finalizer: authority.publicKey,
      })
      .rpc();

    const settlementId = [...crypto.randomBytes(32)];
    const evidenceHash = [...crypto.randomBytes(32)];
    const payoutFieldsHash = [
      ...canonicalPayoutFieldsHash(
        payoutDaoPda,
        payoutProposalPda,
        payoutPlanPda,
        { salary: {} },
        { token: {} },
        settlementRecipient.publicKey,
        governanceMint,
        3,
        new BN(totalAmount),
        manifestHash,
        ciphertextHash,
      ),
    ];
    const [settlementEvidencePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("settlement-evidence"),
        payoutProposalPda.toBuffer(),
        payoutPlanPda.toBuffer(),
        Buffer.from(settlementId),
      ],
      program.programId,
    );
    const [settlementConsumptionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("settlement-consumption"), settlementEvidencePda.toBuffer()],
      program.programId,
    );

    await program.methods
      .recordSettlementEvidenceV2(
        { thresholdAttestation: {} },
        settlementId,
        evidenceHash,
        payoutFieldsHash,
      )
      .accounts({
        dao: payoutDaoPda,
        daoSecurityPolicy: securityPolicyPda,
        proposal: payoutProposalPda,
        confidentialPayoutPlan: payoutPlanPda,
        settlementEvidence: settlementEvidencePda,
        recorder: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return {
      payoutDaoPda,
      payoutProposalPda,
      payoutPlanPda,
      executionSnapshotPda,
      settlementEvidencePda,
      settlementConsumptionPda,
      treasuryPda,
      treasuryAta,
      recipientAta,
      wrongOwnerRecipientAta,
      wrongMintRecipientAta,
      settlementRecipient,
      wrongRecipientOwner,
      totalAmount,
    };
  }

  async function waitUntilUnix(target: BN | number, cushionMs = 1_200) {
    const targetSeconds = typeof target === "number" ? target : target.toNumber();
    const delayMs = Math.max(targetSeconds - Math.floor(Date.now() / 1000), 0) * 1000 + cushionMs;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  async function createStandardExecutionScenario(executionDelaySeconds: number) {
    const daoName = uniqueDaoName("StdExec");
    const [scenarioDaoPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dao"), authority.publicKey.toBuffer(), Buffer.from(daoName)],
      program.programId,
    );

    await program.methods
      .initializeDao(
        daoName,
        51,
        new BN(0),
        new BN(5),
        new BN(executionDelaySeconds),
        { tokenWeighted: {} },
      )
      .accounts({
        dao: scenarioDaoPda,
        governanceToken: governanceMint,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const scenarioDao = await program.account["dao"].fetch(scenarioDaoPda);
    const [scenarioProposalPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), scenarioDaoPda.toBuffer(), scenarioDao.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );
    const recipient = Keypair.generate();
    await provider.sendAndConfirm(
      new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: authority.publicKey,
          toPubkey: recipient.publicKey,
          lamports: Math.round(0.002 * LAMPORTS_PER_SOL),
        }),
      ),
      [],
    );

    await program.methods
      .createProposal(
        "Standard execute treasury transfer",
        "Exercise standard execute_proposal with SendSol action and on-chain recipient validation.",
        new BN(5),
        {
          actionType: { sendSol: {} },
          amountLamports: new BN(5_000_000),
          recipient: recipient.publicKey,
          tokenMint: null,
        },
      )
      .accounts({
        dao: scenarioDaoPda,
        proposal: scenarioProposalPda,
        proposerTokenAccount: authorityTokenAta,
        proposer: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const [treasuryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury"), scenarioDaoPda.toBuffer()],
      program.programId,
    );
    await program.methods
      .depositTreasury(new BN(25_000_000))
      .accounts({
        dao: scenarioDaoPda,
        treasury: treasuryPda,
        depositor: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const [votePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), scenarioProposalPda.toBuffer(), authority.publicKey.toBuffer()],
      program.programId,
    );
    const [delegationMarkerPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("delegation"), scenarioProposalPda.toBuffer(), authority.publicKey.toBuffer()],
      program.programId,
    );
    const salt = randomSalt();

    await program.methods
      .commitVote([...computeCommitment(true, salt, authority.publicKey, scenarioProposalPda)], null)
      .accounts({
        dao: scenarioDaoPda,
        proposal: scenarioProposalPda,
        voterRecord: votePda,
        delegationMarker: delegationMarkerPda,
        voterTokenAccount: authorityTokenAta,
        voter: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const created = await program.account["proposal"].fetch(scenarioProposalPda);
    await waitUntilUnix(created.votingEnd);

    await program.methods
      .revealVote(true, [...salt])
      .accounts({
        proposal: scenarioProposalPda,
        voterRecord: votePda,
        revealer: authority.publicKey,
      })
      .rpc();

    const revealed = await program.account["proposal"].fetch(scenarioProposalPda);
    await waitUntilUnix(revealed.revealEnd);

    await program.methods
      .finalizeProposal()
      .accounts({
        dao: scenarioDaoPda,
        proposal: scenarioProposalPda,
        finalizer: authority.publicKey,
      })
      .rpc();

    const finalized = await program.account["proposal"].fetch(scenarioProposalPda);
    return {
      daoPda: scenarioDaoPda,
      proposalPda: scenarioProposalPda,
      treasuryPda,
      recipient,
      finalized,
    };
  }

  async function createIsolatedDaoScenario(
    prefix: string,
    options?: {
      quorumPercentage?: number;
      revealWindowSeconds?: number;
      executionDelaySeconds?: number;
    },
  ) {
    const daoName = uniqueDaoName(prefix);
    const [scenarioDaoPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dao"), authority.publicKey.toBuffer(), Buffer.from(daoName)],
      program.programId,
    );

    await program.methods
      .initializeDao(
        daoName,
        options?.quorumPercentage ?? 51,
        new BN(0),
        new BN(options?.revealWindowSeconds ?? 5),
        new BN(options?.executionDelaySeconds ?? 0),
        { tokenWeighted: {} },
      )
      .accounts({
        dao: scenarioDaoPda,
        governanceToken: governanceMint,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return scenarioDaoPda;
  }

  before(async () => {
    async function fundWallet(pubkey: PublicKey, sol: number): Promise<void> {
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: authority.publicKey,
          toPubkey: pubkey,
          lamports: Math.round(sol * LAMPORTS_PER_SOL),
        }),
      );
      await provider.sendAndConfirm(tx, []);
    }

    for (const v of [voter1, voter2, voter3]) {
      await fundWallet(v.publicKey, 0.02);
    }

    governanceMint = await createMint(
      provider.connection, authority.payer, authority.publicKey, null, 6,
    );

    authorityTokenAta = getAssociatedTokenAddressSync(governanceMint, authority.publicKey);
    await provider.sendAndConfirm(
      new Transaction().add(
        createAssociatedTokenAccountInstruction(
          authority.publicKey,
          authorityTokenAta,
          authority.publicKey,
          governanceMint,
        ),
      ),
      [],
    );

    v1Ata = await createAccount(provider.connection, authority.payer, governanceMint, voter1.publicKey);
    v2Ata = await createAccount(provider.connection, authority.payer, governanceMint, voter2.publicKey);
    v3Ata = await createAccount(provider.connection, authority.payer, governanceMint, voter3.publicKey);

    await mintTo(provider.connection, authority.payer, governanceMint, v1Ata, authority.payer, 1_000_000_000n);
    await mintTo(provider.connection, authority.payer, governanceMint, v2Ata, authority.payer,   500_000_000n);
    await mintTo(provider.connection, authority.payer, governanceMint, v3Ata, authority.payer,   100_000_000n);
    await mintTo(provider.connection, authority.payer, governanceMint, authorityTokenAta, authority.payer, 1_000_000n);

    [daoPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dao"), authority.publicKey.toBuffer(), Buffer.from(DAO_NAME)],
      program.programId,
    );
  });

  it("initializes a DAO (TokenWeighted mode)", async () => {
    await program.methods
      .initializeDao(
        DAO_NAME,
        51,                   // 51% quorum
        new BN(0),            // no minimum tokens
        new BN(3600),         // 1h reveal window
        new BN(86400),        // 24h execution timelock
        { tokenWeighted: {} },
      )
      .accounts({
        dao: daoPda, governanceToken: governanceMint,
        authority: authority.publicKey, systemProgram: SystemProgram.programId,
      })
      .rpc();

    const dao = await program.account["dao"].fetch(daoPda);
    assert.equal(dao.daoName, DAO_NAME);
    assert.equal(dao.quorumPercentage, 51);
    assert.equal(dao.proposalCount.toString(), "0");
    console.log("  ✓ DAO initialized");
  });

  it("transfers DAO operating authority without breaking proposal PDA continuity", async () => {
    const transferDaoName = uniqueDaoName("AuthorityHandoff");
    const [transferDaoPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dao"), authority.publicKey.toBuffer(), Buffer.from(transferDaoName)],
      program.programId,
    );
    const newAuthority = Keypair.generate();

    await program.methods
      .initializeDao(
        transferDaoName,
        51,
        new BN(0),
        new BN(3600),
        new BN(86400),
        { tokenWeighted: {} },
      )
      .accounts({
        dao: transferDaoPda,
        governanceToken: governanceMint,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .transferDaoAuthority(newAuthority.publicKey)
      .accounts({
        dao: transferDaoPda,
        authority: authority.publicKey,
      })
      .rpc();

    const transferredDao = await program.account["dao"].fetch(transferDaoPda);
    assert.equal(transferredDao.authority.toBase58(), newAuthority.publicKey.toBase58());

    const [handoffProposalPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), transferDaoPda.toBuffer(), transferredDao.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );

    await program.methods
      .createProposal(
        "Post-handoff proposal",
        "Proposal creation must keep working after DAO operating authority moves to a new custody path.",
        new BN(3600),
        null,
      )
      .accounts({
        dao: transferDaoPda,
        proposal: handoffProposalPda,
        proposerTokenAccount: v1Ata,
        proposer: voter1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([voter1])
      .rpc();

    const handoffProposal = await program.account["proposal"].fetch(handoffProposalPda);
    assert.equal(handoffProposal.dao.toBase58(), transferDaoPda.toBase58());
    assert.equal(handoffProposal.proposalId.toString(), "0");
  });

  it("allows a governance token holder to create a proposal", async () => {
    const dao = await program.account["dao"].fetch(daoPda);

    [proposalPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), daoPda.toBuffer(), dao.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );

    await program.methods
      .createProposal(
        "Allocate 10 SOL for marketing",
        "Proposal to fund community marketing for Q1 2026.",
        new BN(3600),
        null,
      )
      .accounts({
        dao: daoPda, proposal: proposalPda,
        proposerTokenAccount: v1Ata, proposer: voter1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([voter1])
      .rpc();

    const p = await program.account["proposal"].fetch(proposalPda);
    assert.equal(p.title, "Allocate 10 SOL for marketing");
    assert.equal(p.proposer.toBase58(), voter1.publicKey.toBase58());
    assert.equal(p.commitCount.toString(), "0");
    console.log("  ✓ Token holder created proposal");
  });

  it("anchors proposal-bound zk proof material on-chain", async () => {
    const [zkAnchorPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("zk-proof"), proposalPda.toBuffer(), Buffer.from([1])],
      program.programId,
    );

    const proofHash = [...crypto.randomBytes(32)];
    const publicInputsHash = [...crypto.randomBytes(32)];
    const verificationKeyHash = [...crypto.randomBytes(32)];
    const bundleHash = [...crypto.randomBytes(32)];

    await program.methods
      .anchorZkProof(
        { vote: {} },
        { groth16: {} },
        proofHash,
        publicInputsHash,
        verificationKeyHash,
        bundleHash,
      )
      .accounts({
        dao: daoPda,
        proposal: proposalPda,
        zkProofAnchor: zkAnchorPda,
        recorder: voter1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([voter1])
      .rpc();

    const anchorAccount = await program.account["zkProofAnchor"].fetch(zkAnchorPda);
    assert.equal(anchorAccount.dao.toBase58(), daoPda.toBase58());
    assert.equal(anchorAccount.proposal.toBase58(), proposalPda.toBase58());
    assert.equal(anchorAccount.recordedBy.toBase58(), voter1.publicKey.toBase58());
    assert.deepEqual(anchorAccount.proofHash, proofHash);
    assert.deepEqual(anchorAccount.publicInputsHash, publicInputsHash);
    assert.deepEqual(anchorAccount.verificationKeyHash, verificationKeyHash);
    assert.deepEqual(anchorAccount.bundleHash, bundleHash);
    console.log("  ✓ zk proof anchor recorded on-chain");
  });

  it("records a parallel on-chain zk verification receipt", async () => {
    const [zkAnchorPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("zk-proof"), proposalPda.toBuffer(), Buffer.from([1])],
      program.programId,
    );
    const [zkReceiptPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("zk-verify"), proposalPda.toBuffer(), Buffer.from([1])],
      program.programId,
    );

    await program.methods
      .verifyZkProofOnChain(
        { vote: {} },
        { parallel: {} },
        voter1.publicKey,
      )
      .accounts({
        dao: daoPda,
        proposal: proposalPda,
        zkProofAnchor: zkAnchorPda,
        zkVerificationReceipt: zkReceiptPda,
        verifier: voter1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([voter1])
      .rpc();

    const receipt = await program.account["zkVerificationReceipt"].fetch(zkReceiptPda);
    assert.equal(receipt.dao.toBase58(), daoPda.toBase58());
    assert.equal(receipt.proposal.toBase58(), proposalPda.toBase58());
    assert.equal(receipt.verifiedBy.toBase58(), voter1.publicKey.toBase58());
    assert.deepEqual(receipt.verificationMode, { parallel: {} });
    assert.equal(receipt.verifierProgram.toBase58(), voter1.publicKey.toBase58());
    console.log("  ✓ parallel on-chain zk verification receipt recorded");
  });

  it("rejects proposer-authored zk_enforced receipts", async () => {
    const [zkAnchorPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("zk-proof"), proposalPda.toBuffer(), Buffer.from([1])],
      program.programId,
    );
    const [zkReceiptPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("zk-verify"), proposalPda.toBuffer(), Buffer.from([1])],
      program.programId,
    );

    try {
      await program.methods
        .verifyZkProofOnChain(
          { vote: {} },
          { zkEnforced: {} },
          program.programId,
        )
        .accounts({
          dao: daoPda,
          proposal: proposalPda,
          zkProofAnchor: zkAnchorPda,
          zkVerificationReceipt: zkReceiptPda,
          verifier: voter1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([voter1])
        .rpc();
      assert.fail("Should have rejected proposer-authored zk_enforced receipt");
    } catch (err: any) {
      assert.include(err.toString(), "UnauthorizedZkVerifier");
      console.log("  ✓ proposer-authored zk_enforced receipt rejected");
    }
  });

  it("requires a verifier program boundary for zk_enforced receipts", async () => {
    const [zkAnchorPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("zk-proof"), proposalPda.toBuffer(), Buffer.from([1])],
      program.programId,
    );
    const [zkReceiptPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("zk-verify"), proposalPda.toBuffer(), Buffer.from([1])],
      program.programId,
    );

    try {
      await program.methods
        .verifyZkProofOnChain(
          { vote: {} },
          { zkEnforced: {} },
          null,
        )
        .accounts({
          dao: daoPda,
          proposal: proposalPda,
          zkProofAnchor: zkAnchorPda,
          zkVerificationReceipt: zkReceiptPda,
          verifier: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("Should have rejected zk_enforced receipt without verifier program");
    } catch (err: any) {
      assert.include(err.toString(), "ZkVerifierProgramRequired");
      console.log("  ✓ zk_enforced receipt requires verifier program boundary");
    }
  });

  it("configures a proposal-level zk_enforced mode from authority-attested receipts", async () => {
    const [voteAnchorPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("zk-proof"), proposalPda.toBuffer(), Buffer.from([1])],
      program.programId,
    );
    const [voteReceiptPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("zk-verify"), proposalPda.toBuffer(), Buffer.from([1])],
      program.programId,
    );

    await program.methods
      .verifyZkProofOnChain(
        { vote: {} },
        { zkEnforced: {} },
        program.programId,
      )
      .accounts({
        dao: daoPda,
        proposal: proposalPda,
        zkProofAnchor: voteAnchorPda,
        zkVerificationReceipt: voteReceiptPda,
        verifier: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const layerSpecs = [
      { key: { delegation: {} }, seed: 2 },
      { key: { tally: {} }, seed: 3 },
    ];

    for (const layer of layerSpecs) {
      const [zkAnchorPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("zk-proof"), proposalPda.toBuffer(), Buffer.from([layer.seed])],
        program.programId,
      );
      const [zkReceiptPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("zk-verify"), proposalPda.toBuffer(), Buffer.from([layer.seed])],
        program.programId,
      );
      const proofHash = [...crypto.randomBytes(32)];
      const publicInputsHash = [...crypto.randomBytes(32)];
      const verificationKeyHash = [...crypto.randomBytes(32)];
      const bundleHash = [...crypto.randomBytes(32)];

      await program.methods
        .anchorZkProof(
          layer.key,
          { groth16: {} },
          proofHash,
          publicInputsHash,
          verificationKeyHash,
          bundleHash,
        )
        .accounts({
          dao: daoPda,
          proposal: proposalPda,
          zkProofAnchor: zkAnchorPda,
          recorder: voter1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([voter1])
        .rpc();

      await program.methods
        .verifyZkProofOnChain(
          layer.key,
          { zkEnforced: {} },
          program.programId,
        )
        .accounts({
          dao: daoPda,
          proposal: proposalPda,
          zkProofAnchor: zkAnchorPda,
          zkVerificationReceipt: zkReceiptPda,
          verifier: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    }

    const [proposalZkPolicyPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("zk-policy"), proposalPda.toBuffer()],
      program.programId,
    );
    const [delegationReceiptPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("zk-verify"), proposalPda.toBuffer(), Buffer.from([2])],
      program.programId,
    );
    const [tallyReceiptPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("zk-verify"), proposalPda.toBuffer(), Buffer.from([3])],
      program.programId,
    );

    await program.methods
      .configureProposalZkMode({ zkEnforced: {} })
        .accounts({
          dao: daoPda,
          proposal: proposalPda,
          proposalZkPolicy: proposalZkPolicyPda,
          voteZkReceipt: voteReceiptPda,
          delegationZkReceipt: delegationReceiptPda,
          tallyZkReceipt: tallyReceiptPda,
          operator: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

    const policy = await program.account["proposalZkPolicy"].fetch(proposalZkPolicyPda);
    assert.equal(policy.dao.toBase58(), daoPda.toBase58());
    assert.equal(policy.proposal.toBase58(), proposalPda.toBase58());
    assert.equal(policy.configuredBy.toBase58(), authority.publicKey.toBase58());
    assert.deepEqual(policy.mode, { zkEnforced: {} });
    assert.equal(policy.requiredLayersMask, 7);
    console.log("  ✓ proposal-level zk_enforced mode configured from authority-attested receipts");
  });

  it("rejects proposer activation of zk_enforced mode even with valid receipts", async () => {
    const dao = await program.account["dao"].fetch(daoPda);
    const [proposalForUnauthorizedConfig] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), daoPda.toBuffer(), dao.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );

    await program.methods
      .createProposal(
        "Authority-only zk enforced",
        "Only the DAO authority should be able to switch a proposal into zk_enforced mode.",
        new BN(3600),
        null,
      )
      .accounts({
        dao: daoPda,
        proposal: proposalForUnauthorizedConfig,
        proposerTokenAccount: v1Ata,
        proposer: voter1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([voter1])
      .rpc();

    const layerSpecs = [
      { key: { vote: {} }, seed: 1 },
      { key: { delegation: {} }, seed: 2 },
      { key: { tally: {} }, seed: 3 },
    ];

    for (const layer of layerSpecs) {
      const [zkAnchorPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("zk-proof"), proposalForUnauthorizedConfig.toBuffer(), Buffer.from([layer.seed])],
        program.programId,
      );
      const [zkReceiptPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("zk-verify"), proposalForUnauthorizedConfig.toBuffer(), Buffer.from([layer.seed])],
        program.programId,
      );
      const proofHash = [...crypto.randomBytes(32)];
      const publicInputsHash = [...crypto.randomBytes(32)];
      const verificationKeyHash = [...crypto.randomBytes(32)];
      const bundleHash = [...crypto.randomBytes(32)];

      await program.methods
        .anchorZkProof(
          layer.key,
          { groth16: {} },
          proofHash,
          publicInputsHash,
          verificationKeyHash,
          bundleHash,
        )
        .accounts({
          dao: daoPda,
          proposal: proposalForUnauthorizedConfig,
          zkProofAnchor: zkAnchorPda,
          recorder: voter1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([voter1])
        .rpc();

      await program.methods
        .verifyZkProofOnChain(
          layer.key,
          { zkEnforced: {} },
          program.programId,
        )
        .accounts({
          dao: daoPda,
          proposal: proposalForUnauthorizedConfig,
          zkProofAnchor: zkAnchorPda,
          zkVerificationReceipt: zkReceiptPda,
          verifier: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    }

    const [proposalZkPolicyPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("zk-policy"), proposalForUnauthorizedConfig.toBuffer()],
      program.programId,
    );

    try {
      await program.methods
        .configureProposalZkMode({ zkEnforced: {} })
        .accounts({
          dao: daoPda,
          proposal: proposalForUnauthorizedConfig,
          proposalZkPolicy: proposalZkPolicyPda,
          voteZkReceipt: PublicKey.findProgramAddressSync(
            [Buffer.from("zk-verify"), proposalForUnauthorizedConfig.toBuffer(), Buffer.from([1])],
            program.programId,
          )[0],
          delegationZkReceipt: PublicKey.findProgramAddressSync(
            [Buffer.from("zk-verify"), proposalForUnauthorizedConfig.toBuffer(), Buffer.from([2])],
            program.programId,
          )[0],
          tallyZkReceipt: PublicKey.findProgramAddressSync(
            [Buffer.from("zk-verify"), proposalForUnauthorizedConfig.toBuffer(), Buffer.from([3])],
            program.programId,
          )[0],
          operator: voter1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([voter1])
        .rpc();
      assert.fail("Should have rejected proposer activation of zk_enforced mode");
    } catch (err: any) {
      assert.include(err.toString(), "UnauthorizedZkModeConfig");
      console.log("  ✓ proposer activation of zk_enforced mode rejected");
    }
  });

  it("rejects zk_enforced mode when required receipts are missing", async () => {
    const dao = await program.account["dao"].fetch(daoPda);
    const [missingReceiptProposalPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), daoPda.toBuffer(), dao.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );

    await program.methods
      .createProposal(
        "Missing ZK receipts",
        "zk_enforced must not activate without vote, delegation, and tally verification receipts.",
        new BN(3600),
        null,
      )
      .accounts({
        dao: daoPda,
        proposal: missingReceiptProposalPda,
        proposerTokenAccount: v1Ata,
        proposer: voter1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([voter1])
      .rpc();

    const [proposalZkPolicyPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("zk-policy"), missingReceiptProposalPda.toBuffer()],
      program.programId,
    );

    try {
      await program.methods
        .configureProposalZkMode({ zkEnforced: {} })
        .accounts({
          dao: daoPda,
          proposal: missingReceiptProposalPda,
          proposalZkPolicy: proposalZkPolicyPda,
          voteZkReceipt: PublicKey.findProgramAddressSync(
            [Buffer.from("zk-verify"), missingReceiptProposalPda.toBuffer(), Buffer.from([1])],
            program.programId,
          )[0],
          delegationZkReceipt: PublicKey.findProgramAddressSync(
            [Buffer.from("zk-verify"), missingReceiptProposalPda.toBuffer(), Buffer.from([2])],
            program.programId,
          )[0],
          tallyZkReceipt: PublicKey.findProgramAddressSync(
            [Buffer.from("zk-verify"), missingReceiptProposalPda.toBuffer(), Buffer.from([3])],
            program.programId,
          )[0],
          operator: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("Should have rejected zk_enforced mode without receipts");
    } catch (err: any) {
      assert.include(err.toString(), "ZkVerificationReceiptMissing");
      console.log("  ✓ zk_enforced activation rejected when receipts are missing");
    }
  });

  it("rejects zk_enforced mode when receipts belong to another proposal", async () => {
    const dao = await program.account["dao"].fetch(daoPda);
    const [wrongReceiptProposalPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), daoPda.toBuffer(), dao.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );

    await program.methods
      .createProposal(
        "Wrong receipt binding",
        "zk_enforced must stay proposal-bound and reject receipts from another proposal.",
        new BN(3600),
        null,
      )
      .accounts({
        dao: daoPda,
        proposal: wrongReceiptProposalPda,
        proposerTokenAccount: v1Ata,
        proposer: voter1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([voter1])
      .rpc();

    const [proposalZkPolicyPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("zk-policy"), wrongReceiptProposalPda.toBuffer()],
      program.programId,
    );
    const [voteReceiptPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("zk-verify"), proposalPda.toBuffer(), Buffer.from([1])],
      program.programId,
    );
    const [delegationReceiptPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("zk-verify"), proposalPda.toBuffer(), Buffer.from([2])],
      program.programId,
    );
    const [tallyReceiptPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("zk-verify"), proposalPda.toBuffer(), Buffer.from([3])],
      program.programId,
    );

    try {
      await program.methods
        .configureProposalZkMode({ zkEnforced: {} })
        .accounts({
          dao: daoPda,
          proposal: wrongReceiptProposalPda,
          proposalZkPolicy: proposalZkPolicyPda,
          voteZkReceipt: voteReceiptPda,
          delegationZkReceipt: delegationReceiptPda,
          tallyZkReceipt: tallyReceiptPda,
          operator: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("Should have rejected zk_enforced mode with receipts from another proposal");
    } catch (err: any) {
      assert.include(err.toString(), "ZkVerificationReceiptMismatch");
      console.log("  ✓ zk_enforced activation rejected for cross-proposal receipts");
    }
  });

  it("rejects zk mode downgrade after zk_enforced is locked", async () => {
    const [proposalZkPolicyPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("zk-policy"), proposalPda.toBuffer()],
      program.programId,
    );
    const [voteReceiptPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("zk-verify"), proposalPda.toBuffer(), Buffer.from([1])],
      program.programId,
    );
    const [delegationReceiptPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("zk-verify"), proposalPda.toBuffer(), Buffer.from([2])],
      program.programId,
    );
    const [tallyReceiptPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("zk-verify"), proposalPda.toBuffer(), Buffer.from([3])],
      program.programId,
    );

    try {
      await program.methods
        .configureProposalZkMode({ companion: {} })
        .accounts({
          dao: daoPda,
          proposal: proposalPda,
          proposalZkPolicy: proposalZkPolicyPda,
          voteZkReceipt: voteReceiptPda,
          delegationZkReceipt: delegationReceiptPda,
          tallyZkReceipt: tallyReceiptPda,
          operator: voter1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([voter1])
        .rpc();
      assert.fail("Should have rejected zk mode downgrade after zk_enforced lock");
    } catch (err: any) {
      assert.include(err.toString(), "ProposalZkModeImmutable");
      console.log("  ✓ zk_enforced policy cannot be downgraded once locked");
    }
  });

  it("rejects invalid treasury action configuration", async () => {
    const dao = await program.account["dao"].fetch(daoPda);
    const [invalidProposalPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), daoPda.toBuffer(), dao.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );

    try {
      await program.methods
        .createProposal(
          "Invalid token action",
          "SendToken without token mint must fail.",
          new BN(3600),
          {
            actionType: { sendToken: {} },
            amountLamports: new BN(1),
            recipient: authority.publicKey,
            tokenMint: null,
          },
        )
        .accounts({
          dao: daoPda,
          proposal: invalidProposalPda,
          proposerTokenAccount: authorityTokenAta,
          proposer: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("Should have rejected invalid treasury action");
    } catch (err: any) {
      const msg = err.toString();
      assert.isTrue(
        msg.includes("TokenMintRequired") || msg.includes("InvalidTreasuryAction"),
        `unexpected error: ${msg}`,
      );
      console.log("  ✓ invalid treasury action rejected");
    }
  });

  it("rejects unsupported CustomCPI treasury actions at proposal creation", async () => {
    const dao = await program.account["dao"].fetch(daoPda);
    const [customCpiProposalPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), daoPda.toBuffer(), dao.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );

    try {
      await program.methods
        .createProposal(
          "Unsupported CustomCPI",
          "CustomCPI should remain reserved rather than pretending to execute on-chain.",
          new BN(3600),
          {
            actionType: { customCpi: {} },
            amountLamports: new BN(0),
            recipient: authority.publicKey,
            tokenMint: null,
          },
        )
        .accounts({
          dao: daoPda,
          proposal: customCpiProposalPda,
          proposerTokenAccount: authorityTokenAta,
          proposer: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("Should have rejected unsupported CustomCPI action");
    } catch (err: any) {
      assert.include(err.toString(), "UnsupportedTreasuryAction");
      console.log("  ✓ unsupported CustomCPI action rejected");
    }
  });

  it("allows voters to commit — tally stays hidden", async () => {
    salt1 = randomSalt(); salt2 = randomSalt(); salt3 = randomSalt();

    const commitment1 = computeCommitment(true,  salt1, voter1.publicKey, proposalPda);
    const commitment2 = computeCommitment(true,  salt2, voter2.publicKey, proposalPda);
    const commitment3 = computeCommitment(false, salt3, voter3.publicKey, proposalPda);

    for (const [voter, ata, commitment] of [
      [voter1, v1Ata, commitment1],
      [voter2, v2Ata, commitment2],
      [voter3, v3Ata, commitment3],
    ] as [Keypair, PublicKey, Buffer][]) {
      const [vrPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vote"), proposalPda.toBuffer(), voter.publicKey.toBuffer()],
        program.programId,
      );
      const [delegationMarkerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("delegation"), proposalPda.toBuffer(), voter.publicKey.toBuffer()],
        program.programId,
      );
      await program.methods
        .commitVote([...commitment], null)
        .accounts({
          dao: daoPda, proposal: proposalPda,
          voterRecord: vrPda, delegationMarker: delegationMarkerPda, voterTokenAccount: ata,
          voter: voter.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId,
        })
        .signers([voter])
        .rpc();
    }

    const p = await program.account["proposal"].fetch(proposalPda);
    assert.equal(p.commitCount.toString(), "3");
    assert.equal(p.yesCapital.toString(), "0");
    assert.equal(p.noCapital.toString(),  "0");
    console.log("  ✓ 3 votes committed — tally: YES=0 / NO=0 (hidden)");
  });

  it("rejects commit from a zero-balance governance account", async () => {
    const zeroVoter = Keypair.generate();
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: authority.publicKey,
        toPubkey: zeroVoter.publicKey,
        lamports: Math.round(0.005 * LAMPORTS_PER_SOL),
      }),
    );
    await provider.sendAndConfirm(tx, []);

    const zeroAta = await createAccount(provider.connection, authority.payer, governanceMint, zeroVoter.publicKey);
    const [zeroVotePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), proposalPda.toBuffer(), zeroVoter.publicKey.toBuffer()],
      program.programId,
    );
    const [zeroDelegationMarkerPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("delegation"), proposalPda.toBuffer(), zeroVoter.publicKey.toBuffer()],
      program.programId,
    );

    try {
      await program.methods
        .commitVote([...computeCommitment(true, randomSalt(), zeroVoter.publicKey, proposalPda)], null)
        .accounts({
          dao: daoPda,
          proposal: proposalPda,
          voterRecord: zeroVotePda,
          delegationMarker: zeroDelegationMarkerPda,
          voterTokenAccount: zeroAta,
          voter: zeroVoter.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([zeroVoter])
        .rpc();
      assert.fail("Should have rejected zero-balance commit");
    } catch (err: any) {
      const msg = err.toString();
      assert.include(msg, "InsufficientTokens");
      console.log("  ✓ zero-balance commit rejected");
    }
  });

  it("rejects proposal creation from a wallet without governance tokens", async () => {
    const emptyProposer = Keypair.generate();
    await provider.sendAndConfirm(
      new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: authority.publicKey,
          toPubkey: emptyProposer.publicKey,
          lamports: Math.round(0.02 * LAMPORTS_PER_SOL),
        }),
      ),
      [],
    );

    const emptyAta = await createAccount(provider.connection, authority.payer, governanceMint, emptyProposer.publicKey);
    const dao = await program.account["dao"].fetch(daoPda);
    const [unauthorizedProposalPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), daoPda.toBuffer(), dao.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );

    try {
      await program.methods
        .createProposal(
          "Unauthorized proposer",
          "A wallet without governance tokens must not create proposals.",
          new BN(3600),
          null,
        )
        .accounts({
          dao: daoPda,
          proposal: unauthorizedProposalPda,
          proposerTokenAccount: emptyAta,
          proposer: emptyProposer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([emptyProposer])
        .rpc();
      assert.fail("Should have rejected proposer with zero governance tokens");
    } catch (err: any) {
      assert.include(err.toString(), "InsufficientTokens");
      console.log("  ✓ proposer without governance tokens rejected");
    }
  });

  it("rejects double-commit", async () => {
    const [vrPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), proposalPda.toBuffer(), voter1.publicKey.toBuffer()],
      program.programId,
    );
    try {
      await program.methods
        .commitVote([...randomSalt()], null)
        .accounts({
          dao: daoPda, proposal: proposalPda,
          voterRecord: vrPda,
          delegationMarker: PublicKey.findProgramAddressSync(
            [Buffer.from("delegation"), proposalPda.toBuffer(), voter1.publicKey.toBuffer()],
            program.programId,
          )[0],
          voterTokenAccount: v1Ata,
          voter: voter1.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId,
        })
        .signers([voter1])
        .rpc();
      assert.fail("Should have rejected double commit");
    } catch (err: any) {
      const msg = err.toString();
      assert.isTrue(
        msg.includes("AlreadyCommitted")
          || msg.includes("already committed")
          || msg.includes("0x1779")
          || msg.includes("already in use")
          || msg.includes("custom program error: 0x0"),
        `unexpected error: ${msg}`,
      );
      console.log("  ✓ double-commit rejected");
    }
  });

  it("rejects reveal before the voting window closes", async () => {
    const earlyVoter = Keypair.generate();
    await provider.sendAndConfirm(
      new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: authority.publicKey,
          toPubkey: earlyVoter.publicKey,
          lamports: Math.round(0.005 * LAMPORTS_PER_SOL),
        }),
      ),
      [],
    );

    const earlyAta = await createAccount(provider.connection, authority.payer, governanceMint, earlyVoter.publicKey);
    await mintTo(provider.connection, authority.payer, governanceMint, earlyAta, authority.payer, 250_000_000n);

    const dao = await program.account["dao"].fetch(daoPda);
    const [earlyProposalPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), daoPda.toBuffer(), dao.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );

    await program.methods
      .createProposal("Early reveal guard", "Reveal must stay locked until voting_end.", new BN(5), null)
      .accounts({
        dao: daoPda,
        proposal: earlyProposalPda,
        proposerTokenAccount: authorityTokenAta,
        proposer: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const salt = randomSalt();
    const [earlyVotePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), earlyProposalPda.toBuffer(), earlyVoter.publicKey.toBuffer()],
      program.programId,
    );
    await program.methods
      .commitVote([...computeCommitment(true, salt, earlyVoter.publicKey, earlyProposalPda)], null)
      .accounts({
        dao: daoPda,
        proposal: earlyProposalPda,
        voterRecord: earlyVotePda,
        delegationMarker: PublicKey.findProgramAddressSync(
          [Buffer.from("delegation"), earlyProposalPda.toBuffer(), earlyVoter.publicKey.toBuffer()],
          program.programId,
        )[0],
        voterTokenAccount: earlyAta,
        voter: earlyVoter.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([earlyVoter])
      .rpc();

    try {
      await program.methods
        .revealVote(true, [...salt])
        .accounts({
          proposal: earlyProposalPda,
          voterRecord: earlyVotePda,
          revealer: earlyVoter.publicKey,
        })
        .signers([earlyVoter])
        .rpc();
      assert.fail("Should have rejected reveal before voting_end");
    } catch (err: any) {
      assert.include(err.toString(), "RevealTooEarly");
      console.log("  ✓ reveal before voting_end rejected");
    }
  });

  it("rejects reveal with wrong salt", async () => {
    const [vrPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), proposalPda.toBuffer(), voter1.publicKey.toBuffer()],
      program.programId,
    );
    try {
      await program.methods
        .revealVote(true, [...randomSalt()])
        .accounts({ proposal: proposalPda, voterRecord: vrPda, revealer: voter1.publicKey })
        .signers([voter1])
        .rpc();
      assert.fail("Should have rejected");
    } catch (err: any) {
      const msg = err.toString();
      assert.isTrue(
        msg.includes("RevealTooEarly") || msg.includes("CommitmentMismatch"),
        `unexpected error: ${msg}`,
      );
      console.log("  ✓ invalid reveal rejected (RevealTooEarly or CommitmentMismatch)");
    }
  });

  it("rejects commit after the proposal voting window has closed", async () => {
    const lateVoter = Keypair.generate();
    await provider.sendAndConfirm(
      new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: authority.publicKey,
          toPubkey: lateVoter.publicKey,
          lamports: Math.round(0.005 * LAMPORTS_PER_SOL),
        }),
      ),
      [],
    );

    const lateAta = await createAccount(provider.connection, authority.payer, governanceMint, lateVoter.publicKey);
    await mintTo(provider.connection, authority.payer, governanceMint, lateAta, authority.payer, 250_000_000n);

    const dao = await program.account["dao"].fetch(daoPda);
    const [lateProposalPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), daoPda.toBuffer(), dao.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );

    await program.methods
      .createProposal("Closed voting window", "Commit must fail once the voting window is over.", new BN(5), null)
      .accounts({
        dao: daoPda,
        proposal: lateProposalPda,
        proposerTokenAccount: authorityTokenAta,
        proposer: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const created = await program.account["proposal"].fetch(lateProposalPda);
    await waitUntilUnix(created.votingEnd);

    try {
      await program.methods
        .commitVote([...randomSalt()], null)
        .accounts({
          dao: daoPda,
          proposal: lateProposalPda,
          voterRecord: PublicKey.findProgramAddressSync(
            [Buffer.from("vote"), lateProposalPda.toBuffer(), lateVoter.publicKey.toBuffer()],
            program.programId,
          )[0],
          delegationMarker: PublicKey.findProgramAddressSync(
            [Buffer.from("delegation"), lateProposalPda.toBuffer(), lateVoter.publicKey.toBuffer()],
            program.programId,
          )[0],
          voterTokenAccount: lateAta,
          voter: lateVoter.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([lateVoter])
        .rpc();
      assert.fail("Should have rejected commit after voting window closed");
    } catch (err: any) {
      assert.include(err.toString(), "VotingClosed");
      console.log("  ✓ commit after voting_end rejected");
    }
  });

  it("rejects reveal with mismatched vote payload", async () => {
    const payloadVoter = Keypair.generate();
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: authority.publicKey,
        toPubkey: payloadVoter.publicKey,
        lamports: Math.round(0.005 * LAMPORTS_PER_SOL),
      }),
    );
    await provider.sendAndConfirm(tx, []);

    const payloadAta = await createAccount(provider.connection, authority.payer, governanceMint, payloadVoter.publicKey);
    await mintTo(provider.connection, authority.payer, governanceMint, payloadAta, authority.payer, 250_000_000n);

    const dao = await program.account["dao"].fetch(daoPda);
    const [payloadProposalPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), daoPda.toBuffer(), dao.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );

    await program.methods
      .createProposal("Reveal payload guard", "Wrong vote payload must fail commitment verification.", new BN(5), null)
      .accounts({
        dao: daoPda,
        proposal: payloadProposalPda,
        proposerTokenAccount: authorityTokenAta,
        proposer: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const salt = randomSalt();
    const [payloadVotePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), payloadProposalPda.toBuffer(), payloadVoter.publicKey.toBuffer()],
      program.programId,
    );

    await program.methods
      .commitVote([...computeCommitment(true, salt, payloadVoter.publicKey, payloadProposalPda)], null)
      .accounts({
        dao: daoPda,
        proposal: payloadProposalPda,
        voterRecord: payloadVotePda,
        delegationMarker: PublicKey.findProgramAddressSync(
          [Buffer.from("delegation"), payloadProposalPda.toBuffer(), payloadVoter.publicKey.toBuffer()],
          program.programId,
        )[0],
        voterTokenAccount: payloadAta,
        voter: payloadVoter.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([payloadVoter])
      .rpc();

    const created = await program.account["proposal"].fetch(payloadProposalPda);
    await new Promise((resolve) => setTimeout(resolve, Math.max(created.votingEnd.toNumber() - Math.floor(Date.now() / 1000), 0) * 1000 + 1200));

    try {
      await program.methods
        .revealVote(false, [...salt])
        .accounts({ proposal: payloadProposalPda, voterRecord: payloadVotePda, revealer: payloadVoter.publicKey })
        .signers([payloadVoter])
        .rpc();
      assert.fail("Should have rejected reveal with mismatched vote payload");
    } catch (err: any) {
      assert.include(err.toString(), "CommitmentMismatch");
      console.log("  ✓ mismatched reveal payload rejected");
    }
  });

  it("rejects reveal by an unauthorized signer", async () => {
    const voter = Keypair.generate();
    const attacker = Keypair.generate();
    for (const wallet of [voter, attacker]) {
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: authority.publicKey,
          toPubkey: wallet.publicKey,
          lamports: Math.round(0.005 * LAMPORTS_PER_SOL),
        }),
      );
      await provider.sendAndConfirm(tx, []);
    }

    const voterAta = await createAccount(provider.connection, authority.payer, governanceMint, voter.publicKey);
    await mintTo(provider.connection, authority.payer, governanceMint, voterAta, authority.payer, 250_000_000n);

    const dao = await program.account["dao"].fetch(daoPda);
    const [proposalForAuthPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), daoPda.toBuffer(), dao.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );

    await program.methods
      .createProposal("Unauthorized reveal", "Only voter or keeper should reveal.", new BN(5), null)
      .accounts({
        dao: daoPda,
        proposal: proposalForAuthPda,
        proposerTokenAccount: authorityTokenAta,
        proposer: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const salt = randomSalt();
    const [voteRecordPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), proposalForAuthPda.toBuffer(), voter.publicKey.toBuffer()],
      program.programId,
    );
    await program.methods
      .commitVote([...computeCommitment(true, salt, voter.publicKey, proposalForAuthPda)], null)
      .accounts({
        dao: daoPda,
        proposal: proposalForAuthPda,
        voterRecord: voteRecordPda,
        delegationMarker: PublicKey.findProgramAddressSync(
          [Buffer.from("delegation"), proposalForAuthPda.toBuffer(), voter.publicKey.toBuffer()],
          program.programId,
        )[0],
        voterTokenAccount: voterAta,
        voter: voter.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([voter])
      .rpc();

    const created = await program.account["proposal"].fetch(proposalForAuthPda);
    await new Promise((resolve) => setTimeout(resolve, Math.max(created.votingEnd.toNumber() - Math.floor(Date.now() / 1000), 0) * 1000 + 1200));

    try {
      await program.methods
        .revealVote(true, [...salt])
        .accounts({ proposal: proposalForAuthPda, voterRecord: voteRecordPda, revealer: attacker.publicKey })
        .signers([attacker])
        .rpc();
      assert.fail("Should have rejected reveal by unauthorized signer");
    } catch (err: any) {
      assert.include(err.toString(), "NotAuthorizedToReveal");
      console.log("  ✓ unauthorized reveal rejected");
    }
  });

  it("clears keeper reveal authority after a successful keeper reveal", async () => {
    const voter = Keypair.generate();
    const keeper = Keypair.generate();
    for (const wallet of [voter, keeper]) {
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: authority.publicKey,
          toPubkey: wallet.publicKey,
          lamports: Math.round(0.005 * LAMPORTS_PER_SOL),
        }),
      );
      await provider.sendAndConfirm(tx, []);
    }

    const voterAta = await createAccount(provider.connection, authority.payer, governanceMint, voter.publicKey);
    await mintTo(provider.connection, authority.payer, governanceMint, voterAta, authority.payer, 250_000_000n);

    const dao = await program.account["dao"].fetch(daoPda);
    const [proposalForKeeperPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), daoPda.toBuffer(), dao.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );

    await program.methods
      .createProposal("Keeper reveal cleanup", "Successful keeper reveal should clear stored keeper authority.", new BN(5), null)
      .accounts({
        dao: daoPda,
        proposal: proposalForKeeperPda,
        proposerTokenAccount: authorityTokenAta,
        proposer: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const salt = randomSalt();
    const [voteRecordPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), proposalForKeeperPda.toBuffer(), voter.publicKey.toBuffer()],
      program.programId,
    );

    await program.methods
      .commitVote([...computeCommitment(true, salt, voter.publicKey, proposalForKeeperPda)], keeper.publicKey)
      .accounts({
        dao: daoPda,
        proposal: proposalForKeeperPda,
        voterRecord: voteRecordPda,
        delegationMarker: PublicKey.findProgramAddressSync(
          [Buffer.from("delegation"), proposalForKeeperPda.toBuffer(), voter.publicKey.toBuffer()],
          program.programId,
        )[0],
        voterTokenAccount: voterAta,
        voter: voter.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([voter])
      .rpc();

    const beforeReveal = await program.account["voterRecord"].fetch(voteRecordPda);
    assert.equal(beforeReveal.voterRevealAuthority.toBase58(), keeper.publicKey.toBase58());

    const created = await program.account["proposal"].fetch(proposalForKeeperPda);
    await new Promise((resolve) => setTimeout(resolve, Math.max(created.votingEnd.toNumber() - Math.floor(Date.now() / 1000), 0) * 1000 + 1200));

    await program.methods
      .revealVote(true, [...salt])
      .accounts({ proposal: proposalForKeeperPda, voterRecord: voteRecordPda, revealer: keeper.publicKey })
      .signers([keeper])
      .rpc();

    const afterReveal = await program.account["voterRecord"].fetch(voteRecordPda);
    assert.isTrue(afterReveal.hasRevealed);
    assert.isNull(afterReveal.voterRevealAuthority);
    console.log("  ✓ keeper authority cleared after successful keeper reveal");
  });

  it("rejects voter-record reuse across proposals", async () => {
    const reuseVoter = Keypair.generate();
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: authority.publicKey,
        toPubkey: reuseVoter.publicKey,
        lamports: Math.round(0.005 * LAMPORTS_PER_SOL),
      }),
    );
    await provider.sendAndConfirm(tx, []);

    const reuseAta = await createAccount(provider.connection, authority.payer, governanceMint, reuseVoter.publicKey);
    await mintTo(provider.connection, authority.payer, governanceMint, reuseAta, authority.payer, 250_000_000n);

    const dao = await program.account["dao"].fetch(daoPda);
    const [proposalA] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), daoPda.toBuffer(), dao.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );
    await program.methods
      .createProposal("Proposal A", "Voter record belongs only to this proposal.", new BN(3600), null)
      .accounts({
        dao: daoPda,
        proposal: proposalA,
        proposerTokenAccount: authorityTokenAta,
        proposer: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const daoAfterA = await program.account["dao"].fetch(daoPda);
    const [proposalB] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), daoPda.toBuffer(), daoAfterA.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );
    await program.methods
      .createProposal("Proposal B", "Cross-proposal voter-record substitution must fail.", new BN(3600), null)
      .accounts({
        dao: daoPda,
        proposal: proposalB,
        proposerTokenAccount: authorityTokenAta,
        proposer: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const [voteRecordForA] = PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), proposalA.toBuffer(), reuseVoter.publicKey.toBuffer()],
      program.programId,
    );

    try {
      await program.methods
        .commitVote([...computeCommitment(true, randomSalt(), reuseVoter.publicKey, proposalB)], null)
        .accounts({
          dao: daoPda,
          proposal: proposalB,
          voterRecord: voteRecordForA,
          delegationMarker: PublicKey.findProgramAddressSync(
            [Buffer.from("delegation"), proposalB.toBuffer(), reuseVoter.publicKey.toBuffer()],
            program.programId,
          )[0],
          voterTokenAccount: reuseAta,
          voter: reuseVoter.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([reuseVoter])
        .rpc();
      assert.fail("Should have rejected voter-record reuse across proposals");
    } catch (err: any) {
      const msg = err.toString();
      assert.isTrue(
        msg.includes("ConstraintSeeds") || msg.includes("seeds constraint"),
        `unexpected error: ${msg}`,
      );
      console.log("  ✓ voter-record reuse across proposals rejected");
    }
  });

  it("can cancel a proposal during voting", async () => {
    const dao = await program.account["dao"].fetch(daoPda);
    const [cancelPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), daoPda.toBuffer(), dao.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );

    await program.methods
      .createProposal("Cancel me", "Test cancel.", new BN(3600), null)
      .accounts({
        dao: daoPda, proposal: cancelPda,
        proposerTokenAccount: authorityTokenAta, proposer: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .cancelProposal()
      .accounts({ dao: daoPda, proposal: cancelPda, authority: authority.publicKey })
      .rpc();

    const p = await program.account["proposal"].fetch(cancelPda);
    assert.isTrue("cancelled" in p.status, "status should be cancelled");
    console.log("  ✓ proposal cancelled successfully");
  });

  it("rejects legacy cancellation after a commit has been recorded", async () => {
    const dao = await program.account["dao"].fetch(daoPda);
    const [cancelAfterCommitPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), daoPda.toBuffer(), dao.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );

    await program.methods
      .createProposal("Do not cancel after commit", "Participation must make cancellation unsafe.", new BN(3600), null)
      .accounts({
        dao: daoPda, proposal: cancelAfterCommitPda,
        proposerTokenAccount: authorityTokenAta, proposer: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const [voteRecordPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), cancelAfterCommitPda.toBuffer(), authority.publicKey.toBuffer()],
      program.programId,
    );
    const [delegationMarkerPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("delegation"), cancelAfterCommitPda.toBuffer(), authority.publicKey.toBuffer()],
      program.programId,
    );
    const salt = randomSalt();

    await program.methods
      .commitVote([...computeCommitment(true, salt, authority.publicKey, cancelAfterCommitPda)], null)
      .accounts({
        dao: daoPda, proposal: cancelAfterCommitPda,
        voterRecord: voteRecordPda, delegationMarker: delegationMarkerPda, voterTokenAccount: authorityTokenAta,
        voter: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId,
      })
      .rpc();

    try {
      await program.methods
        .cancelProposal()
        .accounts({ dao: daoPda, proposal: cancelAfterCommitPda, authority: authority.publicKey })
        .rpc();
      assert.fail("Should have rejected cancellation after voting participation");
    } catch (err: any) {
      assert.include(err.toString(), "ProposalNotCancellable");
      console.log("  ✓ legacy cancellation after commit rejected");
    }
  });

  it("rejects zero-value treasury deposit", async () => {
    const [treasuryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury"), daoPda.toBuffer()],
      program.programId,
    );

    try {
      await program.methods
        .depositTreasury(new BN(0))
        .accounts({
          dao: daoPda,
          treasury: treasuryPda,
          depositor: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("Should have rejected zero-value deposit");
    } catch (err: any) {
      const msg = err.toString();
      assert.isTrue(
        msg.includes("InvalidTreasuryAction") || msg.includes("custom program error"),
        `unexpected error: ${msg}`,
      );
      console.log("  ✓ zero-value treasury deposit rejected");
    }
  });

  it("rejects self-delegation", async () => {
    const dao = await program.account["dao"].fetch(daoPda);
    const [selfDelegateProposalPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), daoPda.toBuffer(), dao.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );

    await program.methods
      .createProposal("Self delegation", "Delegators must not be able to double-count themselves.", new BN(3600), null)
      .accounts({
        dao: daoPda,
        proposal: selfDelegateProposalPda,
        proposerTokenAccount: authorityTokenAta,
        proposer: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const [delegationPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("delegation"), selfDelegateProposalPda.toBuffer(), voter1.publicKey.toBuffer()],
      program.programId,
    );

    try {
      await program.methods
        .delegateVote(voter1.publicKey)
        .accounts({
          dao: daoPda,
          proposal: selfDelegateProposalPda,
          delegation: delegationPda,
          directVoteMarker: PublicKey.findProgramAddressSync(
            [Buffer.from("vote"), selfDelegateProposalPda.toBuffer(), voter1.publicKey.toBuffer()],
            program.programId,
          )[0],
          delegatorTokenAccount: v1Ata,
          delegator: voter1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([voter1])
        .rpc();
      assert.fail("Should have rejected self-delegation");
    } catch (err: any) {
      const msg = err.toString();
      assert.isTrue(
        msg.includes("SelfDelegationNotAllowed") || msg.includes("InvalidDelegatee"),
        `unexpected error: ${msg}`,
      );
      console.log("  ✓ self-delegation rejected");
    }
  });

  it("rejects delegation after the same wallet already committed directly", async () => {
    const dao = await program.account["dao"].fetch(daoPda);
    const [proposalForOverlapPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), daoPda.toBuffer(), dao.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );

    await program.methods
      .createProposal("Direct vote first", "Delegation must fail once a direct vote record exists.", new BN(3600), null)
      .accounts({
        dao: daoPda,
        proposal: proposalForOverlapPda,
        proposerTokenAccount: authorityTokenAta,
        proposer: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const overlapSalt = randomSalt();
    const [overlapVotePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), proposalForOverlapPda.toBuffer(), voter1.publicKey.toBuffer()],
      program.programId,
    );
    const [overlapDelegationMarker] = PublicKey.findProgramAddressSync(
      [Buffer.from("delegation"), proposalForOverlapPda.toBuffer(), voter1.publicKey.toBuffer()],
      program.programId,
    );
    const [overlapDelegationPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("delegation"), proposalForOverlapPda.toBuffer(), voter1.publicKey.toBuffer()],
      program.programId,
    );

    await program.methods
      .commitVote([...computeCommitment(true, overlapSalt, voter1.publicKey, proposalForOverlapPda)], null)
      .accounts({
        dao: daoPda,
        proposal: proposalForOverlapPda,
        voterRecord: overlapVotePda,
        delegationMarker: overlapDelegationMarker,
        voterTokenAccount: v1Ata,
        voter: voter1.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([voter1])
      .rpc();

    try {
      await program.methods
        .delegateVote(voter2.publicKey)
        .accounts({
          dao: daoPda,
          proposal: proposalForOverlapPda,
          delegation: overlapDelegationPda,
          directVoteMarker: overlapVotePda,
          delegatorTokenAccount: v1Ata,
          delegator: voter1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([voter1])
        .rpc();
      assert.fail("Should have rejected delegation after direct commit");
    } catch (err: any) {
      assert.include(err.toString(), "DirectVoteAlreadyCommitted");
      console.log("  ✓ delegation rejected after direct commit");
    }
  });

  it("rejects delegated commit from a non-delegatee", async () => {
    const dao = await program.account["dao"].fetch(daoPda);
    const [delegatedProposalPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), daoPda.toBuffer(), dao.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );

    await program.methods
      .createProposal("Delegation guard", "Only the declared delegatee may consume delegated voting power.", new BN(3600), null)
      .accounts({
        dao: daoPda,
        proposal: delegatedProposalPda,
        proposerTokenAccount: authorityTokenAta,
        proposer: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const [delegationPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("delegation"), delegatedProposalPda.toBuffer(), voter2.publicKey.toBuffer()],
      program.programId,
    );
    const [directVoteRecordPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), delegatedProposalPda.toBuffer(), voter2.publicKey.toBuffer()],
      program.programId,
    );

    await program.methods
      .delegateVote(voter1.publicKey)
      .accounts({
        dao: daoPda,
        proposal: delegatedProposalPda,
        delegation: delegationPda,
        directVoteMarker: directVoteRecordPda,
        delegatorTokenAccount: v2Ata,
        delegator: voter2.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([voter2])
      .rpc();

    const wrongSalt = randomSalt();
    const [wrongDelegateVotePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), delegatedProposalPda.toBuffer(), voter3.publicKey.toBuffer()],
      program.programId,
    );

    try {
      await program.methods
        .commitDelegatedVote([...computeCommitment(true, wrongSalt, voter3.publicKey, delegatedProposalPda)], null)
        .accounts({
          dao: daoPda,
          proposal: delegatedProposalPda,
          delegation: delegationPda,
          delegatorVoteMarker: directVoteRecordPda,
          voterRecord: wrongDelegateVotePda,
          delegateeTokenAccount: v3Ata,
          delegatee: voter3.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([voter3])
        .rpc();
      assert.fail("Should have rejected delegated commit from a non-delegatee");
    } catch (err: any) {
      const msg = err.toString();
      assert.isTrue(
        msg.includes("NotDelegatee") || msg.includes("ConstraintRaw"),
        `unexpected error: ${msg}`,
      );
      console.log("  ✓ delegated vote misuse rejected for non-delegatee");
    }
  });

  it("rejects delegated commit with a delegation record from another proposal", async () => {
    const dao = await program.account["dao"].fetch(daoPda);
    const [proposalA] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), daoPda.toBuffer(), dao.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );

    await program.methods
      .createProposal("Delegation source proposal", "Delegation must stay bound to the proposal it was created for.", new BN(3600), null)
      .accounts({
        dao: daoPda,
        proposal: proposalA,
        proposerTokenAccount: authorityTokenAta,
        proposer: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const daoAfterA = await program.account["dao"].fetch(daoPda);
    const [proposalB] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), daoPda.toBuffer(), daoAfterA.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );

    await program.methods
      .createProposal("Delegation target proposal", "Cross-proposal delegation substitution must fail.", new BN(3600), null)
      .accounts({
        dao: daoPda,
        proposal: proposalB,
        proposerTokenAccount: authorityTokenAta,
        proposer: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const [delegationForA] = PublicKey.findProgramAddressSync(
      [Buffer.from("delegation"), proposalA.toBuffer(), voter2.publicKey.toBuffer()],
      program.programId,
    );

    await program.methods
      .delegateVote(voter1.publicKey)
      .accounts({
        dao: daoPda,
        proposal: proposalA,
        delegation: delegationForA,
        directVoteMarker: PublicKey.findProgramAddressSync(
          [Buffer.from("vote"), proposalA.toBuffer(), voter2.publicKey.toBuffer()],
          program.programId,
        )[0],
        delegatorTokenAccount: v2Ata,
        delegator: voter2.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([voter2])
      .rpc();

    const [voteRecordForB] = PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), proposalB.toBuffer(), voter1.publicKey.toBuffer()],
      program.programId,
    );
    const delegatedSalt = randomSalt();

    try {
      await program.methods
        .commitDelegatedVote([...computeCommitment(true, delegatedSalt, voter1.publicKey, proposalB)], null)
        .accounts({
          dao: daoPda,
          proposal: proposalB,
          delegation: delegationForA,
          delegatorVoteMarker: PublicKey.findProgramAddressSync(
            [Buffer.from("vote"), proposalB.toBuffer(), voter2.publicKey.toBuffer()],
            program.programId,
          )[0],
          voterRecord: voteRecordForB,
          delegateeTokenAccount: v1Ata,
          delegatee: voter1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([voter1])
        .rpc();
      assert.fail("Should have rejected delegated commit using a delegation PDA from another proposal");
    } catch (err: any) {
      const msg = err.toString();
      assert.isTrue(
        msg.includes("ConstraintSeeds") || msg.includes("WrongProposal") || msg.includes("seeds constraint"),
        `unexpected error: ${msg}`,
      );
    }

    const delegation = await program.account["voteDelegation"].fetch(delegationForA);
    assert.isFalse(delegation.isUsed, "failed delegated commit must not consume the delegation");
    console.log("  ✓ delegation record stayed proposal-bound");
  });

  it("rejects direct commit when the same wallet already delegated for the proposal", async () => {
    const dao = await program.account["dao"].fetch(daoPda);
    const [proposalForDelegationConflictPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), daoPda.toBuffer(), dao.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );

    await program.methods
      .createProposal("Delegation first", "Direct commit must fail while a delegation marker exists.", new BN(3600), null)
      .accounts({
        dao: daoPda,
        proposal: proposalForDelegationConflictPda,
        proposerTokenAccount: authorityTokenAta,
        proposer: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const [delegationConflictPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("delegation"), proposalForDelegationConflictPda.toBuffer(), voter2.publicKey.toBuffer()],
      program.programId,
    );
    const [delegationConflictVotePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), proposalForDelegationConflictPda.toBuffer(), voter2.publicKey.toBuffer()],
      program.programId,
    );

    await program.methods
      .delegateVote(voter1.publicKey)
      .accounts({
        dao: daoPda,
        proposal: proposalForDelegationConflictPda,
        delegation: delegationConflictPda,
        directVoteMarker: delegationConflictVotePda,
        delegatorTokenAccount: v2Ata,
        delegator: voter2.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([voter2])
      .rpc();

    try {
      await program.methods
        .commitVote(
          [...computeCommitment(true, randomSalt(), voter2.publicKey, proposalForDelegationConflictPda)],
          null,
        )
        .accounts({
          dao: daoPda,
          proposal: proposalForDelegationConflictPda,
          voterRecord: delegationConflictVotePda,
          delegationMarker: delegationConflictPda,
          voterTokenAccount: v2Ata,
          voter: voter2.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([voter2])
        .rpc();
      assert.fail("Should have rejected direct commit after delegation");
    } catch (err: any) {
      assert.include(err.toString(), "DelegationOverlap");
      console.log("  ✓ direct commit rejected after delegation");
    }
  });

  it("accepts a Token-2022 governance mint for DAO creation and commit flow", async () => {
    const token2022Name = uniqueDaoName("PDAO2022");
    const governanceMint2022 = await createMint(
      provider.connection,
      authority.payer,
      authority.publicKey,
      null,
      6,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );

    const authority2022Ata = getAssociatedTokenAddressSync(
      governanceMint2022,
      authority.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID,
    );
    await provider.sendAndConfirm(
      new Transaction().add(
        createAssociatedTokenAccountInstruction(
          authority.publicKey,
          authority2022Ata,
          authority.publicKey,
          governanceMint2022,
          TOKEN_2022_PROGRAM_ID,
        ),
      ),
      [],
    );
    await mintTo(
      provider.connection,
      authority.payer,
      governanceMint2022,
      authority2022Ata,
      authority.payer,
      1_000_000n,
      [],
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );

    const voter2022 = Keypair.generate();
    const fundTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: authority.publicKey,
        toPubkey: voter2022.publicKey,
        lamports: Math.round(0.03 * LAMPORTS_PER_SOL),
      }),
    );
    await provider.sendAndConfirm(fundTx, []);

    const voter2022Ata = getAssociatedTokenAddressSync(
      governanceMint2022,
      voter2022.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID,
    );
    await provider.sendAndConfirm(
      new Transaction().add(
        createAssociatedTokenAccountInstruction(
          authority.publicKey,
          voter2022Ata,
          voter2022.publicKey,
          governanceMint2022,
          TOKEN_2022_PROGRAM_ID,
        ),
      ),
      [],
    );
    await mintTo(
      provider.connection,
      authority.payer,
      governanceMint2022,
      voter2022Ata,
      authority.payer,
      500_000_000n,
      [],
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );

    const [dao2022Pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dao"), authority.publicKey.toBuffer(), Buffer.from(token2022Name)],
      program.programId,
    );

    await program.methods
      .initializeDao(
        token2022Name,
        51,
        new BN(0),
        new BN(3600),
        new BN(10),
        { tokenWeighted: {} },
      )
      .accounts({
        dao: dao2022Pda,
        governanceToken: governanceMint2022,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const dao2022 = await program.account["dao"].fetch(dao2022Pda);
    const [proposal2022Pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), dao2022Pda.toBuffer(), dao2022.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );

    await program.methods
      .createProposal("Token-2022 proposal", "Token-2022 governance accounts should work end-to-end.", new BN(3600), null)
      .accounts({
        dao: dao2022Pda,
        proposal: proposal2022Pda,
        proposerTokenAccount: voter2022Ata,
        proposer: voter2022.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([voter2022])
      .rpc();

    const [vote2022Pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), proposal2022Pda.toBuffer(), voter2022.publicKey.toBuffer()],
      program.programId,
    );
    const [delegation2022Marker] = PublicKey.findProgramAddressSync(
      [Buffer.from("delegation"), proposal2022Pda.toBuffer(), voter2022.publicKey.toBuffer()],
      program.programId,
    );

    await program.methods
      .commitVote([...computeCommitment(true, randomSalt(), voter2022.publicKey, proposal2022Pda)], null)
      .accounts({
        dao: dao2022Pda,
        proposal: proposal2022Pda,
        voterRecord: vote2022Pda,
        delegationMarker: delegation2022Marker,
        voterTokenAccount: voter2022Ata,
        voter: voter2022.publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([voter2022])
      .rpc();

    const committed = await program.account["proposal"].fetch(proposal2022Pda);
    assert.equal(committed.commitCount.toString(), "1");
    console.log("  ✓ Token-2022 governance mint accepted by DAO and commit flow");
  });

  it("configures and executes a confidential salary payout plan", async () => {
    const payoutDaoName = uniqueDaoName("Payroll");
    const [payoutDaoPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dao"), authority.publicKey.toBuffer(), Buffer.from(payoutDaoName)],
      program.programId,
    );

    await program.methods
      .initializeDao(
        payoutDaoName,
        51,
        new BN(0),
        new BN(45),
        new BN(0),
        { tokenWeighted: {} },
      )
      .accounts({
        dao: payoutDaoPda,
        governanceToken: governanceMint,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const payoutDao = await program.account["dao"].fetch(payoutDaoPda);
    const [payoutProposalPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), payoutDaoPda.toBuffer(), payoutDao.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );

    await program.methods
      .createProposal(
        "Confidential salary batch",
        "Approve an encrypted salary batch without exposing the employee mapping on-chain.",
        new BN(30),
        null,
      )
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        proposerTokenAccount: authorityTokenAta,
        proposer: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const [payoutPlanPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("payout-plan"), payoutProposalPda.toBuffer()],
      program.programId,
    );
    const [refheEnvelopePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("refhe-envelope"), payoutProposalPda.toBuffer()],
      program.programId,
    );
    const settlementRecipient = Keypair.generate();
    const fundSettlementRecipient = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: authority.publicKey,
        toPubkey: settlementRecipient.publicKey,
        lamports: Math.round(0.005 * LAMPORTS_PER_SOL),
      }),
    );
    await provider.sendAndConfirm(fundSettlementRecipient, []);

    const payoutCiphertextHash = [...crypto.randomBytes(32)];
    await program.methods
      .configureConfidentialPayoutPlan(
        { salary: {} },
        { sol: {} },
        settlementRecipient.publicKey,
        null,
        3,
        new BN(50_000_000),
        "box://privatedao/payroll/epoch-1",
        [...crypto.randomBytes(32)],
        payoutCiphertextHash,
      )
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        confidentialPayoutPlan: payoutPlanPda,
        operator: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const plan = await program.account["confidentialPayoutPlan"].fetch(payoutPlanPda);
    assert.deepEqual(plan.payoutType, { salary: {} });
    assert.deepEqual(plan.assetType, { sol: {} });
    assert.equal(plan.recipientCount, 3);
    assert.equal(plan.totalAmount.toString(), "50000000");

    await program.methods
      .configureRefheEnvelope(
        "box://privatedao/refhe/payroll-eval-epoch-1",
        [...crypto.randomBytes(32)],
        payoutCiphertextHash,
        [...crypto.randomBytes(32)],
      )
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        confidentialPayoutPlan: payoutPlanPda,
        refheEnvelope: refheEnvelopePda,
        operator: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const refheEnvelope = await program.account["refheEnvelope"].fetch(refheEnvelopePda);
    assert.equal(refheEnvelope.modelUri, "box://privatedao/refhe/payroll-eval-epoch-1");
    assert.deepEqual(refheEnvelope.status, { configured: {} });

    const [treasuryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury"), payoutDaoPda.toBuffer()],
      program.programId,
    );
    await program.methods
      .depositTreasury(new BN(100_000_000))
      .accounts({
        dao: payoutDaoPda,
        treasury: treasuryPda,
        depositor: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const [votePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), payoutProposalPda.toBuffer(), authority.publicKey.toBuffer()],
      program.programId,
    );
    const [delegationMarkerPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("delegation"), payoutProposalPda.toBuffer(), authority.publicKey.toBuffer()],
      program.programId,
    );
    const salarySalt = randomSalt();

    await program.methods
      .commitVote([...computeCommitment(true, salarySalt, authority.publicKey, payoutProposalPda)], null)
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        voterRecord: votePda,
        delegationMarker: delegationMarkerPda,
        voterTokenAccount: authorityTokenAta,
        voter: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await new Promise((resolve) => setTimeout(resolve, 31_000));

    await program.methods
      .revealVote(true, [...salarySalt])
      .accounts({
        proposal: payoutProposalPda,
        voterRecord: votePda,
        revealer: authority.publicKey,
      })
      .rpc();

    await new Promise((resolve) => setTimeout(resolve, 46_000));

    await program.methods
      .finalizeProposal()
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        finalizer: authority.publicKey,
      })
      .rpc();

    const passedProposal = await program.account["proposal"].fetch(payoutProposalPda);
    assert.deepEqual(passedProposal.status, { passed: {} });

    const treasuryBefore = await provider.connection.getBalance(treasuryPda);
    const recipientBefore = await provider.connection.getBalance(settlementRecipient.publicKey);

    try {
      await program.methods
        .executeProposal()
        .accounts({
          dao: payoutDaoPda,
          proposal: payoutProposalPda,
          treasury: treasuryPda,
          treasuryRecipient: settlementRecipient.publicKey,
          treasuryTokenAccount: treasuryPda,
          recipientTokenAccount: treasuryPda,
          confidentialPayoutPlan: payoutPlanPda,
          executor: authority.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("Standard execute path should reject confidential payout proposals");
    } catch (err: any) {
      assert.include(err.toString(), "UseConfidentialPayoutExecution");
    }

    try {
      await program.methods
        .executeConfidentialPayoutPlan()
        .accounts({
          dao: payoutDaoPda,
          proposal: payoutProposalPda,
          confidentialPayoutPlan: payoutPlanPda,
          treasury: treasuryPda,
          settlementRecipient: settlementRecipient.publicKey,
          treasuryTokenAccount: treasuryPda,
          recipientTokenAccount: treasuryPda,
          refheEnvelope: refheEnvelopePda,
          executor: authority.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("REFHE-bound payout should require a settled envelope");
    } catch (err: any) {
      assert.include(err.toString(), "RefheSettlementRequired");
    }

    await program.methods
      .settleRefheEnvelope(
        [...crypto.randomBytes(32)],
        [...crypto.randomBytes(32)],
        [...crypto.randomBytes(32)],
        program.programId,
      )
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        confidentialPayoutPlan: payoutPlanPda,
        refheEnvelope: refheEnvelopePda,
        operator: authority.publicKey,
      })
      .rpc();

    await program.methods
      .executeConfidentialPayoutPlan()
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        confidentialPayoutPlan: payoutPlanPda,
        treasury: treasuryPda,
        settlementRecipient: settlementRecipient.publicKey,
        treasuryTokenAccount: treasuryPda,
        recipientTokenAccount: treasuryPda,
        refheEnvelope: refheEnvelopePda,
        executor: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const treasuryAfter = await provider.connection.getBalance(treasuryPda);
    const recipientAfter = await provider.connection.getBalance(settlementRecipient.publicKey);
    const executedPlan = await program.account["confidentialPayoutPlan"].fetch(payoutPlanPda);
    const settledRefheEnvelope = await program.account["refheEnvelope"].fetch(refheEnvelopePda);
    const executedProposal = await program.account["proposal"].fetch(payoutProposalPda);
    assert.equal(treasuryBefore - treasuryAfter, 50_000_000);
    assert.equal(recipientAfter - recipientBefore, 50_000_000);
    assert.deepEqual(executedPlan.status, { funded: {} });
    assert.deepEqual(settledRefheEnvelope.status, { settled: {} });
    assert.isTrue(executedProposal.isExecuted);
    console.log("  ✓ confidential salary batch configured and executed through REFHE-gated settlement");
  });

  it("configures and executes a confidential token payout plan through a MagicBlock corridor", async () => {
    const payoutDaoName = uniqueDaoName("MBPay");
    const [payoutDaoPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dao"), authority.publicKey.toBuffer(), Buffer.from(payoutDaoName)],
      program.programId,
    );

    await program.methods
      .initializeDao(
        payoutDaoName,
        51,
        new BN(0),
        new BN(45),
        new BN(0),
        { tokenWeighted: {} },
      )
      .accounts({
        dao: payoutDaoPda,
        governanceToken: governanceMint,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const payoutDao = await program.account["dao"].fetch(payoutDaoPda);
    const [payoutProposalPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), payoutDaoPda.toBuffer(), payoutDao.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );

    await program.methods
      .createProposal(
        "Confidential bonus corridor",
        "Approve an encrypted token bonus batch routed through a MagicBlock private payment corridor.",
        new BN(30),
        null,
      )
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        proposerTokenAccount: authorityTokenAta,
        proposer: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const [payoutPlanPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("payout-plan"), payoutProposalPda.toBuffer()],
      program.programId,
    );
    const [refheEnvelopePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("refhe-envelope"), payoutProposalPda.toBuffer()],
      program.programId,
    );
    const [magicBlockCorridorPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("magicblock-corridor"), payoutProposalPda.toBuffer()],
      program.programId,
    );
    const settlementRecipient = Keypair.generate();
    await provider.sendAndConfirm(new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: authority.publicKey,
        toPubkey: settlementRecipient.publicKey,
        lamports: Math.round(0.005 * LAMPORTS_PER_SOL),
      }),
    ), []);

    const payoutCiphertextHash = [...crypto.randomBytes(32)];
    await program.methods
      .configureConfidentialPayoutPlan(
        { bonus: {} },
        { token: {} },
        settlementRecipient.publicKey,
        governanceMint,
        2,
        new BN(250_000_000),
        "box://privatedao/payroll/bonus-epoch-1",
        [...crypto.randomBytes(32)],
        payoutCiphertextHash,
      )
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        confidentialPayoutPlan: payoutPlanPda,
        operator: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const routeHash = [...crypto.randomBytes(32)];
    await program.methods
      .configureMagicblockPrivatePaymentCorridor(
        "https://payments.magicblock.app",
        "devnet",
        authority.publicKey,
        settlementRecipient.publicKey,
        routeHash,
        new BN(250_000_000),
        new BN(250_000_000),
        new BN(250_000_000),
      )
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        confidentialPayoutPlan: payoutPlanPda,
        magicblockPrivatePaymentCorridor: magicBlockCorridorPda,
        operator: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const corridor = await program.account["magicBlockPrivatePaymentCorridor"].fetch(magicBlockCorridorPda);
    assert.equal(corridor.apiBaseUrl, "https://payments.magicblock.app");
    assert.deepEqual(corridor.status, { configured: {} });

    const [treasuryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury"), payoutDaoPda.toBuffer()],
      program.programId,
    );
    const treasuryAta = getAssociatedTokenAddressSync(governanceMint, treasuryPda, true);
    const recipientAta = getAssociatedTokenAddressSync(governanceMint, settlementRecipient.publicKey);
    await provider.sendAndConfirm(new Transaction().add(
      createAssociatedTokenAccountInstruction(
        authority.publicKey,
        treasuryAta,
        treasuryPda,
        governanceMint,
      ),
      createAssociatedTokenAccountInstruction(
        authority.publicKey,
        recipientAta,
        settlementRecipient.publicKey,
        governanceMint,
      ),
    ), []);
    await mintTo(provider.connection, authority.payer, governanceMint, treasuryAta, authority.payer, 300_000_000n);

    const [votePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), payoutProposalPda.toBuffer(), authority.publicKey.toBuffer()],
      program.programId,
    );
    const [delegationMarkerPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("delegation"), payoutProposalPda.toBuffer(), authority.publicKey.toBuffer()],
      program.programId,
    );
    const bonusSalt = randomSalt();

    await program.methods
      .commitVote([...computeCommitment(true, bonusSalt, authority.publicKey, payoutProposalPda)], null)
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        voterRecord: votePda,
        delegationMarker: delegationMarkerPda,
        voterTokenAccount: authorityTokenAta,
        voter: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await new Promise((resolve) => setTimeout(resolve, 31_000));

    await program.methods
      .revealVote(true, [...bonusSalt])
      .accounts({
        proposal: payoutProposalPda,
        voterRecord: votePda,
        revealer: authority.publicKey,
      })
      .rpc();

    await new Promise((resolve) => setTimeout(resolve, 46_000));

    await program.methods
      .finalizeProposal()
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        finalizer: authority.publicKey,
      })
      .rpc();

    try {
      await program.methods
        .executeConfidentialPayoutPlan()
        .accounts({
          dao: payoutDaoPda,
          proposal: payoutProposalPda,
          confidentialPayoutPlan: payoutPlanPda,
          treasury: treasuryPda,
          settlementRecipient: settlementRecipient.publicKey,
          treasuryTokenAccount: treasuryAta,
          recipientTokenAccount: recipientAta,
          refheEnvelope: refheEnvelopePda,
          magicblockPrivatePaymentCorridor: magicBlockCorridorPda,
          executor: authority.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("MagicBlock-bound payout should require corridor settlement");
    } catch (err: any) {
      assert.include(err.toString(), "MagicBlockSettlementRequired");
    }

    await program.methods
      .settleMagicblockPrivatePaymentCorridor(
        authority.publicKey,
        Keypair.generate().publicKey,
        "4J3YVTFs2Y5zZp5x6b7mQk2u1oD9c8N7e6w5r4t3s2q1p0LmNoPkJiHgFeDcBa987654321111111111",
        "2qwYfTQ3h1x5b8c6d7e9fLmNoPkJiHgFeDcBa987654321111111111111111111111111111111111111",
        "5mN9vB6xC3zA1sD2fG4hJ6kL8qW0eR2tY4uI6oP8aS0dF2gH4jK6lN8mQ0rT2yU4iO6pA8sD0fG2hJ4kL",
      )
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        confidentialPayoutPlan: payoutPlanPda,
        magicblockPrivatePaymentCorridor: magicBlockCorridorPda,
        operator: authority.publicKey,
      })
      .rpc();

    const recipientBefore = await provider.connection.getTokenAccountBalance(recipientAta);
    await program.methods
      .executeConfidentialPayoutPlan()
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        confidentialPayoutPlan: payoutPlanPda,
        treasury: treasuryPda,
        settlementRecipient: settlementRecipient.publicKey,
        treasuryTokenAccount: treasuryAta,
        recipientTokenAccount: recipientAta,
        refheEnvelope: refheEnvelopePda,
        magicblockPrivatePaymentCorridor: magicBlockCorridorPda,
        executor: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const recipientAfter = await provider.connection.getTokenAccountBalance(recipientAta);
    const executedPlan = await program.account["confidentialPayoutPlan"].fetch(payoutPlanPda);
    const settledCorridor = await program.account["magicBlockPrivatePaymentCorridor"].fetch(magicBlockCorridorPda);
    const executedProposal = await program.account["proposal"].fetch(payoutProposalPda);
    assert.equal(Number(recipientAfter.value.amount) - Number(recipientBefore.value.amount), 250_000_000);
    assert.deepEqual(executedPlan.status, { funded: {} });
    assert.deepEqual(settledCorridor.status, { settled: {} });
    assert.isTrue(executedProposal.isExecuted);
    console.log("  ✓ confidential token batch configured and executed through MagicBlock-settled corridor");
  });

  it("enforces MagicBlock operator authority and settlement signature validation", async () => {
    const payoutDaoName = uniqueDaoName("MBGuard");
    const [payoutDaoPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dao"), authority.publicKey.toBuffer(), Buffer.from(payoutDaoName)],
      program.programId,
    );

    await program.methods
      .initializeDao(
        payoutDaoName,
        51,
        new BN(0),
        new BN(45),
        new BN(0),
        { tokenWeighted: {} },
      )
      .accounts({
        dao: payoutDaoPda,
        governanceToken: governanceMint,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const payoutDao = await program.account["dao"].fetch(payoutDaoPda);
    const [payoutProposalPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), payoutDaoPda.toBuffer(), payoutDao.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );

    await program.methods
      .createProposal(
        "MagicBlock operator guard",
        "Reject untrusted MagicBlock operators and malformed settlement evidence before a confidential payout can execute.",
        new BN(5),
        null,
      )
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        proposerTokenAccount: authorityTokenAta,
        proposer: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const [payoutPlanPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("payout-plan"), payoutProposalPda.toBuffer()],
      program.programId,
    );
    const [magicBlockCorridorPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("magicblock-corridor"), payoutProposalPda.toBuffer()],
      program.programId,
    );
    const settlementRecipient = Keypair.generate();
    const rogueOperator = Keypair.generate();
    await provider.sendAndConfirm(new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: authority.publicKey,
        toPubkey: settlementRecipient.publicKey,
        lamports: Math.round(0.005 * LAMPORTS_PER_SOL),
      }),
      SystemProgram.transfer({
        fromPubkey: authority.publicKey,
        toPubkey: rogueOperator.publicKey,
        lamports: Math.round(0.01 * LAMPORTS_PER_SOL),
      }),
    ), []);

    await program.methods
      .configureConfidentialPayoutPlan(
        { bonus: {} },
        { token: {} },
        settlementRecipient.publicKey,
        governanceMint,
        3,
        new BN(180_000_000),
        "box://privatedao/payroll/guard-epoch-1",
        [...crypto.randomBytes(32)],
        [...crypto.randomBytes(32)],
      )
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        confidentialPayoutPlan: payoutPlanPda,
        operator: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const routeHash = [...crypto.randomBytes(32)];
    try {
      await program.methods
        .configureMagicblockPrivatePaymentCorridor(
          "https://payments.magicblock.app",
          "devnet",
          rogueOperator.publicKey,
          null,
          routeHash,
          new BN(180_000_000),
          new BN(180_000_000),
          new BN(180_000_000),
        )
        .accounts({
          dao: payoutDaoPda,
          proposal: payoutProposalPda,
          confidentialPayoutPlan: payoutPlanPda,
          magicblockPrivatePaymentCorridor: magicBlockCorridorPda,
          operator: rogueOperator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([rogueOperator])
        .rpc();
      assert.fail("Untrusted operators must not configure MagicBlock corridors");
    } catch (err: any) {
      assert.include(err.toString(), "UnauthorizedMagicBlockOperator");
    }

    await program.methods
      .configureMagicblockPrivatePaymentCorridor(
        "https://payments.magicblock.app",
        "devnet",
        authority.publicKey,
        null,
        routeHash,
        new BN(180_000_000),
        new BN(180_000_000),
        new BN(180_000_000),
      )
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        confidentialPayoutPlan: payoutPlanPda,
        magicblockPrivatePaymentCorridor: magicBlockCorridorPda,
        operator: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    try {
      await program.methods
        .settleMagicblockPrivatePaymentCorridor(
          PublicKey.default,
          Keypair.generate().publicKey,
          "short",
          "still-too-short",
          "another-bad-signature",
        )
        .accounts({
          dao: payoutDaoPda,
          proposal: payoutProposalPda,
          confidentialPayoutPlan: payoutPlanPda,
          magicblockPrivatePaymentCorridor: magicBlockCorridorPda,
          operator: authority.publicKey,
        })
        .rpc();
      assert.fail("Malformed MagicBlock settlement signatures must be rejected");
    } catch (err: any) {
      assert.include(err.toString(), "InvalidMagicBlockCorridor");
    }

    try {
      await program.methods
        .settleMagicblockPrivatePaymentCorridor(
          authority.publicKey,
          Keypair.generate().publicKey,
          "4J3YVTFs2Y5zZp5x6b7mQk2u1oD9c8N7e6w5r4t3s2q1p0LmNoPkJiHgFeDcBa987654321111111111",
          "2qwYfTQ3h1x5b8c6d7e9fLmNoPkJiHgFeDcBa987654321111111111111111111111111111111111111",
          "5mN9vB6xC3zA1sD2fG4hJ6kL8qW0eR2tY4uI6oP8aS0dF2gH4jK6lN8mQ0rT2yU4iO6pA8sD0fG2hJ4kL",
        )
        .accounts({
          dao: payoutDaoPda,
          proposal: payoutProposalPda,
          confidentialPayoutPlan: payoutPlanPda,
          magicblockPrivatePaymentCorridor: magicBlockCorridorPda,
          operator: rogueOperator.publicKey,
        })
        .signers([rogueOperator])
        .rpc();
      assert.fail("Untrusted operators must not settle MagicBlock corridors");
    } catch (err: any) {
      assert.include(err.toString(), "UnauthorizedMagicBlockOperator");
    }

    await program.methods
      .settleMagicblockPrivatePaymentCorridor(
        authority.publicKey,
        Keypair.generate().publicKey,
        "4J3YVTFs2Y5zZp5x6b7mQk2u1oD9c8N7e6w5r4t3s2q1p0LmNoPkJiHgFeDcBa987654321111111111",
        "2qwYfTQ3h1x5b8c6d7e9fLmNoPkJiHgFeDcBa987654321111111111111111111111111111111111111",
        "5mN9vB6xC3zA1sD2fG4hJ6kL8qW0eR2tY4uI6oP8aS0dF2gH4jK6lN8mQ0rT2yU4iO6pA8sD0fG2hJ4kL",
      )
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        confidentialPayoutPlan: payoutPlanPda,
        magicblockPrivatePaymentCorridor: magicBlockCorridorPda,
        operator: authority.publicKey,
      })
      .rpc();

    const settledCorridor = await program.account["magicBlockPrivatePaymentCorridor"].fetch(magicBlockCorridorPda);
    assert.deepEqual(settledCorridor.status, { settled: {} });
    assert.equal(settledCorridor.settledBy.toBase58(), authority.publicKey.toBase58());
    console.log("  ✓ MagicBlock corridor rejects rogue operators and malformed settlement evidence");
  });

  it("rejects confidential payout replay after MagicBlock-settled execution", async () => {
    const payoutDaoName = uniqueDaoName("MBReplay");
    const [payoutDaoPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dao"), authority.publicKey.toBuffer(), Buffer.from(payoutDaoName)],
      program.programId,
    );

    await program.methods
      .initializeDao(
        payoutDaoName,
        51,
        new BN(0),
        new BN(45),
        new BN(0),
        { tokenWeighted: {} },
      )
      .accounts({
        dao: payoutDaoPda,
        governanceToken: governanceMint,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const payoutDao = await program.account["dao"].fetch(payoutDaoPda);
    const [payoutProposalPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), payoutDaoPda.toBuffer(), payoutDao.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );

    await program.methods
      .createProposal(
        "Confidential payroll replay guard",
        "Reject replay execution after a MagicBlock-settled confidential token payout succeeds.",
        new BN(30),
        null,
      )
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        proposerTokenAccount: authorityTokenAta,
        proposer: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const [payoutPlanPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("payout-plan"), payoutProposalPda.toBuffer()],
      program.programId,
    );
    const [refheEnvelopePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("refhe-envelope"), payoutProposalPda.toBuffer()],
      program.programId,
    );
    const [magicBlockCorridorPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("magicblock-corridor"), payoutProposalPda.toBuffer()],
      program.programId,
    );
    const settlementRecipient = Keypair.generate();
    const wrongSettlementRecipient = Keypair.generate();
    await provider.sendAndConfirm(new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: authority.publicKey,
        toPubkey: settlementRecipient.publicKey,
        lamports: Math.round(0.005 * LAMPORTS_PER_SOL),
      }),
      SystemProgram.transfer({
        fromPubkey: authority.publicKey,
        toPubkey: wrongSettlementRecipient.publicKey,
        lamports: Math.round(0.005 * LAMPORTS_PER_SOL),
      }),
    ), []);

    await program.methods
      .configureConfidentialPayoutPlan(
        { bonus: {} },
        { token: {} },
        settlementRecipient.publicKey,
        governanceMint,
        2,
        new BN(220_000_000),
        "box://privatedao/payroll/replay-epoch-1",
        [...crypto.randomBytes(32)],
        [...crypto.randomBytes(32)],
      )
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        confidentialPayoutPlan: payoutPlanPda,
        operator: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .configureMagicblockPrivatePaymentCorridor(
        "https://payments.magicblock.app",
        "devnet",
        authority.publicKey,
        null,
        [...crypto.randomBytes(32)],
        new BN(220_000_000),
        new BN(220_000_000),
        new BN(220_000_000),
      )
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        confidentialPayoutPlan: payoutPlanPda,
        magicblockPrivatePaymentCorridor: magicBlockCorridorPda,
        operator: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const [treasuryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury"), payoutDaoPda.toBuffer()],
      program.programId,
    );
    const treasuryAta = getAssociatedTokenAddressSync(governanceMint, treasuryPda, true);
    const recipientAta = getAssociatedTokenAddressSync(governanceMint, settlementRecipient.publicKey);
    const wrongRecipientAta = getAssociatedTokenAddressSync(governanceMint, wrongSettlementRecipient.publicKey);
    await provider.sendAndConfirm(new Transaction().add(
      createAssociatedTokenAccountInstruction(authority.publicKey, treasuryAta, treasuryPda, governanceMint),
      createAssociatedTokenAccountInstruction(authority.publicKey, recipientAta, settlementRecipient.publicKey, governanceMint),
      createAssociatedTokenAccountInstruction(authority.publicKey, wrongRecipientAta, wrongSettlementRecipient.publicKey, governanceMint),
    ), []);
    await mintTo(provider.connection, authority.payer, governanceMint, treasuryAta, authority.payer, 260_000_000n);

    const [votePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), payoutProposalPda.toBuffer(), authority.publicKey.toBuffer()],
      program.programId,
    );
    const [delegationMarkerPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("delegation"), payoutProposalPda.toBuffer(), authority.publicKey.toBuffer()],
      program.programId,
    );
    const salarySalt = randomSalt();

    await program.methods
      .commitVote([...computeCommitment(true, salarySalt, authority.publicKey, payoutProposalPda)], null)
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        voterRecord: votePda,
        delegationMarker: delegationMarkerPda,
        voterTokenAccount: authorityTokenAta,
        voter: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await new Promise((resolve) => setTimeout(resolve, 31_000));

    await program.methods
      .revealVote(true, [...salarySalt])
      .accounts({
        proposal: payoutProposalPda,
        voterRecord: votePda,
        revealer: authority.publicKey,
      })
      .rpc();

    await new Promise((resolve) => setTimeout(resolve, 46_000));

    await program.methods
      .finalizeProposal()
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        finalizer: authority.publicKey,
      })
      .rpc();

    await program.methods
      .settleMagicblockPrivatePaymentCorridor(
        authority.publicKey,
        Keypair.generate().publicKey,
        "4J3YVTFs2Y5zZp5x6b7mQk2u1oD9c8N7e6w5r4t3s2q1p0LmNoPkJiHgFeDcBa987654321111111111",
        "2qwYfTQ3h1x5b8c6d7e9fLmNoPkJiHgFeDcBa987654321111111111111111111111111111111111111",
        "5mN9vB6xC3zA1sD2fG4hJ6kL8qW0eR2tY4uI6oP8aS0dF2gH4jK6lN8mQ0rT2yU4iO6pA8sD0fG2hJ4kL",
      )
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        confidentialPayoutPlan: payoutPlanPda,
        magicblockPrivatePaymentCorridor: magicBlockCorridorPda,
        operator: authority.publicKey,
      })
      .rpc();

    try {
      await program.methods
        .executeConfidentialPayoutPlan()
        .accounts({
          dao: payoutDaoPda,
          proposal: payoutProposalPda,
          confidentialPayoutPlan: payoutPlanPda,
          treasury: treasuryPda,
          settlementRecipient: wrongSettlementRecipient.publicKey,
          treasuryTokenAccount: treasuryAta,
          recipientTokenAccount: wrongRecipientAta,
          refheEnvelope: refheEnvelopePda,
          magicblockPrivatePaymentCorridor: magicBlockCorridorPda,
          executor: authority.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("Execution must reject the wrong settlement recipient");
    } catch (err: any) {
      assert.include(err.toString(), "TreasuryRecipientMismatch");
    }

    await program.methods
      .executeConfidentialPayoutPlan()
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        confidentialPayoutPlan: payoutPlanPda,
        treasury: treasuryPda,
        settlementRecipient: settlementRecipient.publicKey,
        treasuryTokenAccount: treasuryAta,
        recipientTokenAccount: recipientAta,
        refheEnvelope: refheEnvelopePda,
        magicblockPrivatePaymentCorridor: magicBlockCorridorPda,
        executor: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    try {
      await program.methods
        .executeConfidentialPayoutPlan()
        .accounts({
          dao: payoutDaoPda,
          proposal: payoutProposalPda,
          confidentialPayoutPlan: payoutPlanPda,
          treasury: treasuryPda,
          settlementRecipient: settlementRecipient.publicKey,
          treasuryTokenAccount: treasuryAta,
          recipientTokenAccount: recipientAta,
          refheEnvelope: refheEnvelopePda,
          magicblockPrivatePaymentCorridor: magicBlockCorridorPda,
          executor: authority.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("A funded confidential payout must not execute twice");
    } catch (err: any) {
      assert.include(err.toString(), "AlreadyExecuted");
    }

    console.log("  ✓ MagicBlock-bound confidential payout rejects wrong settlement recipients and replay execution");
  });

  it("rejects standard execute_proposal before the execution timelock expires", async () => {
    const scenario = await createStandardExecutionScenario(5);

    try {
      await program.methods
        .executeProposal()
        .accounts({
          dao: scenario.daoPda,
          proposal: scenario.proposalPda,
          treasury: scenario.treasuryPda,
          treasuryRecipient: scenario.recipient.publicKey,
          treasuryTokenAccount: scenario.treasuryPda,
          recipientTokenAccount: scenario.treasuryPda,
          confidentialPayoutPlan: PublicKey.findProgramAddressSync(
            [Buffer.from("payout-plan"), scenario.proposalPda.toBuffer()],
            program.programId,
          )[0],
          executor: authority.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("Should have rejected standard execute while timelock is still active");
    } catch (err: any) {
      assert.include(err.toString(), "ExecutionTimelockActive");
      console.log("  ✓ execute before execution_unlocks_at rejected");
    }
  });

  it("rejects wrong recipients and duplicate standard execute_proposal calls", async () => {
    const scenario = await createStandardExecutionScenario(2);
    await waitUntilUnix(scenario.finalized.executionUnlocksAt);

    const wrongRecipient = Keypair.generate();
    await provider.sendAndConfirm(
      new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: authority.publicKey,
          toPubkey: wrongRecipient.publicKey,
          lamports: Math.round(0.002 * LAMPORTS_PER_SOL),
        }),
      ),
      [],
    );

    try {
      await program.methods
        .executeProposal()
        .accounts({
          dao: scenario.daoPda,
          proposal: scenario.proposalPda,
          treasury: scenario.treasuryPda,
          treasuryRecipient: wrongRecipient.publicKey,
          treasuryTokenAccount: scenario.treasuryPda,
          recipientTokenAccount: scenario.treasuryPda,
          confidentialPayoutPlan: PublicKey.findProgramAddressSync(
            [Buffer.from("payout-plan"), scenario.proposalPda.toBuffer()],
            program.programId,
          )[0],
          executor: authority.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("Should have rejected standard execute with the wrong recipient");
    } catch (err: any) {
      assert.include(err.toString(), "TreasuryRecipientMismatch");
    }

    const treasuryBefore = await provider.connection.getBalance(scenario.treasuryPda);
    const recipientBefore = await provider.connection.getBalance(scenario.recipient.publicKey);

    await program.methods
      .executeProposal()
      .accounts({
        dao: scenario.daoPda,
        proposal: scenario.proposalPda,
        treasury: scenario.treasuryPda,
        treasuryRecipient: scenario.recipient.publicKey,
        treasuryTokenAccount: scenario.treasuryPda,
        recipientTokenAccount: scenario.treasuryPda,
        confidentialPayoutPlan: PublicKey.findProgramAddressSync(
          [Buffer.from("payout-plan"), scenario.proposalPda.toBuffer()],
          program.programId,
        )[0],
        executor: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const treasuryAfter = await provider.connection.getBalance(scenario.treasuryPda);
    const recipientAfter = await provider.connection.getBalance(scenario.recipient.publicKey);
    assert.equal(treasuryBefore - treasuryAfter, 5_000_000);
    assert.equal(recipientAfter - recipientBefore, 5_000_000);

    try {
      await program.methods
        .executeProposal()
        .accounts({
          dao: scenario.daoPda,
          proposal: scenario.proposalPda,
          treasury: scenario.treasuryPda,
          treasuryRecipient: scenario.recipient.publicKey,
          treasuryTokenAccount: scenario.treasuryPda,
          recipientTokenAccount: scenario.treasuryPda,
          confidentialPayoutPlan: PublicKey.findProgramAddressSync(
            [Buffer.from("payout-plan"), scenario.proposalPda.toBuffer()],
            program.programId,
          )[0],
          executor: authority.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("A standard proposal must not execute twice");
    } catch (err: any) {
      assert.include(err.toString(), "AlreadyExecuted");
      console.log("  ✓ standard execute rejects wrong recipient and replay");
    }
  });

  it("verifies commitment math — deterministic + vote/salt sensitive", () => {
    const vote = true;
    const salt = Buffer.from("a".repeat(32));
    const key  = Keypair.generate().publicKey;

    const proposal = Keypair.generate().publicKey;
    const otherProposal = Keypair.generate().publicKey;
    const c1 = computeCommitment(vote, salt, key, proposal);
    const c2 = computeCommitment(vote, salt, key, proposal);
    const c3 = computeCommitment(false, salt, key, proposal);
    const c4 = computeCommitment(vote, Buffer.from("b".repeat(32)), key, proposal);
    const c5 = computeCommitment(vote, salt, key, otherProposal);

    assert.deepEqual(c1, c2,    "same inputs → same commitment");
    assert.notDeepEqual(c1, c3, "different vote → different commitment");
    assert.notDeepEqual(c1, c4, "different salt → different commitment");
    assert.notDeepEqual(c1, c5, "different proposal → different commitment");
    console.log("  ✓ commitment: deterministic, vote-sensitive, salt-sensitive");
  });

  it("enforces V2 proof policy snapshots and rejects payload substitution", async () => {
    const [securityPolicyPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dao-security-policy"), daoPda.toBuffer()],
      program.programId,
    );
    const attestors = [
      authority.publicKey,
      PublicKey.default,
      PublicKey.default,
      PublicKey.default,
      PublicKey.default,
    ];

    await program.methods
      .initializeDaoSecurityPolicy(
        { strictRequired: {} },
        { thresholdAttestedRequired: {} },
        { thresholdAttestedRequired: {} },
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
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const dao = await program.account["dao"].fetch(daoPda);
    const [v2ProposalPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), daoPda.toBuffer(), dao.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );

    await program.methods
      .createProposal(
        "V2 proof substitution guard",
        "Strict path must bind proof verification to the exact canonical payload.",
        new BN(3600),
        null,
      )
      .accounts({
        dao: daoPda,
        proposal: v2ProposalPda,
        proposerTokenAccount: authorityTokenAta,
        proposer: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const [snapshotPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal-policy-snapshot"), v2ProposalPda.toBuffer()],
      program.programId,
    );
    await program.methods
      .snapshotProposalExecutionPolicy()
      .accounts({
        dao: daoPda,
        daoSecurityPolicy: securityPolicyPda,
        proposal: v2ProposalPda,
        proposalExecutionPolicySnapshot: snapshotPda,
        operator: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .initializeDaoSecurityPolicy(
        { strictRequired: {} },
        { thresholdAttestedRequired: {} },
        { thresholdAttestedRequired: {} },
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
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .updateDaoSecurityPolicyV2(
        { strictRequired: {} },
        { strictRequired: {} },
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
        authority: authority.publicKey,
      })
      .rpc();

    try {
      await program.methods
        .snapshotProposalExecutionPolicy()
        .accounts({
          dao: daoPda,
          daoSecurityPolicy: securityPolicyPda,
          proposal: v2ProposalPda,
          proposalExecutionPolicySnapshot: snapshotPda,
          operator: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("A recorded proposal policy snapshot must not be reinterpreted after DAO policy changes");
    } catch (err: any) {
      assert.include(err.toString(), "PolicySnapshotAlreadyRecorded");
    }

    const [proofVerificationPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal-proof-verification"), v2ProposalPda.toBuffer()],
      program.programId,
    );
    const wrongPayload = hashParts([
      Buffer.from("PrivateDAO::proof-payload:v1"),
      daoPda.toBuffer(),
      Keypair.generate().publicKey.toBuffer(),
      Buffer.from([2]),
    ]);

    await program.methods
      .recordProofVerificationV2(
        { thresholdAttestation: {} },
        [...wrongPayload],
        [...crypto.randomBytes(32)],
        [...crypto.randomBytes(32)],
        [...crypto.randomBytes(32)],
        [...canonicalProofDomain(daoPda, v2ProposalPda)],
      )
      .accounts({
        dao: daoPda,
        daoSecurityPolicy: securityPolicyPda,
        proposal: v2ProposalPda,
        proposalProofVerification: proofVerificationPda,
        recorder: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    try {
      await program.methods
        .finalizeZkEnforcedProposalV2()
        .accounts({
          dao: daoPda,
          proposal: v2ProposalPda,
          proposalExecutionPolicySnapshot: snapshotPda,
          proposalProofVerification: proofVerificationPda,
          finalizer: authority.publicKey,
        })
        .rpc();
      assert.fail("V2 finalize must reject proof records bound to a different payload");
    } catch (err: any) {
      assert.include(err.toString(), "PayloadHashMismatch");
    }

    try {
      await program.methods
        .recordProofVerificationV2(
          { thresholdAttestation: {} },
          [...canonicalProposalPayloadHash(daoPda, v2ProposalPda)],
          [...crypto.randomBytes(32)],
          [...crypto.randomBytes(32)],
          [...crypto.randomBytes(32)],
          [...canonicalProofDomain(daoPda, v2ProposalPda)],
        )
        .accounts({
          dao: daoPda,
          daoSecurityPolicy: securityPolicyPda,
          proposal: v2ProposalPda,
          proposalProofVerification: proofVerificationPda,
          recorder: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("A strict proof verification PDA must not be overwritten with a different payload");
    } catch (err: any) {
      assert.include(err.toString(), "ProofVerificationAlreadyRecorded");
    }

    const daoAfterWrongProof = await program.account["dao"].fetch(daoPda);
    const [v2GoodProposalPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), daoPda.toBuffer(), daoAfterWrongProof.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );
    await program.methods
      .createProposal(
        "V2 proof positive guard",
        "Correct proof payload should clear strict proof checks and still respect lifecycle timing.",
        new BN(3600),
        null,
      )
      .accounts({
        dao: daoPda,
        proposal: v2GoodProposalPda,
        proposerTokenAccount: authorityTokenAta,
        proposer: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const [goodSnapshotPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal-policy-snapshot"), v2GoodProposalPda.toBuffer()],
      program.programId,
    );
    await program.methods
      .snapshotProposalExecutionPolicy()
      .accounts({
        dao: daoPda,
        daoSecurityPolicy: securityPolicyPda,
        proposal: v2GoodProposalPda,
        proposalExecutionPolicySnapshot: goodSnapshotPda,
        operator: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const [goodProofVerificationPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal-proof-verification"), v2GoodProposalPda.toBuffer()],
      program.programId,
    );
    await program.methods
      .recordProofVerificationV2(
        { thresholdAttestation: {} },
        [...canonicalProposalPayloadHash(daoPda, v2GoodProposalPda)],
        [...crypto.randomBytes(32)],
        [...crypto.randomBytes(32)],
        [...crypto.randomBytes(32)],
        [...canonicalProofDomain(daoPda, v2GoodProposalPda)],
      )
      .accounts({
        dao: daoPda,
        daoSecurityPolicy: securityPolicyPda,
        proposal: v2GoodProposalPda,
        proposalProofVerification: goodProofVerificationPda,
        recorder: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    try {
      await program.methods
        .finalizeZkEnforcedProposalV2()
        .accounts({
          dao: daoPda,
          proposal: v2GoodProposalPda,
          proposalExecutionPolicySnapshot: goodSnapshotPda,
          proposalProofVerification: goodProofVerificationPda,
          finalizer: authority.publicKey,
        })
        .rpc();
      assert.fail("Correct payload should pass proof checks but still respect the reveal window");
    } catch (err: any) {
      assert.include(err.toString(), "RevealStillOpen");
    }

    console.log("  ✓ V2 proof path rejects payload substitution and preserves lifecycle timing");
  });

  it("enforces V3 token-supply quorum and uses a dedicated reveal rebate vault", async () => {
    const scenarioDaoPda = await createIsolatedDaoScenario("V3Quorum", {
      revealWindowSeconds: 5,
    });
    const [governancePolicyPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dao-governance-policy-v3"), scenarioDaoPda.toBuffer()],
      program.programId,
    );
    const [revealRebateVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("reveal-rebate-vault-v3"), scenarioDaoPda.toBuffer()],
      program.programId,
    );

    await program.methods
      .initializeDaoGovernancePolicyV3(
        { tokenSupplyParticipation: {} },
        { dedicatedVaultRequired: {} },
        new BN(1_000_000),
      )
      .accounts({
        dao: scenarioDaoPda,
        daoGovernancePolicyV3: governancePolicyPda,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .fundRevealRebateVaultV3(new BN(2_000_000))
      .accounts({
        dao: scenarioDaoPda,
        daoGovernancePolicyV3: governancePolicyPda,
        revealRebateVault: revealRebateVaultPda,
        funder: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const dao = await program.account["dao"].fetch(scenarioDaoPda);
    const [proposalV3Pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), scenarioDaoPda.toBuffer(), dao.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );

    await program.methods
      .createProposal(
        "V3 token supply quorum",
        "Low participation should fail under token-supply quorum even if all commits reveal.",
        new BN(30),
        null,
      )
      .accounts({
        dao: scenarioDaoPda,
        proposal: proposalV3Pda,
        proposerTokenAccount: authorityTokenAta,
        proposer: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const [governanceSnapshotPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal-governance-snapshot-v3"), proposalV3Pda.toBuffer()],
      program.programId,
    );
    await program.methods
      .snapshotProposalGovernancePolicyV3()
      .accounts({
        dao: scenarioDaoPda,
        daoGovernancePolicyV3: governancePolicyPda,
        proposal: proposalV3Pda,
        governanceToken: governanceMint,
        proposalGovernancePolicySnapshotV3: governanceSnapshotPda,
        operator: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const keeper = Keypair.generate();
    await provider.sendAndConfirm(new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: authority.publicKey,
        toPubkey: keeper.publicKey,
        lamports: Math.round(0.01 * LAMPORTS_PER_SOL),
      }),
    ), []);

    const salt = randomSalt();
    const [voteRecordPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), proposalV3Pda.toBuffer(), voter3.publicKey.toBuffer()],
      program.programId,
    );

    await program.methods
      .commitVote([...computeCommitment(true, salt, voter3.publicKey, proposalV3Pda)], keeper.publicKey)
      .accounts({
        dao: scenarioDaoPda,
        proposal: proposalV3Pda,
        voterRecord: voteRecordPda,
        delegationMarker: PublicKey.findProgramAddressSync(
          [Buffer.from("delegation"), proposalV3Pda.toBuffer(), voter3.publicKey.toBuffer()],
          program.programId,
        )[0],
        voterTokenAccount: v3Ata,
        voter: voter3.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([voter3])
      .rpc();

    const created = await program.account["proposal"].fetch(proposalV3Pda);
    await new Promise((resolve) => setTimeout(resolve, Math.max(created.votingEnd.toNumber() - Math.floor(Date.now() / 1000), 0) * 1000 + 1200));

    const proposalLamportsBefore = await provider.connection.getBalance(proposalV3Pda);
    const vaultLamportsBefore = await provider.connection.getBalance(revealRebateVaultPda);

    await program.methods
      .revealVoteV3(true, [...salt])
      .accounts({
        proposal: proposalV3Pda,
        voterRecord: voteRecordPda,
        proposalGovernancePolicySnapshotV3: governanceSnapshotPda,
        revealRebateVault: revealRebateVaultPda,
        revealer: keeper.publicKey,
      })
      .signers([keeper])
      .rpc();

    const proposalLamportsAfterReveal = await provider.connection.getBalance(proposalV3Pda);
    const vaultLamportsAfterReveal = await provider.connection.getBalance(revealRebateVaultPda);
    assert.equal(proposalLamportsAfterReveal, proposalLamportsBefore);
    assert.equal(vaultLamportsBefore - vaultLamportsAfterReveal, 1_000_000);

    const revealed = await program.account["proposal"].fetch(proposalV3Pda);
    await new Promise((resolve) => setTimeout(resolve, Math.max(revealed.revealEnd.toNumber() - Math.floor(Date.now() / 1000), 0) * 1000 + 1200));

    await program.methods
      .finalizeProposalV3()
      .accounts({
        dao: scenarioDaoPda,
        proposal: proposalV3Pda,
        proposalGovernancePolicySnapshotV3: governanceSnapshotPda,
        finalizer: authority.publicKey,
      })
      .rpc();

    const finalized = await program.account["proposal"].fetch(proposalV3Pda);
    assert.deepEqual(finalized.status, { failed: {} });
    assert.equal(finalized.executionUnlocksAt.toString(), "0");
    console.log("  ✓ V3 uses dedicated rebate vault and rejects low participation under token-supply quorum");
  });

  it("updates DAO governance policy V3 and snapshots the hardened configuration", async () => {
    const scenarioDaoPda = await createIsolatedDaoScenario("GovernancePolicyV3");
    const [governancePolicyPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dao-governance-policy-v3"), scenarioDaoPda.toBuffer()],
      program.programId,
    );

    await program.methods
      .initializeDaoGovernancePolicyV3(
        { legacyRevealParticipation: {} },
        { disabled: {} },
        new BN(0),
      )
      .accounts({
        dao: scenarioDaoPda,
        daoGovernancePolicyV3: governancePolicyPda,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .updateDaoGovernancePolicyV3(
        { tokenSupplyParticipation: {} },
        { dedicatedVaultRequired: {} },
        new BN(1_000_000),
      )
      .accounts({
        dao: scenarioDaoPda,
        daoGovernancePolicyV3: governancePolicyPda,
        authority: authority.publicKey,
      })
      .rpc();

    const hardenedPolicy = await program.account["daoGovernancePolicyV3"].fetch(governancePolicyPda);
    assert.deepEqual(hardenedPolicy.quorumPolicy, { tokenSupplyParticipation: {} });
    assert.deepEqual(hardenedPolicy.revealRebatePolicy, { dedicatedVaultRequired: {} });
    assert.equal(hardenedPolicy.revealRebateLamports.toString(), "1000000");

    try {
      await program.methods
        .updateDaoGovernancePolicyV3(
          { legacyRevealParticipation: {} },
          { disabled: {} },
          new BN(1),
        )
        .accounts({
          dao: scenarioDaoPda,
          daoGovernancePolicyV3: governancePolicyPda,
          authority: authority.publicKey,
        })
        .rpc();
      assert.fail("Governance policy V3 must reject non-zero rebate amounts when rebates are disabled");
    } catch (err: any) {
      assert.include(err.toString(), "InvalidRevealRebateConfig");
    }

    const scenarioDao = await program.account["dao"].fetch(scenarioDaoPda);
    const [proposalV3Pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), scenarioDaoPda.toBuffer(), scenarioDao.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );

    await program.methods
      .createProposal(
        "Governance V3 hardened snapshot",
        "A new proposal should bind the latest governance policy V3 settings into its snapshot.",
        new BN(5),
        null,
      )
      .accounts({
        dao: scenarioDaoPda,
        proposal: proposalV3Pda,
        proposerTokenAccount: authorityTokenAta,
        proposer: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const [governanceSnapshotPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal-governance-snapshot-v3"), proposalV3Pda.toBuffer()],
      program.programId,
    );

    await program.methods
      .snapshotProposalGovernancePolicyV3()
      .accounts({
        dao: scenarioDaoPda,
        daoGovernancePolicyV3: governancePolicyPda,
        proposal: proposalV3Pda,
        governanceToken: governanceMint,
        proposalGovernancePolicySnapshotV3: governanceSnapshotPda,
        operator: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const snapshot = await program.account["proposalGovernancePolicySnapshotV3"].fetch(governanceSnapshotPda);
    assert.deepEqual(snapshot.quorumPolicy, { tokenSupplyParticipation: {} });
    assert.deepEqual(snapshot.revealRebatePolicy, { dedicatedVaultRequired: {} });
    assert.equal(snapshot.revealRebateLamports.toString(), "1000000");
    assert.equal(snapshot.objectVersion, 3);
    console.log("  ✓ Governance policy V3 updates, rejects invalid rebate configs, and snapshots the hardened policy");
  });

  it("updates DAO settlement policy V3, blocks rollback, and records the hardened policy", async () => {
    const scenarioDaoPda = await createIsolatedDaoScenario("SettlementPolicyV3");
    const [settlementPolicyPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dao-settlement-policy-v3"), scenarioDaoPda.toBuffer()],
      program.programId,
    );

    await program.methods
      .initializeDaoSettlementPolicyV3(
        new BN(60),
        new BN(100_000_000),
        true,
        false,
      )
      .accounts({
        dao: scenarioDaoPda,
        daoSettlementPolicyV3: settlementPolicyPda,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .updateDaoSettlementPolicyV3(
        new BN(120),
        new BN(90_000_000),
        true,
        true,
      )
      .accounts({
        dao: scenarioDaoPda,
        daoSettlementPolicyV3: settlementPolicyPda,
        authority: authority.publicKey,
      })
      .rpc();

    const hardenedPolicy = await program.account["daoSettlementPolicyV3"].fetch(settlementPolicyPda);
    assert.equal(hardenedPolicy.minEvidenceAgeSeconds.toString(), "120");
    assert.equal(hardenedPolicy.maxPayoutAmount.toString(), "90000000");
    assert.isTrue(hardenedPolicy.requireRefheSettlement);
    assert.isTrue(hardenedPolicy.requireMagicblockSettlement);

    try {
      await program.methods
        .updateDaoSettlementPolicyV3(
          new BN(30),
          new BN(95_000_000),
          true,
          false,
        )
        .accounts({
          dao: scenarioDaoPda,
          daoSettlementPolicyV3: settlementPolicyPda,
          authority: authority.publicKey,
        })
        .rpc();
      assert.fail("Settlement policy V3 must reject rollback to looser evidence, cap, or corridor requirements");
    } catch (err: any) {
      assert.include(err.toString(), "SettlementPolicyRollbackNotAllowed");
    }

    const afterRejectedRollback = await program.account["daoSettlementPolicyV3"].fetch(settlementPolicyPda);
    assert.equal(afterRejectedRollback.minEvidenceAgeSeconds.toString(), "120");
    assert.equal(afterRejectedRollback.maxPayoutAmount.toString(), "90000000");
    assert.isTrue(afterRejectedRollback.requireRefheSettlement);
    assert.isTrue(afterRejectedRollback.requireMagicblockSettlement);
    console.log("  ✓ Settlement policy V3 hardens forward and rejects rollback");
  });

  it("finalizes a ZK-enforced proposal V3 with matching proof and governance snapshots", async () => {
    const scenarioDaoPda = await createIsolatedDaoScenario("ZkFinalizeV3");
    const [securityPolicyPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dao-security-policy"), scenarioDaoPda.toBuffer()],
      program.programId,
    );
    const [governancePolicyPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dao-governance-policy-v3"), scenarioDaoPda.toBuffer()],
      program.programId,
    );
    const attestors = [
      authority.publicKey,
      ZERO_PUBKEY,
      ZERO_PUBKEY,
      ZERO_PUBKEY,
      ZERO_PUBKEY,
    ];

    await program.methods
      .initializeDaoSecurityPolicy(
        { strictRequired: {} },
        { thresholdAttestedRequired: {} },
        { thresholdAttestedRequired: {} },
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
        dao: scenarioDaoPda,
        daoSecurityPolicy: securityPolicyPda,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .initializeDaoGovernancePolicyV3(
        { legacyRevealParticipation: {} },
        { disabled: {} },
        new BN(0),
      )
      .accounts({
        dao: scenarioDaoPda,
        daoGovernancePolicyV3: governancePolicyPda,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const scenarioDao = await program.account["dao"].fetch(scenarioDaoPda);
    const [proposalV3Pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), scenarioDaoPda.toBuffer(), scenarioDao.proposalCount.toArrayLike(Buffer, "le", 8)],
      program.programId,
    );

    await program.methods
      .createProposal(
        "Finalize ZK enforced proposal V3",
        "A verified proof plus the governance snapshot should unlock the V3 strict finalization path.",
        new BN(5),
        null,
      )
      .accounts({
        dao: scenarioDaoPda,
        proposal: proposalV3Pda,
        proposerTokenAccount: authorityTokenAta,
        proposer: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const [executionSnapshotPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal-policy-snapshot"), proposalV3Pda.toBuffer()],
      program.programId,
    );
    const [governanceSnapshotPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal-governance-snapshot-v3"), proposalV3Pda.toBuffer()],
      program.programId,
    );
    const [proofVerificationPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal-proof-verification"), proposalV3Pda.toBuffer()],
      program.programId,
    );
    const [voteRecordPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), proposalV3Pda.toBuffer(), authority.publicKey.toBuffer()],
      program.programId,
    );
    const [delegationMarkerPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("delegation"), proposalV3Pda.toBuffer(), authority.publicKey.toBuffer()],
      program.programId,
    );
    const salt = randomSalt();

    await program.methods
      .snapshotProposalExecutionPolicy()
      .accounts({
        dao: scenarioDaoPda,
        daoSecurityPolicy: securityPolicyPda,
        proposal: proposalV3Pda,
        proposalExecutionPolicySnapshot: executionSnapshotPda,
        operator: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .snapshotProposalGovernancePolicyV3()
      .accounts({
        dao: scenarioDaoPda,
        daoGovernancePolicyV3: governancePolicyPda,
        proposal: proposalV3Pda,
        governanceToken: governanceMint,
        proposalGovernancePolicySnapshotV3: governanceSnapshotPda,
        operator: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .commitVote([...computeCommitment(true, salt, authority.publicKey, proposalV3Pda)], null)
      .accounts({
        dao: scenarioDaoPda,
        proposal: proposalV3Pda,
        voterRecord: voteRecordPda,
        delegationMarker: delegationMarkerPda,
        voterTokenAccount: authorityTokenAta,
        voter: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const created = await program.account["proposal"].fetch(proposalV3Pda);
    await waitUntilUnix(created.votingEnd);

    await program.methods
      .revealVote(true, [...salt])
      .accounts({
        proposal: proposalV3Pda,
        voterRecord: voteRecordPda,
        revealer: authority.publicKey,
      })
      .rpc();

    await program.methods
      .recordProofVerificationV2(
        { thresholdAttestation: {} },
        [...canonicalProposalPayloadHash(scenarioDaoPda, proposalV3Pda)],
        [...crypto.randomBytes(32)],
        [...crypto.randomBytes(32)],
        [...crypto.randomBytes(32)],
        [...canonicalProofDomain(scenarioDaoPda, proposalV3Pda)],
      )
      .accounts({
        dao: scenarioDaoPda,
        daoSecurityPolicy: securityPolicyPda,
        proposal: proposalV3Pda,
        proposalProofVerification: proofVerificationPda,
        recorder: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const revealed = await program.account["proposal"].fetch(proposalV3Pda);
    await waitUntilUnix(revealed.revealEnd);

    await program.methods
      .finalizeZkEnforcedProposalV3()
      .accounts({
        dao: scenarioDaoPda,
        proposal: proposalV3Pda,
        proposalExecutionPolicySnapshot: executionSnapshotPda,
        proposalGovernancePolicySnapshotV3: governanceSnapshotPda,
        proposalProofVerification: proofVerificationPda,
        finalizer: authority.publicKey,
      })
      .rpc();

    const finalized = await program.account["proposal"].fetch(proposalV3Pda);
    assert.deepEqual(finalized.status, { passed: {} });
    assert.equal(finalized.revealCount.toString(), "1");
    assert.isAtLeast(
      finalized.executionUnlocksAt.toNumber(),
      finalized.revealEnd.toNumber(),
      "execution unlock should not precede reveal end",
    );
    console.log("  ✓ ZK-enforced proposal V3 finalizes only after matching proof and governance snapshots");
  });

  it("executes a confidential payout through Settlement Hardening V2 with strict snapshot and verified evidence", async () => {
    const {
      payoutDaoPda,
      payoutProposalPda,
      payoutPlanPda,
      executionSnapshotPda,
      settlementEvidencePda,
      settlementConsumptionPda,
      treasuryPda,
      settlementRecipient,
      totalAmount,
    } = await prepareSettlementV2Scenario();

    const treasuryBefore = await provider.connection.getBalance(treasuryPda);
    const recipientBefore = await provider.connection.getBalance(settlementRecipient.publicKey);

    await program.methods
      .executeConfidentialPayoutPlanV2()
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        proposalExecutionPolicySnapshot: executionSnapshotPda,
        confidentialPayoutPlan: payoutPlanPda,
        settlementEvidence: settlementEvidencePda,
        settlementConsumptionRecord: settlementConsumptionPda,
        treasury: treasuryPda,
        executor: authority.publicKey,
        settlementRecipient: settlementRecipient.publicKey,
        treasuryTokenAccount: treasuryPda,
        recipientTokenAccount: treasuryPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const treasuryAfter = await provider.connection.getBalance(treasuryPda);
    const recipientAfter = await provider.connection.getBalance(settlementRecipient.publicKey);
    const executedPlan = await program.account["confidentialPayoutPlan"].fetch(payoutPlanPda);
    const executedProposal = await program.account["proposal"].fetch(payoutProposalPda);
    const consumptionRecord = await program.account["settlementConsumptionRecord"].fetch(settlementConsumptionPda);

    assert.equal(treasuryBefore - treasuryAfter, totalAmount);
    assert.equal(recipientAfter - recipientBefore, totalAmount);
    assert.deepEqual(executedPlan.status, { funded: {} });
    assert.isTrue(executedProposal.isExecuted);
    assert.equal(consumptionRecord.evidence.toBase58(), settlementEvidencePda.toBase58());
    assert.equal(consumptionRecord.consumedByProposal.toBase58(), payoutProposalPda.toBase58());
    console.log("  ✓ Settlement Hardening V2 executes only after strict snapshot and verified settlement evidence");
  });

  it("rejects Settlement Hardening V2 execution when settlement evidence is stale", async () => {
    const {
      payoutDaoPda,
      payoutProposalPda,
      payoutPlanPda,
      executionSnapshotPda,
      settlementEvidencePda,
      settlementConsumptionPda,
      treasuryPda,
      settlementRecipient,
    } = await prepareSettlementV2Scenario({ settlementTtlSeconds: 1 });

    await new Promise((resolve) => setTimeout(resolve, 2200));

    try {
      await program.methods
        .executeConfidentialPayoutPlanV2()
        .accounts({
          dao: payoutDaoPda,
          proposal: payoutProposalPda,
          proposalExecutionPolicySnapshot: executionSnapshotPda,
          confidentialPayoutPlan: payoutPlanPda,
          settlementEvidence: settlementEvidencePda,
          settlementConsumptionRecord: settlementConsumptionPda,
          treasury: treasuryPda,
          executor: authority.publicKey,
          settlementRecipient: settlementRecipient.publicKey,
          treasuryTokenAccount: treasuryPda,
          recipientTokenAccount: treasuryPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("V2 execution should reject settlement evidence after the TTL expires");
    } catch (err: any) {
      assert.include(err.toString(), "StaleSettlementEvidence");
    }

    console.log("  ✓ Settlement Hardening V2 rejects stale settlement evidence");
  });

  it("rejects Settlement Hardening V2 token execution when the treasury token account is not treasury-owned", async () => {
    const {
      payoutDaoPda,
      payoutProposalPda,
      payoutPlanPda,
      executionSnapshotPda,
      settlementEvidencePda,
      settlementConsumptionPda,
      treasuryPda,
      recipientAta,
      settlementRecipient,
    } = await prepareSettlementV2TokenScenario();

    try {
      await program.methods
        .executeConfidentialPayoutPlanV2()
        .accounts({
          dao: payoutDaoPda,
          proposal: payoutProposalPda,
          proposalExecutionPolicySnapshot: executionSnapshotPda,
          confidentialPayoutPlan: payoutPlanPda,
          settlementEvidence: settlementEvidencePda,
          settlementConsumptionRecord: settlementConsumptionPda,
          treasury: treasuryPda,
          executor: authority.publicKey,
          settlementRecipient: settlementRecipient.publicKey,
          treasuryTokenAccount: authorityTokenAta,
          recipientTokenAccount: recipientAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("V2 token execution must reject a treasury token account that is not owned by the treasury PDA");
    } catch (err: any) {
      assert.include(err.toString(), "InvalidTreasuryTokenAuthority");
    }

    console.log("  ✓ Settlement Hardening V2 token path rejects non-treasury token authority");
  });

  it("rejects Settlement Hardening V2 token execution when the recipient token mint does not match the payout mint", async () => {
    const {
      payoutDaoPda,
      payoutProposalPda,
      payoutPlanPda,
      executionSnapshotPda,
      settlementEvidencePda,
      settlementConsumptionPda,
      treasuryPda,
      treasuryAta,
      wrongMintRecipientAta,
      settlementRecipient,
    } = await prepareSettlementV2TokenScenario();

    try {
      await program.methods
        .executeConfidentialPayoutPlanV2()
        .accounts({
          dao: payoutDaoPda,
          proposal: payoutProposalPda,
          proposalExecutionPolicySnapshot: executionSnapshotPda,
          confidentialPayoutPlan: payoutPlanPda,
          settlementEvidence: settlementEvidencePda,
          settlementConsumptionRecord: settlementConsumptionPda,
          treasury: treasuryPda,
          executor: authority.publicKey,
          settlementRecipient: settlementRecipient.publicKey,
          treasuryTokenAccount: treasuryAta,
          recipientTokenAccount: wrongMintRecipientAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("V2 token execution must reject recipient token accounts that use the wrong mint");
    } catch (err: any) {
      assert.include(err.toString(), "InvalidTokenMint");
    }

    console.log("  ✓ Settlement Hardening V2 token path rejects mismatched recipient mint");
  });

  it("rejects Settlement Hardening V2 token execution when treasury and recipient token accounts are the same", async () => {
    const {
      payoutDaoPda,
      payoutProposalPda,
      payoutPlanPda,
      executionSnapshotPda,
      settlementEvidencePda,
      settlementConsumptionPda,
      treasuryPda,
      treasuryAta,
      settlementRecipient,
    } = await prepareSettlementV2TokenScenario();

    try {
      await program.methods
        .executeConfidentialPayoutPlanV2()
        .accounts({
          dao: payoutDaoPda,
          proposal: payoutProposalPda,
          proposalExecutionPolicySnapshot: executionSnapshotPda,
          confidentialPayoutPlan: payoutPlanPda,
          settlementEvidence: settlementEvidencePda,
          settlementConsumptionRecord: settlementConsumptionPda,
          treasury: treasuryPda,
          executor: authority.publicKey,
          settlementRecipient: settlementRecipient.publicKey,
          treasuryTokenAccount: treasuryAta,
          recipientTokenAccount: treasuryAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("V2 token execution must reject duplicate treasury and recipient token accounts");
    } catch (err: any) {
      assert.include(err.toString(), "DuplicateTokenAccounts");
    }

    console.log("  ✓ Settlement Hardening V2 token path rejects duplicate token accounts");
  });

  it("rejects Settlement Hardening V2 token execution when the recipient token account belongs to another owner", async () => {
    const {
      payoutDaoPda,
      payoutProposalPda,
      payoutPlanPda,
      executionSnapshotPda,
      settlementEvidencePda,
      settlementConsumptionPda,
      treasuryPda,
      treasuryAta,
      wrongOwnerRecipientAta,
      settlementRecipient,
    } = await prepareSettlementV2TokenScenario();

    try {
      await program.methods
        .executeConfidentialPayoutPlanV2()
        .accounts({
          dao: payoutDaoPda,
          proposal: payoutProposalPda,
          proposalExecutionPolicySnapshot: executionSnapshotPda,
          confidentialPayoutPlan: payoutPlanPda,
          settlementEvidence: settlementEvidencePda,
          settlementConsumptionRecord: settlementConsumptionPda,
          treasury: treasuryPda,
          executor: authority.publicKey,
          settlementRecipient: settlementRecipient.publicKey,
          treasuryTokenAccount: treasuryAta,
          recipientTokenAccount: wrongOwnerRecipientAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("V2 token execution must reject recipient token accounts owned by a different wallet");
    } catch (err: any) {
      assert.include(err.toString(), "RecipientOwnerMismatch");
    }

    console.log("  ✓ Settlement Hardening V2 token path rejects recipient owner mismatch");
  });

  it("executes a confidential payout through Settlement Hardening V3 with policy snapshots and verified evidence", async () => {
    const {
      payoutDaoPda,
      payoutProposalPda,
      payoutPlanPda,
      refheEnvelopePda,
      settlementSnapshotPda,
      settlementEvidencePda,
      settlementConsumptionPda,
      treasuryPda,
      magicBlockCorridorPda,
      settlementRecipient,
    } = await prepareSettlementV3Scenario();

    const treasuryBefore = await provider.connection.getBalance(treasuryPda);
    const recipientBefore = await provider.connection.getBalance(settlementRecipient.publicKey);

    await program.methods
      .executeConfidentialPayoutPlanV3()
      .accounts({
        dao: payoutDaoPda,
        proposal: payoutProposalPda,
        confidentialPayoutPlan: payoutPlanPda,
        proposalSettlementPolicySnapshotV3: settlementSnapshotPda,
        settlementEvidence: settlementEvidencePda,
        settlementConsumptionRecord: settlementConsumptionPda,
        treasury: treasuryPda,
        executor: authority.publicKey,
        settlementRecipient: settlementRecipient.publicKey,
        treasuryTokenAccount: treasuryPda,
        recipientTokenAccount: treasuryPda,
        refheEnvelope: refheEnvelopePda,
        magicblockPrivatePaymentCorridor: magicBlockCorridorPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const treasuryAfter = await provider.connection.getBalance(treasuryPda);
    const recipientAfter = await provider.connection.getBalance(settlementRecipient.publicKey);
    const executedPlan = await program.account["confidentialPayoutPlan"].fetch(payoutPlanPda);
    const executedProposal = await program.account["proposal"].fetch(payoutProposalPda);
    const consumptionRecord = await program.account["settlementConsumptionRecord"].fetch(settlementConsumptionPda);

    assert.equal(treasuryBefore - treasuryAfter, 50_000_000);
    assert.equal(recipientAfter - recipientBefore, 50_000_000);
    assert.deepEqual(executedPlan.status, { funded: {} });
    assert.isTrue(executedProposal.isExecuted);
    assert.equal(consumptionRecord.evidence.toBase58(), settlementEvidencePda.toBase58());
    assert.equal(consumptionRecord.consumedByProposal.toBase58(), payoutProposalPda.toBase58());
    console.log("  ✓ Settlement Hardening V3 executes only after a strict policy snapshot, REFHE settlement, and verified settlement evidence");
  });

  it("rejects Settlement Hardening V3 execution when evidence is still too fresh", async () => {
    const {
      payoutDaoPda,
      payoutProposalPda,
      payoutPlanPda,
      refheEnvelopePda,
      settlementSnapshotPda,
      settlementEvidencePda,
      settlementConsumptionPda,
      treasuryPda,
      magicBlockCorridorPda,
      settlementRecipient,
    } = await prepareSettlementV3Scenario({ minEvidenceAgeSeconds: 3600 });

    try {
      await program.methods
        .executeConfidentialPayoutPlanV3()
        .accounts({
          dao: payoutDaoPda,
          proposal: payoutProposalPda,
          confidentialPayoutPlan: payoutPlanPda,
          proposalSettlementPolicySnapshotV3: settlementSnapshotPda,
          settlementEvidence: settlementEvidencePda,
          settlementConsumptionRecord: settlementConsumptionPda,
          treasury: treasuryPda,
          executor: authority.publicKey,
          settlementRecipient: settlementRecipient.publicKey,
          treasuryTokenAccount: treasuryPda,
          recipientTokenAccount: treasuryPda,
          refheEnvelope: refheEnvelopePda,
          magicblockPrivatePaymentCorridor: magicBlockCorridorPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("V3 execution should reject settlement evidence before the minimum age window passes");
    } catch (err: any) {
      assert.include(err.toString(), "SettlementEvidenceTooFresh");
    }

    console.log("  ✓ Settlement Hardening V3 rejects evidence that is still inside the minimum age window");
  });

  it("rejects Settlement Hardening V3 execution when payout amount exceeds the capped policy", async () => {
    const {
      payoutDaoPda,
      payoutProposalPda,
      payoutPlanPda,
      refheEnvelopePda,
      settlementSnapshotPda,
      settlementEvidencePda,
      settlementConsumptionPda,
      treasuryPda,
      magicBlockCorridorPda,
      settlementRecipient,
    } = await prepareSettlementV3Scenario({ maxPayoutAmount: 40_000_000, totalAmount: 50_000_000 });

    try {
      await program.methods
        .executeConfidentialPayoutPlanV3()
        .accounts({
          dao: payoutDaoPda,
          proposal: payoutProposalPda,
          confidentialPayoutPlan: payoutPlanPda,
          proposalSettlementPolicySnapshotV3: settlementSnapshotPda,
          settlementEvidence: settlementEvidencePda,
          settlementConsumptionRecord: settlementConsumptionPda,
          treasury: treasuryPda,
          executor: authority.publicKey,
          settlementRecipient: settlementRecipient.publicKey,
          treasuryTokenAccount: treasuryPda,
          recipientTokenAccount: treasuryPda,
          refheEnvelope: refheEnvelopePda,
          magicblockPrivatePaymentCorridor: magicBlockCorridorPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("V3 execution should reject payouts above the settlement policy cap");
    } catch (err: any) {
      assert.include(err.toString(), "PayoutAmountExceedsSettlementCap");
    }

    console.log("  ✓ Settlement Hardening V3 rejects payouts that exceed the proposal-bound settlement cap");
  });
});
