"use client";
import { useFormatter, useTranslations } from "next-intl";

export function useT(namespace?: string): ReturnType<typeof useTranslations> {
	return useTranslations(namespace);
}

export function useFmt(): ReturnType<typeof useFormatter> {
	return useFormatter();
}
