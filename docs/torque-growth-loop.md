# Torque Growth Loop

PrivateDAO uses Torque as a growth and retention layer attached to real product activity.

The integration thesis is simple:

- do not reward empty visits
- reward product actions that create measurable usage
- keep incentives tied to governance, billing, and learning progress

## Core events

### `dao_created`

Triggered when a new operator completes the first DAO setup flow.

Reward intent: onboarding rebate.

### `proposal_created`

Triggered when a user creates a real governance proposal.

Reward intent: builder activation points.

### `billing_signed`

Triggered when the operator signs a Testnet billing SKU.

Reward intent: operator rebate.

### `learn_completed`

Triggered when a developer completes a lecture in the Solana frontend learning path.

Reward intent: education completion raffle.

## Payload shape

```json
{
  "userPubkey": "<wallet address>",
  "timestamp": 1713939035000,
  "eventName": "private_treasury_execution",
  "data": {
    "amount": 1250,
    "type": "audd_pusd_rebalance",
    "success": true
  }
}
```

## Product routes

- Torque growth surface: https://privatedao.org/services/torque-growth-loop/
- Learn route: https://privatedao.org/learn/
- Govern route: https://privatedao.org/govern/
- Billing route: https://privatedao.org/services/testnet-billing-rehearsal/
- Judge route: https://privatedao.org/judge/

## Backend relay

The browser workbench posts to:

- `https://api.privatedao.org/api/v1/torque/custom-event`

The read-node keeps Torque credentials server-side through `TORQUE_API_KEY` and forwards to the configured ingestion endpoint only when the key exists. This is the correct production shape because the static site can show and test the event payload, but it must not expose reward credentials in browser JavaScript.

The route therefore has two useful states:

- local/event-inspection mode for judges, where payloads can be generated and copied immediately
- server-forwarding mode for production, where scoped credentials, campaign IDs, abuse checks, and delivery transcripts are enabled on the read-node

## Friction log

The product surface keeps a compact friction log for the Torque track:

- The growth primitive must attach to real actions, not page visits.
- Static-export deployment cannot safely hide private Torque API keys in browser code.
- The correct production path is a server-side event relay or Torque MCP runner with scoped credentials.
- The browser workbench still helps judges inspect event shape, route mapping, and reward intent immediately.
- Production rewards must reject duplicate wallet spam, repeated non-finalized actions, and events that are not connected to DAO, proposal, billing, learning, or treasury execution proof.

## Track fit

Torque rewards measurable acquisition and retention loops. PrivateDAO can create that loop through:

- onboarding completion
- governance activation
- billing proof
- learning completion
- return visits to execute or verify product actions
