type RpcFastEndpoint = {
  label: string;
  purpose: string;
  configured: boolean;
  host: string;
};

function endpointHost(value: string | undefined) {
  if (!value) return "Not configured";

  try {
    return new URL(value).host;
  } catch {
    return value.split("/")[0] || "Configured";
  }
}

function hasValue(value: string | undefined) {
  return Boolean(value && value.trim());
}

export function getRpcFastInfrastructureSnapshot() {
  const endpoints: RpcFastEndpoint[] = [
    {
      label: "Archived Devnet RPC",
      purpose: "Historical Ika Solana pre-alpha and proof-read route kept for comparison; current reviewer operations lead with Testnet.",
      configured:
        hasValue(process.env.RPCFAST_DEVNET_RPC_URL) ||
        hasValue(process.env.RPC_FAST_DEVNET_RPC) ||
        hasValue(process.env.IKA_PREALPHA_SOLANA_RPC),
      host: endpointHost(
        process.env.RPCFAST_DEVNET_RPC_URL ??
          process.env.RPC_FAST_DEVNET_RPC ??
          process.env.IKA_PREALPHA_SOLANA_RPC,
      ),
    },
    {
      label: "Archived Devnet WebSocket",
      purpose: "Historical Devnet confirmation channel retained for compatibility checks; current runtime UX leads with Testnet.",
      configured:
        hasValue(process.env.RPCFAST_DEVNET_WSS_URL) ||
        hasValue(process.env.RPC_FAST_DEVNET_WSS) ||
        hasValue(process.env.IKA_PREALPHA_SOLANA_WSS),
      host: endpointHost(
        process.env.RPCFAST_DEVNET_WSS_URL ??
          process.env.RPC_FAST_DEVNET_WSS ??
          process.env.IKA_PREALPHA_SOLANA_WSS,
      ),
    },
    {
      label: "Testnet RPC",
      purpose: "Primary backend release-candidate transaction, read-node, and monitoring path for current reviewer operations.",
      configured: hasValue(process.env.RPC_FAST_TESTNET_RPC),
      host: endpointHost(process.env.RPC_FAST_TESTNET_RPC),
    },
    {
      label: "Testnet WebSocket",
      purpose: "Slot and signature confirmation fallback for Testnet runtime UX.",
      configured: hasValue(process.env.RPC_FAST_TESTNET_WSS),
      host: endpointHost(process.env.RPC_FAST_TESTNET_WSS),
    },
    {
      label: "Archived Devnet Yellowstone gRPC",
      purpose: "Historical rehearsal stream for program/account observation and diagnostics comparison.",
      configured:
        hasValue(process.env.RPCFAST_DEVNET_YELLOWSTONE_GRPC_ENDPOINT) ||
        hasValue(process.env.RPC_FAST_DEVNET_YELLOWSTONE_GRPC_ENDPOINT),
      host: endpointHost(
        process.env.RPCFAST_DEVNET_YELLOWSTONE_GRPC_ENDPOINT ??
          process.env.RPC_FAST_DEVNET_YELLOWSTONE_GRPC_ENDPOINT,
      ),
    },
    {
      label: "Mainnet Aperture gRPC",
      purpose: "Read-only data-plane readiness checks before any production custody claim.",
      configured:
        hasValue(process.env.RPCFAST_MAINNET_APERTURE_GRPC_ENDPOINT) ||
        hasValue(process.env.RPC_FAST_MAINNET_APERTURE_GRPC_ENDPOINT),
      host: endpointHost(
        process.env.RPCFAST_MAINNET_APERTURE_GRPC_ENDPOINT ??
          process.env.RPC_FAST_MAINNET_APERTURE_GRPC_ENDPOINT,
      ),
    },
    {
      label: "Mainnet ShredStream gRPC",
      purpose: "Low-latency monitoring research and release-readiness telemetry.",
      configured:
        hasValue(process.env.RPCFAST_MAINNET_SHREDSTREAM_GRPC_ENDPOINT) ||
        hasValue(process.env.RPC_FAST_MAINNET_SHREDSTREAM_GRPC_ENDPOINT),
      host: endpointHost(
        process.env.RPCFAST_MAINNET_SHREDSTREAM_GRPC_ENDPOINT ??
          process.env.RPC_FAST_MAINNET_SHREDSTREAM_GRPC_ENDPOINT,
      ),
    },
    {
      label: "Mainnet Yellowstone gRPC",
      purpose: "Future production observability for account and program streams.",
      configured:
        hasValue(process.env.RPCFAST_MAINNET_YELLOWSTONE_GRPC_ENDPOINT) ||
        hasValue(process.env.RPC_FAST_MAINNET_YELLOWSTONE_GRPC_ENDPOINT),
      host: endpointHost(
        process.env.RPCFAST_MAINNET_YELLOWSTONE_GRPC_ENDPOINT ??
          process.env.RPC_FAST_MAINNET_YELLOWSTONE_GRPC_ENDPOINT,
      ),
    },
    {
      label: "Beam RPC",
      purpose: "Priority routing and provider-score research lane for future fast execution experiments.",
      configured: hasValue(process.env.RPC_FAST_BEAM_RPC),
      host: endpointHost(process.env.RPC_FAST_BEAM_RPC),
    },
    {
      label: "Beam Tips WebSocket",
      purpose: "Read-only tip stream for routing diagnostics and execution-intelligence experiments.",
      configured: hasValue(process.env.RPC_FAST_BEAM_TIPS_WSS),
      host: endpointHost(process.env.RPC_FAST_BEAM_TIPS_WSS),
    },
    {
      label: "Beam Provider Scores WebSocket",
      purpose: "Read-only provider-score stream for comparing route quality across proof services.",
      configured: hasValue(process.env.RPC_FAST_BEAM_PROVIDER_SCORES_WSS),
      host: endpointHost(process.env.RPC_FAST_BEAM_PROVIDER_SCORES_WSS),
    },
  ];

  return {
    activatedPlan: "RPCFast Hackathon/Aperture",
    validThrough: "2026-05-11",
    endpoints,
    configuredCount: endpoints.filter((endpoint) => endpoint.configured).length,
    totalCount: endpoints.length,
  };
}
