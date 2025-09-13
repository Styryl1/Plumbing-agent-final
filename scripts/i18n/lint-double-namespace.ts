#!/usr/bin/env tsx
import {readFile, readdir, stat} from 'node:fs/promises';
import path from 'node:path';

const exts = ['ts','tsx','js','jsx'];
const roots = ['src']; // add more if needed
const ignore = ['**/node_modules/**','**/.next/**','**/dist/**','**/workbench/**'];

const nsRe = /useTranslations\s*\(\s*['"]([^'"]+)['"]\s*\)/g;          // captures bound namespace
const rootRe = /useTranslations\s*\(\s*\)/;                             // root hook
const callRe = (ns:string) => new RegExp(String.raw`\bt[A-Za-z0-9_]*\(\s*['"]${ns}\.`, 'g');

let hadError = false;

async function checkFile(file:string) {
  const src = await readFile(file,'utf8');

  // Mixed pattern check: root hook + any namespaced hook in same file
  const hasRoot = rootRe.test(src);
  nsRe.lastIndex = 0;
  const nsInFile = Array.from(src.matchAll(nsRe)).map(m => m[1]).filter((ns): ns is string => ns != null);

  if (hasRoot && nsInFile.length > 0) {
    console.error(`❌ i18n: Mixed pattern (root + namespaced) in ${file}`);
    console.error(`   Found: useTranslations() + useTranslations('${nsInFile.join("', '")}')`);
    console.error(`   Fix: Use either all root hooks OR all namespaced hooks\n`);
    hadError = true;
  }

  // Double-namespace check for each bound namespace
  for (const ns of nsInFile) {
    const matches = Array.from(src.matchAll(callRe(ns)));
    if (matches.length > 0) {
      console.error(`❌ i18n: Double-namespace violation in ${file}`);
      console.error(`   Namespace: useTranslations('${ns}')`);
      console.error(`   Violations: ${matches.length} call(s) like t('${ns}.*')`);
      console.error(`   Fix: Use t('leaf-key') instead of t('${ns}.leaf-key')\n`);
      hadError = true;
    }
  }

  // Bare t() calls when using namespaced hooks (less critical, just warn)
  if (nsInFile.length > 0) {
    const bareCallRe = /\bt\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    const bareCalls = Array.from(src.matchAll(bareCallRe));

    for (const match of bareCalls) {
      const key = match[1];
      // Check if this key contains a dot (potential cross-namespace call)
      if (key && key.includes('.')) {
        const keyNs = key.split('.')[0];
        if (keyNs && !nsInFile.includes(keyNs)) {
          console.warn(`⚠️  i18n: Potential cross-namespace call in ${file}`);
          console.warn(`   Call: t('${key}') but no useTranslations('${keyNs}') found`);
          console.warn(`   Consider: const t${keyNs.charAt(0).toUpperCase() + keyNs.slice(1)} = useTranslations('${keyNs}')\n`);
        }
      }
    }
  }
}

async function findFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip ignored directories
        if (['node_modules', '.next', 'dist', 'workbench'].includes(entry.name)) {
          continue;
        }
        files.push(...await findFiles(fullPath));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).slice(1);
        if (exts.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    // Ignore directories we can't read
  }

  return files;
}

async function main() {
  console.log('🔍 i18n Lint: Checking for double-namespace violations...');

  let allFiles: string[] = [];
  for (const root of roots) {
    const files = await findFiles(root);
    allFiles.push(...files);
  }

  console.log(`📁 Scanning ${allFiles.length} files...`);

  await Promise.all(allFiles.map(checkFile));

  if (hadError) {
    console.error('\n🚨 i18n violations found. Please fix the issues above.');
    process.exit(1);
  } else {
    console.log('\n✅ i18n Lint: All files passed double-namespace validation');
  }
}

if (require.main === module) {
  main().catch(console.error);
}