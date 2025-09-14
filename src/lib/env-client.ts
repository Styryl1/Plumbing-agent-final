"use client";
import { useTranslations } from "next-intl";

export type EnvClient = {
	NEXT_PUBLIC_GA_MEASUREMENT_ID: string | undefined;
	NEXT_PUBLIC_ANALYTICS_ENABLED: string | undefined;
	NODE_ENV: string;
};

export const envClient: EnvClient = {
	NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
	NEXT_PUBLIC_ANALYTICS_ENABLED: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED,
	NODE_ENV: process.env.NODE_ENV as string,
};
