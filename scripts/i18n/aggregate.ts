#!/usr/bin/env tsx
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';

const LOCALES = ['en', 'nl'];
const NAMESPACE_DIRS = LOCALES.map(locale => `src/i18n/messages/${locale}`);
const OUTPUT_DIR = 'src/i18n/messages';

interface Messages {
  [key: string]: any;
}

function buildNestedFromDotNotation(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // First pass: collect all dot-notation keys to understand conflicts
  const dotKeys = Object.keys(obj).filter(key => key.includes('.'));
  const conflictPrefixes = new Set<string>();

  for (const dotKey of dotKeys) {
    const parts = dotKey.split('.');
    for (let i = 1; i <= parts.length - 1; i++) {
      const prefix = parts.slice(0, i).join('.');
      conflictPrefixes.add(prefix);
    }
  }

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value !== 'string') {
      // If value is already an object, keep nested structure as-is
      result[key] = value;
      continue;
    }

    // Handle dot-notation keys like "form.name.label" or "actions.cancel"
    if (key.includes('.')) {
      const parts = key.split('.');
      let current = result;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i]!;
        if (!current[part]) {
          current[part] = {};
        } else if (typeof current[part] === 'string') {
          // Conflict detected - convert string to object and preserve the string value
          const stringValue = current[part];
          current[part] = { '_': stringValue };
        }
        current = current[part] as Record<string, unknown>;
      }

      const lastPart = parts[parts.length - 1]!;
      current[lastPart] = value;
    } else {
      // Simple key without dots - check for conflicts
      if (conflictPrefixes.has(key)) {
        // This key conflicts with dot-notation, use special '_' key
        result[key] = { '_': value };
      } else {
        result[key] = value;
      }
    }
  }

  return result;
}

async function loadNamespaceFiles(namespaceDir: string): Promise<Messages> {
  if (!existsSync(namespaceDir)) {
    console.warn(`⚠️  Namespace directory not found: ${namespaceDir}`);
    return {};
  }

  const files = await readdir(namespaceDir);
  const jsonFiles = files.filter(file => file.endsWith('.json'));

  const aggregated: Messages = {};

  for (const file of jsonFiles) {
    const namespace = file.replace('.json', '');
    const filePath = join(namespaceDir, file);

    try {
      const content = await readFile(filePath, 'utf-8');
      let data = JSON.parse(content);

      // Convert flat dot-notation keys to nested structure
      data = buildNestedFromDotNotation(data);
      aggregated[namespace] = data;

      console.log(`  ✓ ${file}: ${Object.keys(data).length} keys`);
    } catch (error) {
      console.error(`❌ Failed to parse ${filePath}: ${error}`);
      throw error;
    }
  }

  return aggregated;
}

async function main() {
  console.log('🔄 Aggregating namespace files into monolithic translations...\n');

  for (const locale of LOCALES) {
    console.log(`Processing ${locale.toUpperCase()}...`);

    const namespaceDir = `src/i18n/messages/${locale}`;
    const messages = await loadNamespaceFiles(namespaceDir);

    const totalKeys = Object.values(messages).reduce((sum, namespace) => {
      return sum + (typeof namespace === 'object' ? Object.keys(namespace).length : 0);
    }, 0);

    console.log(`  Total: ${totalKeys} keys`);

    // Write aggregated file
    const outputPath = join(OUTPUT_DIR, `${locale}.json`);
    const outputContent = JSON.stringify(messages, null, 2);

    await writeFile(outputPath, outputContent, 'utf-8');
    console.log(`  ✅ Written to ${outputPath}\n`);
  }

  console.log('✅ Translation aggregation complete!\n');

  console.log('📁 Output files:');
  for (const locale of LOCALES) {
    console.log(`  ${OUTPUT_DIR}/${locale}.json`);
  }

  console.log('\n💡 These files are automatically generated from the namespace files.');
  console.log('   Edit the namespace files in src/i18n/messages/{en,nl}/ instead.');
}

if (require.main === module) {
  main().catch(console.error);
}