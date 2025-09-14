import { useTranslations } from "next-intl";
import React from "react";

export default function ENLayout({
	children,
}: {
	children: React.ReactNode;
}): React.ReactElement {
	return <div lang="en">{children}</div>;
}
