import { useTranslations } from "next-intl";
import { z } from "zod";
import {
	BASE_SPEED_KMH,
	CITY_MULTIPLIER,
	MAX_BUFFER_MINUTES,
	RISK_BUFFER,
	WORK_HOURS,
} from "~/lib/travel/config";

// Temporal is globally available via polyfill
const { Temporal } = globalThis;

export const SuggestSlotsInput = z.object({
	org_id: z.uuid(),
	day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"), // ISO date
	job_duration_minutes: z.number().int().positive(),
	risk: z.enum(["low", "med", "high"]).default("med"),
	base_lat: z.number().min(-90).max(90).optional(),
	base_lng: z.number().min(-180).max(180).optional(),
	last_job_lat: z.number().min(-90).max(90).optional(),
	last_job_lng: z.number().min(-180).max(180).optional(),
	target_lat: z.number().min(-90).max(90),
	target_lng: z.number().min(-180).max(180),
});

export type SuggestSlotsInput = z.infer<typeof SuggestSlotsInput>;

export interface SlotCandidate {
	start: string; // ISO datetime
	end: string; // ISO datetime
	buffer_minutes: number;
	confidence: number; // 0..1
	reason: string;
}

export function getTravelAwareSlots(input: SuggestSlotsInput): SlotCandidate[] {
	const i = SuggestSlotsInput.parse(input);
	const zdtDay = Temporal.ZonedDateTime.from(
		`${i.day}T00:00:00[Europe/Amsterdam]`,
	);
	const workStart = zdtDay.with({ hour: WORK_HOURS.start });
	const workEnd = zdtDay.with({ hour: WORK_HOURS.end });

	// Choose origin: last job → base → (0,0) fallback (penalize confidence)
	const origin =
		i.last_job_lat != null && i.last_job_lng != null
			? { lat: i.last_job_lat, lng: i.last_job_lng, source: "last_job" }
			: i.base_lat != null && i.base_lng != null
				? { lat: i.base_lat, lng: i.base_lng, source: "base" }
				: { lat: 0, lng: 0, source: "unknown" };

	const distanceKm =
		haversineKm(origin.lat, origin.lng, i.target_lat, i.target_lng) *
		CITY_MULTIPLIER;
	const travelMinutes = Math.ceil((distanceKm / BASE_SPEED_KMH) * 60);
	const riskPct = RISK_BUFFER[i.risk];
	const bufferMinutes = Math.min(
		Math.ceil(travelMinutes * (1 + riskPct)),
		MAX_BUFFER_MINUTES,
	);

	// Simple candidate set: start of day, mid-morning, after lunch, late afternoon
	const starts = [
		workStart,
		workStart.add({ hours: 2 }),
		workStart.add({ hours: 5 }), // after lunch
		workStart.add({ hours: 7 }),
	];

	const results: SlotCandidate[] = starts
		.map((s, idx) => {
			const start = s.toInstant();
			const end = start.add({
				minutes: i.job_duration_minutes + bufferMinutes,
			});
			if (Temporal.Instant.compare(end, workEnd.toInstant()) > 0) return null;

			const sourcePenalty = origin.source === "unknown" ? 0.2 : 0;
			const distancePenalty = Math.min(distanceKm / 30, 0.4); // penalize >30km
			const confidence = Math.max(0.4, 1 - sourcePenalty - distancePenalty);

			return {
				start: start.toString(),
				end: end.toString(),
				buffer_minutes: bufferMinutes,
				confidence,
				reason: `dist=${distanceKm.toFixed(1)}km, buffer=${bufferMinutes}m, origin=${origin.source}, risk=${i.risk}, cand#${idx + 1}`,
			};
		})
		.filter((x): x is SlotCandidate => x != null);

	return results;
}

function haversineKm(
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number,
): number {
	const toRad = (deg: number): number => (deg * Math.PI) / 180;
	const R = 6371;
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}
