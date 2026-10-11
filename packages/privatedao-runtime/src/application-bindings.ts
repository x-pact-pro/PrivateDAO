import type { CapabilityId, NetworkId, ProductId } from "./index.js";
import { PRODUCT_CATALOG } from "./catalog.js";

export type ApplicationBindingMode = "kernel-gateway" | "legacy-provider" | "unbound";
export type ApplicationHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApplicationCapabilityBinding {
  product: ProductId;
  capability: CapabilityId;
  network: NetworkId;
  mode: ApplicationBindingMode;
  entrypoint?: string;
  method?: ApplicationHttpMethod;
  note: string;
}

/**
 * The application boundary is intentionally explicit while product routes are
 * being migrated. A legacy provider is an observed route, not Kernel evidence;
 * an unbound capability cannot be selected for execution.
 */
export const APPLICATION_CAPABILITY_BINDINGS: readonly ApplicationCapabilityBinding[] = [
  {
    product: "blind-verification",
    capability: "verification.blind.prove",
    network: "solana-devnet",
    mode: "kernel-gateway",
    entrypoint: "kernel://verification.blind.prove",
    note: "Kernel adapter delegates to the HTTPS proof service and accepts only an observed successful public proof package.",
  },
  {
    product: "record-verification",
    capability: "verification.record.create",
    network: "solana-devnet",
    mode: "kernel-gateway",
    entrypoint: "kernel://verification.record.create",
    note: "Kernel-native digest and selective disclosure artifact; no public URL or on-chain anchor is created.",
  },
  {
    product: "record-verification",
    capability: "verification.record.verify",
    network: "solana-devnet",
    mode: "kernel-gateway",
    entrypoint: "kernel://verification.record.verify",
    note: "Kernel-native digest verification; no source payload is returned and no on-chain anchor is claimed.",
  },
  {
    product: "blind-verification",
    capability: "verification.blind.prove",
    network: "ethereum-sepolia",
    mode: "kernel-gateway",
    entrypoint: "kernel://verification.blind.prove",
    note: "Ethereum Sepolia verifier deployment and negative-proof tests are recorded in the EVM testnet evidence packet.",
  },
  {
    product: "record-verification",
    capability: "verification.record.create",
    network: "ethereum-sepolia",
    mode: "kernel-gateway",
    entrypoint: "kernel://verification.record.create",
    note: "Ethereum Sepolia record registry deployment and transaction evidence are recorded; source payload remains off-chain.",
  },
  {
    product: "record-verification",
    capability: "verification.record.verify",
    network: "ethereum-sepolia",
    mode: "kernel-gateway",
    entrypoint: "kernel://verification.record.verify",
    note: "Ethereum Sepolia record verification and wrong-network/altered-proof tests are recorded in the EVM evidence packet.",
  },
  {
    product: "blind-verification",
    capability: "verification.blind.prove",
    network: "tempo-testnet",
    mode: "kernel-gateway",
    entrypoint: "kernel://verification.blind.prove",
    note: "Tempo Testnet Groth16 verifier and blind registry passed real on-chain proof, altered-proof, wrong-chain, expiry, and revocation checks.",
  },
  {
    product: "record-verification",
    capability: "verification.record.create",
    network: "tempo-testnet",
    mode: "kernel-gateway",
    entrypoint: "kernel://verification.record.create",
    note: "Tempo Testnet record registry passed real on-chain anchoring, verification, expiry, and revocation checks.",
  },
  {
    product: "record-verification",
    capability: "verification.record.verify",
    network: "tempo-testnet",
    mode: "kernel-gateway",
    entrypoint: "kernel://verification.record.verify",
    note: "Tempo Testnet record verification is bound to chain ID 42431 and the deployed registry domain.",
  },
  {
    product: "blind-verification",
    capability: "verification.blind.prove",
    network: "base-sepolia",
    mode: "kernel-gateway",
    entrypoint: "kernel://verification.blind.prove",
    note: "Base Sepolia Groth16 verifier and blind registry passed real proof, altered-proof, wrong-chain, expiry, revocation, and receipt checks.",
  },
  {
    product: "record-verification",
    capability: "verification.record.create",
    network: "base-sepolia",
    mode: "kernel-gateway",
    entrypoint: "kernel://verification.record.create",
    note: "Base Sepolia record registry passed real on-chain anchoring, verification, expiry, and revocation checks.",
  },
  {
    product: "record-verification",
    capability: "verification.record.verify",
    network: "base-sepolia",
    mode: "kernel-gateway",
    entrypoint: "kernel://verification.record.verify",
    note: "Base Sepolia record verification is bound to chain ID 84532 and the deployed registry domain.",
  },
  {
    product: "blind-verification",
    capability: "verification.blind.prove",
    network: "arbitrum-sepolia",
    mode: "kernel-gateway",
    entrypoint: "kernel://verification.blind.prove",
    note: "Arbitrum Sepolia Groth16 verifier and blind registry passed proof verification, wrong-chain, altered-proof, expiry, and revocation checks in the committed E2E artifact.",
  },
  {
    product: "record-verification",
    capability: "verification.record.create",
    network: "arbitrum-sepolia",
    mode: "kernel-gateway",
    entrypoint: "kernel://verification.record.create",
    note: "Arbitrum Sepolia record registry passed real anchoring, verification, expiry, and revocation checks in the committed E2E artifact.",
  },
  {
    product: "record-verification",
    capability: "verification.record.verify",
    network: "arbitrum-sepolia",
    mode: "kernel-gateway",
    entrypoint: "kernel://verification.record.verify",
    note: "Arbitrum Sepolia record verification is bound to chain ID 421614 and the deployed registry domain.",
  },
  {
    product: "payroll",
    capability: "payroll.calculate",
    network: "solana-devnet",
    mode: "kernel-gateway",
    entrypoint: "kernel://payroll.calculate",
    note: "Kernel-native deterministic calculation; no wallet signature or settlement is performed.",
  },
  {
    product: "payroll",
    capability: "payroll.approve",
    network: "solana-devnet",
    mode: "kernel-gateway",
    entrypoint: "kernel://payroll.approve",
    note: "Kernel-backed Maker/Checker policy gate; wallet/network adapter must verify the supplied checker signature before production promotion.",
  },
  {
    product: "treasury",
    capability: "treasury.policy.check",
    network: "solana-devnet",
    mode: "kernel-gateway",
    entrypoint: "kernel://treasury.policy.check",
    note: "Kernel-native deterministic policy evaluation; no wallet signature or treasury movement is performed.",
  },
  {
    product: "treasury",
    capability: "treasury.policy.check",
    network: "ethereum-sepolia",
    mode: "kernel-gateway",
    entrypoint: "kernel://treasury.policy.check",
    note: "Ethereum Sepolia organizational Treasury contract passed real funding, budget, Maker/Checker approval, execution, receipt, and state reconciliation checks.",
  },
  {
    product: "treasury",
    capability: "treasury.policy.check",
    network: "tempo-testnet",
    mode: "kernel-gateway",
    entrypoint: "kernel://treasury.policy.check",
    note: "Tempo Testnet token Treasury passed real AlphaUSD funding, budget, Maker/Checker approval, execution, receipt, and state reconciliation checks.",
  },
  {
    product: "treasury",
    capability: "treasury.policy.check",
    network: "arbitrum-sepolia",
    mode: "kernel-gateway",
    entrypoint: "kernel://treasury.policy.check",
    note: "Arbitrum Sepolia organizational Treasury passed real funding, budget, Maker/Checker approval, execution, receipt, and state reconciliation checks in the committed E2E artifact.",
  },
  {
    product: "treasury",
    capability: "treasury.policy.check",
    network: "base-sepolia",
    mode: "kernel-gateway",
    entrypoint: "kernel://treasury.policy.check",
    note: "Base Sepolia organizational Treasury passed real funding, budget, Maker/Checker approval, execution, receipt, and state reconciliation checks in the committed E2E artifact.",
  },
  {
    product: "governance",
    capability: "governance.proposal.execute",
    network: "solana-devnet",
    mode: "kernel-gateway",
    entrypoint: "kernel://governance.proposal.execute",
    note: "Solana Devnet governance uses the existing PrivateDAO program transaction builder through the browser-signing Kernel boundary.",
  },
  {
    product: "governance",
    capability: "governance.proposal.execute",
    network: "ethereum-sepolia",
    mode: "kernel-gateway",
    entrypoint: "kernel://governance.proposal.execute",
    note: "Ethereum Sepolia commit/reveal governance passed real proposal creation, early-reveal rejection, vote reveal, finalization, receipt, and state checks.",
  },
  {
    product: "governance",
    capability: "governance.proposal.execute",
    network: "tempo-testnet",
    mode: "kernel-gateway",
    entrypoint: "kernel://governance.proposal.execute",
    note: "Tempo Testnet commit/reveal governance passed real proposal creation, early-reveal rejection, vote reveal, finalization, receipt, and state checks.",
  },
  {
    product: "governance",
    capability: "governance.proposal.execute",
    network: "arbitrum-sepolia",
    mode: "kernel-gateway",
    entrypoint: "kernel://governance.proposal.execute",
    note: "Arbitrum Sepolia commit/reveal governance passed real proposal creation, early-reveal rejection, vote reveal, finalization, receipt, and state checks in the committed E2E artifact.",
  },
  {
    product: "governance",
    capability: "governance.proposal.execute",
    network: "base-sepolia",
    mode: "kernel-gateway",
    entrypoint: "kernel://governance.proposal.execute",
    note: "Base Sepolia commit/reveal governance passed real proposal creation, early-reveal rejection, vote reveal, finalization, receipt, and state checks in the committed E2E artifact.",
  },
  {
    product: "auction",
    capability: "auction.bid.commit",
    network: "solana-devnet",
    mode: "kernel-gateway",
    entrypoint: "kernel://auction.bid.commit",
    note: "Kernel-local SHA-256 sealed-bid commitment proof is available on Solana Devnet; this path does not claim MagicBlock settlement or Groth16.",
  },
  {
    product: "auction",
    capability: "auction.settle",
    network: "solana-devnet",
    mode: "kernel-gateway",
    entrypoint: "kernel://auction.settle",
    note: "Kernel-local SHA-256 outcome commitment proof is available on Solana Devnet; this path does not claim MagicBlock settlement or Groth16.",
  },
  {
    product: "auction",
    capability: "auction.bid.commit",
    network: "ethereum-sepolia",
    mode: "kernel-gateway",
    entrypoint: "kernel://auction.bid.commit",
    note: "Ethereum Sepolia sealed auction passed real commit, altered-reveal rejection, reveal, finalization, settlement, receipt, and state checks.",
  },
  {
    product: "auction",
    capability: "auction.settle",
    network: "ethereum-sepolia",
    mode: "kernel-gateway",
    entrypoint: "kernel://auction.settle",
    note: "Ethereum Sepolia sealed auction settlement is backed by the committed organizational E2E evidence artifact.",
  },
  {
    product: "auction",
    capability: "auction.bid.commit",
    network: "tempo-testnet",
    mode: "kernel-gateway",
    entrypoint: "kernel://auction.bid.commit",
    note: "Tempo Testnet AlphaUSD sealed auction passed real token approval, commit, altered-reveal rejection, reveal, finalization, settlement, receipt, and state checks.",
  },
  {
    product: "auction",
    capability: "auction.settle",
    network: "tempo-testnet",
    mode: "kernel-gateway",
    entrypoint: "kernel://auction.settle",
    note: "Tempo Testnet AlphaUSD sealed auction settlement is backed by the committed organizational E2E evidence artifact.",
  },
  {
    product: "auction",
    capability: "auction.bid.commit",
    network: "arbitrum-sepolia",
    mode: "kernel-gateway",
    entrypoint: "kernel://auction.bid.commit",
    note: "Arbitrum Sepolia sealed auction passed real commit, altered-reveal rejection, reveal, finalization, settlement, receipt, and state checks in the committed E2E artifact.",
  },
  {
    product: "auction",
    capability: "auction.settle",
    network: "arbitrum-sepolia",
    mode: "kernel-gateway",
    entrypoint: "kernel://auction.settle",
    note: "Arbitrum Sepolia sealed auction settlement is backed by the committed organizational E2E evidence artifact.",
  },
  {
    product: "auction",
    capability: "auction.bid.commit",
    network: "base-sepolia",
    mode: "kernel-gateway",
    entrypoint: "kernel://auction.bid.commit",
    note: "Base Sepolia sealed auction passed real commit, altered-reveal rejection, reveal, finalization, settlement, receipt, and state checks in the committed E2E artifact.",
  },
  {
    product: "auction",
    capability: "auction.settle",
    network: "base-sepolia",
    mode: "kernel-gateway",
    entrypoint: "kernel://auction.settle",
    note: "Base Sepolia sealed auction settlement is backed by the committed organizational E2E evidence artifact.",
  },
  {
    product: "agent",
    capability: "agent.discover",
    network: "solana-devnet",
    mode: "kernel-gateway",
    entrypoint: "kernel://agent.discover",
    note: "Kernel-native read-only Agent Card fetch; no agent activity or external adoption is inferred.",
  },
  {
    product: "agent",
    capability: "agent.invoke",
    network: "solana-devnet",
    mode: "unbound",
    note: "No Kernel-backed Agent Marketplace invocation action is exposed by the web app.",
  },
  {
    product: "agent",
    capability: "agent.discover",
    network: "solana-mainnet-beta",
    mode: "unbound",
    note: "The live Agent Exchange is an external service at agents.privatedao.org; it is verified separately and is not an apps/web application route.",
  },
  {
    product: "agent",
    capability: "agent.invoke",
    network: "solana-mainnet-beta",
    mode: "unbound",
    note: "The live Agent Exchange job surface is external to apps/web; paid settlement is not verified as a Kernel application action.",
  },
];

export function listApplicationBindings(): readonly ApplicationCapabilityBinding[] {
  return APPLICATION_CAPABILITY_BINDINGS;
}

export function findApplicationBinding(
  product: ProductId,
  capability: CapabilityId,
  network: NetworkId,
): ApplicationCapabilityBinding {
  const binding = APPLICATION_CAPABILITY_BINDINGS.find(
    (entry) => entry.product === product && entry.capability === capability && entry.network === network,
  );
  if (!binding) throw new Error(`Missing application binding for ${product}/${capability}/${network}`);
  return binding;
}

export function validateApplicationBindings(
  catalog = PRODUCT_CATALOG,
  bindings = APPLICATION_CAPABILITY_BINDINGS,
): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const binding of bindings) {
    const key = `${binding.product}/${binding.capability}/${binding.network}`;
    if (seen.has(key)) errors.push(`duplicate application binding ${key}`);
    seen.add(key);
    const product = catalog.find((entry) => entry.id === binding.product);
    const capability = product?.capabilities.find((entry) => entry.id === binding.capability);
    if (!product || !capability) errors.push(`binding references unknown capability ${key}`);
    if (product && !product.networks.includes(binding.network)) errors.push(`${key}: network is not declared by product`);
    if (capability && !capability.networks.includes(binding.network)) errors.push(`${key}: network is not declared by capability`);
    if (binding.mode === "unbound" && binding.entrypoint) errors.push(`${key}: unbound binding cannot have an entrypoint`);
    if (binding.mode !== "unbound" && !binding.entrypoint) errors.push(`${key}: executable binding requires an entrypoint`);
    if (binding.mode === "unbound" && binding.method) errors.push(`${key}: unbound binding cannot have an HTTP method`);
    if (binding.mode === "kernel-gateway" && binding.entrypoint && !binding.entrypoint.startsWith("kernel://")) errors.push(`${key}: Kernel gateway entrypoint must use kernel://`);
    if (binding.mode === "legacy-provider" && binding.entrypoint && !binding.entrypoint.startsWith("/api/")) errors.push(`${key}: legacy provider entrypoint must be an application API path`);
    if (binding.mode === "kernel-gateway" && binding.method) errors.push(`${key}: Kernel gateway binding cannot declare an HTTP method`);
    if (binding.mode === "legacy-provider" && !binding.method) errors.push(`${key}: legacy provider binding requires an HTTP method`);
  }
  for (const product of catalog) {
    for (const capability of product.capabilities) {
      for (const network of capability.networks) {
        const key = `${product.id}/${capability.id}/${network}`;
        if (!seen.has(key)) errors.push(`missing application binding ${key}`);
      }
    }
  }
  return errors;
}

export function assertApplicationBindingsValid(): void {
  const errors = validateApplicationBindings();
  if (errors.length > 0) throw new Error(`Invalid PrivateDAO application bindings:\n${errors.join("\n")}`);
}

assertApplicationBindingsValid();
