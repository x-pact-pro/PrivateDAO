#!/usr/bin/env node

const API_BASE = process.env.PRIVATEPAY_API_BASE || "https://payments.magicblock.app";
const CLUSTER = process.env.PRIVATEPAY_CLUSTER || "mainnet-private";
const MINT = process.env.PRIVATEPAY_MINT || "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const addresses = [
  {
    label: "merchant",
    address: process.env.PRIVATEPAY_MERCHANT_ADDRESS || "2BJ4ezxqV9YJXc38D9duKBkdn4su4jE1beKUHwH663sL",
  },
  {
    label: "test-provider",
    address: "Fpi5ze2ueWmarWhyKuhpgT6DtfPRARCFj8CV9htkiwkz",
  },
];

async function readBalance(entry) {
  const url = new URL("/v1/spl/balance", API_BASE);
  url.searchParams.set("address", entry.address);
  url.searchParams.set("mint", MINT);
  url.searchParams.set("cluster", CLUSTER);

  let response;
  let body = {};
  try {
    response = await fetch(url);
    body = await response.json().catch(() => ({}));
  } catch (error) {
    return {
      label: entry.label,
      address: entry.address,
      status: null,
      ata: null,
      location: null,
      balanceBaseUnits: null,
      delegation: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
  return {
    label: entry.label,
    address: entry.address,
    status: response.status,
    ata: body.ata || null,
    location: body.location || null,
    balanceBaseUnits: body.balance || null,
    delegation: body.delegation || null,
    error: body.error || body.code || null,
  };
}

const results = await Promise.all(addresses.map(readBalance));
const merchant = results.find((entry) => entry.label === "merchant");

console.log(JSON.stringify({
  checkedAt: new Date().toISOString(),
  apiBase: API_BASE,
  cluster: CLUSTER,
  mint: MINT,
  merchantReady: merchant?.status === 200 ? merchant.delegation?.status === "delegated" : null,
  results,
}, null, 2));

if (merchant?.status !== 200) process.exitCode = 3;
else if (merchant.delegation?.status !== "delegated") process.exitCode = 2;
