import "server-only";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import "~/lib/time";
import { env, serverOnlyEnv } from "~/lib/env";

// Moneybird OAuth2 scopes required for invoice management
const REQUIRED_SCOPES = [
	"sales_invoices",
	"contacts",
	"administrations",
	"webhooks",
].join(" ");

const MONEYBIRD_OAUTH_URL = "https://moneybird.com/oauth/authorize";

/**
 * GET /api/providers/moneybird/oauth/start
 * Initiates Moneybird OAuth2 flow with CSRF protection
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
	// Check feature flag
	if (env.INVOICING_MONEYBIRD !== "true") {
		return NextResponse.json(
			{ error: "Moneybird integration is disabled" },
			{ status: 404 },
		);
	}

	// Verify authentication and org membership
	const { userId, orgId } = await auth();
	if (!userId || !orgId) {
		redirect("/sign-in");
	}

	// Validate required OAuth2 credentials
	const clientId = serverOnlyEnv.MONEYBIRD_CLIENT_ID;
	if (!clientId) {
		return NextResponse.json(
			{ error: "Moneybird OAuth2 not configured" },
			{ status: 500 },
		);
	}

	// Generate CSRF state token with org context
	const state = z.string().parse(
		Buffer.from(
			JSON.stringify({
				orgId,
				userId,
				nonce: crypto.randomUUID(),
				timestamp:
					Temporal.Now.zonedDateTimeISO("Europe/Amsterdam").epochMilliseconds,
			}),
		).toString("base64url"),
	);

	// Build authorization URL
	const authUrl = new URL(MONEYBIRD_OAUTH_URL);
	authUrl.searchParams.set("client_id", clientId);
	authUrl.searchParams.set(
		"redirect_uri",
		`${request.nextUrl.origin}/api/providers/moneybird/oauth/callback`,
	);
	authUrl.searchParams.set("response_type", "code");
	authUrl.searchParams.set("scope", REQUIRED_SCOPES);
	authUrl.searchParams.set("state", state);

	// Set CSRF cookie for additional security
	const response = NextResponse.redirect(authUrl.toString());
	response.cookies.set("moneybird_oauth_state", state, {
		httpOnly: true,
		secure: env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: 600, // 10 minutes
		path: "/",
	});

	return response;
}
