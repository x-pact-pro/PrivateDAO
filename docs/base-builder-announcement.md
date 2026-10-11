# PrivateDAO x Base Builder Codes

PrivateDAO has published its Base Builder Code integration for Base Sepolia.
The integration is designed to make eligible PrivateDAO transactions
attributable without changing the business call or contract calldata.

PrivateDAO provides evidence-backed organizational workflows for:

- Blind Verification
- Record Verification
- Treasury coordination
- Private Governance
- Confidential sealed auctions

The current Base Sepolia integration has real, inspectable receipts for these
workflows. The registered Builder Code is configured through the official
ERC-8021 data-suffix path and is limited to Base transactions.

Public evidence page: <https://privatedao.org/integrations/base>

Builder Code: `bc_dxjpt7gf`

Current publication status:

- Integration: **published and locally validated**
- Base Sepolia workflows: **testnet evidence available**
- Fresh Builder Code attribution: **pending a newly funded Base Sepolia write**
- Base Mainnet execution: **disabled**

## Evidence boundary

The existing Base Sepolia receipts were created before Builder Code wiring and
are therefore reported as **not attributed**. This is intentional. A fresh
funded Base Sepolia transaction, created after the wiring, is required before
PrivateDAO reports Builder Code attribution as verified.

This announcement does not claim a Base partnership, grant award, endorsement,
or Mainnet readiness. It is a technical integration announcement and evidence
boundary for reviewers.

## Safety boundary

- Base Mainnet execution is disabled.
- No grant, partnership, or Base endorsement is claimed by this announcement.
- The Builder Code does not change contract calldata semantics.
- Private keys and RPC credentials remain outside the repository.

Official reference: <https://docs.base.org/specifications/builder-codes/overview>

Integration evidence: <https://privatedao.org/integrations/base>
