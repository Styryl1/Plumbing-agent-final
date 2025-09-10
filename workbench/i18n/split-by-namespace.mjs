#!/usr/bin/env node
// workbench/i18n/split-by-namespace.mjs
import fs from 'node:fs';
import path from 'node:path';

/**
 * Split large translation files into smaller namespace-based files
 */
const splitByNamespace = () => {
  console.log('🔄 Splitting translation files by namespace...\n');

  // Define namespace groupings
  const namespaceGroups = {
    // Major namespaces get their own files
    'invoices': ['invoices'],
    'jobs': ['jobs', 'job'],
    'providers': ['providers'], 
    'customers': ['customers'],
    
    // UI-related namespaces
    'ui': ['form', 'table', 'field', 'nav', 'tabs', 'badge', 'badges'],
    
    // System/auth related
    'system': ['auth', 'app', 'pilot'],
    
    // Actions and interactions
    'actions': ['actions', 'action', 'cta'],
    
    // Common shared elements
    'common': ['stats', 'status', 'common', 'ui', 'dashboard', 'money', 'label', 'toast', 'meta', 'priority', 'schedule', 'test', 'numbers'],
    
    // WhatsApp and messaging
    'whatsapp': ['whatsapp'],
    
    // Employee management
    'employees': ['employees']
  };

  // Process both languages
  ['en', 'nl'].forEach(locale => {
    console.log(`Processing ${locale.toUpperCase()}...`);
    
    const inputPath = path.join(process.cwd(), `src/i18n/messages/${locale}.json`);
    const outputDir = path.join(process.cwd(), `src/i18n/messages/${locale}`);
    
    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Load source file
    const sourceJson = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    
    // Initialize namespace buckets
    const namespaceBuckets = {};
    Object.keys(namespaceGroups).forEach(group => {
      namespaceBuckets[group] = {};
    });
    namespaceBuckets['misc'] = {}; // For unmatched keys
    
    // Separate root keys (no dots) into common
    const rootKeys = {};
    
    // Sort keys into buckets
    Object.entries(sourceJson).forEach(([key, value]) => {
      const parts = key.split('.');
      
      if (parts.length === 1) {
        // Root level key goes to common
        rootKeys[key] = value;
        return;
      }
      
      const namespace = parts[0];
      let assigned = false;
      
      // Find which group this namespace belongs to
      for (const [groupName, namespaces] of Object.entries(namespaceGroups)) {
        if (namespaces.includes(namespace)) {
          namespaceBuckets[groupName][key] = value;
          assigned = true;
          break;
        }
      }
      
      // If not assigned to any group, put in misc
      if (!assigned) {
        namespaceBuckets['misc'][key] = value;
      }
    });
    
    // Add root keys to common
    Object.assign(namespaceBuckets['common'], rootKeys);
    
    // Write namespace files
    let totalWritten = 0;
    Object.entries(namespaceBuckets).forEach(([groupName, keys]) => {
      if (Object.keys(keys).length > 0) {
        const outputPath = path.join(outputDir, `${groupName}.json`);
        const sortedKeys = Object.keys(keys).sort().reduce((acc, key) => {
          acc[key] = keys[key];
          return acc;
        }, {});
        
        fs.writeFileSync(outputPath, JSON.stringify(sortedKeys, null, 2) + '\n');
        console.log(`  ✓ ${groupName}.json: ${Object.keys(keys).length} keys`);
        totalWritten += Object.keys(keys).length;
      }
    });
    
    console.log(`  Total: ${totalWritten} keys\\n`);
  });

  console.log('✅ Translation files split successfully!');
  console.log('\\n📁 New structure:');
  console.log('  src/i18n/messages/');
  console.log('  ├── en/');
  console.log('  │   ├── common.json');
  console.log('  │   ├── invoices.json');
  console.log('  │   ├── jobs.json');
  console.log('  │   ├── providers.json');
  console.log('  │   └── ...');
  console.log('  └── nl/');
  console.log('      ├── common.json');
  console.log('      └── ...');
};

splitByNamespace();