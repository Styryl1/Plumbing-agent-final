"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import React, { useState } from "react";
import { cn } from "~/lib/utils";

interface OptimizedImageProps {
	src: string;
	alt: string;
	width?: number;
	height?: number;
	className?: string;
	placeholder?: "blur" | "empty";
	priority?: boolean;
	sizes?: string;
	fill?: boolean;
}

export function OptimizedImage({
	src,
	alt,
	width = 400,
	height = 300,
	className,
	placeholder = "empty",
	priority = false,
	sizes,
	fill = false,
}: OptimizedImageProps): React.ReactElement {
	const [isLoading, setIsLoading] = useState(true);
	const [hasError, setHasError] = useState(false);

	const handleLoad = (): void => {
		setIsLoading(false);
	};

	const handleError = (): void => {
		setIsLoading(false);
		setHasError(true);
	};

	if (hasError) {
		return (
			<div
				className={cn(
					"flex items-center justify-center bg-gray-100 text-gray-400 text-sm border border-gray-200 rounded-lg",
					fill ? "absolute inset-0" : "",
					className,
				)}
				style={fill ? {} : { width, height }}
			>
				<div className="text-center p-4">
					<div className="text-2xl mb-2">🖼️</div>
					<div>Afbeelding kon niet worden geladen</div>
				</div>
			</div>
		);
	}

	return (
		<div className={cn("relative overflow-hidden rounded-lg", className)}>
			{isLoading && (
				<div
					className={cn(
						"absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center",
						fill ? "" : "absolute",
					)}
					style={fill ? {} : { width, height }}
				>
					<div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
				</div>
			)}

			<Image
				src={src}
				alt={alt}
				{...(fill ? { fill: true } : { width, height })}
				sizes={sizes}
				priority={priority}
				placeholder={placeholder}
				quality={85} // Optimized for web
				onLoad={handleLoad}
				onError={handleError}
				className={cn(
					"transition-opacity duration-300",
					isLoading ? "opacity-0" : "opacity-100",
					fill ? "object-cover" : "",
				)}
			/>
		</div>
	);
}
