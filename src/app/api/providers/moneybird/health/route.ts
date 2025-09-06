import { NextResponse } from "next/server";
import "server-only";
import { auth } from "@clerk/nextjs/server";
import { createProviderCredentialsService } from "~/server/db/provider-credentials";
import { MoneyBirdClient } from "~/server/providers/moneybird/client";
import { getRlsDb } from "~/server/security/rlsClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/providers/moneybird/health
 *
 * Checks Moneybird connection health by calling a cheap API endpoint
 * Returns token freshness and administration availability
 */
export async function GET(): Promise<NextResponse> {
	try {
		// Get authenticated user and org
		const { userId, orgId, getToken } = await auth();
		if (!userId || !orgId) {
			return NextResponse.json(
				{ ok: false, error: "Authentication required" },
				{ status: 401 },
			);
		}

		// Get JWT token for RLS-aware database access
		const token =
			(await getToken({ template: "supabase" })) ?? (await getToken());
		if (!token) {
			return NextResponse.json(
				{ ok: false, error: "Failed to get authentication token" },
				{ status: 401 },
			);
		}

		// Get provider credentials for this org
		const supabase = getRlsDb(token);
		const credentialsService = createProviderCredentialsService(
			supabase,
			orgId,
		);

		const credentials = await credentialsService.getCredentials("moneybird");
		if (!credentials) {
			return NextResponse.json({
				ok: false,
				status: "not_connected",
			});
		}

		if (!credentials.administration_id) {
			return NextResponse.json({
				ok: false,
				status: "admin_missing",
			});
		}

		// Create client and test connection
		const client = new MoneyBirdClient(
			credentials.access_token,
			credentials.refresh_token,
			credentials.expires_at,
		);

		// 1) Validate token & visibility without admin scope
		const administrations = await client.getAdministrations();
		const admin = administrations.find(
			(a) => a.id === credentials.administration_id,
		);
		if (!admin) {
			return NextResponse.json({
				ok: false,
				status: "admin_not_accessible",
			});
		}

		// 2) Make a cheap admin-scoped call to test access
		await client.listTaxRates(credentials.administration_id);

		// Return success with connection details
		return NextResponse.json({
			ok: true,
			administrationId: credentials.administration_id,
			administrationCount: administrations.length,
			tokenExpiresAt: client.getTokenInfo().expiresAt,
		});
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";

		// Classify error types for better debugging
		const isTokenError =
			errorMessage.includes("401") ||
			errorMessage.includes("Unauthorized") ||
			errorMessage.includes("authentication");

		const status = isTokenError ? "token_invalid" : "connection_error";

		return NextResponse.json(
			{
				ok: false,
				status,
				details: errorMessage,
			},
			{ status: 200 }, // Always return 200 for health checks with status in body
		);
	}
}
