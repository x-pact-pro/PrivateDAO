import { initializeWorkerCore, ensureRPCSetup } from "../apps/web/node_modules/@qvac/sdk/dist/server/worker-core.js";
import { registerPlugin } from "../apps/web/node_modules/@qvac/sdk/dist/server/plugins/index.js";
import { getServerLogger } from "../apps/web/node_modules/@qvac/sdk/dist/logging/index.js";
import { llmPlugin } from "../apps/web/node_modules/@qvac/sdk/dist/server/bare/plugins/index.js";

const { hasRPCConfig } = initializeWorkerCore();
const logger = getServerLogger();

logger.info("🐻 PrivateDAO QVAC Hackathon worker");
registerPlugin(llmPlugin);
logger.info("Registered QVAC LLM plugin for local governance intelligence");

if (hasRPCConfig) {
  ensureRPCSetup();
} else {
  logger.info("Running in direct mode - RPC setup will be lazy");
}
