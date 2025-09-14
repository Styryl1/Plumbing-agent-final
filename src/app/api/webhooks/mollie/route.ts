/**
 * Mollie Payment Webhook Handler
 *
 * Processes payment status updates from Mollie (iDEAL, credit card, etc).
 * Uses idempotent processing via webhook_events table and proper security verification.
 */

import { NextResponse } from "next/server";
import "~/lib/time";
import { serverOnlyEnv } from "~/lib/env";
import { getAdminDb } from "~/lib/supabase";
import { reconcileFromPayment } from "~/server/payments/mollie/adapter";
import { MollieClient } from "~/server/payments/mollie/client";

export async function POST(request: Request): Promise<NextResponse> {
	let paymentId = "unknown";

	try {
		// Parse form-urlencoded data (Mollie webhook format)
		const formData = await request.formData();
		const rawPaymentId = formData.get("id");

		if (
			rawPaymentId == null ||
			typeof rawPaymentId !== "string" ||
			rawPaymentId.length === 0
		) {
			throw new Error("Missing payment ID in webhook payload");
		}

		paymentId = rawPaymentId;

		// Verify webhook token from URL params
		const url = new URL(request.url);
		const token = url.searchParams.get("token");
		const expectedToken = serverOnlyEnv.MOLLIE_WEBHOOK_TOKEN;

		if (!expectedToken || token !== expectedToken) {
			throw new Error("Invalid webhook token");
		}

		const db = getAdminDb(); // Service-role allowed in webhooks

		// Check if this webhook was already processed (idempotency)
		const { data: alreadyProcessed } = await db.rpc(
			"get_webhook_event_exists",
			{
				p_provider: "mollie",
				p_webhook_id: paymentId,
			},
		);

		if (alreadyProcessed) {
			// Already processed - return success to avoid retries
			return NextResponse.json({ received: true, duplicate: true });
		}

		// Fetch current payment status from Mollie API
		const mollieClient = new MollieClient();
		const payment = await mollieClient.getPayment(paymentId);

		// Reconcile payment status with our database
		await reconcileFromPayment(db, payment);

		// Record successful webhook processing for idempotency
		await db.rpc("record_webhook_event", {
			p_provider: "mollie",
			p_webhook_id: paymentId,
			p_event_type: "payment.updated",
			p_entity_type: "payment",
			p_entity_id: paymentId,
		});

		// Always return 200 to prevent webhook retries
		return NextResponse.json({ received: true });
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";

		console.error("Mollie webhook error:", {
			paymentId,
			error: errorMessage,
			timestamp: Temporal.Now.zonedDateTimeISO("Europe/Amsterdam").toString(),
		});

		// Always return 200 to prevent information leakage via retry behavior
		return NextResponse.json({ received: true });
	}
}

// Mollie doesn't use GET verification
export function GET(): NextResponse {
	return NextResponse.json({
		status: "ok",
		message: "Mollie webhook endpoint",
	});
}
