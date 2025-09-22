import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "~/lib/env";
import type { Database } from "~/types/supabase";
import type { IntakeMediaDTO } from "~/types/intake";

const SOURCE_BUCKET_MAP: Record<string, string> = {
	whatsapp: env.BUCKET_WA_MEDIA,
	voice: env.BUCKET_VOICE_INTAKE,
};

const DEFAULT_BUCKET = env.BUCKET_WA_MEDIA;

const resolveBucket = (source?: string | null): string => {
	if (source && SOURCE_BUCKET_MAP[source]) {
		return SOURCE_BUCKET_MAP[source];
	}
	return DEFAULT_BUCKET;
};

export async function signIntakeMedia(
	db: SupabaseClient<Database>,
	media: IntakeMediaDTO[],
): Promise<IntakeMediaDTO[]> {
	if (media.length === 0) {
		return [];
	}

	const enriched = media.map((item) => ({ ...item }));
	const bucketMap = new Map<
		string,
		Array<{ index: number; key: string }>
	>();

	enriched.forEach((item, index) => {
		const storageKey = item.storageKey;
		if (!storageKey) {
			enriched[index]!.signedUrl = null;
			return;
		}

			const bucket = resolveBucket(item.source);
			const entries = bucketMap.get(bucket) ?? [];
		entries.push({ index, key: storageKey });
		bucketMap.set(bucket, entries);
	});

	for (const [bucket, entries] of bucketMap.entries()) {
		const paths = entries.map((entry) => entry.key);
		const { data, error } = await db.storage
			.from(bucket)
			.createSignedUrls(paths, 60 * 60);

		if (error || !data) {
			entries.forEach(({ index }) => {
				enriched[index]!.signedUrl = null;
			});
			continue;
		}

			data.forEach((result, idx) => {
				const entry = entries[idx];
				if (!entry) {
					return;
				}
				enriched[entry.index]!.signedUrl = result?.signedUrl ?? null;
			});
	}

	return enriched;
}
