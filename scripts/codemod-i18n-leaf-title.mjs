import fs from "node:fs";
import path from "node:path";

const COLLISIONS = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "scripts", "i18n-collisions.json"), "utf8")
).common;

// Simple string replacement approach for small changes
function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if ([".next", ".turbo", "node_modules", "dist"].includes(entry.name)) continue;
      yield* walk(p);
    } else if (entry.isFile() && /\.(tsx?|jsx)$/.test(entry.name)) {
      yield p;
    }
  }
}

function transformFile(file) {
  const src = fs.readFileSync(file, "utf8");
  let newSrc = src;
  let changed = 0;

  for (const collision of COLLISIONS) {
    // Look for t("collision") and t('collision') patterns
    const patterns = [
      `t("${collision}")`,
      `t('${collision}')`,
    ];
    
    for (const pattern of patterns) {
      const replacement = pattern.replace(`"${collision}"`, `"${collision}.title"`).replace(`'${collision}'`, `'${collision}.title'`);
      if (newSrc.includes(pattern)) {
        newSrc = newSrc.replaceAll(pattern, replacement);
        changed++;
        console.log(`  Updated ${pattern} → ${replacement}`);
      }
    }
  }

  if (changed) {
    fs.writeFileSync(file, newSrc, "utf8");
    console.log(`✎ Updated ${file} (${changed} replacements)`);
  }
}

console.log(`Scanning for collisions: [${COLLISIONS.join(", ")}]`);
let totalFiles = 0;
let totalChanged = 0;

for (const file of walk(path.join(process.cwd(), "src"))) {
  const oldContent = fs.readFileSync(file, "utf8");
  transformFile(file);
  const newContent = fs.readFileSync(file, "utf8");
  if (oldContent !== newContent) {
    totalChanged++;
  }
  totalFiles++;
}
console.log(`✔ Codemod complete: scanned ${totalFiles} files, changed ${totalChanged} files`);