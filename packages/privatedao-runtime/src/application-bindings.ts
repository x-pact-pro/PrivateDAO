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
    note: "Solana Devnet blind verification runs through the Kernel policy provider; on-chain settlement is not implied by this workflow.",
  },
  {
    product: "record-verification",
    capability: "verification.record.create",
    network: "solana-devnet",
    mode: "kernel-gateway",
    entrypoint: "kernel://verification.record.create",
    note: "Solana Devnet record creation runs through the Kernel policy provider; the source record remains off-chain.",
  },
  {
    product: "record-verification",
    capability: "verification.record.verify",
    network: "solana-devnet",
    mode: "kernel-gateway",
    entrypoint: "kernel://verification.record.verify",
    note: "Solana Devnet record verification runs through the Kernel policy provider without returning source data.",
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
    product: "blind-verification",
    capability: "verification.blind.prove",
    network: "zcash-testnet",
    mode: "kernel-gateway",
    entrypoint: "kernel://verification.blind.prove",
    note: "Zcash Testnet blind verification runs through the Kernel policy provider; no Zcash settlement or wallet movement is implied.",
  },
  {
    product: "record-verification",
    capability: "verification.record.create",
    network: "zcash-testnet",
    mode: "kernel-gateway",
    entrypoint: "kernel://verification.record.create",
    note: "Zcash Testnet record creation is a Kernel verification artifact; the source record remains off-chain and no Zcash transaction is implied.",
  },
  {
    product: "record-verification",
    capability: "verification.record.verify",
    network: "zcash-testnet",
    mode: "kernel-gateway",
    entrypoint: "kernel://verification.record.verify",
    note: "Zcash Testnet record verification is performed by the Kernel without exposing source data or requiring a wallet transaction.",
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
  ...(["ethereum-sepolia", "arbitrum-sepolia", "tempo-testnet", "base-sepolia"] as NetworkId[]).flatMap((network) => [
    {
      product: "payroll" as ProductId,
      capability: "payroll.calculate" as CapabilityId,
      network,
      mode: "kernel-gateway" as const,
      entrypoint: "kernel://payroll.calculate",
      note: "Kernel payroll calculation is network-selectable; no private settlement or wallet movement is performed by this capability.",
    },
    {
      product: "payroll" as ProductId,
      capability: "payroll.approve" as CapabilityId,
      network,
      mode: "kernel-gateway" as const,
      entrypoint: "kernel://payroll.approve",
      note: "Kernel Maker/Checker approval is network-selectable; settlement remains a separate network-specific gate.",
    },
  ]),
  ...(["stellar-testnet"] as NetworkId[]).flatMap((network) => [
    {
      product: "blind-verification" as ProductId,
      capability: "verification.blind.prove" as CapabilityId,
      network,
      mode: "kernel-gateway" as const,
      entrypoint: "kernel://verification.blind.prove",
      note: "Stellar Testnet uses the shared Kernel workflow and Horizon adapter; proof payloads remain private and no transaction is implied until a signed XDR is supplied.",
    },
    {
      product: "record-verification" as ProductId,
      capability: "verification.record.create" as CapabilityId,
      network,
      mode: "kernel-gateway" as const,
      entrypoint: "kernel://verification.record.create",
      note: "Stellar Testnet record creation is routed through the Kernel and can be anchored with a reviewed Stellar operation; source records remain off-chain.",
    },
    {
      product: "record-verification" as ProductId,
      capability: "verification.record.verify" as CapabilityId,
      network,
      mode: "kernel-gateway" as const,
      entrypoint: "kernel://verification.record.verify",
      note: "Stellar Testnet verification is routed through the Kernel without exposing source data.",
    },
    {
      product: "payroll" as ProductId,
      capability: "payroll.calculate" as CapabilityId,
      network,
      mode: "kernel-gateway" as const,
      entrypoint: "kernel://payroll.calculate",
      note: "Payroll calculation remains a deterministic Kernel workflow; Stellar is the selectable execution context.",
    },
    {
      product: "payroll" as ProductId,
      capability: "payroll.approve" as CapabilityId,
      network,
      mode: "kernel-gateway" as const,
      entrypoint: "kernel://payroll.approve",
      note: "Payroll Maker/Checker approval remains a Kernel policy gate on Stellar Testnet.",
    },
    {
      product: "payroll" as ProductId,
      capability: "payroll.settle" as CapabilityId,
      network,
      mode: "kernel-gateway" as const,
      entrypoint: "kernel://payroll.settle",
      note: "Stellar Testnet payroll settlement is Kernel-ready for commitment-bound XDR preparation and signing; funded payout E2E remains pending.",
    },
    {
      product: "treasury" as ProductId,
      capability: "treasury.policy.check" as CapabilityId,
      network,
      mode: "kernel-gateway" as const,
      entrypoint: "kernel://treasury.policy.check",
      note: "Treasury policy evaluation is Kernel-backed; no asset movement is implied.",
    },
    {
      product: "governance" as ProductId,
      capability: "governance.proposal.execute" as CapabilityId,
      network,
      mode: "kernel-gateway" as const,
      entrypoint: "kernel://governance.proposal.execute",
      note: "Governance approval is Kernel-backed; Stellar transaction execution remains signature-gated.",
    },
    {
      product: "auction" as ProductId,
      capability: "auction.bid.commit" as CapabilityId,
      network,
      mode: "kernel-gateway" as const,
      entrypoint: "kernel://auction.bid.commit",
      note: "Sealed-bid commitments are computed in the Kernel; no bid settlement is claimed without a verified Stellar operation.",
    },
    {
      product: "auction" as ProductId,
      capability: "auction.settle" as CapabilityId,
      network,
      mode: "kernel-gateway" as const,
      entrypoint: "kernel://auction.settle",
      note: "Auction outcome proof is Kernel-backed; financial settlement remains signature-gated.",
    },
  ]),
  {
    product: "payroll",
    capability: "payroll.calculate",
    network: "zcash-testnet",
    mode: "kernel-gateway",
    entrypoint: "kernel://payroll.calculate",
    note: "Zcash Testnet payroll calculation is Kernel-only until the Zallet/Zebra compatibility gate enables the network.",
  },
  {
    product: "payroll",
    capability: "payroll.approve",
    network: "zcash-testnet",
    mode: "kernel-gateway",
    entrypoint: "kernel://payroll.approve",
    note: "Zcash Testnet Maker/Checker approval remains a Kernel policy gate before settlement.",
  },
  {
    product: "payroll",
    capability: "payroll.settle",
    network: "zcash-testnet",
    mode: "kernel-gateway",
    entrypoint: "kernel://payroll.settle",
    note: "Zcash Testnet payroll settlement is backed by the confirmed Zallet/Zebra receipt and remains Testnet-only with broadcast controlled by the secure runtime gate.",
  },
  {
    product: "payroll",
    capability: "payroll.settle",
    network: "bnb-testnet",
    mode: "kernel-gateway",
    entrypoint: "kernel://payroll.settle",
    note: "BNB Testnet payroll settlement binds an off-chain payroll commitment to a real Maker/Checker payout receipt; employee records and policy details remain off-chain.",
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
    product: "treasury",
    capability: "treasury.policy.check",
    network: "zcash-testnet",
    mode: "kernel-gateway",
    entrypoint: "kernel://treasury.policy.check",
    note: "Zcash Testnet Treasury policy checks run in the Kernel; this binding does not claim Zcash treasury settlement.",
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
    product: "governance",
    capability: "governance.proposal.execute",
    network: "zcash-testnet",
    mode: "kernel-gateway",
    entrypoint: "kernel://governance.proposal.execute",
    note: "Zcash Testnet governance is a Kernel policy approval with an auditable receipt; it does not claim Zcash on-chain governance settlement.",
  },
  ...(["bnb-testnet", "robinhood-testnet", "hyperliquid-testnet", "hypercore-testnet"] as NetworkId[]).flatMap((network) => [
    {
      product: "blind-verification" as ProductId,
      capability: "verification.blind.prove" as CapabilityId,
      network,
      mode: "kernel-gateway" as const,
      entrypoint: "kernel://verification.blind.prove",
      note: "This network uses the Kernel policy verification path; no contract write or settlement claim is made before funded E2E evidence.",
    },
    {
      product: "record-verification" as ProductId,
      capability: "verification.record.create" as CapabilityId,
      network,
      mode: "kernel-gateway" as const,
      entrypoint: "kernel://verification.record.create",
      note: "Record creation is routed through the Kernel policy provider; the source record remains off-chain until network E2E is verified.",
    },
    {
      product: "record-verification" as ProductId,
      capability: "verification.record.verify" as CapabilityId,
      network,
      mode: "kernel-gateway" as const,
      entrypoint: "kernel://verification.record.verify",
      note: "Record verification is routed through the Kernel without exposing source data or claiming a chain anchor.",
    },
    {
      product: "payroll" as ProductId,
      capability: "payroll.calculate" as CapabilityId,
      network,
      mode: "kernel-gateway" as const,
      entrypoint: "kernel://payroll.calculate",
      note: "Payroll calculation is network-selectable through the Kernel; private settlement remains separately gated.",
    },
    {
      product: "payroll" as ProductId,
      capability: "payroll.approve" as CapabilityId,
      network,
      mode: "kernel-gateway" as const,
      entrypoint: "kernel://payroll.approve",
      note: "Payroll Maker/Checker approval is network-selectable through the Kernel; settlement remains separately gated.",
    },
    {
      product: "treasury" as ProductId,
      capability: "treasury.policy.check" as CapabilityId,
      network,
      mode: "kernel-gateway" as const,
      entrypoint: "kernel://treasury.policy.check",
      note: "Treasury policy checks run through the Kernel; no asset movement or settlement is implied.",
    },
    {
      product: "governance" as ProductId,
      capability: "governance.proposal.execute" as CapabilityId,
      network,
      mode: "kernel-gateway" as const,
      entrypoint: "kernel://governance.proposal.execute",
      note: "Governance authority approval runs through the Kernel policy provider; on-chain execution awaits funded E2E evidence.",
    },
    {
      product: "auction" as ProductId,
      capability: "auction.bid.commit" as CapabilityId,
      network,
      mode: "kernel-gateway" as const,
      entrypoint: "kernel://auction.bid.commit",
      note: "Sealed-bid commitment runs through the Kernel; financial bid settlement is not claimed.",
    },
    {
      product: "auction" as ProductId,
      capability: "auction.settle" as CapabilityId,
      network,
      mode: "kernel-gateway" as const,
      entrypoint: "kernel://auction.settle",
      note: "Auction outcome proof runs through the Kernel; financial settlement is not claimed.",
    },
  ]),
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
    product: "auction",
    capability: "auction.bid.commit",
    network: "zcash-testnet",
    mode: "kernel-gateway",
    entrypoint: "kernel://auction.bid.commit",
    note: "Zcash Testnet sealed-bid commitments are computed in the Kernel; this binding does not claim on-chain Zcash auction settlement.",
  },
  {
    product: "auction",
    capability: "auction.settle",
    network: "zcash-testnet",
    mode: "kernel-gateway",
    entrypoint: "kernel://auction.settle",
    note: "Zcash Testnet auction outcome proofs are Kernel artifacts; no Zcash financial settlement is implied.",
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
