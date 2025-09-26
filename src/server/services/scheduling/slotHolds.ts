import type { SupabaseClient } from "@supabase/supabase-js";
import { Temporal } from "temporal-polyfill";
import { logSlotHoldAudit } from "~/lib/audit";
import { zdtToISO, zonedNow } from "~/lib/time";
import { normalizeTimezone } from "~/lib/timezone";
import type { TAiProposal } from "~/server/schemas/aiProposal";
import type { Database, TableInsert, TableRow } from "~/types/supabase";

const DEFAULT_REASON = "AI proposal soft hold";

type DB = SupabaseClient<Database>;

type SlotInput = TAiProposal["slots"][number];

type CreateHoldsParams = {
	db: DB;
	orgId: string;
	proposalId: string;
	userId: string;
	slots: SlotInput[];
	timezone?: string;
};

const DEFAULT_TZ = "Europe/Amsterdam";

function ensureZonedDateTime(
	value: string,
	timezone: string,
): Temporal.ZonedDateTime {
	try {
		return Temporal.ZonedDateTime.from(value);
	} catch (error) {
		try {
			const pdt = Temporal.PlainDateTime.from(value);
			return pdt.toZonedDateTime(timezone);
		} catch {
			throw error;
		}
	}
}

function toInsertRow(
	slot: SlotInput,
	params: {
		orgId: string;
		proposalId: string;
		userId: string;
		expiresAt: string;
		timezone: string;
	},
): TableInsert<"slot_holds"> {
	const zonedStart = ensureZonedDateTime(slot.start, params.timezone);
	const zonedEnd = ensureZonedDateTime(slot.end, params.timezone);

	if (
		Temporal.Instant.compare(zonedEnd.toInstant(), zonedStart.toInstant()) <= 0
	) {
		throw new Error("Slot end must be after start");
	}

	const resourceId =
		Object.prototype.hasOwnProperty.call(slot, "resourceId") &&
		typeof slot.resourceId === "string"
			? slot.resourceId
			: null;
	const reasonValue =
		Object.prototype.hasOwnProperty.call(slot, "reason") &&
		typeof slot.reason === "string" &&
		slot.reason.length > 0
			? slot.reason
			: DEFAULT_REASON;

	return {
		org_id: params.orgId,
		proposal_id: params.proposalId,
		resource_id: resourceId,
		start_ts: zonedStart.toInstant().toString(),
		end_ts: zonedEnd.toInstant().toString(),
		expires_at: params.expiresAt,
		reason: reasonValue,
		created_by: params.userId,
	};
}

export async function createSlotHolds({
	db,
	orgId,
	proposalId,
	userId,
	slots,
	timezone,
}: CreateHoldsParams): Promise<TableRow<"slot_holds">[]> {
	if (slots.length === 0) return [];
	const tz = normalizeTimezone(timezone ?? DEFAULT_TZ);
	const now = zonedNow(tz);

	const rows = slots.map((slot) => {
		const ttl =
			Object.prototype.hasOwnProperty.call(slot, "holdTtlMinutes") &&
			typeof slot.holdTtlMinutes === "number"
				? slot.holdTtlMinutes
				: 10;
		const expiresAt = zdtToISO(now.add({ minutes: ttl }));
		return toInsertRow(slot, {
			orgId,
			proposalId,
			userId,
			expiresAt,
			timezone: tz,
		});
	});

	const response = await db.from("slot_holds").insert(rows).select();

	if (response.error) {
		throw response.error;
	}

	const created = Array.isArray(response.data) ? response.data : [];
	await Promise.all(
		created.map(async (hold) => {
			await logSlotHoldAudit(db, {
				orgId,
				userId,
				action: "create",
				eventType: "scheduler.hold.created",
				holdId: hold.id,
				metadata: {
					proposalId,
					start: hold.start_ts,
					end: hold.end_ts,
					expiresAt: hold.expires_at,
					resourceId: hold.resource_id,
				},
			});
		}),
	);

	return created;
}

type ReleaseByProposal = {
	db: DB;
	orgId: string;
	proposalId: string;
	userId?: string | null;
	reason?: string;
};

type ReleaseByIds = {
	db: DB;
	orgId: string;
	holdIds: string[];
	userId?: string | null;
	reason?: string;
};

async function releaseInternal(
	db: DB,
	holds: TableRow<"slot_holds">[],
	reason: string,
	userId?: string | null,
): Promise<void> {
	if (holds.length === 0) return;
	const deleteResponse = await db
		.from("slot_holds")
		.delete()
		.in(
			"id",
			holds.map((hold) => hold.id),
		);

	if (deleteResponse.error) {
		throw deleteResponse.error;
	}

	await Promise.all(
		holds.map(async (hold) => {
			await logSlotHoldAudit(db, {
				orgId: hold.org_id,
				action: "delete",
				eventType: "scheduler.hold.released",
				holdId: hold.id,
				metadata: {
					reason,
					proposalId: hold.proposal_id,
					start: hold.start_ts,
					end: hold.end_ts,
				},
				...(userId ? { userId } : {}),
			});
		}),
	);
}

export async function releaseHoldsForProposal({
	db,
	orgId,
	proposalId,
	reason = "proposal_closed",
	userId,
}: ReleaseByProposal): Promise<void> {
	const response = await db
		.from("slot_holds")
		.select()
		.eq("org_id", orgId)
		.eq("proposal_id", proposalId);

	if (response.error) throw response.error;

	await releaseInternal(
		db,
		Array.isArray(response.data) ? response.data : [],
		reason,
		userId,
	);
}

export async function releaseHoldsByIds({
	db,
	orgId,
	holdIds,
	reason = "manual_release",
	userId,
}: ReleaseByIds): Promise<void> {
	if (holdIds.length === 0) return;
	const response = await db
		.from("slot_holds")
		.select()
		.in("id", holdIds)
		.eq("org_id", orgId);

	if (response.error) throw response.error;

	await releaseInternal(
		db,
		Array.isArray(response.data) ? response.data : [],
		reason,
		userId,
	);
}

type ExpireParams = {
	db: DB;
	orgId?: string;
	limit?: number;
};

export async function expireHolds({
	db,
	orgId,
	limit = 50,
}: ExpireParams): Promise<number> {
	const nowIso = Temporal.Now.instant().toString();
	let query = db
		.from("slot_holds")
		.select()
		.lte("expires_at", nowIso)
		.limit(limit);

	if (orgId) {
		query = query.eq("org_id", orgId);
	}

	const response = await query;
	if (response.error) throw response.error;

	const expired = Array.isArray(response.data) ? response.data : [];
	if (expired.length === 0) return 0;
	await releaseInternal(db, expired, "expired", null);
	return expired.length;
}
