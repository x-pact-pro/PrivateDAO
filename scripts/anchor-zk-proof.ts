import * as anchor from "@coral-xyz/anchor";
import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { loadProofRegistry } from "./lib/proof-registry";

type LayerName = "vote" | "delegation" | "tally";

const DEFAULT_WALLET_PATH = process.env.ANCHOR_WALLET || "/home/x-pact/Desktop/wallet-keypair.json";
const DEFAULT_RPC_URL =
  process.env.PRIVATE_DAO_RPC_URL || process.env.ANCHOR_PROVIDER_URL || clusterApiUrl("devnet");
const DEFAULT_WS_URL =
  process.env.PRIVATE_DAO_WS_URL ||
  process.env.ANCHOR_WALLET_WS_URL ||
  DEFAULT_RPC_URL.replace(/^https:/, "wss:").replace(/^http:/, "ws:");

const LAYER_CONFIG: Record<
  LayerName,
  {
    seedByte: number;
    anchorArg: { vote?: Record<string, never>; delegation?: Record<string, never>; tally?: Record<string, never> };
    proofPath: string;
    publicPath: string;
    verificationKeyPath: string;
  }
> = {
  vote: {
    seedByte: 1,
    anchorArg: { vote: {} },
    proofPath: "zk/proofs/private_dao_vote_overlay.proof.json",
    publicPath: "zk/proofs/private_dao_vote_overlay.public.json",
    verificationKeyPath: "zk/setup/private_dao_vote_overlay_vkey.json",
  },
  delegation: {
    seedByte: 2,
    anchorArg: { delegation: {} },
    proofPath: "zk/proofs/private_dao_delegation_overlay.proof.json",
    publicPath: "zk/proofs/private_dao_delegation_overlay.public.json",
    verificationKeyPath: "zk/setup/private_dao_delegation_overlay_vkey.json",
  },
  tally: {
    seedByte: 3,
    anchorArg: { tally: {} },
    proofPath: "zk/proofs/private_dao_tally_overlay.proof.json",
    publicPath: "zk/proofs/private_dao_tally_overlay.public.json",
    verificationKeyPath: "zk/setup/private_dao_tally_overlay_vkey.json",
  },
};

function readKeypair(filePath: string): Keypair {
  const secret = JSON.parse(fs.readFileSync(filePath, "utf8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

function sha256File(relativePath: string): Buffer {
  const absolutePath = path.resolve(relativePath);
  return crypto.createHash("sha256").update(fs.readFileSync(absolutePath)).digest();
}

function sha256Buffers(buffers: Buffer[]): Buffer {
  const hasher = crypto.createHash("sha256");
  for (const buffer of buffers) {
    hasher.update(buffer);
  }
  return hasher.digest();
}

function explorerCluster(url: string) {
  return url.includes("testnet") ? "testnet" : "devnet";
}

async function anchorLayer(
  program: anchor.Program,
  recorder: Keypair,
  dao: PublicKey,
  proposal: PublicKey,
  layer: LayerName,
) {
  const config = LAYER_CONFIG[layer];
  const proofHash = sha256File(config.proofPath);
  const publicHash = sha256File(config.publicPath);
  const verificationKeyHash = sha256File(config.verificationKeyPath);
  const bundleHash = sha256Buffers([proofHash, publicHash, verificationKeyHash]);
  const [zkProofAnchor] = PublicKey.findProgramAddressSync(
    [Buffer.from("zk-proof"), proposal.toBuffer(), Buffer.from([config.seedByte])],
    program.programId,
  );

  const existing = await program.provider.connection.getAccountInfo(zkProofAnchor, "confirmed");
  if (existing) {
    return {
      layer,
      zkProofAnchor: zkProofAnchor.toBase58(),
      txSignature: null as string | null,
      explorerUrl: null as string | null,
      skipped: true,
    };
  }

  const transaction = await (program.methods as any)
    .anchorZkProof(
      config.anchorArg,
      { groth16: {} },
      [...proofHash],
      [...publicHash],
      [...verificationKeyHash],
      [...bundleHash],
    )
    .accounts({
      dao,
      proposal,
      zkProofAnchor,
      recorder: recorder.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .transaction();

  const latest = await program.provider.connection.getLatestBlockhash("confirmed");
  transaction.feePayer = recorder.publicKey;
  transaction.recentBlockhash = latest.blockhash;
  transaction.sign(recorder);

  const txSignature = await program.provider.connection.sendRawTransaction(transaction.serialize(), {
    preflightCommitment: "confirmed",
    maxRetries: 3,
  });
  await confirmByPolling(program.provider.connection, txSignature, latest.lastValidBlockHeight);

  return {
    layer,
    zkProofAnchor: zkProofAnchor.toBase58(),
    txSignature,
    explorerUrl: `https://explorer.solana.com/tx/${txSignature}?cluster=${explorerCluster(DEFAULT_RPC_URL)}`,
    skipped: false,
  };
}

async function confirmByPolling(connection: Connection, signature: string, lastValidBlockHeight: number) {
  for (;;) {
    const [status] = (
      await connection.getSignatureStatuses([signature], {
        searchTransactionHistory: true,
      })
    ).value;
    if (status?.err) {
      throw new Error(`zk proof anchor transaction failed: ${JSON.stringify(status.err)}`);
    }
    if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") {
      return;
    }

    const currentBlockHeight = await connection.getBlockHeight("confirmed");
    if (currentBlockHeight > lastValidBlockHeight) {
      throw new Error(`zk proof anchor transaction expired before confirmation: ${signature}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
}

async function main() {
  const requested = (process.argv[2] ?? "all").toLowerCase();
  const layers: LayerName[] =
    requested === "all"
      ? ["vote", "delegation", "tally"]
      : [requested as LayerName];

  for (const layer of layers) {
    if (!(layer in LAYER_CONFIG)) {
      throw new Error(`unsupported layer: ${layer}`);
    }
  }

  const recorder = readKeypair(DEFAULT_WALLET_PATH);
  const connection = new Connection(DEFAULT_RPC_URL, {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 60_000,
    wsEndpoint: DEFAULT_WS_URL,
  });
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(recorder), {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
    maxRetries: 3,
  });
  anchor.setProvider(provider);

  const idl = JSON.parse(
    fs.readFileSync(path.resolve("target/idl/private_dao.json"), "utf8"),
  ) as anchor.Idl & { address: string };
  const programId = new PublicKey(idl.address);
  const program = new anchor.Program(idl, provider) as anchor.Program;
  if (!programId.equals(program.programId)) {
    throw new Error("IDL program id does not match runtime program id");
  }

  const proof = loadProofRegistry();
  const dao = new PublicKey(process.env.PRIVATE_DAO_ZK_DAO || proof.dao);
  const proposal = new PublicKey(process.env.PRIVATE_DAO_ZK_PROPOSAL || proof.proposal);

  console.log(`RPC: ${DEFAULT_RPC_URL}`);
  console.log(`WS: ${DEFAULT_WS_URL}`);
  console.log(`Recorder: ${recorder.publicKey.toBase58()}`);
  console.log(`DAO: ${dao.toBase58()}`);
  console.log(`Proposal: ${proposal.toBase58()}`);

  for (const layer of layers) {
    const result = await anchorLayer(program, recorder, dao, proposal, layer);
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
