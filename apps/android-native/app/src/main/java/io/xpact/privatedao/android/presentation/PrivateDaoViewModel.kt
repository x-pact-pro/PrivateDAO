package io.xpact.privatedao.android.presentation

import android.app.Application
import android.util.Log
import androidx.activity.result.ActivityResultLauncher
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import io.xpact.privatedao.android.config.PrivateDaoConfig
import io.xpact.privatedao.android.data.StoredVoteEnvelope
import io.xpact.privatedao.android.data.VoteEnvelopeStore
import io.xpact.privatedao.android.model.AwardEntry
import io.xpact.privatedao.android.model.CommitVoteForm
import io.xpact.privatedao.android.model.ConnectedWallet
import io.xpact.privatedao.android.model.CreateDaoForm
import io.xpact.privatedao.android.model.CreateProposalForm
import io.xpact.privatedao.android.model.DaoSummary
import io.xpact.privatedao.android.model.DepositTreasuryForm
import io.xpact.privatedao.android.model.ProposalActivity
import io.xpact.privatedao.android.model.ProposalActionResult
import io.xpact.privatedao.android.model.ProposalPhase
import io.xpact.privatedao.android.model.ProposalStatus
import io.xpact.privatedao.android.model.ProposalSummary
import io.xpact.privatedao.android.model.RevealVoteForm
import io.xpact.privatedao.android.model.SubmissionState
import io.xpact.privatedao.android.model.defaultDaoName
import io.xpact.privatedao.android.repository.PrivateDaoRepository
import io.xpact.privatedao.android.solana.Binary
import io.xpact.privatedao.android.solana.SolanaRpcClient
import io.xpact.privatedao.android.wallet.MobileWalletAdapterManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class PrivateDaoViewModel(application: Application) : AndroidViewModel(application) {
    private companion object {
        const val TAG = "PrivateDaoViewModel"
    }

    private val repository = PrivateDaoRepository(SolanaRpcClient(PrivateDaoConfig.rpcUrls))
    private val walletManager = MobileWalletAdapterManager(application)
    private val voteEnvelopeStore = VoteEnvelopeStore(application)

    private val _uiState = MutableStateFlow(
        UiState(
            wallet = walletManager.restoreSession(),
            isWalletAvailable = walletManager.isWalletEndpointAvailable(),
        )
    )
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            runCatching { repository.loadDashboard() }
                .onSuccess { snapshot ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                        proposals = snapshot.proposals,
                        daos = snapshot.daos,
                        createDaoForm = it.createDaoForm,
                        depositTreasuryForm = it.depositTreasuryForm.copy(
                            daoPubkey = it.depositTreasuryForm.daoPubkey.ifBlank { snapshot.daos.firstOrNull()?.pubkey.orEmpty() },
                        ),
                        createProposalForm = it.createProposalForm.copy(
                            daoPubkey = it.createProposalForm.daoPubkey.ifBlank { snapshot.daos.firstOrNull()?.pubkey.orEmpty() },
                        ),
                        )
                    }
                    uiState.value.selectedProposalPubkey?.let(::selectProposal)
                }
                .onFailure { error ->
                    _uiState.update {
                        val hasUsableState = it.wallet != null || it.daos.isNotEmpty() || it.proposals.isNotEmpty()
                        it.copy(
                            isLoading = false,
                            errorMessage = if (hasUsableState) null else "Devnet data refresh in progress. Tap Refresh to sync latest state.",
                            bannerMessage = if (hasUsableState) "Devnet read route switched automatically. Wallet actions remain available." else it.bannerMessage,
                        )
                    }
                }
        }
    }

    fun connectWallet(launcher: ActivityResultLauncher<MobileWalletAdapterManager.StartMobileWalletAdapterActivity.CreateParams>) {
        viewModelScope.launch {
            runWalletOperation {
                val wallet = walletManager.authorize(launcher)
                _uiState.update { state ->
                    state.copy(
                        wallet = wallet,
                        bannerMessage = "Wallet connected: ${wallet.publicKeyBase58.take(4)}…${wallet.publicKeyBase58.takeLast(4)}",
                    )
                }
            }
        }
    }

    fun disconnectWallet(launcher: ActivityResultLauncher<MobileWalletAdapterManager.StartMobileWalletAdapterActivity.CreateParams>) {
        val current = uiState.value.wallet ?: return
        viewModelScope.launch {
            runWalletOperation {
                walletManager.deauthorize(launcher, current)
                _uiState.update { it.copy(wallet = null, bannerMessage = "Wallet disconnected") }
            }
        }
    }

    fun selectProposal(proposalPubkey: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(selectedProposalPubkey = proposalPubkey, isLoadingActivity = true) }
            runCatching {
                val proposal = repository.loadProposal(proposalPubkey)
                val activity = repository.loadActivity(proposalPubkey)
                proposal to activity
            }.onSuccess { (proposal, activity) ->
                val saved = uiState.value.wallet?.publicKeyBase58?.let { voteEnvelopeStore.load(proposal.pubkey, it) }
                _uiState.update {
                    it.copy(
                        selectedProposal = proposal,
                        proposalActivity = activity,
                        isLoadingActivity = false,
                        depositTreasuryForm = it.depositTreasuryForm.copy(daoPubkey = proposal.dao),
                        createProposalForm = it.createProposalForm.copy(daoPubkey = proposal.dao),
                        revealVoteForm = saved?.let { env ->
                            it.revealVoteForm.copy(voteYes = env.voteYes, saltHex = env.saltHex, voterPubkeyOverride = "")
                        } ?: it.revealVoteForm,
                    )
                }
            }.onFailure { error ->
                _uiState.update { it.copy(isLoadingActivity = false, errorMessage = error.message ?: "Failed loading proposal detail") }
            }
        }
    }

    fun updateCreateProposalForm(transform: (CreateProposalForm) -> CreateProposalForm) {
        _uiState.update { it.copy(createProposalForm = transform(it.createProposalForm)) }
    }

    fun updateCreateDaoForm(transform: (CreateDaoForm) -> CreateDaoForm) {
        _uiState.update { it.copy(createDaoForm = transform(it.createDaoForm)) }
    }

    fun updateDepositTreasuryForm(transform: (DepositTreasuryForm) -> DepositTreasuryForm) {
        _uiState.update { it.copy(depositTreasuryForm = transform(it.depositTreasuryForm)) }
    }

    fun updateCommitVoteForm(transform: (CommitVoteForm) -> CommitVoteForm) {
        _uiState.update { it.copy(commitVoteForm = transform(it.commitVoteForm)) }
    }

    fun updateRevealVoteForm(transform: (RevealVoteForm) -> RevealVoteForm) {
        _uiState.update { it.copy(revealVoteForm = transform(it.revealVoteForm)) }
    }

    fun submitCreateProposal(launcher: ActivityResultLauncher<MobileWalletAdapterManager.StartMobileWalletAdapterActivity.CreateParams>) {
        if (guardSubmissionInFlight("proposal")) return
        val wallet = uiState.value.wallet ?: return setError("Connect a wallet first.")
        viewModelScope.launch {
            val submitted = runSubmission {
                val tx = withContext(Dispatchers.IO) {
                    repository.buildCreateProposalTransaction(wallet.publicKeyBase58, uiState.value.createProposalForm)
                }
                walletManager.signAndSendSingleTransaction(launcher, wallet, tx).toResult()
            }
            if (submitted) refresh()
        }
    }

    fun submitCreateDao(launcher: ActivityResultLauncher<MobileWalletAdapterManager.StartMobileWalletAdapterActivity.CreateParams>) {
        if (guardSubmissionInFlight("DAO bootstrap")) return
        val wallet = uiState.value.wallet ?: return setError("Connect a wallet first.")
        viewModelScope.launch {
            _uiState.update { it.copy(bannerMessage = "Preparing DAO bootstrap transaction...") }
            val submitted = runSubmission {
                val (tx, daoPda) = withContext(Dispatchers.IO) {
                    repository.buildCreateDaoTransaction(wallet.publicKeyBase58, uiState.value.createDaoForm)
                }
                val signature = walletManager.signAndSendSingleTransaction(launcher, wallet, tx)
                _uiState.update {
                    it.copy(
                        bannerMessage = "DAO bootstrap submitted. Expected DAO PDA: $daoPda",
                        depositTreasuryForm = it.depositTreasuryForm.copy(daoPubkey = daoPda),
                        createProposalForm = it.createProposalForm.copy(daoPubkey = daoPda),
                        createDaoForm = it.createDaoForm.copy(daoName = defaultDaoName()),
                    )
                }
                signature.toResult()
            }
            if (submitted) refresh()
        }
    }

    fun submitDepositTreasury(launcher: ActivityResultLauncher<MobileWalletAdapterManager.StartMobileWalletAdapterActivity.CreateParams>) {
        if (guardSubmissionInFlight("treasury deposit")) return
        val wallet = uiState.value.wallet ?: return setError("Connect a wallet first.")
        viewModelScope.launch {
            val submitted = runSubmission {
                val (tx, treasuryPda) = withContext(Dispatchers.IO) {
                    repository.buildDepositTreasuryTransaction(wallet.publicKeyBase58, uiState.value.depositTreasuryForm)
                }
                val signature = walletManager.signAndSendSingleTransaction(launcher, wallet, tx)
                _uiState.update {
                    it.copy(bannerMessage = "Treasury deposit submitted to $treasuryPda")
                }
                signature.toResult()
            }
            if (submitted) refresh()
        }
    }

    fun submitCommitVote(launcher: ActivityResultLauncher<MobileWalletAdapterManager.StartMobileWalletAdapterActivity.CreateParams>) {
        if (guardSubmissionInFlight("commit vote")) return
        val wallet = uiState.value.wallet ?: return setError("Connect a wallet first.")
        val proposal = uiState.value.selectedProposal ?: return setError("Select a proposal first.")
        viewModelScope.launch {
            val submitted = runSubmission {
                val (tx, salt) = withContext(Dispatchers.IO) {
                    repository.buildCommitTransaction(wallet.publicKeyBase58, proposal, uiState.value.commitVoteForm)
                }
                val signature = walletManager.signAndSendSingleTransaction(launcher, wallet, tx)
                voteEnvelopeStore.save(
                    StoredVoteEnvelope(
                        proposalPubkey = proposal.pubkey,
                        voterPubkey = wallet.publicKeyBase58,
                        voteYes = uiState.value.commitVoteForm.voteYes,
                        saltHex = Binary.hex(salt),
                    )
                )
                _uiState.update {
                    it.copy(
                        revealVoteForm = it.revealVoteForm.copy(
                            voteYes = uiState.value.commitVoteForm.voteYes,
                            saltHex = Binary.hex(salt),
                        ),
                        bannerMessage = "Commit submitted. Salt saved locally for reveal.",
                    )
                }
                signature.toResult()
            }
            if (submitted) selectProposal(proposal.pubkey)
        }
    }

    fun submitRevealVote(launcher: ActivityResultLauncher<MobileWalletAdapterManager.StartMobileWalletAdapterActivity.CreateParams>) {
        if (guardSubmissionInFlight("reveal vote")) return
        val wallet = uiState.value.wallet ?: return setError("Connect a wallet first.")
        val proposal = uiState.value.selectedProposal ?: return setError("Select a proposal first.")
        viewModelScope.launch {
            val submitted = runSubmission {
                val tx = withContext(Dispatchers.IO) {
                    repository.buildRevealTransaction(wallet.publicKeyBase58, proposal, uiState.value.revealVoteForm)
                }
                walletManager.signAndSendSingleTransaction(launcher, wallet, tx).toResult()
            }
            if (submitted) selectProposal(proposal.pubkey)
        }
    }

    fun submitFinalize(launcher: ActivityResultLauncher<MobileWalletAdapterManager.StartMobileWalletAdapterActivity.CreateParams>) {
        if (guardSubmissionInFlight("finalize")) return
        val wallet = uiState.value.wallet ?: return setError("Connect a wallet first.")
        val proposal = uiState.value.selectedProposal ?: return setError("Select a proposal first.")
        viewModelScope.launch {
            val submitted = runSubmission {
                val tx = withContext(Dispatchers.IO) {
                    repository.buildFinalizeTransaction(wallet.publicKeyBase58, proposal)
                }
                walletManager.signAndSendSingleTransaction(launcher, wallet, tx).toResult()
            }
            if (submitted) selectProposal(proposal.pubkey)
        }
    }

    fun submitCancel(launcher: ActivityResultLauncher<MobileWalletAdapterManager.StartMobileWalletAdapterActivity.CreateParams>) {
        if (guardSubmissionInFlight("cancel")) return
        val wallet = uiState.value.wallet ?: return setError("Connect a wallet first.")
        val proposal = uiState.value.selectedProposal ?: return setError("Select a proposal first.")
        val authority = proposal.daoSummary?.authority ?: return setError("DAO authority is not loaded for this proposal.")
        if (wallet.publicKeyBase58 != authority) return setError("Only the DAO authority wallet can cancel this proposal.")
        viewModelScope.launch {
            val submitted = runSubmission {
                val tx = withContext(Dispatchers.IO) {
                    repository.buildCancelTransaction(wallet.publicKeyBase58, proposal)
                }
                walletManager.signAndSendSingleTransaction(launcher, wallet, tx).toResult()
            }
            if (submitted) selectProposal(proposal.pubkey)
        }
    }

    fun submitVeto(launcher: ActivityResultLauncher<MobileWalletAdapterManager.StartMobileWalletAdapterActivity.CreateParams>) {
        if (guardSubmissionInFlight("veto")) return
        val wallet = uiState.value.wallet ?: return setError("Connect a wallet first.")
        val proposal = uiState.value.selectedProposal ?: return setError("Select a proposal first.")
        val authority = proposal.daoSummary?.authority ?: return setError("DAO authority is not loaded for this proposal.")
        if (wallet.publicKeyBase58 != authority) return setError("Only the DAO authority wallet can veto this proposal.")
        viewModelScope.launch {
            val submitted = runSubmission {
                val tx = withContext(Dispatchers.IO) {
                    repository.buildVetoTransaction(wallet.publicKeyBase58, proposal)
                }
                walletManager.signAndSendSingleTransaction(launcher, wallet, tx).toResult()
            }
            if (submitted) selectProposal(proposal.pubkey)
        }
    }

    fun submitExecute(launcher: ActivityResultLauncher<MobileWalletAdapterManager.StartMobileWalletAdapterActivity.CreateParams>) {
        if (guardSubmissionInFlight("execute")) return
        val wallet = uiState.value.wallet ?: return setError("Connect a wallet first.")
        val proposal = uiState.value.selectedProposal ?: return setError("Select a proposal first.")
        viewModelScope.launch {
            val submitted = runSubmission {
                val tx = withContext(Dispatchers.IO) {
                    repository.buildExecuteTransaction(wallet.publicKeyBase58, proposal)
                }
                walletManager.signAndSendSingleTransaction(launcher, wallet, tx).toResult()
            }
            if (submitted) selectProposal(proposal.pubkey)
        }
    }

    private fun guardSubmissionInFlight(actionLabel: String): Boolean {
        if (uiState.value.submissionState != SubmissionState.InFlight) return false
        setError("A previous wallet action is still marked in flight. Wait a moment, then refresh or relaunch before retrying $actionLabel.")
        return true
    }

    private suspend fun runWalletOperation(block: suspend () -> Unit) {
        _uiState.update { it.copy(walletBusy = true, errorMessage = null) }
        try {
            block()
        } catch (error: Throwable) {
            setError(error.message ?: "Wallet operation failed")
        }
        _uiState.update { it.copy(walletBusy = false) }
    }

    private suspend fun runSubmission(block: suspend () -> ProposalActionResult): Boolean {
        _uiState.update { it.copy(submissionState = SubmissionState.InFlight, errorMessage = null) }
        try {
            val result = block()
            _uiState.update {
                it.copy(
                    submissionState = SubmissionState.Success(result),
                    bannerMessage = "Submitted: ${result.signature.take(6)}…${result.signature.takeLast(6)}",
                )
            }
            return true
        } catch (error: Throwable) {
            Log.e(TAG, "Submission failed", error)
            val resolvedMessage = resolveSubmissionErrorMessage(error)
            _uiState.update {
                it.copy(
                    submissionState = SubmissionState.Failure(resolvedMessage),
                    errorMessage = resolvedMessage,
                )
            }
            return false
        }
    }

    private fun setError(message: String) {
        _uiState.update { it.copy(errorMessage = message) }
    }

    private fun resolveSubmissionErrorMessage(error: Throwable): String {
        val raw = error.message ?: "Transaction failed"
        val lowered = raw.lowercase()
        return when {
            "insufficient" in lowered || "lamport" in lowered || "funds" in lowered ->
                "Connected wallet needs more Devnet SOL before this transaction can be submitted."
            "already in use" in lowered || "already exists" in lowered || "account in use" in lowered ->
                "This DAO name is already in use on devnet for the connected wallet. Change the DAO name and try again."
            "econnrefused" in lowered || "connection refused" in lowered || "wallet association failed" in lowered ->
                "Wallet session did not complete cleanly. Disconnect and reconnect the wallet, then try again."
            "connection rate limits exceeded" in lowered || "getrecentblockhash" in lowered || "getlatestblockhash" in lowered ->
                "Devnet blockhash reads were throttled across the current RPC route. Wait a few seconds, then try the wallet action once."
            "minimumbalanceforrentexemption" in lowered || "empty response body" in lowered || "malformed json" in lowered || "expected start of the object" in lowered ->
                "Devnet rent or account data was delayed across the current RPC route. Try Create DAO again; wallet actions can still continue."
            else -> raw
        }
    }

    private fun String.toResult(): ProposalActionResult = ProposalActionResult(
        signature = this,
        explorerUrl = PrivateDaoConfig.txExplorer(this),
    )
}

data class UiState(
    val isLoading: Boolean = false,
    val walletBusy: Boolean = false,
    val isLoadingActivity: Boolean = false,
    val isWalletAvailable: Boolean = false,
    val wallet: ConnectedWallet? = null,
    val proposals: List<ProposalSummary> = emptyList(),
    val daos: List<DaoSummary> = emptyList(),
    val selectedProposalPubkey: String? = null,
    val selectedProposal: ProposalSummary? = null,
    val proposalActivity: List<ProposalActivity> = emptyList(),
    val createDaoForm: CreateDaoForm = CreateDaoForm(),
    val depositTreasuryForm: DepositTreasuryForm = DepositTreasuryForm(),
    val createProposalForm: CreateProposalForm = CreateProposalForm(),
    val commitVoteForm: CommitVoteForm = CommitVoteForm(),
    val revealVoteForm: RevealVoteForm = RevealVoteForm(),
    val submissionState: SubmissionState = SubmissionState.Idle,
    val errorMessage: String? = null,
    val bannerMessage: String? = null,
    val awards: List<AwardEntry> = listOf(
        AwardEntry(
            title = "1st Place — Superteam Earn",
            challenge = "Rebuild production backend systems as on-chain Rust programs",
            platform = "Superteam Poland",
            dateLabel = "March 2026",
        )
    ),
) {
    fun proposalPhase(proposal: ProposalSummary): ProposalPhase {
        val now = System.currentTimeMillis() / 1000
        if (proposal.isExecuted) return ProposalPhase.Executed
        return when (proposal.status) {
            ProposalStatus.Cancelled -> ProposalPhase.Cancelled
            ProposalStatus.Vetoed -> ProposalPhase.Vetoed
            ProposalStatus.Failed -> ProposalPhase.Failed
            ProposalStatus.Passed -> if (now < proposal.executionUnlocksAt) ProposalPhase.Timelocked else ProposalPhase.Executable
            ProposalStatus.Voting -> if (now < proposal.votingEnd) ProposalPhase.Commit else if (now < proposal.revealEnd) ProposalPhase.Reveal else ProposalPhase.ReadyToFinalize
            else -> ProposalPhase.Finalized
        }
    }
}
