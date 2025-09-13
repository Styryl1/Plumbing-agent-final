#!/usr/bin/env node

/**
 * i18n Code Scanner
 *
 * Scans the codebase for translation usage patterns and validates:
 * 1. useTranslations namespace consistency
 * 2. Translation key usage vs available keys
 * 3. Dynamic key patterns that need to be replaced
 * 4. Missing translation keys
 */

import fs from "fs/promises";
import path from "path";
import { readdir } from "fs/promises";

const SRC_DIR = "src";
const MESSAGES_DIR = "src/i18n/messages";

// Load translation messages
async function loadMessages() {
  try {
    const enMessages = JSON.parse(
      await fs.readFile(path.join(MESSAGES_DIR, "en.json"), "utf8")
    );
    const nlMessages = JSON.parse(
      await fs.readFile(path.join(MESSAGES_DIR, "nl.json"), "utf8")
    );
    return { en: enMessages, nl: nlMessages };
  } catch (error) {
    console.error("❌ Failed to load translation messages:", error.message);
    process.exit(1);
  }
}

// Get all available keys from messages object
function getAllKeys(obj, prefix = "") {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = REDACTED
    if (typeof value === "object" && value !== null) {
      keys.push(...getAllKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// Extract translation usage from file content
function extractTranslationUsage(content, filePath) {
  const issues = [];
  const usagePatterns = [];

  // Pattern 1: useTranslations() and useT() calls
  const useTranslationsPattern = /useTranslations\(["']([^"']+)["']\)/g;
  const useTAliasPattern = /useT\(["']([^"']+)["']\)/g;
  let match;
  while ((match = useTranslationsPattern.exec(content)) !== null) {
    usagePatterns.push({
      type: "useTranslations",
      namespace: match[1],
      line: content.substring(0, match.index).split('\n').length,
      file: filePath
    });
  }
  while ((match = useTAliasPattern.exec(content)) !== null) {
    usagePatterns.push({
      type: "useTranslations",
      namespace: match[1],
      line: content.substring(0, match.index).split('\n').length,
      file: filePath
    });
  }

  // Pattern 2: getTranslations() calls
  const getTranslationsPattern = /getTranslations\(\{[^}]*namespace:\s*["']([^"']+)["'][^}]*\}\)/g;
  while ((match = getTranslationsPattern.exec(content)) !== null) {
    usagePatterns.push({
      type: "getTranslations",
      namespace: match[1],
      line: content.substring(0, match.index).split('\n').length,
      file: filePath
    });
  }

  // Pattern 3: t() calls with keys
  const tCallPattern = /\bt\(["']([^"']+)["']/g;
  while ((match = tCallPattern.exec(content)) !== null) {
    const key = match[1] ?? "";
    usagePatterns.push({
      type: "tCall",
      key,
      line: content.substring(0, match.index).split('\n').length,
      file: filePath,
    });
  }

  // Pattern 4: Dynamic key patterns (template literals)
  const dynamicKeyPattern = /\bt\(`([^`]+\$\{[^}]+\}[^`]*)`/g;
  while ((match = dynamicKeyPattern.exec(content)) !== null) {
    issues.push({
      type: "dynamicKey",
      pattern: match[1],
      line: content.substring(0, match.index).split('\n').length,
      file: filePath,
      severity: "warning",
      message: `Dynamic key pattern detected: ${match[1]}`
    });
  }

  // Pattern 5: Empty namespace usage
  const emptyNamespacePattern = /useTranslations\(\s*\)|useT\(\s*\)/g;
  while ((match = emptyNamespacePattern.exec(content)) !== null) {
    issues.push({
      type: "emptyNamespace",
      line: content.substring(0, match.index).split('\n').length,
      file: filePath,
      severity: "error",
      message: "useTranslations() called without namespace - use specific namespace"
    });
  }

  return { usagePatterns, issues };
}

// Validate namespace usage
function validateNamespaceUsage(usagePatterns, availableKeys) {
  const issues = [];

  // Group by file to analyze namespace consistency
  const fileGroups = usagePatterns.reduce((acc, pattern) => {
    if (!acc[pattern.file]) acc[pattern.file] = [];
    acc[pattern.file].push(pattern);
    return acc;
  }, {});

  for (const [filePath, patterns] of Object.entries(fileGroups)) {
    const namespaces = patterns
      .filter(p => p.type === "useTranslations" || p.type === "getTranslations")
      .map(p => p.namespace);

    const tCalls = patterns.filter(p => p.type === "tCall");

    // Check if keys match expected namespaces
    for (const tCall of tCalls) {
      const keyFound = availableKeys.some(availableKey => availableKey === tCall.key);

      if (!keyFound) {
        // Check if it's a namespaced key that should be split
        const hasNamespaceInKey = tCall.key.includes('.');
        if (hasNamespaceInKey) {
          issues.push({
            type: "namespaceMismatch",
            line: tCall.line,
            file: filePath,
            severity: "warning",
            message: `Key "${tCall.key}" appears to contain namespace - consider splitting into namespace + key`
          });
        } else {
          issues.push({
            type: "missingKey",
            line: tCall.line,
            file: filePath,
            severity: "error",
            message: `Translation key "${tCall.key}" not found in any namespace`
          });
        }
      }
    }
  }

  return issues;
}

// Recursively find TypeScript files
async function findTsFiles(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await findTsFiles(fullPath, files);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) && !entry.name.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

// Main scanner function
async function scanCodebase() {
  console.log("🔍 Scanning codebase for i18n usage patterns...\n");

  try {
    // Load translation messages
    const messages = await loadMessages();
    const availableKeys = getAllKeys(messages.en);

    console.log(`📚 Loaded ${availableKeys.length} translation keys`);

    // Find all TypeScript/React files
    const files = await findTsFiles(SRC_DIR);

    console.log(`📁 Scanning ${files.length} files...\n`);

    let allUsagePatterns = [];
    let allIssues = [];

    // Scan each file
    for (const filePath of files) {
      const content = await fs.readFile(filePath, "utf8");
      const { usagePatterns, issues } = extractTranslationUsage(content, filePath);

      allUsagePatterns.push(...usagePatterns);
      allIssues.push(...issues);
    }

    // Validate usage patterns
    const validationIssues = validateNamespaceUsage(allUsagePatterns, availableKeys);
    allIssues.push(...validationIssues);

    // Report results
    console.log("📊 SCAN RESULTS");
    console.log("================");
    console.log(`Found ${allUsagePatterns.length} translation usage patterns`);
    console.log(`Found ${allIssues.length} issues\n`);

    // Group issues by severity
    const errors = allIssues.filter(issue => issue.severity === "error");
    const warnings = allIssues.filter(issue => issue.severity === "warning");

    if (errors.length > 0) {
      console.log("❌ ERRORS:");
      errors.forEach(error => {
        console.log(`   ${error.file}:${error.line} - ${error.message}`);
      });
      console.log();
    }

    if (warnings.length > 0) {
      console.log("⚠️  WARNINGS:");
      warnings.forEach(warning => {
        console.log(`   ${warning.file}:${warning.line} - ${warning.message}`);
      });
      console.log();
    }

    // Summary by namespace usage
    const namespaceUsage = allUsagePatterns
      .filter(p => p.type === "useTranslations" || p.type === "getTranslations")
      .reduce((acc, pattern) => {
        acc[pattern.namespace] = (acc[pattern.namespace] || 0) + 1;
        return acc;
      }, {});

    console.log("📈 NAMESPACE USAGE:");
    Object.entries(namespaceUsage)
      .sort(([,a], [,b]) => b - a)
      .forEach(([namespace, count]) => {
        console.log(`   ${namespace}: ${count} usages`);
      });

    // Exit with error code if there are errors
    if (errors.length > 0) {
      console.log(`\n💥 Scan completed with ${errors.length} errors`);
      process.exit(1);
    } else {
      console.log(`\n✅ Scan completed successfully with ${warnings.length} warnings`);
    }

  } catch (error) {
    console.error("❌ Scanner failed:", error.message);
    process.exit(1);
  }
}

// Run the scanner
scanCodebase();
