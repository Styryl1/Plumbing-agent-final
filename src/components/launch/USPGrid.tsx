"use client";

import {
	CalendarIcon as CalendarDaysIcon,
	MessageSquareIcon as ChatBubbleLeftRightIcon,
	ClipboardCheckIcon as ClipboardDocumentCheckIcon,
	CpuIcon as CpuChipIcon,
	FileTextIcon as DocumentTextIcon,
	ShieldCheckIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";

const uspIcons = {
	whatsapp: ChatBubbleLeftRightIcon,
	ai: CpuChipIcon,
	schedule: CalendarDaysIcon,
	jobcards: ClipboardDocumentCheckIcon,
	invoicing: DocumentTextIcon,
	compliance: ShieldCheckIcon,
};

const uspKeys = [
	"whatsapp",
	"ai",
	"schedule",
	"jobcards",
	"invoicing",
	"compliance",
] as const;

export function USPGrid(): React.ReactElement {
	const t = useTranslations();

	return (
		<section className="py-16 sm:py-24">
			<div className="mx-auto max-w-7xl px-6 lg:px-8">
				<div className="mx-auto max-w-2xl text-center mb-12">
					<h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
						{t("launch.usp.title")}
					</h2>
					<p className="mt-4 text-lg text-gray-600">
						{t("launch.usp.subtitle")}
					</p>
				</div>
				<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{uspKeys.map((uspKey) => {
						const IconComponent = uspIcons[uspKey];
						return (
							<Card
								key={uspKey}
								className="rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.12)] transition-shadow duration-300"
							>
								<CardHeader>
									<div className="flex items-center space-x-3">
										<div className="rounded-lg bg-emerald-100 p-2">
											<IconComponent className="h-6 w-6 text-emerald-600" />
										</div>
										<CardTitle className="text-xl">
											{t(`launch.usp.${uspKey}.title`)}
										</CardTitle>
									</div>
								</CardHeader>
								<CardContent>
									<CardDescription className="text-base">
										{t(`launch.usp.${uspKey}.desc`)}
									</CardDescription>
								</CardContent>
							</Card>
						);
					})}
				</div>
			</div>
		</section>
	);
}
