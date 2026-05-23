// SPDX-License-Identifier: AGPL-3.0-or-later
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { parseArgs, solscanTxUrl, workspaceProgram } from "./utils";

async function main() {
  const { dao, newAuthority } = parseArgs();
  if (!dao || !newAuthority) {
    console.error("Usage: npm run transfer:dao-authority -- --dao <DAO_PDA> --new-authority <NEW_AUTHORITY>");
    process.exit(1);
  }

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = workspaceProgram();
  const daoPk = new PublicKey(String(dao));
  const newAuthorityPk = new PublicKey(String(newAuthority));
  const authority = provider.wallet.publicKey;

  const before = await program.account.dao.fetch(daoPk);
  if (!before.authority.equals(authority)) {
    throw new Error(`wallet ${authority.toBase58()} is not current DAO authority ${before.authority.toBase58()}`);
  }

  const tx = await program.methods
    .transferDaoAuthority(newAuthorityPk)
    .accounts({
      dao: daoPk,
      authority,
    })
    .rpc();

  const after = await program.account.dao.fetch(daoPk);
  if (!after.authority.equals(newAuthorityPk)) {
    throw new Error(`DAO authority readout mismatch: expected ${newAuthorityPk.toBase58()}, got ${after.authority.toBase58()}`);
  }

  console.log(JSON.stringify({
    dao: daoPk.toBase58(),
    previousAuthority: before.authority.toBase58(),
    newAuthority: after.authority.toBase58(),
    signature: tx,
    explorer: solscanTxUrl(tx),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
