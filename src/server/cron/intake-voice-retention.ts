import { Temporal } from "temporal-polyfill";
import { logAuditEvent } from "~/lib/audit";
import { env } from "~/lib/env";
import { logger } from "~/lib/log";
import { createSystemClient } from "~/server/db/client";

export type VoiceRetentionResult = {
	removed: number;
	failures: number;
};

export async function pruneExpiredVoiceRecordings(): Promise<VoiceRetentionResult> {
	const db = createSystemClient();
	const cutoffInstant = Temporal.Now.instant().subtract(
		Temporal.Duration.from({ days: 90 }),
	);
	const cutoffIso = cutoffInstant.toString();

	const { data, error } = await db
		.from("intake_voice_calls")
		.select(
			"id,intake_event_id,org_id,recording_storage_key,created_at,ended_at",
		)
		.not("recording_storage_key", "is", null)
		.lt("created_at", cutoffIso);

	if (error) {
		logger.error("Failed to query voice recordings for retention", {
			error: error.message,
		});
		throw new Error(`Retention query failed: ${error.message}`);
	}

	let removed = 0;
	let failures = 0;

	const rows = Array.isArray(data) ? data : [];

	for (const row of rows) {
		const storageKey = row.recording_storage_key;
		if (!storageKey) continue;

		try {
			const removal = await db.storage
				.from(env.BUCKET_VOICE_INTAKE)
				.remove([storageKey]);
			if (removal.error) {
				failures += 1;
				logger.error("Failed to remove voice recording from storage", {
					error: removal.error.message,
					recordingStorageKey: storageKey,
					voiceCallId: row.id,
				});
				continue;
			}

			await db
				.from("intake_voice_calls")
				.update({ recording_storage_key: null })
				.eq("id", row.id);

			await db
				.from("intake_events")
				.update({ expires_at: cutoffIso })
				.eq("id", row.intake_event_id);

			await logAuditEvent(db, {
				orgId: row.org_id,
				actorType: "system",
				action: "update",
				resource: "voice_call",
				resourceId: row.id,
				summary: "voice_call.retention",
				metadata: {
					storageKey,
					cutoffIso,
				},
			});

			logger.info("Pruned expired voice recording", {
				voiceCallId: row.id,
				intakeEventId: row.intake_event_id,
				orgId: row.org_id,
				storageKey,
			});

			removed += 1;
		} catch (err) {
			failures += 1;
			logger.error("Voice retention step failed", {
				error:
					err instanceof Error
						? err.message
						: typeof err === "string"
							? err
							: JSON.stringify(err),
				voiceCallId: row.id,
				storageKey,
			});
		}
	}

	return { removed, failures };
}
