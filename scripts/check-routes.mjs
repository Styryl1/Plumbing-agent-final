#!/usr/bin/env node
import fs from "node:fs";

const A = "src/app/(dashboard)/page.tsx";
const B = "src/app/page.tsx";
const hasA = fs.existsSync(A);
const hasB = fs.existsSync(B);
if (hasA && hasB) {
	console.error(
		`\n✖ Route conflict: Both '${A}' and '${B}' exist. The root page will shadow (dashboard).\n→ Remove 'src/app/page.tsx' or move dashboard elsewhere.`,
	);
	process.exit(1);
}
console.log("✓ Routes OK (no root/(dashboard) shadow).");
