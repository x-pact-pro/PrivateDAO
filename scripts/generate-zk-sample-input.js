const { mkdirSync, writeFileSync } = require("fs");
const path = require("path");
const { Poseidon } = require("@iden3/js-crypto");

function toFieldString(value) {
  return value.toString();
}

async function main() {
  const repoRoot = path.resolve(__dirname, "..");
  const circuit = process.argv[2] || "private_dao_vote_overlay";
  const outputPath = process.argv[3] || path.join(repoRoot, "zk", "inputs", `${circuit}.sample.json`);

  const hash = (...items) => Poseidon.hash(items);

  const proposalId = 1001n;
  const daoKey = 500000000000000001n;
  const minWeight = 100n;

  let sample;

  if (circuit === "private_dao_vote_overlay") {
    const vote = 1n;
    const salt = 9876543210123456789n;
    const voterKey = 400000000000000777n;
    const weight = 250n;

    sample = {
      proposalId: toFieldString(proposalId),
      daoKey: toFieldString(daoKey),
      minWeight: toFieldString(minWeight),
      commitment: toFieldString(hash(vote, salt, voterKey, proposalId, daoKey)),
      nullifier: toFieldString(hash(voterKey, proposalId, daoKey)),
      eligibilityHash: toFieldString(hash(voterKey, weight, daoKey)),
      vote: toFieldString(vote),
      salt: toFieldString(salt),
      voterKey: toFieldString(voterKey),
      weight: toFieldString(weight),
    };
  } else if (circuit === "private_dao_delegation_overlay") {
    const delegatorKey = 400000000000000777n;
    const delegateeKey = 400000000000000888n;
    const salt = 765432109876543210n;
    const delegatedWeight = 250n;
    const active = 1n;

    sample = {
      proposalId: toFieldString(proposalId),
      daoKey: toFieldString(daoKey),
      minWeight: toFieldString(minWeight),
      delegationCommitment: toFieldString(hash(delegatorKey, delegateeKey, proposalId, daoKey, salt)),
      delegationNullifier: toFieldString(hash(delegatorKey, proposalId, daoKey)),
      delegateeBinding: toFieldString(hash(delegateeKey, proposalId, daoKey)),
      weightCommitment: toFieldString(hash(delegateeKey, delegatedWeight, daoKey)),
      delegatorKey: toFieldString(delegatorKey),
      delegateeKey: toFieldString(delegateeKey),
      salt: toFieldString(salt),
      delegatedWeight: toFieldString(delegatedWeight),
      active: toFieldString(active),
    };
  } else if (circuit === "private_dao_tally_overlay") {
    const votes = [1n, 0n];
    const salts = [11111111n, 22222222n];
    const voterKeys = [
      400000000000000111n,
      400000000000000222n,
    ];
    const weights = [150n, 90n];
    const commitments = votes.map((vote, index) => hash(vote, salts[index], voterKeys[index], proposalId, daoKey));
    const nullifiers = voterKeys.map((voterKey) => hash(voterKey, proposalId, daoKey));
    const yesWeightTotal = weights.reduce((sum, weight, index) => sum + votes[index] * weight, 0n);
    const noWeightTotal = weights.reduce((sum, weight, index) => sum + (1n - votes[index]) * weight, 0n);

    sample = {
      proposalId: toFieldString(proposalId),
      daoKey: toFieldString(daoKey),
      commitment0: toFieldString(commitments[0]),
      commitment1: toFieldString(commitments[1]),
      yesWeightTotal: toFieldString(yesWeightTotal),
      noWeightTotal: toFieldString(noWeightTotal),
      nullifierAccumulator: toFieldString(hash(nullifiers[0], nullifiers[1])),
      vote0: toFieldString(votes[0]),
      vote1: toFieldString(votes[1]),
      salt0: toFieldString(salts[0]),
      salt1: toFieldString(salts[1]),
      voterKey0: toFieldString(voterKeys[0]),
      voterKey1: toFieldString(voterKeys[1]),
      weight0: toFieldString(weights[0]),
      weight1: toFieldString(weights[1]),
    };
  } else if (circuit === "private_dao_blind_policy_overlay") {
    const policyId = 20260619n;
    const organizationKey = 700000000000000111n;
    const subjectKey = 800000000000000222n;
    const membershipVerified = 1n;
    const record0 = 8800n;
    const record1 = 9400n;
    const record2 = 9200n;
    const liabilitiesUsd = 2400n;
    const riskScore = 84n;
    const minRecordCount = 3n;
    const minAverageAmountUsd = 7500n;
    const maxLiabilityBps = 3500n;
    const minRiskScore = 72n;
    const policySalt = 135791357913579n;
    const inputSalt = 246802468024680n;
    const satisfiedClaim = 1n;

    sample = {
      policyId: toFieldString(policyId),
      policyCommitment: toFieldString(
        hash(policyId, minRecordCount, minAverageAmountUsd, maxLiabilityBps, minRiskScore, policySalt),
      ),
      inputCommitment: toFieldString(
        hash(organizationKey, subjectKey, record0, record1, record2, liabilitiesUsd, riskScore, inputSalt),
      ),
      satisfiedClaim: toFieldString(satisfiedClaim),
      organizationKey: toFieldString(organizationKey),
      subjectKey: toFieldString(subjectKey),
      membershipVerified: toFieldString(membershipVerified),
      record0: toFieldString(record0),
      record1: toFieldString(record1),
      record2: toFieldString(record2),
      liabilitiesUsd: toFieldString(liabilitiesUsd),
      riskScore: toFieldString(riskScore),
      minRecordCount: toFieldString(minRecordCount),
      minAverageAmountUsd: toFieldString(minAverageAmountUsd),
      maxLiabilityBps: toFieldString(maxLiabilityBps),
      minRiskScore: toFieldString(minRiskScore),
      policySalt: toFieldString(policySalt),
      inputSalt: toFieldString(inputSalt),
    };
  } else {
    throw new Error(`Unsupported zk circuit: ${circuit}`);
  }

  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(sample, null, 2)}\n`, "utf8");
  console.log(`[zk] wrote ${circuit} sample input to ${outputPath}`);
}

main().catch((error) => {
  console.error("[zk] failed to generate sample input");
  console.error(error);
  process.exit(1);
});
