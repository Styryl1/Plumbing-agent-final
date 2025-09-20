"use client";

import type { JSX } from "react";
import { api } from "~/lib/trpc/client";

export default function TestAuthPage(): JSX.Element {
	const {
		data: authDebug,
		error,
		isLoading,
	} = api.customers.debugAuth.useQuery();
	const errorMessage = error?.message ?? null;

	return (
		<div className="p-8">
			<h1 className="text-2xl font-bold mb-4">JWT Authentication Debug</h1>

			{isLoading && <p>Loading...</p>}

			{errorMessage && (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
					<p className="font-bold">Error:</p>
					<p>{errorMessage}</p>
				</div>
			)}

			{authDebug && (
				<div className="bg-gray-100 p-4 rounded">
					<h2 className="font-bold mb-2">Supabase Auth Context:</h2>
					<pre className="text-xs overflow-auto">
						{JSON.stringify(authDebug, null, 2)}
					</pre>
				</div>
			)}
		</div>
	);
}
