import * as http from "node:http";

import { createKernelGatewayService } from "./kernel-gateway-service.ts";

const host = process.env.PDAO_KERNEL_GATEWAY_HOST || "127.0.0.1";
const port = Number(process.env.PDAO_KERNEL_GATEWAY_PORT || 8790);
const service = createKernelGatewayService();

http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", process.env.PDAO_KERNEL_GATEWAY_ALLOWED_ORIGIN || "*");
    res.setHeader("Access-Control-Allow-Headers", "content-type, x-pdao-gateway-token, x-pdao-role");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.end();
    return;
  }
  await service.handle(req, res);
}).listen(port, host, () => {
  console.log(`PrivateDAO Kernel gateway listening on http://${host}:${port}`);
});
