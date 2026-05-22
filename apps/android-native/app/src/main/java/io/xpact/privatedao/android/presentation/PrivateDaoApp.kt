package io.xpact.privatedao.android.presentation

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import io.xpact.privatedao.android.config.PrivateDaoConfig
import io.xpact.privatedao.android.model.CommitVoteForm
import io.xpact.privatedao.android.model.CreateProposalForm
import io.xpact.privatedao.android.model.CreateDaoForm
import io.xpact.privatedao.android.model.DaoMode
import io.xpact.privatedao.android.model.ProposalPhase
import io.xpact.privatedao.android.model.ProposalSummary
import io.xpact.privatedao.android.model.RevealVoteForm
import io.xpact.privatedao.android.model.DepositTreasuryForm
import io.xpact.privatedao.android.model.SubmissionState
import io.xpact.privatedao.android.model.validationError
import io.xpact.privatedao.android.model.TreasuryActionType

private val SolanaGreen = Color(0xFF14F195)
private val SolanaPurple = Color(0xFF9945FF)
private val SolanaBlue = Color(0xFF00C2FF)
private val AppBackground = Color(0xFF05070C)
private val SurfacePrimary = Color(0xFF0D1118)
private val SurfaceSecondary = Color(0xFF101825)
private val SurfaceTertiary = Color(0xFF111A27)
private val BodyMuted = Color(0xFFADB8C7)
private val LabelMuted = Color(0xFF91A3B8)

private enum class Destination(val route: String, val label: String) {
    Splash("splash", "Splash"),
    Wallet("wallet", "Wallet"),
    Home("home", "Home"),
    Proposals("proposals", "Votes"),
    Create("create", "Create"),
    Awards("awards", "Awards"),
    Settings("settings", "Settings"),
}

private enum class CreatePanel {
    Dao,
    Treasury,
    Proposal,
}

private data class MobileServiceLane(
    val title: String,
    val problem: String,
    val action: String,
    val url: String,
)

private val mobileServiceLanes = listOf(
    MobileServiceLane(
        title = "Confidential governance",
        problem = "Private proposals, commit/reveal votes, finalize, execute, cancel, and veto stay one wallet action away.",
        action = "Govern",
        url = PrivateDaoConfig.governanceUrl,
    ),
    MobileServiceLane(
        title = "Private polls and committee signals",
        problem = "Sensitive review signals can stay private while proof, route, and final accountability remain inspectable.",
        action = "Intelligence",
        url = PrivateDaoConfig.intelligenceUrl,
    ),
    MobileServiceLane(
        title = "Confidential payroll",
        problem = "Contributor pay, bonuses, and salary operations need governance without exposing the full compensation graph.",
        action = "Payroll",
        url = PrivateDaoConfig.confidentialPayrollUrl,
    ),
    MobileServiceLane(
        title = "Encrypted payments",
        problem = "Cloak, Umbra, MagicBlock, and Encrypt/IKA payment corridors become a normal mobile operator flow.",
        action = "Payments",
        url = PrivateDaoConfig.confidentialPaymentsUrl,
    ),
    MobileServiceLane(
        title = "Rewards and gaming treasuries",
        problem = "Tournaments, guilds, and reward pools need fast Solana execution with policy and proof attached.",
        action = "Gaming",
        url = PrivateDaoConfig.gamingUrl,
    ),
    MobileServiceLane(
        title = "Read API and live counters",
        problem = "Judges and operators can inspect runtime state, diagnostics, and proof continuity after mobile execution.",
        action = "Diagnostics",
        url = PrivateDaoConfig.diagnosticsUrl,
    ),
)

@Composable
fun PrivateDaoApp(
    uiState: UiState,
    onRefresh: () -> Unit,
    onConnectWallet: () -> Unit,
    onDisconnectWallet: () -> Unit,
    onSelectProposal: (String) -> Unit,
    onCreateDaoChange: ((CreateDaoForm) -> CreateDaoForm) -> Unit,
    onDepositTreasuryChange: ((DepositTreasuryForm) -> DepositTreasuryForm) -> Unit,
    onCreateProposalChange: ((CreateProposalForm) -> CreateProposalForm) -> Unit,
    onCommitVoteChange: ((CommitVoteForm) -> CommitVoteForm) -> Unit,
    onRevealVoteChange: ((RevealVoteForm) -> RevealVoteForm) -> Unit,
    onSubmitCreateProposal: () -> Unit,
    onSubmitCreateDao: () -> Unit,
    onSubmitDepositTreasury: () -> Unit,
    onSubmitCommitVote: () -> Unit,
    onSubmitRevealVote: () -> Unit,
    onSubmitFinalize: () -> Unit,
    onSubmitCancel: () -> Unit,
    onSubmitVeto: () -> Unit,
    onSubmitExecute: () -> Unit,
) {
    val navController = rememberNavController()
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(uiState.errorMessage, uiState.bannerMessage) {
        uiState.errorMessage?.let { snackbarHostState.showSnackbar(it) }
        uiState.bannerMessage?.let { snackbarHostState.showSnackbar(it) }
    }

    MaterialTheme {
        Scaffold(
            snackbarHost = { SnackbarHost(snackbarHostState) },
            bottomBar = {
                val backStack by navController.currentBackStackEntryAsState()
                val current = backStack?.destination?.route
                if (current != Destination.Splash.route) {
                    NavigationBar(containerColor = SurfacePrimary) {
                        listOf(Destination.Home, Destination.Proposals, Destination.Create, Destination.Awards, Destination.Settings).forEach { item ->
                            NavigationBarItem(
                                selected = current == item.route,
                                onClick = { navController.navigate(item.route) },
                                icon = { DestinationGlyph(destination = item, selected = current == item.route) },
                                label = { Text(item.label, maxLines = 1) },
                            )
                        }
                    }
                }
            },
            containerColor = AppBackground,
        ) { padding ->
            AppNavHost(
                navController = navController,
                padding = padding,
                uiState = uiState,
                onRefresh = onRefresh,
                onConnectWallet = onConnectWallet,
                onDisconnectWallet = onDisconnectWallet,
                onSelectProposal = onSelectProposal,
                onCreateDaoChange = onCreateDaoChange,
                onDepositTreasuryChange = onDepositTreasuryChange,
                onCreateProposalChange = onCreateProposalChange,
                onCommitVoteChange = onCommitVoteChange,
                onRevealVoteChange = onRevealVoteChange,
                onSubmitCreateDao = onSubmitCreateDao,
                onSubmitDepositTreasury = onSubmitDepositTreasury,
                onSubmitCreateProposal = onSubmitCreateProposal,
                onSubmitCommitVote = onSubmitCommitVote,
                onSubmitRevealVote = onSubmitRevealVote,
                onSubmitFinalize = onSubmitFinalize,
                onSubmitCancel = onSubmitCancel,
                onSubmitVeto = onSubmitVeto,
                onSubmitExecute = onSubmitExecute,
            )
        }
    }
}

@Composable
private fun AppNavHost(
    navController: NavHostController,
    padding: PaddingValues,
    uiState: UiState,
    onRefresh: () -> Unit,
    onConnectWallet: () -> Unit,
    onDisconnectWallet: () -> Unit,
    onSelectProposal: (String) -> Unit,
    onCreateDaoChange: ((CreateDaoForm) -> CreateDaoForm) -> Unit,
    onDepositTreasuryChange: ((DepositTreasuryForm) -> DepositTreasuryForm) -> Unit,
    onCreateProposalChange: ((CreateProposalForm) -> CreateProposalForm) -> Unit,
    onCommitVoteChange: ((CommitVoteForm) -> CommitVoteForm) -> Unit,
    onRevealVoteChange: ((RevealVoteForm) -> RevealVoteForm) -> Unit,
    onSubmitCreateProposal: () -> Unit,
    onSubmitCreateDao: () -> Unit,
    onSubmitDepositTreasury: () -> Unit,
    onSubmitCommitVote: () -> Unit,
    onSubmitRevealVote: () -> Unit,
    onSubmitFinalize: () -> Unit,
    onSubmitCancel: () -> Unit,
    onSubmitVeto: () -> Unit,
    onSubmitExecute: () -> Unit,
) {
    NavHost(
        navController = navController,
        startDestination = Destination.Splash.route,
        modifier = Modifier.fillMaxSize(),
    ) {
        composable(Destination.Splash.route) {
            SplashScreen {
                navController.navigate(if (uiState.wallet != null) Destination.Home.route else Destination.Wallet.route) {
                    popUpTo(Destination.Splash.route) { inclusive = true }
                }
            }
        }
        composable(Destination.Wallet.route) {
            WalletScreen(
                uiState = uiState,
                onConnect = onConnectWallet,
                onContinue = { navController.navigate(Destination.Home.route) },
                modifier = Modifier.padding(padding),
            )
        }
        composable(Destination.Home.route) {
            HomeScreen(
                uiState = uiState,
                onRefresh = onRefresh,
                onWalletAction = if (uiState.wallet == null) onConnectWallet else onDisconnectWallet,
                modifier = Modifier.padding(padding),
            )
        }
        composable(Destination.Proposals.route) {
            ProposalScreen(
                uiState = uiState,
                onSelectProposal = onSelectProposal,
                onCommitVoteChange = onCommitVoteChange,
                onRevealVoteChange = onRevealVoteChange,
                onSubmitCommitVote = onSubmitCommitVote,
                onSubmitRevealVote = onSubmitRevealVote,
                onSubmitFinalize = onSubmitFinalize,
                onSubmitCancel = onSubmitCancel,
                onSubmitVeto = onSubmitVeto,
                onSubmitExecute = onSubmitExecute,
                modifier = Modifier.padding(padding),
            )
        }
        composable(Destination.Create.route) {
            CreateProposalScreen(
                uiState = uiState,
                onCreateDaoChange = onCreateDaoChange,
                onDepositTreasuryChange = onDepositTreasuryChange,
                onChange = onCreateProposalChange,
                onSubmitCreateDao = onSubmitCreateDao,
                onSubmitDepositTreasury = onSubmitDepositTreasury,
                onSubmit = onSubmitCreateProposal,
                modifier = Modifier.padding(padding),
            )
        }
        composable(Destination.Awards.route) {
            AwardsScreen(uiState = uiState, modifier = Modifier.padding(padding))
        }
        composable(Destination.Settings.route) {
            SettingsScreen(uiState = uiState, modifier = Modifier.padding(padding))
        }
    }
}

@Composable
private fun SplashScreen(onDone: () -> Unit) {
    LaunchedEffect(Unit) {
        kotlinx.coroutines.delay(900L)
        onDone()
    }
    Box(
        modifier = Modifier.fillMaxSize().background(AppBackground),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            SolanaMark()
            Spacer(Modifier.height(12.dp))
            Text("PrivateDAO", color = Color.White, style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(8.dp))
            Text("Private DAO Ops From Mobile", color = SolanaGreen, style = MaterialTheme.typography.titleMedium)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun WalletScreen(uiState: UiState, onConnect: () -> Unit, onContinue: () -> Unit, modifier: Modifier = Modifier) {
    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        SolanaMark(modifier = Modifier.size(28.dp))
                        Text("Android-native wallet flow")
                    }
                },
            )
        },
        containerColor = Color.Transparent,
    ) { inner ->
        Column(
            modifier = modifier.fillMaxSize().padding(inner).padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            HeroCard(
                title = "Android-native operating surface",
                body = "PrivateDAO on Android turns complex DAO actions into a wallet-first mobile flow with privacy-preserving voting and on-chain verification.",
            )
            SolanaStatusStrip()
            HeroCard(
                title = "Wallet state",
                body = when {
                    uiState.wallet != null -> "Connected to ${uiState.wallet.publicKeyBase58}"
                    !uiState.isWalletAvailable -> "No compatible Mobile Wallet Adapter wallet was detected on this Android device."
                    else -> "Phantom / Solflare-style Android wallet connection is ready through MWA."
                },
            )
            Button(onClick = onConnect, enabled = uiState.isWalletAvailable && !uiState.walletBusy, modifier = Modifier.fillMaxWidth()) {
                Text(if (uiState.wallet == null) "Connect wallet" else "Reconnect wallet")
            }
            OutlinedButton(onClick = onContinue, enabled = uiState.wallet != null, modifier = Modifier.fillMaxWidth()) {
                Text("Continue to dashboard")
            }
        }
    }
}

@Composable
private fun HomeScreen(uiState: UiState, onRefresh: () -> Unit, onWalletAction: () -> Unit, modifier: Modifier = Modifier) {
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color.Transparent),
                shape = RoundedCornerShape(28.dp),
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            Brush.linearGradient(listOf(SolanaPurple, SolanaBlue, SolanaGreen)),
                            RoundedCornerShape(28.dp),
                        )
                        .padding(22.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("🏆 1st Place — Superteam Earn", color = Color(0xFF091410), fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleLarge)
                        Text("Category-defining DAO infrastructure with mobile-first execution", color = Color(0xFF0F1722))
                    }
                }
            }
        }
        item {
            HeroCard(
                title = "Web + Android unified execution",
                body = "The Android app runs the same product lifecycle as web: DAO creation, proposal flow, commit-reveal voting, finalize, execute, signatures, and explorer verification.",
                actions = {
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Button(onClick = onRefresh, colors = primaryButtonColors()) { Text("Refresh") }
                        OutlinedButton(onClick = onWalletAction) {
                            Text(if (uiState.wallet == null) "Connect" else "Disconnect")
                        }
                    }
                },
            )
        }
        item {
            MobileServiceConstellationCard()
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                MetricCard("DAOs", uiState.daos.size.toString(), Modifier.weight(1f))
                MetricCard("Votes", uiState.proposals.size.toString(), Modifier.weight(1f))
                MetricCard("Network", PrivateDaoConfig.clusterLabel, Modifier.weight(1f))
            }
        }
        item {
            HeroCard(
                title = "Live mobile proof",
                body = uiState.selectedProposal?.let {
                    "Selected proposal ${it.proposalId} is in ${uiState.proposalPhase(it)} phase with ${it.commitCount} commits and ${it.revealCount} reveals, all verifiable on-chain."
                } ?: "Select a proposal to inspect phase-specific actions and wallet-signed transaction proofs.",
            )
        }
        item {
            ReviewerOpsCard(
                title = "Reviewer and runtime ops",
                body = "Open the same reviewer surfaces used by web: proof center, judge mode, monitoring routes, and runtime continuity.",
            )
        }
        item {
            QvacSovereignAiCard()
        }
        item {
            SubmissionStateCard(uiState = uiState)
        }
    }
}

@Composable
private fun MobileServiceConstellationCard() {
    HeroCard(
        title = "PrivateDAO services in your pocket",
        body = "This APK is the ordinary-user path into the same Solana service constellation: private governance, polls, payroll, encrypted payments, gaming rewards, automations, and proof.",
        actions = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                mobileServiceLanes.chunked(2).forEach { row ->
                    ReviewLinkRow(*row.map { it.action to it.url }.toTypedArray())
                }
            }
        },
    )
    Column(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(top = 10.dp)) {
        mobileServiceLanes.forEach { lane ->
            Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = SurfaceTertiary)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(lane.title, color = SolanaGreen, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    Text(lane.problem, color = BodyMuted)
                }
            }
        }
    }
}

@Composable
private fun ProposalScreen(
    uiState: UiState,
    onSelectProposal: (String) -> Unit,
    onCommitVoteChange: ((CommitVoteForm) -> CommitVoteForm) -> Unit,
    onRevealVoteChange: ((RevealVoteForm) -> RevealVoteForm) -> Unit,
    onSubmitCommitVote: () -> Unit,
    onSubmitRevealVote: () -> Unit,
    onSubmitFinalize: () -> Unit,
    onSubmitCancel: () -> Unit,
    onSubmitVeto: () -> Unit,
    onSubmitExecute: () -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            HeroCard(
                title = "Live proposal feed",
                body = "This is the Android-native counterpart of the web product. Proposal accounts are read from the same Solana program and decoded with the same account layout.",
            )
        }
        items(uiState.proposals) { proposal ->
            ProposalCard(
                proposal = proposal,
                phase = uiState.proposalPhase(proposal),
                selected = uiState.selectedProposalPubkey == proposal.pubkey,
                onClick = { onSelectProposal(proposal.pubkey) },
            )
        }
        uiState.selectedProposal?.let { proposal ->
            item {
                ProposalDetailCard(
                    proposal = proposal,
                    phase = uiState.proposalPhase(proposal),
                    uiState = uiState,
                    onCommitVoteChange = onCommitVoteChange,
                    onRevealVoteChange = onRevealVoteChange,
                    onSubmitCommitVote = onSubmitCommitVote,
                    onSubmitRevealVote = onSubmitRevealVote,
                    onSubmitFinalize = onSubmitFinalize,
                    onSubmitCancel = onSubmitCancel,
                    onSubmitVeto = onSubmitVeto,
                    onSubmitExecute = onSubmitExecute,
                )
            }
        }
        item {
            SubmissionStateCard(uiState = uiState)
        }
    }
}

@Composable
private fun CreateProposalScreen(
    uiState: UiState,
    onCreateDaoChange: ((CreateDaoForm) -> CreateDaoForm) -> Unit,
    onDepositTreasuryChange: ((DepositTreasuryForm) -> DepositTreasuryForm) -> Unit,
    onChange: ((CreateProposalForm) -> CreateProposalForm) -> Unit,
    onSubmitCreateDao: () -> Unit,
    onSubmitDepositTreasury: () -> Unit,
    onSubmit: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var createPanel by remember { mutableIntStateOf(CreatePanel.Dao.ordinal) }

    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            HeroCard(
                title = "Create and treasury ops",
                body = "Choose one path at a time: bootstrap a DAO, fund treasury, or create proposal, all from mobile wallet signatures.",
            )
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                SegmentedActionButton(
                    label = "DAO",
                    selected = createPanel == CreatePanel.Dao.ordinal,
                    modifier = Modifier.weight(1f),
                ) { createPanel = CreatePanel.Dao.ordinal }
                SegmentedActionButton(
                    label = "Treasury",
                    selected = createPanel == CreatePanel.Treasury.ordinal,
                    modifier = Modifier.weight(1f),
                ) { createPanel = CreatePanel.Treasury.ordinal }
                SegmentedActionButton(
                    label = "Proposal",
                    selected = createPanel == CreatePanel.Proposal.ordinal,
                    modifier = Modifier.weight(1f),
                ) { createPanel = CreatePanel.Proposal.ordinal }
            }
        }
        if (createPanel == CreatePanel.Dao.ordinal) {
            item {
                HeroCard(
                    title = "Create DAO",
                    body = "Bootstrap a fresh DAO and governance mint from the connected wallet. This path now starts with a unique Testnet-safe DAO name by default.",
                )
            }
            item {
                FormTextField("DAO name", uiState.createDaoForm.daoName) { value ->
                    onCreateDaoChange { it.copy(daoName = value) }
                }
            }
            item {
                Text(
                    "Use a unique DAO name on Testnet. The app now suggests a fresh name by default.",
                    color = BodyMuted,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
            item {
                FormTextField("Quorum percentage", uiState.createDaoForm.quorumPercentage.toString()) { value ->
                    onCreateDaoChange { it.copy(quorumPercentage = value.toIntOrNull() ?: it.quorumPercentage) }
                }
            }
            item {
                FormTextField("Reveal window (seconds)", uiState.createDaoForm.revealWindowSeconds.toString()) { value ->
                    onCreateDaoChange { it.copy(revealWindowSeconds = value.toLongOrNull() ?: it.revealWindowSeconds) }
                }
            }
            item {
                FormTextField("Execution delay (seconds)", uiState.createDaoForm.executionDelaySeconds.toString()) { value ->
                    onCreateDaoChange { it.copy(executionDelaySeconds = value.toLongOrNull() ?: it.executionDelaySeconds) }
                }
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                    SegmentedActionButton(
                        label = "Token",
                        selected = uiState.createDaoForm.mode == DaoMode.TokenWeighted,
                        modifier = Modifier.weight(1f),
                    ) { onCreateDaoChange { it.copy(mode = DaoMode.TokenWeighted) } }
                    SegmentedActionButton(
                        label = "Quad",
                        selected = uiState.createDaoForm.mode == DaoMode.Quadratic,
                        modifier = Modifier.weight(1f),
                    ) { onCreateDaoChange { it.copy(mode = DaoMode.Quadratic) } }
                    SegmentedActionButton(
                        label = "Dual",
                        selected = uiState.createDaoForm.mode == DaoMode.DualChamber,
                        modifier = Modifier.weight(1f),
                    ) { onCreateDaoChange { it.copy(mode = DaoMode.DualChamber) } }
                }
            }
            item {
                SubmissionStateCard(uiState = uiState)
            }
            item {
                Button(
                    onClick = onSubmitCreateDao,
                    enabled = uiState.wallet != null && !uiState.walletBusy && uiState.submissionState != SubmissionState.InFlight,
                    modifier = Modifier.fillMaxWidth(),
                    colors = primaryButtonColors(),
                ) {
                    Text(if (uiState.submissionState == SubmissionState.InFlight) "Wallet action in flight..." else "Create DAO in wallet")
                }
            }
            uiState.createDaoForm.validationError()?.let { message ->
                item { ValidationCard(message) }
            }
        }

        if (createPanel == CreatePanel.Treasury.ordinal) {
            item {
                HeroCard(
                    title = "Deposit treasury",
                    body = "Treasury funding remains a separate on-chain step, exactly like the current repo scripts.",
                )
            }
            item {
                FormTextField("DAO PDA for deposit", uiState.depositTreasuryForm.daoPubkey) { value ->
                    onDepositTreasuryChange { it.copy(daoPubkey = value) }
                }
            }
            item {
                FormTextField("Deposit amount SOL", uiState.depositTreasuryForm.amountSol) { value ->
                    onDepositTreasuryChange { it.copy(amountSol = value) }
                }
            }
            item {
                Button(
                    onClick = onSubmitDepositTreasury,
                    enabled = uiState.wallet != null && !uiState.walletBusy && uiState.depositTreasuryForm.daoPubkey.isNotBlank(),
                    modifier = Modifier.fillMaxWidth(),
                    colors = primaryButtonColors(),
                ) {
                    Text("Deposit treasury in wallet")
                }
            }
            uiState.depositTreasuryForm.validationError()?.let { message ->
                item { ValidationCard(message) }
            }
        }

        if (createPanel == CreatePanel.Proposal.ordinal) {
            item {
                HeroCard(
                    title = "Create proposal",
                    body = "Any wallet holding the DAO governance token can submit a proposal on-chain.",
                )
            }
            item {
                FormTextField("DAO PDA", uiState.createProposalForm.daoPubkey) { value ->
                    onChange { it.copy(daoPubkey = value) }
                }
            }
            item {
                FormTextField("Title", uiState.createProposalForm.title) { value ->
                    onChange { it.copy(title = value) }
                }
            }
            item {
                FormTextField("Description", uiState.createProposalForm.description, minLines = 4) { value ->
                    onChange { it.copy(description = value) }
                }
            }
            item {
                FormTextField("Voting duration (seconds)", uiState.createProposalForm.durationSeconds.toString()) { value ->
                    onChange { it.copy(durationSeconds = value.toLongOrNull() ?: it.durationSeconds) }
                }
            }
            item {
                FormTextField("Treasury recipient (optional)", uiState.createProposalForm.treasuryRecipient) { value ->
                    onChange { it.copy(treasuryRecipient = value) }
                }
            }
            item {
                FormTextField("Treasury amount (SOL or raw token units)", uiState.createProposalForm.treasuryAmountSol) { value ->
                    onChange { it.copy(treasuryAmountSol = value) }
                }
            }
            item {
                FormTextField("Treasury mint (token actions only)", uiState.createProposalForm.treasuryMint) { value ->
                    onChange { it.copy(treasuryMint = value) }
                }
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                    SegmentedActionButton(
                        label = "Send SOL",
                        selected = uiState.createProposalForm.treasuryType == TreasuryActionType.SendSol,
                        modifier = Modifier.weight(1f),
                    ) { onChange { it.copy(treasuryType = TreasuryActionType.SendSol) } }
                    SegmentedActionButton(
                        label = "Send Token",
                        selected = uiState.createProposalForm.treasuryType == TreasuryActionType.SendToken,
                        modifier = Modifier.weight(1f),
                    ) { onChange { it.copy(treasuryType = TreasuryActionType.SendToken) } }
                }
            }
            item {
                Button(
                    onClick = onSubmit,
                    enabled = uiState.wallet != null && !uiState.walletBusy && uiState.createProposalForm.validationError() == null,
                    modifier = Modifier.fillMaxWidth(),
                    colors = primaryButtonColors(),
                ) {
                    Text("Create proposal in wallet")
                }
            }
            uiState.createProposalForm.validationError()?.let { message ->
                item { ValidationCard(message) }
            }
        }

        item {
            ReviewerOpsCard(
                title = "Execution and reviewer links",
                body = "Use the Android-native create surface without losing the proof layer. These links stay aligned with the main repo’s live proof, monitoring, and reviewer docs.",
            )
        }
        item {
            SubmissionStateCard(uiState = uiState)
        }
    }
}

@Composable
private fun AwardsScreen(uiState: UiState, modifier: Modifier = Modifier) {
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            HeroCard(
                title = "Awards & credibility",
                body = "The Android app keeps the same proof surface as the main project, including verified recognition and live Testnet explorer references.",
            )
        }
        items(uiState.awards) { award ->
            Card(
                colors = CardDefaults.cardColors(containerColor = SurfaceSecondary),
                shape = RoundedCornerShape(22.dp),
            ) {
                Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(award.title, color = SolanaGreen, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text(award.challenge, color = Color.White)
                    Text("${award.platform} • ${award.dateLabel}", color = BodyMuted)
                }
            }
        }
    }
}

@Composable
private fun SettingsScreen(uiState: UiState, modifier: Modifier = Modifier) {
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            HeroCard(
                title = "Environment",
                body = "Testnet is the default mobile environment. The app is structured for a future mainnet switch without changing protocol semantics, but production cutover still requires reviewer evidence, monitoring, and explicit custody closure.",
            )
        }
        item { SettingsRow("Program ID", PrivateDaoConfig.programId) }
        item { SettingsRow("RPC primary", PrivateDaoConfig.rpcUrl) }
        item { SettingsRow("RPC route", PrivateDaoConfig.rpcRouteSummary) }
        item { SettingsRow("Explorer", "Solscan Testnet links") }
        item { SettingsRow("Wallet", uiState.wallet?.publicKeyBase58 ?: "Not connected") }
        item {
            ReviewerOpsCard(
                title = "Mainnet and reviewer runbooks",
                body = "These links expose the proof-first packet expected before any real-funds cutover: live proof, monitoring alerts, incident response, mainnet readiness, and the condensed reviewer path.",
            )
        }
        item {
            SubmissionStateCard(uiState = uiState)
        }
    }
}

@Composable
private fun ProposalCard(proposal: ProposalSummary, phase: ProposalPhase, selected: Boolean, onClick: () -> Unit) {
    Card(
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = if (selected) SurfaceSecondary else SurfacePrimary),
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
    ) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                AssistChip(
                    onClick = {},
                    label = { Text(phase.name) },
                    colors = AssistChipDefaults.assistChipColors(containerColor = SolanaPurple.copy(alpha = 0.18f), labelColor = SolanaGreen),
                )
                Text("Proposal #${proposal.proposalId}", color = LabelMuted)
            }
            Text(proposal.title, color = Color.White, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Text(proposal.description, color = BodyMuted, maxLines = 3, overflow = TextOverflow.Ellipsis)
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                SmallMetric("Commits", proposal.commitCount.toString())
                SmallMetric("Reveals", proposal.revealCount.toString())
                SmallMetric("YES", proposal.yesCapital.toString())
            }
        }
    }
}

@Composable
private fun ProposalDetailCard(
    proposal: ProposalSummary,
    phase: ProposalPhase,
    uiState: UiState,
    onCommitVoteChange: ((CommitVoteForm) -> CommitVoteForm) -> Unit,
    onRevealVoteChange: ((RevealVoteForm) -> RevealVoteForm) -> Unit,
    onSubmitCommitVote: () -> Unit,
    onSubmitRevealVote: () -> Unit,
    onSubmitFinalize: () -> Unit,
    onSubmitCancel: () -> Unit,
    onSubmitVeto: () -> Unit,
    onSubmitExecute: () -> Unit,
) {
    val authorityPubkey = proposal.daoSummary?.authority
    val isAuthorityWallet = uiState.wallet?.publicKeyBase58 == authorityPubkey && authorityPubkey != null
    Card(shape = RoundedCornerShape(28.dp), colors = CardDefaults.cardColors(containerColor = SurfacePrimary)) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text("Proposal proof", color = Color.White, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            SettingsRow("Proposal", proposal.pubkey)
            SettingsRow("DAO", proposal.dao)
            SettingsRow("Phase", phase.name)
            SettingsRow("Status", proposal.status.name)
            SettingsRow("Explorer", PrivateDaoConfig.accountExplorer(proposal.pubkey))
            proposal.daoSummary?.let {
                SettingsRow("DAO authority", it.authority)
                SettingsRow("Execution delay", "${it.executionDelaySeconds}s")
                SettingsRow("Authority wallet", if (isAuthorityWallet) "Connected" else "Not connected")
            }
            proposal.treasuryAction?.let {
                SettingsRow("Treasury action", "${it.type} → ${it.recipient}")
            }
            ProposalExecutionPacketCard(proposal = proposal, phase = phase)
            RuntimeContinuityCard(proposal = proposal, phase = phase)
            if (phase == ProposalPhase.Commit && isAuthorityWallet) {
                Button(onClick = onSubmitCancel, enabled = !uiState.walletBusy, modifier = Modifier.fillMaxWidth()) {
                    Text("Cancel in authority wallet")
                }
            }
            if (phase == ProposalPhase.Commit) {
                FormTextField("Keeper pubkey (optional)", uiState.commitVoteForm.keeperPubkey) { value ->
                    onCommitVoteChange { it.copy(keeperPubkey = value) }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedButton(onClick = { onCommitVoteChange { it.copy(voteYes = true) } }, modifier = Modifier.weight(1f)) { Text("Vote YES") }
                    OutlinedButton(onClick = { onCommitVoteChange { it.copy(voteYes = false) } }, modifier = Modifier.weight(1f)) { Text("Vote NO") }
                }
                Button(onClick = onSubmitCommitVote, enabled = uiState.wallet != null && !uiState.walletBusy, modifier = Modifier.fillMaxWidth()) {
                    Text("Commit vote in wallet")
                }
            }
            if (phase == ProposalPhase.Reveal) {
                FormTextField("Salt hex", uiState.revealVoteForm.saltHex) { value ->
                    onRevealVoteChange { it.copy(saltHex = value) }
                }
                FormTextField("Voter override (keeper reveal)", uiState.revealVoteForm.voterPubkeyOverride) { value ->
                    onRevealVoteChange { it.copy(voterPubkeyOverride = value) }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedButton(onClick = { onRevealVoteChange { it.copy(voteYes = true) } }, modifier = Modifier.weight(1f)) { Text("Reveal YES") }
                    OutlinedButton(onClick = { onRevealVoteChange { it.copy(voteYes = false) } }, modifier = Modifier.weight(1f)) { Text("Reveal NO") }
                }
                Button(onClick = onSubmitRevealVote, enabled = uiState.wallet != null && uiState.revealVoteForm.saltHex.isNotBlank() && !uiState.walletBusy, modifier = Modifier.fillMaxWidth()) {
                    Text("Reveal in wallet")
                }
            }
            if (phase == ProposalPhase.ReadyToFinalize) {
                Button(onClick = onSubmitFinalize, enabled = uiState.wallet != null && !uiState.walletBusy, modifier = Modifier.fillMaxWidth()) {
                    Text("Finalize in wallet")
                }
            }
            if (phase == ProposalPhase.Timelocked) {
                ValidationCard("This proposal passed but is still inside the timelock window. Execution stays blocked until the unlock time clears.")
                if (isAuthorityWallet) {
                    Button(onClick = onSubmitVeto, enabled = !uiState.walletBusy, modifier = Modifier.fillMaxWidth()) {
                        Text("Veto in authority wallet")
                    }
                }
            }
            if (phase == ProposalPhase.Executable) {
                Button(onClick = onSubmitExecute, enabled = uiState.wallet != null && !uiState.walletBusy, modifier = Modifier.fillMaxWidth()) {
                    Text("Execute in wallet")
                }
            }
            if (phase == ProposalPhase.Commit) {
                uiState.commitVoteForm.validationError()?.let { ValidationCard(it) }
            }
            if (phase == ProposalPhase.Reveal) {
                uiState.revealVoteForm.validationError()?.let { ValidationCard(it) }
            }
            ReviewerOpsCard(
                title = "Proof and runtime continuity",
                body = "Keep the selected proposal tied to proof center, judge mode, live proof, monitoring alerts, and incident response while you operate from Android.",
            )
            if (uiState.proposalActivity.isNotEmpty()) {
                Text("Recent activity", color = Color.White, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                uiState.proposalActivity.take(5).forEach { activity ->
                    Card(shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = Color(0xFF111A27))) {
                        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(activity.signature, color = Color(0xFF9CC7FF), maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Text(activity.explorerUrl, color = Color(0xFFADB8C7), maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Text(activity.statusLabel, color = Color.White)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ProposalExecutionPacketCard(proposal: ProposalSummary, phase: ProposalPhase) {
    val treasuryAction = proposal.treasuryAction
    val treasurySummary = when {
        treasuryAction == null -> "No treasury action is attached to this proposal."
        treasuryAction.type == TreasuryActionType.SendToken -> {
            val mint = treasuryAction.tokenMint ?: "Unknown mint"
            "Token payout of ${treasuryAction.amountLamports} raw units to ${treasuryAction.recipient}. Recipient ATA must already exist for mint $mint."
        }
        treasuryAction.type == TreasuryActionType.SendSol ->
            "SOL payout of ${formatSolAmount(treasuryAction.amountLamports)} to ${treasuryAction.recipient}."
        else -> "Custom CPI action routed to ${treasuryAction.recipient}."
    }

    Card(shape = RoundedCornerShape(22.dp), colors = CardDefaults.cardColors(containerColor = Color(0xFF111A27))) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Execution packet", color = Color.White, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Text(
                "Operate from the same proposal payload the web app uses: current phase, authority context, execution delay, recipient, and payout shape stay visible before signing.",
                color = Color(0xFFADB8C7),
            )
            Text("Phase: ${phase.name}", color = Color.White)
            Text(treasurySummary, color = Color(0xFFADB8C7))
            proposal.treasuryAction?.tokenMint?.let { mint ->
                Text("Token mint: $mint", color = Color.White)
            }
        }
    }
}

@Composable
private fun RuntimeContinuityCard(proposal: ProposalSummary, phase: ProposalPhase) {
    val summary = when (phase) {
        ProposalPhase.Commit -> "The proposal is still in commit phase. Keep reviewer proof and authority context attached before the vote locks."
        ProposalPhase.Reveal -> "Reveal is active. This is the right moment to keep proof, explorer continuity, and follow-up monitoring paths visible."
        ProposalPhase.ReadyToFinalize -> "Voting windows are closed. Finalization should stay attached to proof and runtime evidence, not just a signature."
        ProposalPhase.Timelocked -> "The proposal passed but remains timelocked. Monitoring, incident response, and runtime evidence should stay attached until execution unlocks."
        ProposalPhase.Executable -> "Execution is open. Treat this as an operator surface: treasury preview, monitoring rules, and proof continuity should remain one tap away."
        ProposalPhase.Executed -> "Execution is complete. Keep explorer proof, runtime evidence, and monitoring follow-up attached to the result."
        ProposalPhase.Cancelled -> "The proposal was cancelled by authority. Preserve reviewer continuity and the cancellation trail."
        ProposalPhase.Vetoed -> "The proposal was vetoed during timelock. Preserve authority context and reviewer evidence for the veto decision."
        ProposalPhase.Failed -> "The proposal failed the governance path. Preserve proof and activity context for post-mortem review."
        ProposalPhase.Finalized -> "The proposal is finalized. Continue from proof and monitoring surfaces for reviewer-safe verification."
    }

    Card(shape = RoundedCornerShape(22.dp), colors = CardDefaults.cardColors(containerColor = Color(0xFF111A27))) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Runtime continuity", color = Color.White, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Text(summary, color = Color(0xFFADB8C7))
            ReviewLinkRow(
                "Proof center" to PrivateDaoConfig.proofCenterUrl,
                "Live proof V3" to PrivateDaoConfig.liveProofUrl,
            )
            ReviewLinkRow(
                "Monitoring rules" to PrivateDaoConfig.monitoringAlertsUrl,
                "Real-device runtime" to PrivateDaoConfig.realDeviceRuntimeUrl,
            )
            ReviewLinkRow(
                "Incident response" to PrivateDaoConfig.incidentResponseUrl,
                "Android web surface" to PrivateDaoConfig.androidSurfaceUrl,
            )
        }
    }
}

@Composable
private fun ReviewerOpsCard(title: String, body: String) {
    HeroCard(
        title = title,
        body = body,
        actions = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                ReviewLinkRow(
                    "Proof center" to PrivateDaoConfig.proofCenterUrl,
                    "Judge mode" to PrivateDaoConfig.judgeModeUrl,
                )
                ReviewLinkRow(
                    "Live proof" to PrivateDaoConfig.liveProofUrl,
                    "Monitoring alerts" to PrivateDaoConfig.monitoringAlertsUrl,
                )
                ReviewLinkRow(
                    "Incident response" to PrivateDaoConfig.incidentResponseUrl,
                    "Reviewer fast path" to PrivateDaoConfig.reviewerFastPathUrl,
                )
                ReviewLinkRow(
                    "Mainnet readiness" to PrivateDaoConfig.mainnetReadinessUrl,
                )
            }
        },
    )
}

@Composable
private fun ReviewLinkRow(vararg links: Pair<String, String>) {
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
        links.forEach { (label, url) ->
            LinkButton(
                label = label,
                url = url,
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun LinkButton(label: String, url: String, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    OutlinedButton(
        onClick = {
            context.startActivity(
                Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            )
        },
        modifier = modifier,
    ) {
        Text(label, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

@Composable
private fun QvacSovereignAiCard() {
    val localBrief = "Operation private_treasury_execution stays on device before signing. Amount 1250 USDT. Privacy mode shielded. Local alert: new recipient requires counterparty review."

    Card(shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(containerColor = SurfaceSecondary)) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("QVAC sovereign AI", color = SolanaGreen, style = MaterialTheme.typography.labelSmall)
            Text("On-device operation brief", color = Color.White, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Text(
                "Sensitive treasury context is prepared locally before wallet signing, matching the web QVAC lane and preserving the same review to sign to proof path.",
                color = BodyMuted,
            )
            SettingsRow("Local brief", localBrief)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.horizontalScroll(rememberScrollState())) {
                StatusChip("local-first", SolanaGreen, Color(0xFF0E2A22))
                StatusChip("pre-sign", SolanaBlue, Color(0xFF10243A))
                StatusChip("private ops", SolanaPurple, Color(0xFF211633))
            }
        }
    }
}

@Composable
private fun ValidationCard(message: String) {
    Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = Color(0xFF221128))) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("Validation gate", color = SolanaGreen, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Text(message, color = Color.White)
        }
    }
}

@Composable
private fun SubmissionStateCard(uiState: UiState) {
    when (val submission = uiState.submissionState) {
        SubmissionState.Idle -> Unit
        SubmissionState.InFlight -> HeroCard(
            title = "Submission in flight",
            body = "The wallet operation is still running. Wait for the wallet prompt or signature before retrying. If this stays stuck, refresh once or relaunch the app.",
        )
        is SubmissionState.Failure -> ValidationCard(submission.message)
        is SubmissionState.Success -> HeroCard(
            title = "Latest execution proof",
            body = "Latest wallet submission succeeded. Keep the signature and explorer link attached to any reviewer or operator handoff.",
            actions = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    ReviewLinkRow("Explorer tx" to submission.result.explorerUrl)
                    ReviewLinkRow(
                        "Proof center" to PrivateDaoConfig.proofCenterUrl,
                        "Live proof V3" to PrivateDaoConfig.liveProofUrl,
                    )
                    ReviewLinkRow(
                        "Monitoring rules" to PrivateDaoConfig.monitoringAlertsUrl,
                        "Real-device runtime" to PrivateDaoConfig.realDeviceRuntimeUrl,
                    )
                }
            },
        )
    }
}

private fun formatSolAmount(lamports: Long): String {
    val sol = lamports.toDouble() / 1_000_000_000.0
    return if (sol >= 1.0) String.format("%.4f SOL", sol) else String.format("%.6f SOL", sol)
}

@Composable
private fun HeroCard(title: String, body: String, actions: @Composable (() -> Unit)? = null) {
    Card(shape = RoundedCornerShape(28.dp), colors = CardDefaults.cardColors(containerColor = Color.Transparent)) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.linearGradient(listOf(SurfacePrimary, SurfaceSecondary, Color(0xFF121329))),
                    RoundedCornerShape(28.dp),
                )
        ) {
            Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(title, color = Color.White, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Text(body, color = BodyMuted)
                actions?.invoke()
            }
        }
    }
}

@Composable
private fun MetricCard(label: String, value: String, modifier: Modifier = Modifier) {
    Card(modifier = modifier, colors = CardDefaults.cardColors(containerColor = SurfaceSecondary), shape = RoundedCornerShape(22.dp)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(label, color = LabelMuted)
            Text(value, color = Color.White, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun SmallMetric(label: String, value: String) {
    Column {
        Text(label, color = LabelMuted, style = MaterialTheme.typography.labelSmall)
        Text(value, color = Color.White)
    }
}

@Composable
private fun SettingsRow(label: String, value: String) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(label.uppercase(), color = LabelMuted, style = MaterialTheme.typography.labelSmall)
        Text(value, color = Color.White)
    }
}

@Composable
private fun FormTextField(label: String, value: String, minLines: Int = 1, onValueChange: (String) -> Unit) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = Modifier.fillMaxWidth(),
        minLines = minLines,
        label = { Text(label, color = BodyMuted) },
        textStyle = MaterialTheme.typography.bodyLarge.copy(color = Color.White),
        colors = TextFieldDefaults.colors(
            focusedTextColor = Color.White,
            unfocusedTextColor = Color.White,
            focusedContainerColor = SurfaceTertiary,
            unfocusedContainerColor = SurfaceTertiary,
            disabledContainerColor = SurfaceTertiary,
            focusedIndicatorColor = SolanaGreen,
            unfocusedIndicatorColor = Color(0xFF3A4657),
            cursorColor = SolanaGreen,
            focusedLabelColor = SolanaGreen,
            unfocusedLabelColor = BodyMuted,
        ),
    )
}

@Composable
private fun SolanaStatusStrip() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        StatusChip("Solana", SolanaGreen, SolanaPurple)
        StatusChip("Testnet", SolanaBlue, SolanaGreen)
        StatusChip("MWA", SolanaPurple, SolanaBlue)
    }
}

@Composable
private fun StatusChip(label: String, start: Color, end: Color) {
    Box(
        modifier = Modifier
            .background(
                Brush.horizontalGradient(listOf(start.copy(alpha = 0.22f), end.copy(alpha = 0.22f))),
                RoundedCornerShape(999.dp),
            )
            .padding(horizontal = 14.dp, vertical = 8.dp)
    ) {
        Text(label, color = Color.White, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun SolanaMark(modifier: Modifier = Modifier) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(4.dp)) {
        SolanaStripe(offset = 8.dp)
        SolanaStripe()
        SolanaStripe(offset = 8.dp)
    }
}

@Composable
private fun SolanaStripe(offset: androidx.compose.ui.unit.Dp = 0.dp) {
    Box(
        modifier = Modifier
            .padding(start = offset)
            .width(28.dp)
            .height(6.dp)
            .background(
                Brush.horizontalGradient(listOf(SolanaGreen, SolanaBlue, SolanaPurple)),
                RoundedCornerShape(999.dp),
            )
    )
}

@Composable
private fun primaryButtonColors() = ButtonDefaults.buttonColors(
    containerColor = SolanaPurple,
    contentColor = Color.White,
)

@Composable
private fun SegmentedActionButton(
    label: String,
    selected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    if (selected) {
        Button(
            onClick = onClick,
            modifier = modifier,
            colors = primaryButtonColors(),
        ) {
            Text(label, maxLines = 1, softWrap = false)
        }
    } else {
        OutlinedButton(
            onClick = onClick,
            modifier = modifier,
        ) {
            Text(label, maxLines = 1, softWrap = false)
        }
    }
}

@Composable
private fun DestinationGlyph(destination: Destination, selected: Boolean) {
    val active = if (selected) SolanaGreen else LabelMuted
    val inactiveFill = active.copy(alpha = 0.22f)

    Box(
        modifier = Modifier.size(width = 24.dp, height = 18.dp),
        contentAlignment = Alignment.Center,
    ) {
        when (destination) {
            Destination.Home, Destination.Wallet, Destination.Splash -> {
                Box(
                    modifier = Modifier
                        .size(14.dp)
                        .background(inactiveFill, RoundedCornerShape(5.dp))
                )
                Box(
                    modifier = Modifier
                        .size(width = 8.dp, height = 8.dp)
                        .background(active, RoundedCornerShape(3.dp))
                )
            }

            Destination.Proposals -> {
                Box(
                    modifier = Modifier
                        .offset(y = (-4).dp)
                        .width(18.dp)
                        .height(4.dp)
                        .background(active, RoundedCornerShape(999.dp))
                )
                Box(
                    modifier = Modifier
                        .offset(y = 4.dp)
                        .width(14.dp)
                        .height(4.dp)
                        .background(inactiveFill, RoundedCornerShape(999.dp))
                )
            }

            Destination.Create -> {
                Box(
                    modifier = Modifier
                        .width(16.dp)
                        .height(4.dp)
                        .background(active, RoundedCornerShape(999.dp))
                )
                Box(
                    modifier = Modifier
                        .width(4.dp)
                        .height(16.dp)
                        .background(active, RoundedCornerShape(999.dp))
                )
            }

            Destination.Awards -> {
                Box(
                    modifier = Modifier
                        .offset(x = (-5).dp, y = 3.dp)
                        .size(width = 4.dp, height = 10.dp)
                        .background(inactiveFill, RoundedCornerShape(999.dp))
                )
                Box(
                    modifier = Modifier
                        .size(width = 4.dp, height = 14.dp)
                        .background(active, RoundedCornerShape(999.dp))
                )
                Box(
                    modifier = Modifier
                        .offset(x = 5.dp, y = (-3).dp)
                        .size(width = 4.dp, height = 8.dp)
                        .background(SolanaPurple.copy(alpha = if (selected) 1f else 0.45f), RoundedCornerShape(999.dp))
                )
            }

            Destination.Settings -> {
                Box(
                    modifier = Modifier
                        .offset(x = (-6).dp)
                        .size(4.dp)
                        .background(active, RoundedCornerShape(999.dp))
                )
                Box(
                    modifier = Modifier
                        .size(4.dp)
                        .background(active, RoundedCornerShape(999.dp))
                )
                Box(
                    modifier = Modifier
                        .offset(x = 6.dp)
                        .size(4.dp)
                        .background(active, RoundedCornerShape(999.dp))
                )
            }
        }
    }
}
