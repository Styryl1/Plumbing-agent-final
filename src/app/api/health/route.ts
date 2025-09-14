import { NextResponse } from "next/server";
import { Temporal } from "temporal-polyfill";
// Health check endpoints are allowed to use service-role for database verification
import { getAdminDb } from "~/lib/supabase"; // Health check exception - service-role allowed

/**
 * Health check endpoint for database connectivity
 *
 * GET /api/health
 *
 * Returns:
 * - 200 OK: Database is reachable
 * - 500 Error: Database connection failed
 *
 * Note: This is for development/ops use, not a public uptime endpoint.
 */
export async function GET(): Promise<NextResponse> {
	try {
		const db = getAdminDb();

		// Simple connectivity test - check if we can query organizations table
		const { data, error } = await db
			.from("organizations")
			.select("id")
			.limit(1);

		if (error) {
			console.error("Health check database error:", error);
			return NextResponse.json(
				{
					status: "error",
					message: "Database query failed",
					error: error.message,
					timestamp: Temporal.Now.instant().toString(),
				},
				{ status: 500 },
			);
		}

		// Success response
		return NextResponse.json({
			status: "ok",
			version: "1.0.0",
			database: "reachable",
			tables: [
				"organizations",
				"employees",
				"customers",
				"jobs",
				"materials",
				"job_materials",
				"invoices",
				"invoice_lines",
				"conversations",
				"wa_contacts",
				"voice_notes",
				"ai_recommendations",
				"audit_logs",
				"bridge_sessions",
				"bridge_events",
			],
			timestamp: Temporal.Now.instant().toString(),
			recordsFound: data.length,
		});
	} catch (error) {
		console.error("Health check failed:", error);

		return NextResponse.json(
			{
				status: "error",
				message: "Health check failed",
				error: error instanceof Error ? error.message : "Unknown error",
				timestamp: Temporal.Now.instant().toString(),
			},
			{ status: 500 },
		);
	}
}
