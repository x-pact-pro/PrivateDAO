# QVAC Hackathon I Readiness Report

Generated: 2026-06-01

## Submission Thesis

PrivateDAO should enter QVAC Hackathon I as **local governance intelligence for private DAO coordination**.

The product is not "AI chat for DAOs." The product use is narrower and stronger:

> A DAO operator can review a sensitive proposal, payout, payroll action, or treasury execution locally before signing, without sending hidden vote intent, voter identities, private room notes, or encrypted coordination context to a centralized model provider.

## Best Fit

PrivateDAO fits the hackathon through this path:

- QVAC runs before wallet signing.
- QVAC explains proposal context, treasury risk, counterparty posture, and verification path.
- Private voting still hides influence signals during the active voting window.
- After reveal, PrivateDAO publishes the proof and audit route.
- The local model never needs a cloud LLM endpoint for the decision brief.

## Current Repo State

- `@qvac/sdk` is installed in `apps/web` and currently resolves as version `0.10.0`.
- The current public QVAC route is `/services/qvac-sovereign-ai/`.
- The current runtime proof endpoint is `https://api.privatedao.org/api/v1/qvac/runtime-proof`.
- The repo has a QVAC SDK probe at `scripts/probe-qvac-sdk.mjs`.
- The new hackathon evidence runner is `scripts/run-qvac-hackathon-evidence.mjs`.

## New Evidence Commands

Fast SDK evidence without model download:

```bash
npm run qvac:hackathon:evidence
```

Full local inference attempt:

```bash
npm run qvac:hackathon:inference
```

Optional model override:

```bash
QVAC_HACKATHON_MODEL=LLAMA_3_2_1B_INST_Q4_0 npm run qvac:hackathon:inference
```

The generated evidence is written to:

- `docs/qvac-hackathon-i-evidence.generated.json`
- `apps/web/public/qvac-hackathon-i-evidence.json`

## Model Choice

For the core PrivateDAO submission, use a small general instruction model exported by the QVAC SDK, such as:

- `QWEN3_600M_INST_Q4`
- `BITNET_0_7B_INST_TQ2_0`
- `LLAMA_3_2_1B_INST_Q4_0`

The MedPsy/MedGemma family is useful for a future healthcare-governance vertical, but it is not the right default for a DAO coordination product. Using a medical model as the core demo would make the submission look less focused.

## Submission Boundary

The hackathon claim should be:

> PrivateDAO uses QVAC for local-first decision intelligence before signing sensitive governance and treasury actions.

The claim should not be:

> QVAC is the privacy primitive for voting.

Voting privacy remains PrivateDAO's commit/reveal, room policy, and proof workflow. QVAC is the local intelligence layer that helps humans decide before they sign.

## Open-Source Fit

The main PrivateDAO repository carries AGPL-3.0-or-later plus additional brand/review notices. The QVAC hackathon asks for fully open-source MIT or Apache 2.0 submissions.

Best submission path:

1. Keep the core PrivateDAO repo public as the full product evidence.
2. Add or extract a focused QVAC hackathon package under Apache-2.0 or MIT if the organizers require a clean permissive license boundary.
3. Include reproducibility commands and the generated evidence bundle in the submission.

## Judge Story

The judge should see this sequence:

1. Open `/services/qvac-sovereign-ai/`.
2. Watch the QVAC brander video.
3. Run local QVAC evidence with `npm run qvac:hackathon:evidence`.
4. Run full inference on available hardware with `npm run qvac:hackathon:inference`.
5. Open `qvac-hackathon-i-evidence.json`.
6. Continue to `/try/` for the governance flow: Connect -> Intelligence -> Private Vote -> Reveal -> Verify -> Execute.

## Evidence Files

- Public QVAC page: `https://privatedao.org/services/qvac-sovereign-ai/`
- Public evidence JSON: `https://privatedao.org/qvac-hackathon-i-evidence.json`
- SDK runtime proof: `https://api.privatedao.org/api/v1/qvac/runtime-proof`
- Demo path: `https://privatedao.org/try/`
- Judge path: `https://privatedao.org/judge/`
- Proof path: `https://privatedao.org/proof/?judge=1`
