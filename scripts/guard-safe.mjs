// scripts/guard-safe.mjs
// Safe guard runner that captures all validation results without early exit
// Used by pnpm context to include comprehensive validation status in bundles

import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const steps = [
	["biome format", ["biome", "format", "--write", "."]],
	["biome check", ["biome", "check", "--write", "."]],
	["eslint", ["pnpm", "-s", "lint"]],
	["typecheck", ["pnpm", "-s", "typecheck"]],
	["i18n doctor", ["pnpm", "-s", "i18n:doctor"]],
	["build", ["pnpm", "-s", "build"]],
	["unit tests", ["pnpm", "-s", "test"]],
];

console.log("🛡️  Guard-Safe: Running all validation checks (non-failing mode)");

const results = [];
let overallStatus = "PASSED";

for (const [label, cmd] of steps) {
	console.log(`\n━━ ${label} ━━`);

	const startTime = Date.now();
	const code = await new Promise((resolve) => {
		const childProcess = spawn(cmd[0], cmd.slice(1), {
			stdio: "inherit",
			shell: process.platform === "win32",
		});
		childProcess.on("close", resolve);
	});
	const duration = Date.now() - startTime;

	const status = code === 0 ? "PASS" : "FAIL";
	const result = {
		step: label,
		status,
		code,
		duration: `${duration}ms`,
		timestamp: new Date().toISOString(),
	};

	results.push(result);

	if (code !== 0) {
		overallStatus = "FAILED";
		console.log(`❌ ${label} failed with exit code ${code}`);
	} else {
		console.log(`✅ ${label} passed`);
	}

	// Continue to next step regardless of failure
}

// Generate comprehensive report
const report = {
	overall: overallStatus,
	timestamp: new Date().toISOString(),
	totalSteps: steps.length,
	passed: results.filter(r => r.status === "PASS").length,
	failed: results.filter(r => r.status === "FAIL").length,
	results,
};

// Write detailed results for context bundling
const reportContent = `# Guard-Safe Results

**Overall Status**: ${overallStatus}
**Timestamp**: ${report.timestamp}
**Results**: ${report.passed}/${report.totalSteps} checks passed

## Detailed Results

${results.map(r =>
	`### ${r.step}
- **Status**: ${r.status}
- **Exit Code**: ${r.code}
- **Duration**: ${r.duration}
- **Time**: ${r.timestamp}`
).join('\n\n')}

## Summary

${overallStatus === "PASSED"
	? "🎉 All validation checks passed successfully!"
	: `⚠️  ${report.failed} checks failed. Review the output above for details.`
}
`;

writeFileSync("GUARD_RESULTS.md", reportContent);

console.log(`\n📊 Guard-Safe Summary: ${report.passed}/${report.totalSteps} checks passed`);
console.log(`📝 Detailed report written to GUARD_RESULTS.md`);

// Always exit with 0 in safe mode - failures are captured in report
process.exit(0);