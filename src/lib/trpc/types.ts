import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/api/root";

export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type IntakeListItem = RouterOutputs["intake"]["list"]["items"][number];
export type IntakeDetail = RouterOutputs["intake"]["get"];
