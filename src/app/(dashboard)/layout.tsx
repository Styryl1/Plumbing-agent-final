import type { JSX, ReactNode } from "react";
import PilotModeBanner from "~/components/system/PilotModeBanner";
import { DashboardHeader } from "./DashboardHeader";

export default function DashboardLayout({
	children,
}: {
	children: ReactNode;
}): JSX.Element {
	return (
		<>
			<PilotModeBanner />
			<DashboardHeader />
			<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
				{children}
			</main>
		</>
	);
}
