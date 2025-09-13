// node scripts/migrate-i18n-nesting.mjs
import fs from "node:fs";
import path from "node:path";

const roots = ["src/i18n/messages/en", "src/i18n/messages/nl"];
const isObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);

for (const dir of roots) {
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith(".json"))) {
    const fp = path.join(dir, file);
    const raw = JSON.parse(fs.readFileSync(fp, "utf8"));
    const out = structuredClone(raw);
    let changed = false;

    for (const [key, val] of Object.entries(raw)) {
      if (!key.includes(".")) continue;
      const [ns, ...rest] = key.split(".");
      if (!isObject(out[ns])) out[ns] = {};
      let cur = out[ns];
      for (let i = 0; i < rest.length - 1; i++) {
        const p = rest[i];
        if (!isObject(cur[p])) cur[p] = {};
        cur = cur[p];
      }
      cur[rest.at(-1)] = val;
      delete out[key];
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(fp, JSON.stringify(out, null, 2) + "\n");
      console.log("Nested:", fp);
    }
  }
}