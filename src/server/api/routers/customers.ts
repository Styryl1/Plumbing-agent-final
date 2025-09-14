import { useTranslations } from "next-intl";
// Customers tRPC router - CRUD operations for customer management
// Enhanced with DTO/mapper pattern, Dutch validation, and comprehensive error handling
// Maintains backward compatibility with existing API structure

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { E } from "~/lib/i18n/errors";
import { zMsg } from "~/lib/i18n/zodMessage";
import { logger } from "~/lib/log";
import { isValidPhone, normalizePhone } from "~/lib/validation/phone";
import { NL_POSTCODE } from "~/lib/validation/postcode";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
	formatDutchPostalCode,
	mapCreateCustomerInputToDb,
	mapDbCustomerToDto,
	mapDbCustomerToPickerItem,
	mapUpdateCustomerInputToDb,
} from "~/server/mappers/customerMapper";
import type {
	CreateCustomerInput,
	CustomerDTO,
	CustomerPickerItem,
	UpdateCustomerInput,
} from "~/types/customer";
import type { Tables } from "~/types/supabase";

// === ZOD VALIDATION SCHEMAS ===

// Prefer constants + typeof for tricky parts.
export const LANG = ["nl", "en"] as const;
export const LanguageEnum = z.enum(LANG); // ZodEnum<["nl","en"]>

// Minimal customer for "lead"/first save - only name + phone required
export const customerCreateMinimal = z.object({
	name: z.string().min(1, zMsg(E.nameRequired)),
	phone: z
		.string()
		.min(1, zMsg(E.phoneRequired))
		.refine(isValidPhone, zMsg(E.phoneInvalid))
		.transform(normalizePhone),
	email: z.email(zMsg(E.emailInvalid)).optional(),
	address: z.string().optional(), // Legacy flat address field
	postalCode: z.string().regex(NL_POSTCODE, zMsg(E.postalInvalid)).optional(),
	houseNumber: z.string().optional(), // For Dutch address auto-fill
	street: z.string().optional(), // Auto-filled from postcode + house number
	city: z.string().optional(), // Auto-filled from postcode + house number
	language: LanguageEnum.default("nl"),
});

// Legacy schema functions for backward compatibility
export function createCustomerSchema(): typeof customerCreateMinimal {
	return customerCreateMinimal;
}

export function updateCustomerSchema(): ReturnType<
	typeof customerCreateMinimal.partial
> {
	return customerCreateMinimal.partial();
}

const uuidSchema = z.uuid();

export const customersRouter = createTRPCRouter({
	/**
	 * List customers with optional search and pagination
	 * Enhanced with DTO mapping and proper error handling
	 */
	list: protectedProcedure
		.input(
			z
				.object({
					query: z.string().min(1).max(100).optional(),
					limit: z.number().int().min(1).max(100).default(50),
					offset: z.number().int().min(0).default(0),
					sortBy: z
						.enum(["created_at", "updated_at", "name"])
						.default("created_at"),
					sortOrder: z.enum(["asc", "desc"]).default("desc"),
				})
				.optional(),
		)
		.query(async ({ ctx, input = {} }): Promise<CustomerDTO[]> => {
			const { db } = ctx;
			const { orgId } = ctx.auth;
			const {
				query,
				limit = 50,
				offset = 0,
				sortBy = "created_at",
				sortOrder = "desc",
			} = input;

			let dbQuery = db
				.from("customers")
				.select("*")
				.eq("org_id", orgId)
				.is("archived_at", null) // Only show active (non-archived) customers
				.order(sortBy, { ascending: sortOrder === "asc" })
				.range(offset, offset + limit - 1);

			// Add search filter if provided
			if (query) {
				dbQuery = dbQuery.or(
					`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`,
				);
			}

			const { data, error } = await dbQuery;

			if (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Fout bij ophalen klanten",
					cause: error,
				});
			}

			const customers = data as Tables<"customers">[] | null;
			if (!customers) {
				return [];
			}

			return customers.map(mapDbCustomerToDto);
		}),

	/**
	 * Search customers for picker components
	 * Enhanced with DTO mapping and optimized for UI usage
	 */
	search: protectedProcedure
		.input(
			z.object({
				q: z
					.string()
					.trim()
					.min(1, "Zoekterm is verplicht")
					.max(100, "Zoekterm te lang"),
				limit: z.number().int().min(1).max(25).default(10),
			}),
		)
		.query(async ({ ctx, input }): Promise<CustomerPickerItem[]> => {
			const { db } = ctx;
			const { orgId } = ctx.auth;
			const { q, limit } = input;

			const { data, error } = await db
				.from("customers")
				.select("*")
				.eq("org_id", orgId)
				.is("archived_at", null) // Only show active customers in search
				.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
				.order("name", { ascending: true })
				.limit(limit);

			if (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Fout bij zoeken klanten",
					cause: error,
				});
			}

			const customers = data as Tables<"customers">[] | null;
			if (!customers) {
				return [];
			}

			return customers.map(mapDbCustomerToPickerItem);
		}),

	/**
	 * Get customer by ID
	 */
	byId: protectedProcedure
		.input(z.object({ id: uuidSchema }))
		.query(async ({ ctx, input }): Promise<CustomerDTO> => {
			const { db } = ctx;
			const { orgId } = ctx.auth;
			const { id } = input;

			const { data, error } = await db
				.from("customers")
				.select("*")
				.eq("id", id)
				.eq("org_id", orgId)
				.maybeSingle();

			if (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Fout bij ophalen klant",
					cause: error,
				});
			}

			if (!data) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Klant niet gevonden",
				});
			}

			return mapDbCustomerToDto(data as Tables<"customers">);
		}),

	/**
	 * Create new customer
	 */
	create: protectedProcedure
		.input(createCustomerSchema()) // Default schema for TypeScript typing - re-validated with user locale below
		.mutation(async ({ ctx, input }): Promise<CustomerDTO> => {
			// Re-validate with user's current locale to show localized error messages
			const localeSchema = createCustomerSchema();
			const validatedInput = localeSchema.parse(input);
			const { db } = ctx;
			const { orgId } = ctx.auth;

			// Build clean input object with required fields
			const processedInput: CreateCustomerInput = {
				name: validatedInput.name,
				phone: validatedInput.phone, // Required field (normalized by Zod transform)
				language: validatedInput.language,
			};

			// Only add optional properties if they have actual values
			if (validatedInput.email) {
				processedInput.email = validatedInput.email;
			}
			if (validatedInput.address) {
				processedInput.address = validatedInput.address;
			}
			if (validatedInput.postalCode) {
				processedInput.postalCode = formatDutchPostalCode(
					validatedInput.postalCode,
				);
			}

			const customerData = mapCreateCustomerInputToDb(processedInput, orgId);

			logger.warn("customers.create attempting to create customer", {
				processedInput,
				customerData,
				orgId,
			});

			const { data, error } = await db
				.from("customers")
				.insert(customerData)
				.select("*")
				.single();

			if (error) {
				// Log detailed error information for debugging
				console.error("🔴 Customer creation failed:", {
					error: error,
					code: error.code,
					message: error.message,
					details: error.details,
					hint: error.hint,
					customerData: customerData,
					orgId: orgId,
				});

				// Handle unique constraint violations
				if (error.code === "23505") {
					throw new TRPCError({
						code: "CONFLICT",
						message: "Klant met dit e-mailadres bestaat al",
					});
				}

				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: `Fout bij aanmaken klant: ${error.message}`,
					cause: error,
				});
			}

			return mapDbCustomerToDto(data as Tables<"customers">);
		}),

	/**
	 * Update existing customer
	 */
	update: protectedProcedure
		.input(
			z.object({
				id: uuidSchema,
				data: updateCustomerSchema(), // Default schema for TypeScript typing - re-validated with user locale below
			}),
		)
		.mutation(async ({ ctx, input }): Promise<CustomerDTO> => {
			// Re-validate with user's current locale to show localized error messages
			const localeSchema = z.object({
				id: uuidSchema,
				data: updateCustomerSchema(),
			});
			const validatedInput = localeSchema.parse(input);
			const { db } = ctx;
			const { orgId } = ctx.auth;

			// Input is already validated by the locale-specific schema above
			const { id, data: updateData } = validatedInput;

			// Build clean update patch without undefined values
			const processedInput: Partial<UpdateCustomerInput> = {};

			// TypeScript understands narrowing after these guards
			if (updateData.name !== undefined) processedInput.name = updateData.name;
			if (updateData.email !== undefined)
				processedInput.email = updateData.email;
			if (updateData.phone !== undefined)
				processedInput.phone = updateData.phone;
			if (updateData.address !== undefined)
				processedInput.address = updateData.address;
			if (updateData.language !== undefined)
				processedInput.language = updateData.language;
			if (updateData.postalCode !== undefined) {
				processedInput.postalCode =
					updateData.postalCode !== ""
						? formatDutchPostalCode(updateData.postalCode)
						: updateData.postalCode; // stays undefined if they explicitly cleared it
			}

			const dbUpdateData = mapUpdateCustomerInputToDb(processedInput);

			const { data, error } = await db
				.from("customers")
				.update(dbUpdateData)
				.eq("id", id)
				.eq("org_id", orgId) // Security: ensure org ownership
				.select("*")
				.maybeSingle();

			if (error) {
				// Handle unique constraint violations
				if (error.code === "23505") {
					throw new TRPCError({
						code: "CONFLICT",
						message: "customers.errors.emailAlreadyExists",
					});
				}

				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "customers.errors.serverError",
					cause: error,
				});
			}

			if (!data) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "customers.errors.notFoundOrNoPermission",
				});
			}

			return mapDbCustomerToDto(data as Tables<"customers">);
		}),

	/**
	 * Delete customer (conditional hard delete - only when no linked data exists)
	 * If linked data exists, throws CONFLICT error for UI to handle
	 */
	delete: protectedProcedure.input(z.object({ id: uuidSchema })).mutation(
		async ({
			ctx,
			input,
		}): Promise<{
			id: string;
			deleted: boolean;
		}> => {
			const { db } = ctx;
			const { orgId } = ctx.auth;
			const { id } = input;

			// First check if customer exists and belongs to this org
			const { data: customer } = await db
				.from("customers")
				.select("id")
				.eq("id", id)
				.eq("org_id", orgId)
				.maybeSingle();

			if (!customer) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "customers.errors.notFoundOrNoPermission",
				});
			}

			// Count linked records (same logic as linkedCounts procedure)
			// TODO: Add back invoice_drafts check when table is restored
			const [{ count: jobsCount }] = await Promise.all([
				db
					.from("jobs")
					.select("*", { count: "exact", head: true })
					.eq("customer_id", id)
					.eq("org_id", orgId),
				// db
				// 	.from("invoice_drafts")
				// 	.select("*", { count: "exact", head: true })
				// 	.eq("customer_id", id)
				// 	.eq("org_id", orgId),
			]);

			// Check if customer has linked data (jobs or invoices) that prevents deletion
			const hasLinkedJobs = (jobsCount ?? 0) > 0;
			// TODO: Re-enable when invoice_drafts table is restored
			// const invoicesCount = await getInvoicesCount(customerId, orgId);
			// const hasLinkedInvoices = invoicesCount > 0;
			const hasLinkedInvoices = false; // Temporary: always false until invoice_drafts table restored
			const hasLinkedData = Boolean(hasLinkedJobs || hasLinkedInvoices);

			// If linked data exists, throw conflict error
			if (hasLinkedData) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "customers.errors.linkedDataExists",
				});
			}

			// No linked data - perform hard delete
			const { error } = await db
				.from("customers")
				.delete()
				.eq("id", id)
				.eq("org_id", orgId);

			if (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "customers.errors.serverError",
					cause: error,
				});
			}

			return { id, deleted: true };
		},
	),

	/**
	 * Get customer count for organization
	 */
	count: protectedProcedure.query(async ({ ctx }): Promise<number> => {
		const { db } = ctx;
		const { orgId } = ctx.auth;

		const { count, error } = await db
			.from("customers")
			.select("*", { count: "exact", head: true })
			.eq("org_id", orgId)
			.is("archived_at", null); // Only count active customers

		if (error) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Fout bij tellen klanten",
				cause: error,
			});
		}

		return count ?? 0;
	}),

	/**
	 * Get linked data counts for customer (jobs, invoices)
	 * Used for safe delete UX - show warning when linked data exists
	 */
	linkedCounts: protectedProcedure
		.input(z.object({ customerId: uuidSchema }))
		.query(
			async ({ ctx, input }): Promise<{ jobs: number; invoices: number }> => {
				const { db } = ctx;
				const { orgId } = ctx.auth;
				const { customerId } = input;

				// Verify customer belongs to this org first
				const { data: customer } = await db
					.from("customers")
					.select("id")
					.eq("id", customerId)
					.eq("org_id", orgId)
					.maybeSingle();

				if (!customer) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Klant niet gevonden",
					});
				}

				// Count linked records
				// TODO: Add back invoice_drafts check when table is restored
				const [{ count: jobsCount }] = await Promise.all([
					db
						.from("jobs")
						.select("*", { count: "exact", head: true })
						.eq("customer_id", customerId)
						.eq("org_id", orgId),
					// db
					// 	.from("invoice_drafts")
					// 	.select("*", { count: "exact", head: true })
					// 	.eq("customer_id", customerId)
					// 	.eq("org_id", orgId),
				]);

				// TODO: Re-enable when invoice_drafts table is restored
				// const invoicesCount = await getInvoicesCount(customerId, orgId);

				return {
					jobs: jobsCount ?? 0,
					invoices: 0, // Temporary: hardcoded until invoice_drafts table restored
				};
			},
		),

	/**
	 * Archive customer (soft delete)
	 * Sets archived_at timestamp, keeps data for audit/compliance
	 */
	archive: protectedProcedure
		.input(
			z.object({
				customerId: uuidSchema,
				reason: z.string().max(255).optional(),
			}),
		)
		.mutation(async ({ ctx, input }): Promise<{ success: boolean }> => {
			const { db } = ctx;
			const { orgId } = ctx.auth;
			const { customerId } = input;

			// Archive the customer by setting archived_at timestamp
			const { data, error } = await db
				.from("customers")
				.update({
					archived_at: Temporal.Now.instant().toString(),
				})
				.eq("id", customerId)
				.eq("org_id", orgId) // Security: ensure org ownership
				.is("archived_at", null) // Only archive if not already archived
				.select("*")
				.maybeSingle();

			if (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Fout bij archiveren klant",
					cause: error,
				});
			}

			if (!data) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Klant niet gevonden, reeds gearchiveerd, of geen permissie",
				});
			}

			return { success: true };
		}),

	/**
	 * List archived customers with optional search and pagination
	 * For archived customers tab in dashboard
	 */
	listArchived: protectedProcedure
		.input(
			z
				.object({
					query: z.string().min(1).max(100).optional(),
					limit: z.number().int().min(1).max(100).default(50),
					offset: z.number().int().min(0).default(0),
				})
				.optional(),
		)
		.query(async ({ ctx, input = {} }): Promise<CustomerDTO[]> => {
			const { db } = ctx;
			const { orgId } = ctx.auth;
			const { query, limit = 50, offset = 0 } = input;

			let dbQuery = db
				.from("customers")
				.select("*")
				.eq("org_id", orgId)
				.not("archived_at", "is", null) // Only show archived customers
				.order("archived_at", { ascending: false })
				.range(offset, offset + limit - 1);

			// Add search filter if provided
			if (query) {
				dbQuery = dbQuery.or(
					`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`,
				);
			}

			const { data, error } = await dbQuery;

			if (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Fout bij ophalen gearchiveerde klanten",
					cause: error,
				});
			}

			const customers = data as Tables<"customers">[] | null;
			if (!customers) {
				return [];
			}

			return customers.map(mapDbCustomerToDto);
		}),

	/**
	 * Get archived customer count for organization
	 */
	countArchived: protectedProcedure.query(async ({ ctx }): Promise<number> => {
		const { db } = ctx;
		const { orgId } = ctx.auth;

		const { count, error } = await db
			.from("customers")
			.select("*", { count: "exact", head: true })
			.eq("org_id", orgId)
			.not("archived_at", "is", null); // Only count archived customers

		if (error) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Fout bij tellen gearchiveerde klanten",
				cause: error,
			});
		}

		return count ?? 0;
	}),

	/**
	 * Unarchive customer (restore from archive)
	 * Clears archived_at timestamp to restore customer to active status
	 */
	unarchive: protectedProcedure
		.input(
			z.object({
				customerId: uuidSchema,
			}),
		)
		.mutation(async ({ ctx, input }): Promise<CustomerDTO> => {
			const { db } = ctx;
			const { orgId } = ctx.auth;
			const { customerId } = input;

			// Unarchive the customer by clearing archived_at timestamp
			const { data, error } = await db
				.from("customers")
				.update({
					archived_at: null,
				})
				.eq("id", customerId)
				.eq("org_id", orgId) // Security: ensure org ownership
				.not("archived_at", "is", null) // Only unarchive if currently archived
				.select("*")
				.maybeSingle();

			if (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Fout bij herstellen klant",
					cause: error,
				});
			}

			if (!data) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Klant niet gevonden, niet gearchiveerd, of geen permissie",
				});
			}

			const customer = data as Tables<"customers">;
			return mapDbCustomerToDto(customer);
		}),
});
