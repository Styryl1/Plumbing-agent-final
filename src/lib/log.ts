import { useTranslations } from "next-intl";

/**
 * Central logging utility with structured output
 * Use instead of console.log to maintain consistent logging
 */

interface LogContext {
	[key: string]: unknown;
}

function formatLog(level: string, message: string, context?: LogContext): void {
	const timestamp = Temporal.Now.instant().toString();
	const logData = {
		timestamp,
		level,
		message,
		...context,
	};

	// In production, this would go to a proper logging service
	// For now, using console methods that ESLint allows
	switch (level) {
		case "ERROR":
			console.error(JSON.stringify(logData));
			break;
		case "WARN":
			console.warn(JSON.stringify(logData));
			break;
		default:
			// INFO level - using console.warn as console.log is forbidden
			console.warn(JSON.stringify(logData));
	}
}

export const logger = {
	info: (message: string, context?: LogContext): void => {
		formatLog("INFO", message, context);
	},
	warn: (message: string, context?: LogContext): void => {
		formatLog("WARN", message, context);
	},
	error: (message: string, context?: LogContext): void => {
		formatLog("ERROR", message, context);
	},
};
