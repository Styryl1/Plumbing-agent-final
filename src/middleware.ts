import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { env } from "~/lib/env";

const isProtectedRoute = createRouteMatcher([
	"/dashboard(.*)",
	"/jobs(.*)",
	"/customers(.*)",
	"/invoices(.*)",
	"/employees(.*)",
	"/settings(.*)",
	"/api/trpc(.*)",
	"/api/jobs(.*)",
	"/api/providers/(moneybird|wefact|eboekhoud|eboekhouden)(.*)",
	"/api/wa(.*)",
]);

function detectPreferredLocale(acceptLang?: string): "nl" | "en" {
	const raw = (acceptLang ?? "").toLowerCase();
	if (raw.includes("nl")) return "nl";
	return "en";
}

export default clerkMiddleware(
	async (auth, req) => {
		const res = NextResponse.next();
		const { pathname } = req.nextUrl;

		if (!req.cookies.has("locale")) {
			const preferred = detectPreferredLocale(
				req.headers.get("accept-language") ?? undefined,
			);
			res.cookies.set("locale", preferred, {
				path: "/",
				maxAge: 60 * 60 * 24 * 365,
				httpOnly: false,
				sameSite: "lax",
			});
		}

		if (isProtectedRoute(req)) {
			await auth.protect();
		}

		const { userId } = await auth();
		if (
			userId &&
			(pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up"))
		) {
			return NextResponse.redirect(new URL("/dashboard", req.url));
		}

		return res;
	},
	{
		debug: env.NODE_ENV !== "production",
	},
);

export const config = {
	matcher: [
		"/dashboard/:path*",
		"/jobs/:path*",
		"/customers/:path*",
		"/invoices/:path*",
		"/employees/:path*",
		"/settings/:path*",
		"/api/trpc/:path*",
		"/api/jobs/:path*",
		"/api/providers/:path*",
		"/api/wa/:path*",
	],
};
