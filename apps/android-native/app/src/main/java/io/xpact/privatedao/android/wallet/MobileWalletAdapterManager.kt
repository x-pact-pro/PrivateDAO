package io.xpact.privatedao.android.wallet

import android.app.Application
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import androidx.activity.result.ActivityResult
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContract
import androidx.annotation.GuardedBy
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.whenResumed
import com.solana.mobilewalletadapter.clientlib.protocol.JsonRpc20Client
import com.solana.mobilewalletadapter.clientlib.protocol.MobileWalletAdapterClient
import com.solana.mobilewalletadapter.clientlib.scenario.LocalAssociationIntentCreator
import com.solana.mobilewalletadapter.clientlib.scenario.LocalAssociationScenario
import com.solana.mobilewalletadapter.clientlib.scenario.Scenario
import com.solana.mobilewalletadapter.common.protocol.SessionProperties
import io.xpact.privatedao.android.config.PrivateDaoConfig
import io.xpact.privatedao.android.model.ConnectedWallet
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.cancel
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.runInterruptible
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import java.io.IOException
import java.util.concurrent.ExecutionException
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException

class MobileWalletAdapterManager(
    application: Application,
) {
    private val appContext = application.applicationContext
    private val store = WalletSessionStore(appContext)
    private val semaphore = Semaphore(1)

    private val identity = DappIdentity(
        uri = Uri.parse(PrivateDaoConfig.liveSiteUrl),
        iconRelativeUri = Uri.parse("/opengraph-image.png"),
        name = "PrivateDAO",
    )

    fun isWalletEndpointAvailable(): Boolean {
        return LocalAssociationIntentCreator.isWalletEndpointAvailable(appContext.packageManager)
    }

    fun restoreSession(): ConnectedWallet? = store.load()

    suspend fun authorize(
        launcher: ActivityResultLauncher<StartMobileWalletAdapterActivity.CreateParams>,
    ): ConnectedWallet {
        val auth = localAssociateAndExecute(launcher) { client, session ->
            client.authorize(identity, PrivateDaoConfig.chain, null, null, session.protocolVersion)
        }
        val account = auth.accounts.firstOrNull() ?: error("Wallet returned no authorized accounts")
        val wallet = ConnectedWallet(
            accountLabel = account.accountLabel ?: io.xpact.privatedao.android.solana.Base58.encode(account.publicKey),
            publicKeyBase58 = io.xpact.privatedao.android.solana.Base58.encode(account.publicKey),
            authToken = auth.authToken,
            walletUriBase = auth.walletUriBase?.toString(),
        )
        store.save(wallet)
        return wallet
    }

    suspend fun deauthorize(
        launcher: ActivityResultLauncher<StartMobileWalletAdapterActivity.CreateParams>,
        current: ConnectedWallet,
    ) {
        localAssociateAndExecute(launcher, current.walletUriBase?.let(Uri::parse)) { client, _ ->
            client.deauthorize(current.authToken)
        }
        store.clear()
    }

    suspend fun signAndSendSingleTransaction(
        launcher: ActivityResultLauncher<StartMobileWalletAdapterActivity.CreateParams>,
        wallet: ConnectedWallet,
        unsignedTransaction: ByteArray,
    ): String {
        val signatures = localAssociateAndExecute(launcher, wallet.walletUriBase?.let(Uri::parse)) { client, session ->
            client.reauthorize(identity, wallet.authToken, session.protocolVersion)
            client.signAndSendTransactions(arrayOf(unsignedTransaction))
        }
        return io.xpact.privatedao.android.solana.Base58.encode(signatures.first())
    }

    private suspend fun <T> localAssociateAndExecute(
        launcher: ActivityResultLauncher<StartMobileWalletAdapterActivity.CreateParams>,
        uriPrefix: Uri? = null,
        action: suspend (Client, SessionProperties) -> T,
    ): T = coroutineScope {
        semaphore.withPermit {
            val contract = launcher.contract as StartMobileWalletAdapterActivity
            val localAssociation = LocalAssociationScenario(Scenario.DEFAULT_CLIENT_TIMEOUT_MS)
            val associationIntent = LocalAssociationIntentCreator.createAssociationIntent(
                uriPrefix,
                localAssociation.port,
                localAssociation.session,
            )

            contract.waitForActivityResumed()
            try {
                launcher.launch(StartMobileWalletAdapterActivity.CreateParams(associationIntent, this))
            } catch (e: ActivityNotFoundException) {
                throw NoWalletAvailableException("No MWA-compatible Android wallet found", e)
            }

            withContext(Dispatchers.IO) {
                try {
                    val client = runInterruptible {
                        localAssociation.start().get(60_000L, TimeUnit.MILLISECONDS)
                    }
                    contract.onMobileWalletAdapterClientConnected(this)
                    action(Client(client), localAssociation.session.sessionProperties)
                } catch (e: TimeoutException) {
                    throw LocalAssociationFailedException("Timed out while connecting to the wallet app", e)
                } catch (e: ExecutionException) {
                    throw LocalAssociationFailedException("Wallet association failed", e.cause)
                } finally {
                    localAssociation.close().get(2_000L, TimeUnit.MILLISECONDS)
                }
            }
        }
    }

    class Client(private val client: MobileWalletAdapterClient) {
        suspend fun authorize(
            identity: DappIdentity,
            chain: String,
            authorizedAccounts: List<ByteArray>?,
            features: Array<String>? = null,
            protocolVersion: SessionProperties.ProtocolVersion,
        ): MobileWalletAdapterClient.AuthorizationResult = try {
            runInterruptible(Dispatchers.IO) {
                if (protocolVersion == SessionProperties.ProtocolVersion.V1) {
                    client.authorize(
                        identity.uri,
                        identity.iconRelativeUri,
                        identity.name,
                        chain,
                        null,
                        features,
                        authorizedAccounts?.toTypedArray(),
                        null,
                    ).get()!!
                } else {
                    client.authorize(identity.uri, identity.iconRelativeUri, identity.name, PrivateDaoConfig.walletCluster).get()!!
                }
            }
        } catch (e: ExecutionException) {
            throw mapException("authorize", e)
        }

        suspend fun reauthorize(
            identity: DappIdentity,
            authToken: String,
            protocolVersion: SessionProperties.ProtocolVersion,
        ): MobileWalletAdapterClient.AuthorizationResult = try {
            runInterruptible(Dispatchers.IO) {
                if (protocolVersion == SessionProperties.ProtocolVersion.V1) {
                    client.reauthorize(identity.uri, identity.iconRelativeUri, identity.name, authToken).get()!!
                } else {
                    client.reauthorize(identity.uri, identity.iconRelativeUri, identity.name, authToken).get()!!
                }
            }
        } catch (e: ExecutionException) {
            throw mapException("reauthorize", e)
        }

        suspend fun deauthorize(authToken: String) {
            try {
                runInterruptible(Dispatchers.IO) { client.deauthorize(authToken).get()!! }
            } catch (e: ExecutionException) {
                throw mapException("deauthorize", e)
            }
        }

        suspend fun signAndSendTransactions(transactions: Array<ByteArray>): Array<ByteArray> = try {
            runInterruptible(Dispatchers.IO) {
                client.signAndSendTransactions(transactions, null, "confirmed", false, null, null).get()!!.signatures
            }
        } catch (e: ExecutionException) {
            throw mapException("signAndSendTransactions", e)
        }

        private fun mapException(operation: String, error: ExecutionException): Exception {
            val cause = error.cause
            return when (cause) {
                is JsonRpc20Client.JsonRpc20RemoteException ->
                    MobileWalletAdapterOperationFailedException("$operation rejected by wallet: ${cause.code}", cause)
                is IOException ->
                    MobileWalletAdapterOperationFailedException("$operation IO failure", cause)
                is TimeoutException ->
                    MobileWalletAdapterOperationFailedException("$operation timed out", cause)
                else -> MobileWalletAdapterOperationFailedException("$operation failed", cause ?: error)
            }
        }
    }

    data class DappIdentity(
        val uri: Uri?,
        val iconRelativeUri: Uri?,
        val name: String,
    )

    class StartMobileWalletAdapterActivity(
        private val activityLifecycle: Lifecycle,
    ) : ActivityResultContract<StartMobileWalletAdapterActivity.CreateParams, ActivityResult>() {
        data class CreateParams(val intent: Intent, val coroutineScope: CoroutineScope)

        @GuardedBy("this")
        private var scope: CoroutineScope? = null

        @GuardedBy("this")
        private var connected: Boolean = false

        override fun createIntent(context: Context, input: CreateParams): Intent {
            synchronized(this) {
                scope = input.coroutineScope
                connected = false
            }
            return input.intent
        }

        override fun parseResult(resultCode: Int, intent: Intent?): ActivityResult {
            val localScope: CoroutineScope?
            val wasConnected: Boolean
            synchronized(this) {
                localScope = scope.also { scope = null }
                wasConnected = connected.also { connected = false }
            }
            localScope?.let { scope ->
                if (wasConnected) {
                    scope.launch {
                        delay(5_000L)
                        scope.cancel()
                    }
                } else {
                    scope.cancel()
                }
            }
            return ActivityResult(resultCode, intent)
        }

        suspend fun waitForActivityResumed() {
            withTimeout(20_000L) {
                activityLifecycle.whenResumed {}
            }
        }

        internal fun onMobileWalletAdapterClientConnected(scope: CoroutineScope) {
            synchronized(this) {
                this.scope = scope
                this.connected = true
            }
        }
    }

    sealed class WalletOperationException(message: String, cause: Throwable?) : Exception(message, cause)
    class NoWalletAvailableException(message: String, cause: Throwable?) : WalletOperationException(message, cause)
    class LocalAssociationFailedException(message: String, cause: Throwable?) : WalletOperationException(message, cause)
    class MobileWalletAdapterOperationFailedException(message: String, cause: Throwable?) : WalletOperationException(message, cause)
}
