#!/usr/bin/env node

/**
 * i18n Pattern Migration Script
 *
 * Converts namespaced useTranslations patterns to root hook + full path patterns
 *
 * Before: const tForm = useTranslations('customers.form'); tForm('name.label')
 * After:  const t = useTranslations(); t('customers.form.name.label')
 *
 * Usage: node scripts/i18n-migrate-to-root.mjs [--dry-run] [path]
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const targetPath = args.find(arg => !arg.startsWith('--')) || 'src';

console.log(`🔄 i18n Pattern Migration`);
console.log(`Target: ${targetPath}`);
console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
console.log('─'.repeat(50));

/**
 * Recursively find all TypeScript/TSX files
 */
function findTsFiles(dir) {
  const files = [];
  const items = readdirSync(dir);

  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip certain directories
      if (['node_modules', '.next', 'dist', 'coverage'].includes(item)) {
        continue;
      }
      files.push(...findTsFiles(fullPath));
    } else if (item.match(/\.(ts|tsx)$/) && !item.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Extract useTranslations patterns from code
 */
function analyzeFile(content) {
  const analysis = {
    hasUseTranslations: false,
    hasRootHook: false,
    hasNamespacedHook: false,
    namespacedHooks: [],
    translationCalls: [],
    needsMigration: false
  };

  // Find all useTranslations declarations
  const hookPattern = /const\s+(\w+)\s*=\s*useTranslations\((.*?)\)/g;
  let match;

  while ((match = hookPattern.exec(content)) !== null) {
    const [, variableName, argument] = match;
    analysis.hasUseTranslations = true;

    if (argument.trim() === '' || argument.trim() === '()') {
      // Root hook
      analysis.hasRootHook = true;
    } else {
      // Namespaced hook
      analysis.hasNamespacedHook = true;
      const namespace = argument.replace(/['"]/g, '').trim();
      analysis.namespacedHooks.push({
        variableName,
        namespace,
        fullMatch: match[0],
        index: match.index
      });
    }
  }

  // Find translation calls
  const callPattern = /(\w+)\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = callPattern.exec(content)) !== null) {
    const [, funcName, key] = match;
    // Check if this looks like a translation call (common patterns)
    if (funcName.startsWith('t') || ['t', 'tForm', 'tActions', 'tJobs', 'tInvoices'].includes(funcName)) {
      analysis.translationCalls.push({
        funcName,
        key,
        fullMatch: match[0],
        index: match.index
      });
    }
  }

  // Determine if migration is needed
  analysis.needsMigration = analysis.hasNamespacedHook && !analysis.hasRootHook;

  return analysis;
}

/**
 * Migrate file content from namespaced to root hook pattern
 */
function migrateFileContent(content, analysis) {
  let newContent = content;
  const replacements = [];

  // Step 1: Replace all namespaced hooks with root hook
  for (const hook of analysis.namespacedHooks) {
    replacements.push({
      from: hook.fullMatch,
      to: `const t = useTranslations()`,
      type: 'hook-declaration'
    });
  }

  // Step 2: Update all translation calls to include full namespace path
  for (const call of analysis.translationCalls) {
    // Find which hook this call belongs to
    const matchingHook = analysis.namespacedHooks.find(h =>
      call.funcName === h.variableName
    );

    if (matchingHook) {
      const fullKey = `${matchingHook.namespace}.${call.key}`;
      const newCall = `t('${fullKey}')`;

      replacements.push({
        from: call.fullMatch,
        to: newCall,
        type: 'translation-call',
        oldKey: call.key,
        newKey: fullKey
      });
    }
  }

  // Apply replacements (in reverse order to maintain indices)
  replacements.sort((a, b) => content.lastIndexOf(a.from) - content.lastIndexOf(b.from));

  for (const replacement of replacements) {
    newContent = newContent.replace(replacement.from, replacement.to);
  }

  return { newContent, replacements };
}

/**
 * Process a single file
 */
function processFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');

    // Skip files that don't contain useTranslations
    if (!content.includes('useTranslations')) {
      return null;
    }

    const analysis = analyzeFile(content);

    if (!analysis.needsMigration) {
      return {
        path: filePath,
        status: analysis.hasRootHook ? 'already-root' : 'no-i18n',
        changes: 0
      };
    }

    const { newContent, replacements } = migrateFileContent(content, analysis);

    const result = {
      path: filePath,
      status: 'migrated',
      changes: replacements.length,
      details: {
        hooksConverted: analysis.namespacedHooks.length,
        callsUpdated: replacements.filter(r => r.type === 'translation-call').length,
        replacements: replacements.map(r => ({
          type: r.type,
          from: r.from,
          to: r.to,
          ...(r.oldKey && { oldKey: r.oldKey, newKey: r.newKey })
        }))
      }
    };

    if (!isDryRun) {
      writeFileSync(filePath, newContent, 'utf8');
    }

    return result;
  } catch (error) {
    return {
      path: filePath,
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Main execution
 */
async function main() {
  const files = findTsFiles(targetPath);
  console.log(`Found ${files.length} TypeScript files\n`);

  const results = [];
  let totalChanged = 0;
  let totalChanges = 0;

  for (const filePath of files) {
    const result = processFile(filePath);
    if (result) {
      results.push(result);
      if (result.status === 'migrated') {
        totalChanged++;
        totalChanges += result.changes;

        console.log(`✅ ${filePath.replace(process.cwd() + '/', '')}`);
        console.log(`   Hooks converted: ${result.details.hooksConverted}`);
        console.log(`   Calls updated: ${result.details.callsUpdated}`);

        if (result.details.replacements.length <= 5) {
          // Show details for small changes
          for (const repl of result.details.replacements.slice(0, 3)) {
            if (repl.type === 'translation-call') {
              console.log(`   📝 '${repl.oldKey}' → '${repl.newKey}'`);
            }
          }
        }
        console.log();
      } else if (result.status === 'error') {
        console.log(`❌ ${filePath}: ${result.error}`);
      }
    }
  }

  // Summary
  console.log('─'.repeat(50));
  console.log(`📊 Migration Summary:`);
  console.log(`Files processed: ${files.length}`);
  console.log(`Files migrated: ${totalChanged}`);
  console.log(`Total changes: ${totalChanges}`);
  console.log(`Files with root hooks: ${results.filter(r => r.status === 'already-root').length}`);
  console.log(`Files with errors: ${results.filter(r => r.status === 'error').length}`);

  if (isDryRun) {
    console.log(`\n💡 This was a dry run. Run without --dry-run to apply changes.`);
  } else {
    console.log(`\n✅ Migration complete! Run 'pnpm i18n:aggregate && pnpm check' to validate.`);
  }

  // Show files that need attention
  const errorFiles = results.filter(r => r.status === 'error');
  if (errorFiles.length > 0) {
    console.log(`\n❌ Files with errors:`);
    errorFiles.forEach(f => console.log(`   ${f.path}: ${f.error}`));
  }
}

main().catch(console.error);