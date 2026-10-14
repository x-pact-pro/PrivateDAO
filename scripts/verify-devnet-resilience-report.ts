import fs from "fs";
import path from "path";

type ResilienceReport = {
  network: string;
  programId: string;
  governanceMint: string;
  primaryRpc: string;
  fallbackRpc: string;
  rpcMatrix: Array<{
    label: "primary" | "fallback";
    url: string;
    status: "healthy";
    blockhash: string;
  }>;
  failover: {
    recovered: boolean;
    invalidRpcError: string;
    fallbackBlockhash: string;
  };
  staleBlockhashRecovery: {
    rejectedAsExpected: boolean;
    staleError: string;
    recoveredTx: string;
    probeBalanceDeltaLamports: number;
  };
  summary: {
    primaryHealthy: boolean;
    fallbackHealthy: boolean;
    failoverRecovered: boolean;
    staleBlockhashRejected: boolean;
    staleBlockhashRecovered: boolean;
    unexpectedSuccesses: number;
  };
};

function main() {
  const jsonPath = path.resolve("docs/devnet-resilience-report.json");
  const markdownPath = path.resolve("docs/devnet-resilience-report.md");

  if (!fs.existsSync(jsonPath)) {
    throw new Error("missing devnet resilience report json");
  }
  if (!fs.existsSync(markdownPath)) {
    throw new Error("missing devnet resilience report markdown");
  }

  const report = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as ResilienceReport;
  const markdown = fs.readFileSync(markdownPath, "utf8");

  if (report.network !== "devnet") {
    throw new Error("devnet resilience report network mismatch");
  }
  if (report.programId !== "5AhUsbQ4mJ8Xh7QJEomuS85qGgmK9iNvFqzF669Y7Psx") {
    throw new Error("devnet resilience report program mismatch");
  }
  if (report.governanceMint !== "") {
    throw new Error("devnet resilience report governance mint mismatch");
  }
  if (report.rpcMatrix.length < 2 || !report.rpcMatrix.every((entry) => entry.status === "healthy" && entry.blockhash)) {
    throw new Error("devnet resilience report rpc matrix is incomplete");
  }
  if (!report.summary.primaryHealthy || !report.summary.fallbackHealthy) {
    throw new Error("devnet resilience report is missing healthy rpc evidence");
  }
  if (!report.failover.recovered || !report.summary.failoverRecovered) {
    throw new Error("devnet resilience report is missing failover recovery evidence");
  }
  if (!report.failover.invalidRpcError) {
    throw new Error("devnet resilience report is missing invalid RPC error evidence");
  }
  if (!report.staleBlockhashRecovery.rejectedAsExpected || !report.summary.staleBlockhashRejected) {
    throw new Error("devnet resilience report is missing stale blockhash rejection evidence");
  }
  if (!report.summary.staleBlockhashRecovered || !report.staleBlockhashRecovery.recoveredTx) {
    throw new Error("devnet resilience report is missing stale blockhash recovery evidence");
  }
  if (report.staleBlockhashRecovery.probeBalanceDeltaLamports !== 1) {
    throw new Error("devnet resilience report probe balance delta is unexpected");
  }
  if (report.summary.unexpectedSuccesses !== 0) {
    throw new Error("devnet resilience report contains unexpected successes");
  }
  if (!markdown.includes("# Devnet Resilience Report") || !markdown.includes("Stale Blockhash Recovery")) {
    throw new Error("devnet resilience markdown report is incomplete");
  }

  console.log("Devnet resilience report verification: PASS");
}

main();
