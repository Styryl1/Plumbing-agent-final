import { useTranslations } from "next-intl";
import "server-only";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import "~/lib/time";
import { serverOnlyEnv } from "~/lib/env";
import { createProviderCredentialsService } from "~/server/db/provider-credentials";
import { getRlsDb } from "~/server/security/rlsClient";

// Zod schemas for OAuth2 flow validation
const StateSchema = z.object({
	orgId: z.string().min(1),
	userId: z.string().min(1),
	nonce: z.uuid(),
	timestamp: z.number(),
});

const CallbackParamsSchema = z.object({
	code: z.string().min(1),
	state: z.string().min(1),
	error: z.string().optional(),
	error_description: z.string().optional(),
});

const TokenResponseSchema = z.object({
	access_token: z.string().min(1),
	refresh_token: z.string().min(1),
	expires_in: z.number().positive(),
	scope: z.string(),
	token_type: z.literal("Bearer"),
});

const AdministrationSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	country: z.string().optional(),
	currency: z.string().optional(),
});

/**
 * GET /api/providers/moneybird/oauth/callback
 * Handles OAuth2 authorization code exchange and credential storage
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
	try {
		const { userId, orgId, getToken } = await auth();
		if (!userId || !orgId) {
			redirect("/sign-in");
		}

		// Parse and validate callback parameters
		const searchParams = request.nextUrl.searchParams;
		const params = CallbackParamsSchema.parse({
			code: searchParams.get("code"),
			state: searchParams.get("state"),
			error: searchParams.get("error"),
			error_description: searchParams.get("error_description"),
		});

		// Handle OAuth2 errors
		if (params.error) {
			return NextResponse.redirect(
				new URL(
					`/invoices?error=oauth_error&message=${encodeURIComponent(params.error_description ?? params.error)}`,
					request.nextUrl.origin,
				),
			);
		}

		// Validate and parse CSRF state
		const stateCookie = request.cookies.get("moneybird_oauth_state")?.value;
		if (!stateCookie || stateCookie !== params.state) {
			return NextResponse.redirect(
				new URL("/invoices?error=csrf_error", request.nextUrl.origin),
			);
		}

		let state: z.infer<typeof StateSchema>;
		try {
			const decodedState = Buffer.from(params.state, "base64url").toString();
			state = StateSchema.parse(JSON.parse(decodedState));
		} catch {
			return NextResponse.redirect(
				new URL("/invoices?error=invalid_state", request.nextUrl.origin),
			);
		}

		// Verify state matches current user/org
		if (state.orgId !== orgId || state.userId !== userId) {
			return NextResponse.redirect(
				new URL("/invoices?error=user_mismatch", request.nextUrl.origin),
			);
		}

		// Check state age (max 10 minutes)
		const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");
		if (now.epochMilliseconds - state.timestamp > 600_000) {
			return NextResponse.redirect(
				new URL("/invoices?error=state_expired", request.nextUrl.origin),
			);
		}

		// Exchange authorization code for access token
		const clientId = serverOnlyEnv.MONEYBIRD_CLIENT_ID;
		const clientSecret = serverOnlyEnv.MONEYBIRD_CLIENT_SECRET;

		if (!clientId || !clientSecret) {
			throw new Error("Moneybird OAuth2 credentials not configured");
		}

		const tokenResponse = await fetch("https://moneybird.com/oauth/token", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Accept: "application/json",
			},
			body: new URLSearchParams({
				grant_type: "authorization_code",
				client_id: clientId,
				client_secret: clientSecret,
				code: params.code,
				redirect_uri: `${request.nextUrl.origin}/api/providers/moneybird/oauth/callback`,
			}),
		});

		if (!tokenResponse.ok) {
			return NextResponse.redirect(
				new URL(
					"/invoices?error=token_exchange_failed",
					request.nextUrl.origin,
				),
			);
		}

		const tokenData = TokenResponseSchema.parse(await tokenResponse.json());

		// Fetch available administrations
		const adminResponse = await fetch(
			"https://moneybird.com/api/v2/administrations",
			{
				headers: {
					Authorization: `Bearer ${tokenData.access_token}`,
					Accept: "application/json",
				},
			},
		);

		if (!adminResponse.ok) {
			return NextResponse.redirect(
				new URL("/invoices?error=admin_fetch_failed", request.nextUrl.origin),
			);
		}

		const administrations = z
			.array(AdministrationSchema)
			.parse(await adminResponse.json());

		// Auto-select administration if only one available
		let administrationId: string | null = null;
		if (administrations.length === 1) {
			administrationId = administrations[0]!.id;
		}
		// For multiple administrations, we'll prompt user later via UI

		// Get JWT token for RLS-aware database access
		const token =
			(await getToken({ template: "supabase" })) ?? (await getToken());
		if (!token) {
			throw new Error("Failed to get authentication token");
		}

		// Store credentials with RLS-aware client
		const supabase = getRlsDb(token);
		const credentialsService = createProviderCredentialsService(
			supabase,
			orgId,
		);

		const expiresAt = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam")
			.add({ seconds: tokenData.expires_in })
			.toString();

		await credentialsService.upsertCredentials("moneybird", {
			provider: "moneybird",
			access_token: tokenData.access_token,
			refresh_token: tokenData.refresh_token,
			expires_at: expiresAt,
			scopes: tokenData.scope.split(" "),
			administration_id: administrationId ?? undefined,
		});

		// Clear CSRF cookie
		const response = NextResponse.redirect(
			new URL(
				`/invoices?success=moneybird_connected${administrations.length > 1 ? "&select_admin=true" : ""}`,
				request.nextUrl.origin,
			),
		);

		response.cookies.delete("moneybird_oauth_state");

		return response;
	} catch {
		return NextResponse.redirect(
			new URL("/invoices?error=callback_error", request.nextUrl.origin),
		);
	}
}
