# Agent Exchange commercial and MCP release — 2026-09-23

## Delivered

- Reworked the human root experience around the commercial lifecycle
  `DISCOVER -> REQUEST -> EXECUTE -> PAY -> VERIFY`.
- Added six service families: Verification, Intelligence, Risk, Transactions,
  Agent Services, and Financial Services.
- Added plain-language service metadata shared by the marketplace, API catalog,
  Agent Card, OpenAPI-facing manifests, `llms-full.txt`, and MCP.
- Added an ecosystem presentation for IBM watsonx, Intel OpenVINO, MongoDB,
  GitHub, ChatGPT, Claude, Grok, OpenClaw, and the PrivateDAO Kernel. Status
  language distinguishes program participation, provider support, tested
  interoperability, and internal runtime boundaries.
- Expanded MCP discovery from 11 to 16 tools. New semantic tools are
  `exchange_overview`, `service_recommendation`, `provider_integrations`,
  `payment_guide`, and `execution_guide`.
- Added structured service selection fields: category, customer value,
  input alternatives, payment behavior, target networks, runtime status,
  read-only boundary, and receipt/provenance expectations.
- Added a human `/integrations` page and reusable local logo assets across the
  homepage, marketplace, integrations page, and MCP connection presentation.
  Cards now lead with a balanced logo, name, category, commercial value, and
  status without exposing technical notes in the primary visual treatment.
- Added GitHub App installation-only setup binding, signed Marketplace and
  installation webhook handling, short-lived installation-token access, and
  read-only repository context.
- Added stable external MCP seller identities, hashed owner tokens, explicit
  per-tool commercial metadata, endpoint replacement/retirement, seller
  discovery, and quote-first external execution with settlement receipts.

## Logo asset provenance

All production-facing marks are bundled locally under `assets/` and served by
the Lambda; there are no runtime CDN dependencies.

| Entity | Local asset | Exact source / basis |
| --- | --- | --- |
| IBM watsonx | `assets/ecosystem/ibm-watsonx.svg` | IBM-authored watsonx logo published through Wikimedia Commons, sourced to `https://www.ibm.com/watsonx`; usage identity: `https://commons.wikimedia.org/wiki/File:IBM_watsonx_logo.svg` |
| Intel / OpenVINO | `assets/ecosystem/openvino.svg` | OpenVINO logo asset, with Intel's official usage guidance at `https://docs.openvino.ai/2023.3/openvino_docs_Legal_Information.html`; asset: `https://commons.wikimedia.org/wiki/File:OpenVINO_logo.svg` |
| MongoDB | `assets/ecosystem/mongodb.svg` | MongoDB-maintained `mongodb-js/leaf` repository asset: `https://github.com/mongodb-js/leaf/blob/master/mongodb-leaf.svg` |
| GitHub | `assets/ecosystem/github.svg` | GitHub Brand Toolkit Invertocat asset from `https://brand.github.com/GitHub_Logos.zip`, guided by `https://brand.github.com/foundations/logo` |
| PrivateDAO | `assets/brand/privatedao-official-logo.jpg` | User-supplied approved PrivateDAO logo, checked into the release package for local serving |
| PrivateDAO banner | `assets/brand/privatedao-official-banner.jpg` | User-supplied approved PrivateDAO banner, checked into the release package for local serving |
| ChatGPT | `assets/clients/openai-knot.svg` | OpenAI Cookbook source, as recorded in `docs/distribution-pack-20260921.md` |
| Claude | `assets/clients/claude-symbol.svg` | Official OpenClaw repository provider asset, as recorded in `docs/distribution-pack-20260921.md` |
| Grok | `assets/clients/grok-symbol.svg` | Official OpenClaw repository xAI provider asset, as recorded in `docs/distribution-pack-20260921.md` |
| OpenClaw | `assets/clients/openclaw-symbol.png` | Official OpenClaw repository asset, as recorded in `docs/distribution-pack-20260921.md` |

## Production deployment

The canonical Lambda package was deployed directly to
`PrivateDAOAgentExchange-Function-N2zgpQmMN41S` as published version `114`.
The deployed AWS `CodeSha256` identifier was
`JxgWFBjUIprxwEUUsfFXeowS07/dnn6id7uO4TgJAFg=`. The Lambda remained Active
after deployment. The GitHub Secret Manager reference was preserved while the
secret-backed App fields were completed without placing values in the package.

Version 114 uses an installation-only setup lifecycle by creating a short-lived
state before redirecting to the GitHub installation URL, binding the returned
installation ID through the App API, and rejecting
consumed or mismatched state records.

This was a Lambda-code/configuration deployment only; no paid transaction,
treasury movement, or unrelated product deployment was performed.

## Live verification

- `GET https://agents.privatedao.org/api/health` returned `status=ok`, version
  `1.6.0`, MCP active, marketplace active, and mainnet attestation.
- `GET https://agents.privatedao.org/` contained the commercial lifecycle,
  “Evidence for decisions”, and IBM watsonx integration presentation.
- `GET https://agents.privatedao.org/integrations` rendered the local ecosystem
  assets and all four MCP client marks; the approved PrivateDAO logo and banner
  returned 200 with `image/jpeg` content types.
- `GET https://agents.privatedao.org/mcp` rendered all four MCP client marks
  alongside the existing `MCP VERIFIED` status.
- Chromium headless production DOM capture completed for the integrations page;
  the page remained structured around balanced logo-led cards.
- `GET https://agents.privatedao.org/api/services` returned 24 services across
  all six categories with the new payment/runtime metadata.
- `GET https://agents.privatedao.org/api/integrations` returned six integration
  entries.
- MCP `tools/list` returned 20 tools, including seller discovery and seller
  lifecycle tools.
- Historical pilot refresh for Singularity returned 22 advertised tools with 20 read-only
  allowlisted tools, including
  `mint_audit`, `verify_burn`, `inspect_exit`, `inspect_payment`,
  `prove_payment`, and `mesh`; `build_transfer` and `build_burn` remained
  blocked by the side-effect policy.
- Historical registry search returned only the then-current Singularity identity
- `agent_3884f6355724a1e850d31f45`; this was a registry/pilot record, not an
  official PrivateDAO partnership or sponsored placement. The record is not
  evidence of an active commercial relationship.
- The historical `/api/services` snapshot retained 24 first-party services and reported zero
  external services until Brian supplies explicit commercial metadata.
- MCP `service_recommendation` mapped “analyze a wallet for risk” to
  `wallet.intelligence`, `research.wallet`, `anomaly.detect`, `risk.score`, and
  `contract.explain`.
- A real production free `verify.basic` job completed with
  `job_1d076080-2c18-493d-bf5b-3eabf406ad45` and receipt
  `rvr_92dd26a51daea133bd2e58d851a80cff`, returning `VERIFIED` and AWS Lambda /
  DynamoDB provenance. No payment was required.

## Validation

- `npm run lint`: passed.
- `npm test`: 33 tests passed.
- Production `npm audit`: 0 vulnerabilities.
- Lambda direct invocation of `/api/services`, root HTML, MCP `tools/list`, and
  the live free execution path: passed.
- The public domain experienced intermittent DNS resolution timeouts during
  verification; retries succeeded for the health, root, catalog, integrations,
  and MCP surfaces. This is recorded as an environment observation, not an
  application error.
