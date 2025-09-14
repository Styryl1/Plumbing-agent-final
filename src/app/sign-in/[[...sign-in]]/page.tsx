"use client";

import { SignIn } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import type { JSX } from "react";

export default function SignInPage(): JSX.Element {
	const t = useTranslations();
	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50">
			<div className="w-full max-w-md">
				<div className="text-center mb-8">
					<h1 className="text-2xl font-bold text-gray-900">
						{t("misc.app.title")}
					</h1>
					<p className="text-gray-600 mt-2">{t("auth.signInSubtitle")}</p>
				</div>
				<SignIn
					appearance={{
						elements: {
							rootBox: "mx-auto",
							card: "shadow-lg",
						},
					}}
				/>
			</div>
		</div>
	);
}
