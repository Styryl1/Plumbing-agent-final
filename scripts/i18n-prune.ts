#!/usr/bin/env tsx
/**
 * i18n Prune & Archive Script
 * 
 * Enforces clean runtime JSON by:
 * 1. Failing if _orphans exist in runtime files
 * 2. Filling missing NL keys from EN (with placeholders)
 * 3. Archiving extra NL keys to timestamped files
 * 4. Never loading archived files at runtime
 */

/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src/i18n/messages");
const archiveDir = path.resolve("src/i18n/archive");
const enPath = path.join(root, "en.json");
const nlPath = path.join(root, "nl.json");

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object";

const readJson = (p: string): unknown => JSON.parse(fs.readFileSync(p, "utf8"));
const writeJson = (p: string, v: unknown): void => fs.writeFileSync(p, JSON.stringify(v, null, 2) + "\n", "utf8");

const en = readJson(enPath);
const nl = readJson(nlPath);

// 0) Assert no _orphans in runtime JSON
for (const [name, obj] of [["en.json", en], ["nl.json", nl]]) {
  if (isObj(obj) && "_orphans" in obj) {
    console.error(`[i18n-prune] ERROR: ${name} contains _orphans. Remove it manually before running prune.`);
    process.exit(1);
  }
}

function leafs(o: any, p = ""): string[] {
  return Object.entries(o).flatMap(([k, v]) => {
    const key = p ? `${p}.${k}` : k;
    if (typeof v === "string") return [key];
    if (isObj(v)) return leafs(v, key);
    throw new Error(`Invalid non-string at ${key}`);
  });
}

function get(o: any, k: string): unknown {
  return k.split(".").reduce((a, p) => (a ? (a as any)[p] : undefined), o);
}

function set(o: any, k: string, val: unknown): void {
  const parts = k.split(".");
  let cur = o;
  for (let i = 0; i < parts.length; i++) {
    const key = parts[i]!;
    if (i === parts.length - 1) {
      if (val === undefined) {
        if (isObj(cur)) delete (cur as any)[key];
      } else {
        if (!isObj(cur)) throw new Error(`Cannot set ${k} on non-object`);
        (cur as any)[key] = val;
      }
    } else {
      if (!isObj((cur as any)[key])) (cur as any)[key] = {};
      cur = (cur as any)[key];
    }
  }
}

const enKeys = new Set(leafs(en));
const nlKeys = new Set(leafs(nl));

const missingInNl: string[] = [];
const extraInNl: string[] = [];

// 1) Fill missing in NL from EN (or placeholder)
for (const k of enKeys) {
  if (!nlKeys.has(k)) {
    missingInNl.push(k);
    const seed = get(en, k);
    set(nl, k, typeof seed === "string" && seed.trim() ? seed : "__TODO__");
  }
}

// 2) Archive extras in NL (remove from runtime)
for (const k of nlKeys) {
  if (!enKeys.has(k)) extraInNl.push(k);
}

if (extraInNl.length > 0) {
  const archived: Record<string, string> = {};
  for (const k of extraInNl) {
    const v = get(nl, k);
    if (typeof v === "string") archived[k] = v as string;
  }
  fs.mkdirSync(archiveDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outFile = path.join(archiveDir, `nl.orphans-${stamp}.json`);
  writeJson(outFile, archived);
  for (const k of extraInNl) set(nl, k, undefined);
  console.log(`[i18n-prune] Archived ${extraInNl.length} extras → ${path.relative(process.cwd(), outFile)}`);
}

writeJson(nlPath, nl);
console.log(`[i18n-prune] Done. Missing filled: ${missingInNl.length}, Pruned extras: ${extraInNl.length}`);