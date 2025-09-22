import { openai } from "@ai-sdk/openai";
import { experimental_transcribe as transcribe } from "ai";
import { NextResponse } from "next/server";
import { env } from "~/lib/env";
import { SttResponseSchema } from "~/schema/ai";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
	if (!env.OPENAI_API_KEY) {
		return NextResponse.json(
			{ error: "Speech-to-text provider not configured" },
			{ status: 503 },
		);
	}

	const form = await req.formData();
	const file = form.get("file");

	if (!(file instanceof File)) {
		return NextResponse.json(
			{ error: "Audio file is required" },
			{ status: 400 },
		);
	}

	if (file.size === 0) {
		return NextResponse.json({ error: "Audio file is empty" }, { status: 400 });
	}

	try {
		const audioBuffer = await file.arrayBuffer();
		const result = await transcribe({
			model: openai.transcription("whisper-1"),
			audio: new Uint8Array(audioBuffer),
			providerOptions: {
				openai: {
					language: "nl",
				},
			},
		});

		const payload = SttResponseSchema.parse({
			transcript: result.text.trim(),
			lang: result.language === "en" ? "en" : "nl",
			confidence:
				typeof (result as { confidence?: number }).confidence === "number"
					? (result as { confidence?: number }).confidence
					: undefined,
		});

		return NextResponse.json(payload);
	} catch (error) {
		console.error("STT transcription failed", error);
		return NextResponse.json(
			{ error: "Failed to transcribe audio" },
			{ status: 500 },
		);
	}
}
