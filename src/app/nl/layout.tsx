import React from "react";

export default function NLLayout({
	children,
}: {
	children: React.ReactNode;
}): React.ReactElement {
	return <div lang="nl">{children}</div>;
}
