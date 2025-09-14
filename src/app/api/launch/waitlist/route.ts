import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { env, serverOnlyEnv } from "~/lib/env";

const waitlistSchema = z.object({
	email: z.email(),
	phone: z.string().optional().nullable(),
	org_name: z.string().optional().nullable(),
});

export async function POST(request: Request): Promise<Response> {
	try {
		const body = (await request.json()) as unknown;
		const validatedData = waitlistSchema.parse(body);

		// Use admin client for external submissions (no RLS)
		const supabase = createClient(
			env.SUPABASE_URL,
			serverOnlyEnv.SUPABASE_SERVICE_ROLE_KEY,
		);

		const { error } = await supabase.from("marketing_waitlist").insert({
			email: validatedData.email,
			phone: validatedData.phone ?? null,
			org_name: validatedData.org_name ?? null,
			locale: request.headers.get("accept-language")?.split(",")[0] ?? "nl",
			source: "launch_page",
		});

		if (error) {
			console.error("Waitlist insert error:", error);
			return Response.json({ error: "Database error" }, { status: 500 });
		}

		// Optional: Mirror to Airtable if configured
		if (serverOnlyEnv.AIRTABLE_WEBHOOK_URL) {
			try {
				await fetch(serverOnlyEnv.AIRTABLE_WEBHOOK_URL, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						email: validatedData.email,
						phone: validatedData.phone,
						org_name: validatedData.org_name,
						source: "launch_page",
					}),
				});
			} catch (airtableError) {
				// Don't fail the request if Airtable mirroring fails
				console.warn("Airtable webhook failed:", airtableError);
			}
		}

		return Response.json({ success: true });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return Response.json({ error: "Invalid input" }, { status: 400 });
		}
		console.error("Waitlist submission error:", error);
		return Response.json({ error: "Internal error" }, { status: 500 });
	}
}
