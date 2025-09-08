import { api } from "~/lib/trpc/client";

type InvoiceProviderId = "moneybird" | "wefact" | "eboekhouden" | "peppol";

export interface ProviderHealth {
	ok: boolean;
	message?: string;
}

/**
 * Hook to fetch provider health status
 * Checks actual credentials and connectivity for each provider
 */
export function useProviderHealth(id: InvoiceProviderId): ProviderHealth {
	const { data, isLoading, error } = api.providers.getHealthStatus.useQuery(
		undefined,
		{
			staleTime: 5 * 60 * 1000, // 5 minutes
			refetchInterval: 10 * 60 * 1000, // 10 minutes
			refetchIntervalInBackground: false,
		},
	);

	if (isLoading) {
		return { ok: false, message: "Checking..." };
	}

	if (error) {
		return { ok: false, message: "Connection check failed" };
	}

	if (!data?.[id]) {
		return { ok: false, message: "Status unknown" };
	}

	const providerHealth = data[id];
	return {
		ok: providerHealth.connected,
		message: providerHealth.message,
	};
}
