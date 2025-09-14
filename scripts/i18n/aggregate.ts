/* eslint-disable no-console */
/**
 * Normalizes namespace files into src/i18n/messages/<locale>.json
 * Prevents double nesting (e.g., launch.launch.*) and strips dotted
 * prefixes matching the namespace (e.g., auth.context.*).
 */
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as path from "node:path";

type Json = Record<string, unknown>;
const ROOT = process.cwd();
const MSGS = path.join(ROOT, "src", "i18n", "messages");
const LOCALES = ["en", "nl"] as const;

const isObj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function mergeDeep(a: Json, b: Json): Json {
  for (const [k, v] of Object.entries(b)) {
    if (isObj(v)) a[k] = mergeDeep(isObj(a[k]) ? (a[k] as Json) : {}, v as Json);
    else a[k] = v;
  }
  return a;
}

function unwrapWrapper(obj: Json, ns: string): Json {
  if (ns in obj && isObj(obj[ns])) {
    const { [ns]: wrapped, ...rest } = obj;
    return { ...(wrapped as Json), ...rest };
  }
  return obj;
}

function flatten(obj: Json, prefix = ""): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (isObj(v)) Object.assign(out, flatten(v as Json, key));
    else out[key] = v;
  }
  return out;
}

function expand(flat: Record<string, unknown>): Json {
  const out: Json = {};
  for (const [dot, v] of Object.entries(flat)) {
    const parts = dot.split(".");
    let cur = out;
    while (parts.length > 1) {
      const p = parts.shift()!;
      if (!isObj(cur[p])) cur[p] = {};
      cur = cur[p] as Json;
    }
    cur[parts[0]!] = v;
  }
  return out;
}

function stripNsPrefix(flat: Record<string, unknown>, ns: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const pref = `${ns}.`;
  for (const [k, v] of Object.entries(flat)) {
    out[k.startsWith(pref) ? k.slice(pref.length) : k] = v;
  }
  return out;
}

async function readJson(file: string): Promise<Json> {
  const raw = await fsp.readFile(file, "utf8");
  const data = JSON.parse(raw);
  if (!isObj(data)) throw new Error(`Root not object in ${file}`);
  return data;
}

async function* walk(dir: string): AsyncGenerator<string> {
  for (const e of await fsp.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.isFile() && p.endsWith(".json")) yield p;
  }
}

async function aggregate(locale: string): Promise<void> {
  const localeDir = path.join(MSGS, locale);
  const outFile = path.join(MSGS, `${locale}.json`);
  const aggregated: Json = {};

  for await (const file of walk(localeDir)) {
    if (path.basename(file) === `${locale}.json`) continue;
    const ns = path.basename(file, ".json");
    const original = await readJson(file);

    const unwrapped = unwrapWrapper(clone(original), ns);
    const flat = flatten(unwrapped);
    const stripped = stripNsPrefix(flat, ns);
    const node = expand(stripped);
    aggregated[ns] = mergeDeep(isObj(aggregated[ns]) ? (aggregated[ns] as Json) : {}, node);
  }

  await fsp.writeFile(outFile, JSON.stringify(aggregated, null, 2) + "\n", "utf8");
  // sanity warning
  const flatOut = flatten(aggregated);
  const doubled = Object.keys(flatOut).filter(k => {
    const parts = k.split(".").slice(0, 2);
    return parts.length === 2 && parts[0] === parts[1];
  });
  if (doubled.length) console.warn(`[warn] ${locale}: doubled keys example:`, doubled.slice(0,10));
  console.log(`[i18n] wrote ${outFile} with ${Object.keys(flatOut).length} keys`);
}

async function main(): Promise<void> {
  for (const l of LOCALES) await aggregate(l);
}
main().catch(err => { console.error(err); process.exit(1); });