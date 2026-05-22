package io.xpact.privatedao.android.config

import io.xpact.privatedao.android.BuildConfig

object PrivateDaoConfig {
    const val appName = "PrivateDAO"
    const val tagline = "Vote Without Fear"
    const val programId = "5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx"
    const val rpcUrl = BuildConfig.DEVNET_RPC_URL
    val rpcFallbackUrls: List<String> =
        BuildConfig.DEVNET_RPC_FALLBACK_URLS
            .split('|')
            .map(String::trim)
            .filter(String::isNotEmpty)
            .distinct()
    val rpcUrls: List<String> = listOf(rpcUrl) + rpcFallbackUrls.filterNot { it == rpcUrl }
    val rpcRouteSummary: String = rpcUrls.joinToString(" -> ")
    const val chain = "solana:devnet"
    const val clusterLabel = "Devnet"
    const val webBaseUrl = "https://privatedao.org"
    const val proofCenterUrl = "$webBaseUrl/proof"
    const val judgeModeUrl = "$webBaseUrl/proof?judge=1"
    const val liveProofUrl = "$webBaseUrl/documents/live-proof-v3"
    const val monitoringAlertsUrl = "$webBaseUrl/documents/monitoring-alert-rules"
    const val incidentResponseUrl = "$webBaseUrl/documents/incident-response"
    const val reviewerFastPathUrl = "$webBaseUrl/documents/reviewer-fast-path"
    const val mainnetReadinessUrl = "$webBaseUrl/documents/mainnet-readiness"
    const val realDeviceRuntimeUrl = "$webBaseUrl/documents/real-device-runtime"
    const val androidSurfaceUrl = "$webBaseUrl/android"
    const val servicesUrl = "$webBaseUrl/services"
    const val governanceUrl = "$webBaseUrl/govern"
    const val confidentialPaymentsUrl = "$webBaseUrl/services/confidential-payments"
    const val confidentialPayrollUrl = "$webBaseUrl/services/refhe-payroll-proof"
    const val gamingUrl = "$webBaseUrl/gaming"
    const val intelligenceUrl = "$webBaseUrl/intelligence"
    const val diagnosticsUrl = "$webBaseUrl/diagnostics"

    const val systemProgramId = "11111111111111111111111111111111"
    const val tokenProgramId = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
    const val associatedTokenProgramId = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
    const val rentSysvarId = "SysvarRent111111111111111111111111111111111"
    const val mintAccountSpace = 82
    const val mintRentExemptionLamports = 1_461_600L

    fun accountExplorer(address: String): String = "https://solscan.io/account/$address?cluster=devnet"
    fun txExplorer(signature: String): String = "https://solscan.io/tx/$signature?cluster=devnet"
}
