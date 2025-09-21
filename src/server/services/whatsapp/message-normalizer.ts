import { Temporal } from "temporal-polyfill";
import { z } from "zod";
import { MetaStatusSchema } from "./zod";

export type NormalizedMessage = {
	waMessageId: string;
	waContactId: string;
	phoneNumber: string; // receiving number id (Meta phone_number_id)
	messageType:
		| "text"
		| "image"
		| "audio"
		| "video"
		| "document"
		| "location"
		| "sticker"
		| "unknown";
	content?: string;
	mediaUrl?: string;
	mediaId?: string;
	timestampIso: string;
};

const mediaObj = z.object({
	link: z.url().optional(),
	id: z.string().optional(),
});

const messageSchema = z.object({
	id: z.string(),
	from: z.string(),
	timestamp: z.string(), // epoch seconds as string
	type: z
		.enum([
			"text",
			"image",
			"audio",
			"video",
			"document",
			"location",
			"sticker",
		])
		.optional(),
	text: z.object({ body: z.string() }).optional(),
	image: mediaObj.optional(),
	audio: mediaObj.optional(),
	video: mediaObj.optional(),
	document: mediaObj.optional(),
	location: z
		.object({ latitude: z.number(), longitude: z.number() })
		.optional(),
	sticker: z.object({ id: z.string().optional() }).optional(),
});

const valueSchema = z.object({
	metadata: z.object({ phone_number_id: z.string() }),
	messages: z.array(messageSchema).default([]),
});

const changeSchema = z.object({
	field: z.string(),
	value: valueSchema,
});

const entrySchema = z.object({
	id: z.string().optional(),
	time: z.number().optional(),
	changes: z.array(changeSchema).min(1),
});

const payloadSchema = z.object({
	object: z.string(),
	entry: z.array(entrySchema).min(1),
});

export function parseWhatsAppWebhook(payload: unknown): {
	phoneNumberId: string;
	entryId: string | null;
	entryTime: number | null;
	messages: NormalizedMessage[];
} {
	const parsed = payloadSchema.parse(payload);
	const entry = parsed.entry[0]!;
	const change = entry.changes[0]!;
	const pnid = change.value.metadata.phone_number_id;

	const messages: NormalizedMessage[] = change.value.messages.map((m) => {
		const secs = Number.parseInt(m.timestamp, 10);
		const iso = Number.isFinite(secs)
			? Temporal.Instant.fromEpochMilliseconds(secs * 1000).toString()
			: Temporal.Now.instant().toString();

		const mt = (m.type ?? "text") as NormalizedMessage["messageType"];
		const content =
			mt === "text"
				? m.text?.body
				: mt === "image"
					? m.image?.link
					: mt === "audio"
						? m.audio?.link
						: mt === "video"
							? m.video?.link
							: mt === "document"
								? m.document?.link
								: mt === "location"
									? `${m.location?.latitude},${m.location?.longitude}`
									: mt === "sticker"
										? m.sticker?.id
										: undefined;

		const mediaUrl =
			mt === "image"
				? m.image?.link
				: mt === "audio"
					? m.audio?.link
					: mt === "video"
						? m.video?.link
						: mt === "document"
							? m.document?.link
							: undefined;

		const mediaId =
			mt === "image"
				? m.image?.id
				: mt === "audio"
					? m.audio?.id
					: mt === "video"
						? m.video?.id
						: mt === "document"
							? m.document?.id
							: mt === "sticker"
								? m.sticker?.id
								: undefined;

		return {
			waMessageId: m.id,
			waContactId: m.from,
			phoneNumber: pnid,
			messageType: mt,
			...(content !== undefined && { content }),
			...(mediaUrl !== undefined && { mediaUrl }),
			...(mediaId !== undefined && { mediaId }),
			timestampIso: iso,
		};
	});

	return {
		phoneNumberId: pnid,
		entryId: entry.id ?? null,
		entryTime: entry.time ?? null,
		messages,
	};
}

export type NormalizedStatus = {
	waMessageId: string; // Meta message id (target row in wa_messages)
	status: "sent" | "delivered" | "read" | "failed";
	timestampIso: string;
	errorTitle?: string;
	errorCode?: number;
};

// Add a small schema to pluck statuses out of the same payload
const statusesValueSchema = z.object({
	metadata: z.object({ phone_number_id: z.string() }),
	statuses: z.array(MetaStatusSchema).default([]),
});

const statusesChangeSchema = z.object({
	field: z.string(),
	value: statusesValueSchema,
});

const statusesEntrySchema = z.object({
	id: z.string().optional(),
	time: z.number().optional(),
	changes: z.array(statusesChangeSchema).min(1),
});

const statusesPayloadSchema = z.object({
	object: z.string(),
	entry: z.array(statusesEntrySchema).min(1),
});

export function parseWhatsAppStatuses(payload: unknown): {
	phoneNumberId: string;
	statuses: NormalizedStatus[];
} | null {
	// If payload doesn't have statuses, return null gracefully
	const maybe = statusesPayloadSchema.safeParse(payload);
	if (!maybe.success) return null;
	const entry = maybe.data.entry[0]!;
	const change = entry.changes[0]!;
	const pnid = change.value.metadata.phone_number_id;

	const statuses: NormalizedStatus[] = change.value.statuses.map((s) => {
		const secs = Number.parseInt(s.timestamp, 10);
		const iso = Number.isFinite(secs)
			? Temporal.Instant.fromEpochMilliseconds(secs * 1000).toString()
			: Temporal.Now.instant().toString();

		return {
			waMessageId: s.id,
			status: s.status,
			timestampIso: iso,
			...(s.errors?.[0]?.title !== undefined && {
				errorTitle: s.errors[0].title,
			}),
			...(s.errors?.[0]?.code !== undefined && { errorCode: s.errors[0].code }),
		};
	});

	// If empty, consider null to avoid extra work in routes
	if (statuses.length === 0) return null;
	return { phoneNumberId: pnid, statuses };
}
