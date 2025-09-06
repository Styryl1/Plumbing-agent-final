"use client";

import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import type { JSX } from "react";
import { LanguageSwitcher } from "~/components/LanguageSwitcher";
import type { Locale } from "~/i18n";
import { useT } from "~/i18n/client";

interface DashboardHeaderProps {
	initialLocale: Locale;
}

export function DashboardHeader({
	initialLocale,
}: DashboardHeaderProps): JSX.Element {
	const t = useT();

	return (
		<header className="border-b bg-card shadow-soft">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="flex h-16 items-center justify-between">
					{/* Logo/Title */}
					<div className="flex items-center">
						<h1 className="text-xl font-semibold text-foreground">
							{t("app.title")}
						</h1>
						<span className="ml-2 text-sm text-muted-foreground">
							{t("nav.dashboard")}
						</span>
					</div>

					{/* Navigation - Desktop */}
					<div className="hidden items-center space-x-4 md:flex">
						<nav className="flex space-x-4">
							<a
								href="/dashboard"
								className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
							>
								{t("nav.dashboard")}
							</a>
							<a
								href="/jobs"
								className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
							>
								{t("nav.jobs")}
							</a>
							<a
								href="/customers"
								className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
							>
								{t("nav.customers")}
							</a>
							<Link
								href="/invoices"
								className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
							>
								{t("nav.invoices")}
							</Link>
						</nav>
					</div>

					{/* Auth Components & Language Switcher */}
					<div className="flex items-center space-x-4">
						<LanguageSwitcher initialLocale={initialLocale} />
						<OrganizationSwitcher
							appearance={{
								elements: {
									organizationSwitcherTrigger:
										"border border-border rounded-md px-3 py-2 bg-background hover:bg-accent transition-colors",
								},
							}}
							hidePersonal={false}
							afterCreateOrganizationUrl="/dashboard"
							afterSelectOrganizationUrl="/dashboard"
						/>
						<UserButton
							appearance={{
								elements: {
									avatarBox: "h-8 w-8",
								},
							}}
						/>
					</div>
				</div>
			</div>
		</header>
	);
}
