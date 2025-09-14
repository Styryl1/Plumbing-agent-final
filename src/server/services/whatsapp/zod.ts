import { useTranslations } from "next-intl";
import { z } from "zod";

export const MetaStatusSchema = z.object({
	id: z.string(), // message id (Meta)
	status: z.enum(["sent", "delivered", "read", "failed"]),
	timestamp: z.string(), // epoch seconds as string
	recipient_id: z.string().optional(),
	conversation: z
		.object({
			id: z.string().optional(),
			origin: z.object({ type: z.string().optional() }).optional(),
		})
		.optional(),
	pricing: z
		.object({
			billable: z.boolean().optional(),
			category: z.string().optional(),
			pricing_model: z.string().optional(),
		})
		.optional(),
	errors: z
		.array(
			z.object({
				code: z.number().optional(),
				title: z.string().optional(),
				details: z.string().optional(),
			}),
		)
		.optional(),
});

export const MetaSendResponseSchema = z.object({
	messages: z.array(z.object({ id: z.string() })).optional(),
	error: z
		.object({
			message: z.string().optional(),
			code: z.number().optional(),
		})
		.optional(),
});
