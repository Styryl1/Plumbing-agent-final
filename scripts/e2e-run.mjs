// scripts/e2e-run.mjs
import { spawn } from "node:child_process";
import http from "node:http";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

function waitForServer(url, timeoutMs = 60000) {
	const start = Date.now();
	return new Promise((resolve, reject) => {
		const tick = () => {
			http
				.get(url, (res) => {
					if (res.statusCode && res.statusCode < 500) return resolve(true);
					scheduleNextTick();
				})
				.on("error", scheduleNextTick);
		};

		const scheduleNextTick = () => {
			if (Date.now() - start > timeoutMs) {
				return reject(new Error(`Server not ready after ${timeoutMs}ms`));
			}
			setTimeout(tick, 500);
		};

		tick();
	});
}

console.log("🎭 Starting E2E Test Runner");

let server;
try {
	// Start the Next.js server
	console.log("Starting Next.js server...");
	server = spawn("pnpm", ["-s", "start"], {
		stdio: "inherit",
		shell: process.platform === "win32",
	});

	// Wait for server to be ready
	console.log(`Waiting for server at ${BASE_URL}...`);
	await waitForServer(`${BASE_URL}/api/health`);
	console.log("✅ Server is ready");

	// Run Playwright tests
	console.log("Running Playwright tests...");
	const code = await new Promise((resolve) => {
		const playwrightProcess = spawn("npx", ["playwright", "test", "--reporter=line"], {
			stdio: "inherit",
			shell: process.platform === "win32",
		});
		playwrightProcess.on("close", resolve);
	});

	console.log(code === 0 ? "✅ E2E tests passed" : "❌ E2E tests failed");
	process.exit(code);
} catch (error) {
	console.error("❌ E2E runner failed:", error.message);
	process.exit(1);
} finally {
	if (server) {
		console.log("Stopping server...");
		server.kill("SIGTERM");
	}
}