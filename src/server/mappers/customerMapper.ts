// Customer mapper - Transforms between database types and DTOs
// Enforces DTO boundary: DB ↔ mapper ↔ DTO ↔ UI (never expose DB types directly)
// Handles snake_case ↔ camelCase and type safety across the stack

import { Temporal } from "temporal-polyfill";
import { zdtToISO } from "~/lib/time";
import type {
	CreateCustomerInput,
	CustomerDTO,
	CustomerPickerItem,
	UpdateCustomerInput,
} from "~/types/customer";
import type {
	Json,
	Tables,
	TablesInsert,
	TablesUpdate,
} from "~/types/supabase";

// === TYPE ALIASES FOR DATABASE LAYER ===

type DbCustomer = Tables<"customers">;
type DbCustomerInsert = TablesInsert<"customers">;
type DbCustomerUpdate = TablesUpdate<"customers">;

function coercePhoneList(value: string[] | null | undefined): string[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.map((candidate) => (typeof candidate === "string" ? candidate.trim() : ""))
		.filter((candidate) => candidate.length > 0);
}

function coerceCustomFields(
	value: Json | null | undefined,
): Record<string, unknown> {
	if (value === null || value === undefined) {
		return {};
	}

	if (typeof value === "object" && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}

	return {};
}

function resolveCreatedAt(date: string | null | undefined): string {
	if (date && date.length > 0) {
		return date;
	}

	return zdtToISO(Temporal.Now.zonedDateTimeISO("Europe/Amsterdam"));
}

function resolvePhoneList(
	phones: string[] | null | undefined,
	primary: string | null,
): string[] {
	if (Array.isArray(phones) && phones.length > 0) {
		return phones;
	}
	if (typeof primary === "string" && primary.length > 0) {
		return [primary];
	}
	return [];
}

// === DATABASE TO DTO MAPPERS ===

export function mapDbCustomerToDto(dbCustomer: DbCustomer): CustomerDTO {
	const phones = coercePhoneList(
		resolvePhoneList(dbCustomer.phones, dbCustomer.phone ?? null),
	);
	const primaryPhone = phones[0] ?? null;

	const dto: CustomerDTO = {
		id: dbCustomer.id,
		orgId: dbCustomer.org_id,
		name: dbCustomer.name,
		phones,
		primaryPhone,
		email: dbCustomer.email ?? undefined,
		kvk: dbCustomer.kvk ?? undefined,
		btw: dbCustomer.btw ?? undefined,
		address: dbCustomer.address ?? undefined,
		postalCode: dbCustomer.postal_code ?? undefined,
		houseNumber: dbCustomer.house_number ?? undefined,
		street: dbCustomer.street ?? undefined,
		city: dbCustomer.city ?? undefined,
		language: dbCustomer.language as "nl" | "en",
		customFields: coerceCustomFields(dbCustomer.custom_fields ?? {}),
		createdAt: resolveCreatedAt(dbCustomer.created_at),
		isArchived: Boolean(dbCustomer.archived_at),
	};

	if (dbCustomer.archived_at) {
		(dto as { archivedAt: string }).archivedAt = dbCustomer.archived_at;
	}

	return dto;
}

export function mapDbCustomerToPickerItem(
	dbCustomer: DbCustomer,
): CustomerPickerItem {
	const phones = coercePhoneList(
		resolvePhoneList(dbCustomer.phones, dbCustomer.phone ?? null),
	);
	const primaryPhone = phones[0] ?? null;

	const parts: string[] = [dbCustomer.name];

	if (primaryPhone) {
		parts.push(primaryPhone);
	}

	if (dbCustomer.email) {
		parts.push(`<${dbCustomer.email}>`);
	}

	return {
		id: dbCustomer.id,
		name: dbCustomer.name,
		phones,
		primaryPhone,
		email: dbCustomer.email ?? undefined,
		displayText: parts.join(" \u2013 "),
	};
}

// === DTO TO DATABASE MAPPERS ===

function preparePhoneArray(phones: string[]): string[] {
	return phones
		.map((phone) => phone.trim())
		.filter((phone) => phone.length > 0);
}

export function mapCreateCustomerInputToDb(
	input: CreateCustomerInput,
	orgId: string,
): DbCustomerInsert {
	const phones = preparePhoneArray(input.phones);

	return {
		org_id: orgId,
		name: input.name,
		email: input.email ?? null,
		phones,
		phone: phones[0] ?? null,
		kvk: input.kvk ?? null,
		btw: input.btw ?? null,
		address: input.address ?? null,
		postal_code: input.postalCode ?? null,
		house_number: input.houseNumber ?? null,
		street: input.street ?? null,
		city: input.city ?? null,
		language: input.language ?? "nl",
		custom_fields: (input.customFields ?? {}) as Json,
	};
}

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

	if (input.phones !== undefined) {
		const phones = preparePhoneArray(input.phones ?? []);
		update.phones = phones;
		update.phone = phones[0] ?? null;
	}

	if (input.kvk !== undefined) {
		update.kvk = input.kvk ?? null;
	}

	if (input.btw !== undefined) {
		update.btw = input.btw ?? null;
	}

	if (input.address !== undefined) {
		update.address = input.address ?? null;
	}

	if (input.postalCode !== undefined) {
		update.postal_code = input.postalCode ?? null;
	}

	if (input.houseNumber !== undefined) {
		update.house_number = input.houseNumber ?? null;
	}

	if (input.street !== undefined) {
		update.street = input.street ?? null;
	}

	if (input.city !== undefined) {
		update.city = input.city ?? null;
	}

	if (input.language !== undefined) {
		update.language = input.language;
	}

	if (input.customFields !== undefined) {
		update.custom_fields = (input.customFields ?? {}) as Json;
	}

	return update;
}

// === UTILITY FUNCTIONS ===

export function formatCustomerDisplay(customer: CustomerDTO): string {
	const parts: string[] = [customer.name];

	if (customer.primaryPhone) {
		parts.push(customer.primaryPhone);
	}

	if (customer.email) {
		parts.push(`<${customer.email}>`);
	}

	return parts.join(" \u2013 ");
}

export function formatCustomerSearchText(customer: CustomerDTO): string {
	const parts: string[] = [customer.name];

	for (const phone of customer.phones) {
		if (phone.trim().length > 0) {
			parts.push(phone);
		}
	}

	if (customer.email) {
		parts.push(customer.email);
	}

	if (customer.address) {
		parts.push(customer.address);
	}

	if (customer.postalCode) {
		parts.push(customer.postalCode);
	}

	return parts.join(" ").toLowerCase();
}

export function validateDutchPostalCode(postalCode: string): boolean {
	const dutchPostalCodeRegex = /^[1-9][0-9]{3}[A-Z]{2}$/;
	return dutchPostalCodeRegex.test(postalCode.toUpperCase().replace(/\s/g, ""));
}

export function formatDutchPostalCode(postalCode: string): string {
	const cleaned = postalCode.toUpperCase().replace(/\s/g, "");
	if (cleaned.length === 6) {
		return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
	}
	return postalCode;
}
