#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const normalize = (value) => value.replace(/\r\n/g, "\n");

const input = await new Promise((res) => {
  let d = "";
  process.stdin.on("data", (c) => {
    d += c;
  });
  process.stdin.on("end", () => {
    res(d);
  });
});

const blocks = input.split("/// EDIT file:").slice(1);
if (!blocks.length) {
  console.error("No EDIT blocks found.");
  process.exit(1);
}

let changed = 0;
for (const b of blocks) {
  const [fileLine, ...rest] = b.split(/\r?\n/);
  const file = fileLine.trim();
  const text = rest.join("\n");

  const findTag = "//// FIND:";
  const replTag = "//// REPLACE WITH:";
  if (!text.includes(findTag) || !text.includes(replTag)) {
    throw new Error(`Bad EDIT block format for ${file}`);
  }

  const find = normalize(text.split(findTag)[1].split(replTag)[0].trim());
  const repl = normalize(text.split(replTag)[1].trim());

  const p = path.resolve(process.cwd(), file);
  const src = normalize(fs.readFileSync(p, "utf8"));

  if (!src.includes(find)) {
    throw new Error(`Context not found in ${file}.\n--- FIND ---\n${find}\n--------------`);
  }

  const out = src.replace(find, repl);
  if (out === src) {
    throw new Error(`No change after replace in ${file}.`);
  }

  fs.writeFileSync(p, out, "utf8");
  console.log(` Edited ${file}`);
  changed++;
}

console.log(`Done. ${changed} file(s) updated.`);
