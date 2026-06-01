import { createHash } from "crypto";

export type ConfidentialVestingMode = "public-payout" | "private-payout" | "confidential-vesting";

export type ConfidentialVestingRequest = {
  daoId: string;
  proposalId: string;
  recipientAddress: string;
  asset: "USDC" | "USDT" | "SOL" | "PUSD" | "AUDD";
  amount: string;
  cliffDate?: string;
  vestingMonths?: number;
  mode: ConfidentialVestingMode;
};

export type ConfidentialVestingReceipt = {
  mode: ConfidentialVestingMode;
  network: string;
  receiptHash: string;
  daoId: string;
  proposalId: string;
  asset: ConfidentialVestingRequest["asset"];
  amount: string;
  labels: string[];
  publicOutcome: string;
  proofUrl: string;
  sandbox: boolean;
};

export type ConfidentialVestingProvider = {
  id: "sandbox-vesting" | "streamflow-compatible";
  getStatus(): { enabled: boolean; configured: boolean; sandbox: boolean };
  prepare(request: ConfidentialVestingRequest): Promise<ConfidentialVestingReceipt>;
};

function hashVestingRequest(request: ConfidentialVestingRequest, network: string) {
  return createHash("sha256")
    .update(JSON.stringify({
      daoId: request.daoId,
      proposalId: request.proposalId,
      recipientHash: createHash("sha256").update(request.recipientAddress).digest("hex"),
      asset: request.asset,
      amount: request.amount,
      mode: request.mode,
      cliffDate: request.cliffDate,
      vestingMonths: request.vestingMonths,
      network,
    }))
    .digest("hex");
}

export const sandboxConfidentialVestingProvider: ConfidentialVestingProvider = {
  id: "sandbox-vesting",

  getStatus() {
    return { enabled: true, configured: true, sandbox: true };
  },

  async prepare(request) {
    const network = process.env.STREAMFLOW_NETWORK?.trim() || "testnet";
    const receiptHash = hashVestingRequest(request, network);
    return {
      mode: request.mode,
      network,
      receiptHash,
      daoId: request.daoId,
      proposalId: request.proposalId,
      asset: request.asset,
      amount: request.amount,
      labels: [
        request.mode === "public-payout" ? "Recipient visible in execution review" : "Recipient hidden during coordination",
        "Execution proof public after completion",
        "Sandbox testnet mode",
      ],
      publicOutcome: request.mode === "confidential-vesting" ? "Confidential vesting prepared for proof export" : "Private payout prepared for proof export",
      proofUrl: `/proof/?vesting=${receiptHash}`,
      sandbox: true,
    };
  },
};

export const streamflowCompatibleVestingProvider: ConfidentialVestingProvider = {
  id: "streamflow-compatible",

  getStatus() {
    const enabled = process.env.STREAMFLOW_PROVIDER_ENABLED === "true";
    const configured = Boolean(enabled && process.env.STREAMFLOW_API_BASE_URL?.trim() && process.env.STREAMFLOW_API_KEY?.trim());
    return { enabled, configured, sandbox: !configured };
  },

  async prepare(request) {
    const status = this.getStatus();
    if (!status.configured) return sandboxConfidentialVestingProvider.prepare(request);
    const baseUrl = process.env.STREAMFLOW_API_BASE_URL?.trim();
    const apiKey = process.env.STREAMFLOW_API_KEY?.trim();
    if (!baseUrl || !apiKey) return sandboxConfidentialVestingProvider.prepare(request);

    try {
      const response = await fetch(new URL("/v1/confidential-vesting/prepare", baseUrl), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          daoId: request.daoId,
          proposalId: request.proposalId,
          asset: request.asset,
          amount: request.amount,
          mode: request.mode,
          cliffDate: request.cliffDate,
          vestingMonths: request.vestingMonths,
        }),
        cache: "no-store",
      });
      if (!response.ok) return sandboxConfidentialVestingProvider.prepare(request);
      const raw = (await response.json()) as Partial<ConfidentialVestingReceipt>;
      return {
        mode: request.mode,
        network: typeof raw.network === "string" ? raw.network : "testnet",
        receiptHash: typeof raw.receiptHash === "string" ? raw.receiptHash : hashVestingRequest(request, "testnet"),
        daoId: request.daoId,
        proposalId: request.proposalId,
        asset: request.asset,
        amount: request.amount,
        labels: ["Recipient hidden during coordination", "Execution proof public after completion"],
        publicOutcome: typeof raw.publicOutcome === "string" ? raw.publicOutcome : "Confidential vesting prepared for proof export",
        proofUrl: typeof raw.proofUrl === "string" ? raw.proofUrl : "/proof/",
        sandbox: false,
      };
    } catch {
      return sandboxConfidentialVestingProvider.prepare(request);
    }
  },
};

export function getConfidentialVestingProvider() {
  return streamflowCompatibleVestingProvider.getStatus().configured ? streamflowCompatibleVestingProvider : sandboxConfidentialVestingProvider;
}
