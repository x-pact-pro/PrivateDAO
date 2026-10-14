import type { CapabilityId } from "./index.js";

export interface StellarProductWorkflow {
  workflowId: string;
  inputCommitment: string;
  policyCommitment?: string;
  outcomeCommitment?: string;
}

const COMMITMENT = /^[a-f0-9]{64}$/i;

function requireCommitment(value: unknown, name: string): string {
  if (typeof value !== "string" || !COMMITMENT.test(value)) {
    throw new Error(`${name} must be a SHA-256 commitment.`);
  }
  return value;
}

/**
 * Validates the privacy-preserving business envelope carried with a Stellar
 * execution. The envelope contains commitments only; source payroll,
 * treasury, governance, and auction data stays outside the network adapter.
 */
export function validateStellarProductWorkflow(
  capability: CapabilityId,
  value: unknown,
): StellarProductWorkflow {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`A product workflow envelope is required for ${capability}.`);
  }
  const workflow = value as Partial<StellarProductWorkflow>;
  if (typeof workflow.workflowId !== "string" || !/^[A-Za-z0-9._:-]{1,128}$/.test(workflow.workflowId)) {
    throw new Error("workflowId must be a non-sensitive identifier of at most 128 characters.");
  }
  const inputCommitment = requireCommitment(workflow.inputCommitment, "inputCommitment");
  const policyRequired = [
    "payroll.calculate",
    "payroll.approve",
    "treasury.policy.check",
    "governance.proposal.execute",
  ].includes(capability);
  const outcomeRequired = capability === "auction.settle";
  const policyCommitment = policyRequired
    ? requireCommitment(workflow.policyCommitment, "policyCommitment")
    : workflow.policyCommitment === undefined ? undefined : requireCommitment(workflow.policyCommitment, "policyCommitment");
  const outcomeCommitment = outcomeRequired
    ? requireCommitment(workflow.outcomeCommitment, "outcomeCommitment")
    : workflow.outcomeCommitment === undefined ? undefined : requireCommitment(workflow.outcomeCommitment, "outcomeCommitment");
  return { workflowId: workflow.workflowId, inputCommitment, policyCommitment, outcomeCommitment };
}
