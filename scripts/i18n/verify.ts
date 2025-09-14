/* eslint-disable no-console */
import * as path from "node:path";
import * as fs from "node:fs/promises";

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

function flatten(obj: Json, prefix = ""): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (isObj(v)) Object.assign(out, flatten(v as Json, key));
    else out[key] = v;
  }
  return out;
}

async function check(locale: string): Promise<void> {
  const file = path.join(process.cwd(), "src", "i18n", "messages", `${locale}.json`);
  const raw = await fs.readFile(file, "utf8");
  const data = JSON.parse(raw) as Json;
  const flat = flatten(data);
  const doubled = Object.keys(flat).filter(k => {
    const [a, b] = k.split(".");
    return a && b && a === b;
  });
  console.log(`[${locale}] keys: ${Object.keys(flat).length}`);
  if (doubled.length) {
    console.warn(`[${locale}] doubled namespaces: ${doubled.length}`, doubled.slice(0, 20));
    process.exitCode = 2;
  } else {
    console.log(`[${locale}] OK`);
  }
}

async function main(): Promise<void> {
  await check("en");
  await check("nl");
}

main().catch(err => { console.error(err); process.exit(1); });