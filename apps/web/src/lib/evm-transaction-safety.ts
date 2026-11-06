export type EvmTransactionRequest = {
  from: string;
  to: string;
  value: string;
  data?: string;
};

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;
const TRANSFER_SELECTOR = "a9059cbb";

export function isEvmAddress(value: string): boolean {
  return ADDRESS_PATTERN.test(value) && !/^0x0{40}$/i.test(value);
}

export function parseDecimalUnits(input: string, decimals: number): bigint {
  const value = input.trim();
  if (!/^\d+(?:\.\d+)?$/.test(value)) throw new Error("Enter a positive amount using digits only.");
  const [whole, fraction = ""] = value.split(".");
  if (fraction.length > decimals) throw new Error(`This asset supports at most ${decimals} decimal places.`);
  const units = BigInt(whole) * (BigInt(10) ** BigInt(decimals)) + BigInt(fraction.padEnd(decimals, "0") || "0");
  if (units <= BigInt(0)) throw new Error("The amount must be greater than zero.");
  return units;
}

function requireAddress(value: string, field: string): string {
  const address = value.trim();
  if (!isEvmAddress(address)) throw new Error(`${field} must be a valid non-zero EVM address.`);
  return address;
}

export function buildNativeTransferRequest(input: {
  from: string;
  to: string;
  amount: string;
  activeChainId: string;
  selectedChainId: number;
}): EvmTransactionRequest {
  if (input.activeChainId.toLowerCase() !== `0x${input.selectedChainId.toString(16)}`.toLowerCase()) {
    throw new Error("Switch the wallet to the selected network before signing.");
  }
  return {
    from: requireAddress(input.from, "Sender"),
    to: requireAddress(input.to, "Recipient"),
    value: `0x${parseDecimalUnits(input.amount, 18).toString(16)}`,
  };
}

export function buildUsdcTransferRequest(input: {
  from: string;
  token: string;
  to: string;
  amount: string;
  activeChainId: string;
  selectedChainId: number;
}): EvmTransactionRequest {
  if (input.activeChainId.toLowerCase() !== `0x${input.selectedChainId.toString(16)}`.toLowerCase()) {
    throw new Error("Switch the wallet to the selected network before signing.");
  }
  const recipient = requireAddress(input.to, "Recipient");
  const token = requireAddress(input.token, "Token contract");
  const encodedRecipient = recipient.slice(2).toLowerCase().padStart(64, "0");
  const encodedAmount = parseDecimalUnits(input.amount, 6).toString(16).padStart(64, "0");
  return {
    from: requireAddress(input.from, "Sender"),
    to: token,
    value: "0x0",
    data: `0x${TRANSFER_SELECTOR}${encodedRecipient}${encodedAmount}`,
  };
}
