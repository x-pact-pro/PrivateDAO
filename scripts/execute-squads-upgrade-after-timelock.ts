import * as fs from "fs";

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as multisig from "@sqds/multisig";

const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.testnet.solana.com";
const MULTISIG = new PublicKey(process.env.MULTISIG ?? "thHmF7VYNtxE1MaDzYXbfPCiq13RF6JwuWnjvDZuSmF");
const PROGRAM_ID = new PublicKey("EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva");
const TRANSACTION_INDEX = BigInt(process.env.PROPOSAL_INDEX ?? "1");

async function main() {
  const keypairPath = process.env.SQUADS_EXECUTOR_KEYPAIR ?? `${process.env.HOME}/.config/solana/id.json`;
  const executor = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, "utf8"))));
  const connection = new Connection(RPC_URL, "confirmed");

  const [proposalPda] = multisig.getProposalPda({
    multisigPda: MULTISIG,
    transactionIndex: TRANSACTION_INDEX,
  });
  const proposal = await multisig.accounts.Proposal.fromAccountAddress(connection, proposalPda);

  console.log(
    JSON.stringify(
      {
        rpcUrl: RPC_URL,
        multisig: MULTISIG.toBase58(),
        proposalPda: proposalPda.toBase58(),
        transactionIndex: TRANSACTION_INDEX.toString(),
        executor: executor.publicKey.toBase58(),
        status: proposal.status,
        approved: proposal.approved.map((key) => key.toBase58()),
      },
      null,
      2,
    ),
  );

  const latest = await connection.getLatestBlockhash("confirmed");
  const tx = await multisig.transactions.vaultTransactionExecute({
    connection,
    blockhash: latest.blockhash,
    feePayer: executor.publicKey,
    multisigPda: MULTISIG,
    transactionIndex: TRANSACTION_INDEX,
    member: executor.publicKey,
  });
  tx.sign([executor]);

  const simulation = await connection.simulateTransaction(tx);
  if (simulation.value.err) {
    console.error(JSON.stringify({ simulationError: simulation.value.err, logs: simulation.value.logs }, null, 2));
    process.exit(1);
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

  const account = await connection.getAccountInfo(PROGRAM_ID, "confirmed");
  console.log(
    JSON.stringify(
      {
        executed: true,
        signature,
        programId: PROGRAM_ID.toBase58(),
        programAccountExists: Boolean(account),
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
