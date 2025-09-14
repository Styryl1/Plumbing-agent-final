"use client";
import type { JSX } from "react";
import { useEffect } from "react";
import { cn } from "~/lib/utils";

interface Employee {
	id: string;
	name: string;
	color?: string | null;
}

interface EmployeeChipsProps {
	readonly employees: Employee[];
	readonly selectedEmployeeIds: string[];
	readonly onSelectionChange: (selectedIds: string[]) => void;
}

const STORAGE_KEY = "pa:empFilter:v1";

/**
 * Generate deterministic color from employee ID/name if no color set
 */
function getEmployeeColor(employee: Employee): string {
	if (employee.color) return employee.color;

	// Generate HSL color deterministically from name
	const hash = employee.name.split("").reduce((a, b) => {
		a = (a << 5) - a + b.charCodeAt(0);
		return a & a;
	}, 0);

	const hue = Math.abs(hash) % 360;
	return `hsl(${hue}, 65%, 50%)`;
}

export default function EmployeeChips({
	employees,
	selectedEmployeeIds,
	onSelectionChange,
}: EmployeeChipsProps): JSX.Element {
	// Load from localStorage on mount
	useEffect(() => {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const storedIds = JSON.parse(stored) as string[];
				// Only use stored IDs that still exist in current employees
				const validIds = storedIds.filter((id) =>
					employees.some((emp) => emp.id === id),
				);
				if (validIds.length > 0) {
					onSelectionChange(validIds);
				}
			}
		} catch (error) {
			console.warn("Failed to load employee filter from localStorage:", error);
		}
	}, [employees, onSelectionChange]);

	// Save to localStorage when selection changes
	useEffect(() => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedEmployeeIds));
		} catch (error) {
			console.warn("Failed to save employee filter to localStorage:", error);
		}
	}, [selectedEmployeeIds]);

	const handleChipToggle = (employeeId: string): void => {
		const isSelected = selectedEmployeeIds.includes(employeeId);
		if (isSelected) {
			onSelectionChange(selectedEmployeeIds.filter((id) => id !== employeeId));
		} else {
			onSelectionChange([...selectedEmployeeIds, employeeId]);
		}
	};

	const handleSelectAll = (): void => {
		if (selectedEmployeeIds.length === employees.length) {
			// All selected -> clear
			onSelectionChange([]);
		} else {
			// Some/none selected -> select all
			onSelectionChange(employees.map((emp) => emp.id));
		}
	};

	return (
		<div className="flex items-center gap-2 p-3 overflow-x-auto scrollbar-hide">
			{/* Select All / Clear All button */}
			<button
				onClick={handleSelectAll}
				className={cn(
					"flex-shrink-0 h-11 px-3 rounded-full text-sm font-medium",
					"border-2 transition-colors duration-200",
					"focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
					"min-w-[44px] min-h-[44px]", // Minimum 44pt touch target
					selectedEmployeeIds.length === employees.length
						? "bg-gray-900 text-white border-gray-900"
						: "bg-white text-gray-700 border-gray-300 hover:bg-gray-50",
				)}
				data-testid="employee-chip-all"
			>
				{selectedEmployeeIds.length === employees.length
					? "Alles wissen"
					: "Alles"}
			</button>

			{/* Individual employee chips */}
			{employees.map((employee) => {
				const isSelected = selectedEmployeeIds.includes(employee.id);
				const color = getEmployeeColor(employee);

				return (
					<button
						key={employee.id}
						onClick={() => {
							handleChipToggle(employee.id);
						}}
						className={cn(
							"flex-shrink-0 flex items-center gap-2 h-11 px-3 rounded-full",
							"text-sm font-medium border-2 transition-colors duration-200",
							"focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
							"min-w-[44px] min-h-[44px]", // Minimum 44pt touch target
							isSelected
								? "bg-gray-900 text-white border-gray-900"
								: "bg-white text-gray-700 border-gray-300 hover:bg-gray-50",
						)}
						data-testid="employee-chip"
						data-employee-id={employee.id}
					>
						{/* Color dot */}
						<div
							className="w-3 h-3 rounded-full flex-shrink-0"
							style={{ backgroundColor: color }}
						/>
						<span className="truncate">{employee.name}</span>
					</button>
				);
			})}
		</div>
	);
}
