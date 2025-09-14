import { useTranslations } from "next-intl";
// Customer mapper - Transforms between database types and DTOs
// Enforces DTO boundary: DB → mapper → DTO → UI (never DB types in UI)
// Handles snake_case ↔ camelCase and type safety

import { zdtToISO } from "~/lib/time";
import type {
	CreateCustomerInput,
	CustomerDTO,
	CustomerPickerItem,
	UpdateCustomerInput,
} from "~/types/customer";
import type { Tables, TablesInsert, TablesUpdate } from "~/types/supabase";

// === TYPE ALIASES FOR DATABASE LAYER ===

type DbCustomer = Tables<"customers">;
type DbCustomerInsert = TablesInsert<"customers">;
type DbCustomerUpdate = TablesUpdate<"customers">;

// === DATABASE TO DTO MAPPERS ===

/**
 * Transform database customer row to CustomerDTO
 */
export function mapDbCustomerToDto(dbCustomer: DbCustomer): CustomerDTO {
	const dto: CustomerDTO = {
		id: dbCustomer.id,
		orgId: dbCustomer.org_id,
		name: dbCustomer.name,
		phone: dbCustomer.phone ?? "", // Required field, fallback to empty string
		language: dbCustomer.language as "nl" | "en",
		createdAt:
			dbCustomer.created_at ??
			zdtToISO(Temporal.Now.zonedDateTimeISO("Europe/Amsterdam")),
		isArchived: Boolean(dbCustomer.archived_at),
	};

	// Add archived timestamp if it exists
	if (dbCustomer.archived_at) {
		(dto as { archivedAt: string }).archivedAt = dbCustomer.archived_at;
	}

	// Only add optional properties if they have actual values
	if (dbCustomer.email) {
		(dto as { email: string }).email = dbCustomer.email;
	}
	if (dbCustomer.phone) {
		(dto as { phone: string }).phone = dbCustomer.phone;
	}
	if (dbCustomer.address) {
		(dto as { address: string }).address = dbCustomer.address;
	}
	if (dbCustomer.postal_code) {
		(dto as { postalCode: string }).postalCode = dbCustomer.postal_code;
	}

	return dto;
}

/**
 * Transform database customer row to CustomerPickerItem for UI components
 */
export function mapDbCustomerToPickerItem(
	dbCustomer: DbCustomer,
): CustomerPickerItem {
	const parts: string[] = [dbCustomer.name];

	if (dbCustomer.email) {
		parts.push(dbCustomer.email);
	}

	if (dbCustomer.phone) {
		parts.push(dbCustomer.phone);
	}

	const displayText = parts.join(" • ");

	const pickerItem: CustomerPickerItem = {
		id: dbCustomer.id,
		name: dbCustomer.name,
		phone: dbCustomer.phone ?? "", // Required field, fallback to empty string
		displayText,
	};

	// Only add optional properties if they have actual values
	if (dbCustomer.email) {
		(pickerItem as { email: string }).email = dbCustomer.email;
	}
	if (dbCustomer.phone) {
		(pickerItem as { phone: string }).phone = dbCustomer.phone;
	}

	return pickerItem;
}

// === DTO TO DATABASE MAPPERS ===

/**
 * Transform CreateCustomerInput to database insert format
 */
export function mapCreateCustomerInputToDb(
	input: CreateCustomerInput,
	orgId: string,
): DbCustomerInsert {
	return {
		org_id: orgId,
		name: input.name,
		email: input.email ?? null,
		phone: input.phone,
		address: input.address ?? null,
		postal_code: input.postalCode ?? null,
		language: input.language ?? "nl", // Default to Dutch
	};
}

/**
 * Transform UpdateCustomerInput to database update format
 */
export function mapUpdateCustomerInputToDb(
	input: Partial<UpdateCustomerInput>,
): DbCustomerUpdate {
	const update: DbCustomerUpdate = {};

	if (input.name !== undefined) {
		update.name = input.name;
	}

	if (input.email !== undefined) {
		update.email = input.email ?? null;
	}

	if (input.phone !== undefined) {
		update.phone = input.phone ?? null;
	}

	if (input.address !== undefined) {
		update.address = input.address ?? null;
	}

	if (input.postalCode !== undefined) {
		update.postal_code = input.postalCode ?? null;
	}

	if (input.language !== undefined) {
		update.language = input.language;
	}

	return update;
}

// === UTILITY FUNCTIONS ===

/**
 * Format customer for display in UI (short form)
 */
export function formatCustomerDisplay(customer: CustomerDTO): string {
	const parts: string[] = [customer.name];

	if (customer.email) {
		parts.push(`(${customer.email})`);
	}

	return parts.join(" ");
}

/**
 * Format customer for search/filtering (includes all searchable fields)
 */
export function formatCustomerSearchText(customer: CustomerDTO): string {
	const parts: string[] = [customer.name];

	if (customer.email) {
		parts.push(customer.email);
	}

	if (customer.phone.trim() !== "") {
		parts.push(customer.phone);
	}

	if (customer.address) {
		parts.push(customer.address);
	}

	return parts.join(" ").toLowerCase();
}

/**
 * Validate Dutch postal code format (1234AB)
 */
export function validateDutchPostalCode(postalCode: string): boolean {
	const dutchPostalCodeRegex = /^[1-9][0-9]{3}[A-Z]{2}$/;
	return dutchPostalCodeRegex.test(postalCode.toUpperCase().replace(/\s/g, ""));
}

/**
 * Format Dutch postal code (normalize spacing)
 */
export function formatDutchPostalCode(postalCode: string): string {
	const cleaned = postalCode.toUpperCase().replace(/\s/g, "");
	if (cleaned.length === 6) {
		return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
	}
	return postalCode;
}
