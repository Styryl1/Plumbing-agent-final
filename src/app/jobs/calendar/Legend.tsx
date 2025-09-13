"use client";

import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useEmployeeColors } from "./useEmployeeColors";

interface Employee {
	id: string;
	name: string;
	color?: string | null;
}

interface LegendProps {
	readonly employees: Employee[];
}

export default function Legend({ employees }: LegendProps): JSX.Element {
	const t = useTranslations();
	const { getEmployeeColor } = useEmployeeColors(employees);

	if (employees.length === 0) {
		return (
			<div className="text-sm text-muted-foreground">
				{t("jobs.legend.none")}
			</div>
		);
	}

	return (
		<div className="space-y-2">
			<h4 className="text-sm font-medium text-foreground">
				{t("jobs.legend.header")}
			</h4>
			<div className="flex flex-wrap gap-3 text-sm">
				{employees.map((employee) => {
					const colorClass = getEmployeeColor(employee.id);
					return (
						<span
							key={employee.id}
							className="inline-flex items-center gap-2 rounded-md px-2 py-1 bg-muted/50"
						>
							<div
								className={`h-3 w-3 rounded-sm ${colorClass}`}
								style={{
									backgroundColor: employee.color ?? undefined,
								}}
							/>
							<span className="text-foreground">{employee.name}</span>
						</span>
					);
				})}
			</div>
		</div>
	);
}
