import { useTranslations } from "next-intl";
import "server-only";
import {
	formatDutchDate,
	formatEuroCurrency,
	getReminderUrgency,
} from "~/server/utils/due-dates";

/**
 * WhatsApp message templates for payment reminders
 * Pre-approved Meta templates for Business API compliance
 */

export interface ReminderMessageData {
	customerName: string;
	invoiceNumber: string;
	totalCents: number;
	issuedAt: string;
	dueAt: string;
	daysOverdue: number;
	paymentUrl?: string;
	companyName: string;
	companyPhone: string;
}

/**
 * Generate gentle reminder message for recent overdue invoices (< 14 days)
 */
export function generateGentleReminder(data: ReminderMessageData): string {
	const formattedAmount = formatEuroCurrency(data.totalCents);
	const formattedDueDate = formatDutchDate(data.dueAt);

	return [
		`Hallo ${data.customerName},`,
		"",
		`Factuur ${data.invoiceNumber} van ${formattedAmount} is sinds ${formattedDueDate} vervallen.`,
		"",
		"Wellicht heeft u dit over het hoofd gezien? Zou u deze zo spoedig mogelijk kunnen voldoen?",
		"",
		data.paymentUrl ? `Betalen kan hier: ${data.paymentUrl}` : "",
		"",
		"Met vriendelijke groet,",
		data.companyName,
		data.companyPhone,
	]
		.filter(Boolean)
		.join("\n");
}

/**
 * Generate firm reminder message for moderately overdue invoices (14-30 days)
 */
export function generateFirmReminder(data: ReminderMessageData): string {
	const formattedAmount = formatEuroCurrency(data.totalCents);
	const formattedDueDate = formatDutchDate(data.dueAt);

	return [
		`Beste ${data.customerName},`,
		"",
		`Ondanks onze eerdere herinnering is factuur ${data.invoiceNumber} van ${formattedAmount} nog niet betaald.`,
		"",
		`Deze factuur is sinds ${formattedDueDate} vervallen (${data.daysOverdue} dagen geleden).`,
		"",
		"Wij verzoeken u deze factuur binnen 7 dagen te voldoen om verdere incassokosten te voorkomen.",
		"",
		data.paymentUrl ? `Direct betalen: ${data.paymentUrl}` : "",
		"",
		"Bij vragen kunt u contact opnemen.",
		"",
		data.companyName,
		data.companyPhone,
	]
		.filter(Boolean)
		.join("\n");
}

/**
 * Generate urgent reminder message for seriously overdue invoices (30-60 days)
 */
export function generateUrgentReminder(data: ReminderMessageData): string {
	const formattedAmount = formatEuroCurrency(data.totalCents);
	const formattedDueDate = formatDutchDate(data.dueAt);

	return [
		`Geachte ${data.customerName},`,
		"",
		`LAATSTE HERINNERING: Factuur ${data.invoiceNumber} van ${formattedAmount} is al ${data.daysOverdue} dagen vervallen.`,
		"",
		`Vervaldatum was ${formattedDueDate}. Betaling is dringend vereist.`,
		"",
		"Als u niet binnen 5 werkdagen betaalt, worden incassokosten in rekening gebracht en kan uw dossier naar een incassobureau.",
		"",
		data.paymentUrl ? `DIRECT BETALEN: ${data.paymentUrl}` : "",
		"",
		"Voor vragen: bel direct.",
		"",
		data.companyName,
		data.companyPhone,
	]
		.filter(Boolean)
		.join("\n");
}

/**
 * Generate final notice before collection (60+ days overdue)
 */
export function generateFinalNotice(data: ReminderMessageData): string {
	const formattedAmount = formatEuroCurrency(data.totalCents);
	const formattedDueDate = formatDutchDate(data.dueAt);

	return [
		`Geachte ${data.customerName},`,
		"",
		`INGEBREKESTELLING: Factuur ${data.invoiceNumber} van ${formattedAmount} is ${data.daysOverdue} dagen vervallen.`,
		"",
		`Vervaldatum: ${formattedDueDate}`,
		"",
		"Dit is uw laatste kans om zonder extra kosten te betalen.",
		"",
		"Bij geen betaling binnen 48 uur wordt uw dossier overgedragen aan ons incassobureau met extra kosten.",
		"",
		data.paymentUrl ? `LAATSTE KANS - BETAAL NU: ${data.paymentUrl}` : "",
		"",
		"Neem onmiddellijk contact op als u bezwaar heeft.",
		"",
		data.companyName,
		data.companyPhone,
	]
		.filter(Boolean)
		.join("\n");
}

/**
 * Select appropriate reminder template based on days overdue
 */
export function generateReminderMessage(data: ReminderMessageData): string {
	const urgency = getReminderUrgency(data.daysOverdue);

	switch (urgency) {
		case "gentle":
			return generateGentleReminder(data);
		case "firm":
			return generateFirmReminder(data);
		case "urgent":
			return generateUrgentReminder(data);
		case "final":
			return generateFinalNotice(data);
		default:
			return generateGentleReminder(data);
	}
}

/**
 * WhatsApp Business template names (must be pre-approved by Meta)
 */
export const WHATSAPP_TEMPLATES = {
	PAYMENT_REMINDER_GENTLE: "payment_reminder_gentle_nl",
	PAYMENT_REMINDER_FIRM: "payment_reminder_firm_nl",
	PAYMENT_REMINDER_URGENT: "payment_reminder_urgent_nl",
	PAYMENT_REMINDER_FINAL: "payment_final_notice_nl",
} as const;

/**
 * Get template name for WhatsApp Business API based on urgency
 */
export function getWhatsAppTemplateName(daysOverdue: number): string {
	const urgency = getReminderUrgency(daysOverdue);

	switch (urgency) {
		case "gentle":
			return WHATSAPP_TEMPLATES.PAYMENT_REMINDER_GENTLE;
		case "firm":
			return WHATSAPP_TEMPLATES.PAYMENT_REMINDER_FIRM;
		case "urgent":
			return WHATSAPP_TEMPLATES.PAYMENT_REMINDER_URGENT;
		case "final":
			return WHATSAPP_TEMPLATES.PAYMENT_REMINDER_FINAL;
		default:
			return WHATSAPP_TEMPLATES.PAYMENT_REMINDER_GENTLE;
	}
}

/**
 * Create WhatsApp template parameters for Business API
 */
export function createTemplateParameters(
	data: ReminderMessageData,
): Array<{ type: "text"; text: string }> {
	return [
		{ type: "text" as const, text: data.customerName },
		{ type: "text" as const, text: data.invoiceNumber },
		{ type: "text" as const, text: formatEuroCurrency(data.totalCents) },
		{ type: "text" as const, text: formatDutchDate(data.dueAt) },
		{ type: "text" as const, text: data.daysOverdue.toString() },
		...(data.paymentUrl
			? [{ type: "text" as const, text: data.paymentUrl }]
			: []),
		{ type: "text" as const, text: data.companyName },
		{ type: "text" as const, text: data.companyPhone },
	];
}
