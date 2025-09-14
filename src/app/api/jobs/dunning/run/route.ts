import { useTranslations } from "next-intl";
import "server-only";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { runDunning } from "~/server/dunning/engine";
import { assertSystemScope, getSystemDb } from "~/server/security/systemClient";
import "~/lib/time";
import { z } from "zod";

const RequestBody = z.object({
	mode: z.enum(["run", "dry"]).default("run"),
	orgId: z.uuid().optional(),
	batch: z.coerce.number().int().positive().max(200).default(50),
});

/**
 * POST /api/jobs/dunning/run
 *
 * Internal job endpoint for processing dunning reminders.
 * Requires INTERNAL_JOB_TOKEN for authentication.
 *
 * Body:
 * - mode: "run" (send reminders) | "dry" (simulate only)
 * - orgId: Optional organization filter
 * - batch: Max candidates to process (default: 50, max: 200)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
	try {
		// Authenticate using internal job token
		const scope = assertSystemScope(request.headers);
		const db = getSystemDb(scope);

		// Parse request body
		const body = RequestBody.parse(await request.json());
		const isDryRun = body.mode === "dry";

		// Run dunning engine
		const result = await runDunning(db, body.orgId, body.batch, isDryRun);

		// Return results
		const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");
		return NextResponse.json({
			success: true,
			mode: body.mode,
			orgId: body.orgId ?? null,
			result,
			timestamp: now.toString(),
		});
	} catch (error) {
		console.error("Dunning job error:", error);

		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		const status = errorMessage === "Unauthorized" ? 401 : 400;

		const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");
		return NextResponse.json(
			{
				success: false,
				error: errorMessage,
				timestamp: now.toString(),
			},
			{ status },
		);
	}
}

/**
 * GET /api/jobs/dunning/run
 *
 * Health check endpoint
 */
export function GET(): NextResponse {
	const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");
	return NextResponse.json({
		service: "dunning",
		status: "healthy",
		timestamp: now.toString(),
	});
}
