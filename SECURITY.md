# Security Policy

## Reporting a vulnerability

If you discover a vulnerability, do not open a public issue.

Please report directly to [fahd@privatedao.org](mailto:fahd@privatedao.org)
and include:

- impact summary
- affected components/files
- steps to reproduce
- suggested mitigation

Do not include private keys, seed phrases, API tokens, authenticated RPC URLs,
or customer data.

We will acknowledge reports and provide a remediation timeline.

Do not publish exploit steps, key material, customer-delivery bypasses,
anti-tamper bypasses, or sensitive operational evidence before maintainers have
had a reasonable opportunity to respond.

## Scope

This policy covers on-chain program logic, treasury execution paths, and
governance workflow tooling in this repository.

It also covers review-sensitive infrastructure surfaces, including read-node
endpoints, Supabase receipt paths, QVAC runtime proof, private settlement
routing, license/access-control logic, and future encrypted customer-delivery
packages.

## Public Review Boundary

This repository remains open source where the repository license applies and
public for review and security evaluation. Public visibility is not permission
to weaponize vulnerabilities, bypass access controls, impersonate official
deployments, or reuse PrivateDAO brand/evidence material outside coordinated
review.
