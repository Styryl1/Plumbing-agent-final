/**
 * Clerk Webhook Handler
 *
 * Syncs user and organization data from Clerk to our database.
 * This is one of the ONLY places where service-role DB access is allowed.
 */

import { NextResponse } from "next/server";
import {
	logWebhookEvent,
	verifyWebhookSignature,
} from "~/app/api/webhooks/_verify";
// Service-role access is ALLOWED in webhooks after signature verification
// This is one of the ONLY places where service-role DB access is permitted
import { getAdminDb } from "~/lib/supabase"; // Webhook exception - service-role allowed

export async function POST(request: Request): Promise<NextResponse> {
	let eventType = "unknown";

	try {
		// CRITICAL: Verify signature before any processing
		const event = (await verifyWebhookSignature(request, "clerk")) as {
			type: string;
			data: Record<string, unknown>;
		};

		eventType = event.type;
		const db = getAdminDb(); // Service-role allowed after verification

		switch (event.type) {
			case "organization.created": {
				const org = event.data as {
					id: string;
					name: string;
					created_by: string;
				};

				// Create organization in our database
				const { error } = await db.from("organizations").insert({
					id: org.id,
					name: org.name,
					owner_user_id: org.created_by,
				});

				if (error) {
					throw new Error(`Failed to create organization: ${error.message}`);
				}

				// Initialize org settings with defaults
				await db.from("org_settings").insert({
					org_id: org.id,
				});

				break;
			}

			case "organizationMembership.created": {
				const membership = event.data as {
					organization: { id: string };
					public_user_data: {
						user_id: string;
						first_name?: string;
						last_name?: string;
					};
					role: string;
				};

				// Create employee record
				const pieces = [
					membership.public_user_data.first_name,
					membership.public_user_data.last_name,
				].filter(
					(v): v is string => typeof v === "string" && v.trim().length > 0,
				);

				const fullName = pieces.map((s) => s.trim()).join(" ");
				const displayName = fullName.length === 0 ? "Unknown" : fullName;

				const { error } = await db.from("employees").insert({
					org_id: membership.organization.id,
					user_id: membership.public_user_data.user_id,
					name: displayName,
					role: mapClerkRole(membership.role),
					active: true,
				});

				if (error) {
					throw new Error(`Failed to create employee: ${error.message}`);
				}

				break;
			}

			case "organizationMembership.updated": {
				const membership = event.data as {
					organization: { id: string };
					public_user_data: { user_id: string };
					role: string;
				};

				// Update employee role
				const { error } = await db
					.from("employees")
					.update({
						role: mapClerkRole(membership.role),
					})
					.eq("org_id", membership.organization.id)
					.eq("user_id", membership.public_user_data.user_id);

				if (error) {
					throw new Error(`Failed to update employee: ${error.message}`);
				}

				break;
			}

			case "organizationMembership.deleted": {
				const membership = event.data as {
					organization: { id: string };
					public_user_data: { user_id: string };
				};

				// Soft delete employee (set inactive)
				const { error } = await db
					.from("employees")
					.update({
						active: false,
					})
					.eq("org_id", membership.organization.id)
					.eq("user_id", membership.public_user_data.user_id);

				if (error) {
					throw new Error(`Failed to deactivate employee: ${error.message}`);
				}

				break;
			}

			case "organization.updated": {
				const org = event.data as {
					id: string;
					name: string;
				};

				// Update organization details
				const { error } = await db
					.from("organizations")
					.update({
						name: org.name,
					})
					.eq("id", org.id);

				if (error) {
					throw new Error(`Failed to update organization: ${error.message}`);
				}

				break;
			}

			case "organization.deleted": {
				// We don't actually delete organizations
				// They remain for historical records
				// Just log the event
				console.error(
					`Organization deletion requested: ${String(event.data.id)}`,
				);
				break;
			}

			default:
				console.error(`Unhandled Clerk event type: ${event.type}`);
		}

		logWebhookEvent("clerk", eventType, event.data, true);
		return NextResponse.json({ received: true });
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		logWebhookEvent("clerk", eventType, null, false, errorMessage);

		console.error("Clerk webhook error:", error);
		return NextResponse.json({ error: errorMessage }, { status: 400 });
	}
}

/**
 * Map Clerk roles to our internal role system
 */
function mapClerkRole(clerkRole: string): "owner" | "admin" | "staff" {
	switch (clerkRole) {
		case "org:owner":
		case "admin":
			return "owner";
		case "org:admin":
			return "admin";
		default:
			return "staff";
	}
}

// Clerk sends verification challenges
export function GET(request: Request): Response | NextResponse {
	const { searchParams } = new URL(request.url);
	const challenge = searchParams.get("hub.challenge");

	if (challenge !== null) {
		// WhatsApp-style verification challenge
		return new Response(challenge);
	}

	return NextResponse.json({ status: "ok" });
}
