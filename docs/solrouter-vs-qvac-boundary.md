# SolRouter vs QVAC Boundary

## Why Both Exist

PrivateDAO separates sensitive decision support from general AI routing.

## QVAC

QVAC is the sensitive-decision path.

- Runs local-first inference for proposal and treasury briefs.
- Uses the `qvac/fabric-llm-finetune` model path in the browser-facing QVAC surface.
- Keeps high-value governance context, payroll context, and pre-sign risk interpretation on the user's device wherever possible.
- Best for: private payroll review, treasury movement review, confidential proposal summaries, compliance explanations, and high-value votes.

## SolRouter

SolRouter is the general encrypted-analysis path.

- Handles non-sensitive AI routing and encrypted output packaging.
- Produces local encrypted AI artifacts with plaintext and ciphertext hashes for reviewer inspection.
- Best for: general route explanation, low-risk summarization, product assistance, and non-confidential guidance.

## Product Rule

Use QVAC before a user signs a sensitive governance or treasury action. Use SolRouter when the product needs encrypted general analysis that does not require local-only sensitive inference.

## Reviewer Rule

These lanes are complementary, not contradictory:

- QVAC proves sovereign local inference.
- SolRouter proves encrypted AI-output handling.
- GoldRush/Dune provide on-chain financial context.
- The Proof Matrix shows which lane was used for each operation.

## Live Routes

- QVAC sovereign AI: `https://privatedao.org/services/qvac-sovereign-ai/`
- SolRouter encrypted AI: `https://privatedao.org/services/solrouter-encrypted-ai/`
- Intelligence layer: `https://privatedao.org/intelligence/`
- SolRouter evidence: `https://privatedao.org/documents/solrouter-encrypted-ai-evidence-2026-05-07/`
