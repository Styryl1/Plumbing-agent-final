import { useTranslations } from "next-intl";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
	getTravelAwareSlots,
	SuggestSlotsInput,
} from "~/server/services/scheduling/travel";

export const schedulingRouter = createTRPCRouter({
	suggestSlots: protectedProcedure
		.input(SuggestSlotsInput)
		.query(({ input }) => {
			const out = getTravelAwareSlots(input);
			return { candidates: out };
		}),
});
