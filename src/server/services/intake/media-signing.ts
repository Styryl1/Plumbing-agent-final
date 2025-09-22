import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "~/lib/env";
import type { IntakeMediaDTO } from "~/types/intake";
import type { Database } from "~/types/supabase";

const SOURCE_BUCKET_MAP = {
	whatsapp: env.BUCKET_WA_MEDIA,
	voice: env.BUCKET_VOICE_INTAKE,
} as const;

const DEFAULT_BUCKET = env.BUCKET_WA_MEDIA;

const isSourceBucket = (
	value: string,
): value is keyof typeof SOURCE_BUCKET_MAP =>
	Object.prototype.hasOwnProperty.call(SOURCE_BUCKET_MAP, value);

const resolveBucket = (source?: string | null): string => {
	if (typeof source === "string" && isSourceBucket(source)) {
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
	const bucketMap = new Map<string, Array<{ index: number; key: string }>>();

	enriched.forEach((item, index) => {
		const storageKey = item.storageKey;
		if (storageKey.trim().length === 0) {
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

		if (error) {
			entries.forEach(({ index }) => {
				enriched[index]!.signedUrl = null;
			});
			continue;
		}

		data.forEach((result, idx) => {
			const entry = entries[idx]!;
			const potential = (result as { signedUrl?: unknown }).signedUrl;
			const signedUrl =
				typeof potential === "string" && potential.length > 0
					? potential
					: null;
			enriched[entry.index]!.signedUrl = signedUrl;
		});
	}

	return enriched;
}
