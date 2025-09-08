// workbench/i18n/merge-missing-keys.ts
import fs from 'node:fs';
import path from 'node:path';

type Dict = Record<string, any>;

const guessLocaleFiles = (): { en: string; nl: string } => {
  const candidates = [
    ['src/i18n/messages/en.json', 'src/i18n/messages/nl.json'],
    ['src/messages/en.json', 'src/messages/nl.json'],
    ['messages/en.json', 'messages/nl.json'],
    ['src/i18n/en.json', 'src/i18n/nl.json'],
  ];
  for (const [en, nl] of candidates) {
    if (fs.existsSync(en) && fs.existsSync(nl)) return { en, nl };
  }
  throw new Error('Could not find locale files (en/nl). Update candidates in merge-missing-keys.ts.');
};

const setDeep = (obj: Dict, key: string, val: string) => {
  const parts = key.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] ??= {};
    cur = cur[parts[i]];
  }
  const leaf = parts[parts.length - 1]!;
  if (cur[leaf] == null) cur[leaf] = val;
};

const toTitle = (seg: string): string =>
  seg.replaceAll('_', ' ').replaceAll('-', ' ').replace(/\b\w/g, (m) => m.toUpperCase());

const placeholderFor = (key: string, locale: 'en' | 'nl'): string => {
  // Heuristic: last segment drives default label
  const last = key.split('.').pop() ?? key;
  const base =
    last === 'title' ? 'Title' :
    last === 'description' ? 'Description' :
    last === 'subtitle' ? 'Subtitle' :
    last === 'button' ? 'Button' :
    last === 'help' ? 'Help' :
    last === 'label' ? 'Label' :
    toTitle(last);
  if (locale === 'nl') return base; // mirror EN for now; translate later
  return base;
};

const loadJson = (p: string): Dict => JSON.parse(fs.readFileSync(p, 'utf8'));
const saveJson = (p: string, data: Dict) => {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
};

const main = () => {
  const missingPath = process.argv[2] ?? 'workbench/i18n/missing.txt';
  if (!fs.existsSync(missingPath)) {
    console.error(`Missing file: ${missingPath}`);
    process.exit(1);
  }
  const { en, nl } = guessLocaleFiles();
  const enJson = loadJson(en);
  const nlJson = loadJson(nl);
  const raw = fs.readFileSync(missingPath, 'utf8');
  const keys = raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);

  let addedCount = 0;
  for (const k of keys) {
    // Ignore template-literal-like keys proactively (we've refactored these)
    if (k.includes('${')) {
      console.log(`Skipping dynamic key: ${k}`);
      continue;
    }
    setDeep(enJson, k, placeholderFor(k, 'en'));
    setDeep(nlJson, k, placeholderFor(k, 'nl'));
    addedCount++;
  }

  saveJson(en, enJson);
  saveJson(nl, nlJson);
  console.log(`Merged ${addedCount} keys into:\n  - ${en}\n  - ${nl}`);
  if (addedCount < keys.length) {
    console.log(`Skipped ${keys.length - addedCount} dynamic keys`);
  }
};

main();