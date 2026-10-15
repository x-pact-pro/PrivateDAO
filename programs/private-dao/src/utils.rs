use anchor_lang::prelude::*;
use anchor_spl::token_interface::TokenAccount;
use sha2::{Digest, Sha256};

use crate::{
    traits::TreasuryActionPolicy, CancelPolicy, ConfidentialAssetType, ConfidentialPayoutPlan, Dao,
    EnforcementMode, Error, FeaturePolicy, MagicBlockPrivatePaymentCorridor, Proposal,
    ProposalGovernancePolicySnapshotV3, ProposalStatus, QuorumPolicyV3, RefheEnvelope,
    RevealRebatePolicyV3, TreasuryAction, TreasuryActionType, VotingConfig, ZkProofLayer,
    ZkVerificationMode, ZkVerificationReceipt, MAX_POLICY_ATTESTORS, MAX_REVEAL_REBATE_V3_LAMPORTS,
    PAYOUT_PAYLOAD_DOMAIN_V1, PROOF_PAYLOAD_DOMAIN_V1,
};

pub fn isqrt(n: u64) -> u64 {
    if n == 0 {
        return 0;
    }
    let mut x = n;
    let mut y = x.div_ceil(2);
    while y < x {
        x = y;
        y = ((x as u128 + (n / x) as u128) / 2) as u64;
    }
    x
}

pub fn compute_vote_commitment(
    proposal: &Pubkey,
    voter: &Pubkey,
    vote: bool,
    salt: &[u8; 32],
) -> [u8; 32] {
    let vote_byte: u8 = if vote { 1 } else { 0 };
    let mut preimage = Vec::with_capacity(97);
    preimage.push(vote_byte);
    preimage.extend_from_slice(salt);
    preimage.extend_from_slice(proposal.as_ref());
    preimage.extend_from_slice(voter.as_ref());
    Sha256::digest(&preimage).into()
}

pub fn account_exists(info: &AccountInfo) -> bool {
    info.lamports() > 0
}

pub fn is_zero_hash(hash: &[u8; 32]) -> bool {
    hash.iter().all(|byte| *byte == 0)
}

pub fn hash_bytes(parts: &[&[u8]]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    for part in parts {
        hasher.update(part);
    }
    hasher.finalize().into()
}

pub fn proof_domain_separator(dao: &Pubkey, proposal: &Pubkey) -> [u8; 32] {
    hash_bytes(&[PROOF_PAYLOAD_DOMAIN_V1, dao.as_ref(), proposal.as_ref()])
}

pub fn enforcement_rank(mode: &EnforcementMode) -> u8 {
    match mode {
        EnforcementMode::LegacyAllowed => 0,
        EnforcementMode::CompatibilityRequired => 1,
        EnforcementMode::StrictRequired => 2,
    }
}

pub fn feature_rank(policy: &FeaturePolicy) -> u8 {
    match policy {
        FeaturePolicy::LegacyAllowed => 0,
        FeaturePolicy::ThresholdAttestedRequired => 1,
        FeaturePolicy::StrictRequired => 2,
    }
}

pub fn cancel_rank(policy: &CancelPolicy) -> u8 {
    match policy {
        CancelPolicy::LegacyAllowed => 0,
        CancelPolicy::NoCancelAfterParticipation => 1,
    }
}

pub fn validate_governance_policy_v3(
    quorum_policy: &QuorumPolicyV3,
    reveal_rebate_policy: &RevealRebatePolicyV3,
    reveal_rebate_lamports: u64,
) -> Result<()> {
    match quorum_policy {
        QuorumPolicyV3::LegacyRevealParticipation | QuorumPolicyV3::TokenSupplyParticipation => {}
    }
    match reveal_rebate_policy {
        RevealRebatePolicyV3::Disabled => {
            require!(
                reveal_rebate_lamports == 0,
                Error::InvalidRevealRebateConfig
            );
        }
        RevealRebatePolicyV3::DedicatedVaultRequired => {
            require!(
                reveal_rebate_lamports > 0
                    && reveal_rebate_lamports <= MAX_REVEAL_REBATE_V3_LAMPORTS,
                Error::InvalidRevealRebateConfig
            );
        }
    }
    Ok(())
}

pub fn validate_settlement_policy_v3(
    min_evidence_age_seconds: i64,
    max_payout_amount: u64,
    _require_refhe_settlement: bool,
    _require_magicblock_settlement: bool,
) -> Result<()> {
    require!(
        min_evidence_age_seconds >= 0,
        Error::InvalidSettlementPolicyV3
    );
    require!(max_payout_amount > 0, Error::InvalidSettlementPolicyV3);
    Ok(())
}

pub fn reveal_rebate_vault_address(dao: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[b"reveal-rebate-vault-v3", dao.as_ref()], &crate::ID).0
}

pub fn canonical_proposal_payload_hash(
    dao: &Pubkey,
    proposal: &Pubkey,
    object_version: u8,
) -> [u8; 32] {
    let version = [object_version];
    hash_bytes(&[
        PROOF_PAYLOAD_DOMAIN_V1,
        dao.as_ref(),
        proposal.as_ref(),
        version.as_ref(),
    ])
}

pub fn finalize_proposal_state_v3(
    dao: &Account<Dao>,
    p: &mut Account<Proposal>,
    snapshot: &Account<ProposalGovernancePolicySnapshotV3>,
    now: i64,
) -> Result<()> {
    let quorum_met = match snapshot.quorum_policy {
        QuorumPolicyV3::LegacyRevealParticipation => {
            p.commit_count > 0
                && (p.reveal_count as u128) * 100
                    >= (p.commit_count as u128) * (dao.quorum_percentage as u128)
        }
        QuorumPolicyV3::TokenSupplyParticipation => {
            snapshot.eligible_capital > 0
                && ((p.yes_capital as u128) + (p.no_capital as u128)) * 100
                    >= (snapshot.eligible_capital as u128) * (dao.quorum_percentage as u128)
        }
    };

    let passed = if quorum_met {
        match &dao.voting_config {
            VotingConfig::TokenWeighted => {
                let total = p.yes_capital + p.no_capital;
                total > 0 && p.yes_capital > p.no_capital
            }
            VotingConfig::Quadratic => {
                let total = p.yes_community + p.no_community;
                total > 0 && p.yes_community > p.no_community
            }
            VotingConfig::DualChamber {
                capital_threshold,
                community_threshold,
            } => {
                let cap_total = p.yes_capital + p.no_capital;
                let capital_passes = cap_total > 0
                    && (p.yes_capital as u128) * 100
                        >= (cap_total as u128) * (*capital_threshold as u128);

                let com_total = p.yes_community + p.no_community;
                let community_passes = com_total > 0
                    && (p.yes_community as u128) * 100
                        >= (com_total as u128) * (*community_threshold as u128);

                capital_passes && community_passes
            }
        }
    } else {
        false
    };

    p.status = if passed {
        ProposalStatus::Passed
    } else {
        ProposalStatus::Failed
    };

    if passed {
        p.execution_unlocks_at = now
            .checked_add(dao.execution_delay_seconds)
            .ok_or(Error::Overflow)?;
    }

    emit!(crate::ProposalFinalizedV3 {
        proposal: p.key(),
        yes_capital: p.yes_capital,
        no_capital: p.no_capital,
        yes_community: p.yes_community,
        no_community: p.no_community,
        passed,
        quorum_met,
        commit_count: p.commit_count,
        reveal_count: p.reveal_count,
        eligible_capital: snapshot.eligible_capital,
        quorum_policy: snapshot.quorum_policy.clone(),
        execution_unlocks_at: p.execution_unlocks_at,
    });
    Ok(())
}

pub fn canonical_payout_fields_hash(
    dao: &Pubkey,
    proposal: &Pubkey,
    plan: &Account<crate::ConfidentialPayoutPlan>,
) -> [u8; 32] {
    let plan_key = plan.key();
    let token_mint = plan.token_mint.unwrap_or_default();
    let payout_type = [plan.payout_type.seed_byte()];
    let asset_type = [plan.asset_type.seed_byte()];
    let recipient_count = plan.recipient_count.to_le_bytes();
    let total_amount = plan.total_amount.to_le_bytes();
    hash_bytes(&[
        PAYOUT_PAYLOAD_DOMAIN_V1,
        dao.as_ref(),
        proposal.as_ref(),
        plan_key.as_ref(),
        payout_type.as_ref(),
        asset_type.as_ref(),
        plan.settlement_recipient.as_ref(),
        token_mint.as_ref(),
        recipient_count.as_ref(),
        total_amount.as_ref(),
        plan.manifest_hash.as_ref(),
        plan.ciphertext_hash.as_ref(),
    ])
}

pub fn validate_attestor_policy(
    attestors: &[Pubkey; MAX_POLICY_ATTESTORS],
    attestor_count: u8,
    threshold: u8,
) -> Result<()> {
    require!(
        attestor_count > 0 && (attestor_count as usize) <= MAX_POLICY_ATTESTORS,
        Error::InvalidSecurityPolicy
    );
    require!(
        threshold > 0 && threshold <= attestor_count,
        Error::InvalidSecurityPolicy
    );
    for idx in 0..attestor_count as usize {
        require!(
            attestors[idx] != Pubkey::default(),
            Error::InvalidSecurityPolicy
        );
        for prior in 0..idx {
            require!(
                attestors[prior] != attestors[idx],
                Error::InvalidSecurityPolicy
            );
        }
    }
    Ok(())
}

pub fn count_matching_signers(
    primary_signer: Option<Pubkey>,
    remaining_accounts: &[AccountInfo],
    attestors: &[Pubkey; MAX_POLICY_ATTESTORS],
    attestor_count: u8,
) -> u8 {
    let mut matched = [false; MAX_POLICY_ATTESTORS];
    if let Some(primary) = primary_signer {
        for idx in 0..attestor_count as usize {
            if attestors[idx] == primary {
                matched[idx] = true;
            }
        }
    }
    for account in remaining_accounts {
        if !account.is_signer {
            continue;
        }
        for idx in 0..attestor_count as usize {
            if attestors[idx] == account.key() {
                matched[idx] = true;
            }
        }
    }
    matched
        .iter()
        .take(attestor_count as usize)
        .filter(|seen| **seen)
        .count() as u8
}

pub fn validate_zk_receipt(
    dao: &Account<Dao>,
    proposal: &Account<Proposal>,
    receipt_info: &UncheckedAccount,
    expected_layer: ZkProofLayer,
    required_mode: Option<ZkVerificationMode>,
) -> Result<()> {
    let (expected_receipt, _) = Pubkey::find_program_address(
        &[
            b"zk-verify",
            proposal.key().as_ref(),
            &[expected_layer.seed_byte()],
        ],
        &crate::ID,
    );
    require!(
        receipt_info.key() == expected_receipt,
        Error::ZkVerificationReceiptMismatch
    );
    require!(
        account_exists(&receipt_info.to_account_info()),
        Error::ZkVerificationReceiptMissing
    );
    let mut data: &[u8] = &receipt_info.data.borrow();
    let receipt = ZkVerificationReceipt::try_deserialize(&mut data)
        .map_err(|_| error!(Error::ZkVerificationReceiptMismatch))?;
    require!(
        receipt.dao == dao.key()
            && receipt.proposal == proposal.key()
            && receipt.layer == expected_layer,
        Error::ZkVerificationReceiptMismatch
    );
    require!(
        receipt.verification_mode == ZkVerificationMode::Parallel
            || receipt.verification_mode == ZkVerificationMode::ZkEnforced,
        Error::ZkVerificationReceiptMismatch
    );
    if let Some(mode) = required_mode {
        require!(
            receipt.verification_mode == mode,
            Error::InsufficientZkVerificationMode
        );
        if mode == ZkVerificationMode::ZkEnforced {
            require!(
                receipt.verifier_program.is_some(),
                Error::ZkVerifierProgramRequired
            );
        }
    }
    Ok(())
}

pub fn finalize_proposal_state(
    dao: &Account<Dao>,
    p: &mut Account<Proposal>,
    now: i64,
) -> Result<()> {
    let quorum_met = p.commit_count > 0
        && (p.reveal_count as u128) * 100
            >= (p.commit_count as u128) * (dao.quorum_percentage as u128);

    let passed = if quorum_met {
        match &dao.voting_config {
            VotingConfig::TokenWeighted => {
                let total = p.yes_capital + p.no_capital;
                total > 0 && p.yes_capital > p.no_capital
            }
            VotingConfig::Quadratic => {
                let total = p.yes_community + p.no_community;
                total > 0 && p.yes_community > p.no_community
            }
            VotingConfig::DualChamber {
                capital_threshold,
                community_threshold,
            } => {
                let cap_total = p.yes_capital + p.no_capital;
                let capital_passes = cap_total > 0
                    && (p.yes_capital as u128) * 100
                        >= (cap_total as u128) * (*capital_threshold as u128);

                let com_total = p.yes_community + p.no_community;
                let community_passes = com_total > 0
                    && (p.yes_community as u128) * 100
                        >= (com_total as u128) * (*community_threshold as u128);

                capital_passes && community_passes
            }
        }
    } else {
        false
    };

    p.status = if passed {
        ProposalStatus::Passed
    } else {
        ProposalStatus::Failed
    };

    if passed {
        p.execution_unlocks_at = now
            .checked_add(dao.execution_delay_seconds)
            .ok_or(Error::Overflow)?;
    }

    emit!(crate::ProposalFinalized {
        proposal: p.key(),
        yes_capital: p.yes_capital,
        no_capital: p.no_capital,
        yes_community: p.yes_community,
        no_community: p.no_community,
        passed,
        quorum_met,
        commit_count: p.commit_count,
        reveal_count: p.reveal_count,
        execution_unlocks_at: p.execution_unlocks_at,
    });
    Ok(())
}

pub fn parse_token_account(info: &AccountInfo, expected_program: &Pubkey) -> Result<TokenAccount> {
    require!(*info.owner == *expected_program, Error::InvalidTokenProgram);
    let mut data: &[u8] = &info.try_borrow_data()?;
    TokenAccount::try_deserialize_unchecked(&mut data)
}

pub fn validate_supported_token_program(program_id: &Pubkey) -> Result<()> {
    require!(
        *program_id == anchor_spl::token::ID || *program_id == anchor_spl::token_2022::ID,
        Error::InvalidTokenProgram
    );
    Ok(())
}

pub fn validate_voting_config(cfg: &VotingConfig) -> Result<()> {
    if let VotingConfig::DualChamber {
        capital_threshold,
        community_threshold,
    } = cfg
    {
        require!(
            *capital_threshold > 0 && *capital_threshold <= 100,
            Error::InvalidThreshold
        );
        require!(
            *community_threshold > 0 && *community_threshold <= 100,
            Error::InvalidThreshold
        );
    }
    Ok(())
}

pub fn validate_treasury_action(action: &TreasuryAction) -> Result<()> {
    match action.action_type {
        TreasuryActionType::SendSol => {
            require!(action.amount_lamports > 0, Error::InvalidTreasuryAction);
            require!(action.token_mint.is_none(), Error::InvalidTreasuryAction);
            require!(
                action.recipient != Pubkey::default(),
                Error::InvalidTreasuryAction
            );
        }
        TreasuryActionType::SendToken => {
            require!(action.amount_lamports > 0, Error::InvalidTreasuryAction);
            require!(
                action.requires_token_mint() && action.token_mint.is_some(),
                Error::TokenMintRequired
            );
            require!(
                action.recipient != Pubkey::default(),
                Error::InvalidTreasuryAction
            );
        }
        TreasuryActionType::CustomCPI => {
            return err!(Error::UnsupportedTreasuryAction);
        }
    }
    Ok(())
}

pub fn validate_confidential_payout_plan(
    asset_type: &ConfidentialAssetType,
    settlement_recipient: Pubkey,
    token_mint: &Option<Pubkey>,
    recipient_count: u16,
    total_amount: u64,
    encrypted_manifest_uri: &str,
    manifest_hash: &[u8; 32],
    ciphertext_hash: &[u8; 32],
) -> Result<()> {
    require!(
        settlement_recipient != Pubkey::default(),
        Error::InvalidConfidentialPayoutPlan
    );
    require!(recipient_count > 0, Error::InvalidConfidentialPayoutPlan);
    require!(total_amount > 0, Error::InvalidConfidentialPayoutPlan);
    require!(
        !encrypted_manifest_uri.trim().is_empty()
            && encrypted_manifest_uri.len() <= ConfidentialPayoutPlan::MAX_URI_LEN,
        Error::ConfidentialManifestUriTooLong
    );
    require!(
        !is_zero_hash(manifest_hash) && !is_zero_hash(ciphertext_hash),
        Error::InvalidZkArtifactHash
    );

    match asset_type {
        ConfidentialAssetType::Sol => {
            require!(token_mint.is_none(), Error::InvalidConfidentialPayoutPlan);
        }
        ConfidentialAssetType::Token => {
            require!(
                token_mint.is_some(),
                Error::ConfidentialPayoutTokenMintRequired
            );
        }
    }

    Ok(())
}

pub fn validate_refhe_envelope(
    model_uri: &str,
    policy_hash: &[u8; 32],
    input_ciphertext_hash: &[u8; 32],
    evaluation_key_hash: &[u8; 32],
) -> Result<()> {
    require!(
        !model_uri.trim().is_empty() && model_uri.len() <= RefheEnvelope::MAX_URI_LEN,
        Error::InvalidRefheEnvelope
    );
    require!(
        !is_zero_hash(policy_hash)
            && !is_zero_hash(input_ciphertext_hash)
            && !is_zero_hash(evaluation_key_hash),
        Error::InvalidRefheEnvelope
    );
    Ok(())
}

pub fn validate_magicblock_corridor(
    api_base_url: &str,
    cluster: &str,
    owner_wallet: Pubkey,
    settlement_wallet: Pubkey,
    token_mint: Option<Pubkey>,
    route_hash: &[u8; 32],
    deposit_amount: u64,
    private_transfer_amount: u64,
    withdrawal_amount: u64,
) -> Result<()> {
    require!(
        !api_base_url.trim().is_empty()
            && api_base_url.len() <= MagicBlockPrivatePaymentCorridor::MAX_API_BASE_LEN,
        Error::MagicBlockApiBaseUrlTooLong
    );
    require!(
        !cluster.trim().is_empty()
            && cluster.len() <= MagicBlockPrivatePaymentCorridor::MAX_CLUSTER_LEN,
        Error::MagicBlockClusterTooLong
    );
    require!(
        owner_wallet != Pubkey::default() && settlement_wallet != Pubkey::default(),
        Error::InvalidMagicBlockCorridor
    );
    require!(token_mint.is_some(), Error::MagicBlockTokenMintRequired);
    require!(!is_zero_hash(route_hash), Error::InvalidMagicBlockCorridor);
    require!(
        private_transfer_amount > 0,
        Error::InvalidMagicBlockCorridor
    );
    require!(
        deposit_amount > 0 || withdrawal_amount > 0 || private_transfer_amount > 0,
        Error::InvalidMagicBlockCorridor
    );
    Ok(())
}

pub fn validate_magicblock_tx_signature(signature: &str, allow_empty: bool) -> Result<()> {
    if allow_empty && signature.trim().is_empty() {
        return Ok(());
    }
    require!(
        !signature.trim().is_empty()
            && signature.len() <= MagicBlockPrivatePaymentCorridor::MAX_SIGNATURE_LEN,
        Error::InvalidMagicBlockCorridor
    );
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_pubkey(seed: u8) -> Pubkey {
        Pubkey::new_from_array([seed; 32])
    }

    fn sample_treasury_action(
        action_type: TreasuryActionType,
        recipient: Pubkey,
        amount_lamports: u64,
        token_mint: Option<Pubkey>,
    ) -> TreasuryAction {
        TreasuryAction {
            action_type,
            amount_lamports,
            recipient,
            token_mint,
        }
    }

    fn sample_attestors(
        first: Pubkey,
        second: Pubkey,
        third: Pubkey,
    ) -> [Pubkey; MAX_POLICY_ATTESTORS] {
        let mut attestors = [Pubkey::default(); MAX_POLICY_ATTESTORS];
        attestors[0] = first;
        attestors[1] = second;
        attestors[2] = third;
        attestors
    }

    fn signer_account_info(key: Pubkey, is_signer: bool) -> AccountInfo<'static> {
        let key = Box::leak(Box::new(key));
        let owner = Box::leak(Box::new(Pubkey::default()));
        let lamports = Box::leak(Box::new(1u64));
        let data = Box::leak(Vec::<u8>::new().into_boxed_slice());
        AccountInfo::new(key, is_signer, false, lamports, data, owner, false)
    }

    #[test]
    fn vote_commitment_is_deterministic_and_domain_bound() {
        assert_eq!(isqrt(0), 0);
        assert_eq!(isqrt(1), 1);
        assert_eq!(isqrt(15), 3);
        assert_eq!(isqrt(16), 4);
        assert_eq!(isqrt(17), 4);

        let proposal = sample_pubkey(1);
        let voter = sample_pubkey(2);
        let salt = [9u8; 32];

        let first = compute_vote_commitment(&proposal, &voter, true, &salt);
        let second = compute_vote_commitment(&proposal, &voter, true, &salt);
        let different_vote = compute_vote_commitment(&proposal, &voter, false, &salt);
        let different_proposal = compute_vote_commitment(&sample_pubkey(3), &voter, true, &salt);

        assert_eq!(first, second);
        assert_ne!(first, different_vote);
        assert_ne!(first, different_proposal);
    }

    #[test]
    fn proof_domain_separator_matches_explicit_hash() {
        let dao = sample_pubkey(4);
        let proposal = sample_pubkey(5);

        assert_eq!(
            proof_domain_separator(&dao, &proposal),
            hash_bytes(&[PROOF_PAYLOAD_DOMAIN_V1, dao.as_ref(), proposal.as_ref()])
        );
    }

    #[test]
    fn governance_policy_validation_enforces_rebate_shape() {
        assert!(validate_governance_policy_v3(
            &QuorumPolicyV3::LegacyRevealParticipation,
            &RevealRebatePolicyV3::Disabled,
            0,
        )
        .is_ok());
        assert!(validate_governance_policy_v3(
            &QuorumPolicyV3::TokenSupplyParticipation,
            &RevealRebatePolicyV3::DedicatedVaultRequired,
            1,
        )
        .is_ok());

        assert!(validate_governance_policy_v3(
            &QuorumPolicyV3::LegacyRevealParticipation,
            &RevealRebatePolicyV3::Disabled,
            1,
        )
        .is_err());
        assert!(validate_governance_policy_v3(
            &QuorumPolicyV3::TokenSupplyParticipation,
            &RevealRebatePolicyV3::DedicatedVaultRequired,
            0,
        )
        .is_err());
        assert!(validate_governance_policy_v3(
            &QuorumPolicyV3::TokenSupplyParticipation,
            &RevealRebatePolicyV3::DedicatedVaultRequired,
            MAX_REVEAL_REBATE_V3_LAMPORTS + 1,
        )
        .is_err());
    }

    #[test]
    fn settlement_policy_validation_rejects_invalid_bounds() {
        assert!(validate_settlement_policy_v3(0, 1, true, false).is_ok());
        assert!(validate_settlement_policy_v3(-1, 1, true, false).is_err());
        assert!(validate_settlement_policy_v3(0, 0, true, false).is_err());
    }

    #[test]
    fn voting_config_validation_accepts_simple_modes_and_bounds_dual_chamber() {
        assert!(validate_voting_config(&VotingConfig::TokenWeighted).is_ok());
        assert!(validate_voting_config(&VotingConfig::Quadratic).is_ok());
        assert!(validate_voting_config(&VotingConfig::DualChamber {
            capital_threshold: 60,
            community_threshold: 55,
        })
        .is_ok());

        assert!(validate_voting_config(&VotingConfig::DualChamber {
            capital_threshold: 0,
            community_threshold: 55,
        })
        .is_err());
        assert!(validate_voting_config(&VotingConfig::DualChamber {
            capital_threshold: 60,
            community_threshold: 0,
        })
        .is_err());
        assert!(validate_voting_config(&VotingConfig::DualChamber {
            capital_threshold: 101,
            community_threshold: 55,
        })
        .is_err());
        assert!(validate_voting_config(&VotingConfig::DualChamber {
            capital_threshold: 60,
            community_threshold: 101,
        })
        .is_err());
    }

    #[test]
    fn attestor_policy_rejects_duplicate_default_and_invalid_thresholds() {
        let first = sample_pubkey(14);
        let second = sample_pubkey(15);
        let third = sample_pubkey(16);

        assert!(validate_attestor_policy(&sample_attestors(first, second, third), 3, 2).is_ok());

        assert!(validate_attestor_policy(&sample_attestors(first, second, third), 0, 1).is_err());
        assert!(validate_attestor_policy(&sample_attestors(first, second, third), 3, 0).is_err());
        assert!(validate_attestor_policy(&sample_attestors(first, second, third), 2, 3).is_err());

        let duplicate = sample_attestors(first, second, second);
        assert!(validate_attestor_policy(&duplicate, 3, 2).is_err());

        let with_default = sample_attestors(first, Pubkey::default(), third);
        assert!(validate_attestor_policy(&with_default, 3, 2).is_err());
    }

    #[test]
    fn matching_signers_are_counted_once_across_primary_and_remaining() {
        let first = sample_pubkey(17);
        let second = sample_pubkey(18);
        let third = sample_pubkey(19);
        let outsider = sample_pubkey(20);
        let attestors = sample_attestors(first, second, third);

        let duplicate_primary = signer_account_info(first, true);
        let second_signer = signer_account_info(second, true);
        let unsigned_third = signer_account_info(third, false);
        let outsider_signer = signer_account_info(outsider, true);

        let remaining = vec![
            duplicate_primary,
            second_signer,
            unsigned_third,
            outsider_signer,
        ];

        assert_eq!(
            count_matching_signers(Some(first), &remaining, &attestors, 3),
            2
        );
        assert_eq!(count_matching_signers(None, &remaining, &attestors, 3), 2);
    }

    #[test]
    fn token_program_validation_accepts_only_supported_programs() {
        assert!(validate_supported_token_program(&anchor_spl::token::ID).is_ok());
        assert!(validate_supported_token_program(&anchor_spl::token_2022::ID).is_ok());
        assert!(validate_supported_token_program(&sample_pubkey(6)).is_err());
    }

    #[test]
    fn treasury_action_validation_rejects_wrong_asset_shape() {
        let recipient = sample_pubkey(7);
        let token_mint = sample_pubkey(8);

        assert!(validate_treasury_action(&sample_treasury_action(
            TreasuryActionType::SendSol,
            recipient,
            10,
            None,
        ))
        .is_ok());
        assert!(validate_treasury_action(&sample_treasury_action(
            TreasuryActionType::SendToken,
            recipient,
            10,
            Some(token_mint),
        ))
        .is_ok());

        assert!(validate_treasury_action(&sample_treasury_action(
            TreasuryActionType::SendSol,
            recipient,
            10,
            Some(token_mint),
        ))
        .is_err());
        assert!(validate_treasury_action(&sample_treasury_action(
            TreasuryActionType::SendToken,
            recipient,
            10,
            None,
        ))
        .is_err());
        assert!(validate_treasury_action(&sample_treasury_action(
            TreasuryActionType::SendSol,
            Pubkey::default(),
            10,
            None,
        ))
        .is_err());
    }

    #[test]
    fn confidential_payout_validation_enforces_asset_requirements() {
        let recipient = sample_pubkey(9);
        let token_mint = sample_pubkey(10);
        let non_zero_hash = [1u8; 32];

        assert!(validate_confidential_payout_plan(
            &ConfidentialAssetType::Sol,
            recipient,
            &None,
            1,
            10,
            "box://manifest/sol",
            &non_zero_hash,
            &non_zero_hash,
        )
        .is_ok());
        assert!(validate_confidential_payout_plan(
            &ConfidentialAssetType::Token,
            recipient,
            &Some(token_mint),
            1,
            10,
            "box://manifest/token",
            &non_zero_hash,
            &non_zero_hash,
        )
        .is_ok());

        assert!(validate_confidential_payout_plan(
            &ConfidentialAssetType::Sol,
            recipient,
            &Some(token_mint),
            1,
            10,
            "box://manifest/sol",
            &non_zero_hash,
            &non_zero_hash,
        )
        .is_err());
        assert!(validate_confidential_payout_plan(
            &ConfidentialAssetType::Token,
            recipient,
            &None,
            1,
            10,
            "box://manifest/token",
            &non_zero_hash,
            &non_zero_hash,
        )
        .is_err());
        assert!(validate_confidential_payout_plan(
            &ConfidentialAssetType::Token,
            recipient,
            &Some(token_mint),
            0,
            10,
            "box://manifest/token",
            &non_zero_hash,
            &non_zero_hash,
        )
        .is_err());
    }

    #[test]
    fn refhe_envelope_validation_rejects_empty_or_zero_hashes() {
        let non_zero_hash = [2u8; 32];

        assert!(validate_refhe_envelope(
            "box://refhe/model",
            &non_zero_hash,
            &non_zero_hash,
            &non_zero_hash,
        )
        .is_ok());
        assert!(
            validate_refhe_envelope("", &non_zero_hash, &non_zero_hash, &non_zero_hash,).is_err()
        );
        assert!(validate_refhe_envelope(
            "box://refhe/model",
            &[0u8; 32],
            &non_zero_hash,
            &non_zero_hash,
        )
        .is_err());
    }

    #[test]
    fn magicblock_corridor_validation_requires_token_mint_and_non_zero_route() {
        let owner = sample_pubkey(11);
        let settlement = sample_pubkey(12);
        let token_mint = sample_pubkey(13);
        let non_zero_hash = [3u8; 32];

        assert!(validate_magicblock_corridor(
            "https://rpc.magicblock.app",
            "devnet",
            owner,
            settlement,
            Some(token_mint),
            &non_zero_hash,
            10,
            5,
            1,
        )
        .is_ok());
        assert!(validate_magicblock_corridor(
            "https://rpc.magicblock.app",
            "devnet",
            owner,
            settlement,
            None,
            &non_zero_hash,
            10,
            5,
            1,
        )
        .is_err());
        assert!(validate_magicblock_corridor(
            "https://rpc.magicblock.app",
            "devnet",
            owner,
            settlement,
            Some(token_mint),
            &[0u8; 32],
            10,
            5,
            1,
        )
        .is_err());
    }

    #[test]
    fn magicblock_signature_validation_respects_allow_empty() {
        assert!(validate_magicblock_tx_signature("", true).is_ok());
        assert!(validate_magicblock_tx_signature("", false).is_err());
        assert!(validate_magicblock_tx_signature("5KZnxXobUWECRHq41DomD1RZf62vo9ysyjveBRzra8FYtz5oCH5tc2Puy9CpvxnYVfUr3sFdBm7jkSEXDdtFEcFm", false).is_ok());
    }
}
