import fs from "node:fs";
import path from "node:path";

const LOCALES = ["en", "nl"];
const MSG_DIR = path.join(process.cwd(), "src/i18n/messages");
const COLLISIONS = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "scripts", "i18n-collisions.json"), "utf8")
).common;

// Heuristics: if siblings include 'description' -> use 'title' for parent value; else still 'title'
const LEAF_NAME = "title";

function ensureObj(host, k) {
  if (typeof host[k] !== "object" || host[k] === null || Array.isArray(host[k])) {
    host[k] = {};
  }
  return host[k];
}

function setDeepObject(root, pathStr, value) {
  const parts = pathStr.split(".");
  let cur = root;
  for (let i = 0; i < parts.length - 1; i++) {
    cur = ensureObj(cur, parts[i]);
  }
  cur[parts[parts.length - 1]] = value;
}

function getDeep(root, pathStr) {
  const parts = pathStr.split(".");
  let cur = root;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = cur[p];
  }
  return cur;
}

function hasChild(root, pathStr, child) {
  const node = getDeep(root, pathStr);
  return !!(node && typeof node === "object" && child in node);
}

for (const loc of LOCALES) {
  const file = path.join(MSG_DIR, `${loc}.json`);
  const data = JSON.parse(fs.readFileSync(file, "utf8"));

  for (const key of COLLISIONS) {
    // In flat JSON structure, both "auth.context" and "auth.context.description" are top-level keys
    const parentValue = data[key];
    if (typeof parentValue === "string") {
      // Move parent value to parent + ".title" and remove parent
      const newLeafKey = REDACTED
      data[newLeafKey] = parentValue;
      delete data[key];
      console.log(`  Moved "${key}" → "${newLeafKey}"`);
    }
  }

  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`✔ Migrated collisions in ${file}`);
}

console.log("✔ Completed migration: parent strings moved to '.title'");