'use client';
import { useMemo } from "react";

const EMPLOYEE_COLORS = [
	"bg-emerald-500",
	"bg-sky-500",
	"bg-amber-500",
	"bg-violet-500",
	"bg-rose-500",
	"bg-lime-500",
	"bg-cyan-500",
	"bg-fuchsia-500",
];

interface Employee {
	id: string;
	color?: string | null;
}

export function useEmployeeColors(employees: Employee[]): {
	getEmployeeColor: (employeeId?: string | null) => string;
	colorMap: Map<string, string>;
} {
	return useMemo(() => {
		const colorMap = new Map<string, string>();

		employees.forEach((employee, index) => {
			// Use employee's custom color if set, otherwise use palette color
			const color = employee.color
				? `bg-[${employee.color}]`
				: EMPLOYEE_COLORS[index % EMPLOYEE_COLORS.length]!;
			colorMap.set(employee.id, color);
		});

		const getEmployeeColor = (employeeId?: string | null): string => {
			if (!employeeId) return "bg-muted";
			return colorMap.get(employeeId) ?? "bg-muted";
		};

		return { getEmployeeColor, colorMap };
	}, [employees]);
}
