"use client";

import { CalculatorIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import React, { useState } from "react";
import { analytics } from "~/components/analytics/Analytics";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

interface ROIResults {
	timeSaved: number;
	extraRevenue: number;
	yearlyValue: number;
	adminReduced: number;
}

function calculateROI(currentAdminHours: number): ROIResults {
	const hourlyRate = 75; // €75/hour
	const weeksPerMonth = 4.33;
	const monthsPerYear = 12;

	// Platform reduces admin time by 70% (from analysis: 40h -> 10h = 75% reduction)
	const reductionPercentage = 0.7;
	const adminReduced = Math.max(
		1,
		currentAdminHours * (1 - reductionPercentage),
	);
	const timeSaved = currentAdminHours - adminReduced;

	// Convert time savings to revenue
	const extraRevenue = timeSaved * hourlyRate * weeksPerMonth;
	const yearlyValue = extraRevenue * monthsPerYear;

	return {
		timeSaved,
		extraRevenue,
		yearlyValue,
		adminReduced,
	};
}

export function RoiCalculator(): React.ReactElement {
	const t = useTranslations();
	const [adminHours, setAdminHours] = useState<number>(20);
	const [showResults, setShowResults] = useState<boolean>(false);
	const [results, setResults] = useState<ROIResults | null>(null);

	const handleCalculate = (): void => {
		if (adminHours > 0) {
			const calculatedResults = calculateROI(adminHours);
			setResults(calculatedResults);
			setShowResults(true);

			// Track ROI calculation
			analytics.trackROICalculation(
				adminHours,
				calculatedResults.timeSaved,
				calculatedResults.yearlyValue,
			);

			// Track high-value calculations (potential leads)
			if (calculatedResults.yearlyValue > 15000) {
				analytics.trackConversion(
					"high_value_roi",
					calculatedResults.yearlyValue,
				);
			}
		}
	};

	const formatCurrency = (amount: number): string => {
		return new Intl.NumberFormat("nl-NL", {
			style: "currency",
			currency: "EUR",
			maximumFractionDigits: 0,
		}).format(amount);
	};

	return (
		<section className="py-16 bg-gradient-to-r from-emerald-50 to-teal-50">
			<div className="mx-auto max-w-4xl px-6 lg:px-8">
				<div className="text-center mb-12">
					<div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
						<CalculatorIcon className="h-8 w-8 text-emerald-600" />
					</div>
					<h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
						{t("launch.roi_calculator.title")}
					</h2>
					<p className="mt-4 text-lg text-gray-600">
						{t("launch.roi_calculator.subtitle")}
					</p>
				</div>

				<div className="grid md:grid-cols-2 gap-8 items-start">
					{/* Input Card */}
					<Card className="shadow-lg">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<CalculatorIcon className="h-5 w-5" />
								{t("launch.roi_calculator.input_label")}
							</CardTitle>
							<CardDescription>
								{t("launch.roi_calculator.rate_per_hour")}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							<div>
								<Label htmlFor="admin-hours" className="text-base font-medium">
									{t("launch.roi_calculator.input_label")}
								</Label>
								<Input
									id="admin-hours"
									type="number"
									min="1"
									max="60"
									value={adminHours}
									onChange={(e) => {
										setAdminHours(Number(e.target.value));
									}}
									className="mt-2 text-lg h-12"
									placeholder="20"
								/>
							</div>

							<Button
								onClick={() => {
									handleCalculate();
								}}
								size="lg"
								className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-lg hover:shadow-xl transition-all duration-200"
								disabled={adminHours <= 0}
							>
								<CalculatorIcon className="mr-2 h-4 w-4" />
								{t("launch.roi_calculator.calculate_button")}
							</Button>
						</CardContent>
					</Card>

					{/* Results Card */}
					<Card
						className={`shadow-lg transition-all duration-500 ${showResults ? "scale-100 opacity-100" : "scale-95 opacity-50"}`}
					>
						<CardHeader>
							<CardTitle className="text-emerald-700">
								{showResults && results
									? `${results.adminReduced.toFixed(1)} ${t("launch.roi_calculator.hours_per_week")}`
									: t("launch.current_hours")}
							</CardTitle>
						</CardHeader>
						<CardContent>
							{showResults && results ? (
								<div className="space-y-4">
									{/* Time Savings */}
									<div className="bg-emerald-50 p-4 rounded-lg">
										<div className="text-sm font-medium text-emerald-700 mb-1">
											{t("launch.roi_calculator.time_saved")}
										</div>
										<div className="text-2xl font-bold text-emerald-900">
											{results.timeSaved.toFixed(1)}{" "}
											{t("launch.roi_calculator.hours_per_week")}
										</div>
									</div>

									{/* Monthly Revenue */}
									<div className="bg-blue-50 p-4 rounded-lg">
										<div className="text-sm font-medium text-blue-700 mb-1">
											{t("launch.roi_calculator.extra_revenue")}
										</div>
										<div className="text-2xl font-bold text-blue-900">
											{formatCurrency(results.extraRevenue)}
										</div>
									</div>

									{/* Yearly Value */}
									<div className="bg-purple-50 p-4 rounded-lg">
										<div className="text-sm font-medium text-purple-700 mb-1">
											{t("launch.roi_calculator.yearly_savings")}
										</div>
										<div className="text-3xl font-bold text-purple-900">
											{formatCurrency(results.yearlyValue)}
										</div>
									</div>

									{/* Call to action */}
									<div className="pt-4 text-center">
										<p className="text-sm text-gray-600 mb-3">
											{t("launch.roi_calculator.results.total_value", {
												amount: formatCurrency(results.yearlyValue).replace(
													"€",
													"",
												),
											})}
										</p>
										<Button
											asChild
											variant="outline"
											className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
										>
											<a href="#waitlist">
												{t("launch.roi_calculator.cta_start_saving")}
											</a>
										</Button>
									</div>
								</div>
							) : (
								<div className="text-center py-8 text-gray-400">
									<CalculatorIcon className="mx-auto h-12 w-12 mb-3" />
									<p>{t("launch.roi_calculator.placeholder_text")}</p>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</section>
	);
}
