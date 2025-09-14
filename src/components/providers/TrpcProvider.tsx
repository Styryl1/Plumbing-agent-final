"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import type { JSX } from "react";
import { useState } from "react";
import superjson from "superjson";
import { api } from "~/lib/trpc/client";

function getUrl(): string {
	const base = (() => {
		if (typeof window !== "undefined") return "";
		// For SSR, use automatic detection based on host
		// In production, Next.js will automatically set the correct base URL
		return "http://localhost:3000";
	})();

	return `${base}/api/trpc`;
}

export function TrpcProvider({
	children,
}: {
	readonly children: React.ReactNode;
}): JSX.Element {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 5 * 60 * 1000, // 5 minutes
						gcTime: 10 * 60 * 1000, // 10 minutes
					},
				},
			}),
	);

	const [trpcClient] = useState(() =>
		api.createClient({
			links: [
				httpBatchLink({
					url: getUrl(),
					transformer: superjson,
				}),
			],
		}),
	);

	return (
		<api.Provider client={trpcClient} queryClient={queryClient}>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</api.Provider>
	);
}
