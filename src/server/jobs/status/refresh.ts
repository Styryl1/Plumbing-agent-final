import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import "~/lib/time";
import type { Database } from "~/types/supabase";
import { getProvider } from "../../providers/registry";
import { InvoiceProviderId } from "../../providers/types";
import { calcNextRun } from "./backoff";

interface RefreshJobRow {
	id: string;
	invoice_id: string;
	provider: InvoiceProviderId;
	external_id: string;
	attempts: number;
	max_attempts: number;
	run_after: string;
	last_error: string | null;
	created_at: string | null;
	updated_at: string | null;
}

interface RefreshResult {
	claimed: number;
	succeeded: number;
	failed: number;
}

/**
 * Queue a single invoice for status refresh (upsert pattern for idempotency)
 */
export async function refreshOne(
	db: SupabaseClient<Database>,
	invoiceId: string,
): Promise<"queued" | "merged"> {
	// Get invoice details with provider info
	const { data: invoice, error: invoiceError } = await db
		.from("invoices")
		.select("id, provider, external_id, org_id")
		.eq("id", invoiceId)
		.single();

	if (invoiceError != null) {
		throw new Error(`Invoice not found: ${invoiceId}`);
	}

	if (!invoice.provider || !invoice.external_id) {
		throw new Error(
			`Invoice ${invoiceId} missing provider or external_id - cannot refresh`,
		);
	}

	// Upsert into queue (idempotent - only one job per invoice)
	const { error: upsertError } = await db
		.from("invoice_status_refresh_queue")
		.upsert(
			{
				invoice_id: invoiceId,
				provider: invoice.provider,
				external_id: invoice.external_id,
				attempts: 0,
				max_attempts: 7,
				run_after: Temporal.Now.zonedDateTimeISO("Europe/Amsterdam").toString(),
			},
			{
				onConflict: "invoice_id",
				ignoreDuplicates: false, // Update run_after to trigger sooner
			},
		);

	if (upsertError) {
		throw new Error(`Failed to queue refresh: ${upsertError.message}`);
	}

	return "queued";
}

/**
 * Process due refresh jobs with atomic claiming
 */
export async function runDue(
	db: SupabaseClient<Database>,
	batch: number = 20,
): Promise<RefreshResult> {
	const result: RefreshResult = {
		claimed: 0,
		succeeded: 0,
		failed: 0,
	};

	// Atomic claim via RPC (FOR UPDATE SKIP LOCKED)
	const { data: jobsData, error: claimError } = await db.rpc("job_claim_due", {
		p_batch: batch,
	});

	if (claimError) {
		throw new Error(`Failed to claim jobs: ${claimError.message}`);
	}

	const jobs = jobsData;
	if (jobs.length === 0) {
		return result;
	}

	result.claimed = jobs.length;

	// Process each job
	for (const job of jobs) {
		try {
			// Parse provider into union to satisfy provider boundary
			const providerId = InvoiceProviderId.parse(job.provider);
			await processRefreshJob(db, {
				id: job.id,
				invoice_id: job.invoice_id,
				provider: providerId,
				external_id: job.external_id,
				attempts: job.attempts,
				max_attempts: job.max_attempts,
				run_after: Temporal.Now.zonedDateTimeISO("Europe/Amsterdam").toString(),
				last_error: null,
				created_at: null,
				updated_at: null,
			});
			result.succeeded++;
		} catch (error: unknown) {
			console.error("Refresh job failed:", (error as Error).message);
			result.failed++;
		}
	}

	return result;
}

/**
 * Process a single refresh job
 */
async function processRefreshJob(
	db: SupabaseClient<Database>,
	job: RefreshJobRow,
): Promise<void> {
	try {
		// Get invoice with org context for provider access
		const { data: invoice, error: invoiceError } = await db
			.from("invoices")
			.select(
				"id, provider, external_id, provider_status, pdf_url, ubl_url, payment_url, org_id",
			)
			.eq("id", job.invoice_id)
			.single();

		if (invoiceError != null) {
			throw new Error(`Invoice not found: ${job.invoice_id}`);
		}

		// Get provider instance
		const provider = await getProvider(job.provider, db, invoice.org_id);

		// Fetch current status from provider
		const snapshot = await provider.fetchSnapshot(job.external_id);

		// Check if status changed
		const statusChanged = snapshot.status !== invoice.provider_status;

		// Update invoice if anything changed
		const updateData: Record<string, unknown> = {};

		if (statusChanged) {
			updateData.provider_status = snapshot.status;
		}

		if (snapshot.pdfUrl && snapshot.pdfUrl !== (invoice.pdf_url ?? undefined)) {
			updateData.pdf_url = snapshot.pdfUrl;
		}

		if (snapshot.ublUrl && snapshot.ublUrl !== (invoice.ubl_url ?? undefined)) {
			updateData.ubl_url = snapshot.ublUrl;
		}

		if (
			snapshot.paymentUrl &&
			snapshot.paymentUrl !== (invoice.payment_url ?? undefined)
		) {
			updateData.payment_url = snapshot.paymentUrl;
		}

		// Update invoice if there are changes
		if (Object.keys(updateData).length > 0) {
			const { error: updateError } = await db
				.from("invoices")
				.update(updateData)
				.eq("id", job.invoice_id);

			if (updateError) {
				throw new Error(`Failed to update invoice: ${updateError.message}`);
			}
		}

		// Append invoice audit log only on status change
		if (statusChanged) {
			const { error: auditError } = await db.from("invoice_audit_log").insert({
				org_id: invoice.org_id,
				resource_type: "invoice",
				resource_id: job.invoice_id,
				action: "updated",
				actor_id: "system:poller",
				actor_role: "system",
				changes: {
					provider_status: {
						from: invoice.provider_status,
						to: snapshot.status,
					},
				},
				metadata: { provider: job.provider, source: "status_refresh_poller" },
			});

			if (auditError) {
				console.warn(`Failed to log audit for ${job.invoice_id}:`, auditError);
				// Don't fail the job for audit logging issues
			}
		}

		// Determine if we should continue polling
		const terminalStates = ["paid", "cancelled"];
		const shouldContinue = !terminalStates.includes(snapshot.status);

		if (shouldContinue && job.provider === "moneybird") {
			// For Moneybird, schedule safety poll (once per day)
			const nextRun = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam").add({
				hours: 24,
			});

			await db
				.from("invoice_status_refresh_queue")
				.update({
					run_after: nextRun.toString(),
					attempts: 0, // Reset attempts for safety polls
				})
				.eq("id", job.id);
		} else if (
			shouldContinue &&
			(job.provider === "wefact" || job.provider === "eboekhouden")
		) {
			// For WeFact/e-Boekhouden, continue polling with normal schedule
			const nextRun = calcNextRun(0, 300); // 5 minute base for active polling

			await db
				.from("invoice_status_refresh_queue")
				.update({
					run_after: nextRun.toString(),
					attempts: 0, // Reset for continued polling
				})
				.eq("id", job.id);
		} else {
			// Terminal state reached - remove from queue
			await db.from("invoice_status_refresh_queue").delete().eq("id", job.id);
		}
	} catch (error) {
		// Handle job failure with retry logic
		await handleJobFailure(db, job, error as Error);
		throw error;
	}
}

/**
 * Handle job failure with exponential backoff and dead letter
 */
async function handleJobFailure(
	db: SupabaseClient<Database>,
	job: RefreshJobRow,
	error: Error,
): Promise<void> {
	const newAttempts = job.attempts + 1;

	if (newAttempts >= job.max_attempts) {
		// Move to dead letters
		await db.from("invoice_status_refresh_dead_letters").insert({
			invoice_id: job.invoice_id,
			provider: job.provider,
			external_id: job.external_id,
			attempts: newAttempts,
			last_error: error.message,
		});

		// Remove from queue
		await db.from("invoice_status_refresh_queue").delete().eq("id", job.id);
	} else {
		// Retry with exponential backoff
		const nextRun = calcNextRun(newAttempts);

		await db
			.from("invoice_status_refresh_queue")
			.update({
				attempts: newAttempts,
				run_after: nextRun.toString(),
				last_error: error.message,
			})
			.eq("id", job.id);
	}
}
