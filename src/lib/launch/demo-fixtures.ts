// Demo fixtures for the 7-step happy path demo
// Static data to showcase the plumber workflow without external API calls

export interface DemoStep {
	id: string;
	title: string;
	description: string;
	data: unknown;
}

export interface WhatsAppMessage {
	content: string;
	media_url?: string;
	timestamp: string;
	sender: "customer" | "business";
}

export interface AISuggestion {
	issue: string;
	urgency: "low" | "medium" | "high" | "emergency";
	confidence: number;
	time_estimate_min: number;
	materials: Array<{
		name: string;
		quantity: number;
		unit: string;
		price_cents: number;
	}>;
}

export interface ScheduleEvent {
	employee_name: string;
	employee_color: string;
	start_time: string;
	end_time: string;
	status: "scheduled" | "in_progress" | "completed";
}

export interface JobCard {
	title: string;
	customer_name: string;
	address: string;
	phone: string;
	start_time: string;
	estimated_duration: number;
	materials_needed: string[];
	notes: string;
}

export interface VoiceDraft {
	transcript: string;
	invoice_lines: Array<{
		description: string;
		quantity: number;
		unit_price_ex_vat_cents: number;
		vat_rate: number;
		total_inc_vat_cents: number;
	}>;
	subtotal_ex_vat_cents: number;
	vat_total_cents: number;
	total_inc_vat_cents: number;
}

export interface ProviderInvoice {
	provider: "moneybird" | "wefact" | "e-boekhouden";
	invoice_number: string;
	pdf_url: string;
	ubl_url: string;
	payment_url: string;
	due_date: string;
	status: "draft" | "sent" | "paid";
}

export interface ReminderSchedule {
	reminders: Array<{
		days_after: number;
		channel: "whatsapp" | "email";
		template: string;
		status: "scheduled" | "sent" | "delivered";
	}>;
}

export const demoSteps: DemoStep[] = [
	{
		id: "whatsapp",
		title: "Inbound WhatsApp",
		description: "Customer sends message + photo",
		data: {
			conversation: {
				customer_phone: "+31612345678",
				customer_name: "Jan Smit",
				messages: [
					{
						content:
							"Help! Mijn toilet loopt over en er staat water op de vloer! Ik weet niet wat ik moet doen 😱",
						media_url: "https://example.com/toilet-overflow.jpg",
						timestamp: "2024-12-07T09:15:00Z",
						sender: "customer" as const,
					},
					{
						content:
							"Hallo Jan, ik zie uw bericht. We gaan u direct helpen. Een monteur wordt zo mogelijk naar u gestuurd.",
						timestamp: "2024-12-07T09:16:00Z",
						sender: "business" as const,
					},
				] as WhatsAppMessage[],
			},
		},
	},
	{
		id: "ai_suggestion",
		title: "AI Analysis",
		description: "Issue diagnosis with time/material estimates",
		data: {
			suggestion: {
				issue: "Toilet overflow - mogelijk verstopt afvoer of defecte vlotter",
				urgency: "emergency" as const,
				confidence: 0.89,
				time_estimate_min: 60,
				materials: [
					{
						name: "Ontstopper professioneel",
						quantity: 1,
						unit: "st",
						price_cents: 1750, // €17.50
					},
					{
						name: "Vlotter reparatie set",
						quantity: 1,
						unit: "st",
						price_cents: 2250, // €22.50
					},
					{
						name: "Arbeid monteur (1 uur)",
						quantity: 1,
						unit: "uur",
						price_cents: 7500, // €75.00
					},
				],
			} as AISuggestion,
			confidence_indicator: {
				color: "emerald",
				percentage: 89,
				label: "Hoge betrouwbaarheid",
			},
		},
	},
	{
		id: "schedule",
		title: "Approve & Schedule",
		description: "Quick calendar assignment to available plumber",
		data: {
			event: {
				employee_name: "Alex van der Berg",
				employee_color: "#10b981", // emerald-500
				start_time: "2024-12-07T10:00:00Z",
				end_time: "2024-12-07T11:00:00Z",
				status: "scheduled" as const,
			} as ScheduleEvent,
			calendar_view: "day",
			assignment_method: "auto_nearest",
		},
	},
	{
		id: "job_card",
		title: "Job Card",
		description: "Mobile-friendly today view with timer and shortcuts",
		data: {
			job: {
				title: "Spoedklus - Toilet overflow",
				customer_name: "Jan Smit",
				address: "Prinsengracht 123, 1015 DX Amsterdam",
				phone: "+31612345678",
				start_time: "2024-12-07T10:00:00Z",
				estimated_duration: 60,
				materials_needed: ["Ontstopper professioneel", "Vlotter reparatie set"],
				notes:
					"Klant heeft water op de vloer, hoogste prioriteit. Bel aan bij hoofdingang.",
			} as JobCard,
			shortcuts: [
				{ action: "navigate", label: "Navigeren", icon: "map" },
				{ action: "call", label: "Bellen", icon: "phone" },
				{ action: "whatsapp", label: "WhatsApp", icon: "message" },
			],
		},
	},
	{
		id: "voice_draft",
		title: "Voice → Invoice Draft",
		description: "Speech-to-text creates invoice lines with VAT",
		data: {
			voice_draft: {
				transcript:
					"Toilet gerepareerd, verstopte afvoer ontstopt met professionele ontstopper. Vlotter vervangen omdat deze defect was. Totale tijd een uur gewerkt.",
				invoice_lines: [
					{
						description: "Ontstoppen toilet - spoed",
						quantity: 1,
						unit_price_ex_vat_cents: 4958, // €49.58 excl
						vat_rate: 21,
						total_inc_vat_cents: 6000, // €60.00 incl
					},
					{
						description: "Vlotter reparatie set + montage",
						quantity: 1,
						unit_price_ex_vat_cents: 1860, // €18.60 excl
						vat_rate: 21,
						total_inc_vat_cents: 2250, // €22.50 incl
					},
					{
						description: "Monteur arbeid (1 uur)",
						quantity: 1,
						unit_price_ex_vat_cents: 6198, // €61.98 excl
						vat_rate: 21,
						total_inc_vat_cents: 7500, // €75.00 incl
					},
				],
				subtotal_ex_vat_cents: 13016, // €130.16
				vat_total_cents: 2734, // €27.34
				total_inc_vat_cents: 15750, // €157.50
			} as VoiceDraft,
		},
	},
	{
		id: "send_pay",
		title: "Send & Pay",
		description: "Provider-issued PDF + iDEAL PaymentURL",
		data: {
			invoice: {
				provider: "moneybird" as const,
				invoice_number: "2024-0157",
				pdf_url: "https://moneybird.com/invoices/abc123.pdf",
				ubl_url: "https://moneybird.com/invoices/abc123.xml",
				payment_url: "https://www.mollie.com/paymentscreen/ideal/abc123def456",
				due_date: "2024-12-14T23:59:59Z", // 7 dagen
				status: "sent" as const,
			} as ProviderInvoice,
			payment_methods: ["ideal", "banktransfer", "creditcard"],
			send_channels: ["email", "whatsapp"],
		},
	},
	{
		id: "reminders",
		title: "Auto Reminders",
		description: "WhatsApp dunning sequence (+3/+7/+14 days)",
		data: {
			reminder_schedule: {
				reminders: [
					{
						days_after: 3,
						channel: "whatsapp" as const,
						template: "Vriendelijke herinnering: factuur vervalt over 4 dagen",
						status: "scheduled" as const,
					},
					{
						days_after: 7,
						channel: "whatsapp" as const,
						template: "Factuur vervallen - gelieve binnen 7 dagen te betalen",
						status: "scheduled" as const,
					},
					{
						days_after: 14,
						channel: "whatsapp" as const,
						template: "Laatste herinnering - factuur 7 dagen over vervaldatum",
						status: "scheduled" as const,
					},
				],
			} as ReminderSchedule,
			automation_settings: {
				enabled: true,
				opt_out_respected: true,
				escalation_enabled: true,
			},
		},
	},
];

export function getDemoStep(stepId: string): DemoStep | undefined {
	return demoSteps.find((step) => step.id === stepId);
}

export function getDemoStepIndex(stepId: string): number {
	return demoSteps.findIndex((step) => step.id === stepId);
}
