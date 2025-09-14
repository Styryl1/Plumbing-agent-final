/* eslint-disable no-console */
import * as fs from "node:fs/promises";
import * as path from "node:path";

type Json = Record<string, unknown>;
const ROOT = process.cwd();
const EN = path.join(ROOT, "src", "i18n", "messages", "en.json");
const SRC = path.join(ROOT, "src");

const isObj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

async function readJson(file: string): Promise<Json> {
  const raw = await fs.readFile(file, "utf8");
  const data = JSON.parse(raw);
  if (!isObj(data)) throw new Error(`Root not object in ${file}`);
  return data;
}

function leafs(obj: Json, prefix = ""): Set<string> {
  const out = new Set<string>();
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (isObj(v)) for (const x of leafs(v, p)) out.add(x);
    else out.add(p);
  }
  return out;
}

async function* walk(dir: string): AsyncGenerator<string> {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.isFile() && (p.endsWith(".ts") || p.endsWith(".tsx"))) yield p;
  }
}

async function main(): Promise<void> {
  const en = await readJson(EN);
  const valid = leafs(en);
  const missing = new Map<string, Set<string>>(); // file -> keys

  const tCall = /\bt\s*\(\s*["']([^"']+)["']\s*\)/g;

  for await (const file of walk(SRC)) {
    const code = await fs.readFile(file, "utf8");
    let m: RegExpExecArray | null;
    while ((m = tCall.exec(code))) {
      const key = m[1];
      if (key && !valid.has(key)) {
        if (!missing.has(file)) missing.set(file, new Set());
        missing.get(file)?.add(key);
      }
    }
  }

  if (missing.size === 0) {
    console.log("[i18n] OK: no missing keys referenced in code");
    return;
  }

  console.error("[i18n] Missing keys referenced in code:");
  for (const [file, keys] of missing) {
    for (const k of keys) console.error(`  ${file}: ${k}`);
  }
  process.exit(2);
}

main().catch(err => { console.error(err); process.exit(1); });