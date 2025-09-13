#!/usr/bin/env node

/**
 * i18n Coverage Report Script
 *
 * Detects and reports:
 * 1. Untranslated hardcoded strings in components
 * 2. Missing translation keys (EN vs NL parity)
 * 3. Translation keys used in code but missing from JSON
 * 4. Translation keys in JSON but never used in code
 *
 * Usage: node scripts/i18n-coverage-report.mjs [--json] [--fix-missing]
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Command line arguments
const args = process.argv.slice(2);
const outputJson = args.includes('--json');
const fixMissing = args.includes('--fix-missing');

console.log(`📊 i18n Coverage Report`);
console.log('─'.repeat(50));

/**
 * Recursively find all files matching pattern
 */
function findFiles(dir, pattern) {
  const files = [];
  const items = readdirSync(dir);

  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (['node_modules', '.next', 'dist', 'coverage', 'workbench'].includes(item)) {
        continue;
      }
      files.push(...findFiles(fullPath, pattern));
    } else if (pattern.test(item)) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Flatten nested object to dot notation keys
 */
function flattenKeys(obj, prefix = '', result = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      flattenKeys(value, fullKey, result);
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

/**
 * Load and flatten translation files
 */
function loadTranslations() {
  try {
    const enPath = 'src/i18n/messages/en.json';
    const nlPath = 'src/i18n/messages/nl.json';

    const enRaw = JSON.parse(readFileSync(enPath, 'utf8'));
    const nlRaw = JSON.parse(readFileSync(nlPath, 'utf8'));

    const enFlat = flattenKeys(enRaw);
    const nlFlat = flattenKeys(nlRaw);

    return { enFlat, nlFlat, enRaw, nlRaw };
  } catch (error) {
    console.error('❌ Error loading translation files:', error.message);
    process.exit(1);
  }
}

/**
 * Extract translation keys used in code
 */
function extractUsedKeys(files) {
  const usedKeys = new Set();
  const hardcodedStrings = [];

  const translationCallPattern = /(?:^|\s)t\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  const hardcodedPattern = /<[^>]*>([^<]+)</g;
  const jsxAttributePattern = /\s(\w+)=['"]([^'"]+)['"]/g;

  for (const filePath of files) {
    try {
      const content = readFileSync(filePath, 'utf8');

      // Skip files without useTranslations
      if (!content.includes('useTranslations')) {
        continue;
      }

      // Extract translation keys
      let match;
      while ((match = translationCallPattern.exec(content)) !== null) {
        usedKeys.add(match[1]);
      }

      // Look for hardcoded strings in JSX (potential missing translations)
      const jsxLines = content.split('\n').filter(line =>
        line.includes('<') && line.includes('>') && !line.trim().startsWith('//')
      );

      for (let i = 0; i < jsxLines.length; i++) {
        const line = jsxLines[i];
        const lineNum = content.split('\n').indexOf(line) + 1;

        // Check JSX content
        const jsxContentMatch = line.match(/>([^<{]+)</);
        if (jsxContentMatch) {
          const text = jsxContentMatch[1].trim();
          if (text.length > 0 && !text.match(/^[\\s\\n\\t]*$/) && !text.match(/^\{.*\}$/)) {
            // Filter out common non-translatable content
            if (!shouldIgnoreString(text)) {
              hardcodedStrings.push({
                file: filePath.replace(process.cwd() + '/', ''),
                line: lineNum,
                text: text,
                type: 'jsx-content'
              });
            }
          }
        }

        // Check JSX attributes that might need translation
        const translatableAttrs = ['placeholder', 'title', 'alt', 'aria-label'];
        for (const attr of translatableAttrs) {
          const attrPattern = new RegExp(`${attr}=['"]([^'"]+)['"]`, 'g');
          let attrMatch;
          while ((attrMatch = attrPattern.exec(line)) !== null) {
            const attrValue = attrMatch[1];
            if (!shouldIgnoreString(attrValue)) {
              hardcodedStrings.push({
                file: filePath.replace(process.cwd() + '/', ''),
                line: lineNum,
                text: attrValue,
                type: `${attr}-attribute`,
                attribute: attr
              });
            }
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  }

  return { usedKeys: Array.from(usedKeys), hardcodedStrings };
}

/**
 * Determine if a string should be ignored (non-translatable)
 */
function shouldIgnoreString(str) {
  const ignorePatterns = [
    /^\s*$/,                    // Empty or whitespace
    /^[0-9]+$/,                // Pure numbers
    /^[0-9\s\-\+\(\)]+$/,      // Phone/numbers with formatting
    /^[a-zA-Z0-9\.\@\-_]+$/,   // Email/username patterns
    /^https?:\/\//,            // URLs
    /^\/[\/\w\-]*$/,           // Paths
    /^[A-Z_]{2,}$/,            // CONSTANTS
    /^[a-z\-]+$/,              // CSS classes/IDs
    /^\{.*\}$/,                // JSX expressions
    /^\$\{.*\}$/,              // Template literals
    /^(true|false|null|undefined)$/i, // JS primitives
  ];

  return ignorePatterns.some(pattern => pattern.test(str.trim()));
}

/**
 * Generate missing translations based on EN keys
 */
function generateMissingTranslations(missingInNl, enFlat) {
  const generated = {};

  for (const key of missingInNl) {
    const enValue = enFlat[key];
    if (typeof enValue === 'string') {
      // Simple heuristic translation (placeholder)
      if (enValue.toLowerCase().includes('customer')) {
        generated[key] = enValue.replace(/customer/gi, 'klant');
      } else if (enValue.toLowerCase().includes('job')) {
        generated[key] = enValue.replace(/job/gi, 'klus');
      } else if (enValue.toLowerCase().includes('invoice')) {
        generated[key] = enValue.replace(/invoice/gi, 'factuur');
      } else {
        // For now, keep English as placeholder
        generated[key] = `[NL] ${enValue}`;
      }
    }
  }

  return generated;
}

/**
 * Main analysis
 */
async function main() {
  // Load translations
  const { enFlat, nlFlat, enRaw, nlRaw } = loadTranslations();

  // Find all React component files
  const componentFiles = findFiles('src', /\.(tsx|ts)$/);
  console.log(`Analyzing ${componentFiles.length} component files...`);

  // Extract used keys and hardcoded strings
  const { usedKeys, hardcodedStrings } = extractUsedKeys(componentFiles);

  // Compare key sets
  const enKeys = new Set(Object.keys(enFlat));
  const nlKeys = new Set(Object.keys(nlFlat));
  const usedKeySet = new Set(usedKeys);

  const missingInNl = Array.from(enKeys).filter(key => !nlKeys.has(key));
  const missingInEn = Array.from(nlKeys).filter(key => !enKeys.has(key));
  const unusedInEn = Array.from(enKeys).filter(key => !usedKeySet.has(key));
  const unusedInNl = Array.from(nlKeys).filter(key => !usedKeySet.has(key));
  const usedButMissing = Array.from(usedKeySet).filter(key => !enKeys.has(key));

  // Compile report
  const report = {
    summary: {
      totalEnKeys: enKeys.size,
      totalNlKeys: nlKeys.size,
      totalUsedKeys: usedKeys.length,
      hardcodedStrings: hardcodedStrings.length,
      missingTranslations: missingInNl.length,
      unusedKeys: Math.min(unusedInEn.length, unusedInNl.length),
      brokenReferences: usedButMissing.length
    },
    issues: {
      missingInNl: missingInNl.slice(0, 20), // Limit output
      missingInEn: missingInEn.slice(0, 20),
      unusedInEn: unusedInEn.slice(0, 20),
      unusedInNl: unusedInNl.slice(0, 20),
      usedButMissing: usedButMissing.slice(0, 20),
      hardcodedStrings: hardcodedStrings.slice(0, 30)
    }
  };

  // Output report
  if (outputJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`📈 Translation Coverage Summary:`);
    console.log(`   English keys: ${report.summary.totalEnKeys}`);
    console.log(`   Dutch keys: ${report.summary.totalNlKeys}`);
    console.log(`   Used keys: ${report.summary.totalUsedKeys}`);
    console.log(`   Missing Dutch translations: ${report.summary.missingTranslations}`);
    console.log(`   Unused keys: ${report.summary.unusedKeys}`);
    console.log(`   Hardcoded strings: ${report.summary.hardcodedStrings}`);
    console.log(`   Broken references: ${report.summary.brokenReferences}`);

    if (report.issues.missingInNl.length > 0) {
      console.log(`\n❌ Missing Dutch translations (showing first 10):`);
      report.issues.missingInNl.slice(0, 10).forEach(key =>
        console.log(`   ${key}: "${enFlat[key]}"`)
      );
    }

    if (report.issues.hardcodedStrings.length > 0) {
      console.log(`\n⚠️  Potential hardcoded strings (showing first 10):`);
      report.issues.hardcodedStrings.slice(0, 10).forEach(item =>
        console.log(`   ${item.file}:${item.line} [${item.type}] "${item.text}"`)
      );
    }

    if (report.issues.usedButMissing.length > 0) {
      console.log(`\n🔴 Keys used in code but missing from translations:`);
      report.issues.usedButMissing.forEach(key =>
        console.log(`   ${key}`)
      );
    }
  }

  // Fix missing translations if requested
  if (fixMissing && missingInNl.length > 0) {
    console.log(`\n🔧 Generating ${missingInNl.length} missing Dutch translations...`);

    const generated = generateMissingTranslations(missingInNl, enFlat);

    // This would require restructuring the flat keys back to nested
    // For now, just show what would be generated
    console.log(`Generated translations (add these to nl namespace files):`);
    Object.entries(generated).slice(0, 5).forEach(([key, value]) =>
      console.log(`   "${key}": "${value}"`)
    );

    if (Object.keys(generated).length > 5) {
      console.log(`   ... and ${Object.keys(generated).length - 5} more`);
    }
  }

  // Exit with error if issues found
  const hasIssues = report.summary.missingTranslations > 0 ||
                   report.summary.brokenReferences > 0 ||
                   report.summary.hardcodedStrings > 10; // Allow some hardcoded strings

  if (hasIssues) {
    console.log(`\n💡 To fix issues:`);
    console.log(`   1. Add missing keys to both en/ and nl/ namespace files`);
    console.log(`   2. Run: pnpm i18n:aggregate`);
    console.log(`   3. Replace hardcoded strings with t() calls`);
    console.log(`   4. Run: pnpm check`);

    process.exit(1);
  } else {
    console.log(`\n✅ i18n coverage looks good!`);
  }
}

main().catch(console.error);