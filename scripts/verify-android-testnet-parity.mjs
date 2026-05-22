import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const expected = {
  apkFile: "PrivateDAO-android-testnet-debug.apk",
  packageName: "io.xpact.privatedao.android",
  programId: "EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva",
  network: "Solana Testnet",
  versionName: "1.1.0-testnet",
  versionCode: "2",
  walletAdapter: "2.1.0",
  sha256: "bcd7d3b0007eb5906cef4aaee3926c9d78798d67d93852e85d4e1794cb2426f8",
};

const files = {
  androidConfig: "apps/android-native/app/src/main/java/io/xpact/privatedao/android/config/PrivateDaoConfig.kt",
  androidBuild: "apps/android-native/app/build.gradle.kts",
  androidManifest: "apps/android-native/app/src/main/AndroidManifest.xml",
  androidUi: "apps/android-native/app/src/main/java/io/xpact/privatedao/android/presentation/PrivateDaoApp.kt",
  webAndroidSurface: "apps/web/src/lib/android-surface.ts",
  webProgram: "apps/web/src/lib/onchain-parity.generated.ts",
  publicManifest: "apps/web/public/android-testnet-parity-manifest.json",
  artifactManifest: "artifacts/android/private-dao-android-testnet-parity-manifest.json",
  artifactApk: `artifacts/android/${expected.apkFile}`,
  publicApk: `apps/web/public/downloads/${expected.apkFile}`,
};

function read(relativePath) {
  return readFileSync(join(root, relativePath));
}

function readText(relativePath) {
  return read(relativePath).toString("utf8");
}

function assertIncludes(relativePath, needle, label = needle) {
  const body = readText(relativePath);
  if (!body.includes(needle)) {
    throw new Error(`${relativePath} is missing ${label}`);
  }
}

function sha256(relativePath) {
  return createHash("sha256").update(read(relativePath)).digest("hex");
}

function parseJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

for (const relativePath of Object.values(files)) {
  read(relativePath);
}

assertIncludes(files.androidConfig, `programId = "${expected.programId}"`, "current Testnet program ID");
assertIncludes(files.androidConfig, 'chain = "solana:testnet"', "Solana Testnet chain");
assertIncludes(files.androidConfig, 'walletCluster = "testnet"', "wallet testnet cluster");
assertIncludes(files.androidBuild, `namespace = "${expected.packageName}"`, "Android namespace");
assertIncludes(files.androidBuild, `applicationId = "${expected.packageName}"`, "Android application ID");
assertIncludes(files.androidBuild, `versionCode = ${expected.versionCode}`, "Android version code");
assertIncludes(files.androidBuild, `versionName = "${expected.versionName}"`, "Android version name");
assertIncludes(files.androidBuild, `mobile-wallet-adapter-clientlib-ktx:${expected.walletAdapter}`, "Solana Mobile Wallet Adapter version");
assertIncludes(files.androidManifest, 'android:allowBackup="false"', "Android backup disabled");
assertIncludes(files.androidUi, `SettingsRow("Version", "${expected.versionName}")`, "visible Android app version");
assertIncludes(files.webAndroidSurface, `androidProgramId = "${expected.programId}"`, "web Android program constant");
assertIncludes(files.webAndroidSurface, `androidAppVersion = "${expected.versionName}"`, "web Android app version constant");
assertIncludes(files.webAndroidSurface, `androidVersionCode = "${expected.versionCode}"`, "web Android version code constant");
assertIncludes(files.webAndroidSurface, `androidWalletAdapterVersion = "${expected.walletAdapter}"`, "web MWA version constant");
assertIncludes(files.webProgram, `PRIVATE_DAO_PROGRAM_ID = "${expected.programId}"`, "web on-chain program ID");

const artifactSha = sha256(files.artifactApk);
const publicSha = sha256(files.publicApk);
if (artifactSha !== expected.sha256) {
  throw new Error(`${files.artifactApk} SHA mismatch: expected ${expected.sha256}, got ${artifactSha}`);
}
if (publicSha !== expected.sha256) {
  throw new Error(`${files.publicApk} SHA mismatch: expected ${expected.sha256}, got ${publicSha}`);
}

const publicManifest = parseJson(files.publicManifest);
const artifactManifest = parseJson(files.artifactManifest);
const publicManifestText = JSON.stringify(publicManifest);
const artifactManifestText = JSON.stringify(artifactManifest);
if (publicManifestText !== artifactManifestText) {
  throw new Error("Android public manifest and artifact manifest diverged");
}

const manifestChecks = [
  ["programId", publicManifest.programId, expected.programId],
  ["network", publicManifest.network, expected.network],
  ["android.packageName", publicManifest.android?.packageName, expected.packageName],
  ["android.versionName", publicManifest.android?.versionName, expected.versionName],
  ["android.versionCode", String(publicManifest.android?.versionCode), expected.versionCode],
  ["android.mobileWalletAdapter", publicManifest.android?.mobileWalletAdapter, expected.walletAdapter],
  ["android.apkFile", publicManifest.android?.apkFile, expected.apkFile],
  ["android.sha256", publicManifest.android?.sha256, expected.sha256],
];

for (const [label, actual, wanted] of manifestChecks) {
  if (actual !== wanted) {
    throw new Error(`manifest ${label} mismatch: expected ${wanted}, got ${actual}`);
  }
}

console.log("Android Testnet parity verified");
console.log(`program=${expected.programId}`);
console.log(`apk=${expected.apkFile}`);
console.log(`sha256=${expected.sha256}`);
