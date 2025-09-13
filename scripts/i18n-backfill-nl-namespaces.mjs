#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "src/i18n/messages");
const enAgg = JSON.parse(fs.readFileSync(path.join(root, "en.json"), "utf8"));
const nlAgg = JSON.parse(fs.readFileSync(path.join(root, "nl.json"), "utf8"));

const flatten = (o, p = "", out = {}) => {
  for (const [k, v] of Object.entries(o)) {
    const key = REDACTED
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
};

const flatEn = flatten(enAgg);
const flatNl = flatten(nlAgg);

const targetMaps = [
  {prefix: "settings.", file: "settings.json"},
  {prefix: "launch.", file: "launch.json"},
  {prefix: "customers.", file: "customers.json"},
  {prefix: "providers.", file: "providers.json"},
  {prefix: "job_card_mobile.", file: "misc.json"},
  {prefix: "common.", file: "common.json"},
  {prefix: "", file: "misc.json"} // default
];

const chooseFile = (key) =>
  (targetMaps.find(m => key.startsWith(m.prefix)) ?? targetMaps.at(-1)).file;

const ensureNested = (obj, pathParts) => {
  let cur = obj;
  for (let i = 0; i < pathParts.length - 1; i++) {
    const seg = pathParts[i];
    cur[seg] ??= {};
    cur = cur[seg];
  }
  return cur;
};

let added = 0;
for (const [key, enVal] of Object.entries(flatEn)) {
  if (flatNl[key] !== undefined) continue; // already present
  const file = path.join(root, "nl", chooseFile(key));
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const parts = key.split(".");
  const leafParent = ensureNested(data, parts);
  const leafKey = REDACTED
  if (typeof enVal === "string" && leafParent[leafKey] === undefined) {
    leafParent[leafKey] = enVal; // EN fallback text in NL file (safe)
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
    added++;
  }
}
console.log(`i18n-backfill-nl-namespaces: added ${added} keys to nl/* files`);