#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Hardened GPT-5 bundle creator:
 * - Cross-platform (uses tar lib)
 * - Redacts secrets while snapshotting to a temp dir
 * - Emits BUNDLE_MANIFEST.json with sha256 per file
 * - Supports include/exclude and BUNDLE_EXTRA
 * - Enforces size guard
 */

import path from "node:path";
import os from "node:os";
import { promises as fs, createReadStream } from "node:fs";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import * as fse from "fs-extra";
import * as tar from "tar";
import { globby } from "globby";

// ---------- Config ----------
const OUTPUT_BASENAME = "plumbing-agent-for-gpt5";
const MAX_MB = Number(process.env.BUNDLE_MAX_MB ?? 120); // fail if > 120MB by default
const NO_CLEAN = process.env.BUNDLE_NO_CLEAN === "1";
const DRY_RUN = process.env.BUNDLE_DRY_RUN === "1";
const EXTRA_PATTERNS = (process.env.BUNDLE_EXTRA ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// What to include (matches your original intent + tests/migrations/ci/etc.)
const INCLUDE = [
  // Docs & ops
  "CLAUDE.md",
  "README.md",
  "Docs/**",

  // Project config
  "package.json",
  "pnpm-workspace.yaml",
  "tsconfig.json",
  "next.config.*",
  "biome.json",
  "eslint.config.mjs",
  ".eslintrc.*",
  "postcss.config.*",
  "tailwind.config.*",
  "components.json",
  ".editorconfig",
  ".npmrc",
  ".nvmrc",
  ".prettier*",

  // CI / hooks / meta
  ".github/**",
  ".husky/**",

  // Source & scripts
  "src/**",
  "server/**",
  "scripts/**",
  "public/**",

  // Database/migrations
  "server/db/**",

  // Tests & workbench
  "tests/**",
  "playwright/**",
  "workbench/**",

  // Allow caller to append
  ...EXTRA_PATTERNS,
];

// What to exclude (plus built artifacts & secrets)
const EXCLUDE = [
  "node_modules/**",
  ".next/**",
  "dist/**",
  "build/**",
  "coverage/**",
  ".turbo/**",
  ".git/**",
  ".DS_Store",
  "Thumbs.db",

  // Logs & temps
  "*.log",
  "*.tmp",
  "tmp/**",
  "temp/**",

  // Lockfiles can bloat & aren’t essential for analysis
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",

  // Secrets or sensitive files
  ".env",
  ".env.*",
  "env/**",
  "**/*.pem",
  "**/*.key",
  "**/*.p12",
  "**/*service-account*.json",
  "supabase/**/anon*",
  "supabase/**/service*",
  "firebase*.json",
];

// Secret redaction rules (applied only to text files <= 5MB)
const REDACT_TEXT_BYTES = 5 * 1024 * 1024;
const REDACTIONS = [
  // dotenv or yaml/json-like KEY=REDACTED
  { re: /^(.*(?:KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY|SERVICE_ROLE_KEY)\s*[:=]\s*)(.+)$/gim, repl: "$1REDACTED" },
  // JSON `"private_key": "REDACTED"` etc.
  { re: /("?(?:private_key|apiKey|client_secret|access_token|refresh_token)"?\s*:\s*)"[^"]+"/gim, repl: '$1"REDACTED"' },
  // PEM blocks
  {
    re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    repl: "-----BEGIN PRIVATE KEY-----\nREDACTED\n-----END PRIVATE KEY-----",
  },
  // Stripe-like keys and sk_live… tokens
  { re: /\b(sk_(?:live|test)_[A-Za-z0-9]{16,})\b/g, repl: "REDACTED" },
  // Supabase service role keys (JWTs)
  { re: /\beyJ[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}\b/g, repl: "REDACTED" },
  // Clerk keys
  { re: /\b(pk_live_[A-Za-z0-9]{20,}|pk_test_[A-Za-z0-9]{20,}|sk_live_[A-Za-z0-9]{20,}|sk_test_[A-Za-z0-9]{20,})\b/g, repl: "REDACTED" },
  // Mollie keys
  { re: /\b(live_[A-Za-z0-9]{20,}|test_[A-Za-z0-9]{20,})\b/g, repl: "REDACTED" },
  // WhatsApp webhook secrets
  { re: /\b(whsec_[A-Za-z0-9]{20,})\b/g, repl: "REDACTED" },
];

// ---------- Helpers ----------
const sha256File = async (absPath) => {
  const hash = crypto.createHash("sha256");
  await new Promise((resolve, reject) => {
    const rs = createReadStream(absPath);
    rs.on("error", reject);
    rs.on("end", resolve);
    rs.pipe(hash, { end: true });
  });
  return hash.digest("hex");
};

const isTextLike = (p) => {
  const ext = path.extname(p).toLowerCase();
  const textExts = new Set([
    ".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", ".md", ".mdx", ".yml", ".yaml",
    ".css", ".scss", ".txt", ".env", ".sql",
    ".html", ".xml", ".svg",
  ]);
  return textExts.has(ext);
};

// Redact secrets in-memory and write to snapshot
const redactAndCopy = async (src, dst) => {
  const stat = await fs.stat(src);
  if (stat.isDirectory()) {
    await fse.ensureDir(dst);
    return;
  }
  if (!isTextLike(src) || stat.size > REDACT_TEXT_BYTES) {
    // binary or big text → copy as-is
    await fse.copy(src, dst);
    return;
  }
  let content = await fs.readFile(src, "utf8");
  for (const rule of REDACTIONS) {
    content = content.replace(rule.re, rule.repl);
  }
  await fse.ensureDir(path.dirname(dst));
  await fs.writeFile(dst, content, "utf8");
};

const getGitSha = () => {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
};

const getClaudeVersion = async (rootDir) => {
  try {
    const p = path.join(rootDir, "CLAUDE.md");
    const exists = await fse.pathExists(p);
    if (!exists) return null;
    const firstLine = (await fs.readFile(p, "utf8")).split(/\r?\n/)[0] ?? "";
    return firstLine.slice(0, 200);
  } catch {
    return null;
  }
};

// Generate WhatsApp slice status manifest by checking for key files
const generateWhatsAppSliceManifest = async (rootDir) => {
  const slices = {
    "S0": {
      "status": "done",
      "evidence": [],
      "description": "Foundation & Configuration"
    },
    "S1": {
      "status": "done", 
      "evidence": [],
      "description": "WhatsApp Webhook Infrastructure"
    },
    "S2": {
      "status": "not_started",
      "evidence": [],
      "description": "AI Brain Core (Analysis Engine)"
    },
    "S3": {
      "status": "not_started",
      "evidence": [],
      "description": "Dashboard AI Chatbot"
    },
    "S4": {
      "status": "partial",
      "evidence": [],
      "gaps": [],
      "description": "Plumber Control Chat (WhatsApp #2)"
    }
  };

  // Check S0 - Foundation files
  const s0Files = [
    "src/lib/feature-flags.ts",
    "src/server/db/sql/020_whatsapp_foundation.sql"
  ];
  for (const file of s0Files) {
    const exists = await fse.pathExists(path.join(rootDir, file));
    if (exists) slices.S0.evidence.push(file);
  }

  // Check S1 - Webhook Infrastructure
  const s1Files = [
    "src/app/api/wa/customer/route.ts",
    "src/app/api/wa/control/route.ts",
    "src/server/services/whatsapp/message-store.ts",
    "src/server/api/routers/whatsapp.ts"
  ];
  for (const file of s1Files) {
    const exists = await fse.pathExists(path.join(rootDir, file));
    if (exists) slices.S1.evidence.push(file);
  }

  // Check S2 - AI Brain
  const s2Files = [
    "src/server/api/routers/ai-brain.ts",
    "src/server/services/ai/analyzer.ts",
    "src/schema/ai-types.ts"
  ];
  let s2Count = 0;
  for (const file of s2Files) {
    const exists = await fse.pathExists(path.join(rootDir, file));
    if (exists) {
      slices.S2.evidence.push(file);
      s2Count++;
    }
  }
  if (s2Count > 0) {
    slices.S2.status = s2Count === s2Files.length ? "done" : "partial";
  }

  // Check S3 - Dashboard Chatbot
  const s3Files = [
    "src/components/ai/chat-widget.tsx",
    "src/app/(dashboard)/ai-chat/page.tsx",
    "src/hooks/use-ai-chat.ts"
  ];
  let s3Count = 0;
  for (const file of s3Files) {
    const exists = await fse.pathExists(path.join(rootDir, file));
    if (exists) {
      slices.S3.evidence.push(file);
      s3Count++;
    }
  }
  if (s3Count > 0) {
    slices.S3.status = s3Count === s3Files.length ? "done" : "partial";
  }

  // Check S4 - Control Chat (already partially implemented)
  const s4Files = [
    "src/server/services/control-chat.ts",
    "src/components/control/approval-flow.tsx",
    "src/server/db/sql/023_control_chat.sql"
  ];
  slices.S4.evidence.push("src/app/api/wa/control/route.ts"); // Already exists
  slices.S4.gaps = ["no approval queue", "no command parser", "no relay", "no audit"];
  
  for (const file of s4Files) {
    const exists = await fse.pathExists(path.join(rootDir, file));
    if (exists) slices.S4.evidence.push(file);
  }

  return slices;
};

// Parse guard results: ignore everything before summary, preserve all details after
const parseGuardResults = (guardData) => {
  if (guardData.success) {
    return {
      status: "success",
      summary: "All validation steps passed successfully.",
      details: null
    };
  }

  const output = guardData.combined || guardData.stdout || "";
  const stderr = guardData.stderr || "";
  const fullText = output + "\n" + stderr;
  
  // Find the summary section
  const summaryMarker = "========== GUARD-SAFE SUMMARY ==========";
  const summaryIndex = fullText.indexOf(summaryMarker);
  
  if (summaryIndex === -1) {
    // Fallback if no summary found - return simplified version
    return {
      status: "failed",
      summary: "Guard validation failed",
      summarySection: "Summary section not found",
      detailedOutput: fullText.replace(/\[[0-9;]+m/g, ''),
      exitCode: guardData.exitCode || 1
    };
  }
  
  // Extract summary section and everything after it
  const afterSummary = fullText.substring(summaryIndex);
  const lines = afterSummary.split("\n");
  
  // Parse the summary section to get pass/fail counts
  let summaryLines = [];
  let detailLines = [];
  let inDetails = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Detect end of summary section (when detailed output starts)
    if (trimmed === "" && summaryLines.length > 0 && !inDetails) {
      inDetails = true;
      continue;
    }
    
    if (!inDetails && (line.includes("✅") || line.includes("❌") || line.includes("PASS") || line.includes("FAIL"))) {
      summaryLines.push(line.replace(/\[[0-9;]+m/g, ''));
    } else if (inDetails) {
      // Include all detailed output after summary
      detailLines.push(line);
    }
  }
  
  // Count failures from summary
  const failedSteps = summaryLines.filter(line => line.includes("❌") || line.includes("FAIL")).length;
  const passedSteps = summaryLines.filter(line => line.includes("✅") || line.includes("PASS")).length;
  
  return {
    status: "failed",
    summary: `${failedSteps} failed steps, ${passedSteps} passed steps`,
    summarySection: summaryLines.join('\n'),
    detailedOutput: detailLines.join('\n').replace(/\[[0-9;]+m/g, ''), // Strip ANSI codes
    exitCode: guardData.exitCode || 1,
    totals: {
      failed: failedSteps,
      passed: passedSteps
    }
  };
};

// Generate streamlined guard report with summary + all detailed output
const generateGuardReport = (guardData, parsedResults) => {
  if (parsedResults.status === "success") {
    return [
      "# GUARD VALIDATION REPORT ✅",
      "",
      `**Generated**: ${new Date().toISOString()}`,
      "**Status**: ALL CHECKS PASSED",
      "",
      "## Summary",
      "",
      "All validation steps completed successfully:",
      "- ✅ Biome Format",
      "- ✅ Biome Check", 
      "- ✅ ESLint",
      "- ✅ PreTypeCheck",
      "- ✅ TypeScript",
      "- ✅ Check Imports",
      "- ✅ Check Routes",
      "- ✅ Check Encoding",
      "- ✅ Audit Production Rules",
      "- ✅ Next.js Build",
      ""
    ].join("\n");
  }
  
  const report = [
    "# GUARD VALIDATION REPORT ❌",
    "",
    `**Generated**: ${new Date().toISOString()}`,
    `**Status**: FAILED (${parsedResults.summary})`,
    `**Exit Code**: ${parsedResults.exitCode}`,
    "",
    "## Validation Steps Summary",
    "",
    "```",
    parsedResults.summarySection,
    "```",
    "",
    "## Detailed Error Output",
    "",
    "All error details with full context (i18n key lists omitted for brevity):",
    "",
    "```",
    parsedResults.detailedOutput.length > 50000 
      ? parsedResults.detailedOutput.substring(0, 50000) + "\n\n... [Output truncated at 50k chars for readability] ..."
      : parsedResults.detailedOutput,
    "```",
    "",
    "---",
    "*This report preserves all validation error details while providing a clean summary section.*"
  ];
  
  return report.join("\n");
};

// ---------- Main ----------
(async () => {
  const root = process.cwd();
  // basic sanity
  const pkgPath = path.join(root, "package.json");
  if (!(await fse.pathExists(pkgPath))) {
    console.error("❌ Please run from project root (package.json not found).");
    process.exit(1);
  }

  // Resolve file list
  const patterns = [...INCLUDE, ...EXCLUDE.map((e) => "!" + e)];
  const files = await globby(patterns, { dot: true, onlyFiles: true, followSymbolicLinks: true });

  if (files.length === 0) {
    console.error("❌ No files matched include/exclude patterns.");
    process.exit(1);
  }

  // Temp snapshot dir
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const tmpRoot = path.join(os.tmpdir(), `gpt5-bundle-${stamp}`);
  const snapshotDir = path.join(tmpRoot, "snapshot");
  await fse.ensureDir(snapshotDir);

  // Copy with redaction
  console.log(`📦 Snapshotting ${files.length} files with redaction…`);
  for (const rel of files) {
    const src = path.join(root, rel);
    const dst = path.join(snapshotDir, rel);
    await redactAndCopy(src, dst);
  }

  // Build manifest
  console.log("🧾 Computing SHA-256 and building manifest…");
  const manifestEntries = [];
  for (const rel of files) {
    const abs = path.join(snapshotDir, rel);
    const stat = await fs.stat(abs);
    manifestEntries.push({
      path: rel,
      bytes: stat.size,
      sha256: await sha256File(abs),
    });
  }

  const gitSha = getGitSha();
  const claudeTopLine = await getClaudeVersion(root);
  const manifest = {
    bundleName: OUTPUT_BASENAME,
    createdAt: new Date().toISOString(),
    gitSha,
    node: process.version,
    include: INCLUDE,
    exclude: EXCLUDE,
    extra: EXTRA_PATTERNS,
    files: manifestEntries,
    totals: {
      count: manifestEntries.length,
      bytes: manifestEntries.reduce((a, b) => a + b.bytes, 0),
    },
    notes: {
      claudeHeader: claudeTopLine,
    },
  };

  // Run pnpm guard-safe to collect ALL validation results
  console.log("🔍 Running pnpm guard-safe to collect comprehensive validation results...");
  let guardResults = null;
  try {
    const output = execSync("pnpm guard-safe", { 
      encoding: "utf8", 
      cwd: root,
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large outputs
    });
    guardResults = { 
      success: true, 
      output: output 
    };
    console.log("✅ pnpm guard-safe passed all validation steps");
  } catch (error) {
    guardResults = {
      success: false,
      exitCode: error.status,
      stdout: error.stdout || "",
      stderr: error.stderr || "",
      combined: error.output ? error.output.join("\n") : error.message,
    };
    console.log("⚠️  pnpm guard-safe reported failures - comprehensive results captured for ChatGPT analysis");
  }

  // Parse and structure guard results for better analysis
  console.log("🔍 Parsing and deduplicating guard results...");
  const parsedResults = parseGuardResults(guardResults);
  
  // Add both raw and parsed results to manifest
  manifest.guardResults = guardResults;
  manifest.guardSummary = {
    ...parsedResults,
    // Simplified manifest summary
    failedSteps: parsedResults.totals?.failed || 0,
    passedSteps: parsedResults.totals?.passed || 0
  };

  // Generate WhatsApp slice status manifest
  console.log("📋 Generating WhatsApp slice status manifest...");
  const sliceManifest = await generateWhatsAppSliceManifest(root);

  const manifestPath = path.join(snapshotDir, "BUNDLE_MANIFEST.json");
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  // Create slice status file
  const sliceManifestPath = path.join(snapshotDir, "Docs/status/whatsapp_slices.json");
  await fse.ensureDir(path.dirname(sliceManifestPath));
  await fs.writeFile(sliceManifestPath, JSON.stringify(sliceManifest, null, 2), "utf8");

  // Create improved GUARD_RESULTS.md with structured, deduplicated report
  const guardReport = generateGuardReport(guardResults, parsedResults);
  await fs.writeFile(path.join(snapshotDir, "GUARD_RESULTS.md"), guardReport, "utf8");
  
  // Also save detailed raw output for deeper debugging if needed
  if (!guardResults.success) {
    const rawOutput = [
      "# RAW GUARD OUTPUT (For Deep Debugging)",
      "",
      "This file contains the complete unprocessed output from `pnpm guard-safe`.",
      "For structured analysis, see GUARD_RESULTS.md instead.",
      "",
      "## Combined Output",
      "",
      "```",
      guardResults.combined || guardResults.stdout || "No output captured",
      "```",
      "",
      guardResults.stderr ? [
        "## Standard Error",
        "",
        "```",
        guardResults.stderr,
        "```"
      ].join("\n") : ""
    ].filter(line => line !== "").join("\n");
    
    await fs.writeFile(path.join(snapshotDir, "GUARD_RAW_OUTPUT.md"), rawOutput, "utf8");
    console.log("📋 Structured guard analysis saved to GUARD_RESULTS.md, raw output to GUARD_RAW_OUTPUT.md");
  } else {
    console.log("✅ Guard validation results saved to GUARD_RESULTS.md");
  }

  // Create tar.gz
  const outName = `${OUTPUT_BASENAME}.${stamp}.tar.gz`;
  const outPath = path.join(root, outName);

  if (DRY_RUN) {
    console.log("🔎 DRY RUN: bundle not created. Snapshot at:", snapshotDir);
    console.log(`Would write: ${outPath}`);
    process.exit(0);
  }

  console.log("📦 Creating tar.gz…");
  await tar.create(
    {
      gzip: true,
      file: outPath,
      cwd: snapshotDir,
      portable: true,
      noMtime: true,
    },
    ["."]
  );

  const outStat = await fs.stat(outPath);
  const sizeMB = outStat.size / (1024 * 1024);
  console.log(`✅ Bundle created: ${path.basename(outPath)} (${sizeMB.toFixed(1)} MB, ${manifest.totals.count} files)`);

  if (sizeMB > MAX_MB) {
    console.error(`❌ Bundle size ${sizeMB.toFixed(1)} MB exceeds limit ${MAX_MB} MB. Adjust includes/excludes or set BUNDLE_MAX_MB.`);
    if (!NO_CLEAN) await fse.remove(tmpRoot);
    process.exit(1);
  }

  if (!NO_CLEAN) {
    await fse.remove(tmpRoot);
  } else {
    console.log("🧪 Snapshot retained at:", snapshotDir);
  }
})();
