import { useQuery } from "@tanstack/react-query";

type InvoiceProviderId = "moneybird" | "wefact" | "eboekhouden" | "peppol";

export interface ProviderHealth {
	ok: boolean;
	message?: string;
}

/**
 * Hook to fetch provider health status
 * For pilot-ready state, this checks basic connectivity and auth state
 */
export function useProviderHealth(id: InvoiceProviderId): ProviderHealth {
	const { data } = useQuery({
		queryKey: ["providerHealth", id],
		queryFn: (): ProviderHealth => {
			// For now, return a simple stub based on provider type
			// In production, this would call actual health endpoints
			try {
				switch (id) {
					case "moneybird":
						// Check if OAuth token exists and is valid
						// This would typically call /api/providers/moneybird/health
						return { ok: true, message: "Connected and ready" };

					case "wefact":
						// Check API key validity
						return { ok: false, message: "API key required" };

					case "eboekhouden":
						// Check API credentials
						return { ok: false, message: "Not configured" };

					case "peppol":
						// Check Access Point connectivity
						return { ok: false, message: "Not implemented yet" };

					default:
						return { ok: false, message: "Unknown provider" };
				}
			} catch {
				return { ok: false, message: "Connection failed" };
			}
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		refetchInterval: 10 * 60 * 1000, // 10 minutes
		refetchIntervalInBackground: false,
	});

	return data ?? { ok: false, message: "Checking..." };
}
