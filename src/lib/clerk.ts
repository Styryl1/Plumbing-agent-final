import { auth } from "@clerk/nextjs/server";

export async function getAuthContext(): Promise<{
	readonly userId: string | null;
	readonly orgId: string | null;
	readonly role: string | null;
}> {
	// Get auth context from Clerk session - includes active organization data
	const { userId, orgId, orgRole } = await auth();

	return {
		userId: userId ?? null,
		orgId: orgId ?? null,
		role: orgRole ?? null,
	} as const;
}
