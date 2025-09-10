#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "src/i18n/messages");
const enPath = path.join(root, "en.json");
const nlPath = path.join(root, "nl.json");

// Load the large translation files
const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
const nl = JSON.parse(fs.readFileSync(nlPath, "utf8"));

// Define namespace mapping - keys will be grouped by their first segment
const namespaceMapping = {
  // Main feature areas  
  invoices: ["invoices", "invoice"],
  jobs: ["jobs", "job"],
  customers: ["customers"],
  auth: ["auth"],
  providers: ["providers"],
  whatsapp: ["whatsapp"],
  
  // UI components and form elements
  ui: ["form", "field", "table", "stats", "nav", "tabs", "badges"],
  actions: ["actions", "cta"],
  common: ["common", "status", "priority"],
  
  // Settings and system
  settings: ["settings"],
  system: ["app", "locale", "meta", "notifications", "errors", "payment"],
  
  // Special categories
  launch: ["launch", "pilot", "benefits", "controls", "results", "list"],
  misc: [] // fallback for everything else
};

// Reverse mapping: prefix -> namespace
const prefixToNamespace = {};
Object.entries(namespaceMapping).forEach(([namespace, prefixes]) => {
  prefixes.forEach(prefix => {
    prefixToNamespace[prefix] = namespace;
  });
});

function getNamespace(key) {
  const prefix = key.split('.')[0];
  return prefixToNamespace[prefix] || 'misc';
}

function splitTranslations(translations, locale) {
  const namespaces = {};
  
  // Initialize all namespaces
  Object.keys(namespaceMapping).forEach(ns => {
    namespaces[ns] = {};
  });
  
  // Group keys by namespace
  Object.entries(translations).forEach(([key, value]) => {
    const namespace = getNamespace(key);
    namespaces[namespace][key] = value;
  });
  
  // Write namespace files
  const localeDir = path.join(root, locale);
  if (!fs.existsSync(localeDir)) {
    fs.mkdirSync(localeDir, { recursive: true });
  }
  
  let totalKeys = 0;
  Object.entries(namespaces).forEach(([namespace, keys]) => {
    if (Object.keys(keys).length > 0) {
      const filePath = path.join(localeDir, `${namespace}.json`);
      // Sort keys alphabetically for consistent output
      const sortedKeys = Object.fromEntries(
        Object.entries(keys).sort(([a], [b]) => a.localeCompare(b))
      );
      fs.writeFileSync(filePath, JSON.stringify(sortedKeys, null, 2) + '\n');
      console.log(`  ✓ ${namespace}.json: ${Object.keys(keys).length} keys`);
      totalKeys += Object.keys(keys).length;
    }
  });
  
  console.log(`  Total: ${totalKeys} keys`);
  return totalKeys;
}

console.log('🔄 Splitting translation files by namespace...');
console.log('');

console.log('Processing EN...');
const enTotal = splitTranslations(en, 'en');

console.log('');
console.log('Processing NL...');
const nlTotal = splitTranslations(nl, 'nl');

console.log('');
console.log('✅ Translation files split successfully!');
console.log('');
console.log('📁 New structure:');
console.log('  src/i18n/messages/');
console.log('  ├── en/');
Object.keys(namespaceMapping).forEach(ns => {
  const enFile = path.join(root, 'en', `${ns}.json`);
  if (fs.existsSync(enFile)) {
    console.log(`  │   ├── ${ns}.json`);
  }
});
console.log('  └── nl/');
console.log('      └── ...');