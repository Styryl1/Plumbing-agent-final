import { createTRPCReact } from "@trpc/react-query";
import { useTranslations } from "next-intl";
import type { AppRouter } from "~/server/api/root";

export const api = createTRPCReact<AppRouter>({});
