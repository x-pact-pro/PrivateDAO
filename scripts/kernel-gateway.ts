import * as http from "node:http";

import { createKernelGatewayServiceFromManagedSecret } from "./kernel-gateway-service.ts";

const host = process.env.PDAO_KERNEL_GATEWAY_HOST || "127.0.0.1";
const port = Number(process.env.PDAO_KERNEL_GATEWAY_PORT || 8790);

async function main(): Promise<void> {
  const service = await createKernelGatewayServiceFromManagedSecret();
  http.createServer(async (req, res) => {
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      const runtimeMode = process.env.NODE_ENV?.trim().toLowerCase();
      const explicitlyNonProduction = runtimeMode === "development" || runtimeMode === "test";
      res.setHeader(
        "Access-Control-Allow-Origin",
        process.env.PDAO_KERNEL_GATEWAY_ALLOWED_ORIGIN?.trim() || (explicitlyNonProduction ? "*" : "https://privatedao.org"),
      );
      res.setHeader("Access-Control-Allow-Headers", "content-type, x-pdao-gateway-token");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      res.end();
      return;
    }
    await service.handle(req, res);
  }).listen(port, host, () => {
    console.log(`PrivateDAO Kernel gateway listening on http://${host}:${port}`);
  });
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Kernel gateway startup failed.");
  process.exitCode = 1;
});
