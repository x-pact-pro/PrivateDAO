package org.privatedao.wallet;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class MainActivity extends Activity {
    private static final String RPC = "https://api.mainnet-beta.solana.com";
    private static final String AGENTS = "https://agents.privatedao.org";
    private final ExecutorService io = Executors.newFixedThreadPool(3);

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        setContentView(R.layout.activity_main);
        TextView status = findViewById(R.id.status);
        TextView balance = findViewById(R.id.balance);
        EditText address = findViewById(R.id.address);
        findViewById(R.id.checkBalance).setOnClickListener(v -> checkBalance(address.getText().toString().trim(), balance));
        link(R.id.openWallet, "https://privatedao.org/wallet");
        link(R.id.openAgents, AGENTS + "/marketplace");
        link(R.id.openPrivatePay, "https://privatedao.org/privatepay");
        link(R.id.pump, "https://pump.fun/coin/9isGuumtaqvJeJeyLF44fvfskk2cv5mYsopexMBfpump");
        link(R.id.gmgn, "https://gmgn.ai/sol/token/9isGuumtaqvJeJeyLF44fvfskk2cv5mYsopexMBfpump");
        link(R.id.moonshot, "https://moonshot.money");
        link(R.id.telegram, "https://t.me/Fahdkotb");
        refreshLiveStatus(status);
    }

    private void link(int id, String url) {
        ((Button)findViewById(id)).setOnClickListener(v -> startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))));
    }

    private void refreshLiveStatus(TextView view) {
        io.execute(() -> {
            try {
                JSONObject prices = getJson("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true");
                JSONObject catalog = getJson(AGENTS + "/api/services");
                int count = catalog.optJSONArray("services") != null ? catalog.getJSONArray("services").length() : catalog.optInt("count", 0);
                String line = String.format(Locale.US, "LIVE  SOL $%,.2f  ·  BTC $%,.0f  ·  ETH $%,.0f\nAgent Exchange: %d live services · PrivatePAY x402 available through wallet approval",
                    prices.getJSONObject("solana").getDouble("usd"), prices.getJSONObject("bitcoin").getDouble("usd"), prices.getJSONObject("ethereum").getDouble("usd"), count);
                runOnUiThread(() -> view.setText(line));
            } catch (Exception e) {
                runOnUiThread(() -> view.setText("Live endpoint unavailable. Pull to retry later; no demo value was substituted."));
            }
        });
    }

    private void checkBalance(String publicKey, TextView view) {
        if (!publicKey.matches("[1-9A-HJ-NP-Za-km-z]{32,44}")) {
            view.setText("Enter a valid Solana public address. Private keys are never accepted.");
            return;
        }
        view.setText("Reading Solana Mainnet…");
        io.execute(() -> {
            try {
                JSONObject body = new JSONObject().put("jsonrpc", "2.0").put("id", 1).put("method", "getBalance")
                    .put("params", new JSONArray().put(publicKey).put(new JSONObject().put("commitment", "confirmed")));
                JSONObject result = postJson(RPC, body).getJSONObject("result");
                double value = result.getDouble("value") / 1_000_000_000d;
                runOnUiThread(() -> view.setText(String.format(Locale.US, "Confirmed Mainnet balance: %.9f SOL", value)));
            } catch (Exception e) {
                runOnUiThread(() -> view.setText("Mainnet read failed. No cached or simulated balance was shown."));
            }
        });
    }

    private static JSONObject getJson(String target) throws Exception {
        HttpURLConnection c = (HttpURLConnection)new URL(target).openConnection();
        c.setConnectTimeout(8000); c.setReadTimeout(8000); c.setRequestProperty("Accept", "application/json");
        return read(c);
    }

    private static JSONObject postJson(String target, JSONObject body) throws Exception {
        HttpURLConnection c = (HttpURLConnection)new URL(target).openConnection();
        c.setConnectTimeout(8000); c.setReadTimeout(8000); c.setRequestMethod("POST"); c.setDoOutput(true);
        c.setRequestProperty("Content-Type", "application/json");
        try (OutputStream out = c.getOutputStream()) { out.write(body.toString().getBytes(StandardCharsets.UTF_8)); }
        return read(c);
    }

    private static JSONObject read(HttpURLConnection c) throws Exception {
        if (c.getResponseCode() < 200 || c.getResponseCode() >= 300) throw new IllegalStateException("HTTP " + c.getResponseCode());
        StringBuilder text = new StringBuilder();
        try (BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream(), StandardCharsets.UTF_8))) {
            for (String line; (line = r.readLine()) != null;) text.append(line);
        } finally { c.disconnect(); }
        return new JSONObject(text.toString());
    }

    @Override protected void onDestroy() { io.shutdownNow(); super.onDestroy(); }
}
