import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { Temporal } from "temporal-polyfill";
import type { z } from "zod";
import { env, serverOnlyEnv } from "~/lib/env";
import { logger } from "~/lib/log";
import { MediaRefSchema } from "~/schema/intake";
import { createSystemClient } from "~/server/db/client";
import type { EnsureIntakeForVoiceParams } from "~/server/services/intake/ensure-intake";
import { ensureIntakeForVoice } from "~/server/services/intake/ensure-intake";
import { verifyMessagebirdSignature } from "~/server/services/messagebird/signature";
import { storeVoiceRecording } from "~/server/services/voice/recording";
import {
	isWebhookEventDuplicate,
	recordWebhookEvent,
} from "~/server/services/webhooks/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const resolveEvents = (payload: unknown): unknown[] => {
	if (Array.isArray(payload)) return payload;
	if (payload !== null && typeof payload === "object") {
		const { events, data } = payload as {
			events?: unknown[];
			data?: unknown[];
		};
		if (Array.isArray(events)) return events;
		if (Array.isArray(data)) return data;
	}
	return payload === undefined || payload === null ? [] : [payload];
};

const resolveString = (value: unknown): string | null => {
	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : null;
	}
	if (typeof value === "number" && Number.isFinite(value)) {
		return value.toString();
	}
	return null;
};

const toMimeFromFormat = (format: string | null | undefined): string | null => {
	if (!format) return null;
	const lower = format.toLowerCase();
	if (lower === "wav") return "audio/wav";
	if (lower === "mp3" || lower === "mpeg") return "audio/mpeg";
	if (lower === "ogg") return "audio/ogg";
	if (lower === "m4a" || lower === "mp4") return "audio/mp4";
	return null;
};

const coerceNumber = (value: unknown): number | null => {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.length > 0) {
		const parsed = Number.parseFloat(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
};

const resolveTimestamp = (value: unknown): string | null => {
	const fromNumeric = (numeric: number): string | null => {
		if (!Number.isFinite(numeric)) return null;
		const milliseconds =
			Math.abs(numeric) >= 1_000_000_000_000 ? numeric : numeric * 1000;
		return Temporal.Instant.fromEpochMilliseconds(milliseconds).toString();
	};

	if (typeof value === "number") {
		return fromNumeric(value);
	}

	if (typeof value === "string") {
		const trimmed = value.trim();
		if (trimmed.length === 0) return null;
		const numericCandidate = Number(trimmed);
		if (!Number.isNaN(numericCandidate)) {
			const converted = fromNumeric(numericCandidate);
			if (converted) return converted;
		}
		try {
			return Temporal.Instant.from(trimmed).toString();
		} catch {
			try {
				return Temporal.ZonedDateTime.from(trimmed).toInstant().toString();
			} catch {
				try {
					return Temporal.PlainDateTime.from(trimmed)
						.toZonedDateTime("UTC")
						.toInstant()
						.toString();
				} catch {
					return null;
				}
			}
		}
	}

	return null;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
	const rawBody = await request.text();
	const signatureHeader = request.headers.get(env.MESSAGEBIRD_SIGNATURE_HEADER);
	const timestampHeader = request.headers.get(env.MESSAGEBIRD_TIMESTAMP_HEADER);

	const signatureValid = verifyMessagebirdSignature({
		secret: serverOnlyEnv.MESSAGEBIRD_WEBHOOK_SIGNING_KEY,
		signature: signatureHeader,
		timestamp: timestampHeader,
		rawBody,
	});

	if (!signatureValid) {
		return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
	}

	let payload: unknown;
	try {
		payload = JSON.parse(rawBody);
	} catch (error) {
		logger.error("MessageBird webhook invalid JSON", {
			error: error instanceof Error ? error.message : "Unknown error",
		});
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const events = resolveEvents(payload);
	if (events.length === 0) {
		return NextResponse.json({ ok: true, processed: 0 });
	}

	const db = createSystemClient();
	const nowInstant = Temporal.Now.instant();
	let latencyMs: number | null = null;
	if (timestampHeader !== null) {
		const headerNumber = Number(timestampHeader);
		if (Number.isFinite(headerNumber)) {
			const headerInstant = Temporal.Instant.fromEpochMilliseconds(
				headerNumber * 1000,
			);
			latencyMs = Math.max(
				0,
				nowInstant.epochMilliseconds - headerInstant.epochMilliseconds,
			);
		}
	}
	let processed = 0;
	const errors: Array<{ message: string; context?: unknown }> = [];

	for (const event of events) {
		try {
			await processEvent(db, event, { latencyMs });
			processed += 1;
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: typeof error === "string"
						? error
						: JSON.stringify(error);
			errors.push({ message, context: event });
			logger.error("MessageBird voice webhook processing failed", {
				error: message,
				event,
			});
		}
	}

	return NextResponse.json({ ok: errors.length === 0, processed, errors });
}

async function processEvent(
	db: ReturnType<typeof createSystemClient>,
	event: unknown,
	context: { latencyMs: number | null },
): Promise<void> {
	if (event === null || typeof event !== "object") {
		throw new Error("Unsupported event shape");
	}

	const record = event as Record<string, unknown>;
	const eventTypeRaw =
		resolveString(record.event) ??
		resolveString(record.type) ??
		"recording.finished";
	const eventType = eventTypeRaw.toLowerCase();
	const payload = (record.payload ?? record.data ?? record) as Record<
		string,
		unknown
	>;
	if (!eventType.includes("record")) {
		throw new Error(`Unsupported event type: ${eventType}`);
	}

	const call = (payload.call ?? payload.callData ?? {}) as Record<
		string,
		unknown
	>;
	const orgId =
		resolveString(call.clientReference) ??
		resolveString(payload.clientReference) ??
		resolveString(payload.orgId);

	if (orgId === null) {
		throw new Error("Missing org reference (clientReference)");
	}

	const callIdValue = call.id ?? payload.callId ?? payload.id;
	const callId = resolveString(callIdValue);
	if (callId === null) {
		throw new Error("Missing call identifier");
	}

	const rawEventId =
		record.id ?? payload.eventId ?? payload.id ?? call.id ?? payload.callId;
	const eventId = resolveString(rawEventId) ?? `voice-${callId}`;

	if (await isWebhookEventDuplicate({ eventId, provider: "messagebird", db })) {
		logger.warn("Duplicate MessageBird webhook skipped", { eventId });
		return;
	}

	const recordingUrl = resolveString(
		payload.url ?? payload.recordingUrl ?? payload.mediaUrl,
	);
	const mimeType =
		resolveString((payload.mimeType ?? payload.contentType) as string) ??
		toMimeFromFormat(resolveString(payload.format));

	const directionRaw =
		resolveString((call.direction ?? payload.direction) as string) ?? "inbound";
	const direction =
		directionRaw.toLowerCase() === "outbound" ? "outbound" : "inbound";

	const callerNumber = resolveString(call.source ?? call.from ?? payload.from);
	const receiverNumber = resolveString(
		call.destination ?? call.to ?? payload.to,
	);
	const durationSeconds = coerceNumber(
		call.duration ?? payload.duration ?? payload.length,
	);
	const startedAt = resolveTimestamp(
		call.createdAt ?? call.startedAt ?? payload.startedAt,
	);
	const endedAt = resolveTimestamp(
		call.endedAt ?? payload.endedAt ?? payload.finishedAt,
	);

	let mediaRef: z.infer<typeof MediaRefSchema> | undefined;
	if (recordingUrl !== null) {
		const recording = await storeVoiceRecording({
			db,
			url: recordingUrl,
			orgId,
			callId,
			mimeType,
		});

		if (recording.success) {
			mediaRef = MediaRefSchema.parse(recording.mediaRef);
		} else {
			logger.warn("Failed to store voice recording", {
				error: recording.error,
				orgId,
				callId,
			});
		}
	}

	const receivedAtIso =
		endedAt ?? startedAt ?? Temporal.Now.instant().toString();
	const summary =
		direction === "inbound"
			? "Inkomend telefoongesprek"
			: "Uitgaand telefoongesprek";
	const callerLabel = callerNumber ?? "Onbekend";
	const snippet = `${summary} van ${callerLabel}`;

	const voiceParams: EnsureIntakeForVoiceParams = {
		db,
		orgId,
		callId,
		externalCallId:
			resolveString(call.id ?? payload.callId ?? callId) ?? callId,
		direction,
		receivedAtIso,
		summary,
		snippet,
		callerNumber,
		receiverNumber,
		startedAt,
		endedAt,
		durationSeconds,
		transcript: null,
		providerMetadata: { ...payload, latencyMs: context.latencyMs },
	};

	if (mediaRef) {
		voiceParams.recording = mediaRef;
	}

	await ensureIntakeForVoice(voiceParams);

	await recordWebhookEvent({
		eventId,
		provider: "messagebird",
		db,
		eventType,
		entityType: "voice_call",
		entityId: voiceParams.callId,
		orgId,
	});

	logger.info("MessageBird voice webhook processed", {
		eventId,
		orgId,
		callId,
		latencyMs: context.latencyMs,
		recordingStored: Boolean(mediaRef),
	});
}
