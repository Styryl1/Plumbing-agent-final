/**
 * WhatsApp Media Fetcher Service (S1)
 * Handles secure download and storage of WhatsApp media files
 * Flag-gated by WA_MEDIA_DOWNLOAD environment variable
 */

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Temporal } from "temporal-polyfill";
import { env } from "~/lib/env";
import type { Database, Tables } from "~/types/supabase";

// Media download functionality controlled by WA_MEDIA_DOWNLOAD env var

type MediaAssetRow = Tables<"whatsapp_media_assets">;

export type MediaFetchResult =
	| {
			success: true;
			storageKey: string;
			mimeType: string | null;
			fileSize: number;
			checksumSha256: string;
	  }
	| {
			success: false;
			error: string;
	  };

export type MediaFetchParams = {
	mediaId: string;
	waMessageId: string;
	messageRowId: string;
	orgId: string;
	db: SupabaseClient<Database>;
};

const MIME_EXTENSIONS: Record<string, string> = {
	"image/jpeg": ".jpg",
	"image/png": ".png",
	"image/webp": ".webp",
	"image/gif": ".gif",
	"audio/ogg": ".ogg",
	"audio/mpeg": ".mp3",
	"audio/mp4": ".m4a",
	"video/mp4": ".mp4",
	"video/quicktime": ".mov",
	"application/pdf": ".pdf",
	"application/vnd.ms-excel": ".xls",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document":
		".docx",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
};

const getExtension = (mime: string | null | undefined): string => {
	if (!mime) return ".bin";
	return MIME_EXTENSIONS[mime] ?? ".bin";
};

const buildStorageKey = ({
	orgId,
	waMessageId,
	date,
	ext,
}: {
	orgId: string;
	waMessageId: string;
	date: Temporal.ZonedDateTime;
	ext: string;
}): string => {
	const year = date.year.toString().padStart(4, "0");
	const month = date.month.toString().padStart(2, "0");
	const day = date.day.toString().padStart(2, "0");
	return `org_${orgId}/${year}/${month}/${day}/whatsapp/${waMessageId}${ext}`;
};

/**
 * Fetches and stores WhatsApp media files in Supabase Storage
 * Returns storage metadata when successful, or a descriptive error otherwise
 */
export async function fetchAndStoreMedia(
	params: MediaFetchParams,
): Promise<MediaFetchResult> {
	const { mediaId, waMessageId, messageRowId, orgId, db } = params;

	if (!env.WA_MEDIA_DOWNLOAD) {
		return {
			success: false,
			error: "Media download disabled by feature flag",
		};
	}

	if (env.WA_GRAPH_TOKEN.length === 0) {
		return {
			success: false,
			error: "WA_GRAPH_TOKEN not configured",
		};
	}

	try {
		const metadataResponse = await fetch(
			`https://graph.facebook.com/v18.0/${mediaId}`,
			{
				method: "GET",
				headers: {
					Authorization: `Bearer ${env.WA_GRAPH_TOKEN}`,
					"Content-Type": "application/json",
				},
			},
		);

		if (!metadataResponse.ok) {
			return {
				success: false,
				error: `Failed to fetch media metadata: ${metadataResponse.status}`,
			};
		}

		const metadata = (await metadataResponse.json()) as {
			url: string;
			mime_type: string | null;
			sha256?: string;
			file_size: number;
		};

		const downloadResponse = await fetch(metadata.url, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${env.WA_GRAPH_TOKEN}`,
			},
		});

		if (!downloadResponse.ok) {
			return {
				success: false,
				error: `Failed to download media: ${downloadResponse.status}`,
			};
		}

		const arrayBuffer = await downloadResponse.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		const checksumSha256 = createHash("sha256").update(buffer).digest("hex");
		const mimeType =
			metadata.mime_type ??
			downloadResponse.headers.get("content-type") ??
			null;
		const ext = getExtension(mimeType);
		const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");
		const storageKey = buildStorageKey({ orgId, waMessageId, date: now, ext });
		const bucket = env.BUCKET_WA_MEDIA;

		const upload = await db.storage.from(bucket).upload(storageKey, buffer, {
			contentType: mimeType ?? "application/octet-stream",
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
					error: `Failed to upload media to storage: ${upload.error.message}`,
				};
			}
		}

		const mediaRow: Omit<MediaAssetRow, "id" | "created_at"> = {
			org_id: orgId,
			message_id: messageRowId,
			storage_key: storageKey,
			content_type: mimeType,
			byte_size: buffer.byteLength,
			checksum: checksumSha256,
			width: null,
			height: null,
		};

		await db
			.from("whatsapp_media_assets")
			.upsert(mediaRow, { onConflict: "message_id" });

		return {
			success: true,
			storageKey,
			mimeType,
			fileSize: buffer.byteLength,
			checksumSha256,
		};
	} catch (error) {
		console.error("Media fetch error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Helper to check if media download is enabled
 */
export function isMediaDownloadEnabled(): boolean {
	return env.WA_MEDIA_DOWNLOAD;
}
