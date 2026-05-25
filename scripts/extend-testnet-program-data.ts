import * as fs from "fs";

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.testnet.solana.com";
const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID ?? "EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva");
const ADDITIONAL_BYTES = Number(process.env.ADDITIONAL_BYTES ?? "131072");
const BPF_LOADER_UPGRADEABLE_ID = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");

function readKeypair(path: string): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(path, "utf8"))));
}

function encodeExtendProgram(additionalBytes: number): Buffer {
  if (!Number.isInteger(additionalBytes) || additionalBytes < 10_240) {
    throw new Error("ADDITIONAL_BYTES must be an integer >= 10240");
  }

  // bincode enum encoding: u32 variant index + u32 additional_bytes.
  // UpgradeableLoaderInstruction::ExtendProgram is variant 6.
  const data = Buffer.alloc(8);
  data.writeUInt32LE(6, 0);
  data.writeUInt32LE(additionalBytes, 4);
  return data;
}

async function main() {
  const keypairPath = process.env.ANCHOR_WALLET ?? `${process.env.HOME}/.config/solana/id.json`;
  const payer = readKeypair(keypairPath);
  const connection = new Connection(RPC_URL, "confirmed");
  const [programData] = PublicKey.findProgramAddressSync([PROGRAM_ID.toBuffer()], BPF_LOADER_UPGRADEABLE_ID);

  const before = await connection.getAccountInfo(programData, "confirmed");
  if (!before) {
    throw new Error(`ProgramData account not found: ${programData.toBase58()}`);
  }

  const ix = new TransactionInstruction({
    programId: BPF_LOADER_UPGRADEABLE_ID,
    keys: [
      { pubkey: programData, isSigner: false, isWritable: true },
      { pubkey: PROGRAM_ID, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    ],
    data: encodeExtendProgram(ADDITIONAL_BYTES),
  });

  const latest = await connection.getLatestBlockhash("confirmed");
  const tx = new VersionedTransaction(
    new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: latest.blockhash,
      instructions: [ix],
    }).compileToV0Message(),
  );
  tx.sign([payer]);

  const simulation = await connection.simulateTransaction(tx);
  if (simulation.value.err) {
    console.error(JSON.stringify({ simulationError: simulation.value.err, logs: simulation.value.logs }, null, 2));
    process.exit(1);
  }

  if (process.env.DRY_RUN === "1") {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          rpcUrl: RPC_URL,
          programId: PROGRAM_ID.toBase58(),
          programData: programData.toBase58(),
          payer: payer.publicKey.toBase58(),
          additionalBytes: ADDITIONAL_BYTES,
          previousDataLength: before.data.length,
          logs: simulation.value.logs,
        },
        null,
        2,
      ),
    );
    return;
  }

  const signature = await connection.sendTransaction(tx, { skipPreflight: false, maxRetries: 5 });
  await connection.confirmTransaction(
    {
      signature,
      blockhash: latest.blockhash,
      lastValidBlockHeight: latest.lastValidBlockHeight,
    },
    "confirmed",
  );

  const after = await connection.getAccountInfo(programData, "confirmed");
  console.log(
    JSON.stringify(
      {
        extended: true,
        signature,
        rpcUrl: RPC_URL,
        programId: PROGRAM_ID.toBase58(),
        programData: programData.toBase58(),
        payer: payer.publicKey.toBase58(),
        additionalBytes: ADDITIONAL_BYTES,
        previousDataLength: before.data.length,
        currentDataLength: after?.data.length ?? null,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
