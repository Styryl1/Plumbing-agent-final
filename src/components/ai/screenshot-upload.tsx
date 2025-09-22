"use client";

import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useCallback, useRef, useState } from "react";
import type * as Tesseract from "tesseract.js";
import { cn } from "~/lib/utils";

function hasText(result: unknown): result is { text: string } {
	return (
		typeof result === "object" &&
		result !== null &&
		"text" in result &&
		typeof (result as { text?: unknown }).text === "string"
	);
}

interface ScreenshotUploadProps {
	onExtract: (text: string) => void;
	disabled?: boolean;
}

type WorkerModule = typeof Tesseract;

type WorkerWithOcr = Awaited<ReturnType<WorkerModule["createWorker"]>> & {
	loadLanguage?: (lang: string) => Promise<void>;
	initialize?: (lang: string) => Promise<void>;
	recognize: (
		image: File | string | ArrayBufferLike,
	) => Promise<{ data: { text?: string } }>;
	terminate: () => Promise<void>;
};

export function ScreenshotUpload({
	onExtract,
	disabled = false,
}: ScreenshotUploadProps): JSX.Element {
	const t = useTranslations();
	const [busy, setBusy] = useState(false);
	const [errorKey, setErrorKey] = useState<"noImages" | "ocrFailed" | null>(
		null,
	);
	const [progress, setProgress] = useState<number>(0);
	const inputRef = useRef<HTMLInputElement | null>(null);

	const processFiles = useCallback(
		async (fileList: FileList) => {
			const files = Array.from(fileList).filter((file) =>
				file.type.startsWith("image"),
			);
			if (files.length === 0) {
				setErrorKey("noImages");
				return;
			}

			setBusy(true);
			setErrorKey(null);
			setProgress(0);

			let worker: WorkerWithOcr | null = null;

			try {
				const tesseract = (await import("tesseract.js")) as WorkerModule;
				worker = (await tesseract.createWorker("nld+eng", undefined, {
					logger: (message) => {
						if (typeof message.progress === "number") {
							setProgress(Math.round(message.progress * 100));
						}
					},
				})) as WorkerWithOcr;
				if (worker.loadLanguage) {
					await worker.loadLanguage("nld+eng");
				}
				if (worker.initialize) {
					await worker.initialize("nld+eng");
				}

				for (const file of files) {
					const { data } = await worker.recognize(file);
					const textSource = hasText(data) ? data.text : "";
					const text = textSource.trim();
					if (text.length > 0) {
						onExtract(text);
					}
				}
			} catch (ocrError) {
				console.error("OCR failed", ocrError);
				setErrorKey("ocrFailed");
			} finally {
				if (worker) {
					await worker.terminate();
				}
				setBusy(false);
				setProgress(0);
				if (inputRef.current) {
					inputRef.current.value = "";
				}
			}
		},
		[onExtract],
	);

	const handleFiles = useCallback(
		(files: FileList | null) => {
			if (!files || disabled) {
				return;
			}

			void processFiles(files);
		},
		[disabled, processFiles],
	);

	return (
		<div className="space-y-1">
			<div
				className={cn(
					"flex h-28 w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/60 bg-muted/20 text-center transition-colors",
					disabled ? "opacity-60" : "hover:border-primary",
				)}
				onDragOver={(event) => {
					event.preventDefault();
				}}
				onDrop={(event) => {
					event.preventDefault();
					if (disabled) {
						return;
					}
					const droppedFiles = event.dataTransfer.files;
					if (droppedFiles.length > 0) {
						handleFiles(droppedFiles);
					}
				}}
				onClick={() => {
					if (!disabled) {
						const inputElement = inputRef.current;
						if (inputElement) {
							inputElement.click();
						}
					}
				}}
				onKeyDown={(event) => {
					if (disabled) {
						return;
					}
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						const inputElement = inputRef.current;
						if (inputElement) {
							inputElement.click();
						}
					}
				}}
				role="button"
				tabIndex={disabled ? -1 : 0}
				aria-busy={busy}
			>
				<input
					ref={inputRef}
					type="file"
					accept="image/*"
					multiple
					className="hidden"
					onChange={(event) => {
						handleFiles(event.target.files);
					}}
				/>
				<div className="space-y-1">
					<p className="text-sm font-medium">
						{busy
							? t("ai.ocr.dropzone.processingTitle")
							: t("ai.ocr.dropzone.idleTitle")}
					</p>
					<p className="text-xs text-muted-foreground">
						{busy
							? t("ai.ocr.dropzone.processingHint", { progress })
							: t("ai.ocr.dropzone.idleHint")}
					</p>
				</div>
			</div>
			{errorKey ? (
				<p className="text-sm text-destructive" role="alert">
					{t(`ai.ocr.error.${errorKey}`)}
				</p>
			) : null}
		</div>
	);
}
