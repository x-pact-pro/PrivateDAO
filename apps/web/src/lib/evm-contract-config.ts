export type EvmProductNetwork = "ethereum-sepolia" | "tempo-testnet" | "base-sepolia";

type ContractConfig = {
  governance: `0x${string}`;
  auction: `0x${string}`;
};

export const evmProductContracts: Record<EvmProductNetwork, ContractConfig> = {
  "ethereum-sepolia": {
    governance: "0x3e10231a111f1f56a192f9b75c492b3f9fa198e8",
    auction: "0xe4f0f91e34fe58f26f989d1382b664a5c61c8ed2",
  },
  "tempo-testnet": {
    governance: "0x985b0e7435749a7773dc731742e438eaa042f1a9",
    auction: "0x3f3bf70a036e115531239e5c9a010fa0da86432d",
  },
  "base-sepolia": {
    governance: "0x9887bcfe7daad364202d5d3102de180c389ecb20",
    auction: "0xcfb3e7af09f206614cf7a3cf8a93f92379c1c374",
  },
};

export const governanceWriteAbi = [
  "function createProposal(bytes32 proposalId, bytes32 actionHash, uint64 commitEnd, uint64 revealEnd, uint256 quorum)",
] as const;

export const auctionWriteAbi = [
  "function commitBid(bytes32 auctionId, bytes32 commitment)",
  "function settleAuction(bytes32 auctionId)",
] as const;

export function getEvmProductContracts(network: string): ContractConfig | undefined {
  if (!(network in evmProductContracts)) return undefined;
  return evmProductContracts[network as EvmProductNetwork];
}
