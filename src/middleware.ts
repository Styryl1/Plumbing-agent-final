import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { useTranslations } from "next-intl";
import { env } from "~/lib/env";

const isPublicRoute = createRouteMatcher([
	"/", // landing or marketing page
	"/sign-in(.*)", // keep Clerk auth pages public
	"/sign-up(.*)",
	"/api/health(.*)", // health checks can remain public
	"/api/locale", // allow locale switching without forcing auth
	"/api/providers/moneybird/health", // Moneybird health endpoint
	"/api/jobs/dunning/run", // Internal job endpoint with token auth
	// "/api/webhooks(.*)", // uncomment if you have public webhooks
]);

// Explicitly define protected routes that require authentication
const isProtectedRoute = createRouteMatcher([
	"/dashboard(.*)",
	"/jobs(.*)",
	"/customers(.*)",
	"/invoices(.*)",
	"/employees(.*)",
	"/settings(.*)",
]);

function detectPreferredLocale(acceptLang?: string): "nl" | "en" {
	const raw = (acceptLang ?? "").toLowerCase();
	if (raw.includes("nl")) return "nl";
	return "en";
}

export default clerkMiddleware(
	async (auth, req) => {
		const { pathname } = req.nextUrl;

		// Skip Next internals & static assets quickly
		if (
			pathname.startsWith("/_next") ||
			pathname.match(
				/\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|map|txt|xml|csv|pdf|zip|webmanifest)$/,
			)
		) {
			return NextResponse.next();
		}

		// Set 'locale' cookie once (fallback to Accept-Language)
		const res = NextResponse.next();
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

		// 1) Protect everything that isn't explicitly public
		// Also explicitly check for protected routes to ensure auth
		if (!isPublicRoute(req) || isProtectedRoute(req)) {
			await auth.protect();
		}

		// 2) (Optional nicety) Prevent signed-in users from visiting auth pages
		const { userId } = await auth();
		if (
			userId &&
			(pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up"))
		) {
			const url = req.nextUrl.clone();
			url.pathname = "/dashboard";
			return NextResponse.redirect(url);
		}

		return res;
	},
	{
		// Leave on in dev so we can see matches in the terminal
		debug: env.NODE_ENV !== "production",
	},
);

export const config = {
	matcher: [
		// Run middleware for all application routes except Next internals & static files
		// Do NOT exclude `/api` here, we need it for tRPC.
		"/((?!_next|.*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|map|txt|xml|csv|pdf|zip|webmanifest)).*)",
		// Always include API (tRPC lives under /api/trpc)
		"/(api|trpc)(.*)",
	],
};
