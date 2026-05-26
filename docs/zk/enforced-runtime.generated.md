# ZK-Enforced Runtime Evidence

## Overview

- project: `PrivateDAO`
- generated at: `2026-05-25T23:46:15.941Z`
- network: `devnet`
- status: `pending-zk-enforced-capture`
- target count: `5`
- completed target count: `0`
- mode activation success count: `0`
- finalize success count: `0`
- diagnostics snapshot count: `0`

## Target Matrix

- Phantom (`phantom-desktop-zk-enforced`) | environment: `desktop-browser` | status: `pending-capture`
- Solflare (`solflare-desktop-zk-enforced`) | environment: `desktop-browser` | status: `pending-capture`
- Backpack (`backpack-desktop-zk-enforced`) | environment: `desktop-browser` | status: `pending-capture`
- Glow (`glow-desktop-zk-enforced`) | environment: `desktop-browser` | status: `pending-capture`
- Android Native / Mobile (`android-runtime-zk-enforced`) | environment: `android-or-mobile` | status: `pending-capture`

## Pending Targets

- Phantom
- Solflare
- Backpack
- Glow
- Android Native / Mobile

## Captures

No zk_enforced runtime captures have been committed yet. The intake, generated review package, and verification path are now in place so real runs can be added without changing the reviewer surface.

## Required Docs

- `docs/zk/enforced-runtime-evidence.md`
- `docs/zk/enforced-runtime-captures.json`
- `docs/zk/enforced-operator-flow.md`
- `docs/phase-c-hardening.md`

## Commands

- `npm run build:zk-enforced-runtime`
- `npm run verify:zk-enforced-runtime`
- `npm run record:zk-enforced-runtime -- <capture-json-path>`
- `npm run inspect:zk-proposal -- --proposal <PDA>`
- `npm run configure:zk-mode -- --proposal <PDA> --mode zk_enforced`
- `npm run anchor:zk-verify:enforced`

## Honest Boundary

This package makes the missing `zk_enforced` runtime blocker concrete and machine-visible. It does not claim that the stronger path has production-grade runtime evidence until actual wallet runs are captured here.
