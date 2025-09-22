import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "~/lib/env";
import { DiagnosisSuggestionSchema } from "~/schema/ai";

const MODEL_ID = "gpt-4.1-mini";

export const runtime = "nodejs";

const ChatRequestSchema = z.object({
	messages: z.array(z.unknown()),
	context: z
		.object({
			voiceTranscript: z.string().nullable().optional(),
			ocrText: z.string().nullable().optional(),
			extraNotes: z.string().nullable().optional(),
			locale: z.enum(["nl", "en"]).optional(),
		})
		.optional(),
});

type ChatRequest = z.infer<typeof ChatRequestSchema>;

function buildContextPatch(context?: ChatRequest["context"]): string | null {
	if (!context) {
		return null;
	}

	const parts: string[] = [];

	if (context.voiceTranscript?.trim()) {
		parts.push(`Voice transcript:\n${context.voiceTranscript.trim()}`);
	}

	if (context.ocrText?.trim()) {
		parts.push(`Screenshot OCR:\n${context.ocrText.trim()}`);
	}

	if (context.extraNotes?.trim()) {
		parts.push(`Operator notes:\n${context.extraNotes.trim()}`);
	}

	if (parts.length === 0) {
		return null;
	}

	return `Aanvullende context vanuit dashboard:\n\n${parts.join("\n\n")}`;
}

const SYSTEM_PROMPT = `Je bent een AI-hulp voor Nederlandse loodgieters. Geef altijd een voorstel in JSON (UTF-8) dat exact voldoet aan het volgende schema:
{
  "issue": string (diagnose in het Nederlands),
  "confidence": number tussen 0 en 1 met maximaal 2 decimalen,
  "urgency": "non-urgent" | "urgent" | "emergency",
  "materials": [ { "name": string, "qty"?: number } ],
  "labor_hours": number tussen 0 en 24,
  "time_estimate_minutes"?: geheel getal tussen 0 en 480,
  "notes": string[] (Nederlands, korte bullets)
}

Regels:
- Werk altijd in het Nederlands tenzij de plumber expliciet Engels vraagt.
- Voeg alleen materialen toe die echt nodig zijn; laat weg als onbekend.
- Tijdsinschatting in minuten, 24-uurs referenties (geen AM/PM).
- Waarschuw in notes als extra inspectie of vergunning nodig is.
- Alle outputs zijn voorstellen en vereisen menselijke review (geen opdrachten).
- Houd rekening met context uit voice transcript of screenshots als beschikbaar.
- Antwoord alleen met JSON zonder extra tekst.`;

export async function POST(req: Request): Promise<Response> {
	if (!env.OPENAI_API_KEY) {
		return NextResponse.json(
			{ error: "AI provider not configured" },
			{ status: 503 },
		);
	}

	const { messages, context } = ChatRequestSchema.parse(await req.json());
	const typedMessages = messages as UIMessage[];

	const appendedContext = buildContextPatch(context);

	const modelMessages = convertToModelMessages(typedMessages);

	if (appendedContext) {
		modelMessages.push({
			role: "user",
			content: appendedContext,
		});
	}

	const result = streamText({
		model: openai(MODEL_ID),
		system: SYSTEM_PROMPT,
		messages: modelMessages,
		onFinish({ text }) {
			try {
				DiagnosisSuggestionSchema.parse(JSON.parse(text));
			} catch (error) {
				console.warn("AI JSON validation failed", { error });
			}
		},
		onError({ error }) {
			console.error("AI chat streaming error", error);
		},
	});

	return result.toUIMessageStreamResponse({
		headers: {
			"x-ai-model": MODEL_ID,
		},
	});
}
