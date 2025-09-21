import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Temporal } from "temporal-polyfill";
import type { z } from "zod";
import { env } from "~/lib/env";
import { MediaRefSchema } from "~/schema/intake";
import type { Database } from "~/types/supabase";

export type VoiceRecordingResult =
	| {
			success: true;
			mediaRef: z.infer<typeof MediaRefSchema>;
	  }
	| {
			success: false;
			error: string;
	  };

export type StoreVoiceRecordingParams = {
	db: SupabaseClient<Database>;
	url: string;
	orgId: string;
	callId: string;
	mimeType?: string | null;
};

const getExtensionFromMime = (mime: string | null | undefined): string => {
	if (!mime) return ".mp3";
	if (mime.includes("wav")) return ".wav";
	if (mime.includes("mpeg")) return ".mp3";
	if (mime.includes("ogg")) return ".ogg";
	if (mime.includes("mp4")) return ".m4a";
	return ".mp3";
};

const buildStorageKey = ({
	orgId,
	callId,
	date,
	ext,
}: {
	orgId: string;
	callId: string;
	date: Temporal.ZonedDateTime;
	ext: string;
}): string => {
	const year = date.year.toString().padStart(4, "0");
	const month = date.month.toString().padStart(2, "0");
	const day = date.day.toString().padStart(2, "0");
	return `org_${orgId}/${year}/${month}/${day}/voice/call_${callId}${ext}`;
};

export async function storeVoiceRecording(
	params: StoreVoiceRecordingParams,
): Promise<VoiceRecordingResult> {
	const { db, url, orgId, callId, mimeType } = params;

	if (!env.MESSAGEBIRD_ACCESS_KEY) {
		return {
			success: false,
			error: "MESSAGEBIRD_ACCESS_KEY is not configured",
		};
	}

	try {
		const response = await fetch(url, {
			headers: {
				Authorization: `AccessKey ${env.MESSAGEBIRD_ACCESS_KEY}`,
			},
		});

		if (!response.ok) {
			return {
				success: false,
				error: `Failed to download recording: ${response.status}`,
			};
		}

		const resolvedMime =
			mimeType ?? response.headers.get("content-type") ?? "audio/mpeg";
		const arrayBuffer = await response.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		const checksumSha256 = createHash("sha256").update(buffer).digest("hex");
		const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");
		const ext = getExtensionFromMime(resolvedMime);
		const safeCallId = callId.replace(/[^a-zA-Z0-9_-]/g, "_");
		const storageKey = buildStorageKey({
			orgId,
			callId: safeCallId,
			date: now,
			ext,
		});

		const upload = await db.storage
			.from(env.BUCKET_VOICE_INTAKE)
			.upload(storageKey, buffer, {
				contentType: resolvedMime,
				cacheControl: "31536000",
				upsert: false,
			});

		if (upload.error) {
			const isDuplicate = upload.error.message
				.toLowerCase()
				.includes("duplicate");
			if (!isDuplicate) {
				return {
					success: false,
					error: `Failed to upload recording: ${upload.error.message}`,
				};
			}
		}

		const mediaRef = MediaRefSchema.parse({
			storageKey,
			mime: resolvedMime,
			byteSize: buffer.byteLength,
			checksumSha256,
			source: "voice" as const,
		});

		return {
			success: true,
			mediaRef,
		};
	} catch (error) {
		console.error("storeVoiceRecording error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}
