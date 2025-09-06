/**
 * Deprecated: Custom RLS JWT minting.
 * We now rely on Clerk Third-Party JWTs (via getToken({ template: "supabase" })).
 * Keep this file to avoid breaking imports, but do not call makeRlsJwt from app code.
 */

// Imports removed as they are no longer needed after deprecation

/**
 * Mints a short-lived JWT for RLS enforcement
 * @param userId - Clerk user ID (string format)
 * @param orgId - Organization UUID
 * @param roles - User roles (defaults to ["member"])
 * @returns Signed JWT with 5-minute expiry
 */
// NOTE: Do not remove the export yet to avoid breaking builds in branches.
// If called, we throw to surface incorrect usage immediately.
export function makeRlsJwt(): never {
	throw new Error(
		'makeRlsJwt is deprecated. Use Clerk auth().getToken({ template: "supabase" }) instead.',
	);
}
