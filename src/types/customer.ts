import { useTranslations } from "next-intl";
// Customer DTO - Single source of truth for customer data shapes
// Used across UI components, tRPC routers, and API boundaries
// Never import Supabase types directly - use this DTO interface

export interface CustomerDTO {
	readonly id: string;
	readonly orgId: string;
	readonly name: string;
	readonly phone: string; // Required for field service operations
	readonly email?: string;
	readonly address?: string; // Legacy flat address field
	readonly postalCode?: string; // Optional in customer, required for jobs/invoices
	readonly houseNumber?: string; // For Dutch address auto-fill
	readonly street?: string; // Auto-filled from postcode + house number
	readonly city?: string; // Auto-filled from postcode + house number
	readonly language: "nl" | "en"; // Default: 'nl' for Dutch market
	readonly createdAt: string; // ISO timestamp
	readonly archivedAt?: string; // ISO timestamp when customer was archived
	readonly isArchived: boolean; // Computed field for easy filtering
}

// Create customer input (excludes auto-generated fields)
export interface CreateCustomerInput {
	name: string;
	phone: string; // Required for field service operations
	email?: string;
	address?: string; // Legacy flat address field
	postalCode?: string; // Optional in customer creation, required for jobs/invoices
	houseNumber?: string; // For Dutch address auto-fill
	street?: string; // Auto-filled from postcode + house number
	city?: string; // Auto-filled from postcode + house number
	language?: "nl" | "en"; // Optional, defaults to 'nl'
}

// Update customer input (all fields optional except id)
export interface UpdateCustomerInput {
	name?: string;
	phone?: string;
	email?: string;
	address?: string; // Legacy flat address field
	postalCode?: string;
	houseNumber?: string; // For Dutch address auto-fill
	street?: string; // Auto-filled from postcode + house number
	city?: string; // Auto-filled from postcode + house number
	language?: "nl" | "en";
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
	readonly phone: string; // Required for field service operations
	readonly email?: string;
	readonly displayText: string; // Formatted for UI display
}
