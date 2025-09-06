import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		// Safety: Don't fail if no tests found (protects CI from accidental runs)
		passWithNoTests: true,
		// Explicit per-file isolation to prevent state bleed
		isolate: true,
		sequence: { concurrent: false, shuffle: false },
		// Mock configuration: preserve implementations across tests
		clearMocks: true,        // Clear call history between tests
		restoreMocks: true,      // Restore original implementations after tests
		resetMocks: false,       // NEVER reset implementations - prevents db.rpc() becoming undefined
		// Add setup for environment validation
		setupFiles: [
			path.resolve(__dirname, "tests/_setup/env-safety.ts")
		],
		// Longer timeout for integration tests
		testTimeout: 30000,
		// Show warnings prominently
		silent: false,
	},
	resolve: {
		alias: {
			"~": path.resolve(__dirname, "../src"),
		},
	},
});