"use client";

import {
	MessageSquareIcon as ChatBubbleLeftRightIcon,
	CreditCardIcon,
	ShieldCheckIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";
import { Badge } from "~/components/ui/badge";

const trustItems = [
	{
		key: "dutch_compliance" as const,
		icon: ShieldCheckIcon,
		color: "bg-blue-100 text-blue-700 border-blue-200",
	},
	{
		key: "ideal_payments" as const,
		icon: CreditCardIcon,
		color: "bg-green-100 text-green-700 border-green-200",
	},
	{
		key: "whatsapp_business" as const,
		icon: ChatBubbleLeftRightIcon,
		color: "bg-emerald-100 text-emerald-700 border-emerald-200",
	},
];

export function TrustStrip(): React.ReactElement {
	const t = useTranslations();

	// Map trust keys to i18n keys to avoid dynamic template literals
	const trustKeys: Record<
		"dutch_compliance" | "ideal_payments" | "whatsapp_business",
		string
	> = {
		dutch_compliance: "launch.trust.dutch_compliance",
		ideal_payments: "launch.trust.ideal_payments",
		whatsapp_business: "launch.trust.whatsapp_business",
	};

	return (
		<section className="border-y bg-gray-50 py-8">
			<div className="mx-auto max-w-7xl px-6 lg:px-8">
				<div className="flex flex-wrap items-center justify-center gap-6">
					{trustItems.map(({ key, icon: IconComponent, color }) => (
						<Badge
							key={key}
							variant="secondary"
							className={`${color} px-4 py-2 text-sm font-medium rounded-full flex items-center space-x-2`}
						>
							<IconComponent className="h-4 w-4" />
							<span>{t(trustKeys[key])}</span>
						</Badge>
					))}
				</div>
			</div>
		</section>
	);
}
