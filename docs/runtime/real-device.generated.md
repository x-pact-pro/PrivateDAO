# Real-Device Runtime Evidence

## Overview

- project: `PrivateDAO`
- generated at: `2026-05-25T16:16:51.285Z`
- network: `devnet`
- status: `pending-real-device-capture`
- target count: `5`
- completed target count: `1`
- successful connect count: `1`
- successful submission count: `1`
- diagnostics snapshot count: `1`

## Target Matrix

- Phantom (`phantom-desktop`) | environment: `desktop-browser` | status: `pending-capture`
- Solflare (`solflare-desktop`) | environment: `desktop-browser` | status: `pending-capture`
- Backpack (`backpack-desktop`) | environment: `desktop-browser` | status: `pending-capture`
- Glow (`glow-desktop`) | environment: `desktop-browser` | status: `pending-capture`
- Android Native / Mobile (`android-runtime`) | environment: `android-or-mobile` | status: `captured`

## Pending Targets

- Phantom
- Solflare
- Backpack
- Glow

## Captures

### Android Native / Mobile

- captured at: `2026-04-18T03:25:57.000Z`
- environment: `android-or-mobile`
- os: `Android`
- browser or client: `Solflare in-app browser`
- connect result: `success`
- signing result: `success`
- submission result: `success`
- diagnostics snapshot captured: `true`
- tx signature: `5ZQfvJxU7QvKakZvS1JkDNJLBZVzTesQk7g1NhzAXGBzKYYsPcSzUbiNiDa9Xc2wq5K7yfeJm3uT2qY5aWW9cMV2`
- explorer url: `https://explorer.solana.com/tx/5ZQfvJxU7QvKakZvS1JkDNJLBZVzTesQk7g1NhzAXGBzKYYsPcSzUbiNiDa9Xc2wq5K7yfeJm3uT2qY5aWW9cMV2?cluster=devnet`
- error message: `none`

## Required Docs

- `docs/runtime/real-device.md`
- `docs/runtime/real-device-captures.json`
- `docs/android-solflare-real-device-capture-2026-04-18.md`
- `docs/runtime-attestation.generated.json`
- `docs/external-readiness-intake.md`

## Commands

- `npm run build:real-device-runtime`
- `npm run verify:real-device-runtime`
- `npm run verify:runtime-surface`
- `npm run verify:all`

## Honest Boundary

This package makes real-device wallet QA reviewer-visible and reproducible as an intake process. It does not treat browser-side diagnostics as a substitute for actual wallet, device, and client captures.
