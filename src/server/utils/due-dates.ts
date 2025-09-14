import { useTranslations } from "next-intl";
import "server-only";
import "~/lib/time";

/**
 * Payment terms supported by the system
 */
export const PAYMENT_TERMS = {
	"14 days": 14,
	"21 days": 21,
	"30 days": 30,
	"60 days": 60,
	"90 days": 90,
} as const;

export type PaymentTerms = keyof typeof PAYMENT_TERMS;

/**
 * Calculate due date from issued date and payment terms
 * Always uses Europe/Amsterdam timezone for consistency
 */
export function calculateDueDate(
	issuedAt: string | Temporal.ZonedDateTime,
	paymentTerms: PaymentTerms = "30 days",
): Temporal.ZonedDateTime {
	const issued =
		typeof issuedAt === "string"
			? Temporal.Instant.from(issuedAt).toZonedDateTimeISO("Europe/Amsterdam")
			: issuedAt;

	const daysToAdd = PAYMENT_TERMS[paymentTerms];
	return issued.add({ days: daysToAdd });
}

/**
 * Calculate number of days an invoice is overdue
 * Returns 0 if not overdue or due date is null
 */
export function daysOverdue(dueAt: string | null | undefined): number {
	if (!dueAt) return 0;

	const due =
		Temporal.Instant.from(dueAt).toZonedDateTimeISO("Europe/Amsterdam");
	const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");

	if (due.epochMilliseconds >= now.epochMilliseconds) {
		return 0; // Not overdue
	}

	const duration = now.since(due, { largestUnit: "day" });
	return Math.floor(duration.total("day"));
}

/**
 * Categorize overdue severity for dunning escalation
 */
export function getOverdueSeverity(
	days: number,
): "current" | "mild" | "moderate" | "severe" {
	if (days === 0) return "current";
	if (days < 7) return "mild";
	if (days < 30) return "moderate";
	return "severe";
}

/**
 * Calculate next reminder date based on invoice age and reminder count
 * Uses escalating schedule: 7, 14, 30, 60 days overdue
 */
export function calculateNextReminderDate(
	dueAt: string | null,
	reminderCount: number,
): Temporal.ZonedDateTime | null {
	if (!dueAt) return null;

	const due =
		Temporal.Instant.from(dueAt).toZonedDateTimeISO("Europe/Amsterdam");

	// Escalating reminder schedule
	const reminderSchedule = [7, 14, 30, 60]; // Days after due date
	const daysAfterDue =
		reminderSchedule[Math.min(reminderCount, reminderSchedule.length - 1)];

	if (!daysAfterDue) return null;

	return due.add({ days: daysAfterDue });
}

/**
 * Check if an invoice is eligible for reminder
 * Must be: unpaid, overdue, customer not opted out, not recently reminded
 */
export interface ReminderEligibilityParams {
	paidAt: string | null;
	dueAt: string | null;
	lastReminderAt: string | null;
	customerOptOut: boolean;
	reminderCount: number;
	maxReminders?: number;
}

export function isEligibleForReminder(
	params: ReminderEligibilityParams,
): boolean {
	const {
		paidAt,
		dueAt,
		lastReminderAt,
		customerOptOut,
		reminderCount,
		maxReminders = 4,
	} = params;

	// Must be unpaid
	if (paidAt) return false;

	// Must have due date
	if (!dueAt) return false;

	// Customer must not have opted out
	if (customerOptOut) return false;

	// Must not exceed max reminders
	if (reminderCount >= maxReminders) return false;

	// Must be overdue
	if (daysOverdue(dueAt) === 0) return false;

	// Must not have been reminded recently (minimum 3 days between reminders)
	if (lastReminderAt) {
		const lastReminder =
			Temporal.Instant.from(lastReminderAt).toZonedDateTimeISO(
				"Europe/Amsterdam",
			);
		const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");
		const daysSinceLastReminder = Math.floor(
			now.since(lastReminder, { largestUnit: "day" }).total("day"),
		);

		if (daysSinceLastReminder < 3) return false;
	}

	return true;
}

/**
 * Format currency for Dutch locale (used in reminder messages)
 */
export function formatEuroCurrency(cents: number): string {
	return (cents / 100).toLocaleString("nl-NL", {
		style: "currency",
		currency: "EUR",
	});
}

/**
 * Format date for Dutch locale (used in reminder messages)
 */
export function formatDutchDate(dateString: string): string {
	const date =
		Temporal.Instant.from(dateString).toZonedDateTimeISO("Europe/Amsterdam");
	return date.toLocaleString("nl-NL", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

/**
 * Get reminder urgency level based on days overdue
 * Used to select appropriate message templates
 */
export function getReminderUrgency(
	daysOverdue: number,
): "gentle" | "firm" | "urgent" | "final" {
	if (daysOverdue < 14) return "gentle";
	if (daysOverdue < 30) return "firm";
	if (daysOverdue < 60) return "urgent";
	return "final";
}
