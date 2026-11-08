package org.privatedao.wallet

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val Bg = Color(0xFF060B13)
private val Surface = Color(0xFF101A27)
private val Panel = Color(0xFF142130)
private val Muted = Color(0xFF9AAABA)
private val Mint = Color(0xFF81F1C2)
private val Cyan = Color(0xFF85DFFF)
private val White = Color(0xFFF4F7FB)
private val Gradient = Brush.linearGradient(listOf(Mint, Cyan))

private data class Lane(val glyph: String, val title: String, val description: String, val url: String)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = android.graphics.Color.rgb(6,11,19)
        window.navigationBarColor = android.graphics.Color.rgb(6,11,19)
        setContent {
            MaterialTheme(colorScheme = darkColorScheme(
                primary = Mint, secondary = Cyan, background = Bg,
                surface = Surface, onBackground = White, onSurface = White
            )) {
                WalletApp { url ->
                    // External web handoff. Never intercept or sign transactions inside this preview.
                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                }
            }
        }
    }
}

@Composable
private fun WalletApp(open: (String) -> Unit) {
    var tab by remember { mutableIntStateOf(0) }
    Scaffold(
        containerColor = Bg,
        bottomBar = {
            Row(
                modifier = Modifier.fillMaxWidth().background(Surface).navigationBarsPadding().padding(vertical = 10.dp, horizontal = 10.dp),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                listOf("Home", "Assets", "Explore", "Safety").forEachIndexed { i, name ->
                    Column(
                        modifier = Modifier.weight(1f).clip(RoundedCornerShape(14.dp)).clickable { tab = i }.padding(6.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(listOf("⌂", "◈", "✧", "◇")[i], color = if (tab == i) Mint else Muted, fontSize = 23.sp)
                        Text(name, fontSize = 11.sp, color = if (tab == i) White else Muted)
                    }
                }
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 24.dp, bottom = 28.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            item { Header() }
            when (tab) {
                0 -> {
                    item { HeroCard(open) }
                    item { SectionTitle("Your command center", "One wallet  Infinite possibilities") }
                    item { ActionGrid(open) }
                    item { SectionTitle("Your ecosystem", "Built for people and agents") }
                    items(lanes.take(3)) { lane -> LaneCard(lane, open) }
                }
                1 -> {
                    item { SectionTitle("Your assets", "Private by design") }
                    item { EmptyAssets(open) }
                    item { LaneCard(Lane("↗","Open live wallet","Balances and transaction history via the existing live web wallet","https://privatedao.org/wallet"), open) }
                }
                2 -> {
                    item { SectionTitle("Explore", "Infrastructure  Not another wallet") }
                    items(lanes) { lane -> LaneCard(lane, open) }
                }
                else -> {
                    item { SectionTitle("Safety center", "Verify before you execute") }
                    item { SafetyCard(open) }
                    item { LaneCard(Lane("◎","On-chain verification","Use the current PrivateDAO verification services","https://privatedao.org"),open) }
                }
            }
            item {
                Text("PDAO WALLET  •  ANDROID BETA 0.1.0\nPreview interface  •  No keys stored  •  No on-device transactions",
                    fontSize = 10.sp, lineHeight = 18.sp, textAlign = TextAlign.Center, color = Muted,
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
            }
        }
    }
}

@Composable
private fun Header() {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
        Box(modifier = Modifier.size(44.dp).clip(RoundedCornerShape(14.dp)).background(Gradient),
            contentAlignment = Alignment.Center) { Text("P", color = Bg, fontSize = 26.sp, fontWeight = FontWeight.Black) }
        Spacer(Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text("PDAO", fontSize = 21.sp, fontWeight = FontWeight.Black, color = White, letterSpacing = 2.sp)
            Text("W A L L E T", fontSize = 10.sp, color = Muted, letterSpacing = 3.sp)
        }
        Box(modifier = Modifier.border(1.dp, Mint.copy(alpha=.4f), RoundedCornerShape(40.dp))
            .padding(horizontal = 12.dp, vertical = 7.dp)) {
            Text("●  BETA", fontSize = 10.sp, color = Mint, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun HeroCard(open: (String) -> Unit) {
    Card(shape = RoundedCornerShape(28.dp), colors = CardDefaults.cardColors(containerColor = Panel)) {
        Box(modifier = Modifier.background(Brush.linearGradient(listOf(Color(0xFF19352F),Color(0xFF152A36),Panel)))) {
            Column(Modifier.fillMaxWidth().padding(25.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Text("YOUR DIGITAL SOVEREIGNTY", color = Mint, letterSpacing = 2.sp,
                    fontSize = 10.sp, fontWeight = FontWeight.Bold)
                Text("Own your assets.\nProtect your decisions.", fontWeight = FontWeight.Bold,
                    color = White, fontSize = 28.sp, lineHeight = 34.sp)
                Text("Your portfolio", color = Muted, fontSize = 13.sp)
                Text("Connect to view", color = White, fontWeight = FontWeight.SemiBold, fontSize = 24.sp)
                Text("Balances are never fabricated. Connect through the existing wallet experience.",
                    color = Muted, fontSize = 12.sp, lineHeight = 18.sp)
                Button(onClick = { open("https://privatedao.org/wallet") },
                    colors = ButtonDefaults.buttonColors(containerColor = Mint, contentColor = Bg),
                    shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth().height(52.dp)) {
                    Text("OPEN LIVE WALLET  ↗", fontWeight = FontWeight.Black, letterSpacing = 1.sp)
                }
            }
        }
    }
}

@Composable
private fun SectionTitle(title: String, subtitle: String) {
    Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
        Text(title, color = White, fontSize = 21.sp, fontWeight = FontWeight.Bold)
        Text(subtitle, color = Muted, fontSize = 12.sp)
    }
}

@Composable
private fun ActionGrid(open: (String) -> Unit) {
    val actions = listOf(
        "↗" to "Send" to "https://privatedao.org/wallet",
        "↙" to "Receive" to "https://privatedao.org/wallet",
        "⌁" to "PrivatePAY" to "https://privatedao.org/privatepay",
        "◈" to "Agents" to "https://agents.privatedao.org"
    )
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
        actions.forEach { action ->
            Column(modifier = Modifier.weight(1f).clip(RoundedCornerShape(18.dp))
                .background(Surface).clickable { open(action.second) }
                .padding(vertical = 18.dp, horizontal = 3.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(action.first.first, color = Mint, fontSize = 24.sp)
                Spacer(Modifier.height(8.dp))
                Text(action.first.second, color = White, fontSize = 11.sp, fontWeight = FontWeight.Medium)
            }
        }
    }
}

private val lanes = listOf(
    Lane("◉", "PrivatePAY x402", "Payments for people and autonomous agents", "https://privatedao.org/privatepay"),
    Lane("✧", "Agent Exchange", "Verification, analytics and intelligent services", "https://agents.privatedao.org"),
    Lane("◈", "PDAO Utility", "Explore token-linked access and service benefits", "https://privatedao.org/wallet"),
    Lane("⌁", "Chain intelligence", "Research and verify before committing capital", "https://privatedao.org"),
    Lane("◇", "Tokenized assets", "Explore the broader PrivateDAO infrastructure", "https://privatedao.org")
)

@Composable
private fun LaneCard(lane: Lane, open: (String) -> Unit) {
    Row(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(21.dp)).background(Surface)
        .clickable { open(lane.url) }.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(modifier = Modifier.size(51.dp).clip(RoundedCornerShape(16.dp)).background(Panel),
            contentAlignment = Alignment.Center) {
            Text(lane.glyph, color = Cyan, fontSize = 26.sp)
        }
        Spacer(Modifier.width(13.dp))
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(5.dp)) {
            Text(lane.title, fontWeight = FontWeight.Bold, color = White, fontSize = 15.sp)
            Text(lane.description, color = Muted, fontSize = 12.sp, lineHeight = 17.sp)
        }
        Text("↗", color = Mint, fontSize = 21.sp)
    }
}

@Composable
private fun EmptyAssets(open: (String) -> Unit) {
    Card(shape = RoundedCornerShape(26.dp), colors = CardDefaults.cardColors(containerColor = Surface)) {
        Column(modifier = Modifier.fillMaxWidth().padding(30.dp),
            horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text("◈", color = Mint, fontSize = 50.sp)
            Text("No account connected", color = White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Text("This beta preview does not access your keys or show simulated holdings. Open the live wallet to see actual balances and transactions.",
                color = Muted, fontSize = 13.sp, lineHeight = 20.sp, textAlign = TextAlign.Center)
            OutlinedButton(onClick = { open("https://privatedao.org/wallet") },
                border = BorderStroke(1.dp, Mint), shape = RoundedCornerShape(16.dp)) {
                Text("Go to wallet  ↗", color = Mint)
            }
        }
    }
}

@Composable
private fun SafetyCard(open: (String) -> Unit) {
    Card(shape = RoundedCornerShape(26.dp), colors = CardDefaults.cardColors(containerColor = Panel)) {
        Column(Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text("◇  ZERO TRUST BY DEFAULT", color = Mint, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            Text("Your decision is the first line of defense", color = White, fontSize = 24.sp, fontWeight = FontWeight.Bold, lineHeight = 31.sp)
            Text("This preview does not create or import private keys and cannot sign transfers. Authentication, payment execution and risk scoring require separately verified native integrations.",
                color = Muted, lineHeight = 20.sp, fontSize = 13.sp)
            OutlinedButton(onClick = { open("https://privatedao.org") }, border = BorderStroke(1.dp, Mint),
                shape = RoundedCornerShape(16.dp)) { Text("Explore PrivateDAO  ↗", color = Mint) }
        }
    }
}
