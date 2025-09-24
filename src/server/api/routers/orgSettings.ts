import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { logAuditEvent } from "~/lib/audit";
import { isValidTimezone, normalizeTimezone } from "~/lib/timezone";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

// Zod schemas for org settings validation
export const PAYMENT_TERMS = [
	"14_days",
	"30_days",
	"immediate",
	"on_completion",
] as const;
export const VOICE_LANGUAGES = ["nl", "en"] as const;

const paymentTermsSchema = z.enum(PAYMENT_TERMS);
const voiceLanguageSchema = z.enum(VOICE_LANGUAGES);

const updateOrgSettingsSchema = z.object({
	// Invoice settings
	fastConfirmInvoices: z.boolean().optional(),
	defaultPaymentTerms: paymentTermsSchema.optional(),
	invoicePrefix: z.string().optional(),
	nextInvoiceNumber: z.number().int().positive().optional(),
	// Business settings
	defaultBtwRate: z.number().min(0).max(1).optional(),
	emergencySurchargeRate: z.number().min(0).optional(),
	weekendSurchargeRate: z.number().min(0).optional(),
	eveningSurchargeRate: z.number().min(0).optional(),
	// Voice mode settings
	voiceEnabled: z.boolean().optional(),
	voiceLanguage: voiceLanguageSchema.optional(),
	// Notification settings
	emailNotifications: z.boolean().optional(),
	whatsappNotifications: z.boolean().optional(),
	// Localization
	timezone: z.string().refine(isValidTimezone, "Invalid timezone").optional(),
});

interface OrgSettings {
	id: string;
	orgId: string;
	// Invoice settings
	fastConfirmInvoices: boolean;
	defaultPaymentTerms: z.infer<typeof paymentTermsSchema>;
	invoicePrefix: string | undefined;
	nextInvoiceNumber: number;
	// Business settings
	defaultBtwRate: number;
	emergencySurchargeRate: number;
	weekendSurchargeRate: number;
	eveningSurchargeRate: number;
	// Voice mode settings
	voiceEnabled: boolean;
	voiceLanguage: z.infer<typeof voiceLanguageSchema>;
	// Notification settings
	emailNotifications: boolean;
	whatsappNotifications: boolean;
	// Localization
	timezone: string;
	// Timestamps
	createdAt: string;
	updatedAt: string;
}
type UpdateOrgSettings = z.infer<typeof updateOrgSettingsSchema>;

/**
 * Transform database row to camelCase for API response
 */
function transformOrgSettingsFromDb(
	dbRow: Record<string, unknown>,
): OrgSettings {
	return {
		id: dbRow.id as string,
		orgId: dbRow.org_id as string,
		fastConfirmInvoices: dbRow.fast_confirm_invoices as boolean,
		defaultPaymentTerms: dbRow.default_payment_terms as z.infer<
			typeof paymentTermsSchema
		>,
		invoicePrefix: dbRow.invoice_prefix as string | undefined,
		nextInvoiceNumber: dbRow.next_invoice_number as number,
		defaultBtwRate: Number(dbRow.default_btw_rate),
		emergencySurchargeRate: Number(dbRow.emergency_surcharge_rate),
		weekendSurchargeRate: Number(dbRow.weekend_surcharge_rate),
		eveningSurchargeRate: Number(dbRow.evening_surcharge_rate),
		voiceEnabled: dbRow.voice_enabled as boolean,
		voiceLanguage: dbRow.voice_language as z.infer<typeof voiceLanguageSchema>,
		emailNotifications: dbRow.email_notifications as boolean,
		whatsappNotifications: dbRow.whatsapp_notifications as boolean,
		timezone: normalizeTimezone(dbRow.timezone as string | null | undefined),
		createdAt: (dbRow.created_at as Date).toISOString(),
		updatedAt: (dbRow.updated_at as Date).toISOString(),
	};
}

/**
 * Transform camelCase input to snake_case for database
 */
function transformOrgSettingsToDb(
	input: UpdateOrgSettings,
): Record<string, unknown> {
	const dbUpdate: Record<string, unknown> = {};

	if (input.fastConfirmInvoices !== undefined) {
		dbUpdate.fast_confirm_invoices = input.fastConfirmInvoices;
	}
	if (input.defaultPaymentTerms !== undefined) {
		dbUpdate.default_payment_terms = input.defaultPaymentTerms;
	}
	if (input.invoicePrefix !== undefined) {
		dbUpdate.invoice_prefix = input.invoicePrefix;
	}
	if (input.nextInvoiceNumber !== undefined) {
		dbUpdate.next_invoice_number = input.nextInvoiceNumber;
	}
	if (input.defaultBtwRate !== undefined) {
		dbUpdate.default_btw_rate = input.defaultBtwRate;
	}
	if (input.emergencySurchargeRate !== undefined) {
		dbUpdate.emergency_surcharge_rate = input.emergencySurchargeRate;
	}
	if (input.weekendSurchargeRate !== undefined) {
		dbUpdate.weekend_surcharge_rate = input.weekendSurchargeRate;
	}
	if (input.eveningSurchargeRate !== undefined) {
		dbUpdate.evening_surcharge_rate = input.eveningSurchargeRate;
	}
	if (input.voiceEnabled !== undefined) {
		dbUpdate.voice_enabled = input.voiceEnabled;
	}
	if (input.voiceLanguage !== undefined) {
		dbUpdate.voice_language = input.voiceLanguage;
	}
	if (input.emailNotifications !== undefined) {
		dbUpdate.email_notifications = input.emailNotifications;
	}
	if (input.whatsappNotifications !== undefined) {
		dbUpdate.whatsapp_notifications = input.whatsappNotifications;
	}
	if (input.timezone !== undefined) {
		dbUpdate.timezone = normalizeTimezone(input.timezone);
	}

	return dbUpdate;
}

export const orgSettingsRouter = createTRPCRouter({
	/**
	 * Get organization settings (creates default if doesn't exist)
	 */
	getOrgSettings: protectedProcedure.query(
		async ({ ctx }): Promise<OrgSettings> => {
			const { db } = ctx;
			const { orgId } = ctx.auth;

			// First, try to get existing settings
			const { data: existingSettings, error } = await db
				.from("org_settings")
				.select("*")
				.eq("org_id", orgId)
				.single();

			// If no settings exist, create default ones
			if (error && error.code === "PGRST116") {
				const { data: newSettings, error: createError } = await db
					.from("org_settings")
					.insert({ org_id: orgId })
					.select("*")
					.single();

				if (createError) {
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Failed to create organization settings",
						cause: createError,
					});
				}

				// newSettings cannot be null when createError is null (Supabase type guarantee)
				// if (!newSettings) {
				// 	throw new TRPCError({
				// 		code: "NOT_FOUND",
				// 		message: "Failed to create organization settings",
				// 	});
				// }

				return transformOrgSettingsFromDb(newSettings);
			}

			if (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to fetch organization settings",
					cause: error,
				});
			}

			// existingSettings cannot be null when error is null (Supabase type guarantee)
			// if (!existingSettings) {
			// 	throw new TRPCError({
			// 		code: "NOT_FOUND",
			// 		message: "Organization settings not found",
			// 	});
			// }

			return transformOrgSettingsFromDb(existingSettings);
		},
	),

	/**
	 * Update organization settings
	 */
	updateOrgSettings: protectedProcedure
		.input(updateOrgSettingsSchema)
		.mutation(async ({ ctx, input }): Promise<OrgSettings> => {
			const { db } = ctx;
			const { orgId } = ctx.auth;

			const dbUpdate = transformOrgSettingsToDb(input);

			if (Object.keys(dbUpdate).length === 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "No valid fields provided for update",
				});
			}

			const { data: updatedSettings, error } = await db
				.from("org_settings")
				.update(dbUpdate)
				.eq("org_id", orgId)
				.select("*")
				.single();

			if (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to update organization settings",
					cause: error,
				});
			}

			// Audit log the settings update
			await logAuditEvent(ctx.db, {
				orgId: ctx.auth.orgId,
				userId: ctx.auth.userId,
				action: "update",
				resource: "organization",
				resourceId: orgId,
				summary: "organization.settings.update",
				metadata: {
					action: "update_settings",
					updatedFields: Object.keys(input),
					changes: input,
				},
			});

			// updatedSettings cannot be null when error is null (Supabase type guarantee)
			// if (!updatedSettings) {
			// 	throw new TRPCError({
			// 		code: "NOT_FOUND",
			// 		message: "Organization settings not found",
			// 	});
			// }

			return transformOrgSettingsFromDb(updatedSettings);
		}),

	/**
	 * Get invoice confirmation mode for the organization
	 */
	getInvoiceConfirmMode: protectedProcedure.query(
		async ({ ctx }): Promise<{ fastConfirmInvoices: boolean }> => {
			const { db } = ctx;
			const { orgId } = ctx.auth;

			const { data, error } = await db
				.from("org_settings")
				.select("fast_confirm_invoices")
				.eq("org_id", orgId)
				.single();

			if (error) {
				// If no settings exist, return default (safe mode)
				if (error.code === "PGRST116") {
					return { fastConfirmInvoices: false };
				}

				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to fetch invoice confirmation mode",
					cause: error,
				});
			}

			return { fastConfirmInvoices: data.fast_confirm_invoices || false };
		},
	),

	/**
	 * Toggle fast invoice confirmation mode
	 */
	toggleFastConfirm: protectedProcedure
		.input(z.object({ enabled: z.boolean() }))
		.mutation(
			async ({ ctx, input }): Promise<{ fastConfirmInvoices: boolean }> => {
				const { db } = ctx;
				const { orgId } = ctx.auth;

				// First ensure settings record exists
				const { error: upsertError } = await db
					.from("org_settings")
					.upsert(
						{ org_id: orgId, fast_confirm_invoices: input.enabled },
						{ onConflict: "org_id" },
					);

				if (upsertError) {
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Failed to update fast confirm setting",
						cause: upsertError,
					});
				}

				// Audit log the fast confirm toggle
				await logAuditEvent(ctx.db, {
					orgId: ctx.auth.orgId,
					userId: ctx.auth.userId,
					action: "update",
					resource: "organization",
					resourceId: orgId,
					summary: "organization.settings.toggle_fast_confirm",
					metadata: {
						action: "toggle_fast_confirm",
						enabled: input.enabled,
						setting: "fastConfirmInvoices",
					},
				});

				return { fastConfirmInvoices: input.enabled };
			},
		),

	/**
	 * Get next invoice number and increment it atomically
	 */
	getNextInvoiceNumber: protectedProcedure.query(
		async ({ ctx }): Promise<{ invoiceNumber: number; prefix: string }> => {
			const { db } = ctx;
			const { orgId } = ctx.auth;

			// Atomically get and increment the next invoice number
			const { data, error } = await db.rpc("increment_invoice_number", {
				org_id_param: orgId,
			});

			if (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to get next invoice number",
					cause: error,
				});
			}

			const result = Array.isArray(data) ? data[0] : data;
			return {
				invoiceNumber: result?.next_invoice_number ?? 1,
				prefix: result?.invoice_prefix ?? "FACT",
			};
		},
	),
});

export type OrgSettingsRouter = typeof orgSettingsRouter;
