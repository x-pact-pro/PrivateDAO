import { spawn } from "node:child_process";

const timeoutMs = Number(process.env.PRIVADAO_RELEASE_SUITE_TIMEOUT_MS || 180_000);
const suites = [
  ["unit", ["npm", "run", "test:unit:ts"]],
  ["runtime", ["npm", "run", "test:runtime"]],
  ["runtime-http", ["npm", "run", "test:runtime:http"]],
  ["runtime-payroll", ["npm", "run", "test:runtime:payroll"]],
  ["runtime-evm", ["npm", "run", "test:runtime:evm-foundation"]],
  ["zcash-foundation", ["npm", "run", "test:runtime:zcash-foundation"]],
  ["record-verification", ["npm", "run", "test:record-verification"]],
  ["capability-registry", ["npm", "run", "test:native-capability-registry"]],
  ["capability-matrix", ["npm", "run", "verify:native-capability-matrix"]],
  ["engineer-index", ["npm", "run", "verify:engineer-index"]],
  ["application-bindings", ["npm", "run", "verify:application-bindings"]],
  ["bnb-evidence", ["npm", "run", "verify:bnb:evidence"]],
  ["bnb-organizational-evidence", ["npm", "run", "verify:bnb:organizational-evidence"]],
  ["tracked-secrets", ["npm", "run", "verify:tracked-secrets"]],
  ["agent-mcp", ["npm", "run", "test:agent-mcp"]],
  ["social-previews", ["npm", "run", "verify:social-previews"]],
  ["commercial-claims", ["node", "scripts/test-commercial-claims.mjs"]],
  ["commercial", ["node", "scripts/test-commercial-lifecycle.mjs"]],
];

function runSuite(name, command) {
  return new Promise((resolve) => {
    const child = spawn(command[0], command.slice(1), { cwd: process.cwd(), env: process.env, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk) => { output += chunk.toString(); });
    const timer = setTimeout(() => { child.kill("SIGTERM"); resolve({ name, ok: false, code: null, timedOut: true, output: output.slice(-3000) }); }, timeoutMs);
    child.on("exit", (code, signal) => { clearTimeout(timer); resolve({ name, ok: code === 0, code, signal, timedOut: false, output: output.slice(-3000) }); });
  });
}

const results = [];
for (const [name, command] of suites) {
  process.stdout.write(`[release-verify] ${name} ... `);
  const result = await runSuite(name, command);
  results.push(result);
  console.log(result.ok ? "PASS" : result.timedOut ? "TIMEOUT" : "FAIL");
  if (!result.ok) console.log(result.output);
}

const failed = results.filter((result) => !result.ok);
console.log(JSON.stringify({ schema: "privatedao.release-verify.v1", timeoutMs, ok: failed.length === 0, suites: results.map(({ name, ok, code, timedOut }) => ({ name, ok, code, timedOut })) }, null, 2));
if (failed.length) process.exit(1);
