"use client";

import {
	MessageSquareIcon as ChatBubbleLeftRightIcon,
	CreditCardIcon,
	ShieldCheckIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";
import { Badge } from "~/components/ui/badge";
import { typedEntries } from "~/i18n/types";

const trustMeta = {
	dutch_compliance: {
		color: "bg-blue-100 text-blue-700 border-blue-200",
		icon: ShieldCheckIcon,
		labelKey: "launch.trust.dutch_compliance",
	},
	ideal_payments: {
		color: "bg-green-100 text-green-700 border-green-200",
		icon: CreditCardIcon,
		labelKey: "launch.trust.ideal_payments",
	},
	whatsapp_business: {
		color: "bg-emerald-100 text-emerald-700 border-emerald-200",
		icon: ChatBubbleLeftRightIcon,
		labelKey: "launch.trust.whatsapp_business",
	},
} as const;

export function TrustStrip(): React.ReactElement {
	const t = useTranslations();

	return (
		<section className="border-y bg-gray-50 py-8">
			<div className="mx-auto max-w-7xl px-6 lg:px-8">
				<div className="flex flex-wrap items-center justify-center gap-6">
					{typedEntries(trustMeta).map(
						([key, { color, icon: IconComponent, labelKey }]) => (
							<Badge
								key={key}
								variant="secondary"
								className={`${color} px-4 py-2 text-sm font-medium rounded-full flex items-center space-x-2`}
							>
								<IconComponent className="h-4 w-4" />
								<span>{t(labelKey as Parameters<typeof t>[0])}</span>
							</Badge>
						),
					)}
				</div>
			</div>
		</section>
	);
}
