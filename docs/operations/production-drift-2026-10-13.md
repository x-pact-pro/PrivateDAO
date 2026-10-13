# Production Drift Record

Date: 2026-10-13

## Deployment boundary

- Production authority: AWS EC2 (`privatedao.org` and `api.privatedao.org`).
- Agent Exchange deployment: AWS Lambda through the dedicated Agent Exchange workflow.
- GitHub: source control and CI evidence only; it is not the commercial site's production host.

## Read-only live observations

| Surface | Result |
| --- | --- |
| `https://privatedao.org/products/` | HTTP 200 |
| `https://privatedao.org/contact/` | HTTP 200 |
| `https://agents.privatedao.org/` | HTTP 200 |
| Live commercial contact | Still contains legacy aliases; `fahd@privatedao.org` is not present |
| Current source branch | Uses `fahd@privatedao.org` on public contact surfaces |

The live site is therefore reachable but behind the current source branch for the contact-address correction. This is deployment drift, not evidence that the source change is live.

## Current source evidence

- Branch: `codex/pdao-holder-access`
- Latest source commit at this record: `af170ad38`
- Release verification: 19 suites passing, including the grant evidence index.
- Production dependency audit: no high or critical findings; remaining low/moderate findings are development/upstream dependency findings documented by `npm audit`.

## Required production action

Deploy the reviewed source through the existing AWS/EC2 production process, then repeat the live checks above. No DNS, WAF, blockchain service, or production host change was performed while creating this record.
