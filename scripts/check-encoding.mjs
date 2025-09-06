#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const bad = [];
function shouldScan(p) {
	return /\.(ts|tsx|js|jsx|mjs|cjs|css|md|json)$/.test(p);
}
function walk(dir) {
	for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, e.name);
		if (e.isDirectory()) {
			if (
				!["node_modules", ".next", "dist", "coverage", ".git"].includes(e.name)
			)
				walk(p);
		} else if (shouldScan(p)) checkBom(p);
	}
}
function checkBom(p) {
	const fd = fs.openSync(p, "r");
	const buf = Buffer.alloc(3);
	fs.readSync(fd, buf, 0, 3, 0);
	fs.closeSync(fd);
	if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf)
		bad.push(p.replace(/\\/g, "/"));
}
walk(process.cwd());
if (bad.length) {
	console.error("\n✖ Files encoded with BOM (convert to UTF-8 no BOM):");
	for (const f of bad) console.error(" - " + f);
	process.exit(1);
}
console.log("✓ Encoding OK (UTF-8 no BOM).");
