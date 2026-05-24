#!/usr/bin/env node

const releaseAtIso = process.env.RELEASE_AT ?? "2026-05-25T00:31:05Z";
const releaseAt = new Date(releaseAtIso);

if (Number.isNaN(releaseAt.getTime())) {
  console.error(`Invalid RELEASE_AT value: ${releaseAtIso}`);
  process.exit(1);
}

const now = new Date();
const remainingMs = releaseAt.getTime() - now.getTime();
const vault = process.env.VAULT ?? "CALHrBqx6jbzcPn2NVcinqSAHeod65v9LcDuTxsdPqBv";
const multisig = process.env.MULTISIG ?? "thHmF7VYNtxE1MaDzYXbfPCiq13RF6JwuWnjvDZuSmF";
const proposalIndex = process.env.PROPOSAL_INDEX ?? "1";

function formatDuration(ms) {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60_000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return [
    days ? `${days}d` : null,
    hours ? `${hours}h` : null,
    `${minutes}m`,
  ]
    .filter(Boolean)
    .join(" ");
}

const payload = {
  now: now.toISOString(),
  releaseAt: releaseAt.toISOString(),
  cluster: "testnet",
  squadsVault: vault,
  squadsMultisig: multisig,
  proposalIndex,
};

if (remainingMs > 0) {
  console.log(
    JSON.stringify(
      {
        ...payload,
        status: "waiting-for-timelock-release",
        remaining: formatDuration(remainingMs),
        nextCommand: "EXECUTE_TIMELOCK=1 DAO_PDA=<DAO_PDA> scripts/execute-after-timelock.sh",
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

console.error(
  JSON.stringify(
    {
      ...payload,
      status: "execution-window-open",
      overdueBy: formatDuration(Math.abs(remainingMs)),
      requiredAction: "execute Squads upgrade, then DAO authority handoff, then treasury operator authority handoff",
      command: "EXECUTE_TIMELOCK=1 DAO_PDA=<DAO_PDA> scripts/execute-after-timelock.sh",
    },
    null,
    2,
  ),
);
process.exit(2);
