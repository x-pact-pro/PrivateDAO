import * as fs from "fs";

import {
  Connection,
  Keypair,
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
  TransactionMessage,
} from "@solana/web3.js";
import * as multisig from "@sqds/multisig";

const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.testnet.solana.com";
const MULTISIG = new PublicKey(process.env.MULTISIG ?? "thHmF7VYNtxE1MaDzYXbfPCiq13RF6JwuWnjvDZuSmF");
const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID ?? "EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva");
const BUFFER = new PublicKey(process.env.BUFFER ?? "HXcaUbT7Q8euufUbDKuhoRkSSYQPwUwmhw69TdePV6uY");
const BPF_LOADER_UPGRADEABLE_ID = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");

function readKeypair(path: string): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(path, "utf8"))));
}

function encodeUpgrade(): Buffer {
  const data = Buffer.alloc(4);
  data.writeUInt32LE(3, 0);
  return data;
}

async function confirm(connection: Connection, signature: string) {
  const latest = await connection.getLatestBlockhash("confirmed");
  await connection.confirmTransaction(
    { signature, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight },
    "confirmed",
  );
}

async function main() {
  const keypairPath = process.env.ANCHOR_WALLET ?? `${process.env.HOME}/.config/solana/id.json`;
  const member = readKeypair(keypairPath);
  const connection = new Connection(RPC_URL, "confirmed");
  const multisigAccount = await multisig.accounts.Multisig.fromAccountAddress(connection, MULTISIG);
  const transactionIndex = BigInt(process.env.TRANSACTION_INDEX ?? String(multisigAccount.transactionIndex));
  const [vaultPda] = multisig.getVaultPda({ multisigPda: MULTISIG, index: 0 });
  const [programData] = PublicKey.findProgramAddressSync([PROGRAM_ID.toBuffer()], BPF_LOADER_UPGRADEABLE_ID);

  const upgradeIx = new TransactionInstruction({
    programId: BPF_LOADER_UPGRADEABLE_ID,
    keys: [
      { pubkey: programData, isSigner: false, isWritable: true },
      { pubkey: PROGRAM_ID, isSigner: false, isWritable: true },
      { pubkey: BUFFER, isSigner: false, isWritable: true },
      { pubkey: member.publicKey, isSigner: false, isWritable: true },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: vaultPda, isSigner: true, isWritable: false },
    ],
    data: encodeUpgrade(),
  });

  const latest = await connection.getLatestBlockhash("confirmed");
  const upgradeMessage = new TransactionMessage({
    payerKey: vaultPda,
    recentBlockhash: latest.blockhash,
    instructions: [upgradeIx],
  });

  const createTxSig = await multisig.rpc.vaultTransactionCreate({
    connection,
    feePayer: member,
    multisigPda: MULTISIG,
    transactionIndex,
    creator: member.publicKey,
    vaultIndex: 0,
    ephemeralSigners: 0,
    transactionMessage: upgradeMessage,
    memo: `PrivateDAO Anchor 1.0.01 upgrade buffer ${BUFFER.toBase58()}`,
    sendOptions: { skipPreflight: false, maxRetries: 5 },
  });
  await confirm(connection, createTxSig);

  const proposalCreateSig = await multisig.rpc.proposalCreate({
    connection,
    feePayer: member,
    creator: member,
    multisigPda: MULTISIG,
    transactionIndex,
    isDraft: false,
    sendOptions: { skipPreflight: false, maxRetries: 5 },
  });
  await confirm(connection, proposalCreateSig);

  const approveSig = await multisig.rpc.proposalApprove({
    connection,
    feePayer: member,
    member,
    multisigPda: MULTISIG,
    transactionIndex,
    memo: "PrivateDAO current binary upgrade approval",
    sendOptions: { skipPreflight: false, maxRetries: 5 },
  });
  await confirm(connection, approveSig);

  const [proposalPda] = multisig.getProposalPda({ multisigPda: MULTISIG, transactionIndex });
  const proposal = await multisig.accounts.Proposal.fromAccountAddress(connection, proposalPda);

  console.log(
    JSON.stringify(
      {
        created: true,
        rpcUrl: RPC_URL.includes("quiknode") ? "quicknode-testnet-redacted" : RPC_URL,
        multisig: MULTISIG.toBase58(),
        vault: vaultPda.toBase58(),
        transactionIndex: transactionIndex.toString(),
        proposalPda: proposalPda.toBase58(),
        programId: PROGRAM_ID.toBase58(),
        programData: programData.toBase58(),
        buffer: BUFFER.toBase58(),
        creator: member.publicKey.toBase58(),
        status: proposal.status,
        approved: proposal.approved.map((key) => key.toBase58()),
        signatures: {
          vaultTransactionCreate: createTxSig,
          proposalCreate: proposalCreateSig,
          localApproval: approveSig,
        },
        timeLockSeconds: multisigAccount.timeLock,
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
