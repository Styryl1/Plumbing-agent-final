import "server-only";
import { createHmac } from "crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import "~/lib/time";
import { serverOnlyEnv } from "~/lib/env";
import { getServiceDbForWebhook } from "~/server/db/serviceClient";

/**
 * Structured logging helper for webhook events
 */
function logWebhookEvent(
	level: "info" | "error",
	message: string,
	meta?: Record<string, unknown>,
): void {
	const logEntry = {
		timestamp: Temporal.Now.zonedDateTimeISO("Europe/Amsterdam").toString(),
		level,
		message,
		component: "webhook.moneybird",
		...meta,
	};
	// In production, this would go to structured logging service
	if (level === "error") {
		console.error("[WEBHOOK_ERROR]", JSON.stringify(logEntry));
	} else {
		console.warn("[WEBHOOK_INFO]", JSON.stringify(logEntry));
	}
}

// Moneybird webhook event schemas
const WebhookEventSchema = z.object({
	id: z.string().min(1),
	action: z.string().min(1),
	entity: z.string().min(1),
	entity_id: z.string().min(1),
	administration_id: z.string().min(1),
	created_at: z.string().min(1), // ISO datetime string from Moneybird
	data: z.record(z.string(), z.unknown()).optional(),
});

const MoneyBirdWebhookSchema = z.object({
	webhook_token: z.string().optional(), // Some Moneybird webhooks include this
	events: z.array(WebhookEventSchema),
});

// Invoice status mapping from Moneybird to our internal states
const STATUS_MAPPING: Record<string, string> = {
	draft: "draft",
	open: "sent",
	pending: "sent",
	paid: "paid",
	late: "overdue",
	uncollectible: "error",
	// Add more mappings as needed
};

/**
 * Database-backed idempotency check for webhook events
 */
async function isEventAlreadyProcessed(
	db: ReturnType<typeof getServiceDbForWebhook>,
	webhookId: string,
): Promise<boolean> {
	try {
		// Use typed query for webhook_events table
		const result = (await db
			.from("webhook_events")
			.select("id")
			.eq("webhook_id", webhookId)
			.eq("provider", "moneybird")
			.maybeSingle()) as {
			data: { id?: string } | null;
			error: unknown;
		};

		return result.data !== null;
	} catch {
		// If there's an error, assume not processed to avoid blocking
		return false;
	}
}

/**
 * Record webhook event as processed for idempotency
 */
async function recordEventProcessed(
	db: ReturnType<typeof getServiceDbForWebhook>,
	event: z.infer<typeof WebhookEventSchema>,
	orgId?: string,
): Promise<void> {
	const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");

	try {
		// Use typed insert for webhook_events table
		const { error } = await db.from("webhook_events").insert({
			webhook_id: event.id,
			provider: "moneybird",
			provider_event_id: event.id,
			event_type: event.action,
			entity_type: event.entity,
			entity_id: event.entity_id,
			processed_at: now.toString(),
			org_id: orgId ?? "",
		});

		// Ignore duplicate key errors (idempotency at database level)
		if (error && error.code !== "23505") {
			throw error;
		}
	} catch (insertError) {
		// Log but don't fail the webhook processing
		logWebhookEvent("error", "Failed to record webhook event", {
			webhookId: event.id,
			errorMessage:
				insertError instanceof Error ? insertError.message : "Unknown error",
		});
	}
}

/**
 * POST /api/webhooks/moneybird
 * Handles Moneybird webhook events with signature verification
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
	try {
		// Verify webhook secret from headers
		const signature = request.headers.get("x-moneybird-signature");
		const webhookSecret = serverOnlyEnv.MONEYBIRD_WEBHOOK_SECRET;

		if (!webhookSecret) {
			logWebhookEvent("error", "Moneybird webhook secret not configured");
			return NextResponse.json(
				{ error: "Webhook not configured" },
				{ status: 500 },
			);
		}

		if (!signature) {
			logWebhookEvent("error", "Missing webhook signature header");
			return NextResponse.json({ error: "Missing signature" }, { status: 401 });
		}

		// Get raw body for signature verification
		const rawBody = await request.text();

		// Verify HMAC signature
		const expectedSignature = createHmac("sha256", webhookSecret)
			.update(rawBody, "utf8")
			.digest("hex");

		const providedSignature = signature.replace(/^sha256=/, "");

		if (expectedSignature !== providedSignature) {
			logWebhookEvent("error", "Invalid webhook signature");
			return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
		}

		// Parse webhook payload
		let webhookData: z.infer<typeof MoneyBirdWebhookSchema>;
		try {
			webhookData = MoneyBirdWebhookSchema.parse(JSON.parse(rawBody));
		} catch (parseError) {
			logWebhookEvent("error", "Invalid webhook payload", { parseError });
			return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
		}

		// Use service client for webhook processing (verified external event)
		const db = getServiceDbForWebhook();
		let processedCount = 0;
		let skippedCount = 0;

		// Process each event
		for (const event of webhookData.events) {
			// Skip if already processed (database idempotency check)
			if (await isEventAlreadyProcessed(db, event.id)) {
				logWebhookEvent("info", "Skipping already processed event", {
					webhookId: event.id,
					eventType: event.action,
					entityId: event.entity_id,
				});
				skippedCount++;
				continue;
			}

			// Only process sales invoice events
			if (event.entity !== "SalesInvoice") {
				continue;
			}

			try {
				// Find invoice by external_id and administration_id
				const { data: invoiceData, error: fetchError } = await db
					.from("invoices")
					.select("id, org_id, provider_status, external_id")
					.eq("external_id", event.entity_id)
					.eq("provider", "moneybird")
					.single();

				if (fetchError?.code === "PGRST116") {
					// Invoice not found - might be from different org or not in our system
					continue;
				}

				if (fetchError) {
					continue;
				}

				// Map Moneybird status to our internal status
				const newStatus = STATUS_MAPPING[event.action] ?? "sent";

				// Skip if no status change needed
				if (invoiceData.provider_status === newStatus) {
					continue;
				}

				// Update invoice status with Temporal timestamp
				const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");
				const updateData: Record<string, unknown> = {
					provider_status: newStatus,
					updated_at: now.toString(),
				};

				// Set paid timestamp if payment received
				if (event.action === "paid") {
					updateData.paid_at = event.created_at;
				}

				// Handle sent timestamp
				if (event.action === "open" || event.action === "pending") {
					updateData.sent_at = event.created_at;
				}

				const { error: updateError } = await db
					.from("invoices")
					.update(updateData)
					.eq("id", invoiceData.id);

				if (updateError) {
					continue;
				}

				processedCount++;

				// Mark event as processed in database for idempotency
				await recordEventProcessed(db, event, invoiceData.org_id);
			} catch {
				// Continue processing other events
			}
		}

		logWebhookEvent("info", "Webhook processing completed", {
			processed: processedCount,
			skipped: skippedCount,
			total: webhookData.events.length,
		});

		return NextResponse.json({
			success: true,
			processed: processedCount,
			skipped: skippedCount,
		});
	} catch (error) {
		logWebhookEvent("error", "Webhook processing failed", { error });
		return NextResponse.json(
			{ error: "Webhook processing failed" },
			{ status: 500 },
		);
	}
}

/**
 * GET method to verify webhook endpoint is accessible
 */
export function GET(): NextResponse {
	const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");
	return NextResponse.json({
		status: "ok",
		webhook: "moneybird",
		timestamp: now.toString(),
	});
}
