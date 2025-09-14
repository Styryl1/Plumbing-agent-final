// scripts/guard.mjs
import { spawn } from "node:child_process";

const steps = [
	["format", ["biome", "format", "--write", "."]],
	["biome check", ["biome", "check", "--write", "."]],
	["eslint", ["pnpm", "-s", "lint"]],
	["typecheck", ["pnpm", "-s", "typecheck"]],
	["i18n doctor", ["pnpm", "-s", "i18n:doctor"]],
	["build", ["pnpm", "-s", "build"]],
	["unit tests", ["pnpm", "-s", "test"]],
	["e2e tests", ["pnpm", "-s", "e2e"]],
];

console.log("🔒 Guard Pipeline Starting");

for (const [label, cmd] of steps) {
	console.log(`\n━━ ${label} ━━`);
	const code = await new Promise((resolve) => {
		const childProcess = spawn(cmd[0], cmd.slice(1), {
			stdio: "inherit",
			shell: process.platform === "win32",
		});
		childProcess.on("close", resolve);
	});

	if (code !== 0) {
		console.error(`❌ ${label} failed with exit code ${code}`);
		process.exit(code);
	} else {
		console.log(`✅ ${label} passed`);
	}
}

console.log("\n🎉 All guard checks passed!");