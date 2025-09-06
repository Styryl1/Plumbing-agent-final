import "server-only";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import "~/lib/time";
import { serverOnlyEnv } from "~/lib/env";
import { refreshOne, runDue } from "~/server/jobs/status/refresh";
import { assertSystemScope, getSystemDb } from "~/server/security/systemClient";

const RefreshRequestSchema = z.object({
	mode: z.enum(["due", "one"]),
	invoiceId: z.uuid().optional(),
	batch: z.number().int().positive().max(100).optional(),
});

/**
 * Secured API route for invoice status refresh
 *
 * POST /api/jobs/invoices/refresh
 * Headers: X-Internal-Job-Token
 * Body: { mode: 'due' | 'one', invoiceId?: string, batch?: number }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
	try {
		// Validate internal boundary and obtain branded scope
		let scope;
		try {
			scope = assertSystemScope(request.headers);
		} catch {
			return NextResponse.json(
				{
					error: "Unauthorized",
					message: "Missing or invalid internal job token",
				},
				{ status: 401 },
			);
		}

		// Parse and validate request body
		const body: unknown = await request.json().catch(() => null);
		if (body === null) {
			return NextResponse.json(
				{ error: "Bad Request", message: "Invalid JSON body" },
				{ status: 400 },
			);
		}

		const validation = RefreshRequestSchema.safeParse(body);
		if (!validation.success) {
			return NextResponse.json(
				{
					error: "Bad Request",
					message: "Invalid request body",
					details: validation.error.issues,
				},
				{ status: 400 },
			);
		}

		const { mode, invoiceId, batch } = validation.data;

		// System operations require service-role DB; branded scope enforces prior assertion.
		const db = getSystemDb(scope);

		// Execute refresh based on mode
		switch (mode) {
			case "due": {
				const result = await runDue(db, batch ?? 20);
				return NextResponse.json({ ok: true, result });
			}
			case "one": {
				if (invoiceId === undefined) {
					return NextResponse.json(
						{
							error: "Bad Request",
							message: "invoiceId required for mode 'one'",
						},
						{ status: 400 },
					);
				}

				const result = await refreshOne(db, invoiceId);
				return NextResponse.json({
					success: true,
					mode: "one",
					invoiceId,
					result,
					timestamp:
						Temporal.Now.zonedDateTimeISO("Europe/Amsterdam").toString(),
				});
			}
		}
	} catch (error: unknown) {
		console.error("Invoice status refresh job failed:", error);

		// Don't expose internal error details to clients
		const message =
			error instanceof Error ? error.message : "Internal server error";

		return NextResponse.json(
			{
				error: "Internal Server Error",
				message,
				timestamp: Temporal.Now.zonedDateTimeISO("Europe/Amsterdam").toString(),
			},
			{ status: 500 },
		);
	}
}

/**
 * Health check endpoint (GET)
 */
export function GET(): NextResponse {
	return NextResponse.json({
		service: "invoice-status-refresh",
		status: "healthy",
		timestamp: Temporal.Now.zonedDateTimeISO("Europe/Amsterdam").toString(),
		environment: serverOnlyEnv.NODE_ENV,
	});
}
