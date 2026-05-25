import * as fs from "fs";

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as multisig from "@sqds/multisig";

const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.testnet.solana.com";
const MULTISIG = new PublicKey(process.env.MULTISIG ?? "thHmF7VYNtxE1MaDzYXbfPCiq13RF6JwuWnjvDZuSmF");
const TRANSACTION_INDEX = BigInt(process.env.TRANSACTION_INDEX ?? "3");

function readKeypair(path: string): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(path, "utf8"))));
}

async function confirm(connection: Connection, signature: string) {
  const latest = await connection.getLatestBlockhash("confirmed");
  await connection.confirmTransaction(
    { signature, blockhash: latest.blockhash, lastValidBlockHeight: latest.lastValidBlockHeight },
    "confirmed",
  );
}

async function main() {
  const keypairPath = process.env.SQUADS_MEMBER_KEYPAIR;
  if (!keypairPath) {
    throw new Error("SQUADS_MEMBER_KEYPAIR is required");
  }

  const member = readKeypair(keypairPath);
  const feePayerPath = process.env.ANCHOR_WALLET ?? `${process.env.HOME}/.config/solana/id.json`;
  const feePayer = readKeypair(feePayerPath);
  const connection = new Connection(RPC_URL, "confirmed");

  const signature = await multisig.rpc.proposalApprove({
    connection,
    feePayer,
    member,
    multisigPda: MULTISIG,
    transactionIndex: TRANSACTION_INDEX,
    memo: "PrivateDAO current binary upgrade approval",
    sendOptions: { skipPreflight: false, maxRetries: 5 },
  });
  await confirm(connection, signature);

  const [proposalPda] = multisig.getProposalPda({ multisigPda: MULTISIG, transactionIndex: TRANSACTION_INDEX });
  const proposal = await multisig.accounts.Proposal.fromAccountAddress(connection, proposalPda);
  console.log(
    JSON.stringify(
      {
        approved: true,
        multisig: MULTISIG.toBase58(),
        transactionIndex: TRANSACTION_INDEX.toString(),
        proposalPda: proposalPda.toBase58(),
        member: member.publicKey.toBase58(),
        signature,
        status: proposal.status,
        approvals: proposal.approved.map((key) => key.toBase58()),
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
