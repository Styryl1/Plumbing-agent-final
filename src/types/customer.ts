// Customer DTO - Single source of truth for customer data shapes
// Used across UI components, tRPC routers, and API boundaries
// Never import Supabase types directly - use this DTO interface

export interface CustomerDTO {
	readonly id: string;
	readonly orgId: string;
	readonly name: string;
	readonly phones: string[]; // Primary phone = phones[0]
	readonly primaryPhone: string | null; // Convenience alias for first phone
	readonly email?: string | undefined;
	readonly kvk?: string | undefined;
	readonly btw?: string | undefined;
	readonly address?: string | undefined; // Legacy flat address field
	readonly postalCode?: string | undefined;
	readonly houseNumber?: string | undefined; // Derived from custom fields when available
	readonly street?: string | undefined;
	readonly city?: string | undefined;
	readonly language: "nl" | "en";
	readonly customFields: Record<string, unknown>;
	readonly createdAt: string; // ISO timestamp
	readonly archivedAt?: string; // ISO timestamp when customer was archived
	readonly isArchived: boolean;
}

// Create customer input (excludes auto-generated fields)
export interface CreateCustomerInput {
	name: string;
	phones: string[]; // Must contain at least one phone number
	email?: string;
	kvk?: string;
	btw?: string;
	address?: string;
	postalCode?: string;
	houseNumber?: string;
	street?: string;
	city?: string;
	language?: "nl" | "en";
	customFields?: Record<string, unknown>;
}

// Update customer input (all fields optional except id in router layer)
export interface UpdateCustomerInput {
	name?: string;
	phones?: string[]; // When provided, replaces the full phone list
	email?: string | null;
	kvk?: string | null;
	btw?: string | null;
	address?: string | null;
	postalCode?: string | null;
	houseNumber?: string | null;
	street?: string | null;
	city?: string | null;
	language?: "nl" | "en";
	customFields?: Record<string, unknown>;
}

// Customer search/filter options
export interface CustomerSearchInput {
	readonly query?: string; // Search across name, email, phone
	readonly limit?: number; // Default: 20, max: 100
	readonly offset?: number; // Default: 0
}

// Customer for display in picker components
export interface CustomerPickerItem {
	readonly id: string;
	readonly name: string;
	readonly phones: string[];
	readonly primaryPhone: string | null;
	readonly email?: string | undefined;
	readonly displayText: string; // Formatted for UI display
}
