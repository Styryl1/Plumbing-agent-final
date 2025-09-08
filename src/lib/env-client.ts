"use client";

export type EnvClient = {
	NEXT_PUBLIC_GA_MEASUREMENT_ID: string | undefined;
	NEXT_PUBLIC_ANALYTICS_ENABLED: string | undefined;
};

export const envClient: EnvClient = {
	NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
	NEXT_PUBLIC_ANALYTICS_ENABLED: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED,
};
