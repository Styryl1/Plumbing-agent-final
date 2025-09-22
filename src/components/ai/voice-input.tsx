"use client";

import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { SttResponseSchema } from "~/schema/ai";

interface VoiceInputProps {
	onTranscript: (text: string) => void;
	onRecordingChange?: (isRecording: boolean) => void;
	disabled?: boolean;
}

function pickMimeType(): string {
	const preferred = ["audio/webm;codecs=opus", "audio/webm"];
	for (const type of preferred) {
		if (MediaRecorder.isTypeSupported(type)) {
			return type;
		}
	}
	return "audio/webm";
}

export function VoiceInput({
	onTranscript,
	onRecordingChange,
	disabled = false,
}: VoiceInputProps): JSX.Element {
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const t = useTranslations();
	const [recording, setRecording] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [errorKey, setErrorKey] = useState<
		"permission" | "provider" | "transcription" | "upload" | null
	>(null);

	const cleanupStream = useCallback(() => {
		mediaRecorderRef.current?.stop();
		mediaRecorderRef.current = null;
		streamRef.current?.getTracks().forEach((track) => {
			track.stop();
		});
		streamRef.current = null;
	}, []);

	const stopRecording = useCallback(() => {
		if (mediaRecorderRef.current?.state === "inactive") {
			return;
		}
		mediaRecorderRef.current?.stop();
		setRecording(false);
		onRecordingChange?.(false);
	}, [onRecordingChange]);

	const startRecording = useCallback(async () => {
		if (recording || uploading) {
			return;
		}

		setErrorKey(null);

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			streamRef.current = stream;

			const chunks: Blob[] = [];
			const recorder = new MediaRecorder(stream, { mimeType: pickMimeType() });

			recorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					chunks.push(event.data);
				}
			};

			recorder.onstop = async () => {
				setUploading(true);
				try {
					const blob = new Blob(chunks, { type: recorder.mimeType });
					if (blob.size === 0) {
						return;
					}

					const formData = new FormData();
					const randomId =
						typeof globalThis.crypto !== "undefined" &&
						typeof globalThis.crypto.randomUUID === "function"
							? globalThis.crypto.randomUUID()
							: Math.floor(Math.random() * 1_000_000).toString();
					const fileName = `voice-${randomId}.webm`;
					formData.append("file", blob, fileName);

					const response = await fetch("/api/ai/stt", {
						method: "POST",
						body: formData,
					});

					if (!response.ok) {
						setErrorKey("provider");
						throw new Error(`STT request failed: ${response.status}`);
					}

					const payload: unknown = await response.json();
					const parsed = SttResponseSchema.safeParse(payload);
					if (parsed.success) {
						onTranscript(parsed.data.transcript.trim());
						setErrorKey(null);
					} else {
						setErrorKey("transcription");
					}
				} catch (uploadError) {
					console.error("STT upload failed", uploadError);
					const message =
						typeof (uploadError as Error | undefined)?.message === "string"
							? (uploadError as Error).message
							: "";
					setErrorKey(
						message.includes("STT request failed") ? "provider" : "upload",
					);
				} finally {
					setUploading(false);
					cleanupStream();
				}
			};

			recorder.start();
			mediaRecorderRef.current = recorder;
			setRecording(true);
			onRecordingChange?.(true);
		} catch (requestError) {
			console.error("Failed to start voice recording", requestError);
			setErrorKey("permission");
			cleanupStream();
		}
	}, [cleanupStream, onRecordingChange, onTranscript, recording, uploading]);

	useEffect(() => {
		return cleanupStream;
	}, [cleanupStream]);

	const handlePressStart = useCallback(() => {
		if (!disabled) {
			void startRecording();
		}
	}, [disabled, startRecording]);

	const handlePressEnd = useCallback(() => {
		if (!disabled) {
			stopRecording();
		}
	}, [disabled, stopRecording]);

	const buttonLabel = recording
		? t("ai.voice.button.recording")
		: uploading
			? t("ai.voice.button.processing")
			: t("ai.voice.button.idle");
	const errorMessage = errorKey ? t(`ai.voice.error.${errorKey}`) : null;

	return (
		<div className="space-y-1">
			<Button
				type="button"
				variant={recording ? "destructive" : "outline"}
				disabled={disabled || uploading}
				onMouseDown={(event) => {
					event.preventDefault();
					handlePressStart();
				}}
				onMouseUp={handlePressEnd}
				onMouseLeave={() => {
					if (recording) {
						handlePressEnd();
					}
				}}
				onTouchStart={(event) => {
					event.preventDefault();
					handlePressStart();
				}}
				onTouchEnd={handlePressEnd}
				onKeyDown={(event) => {
					if (event.key === " " || event.key === "Enter") {
						event.preventDefault();
						handlePressStart();
					}
				}}
				onKeyUp={(event) => {
					if (event.key === " " || event.key === "Enter") {
						handlePressEnd();
					}
				}}
				aria-pressed={recording}
				className="w-full"
			>
				{buttonLabel}
			</Button>
			{errorMessage ? (
				<p className="text-sm text-destructive" role="alert">
					{errorMessage}
				</p>
			) : null}
		</div>
	);
}
