"use client";

import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { api } from "~/lib/trpc/client";

export default function TestAuthPage(): JSX.Element {
	const t = useTranslations();
	const {
		data: authDebug,
		error,
		isLoading,
	} = api.customers.debugAuth.useQuery();
	const errorMessage = error?.message ?? null;
	const hasAuthDebug = authDebug !== null && authDebug !== undefined;

	return (
		<div className="p-8">
			<h1 className="text-2xl font-bold mb-4">{t("testAuth.title")}</h1>

			{isLoading && <p>{t("common.loading")}</p>}

			{errorMessage && (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
					<p className="font-bold">{`${t("common.error")}:`}</p>
					<p>{errorMessage}</p>
				</div>
			)}

			{hasAuthDebug && (
				<div className="bg-gray-100 p-4 rounded">
					<h2 className="font-bold mb-2">{t("testAuth.contextHeading")}</h2>
					<pre className="text-xs overflow-auto">
						{JSON.stringify(authDebug, null, 2)}
					</pre>
				</div>
			)}
		</div>
	);
}
