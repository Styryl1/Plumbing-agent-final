#!/usr/bin/env node
// workbench/i18n/analyze-namespaces.mjs
import fs from 'node:fs';
import path from 'node:path';

/**
 * Analyze translation keys to identify the main namespaces
 */
const analyzeNamespaces = () => {
  const enPath = path.join(process.cwd(), 'src/i18n/messages/en.json');
  const enJson = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  
  const namespaces = new Map();
  const rootKeys = [];
  
  // Analyze all keys
  Object.keys(enJson).forEach(key => {
    const parts = key.split('.');
    
    if (parts.length === 1) {
      // Root level key
      rootKeys.push(key);
    } else {
      // Namespace key
      const namespace = parts[0];
      if (!namespaces.has(namespace)) {
        namespaces.set(namespace, { count: 0, keys: [] });
      }
      const nsData = namespaces.get(namespace);
      nsData.count++;
      nsData.keys.push(key);
    }
  });
  
  // Sort namespaces by key count (descending)
  const sortedNamespaces = Array.from(namespaces.entries())
    .sort(([, a], [, b]) => b.count - a.count);
  
  console.log('🔍 Namespace Analysis');
  console.log('=====================');
  console.log(`Total keys: ${Object.keys(enJson).length}`);
  console.log(`Root level keys: ${rootKeys.length}`);
  console.log(`Namespaced keys: ${Object.keys(enJson).length - rootKeys.length}`);
  console.log(`Unique namespaces: ${namespaces.size}\n`);
  
  console.log('📊 Namespaces by size:');
  sortedNamespaces.forEach(([namespace, data]) => {
    console.log(`  ${namespace.padEnd(20)} ${data.count.toString().padStart(4)} keys`);
  });
  
  if (rootKeys.length > 0) {
    console.log('\n🏠 Root level keys:');
    rootKeys.slice(0, 10).forEach(key => console.log(`  ${key}`));
    if (rootKeys.length > 10) {
      console.log(`  ... and ${rootKeys.length - 10} more`);
    }
  }
  
  // Suggest namespace groupings
  console.log('\n💡 Suggested namespace groupings:');
  console.log('  common.json      - Root level + shared keys (actions, ui, etc.)');
  
  const majorNamespaces = sortedNamespaces
    .filter(([, data]) => data.count >= 20)
    .map(([ns]) => ns);
  
  majorNamespaces.forEach(ns => {
    console.log(`  ${ns}.json`.padEnd(17) + `- ${namespaces.get(ns).count} keys`);
  });
  
  const minorNamespaces = sortedNamespaces
    .filter(([, data]) => data.count < 20)
    .map(([ns]) => ns);
  
  if (minorNamespaces.length > 0) {
    console.log(`  misc.json        - Minor namespaces (${minorNamespaces.join(', ')})`);
  }
};

analyzeNamespaces();