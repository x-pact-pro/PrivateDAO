# Agent Exchange GitHub OIDC production deployment

This runbook documents the production deployment workflow in
`.github/workflows/agent-exchange-deploy.yml`.

## Security model

The workflow does not use long-lived AWS access keys.

GitHub Actions requests a short-lived OIDC token and assumes one narrowly scoped
AWS IAM role. The only repository variable required for authentication is:

- `AGENT_EXCHANGE_AWS_ROLE_ARN` — the IAM role ARN to assume.

The role ARN is an identifier, not a credential. Do not add
`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, Lambda private keys, GitHub App
private keys, or other runtime secrets to the repository or workflow.

The production Lambda keeps using its existing Lambda environment and AWS
Secrets Manager references. Deploying code does not rewrite those values.

Optional repository variables:

- `AGENT_EXCHANGE_AWS_REGION` — defaults to `eu-north-1`.
- `AGENT_EXCHANGE_FUNCTION_NAME` — defaults to
  `PrivateDAOAgentExchange-Function-N2zgpQmMN41S`.
- `AGENT_EXCHANGE_PUBLIC_BASE_URL` — defaults to
  `https://agents.privatedao.org`.

The workflow uses the GitHub environment `agent-exchange-production`. Keep that
environment deployment-only. A manual approval rule can be added later if
desired; without an environment approval rule the deployment remains automatic
after the required checks pass.

## AWS IAM OIDC trust

Create the GitHub OIDC provider in the AWS account if it does not already exist:

- Provider: `https://token.actions.githubusercontent.com`
- Audience: `sts.amazonaws.com`

The deployment role should trust only this repository and production
environment. Replace `<AWS_ACCOUNT_ID>` and the role name with the real values.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<AWS_ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:x-pact-pro/PrivateDAO:environment:agent-exchange-production"
        }
      }
    }
  ]
}
```

## Least-privilege Lambda policy

Attach a policy scoped to the Agent Exchange function. Replace
`<AWS_ACCOUNT_ID>` if needed.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DeployAgentExchangeCodeOnly",
      "Effect": "Allow",
      "Action": [
        "lambda:GetFunction",
        "lambda:GetFunctionConfiguration",
        "lambda:UpdateFunctionCode",
        "lambda:PublishVersion"
      ],
      "Resource": "arn:aws:lambda:eu-north-1:<AWS_ACCOUNT_ID>:function:PrivateDAOAgentExchange-Function-N2zgpQmMN41S"
    }
  ]
}
```

The workflow also calls `sts:GetCallerIdentity`, which does not require an
identity policy permission.

Do not grant this role Lambda configuration writes, IAM administration,
Secrets Manager reads, DynamoDB writes, or broad `lambda:*` unless a future
deployment design explicitly requires them.

## Deployment gate

A production deployment is eligible only when all of the following are true:

1. the candidate is the exact `main` commit;
2. the `CI` push workflow passed for that exact SHA;
3. the `Agent Exchange` push workflow passed for that exact SHA;
4. the change touched `integrations/agent-exchange-lambda` or the production
   deployment workflow itself.

A manual `workflow_dispatch` deploys the current verified `main` revision
and still requires both push checks for that exact SHA.

Deployments are serialized with the
`agent-exchange-production` concurrency group. A newer run never cancels an
in-progress production deployment.

## Artifact integrity

The deploy job rebuilds the Lambda package from the gated commit and reruns:

- syntax checks;
- unit/integration tests;
- local smoke tests;
- Lambda packaging validation.

Immediately after `UpdateFunctionCode`, the workflow computes the local ZIP
SHA-256 using the same base64 form returned by AWS and requires it to equal
Lambda's `CodeSha256`.

A successful release is also published as an immutable Lambda version whose
description contains `github:<commit-sha>`.

## Automatic rollback gate

Before changing production, the workflow downloads the exact currently deployed
Lambda ZIP from AWS and records its:

- `RevisionId`;
- `CodeSha256`;
- `LastModified`.

The code update uses the captured `RevisionId` as an optimistic concurrency
guard. This prevents the workflow from overwriting an unexpected concurrent
deployment.

After deployment the public gate checks:

- `/api/health`;
- `/api/services`;
- `/.well-known/agent-card.json`;
- `/openapi.json`;
- at least 24 services are present;
- `verify.basic` is present.

If code verification or a public smoke check fails, the workflow restores the
exact pre-deploy ZIP, waits for Lambda to become ready, verifies the restored
`CodeSha256`, and checks production health again.

The Actions run still finishes as failed after a successful rollback so the
failed release cannot look successful.

## First-time setup

1. Create the OIDC provider and narrowly scoped IAM role above.
2. Create the repository variable `AGENT_EXCHANGE_AWS_ROLE_ARN`.
3. Optionally create the `agent-exchange-production` GitHub environment ahead
   of time and add deployment protection rules if desired.
4. Merge the deployment-workflow PR.
5. The workflow-file change itself is deployment-relevant, so after the merge
   commit's CI and Agent Exchange checks pass, the current canonical Agent
   Exchange package is deployed. This provides the initial cutover to the new
   automated path.

If the OIDC variable or AWS trust is missing, the workflow fails closed before
any Lambda mutation.
