package io.xpact.privatedao.android.config

import io.xpact.privatedao.android.model.BillingSku
import io.xpact.privatedao.android.model.PrivacyPolicyKey
import io.xpact.privatedao.android.model.PrivacyPolicyOption

object PrivateDaoConfig {
    const val appName = "PrivateDAO"
    const val tagline = "Encrypted Solana Operations"
    const val programId = "EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva"
    const val rpcUrl = "https://api.testnet.solana.com"
    const val chain = "solana:testnet"
    const val walletCluster = "testnet"
    const val clusterLabel = "Testnet"
    const val appVersion = "1.2.0-testnet"
    const val billingReceiveAddress = "AZUroiNeGAjNdD84eEHnAKHHFwqAFmkjr2g1eoF7Ek5c"
    const val liveSiteUrl = "https://privatedao.org"
    const val androidPageUrl = "$liveSiteUrl/android"
    const val youtubeUrl = "https://www.youtube.com/@privatedao"
    const val discordUrl = "https://discord.gg/GjJykUtTTt"
    const val xUrl = "https://x.com/privateDAOOS"
    const val telegramUrl = "https://t.me/Fahdkotb"
    const val colosseumUrl = "https://arena.colosseum.org/projects/explore/praivatedao"
    const val superteamEarnUrl = "https://superteam.fun/earn/t/Private-dao-1"
    const val phantomAndroidUrl = "https://phantom.app/download"
    const val solflareAndroidUrl = "https://solflare.com/download"

    const val systemProgramId = "11111111111111111111111111111111"
    const val memoProgramId = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
    const val tokenProgramId = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
    const val associatedTokenProgramId = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
    const val rentSysvarId = "SysvarRent111111111111111111111111111111111"

    val privacyPolicies = listOf(
        PrivacyPolicyOption(
            key = PrivacyPolicyKey.ReviewerVisible,
            title = "Reviewer-visible proof",
            tech = "ZK anchors + explorer evidence",
            summary = "Best when a judge, buyer, or community reviewer must follow public hashes while protected inputs stay abstracted.",
        ),
        PrivacyPolicyOption(
            key = PrivacyPolicyKey.CommitteePrivate,
            title = "Committee-private voting",
            tech = "Commit-reveal + ZK voting",
            summary = "Best when vote intent should stay hidden until reveal while final execution remains auditable on Testnet.",
        ),
        PrivacyPolicyOption(
            key = PrivacyPolicyKey.ConfidentialPayout,
            title = "Confidential treasury payout",
            tech = "REFHE + MagicBlock corridors",
            summary = "Best for payroll, grants, rewards, and vendor payouts where amount logic and intent need stronger protection.",
        ),
        PrivacyPolicyOption(
            key = PrivacyPolicyKey.SelectiveDisclosure,
            title = "Selective disclosure",
            tech = "Custody trail + narrow reviewer window",
            summary = "Best when a reviewer needs a bounded view into the action without opening every internal operating detail.",
        ),
    )

    val billingSkus = listOf(
        BillingSku(
            key = "wallet-onboarding",
            title = "Wallet-first onboarding lane",
            amountSol = 0.003,
            memoLabel = "WALLET_ONBOARDING",
            summary = "A small Testnet charge that proves a normal visitor can pay from the wallet and inspect the chain result.",
        ),
        BillingSku(
            key = "governance-cycle",
            title = "Governance cycle rehearsal",
            amountSol = 0.005,
            memoLabel = "GOVERNANCE_REHEARSAL",
            summary = "A commercial rehearsal for proposal creation, voting operations, and proof-linked review.",
        ),
        BillingSku(
            key = "privacy-packet",
            title = "Privacy packet lane",
            amountSol = 0.007,
            memoLabel = "PRIVACY_PACKET",
            summary = "A Testnet signal that reviewer-grade privacy and proof can be tied to an on-chain payment event.",
        ),
        BillingSku(
            key = "confidential-payout",
            title = "Confidential payout rehearsal",
            amountSol = 0.01,
            memoLabel = "CONFIDENTIAL_PAYOUT",
            summary = "A larger Testnet rehearsal for the confidential treasury path before later contractized billing rails are introduced.",
        ),
    )

    val webSurfaceLinks = listOf(
        "Start" to "$liveSiteUrl/start",
        "Govern" to "$liveSiteUrl/govern",
        "Intelligence" to "$liveSiteUrl/intelligence",
        "Treasury" to "$liveSiteUrl/treasury",
        "Payroll" to "$liveSiteUrl/payroll",
        "Execute" to "$liveSiteUrl/execute",
        "Proof" to "$liveSiteUrl/proof",
        "API Status" to "$liveSiteUrl/api-status",
        "RPC Services" to "$liveSiteUrl/rpc-services",
        "QuickNode Stream" to "$liveSiteUrl/documents/quicknode-stream-intelligence",
        "GoldRush Intelligence" to "$liveSiteUrl/services/goldrush-decision-intelligence",
        "Services" to "$liveSiteUrl/services",
        "Security" to "$liveSiteUrl/security",
        "Documents" to "$liveSiteUrl/documents",
    )

    val socialLinks = listOf(
        "YouTube" to youtubeUrl,
        "Discord" to discordUrl,
        "X" to xUrl,
        "Telegram" to telegramUrl,
    )

    val walletInstallLinks = listOf(
        "Install Phantom" to phantomAndroidUrl,
        "Install Solflare" to solflareAndroidUrl,
    )

    fun accountExplorer(address: String): String = "https://solscan.io/account/$address?cluster=testnet"
    fun txExplorer(signature: String): String = "https://solscan.io/tx/$signature?cluster=testnet"
}
