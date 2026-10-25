# Skill: Transaction Safety

Before a user signs:

1. Confirm network, asset, amount, destination, and fee.
2. Use `transaction.explain` for a human-readable explanation.
3. Use `transaction.simulate` when a simulation is supported.
4. Show warnings and unresolved checks.
5. Ask the user to approve in the wallet.

Never sign, broadcast, or replace a transaction on the user's behalf without the host's explicit approval flow.
