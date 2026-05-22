use anchor_lang::prelude::*;

#[error_code]
pub enum Error {
    #[msg("DAO name max 64 chars")]
    NameTooLong,
    #[msg("Quorum must be 1–100")]
    InvalidQuorum,
    #[msg("Reveal window must be at least 5 seconds")]
    RevealWindowTooShort,
    #[msg("Voting duration must be at least 5 seconds")]
    VotingDurationTooShort,
    #[msg("Execution delay must be non-negative")]
    InvalidExecutionDelay,
    #[msg("Title max 128 chars")]
    TitleTooLong,
    #[msg("Description max 1024 chars")]
    DescriptionTooLong,
    #[msg("Voting is not open")]
    VotingNotOpen,
    #[msg("Voting period has closed")]
    VotingClosed,
    #[msg("Already committed a vote")]
    AlreadyCommitted,
    #[msg("Reveal phase has not started yet")]
    RevealTooEarly,
    #[msg("Reveal window has closed")]
    RevealClosed,
    #[msg("Reveal phase is still open")]
    RevealStillOpen,
    #[msg("No commitment found for this voter")]
    NotCommitted,
    #[msg("Vote already revealed")]
    AlreadyRevealed,
    #[msg("Commitment hash does not match")]
    CommitmentMismatch,
    #[msg("Proposal has already been finalized")]
    AlreadyFinalized,
    #[msg("Not enough governance tokens")]
    InsufficientTokens,
    #[msg("Not authorized to reveal this vote")]
    NotAuthorizedToReveal,
    #[msg("New DAO authority must differ from the current authority and cannot be the default pubkey")]
    InvalidDaoAuthorityTransfer,
    #[msg("Only the current DAO authority may transfer DAO operating authority")]
    UnauthorizedDaoAuthorityTransfer,
    #[msg("Threshold must be 1–100")]
    InvalidThreshold,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Can only cancel voting proposals before any commit or reveal starts")]
    ProposalNotCancellable,
    #[msg("Proposal did not pass")]
    ProposalNotPassed,
    #[msg("Treasury action already executed")]
    AlreadyExecuted,
    #[msg("Execution timelock has not yet expired")]
    ExecutionTimelockActive,
    #[msg("Veto window has expired — timelock has passed")]
    VetoWindowExpired,
    #[msg("This delegation has already been used")]
    DelegationAlreadyUsed,
    #[msg("Caller is not the designated delegatee")]
    NotDelegatee,
    #[msg("Delegation belongs to a different proposal")]
    WrongProposal,
    #[msg("Delegatee must be a real wallet and cannot self-delegate")]
    InvalidDelegatee,
    #[msg("Delegators cannot delegate to themselves")]
    SelfDelegationNotAllowed,
    #[msg("Treasury action payload is invalid")]
    InvalidTreasuryAction,
    #[msg("SendToken action requires token_mint")]
    TokenMintRequired,
    #[msg("Executor must use action recipient")]
    TreasuryRecipientMismatch,
    #[msg("Treasury token account must be treasury-owned")]
    InvalidTreasuryTokenAuthority,
    #[msg("Provided token mint does not match action")]
    InvalidTokenMint,
    #[msg("Token program account does not match the supplied mint/accounts")]
    InvalidTokenProgram,
    #[msg("Recipient token owner does not match action")]
    RecipientOwnerMismatch,
    #[msg("Treasury token source and recipient token destination must differ")]
    DuplicateTokenAccounts,
    #[msg("Token account is invalid or owned by wrong program")]
    InvalidTokenAccount,
    #[msg("Governing mint must match DAO governance token")]
    GoverningMintMismatch,
    #[msg("Direct voting and delegation cannot overlap for the same proposal")]
    DelegationOverlap,
    #[msg("Delegation is blocked because this wallet already committed directly")]
    DirectVoteAlreadyCommitted,
    #[msg("CustomCPI actions are reserved and not executable in the current release")]
    UnsupportedTreasuryAction,
    #[msg("Only the DAO authority or proposal proposer may anchor zk proof material")]
    UnauthorizedZkAnchor,
    #[msg("Only the DAO authority may record zk_enforced receipts; proposers may only record parallel receipts")]
    UnauthorizedZkVerifier,
    #[msg("ZK proof anchor hashes must be non-zero")]
    InvalidZkArtifactHash,
    #[msg("Phase A only allows the parallel on-chain verification mode")]
    InvalidZkVerificationMode,
    #[msg("The provided zk proof anchor does not match the expected proposal-bound layer")]
    ZkProofAnchorMismatch,
    #[msg("Only the DAO authority may enable zk_enforced mode; proposers may only configure non-enforced zk modes")]
    UnauthorizedZkModeConfig,
    #[msg("Proposal zk mode can only be configured before commits or reveals begin")]
    ProposalZkModeLocked,
    #[msg("Required zk verification receipt is missing")]
    ZkVerificationReceiptMissing,
    #[msg("Provided zk verification receipt does not match the expected proposal-bound layer")]
    ZkVerificationReceiptMismatch,
    #[msg("Selected proposal is not configured for zk_enforced finalization")]
    ProposalNotZkEnforced,
    #[msg("Once a proposal is locked to zk_enforced mode it cannot be downgraded or reconfigured")]
    ProposalZkModeImmutable,
    #[msg("This proposal requires zk_enforced verification receipts, not only parallel receipts")]
    InsufficientZkVerificationMode,
    #[msg("zk_enforced receipts must identify the verifier program boundary")]
    ZkVerifierProgramRequired,
    #[msg("Only the DAO authority or proposal proposer may configure confidential payout plans")]
    UnauthorizedConfidentialPayoutOperator,
    #[msg("Confidential payout plans can only be configured before commits or reveals begin")]
    ConfidentialPayoutPlanLocked,
    #[msg("Confidential payout plan does not match the expected proposal-bound PDA")]
    ConfidentialPayoutPlanMismatch,
    #[msg("Confidential payout plan is invalid")]
    InvalidConfidentialPayoutPlan,
    #[msg(
        "Confidential payout encrypted manifest URI must be non-empty and at most 256 characters"
    )]
    ConfidentialManifestUriTooLong,
    #[msg("This proposal already executed its confidential payout batch")]
    ConfidentialPayoutAlreadyFunded,
    #[msg("Token payout batches require a token mint")]
    ConfidentialPayoutTokenMintRequired,
    #[msg("Confidential payout plans cannot coexist with a direct treasury action on the same proposal")]
    ConfidentialPayoutConflictsWithTreasuryAction,
    #[msg("This proposal must execute through the confidential payout path rather than the standard treasury execution path")]
    UseConfidentialPayoutExecution,
    #[msg("Only the DAO authority may settle REFHE envelopes; proposers may only configure them before voting starts")]
    UnauthorizedRefheOperator,
    #[msg("REFHE envelope is invalid")]
    InvalidRefheEnvelope,
    #[msg("REFHE envelope does not match the expected proposal-bound payout plan")]
    RefheEnvelopeMismatch,
    #[msg("REFHE envelope is locked and cannot be changed in the current lifecycle state")]
    RefheEnvelopeLocked,
    #[msg("REFHE settlement is required before executing this confidential payout plan")]
    RefheSettlementRequired,
    #[msg("REFHE settlement must identify the verifier program boundary")]
    RefheVerifierProgramRequired,
    #[msg("Only the DAO authority may settle MagicBlock private payment corridors; proposers may only configure them before voting starts")]
    UnauthorizedMagicBlockOperator,
    #[msg("MagicBlock private payment corridor is invalid")]
    InvalidMagicBlockCorridor,
    #[msg("MagicBlock private payment corridors are locked in the current lifecycle state")]
    MagicBlockCorridorLocked,
    #[msg("MagicBlock private payment corridor does not match the expected proposal-bound payout plan")]
    MagicBlockCorridorMismatch,
    #[msg("MagicBlock private payment corridor requires a token payout mint")]
    MagicBlockTokenMintRequired,
    #[msg("MagicBlock private payment corridor settlement is required before executing this confidential payout plan")]
    MagicBlockSettlementRequired,
    #[msg("MagicBlock API base URL must be non-empty and at most 128 characters")]
    MagicBlockApiBaseUrlTooLong,
    #[msg("MagicBlock cluster selector must be non-empty and at most 64 characters")]
    MagicBlockClusterTooLong,
    #[msg("DAO security policy is invalid")]
    InvalidSecurityPolicy,
    #[msg("DAO security policy was already initialized with a different configuration")]
    SecurityPolicyAlreadyInitialized,
    #[msg("DAO security policy updates cannot roll back to weaker enforcement")]
    PolicyRollbackNotAllowed,
    #[msg("DAO governance policy v3 is invalid")]
    InvalidGovernancePolicy,
    #[msg("DAO governance policy v3 was already initialized with a different configuration")]
    GovernancePolicyAlreadyInitialized,
    #[msg("DAO governance policy v3 does not match the expected DAO or authority")]
    GovernancePolicyMismatch,
    #[msg("Proposal governance snapshot v3 does not match the proposal or DAO")]
    GovernancePolicySnapshotMismatch,
    #[msg("Proposal governance snapshot v3 was already recorded under a different policy")]
    GovernancePolicySnapshotAlreadyRecorded,
    #[msg("DAO settlement policy v3 is invalid")]
    InvalidSettlementPolicyV3,
    #[msg("DAO settlement policy v3 was already initialized with a different configuration")]
    SettlementPolicyAlreadyInitialized,
    #[msg("DAO settlement policy updates cannot roll back to weaker execution requirements")]
    SettlementPolicyRollbackNotAllowed,
    #[msg("DAO settlement policy v3 does not match the expected DAO or authority")]
    SettlementPolicyMismatch,
    #[msg("Proposal settlement snapshot v3 does not match the proposal, DAO, or payout plan")]
    SettlementPolicySnapshotMismatch,
    #[msg("Proposal settlement snapshot v3 was already recorded under a different policy")]
    SettlementPolicySnapshotAlreadyRecorded,
    #[msg("Settlement evidence is still too fresh for V3 execution")]
    SettlementEvidenceTooFresh,
    #[msg("Confidential payout amount exceeds the V3 settlement cap")]
    PayoutAmountExceedsSettlementCap,
    #[msg("Reveal rebate configuration is invalid for V3 governance mode")]
    InvalidRevealRebateConfig,
    #[msg("Reveal rebate vault PDA does not match the DAO v3 governance configuration")]
    RevealRebateVaultMismatch,
    #[msg("DAO security policy does not match the expected DAO")]
    SecurityPolicyMismatch,
    #[msg("DAO security policy is emergency-disabled")]
    SecurityPolicyDisabled,
    #[msg("This instruction requires a strict or threshold-attested policy")]
    StrictPolicyRequired,
    #[msg("Required attestor threshold was not met by transaction signers")]
    AttestationThresholdNotMet,
    #[msg("Proposal policy snapshot does not match the proposal or DAO")]
    PolicySnapshotMismatch,
    #[msg("Proposal policy snapshot was already recorded under a different policy")]
    PolicySnapshotAlreadyRecorded,
    #[msg("Proof verification companion account does not match the proposal or DAO")]
    ProofVerificationMismatch,
    #[msg("Proof verification was already recorded with a different strict payload")]
    ProofVerificationAlreadyRecorded,
    #[msg("Proof verification is not in verified status")]
    ProofVerificationNotVerified,
    #[msg("Proof verification is stale or expired")]
    StaleProofVerification,
    #[msg("Proof payload hash does not match canonical executable payload")]
    PayloadHashMismatch,
    #[msg("Verification kind is not supported in this release")]
    UnsupportedVerificationKind,
    #[msg("Settlement evidence is invalid")]
    InvalidSettlementEvidence,
    #[msg("Settlement evidence does not match the payout plan, proposal, or DAO")]
    SettlementEvidenceMismatch,
    #[msg("Settlement evidence was already recorded with different strict evidence")]
    SettlementEvidenceAlreadyRecorded,
    #[msg("Settlement evidence is not verified")]
    SettlementEvidenceNotVerified,
    #[msg("Settlement evidence is stale or not yet valid")]
    StaleSettlementEvidence,
    #[msg("Proposal governance snapshot requires a non-zero eligible capital supply")]
    InvalidGovernanceSnapshot,
}
