import { useCallback, useEffect, useRef, useState } from "react";
import type {
	FieldValues,
	Path,
	PathValue,
	UseFormReturn,
} from "react-hook-form";

const NL_POSTCODE = /^\d{4}\s?[A-Za-z]{2}$/;

type LookupOk = {
	ok: true;
	street: string;
	city: string;
	municipality?: string;
	province?: string;
	provider: "pdok" | "postcodeapi";
};
type LookupErr = { ok: false; error: string };
type LookupRes = LookupOk | LookupErr;

function toStr(v: unknown): string {
	if (typeof v === "string") return v;
	if (v == null) return "";
	// Handle primitive values that can be safely converted to string
	if (typeof v === "number" || typeof v === "boolean") return String(v);
	// For other types, return empty string to avoid object stringification
	return "";
}

type AddressPaths<T extends FieldValues> = {
	postalCode: Path<T>;
	houseNumber: Path<T>;
	street: Path<T>;
	city: Path<T>;
};

export function useAutoFillAddress<T extends FieldValues>(
	form: UseFormReturn<T>,
	paths: AddressPaths<T>,
): { isLooking: boolean } {
	const [isLooking, setIsLooking] = useState(false);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const lookupAddress = useCallback(async (): Promise<void> => {
		// Helper to set a string value with correct typing
		function setString<K extends Path<T>>(key: K, value: string): void {
			form.setValue(key, value as PathValue<T, K>, {
				shouldValidate: true,
				shouldDirty: true,
			});
		}
		const rawPc = toStr(form.getValues(paths.postalCode)).trim();
		const rawHn = toStr(form.getValues(paths.houseNumber)).trim();

		if (!NL_POSTCODE.test(rawPc) || rawHn === "") return;

		setIsLooking(true);
		try {
			const url = `/api/lookup-address?postalCode=${encodeURIComponent(rawPc)}&houseNumber=${encodeURIComponent(rawHn)}`;
			const res = await fetch(url, { cache: "no-store" });
			if (!res.ok) return;
			const data = (await res.json()) as LookupRes;
			if (!data.ok) return;

			const street = data.street.trim();
			const city = data.city.trim();
			if (street === "" || city === "") return;

			const curStreet = toStr(form.getValues(paths.street));
			const curCity = toStr(form.getValues(paths.city));

			if (curStreet !== street) setString(paths.street, street);
			if (curCity !== city) setString(paths.city, city);
		} catch (error) {
			// Silently fail - user can still enter address manually
			console.warn("Address lookup failed:", error);
		} finally {
			setIsLooking(false);
		}
	}, [form, paths]);

	useEffect(() => {
		// Debounce: re-run when either field changes
		const sub = form.watch((_val, { name }) => {
			if (name === paths.postalCode || name === paths.houseNumber) {
				if (timeoutRef.current) clearTimeout(timeoutRef.current);
				timeoutRef.current = setTimeout(() => {
					void lookupAddress();
				}, 400);
			}
		});
		return () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
			sub.unsubscribe();
		};
	}, [form, paths, lookupAddress]);

	return { isLooking };
}
