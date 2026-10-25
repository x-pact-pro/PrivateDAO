# Skill: Receipt and Evidence Handling

Every completed paid workflow should return:

- service identifier;
- network and timestamp;
- result status;
- redacted receipt reference;
- verification route;
- limitations and unresolved provider dependencies.

Use `receipt.verify` or `verify_receipt` to check the receipt. A UI success message alone is not payment or execution proof.
