import { useTranslations } from "next-intl";
/**
 * WhatsApp Message Analyzer Service (S2)
 * Provides AI analysis of inbound WhatsApp messages with rule-based and OpenAI modes
 */

import type { SupabaseClient } from "@supabase/supabase-js";
// Temporal imported for future use in timestamping analysis runs
import { env } from "~/lib/env";
// WhatsApp AI analyzer service for message processing
import { mustSingle } from "~/server/db/unwrap";
import type { Database } from "~/types/supabase";

export interface AnalyzerResult {
	proposed_text: string;
	tags: string[];
	urgency: "low" | "normal" | "high";
	confidence: number;
	materials_stub?: string[];
	time_stub?: string;
}

export type AnalysisResult = {
	proposed_text: string;
	tags: string[];
	urgency: "low" | "medium" | "high";
	confidence: number;
	time_estimate_min: number | null;
};

export type AnalyzeInboundParams = {
	orgId: string;
	conversationId: string;
	messageId: string;
	text?: string | null;
	mediaKey?: string | null;
	aiMode?: "rule" | "openai";
};

/**
 * Analyzes inbound WhatsApp messages and returns structured suggestions
 */
export async function analyzeInbound(
	params: AnalyzeInboundParams,
): Promise<AnalyzerResult> {
	const { text, aiMode = env.AI_MODE } = params;

	// Default to rule-based analysis
	if (aiMode === "rule" || !env.OPENAI_API_KEY) {
		return analyzeWithRules(text);
	}

	// OpenAI analysis with fallback to rules
	try {
		return await analyzeWithOpenAI(params);
	} catch (error) {
		console.warn("OpenAI analysis failed, falling back to rules:", error);
		return analyzeWithRules(text);
	}
}

/**
 * Rule-based message analysis (default, no network calls)
 */
function analyzeWithRules(text?: string | null): AnalyzerResult {
	const content = text?.toLowerCase() ?? "";
	const tags: string[] = [];
	let urgency: "low" | "normal" | "high" = "low";
	let materials_stub: string[] = [];
	let time_stub = "45-60 minuten";
	let confidence = 0.6; // Base confidence for rule-based

	// Detect leak/burst patterns
	if (
		content.includes("lek") ||
		content.includes("lekkage") ||
		content.includes("burst") ||
		content.includes("water")
	) {
		tags.push("lekkage", "urgent");
		urgency = "high";
		materials_stub = ["Reparatieset lekkage", "Nieuwe kraan/fitting"];
		time_stub = "60-90 minuten";
		confidence = 0.75;

		return {
			proposed_text:
				"Bedankt voor uw bericht over de lekkage. Om u zo snel mogelijk te helpen, heb ik de volgende informatie nodig:\n\n1. Uw postcode\n2. Een foto van de situatie\n3. Heeft u de hoofdkraan al dichtgedraaid?\n\nIk neem dan direct contact op om een monteur te sturen.",
			tags,
			urgency,
			confidence,
			materials_stub,
			time_stub,
		};
	}

	// Detect clog/blockage patterns
	if (
		content.includes("verstopt") ||
		content.includes("verstopping") ||
		content.includes("afvoer") ||
		content.includes("toilet") ||
		content.includes("clog")
	) {
		tags.push("verstopt", "afvoer");
		urgency = "normal";
		materials_stub = ["Ontstopper", "Spiraal", "Afvoerbuis"];
		time_stub = "75-120 minuten";
		confidence = 0.7;

		return {
			proposed_text:
				"Ik begrijp dat u last heeft van een verstopping. Voor een juiste inschatting heb ik graag:\n\n1. Uw postcode\n2. Welke afvoer is verstopt? (toilet/douche/gootsteen)\n3. Een foto indien mogelijk\n\nIk plan dan een monteur in voor vandaag of morgen.",
			tags,
			urgency,
			confidence,
			materials_stub,
			time_stub,
		};
	}

	// Detect heating/boiler issues
	if (
		content.includes("verwarming") ||
		content.includes("cv") ||
		content.includes("ketel") ||
		content.includes("radiator") ||
		content.includes("heating")
	) {
		tags.push("verwarming", "cv");
		urgency = "normal";
		materials_stub = ["Thermostaat", "CV onderdelen", "Radiatorkraan"];
		time_stub = "90-150 minuten";
		confidence = 0.65;

		return {
			proposed_text:
				"Bedankt voor uw bericht over de verwarmingsproblemen. Voor een goede diagnose heb ik nodig:\n\n1. Uw postcode\n2. Type ketel (merk/model indien bekend)\n3. Foto van eventuele foutmeldingen\n\nIk stuur zo snel mogelijk een monteur langs.",
			tags,
			urgency,
			confidence,
			materials_stub,
			time_stub,
		};
	}

	// Default response for general inquiries
	tags.push("algemeen");
	return {
		proposed_text:
			"Bedankt voor uw bericht. Om u de beste service te bieden, heb ik graag de volgende informatie:\n\n1. Uw postcode\n2. Omschrijving van het probleem\n3. Foto's indien mogelijk\n\nDan kan ik u direct verder helpen met een oplossing.",
		tags,
		urgency,
		confidence: 0.55,
		materials_stub,
		time_stub,
	};
}

/**
 * OpenAI-powered analysis with guardrails and timeout
 */
async function analyzeWithOpenAI(
	params: AnalyzeInboundParams,
): Promise<AnalyzerResult> {
	const { text, mediaKey } = params;

	if (!env.OPENAI_API_KEY) {
		throw new Error("OpenAI API key not configured");
	}

	const prompt = `Je bent een AI-assistent voor een Nederlandse loodgietersdienst. Analyseer dit WhatsApp-bericht en geef een gestructureerd antwoord:

Bericht: "${text ?? ""}"
${mediaKey ? "Er is ook media bijgevoegd." : ""}

Geef terug in JSON formaat:
{
  "proposed_text": "Professionele Nederlandse reactie met vraag om postcode en foto",
  "tags": ["relevante tags zoals lekkage, verstopt, etc."],
  "urgency": "low/normal/high",
  "confidence": 0.8,
  "materials_stub": ["Reparatieset", "Nieuwe onderdelen"],
  "time_stub": "60-90 minuten"
}

Urgentie regels:
- high: lekkages, overstroming, geen water
- normal: verstoppingen, verwarmingsuitval  
- low: algemeen onderhoud, vragen

Houd je reactie professioneel maar vriendelijk, vraag altijd om postcode en foto's.`;

	const controller = new AbortController();
	const timeoutId = setTimeout(() => {
		controller.abort();
	}, 3000); // 3 second timeout

	try {
		const response = await fetch("https://api.openai.com/v1/chat/completions", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${env.OPENAI_API_KEY}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: "gpt-3.5-turbo",
				messages: [
					{
						role: "user",
						content: prompt,
					},
				],
				max_tokens: 500,
				temperature: 0.7,
			}),
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			throw new Error(`OpenAI API error: ${response.status}`);
		}

		const data = (await response.json()) as {
			choices: Array<{
				message: {
					content: string;
				};
			}>;
		};

		const content = data.choices[0]?.message.content ?? "";
		if (content.length === 0) {
			throw new Error("No response from OpenAI");
		}

		// Parse JSON response with fallback
		try {
			const parsed = JSON.parse(content) as AnalyzerResult;
			// Validate the response structure
			const hasValidText = parsed.proposed_text.length > 0;
			const hasValidUrgency = parsed.urgency.length > 0;
			if (!hasValidText || !Array.isArray(parsed.tags) || !hasValidUrgency) {
				throw new Error("Invalid OpenAI response structure");
			}
			return parsed;
		} catch {
			throw new Error("Failed to parse OpenAI JSON response");
		}
	} catch (error) {
		clearTimeout(timeoutId);
		throw error;
	}
}

/**
 * Persists analysis result to wa_suggestions table
 */
export async function persistSuggestion(
	db: SupabaseClient<Database>,
	params: AnalyzeInboundParams,
	result: AnalyzerResult,
): Promise<Database["public"]["Tables"]["wa_suggestions"]["Row"]> {
	const { orgId, conversationId, messageId, aiMode = "rule" } = params;

	// Look up the wa_messages.id by wa_message_id to get the correct FK reference
	const messageQuery = await db
		.from("wa_messages")
		.select("id")
		.eq("wa_message_id", messageId)
		.eq("org_id", orgId)
		.single();

	const message = mustSingle(messageQuery);

	const suggestionData: Database["public"]["Tables"]["wa_suggestions"]["Insert"] =
		{
			org_id: orgId,
			conversation_id: conversationId,
			message_id: message.id,
			proposed_text: result.proposed_text,
			tags: result.tags,
			urgency: result.urgency,
			confidence: result.confidence,
			// materials_stub: result.materials_stub ?? null, // TODO: Add to schema
			// time_stub: result.time_stub ?? null, // TODO: Add to schema
			source: aiMode,
		};

	const { data, error } = await db
		.from("wa_suggestions")
		.insert(suggestionData)
		.select()
		.single();

	if (error) {
		throw new Error(`Failed to persist suggestion: ${error.message}`);
	}

	return data;
}

/**
 * Combined analyze and persist function for webhook integration
 */
export async function analyzeAndPersist(
	db: SupabaseClient<Database>,
	params: AnalyzeInboundParams,
): Promise<Database["public"]["Tables"]["wa_suggestions"]["Row"] | null> {
	try {
		const result = await analyzeInbound(params);
		return await persistSuggestion(db, params, result);
	} catch (error) {
		// Log error but don't throw - analysis failures should be non-fatal
		console.error("WhatsApp analysis failed:", error);
		return null;
	}
}
