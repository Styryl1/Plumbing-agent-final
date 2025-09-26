import { openai } from "@ai-sdk/openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TRPCError } from "@trpc/server";
import { generateObject } from "ai";
import { logAiProposalAudit } from "~/lib/audit";
import { env } from "~/lib/env";
import { IntakeEventDetailsSchema } from "~/schema/intake";
import { mustSingle } from "~/server/db/unwrap";
import { AiProposal, type TAiProposal } from "~/server/schemas/aiProposal";
import { createSlotHolds } from "~/server/services/scheduling/slotHolds";
import type { Database, Json, TableInsert, TableRow } from "~/types/supabase";

export const PROPOSAL_SYSTEM_PROMPT = `
You are an intake-to-proposal assistant for a plumbing service in the Netherlands.
Output ONLY a JSON object that validates against the provided JSON Schema.
- Use customer's language if clear; else 'nl'.
- Provide 3–5 time slots in Europe/Amsterdam, 60–120 min each, travel-aware if a location is present.
- Labor in minutes (int).
- Prices in EUR **cents**; include VAT rate (0, 9, or 21).
- Be conservative: when uncertain, widen estimate range and lower confidence.
- Flag hazards (gas/electric/asbestos/sewage) if suspected.
- Checklist: 5–10 short, practical steps.
- Never include personally identifiable data beyond what’s in the intake.
- This system is propose-only; human will approve or edit before scheduling.
`;

const PROPOSAL_MODEL = "gpt-4.1-mini";

type DB = SupabaseClient<Database>;

type GenerateProposalParams = {
	db: DB;
	orgId: string;
	userId: string;
	intakeId: string;
	timezone?: string;
};

type ProposalInsert = TableInsert<"ai_proposals">;

type ProposalRow = TableRow<"ai_proposals">;

function assertAiConfigured(): void {
	if (env.AI_MODE !== "openai" || !env.OPENAI_API_KEY) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "AI proposal generation is not configured",
		});
	}
}

function buildPrompt(input: {
	intake: ProposalSource;
	locale: string;
}): string {
	const { intake, locale } = input;
	const blocks: string[] = [];

	blocks.push(`Locale preference: ${locale}`);
	blocks.push(`Intake summary:\n${intake.summary}`);
	blocks.push(`Channel: ${intake.channel}\nPriority: ${intake.priority}`);

	if (intake.voiceTranscript !== null && intake.voiceTranscript !== undefined) {
		blocks.push(
			`Voice transcript (${intake.voiceTranscript.lang}):\n${intake.voiceTranscript.text}`,
		);
	}

	if (intake.whatsappMessages.length !== 0) {
		blocks.push(
			`WhatsApp excerpts:\n${intake.whatsappMessages
				.map((message) => `- ${message}`)
				.join("\n")}`,
		);
	}

	if (intake.analyzer != null) {
		blocks.push(
			`Heuristic analyzer output:\n${JSON.stringify(intake.analyzer, null, 2)}`,
		);
	}

	if (typeof intake.address === "string" && intake.address.length > 0) {
		blocks.push(`Address context:\n${intake.address}`);
	}

	blocks.push(
		`Full intake payload:\n${JSON.stringify(
			{
				id: intake.id,
				receivedAt: intake.receivedAt,
				snippet: intake.snippet,
				details: intake.details,
			},
			null,
			2,
		)}`,
	);

	return blocks.join("\n\n");
}

type ProposalSource = {
	id: string;
	receivedAt: string | null;
	summary: string;
	snippet: string;
	channel: string;
	priority: string;
	voiceTranscript?: { text: string; lang: string } | null;
	whatsappMessages: string[];
	analyzer: unknown;
	address?: string | null;
	details: unknown;
};

type ProposalResult = {
	proposal: ProposalRow;
	payload: TAiProposal;
	holds: TableRow<"slot_holds">[];
};

export async function generateProposalFromIntake({
	db,
	orgId,
	userId,
	intakeId,
	timezone,
}: GenerateProposalParams): Promise<ProposalResult> {
	assertAiConfigured();

	const intakeQuery = await db
		.from("intake_events")
		.select(
			`
				id,
				summary,
				priority,
				received_at,
				details,
				customer_id,
				customers:customers(id, name, city, postal_code, street, language)
			`,
		)
		.eq("org_id", orgId)
		.eq("id", intakeId)
		.maybeSingle();

	const intakeRow = mustSingle(intakeQuery);
	const detailsResult = IntakeEventDetailsSchema.safeParse(intakeRow.details);

	if (!detailsResult.success) {
		await logAiProposalAudit(db, {
			orgId,
			userId,
			action: "view",
			eventType: "ai.proposal.failed",
			metadata: {
				intakeId,
				reason: "invalid_intake_details",
				issues: detailsResult.error.issues,
			},
		});
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Intake details invalid",
		});
	}

	const details = detailsResult.data;
	const voiceTranscript = details.voice?.transcript ?? null;
	const messageIds = details.whatsapp?.messageIds;
	const whatsappMessages = Array.isArray(messageIds)
		? messageIds.slice(0, 10)
		: [];
	const priority =
		typeof intakeRow.priority === "string" && intakeRow.priority.length > 0
			? intakeRow.priority
			: "normal";

	const customerDetails = intakeRow.customers ?? null;
	const address =
		customerDetails &&
		typeof customerDetails.street === "string" &&
		customerDetails.street.length > 0 &&
		typeof customerDetails.postal_code === "string" &&
		customerDetails.postal_code.length > 0
			? `${customerDetails.street}, ${customerDetails.postal_code} ${customerDetails.city ?? ""}`.trim()
			: null;

	const intake: ProposalSource = {
		id: intakeRow.id,
		receivedAt: intakeRow.received_at,
		summary: intakeRow.summary ?? details.summary,
		snippet: details.snippet,
		channel: details.channel,
		priority,
		voiceTranscript,
		whatsappMessages,
		analyzer: details.analyzer ?? null,
		address,
		details,
	};

	const transcriptLanguage =
		details.voice?.transcript !== undefined
			? details.voice.transcript.lang
			: null;
	const customerLanguage =
		customerDetails && typeof customerDetails.language === "string"
			? customerDetails.language
			: null;
	const localeGuess = transcriptLanguage ?? customerLanguage ?? "nl";
	const prompt = buildPrompt({ intake, locale: localeGuess });

	let proposalCandidate: unknown;
	try {
		const result = await generateObject({
			model: openai(PROPOSAL_MODEL),
			system: PROPOSAL_SYSTEM_PROMPT,
			prompt,
			schema: AiProposal,
		});
		proposalCandidate = result.object;
	} catch (error) {
		await logAiProposalAudit(db, {
			orgId,
			userId,
			action: "view",
			eventType: "ai.proposal.failed",
			metadata: {
				intakeId,
				error: error instanceof Error ? error.message : "unknown",
			},
		});
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to generate proposal",
		});
	}

	const parsed = AiProposal.safeParse(proposalCandidate);

	if (!parsed.success) {
		await logAiProposalAudit(db, {
			orgId,
			userId,
			action: "view",
			eventType: "ai.proposal.failed",
			metadata: {
				intakeId,
				issues: parsed.error.issues,
			},
		});
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "AI proposal validation failed",
		});
	}

	const payload = parsed.data;
	const insert: ProposalInsert = {
		org_id: orgId,
		intake_id: intakeRow.id,
		customer_id: intakeRow.customer_id ?? null,
		locale: payload.locale,
		confidence: payload.confidence,
		status: "new",
		payload: payload as unknown as Json,
		created_by: userId,
	};

	const insertResponse = await db
		.from("ai_proposals")
		.insert(insert)
		.select()
		.single();

	const proposalRow = mustSingle<ProposalRow>({
		data: insertResponse.data as ProposalRow | null,
		error: insertResponse.error,
	});

	const holds = await createSlotHolds({
		db,
		orgId,
		proposalId: proposalRow.id,
		userId,
		slots: payload.slots,
		...(timezone ? { timezone } : {}),
	});

	await logAiProposalAudit(db, {
		orgId,
		userId,
		action: "create",
		eventType: "ai.proposal.created",
		proposalId: proposalRow.id,
		metadata: {
			intakeId,
			confidence: payload.confidence,
			slots: holds.map((hold) => ({
				id: hold.id,
				start: hold.start_ts,
				end: hold.end_ts,
			})),
		},
		after: {
			proposal: payload,
		},
	});

	return {
		proposal: proposalRow,
		payload,
		holds,
	};
}
