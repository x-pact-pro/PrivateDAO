#!/usr/bin/env bash

zk_circuits() {
  printf '%s\n' \
    "private_dao_vote_overlay" \
    "private_dao_delegation_overlay" \
    "private_dao_tally_overlay" \
    "private_dao_blind_policy_overlay" \
    "private_dao_blind_kyc" \
    "private_dao_blind_aml" \
    "private_dao_blind_employment" \
    "private_dao_blind_payroll" \
    "private_dao_blind_underwriting" \
    "private_dao_auction_outcome"
}

zk_sample_circuits() {
  printf '%s\n' \
    "private_dao_vote_overlay" \
    "private_dao_delegation_overlay" \
    "private_dao_tally_overlay" \
    "private_dao_blind_policy_overlay"
}
