import "server-only";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";
import { computeDailySnapshot } from "~/server/reporting/aggregate";
import { assertSystemScope, getSystemDb } from "~/server/security/systemClient";

const RequestBody = z.object({
	mode: z.enum(["one", "backfill"]).default("one"),
	date: z.string().optional(), // ISO date-time or date (local day considered)
	from: z.string().optional(),
	to: z.string().optional(),
});

/**
 * POST /api/jobs/reporting/snapshot
 *
 * Internal job endpoint for computing daily invoice snapshots.
 * Requires INTERNAL_JOB_TOKEN for authentication.
 *
 * Body:
 * - mode: "one" (single day) | "backfill" (date range)
 * - date: ISO date for "one" mode (defaults to today)
 * - from/to: ISO date range for "backfill" mode
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
	try {
		// Authenticate using internal job token
		const scope = assertSystemScope(request.headers);
		const db = getSystemDb(scope);

		// Parse request body
		const body = RequestBody.parse(await request.json());

		const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");

		if (body.mode === "one") {
			// Process single day
			const dateISO = body.date ?? now.toString();
			const upserts = await computeDailySnapshot(db, dateISO);

			return NextResponse.json({
				success: true,
				mode: "one",
				date: dateISO,
				upserts,
				timestamp: now.toString(),
			});
		}

		// Backfill mode - process date range
		const from = body.from ?? now.subtract({ days: 7 }).toString();
		const to = body.to ?? now.toString();

		let cursor = Temporal.ZonedDateTime.from(from).with({
			hour: 12,
			minute: 0,
			second: 0,
			millisecond: 0,
		}); // Safe midday
		const end = Temporal.ZonedDateTime.from(to).with({
			hour: 12,
			minute: 0,
			second: 0,
			millisecond: 0,
		});

		let totalUpserts = 0;
		const processedDays: string[] = [];

		while (Temporal.ZonedDateTime.compare(cursor, end) <= 0) {
			const dayUpserts = await computeDailySnapshot(db, cursor.toString());
			totalUpserts += dayUpserts;
			processedDays.push(cursor.toPlainDate().toString());
			cursor = cursor.add({ days: 1 });
		}

		return NextResponse.json({
			success: true,
			mode: "backfill",
			from,
			to,
			processedDays,
			totalUpserts,
			timestamp: now.toString(),
		});
	} catch (error) {
		console.error("Reporting snapshot job error:", error);

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
 * GET /api/jobs/reporting/snapshot
 *
 * Health check endpoint
 */
export function GET(): NextResponse {
	const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");
	return NextResponse.json({
		service: "reporting-snapshot",
		status: "healthy",
		timestamp: now.toString(),
	});
}
