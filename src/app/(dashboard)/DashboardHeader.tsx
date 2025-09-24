"use client";

import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { LanguageSwitcher } from "~/components/LanguageSwitcher";

export function DashboardHeader(): JSX.Element {
	const t = useTranslations();
	const translateNav = (key: string): string =>
		t(`ui.nav.${key}` as Parameters<typeof t>[0]);

	return (
		<header className="border-b bg-card shadow-soft">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="flex h-16 items-center justify-between">
					{/* Logo/Title */}
					<div className="flex items-center">
						<h1 className="text-xl font-semibold text-foreground">
							{t("system.app.title")}
						</h1>
						<span className="ml-2 text-sm text-muted-foreground">
							{translateNav("dashboard")}
						</span>
					</div>

					{/* Navigation - Desktop */}
					<div className="hidden items-center space-x-4 md:flex">
						<nav className="flex space-x-4">
							<a
								href="/dashboard"
								className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
							>
								{translateNav("dashboard")}
							</a>
							<a
								href="/intake"
								className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
							>
								{translateNav("intake")}
							</a>
							<a
								href="/jobs"
								className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
							>
								{translateNav("jobs")}
							</a>
							<a
								href="/customers"
								className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
							>
								{translateNav("customers")}
							</a>
							<Link
								href="/invoices"
								className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
							>
								{translateNav("invoices")}
							</Link>
						</nav>
					</div>

					{/* Auth Components & Language Switcher */}
					<div className="flex items-center space-x-4">
						<LanguageSwitcher />
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
