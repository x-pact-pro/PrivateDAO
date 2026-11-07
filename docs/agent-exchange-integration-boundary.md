# Agent Exchange Integration Boundary

Agent Exchange is an independently deployed production service at
`https://agents.privatedao.org/`.

Its runtime, Lambda packaging, deployment workflows, marketplace catalog,
PrivatePAY x402 execution, and agent plugin are maintained in:

`https://github.com/x-pact-pro/PrivateDAO-Agent-Exchange`

This repository keeps only the institutional wallet and public integration
surfaces:

- links and discovery entry points to Agent Exchange;
- read-only service and health probes;
- wallet-side quote, authorization, and local-signing UI;
- explicit Kernel routing metadata that does not copy the Agent Exchange
  runtime.

The enterprise build and deployment workflows must not package or deploy an
Agent Exchange Lambda. Agent Exchange CI and production deployment are owned
by its dedicated repository. PrivatePAY receipts and x402 challenges remain
owned by the live Agent Exchange service and are consumed through its public
API contract.

No wallet key, payer secret, provider secret, AWS credential, or deployment
token belongs in this repository.
