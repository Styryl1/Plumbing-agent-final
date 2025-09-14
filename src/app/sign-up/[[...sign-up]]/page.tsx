"use client";

import { SignUp } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useT } from "~/i18n/client";

export default function SignUpPage(): JSX.Element {
	const tMisc = useT("misc");
	const tAuth = useT("auth");
	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50">
			<div className="w-full max-w-md">
				<div className="text-center mb-8">
					<h1 className="text-2xl font-bold text-gray-900">
						{tMisc("app.title")}
					</h1>
					<p className="text-gray-600 mt-2">{tAuth("signUpSubtitle")}</p>
				</div>
				<SignUp
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
