import "server-only";
import type { MoneyBirdClient, MoneyBirdTaxRate } from "./client";

/**
 * Simple in-memory tax rate cache per administration
 * Caches tax rates for 1 hour to avoid repeated API calls
 */
class TaxRateCache {
	private cache = new Map<
		string,
		{
			rates: MoneyBirdTaxRate[];
			timestamp: number;
		}
	>();

	private readonly TTL_MS = 60 * 60 * 1000; // 1 hour

	async getTaxRates(
		client: MoneyBirdClient,
		administrationId: string,
	): Promise<MoneyBirdTaxRate[]> {
		const cached = this.cache.get(administrationId);
		const now = Temporal.Now.instant().epochMilliseconds;

		// Return cached data if it's still fresh
		if (cached && now - cached.timestamp < this.TTL_MS) {
			return cached.rates;
		}

		// Fetch fresh data from API
		const rates = await client.listTaxRates(administrationId);

		// Cache the result
		this.cache.set(administrationId, {
			rates,
			timestamp: now,
		});

		return rates;
	}

	/**
	 * Map Dutch VAT percentage to Moneybird tax rate ID
	 * Returns the best matching tax rate or null if no match
	 */
	mapVatPercentageToTaxRateId(
		rates: MoneyBirdTaxRate[],
		vatPercentage: number,
	): string | null {
		// Convert percentage to string format (21 -> "21.0")
		const targetPercent = vatPercentage.toFixed(1);

		// Look for exact match first
		const exactMatch = rates.find(
			(rate) => rate.percentage === targetPercent && (rate.active ?? true), // Only use active rates
		);

		if (exactMatch) {
			return exactMatch.id;
		}

		// Look for close match (within 0.5%)
		const numericTarget = parseFloat(targetPercent);
		const closeMatch = rates.find((rate) => {
			const ratePercent = parseFloat(rate.percentage);
			return (
				Math.abs(ratePercent - numericTarget) <= 0.5 && (rate.active ?? true)
			);
		});

		return closeMatch?.id ?? null;
	}

	/**
	 * Clear cache for testing or forced refresh
	 */
	clear(): void {
		this.cache.clear();
	}
}

// Singleton instance for the application
export const taxRateCache = new TaxRateCache();
