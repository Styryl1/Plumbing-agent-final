#!/usr/bin/env node

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';

const sourceDir = 'src';
const extensions = ['.tsx', '.ts', '.jsx', '.js'];

// Map of undefined variables to their proper namespace prefixes
const namespaceMap = {
  'tControls': 'invoices.review.controls',
  'tBulkActions': 'invoices.review.bulkActions',
  'tList': 'invoices.review.list',
  'tResults': 'invoices.review.results',
  'tApprovals': 'approvals',
  'tInv': 'invoices',
  'tTable': 'invoices.table',
  'tAct': 'actions',
  'tActions': 'actions',
  'tCustomers': 'customers',
  'tCommon': 'common',
  'tWhatsApp': 'whatsapp',
  'tEmployees': 'employees',
  'tJobs': 'jobs',
  'tProviders': 'providers',
  'tSettings': 'settings'
};

async function getAllFiles(dir) {
  const files = [];

  async function traverse(currentDir) {
    try {
      const entries = await readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules, .next, dist, etc.
          if (['node_modules', '.next', 'dist', '.git', 'workbench'].includes(entry.name)) {
            continue;
          }
          await traverse(fullPath);
        } else if (entry.isFile()) {
          const ext = extname(entry.name);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  await traverse(dir);
  return files;
}

function fixNamespaceCalls(content) {
  let modified = false;
  let result = content;

  // Replace namespace variable calls with t() calls
  for (const [variable, namespace] of Object.entries(namespaceMap)) {
    // Pattern: tVariable("key") -> t("namespace.key")
    const pattern = new RegExp(`\\b${variable}\\(\\s*["']([^"']+)["']`, 'g');
    const matches = [...result.matchAll(pattern)];

    if (matches.length > 0) {
      console.log(`  🔧 Fixing ${matches.length} calls to ${variable}(...)`);
      modified = true;

      result = result.replace(pattern, (match, key) => {
        return `t("${namespace}.${key}"`;
      });
    }

    // Pattern: tVariable("key", { params }) -> t("namespace.key", { params })
    const patternWithParams = new RegExp(`\\b${variable}\\(\\s*["']([^"']+)["']\\s*,`, 'g');
    const matchesWithParams = [...result.matchAll(patternWithParams)];

    if (matchesWithParams.length > 0) {
      console.log(`  🔧 Fixing ${matchesWithParams.length} calls to ${variable}(...) with params`);
      modified = true;

      result = result.replace(patternWithParams, (match, key) => {
        return `t("${namespace}.${key}",`;
      });
    }
  }

  return { content: result, modified };
}

async function processFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');

    // Check if this file has any namespace calls before processing
    const hasNamespaceCalls = Object.keys(namespaceMap).some(variable =>
      content.includes(variable + '('));

    if (hasNamespaceCalls) {
      console.log(`🔍 Processing: ${filePath}`);
    }

    const { content: newContent, modified } = fixNamespaceCalls(content);

    if (modified) {
      await writeFile(filePath, newContent, 'utf8');
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔍 Finding namespace call violations...\n');

  const files = await getAllFiles(sourceDir);
  console.log(`📁 Scanning ${files.length} files...\n`);

  let fixedFiles = 0;
  let totalFixes = 0;

  for (const file of files) {
    const fixed = await processFile(file);
    if (fixed) {
      fixedFiles++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   Files processed: ${files.length}`);
  console.log(`   Files modified: ${fixedFiles}`);

  if (fixedFiles > 0) {
    console.log('\n✅ Namespace calls fixed! Run `pnpm check` to validate.');
  } else {
    console.log('\n🎉 No namespace call violations found!');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}