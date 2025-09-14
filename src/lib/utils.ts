import { type ClassValue, clsx } from "clsx";
import { useTranslations } from "next-intl";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}
