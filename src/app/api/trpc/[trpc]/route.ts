import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { NextRequest } from "next/server";
import { appRouter } from "~/server/api/root";
import { createContext } from "~/server/api/trpc";

const handler = async (req: NextRequest): Promise<Response> =>
	fetchRequestHandler({
		endpoint: "/api/trpc",
		req,
		router: appRouter,
		createContext: async () => createContext(),
		onError: ({ path, error }) => {
			console.error(
				`❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
			);
		},
	});

export { handler as GET, handler as POST };
