package io.xpact.privatedao.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import io.xpact.privatedao.android.presentation.PrivateDaoApp
import io.xpact.privatedao.android.presentation.PrivateDaoViewModel
import io.xpact.privatedao.android.wallet.MobileWalletAdapterManager

val LocalMwaLauncher = staticCompositionLocalOf<androidx.activity.result.ActivityResultLauncher<MobileWalletAdapterManager.StartMobileWalletAdapterActivity.CreateParams>> {
    error("MWA launcher not provided")
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val vm: PrivateDaoViewModel = viewModel()
            val uiState = vm.uiState.collectAsStateWithLifecycle()
            val launcher = rememberLauncherForActivityResult(
                contract = MobileWalletAdapterManager.StartMobileWalletAdapterActivity(lifecycle),
                onResult = {},
            )

            CompositionLocalProvider(LocalMwaLauncher provides launcher) {
                PrivateDaoApp(
                    uiState = uiState.value,
                    onRefresh = vm::refresh,
                    onConnectWallet = { vm.connectWallet(launcher) },
                    onDisconnectWallet = { vm.disconnectWallet(launcher) },
                    onSelectProposal = vm::selectProposal,
                    onCreateDaoChange = vm::updateCreateDaoForm,
                    onDepositTreasuryChange = vm::updateDepositTreasuryForm,
                    onCreateProposalChange = vm::updateCreateProposalForm,
                    onCommitVoteChange = vm::updateCommitVoteForm,
                    onRevealVoteChange = vm::updateRevealVoteForm,
                    onSubmitCreateDao = { vm.submitCreateDao(launcher) },
                    onSubmitDepositTreasury = { vm.submitDepositTreasury(launcher) },
                    onSubmitBillingRehearsal = { sku -> vm.submitBillingRehearsal(launcher, sku) },
                    onSubmitCreateProposal = { vm.submitCreateProposal(launcher) },
                    onSubmitCommitVote = { vm.submitCommitVote(launcher) },
                    onSubmitRevealVote = { vm.submitRevealVote(launcher) },
                    onSubmitFinalize = { vm.submitFinalize(launcher) },
                    onSubmitExecute = { vm.submitExecute(launcher) },
                )
            }
        }
    }
}
