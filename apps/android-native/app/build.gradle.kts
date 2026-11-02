import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.serialization")
    id("org.jetbrains.kotlin.plugin.compose")
}

// Release signing reads these names only. Values come from the environment or
// from Gradle properties (-P or a local, untracked gradle.properties). Never
// commit a keystore, store password, key alias, or key password.
private fun releaseCredential(name: String): String? {
    val fromEnv = System.getenv(name)?.trim()?.takeIf { it.isNotEmpty() }
    if (fromEnv != null) return fromEnv
    return (findProperty(name) as? String)?.trim()?.takeIf { it.isNotEmpty() }
}

val releaseStoreFile = releaseCredential("PDAO_RELEASE_STORE_FILE")
val releaseStorePassword = releaseCredential("PDAO_RELEASE_STORE_PASSWORD")
val releaseKeyAlias = releaseCredential("PDAO_RELEASE_KEY_ALIAS")
val releaseKeyPassword = releaseCredential("PDAO_RELEASE_KEY_PASSWORD")
val releaseStore = releaseStoreFile?.let { file(it) }?.takeIf { it.isFile }
val releaseSigningReady = releaseStore != null &&
    !releaseStorePassword.isNullOrEmpty() &&
    !releaseKeyAlias.isNullOrEmpty() &&
    !releaseKeyPassword.isNullOrEmpty()

android {
    namespace = "io.xpact.privatedao.android"
    compileSdk = 36

    defaultConfig {
        applicationId = "io.xpact.privatedao.android"
        minSdk = 26
        targetSdk = 36
        versionCode = 3
        versionName = "1.2.0-testnet"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables.useSupportLibrary = true
    }

    signingConfigs {
        if (releaseSigningReady) {
            create("release") {
                storeFile = releaseStore
                storePassword = releaseStorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
            }
        }
    }

    buildTypes {
        debug {
            // The published testnet artifact is this variant. debuggable and the
            // debug certificate are expected here and must not leak into release.
            isDebuggable = true
        }
        release {
            isDebuggable = false
            isMinifyEnabled = false
            // Absent credentials leave the release artifact unsigned. Do not fall
            // back to the debug keystore.
            if (releaseSigningReady) {
                signingConfig = signingConfigs.getByName("release")
            }
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
            excludes += "META-INF/versions/9/OSGI-INF/MANIFEST.MF"
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2026.02.01")

    implementation(composeBom)
    androidTestImplementation(composeBom)

    implementation("androidx.core:core-ktx:1.18.0")
    implementation("androidx.activity:activity-compose:1.10.1")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.10.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.10.0")
    implementation("androidx.navigation:navigation-compose:2.9.0")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.foundation:foundation")

    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.9.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.bouncycastle:bcprov-jdk18on:1.83")

    implementation("com.solanamobile:mobile-wallet-adapter-clientlib-ktx:2.1.0")

    // Preview, tooling, and instrumentation activities stay off the release classpath.
    // ui-test-manifest is what merges PreviewActivity, ComponentActivity, and the
    // three androidx.test InstrumentationActivityInvoker activities into debug APKs.
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-tooling-preview")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
