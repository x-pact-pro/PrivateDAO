import { assert } from "chai";
import { Keypair, PublicKey } from "@solana/web3.js";

import { PrivateDaoReadNode, __testables, resolveDevnetRpcEndpoints } from "../../scripts/lib/read-node";

describe("read node unit coverage", () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in envBackup)) {
        delete process.env[key];
      }
    }
    for (const [key, value] of Object.entries(envBackup)) {
      process.env[key] = value;
    }
  });

  it("builds and de-duplicates devnet RPC endpoints from environment inputs", () => {
    process.env.SOLANA_RPC_URL = "https://rpc-one.example";
    process.env.ALCHEMY_API_KEY = "alchemy-key";
    process.env.HELIUS_API_KEY = "helius-key";
    process.env.QUICKNODE_DEVNET_RPC = "https://rpc-one.example";
    process.env.RPC_FAST_DEVNET_RPC = "https://rpcfast.example";
    process.env.EXTRA_DEVNET_RPCS = "https://rpc-two.example, https://rpcfast.example";

    const endpoints = resolveDevnetRpcEndpoints();

    assert.include(endpoints, "https://rpc-one.example");
    assert.include(endpoints, "https://solana-devnet.g.alchemy.com/v2/alchemy-key");
    assert.include(endpoints, "https://devnet.helius-rpc.com/?api-key=helius-key");
    assert.include(endpoints, "https://rpc-two.example");
    assert.include(endpoints, "https://rpcfast.example");
    assert.equal(endpoints.filter((item) => item === "https://rpc-one.example").length, 1);
  });

  it("rejects placeholder RPC values and falls back to sane timeout defaults", () => {
    delete process.env.PRIVATE_DAO_RPC_TIMEOUT_MS;

    assert.equal(__testables.trimValue("  hi  "), "hi");
    assert.equal(__testables.isPlaceholderValue("your_rpc_url_here"), true);
    assert.equal(__testables.isValidRpcUrl("https://ok.example"), true);
    assert.equal(__testables.isValidRpcUrl("your_rpc_url_here"), false);
    assert.equal(__testables.rpcTimeoutMs(), 8000);
  });

  it("prefers explicit Alchemy RPC URLs and ignores placeholder Helius keys", () => {
    process.env.ALCHEMY_DEVNET_RPC_URL = "https://alchemy-explicit.example";
    process.env.ALCHEMY_API_KEY = "alchemy-key";
    process.env.HELIUS_API_KEY = "your_helius_api_key_here";

    assert.equal(__testables.buildAlchemyDevnetRpc(), "https://alchemy-explicit.example");
    assert.equal(__testables.buildHeliusDevnetRpc(), null);
  });

  it("maps DAO and proposal accounts into reviewer-safe views", () => {
    const dao = Keypair.generate().publicKey;
    const authority = Keypair.generate().publicKey;
    const governanceMint = Keypair.generate().publicKey;
    const recipient = Keypair.generate().publicKey;
    const proposal = Keypair.generate().publicKey;

    const mappedDao = __testables.mapDaoAccount(dao, {
      authority,
      dao_name: "PDAO Cairo",
      governance_token: governanceMint,
      quorum_percentage: 60,
      governance_token_required: 1_000_000n,
      reveal_window_seconds: 45n,
      execution_delay_seconds: 15n,
      voting_config: { Token: {} },
      proposal_count: 4n,
      bump: 9,
    });

    const mappedProposal = __testables.mapProposalAccount(proposal, {
      dao,
      proposer: authority,
      proposal_id: 4n,
      title: "Upgrade proof lane",
      description: "ship v3",
      status: { Voting: {} },
      voting_end: BigInt(Math.floor(Date.now() / 1000) + 60),
      reveal_end: BigInt(Math.floor(Date.now() / 1000) + 120),
      execution_unlocks_at: BigInt(Math.floor(Date.now() / 1000) + 180),
      is_executed: false,
      yes_capital: 10n,
      no_capital: 1n,
      yes_community: 5n,
      no_community: 0n,
      commit_count: 4n,
      reveal_count: 1n,
      treasury_action: {
        action_type: { SendSol: {} },
        amount_lamports: 5000n,
        recipient,
        token_mint: null,
      },
    });

    assert.equal(mappedDao.daoName, "PDAO Cairo");
    assert.equal(mappedDao.votingConfig, "Token");
    assert.equal(mappedProposal.phase, "Commit");
    assert.equal(mappedProposal.treasuryAction?.actionTypeLabel, "Send SOL");
    assert.equal(mappedProposal.treasuryAction?.recipient, recipient.toBase58());
  });

  it("maps companion privacy accounts into reviewer-safe views", () => {
    const dao = Keypair.generate().publicKey;
    const proposal = Keypair.generate().publicKey;
    const authority = Keypair.generate().publicKey;
    const payoutPlan = Keypair.generate().publicKey;
    const settlementRecipient = Keypair.generate().publicKey;
    const tokenMint = Keypair.generate().publicKey;
    const ownerWallet = Keypair.generate().publicKey;
    const settlementWallet = Keypair.generate().publicKey;

    const policy = __testables.mapPolicyAccount(Keypair.generate().publicKey, {
      dao,
      proposal,
      configured_by: authority,
      mode: { Enforced: {} },
      required_layers_mask: 7,
      configured_at: 1700000000n,
      bump: 3,
    });
    const plan = __testables.mapConfidentialPayoutPlan(Keypair.generate().publicKey, {
      dao,
      proposal,
      configured_by: authority,
      payout_type: { Payroll: {} },
      asset_type: { Spl: {} },
      settlement_recipient: settlementRecipient,
      token_mint: tokenMint,
      recipient_count: 2,
      total_amount: 123_000n,
      encrypted_manifest_uri: "ipfs://manifest",
      manifest_hash: Uint8Array.from([1, 2, 3]),
      ciphertext_hash: Uint8Array.from([4, 5, 6]),
      status: { Funded: {} },
      configured_at: 1700000001n,
      funded_at: 1700000002n,
      bump: 4,
    });
    const envelope = __testables.mapRefheEnvelope(Keypair.generate().publicKey, {
      dao,
      proposal,
      payout_plan: payoutPlan,
      configured_by: authority,
      settled_by: authority,
      model_uri: "https://models.example/refhe",
      policy_hash: Uint8Array.from([7, 8]),
      input_ciphertext_hash: Uint8Array.from([9, 10]),
      evaluation_key_hash: Uint8Array.from([11, 12]),
      result_ciphertext_hash: Uint8Array.from([13, 14]),
      result_commitment_hash: Uint8Array.from([15, 16]),
      proof_bundle_hash: Uint8Array.from([17, 18]),
      verifier_program: authority,
      status: { Settled: {} },
      configured_at: 1700000003n,
      settled_at: 1700000004n,
      bump: 5,
    });
    const corridor = __testables.mapMagicBlockCorridor(Keypair.generate().publicKey, {
      dao,
      proposal,
      payout_plan: payoutPlan,
      configured_by: authority,
      settled_by: authority,
      api_base_url: "https://magicblock.example",
      cluster: "devnet",
      owner_wallet: ownerWallet,
      settlement_wallet: settlementWallet,
      token_mint: tokenMint,
      validator: authority,
      transfer_queue: null,
      route_hash: Uint8Array.from([19, 20]),
      deposit_amount: 10_000n,
      private_transfer_amount: 9_000n,
      withdrawal_amount: 8_000n,
      deposit_tx_signature: "deposit-sig",
      transfer_tx_signature: "transfer-sig",
      withdraw_tx_signature: "withdraw-sig",
      status: { Settled: {} },
      configured_at: 1700000005n,
      settled_at: 1700000006n,
      bump: 6,
    });
    const receipt = __testables.mapReceipt(Keypair.generate().publicKey, {
      dao,
      proposal,
      verified_by: authority,
      layer: { Groth16: {} },
      proof_system: { Groth16: {} },
      verification_mode: { ExternalVerifier: {} },
      verifier_program: authority,
      verified_at: 1700000007n,
      bump: 7,
    });

    assert.equal(policy.mode, "Enforced");
    assert.equal(plan.status, "Funded");
    assert.equal(plan.manifestHash, "010203");
    assert.equal(envelope.status, "Settled");
    assert.equal(envelope.verifierProgram, authority.toBase58());
    assert.equal(corridor.ownerWallet, ownerWallet.toBase58());
    assert.equal(corridor.transferQueue, null);
    assert.equal(receipt.proofSystem, "Groth16");
    assert.equal(receipt.verificationMode, "ExternalVerifier");
  });

  it("derives policy and evidence PDAs deterministically", () => {
    const proposal = Keypair.generate().publicKey;
    const programId = Keypair.generate().publicKey;

    const zkPolicy = __testables.deriveProposalZkPolicyPda(proposal.toBase58(), programId);
    const payoutPlan = __testables.deriveConfidentialPayoutPlanPda(proposal.toBase58(), programId);
    const refheEnvelope = __testables.deriveRefheEnvelopePda(proposal.toBase58(), programId);
    const corridor = __testables.deriveMagicBlockPrivatePaymentCorridorPda(proposal.toBase58(), programId);
    const receipt = __testables.deriveZkReceiptPda(proposal.toBase58(), 1, programId);

    const expectedZkPolicy = PublicKey.findProgramAddressSync(
      [Buffer.from("zk-policy"), proposal.toBuffer()],
      programId,
    )[0].toBase58();
    const expectedPayoutPlan = PublicKey.findProgramAddressSync(
      [Buffer.from("payout-plan"), proposal.toBuffer()],
      programId,
    )[0].toBase58();
    const expectedRefheEnvelope = PublicKey.findProgramAddressSync(
      [Buffer.from("refhe-envelope"), proposal.toBuffer()],
      programId,
    )[0].toBase58();
    const expectedCorridor = PublicKey.findProgramAddressSync(
      [Buffer.from("magicblock-corridor"), proposal.toBuffer()],
      programId,
    )[0].toBase58();
    const expectedReceipt = PublicKey.findProgramAddressSync(
      [Buffer.from("zk-verify"), proposal.toBuffer(), Buffer.from([1])],
      programId,
    )[0].toBase58();

    assert.equal(zkPolicy, expectedZkPolicy);
    assert.equal(payoutPlan, expectedPayoutPlan);
    assert.equal(refheEnvelope, expectedRefheEnvelope);
    assert.equal(corridor, expectedCorridor);
    assert.equal(receipt, expectedReceipt);
  });

  it("rotates RPC endpoints and retries recoverable RPC failures", async () => {
    const node = new PrivateDaoReadNode({
      rpcEndpoints: ["https://rpc-a.example", "https://rpc-b.example"],
    });
    let attempts = 0;

    const result = await node.withRpcFallback(async () => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error("429 rate limit");
      }
      return "ok";
    }, 2);

    assert.equal(result, "ok");
    assert.equal(node.currentRpcEndpoint(), "https://rpc-b.example");
  });

  it("redacts QuickNode RPC path secrets before exposing runtime evidence", () => {
    const redacted = __testables.redactRpcEndpoint(
      "https://cosmological-hidden-water.solana-testnet.quiknode.pro/a15cf3772672a4ecb986d52659a108a3e6efe160/",
    );

    assert.equal(
      redacted,
      "https://cosmological-hidden-water.solana-testnet.quiknode.pro/[redacted]",
    );
  });

  it("reports label helpers and profile summaries consistently", () => {
    assert.equal(__testables.actionTypeLabel({ SendSpl2022: {} }), "Send SPL-2022");
    assert.equal(__testables.statusLabel({ Passed: {} }), "Passed");
    assert.equal(__testables.proofSystemLabel({ Groth16: {} }), "Groth16");

    const node = new PrivateDaoReadNode({
      rpcEndpoints: ["https://rpc-a.example"],
    });
    const profiles = node.getLoadProfiles();

    assert.equal(profiles.some((profile) => profile.name === "50"), true);
    assert.equal(profiles.some((profile) => profile.name === "500"), true);
  });

  it("computes proposal phases across commit, reveal, timelock, executable, and final states", () => {
    const now = Math.floor(Date.now() / 1000);

    assert.equal(
      __testables.computePhase(
        {
          status: "Voting",
          isExecuted: false,
          votingEnd: now + 60,
          revealEnd: now + 120,
          executionUnlocksAt: now + 180,
        },
        now,
      ),
      "Commit",
    );
    assert.equal(
      __testables.computePhase(
        {
          status: "Voting",
          isExecuted: false,
          votingEnd: now - 10,
          revealEnd: now + 60,
          executionUnlocksAt: now + 120,
        },
        now,
      ),
      "Reveal",
    );
    assert.equal(
      __testables.computePhase(
        {
          status: "Passed",
          isExecuted: false,
          votingEnd: now - 20,
          revealEnd: now - 10,
          executionUnlocksAt: now + 120,
        },
        now,
      ),
      "Timelocked",
    );
    assert.equal(
      __testables.computePhase(
        {
          status: "Passed",
          isExecuted: false,
          votingEnd: now - 20,
          revealEnd: now - 10,
          executionUnlocksAt: now - 1,
        },
        now,
      ),
      "Executable",
    );
    assert.equal(
      __testables.computePhase(
        {
          status: "Cancelled",
          isExecuted: false,
          votingEnd: now - 20,
          revealEnd: now - 10,
          executionUnlocksAt: now - 1,
        },
        now,
      ),
      "Cancelled",
    );
    assert.equal(
      __testables.computePhase(
        {
          status: "Passed",
          isExecuted: true,
          votingEnd: now - 20,
          revealEnd: now - 10,
          executionUnlocksAt: now - 1,
        },
        now,
      ),
      "Executed",
    );
    assert.equal(
      __testables.computePhase(
        {
          status: "Unknown",
          isExecuted: false,
          votingEnd: now - 20,
          revealEnd: now - 10,
          executionUnlocksAt: now - 1,
        },
        now,
      ),
      "Finalized",
    );
  });

  it("does not rotate RPC endpoints on unrecoverable RPC failures", async () => {
    const node = new PrivateDaoReadNode({
      rpcEndpoints: ["https://rpc-a.example", "https://rpc-b.example"],
    });

    try {
      await node.withRpcFallback(async () => {
        throw new Error("invalid instruction data");
      });
      assert.fail("expected unrecoverable error");
    } catch (error) {
      assert.match(String(error), /invalid instruction data/);
      assert.equal(node.currentRpcEndpoint(), "https://rpc-a.example");
    }
  });

  it("derives wallet readiness and ops overview from live-shaped runtime data", async () => {
    const node = new PrivateDaoReadNode({
      rpcEndpoints: ["https://rpc-a.example"],
    }) as any;

    node.fetchDao = async () => ({
      governanceToken: Keypair.generate().publicKey.toBase58(),
    });
    node.withRpcFallback = async () => ({
      value: [
        {
          account: {
            data: {
              parsed: {
                info: {
                  tokenAmount: { uiAmount: 3.5 },
                },
              },
            },
          },
        },
      ],
    });

    const readiness = await node.fetchWalletReadiness(
      Keypair.generate().publicKey.toBase58(),
      Keypair.generate().publicKey.toBase58(),
    );

    assert.equal(readiness.readiness, "READY");
    assert.equal(readiness.balanceUi, 3.5);

    node.fetchProposals = async () => [
      {
        dao: "dao-a",
        zkMode: "ZkEnforced",
        confidentialPayoutPlan: { status: "Configured" },
        magicblockCorridor: { status: "Settled" },
        refheEnvelope: { status: "Settled", verifierProgram: "Verifier1111111111111111111111111111111111" },
        phase: "Executable",
      },
      {
        dao: "dao-b",
        zkMode: "Companion",
        confidentialPayoutPlan: null,
        magicblockCorridor: null,
        refheEnvelope: null,
        phase: "Finalized",
      },
    ];

    const overview = await node.getOpsOverview(true);

    assert.equal(overview.proposals, 2);
    assert.equal(overview.uniqueDaos, 2);
    assert.equal(overview.zkEnforced, 1);
    assert.equal(overview.confidentialPayouts, 1);
    assert.equal(overview.magicblockSettled, 1);
    assert.equal(overview.refheSettled, 1);
    assert.equal(overview.refheWithVerifier, 1);
    assert.equal(overview.executableConfidential, 1);
  });
});
