import { useTranslations } from "next-intl";
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "~/lib/env";
import type { Database } from "~/types/supabase";
import { createProviderCredentialsService } from "../db/provider-credentials";
import { EBoekhoudenProvider } from "./eboekhouden/adapter";
import { MoneybirdProvider } from "./moneybird/adapter";
import { MoneyBirdClient } from "./moneybird/client";
import { PeppolProvider } from "./peppol/adapter";
import type { InvoiceProvider, InvoiceProviderId } from "./types";
import { WeFactProvider } from "./wefact/adapter";

/**
 * Create org-scoped provider instance with credentials
 */
async function constructWithCredentials(
	id: InvoiceProviderId,
	db: SupabaseClient<Database>,
	orgId: string,
	userId?: string,
): Promise<InvoiceProvider> {
	const credentialsService = createProviderCredentialsService(db, orgId);

	switch (id) {
		case "moneybird": {
			const credentials = await credentialsService.getCredentials("moneybird");
			if (!credentials) {
				throw new Error(
					"Moneybird not configured. Please connect your Moneybird account first.",
				);
			}

			// Create authenticated client
			const client = new MoneyBirdClient(
				credentials.access_token,
				credentials.refresh_token,
				credentials.expires_at,
			);

			return new MoneybirdProvider(client, credentials);
		}
		case "wefact": {
			const credentials = await credentialsService.getCredentials("wefact");
			if (!credentials) {
				throw new Error(
					"WeFact not configured. Please connect your WeFact account first.",
				);
			}

			return new WeFactProvider(
				credentials.access_token,
				credentials.administration_id ?? undefined,
			);
		}
		case "eboekhouden": {
			// e-Boekhouden uses server-only API token authentication (no OAuth credentials in database)
			// API token is configured via environment variables
			return new EBoekhoudenProvider(orgId, userId ?? "system");
		}
		case "peppol": {
			// Peppol doesn't require OAuth2 credentials (different setup)
			return new PeppolProvider();
		}
	}
}

/**
 * Get authenticated provider instance for organization
 */
export async function getProvider(
	id: InvoiceProviderId,
	db: SupabaseClient<Database>,
	orgId: string,
	userId?: string,
): Promise<InvoiceProvider> {
	// Feature flags gate availability
	if (id === "moneybird" && env.INVOICING_MONEYBIRD !== "true") {
		throw new Error("Moneybird integration is disabled");
	}
	if (id === "wefact" && env.INVOICING_WEFACT !== "true") {
		throw new Error("WeFact integration is disabled");
	}
	if (id === "eboekhouden" && env.INVOICING_EB !== "true") {
		throw new Error("e-Boekhouden integration is disabled");
	}
	if (id === "peppol" && env.PEPPOL_SEND !== "true") {
		throw new Error("Peppol integration is disabled");
	}

	return constructWithCredentials(id, db, orgId, userId);
}

// Optional helper: choose a default provider given tenant/org settings (S3+ will wire actual tenant config).
export function getDefaultProviderIdForOrg(): InvoiceProviderId | null {
	// S2 returns null; S3 will consult tenant/org settings and credentials.
	return null;
}
