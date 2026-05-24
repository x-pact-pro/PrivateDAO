import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const LAMPORTS_PER_SOL = 1_000_000_000;
const WORKSPACE_ROOT = path.resolve(process.cwd(), "..");
const SOLANA_CONFIG_PATH = path.resolve(WORKSPACE_ROOT, ".config/solana/cli/config.yml");

type ReleaseCeremonyAttestation = {
  currentTestnetProgramId?: string;
  programId: string;
  anchors: {
    dao: string;
    treasury: string;
  };
};

const CURRENT_TESTNET = {
  cluster: "testnet",
  programId: "EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva",
  dao: "FEz2hCLGpDhJ3cdAm5CCWFzrKv8vDDzmmt9UjdF2fApZ",
  treasury: "46F4oV4edtepPTGqLBfFJeBKdccgfnkk9e4WK7Z1MZD3",
};

type AccountJson = {
  pubkey: string;
  account: {
    lamports: number;
    owner: string;
    executable: boolean;
  };
};

type ReadoutRecord = {
  id: string;
  label: string;
  cluster: string;
  status: "observed" | "not-found";
  address: string;
  explorerUrl: string | null;
  observedAt: string;
  command: string;
  owner: string | null;
  authority: string | null;
  programDataAddress: string | null;
  lastDeploySlot: number | null;
  balanceSol: string | null;
  executable: boolean | null;
  error: string | null;
  note: string | null;
};

function buildExplorerAddressUrl(address: string, cluster: string) {
  const suffix = cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/address/${address}${suffix}`;
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.resolve(relativePath), "utf8")) as T;
}

function runSolanaJson(args: string[]) {
  const command = ["solana", ...args].join(" ");
  const commandWithConfig = `SOLANA_CONFIG_PATH=${SOLANA_CONFIG_PATH} ${command}`;
  try {
    const stdout = execSync(commandWithConfig, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      shell: "/bin/bash",
      cwd: WORKSPACE_ROOT,
    });
    return { ok: true as const, command, stdout };
  } catch (error) {
    const stderr = error instanceof Error && "stderr" in error
      ? String((error as { stderr?: Buffer | string }).stderr ?? "").trim()
      : (error as Error).message;
    return { ok: false as const, command, error: stderr || (error as Error).message };
  }
}

function formatLamports(lamports: number | null) {
  if (lamports === null) return null;
  return (lamports / LAMPORTS_PER_SOL).toString();
}

function recordProgramReadout(params: {
  id: string;
  label: string;
  cluster: string;
  address: string;
  note: string;
}): ReadoutRecord {
  const result = runSolanaJson([
    "program",
    "show",
    params.address,
    "--url",
    params.cluster,
  ]);

  if (!result.ok) {
    return {
      id: params.id,
      label: params.label,
      cluster: params.cluster,
      status: "not-found",
      address: params.address,
      explorerUrl: buildExplorerAddressUrl(params.address, params.cluster),
      observedAt: new Date().toISOString(),
      command: result.command,
      owner: null,
      authority: null,
      programDataAddress: null,
      lastDeploySlot: null,
      balanceSol: null,
      executable: null,
      error: result.error,
      note: params.note,
    };
  }

  const payload = parseProgramShow(result.stdout);
  return {
    id: params.id,
    label: params.label,
    cluster: params.cluster,
    status: "observed",
    address: payload.programId,
    explorerUrl: buildExplorerAddressUrl(payload.programId, params.cluster),
    observedAt: new Date().toISOString(),
    command: result.command,
    owner: payload.owner,
    authority: payload.authority,
    programDataAddress: payload.programDataAddress,
    lastDeploySlot: payload.lastDeploySlot,
    balanceSol: payload.balanceSol,
    executable: true,
    error: null,
    note: params.note,
  };
}

function recordAccountReadout(params: {
  id: string;
  label: string;
  cluster: string;
  address: string;
  note: string;
}): ReadoutRecord {
  const result = runSolanaJson([
    "account",
    params.address,
    "--url",
    params.cluster,
    "--output",
    "json",
  ]);

  if (!result.ok) {
    return {
      id: params.id,
      label: params.label,
      cluster: params.cluster,
      status: "not-found",
      address: params.address,
      explorerUrl: buildExplorerAddressUrl(params.address, params.cluster),
      observedAt: new Date().toISOString(),
      command: result.command,
      owner: null,
      authority: null,
      programDataAddress: null,
      lastDeploySlot: null,
      balanceSol: null,
      executable: null,
      error: result.error,
      note: params.note,
    };
  }

  const payload = JSON.parse(result.stdout) as AccountJson;
  return {
    id: params.id,
    label: params.label,
    cluster: params.cluster,
    status: "observed",
    address: payload.pubkey,
    explorerUrl: buildExplorerAddressUrl(payload.pubkey, params.cluster),
    observedAt: new Date().toISOString(),
    command: result.command,
    owner: payload.account.owner,
    authority: null,
    programDataAddress: null,
    lastDeploySlot: null,
    balanceSol: formatLamports(payload.account.lamports),
    executable: payload.account.executable,
    error: null,
    note: params.note,
  };
}

function main() {
  const ceremony = readJson<ReleaseCeremonyAttestation>("docs/release-ceremony-attestation.generated.json");
  const currentTestnetProgramId = ceremony.currentTestnetProgramId ?? CURRENT_TESTNET.programId;

  const payload = {
    schemaVersion: 1,
    project: "PrivateDAO",
    targetNetwork: "testnet",
    targetProgramId: currentTestnetProgramId,
    observedReadouts: [
      recordProgramReadout({
        id: "testnet-program",
        label: "Current Testnet deployed program readout after Squads transfer",
        cluster: CURRENT_TESTNET.cluster,
        address: currentTestnetProgramId,
        note: "Current reviewer-facing Anchor 1.0.1 Testnet program. This is the live custody surface for judging; archived Devnet readouts are no longer the current program baseline.",
      }),
      recordAccountReadout({
        id: "testnet-dao",
        label: "Current Testnet DAO anchor readout",
        cluster: CURRENT_TESTNET.cluster,
        address: CURRENT_TESTNET.dao,
        note: "Canonical Testnet DAO PDA used for the post-timelock DAO authority handoff.",
      }),
      recordAccountReadout({
        id: "testnet-treasury",
        label: "Current Testnet treasury PDA readout",
        cluster: CURRENT_TESTNET.cluster,
        address: CURRENT_TESTNET.treasury,
        note: "Derived Testnet treasury PDA for the canonical DAO. It may remain uninitialized until the DAO receives a deposit.",
      }),
      recordProgramReadout({
        id: "mainnet-program",
        label: "Target network program readout",
        cluster: "mainnet-beta",
        address: currentTestnetProgramId,
        note: "Mainnet is not claimed for the current product. This readout exists only to prove the public packet is Testnet-scoped and does not imply production mainnet deployment.",
      }),
      recordAccountReadout({
        id: "mainnet-treasury",
        label: "Target network treasury readout",
        cluster: "mainnet-beta",
        address: CURRENT_TESTNET.treasury,
        note: "Mainnet treasury visibility is intentionally not claimed. Real-funds production readiness requires a separate mainnet cutover packet.",
      }),
    ],
  };

  fs.writeFileSync(
    path.resolve("docs/custody-observed-readouts.json"),
    `${JSON.stringify(payload, null, 2)}\n`,
  );
  console.log("Wrote docs/custody-observed-readouts.json");
}

function parseProgramShow(stdout: string) {
  const lines = stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const values = new Map<string, string>();
  for (const line of lines) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;
    values.set(line.slice(0, separatorIndex).trim(), line.slice(separatorIndex + 1).trim());
  }

  const programId = values.get("Program Id");
  const owner = values.get("Owner");
  const programDataAddress = values.get("ProgramData Address");
  const authority = values.get("Authority");
  const lastDeploySlot = values.get("Last Deployed In Slot");
  const balance = values.get("Balance");

  if (!programId || !owner || !programDataAddress || !authority || !lastDeploySlot) {
    throw new Error(`Unable to parse solana program show output:\n${stdout}`);
  }

  return {
    programId,
    owner,
    programDataAddress,
    authority,
    lastDeploySlot: Number(lastDeploySlot),
    balanceSol: balance?.split(" ")[0] ?? null,
  };
}

main();
