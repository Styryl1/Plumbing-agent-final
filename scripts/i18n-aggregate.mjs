#!/usr/bin/env node
// scripts/i18n-aggregate.mjs
import fs from 'node:fs';
import path from 'node:path';

/**
 * Aggregate namespace-based translation files into monolithic files for next-intl.
 * - Nest by filename namespace (e.g., en/launch.json => en.json.launch.*)
 * - If a file already wraps keys under its namespace, unwrap that level
 * - Expand dotted keys into nested objects for better type safety
 * - Deep sort output for stable diffs
 */
const aggregateTranslations = () => {
  console.log('🔄 Aggregating namespace files into monolithic translations...\n');

  const messagesDir = path.join(process.cwd(), 'src/i18n/messages');

  const setPath = (obj, pathArr, value) => {
    let cur = obj;
    for (let i = 0; i < pathArr.length - 1; i++) {
      const k = pathArr[i];
      if (typeof cur[k] !== 'object' || cur[k] === null || Array.isArray(cur[k])) cur[k] = {};
      cur = cur[k];
    }
    cur[pathArr[pathArr.length - 1]] = value;
  };

  const deepMerge = (a, b) => {
    if (!a || typeof a !== 'object' || Array.isArray(a)) a = {};
    for (const [k, v] of Object.entries(b)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        a[k] = deepMerge(a[k] ?? {}, v);
      } else {
        a[k] = v;
      }
    }
    return a;
  };

  const sortObject = (obj) => {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return obj;
    return Object.keys(obj).sort().reduce((acc, key) => {
      acc[key] = sortObject(obj[key]);
      return acc;
    }, {});
  };

  // Process each language
  ['en', 'nl'].forEach((locale) => {
    console.log(`Processing ${locale.toUpperCase()}...`);

    const localeDir = path.join(messagesDir, locale);
    const outputPath = path.join(messagesDir, `${locale}.json`);

    if (!fs.existsSync(localeDir)) {
      console.error(`  ✖ Directory ${localeDir} does not exist`);
      return;
    }

    // Read all namespace files
    const namespaceFiles = fs
      .readdirSync(localeDir)
      .filter((file) => file.endsWith('.json'))
      .sort(); // Ensure consistent ordering

    const aggregated = {};
    let totalKeys = 0;

    for (const file of namespaceFiles) {
      const filePath = path.join(localeDir, file);
      const namespace = path.basename(file, '.json');

      try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const keyCount = Object.keys(content).length;

        // Merge into nested object per filename namespace
        const target = (aggregated[namespace] = aggregated[namespace] ?? {});

        // Unwrap if file already contains a top-level namespace key
        if (Object.prototype.hasOwnProperty.call(content, namespace) && typeof content[namespace] === 'object') {
          Object.assign(target, deepMerge(target, content[namespace]));
        }

        // Merge remaining keys (expand dotted keys)
        for (const [k, v] of Object.entries(content)) {
          if (k === namespace) continue;
          if (k.includes('.')) {
            setPath(target, k.split('.'), v);
          } else if (v && typeof v === 'object' && !Array.isArray(v)) {
            target[k] = deepMerge(target[k] ?? {}, v);
          } else {
            target[k] = v;
          }
        }

        console.log(`  ✓ ${file}: ${keyCount} keys`);
        totalKeys += keyCount;
      } catch (error) {
        console.error(`  ✖ Error reading ${file}:`, error.message);
      }
    }

    // Deep sort keys for consistent output
    const sortedAggregated = sortObject(aggregated);

    // Write aggregated file
    fs.writeFileSync(outputPath, JSON.stringify(sortedAggregated, null, 2) + '\n');

    console.log(`  Total: ${totalKeys} keys`);
    console.log(`  ✅ Written to ${path.relative(process.cwd(), outputPath)}\n`);
  });

  console.log('✅ Translation aggregation complete!');
  console.log('\n📁 Output files:');
  console.log('  src/i18n/messages/en.json');
  console.log('  src/i18n/messages/nl.json');

  console.log('\n💡 These files are automatically generated from the namespace files.');
  console.log('   Edit the namespace files in src/i18n/messages/{en,nl}/ instead.');

  // Create README in namespace directories
  ['en', 'nl'].forEach((locale) => {
    const readmePath = path.join('src/i18n/messages', `${locale}`, 'README.md');
    const readmeContent = `# Translation Namespace Files

This directory contains translation files split by namespace for better maintainability.

## How it works

1. Edit these namespace files — not the parent \`${locale}.json\`
2. Run \`pnpm i18n:aggregate\` to rebuild the monolithic file
3. The parent \`${locale}.json\` is automatically generated for next-intl compatibility
`;

    fs.writeFileSync(readmePath, readmeContent);
  });

  console.log('\n📝 Created README files in namespace directories');
};

aggregateTranslations();

