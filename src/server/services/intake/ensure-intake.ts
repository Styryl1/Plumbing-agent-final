import type { SupabaseClient } from "@supabase/supabase-js";
import { Temporal } from "temporal-polyfill";
import { logAuditEvent } from "~/lib/audit";
import {
	type AnalyzerResult,
	IntakeEventDetailsSchema,
	type MediaRef,
	type Transcript,
} from "~/schema/intake";
import type { Database, Json, Tables } from "~/types/supabase";

type DB = SupabaseClient<Database>;
type UnscheduledStatus = "pending" | "applied" | "dismissed";
type UnscheduledSummaryRow = Pick<
	Tables<"unscheduled_items">,
	"id" | "status" | "priority"
>;
type IntakeEventRow = Tables<"intake_events">;

const isUnscheduledRow = (value: unknown): value is UnscheduledSummaryRow => {
	if (value === null || typeof value !== "object") return false;
	const candidate = value as Record<string, unknown>;
	return (
		typeof candidate.id === "string" &&
		typeof candidate.status === "string" &&
		typeof candidate.priority === "string"
	);
};

const truncate = (value: string, limit: number): string =>
	value.length <= limit ? value : `${value.slice(0, limit - 1)}…`;

const mapUrgencyToPriority = (
	urgency: AnalyzerResult["urgency"] | undefined,
): "normal" | "urgent" | "emergency" => {
	switch (urgency) {
		case "emergency":
			return "emergency";
		case "urgent":
			return "urgent";
		case "normal":
			return "normal";
		default:
			return "normal";
	}
};

export type EnsureIntakeForWhatsAppParams = {
	db: DB;
	orgId: string;
	conversationId: string;
	waContactId: string;
	waConversationId: string;
	waMessageIds: string[];
	messageRowIds: string[];
	summary: string;
	snippet: string;
	lastMessageIso: string;
	analyzer?: AnalyzerResult;
	media: MediaRef[];
};

export async function ensureIntakeForWhatsApp(
	params: EnsureIntakeForWhatsAppParams,
): Promise<string | null> {
	const {
		db,
		orgId,
		conversationId,
		waContactId,
		waConversationId,
		waMessageIds,
		messageRowIds,
		summary,
		snippet,
		lastMessageIso,
		analyzer,
		media,
	} = params;

	const lastInstant = (() => {
		try {
			return Temporal.Instant.from(lastMessageIso).toString();
		} catch {
			return Temporal.Now.instant().toString();
		}
	})();

	const normalizedSummary = truncate(summary, 280);
	const normalizedSnippet = truncate(snippet, 500);

	const detailsInput = IntakeEventDetailsSchema.parse({
		channel: "whatsapp",
		summary: normalizedSummary,
		snippet: normalizedSnippet,
		lastMessageIso: lastInstant,
		media,
		analyzer,
		whatsapp: {
			waContactId,
			waConversationId,
			lastMessageId: waMessageIds[waMessageIds.length - 1] ?? "",
			messageIds: waMessageIds,
		},
	});

	const nowIso = Temporal.Now.instant().toString();

	const intakeUpsert = await db
		.from("intake_events")
		.upsert(
			{
				org_id: orgId,
				source: "whatsapp",
				source_ref: waContactId,
				channel: "whatsapp",
				summary: normalizedSummary,
				details: detailsInput,
				received_at: lastInstant,
				updated_at: nowIso,
				priority: mapUrgencyToPriority(analyzer?.urgency),
			},
			{ onConflict: "org_id,source,source_ref" },
		)
		.select("*")
		.single();

	const intakeRow = intakeUpsert.data as IntakeEventRow | null;
	const intakeId = intakeRow?.id ?? null;
	if (!intakeId) {
		return null;
	}

	await db
		.from("wa_conversations")
		.update({ intake_event_id: intakeId })
		.eq("org_id", orgId)
		.eq("id", conversationId);

	if (messageRowIds.length > 0) {
		await db
			.from("wa_messages")
			.update({ intake_event_id: intakeId })
			.in("id", messageRowIds);
	}

	const existingUnscheduled = await db
		.from("unscheduled_items")
		.select("id,status,priority")
		.eq("org_id", orgId)
		.eq("intake_event_id", intakeId)
		.maybeSingle();

	const existingUnscheduledRow = isUnscheduledRow(existingUnscheduled.data)
		? existingUnscheduled.data
		: null;
	const existingStatus = existingUnscheduledRow?.status;
	const preservedStatus: UnscheduledStatus =
		existingStatus === "applied" || existingStatus === "dismissed"
			? existingStatus
			: "pending";

	const unscheduledPayload = {
		org_id: orgId,
		intake_event_id: intakeId,
		status: preservedStatus,
		priority: mapUrgencyToPriority(analyzer?.urgency),
		metadata: {
			waConversationId,
			waContactId,
			lastMessageId: waMessageIds[waMessageIds.length - 1] ?? null,
		},
		...(typeof existingUnscheduledRow?.id === "string"
			? { id: existingUnscheduledRow.id }
			: {}),
	};

	const unscheduled = await db
		.from("unscheduled_items")
		.upsert(unscheduledPayload, { onConflict: "org_id,intake_event_id" })
		.select("id,status,priority")
		.single();

	const unscheduledRow = isUnscheduledRow(unscheduled.data)
		? unscheduled.data
		: null;

	await logAuditEvent(db, {
		orgId,
		actorType: "system",
		action: "update",
		resource: "intake_event",
		resourceId: intakeId,
		summary: "intake_event.whatsapp.upsert",
		after: {
			channel: "whatsapp",
			priority: intakeRow?.priority,
			lastMessageIso: lastInstant,
		},
		metadata: {
			waContactId,
			waConversationId,
			messageCount: waMessageIds.length,
		},
	});

	if (unscheduledRow && typeof unscheduledRow.id === "string") {
		await logAuditEvent(db, {
			orgId,
			actorType: "system",
			action: "update",
			resource: "unscheduled_item",
			resourceId: unscheduledRow.id,
			summary: "unscheduled_item.ensure",
			metadata: {
				status: unscheduledRow.status,
				priority: unscheduledRow.priority,
				intakeEventId: intakeId,
			},
		});
	}

	return intakeId;
}

export type EnsureIntakeForVoiceParams = {
	db: DB;
	orgId: string;
	callId: string;
	externalCallId: string;
	direction: "inbound" | "outbound";
	receivedAtIso: string;
	summary: string;
	snippet: string;
	callerNumber?: string | null;
	receiverNumber?: string | null;
	startedAt?: string | null;
	endedAt?: string | null;
	durationSeconds?: number | null;
	recording?: MediaRef;
	transcript?: Transcript | null;
	providerMetadata?: Json | null;
};

export async function ensureIntakeForVoice(
	params: EnsureIntakeForVoiceParams,
): Promise<string | null> {
	const {
		db,
		orgId,
		callId,
		externalCallId,
		direction,
		receivedAtIso,
		summary,
		snippet,
		callerNumber,
		receiverNumber,
		startedAt,
		endedAt,
		durationSeconds,
		recording,
		transcript,
		providerMetadata,
	} = params;

	const normalizedSummary = truncate(summary, 280);
	const normalizedSnippet = truncate(snippet, 500);
	const receivedInstant = (() => {
		try {
			return Temporal.Instant.from(receivedAtIso).toString();
		} catch {
			return Temporal.Now.instant().toString();
		}
	})();

	const mediaRefs: MediaRef[] = recording ? [recording] : [];
	const detailsInput = IntakeEventDetailsSchema.parse({
		channel: "voice",
		summary: normalizedSummary,
		snippet: normalizedSnippet,
		lastMessageIso: receivedInstant,
		media: mediaRefs,
		voice: {
			callId,
			direction,
			callerNumber,
			receiverNumber,
			durationSeconds: durationSeconds ?? undefined,
			recording: recording,
			transcript,
		},
	});

	const nowIso = Temporal.Now.instant().toString();
	const metadataPayload: Json = providerMetadata ?? {};

	const intakeUpsert = await db
		.from("intake_events")
		.upsert(
			{
				org_id: orgId,
				source: "voice",
				source_ref: callId,
				channel: "voice",
				summary: normalizedSummary,
				details: detailsInput,
				received_at: receivedInstant,
				updated_at: nowIso,
				priority: "normal",
			},
			{ onConflict: "org_id,source,source_ref" },
		)
		.select("*")
		.single();

	const intakeVoiceRow = intakeUpsert.data as IntakeEventRow | null;
	const intakeId = intakeVoiceRow?.id ?? null;
	if (!intakeId) {
		return null;
	}

	const existingVoiceUnscheduled = await db
		.from("unscheduled_items")
		.select("id,status,priority")
		.eq("org_id", orgId)
		.eq("intake_event_id", intakeId)
		.maybeSingle();

	const existingVoiceRow = isUnscheduledRow(existingVoiceUnscheduled.data)
		? existingVoiceUnscheduled.data
		: null;
	const existingVoiceStatus =
		typeof existingVoiceRow?.status === "string"
			? (existingVoiceRow.status as UnscheduledStatus)
			: undefined;
	const preservedVoiceStatus: UnscheduledStatus =
		existingVoiceStatus !== undefined && existingVoiceStatus !== "pending"
			? existingVoiceStatus
			: "pending";

	const voiceUnscheduledPayload = {
		org_id: orgId,
		intake_event_id: intakeId,
		status: preservedVoiceStatus,
		priority: "normal",
		metadata: {
			callId,
			direction,
		},
		...(typeof existingVoiceRow?.id === "string"
			? { id: existingVoiceRow.id }
			: {}),
	};

	const unscheduled = await db
		.from("unscheduled_items")
		.upsert(voiceUnscheduledPayload, { onConflict: "org_id,intake_event_id" })
		.select("id,status,priority")
		.single();

	const unscheduledVoiceRow = isUnscheduledRow(unscheduled.data)
		? unscheduled.data
		: null;

	await db.from("intake_voice_calls").upsert(
		{
			intake_event_id: intakeId,
			org_id: orgId,
			provider: "messagebird",
			external_call_id: externalCallId,
			caller_number: callerNumber ?? null,
			receiver_number: receiverNumber ?? null,
			started_at: startedAt ?? null,
			ended_at: endedAt ?? null,
			duration_seconds: durationSeconds ?? null,
			recording_storage_key: recording?.storageKey ?? null,
			transcript: transcript?.text ?? null,
			transcript_language: transcript?.lang ?? null,
			transcript_confidence: transcript?.confidence ?? null,
			metadata: metadataPayload,
		},
		{ onConflict: "external_call_id" },
	);

	await logAuditEvent(db, {
		orgId,
		actorType: "system",
		action: "update",
		resource: "intake_event",
		resourceId: intakeId,
		summary: "intake_event.voice.upsert",
		after: {
			channel: "voice",
			priority: intakeVoiceRow?.priority,
			receivedAtIso,
		},
		metadata: {
			callId,
			direction,
			durationSeconds,
			recordingStored: Boolean(recording?.storageKey),
		},
	});

	if (unscheduledVoiceRow && typeof unscheduledVoiceRow.id === "string") {
		await logAuditEvent(db, {
			orgId,
			actorType: "system",
			action: "update",
			resource: "unscheduled_item",
			resourceId: unscheduledVoiceRow.id,
			summary: "unscheduled_item.ensure",
			metadata: {
				status: unscheduledVoiceRow.status,
				priority: unscheduledVoiceRow.priority,
				intakeEventId: intakeId,
			},
		});
	}

	return intakeId;
}
