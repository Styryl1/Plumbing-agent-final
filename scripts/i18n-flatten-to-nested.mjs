// scripts/i18n-flatten-to-nested.mjs
import fs from "node:fs";
import path from "node:path";

function normalizeMessages(input) {
	const out = {};
	const setDeep = (obj, pathStr, value) => {
		const parts = pathStr.split(".");
		let cur = obj;
		for (let i = 0; i < parts.length; i++) {
			const key = REDACTED
			if (i === parts.length - 1) {
				cur[key] = value;
			} else {
				if (typeof cur[key] !== "object" || cur[key] === null) cur[key] = {};
				cur = cur[key];
			}
		}
	};
	let hasDot = false;
	for (const [k, v] of Object.entries(input)) {
		if (k.includes(".")) {
			hasDot = true;
			setDeep(out, k, v);
		} else {
			out[k] = v;
		}
	}
	return hasDot ? out : input;
}

const locales = ["en", "nl"];
for (const loc of locales) {
	const file = path.join(process.cwd(), "src/i18n/messages", `${loc}.json`);
	const raw = JSON.parse(fs.readFileSync(file, "utf8"));
	const normalized = normalizeMessages(raw);
	fs.writeFileSync(file, JSON.stringify(normalized, null, 2) + "\n", "utf8");
	console.log(`✔ normalized ${loc}.json`);
}