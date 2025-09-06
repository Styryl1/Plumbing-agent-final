"use client";

import type { JSX } from "react";
import {
	businessHoursEnd,
	businessHoursStart,
	lunchEnd,
	lunchStart,
} from "~/lib/calendar-temporal";

interface BusinessRailsProps {
	readonly view: "week" | "day" | "month";
	readonly currentDate: Temporal.PlainDate;
}

/**
 * Business Hours Rails Component
 * Renders non-interactive overlay for business hours (08:00-17:00) and lunch (12:00-13:00)
 * Uses CSS grid to align with Schedule-X time ruler
 */
export default function BusinessRails({
	view,
	currentDate,
}: BusinessRailsProps): JSX.Element | null {
	// Only show rails in week and day views
	if (view === "month") {
		return null;
	}

	// Calculate business hours for the current date
	const businessStart = businessHoursStart(currentDate);
	const businessEnd = businessHoursEnd(currentDate);
	const lunchStartTime = lunchStart(currentDate);
	const lunchEndTime = lunchEnd(currentDate);

	// Helper to calculate grid position from time
	// Schedule-X uses 15-minute intervals, starting at 00:00
	const getGridRow = (time: Temporal.ZonedDateTime): number => {
		const hour = time.hour;
		const minute = time.minute;
		// Each hour = 4 rows (15-min intervals), +1 for 1-based grid
		return hour * 4 + minute / 15 + 1;
	};

	const businessStartRow = getGridRow(businessStart);
	const businessEndRow = getGridRow(businessEnd);
	const lunchStartRow = getGridRow(lunchStartTime);
	const lunchEndRow = getGridRow(lunchEndTime);

	return (
		<div
			className="absolute inset-0 pointer-events-none z-0"
			style={{
				// Align with Schedule-X grid system
				display: "grid",
				gridTemplateRows: "repeat(96, 1fr)", // 24 hours × 4 (15-min intervals)
				height: "100%",
				width: "100%",
			}}
		>
			{/* Off-hours before business hours - very subtle */}
			{businessStartRow > 1 && (
				<div
					className="bg-gray-100/5"
					style={{
						gridRow: `1 / ${businessStartRow}`,
						gridColumn: "1 / -1",
						pointerEvents: "none",
						zIndex: 0,
					}}
				/>
			)}

			{/* Off-hours after business hours - very subtle */}
			{businessEndRow < 96 && (
				<div
					className="bg-gray-100/5"
					style={{
						gridRow: `${businessEndRow} / 97`,
						gridColumn: "1 / -1",
						pointerEvents: "none",
						zIndex: 0,
					}}
				/>
			)}

			{/* Lunch break overlay - very subtle */}
			<div
				className="bg-orange-100/8"
				style={{
					gridRow: `${lunchStartRow} / ${lunchEndRow}`,
					gridColumn: "1 / -1",
					pointerEvents: "none",
					zIndex: 0,
				}}
				title="Lunchpauze (12:00 - 13:00)"
			/>

			{/* Business hours indicator - very subtle */}
			<div
				className="border-l border-green-300/20"
				style={{
					gridRow: `${businessStartRow} / ${businessEndRow}`,
					gridColumn: "1 / 2",
					pointerEvents: "none",
					zIndex: 0,
				}}
				title="Werktijden (08:00 - 17:00)"
			/>
		</div>
	);
}
