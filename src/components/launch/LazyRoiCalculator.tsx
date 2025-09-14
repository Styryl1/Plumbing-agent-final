"use client";
import dynamic from "next/dynamic";
import React from "react";

// Lazy load the ROI Calculator since it's not immediately visible
const RoiCalculator = dynamic(
	async () =>
		import("./RoiCalculator").then((mod) => ({ default: mod.RoiCalculator })),
	{
		loading: () => (
			<section className="py-16 bg-gradient-to-r from-emerald-50 to-teal-50">
				<div className="mx-auto max-w-4xl px-6 lg:px-8">
					<div className="text-center mb-12">
						<div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
							<div className="h-8 w-8 bg-emerald-200 rounded"></div>
						</div>
						<div className="h-8 bg-gray-200 rounded max-w-md mx-auto mb-4 animate-pulse"></div>
						<div className="h-4 bg-gray-200 rounded max-w-lg mx-auto animate-pulse"></div>
					</div>
					<div className="grid md:grid-cols-2 gap-8">
						<div className="bg-white rounded-lg shadow-lg p-6 animate-pulse">
							<div className="h-6 bg-gray-200 rounded mb-4"></div>
							<div className="h-12 bg-gray-200 rounded mb-6"></div>
							<div className="h-12 bg-gray-200 rounded"></div>
						</div>
						<div className="bg-white rounded-lg shadow-lg p-6 animate-pulse">
							<div className="h-6 bg-gray-200 rounded mb-4"></div>
							<div className="space-y-4">
								<div className="h-16 bg-gray-100 rounded"></div>
								<div className="h-16 bg-gray-100 rounded"></div>
								<div className="h-20 bg-gray-100 rounded"></div>
							</div>
						</div>
					</div>
				</div>
			</section>
		),
		ssr: false, // Client-side only for better performance
	},
);

export function LazyRoiCalculator(): React.ReactElement {
	return <RoiCalculator />;
}
