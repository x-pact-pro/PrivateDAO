import fs from "fs";
import path from "path";

type LedgerEntry = {
  id: string;
  lane: "custody" | "zk" | "refhe-fhe" | "runtime";
  status: "verified" | "code-ready" | "pending-signature" | "pending-timelock" | "pending-runtime-capture";
  title: string;
  evidence: string[];
  verification: string[];
};

function main() {
  const entries: LedgerEntry[] = [
    {
      id: "squads-testnet-upgrade-authority",
      lane: "custody",
      status: "verified",
      title: "Testnet program upgrade authority transferred to Squads 2-of-3 vault",
      evidence: [
        "docs/squads-testnet-custody-transfer-2026-05-22.md",
        "docs/custody-observed-readouts.json",
      ],
      verification: [
        "solana program show EP9xE8MJZ6FfyEwLqns6HDdUZBknEa7WGYs1Jzsecuva --url https://api.testnet.solana.com",
        "npm run verify:canonical-custody-proof",
      ],
    },
    {
      id: "dao-authority-handoff",
      lane: "custody",
      status: "pending-timelock",
      title: "Current Anchor 1.0.1 binary upgrade is Squads-approved 2-of-3 and waiting for enforced timelock release",
      evidence: [
        "docs/current-network-state-2026-05-24.md",
        "docs/squads-current-binary-upgrade-proposal-2026-05-25.md",
        "docs/cryptographic-onchain-matrix-2026-05-25.md",
        "programs/private-dao/src/dao.rs",
        "tests/private-dao.ts",
      ],
      verification: [
        "anchor build",
        "solana program dump HXcaUbT7Q8euufUbDKuhoRkSSYQPwUwmhw69TdePV6uY /tmp/privatedao-current-buffer.so --url https://api.testnet.solana.com",
        "Squads proposal index: 3",
        "Signer 4Mm approval: 4rcv9EyfZpP8UmjNx6qfSL1GwiC5Wy9Ypxyg36e49QbmJCLxbhgka1vbYxen9oH566QkGqKmCEmez7zYvogGR85J",
        "Signer 2Kp approval: 3giWXofHsD8Aau7qJbym3pfE6MMT2ZhdWCvZZq3C7M4zp8GFbC1LDqbnFro9ovKREf8ME1rNjE5VDN4xnh2s4JNi",
        "Buffer authority transfer: 4g7SaVf6yXNouGCvxqDnSsQGD7yuPgJr9fLCSWhd3BaN1uQJgZy5LQ8iZZhMozSy83X8CBKjXfsjZTgdiZVq6fqB",
        "Execution before release is gated by TimeLockNotReleased / 6021",
        "Timelock release target: 2026-05-27T02:25:39Z",
        "node --import tsx ./node_modules/mocha/bin/mocha --timeout 20000 --exit test/unit/anonymous-governance-primitive.unit.ts",
      ],
    },
    {
      id: "anonymous-governance-primitive",
      lane: "zk",
      status: "verified",
      title: "Solana anonymous governance primitive packaged with frozen roots, nullifiers, and tally modes",
      evidence: [
        "docs/solana-anonymous-governance-primitive.md",
        "sdk/src/index.ts",
        "test/unit/anonymous-governance-primitive.unit.ts",
      ],
      verification: [
        "node --import tsx ./node_modules/mocha/bin/mocha --timeout 20000 --exit test/unit/anonymous-governance-primitive.unit.ts",
        "npm run zk:verify:sample",
      ],
    },
    {
      id: "zk-standalone-verifier-testnet",
      lane: "zk",
      status: "verified",
      title: "Standalone ZK verifier program is deployed on Testnet and emits a BN254 pairing receipt",
      evidence: [
        "programs/zk-groth16-verifier/src/lib.rs",
        "docs/zk-standalone-verifier-testnet-2026-05-23.md",
        "docs/zk-standalone-verifier-testnet-2026-05-23.json",
      ],
      verification: [
        "solana program show 5H7Afyqdh5yPekkZJ5UM2j3HNB2bRvU8aVv8XoqeAW1j --url https://api.testnet.solana.com",
        "solana confirm --url https://api.testnet.solana.com 3g24JACSz3AyAmeV6qU3kaZsMowfTq3KbJMDZ7ATZ3NbAzDK1USjBkzzPEwPA7tqQTMSXxLbT7gsVrF5yvLTFrhg",
        "solana confirm --url https://api.testnet.solana.com zwqNsA3kNP1mgcaS6zNdR92LLdssFULXfsRdkMK3UxraKLM6wYDoPaWCwV3J9PqApK5xJJH8TpxsGyCRcdEah67",
        "npm run verify:zk-standalone-verifier",
      ],
    },
    {
      id: "pdao-token-2022-testnet",
      lane: "runtime",
      status: "verified",
      title: "PDAO Token-2022 governance mint is live on Solana Testnet with disabled mint authority",
      evidence: [
        "docs/pdao-token.md",
        "docs/pdao-attestation.generated.json",
        "docs/assets/pdao-token.json",
        "docs/proof-registry.json",
      ],
      verification: [
        "spl-token display --program-2022  --url https://api.testnet.solana.com --output json-compact",
        "npm run verify:pdao-surface",
        "npm run verify:pdao-attestation",
        "npm run verify:pdao-live",
      ],
    },
    {
      id: "zk-enforced-runtime",
      lane: "zk",
      status: "pending-runtime-capture",
      title: "ZK-enforced runtime captures remain machine-tracked until wallet evidence closes them",
      evidence: [
        "docs/zk/enforced-runtime.generated.json",
        "docs/zk/enforced-runtime-captures.json",
        "docs/zk/enforced-operator-flow.md",
      ],
      verification: [
        "npm run build:zk-enforced-runtime",
        "npm run verify:zk-enforced-runtime",
      ],
    },
    {
      id: "refhe-fhe-confidential-ops",
      lane: "refhe-fhe",
      status: "verified",
      title: "REFHE envelope and MagicBlock private corridor executed as Testnet settlement gates",
      evidence: [
        "docs/testnet-encrypted-integrations-activation-2026-05-23.md",
        "docs/test-wallet-live-proof-v3.generated.json",
        "docs/test-wallet-live-proof-v3.generated.md",
        "docs/cryptographic-onchain-matrix-2026-05-25.md",
        "docs/refhe-protocol.md",
        "docs/refhe-security-model.md",
      ],
      verification: [
        "npm run verify:encrypted-integrations-activation",
        "npm run verify:test-wallet-live-proof:v3",
        "REFHE configure: 3fygnmHzFpRQEbHq9q6u3djBnkTEcYz9y1TSwxDmbnuemshrMwLmy9CqpjifjRb7SmW3DbmXrkyq35cnjU7mMSPi",
        "REFHE settle: 5TmS2AcpAmifcoG97U63Unzy7wt7B2NfyhBRs8Z6C4r1eqcWthEqf3GLcZXQ33sVYHf9YwfvBNhZD8ZZdt4HRwEY",
        "MagicBlock configure: 4UiUumtuGeDciojDA26PkQby7RFiTNb12UG4ACcvGMGfQj24PUPxK5Apeno7EY8mbCvq8nR6h6nfxDcBpjPvGvPj",
        "MagicBlock settle: 22XW8XVhWwQtChNQK2aEqXv5BVBbckxUmu4NsisoZQW21KA5ii87gVNUTcNoZ9e1vYKnHmm62qP1girpzVXWN1WY",
        "Evidence-gated payout execution: 2a8sHWgiVCZkstybMff2M9R6DVU4Y96Rfsg8mqYs7K3xcYSEG1zMcq2iSTNwLD6FgfXvxxxWpwEP9Tbyin47RXvE",
      ],
    },
    {
      id: "ika-2pcmpc-readiness",
      lane: "refhe-fhe",
      status: "code-ready",
      title: "IKA / 2PC-MPC route is live-readiness verified and explicitly separated from final dWallet execution",
      evidence: [
        "docs/testnet-encrypted-integrations-activation-2026-05-23.md",
        "docs/cryptographic-onchain-matrix-2026-05-25.md",
        "docs/encrypt-ika-2pcmpc-refhe-desktop-report-2026-05-21.md",
      ],
      verification: [
        "Sui Testnet network encryption key: 0xe7c79a60931299e110297554fc02e0a0e095e96778775092c97f07a1bd1337cc",
        "Solana pre-alpha program executable: 87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY",
        "Approval route prepared: ika-approval-e58f98a89fa650dcc587a848",
        "No funded IKA dWallet DKG or final 2PC-MPC signature is claimed in this run",
      ],
    },
  ];

  const payload = {
    project: "PrivateDAO",
    generatedAt: new Date().toISOString(),
    purpose:
      "Machine-readable operation ledger for custody, ZK, and REFHE/FHE evidence surfaced on the reviewer site.",
    entries,
  };

  fs.writeFileSync(
    path.resolve("docs/operation-ledger.generated.json"),
    `${JSON.stringify(payload, null, 2)}\n`,
  );
  fs.writeFileSync(path.resolve("docs/operation-ledger.generated.md"), buildMarkdown(payload));
  console.log("Wrote operation ledger");
}

function buildMarkdown(payload: {
  project: string;
  generatedAt: string;
  purpose: string;
  entries: LedgerEntry[];
}) {
  return `# Operation Ledger

- project: \`${payload.project}\`
- generated at: \`${payload.generatedAt}\`
- purpose: ${payload.purpose}

## Entries

${payload.entries
  .map(
    (entry) => `### ${entry.title}

- id: \`${entry.id}\`
- lane: \`${entry.lane}\`
- status: \`${entry.status}\`
- evidence:
${entry.evidence.map((item) => `  - \`${item}\``).join("\n")}
- verification:
${entry.verification.map((item) => `  - \`${item}\``).join("\n")}`,
  )
  .join("\n\n")}

## Boundary

This ledger records what is verified, what is code-ready, and what still needs runtime signatures or wallet captures. It must not be used to claim proposal index 3 execution, DAO authority handoff, treasury authority handoff, ZK-enforced runtime close, funded IKA dWallet DKG, or mainnet REFHE/FHE production close until the corresponding signature or capture exists in the evidence files above.
`;
}

main();
