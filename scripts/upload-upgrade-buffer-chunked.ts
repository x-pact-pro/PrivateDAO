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
const PROGRAM_PATH = process.env.PROGRAM_SO ?? "target/deploy/private_dao.so";
const CHUNK_SIZE = Number(process.env.CHUNK_SIZE ?? "850");
const BPF_LOADER_UPGRADEABLE_ID = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");
const VAULT_AUTHORITY = new PublicKey(process.env.VAULT_AUTHORITY ?? "CALHrBqx6jbzcPn2NVcinqSAHeod65v9LcDuTxsdPqBv");

function readKeypair(path: string): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(path, "utf8"))));
}

function u32(value: number): Buffer {
  const data = Buffer.alloc(4);
  data.writeUInt32LE(value, 0);
  return data;
}

function u64(value: number): Buffer {
  const data = Buffer.alloc(8);
  data.writeBigUInt64LE(BigInt(value), 0);
  return data;
}

function initializeBufferIx(buffer: PublicKey, authority: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    programId: BPF_LOADER_UPGRADEABLE_ID,
    keys: [
      { pubkey: buffer, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: false, isWritable: false },
    ],
    data: u32(0),
  });
}

function writeIx(buffer: PublicKey, authority: PublicKey, offset: number, bytes: Buffer): TransactionInstruction {
  return new TransactionInstruction({
    programId: BPF_LOADER_UPGRADEABLE_ID,
    keys: [
      { pubkey: buffer, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: true, isWritable: false },
    ],
    data: Buffer.concat([u32(1), u32(offset), u64(bytes.length), bytes]),
  });
}

function setAuthorityIx(buffer: PublicKey, currentAuthority: PublicKey, newAuthority: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    programId: BPF_LOADER_UPGRADEABLE_ID,
    keys: [
      { pubkey: buffer, isSigner: false, isWritable: true },
      { pubkey: currentAuthority, isSigner: true, isWritable: false },
      { pubkey: newAuthority, isSigner: false, isWritable: false },
    ],
    data: u32(4),
  });
}

async function sendIxs(connection: Connection, payer: Keypair, signers: Keypair[], instructions: TransactionInstruction[]) {
  const latest = await connection.getLatestBlockhash("confirmed");
  const tx = new VersionedTransaction(
    new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: latest.blockhash,
      instructions,
    }).compileToV0Message(),
  );
  tx.sign([payer, ...signers]);
  const signature = await connection.sendTransaction(tx, { skipPreflight: false, maxRetries: 5 });
  await connection.confirmTransaction(
    { signature, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight },
    "confirmed",
  );
  return signature;
}

async function main() {
  if (CHUNK_SIZE <= 0 || CHUNK_SIZE > 900) {
    throw new Error("CHUNK_SIZE must be between 1 and 900");
  }

  const keypairPath = process.env.ANCHOR_WALLET ?? `${process.env.HOME}/.config/solana/id.json`;
  const payer = readKeypair(keypairPath);
  const buffer = Keypair.generate();
  const program = fs.readFileSync(PROGRAM_PATH);
  const connection = new Connection(RPC_URL, "confirmed");
  const space = 37 + program.length;
  const lamports = await connection.getMinimumBalanceForRentExemption(space, "confirmed");

  const createSignature = await sendIxs(connection, payer, [buffer], [
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: buffer.publicKey,
      lamports,
      space,
      programId: BPF_LOADER_UPGRADEABLE_ID,
    }),
    initializeBufferIx(buffer.publicKey, payer.publicKey),
  ]);

  console.log(
    JSON.stringify(
      {
        phase: "created",
        buffer: buffer.publicKey.toBase58(),
        authority: payer.publicKey.toBase58(),
        programBytes: program.length,
        space,
        createSignature,
      },
      null,
      2,
    ),
  );

  const writeSignatures: string[] = [];
  for (let offset = 0; offset < program.length; offset += CHUNK_SIZE) {
    const chunk = program.subarray(offset, Math.min(offset + CHUNK_SIZE, program.length));
    const signature = await sendIxs(connection, payer, [], [writeIx(buffer.publicKey, payer.publicKey, offset, chunk)]);
    writeSignatures.push(signature);
    if (writeSignatures.length % 100 === 0 || offset + chunk.length >= program.length) {
      console.log(
        JSON.stringify(
          {
            phase: "writing",
            buffer: buffer.publicKey.toBase58(),
            chunksWritten: writeSignatures.length,
            bytesWritten: offset + chunk.length,
            totalBytes: program.length,
            latestSignature: signature,
          },
          null,
          2,
        ),
      );
    }
  }

  const setAuthoritySignature = await sendIxs(connection, payer, [], [
    setAuthorityIx(buffer.publicKey, payer.publicKey, VAULT_AUTHORITY),
  ]);

  console.log(
    JSON.stringify(
      {
        phase: "complete",
        buffer: buffer.publicKey.toBase58(),
        newAuthority: VAULT_AUTHORITY.toBase58(),
        programBytes: program.length,
        chunks: writeSignatures.length,
        createSignature,
        setAuthoritySignature,
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
