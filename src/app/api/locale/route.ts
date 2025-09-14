import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

type Locale = "en" | "nl";
const isLocale = (x: unknown): x is Locale => x === "en" || x === "nl";

export async function POST(req: Request): Promise<NextResponse> {
	const { locale } = (await req.json().catch(() => ({}))) as {
		locale?: unknown;
	};
	if (!isLocale(locale)) {
		return NextResponse.json(
			{ ok: false, error: "Invalid locale" },
			{ status: 400 },
		);
	}

	const res = NextResponse.json({ ok: true });
	res.cookies.set("locale", locale, {
		path: "/",
		maxAge: 60 * 60 * 24 * 365,
		httpOnly: false,
		sameSite: "lax",
	});

	// Persist on profile if signed-in (best effort)
	const { userId } = await auth();
	if (userId) {
		try {
			const client = await clerkClient();
			await client.users.updateUser(userId, { publicMetadata: { locale } });
		} catch {
			// Ignore errors - cookie is still set
		}
	}

	return res;
}
