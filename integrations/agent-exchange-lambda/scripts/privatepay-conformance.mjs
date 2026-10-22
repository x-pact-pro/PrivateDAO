import { readFile } from "node:fs/promises";
import { getConfig } from "../src/config.mjs";
import { auditPrivatePayTrace, preparePrivatePayTransfer, probePrivatePayRail } from "../src/privatepay.mjs";

const args = new Set(process.argv.slice(2));
const strict = args.has("--strict");
const prepare = args.has("--prepare");
const traceFileArg = process.argv.find((value) => value.startsWith("--trace-file="));
const traceFile = traceFileArg ? traceFileArg.slice("--trace-file=".length).trim() : "";
const config = getConfig(process.env);

function publicError(error) {
  return { code: error?.code || "PRIVATEPAY_AUDIT_ERROR", message: String(error?.message || error) };
}

function redactAddress(value) {
  const text = String(value || "");
  return text.length > 10 ? `${text.slice(0, 4)}...${text.slice(-4)}` : text || null;
}

function publicPreparedAudit(value) {
  if (!value) return null;
  return {
    ...value,
    fee_payer: redactAddress(value.fee_payer),
    legs: value.legs?.map((leg) => ({ ...leg, fee_payer: redactAddress(leg.fee_payer) })),
  };
}

function publicTraceAudit(value) {
  if (!value) return null;
  return {
    ...value,
    legs: value.legs?.map((leg) => {
      const { static_accounts: _staticAccounts, observed_times: _observedTimes, ...publicLeg } = leg;
      return { ...publicLeg, fee_payer: redactAddress(leg.fee_payer) };
    }),
  };
}

const report = {
  schema: "privatedao.privatepay.conformance.v1",
  generated_at: new Date().toISOString(),
  mode: traceFile ? "provider_read_only_plus_supplied_trace" : prepare ? "provider_read_only_plus_unsigned_prepare" : "provider_read_only",
  signed_or_broadcast: false,
  funds_moved: false,
  rail: null,
  transfer_audit: null,
  trace_audit: null,
  release_ready: false,
};

try {
  report.rail = await probePrivatePayRail(config);
} catch (error) {
  report.rail = { status: "audit_error", operational: false, error: publicError(error) };
}

if (traceFile) {
  try {
    const trace = JSON.parse(await readFile(traceFile, "utf8"));
    report.trace_audit = publicTraceAudit(auditPrivatePayTrace(trace));
  } catch (error) {
    report.trace_audit = { status: "trace_file_error", release_ready: false, error: publicError(error) };
  }
}

if (prepare && !traceFile) {
  const payer = String(process.env.PRIVATEPAY_AUDIT_PAYER || "").trim();
  const magicBlockRail = String(config.privatePayPrivacyRail || "").trim() === "magicblock-private-ephemeral-rollup";
  const provider = String(config.privatePayProviderWallet || "").trim();
  const providerHandle = String(config.privatePayProviderHandle || "").trim();
  const mint = String(config.privatePayConfidentialMint || "").trim();
  const mintProgram = String(config.privatePayConfidentialMintProgram || "").trim();
  const missing = [
    !payer ? "PRIVATEPAY_AUDIT_PAYER" : null,
    !mint ? "PRIVATEPAY_CONFIDENTIAL_MINT" : null,
    magicBlockRail ? (!providerHandle ? "PRIVATEPAY_PROVIDER_HANDLE" : null) : (!provider ? "PRIVATEPAY_PROVIDER_WALLET" : null),
    !magicBlockRail && !mintProgram ? "PRIVATEPAY_CONFIDENTIAL_MINT_PROGRAM" : null,
  ].filter(Boolean);
  if (missing.length) {
    report.transfer_audit = {
      status: "not_run",
      release_ready: false,
      reason: `--prepare requires ${missing.join(", ")}`,
    };
  } else {
    const auditConfig = {
      ...config,
      privatePayEnabled: true,
      privatePayRequireGasless: false,
      privatePayProviderWallet: provider,
      privatePayProviderHandle: providerHandle,
      privatePayConfidentialMint: mint,
      privatePayConfidentialMintProgram: mintProgram,
    };
    try {
      const prepared = await preparePrivatePayTransfer(auditConfig, {
        payer,
        request_id: "pp_00000000000000000000000000000001",
        amount_base_units: process.env.PRIVATEPAY_AUDIT_AMOUNT_BASE_UNITS || "1",
        split: 1,
        gasless: false,
      });
      report.transfer_audit = publicPreparedAudit(prepared.privacy_audit);
      report.trace_audit = {
        status: "not_run",
        release_ready: false,
        reason: "--prepare audits one unsigned transfer only; provide --trace-file with independently captured deposit, transfer, and withdrawal legs",
      };
    } catch (error) {
      report.transfer_audit = { status: "provider_prepare_error", release_ready: false, error: publicError(error) };
    }
  }
}

const railReady = report.rail?.operational === true;
const transferReady = report.transfer_audit?.release_ready === true;
const traceReady = report.trace_audit?.release_ready === true;
report.release_ready = railReady && transferReady && traceReady;
console.log(JSON.stringify(report));
if (strict && !report.release_ready) process.exitCode = 2;
