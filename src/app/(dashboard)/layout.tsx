import type { JSX, ReactNode } from "react";

export default function DashboardLayout({
	children,
}: {
	children: ReactNode;
}): JSX.Element {
	// Dashboard-specific layout is now just a passthrough
	// The header and main layout are handled by the root layout
	return <>{children}</>;
}
