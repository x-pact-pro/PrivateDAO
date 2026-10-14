import fs from "fs";
import path from "path";

type IdlAccount = {
  name: string;
  writable?: boolean;
  signer?: boolean;
  accounts?: IdlAccount[];
};

type IdlArg = {
  name: string;
  type: unknown;
};

type IdlInstruction = {
  name: string;
  accounts: IdlAccount[];
  args: IdlArg[];
};

type ManualInstructionMeta = {
  displayName: string;
  summary: string;
  reviewChecklist: string[];
  validationRules: string[];
};

const ROOT = path.resolve(__dirname, "..");
const IDL_PATH = path.join(ROOT, "target/idl/private_dao.json");
const OUTPUT_PATH = path.join(ROOT, "apps/web/src/lib/onchain-parity.generated.ts");
const PROGRAM_ID = "EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva";
const GOVERNANCE_MINT = "9isGuumtaqvJeJeyLF44fvfskk2cv5mYsopexMBfpump";
const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

const CORE_INSTRUCTIONS = [
  "initialize_dao",
  "create_proposal",
  "commit_vote",
  "reveal_vote",
  "finalize_proposal",
  "execute_proposal",
] as const;

const MANUAL_METADATA: Record<(typeof CORE_INSTRUCTIONS)[number], ManualInstructionMeta> = {
  initialize_dao: {
    displayName: "Create DAO",
    summary: "Initializes the DAO PDA with the governance mint, quorum, reveal window, execution delay, and voting mode.",
    reviewChecklist: [
      "Confirm the DAO name matches the expected signer-owned namespace.",
      "Confirm the governance mint is the intended token surface for this DAO.",
      "Confirm reveal window and execution delay match the operating policy.",
      "Confirm the voting mode is the intended on-chain chamber model.",
    ],
    validationRules: [
      "dao_name length must be 64 bytes or less",
      "quorum_percentage must be between 1 and 100",
      "reveal_window_seconds must be at least the protocol minimum",
      "execution_delay_seconds must be zero or positive",
      "voting_config must pass validate_voting_config",
    ],
  },
  create_proposal: {
    displayName: "Create Proposal",
    summary: "Creates a proposal PDA with proposal text, voting window, reveal window, and an optional treasury action.",
    reviewChecklist: [
      "Confirm the proposer token account belongs to the signing proposer wallet.",
      "Confirm the proposer token account mint matches dao.governance_token.",
      "Confirm the title, description, and duration are the intended values.",
      "If treasury_action is present, confirm recipient, amount, and token mint are correct.",
    ],
    validationRules: [
      "title length must be 128 bytes or less",
      "description length must be 1024 bytes or less",
      "voting_duration_seconds must meet the protocol minimum",
      "treasury_action must pass validate_treasury_action when present",
      "proposer token balance must be non-zero and satisfy governance_token_required if configured",
    ],
  },
  commit_vote: {
    displayName: "Commit Vote",
    summary: "Stores the vote commitment in the proposal-scoped voter record using the canonical commit-reveal preimage.",
    reviewChecklist: [
      "Confirm the proposal PDA matches the DAO and proposal id you intend to vote on.",
      "Confirm the commitment was derived from vote byte, salt, proposal pubkey, and voter pubkey in that order.",
      "Confirm the voter token account belongs to the signer and matches the DAO governance mint.",
      "Confirm no delegation marker already exists for the same proposal and voter.",
    ],
    validationRules: [
      "proposal.status must be Voting",
      "current time must be before proposal.voting_end",
      "voter token balance must be non-zero and satisfy governance_token_required if configured",
      "delegation marker must not already exist for this proposal and voter",
      "voter_record.has_committed must be false",
    ],
  },
  reveal_vote: {
    displayName: "Reveal Vote",
    summary: "Recomputes the canonical vote commitment and updates tallies only when the voter or authorized keeper reveals within the reveal window.",
    reviewChecklist: [
      "Confirm the operation is reveal, not commit or execute.",
      "Confirm the proposal id and voter record belong to the same proposal.",
      "Confirm the salt and vote value reproduce the stored commitment exactly.",
      "Confirm the signer is either the original voter or voter_reveal_authority.",
    ],
    validationRules: [
      "proposal.status must still be Voting",
      "current time must be at or after proposal.voting_end",
      "current time must be before proposal.reveal_end",
      "voter_record must have a prior commitment and no prior reveal",
      "recomputed commitment must match the stored commitment",
    ],
  },
  finalize_proposal: {
    displayName: "Finalize Proposal",
    summary: "Computes pass/fail after reveal_end and sets execution_unlocks_at for passed proposals.",
    reviewChecklist: [
      "Confirm reveal_end has elapsed before finalization is attempted.",
      "Confirm the proposal has not already been finalized.",
      "Confirm the finalizer is using the same DAO and proposal PDAs shown in the UI.",
    ],
    validationRules: [
      "current time must be at or after proposal.reveal_end",
      "proposal.status must still be Voting",
      "finalization uses the DAO voting configuration and chamber weights already stored on-chain",
    ],
  },
  execute_proposal: {
    displayName: "Execute Proposal",
    summary: "Executes the treasury action only after pass state, timelock expiry, and recipient validation succeed.",
    reviewChecklist: [
      "Confirm the operation type is execute and not finalize or reveal.",
      "Confirm proposal.status is Passed and execution_unlocks_at has elapsed.",
      "Confirm treasury recipient, amount, mint, and token path match the approved treasury action.",
      "Confirm this is the standard execute path and not a confidential payout execution path.",
    ],
    validationRules: [
      "proposal.status must be Passed",
      "proposal.is_executed must be false",
      "current time must be at or after proposal.execution_unlocks_at",
      "confidential_payout_plan must not exist for the standard execute path",
      "treasury_recipient must match treasury_action.recipient for SendSol and SendToken",
    ],
  },
};

function flattenAccounts(accounts: IdlAccount[], prefix = "") {
  const flattened: Array<{ name: string; writable: boolean; signer: boolean }> = [];
  for (const account of accounts) {
    if (account.accounts) {
      flattened.push(...flattenAccounts(account.accounts, `${prefix}${account.name}.`));
      continue;
    }
    flattened.push({
      name: `${prefix}${account.name}`,
      writable: Boolean(account.writable),
      signer: Boolean(account.signer),
    });
  }
  return flattened;
}

function renderType(type: unknown): string {
  return typeof type === "string" ? type : JSON.stringify(type);
}

function main() {
  const idl = JSON.parse(fs.readFileSync(IDL_PATH, "utf8")) as {
    address?: string;
    metadata?: { address?: string };
    instructions: IdlInstruction[];
  };

  const instructions = CORE_INSTRUCTIONS.map((name) => {
    const instruction = idl.instructions.find((candidate) => candidate.name === name);
    if (!instruction) {
      throw new Error(`instruction missing from IDL: ${name}`);
    }

    return [
      name,
      {
        instructionName: name,
        displayName: MANUAL_METADATA[name].displayName,
        summary: MANUAL_METADATA[name].summary,
        fieldOrder: instruction.args.map((arg) => arg.name),
        args: instruction.args.map((arg) => ({
          name: arg.name,
          type: renderType(arg.type),
        })),
        accounts: flattenAccounts(instruction.accounts),
        reviewChecklist: MANUAL_METADATA[name].reviewChecklist,
        validationRules: MANUAL_METADATA[name].validationRules,
      },
    ] as const;
  });

  const programId = idl.address ?? idl.metadata?.address ?? PROGRAM_ID;

  const file = `// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 X-PACT. AGPL-3.0-or-later.
// Generated by scripts/build-onchain-ui-parity.ts. Do not edit manually.

export const PRIVATE_DAO_PROGRAM_ID = ${JSON.stringify(programId)} as const;
export const PRIVATE_DAO_GOVERNANCE_MINT = ${JSON.stringify(GOVERNANCE_MINT)} as const;
export const PRIVATE_DAO_GOVERNANCE_TOKEN_PROGRAM = ${JSON.stringify(TOKEN_2022_PROGRAM)} as const;
export const PRIVATE_DAO_CORE_INSTRUCTION_PARITY = ${JSON.stringify(Object.fromEntries(instructions), null, 2)} as const;

export type CoreGovernanceInstructionName = keyof typeof PRIVATE_DAO_CORE_INSTRUCTION_PARITY;
`;

  fs.writeFileSync(OUTPUT_PATH, file);
  console.log(`wrote ${path.relative(ROOT, OUTPUT_PATH)}`);
}

main();
