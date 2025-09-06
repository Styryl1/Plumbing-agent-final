#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const SRC = "src";
const bad = [];
const okRelativeDirs = new Set(["scripts", "server", "lib"]); // allow internals here

function isTextFile(p) {
	return /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(p);
}
function walk(dir) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, entry.name);
		if (entry.isDirectory()) walk(p);
		else if (isTextFile(p)) checkFile(p);
	}
}
function checkFile(p) {
	const rel = p.replace(/\\/g, "/");
	const txt = fs.readFileSync(p, "utf8");
	const inApp = rel.startsWith("src/app/");
	const base = rel.split("/").slice(2, 3)[0]; // e.g. "app", "lib", "server"

	// ban "@/"
	if (/@\//.test(txt)) bad.push([rel, "Disallowed alias '@/'. Use '~/'"]);

	// ban parent-relative imports in app/, allow in some infra dirs
	const allowRel = okRelativeDirs.has(base);
	if (!allowRel && inApp) {
		const relImport = /^\s*import\s+[^'"]*from\s+['"]\.\.\/.*?['"];?/gm;
		if (relImport.test(txt))
			bad.push([rel, "Parent-relative import found. Use '~/' alias"]);
	}
}
if (!fs.existsSync(SRC)) {
	console.log("No src/ directory. Skipping import checks.");
	process.exit(0);
}
walk(SRC);
if (bad.length) {
	console.error("\n✖ Import hygiene failed:");
	for (const [file, msg] of bad) console.error(` - ${file}: ${msg}`);
	process.exit(1);
}
console.log("✓ Imports OK (~/ only, no @/ or parent-relative in app/).");
