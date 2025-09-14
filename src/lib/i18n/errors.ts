export const E = {
	nameRequired: "customers.errors.name.required",
	phoneRequired: "customers.errors.phone.required",
	phoneInvalid: "customers.errors.phone.invalid",
	emailInvalid: "customers.errors.email.invalid",
	postalInvalid: "customers.errors.postalCode.invalid",
	houseNumberRequired: "customers.errors.houseNumber.required",
	addressRequired: "customers.errors.address.required",
	titleRequired: "jobs.errors.title.required",
	tooLong: "common.errors.tooLong", // params: {max}
	required: "common.errors.required",
} as const;
