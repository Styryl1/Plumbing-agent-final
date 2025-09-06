/**
 * Error handling utilities for type-safe error management
 * Ensures no unsafe assignments and proper error narrowing
 */

/**
 * Extract error message from unknown error type
 * Used in catch blocks to safely handle errors
 */
export function errMsg(e: unknown): string {
	if (e instanceof Error) {
		return e.message;
	}
	if (typeof e === "string") {
		return e;
	}
	if (
		e != null &&
		typeof e === "object" &&
		"message" in e &&
		typeof e.message === "string"
	) {
		return e.message;
	}
	return "Unknown error occurred";
}

/**
 * Create a structured error response for tRPC
 */
export function createErrorResponse(e: unknown): {
	success: false;
	error: string;
} {
	return {
		success: false,
		error: errMsg(e),
	};
}

/**
 * Type guard to check if value is an Error
 */
export function isError(value: unknown): value is Error {
	return value instanceof Error;
}

/**
 * Create a typed error with additional context
 */
export class AppError extends Error {
	constructor(
		message: string,
		public readonly code?: string,
		public readonly context?: Record<string, unknown>,
	) {
		super(message);
		this.name = "AppError";
	}
}

/**
 * Log error for monitoring (replace console.error)
 * In production, this would send to monitoring service
 */
export function logError(
	error: unknown,
	context?: Record<string, unknown>,
): void {
	// Use console.error only for actual errors (allowed by ESLint)
	console.error("Application Error:", {
		message: errMsg(error),
		context,
		timestamp: Temporal.Now.instant().toString(),
		stack: isError(error) ? error.stack : undefined,
	});
}

/**
 * Wrap async functions for consistent error handling
 */
export async function tryCatch<T>(
	fn: () => Promise<T>,
	fallback?: T,
): Promise<T | undefined> {
	try {
		return await fn();
	} catch (error) {
		logError(error);
		return fallback;
	}
}
