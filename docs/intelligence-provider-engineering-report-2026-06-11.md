# PrivateDAO Intelligence Provider Engineering Report

Date: 2026-06-11  
Audience: AI engineers, data-provider teams, QVAC reviewers, Solana judges, security reviewers  
Repository snapshot reviewed: `origin/main` at `7fb1025ff064c8c83efb2c59ce07ec780964c450`  
Primary posture: intelligence before signing, with provider-router boundaries that keep hidden vote data out of external providers.

## 1. Executive Summary

PrivateDAO's intelligence layer is not positioned as a separate chatbot. It is a pre-signing decision layer that gives DAO members context before they vote or authorize treasury execution.

The current implementation has three important properties:

- PrivateDAO owns the workflow. Data vendors are modular providers, not the product boundary.
- The default path works with zero external API keys.
- Hidden vote intent, encrypted vote content, private voter identities, and private room transcripts are excluded from provider requests by type and by prompt construction.

This is the product sentence the code supports:

> PrivateDAO helps members understand treasury context, counterparty risk, and historical evidence before voting, without revealing vote intent during the voting period.

## 2. Repository Surfaces

### Provider Registry

Primary files:

- `apps/web/src/lib/intelligence/providers/types.ts`
- `apps/web/src/lib/intelligence/provider-registry.ts`
- `apps/web/src/lib/intelligence/providers/default-provider.ts`
- `apps/web/src/lib/intelligence/providers/goldrush-provider.ts`
- `apps/web/src/lib/intelligence/providers/arkham-provider.ts`
- `apps/web/src/lib/intelligence/user-provider-config.ts`

Registered provider IDs:

- `qvac-local`
- `qvac-hosted`
- `covalent-goldrush`
- `arkham`
- `birdeye`
- `helius`
- `quicknode`
- `disabled`

The registry returns QVAC/default intelligence when no provider is selected. External providers are optional and isolated.

### LLM Boundary

Primary files:

- `apps/web/src/lib/intelligence/llm/types.ts`
- `apps/web/src/lib/intelligence/llm/providers.ts`
- `apps/web/src/lib/intelligence/llm/prompt-builder.ts`

Supported LLM provider modes:

- `qvac-local`
- `qvac-hosted`
- `custom-openai-compatible`
- `custom-ollama-compatible`
- `disabled`

The local/custom provider shape lets an operator connect a local endpoint such as Ollama or a QVAC-compatible endpoint while keeping sensitive governance context away from PrivateDAO-hosted servers.

### QVAC Runtime

Primary files:

- `apps/web/src/lib/ai/qvac.ts`
- `scripts/probe-qvac-sdk.mjs`
- `scripts/run-qvac-hackathon-evidence.mjs`
- `scripts/patch-qvac-rpc-timeout.mjs`
- `docs/qvac-runtime-proof.generated.json`
- `docs/qvac-hackathon-i-readiness-report-2026-06-01.md`

The browser runtime uses a QVAC-branded local model path through `@xenova/transformers` with model `qvac/fabric-llm-finetune` and a deterministic local fallback if model load or inference exceeds timeout.

## 3. Privacy Boundary

The `IntelligenceRequest` type intentionally marks the following as `never`:

- `hiddenVoteIntent`
- `encryptedVoteContents`
- `privateVoterIdentities`
- `privateRoomTranscript`

`sanitizeIntelligenceRequest()` forwards only:

- proposal ID
- DAO ID
- public title
- public description
- treasury address when explicitly enabled
- counterparty address when explicitly enabled
- flags describing which optional context was requested

The LLM prompt builder follows the same rule: sensitive vote data is excluded by default, and private room transcript handling requires explicit approval rather than silent vendor submission.

## 4. Provider Roles

### QVAC Local

Role:

- local/private decision brief before signing
- proposal risk summary
- privacy-mode recommendation
- counterparty review prompt

Current boundary:

- browser/device-side model path with deterministic fallback
- runtime proof exposed by read-node evidence routes
- not treated as a cloud dependency for hidden vote intent

### QVAC Hosted

Role:

- registered provider boundary for future hosted inference

Current boundary:

- placeholder/unavailable unless configured
- should not receive hidden vote state

### GoldRush / Covalent

Role:

- historical wallet/treasury context
- transaction and account context normalized into a common schema

Current boundary:

- optional provider with server-side API key expectation
- failure does not break the intelligence page

### Arkham

Role:

- optional counterparty and entity context

Current boundary:

- reads `ARKHAM_ENABLED`, `ARKHAM_API_BASE_URL`, and `ARKHAM_API_KEY`
- unavailable when not configured
- not a required dependency for the main product flow

### Birdeye, Helius, QuickNode Intelligence

Role:

- registered future adapters for market, wallet, RPC, or transaction intelligence

Current boundary:

- placeholder provider objects return `unavailable`
- UI can swap providers without changing the product flow

### Zerion

Role:

- intelligence/context lane for wallet and portfolio understanding

Current boundary:

- surfaced as an ecosystem intelligence integration in product documents and matrices
- should remain provider-router-based, not hardwired into the voting flow

## 5. API And UX Surfaces

Relevant API routes include:

- `/api/intelligence/providers/status`
- `/api/intelligence/analyze-proposal`
- `/api/intelligence/treasury-context`
- `/api/intelligence/counterparty-risk`
- `/api/intelligence/llm/analyze`

Relevant product routes include:

- `/intelligence/`
- `/settings/intelligence/`
- `/try/`
- `/rooms/`
- `/proof/`

The UX keeps the public language simple:

```text
Intelligence before signing
Vote without influence
Reveal and verify after the vote
```

Provider names belong in settings, API status, documents, and reviewer reports, not above the fold.

## 6. Historical Development Notes

Relevant recent commits include:

- `3abfbccc1` - added provider-router architecture and simplified flow.
- `836433c0e` - added coordination value and provider context.
- `7fd6f4190` - published pain-first PrivateDAO Stack framing.
- `8bcc6a3fb` - refreshed supply-chain attestation.
- `7551a238b` - added MagicBlock protocol engineering report, which also strengthened provider proof documentation discipline.

This history shows a transition from named integrations as marketing cards to provider-router infrastructure inside the PrivateDAO workflow.

## 7. Security And Failure Behavior

Required behavior:

- Provider failure must not block the page.
- Provider keys must stay server-side unless the user explicitly configures a browser-only local/custom endpoint.
- Hidden vote state must not appear in intelligence request payloads.
- Provider status must expose configuration health without exposing secrets.

The code implements the correct operating pattern: safe default provider, optional configured providers, and unavailable placeholders for future provider lanes.

## 8. Upgrade Path

Recommended next upgrades:

1. Add recorded browser evidence for QVAC local inference on the judge route.
2. Add a provider-run transcript that proves hidden vote fields are absent from requests.
3. Expand the provider status endpoint with per-provider last-success timestamps.
4. Add a local QVAC endpoint test route for user-owned model endpoints.
5. Add a normalized treasury context fixture from QuickNode/Supabase/GoldRush for repeatable reviewer demos.

## 9. Engineering Conclusion

PrivateDAO's intelligence layer is correctly structured as workflow-owned intelligence, not vendor-owned governance.

The most important engineering achievement is the privacy boundary: intelligence can inform the member before signing, but the provider router is not allowed to see hidden vote intent, encrypted vote contents, voter identities, or private room transcripts by default.

