use anchor_lang::prelude::{Clock, Context, Pubkey, Result};

use crate::*;
use crate::utils::*;

pub fn initialize_dao(
    ctx: Context<InitializeDao>,
    dao_name: String,
    quorum_percentage: u8,
    governance_token_required: u64,
    reveal_window_seconds: i64,
    execution_delay_seconds: i64,
    voting_config: VotingConfig,
) -> Result<()> {
    require!(dao_name.len() <= 64, Error::NameTooLong);
    require!(
        quorum_percentage > 0 && quorum_percentage <= 100,
        Error::InvalidQuorum
    );
    require!(
        reveal_window_seconds >= MIN_REVEAL_WINDOW_SECONDS,
        Error::RevealWindowTooShort
    );
    require!(execution_delay_seconds >= 0, Error::InvalidExecutionDelay);
    validate_voting_config(&voting_config)?;

    let dao = &mut ctx.accounts.dao;
    dao.authority = ctx.accounts.authority.key();
    dao.dao_name = dao_name.clone();
    dao.governance_token = ctx.accounts.governance_token.key();
    dao.quorum_percentage = quorum_percentage;
    dao.governance_token_required = governance_token_required;
    dao.reveal_window_seconds = reveal_window_seconds;
    dao.execution_delay_seconds = execution_delay_seconds;
    dao.voting_config = voting_config;
    dao.proposal_count = 0;
    dao.bump = ctx.bumps.dao;
    dao.migrated_from_realms = None;

    emit!(DaoCreated {
        dao: dao.key(),
        name: dao_name,
        authority: dao.authority
    });
    Ok(())
}

pub fn migrate_from_realms(
    ctx: Context<MigrateFromRealms>,
    dao_name: String,
    realms_governance: Pubkey,
    quorum_percentage: u8,
    reveal_window_seconds: i64,
    execution_delay_seconds: i64,
    voting_config: VotingConfig,
) -> Result<()> {
    require!(dao_name.len() <= 64, Error::NameTooLong);
    require!(
        quorum_percentage > 0 && quorum_percentage <= 100,
        Error::InvalidQuorum
    );
    require!(
        reveal_window_seconds >= MIN_REVEAL_WINDOW_SECONDS,
        Error::RevealWindowTooShort
    );
    require!(execution_delay_seconds >= 0, Error::InvalidExecutionDelay);
    validate_voting_config(&voting_config)?;

    let dao = &mut ctx.accounts.dao;
    dao.authority = ctx.accounts.authority.key();
    dao.dao_name = dao_name.clone();
    dao.governance_token = ctx.accounts.governance_token.key();
    dao.quorum_percentage = quorum_percentage;
    dao.governance_token_required = 0;
    dao.reveal_window_seconds = reveal_window_seconds;
    dao.execution_delay_seconds = execution_delay_seconds;
    dao.voting_config = voting_config;
    dao.proposal_count = 0;
    dao.bump = ctx.bumps.dao;
    dao.migrated_from_realms = Some(realms_governance);

    emit!(DaoMigratedFromRealms {
        dao: dao.key(),
        name: dao_name,
        realms_governance,
        governance_token: dao.governance_token,
    });
    Ok(())
}

pub fn transfer_dao_authority(
    ctx: Context<TransferDaoAuthority>,
    new_authority: Pubkey,
) -> Result<()> {
    require!(
        new_authority != Pubkey::default() && new_authority != ctx.accounts.dao.authority,
        Error::InvalidDaoAuthorityTransfer
    );

    let dao = &mut ctx.accounts.dao;
    let previous_authority = dao.authority;
    dao.authority = new_authority;

    emit!(DaoAuthorityTransferred {
        dao: dao.key(),
        previous_authority,
        new_authority,
    });
    Ok(())
}

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
    validate_attestor_policy(&proof_attestors, proof_attestor_count, proof_threshold)?;
    validate_attestor_policy(
        &settlement_attestors,
        settlement_attestor_count,
        settlement_threshold,
    )?;
    require!(proof_ttl_seconds > 0, Error::InvalidSecurityPolicy);
    require!(settlement_ttl_seconds > 0, Error::InvalidSecurityPolicy);

    let policy = &mut ctx.accounts.dao_security_policy;
    if policy.dao != Pubkey::default() {
        require!(
            policy.dao == ctx.accounts.dao.key()
                && policy.authority == ctx.accounts.authority.key()
                && policy.mode == mode
                && policy.zk_policy == zk_policy
                && policy.settlement_policy == settlement_policy
                && policy.cancel_policy == cancel_policy
                && policy.proof_attestors == proof_attestors
                && policy.proof_attestor_count == proof_attestor_count
                && policy.proof_threshold == proof_threshold
                && policy.settlement_attestors == settlement_attestors
                && policy.settlement_attestor_count == settlement_attestor_count
                && policy.settlement_threshold == settlement_threshold
                && policy.proof_ttl_seconds == proof_ttl_seconds
                && policy.settlement_ttl_seconds == settlement_ttl_seconds,
            Error::SecurityPolicyAlreadyInitialized
        );
        emit!(DaoSecurityPolicyInitialized {
            dao: policy.dao,
            authority: policy.authority,
            mode: policy.mode.clone(),
            zk_policy: policy.zk_policy.clone(),
            settlement_policy: policy.settlement_policy.clone(),
            cancel_policy: policy.cancel_policy.clone(),
            proof_threshold: policy.proof_threshold,
            settlement_threshold: policy.settlement_threshold,
            created_at: policy.created_at,
        });
        return Ok(());
    }
    policy.dao = ctx.accounts.dao.key();
    policy.authority = ctx.accounts.authority.key();
    policy.mode = mode.clone();
    policy.zk_policy = zk_policy.clone();
    policy.settlement_policy = settlement_policy.clone();
    policy.cancel_policy = cancel_policy.clone();
    policy.proof_attestors = proof_attestors;
    policy.proof_attestor_count = proof_attestor_count;
    policy.proof_threshold = proof_threshold;
    policy.settlement_attestors = settlement_attestors;
    policy.settlement_attestor_count = settlement_attestor_count;
    policy.settlement_threshold = settlement_threshold;
    policy.proof_ttl_seconds = proof_ttl_seconds;
    policy.settlement_ttl_seconds = settlement_ttl_seconds;
    policy.emergency_disabled = false;
    policy.created_at = Clock::get()?.unix_timestamp;
    policy.updated_at = policy.created_at;
    policy.bump = ctx.bumps.dao_security_policy;

    emit!(DaoSecurityPolicyInitialized {
        dao: policy.dao,
        authority: policy.authority,
        mode,
        zk_policy,
        settlement_policy,
        cancel_policy,
        proof_threshold,
        settlement_threshold,
        created_at: policy.created_at,
    });
    Ok(())
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
    validate_attestor_policy(&proof_attestors, proof_attestor_count, proof_threshold)?;
    validate_attestor_policy(
        &settlement_attestors,
        settlement_attestor_count,
        settlement_threshold,
    )?;
    require!(proof_ttl_seconds > 0, Error::InvalidSecurityPolicy);
    require!(settlement_ttl_seconds > 0, Error::InvalidSecurityPolicy);

    let policy = &mut ctx.accounts.dao_security_policy;
    require!(!policy.emergency_disabled, Error::SecurityPolicyDisabled);
    require!(
        enforcement_rank(&mode) >= enforcement_rank(&policy.mode)
            && feature_rank(&zk_policy) >= feature_rank(&policy.zk_policy)
            && feature_rank(&settlement_policy) >= feature_rank(&policy.settlement_policy)
            && cancel_rank(&cancel_policy) >= cancel_rank(&policy.cancel_policy),
        Error::PolicyRollbackNotAllowed
    );

    policy.mode = mode.clone();
    policy.zk_policy = zk_policy.clone();
    policy.settlement_policy = settlement_policy.clone();
    policy.cancel_policy = cancel_policy.clone();
    policy.proof_attestors = proof_attestors;
    policy.proof_attestor_count = proof_attestor_count;
    policy.proof_threshold = proof_threshold;
    policy.settlement_attestors = settlement_attestors;
    policy.settlement_attestor_count = settlement_attestor_count;
    policy.settlement_threshold = settlement_threshold;
    policy.proof_ttl_seconds = proof_ttl_seconds;
    policy.settlement_ttl_seconds = settlement_ttl_seconds;
    policy.updated_at = Clock::get()?.unix_timestamp;

    emit!(DaoSecurityPolicyUpdatedV2 {
        dao: policy.dao,
        authority: policy.authority,
        mode,
        zk_policy,
        settlement_policy,
        cancel_policy,
        proof_threshold,
        settlement_threshold,
        updated_at: policy.updated_at,
    });
    Ok(())
}

pub fn initialize_dao_governance_policy_v3(
    ctx: Context<InitializeDaoGovernancePolicyV3>,
    quorum_policy: QuorumPolicyV3,
    reveal_rebate_policy: RevealRebatePolicyV3,
    reveal_rebate_lamports: u64,
) -> Result<()> {
    validate_governance_policy_v3(
        &quorum_policy,
        &reveal_rebate_policy,
        reveal_rebate_lamports,
    )?;

    let policy = &mut ctx.accounts.dao_governance_policy_v3;
    if policy.dao != Pubkey::default() {
        require!(
            policy.dao == ctx.accounts.dao.key()
                && policy.authority == ctx.accounts.authority.key()
                && policy.quorum_policy == quorum_policy
                && policy.reveal_rebate_policy == reveal_rebate_policy
                && policy.reveal_rebate_lamports == reveal_rebate_lamports,
            Error::GovernancePolicyAlreadyInitialized
        );
        emit!(DaoGovernancePolicyInitializedV3 {
            dao: policy.dao,
            authority: policy.authority,
            quorum_policy: policy.quorum_policy.clone(),
            reveal_rebate_policy: policy.reveal_rebate_policy.clone(),
            reveal_rebate_lamports: policy.reveal_rebate_lamports,
            created_at: policy.created_at,
        });
        return Ok(());
    }

    let now = Clock::get()?.unix_timestamp;
    policy.dao = ctx.accounts.dao.key();
    policy.authority = ctx.accounts.authority.key();
    policy.quorum_policy = quorum_policy.clone();
    policy.reveal_rebate_policy = reveal_rebate_policy.clone();
    policy.reveal_rebate_lamports = reveal_rebate_lamports;
    policy.created_at = now;
    policy.updated_at = now;
    policy.bump = ctx.bumps.dao_governance_policy_v3;

    emit!(DaoGovernancePolicyInitializedV3 {
        dao: policy.dao,
        authority: policy.authority,
        quorum_policy,
        reveal_rebate_policy,
        reveal_rebate_lamports,
        created_at: policy.created_at,
    });
    Ok(())
}

pub fn update_dao_governance_policy_v3(
    ctx: Context<UpdateDaoGovernancePolicyV3>,
    quorum_policy: QuorumPolicyV3,
    reveal_rebate_policy: RevealRebatePolicyV3,
    reveal_rebate_lamports: u64,
) -> Result<()> {
    validate_governance_policy_v3(
        &quorum_policy,
        &reveal_rebate_policy,
        reveal_rebate_lamports,
    )?;

    let policy = &mut ctx.accounts.dao_governance_policy_v3;
    policy.quorum_policy = quorum_policy.clone();
    policy.reveal_rebate_policy = reveal_rebate_policy.clone();
    policy.reveal_rebate_lamports = reveal_rebate_lamports;
    policy.updated_at = Clock::get()?.unix_timestamp;

    emit!(DaoGovernancePolicyUpdatedV3 {
        dao: policy.dao,
        authority: policy.authority,
        quorum_policy,
        reveal_rebate_policy,
        reveal_rebate_lamports,
        updated_at: policy.updated_at,
    });
    Ok(())
}

pub fn initialize_dao_settlement_policy_v3(
    ctx: Context<InitializeDaoSettlementPolicyV3>,
    min_evidence_age_seconds: i64,
    max_payout_amount: u64,
    require_refhe_settlement: bool,
    require_magicblock_settlement: bool,
) -> Result<()> {
    validate_settlement_policy_v3(
        min_evidence_age_seconds,
        max_payout_amount,
        require_refhe_settlement,
        require_magicblock_settlement,
    )?;

    let policy = &mut ctx.accounts.dao_settlement_policy_v3;
    if policy.dao != Pubkey::default() {
        require!(
            policy.dao == ctx.accounts.dao.key()
                && policy.authority == ctx.accounts.authority.key()
                && policy.min_evidence_age_seconds == min_evidence_age_seconds
                && policy.max_payout_amount == max_payout_amount
                && policy.require_refhe_settlement == require_refhe_settlement
                && policy.require_magicblock_settlement == require_magicblock_settlement,
            Error::SettlementPolicyAlreadyInitialized
        );
        emit!(DaoSettlementPolicyInitializedV3 {
            dao: policy.dao,
            authority: policy.authority,
            min_evidence_age_seconds: policy.min_evidence_age_seconds,
            max_payout_amount: policy.max_payout_amount,
            require_refhe_settlement: policy.require_refhe_settlement,
            require_magicblock_settlement: policy.require_magicblock_settlement,
            created_at: policy.created_at,
        });
        return Ok(());
    }

    let now = Clock::get()?.unix_timestamp;
    policy.dao = ctx.accounts.dao.key();
    policy.authority = ctx.accounts.authority.key();
    policy.min_evidence_age_seconds = min_evidence_age_seconds;
    policy.max_payout_amount = max_payout_amount;
    policy.require_refhe_settlement = require_refhe_settlement;
    policy.require_magicblock_settlement = require_magicblock_settlement;
    policy.created_at = now;
    policy.updated_at = now;
    policy.bump = ctx.bumps.dao_settlement_policy_v3;

    emit!(DaoSettlementPolicyInitializedV3 {
        dao: policy.dao,
        authority: policy.authority,
        min_evidence_age_seconds,
        max_payout_amount,
        require_refhe_settlement,
        require_magicblock_settlement,
        created_at: policy.created_at,
    });
    Ok(())
}

pub fn update_dao_settlement_policy_v3(
    ctx: Context<UpdateDaoSettlementPolicyV3>,
    min_evidence_age_seconds: i64,
    max_payout_amount: u64,
    require_refhe_settlement: bool,
    require_magicblock_settlement: bool,
) -> Result<()> {
    validate_settlement_policy_v3(
        min_evidence_age_seconds,
        max_payout_amount,
        require_refhe_settlement,
        require_magicblock_settlement,
    )?;

    let policy = &mut ctx.accounts.dao_settlement_policy_v3;
    require!(
        min_evidence_age_seconds >= policy.min_evidence_age_seconds
            && max_payout_amount <= policy.max_payout_amount
            && (!policy.require_refhe_settlement || require_refhe_settlement)
            && (!policy.require_magicblock_settlement || require_magicblock_settlement),
        Error::SettlementPolicyRollbackNotAllowed
    );

    policy.min_evidence_age_seconds = min_evidence_age_seconds;
    policy.max_payout_amount = max_payout_amount;
    policy.require_refhe_settlement = require_refhe_settlement;
    policy.require_magicblock_settlement = require_magicblock_settlement;
    policy.updated_at = Clock::get()?.unix_timestamp;

    emit!(DaoSettlementPolicyUpdatedV3 {
        dao: policy.dao,
        authority: policy.authority,
        min_evidence_age_seconds,
        max_payout_amount,
        require_refhe_settlement,
        require_magicblock_settlement,
        updated_at: policy.updated_at,
    });
    Ok(())
}
