import { TRPCError } from "@trpc/server";

const ROLE_PREFIX = "org:";

export type OrgRole = "owner" | "admin" | "staff" | "dispatcher" | "technician";

function normalizeRole(role: string | null | undefined): string | null {
	if (!role) return null;
	return role.startsWith(ROLE_PREFIX) ? role.slice(ROLE_PREFIX.length) : role;
}

export function assertOrgRole(
	role: string | null | undefined,
	allowed: readonly OrgRole[],
): void {
	const normalized = normalizeRole(role);
	if (!normalized) {
		throw new TRPCError({ code: "FORBIDDEN", message: "Role is required" });
	}

	if (!allowed.includes(normalized as OrgRole)) {
		throw new TRPCError({ code: "FORBIDDEN", message: "Insufficient role" });
	}
}
