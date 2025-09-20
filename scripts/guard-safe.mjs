// scripts/guard-safe.mjs
import { spawn } from "node:child_process";

const steps = [
  { name: "Biome Format", cmd: ["pnpm", ["-s", "exec", "biome", "format", "--write", "."]] },
  { name: "Biome Check",  cmd: ["pnpm", ["-s", "exec", "biome", "check", "--write", "."]] },
  { name: "ESLint",       cmd: ["pnpm", ["-s", "lint"]] },
  { name: "Pre-TypeCheck", cmd: ["node", ["scripts/pretypecheck.mjs"]] },
  { name: "TypeScript Check", cmd: ["pnpm", ["-s", "exec", "tsc", "--noEmit"]] },
  { name: "Check Imports", cmd: ["node", ["scripts/check-imports.mjs"]] },
  { name: "Check Routes", cmd: ["node", ["scripts/check-routes.mjs"]] },
  { name: "Check Encoding", cmd: ["node", ["scripts/check-encoding.mjs"]] },
  { name: "Check Placeholders", cmd: ["node", ["scripts/check-placeholders.mjs"]] },
  { name: "i18n Prune", cmd: ["pnpm", ["-s", "i18n:prune"]] },
  { name: "i18n Scan", cmd: ["pnpm", ["-s", "i18n:scan"]] },
  { name: "i18n Check", cmd: ["pnpm", ["-s", "i18n:check"]] },
  { name: "Audit Rules",  cmd: ["node", ["scripts/audit-production-rules.mjs"]] },
  { name: "Build",        cmd: ["pnpm", ["-s", "exec", "next", "build"]] }
];

// Pass-through args (e.g. --scope patterns)
const passThrough = process.argv.slice(2);

let hadFailure = false;
const results = [];

const run = (cmd, args, label, env = {}) =>
  new Promise((resolve) => {
    const child = spawn(cmd, [...args, ...passThrough], {
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...env }
    });

    let output = "";
    child.stdout.on("data", (d) => { 
      process.stdout.write(d); 
      output += d; 
    });
    child.stderr.on("data", (d) => { 
      process.stderr.write(d); 
      output += d; 
    });

    child.on("close", (code) => {
      results.push({ label, code, output });
      if (code !== 0) hadFailure = true;
      resolve();
    });
  });

const main = async () => {
  console.log("\n▶ Running guard-safe (sequential, runs all steps)…\n");
  for (const step of steps) {
    console.log(`\n━━━ ${step.name} ━━━`);
    // eslint-disable-next-line no-await-in-loop
    await run(step.cmd[0], step.cmd[1], step.name, step.env);
  }

  console.log("\n\n========== GUARD-SAFE SUMMARY ==========");
  for (const r of results) {
    const status = r.code === 0 ? "✅ PASS" : `❌ FAIL (exit ${r.code})`;
    console.log(`${status}  ${r.label}`);
  }
  console.log("========================================\n");

  process.exit(hadFailure ? 1 : 0);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});