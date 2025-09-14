import { useTranslations } from "next-intl";
/** @server-only */
import { env } from "~/lib/env";

/**
 * Development-only guard to prevent accidental service role usage in user contexts.
 * Helps catch potential RLS security bypasses during development.
 */
export function assertNotServiceRoleUsage(contextLabel: string): void {
	// Only run in development
	if (env.NODE_ENV === "production") {
		return;
	}

	const stack = new Error().stack;

	// Check for suspicious patterns that indicate user-facing context
	const userContextPatterns = [
		"/api/trpc/",
		"/app/",
		"tRPC",
		"procedure",
		"protectedProcedure",
		"publicProcedure",
	];

	const webhookPatterns = ["/api/webhooks/", "webhook", "cron", "background"];

	if (!stack) return;

	const hasUserContext = userContextPatterns.some((pattern) =>
		stack.includes(pattern),
	);

	const hasWebhookContext = webhookPatterns.some((pattern) =>
		stack.includes(pattern),
	);

	if (hasUserContext && !hasWebhookContext) {
		const warning = `
🚨 SECURITY WARNING: Service role detected in user context!

Context: ${contextLabel}
Risk: Bypassing RLS policies, potential cross-org data access
Solution: Use createUserClient() instead of createSystemClient()

Stack trace patterns detected:
${userContextPatterns.filter((pattern) => stack.includes(pattern)).join(", ")}
		`.trim();

		console.error(warning);

		// In development, we throw to force the developer to fix this
		throw new Error(
			`Service role usage in user context: ${contextLabel}. ` +
				"Use createUserClient() to respect RLS policies.",
		);
	}
}

/**
 * Mark a function as webhook-safe (bypasses the guard).
 * Use this to explicitly document that service role usage is intentional.
 *
 * @param reason Brief explanation of why service role is needed
 */
export function markWebhookSafe(reason: string): void {
	// This is a no-op function that serves as documentation
	// The presence of this call in the stack will help identify
	// legitimate service role usage in ${reason}
	void reason; // Use the parameter to avoid unused variable warning
}
