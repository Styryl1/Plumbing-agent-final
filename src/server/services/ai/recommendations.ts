import { openai } from "@ai-sdk/openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateObject } from "ai";
import { Temporal } from "temporal-polyfill";
import { logAuditEvent } from "~/lib/audit";
import { env } from "~/lib/env";
import { logger } from "~/lib/log";
import { VoiceRecommendationSchema } from "~/server/schemas/aiRecommendation";
import type { Database, Json } from "~/types/supabase";

const MODEL_ID = "gpt-4.1-mini";

type DB = SupabaseClient<Database>;

type VoiceRecommendationInput = {
	db: DB;
	orgId: string;
	intakeId: string;
	transcript: string | null | undefined;
	language?: "nl" | "en" | null;
	callDirection?: "inbound" | "outbound";
	durationSeconds?: number | null;
	callerNumber?: string | null;
	receivedAtIso?: string | null;
};

function aiConfigured(): boolean {
	return env.AI_MODE === "openai" && Boolean(env.OPENAI_API_KEY);
}

export async function ensureVoiceRecommendation(
	input: VoiceRecommendationInput,
): Promise<void> {
	const {
		db,
		orgId,
		intakeId,
		transcript,
		language = "nl",
		callDirection,
		durationSeconds,
		callerNumber,
		receivedAtIso,
	} = input;

	try {
		const normalizedTranscript = transcript?.trim();
		if (!normalizedTranscript || normalizedTranscript.length < 20) {
			return;
		}

		if (!aiConfigured()) {
			logger.info("[ai] voice recommendation skipped (AI disabled)", {
				intakeId,
			});
			return;
		}

		const existing = await db
			.from("wa_suggestions")
			.select("id")
			.eq("org_id", orgId)
			.eq("intake_event_id", intakeId)
			.eq("channel", "voice")
			.limit(1)
			.maybeSingle();

		if (existing.data) {
			return;
		}

		const locale = language === "en" ? "en" : "nl";
		const directionLabel =
			callDirection === "outbound" ? "uitgaand" : "inkomend";
		const durationLabel =
			typeof durationSeconds === "number" && durationSeconds > 0
				? `${Math.round(durationSeconds / 60)} minuten`
				: "onbekend";
		const receivedLabel = (() => {
			if (!receivedAtIso) return "onbekend";
			try {
				return Temporal.Instant.from(receivedAtIso)
					.toZonedDateTimeISO("Europe/Amsterdam")
					.toString();
			} catch {
				return receivedAtIso;
			}
		})();

		const systemPrompt = `Je bent een AI-assistent voor Nederlandse loodgietersbedrijven. \n\nJe krijgt het transcript van een ${directionLabel} telefoongesprek met een klant.\nAnalyseer de situatie, beschrijf in maximaal 2 zinnen wat er aan de hand is en stel vervolgstappen voor.\n\nUitvoer in JSON volgens het schema. Gebruik zakelijke, duidelijke taal in het Nederlands (behalve als de input Engels is).\nAlle uitkomsten zijn suggesties en vereisen menselijke controle.`;

		const userPrompt = `Informatie:\n- Gespreksrichting: ${directionLabel}\n- Duur: ${durationLabel}\n- Ontvangen: ${receivedLabel}\n- Telefoonnummer: ${callerNumber ?? "onbekend"}\n\nTranscript (${locale})\n"""\n${normalizedTranscript}\n"""`;

		const response = await generateObject({
			model: openai(MODEL_ID, { temperature: 0.5, maxTokens: 600 }),
			schema: VoiceRecommendationSchema,
			system: systemPrompt,
			prompt: userPrompt,
		});

		const recommendation = VoiceRecommendationSchema.parse(response.object);
		const confidence = Math.min(Math.max(recommendation.confidence, 0), 1);
		const urgency = recommendation.urgency;
		const job = recommendation.job ?? null;
		const durationMinutes = job?.durationMinutes ?? null;
		const tags = recommendation.tags;
		const summary = recommendation.summary.trim();
		const action = recommendation.action.trim();

		const payload: Json = {
			version: recommendation.version,
			job,
			notes: recommendation.notes,
			tags,
			risks: recommendation.risks,
			call: {
				direction: typeof callDirection === "string" ? callDirection : null,
				durationSeconds:
					typeof durationSeconds === "number" ? durationSeconds : null,
				callerNumber:
					typeof callerNumber === "string" && callerNumber.length > 0
						? callerNumber
						: null,
				language: locale,
			},
			transcript: normalizedTranscript,
		};

		const insertResult = await db
			.from("wa_suggestions")
			.insert({
				org_id: orgId,
				intake_event_id: intakeId,
				channel: "voice",
				conversation_id: null,
				message_id: null,
				summary,
				proposed_text: action,
				confidence,
				urgency,
				tags,
				time_estimate_min: durationMinutes,
				source: "openai",
				payload,
			})
			.select("id")
			.single();

		if (insertResult.error) {
			throw insertResult.error;
		}

		const suggestionId = insertResult.data.id;

		await logAuditEvent(db, {
			orgId,
			actorType: "system",
			action: "create",
			resource: "ai_recommendation",
			resourceId: suggestionId,
			eventType: "ai.recommendation.generated",
			summary: "voice.recommendation.create",
			metadata: {
				channel: "voice",
				intakeId,
				confidence,
				urgency,
			},
		});
	} catch (error) {
		logger.error("[ai] voice recommendation failed", {
			error: error instanceof Error ? error.message : error,
			intakeId: input.intakeId,
		});
	}
}
