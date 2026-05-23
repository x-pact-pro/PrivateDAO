// SPDX-License-Identifier: AGPL-3.0-or-later
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

mod dao;
mod error;
mod privacy;
mod traits;
mod treasury;
mod utils;
mod voting;

pub use error::Error;
pub use traits::{ProposalLifecycle, Sha256VoteCommitment, TreasuryActionPolicy, VoteCommitment};
pub use utils::{
    compute_vote_commitment, validate_attestor_policy, validate_confidential_payout_plan,
    validate_governance_policy_v3, validate_magicblock_corridor, validate_magicblock_tx_signature,
    validate_refhe_envelope, validate_settlement_policy_v3, validate_treasury_action,
    validate_voting_config,
};

declare_id!("EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva");

// ─────────────────────────────────────────────────────────────────────────────
//  PrivateDAO — Commit-reveal governance for Solana
//  Solana Graveyard Hackathon 2026
//
//  The problem: every vote on Realms is visible the moment it's cast.
//  That enables three attacks: vote buying, whale intimidation, treasury MEV.
//
//  The fix — three-phase commit-reveal:
//    Phase 1 COMMIT  → voter submits sha256(vote ‖ salt ‖ proposal ‖ voter)
//                      tally shows 0/0 throughout the entire voting period
//    Phase 2 REVEAL  → voter proves (vote, salt), tally updates
//    Phase 3 EXECUTE → after timelock delay, treasury action fires
//
//  Voting modes:
//    TokenWeighted → weight = raw token balance
//    Quadratic     → weight = √(token balance)
//                    Reduces concentration within a single-identity model;
//                    Sybil resistance still depends on DAO policy.
//    DualChamber   → capital chamber (token-weighted) AND community chamber
//                    (quadratic) both must clear their threshold independently.
//                    Whales need community support. Community needs capital buy-in.
//
//  Original features not found on any other Solana DAO tool:
//    Private delegation  — delegator grants weight to delegatee for one proposal.
//                          The vote stays hidden; even the delegatee chooses it.
//    Keeper auto-reveal  — voter authorizes a proposal-scoped keeper at
//                          commit time.
//                          Keeper can only submit the exact reveal if the
//                          voter forgets.
//                          Keeper earns the SOL rebate. Vote unchanged.
//    Timelock + veto     — passed proposals wait execution_delay_seconds.
//                          DAO authority can veto during the veto window.
//                          Mirrors Compound/Aave security model on Solana.
//    Cancel proposal     — authority cancels an open proposal immediately.
//    Realms plugin       — spl-governance-addin-api VoterWeightRecord layout.
//    migrate_from_realms — mirror a Realms DAO into PrivateDAO in one TX.
// ─────────────────────────────────────────────────────────────────────────────

pub const REVEAL_REBATE_LAMPORTS: u64 = 1_000_000; // 0.001 SOL per reveal
pub const MAX_REVEAL_REBATE_V3_LAMPORTS: u64 = REVEAL_REBATE_LAMPORTS;
pub const DEFAULT_EXECUTION_DELAY: i64 = 86_400; // 24-hour timelock default
pub const MIN_REVEAL_WINDOW_SECONDS: i64 = 5;
pub const MIN_VOTING_DURATION_SECONDS: i64 = 5;
pub const VOTER_WEIGHT_EXPIRY_SLOTS: u64 = 10_000;
pub const MAX_POLICY_ATTESTORS: usize = 5;
pub const PAYOUT_PAYLOAD_DOMAIN_V1: &[u8] = b"PrivateDAO::payout-payload:v1";
pub const PROOF_PAYLOAD_DOMAIN_V1: &[u8] = b"PrivateDAO::proof-payload:v1";
pub const SETTLEMENT_EVIDENCE_DOMAIN_V1: &[u8] = b"PrivateDAO::settlement-evidence:v1";

#[program]
pub mod private_dao {
    use super::*;

    // ── Initialize DAO ────────────────────────────────────────────────────────

    pub fn initialize_dao(
        ctx: Context<InitializeDao>,
        dao_name: String,
        quorum_percentage: u8,
        governance_token_required: u64,
        reveal_window_seconds: i64,
        execution_delay_seconds: i64,
        voting_config: VotingConfig,
    ) -> Result<()> {
        dao::initialize_dao(
            ctx,
            dao_name,
            quorum_percentage,
            governance_token_required,
            reveal_window_seconds,
            execution_delay_seconds,
            voting_config,
        )
    }

    // ── Migrate from Realms (Sunrise track) ──────────────────────────────────
    //
    // Takes an existing Realms governance pubkey and mirrors its token config.
    // Non-destructive: no treasury moves, no proposal disruption, same token.

    pub fn migrate_from_realms(
        ctx: Context<MigrateFromRealms>,
        dao_name: String,
        realms_governance: Pubkey,
        quorum_percentage: u8,
        reveal_window_seconds: i64,
        execution_delay_seconds: i64,
        voting_config: VotingConfig,
    ) -> Result<()> {
        dao::migrate_from_realms(
            ctx,
            dao_name,
            realms_governance,
            quorum_percentage,
            reveal_window_seconds,
            execution_delay_seconds,
            voting_config,
        )
    }

    // ── Authority handoff ───────────────────────────────────────────────────
    //
    // Transfers the DAO operating authority that gates policy, ZK-enforced
    // mode, confidential payout, REFHE, and MagicBlock settlement operations.
    // Treasury SOL/SPL execution remains proposal/PDA-bound; this authority
    // controls the operator-only surfaces around that treasury lane.

    pub fn transfer_dao_authority(
        ctx: Context<TransferDaoAuthority>,
        new_authority: Pubkey,
    ) -> Result<()> {
        dao::transfer_dao_authority(ctx, new_authority)
    }

    pub fn initialize_treasury_operator_authority(
        ctx: Context<InitializeTreasuryOperatorAuthority>,
    ) -> Result<()> {
        dao::initialize_treasury_operator_authority(ctx)
    }

    pub fn transfer_treasury_operator_authority(
        ctx: Context<TransferTreasuryOperatorAuthority>,
        new_authority: Pubkey,
    ) -> Result<()> {
        dao::transfer_treasury_operator_authority(ctx, new_authority)
    }

    // ── Additive V2 security policy ──────────────────────────────────────────
    //
    // This companion account keeps legacy DAOs and existing proposal/payout
    // accounts readable while enabling opt-in strict paths for new objects.

    pub fn initialize_dao_security_policy(
        ctx: Context<InitializeDaoSecurityPolicy>,
        mode: EnforcementMode,
        zk_policy: FeaturePolicy,
        settlement_policy: FeaturePolicy,
        cancel_policy: CancelPolicy,
        proof_attestors: [Pubkey; MAX_POLICY_ATTESTORS],
        proof_attestor_count: u8,
        proof_threshold: u8,
        settlement_attestors: [Pubkey; MAX_POLICY_ATTESTORS],
        settlement_attestor_count: u8,
        settlement_threshold: u8,
        proof_ttl_seconds: i64,
        settlement_ttl_seconds: i64,
    ) -> Result<()> {
        dao::initialize_dao_security_policy(
            ctx,
            mode,
            zk_policy,
            settlement_policy,
            cancel_policy,
            proof_attestors,
            proof_attestor_count,
            proof_threshold,
            settlement_attestors,
            settlement_attestor_count,
            settlement_threshold,
            proof_ttl_seconds,
            settlement_ttl_seconds,
        )
    }

    pub fn update_dao_security_policy_v2(
        ctx: Context<UpdateDaoSecurityPolicyV2>,
        mode: EnforcementMode,
        zk_policy: FeaturePolicy,
        settlement_policy: FeaturePolicy,
        cancel_policy: CancelPolicy,
        proof_attestors: [Pubkey; MAX_POLICY_ATTESTORS],
        proof_attestor_count: u8,
        proof_threshold: u8,
        settlement_attestors: [Pubkey; MAX_POLICY_ATTESTORS],
        settlement_attestor_count: u8,
        settlement_threshold: u8,
        proof_ttl_seconds: i64,
        settlement_ttl_seconds: i64,
    ) -> Result<()> {
        dao::update_dao_security_policy_v2(
            ctx,
            mode,
            zk_policy,
            settlement_policy,
            cancel_policy,
            proof_attestors,
            proof_attestor_count,
            proof_threshold,
            settlement_attestors,
            settlement_attestor_count,
            settlement_threshold,
            proof_ttl_seconds,
            settlement_ttl_seconds,
        )
    }

    pub fn initialize_dao_governance_policy_v3(
        ctx: Context<InitializeDaoGovernancePolicyV3>,
        quorum_policy: QuorumPolicyV3,
        reveal_rebate_policy: RevealRebatePolicyV3,
        reveal_rebate_lamports: u64,
    ) -> Result<()> {
        dao::initialize_dao_governance_policy_v3(
            ctx,
            quorum_policy,
            reveal_rebate_policy,
            reveal_rebate_lamports,
        )
    }

    pub fn update_dao_governance_policy_v3(
        ctx: Context<UpdateDaoGovernancePolicyV3>,
        quorum_policy: QuorumPolicyV3,
        reveal_rebate_policy: RevealRebatePolicyV3,
        reveal_rebate_lamports: u64,
    ) -> Result<()> {
        dao::update_dao_governance_policy_v3(
            ctx,
            quorum_policy,
            reveal_rebate_policy,
            reveal_rebate_lamports,
        )
    }

    pub fn initialize_dao_settlement_policy_v3(
        ctx: Context<InitializeDaoSettlementPolicyV3>,
        min_evidence_age_seconds: i64,
        max_payout_amount: u64,
        require_refhe_settlement: bool,
        require_magicblock_settlement: bool,
    ) -> Result<()> {
        dao::initialize_dao_settlement_policy_v3(
            ctx,
            min_evidence_age_seconds,
            max_payout_amount,
            require_refhe_settlement,
            require_magicblock_settlement,
        )
    }

    pub fn update_dao_settlement_policy_v3(
        ctx: Context<UpdateDaoSettlementPolicyV3>,
        min_evidence_age_seconds: i64,
        max_payout_amount: u64,
        require_refhe_settlement: bool,
        require_magicblock_settlement: bool,
    ) -> Result<()> {
        dao::update_dao_settlement_policy_v3(
            ctx,
            min_evidence_age_seconds,
            max_payout_amount,
            require_refhe_settlement,
            require_magicblock_settlement,
        )
    }

    // ── Create proposal ───────────────────────────────────────────────────────

    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        title: String,
        description: String,
        voting_duration_seconds: i64,
        treasury_action: Option<TreasuryAction>,
    ) -> Result<()> {
        voting::create_proposal(
            ctx,
            title,
            description,
            voting_duration_seconds,
            treasury_action,
        )
    }

    pub fn configure_confidential_payout_plan(
        ctx: Context<ConfigureConfidentialPayoutPlan>,
        payout_type: ConfidentialPayoutType,
        asset_type: ConfidentialAssetType,
        settlement_recipient: Pubkey,
        token_mint: Option<Pubkey>,
        recipient_count: u16,
        total_amount: u64,
        encrypted_manifest_uri: String,
        manifest_hash: [u8; 32],
        ciphertext_hash: [u8; 32],
    ) -> Result<()> {
        treasury::configure_confidential_payout_plan(
            ctx,
            payout_type,
            asset_type,
            settlement_recipient,
            token_mint,
            recipient_count,
            total_amount,
            encrypted_manifest_uri,
            manifest_hash,
            ciphertext_hash,
        )
    }

    pub fn configure_refhe_envelope(
        ctx: Context<ConfigureRefheEnvelope>,
        model_uri: String,
        policy_hash: [u8; 32],
        input_ciphertext_hash: [u8; 32],
        evaluation_key_hash: [u8; 32],
    ) -> Result<()> {
        treasury::configure_refhe_envelope(
            ctx,
            model_uri,
            policy_hash,
            input_ciphertext_hash,
            evaluation_key_hash,
        )
    }

    pub fn settle_refhe_envelope(
        ctx: Context<SettleRefheEnvelope>,
        result_ciphertext_hash: [u8; 32],
        result_commitment_hash: [u8; 32],
        proof_bundle_hash: [u8; 32],
        verifier_program: Pubkey,
    ) -> Result<()> {
        treasury::settle_refhe_envelope(
            ctx,
            result_ciphertext_hash,
            result_commitment_hash,
            proof_bundle_hash,
            verifier_program,
        )
    }

    pub fn configure_magicblock_private_payment_corridor(
        ctx: Context<ConfigureMagicBlockPrivatePaymentCorridor>,
        api_base_url: String,
        cluster: String,
        owner_wallet: Pubkey,
        validator: Option<Pubkey>,
        route_hash: [u8; 32],
        deposit_amount: u64,
        private_transfer_amount: u64,
        withdrawal_amount: u64,
    ) -> Result<()> {
        treasury::configure_magicblock_private_payment_corridor(
            ctx,
            api_base_url,
            cluster,
            owner_wallet,
            validator,
            route_hash,
            deposit_amount,
            private_transfer_amount,
            withdrawal_amount,
        )
    }

    pub fn settle_magicblock_private_payment_corridor(
        ctx: Context<SettleMagicBlockPrivatePaymentCorridor>,
        validator: Pubkey,
        transfer_queue: Pubkey,
        deposit_tx_signature: String,
        transfer_tx_signature: String,
        withdraw_tx_signature: String,
    ) -> Result<()> {
        treasury::settle_magicblock_private_payment_corridor(
            ctx,
            validator,
            transfer_queue,
            deposit_tx_signature,
            transfer_tx_signature,
            withdraw_tx_signature,
        )
    }

    // ── Cancel proposal ───────────────────────────────────────────────────────
    //
    // Authority-only legacy cancellation. The ABI is preserved, but the safety
    // invariant is now shared with V2: ordinary cancellation is only valid before
    // meaningful participation starts.

    pub fn cancel_proposal(ctx: Context<CancelProposal>) -> Result<()> {
        voting::cancel_proposal(ctx)
    }

    pub fn cancel_proposal_v2(ctx: Context<CancelProposalV2>) -> Result<()> {
        voting::cancel_proposal_v2(ctx)
    }

    // ── Veto proposal ─────────────────────────────────────────────────────────
    //
    // Authority can veto a Passed proposal during the timelock window,
    // before execute_proposal is called.
    //
    // This is the standard security mechanism in serious governance systems
    // (Compound, Aave, Maker). If a malicious proposal slips through, the
    // authority has one last line of defense before funds move.
    //
    // After the timelock expires OR after is_executed=true, veto is impossible.
    // This prevents the authority from becoming a permanent blocker.

    pub fn veto_proposal(ctx: Context<VetoProposal>) -> Result<()> {
        voting::veto_proposal(ctx)
    }

    // ── Phase 1 — Commit ──────────────────────────────────────────────────────
    //
    // commitment = sha256(vote_byte ‖ salt_32 ‖ proposal_pubkey_32 ‖ voter_pubkey_32)
    //
    // Both chamber weights are snapshotted at commit time to prevent:
    //   "buy tokens → vote → dump tokens immediately"
    //
    // voter_reveal_authority: optional keeper pubkey.
    //   - Cannot change the vote (hash is committed).
    //   - Can submit the reveal if voter is unavailable.
    //   - Earns the SOL rebate for the service.

    pub fn commit_vote(
        ctx: Context<CommitVote>,
        commitment: [u8; 32],
        voter_reveal_authority: Option<Pubkey>,
    ) -> Result<()> {
        voting::commit_vote(ctx, commitment, voter_reveal_authority)
    }

    // ── Vote delegation ───────────────────────────────────────────────────────
    //
    // Delegator grants their token weight to a delegatee for exactly this proposal.
    // The delegatee commits+reveals combining both balances.
    //
    // Privacy is fully preserved:
    //   - Delegatee chooses the vote and salt independently
    //   - Tally stays 0/0 throughout commit phase
    //   - No other Solana governance tool supports private delegation

    pub fn delegate_vote(ctx: Context<DelegateVote>, delegatee: Pubkey) -> Result<()> {
        voting::delegate_vote(ctx, delegatee)
    }

    // ── Commit with delegation ────────────────────────────────────────────────
    //
    // Delegatee commits their own weight PLUS the delegated weight.
    // The commitment preimage uses the delegatee's pubkey, so reveal is identical
    // to a normal reveal — no special handling needed.

    pub fn commit_delegated_vote(
        ctx: Context<CommitDelegatedVote>,
        commitment: [u8; 32],
        voter_reveal_authority: Option<Pubkey>,
    ) -> Result<()> {
        voting::commit_delegated_vote(ctx, commitment, voter_reveal_authority)
    }

    // ── Phase 2 — Reveal ──────────────────────────────────────────────────────
    //
    // Voter or authorized keeper submits (vote, salt).
    // Program recomputes sha256(vote_byte ‖ salt ‖ proposal_pubkey ‖ voter_pubkey)
    // and verifies.
    // Replay stays proposal-scoped through the VoteRecord PDA and lifecycle
    // flags. On match, both chamber tallies update. The rebate comes from the
    // proposal account only when it remains rent-safe.

    pub fn reveal_vote(ctx: Context<RevealVote>, vote: bool, salt: [u8; 32]) -> Result<()> {
        voting::reveal_vote(ctx, vote, salt)
    }

    pub fn reveal_vote_v3(ctx: Context<RevealVoteV3>, vote: bool, salt: [u8; 32]) -> Result<()> {
        voting::reveal_vote_v3(ctx, vote, salt)
    }

    // ── Phase 3a — Finalize ───────────────────────────────────────────────────
    //
    // Permissionless. Anyone calls after reveal_end.
    //
    // Evaluates pass/fail based on VotingConfig:
    //   TokenWeighted → yes_capital  > no_capital,   quorum met
    //   Quadratic     → yes_community > no_community, quorum met
    //   DualChamber   → BOTH chambers must independently clear their threshold
    //
    // If passed: sets execution_unlocks_at = now + dao.execution_delay_seconds
    // Funds do NOT move here. Call execute_proposal after the timelock.
    // During the timelock, authority can call veto_proposal to block execution.

    pub fn finalize_proposal(ctx: Context<FinalizeProposal>) -> Result<()> {
        voting::finalize_proposal(ctx)
    }

    pub fn finalize_proposal_v3(ctx: Context<FinalizeProposalV3>) -> Result<()> {
        voting::finalize_proposal_v3(ctx)
    }

    // ── Phase 3b — Execute ────────────────────────────────────────────────────
    //
    // Permissionless. Anyone calls after execution_unlocks_at.
    // Fires the treasury CPI attached to the proposal.
    //
    // Two-step design (finalize → execute) mirrors Compound Governor Bravo:
    //   finalize = compute result (instant, no funds move)
    //   execute  = move funds     (only after timelock + no veto)

    pub fn execute_proposal(ctx: Context<ExecuteProposal>) -> Result<()> {
        treasury::execute_proposal(ctx)
    }

    pub fn execute_confidential_payout_plan(
        ctx: Context<ExecuteConfidentialPayoutPlan>,
    ) -> Result<()> {
        treasury::execute_confidential_payout_plan(ctx)
    }

    pub fn execute_confidential_payout_plan_v2(
        ctx: Context<ExecuteConfidentialPayoutPlanV2>,
    ) -> Result<()> {
        treasury::execute_confidential_payout_plan_v2(ctx)
    }

    pub fn execute_confidential_payout_plan_v3(
        ctx: Context<ExecuteConfidentialPayoutPlanV3>,
    ) -> Result<()> {
        treasury::execute_confidential_payout_plan_v3(ctx)
    }

    // ── Fund treasury ─────────────────────────────────────────────────────────

    pub fn deposit_treasury(ctx: Context<DepositTreasury>, amount: u64) -> Result<()> {
        treasury::deposit_treasury(ctx, amount)
    }

    // ── Realms voter weight plugin ─────────────────────────────────────────────
    //
    // Implements spl-governance-addin-api VoterWeightRecord exactly.
    // Any Realms DAO can add PrivateDAO as a voter weight plugin today.
    // Weight expires after a bounded slot window to stay fresh without forcing
    // governance clients to refresh every few dozen seconds under normal
    // Solana slot times.
    // DualChamber exports the community chamber weight here; capital weight is
    // enforced inside PrivateDAO proposal finalization, not in this one record.

    pub fn update_voter_weight_record(ctx: Context<UpdateVoterWeightRecord>) -> Result<()> {
        voting::update_voter_weight_record(ctx)
    }

    pub fn update_voter_weight_record_v2(
        ctx: Context<UpdateVoterWeightRecordV2>,
        scope: VoterWeightScope,
    ) -> Result<()> {
        voting::update_voter_weight_record_v2(ctx, scope)
    }

    pub fn get_voter_weight_record(ctx: Context<GetVoterWeightRecord>) -> Result<u64> {
        voting::get_voter_weight_record(ctx)
    }

    // ── ZK proof anchor ──────────────────────────────────────────────────────
    //
    // Records a proposal-bound zk proof anchor on-chain without changing the
    // live governance lifecycle semantics. This makes the proof surface
    // visible on Solscan and binds proof/public/vkey/bundle hashes to a real
    // DAO proposal.

    pub fn anchor_zk_proof(
        ctx: Context<AnchorZkProof>,
        layer: ZkProofLayer,
        proof_system: ZkProofSystem,
        proof_hash: [u8; 32],
        public_inputs_hash: [u8; 32],
        verification_key_hash: [u8; 32],
        bundle_hash: [u8; 32],
    ) -> Result<()> {
        privacy::anchor_zk_proof(
            ctx,
            layer,
            proof_system,
            proof_hash,
            public_inputs_hash,
            verification_key_hash,
            bundle_hash,
        )
    }

    // ── ZK verifier path receipt ────────────────────────────────────────────
    //
    // Phase A: keeps commit-reveal as the canonical live path while adding a
    // proposal-bound on-chain verification receipt path in parallel.
    //
    // This does not replace the current enforcement boundary yet. It records
    // that an anchored proof bundle has been accepted by the parallel verifier
    // path and binds that acceptance on-chain for the same proposal and layer.

    pub fn verify_zk_proof_on_chain(
        ctx: Context<VerifyZkProofOnChain>,
        layer: ZkProofLayer,
        verification_mode: ZkVerificationMode,
        verifier_program: Option<Pubkey>,
    ) -> Result<()> {
        privacy::verify_zk_proof_on_chain(ctx, layer, verification_mode, verifier_program)
    }

    pub fn configure_proposal_zk_mode(
        ctx: Context<ConfigureProposalZkMode>,
        mode: ProposalZkMode,
    ) -> Result<()> {
        privacy::configure_proposal_zk_mode(ctx, mode)
    }

    pub fn finalize_zk_enforced_proposal(ctx: Context<FinalizeZkEnforcedProposal>) -> Result<()> {
        privacy::finalize_zk_enforced_proposal(ctx)
    }

    pub fn snapshot_proposal_execution_policy(
        ctx: Context<SnapshotProposalExecutionPolicy>,
    ) -> Result<()> {
        privacy::snapshot_proposal_execution_policy(ctx)
    }

    pub fn snapshot_proposal_governance_policy_v3(
        ctx: Context<SnapshotProposalGovernancePolicyV3>,
    ) -> Result<()> {
        privacy::snapshot_proposal_governance_policy_v3(ctx)
    }

    pub fn snapshot_proposal_settlement_policy_v3(
        ctx: Context<SnapshotProposalSettlementPolicyV3>,
    ) -> Result<()> {
        privacy::snapshot_proposal_settlement_policy_v3(ctx)
    }

    pub fn fund_reveal_rebate_vault_v3(
        ctx: Context<FundRevealRebateVaultV3>,
        amount: u64,
    ) -> Result<()> {
        privacy::fund_reveal_rebate_vault_v3(ctx, amount)
    }

    pub fn record_proof_verification_v2(
        ctx: Context<RecordProofVerificationV2>,
        verification_kind: VerificationKind,
        payload_hash: [u8; 32],
        proof_hash: [u8; 32],
        public_inputs_hash: [u8; 32],
        verification_key_hash: [u8; 32],
        domain_separator: [u8; 32],
    ) -> Result<()> {
        privacy::record_proof_verification_v2(
            ctx,
            verification_kind,
            payload_hash,
            proof_hash,
            public_inputs_hash,
            verification_key_hash,
            domain_separator,
        )
    }

    pub fn finalize_zk_enforced_proposal_v2(
        ctx: Context<FinalizeZkEnforcedProposalV2>,
    ) -> Result<()> {
        privacy::finalize_zk_enforced_proposal_v2(ctx)
    }

    pub fn finalize_zk_enforced_proposal_v3(
        ctx: Context<FinalizeZkEnforcedProposalV3>,
    ) -> Result<()> {
        privacy::finalize_zk_enforced_proposal_v3(ctx)
    }

    pub fn record_settlement_evidence_v2(
        ctx: Context<RecordSettlementEvidenceV2>,
        kind: SettlementEvidenceKind,
        settlement_id: [u8; 32],
        evidence_hash: [u8; 32],
        payout_fields_hash: [u8; 32],
    ) -> Result<()> {
        privacy::record_settlement_evidence_v2(
            ctx,
            kind,
            settlement_id,
            evidence_hash,
            payout_fields_hash,
        )
    }
}

// ── Account contexts ──────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(dao_name: String)]
pub struct InitializeDao<'info> {
    #[account(
        init, payer = authority, space = Dao::LEN,
        seeds = [b"dao", authority.key().as_ref(), dao_name.as_bytes()], bump
    )]
    pub dao: Box<Account<'info, Dao>>,
    pub governance_token: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(dao_name: String)]
pub struct MigrateFromRealms<'info> {
    #[account(
        init, payer = authority, space = Dao::LEN,
        seeds = [b"dao", authority.key().as_ref(), dao_name.as_bytes()], bump
    )]
    pub dao: Account<'info, Dao>,
    pub governance_token: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TransferDaoAuthority<'info> {
    #[account(
        mut,
        constraint = dao.authority == authority.key() @ Error::UnauthorizedDaoAuthorityTransfer
    )]
    pub dao: Account<'info, Dao>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct InitializeTreasuryOperatorAuthority<'info> {
    #[account(has_one = authority)]
    pub dao: Account<'info, Dao>,
    #[account(
        init_if_needed,
        payer = authority,
        space = TreasuryOperatorAuthority::LEN,
        seeds = [b"treasury-operator-authority", dao.key().as_ref()],
        bump
    )]
    pub treasury_operator_authority: Account<'info, TreasuryOperatorAuthority>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TransferTreasuryOperatorAuthority<'info> {
    pub dao: Account<'info, Dao>,
    #[account(
        mut,
        seeds = [b"treasury-operator-authority", dao.key().as_ref()],
        bump = treasury_operator_authority.bump,
        constraint = treasury_operator_authority.dao == dao.key() @ Error::UnauthorizedTreasuryOperatorAuthorityTransfer,
        constraint = treasury_operator_authority.authority == authority.key() @ Error::UnauthorizedTreasuryOperatorAuthorityTransfer
    )]
    pub treasury_operator_authority: Account<'info, TreasuryOperatorAuthority>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct InitializeDaoSecurityPolicy<'info> {
    #[account(has_one = authority)]
    pub dao: Account<'info, Dao>,
    #[account(
        init_if_needed,
        payer = authority,
        space = DaoSecurityPolicy::LEN,
        seeds = [b"dao-security-policy", dao.key().as_ref()],
        bump
    )]
    pub dao_security_policy: Account<'info, DaoSecurityPolicy>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateDaoSecurityPolicyV2<'info> {
    #[account(has_one = authority)]
    pub dao: Account<'info, Dao>,
    #[account(
        mut,
        seeds = [b"dao-security-policy", dao.key().as_ref()],
        bump = dao_security_policy.bump,
        constraint = dao_security_policy.dao == dao.key() @ Error::SecurityPolicyMismatch,
        constraint = dao_security_policy.authority == authority.key() @ Error::UnauthorizedConfidentialPayoutOperator
    )]
    pub dao_security_policy: Account<'info, DaoSecurityPolicy>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct InitializeDaoGovernancePolicyV3<'info> {
    #[account(has_one = authority)]
    pub dao: Account<'info, Dao>,
    #[account(
        init_if_needed,
        payer = authority,
        space = DaoGovernancePolicyV3::LEN,
        seeds = [b"dao-governance-policy-v3", dao.key().as_ref()],
        bump
    )]
    pub dao_governance_policy_v3: Account<'info, DaoGovernancePolicyV3>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateDaoGovernancePolicyV3<'info> {
    #[account(has_one = authority)]
    pub dao: Account<'info, Dao>,
    #[account(
        mut,
        seeds = [b"dao-governance-policy-v3", dao.key().as_ref()],
        bump = dao_governance_policy_v3.bump,
        constraint = dao_governance_policy_v3.dao == dao.key() @ Error::GovernancePolicyMismatch,
        constraint = dao_governance_policy_v3.authority == authority.key() @ Error::GovernancePolicyMismatch
    )]
    pub dao_governance_policy_v3: Account<'info, DaoGovernancePolicyV3>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct InitializeDaoSettlementPolicyV3<'info> {
    #[account(has_one = authority)]
    pub dao: Account<'info, Dao>,
    #[account(
        init_if_needed,
        payer = authority,
        space = DaoSettlementPolicyV3::LEN,
        seeds = [b"dao-settlement-policy-v3", dao.key().as_ref()],
        bump
    )]
    pub dao_settlement_policy_v3: Account<'info, DaoSettlementPolicyV3>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateDaoSettlementPolicyV3<'info> {
    #[account(has_one = authority)]
    pub dao: Account<'info, Dao>,
    #[account(
        mut,
        seeds = [b"dao-settlement-policy-v3", dao.key().as_ref()],
        bump = dao_settlement_policy_v3.bump,
        constraint = dao_settlement_policy_v3.dao == dao.key() @ Error::SettlementPolicyMismatch,
        constraint = dao_settlement_policy_v3.authority == authority.key() @ Error::SettlementPolicyMismatch
    )]
    pub dao_settlement_policy_v3: Account<'info, DaoSettlementPolicyV3>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(title: String)]
pub struct CreateProposal<'info> {
    #[account(mut)]
    pub dao: Account<'info, Dao>,
    #[account(
        init, payer = proposer, space = Proposal::LEN,
        seeds = [b"proposal", dao.key().as_ref(), dao.proposal_count.to_le_bytes().as_ref()],
        bump
    )]
    pub proposal: Box<Account<'info, Proposal>>,
    #[account(
        constraint = proposer_token_account.owner == proposer.key(),
        constraint = proposer_token_account.mint == dao.governance_token,
    )]
    pub proposer_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub proposer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelProposal<'info> {
    #[account(has_one = authority)]
    pub dao: Account<'info, Dao>,
    #[account(
        mut, has_one = dao,
        seeds = [b"proposal", dao.key().as_ref(), proposal.proposal_id.to_le_bytes().as_ref()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CancelProposalV2<'info> {
    #[account(has_one = authority)]
    pub dao: Account<'info, Dao>,
    #[account(
        seeds = [b"dao-security-policy", dao.key().as_ref()],
        bump = dao_security_policy.bump,
        constraint = dao_security_policy.dao == dao.key() @ Error::SecurityPolicyMismatch
    )]
    pub dao_security_policy: Account<'info, DaoSecurityPolicy>,
    #[account(
        mut, has_one = dao,
        seeds = [b"proposal", dao.key().as_ref(), proposal.proposal_id.to_le_bytes().as_ref()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct VetoProposal<'info> {
    #[account(has_one = authority)]
    pub dao: Account<'info, Dao>,
    #[account(
        mut, has_one = dao,
        seeds = [b"proposal", dao.key().as_ref(), proposal.proposal_id.to_le_bytes().as_ref()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CommitVote<'info> {
    pub dao: Account<'info, Dao>,
    #[account(
        mut, has_one = dao,
        seeds = [b"proposal", dao.key().as_ref(), proposal.proposal_id.to_le_bytes().as_ref()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(
        init, payer = voter, space = VoterRecord::LEN,
        seeds = [b"vote", proposal.key().as_ref(), voter.key().as_ref()], bump
    )]
    pub voter_record: Account<'info, VoterRecord>,
    /// CHECK: proposal-scoped delegation marker for this voter. PDA may be
    /// uninitialized; only its existence matters.
    #[account(
        seeds = [b"delegation", proposal.key().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub delegation_marker: UncheckedAccount<'info>,
    // Verify token account belongs to the voter and uses the DAO's governance mint
    #[account(
        constraint = voter_token_account.owner == voter.key(),
        constraint = voter_token_account.mint  == dao.governance_token,
    )]
    pub voter_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub voter: Signer<'info>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DelegateVote<'info> {
    pub dao: Account<'info, Dao>,
    #[account(
        has_one = dao,
        seeds = [b"proposal", dao.key().as_ref(), proposal.proposal_id.to_le_bytes().as_ref()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(
        init, payer = delegator, space = VoteDelegation::LEN,
        seeds = [b"delegation", proposal.key().as_ref(), delegator.key().as_ref()], bump
    )]
    pub delegation: Account<'info, VoteDelegation>,
    /// CHECK: proposal-scoped direct vote marker for this delegator. PDA may
    /// be uninitialized; only its existence matters.
    #[account(
        seeds = [b"vote", proposal.key().as_ref(), delegator.key().as_ref()],
        bump
    )]
    pub direct_vote_marker: UncheckedAccount<'info>,
    // Verify token account belongs to the delegator and uses the DAO's governance mint
    #[account(
        constraint = delegator_token_account.owner == delegator.key(),
        constraint = delegator_token_account.mint  == dao.governance_token,
    )]
    pub delegator_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub delegator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CommitDelegatedVote<'info> {
    pub dao: Account<'info, Dao>,
    #[account(
        mut, has_one = dao,
        seeds = [b"proposal", dao.key().as_ref(), proposal.proposal_id.to_le_bytes().as_ref()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(
        mut,
        seeds = [b"delegation", proposal.key().as_ref(), delegation.delegator.as_ref()],
        bump = delegation.bump,
        constraint = delegation.delegatee == delegatee.key() @ Error::NotDelegatee,
        constraint = delegation.proposal  == proposal.key()  @ Error::WrongProposal,
    )]
    pub delegation: Account<'info, VoteDelegation>,
    /// CHECK: proposal-scoped direct vote marker for the delegator. PDA may
    /// be uninitialized; only its existence matters.
    #[account(
        seeds = [b"vote", proposal.key().as_ref(), delegation.delegator.as_ref()],
        bump
    )]
    pub delegator_vote_marker: UncheckedAccount<'info>,
    #[account(
        init, payer = delegatee, space = VoterRecord::LEN,
        seeds = [b"vote", proposal.key().as_ref(), delegatee.key().as_ref()], bump
    )]
    pub voter_record: Account<'info, VoterRecord>,
    #[account(
        constraint = delegatee_token_account.owner == delegatee.key(),
        constraint = delegatee_token_account.mint  == dao.governance_token,
    )]
    pub delegatee_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub delegatee: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevealVote<'info> {
    #[account(
        mut,
        seeds = [b"proposal", proposal.dao.as_ref(), proposal.proposal_id.to_le_bytes().as_ref()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(
        mut,
        seeds = [b"vote", proposal.key().as_ref(), voter_record.voter.as_ref()],
        bump = voter_record.bump
    )]
    pub voter_record: Account<'info, VoterRecord>,
    #[account(mut)]
    pub revealer: Signer<'info>,
}

#[derive(Accounts)]
pub struct RevealVoteV3<'info> {
    #[account(
        mut,
        seeds = [b"proposal", proposal.dao.as_ref(), proposal.proposal_id.to_le_bytes().as_ref()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(
        mut,
        seeds = [b"vote", proposal.key().as_ref(), voter_record.voter.as_ref()],
        bump = voter_record.bump
    )]
    pub voter_record: Account<'info, VoterRecord>,
    #[account(
        seeds = [b"proposal-governance-snapshot-v3", proposal.key().as_ref()],
        bump = proposal_governance_policy_snapshot_v3.bump
    )]
    pub proposal_governance_policy_snapshot_v3: Account<'info, ProposalGovernancePolicySnapshotV3>,
    #[account(mut, seeds = [b"reveal-rebate-vault-v3", proposal.dao.as_ref()], bump = reveal_rebate_vault.bump)]
    pub reveal_rebate_vault: Account<'info, RevealRebateVaultV3State>,
    #[account(mut)]
    pub revealer: Signer<'info>,
}

#[derive(Accounts)]
pub struct FinalizeProposal<'info> {
    pub dao: Account<'info, Dao>,
    #[account(
        mut, has_one = dao,
        seeds = [b"proposal", dao.key().as_ref(), proposal.proposal_id.to_le_bytes().as_ref()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,
    pub finalizer: Signer<'info>,
}

#[derive(Accounts)]
pub struct FinalizeProposalV3<'info> {
    pub dao: Account<'info, Dao>,
    #[account(
        mut, has_one = dao,
        seeds = [b"proposal", dao.key().as_ref(), proposal.proposal_id.to_le_bytes().as_ref()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(
        seeds = [b"proposal-governance-snapshot-v3", proposal.key().as_ref()],
        bump = proposal_governance_policy_snapshot_v3.bump
    )]
    pub proposal_governance_policy_snapshot_v3: Account<'info, ProposalGovernancePolicySnapshotV3>,
    pub finalizer: Signer<'info>,
}

#[derive(Accounts)]
pub struct ExecuteProposal<'info> {
    pub dao: Account<'info, Dao>,
    #[account(
        mut, has_one = dao,
        seeds = [b"proposal", dao.key().as_ref(), proposal.proposal_id.to_le_bytes().as_ref()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,
    /// Treasury PDA — holds SOL for SendSol actions
    #[account(mut, seeds = [b"treasury", dao.key().as_ref()], bump)]
    pub treasury: SystemAccount<'info>,
    pub executor: Signer<'info>,
    /// CHECK: recipient for SOL or CustomCPI actions — validated by transfer CPI
    #[account(mut)]
    pub treasury_recipient: UncheckedAccount<'info>,
    /// CHECK: source token account for SendToken actions — validated by token CPI at runtime.
    ///        Pass any account (e.g. treasury PDA) for non-SendToken actions.
    #[account(mut)]
    pub treasury_token_account: UncheckedAccount<'info>,
    /// CHECK: destination token account for SendToken actions — validated by token CPI at runtime.
    ///        Pass any account (e.g. treasury PDA) for non-SendToken actions.
    #[account(mut)]
    pub recipient_token_account: UncheckedAccount<'info>,
    /// CHECK: if a confidential payout plan exists for this proposal, the standard execute path must reject.
    #[account(
        seeds = [b"payout-plan", proposal.key().as_ref()],
        bump
    )]
    pub confidential_payout_plan: UncheckedAccount<'info>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ConfigureConfidentialPayoutPlan<'info> {
    pub dao: Account<'info, Dao>,
    #[account(
        mut,
        has_one = dao,
        seeds = [b"proposal", dao.key().as_ref(), proposal.proposal_id.to_le_bytes().as_ref()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(
        init_if_needed,
        payer = operator,
        space = ConfidentialPayoutPlan::LEN,
        seeds = [b"payout-plan", proposal.key().as_ref()],
        bump
    )]
    pub confidential_payout_plan: Account<'info, ConfidentialPayoutPlan>,
    #[account(mut)]
    pub operator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteConfidentialPayoutPlan<'info> {
    pub dao: Account<'info, Dao>,
    #[account(
        mut,
        has_one = dao,
        seeds = [b"proposal", dao.key().as_ref(), proposal.proposal_id.to_le_bytes().as_ref()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(
        mut,
        seeds = [b"payout-plan", proposal.key().as_ref()],
        bump = confidential_payout_plan.bump
    )]
    pub confidential_payout_plan: Account<'info, ConfidentialPayoutPlan>,
    #[account(mut, seeds = [b"treasury", dao.key().as_ref()], bump)]
    pub treasury: SystemAccount<'info>,
    pub executor: Signer<'info>,
    /// CHECK: settlement wallet for the encrypted payout batch
    #[account(mut)]
    pub settlement_recipient: UncheckedAccount<'info>,
    /// CHECK: source token ATA for token payout batches; ignored for SOL payout batches
    #[account(mut)]
    pub treasury_token_account: UncheckedAccount<'info>,
    /// CHECK: destination token ATA for token payout batches; ignored for SOL payout batches
    #[account(mut)]
    pub recipient_token_account: UncheckedAccount<'info>,
    /// CHECK: optional REFHE envelope for proposal-bound confidential execution
    #[account(
        seeds = [b"refhe-envelope", proposal.key().as_ref()],
        bump
    )]
    pub refhe_envelope: UncheckedAccount<'info>,
    /// CHECK: optional MagicBlock private payments corridor for token settlement hardening
    #[account(
        seeds = [b"magicblock-corridor", proposal.key().as_ref()],
        bump
    )]
    pub magicblock_private_payment_corridor: UncheckedAccount<'info>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteConfidentialPayoutPlanV2<'info> {
    pub dao: Box<Account<'info, Dao>>,
    #[account(
        mut,
        has_one = dao,
        seeds = [b"proposal", dao.key().as_ref(), proposal.proposal_id.to_le_bytes().as_ref()],
        bump = proposal.bump
    )]
    pub proposal: Box<Account<'info, Proposal>>,
    #[account(
        seeds = [b"proposal-policy-snapshot", proposal.key().as_ref()],
        bump = proposal_execution_policy_snapshot.bump,
        constraint = proposal_execution_policy_snapshot.dao == dao.key() @ Error::PolicySnapshotMismatch,
        constraint = proposal_execution_policy_snapshot.proposal == proposal.key() @ Error::PolicySnapshotMismatch
    )]
    pub proposal_execution_policy_snapshot: Box<Account<'info, ProposalExecutionPolicySnapshot>>,
    #[account(
        mut,
        seeds = [b"payout-plan", proposal.key().as_ref()],
        bump = confidential_payout_plan.bump
    )]
    pub confidential_payout_plan: Box<Account<'info, ConfidentialPayoutPlan>>,
    #[account(
        seeds = [
            b"settlement-evidence",
            proposal.key().as_ref(),
            confidential_payout_plan.key().as_ref(),
            settlement_evidence.settlement_id.as_ref()
        ],
        bump = settlement_evidence.bump
    )]
    pub settlement_evidence: Box<Account<'info, SettlementEvidence>>,
    #[account(
        init,
        payer = executor,
        space = SettlementConsumptionRecord::LEN,
        seeds = [b"settlement-consumption", settlement_evidence.key().as_ref()],
        bump
    )]
    pub settlement_consumption_record: Box<Account<'info, SettlementConsumptionRecord>>,
    #[account(mut, seeds = [b"treasury", dao.key().as_ref()], bump)]
    pub treasury: SystemAccount<'info>,
    #[account(mut)]
    pub executor: Signer<'info>,
    /// CHECK: settlement wallet for the encrypted payout batch
    #[account(mut)]
    pub settlement_recipient: UncheckedAccount<'info>,
    /// CHECK: source token ATA for token payout batches; ignored for SOL payout batches
    #[account(mut)]
    pub treasury_token_account: UncheckedAccount<'info>,
    /// CHECK: destination token ATA for token payout batches; ignored for SOL payout batches
    #[account(mut)]
    pub recipient_token_account: UncheckedAccount<'info>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteConfidentialPayoutPlanV3<'info> {
    pub dao: Box<Account<'info, Dao>>,
    #[account(
        mut,
        has_one = dao,
        seeds = [b"proposal", dao.key().as_ref(), proposal.proposal_id.to_le_bytes().as_ref()],
        bump = proposal.bump
    )]
    pub proposal: Box<Account<'info, Proposal>>,
    #[account(
        mut,
        seeds = [b"payout-plan", proposal.key().as_ref()],
        bump = confidential_payout_plan.bump
    )]
    pub confidential_payout_plan: Box<Account<'info, ConfidentialPayoutPlan>>,
    #[account(
        seeds = [b"proposal-settlement-policy-v3", proposal.key().as_ref()],
        bump = proposal_settlement_policy_snapshot_v3.bump,
        constraint = proposal_settlement_policy_snapshot_v3.dao == dao.key() @ Error::SettlementPolicySnapshotMismatch,
        constraint = proposal_settlement_policy_snapshot_v3.proposal == proposal.key() @ Error::SettlementPolicySnapshotMismatch,
        constraint = proposal_settlement_policy_snapshot_v3.payout_plan == confidential_payout_plan.key() @ Error::SettlementPolicySnapshotMismatch
    )]
    pub proposal_settlement_policy_snapshot_v3:
        Box<Account<'info, ProposalSettlementPolicySnapshotV3>>,
    #[account(
        seeds = [
            b"settlement-evidence",
            proposal.key().as_ref(),
            confidential_payout_plan.key().as_ref(),
            settlement_evidence.settlement_id.as_ref()
        ],
        bump = settlement_evidence.bump
    )]
    pub settlement_evidence: Box<Account<'info, SettlementEvidence>>,
    #[account(
        init,
        payer = executor,
        space = SettlementConsumptionRecord::LEN,
        seeds = [b"settlement-consumption", settlement_evidence.key().as_ref()],
        bump
    )]
    pub settlement_consumption_record: Box<Account<'info, SettlementConsumptionRecord>>,
    #[account(mut, seeds = [b"treasury", dao.key().as_ref()], bump)]
    pub treasury: SystemAccount<'info>,
    #[account(mut)]
    pub executor: Signer<'info>,
    /// CHECK: settlement wallet for the encrypted payout batch
    #[account(mut)]
    pub settlement_recipient: UncheckedAccount<'info>,
    /// CHECK: source token ATA for token payout batches; ignored for SOL payout batches
    #[account(mut)]
    pub treasury_token_account: UncheckedAccount<'info>,
    /// CHECK: destination token ATA for token payout batches; ignored for SOL payout batches
    #[account(mut)]
    pub recipient_token_account: UncheckedAccount<'info>,
    /// CHECK: policy-checked REFHE envelope for proposal-bound confidential execution
    #[account(
        seeds = [b"refhe-envelope", proposal.key().as_ref()],
        bump
    )]
    pub refhe_envelope: UncheckedAccount<'info>,
    /// CHECK: policy-checked MagicBlock private payments corridor
    #[account(
        seeds = [b"magicblock-corridor", proposal.key().as_ref()],
        bump
    )]
    pub magicblock_private_payment_corridor: UncheckedAccount<'info>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ConfigureRefheEnvelope<'info> {
    pub dao: Account<'info, Dao>,
    #[account(
        has_one = dao,
        seeds = [b"proposal", dao.key().as_ref(), proposal.proposal_id.to_le_bytes().as_ref()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(
        seeds = [b"payout-plan", proposal.key().as_ref()],
        bump = confidential_payout_plan.bump
    )]
    pub confidential_payout_plan: Account<'info, ConfidentialPayoutPlan>,
    #[account(
        init_if_needed,
        payer = operator,
        space = RefheEnvelope::LEN,
        seeds = [b"refhe-envelope", proposal.key().as_ref()],
        bump
    )]
    pub refhe_envelope: Account<'info, RefheEnvelope>,
    #[account(mut)]
    pub operator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleRefheEnvelope<'info> {
    pub dao: Account<'info, Dao>,
    #[account(
        has_one = dao,
        seeds = [b"proposal", dao.key().as_ref(), proposal.proposal_id.to_le_bytes().as_ref()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(
        seeds = [b"payout-plan", proposal.key().as_ref()],
        bump = confidential_payout_plan.bump
    )]
    pub confidential_payout_plan: Account<'info, ConfidentialPayoutPlan>,
    #[account(
        mut,
        seeds = [b"refhe-envelope", proposal.key().as_ref()],
        bump = refhe_envelope.bump
    )]
    pub refhe_envelope: Account<'info, RefheEnvelope>,
    #[account(mut)]
    pub operator: Signer<'info>,
}

#[derive(Accounts)]
pub struct ConfigureMagicBlockPrivatePaymentCorridor<'info> {
    pub dao: Account<'info, Dao>,
    #[account(
        has_one = dao,
        seeds = [b"proposal", dao.key().as_ref(), proposal.proposal_id.to_le_bytes().as_ref()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(
        seeds = [b"payout-plan", proposal.key().as_ref()],
        bump = confidential_payout_plan.bump
    )]
    pub confidential_payout_plan: Account<'info, ConfidentialPayoutPlan>,
    #[account(
        init_if_needed,
        payer = operator,
        space = MagicBlockPrivatePaymentCorridor::LEN,
        seeds = [b"magicblock-corridor", proposal.key().as_ref()],
        bump
    )]
    pub magicblock_private_payment_corridor: Account<'info, MagicBlockPrivatePaymentCorridor>,
    #[account(mut)]
    pub operator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleMagicBlockPrivatePaymentCorridor<'info> {
    pub dao: Account<'info, Dao>,
    #[account(
        has_one = dao,
        seeds = [b"proposal", dao.key().as_ref(), proposal.proposal_id.to_le_bytes().as_ref()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(
        seeds = [b"payout-plan", proposal.key().as_ref()],
        bump = confidential_payout_plan.bump
    )]
    pub confidential_payout_plan: Account<'info, ConfidentialPayoutPlan>,
    #[account(
        mut,
        seeds = [b"magicblock-corridor", proposal.key().as_ref()],
        bump = magicblock_private_payment_corridor.bump
    )]
    pub magicblock_private_payment_corridor: Account<'info, MagicBlockPrivatePaymentCorridor>,
    #[account(mut)]
    pub operator: Signer<'info>,
}

#[derive(Accounts)]
pub struct DepositTreasury<'info> {
    pub dao: Account<'info, Dao>,
    #[account(mut, seeds = [b"treasury", dao.key().as_ref()], bump)]
    pub treasury: SystemAccount<'info>,
    #[account(mut)]
    pub depositor: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateVoterWeightRecord<'info> {
    pub dao: Account<'info, Dao>,
    /// CHECK: Realms realm account — not owned by this program
    pub realm: UncheckedAccount<'info>,
    #[account(
        constraint = governing_token_mint.key() == dao.governance_token @ Error::GoverningMintMismatch
    )]
    pub governing_token_mint: InterfaceAccount<'info, Mint>,
    #[account(
        init_if_needed, payer = voter, space = VoterWeightRecord::LEN,
        seeds = [
            b"voter-weight-record",
            realm.key().as_ref(),
            governing_token_mint.key().as_ref(),
            voter.key().as_ref()
        ],
        bump
    )]
    pub voter_weight_record: Account<'info, VoterWeightRecord>,
    #[account(
        constraint = voter_token_account.owner == voter.key(),
        constraint = voter_token_account.mint  == dao.governance_token,
    )]
    pub voter_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub voter: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(scope: VoterWeightScope)]
pub struct UpdateVoterWeightRecordV2<'info> {
    pub dao: Account<'info, Dao>,
    /// CHECK: Realms realm account — not owned by this program
    pub realm: UncheckedAccount<'info>,
    #[account(
        constraint = governing_token_mint.key() == dao.governance_token @ Error::GoverningMintMismatch
    )]
    pub governing_token_mint: InterfaceAccount<'info, Mint>,
    #[account(
        init_if_needed, payer = voter, space = VoterWeightRecord::LEN,
        seeds = [
            b"voter-weight-record",
            realm.key().as_ref(),
            governing_token_mint.key().as_ref(),
            voter.key().as_ref()
        ],
        bump
    )]
    pub voter_weight_record: Account<'info, VoterWeightRecord>,
    #[account(
        init_if_needed, payer = voter, space = VoterWeightScopeRecord::LEN,
        seeds = [
            b"voter-weight-scope",
            realm.key().as_ref(),
            governing_token_mint.key().as_ref(),
            voter.key().as_ref(),
            &[scope.seed_byte()]
        ],
        bump
    )]
    pub voter_weight_scope_record: Account<'info, VoterWeightScopeRecord>,
    #[account(
        constraint = voter_token_account.owner == voter.key(),
        constraint = voter_token_account.mint  == dao.governance_token,
    )]
    pub voter_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub voter: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct GetVoterWeightRecord<'info> {
    pub proposal: Account<'info, Proposal>,
    #[account(
        seeds = [b"vote", proposal.key().as_ref(), voter.key().as_ref()],
        bump = voter_record.bump
    )]
    pub voter_record: Account<'info, VoterRecord>,
    /// CHECK: read-only, no mutation
    pub voter: UncheckedAccount<'info>,
}

#[derive(Accounts)]
#[instruction(layer: ZkProofLayer)]
pub struct AnchorZkProof<'info> {
    pub dao: Account<'info, Dao>,
    #[account(
        has_one = dao,
        seeds = [b"proposal", dao.key().as_ref(), proposal.proposal_id.to_le_bytes().as_ref()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(
        init,
        payer = recorder,
        space = ZkProofAnchor::LEN,
        seeds = [b"zk-proof", proposal.key().as_ref(), &[layer.seed_byte()]],
        bump
    )]
    pub zk_proof_anchor: Account<'info, ZkProofAnchor>,
    #[account(mut)]
    pub recorder: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(layer: ZkProofLayer)]
pub struct VerifyZkProofOnChain<'info> {
    pub dao: Account<'info, Dao>,
    #[account(
        has_one = dao,
        seeds = [b"proposal", dao.key().as_ref(), proposal.proposal_id.to_le_bytes().as_ref()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(
        seeds = [b"zk-proof", proposal.key().as_ref(), &[layer.seed_byte()]],
        bump = zk_proof_anchor.bump
    )]
    pub zk_proof_anchor: Account<'info, ZkProofAnchor>,
    #[account(
        init_if_needed,
        payer = verifier,
        space = ZkVerificationReceipt::LEN,
        seeds = [b"zk-verify", proposal.key().as_ref(), &[layer.seed_byte()]],
        bump
    )]
    pub zk_verification_receipt: Account<'info, ZkVerificationReceipt>,
    #[account(mut)]
    pub verifier: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ConfigureProposalZkMode<'info> {
    pub dao: Account<'info, Dao>,
    #[account(
        mut,
        has_one = dao,
        seeds = [b"proposal", dao.key().as_ref(), proposal.proposal_id.to_le_bytes().as_ref()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(
        init_if_needed,
        payer = operator,
        space = ProposalZkPolicy::LEN,
        seeds = [b"zk-policy", proposal.key().as_ref()],
        bump
    )]
    pub proposal_zk_policy: Account<'info, ProposalZkPolicy>,
    /// CHECK: validated by validate_zk_receipt
    pub vote_zk_receipt: UncheckedAccount<'info>,
    /// CHECK: validated by validate_zk_receipt
    pub delegation_zk_receipt: UncheckedAccount<'info>,
    /// CHECK: validated by validate_zk_receipt
    pub tally_zk_receipt: UncheckedAccount<'info>,
    #[account(mut)]
    pub operator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizeZkEnforcedProposal<'info> {
    pub dao: Account<'info, Dao>,
    #[account(
        mut,
        has_one = dao,
        seeds = [b"proposal", dao.key().as_ref(), proposal.proposal_id.to_le_bytes().as_ref()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(
        seeds = [b"zk-policy", proposal.key().as_ref()],
        bump = proposal_zk_policy.bump
    )]
    pub proposal_zk_policy: Account<'info, ProposalZkPolicy>,
    pub finalizer: Signer<'info>,
}

#[derive(Accounts)]
pub struct SnapshotProposalExecutionPolicy<'info> {
    pub dao: Account<'info, Dao>,
    #[account(
        seeds = [b"dao-security-policy", dao.key().as_ref()],
        bump = dao_security_policy.bump,
        constraint = dao_security_policy.dao == dao.key() @ Error::SecurityPolicyMismatch
    )]
    pub dao_security_policy: Account<'info, DaoSecurityPolicy>,
    #[account(
        has_one = dao,
        seeds = [b"proposal", dao.key().as_ref(), proposal.proposal_id.to_le_bytes().as_ref()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(
        init_if_needed,
        payer = operator,
        space = ProposalExecutionPolicySnapshot::LEN,
        seeds = [b"proposal-policy-snapshot", proposal.key().as_ref()],
        bump
    )]
    pub proposal_execution_policy_snapshot: Account<'info, ProposalExecutionPolicySnapshot>,
    #[account(mut)]
    pub operator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SnapshotProposalGovernancePolicyV3<'info> {
    pub dao: Account<'info, Dao>,
    #[account(
        seeds = [b"dao-governance-policy-v3", dao.key().as_ref()],
        bump = dao_governance_policy_v3.bump,
        constraint = dao_governance_policy_v3.dao == dao.key() @ Error::GovernancePolicyMismatch
    )]
    pub dao_governance_policy_v3: Account<'info, DaoGovernancePolicyV3>,
    #[account(
        has_one = dao,
        seeds = [b"proposal", dao.key().as_ref(), proposal.proposal_id.to_le_bytes().as_ref()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(
        constraint = governance_token.key() == dao.governance_token @ Error::GoverningMintMismatch
    )]
    pub governance_token: InterfaceAccount<'info, Mint>,
    #[account(
        init_if_needed,
        payer = operator,
        space = ProposalGovernancePolicySnapshotV3::LEN,
        seeds = [b"proposal-governance-snapshot-v3", proposal.key().as_ref()],
        bump
    )]
    pub proposal_governance_policy_snapshot_v3: Account<'info, ProposalGovernancePolicySnapshotV3>,
    #[account(mut)]
    pub operator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SnapshotProposalSettlementPolicyV3<'info> {
    pub dao: Account<'info, Dao>,
    #[account(
        seeds = [b"dao-settlement-policy-v3", dao.key().as_ref()],
        bump = dao_settlement_policy_v3.bump,
        constraint = dao_settlement_policy_v3.dao == dao.key() @ Error::SettlementPolicyMismatch
    )]
    pub dao_settlement_policy_v3: Account<'info, DaoSettlementPolicyV3>,
    #[account(
        has_one = dao,
        seeds = [b"proposal", dao.key().as_ref(), proposal.proposal_id.to_le_bytes().as_ref()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(
        seeds = [b"payout-plan", proposal.key().as_ref()],
        bump = confidential_payout_plan.bump
    )]
    pub confidential_payout_plan: Account<'info, ConfidentialPayoutPlan>,
    #[account(
        init_if_needed,
        payer = operator,
        space = ProposalSettlementPolicySnapshotV3::LEN,
        seeds = [b"proposal-settlement-policy-v3", proposal.key().as_ref()],
        bump
    )]
    pub proposal_settlement_policy_snapshot_v3: Account<'info, ProposalSettlementPolicySnapshotV3>,
    #[account(mut)]
    pub operator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FundRevealRebateVaultV3<'info> {
    pub dao: Account<'info, Dao>,
    #[account(
        seeds = [b"dao-governance-policy-v3", dao.key().as_ref()],
        bump = dao_governance_policy_v3.bump,
        constraint = dao_governance_policy_v3.dao == dao.key() @ Error::GovernancePolicyMismatch
    )]
    pub dao_governance_policy_v3: Account<'info, DaoGovernancePolicyV3>,
    #[account(
        init_if_needed,
        payer = funder,
        space = RevealRebateVaultV3State::LEN,
        seeds = [b"reveal-rebate-vault-v3", dao.key().as_ref()],
        bump
    )]
    pub reveal_rebate_vault: Account<'info, RevealRebateVaultV3State>,
    #[account(mut)]
    pub funder: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordProofVerificationV2<'info> {
    pub dao: Account<'info, Dao>,
    #[account(
        seeds = [b"dao-security-policy", dao.key().as_ref()],
        bump = dao_security_policy.bump,
        constraint = dao_security_policy.dao == dao.key() @ Error::SecurityPolicyMismatch
    )]
    pub dao_security_policy: Account<'info, DaoSecurityPolicy>,
    #[account(
        has_one = dao,
        seeds = [b"proposal", dao.key().as_ref(), proposal.proposal_id.to_le_bytes().as_ref()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(
        init_if_needed,
        payer = recorder,
        space = ProposalProofVerification::LEN,
        seeds = [b"proposal-proof-verification", proposal.key().as_ref()],
        bump
    )]
    pub proposal_proof_verification: Account<'info, ProposalProofVerification>,
    #[account(mut)]
    pub recorder: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizeZkEnforcedProposalV2<'info> {
    pub dao: Account<'info, Dao>,
    #[account(
        mut,
        has_one = dao,
        seeds = [b"proposal", dao.key().as_ref(), proposal.proposal_id.to_le_bytes().as_ref()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(
        seeds = [b"proposal-policy-snapshot", proposal.key().as_ref()],
        bump = proposal_execution_policy_snapshot.bump
    )]
    pub proposal_execution_policy_snapshot: Account<'info, ProposalExecutionPolicySnapshot>,
    #[account(
        seeds = [b"proposal-proof-verification", proposal.key().as_ref()],
        bump = proposal_proof_verification.bump
    )]
    pub proposal_proof_verification: Account<'info, ProposalProofVerification>,
    pub finalizer: Signer<'info>,
}

#[derive(Accounts)]
pub struct FinalizeZkEnforcedProposalV3<'info> {
    pub dao: Account<'info, Dao>,
    #[account(
        mut,
        has_one = dao,
        seeds = [b"proposal", dao.key().as_ref(), proposal.proposal_id.to_le_bytes().as_ref()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(
        seeds = [b"proposal-policy-snapshot", proposal.key().as_ref()],
        bump = proposal_execution_policy_snapshot.bump
    )]
    pub proposal_execution_policy_snapshot: Account<'info, ProposalExecutionPolicySnapshot>,
    #[account(
        seeds = [b"proposal-governance-snapshot-v3", proposal.key().as_ref()],
        bump = proposal_governance_policy_snapshot_v3.bump
    )]
    pub proposal_governance_policy_snapshot_v3: Account<'info, ProposalGovernancePolicySnapshotV3>,
    #[account(
        seeds = [b"proposal-proof-verification", proposal.key().as_ref()],
        bump = proposal_proof_verification.bump
    )]
    pub proposal_proof_verification: Account<'info, ProposalProofVerification>,
    pub finalizer: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(kind: SettlementEvidenceKind, settlement_id: [u8; 32])]
pub struct RecordSettlementEvidenceV2<'info> {
    pub dao: Box<Account<'info, Dao>>,
    #[account(
        seeds = [b"dao-security-policy", dao.key().as_ref()],
        bump = dao_security_policy.bump,
        constraint = dao_security_policy.dao == dao.key() @ Error::SecurityPolicyMismatch
    )]
    pub dao_security_policy: Box<Account<'info, DaoSecurityPolicy>>,
    #[account(
        has_one = dao,
        seeds = [b"proposal", dao.key().as_ref(), proposal.proposal_id.to_le_bytes().as_ref()],
        bump = proposal.bump
    )]
    pub proposal: Box<Account<'info, Proposal>>,
    #[account(
        seeds = [b"payout-plan", proposal.key().as_ref()],
        bump = confidential_payout_plan.bump
    )]
    pub confidential_payout_plan: Box<Account<'info, ConfidentialPayoutPlan>>,
    #[account(
        init_if_needed,
        payer = recorder,
        space = SettlementEvidence::LEN,
        seeds = [
            b"settlement-evidence",
            proposal.key().as_ref(),
            confidential_payout_plan.key().as_ref(),
            settlement_id.as_ref()
        ],
        bump
    )]
    pub settlement_evidence: Box<Account<'info, SettlementEvidence>>,
    #[account(mut)]
    pub recorder: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// ── State ─────────────────────────────────────────────────────────────────────

#[account]
pub struct DaoSecurityPolicy {
    pub dao: Pubkey,
    pub authority: Pubkey,
    pub mode: EnforcementMode,
    pub zk_policy: FeaturePolicy,
    pub settlement_policy: FeaturePolicy,
    pub cancel_policy: CancelPolicy,
    pub proof_attestors: [Pubkey; MAX_POLICY_ATTESTORS],
    pub proof_attestor_count: u8,
    pub proof_threshold: u8,
    pub settlement_attestors: [Pubkey; MAX_POLICY_ATTESTORS],
    pub settlement_attestor_count: u8,
    pub settlement_threshold: u8,
    pub proof_ttl_seconds: i64,
    pub settlement_ttl_seconds: i64,
    pub emergency_disabled: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

impl DaoSecurityPolicy {
    pub const LEN: usize = 8
        + 32
        + 32
        + 1
        + 1
        + 1
        + 1
        + (32 * MAX_POLICY_ATTESTORS)
        + 1
        + 1
        + (32 * MAX_POLICY_ATTESTORS)
        + 1
        + 1
        + 8
        + 8
        + 1
        + 8
        + 8
        + 1;
}

#[account]
pub struct DaoGovernancePolicyV3 {
    pub dao: Pubkey,
    pub authority: Pubkey,
    pub quorum_policy: QuorumPolicyV3,
    pub reveal_rebate_policy: RevealRebatePolicyV3,
    pub reveal_rebate_lamports: u64,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

impl DaoGovernancePolicyV3 {
    pub const LEN: usize = 8 + 32 + 32 + 1 + 1 + 8 + 8 + 8 + 1;
}

#[account]
pub struct DaoSettlementPolicyV3 {
    pub dao: Pubkey,
    pub authority: Pubkey,
    pub min_evidence_age_seconds: i64,
    pub max_payout_amount: u64,
    pub require_refhe_settlement: bool,
    pub require_magicblock_settlement: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

impl DaoSettlementPolicyV3 {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 1 + 1 + 8 + 8 + 1;
}

#[account]
pub struct ProposalGovernancePolicySnapshotV3 {
    pub dao: Pubkey,
    pub proposal: Pubkey,
    pub quorum_policy: QuorumPolicyV3,
    pub reveal_rebate_policy: RevealRebatePolicyV3,
    pub reveal_rebate_lamports: u64,
    pub eligible_capital: u64,
    pub snapshot_at: i64,
    pub object_version: u8,
    pub bump: u8,
}

impl ProposalGovernancePolicySnapshotV3 {
    pub const LEN: usize = 8 + 32 + 32 + 1 + 1 + 8 + 8 + 8 + 1 + 1;
}

#[account]
pub struct ProposalSettlementPolicySnapshotV3 {
    pub dao: Pubkey,
    pub proposal: Pubkey,
    pub payout_plan: Pubkey,
    pub min_evidence_age_seconds: i64,
    pub max_payout_amount: u64,
    pub require_refhe_settlement: bool,
    pub require_magicblock_settlement: bool,
    pub payout_fields_hash: [u8; 32],
    pub snapshot_at: i64,
    pub object_version: u8,
    pub bump: u8,
}

impl ProposalSettlementPolicySnapshotV3 {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 8 + 8 + 1 + 1 + 32 + 8 + 1 + 1;
}

#[account]
pub struct RevealRebateVaultV3State {
    pub dao: Pubkey,
    pub bump: u8,
}

impl RevealRebateVaultV3State {
    pub const LEN: usize = 8 + 32 + 1;
}

#[account]
pub struct ProposalExecutionPolicySnapshot {
    pub dao: Pubkey,
    pub proposal: Pubkey,
    pub created_under_mode: EnforcementMode,
    pub zk_policy: FeaturePolicy,
    pub settlement_policy: FeaturePolicy,
    pub cancel_policy: CancelPolicy,
    pub object_version: u8,
    pub snapshot_at: i64,
    pub bump: u8,
}

impl ProposalExecutionPolicySnapshot {
    pub const LEN: usize = 8 + 32 + 32 + 1 + 1 + 1 + 1 + 1 + 8 + 1;
}

#[account]
pub struct ProposalProofVerification {
    pub dao: Pubkey,
    pub proposal: Pubkey,
    pub payload_hash: [u8; 32],
    pub proof_hash: [u8; 32],
    pub public_inputs_hash: [u8; 32],
    pub verification_key_hash: [u8; 32],
    pub verification_kind: VerificationKind,
    pub status: VerificationStatus,
    pub domain_separator: [u8; 32],
    pub verified_by: Pubkey,
    pub verified_at: i64,
    pub expires_at: i64,
    pub bump: u8,
}

impl ProposalProofVerification {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 32 + 32 + 32 + 1 + 1 + 32 + 32 + 8 + 8 + 1;
}

#[account]
pub struct SettlementEvidence {
    pub dao: Pubkey,
    pub proposal: Pubkey,
    pub payout_plan: Pubkey,
    pub kind: SettlementEvidenceKind,
    pub status: EvidenceStatus,
    pub settlement_id: [u8; 32],
    pub evidence_hash: [u8; 32],
    pub payout_fields_hash: [u8; 32],
    pub recorded_by: Pubkey,
    pub valid_after: i64,
    pub expires_at: i64,
    pub bump: u8,
}

impl SettlementEvidence {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 1 + 1 + 32 + 32 + 32 + 32 + 8 + 8 + 1;
}

#[account]
pub struct SettlementConsumptionRecord {
    pub evidence: Pubkey,
    pub consumed_by_proposal: Pubkey,
    pub consumed_at: i64,
    pub bump: u8,
}

impl SettlementConsumptionRecord {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 1;
}

#[account]
pub struct VoterWeightScopeRecord {
    pub realm: Pubkey,
    pub governing_token_mint: Pubkey,
    pub governing_token_owner: Pubkey,
    pub scope: VoterWeightScope,
    pub weight: u64,
    pub recorded_at_slot: u64,
    pub bump: u8,
}

impl VoterWeightScopeRecord {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 1 + 8 + 8 + 1;
}

#[account]
pub struct Dao {
    pub authority: Pubkey,                    // 32
    pub dao_name: String,                     // 4 + 64
    pub governance_token: Pubkey,             // 32
    pub quorum_percentage: u8,                // 1
    pub governance_token_required: u64,       // 8
    pub reveal_window_seconds: i64,           // 8
    pub execution_delay_seconds: i64,         // 8
    pub voting_config: VotingConfig,          // 3 (DualChamber is largest variant)
    pub proposal_count: u64,                  // 8
    pub bump: u8,                             // 1
    pub migrated_from_realms: Option<Pubkey>, // 33
}

impl Dao {
    pub const LEN: usize = 8      // discriminator
        + 32               // authority
        + (4 + 64)         // dao_name
        + 32               // governance_token
        + 1                // quorum_percentage
        + 8                // governance_token_required
        + 8                // reveal_window_seconds
        + 8                // execution_delay_seconds
        + 3                // voting_config (DualChamber: 1 variant + 2×u8 = 3 bytes max)
        + 8                // proposal_count
        + 1                // bump
        + 33; // migrated_from_realms (Option<Pubkey>)
              // = 210
}

#[account]
pub struct TreasuryOperatorAuthority {
    pub dao: Pubkey,       // 32
    pub authority: Pubkey, // 32
    pub created_at: i64,   // 8
    pub updated_at: i64,   // 8
    pub bump: u8,          // 1
}

impl TreasuryOperatorAuthority {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 1;
}

#[account]
pub struct Proposal {
    pub dao: Pubkey,                             // 32
    pub proposer: Pubkey,                        // 32
    pub proposal_id: u64,                        // 8
    pub title: String,                           // 4 + 128
    pub description: String,                     // 4 + 1024
    pub status: ProposalStatus,                  // 1
    pub voting_end: i64,                         // 8
    pub reveal_end: i64,                         // 8
    pub yes_capital: u64,                        // 8
    pub no_capital: u64,                         // 8
    pub yes_community: u64,                      // 8
    pub no_community: u64,                       // 8
    pub commit_count: u64,                       // 8
    pub reveal_count: u64,                       // 8
    pub treasury_action: Option<TreasuryAction>, // 1 + 74 = 75
    pub execution_unlocks_at: i64,               // 8
    pub is_executed: bool,                       // 1
    pub bump: u8,                                // 1
}

impl Proposal {
    // TreasuryAction: action_type(1) + amount_lamports(8) + recipient(32) + token_mint(1+32) = 74
    // Option<TreasuryAction> = 1 + 74 = 75
    pub const LEN: usize = 8          // discriminator
        + 32 + 32 + 8                 // dao, proposer, proposal_id
        + (4 + 128) + (4 + 1024)      // title, description
        + 1                           // status
        + 8 + 8                       // voting_end, reveal_end
        + 8 + 8 + 8 + 8               // yes/no capital, yes/no community
        + 8 + 8                       // commit_count, reveal_count
        + (1 + 74)                    // Option<TreasuryAction>
        + 8 + 1 + 1; // execution_unlocks_at, is_executed, bump
                     // = 1390
}

#[account]
pub struct VoterRecord {
    pub voter: Pubkey,                          // 32
    pub proposal: Pubkey,                       // 32
    pub commitment: [u8; 32],                   // 32
    pub capital_weight: u64,                    // 8   (own + delegated)
    pub community_weight: u64,                  // 8   (own + delegated)
    pub has_committed: bool,                    // 1
    pub has_revealed: bool,                     // 1
    pub voted_yes: bool,                        // 1
    pub bump: u8,                               // 1
    pub voter_reveal_authority: Option<Pubkey>, // 33
}

impl VoterRecord {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 8 + 8 + 1 + 1 + 1 + 1 + 33; // = 157
}

#[account]
pub struct VoteDelegation {
    pub delegator: Pubkey,        // 32
    pub delegatee: Pubkey,        // 32
    pub proposal: Pubkey,         // 32
    pub delegated_capital: u64,   // 8
    pub delegated_community: u64, // 8
    pub is_used: bool,            // 1
    pub bump: u8,                 // 1
}

impl VoteDelegation {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 8 + 8 + 1 + 1; // = 122
}

// Matches spl-governance-addin-api VoterWeightRecord layout exactly
#[account]
pub struct VoterWeightRecord {
    pub realm: Pubkey,                        // 32
    pub governing_token_mint: Pubkey,         // 32
    pub governing_token_owner: Pubkey,        // 32
    pub voter_weight: u64,                    // 8
    pub voter_weight_expiry: Option<u64>,     // 9
    pub weight_action: Option<u8>,            // 2
    pub weight_action_target: Option<Pubkey>, // 33
    pub reserved: [u8; 8],                    // 8
}

impl VoterWeightRecord {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 8 + 9 + 2 + 33 + 8; // = 164
}

#[account]
pub struct ZkProofAnchor {
    pub dao: Pubkey,                     // 32
    pub proposal: Pubkey,                // 32
    pub recorded_by: Pubkey,             // 32
    pub layer: ZkProofLayer,             // 1
    pub proof_system: ZkProofSystem,     // 1
    pub proof_hash: [u8; 32],            // 32
    pub public_inputs_hash: [u8; 32],    // 32
    pub verification_key_hash: [u8; 32], // 32
    pub bundle_hash: [u8; 32],           // 32
    pub recorded_at: i64,                // 8
    pub bump: u8,                        // 1
}

impl ZkProofAnchor {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 1 + 1 + 32 + 32 + 32 + 32 + 8 + 1; // 243
}

#[account]
pub struct ZkVerificationReceipt {
    pub dao: Pubkey,                           // 32
    pub proposal: Pubkey,                      // 32
    pub verified_by: Pubkey,                   // 32
    pub layer: ZkProofLayer,                   // 1
    pub proof_system: ZkProofSystem,           // 1
    pub verification_mode: ZkVerificationMode, // 1
    pub verifier_program: Option<Pubkey>,      // 33
    pub proof_hash: [u8; 32],                  // 32
    pub public_inputs_hash: [u8; 32],          // 32
    pub verification_key_hash: [u8; 32],       // 32
    pub bundle_hash: [u8; 32],                 // 32
    pub verified_at: i64,                      // 8
    pub bump: u8,                              // 1
}

impl ZkVerificationReceipt {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 1 + 1 + 1 + 33 + 32 + 32 + 32 + 32 + 8 + 1; // 277
}

#[account]
pub struct ProposalZkPolicy {
    pub dao: Pubkey,              // 32
    pub proposal: Pubkey,         // 32
    pub configured_by: Pubkey,    // 32
    pub mode: ProposalZkMode,     // 1
    pub required_layers_mask: u8, // 1
    pub configured_at: i64,       // 8
    pub bump: u8,                 // 1
}

impl ProposalZkPolicy {
    pub const ALL_LAYERS_MASK: u8 = 0b0000_0111;
    pub const LEN: usize = 8 + 32 + 32 + 32 + 1 + 1 + 8 + 1; // 115
}

#[account]
pub struct ConfidentialPayoutPlan {
    pub dao: Pubkey,                         // 32
    pub proposal: Pubkey,                    // 32
    pub configured_by: Pubkey,               // 32
    pub payout_type: ConfidentialPayoutType, // 1
    pub asset_type: ConfidentialAssetType,   // 1
    pub settlement_recipient: Pubkey,        // 32
    pub token_mint: Option<Pubkey>,          // 33
    pub recipient_count: u16,                // 2
    pub total_amount: u64,                   // 8
    pub encrypted_manifest_uri: String,      // 4 + 256
    pub manifest_hash: [u8; 32],             // 32
    pub ciphertext_hash: [u8; 32],           // 32
    pub status: ConfidentialPayoutStatus,    // 1
    pub configured_at: i64,                  // 8
    pub funded_at: i64,                      // 8
    pub bump: u8,                            // 1
}

impl ConfidentialPayoutPlan {
    pub const MAX_URI_LEN: usize = 256;
    pub const LEN: usize =
        8 + 32 + 32 + 32 + 1 + 1 + 32 + 33 + 2 + 8 + (4 + 256) + 32 + 32 + 1 + 8 + 8 + 1; // 523
}

#[account]
pub struct RefheEnvelope {
    pub dao: Pubkey,                      // 32
    pub proposal: Pubkey,                 // 32
    pub payout_plan: Pubkey,              // 32
    pub configured_by: Pubkey,            // 32
    pub settled_by: Option<Pubkey>,       // 33
    pub model_uri: String,                // 4 + 256
    pub policy_hash: [u8; 32],            // 32
    pub input_ciphertext_hash: [u8; 32],  // 32
    pub evaluation_key_hash: [u8; 32],    // 32
    pub result_ciphertext_hash: [u8; 32], // 32
    pub result_commitment_hash: [u8; 32], // 32
    pub proof_bundle_hash: [u8; 32],      // 32
    pub verifier_program: Option<Pubkey>, // 33
    pub status: RefheEnvelopeStatus,      // 1
    pub configured_at: i64,               // 8
    pub settled_at: i64,                  // 8
    pub bump: u8,                         // 1
}

impl RefheEnvelope {
    pub const MAX_URI_LEN: usize = 256;
    pub const LEN: usize =
        8 + 32 + 32 + 32 + 32 + 33 + (4 + 256) + 32 + 32 + 32 + 32 + 32 + 32 + 33 + 1 + 8 + 8 + 1; // 673
}

#[account]
pub struct MagicBlockPrivatePaymentCorridor {
    pub dao: Pubkey,                        // 32
    pub proposal: Pubkey,                   // 32
    pub payout_plan: Pubkey,                // 32
    pub configured_by: Pubkey,              // 32
    pub settled_by: Option<Pubkey>,         // 33
    pub api_base_url: String,               // 4 + 128
    pub cluster: String,                    // 4 + 64
    pub owner_wallet: Pubkey,               // 32
    pub settlement_wallet: Pubkey,          // 32
    pub token_mint: Pubkey,                 // 32
    pub validator: Option<Pubkey>,          // 33
    pub transfer_queue: Option<Pubkey>,     // 33
    pub route_hash: [u8; 32],               // 32
    pub deposit_amount: u64,                // 8
    pub private_transfer_amount: u64,       // 8
    pub withdrawal_amount: u64,             // 8
    pub deposit_tx_signature: String,       // 4 + 128
    pub transfer_tx_signature: String,      // 4 + 128
    pub withdraw_tx_signature: String,      // 4 + 128
    pub status: MagicBlockSettlementStatus, // 1
    pub configured_at: i64,                 // 8
    pub settled_at: i64,                    // 8
    pub bump: u8,                           // 1
}

impl MagicBlockPrivatePaymentCorridor {
    pub const MAX_API_BASE_LEN: usize = 128;
    pub const MAX_CLUSTER_LEN: usize = 64;
    pub const MAX_SIGNATURE_LEN: usize = 128;
    pub const LEN: usize = 8
        + 32
        + 32
        + 32
        + 32
        + 33
        + (4 + 128)
        + (4 + 64)
        + 32
        + 32
        + 32
        + 33
        + 33
        + 32
        + 8
        + 8
        + 8
        + (4 + 128)
        + (4 + 128)
        + (4 + 128)
        + 1
        + 8
        + 8
        + 1; // 1001
}

// ── Types ─────────────────────────────────────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum EnforcementMode {
    LegacyAllowed,
    CompatibilityRequired,
    StrictRequired,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum FeaturePolicy {
    LegacyAllowed,
    ThresholdAttestedRequired,
    StrictRequired,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum CancelPolicy {
    LegacyAllowed,
    NoCancelAfterParticipation,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum QuorumPolicyV3 {
    LegacyRevealParticipation,
    TokenSupplyParticipation,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum RevealRebatePolicyV3 {
    Disabled,
    DedicatedVaultRequired,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum VerificationKind {
    ThresholdAttestation,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum VerificationStatus {
    Pending,
    Verified,
    Rejected,
    Revoked,
    Expired,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum SettlementEvidenceKind {
    RefheAttested,
    MagicBlockAttested,
    VerifierCpiReceipt,
    ThresholdAttestation,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum EvidenceStatus {
    Pending,
    Verified,
    Rejected,
    Revoked,
    Expired,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum VoterWeightScope {
    CommunityTokenWeighted,
    CommunityQuadratic,
    CapitalWeighted,
    DualChamberCommunityLeg,
    DualChamberCapitalLeg,
}

impl VoterWeightScope {
    pub fn seed_byte(&self) -> u8 {
        match self {
            Self::CommunityTokenWeighted => 1,
            Self::CommunityQuadratic => 2,
            Self::CapitalWeighted => 3,
            Self::DualChamberCommunityLeg => 4,
            Self::DualChamberCapitalLeg => 5,
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum VotingConfig {
    TokenWeighted,
    Quadratic,
    DualChamber {
        capital_threshold: u8,   // % of token-weighted YES required (1–100)
        community_threshold: u8, // % of quadratic YES required      (1–100)
    },
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ProposalStatus {
    Voting,
    Passed,
    Failed,
    Cancelled,
    Vetoed,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TreasuryAction {
    pub action_type: TreasuryActionType,
    pub amount_lamports: u64,
    pub recipient: Pubkey,
    pub token_mint: Option<Pubkey>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum TreasuryActionType {
    SendSol,
    SendToken,
    CustomCPI,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ZkProofLayer {
    Vote,
    Delegation,
    Tally,
}

impl ZkProofLayer {
    pub fn seed_byte(&self) -> u8 {
        match self {
            Self::Vote => 1,
            Self::Delegation => 2,
            Self::Tally => 3,
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ZkProofSystem {
    Groth16,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ZkVerificationMode {
    Companion,
    Parallel,
    ZkEnforced,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ProposalZkMode {
    Companion,
    Parallel,
    ZkEnforced,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ConfidentialPayoutType {
    Salary,
    Bonus,
}

impl ConfidentialPayoutType {
    pub fn seed_byte(&self) -> u8 {
        match self {
            Self::Salary => 1,
            Self::Bonus => 2,
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ConfidentialAssetType {
    Sol,
    Token,
}

impl ConfidentialAssetType {
    pub fn seed_byte(&self) -> u8 {
        match self {
            Self::Sol => 1,
            Self::Token => 2,
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ConfidentialPayoutStatus {
    Configured,
    Funded,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum RefheEnvelopeStatus {
    Configured,
    Settled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum MagicBlockSettlementStatus {
    Configured,
    Settled,
}

// ── Events ────────────────────────────────────────────────────────────────────

#[event]
pub struct DaoCreated {
    pub dao: Pubkey,
    pub name: String,
    pub authority: Pubkey,
}

#[event]
pub struct DaoMigratedFromRealms {
    pub dao: Pubkey,
    pub name: String,
    pub realms_governance: Pubkey,
    pub governance_token: Pubkey,
}

#[event]
pub struct DaoAuthorityTransferred {
    pub dao: Pubkey,
    pub previous_authority: Pubkey,
    pub new_authority: Pubkey,
}

#[event]
pub struct TreasuryOperatorAuthorityInitialized {
    pub dao: Pubkey,
    pub authority: Pubkey,
    pub created_at: i64,
}

#[event]
pub struct TreasuryOperatorAuthorityTransferred {
    pub dao: Pubkey,
    pub previous_authority: Pubkey,
    pub new_authority: Pubkey,
    pub updated_at: i64,
}

#[event]
pub struct ProposalCreated {
    pub dao: Pubkey,
    pub proposal: Pubkey,
    pub proposal_id: u64,
    pub title: String,
    pub voting_end: i64,
    pub reveal_end: i64,
}

#[event]
pub struct ProposalCancelled {
    pub proposal: Pubkey,
    pub cancelled_by: Pubkey,
}

#[event]
pub struct ProposalVetoed {
    pub proposal: Pubkey,
    pub vetoed_by: Pubkey,
}

#[event]
pub struct VoteDelegated {
    pub proposal: Pubkey,
    pub delegator: Pubkey,
    pub delegatee: Pubkey,
    pub delegated_weight: u64,
}

#[event]
pub struct VoteCommitted {
    pub proposal: Pubkey,
    pub voter: Pubkey,
    pub commit_count: u64,
}

#[event]
pub struct VoteRevealed {
    pub proposal: Pubkey,
    pub voter: Pubkey,
    pub reveal_count: u64,
}

#[event]
pub struct ProposalFinalized {
    pub proposal: Pubkey,
    pub yes_capital: u64,
    pub no_capital: u64,
    pub yes_community: u64,
    pub no_community: u64,
    pub passed: bool,
    pub quorum_met: bool,
    pub commit_count: u64,
    pub reveal_count: u64,
    pub execution_unlocks_at: i64,
}

#[event]
pub struct TreasuryDeposit {
    pub dao: Pubkey,
    pub from: Pubkey,
    pub amount: u64,
}

#[event]
pub struct TreasuryExecuted {
    pub proposal: Pubkey,
    pub amount: u64,
    pub recipient: Pubkey,
}

#[event]
pub struct ZkProofAnchored {
    pub dao: Pubkey,
    pub proposal: Pubkey,
    pub recorded_by: Pubkey,
    pub layer: ZkProofLayer,
    pub proof_system: ZkProofSystem,
    pub proof_hash: [u8; 32],
    pub public_inputs_hash: [u8; 32],
    pub verification_key_hash: [u8; 32],
    pub bundle_hash: [u8; 32],
}

#[event]
pub struct ZkProofVerified {
    pub dao: Pubkey,
    pub proposal: Pubkey,
    pub verified_by: Pubkey,
    pub layer: ZkProofLayer,
    pub proof_system: ZkProofSystem,
    pub verification_mode: ZkVerificationMode,
    pub verifier_program: Option<Pubkey>,
    pub proof_hash: [u8; 32],
    pub public_inputs_hash: [u8; 32],
    pub verification_key_hash: [u8; 32],
    pub bundle_hash: [u8; 32],
}

#[event]
pub struct ProposalZkModeConfigured {
    pub dao: Pubkey,
    pub proposal: Pubkey,
    pub configured_by: Pubkey,
    pub mode: ProposalZkMode,
    pub required_layers_mask: u8,
}

#[event]
pub struct ConfidentialPayoutConfigured {
    pub dao: Pubkey,
    pub proposal: Pubkey,
    pub configured_by: Pubkey,
    pub payout_type: ConfidentialPayoutType,
    pub asset_type: ConfidentialAssetType,
    pub settlement_recipient: Pubkey,
    pub token_mint: Option<Pubkey>,
    pub recipient_count: u16,
    pub total_amount: u64,
    pub encrypted_manifest_uri: String,
    pub manifest_hash: [u8; 32],
    pub ciphertext_hash: [u8; 32],
}

#[event]
pub struct ConfidentialPayoutExecuted {
    pub proposal: Pubkey,
    pub settlement_recipient: Pubkey,
    pub asset_type: ConfidentialAssetType,
    pub token_mint: Option<Pubkey>,
    pub recipient_count: u16,
    pub total_amount: u64,
    pub funded_at: i64,
}

#[event]
pub struct RefheEnvelopeConfigured {
    pub dao: Pubkey,
    pub proposal: Pubkey,
    pub payout_plan: Pubkey,
    pub configured_by: Pubkey,
    pub model_uri: String,
    pub policy_hash: [u8; 32],
    pub input_ciphertext_hash: [u8; 32],
    pub evaluation_key_hash: [u8; 32],
}

#[event]
pub struct RefheEnvelopeSettled {
    pub dao: Pubkey,
    pub proposal: Pubkey,
    pub payout_plan: Pubkey,
    pub settled_by: Pubkey,
    pub verifier_program: Pubkey,
    pub result_ciphertext_hash: [u8; 32],
    pub result_commitment_hash: [u8; 32],
    pub proof_bundle_hash: [u8; 32],
    pub settled_at: i64,
}

#[event]
pub struct MagicBlockPrivatePaymentCorridorConfigured {
    pub dao: Pubkey,
    pub proposal: Pubkey,
    pub payout_plan: Pubkey,
    pub configured_by: Pubkey,
    pub api_base_url: String,
    pub cluster: String,
    pub owner_wallet: Pubkey,
    pub settlement_wallet: Pubkey,
    pub token_mint: Pubkey,
    pub validator: Option<Pubkey>,
    pub route_hash: [u8; 32],
    pub deposit_amount: u64,
    pub private_transfer_amount: u64,
    pub withdrawal_amount: u64,
}

#[event]
pub struct MagicBlockPrivatePaymentCorridorSettled {
    pub dao: Pubkey,
    pub proposal: Pubkey,
    pub payout_plan: Pubkey,
    pub settled_by: Pubkey,
    pub validator: Pubkey,
    pub transfer_queue: Pubkey,
    pub deposit_tx_signature: String,
    pub transfer_tx_signature: String,
    pub withdraw_tx_signature: String,
    pub settled_at: i64,
}

#[event]
pub struct DaoSecurityPolicyInitialized {
    pub dao: Pubkey,
    pub authority: Pubkey,
    pub mode: EnforcementMode,
    pub zk_policy: FeaturePolicy,
    pub settlement_policy: FeaturePolicy,
    pub cancel_policy: CancelPolicy,
    pub proof_threshold: u8,
    pub settlement_threshold: u8,
    pub created_at: i64,
}

#[event]
pub struct DaoSecurityPolicyUpdatedV2 {
    pub dao: Pubkey,
    pub authority: Pubkey,
    pub mode: EnforcementMode,
    pub zk_policy: FeaturePolicy,
    pub settlement_policy: FeaturePolicy,
    pub cancel_policy: CancelPolicy,
    pub proof_threshold: u8,
    pub settlement_threshold: u8,
    pub updated_at: i64,
}

#[event]
pub struct DaoGovernancePolicyInitializedV3 {
    pub dao: Pubkey,
    pub authority: Pubkey,
    pub quorum_policy: QuorumPolicyV3,
    pub reveal_rebate_policy: RevealRebatePolicyV3,
    pub reveal_rebate_lamports: u64,
    pub created_at: i64,
}

#[event]
pub struct DaoGovernancePolicyUpdatedV3 {
    pub dao: Pubkey,
    pub authority: Pubkey,
    pub quorum_policy: QuorumPolicyV3,
    pub reveal_rebate_policy: RevealRebatePolicyV3,
    pub reveal_rebate_lamports: u64,
    pub updated_at: i64,
}

#[event]
pub struct DaoSettlementPolicyInitializedV3 {
    pub dao: Pubkey,
    pub authority: Pubkey,
    pub min_evidence_age_seconds: i64,
    pub max_payout_amount: u64,
    pub require_refhe_settlement: bool,
    pub require_magicblock_settlement: bool,
    pub created_at: i64,
}

#[event]
pub struct DaoSettlementPolicyUpdatedV3 {
    pub dao: Pubkey,
    pub authority: Pubkey,
    pub min_evidence_age_seconds: i64,
    pub max_payout_amount: u64,
    pub require_refhe_settlement: bool,
    pub require_magicblock_settlement: bool,
    pub updated_at: i64,
}

#[event]
pub struct ProposalGovernancePolicySnapshottedV3 {
    pub dao: Pubkey,
    pub proposal: Pubkey,
    pub quorum_policy: QuorumPolicyV3,
    pub reveal_rebate_policy: RevealRebatePolicyV3,
    pub reveal_rebate_lamports: u64,
    pub eligible_capital: u64,
    pub object_version: u8,
}

#[event]
pub struct ProposalSettlementPolicySnapshottedV3 {
    pub dao: Pubkey,
    pub proposal: Pubkey,
    pub payout_plan: Pubkey,
    pub min_evidence_age_seconds: i64,
    pub max_payout_amount: u64,
    pub require_refhe_settlement: bool,
    pub require_magicblock_settlement: bool,
    pub object_version: u8,
}

#[event]
pub struct ProposalExecutionPolicySnapshotted {
    pub dao: Pubkey,
    pub proposal: Pubkey,
    pub created_under_mode: EnforcementMode,
    pub zk_policy: FeaturePolicy,
    pub settlement_policy: FeaturePolicy,
    pub cancel_policy: CancelPolicy,
    pub object_version: u8,
}

#[event]
pub struct RevealRebateVaultFundedV3 {
    pub dao: Pubkey,
    pub funder: Pubkey,
    pub amount: u64,
    pub vault: Pubkey,
}

#[event]
pub struct ProposalCancelledV2 {
    pub proposal: Pubkey,
    pub cancelled_by: Pubkey,
    pub policy_mode: EnforcementMode,
    pub cancel_policy: CancelPolicy,
}

#[event]
pub struct VoteRevealedV3 {
    pub proposal: Pubkey,
    pub voter: Pubkey,
    pub reveal_count: u64,
    pub rebate_issued: u64,
    pub reveal_rebate_policy: RevealRebatePolicyV3,
}

#[event]
pub struct ProposalFinalizedV3 {
    pub proposal: Pubkey,
    pub yes_capital: u64,
    pub no_capital: u64,
    pub yes_community: u64,
    pub no_community: u64,
    pub passed: bool,
    pub quorum_met: bool,
    pub commit_count: u64,
    pub reveal_count: u64,
    pub eligible_capital: u64,
    pub quorum_policy: QuorumPolicyV3,
    pub execution_unlocks_at: i64,
}

#[event]
pub struct ConfidentialPayoutExecutedV3 {
    pub proposal: Pubkey,
    pub settlement_recipient: Pubkey,
    pub asset_type: ConfidentialAssetType,
    pub token_mint: Option<Pubkey>,
    pub recipient_count: u16,
    pub total_amount: u64,
    pub funded_at: i64,
    pub min_evidence_age_seconds: i64,
    pub max_payout_amount: u64,
    pub require_refhe_settlement: bool,
    pub require_magicblock_settlement: bool,
}

#[event]
pub struct ProofVerificationRecordedV2 {
    pub dao: Pubkey,
    pub proposal: Pubkey,
    pub verification_kind: VerificationKind,
    pub status: VerificationStatus,
    pub payload_hash: [u8; 32],
    pub proof_hash: [u8; 32],
    pub expires_at: i64,
}

#[event]
pub struct SettlementEvidenceRecordedV2 {
    pub dao: Pubkey,
    pub proposal: Pubkey,
    pub payout_plan: Pubkey,
    pub kind: SettlementEvidenceKind,
    pub status: EvidenceStatus,
    pub settlement_id: [u8; 32],
    pub evidence_hash: [u8; 32],
    pub expires_at: i64,
}

#[event]
pub struct SettlementEvidenceConsumedV2 {
    pub evidence: Pubkey,
    pub proposal: Pubkey,
    pub payout_plan: Pubkey,
    pub consumed_at: i64,
}

#[event]
pub struct VoterWeightScopeRecorded {
    pub realm: Pubkey,
    pub governing_token_mint: Pubkey,
    pub governing_token_owner: Pubkey,
    pub scope: VoterWeightScope,
    pub weight: u64,
}
