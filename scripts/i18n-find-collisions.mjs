import fs from "node:fs";
import path from "node:path";

const LOCALES = ["en", "nl"];
const MSG_DIR = path.join(process.cwd(), "src/i18n/messages");

function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = REDACTED
    if (v && typeof v === "object" && !Array.isArray(v)) {
      flatten(v, key, out);
    } else {
      out[key] = v;
    }
  }
  return out;
}

function findCollisions(nested) {
  const flat = flatten(nested);
  const keys = Object.keys(flat).sort();
  const hasDescendant = new Set();

  // Build a trie-ish set: for each key, mark all parents that have children
  for (const k of keys) {
    const parts = k.split(".");
    for (let i = 1; i < parts.length; i++) {
      const parent = parts.slice(0, i).join(".");
      hasDescendant.add(parent);
    }
  }

  // A collision is when key exists AND also has descendants
  const collisions = [];
  for (const k of keys) {
    if (hasDescendant.has(k)) collisions.push(k);
  }
  return collisions;
}

const report = {};
for (const loc of LOCALES) {
  const file = path.join(MSG_DIR, `${loc}.json`);
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  report[loc] = findCollisions(json);
}

const common = [...new Set(LOCALES.reduce((a, l) => a.concat(report[l]), []))].sort();
const out = { byLocale: report, common };
const outFile = path.join(process.cwd(), "scripts", "i18n-collisions.json");
fs.writeFileSync(outFile, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`✔ Wrote ${outFile}`);
console.log("Common collisions:", common);