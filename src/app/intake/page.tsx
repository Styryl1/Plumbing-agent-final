import type { JSX } from "react";
import { OperatorConsole } from "~/components/intake/OperatorConsole";

export default function IntakeConsolePage(): JSX.Element {
	return (
		<div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
			<OperatorConsole />
		</div>
	);
}
