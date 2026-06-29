import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";

const requireFromWebApp = createRequire(new URL("../apps/web/package.json", import.meta.url));
const qvac = requireFromWebApp("@qvac/sdk");
const packageEntryPath = requireFromWebApp.resolve("@qvac/sdk");
const packageJsonPath = resolve(packageEntryPath, "../../package.json");
const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));

const args = new Set(process.argv.slice(2));
const runInference = args.has("--run-inference") || process.env.QVAC_RUN_INFERENCE === "1";
const modelName = process.env.QVAC_HACKATHON_MODEL || "QWEN3_600M_INST_Q4";
const rpcTimeoutMs = Number(process.env.QVAC_RPC_TIMEOUT_MS || 180_000);
const healthCheckTimeoutMs = Number(process.env.QVAC_HEALTH_CHECK_TIMEOUT_MS || 180_000);
const modelDescriptor = qvac[modelName];
const prompt = [
  "You are PrivateDAO local decision intelligence.",
  "Summarize this governance action before a wallet signature.",
  "Proposal: Fund a contributor payout after a private review period.",
  "Privacy rule: Never reveal hidden vote intent, voter addresses, or partial vote counts.",
  "Return three concise bullets: context, risk, verification path.",
].join("\n");

async function collectLocalModelCache() {
  const modelDir = resolve(homedir(), ".qvac/models");
  try {
    const entries = await readdir(modelDir);
    const modelFiles = entries.filter((entry) => entry.endsWith(".gguf")).sort();
    const inspected = [];
    for (const fileName of modelFiles) {
      const path = resolve(modelDir, fileName);
      const fileStat = await stat(path);
      const bytes = await readFile(path);
      inspected.push({
        fileName,
        sizeBytes: fileStat.size,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      });
    }
    return {
      directory: modelDir,
      modelsDetected: inspected.length,
      models: inspected,
    };
  } catch (error) {
    return {
      directory: modelDir,
      modelsDetected: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

const exportedCapabilities = [
  "loadModel",
  "completion",
  "embed",
  "translate",
  "transcribe",
  "ocr",
  "ragIngest",
  "ragSearch",
  "startQVACProvider",
  "heartbeat",
  "getLoadedModelInfo",
  "getModelInfo",
  "unloadModel",
].filter((name) => typeof qvac[name] === "function");

const evidence = {
  schemaVersion: 1,
  project: "PrivateDAO",
  event: "QVAC Hackathon I - Unleash Edge AI",
  generatedAt: new Date().toISOString(),
  qvacSdk: {
    package: "@qvac/sdk",
    installedVersion: packageJson.version,
    latestCheckedVersion: "0.12.0",
    packageResolved: Boolean(packageEntryPath),
    exportedCapabilities,
  },
  submissionUseCase: {
    title: "PrivateDAO Local Governance Intelligence",
    summary:
      "QVAC runs a local pre-sign decision brief for DAO proposals, payouts, treasury actions, and private-room reviews before the wallet signs.",
    localFirstBoundary:
      "Sensitive governance context stays on the operator device. Hidden vote intent, encrypted vote contents, voter identities, and private room transcripts are excluded from prompts unless the user explicitly exports them.",
    productFlow: ["Connect", "Intelligence", "Private Vote", "Reveal", "Verify", "Execute"],
  },
  selectedModel: {
    name: modelName,
    descriptorAvailable: Boolean(modelDescriptor),
    modelType: "llm",
    reason:
      "General governance decision support needs a small instruction model. Medical MedPsy/MedGemma models are reserved for future health-governance vertical demos, not the core DAO submission.",
  },
  localModelCache: await collectLocalModelCache(),
  evidenceMode: runInference ? "sdk-inference-attempted" : "sdk-probe-reproducible",
  promptPolicy: {
    promptHash: createHash("sha256").update(prompt).digest("hex"),
    excludes: ["hidden vote intent", "encrypted vote contents", "private voter identities", "partial vote counts", "wallet momentum"],
    includes: ["public proposal text", "risk notes", "verification path", "privacy rule"],
  },
  inference: null,
};

if (runInference) {
  const start = Date.now();
  let modelId;
  try {
    if (!modelDescriptor) {
      throw new Error(`QVAC model descriptor ${modelName} is not exported by @qvac/sdk ${packageJson.version}`);
    }
    modelId = await qvac.loadModel({
      modelSrc: modelDescriptor,
      modelType: "llamacpp-completion",
      modelConfig: {
        ctx_size: Number(process.env.QVAC_CONTEXT_SIZE || 512),
        gpu_layers: Number(process.env.QVAC_GPU_LAYERS || 0),
        device: process.env.QVAC_DEVICE || "cpu",
      },
      onProgress: (progress) => {
        if (process.env.QVAC_PROGRESS === "1") {
          console.error(JSON.stringify(progress));
        }
      },
    }, {
      timeout: rpcTimeoutMs,
      healthCheckTimeout: healthCheckTimeoutMs,
      forceNewConnection: true,
    });
    const run = qvac.completion({
      modelId,
      stream: true,
      max_tokens: Number(process.env.QVAC_COMPLETION_MAX_TOKENS || 48),
      history: [{ role: "user", content: prompt }],
      rpcOptions: {
        timeout: rpcTimeoutMs,
        healthCheckTimeout: healthCheckTimeoutMs,
      },
    });
    let text = "";
    for await (const token of run.tokenStream) {
      text += token;
      if (text.length > 1400) break;
    }
    evidence.inference = {
      ok: true,
      modelId,
      elapsedMs: Date.now() - start,
      outputHash: createHash("sha256").update(text).digest("hex"),
      outputPreview: text.replace(/\s+/g, " ").trim().slice(0, 360),
    };
  } catch (error) {
    evidence.inference = {
      ok: false,
      elapsedMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
    process.exitCode = 2;
  } finally {
    if (modelId && typeof qvac.unloadModel === "function") {
      try {
        await qvac.unloadModel({ modelId });
      } catch {
        // The evidence already records the inference result; unload failure should not hide it.
      }
    }
  }
}

const docsPath = resolve("docs/qvac-hackathon-i-evidence.generated.json");
const publicPath = resolve("apps/web/public/qvac-hackathon-i-evidence.json");
await mkdir(dirname(docsPath), { recursive: true });
await mkdir(dirname(publicPath), { recursive: true });
await writeFile(docsPath, `${JSON.stringify(evidence, null, 2)}\n`);
await writeFile(publicPath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify(evidence, null, 2));
