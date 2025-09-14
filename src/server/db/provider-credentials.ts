import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import "~/lib/time";
import type { Database } from "~/types/supabase";

// Provider credentials schema with Zod v4 patterns
export const ProviderCredentialSchema = z.object({
	id: z.uuid(),
	org_id: z.string().min(1),
	provider: z.enum(["moneybird", "wefact", "eboekhouden"]),
	access_token: z.string().min(1),
	refresh_token: z.string().min(1),
	expires_at: z.string(), // ISO datetime string
	scopes: z.array(z.string()).default([]),
	administration_id: z.string().optional(),
	created_at: z.string(), // ISO datetime
	updated_at: z.string(), // ISO datetime
});

export const CreateProviderCredentialSchema = z.object({
	provider: z.enum(["moneybird", "wefact", "eboekhouden"]),
	access_token: z.string().min(1),
	refresh_token: z.string().min(1),
	expires_at: z.string(), // ISO datetime string from provider
	scopes: z.array(z.string()).default([]),
	administration_id: z.string().optional(),
});

export const UpdateProviderCredentialSchema = z.object({
	access_token: z.string().min(1).optional(),
	refresh_token: z.string().min(1).optional(),
	expires_at: z.string().optional(), // ISO datetime string
	scopes: z.array(z.string()).optional(),
	administration_id: z.string().optional(),
});

export type ProviderCredential = z.infer<typeof ProviderCredentialSchema>;
export type CreateProviderCredential = z.infer<
	typeof CreateProviderCredentialSchema
>;
export type UpdateProviderCredential = z.infer<
	typeof UpdateProviderCredentialSchema
>;

type ProviderType = "moneybird" | "wefact" | "eboekhouden";

/**
 * Org-scoped provider credentials operations with RLS enforcement
 */
export class ProviderCredentialsService {
	constructor(
		private db: SupabaseClient<Database>,
		private orgId: string,
	) {}

	/**
	 * Get credentials for a specific provider (org-scoped)
	 */
	async getCredentials(
		provider: ProviderType,
	): Promise<ProviderCredential | null> {
		const { data, error } = await this.db
			.from("invoice_provider_credentials")
			.select("*")
			.eq("org_id", this.orgId)
			.eq("provider", provider)
			.single();

		if (error?.code === "PGRST116") {
			// No rows returned
			return null;
		}

		if (error) {
			throw new Error(
				`Failed to fetch ${provider} credentials: ${error.message}`,
			);
		}

		return ProviderCredentialSchema.parse(data);
	}

	/**
	 * Create or update provider credentials (org-scoped)
	 */
	async upsertCredentials(
		provider: ProviderType,
		input: CreateProviderCredential,
	): Promise<ProviderCredential> {
		const validatedInput = CreateProviderCredentialSchema.parse({
			...input,
			provider,
		});

		const { data, error } = await this.db
			.from("invoice_provider_credentials")
			.upsert(
				{
					org_id: this.orgId,
					...validatedInput,
					administration_id: validatedInput.administration_id ?? null,
					updated_at:
						Temporal.Now.zonedDateTimeISO("Europe/Amsterdam").toString(),
				},
				{
					onConflict: "org_id,provider",
				},
			)
			.select("*")
			.single();

		if (error) {
			throw new Error(
				`Failed to upsert ${provider} credentials: ${error.message}`,
			);
		}

		return ProviderCredentialSchema.parse(data);
	}

	/**
	 * Update existing credentials (org-scoped)
	 */
	async updateCredentials(
		provider: ProviderType,
		updates: UpdateProviderCredential,
	): Promise<ProviderCredential> {
		const validatedUpdates = UpdateProviderCredentialSchema.parse(updates);

		// Handle optional fields for exactOptionalPropertyTypes
		const updateData: Record<string, unknown> = {
			updated_at: Temporal.Now.zonedDateTimeISO("Europe/Amsterdam").toString(),
		};

		if (validatedUpdates.access_token !== undefined) {
			updateData.access_token = validatedUpdates.access_token;
		}
		if (validatedUpdates.refresh_token !== undefined) {
			updateData.refresh_token = validatedUpdates.refresh_token;
		}
		if (validatedUpdates.expires_at !== undefined) {
			updateData.expires_at = validatedUpdates.expires_at;
		}
		if (validatedUpdates.scopes !== undefined) {
			updateData.scopes = validatedUpdates.scopes;
		}
		if (validatedUpdates.administration_id !== undefined) {
			updateData.administration_id = validatedUpdates.administration_id ?? null;
		}

		const { data, error } = await this.db
			.from("invoice_provider_credentials")
			.update(updateData)
			.eq("org_id", this.orgId)
			.eq("provider", provider)
			.select("*")
			.single();

		if (error?.code === "PGRST116") {
			throw new Error(`No ${provider} credentials found for organization`);
		}

		if (error) {
			throw new Error(
				`Failed to update ${provider} credentials: ${error.message}`,
			);
		}

		return ProviderCredentialSchema.parse(data);
	}

	/**
	 * Delete provider credentials (org-scoped)
	 */
	async deleteCredentials(provider: ProviderType): Promise<void> {
		const { error } = await this.db
			.from("invoice_provider_credentials")
			.delete()
			.eq("org_id", this.orgId)
			.eq("provider", provider);

		if (error) {
			throw new Error(
				`Failed to delete ${provider} credentials: ${error.message}`,
			);
		}
	}

	/**
	 * Check if credentials exist for provider (org-scoped)
	 */
	async hasCredentials(provider: ProviderType): Promise<boolean> {
		const { count, error } = await this.db
			.from("invoice_provider_credentials")
			.select("id", { count: "exact", head: true })
			.eq("org_id", this.orgId)
			.eq("provider", provider);

		if (error) {
			throw new Error(
				`Failed to check ${provider} credentials: ${error.message}`,
			);
		}

		return (count ?? 0) > 0;
	}
}

/**
 * Factory function to create org-scoped credentials service
 */
export function createProviderCredentialsService(
	db: SupabaseClient<Database>,
	orgId: string,
): ProviderCredentialsService {
	return new ProviderCredentialsService(db, orgId);
}
