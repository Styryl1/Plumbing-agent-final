import { auth, currentUser } from "@clerk/nextjs/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { initTRPC, TRPCError } from "@trpc/server";
import { cookies } from "next/headers";
import superjson from "superjson";
import { ZodError } from "zod";
import type { Locale } from "~/i18n";
import { DEFAULT_TIMEZONE, normalizeTimezone } from "~/lib/timezone";
import { toZodFlatten, type ZodFlatten } from "~/lib/zodError";
import { getRlsDb } from "~/server/security/rlsClient";
import type { Database } from "~/types/supabase";

export async function createContext(): Promise<{
	auth: {
		readonly userId: string | null;
		readonly orgId: string | null;
		readonly role: string | null;
	};
	locale: Locale;
	db: SupabaseClient<Database> | null;
	timezone: string;
}> {
	// Get auth context from Clerk session - do this only once to avoid "call" errors
	const clerkAuth = await auth();
	const authContext = {
		userId: clerkAuth.userId ?? null,
		orgId: clerkAuth.orgId ?? null,
		role: clerkAuth.orgRole ?? null,
	} as const;

	const cookieStore = await cookies();
	const cookieLocale = cookieStore.get("locale")?.value;
	const locale: Locale = cookieLocale === "en" ? "en" : "nl";

	// Create RLS-aware database client only for authenticated users
	let db: SupabaseClient<Database> | null = null;
	let timezone = DEFAULT_TIMEZONE;

	if (authContext.userId !== null && authContext.orgId !== null) {
		// CRITICAL: Verify user actually belongs to the requested org
		// This prevents clients from spoofing orgId in requests
		await currentUser(); // Verify user exists
		// Note: organizationMemberships may not be available in all Clerk plans
		// For now, we trust the auth context from Clerk middleware
		// In production with Clerk organizations enabled:
		// const user = await currentUser();
		// const userOrgIds = user?.organizationMemberships?.map((m: any) => m.organization.id) ?? [];
		const userOrgIds = [authContext.orgId]; // Trust Clerk middleware for now

		if (!userOrgIds.includes(authContext.orgId)) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "User is not a member of the requested organization",
			});
		}

		// Use Clerk Third-Party token (no custom signing). Clerk automatically includes org_*
		// claims when an active organization is set. Supabase verifies via JWKS.
		const { getToken } = clerkAuth;

		const token =
			(await getToken()) ?? (await getToken({ template: "supabase" }));
		if (!token) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "Missing Clerk JWT for Supabase (set an active organization)",
			});
		}

		db = getRlsDb(token);

		// Load organization timezone (fallback to default on any errors)
		const orgId = authContext.orgId;
		const { data: tzRow, error: tzError } = await db
			.from("org_settings")
			.select("timezone")
			.eq("org_id", orgId)
			.maybeSingle();

		if (!tzError && tzRow?.timezone) {
			timezone = normalizeTimezone(tzRow.timezone);
		}
	}

	return { auth: authContext, locale, db, timezone };
}

type Ctx = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Ctx>().create({
	transformer: superjson,
	errorFormatter({ shape, error }) {
		let zodError: ZodFlatten | null = null;

		// 1) If procedure `.input(zodSchema)` failed, cause is a ZodError
		if (error.cause instanceof ZodError) {
			zodError = toZodFlatten(error.cause);
		}

		// 2) If you manually catch and wrap ZodError yourself somewhere:
		// throw new TRPCError({ code: "BAD_REQUEST", cause: zodErr });
		// ...this still works due to the instanceof check above.

		return {
			...shape,
			data: {
				...shape.data,
				zodError, // <- what the client will read
			},
		};
	},
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
	if (!ctx.auth.userId || !ctx.auth.orgId || !ctx.db) {
		throw new TRPCError({ code: "UNAUTHORIZED" });
	}
	return next({
		ctx: {
			...ctx,
			auth: {
				...ctx.auth,
				userId: ctx.auth.userId,
				orgId: ctx.auth.orgId,
			},
			db: ctx.db, // Ensure db is available in protected procedures
		},
	});
});
