"use client";

import { MessageSquare, Navigation, Phone, Save, Undo2 } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type SignaturePad from "signature_pad";
import { toast } from "sonner";
import {
	type MaterialInput,
	type MaterialLineVM,
	MaterialsQuickAdd,
	type MaterialTotals,
} from "~/components/job-card/materials-quick-add";
import type { JobCardStatus } from "~/components/job-card/status-buttons";
import { StatusButtons } from "~/components/job-card/status-buttons";
import { JobTimer, type JobTimerState } from "~/components/job-card/timer";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { Textarea } from "~/components/ui/textarea";
import { OfflineSyncProvider, useOfflineSync } from "~/hooks/use-offline-sync";
import { minutesBetween, nowZoned, round5, TZ } from "~/lib/calendar-temporal";
import { api } from "~/lib/trpc/client";
import type { Json } from "~/types/supabase";

const toJson = <T,>(value: T): Json => value as unknown as Json;
const fromJson = <T,>(value: Json): T => value as unknown as T;

interface JobCardView {
	readonly jobId: string;
	readonly token: string;
	readonly title: string;
	readonly description: string | null;
	readonly status: JobCardStatus;
	readonly priority: "normal" | "urgent" | "emergency";
	readonly expiresAtISO: string | null;
	readonly startsAtISO: string | null;
	readonly endsAtISO: string | null;
	readonly address: string | null;
	readonly customer: {
		readonly name: string | null;
		readonly phone: string | null;
		readonly whatsapp: string | null;
	};
	readonly timer: JobTimerState;
	readonly materials: {
		readonly lines: MaterialLineVM[];
		readonly totals: MaterialTotals;
	};
	readonly sync: {
		readonly lastSyncedAtISO: string | null;
		readonly pendingOperations: number;
	};
	readonly notes: string;
	readonly signatureDataUrl: string | null;
}

type TimerAction = "start" | "pause" | "complete";

interface TimerPayload {
	readonly jobId: string;
	readonly action: TimerAction;
}

interface MaterialPayload {
	readonly jobId: string;
	readonly line: MaterialInput;
}

interface StatusPayload {
	readonly jobId: string;
	readonly status: JobCardStatus;
	readonly notifyCustomer: boolean;
}

interface NotesPayload {
	readonly jobId: string;
	readonly notes: string;
}

interface SignaturePayload {
	readonly jobId: string;
	readonly signatureDataUrl: string | null;
}

function computeTimeRange(
	startIso: string | null,
	endIso: string | null,
	fallback: string,
): string {
	if (!startIso || !endIso) {
		return fallback;
	}
	try {
		const start = Temporal.Instant.from(startIso).toZonedDateTimeISO(TZ);
		const end = Temporal.Instant.from(endIso).toZonedDateTimeISO(TZ);
		return `${start.toLocaleString("nl-NL", { hour: "2-digit", minute: "2-digit" })}–${end.toLocaleString("nl-NL", { hour: "2-digit", minute: "2-digit" })}`;
	} catch {
		return fallback;
	}
}

function applyTimerOptimistic(
	view: JobCardView,
	action: TimerAction,
): JobCardView {
	const now = Temporal.Now.instant();
	if (action === "start") {
		return {
			...view,
			timer: {
				...view.timer,
				running: true,
				startedAtISO: now.toString(),
				locked: false,
				displayedMinutes: round5(view.timer.actualMinutes),
			},
		};
	}

	if (action === "pause") {
		if (!view.timer.startedAtISO) {
			return view;
		}
		const started = Temporal.Instant.from(
			view.timer.startedAtISO,
		).toZonedDateTimeISO(TZ);
		const elapsedMinutes = minutesBetween(started, nowZoned());
		const totalMinutes = Math.round(view.timer.actualMinutes + elapsedMinutes);
		return {
			...view,
			timer: {
				...view.timer,
				running: false,
				startedAtISO: null,
				actualMinutes: totalMinutes,
				displayedMinutes: round5(totalMinutes),
			},
		};
	}

	const paused = applyTimerOptimistic(view, "pause");
	return {
		...paused,
		status: "completed",
		timer: {
			...paused.timer,
			locked: true,
			running: false,
		},
	};
}

function applyMaterialOptimistic(
	view: JobCardView,
	input: MaterialInput,
): JobCardView {
	const ex = Math.round(input.unitPriceCents * input.qty);
	const vat = Math.round((ex * input.vatRate) / 100);
	const line: MaterialLineVM = {
		id: crypto.randomUUID(),
		name: input.name,
		qty: input.qty,
		unit: input.unit,
		unitPriceCents: input.unitPriceCents,
		vatRate: input.vatRate,
		createdAtISO: Temporal.Now.instant().toString(),
	};

	return {
		...view,
		materials: {
			lines: [...view.materials.lines, line],
			totals: {
				subtotalCents: view.materials.totals.subtotalCents + ex,
				vatCents: view.materials.totals.vatCents + vat,
				totalCents: view.materials.totals.totalCents + ex + vat,
			},
		},
	};
}

function applyStatusOptimistic(
	view: JobCardView,
	nextStatus: JobCardStatus,
): JobCardView {
	return {
		...view,
		status: nextStatus,
		timer:
			nextStatus === "completed"
				? { ...view.timer, locked: true, running: false }
				: view.timer,
	};
}

function applyNotesOptimistic(view: JobCardView, notes: string): JobCardView {
	return {
		...view,
		notes,
	};
}

function applySignatureOptimistic(
	view: JobCardView,
	signatureDataUrl: string | null,
): JobCardView {
	return {
		...view,
		signatureDataUrl,
	};
}

function buildWhatsappLink(phone: string | null): string {
	if (!phone) {
		return "#";
	}
	const normalized = phone.replace(/[^\d+]/g, "");
	return `https://wa.me/${normalized}`;
}

function buildTelLink(phone: string | null): string {
	if (!phone) {
		return "#";
	}
	return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function buildMapsLink(address: string | null): string {
	if (!address) {
		return "#";
	}
	return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function JobCardInner({
	initialJob,
}: {
	readonly initialJob: JobCardView;
}): JSX.Element {
	const t = useTranslations();
	const [job, setJob] = useState<JobCardView>(initialJob);
	const [isOffline, setIsOffline] = useState(
		typeof navigator !== "undefined" ? !navigator.onLine : false,
	);
	const previousRef = useRef<JobCardView>(initialJob);
	const [notesDraft, setNotesDraft] = useState(initialJob.notes);
	const notesTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [notesSaving, setNotesSaving] = useState(false);
	const [notesQueued, setNotesQueued] = useState(false);
	const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
	const signaturePadRef = useRef<SignaturePad | null>(null);
	const [signatureSaving, setSignatureSaving] = useState(false);
	const [signatureQueued, setSignatureQueued] = useState(false);
	const [signatureDirty, setSignatureDirty] = useState(false);
	const [signatureReady, setSignatureReady] = useState(false);

	const timerMutation = api.jobCard.updateTimer.useMutation({
		onSuccess: (next) => {
			previousRef.current = next;
			setJob(next);
		},
	});
	const materialMutation = api.jobCard.addMaterial.useMutation({
		onSuccess: (next) => {
			previousRef.current = next;
			setJob(next);
		},
	});
	const statusMutation = api.jobCard.updateStatus.useMutation({
		onSuccess: (next) => {
			previousRef.current = next;
			setJob(next);
		},
	});
	const notesMutation = api.jobCard.updateNotes.useMutation({
		onSuccess: (next) => {
			previousRef.current = next;
			setJob(next);
			setNotesSaving(false);
			setNotesQueued(false);
			setNotesDraft(next.notes);
		},
		onError: () => {
			setNotesSaving(false);
		},
	});
	const signatureMutation = api.jobCard.saveSignature.useMutation({
		onSuccess: (next) => {
			previousRef.current = next;
			setJob(next);
			setSignatureSaving(false);
			setSignatureQueued(false);
			setSignatureDirty(false);
		},
		onError: () => {
			setSignatureSaving(false);
		},
	});

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		const updateState = (): void => {
			setIsOffline(!navigator.onLine);
		};
		window.addEventListener("online", updateState);
		window.addEventListener("offline", updateState);
		return () => {
			window.removeEventListener("online", updateState);
			window.removeEventListener("offline", updateState);
		};
	}, []);

	useEffect(() => {
		setNotesDraft(job.notes);
	}, [job.notes]);

	useEffect(
		() => () => {
			if (notesTimeoutRef.current) {
				clearTimeout(notesTimeoutRef.current);
			}
		},
		[],
	);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		let cancelled = false;
		let pad: SignaturePad | null = null;
		let removeListeners: (() => void) | undefined;

		const configureCanvas = (canvas: HTMLCanvasElement): void => {
			const deviceRatio = window.devicePixelRatio;
			const ratio =
				Number.isFinite(deviceRatio) && deviceRatio > 0 ? deviceRatio : 1;
			const rect = canvas.getBoundingClientRect();
			const width = rect.width;
			const normalizedWidth = Number.isFinite(width) && width > 0 ? width : 320;
			const height = rect.height;
			const normalizedHeight =
				Number.isFinite(height) && height > 0 ? height : 180;
			canvas.width = normalizedWidth * ratio;
			canvas.height = normalizedHeight * ratio;
			const context = canvas.getContext("2d");
			if (context) {
				context.scale(ratio, ratio);
			}
		};

		const setup = async (): Promise<void> => {
			const canvas = signatureCanvasRef.current;
			if (!canvas) {
				return;
			}
			const { default: SignaturePadCtor } = await import("signature_pad");
			if (cancelled || !signatureCanvasRef.current) {
				return;
			}

			configureCanvas(canvas);
			pad = new SignaturePadCtor(canvas, {
				minWidth: 0.6,
				maxWidth: 2.4,
				penColor: "#0f172a",
				backgroundColor: "rgba(255,255,255,0)",
			});
			signaturePadRef.current = pad;
			setSignatureReady(true);
			if (initialJob.signatureDataUrl) {
				try {
					void pad.fromDataURL(initialJob.signatureDataUrl);
					setSignatureDirty(false);
				} catch (error) {
					console.error("[job-card] failed to load initial signature", error);
				}
			}

			const handleBegin = (): void => {
				setSignatureDirty(true);
			};
			const handleEnd = (): void => {
				setSignatureDirty(!(pad?.isEmpty() ?? true));
			};

			const handleResize = (): void => {
				if (!pad || !signatureCanvasRef.current) {
					return;
				}
				const existing = pad.isEmpty() ? null : pad.toDataURL("image/png");
				configureCanvas(signatureCanvasRef.current);
				if (existing) {
					try {
						void pad.fromDataURL(existing);
					} catch (error) {
						console.error(
							"[job-card] failed to restore signature after resize",
							error,
						);
					}
				}
			};

			pad.addEventListener("beginStroke", handleBegin);
			pad.addEventListener("endStroke", handleEnd);
			window.addEventListener("resize", handleResize);

			removeListeners = () => {
				window.removeEventListener("resize", handleResize);
				pad?.removeEventListener("beginStroke", handleBegin);
				pad?.removeEventListener("endStroke", handleEnd);
			};
		};

		void setup();

		return () => {
			cancelled = true;
			removeListeners?.();
			signaturePadRef.current = null;
			setSignatureReady(false);
		};
	}, [initialJob.signatureDataUrl]);

	useEffect(() => {
		if (!signatureReady) {
			return;
		}
		const pad = signaturePadRef.current;
		if (!pad) {
			return;
		}
		if (!job.signatureDataUrl) {
			pad.clear();
			setSignatureDirty(false);
			return;
		}
		try {
			void pad.fromDataURL(job.signatureDataUrl);
			setSignatureDirty(false);
		} catch (error) {
			console.error("[job-card] failed to load signature", error);
		}
	}, [job.signatureDataUrl, signatureReady]);

	const { enqueue, registerHandler, pendingCount } = useOfflineSync();

	const persistNotes = useCallback(
		async (value: string) => {
			const trimmed = value.trimEnd();
			setNotesSaving(true);
			setNotesQueued(false);
			setJob((prev) => {
				previousRef.current = prev;
				return applyNotesOptimistic(prev, trimmed);
			});

			if (isOffline) {
				setNotesQueued(true);
				enqueue({
					id: `notes:${job.jobId}`,
					kind: "job.notes.update",
					payload: toJson<NotesPayload>({ jobId: job.jobId, notes: trimmed }),
				});
				setNotesSaving(false);
				toast.info(t("jobCard.client.toast.notesQueued"));
				return;
			}

			try {
				await notesMutation.mutateAsync({ jobId: job.jobId, notes: trimmed });
				setNotesSaving(false);
				toast.success(t("jobCard.client.toast.notesSuccess"));
			} catch (error) {
				console.error(error);
				setNotesSaving(false);
				setNotesQueued(false);
				setJob(previousRef.current);
				setNotesDraft(previousRef.current.notes);
				toast.error(t("jobCard.client.toast.notesError"));
			}
		},
		[enqueue, isOffline, job.jobId, notesMutation, t],
	);

	const handleNotesChange = useCallback(
		(value: string) => {
			setNotesDraft(value);
			if (value === job.notes) {
				if (notesTimeoutRef.current) {
					clearTimeout(notesTimeoutRef.current);
					notesTimeoutRef.current = null;
				}
				setNotesSaving(false);
				setNotesQueued(false);
				return;
			}
			if (notesTimeoutRef.current) {
				clearTimeout(notesTimeoutRef.current);
			}
			notesTimeoutRef.current = setTimeout(() => {
				void persistNotes(value);
			}, 900);
		},
		[job.notes, persistNotes],
	);

	const saveSignature = useCallback(
		async (dataUrl: string | null, { viaClear = false } = {}) => {
			setSignatureSaving(true);
			setSignatureQueued(false);
			setJob((prev) => {
				previousRef.current = prev;
				return applySignatureOptimistic(prev, dataUrl);
			});

			if (isOffline) {
				setSignatureQueued(true);
				enqueue({
					id: `signature:${job.jobId}`,
					kind: "job.signature.save",
					payload: toJson<SignaturePayload>({
						jobId: job.jobId,
						signatureDataUrl: dataUrl,
					}),
				});
				setSignatureSaving(false);
				setSignatureDirty(false);
				toast.info(
					viaClear
						? t("jobCard.client.toast.signatureClearedQueued")
						: t("jobCard.client.toast.signatureQueued"),
				);
				return;
			}

			try {
				await signatureMutation.mutateAsync({
					jobId: job.jobId,
					signatureDataUrl: dataUrl,
				});
				setSignatureSaving(false);
				setSignatureDirty(false);
				toast.success(
					viaClear
						? t("jobCard.client.toast.signatureCleared")
						: t("jobCard.client.toast.signatureSuccess"),
				);
			} catch (error) {
				console.error(error);
				setSignatureSaving(false);
				setSignatureQueued(false);
				setSignatureDirty(false);
				setJob(previousRef.current);
				if (signaturePadRef.current) {
					if (previousRef.current.signatureDataUrl) {
						try {
							void signaturePadRef.current.fromDataURL(
								previousRef.current.signatureDataUrl,
							);
						} catch (err) {
							console.error("[job-card] failed to restore signature", err);
						}
					} else {
						signaturePadRef.current.clear();
					}
				}
				toast.error(t("jobCard.client.toast.signatureError"));
			}
		},
		[enqueue, isOffline, job.jobId, signatureMutation, t],
	);

	const handleSignatureSubmit = useCallback(async () => {
		const pad = signaturePadRef.current;
		if (!pad) {
			toast.error(t("jobCard.client.toast.signatureUnavailable"));
			return;
		}
		if (pad.isEmpty()) {
			toast.warning(t("jobCard.client.toast.signatureEmpty"));
			return;
		}
		const dataUrl = pad.toDataURL("image/png");
		await saveSignature(dataUrl);
	}, [saveSignature, t]);

	const handleSignatureClear = useCallback(async () => {
		if (signaturePadRef.current) {
			signaturePadRef.current.clear();
		}
		await saveSignature(null, { viaClear: true });
	}, [saveSignature]);

	const registerHandlers = useCallback((): (() => void) => {
		const unregisterStart = registerHandler(
			"job.timer.start",
			async (payload) => {
				const parsed = fromJson<TimerPayload>(payload);
				const next = await timerMutation.mutateAsync(parsed);
				previousRef.current = next;
				setJob(next);
			},
		);
		const unregisterPause = registerHandler(
			"job.timer.pause",
			async (payload) => {
				const parsed = fromJson<TimerPayload>(payload);
				const next = await timerMutation.mutateAsync(parsed);
				previousRef.current = next;
				setJob(next);
			},
		);
		const unregisterComplete = registerHandler(
			"job.timer.complete",
			async (payload) => {
				const parsed = fromJson<TimerPayload>(payload);
				const next = await timerMutation.mutateAsync(parsed);
				previousRef.current = next;
				setJob(next);
			},
		);
		const unregisterMaterial = registerHandler(
			"job.material.add",
			async (payload) => {
				const parsed = fromJson<MaterialPayload>(payload);
				const next = await materialMutation.mutateAsync(parsed);
				previousRef.current = next;
				setJob(next);
			},
		);
		const unregisterStatus = registerHandler(
			"job.status.update",
			async (payload) => {
				const parsed = fromJson<StatusPayload>(payload);
				const next = await statusMutation.mutateAsync(parsed);
				previousRef.current = next;
				setJob(next);
			},
		);
		const unregisterNotes = registerHandler(
			"job.notes.update",
			async (payload) => {
				const parsed = fromJson<NotesPayload>(payload);
				await notesMutation.mutateAsync(parsed);
			},
		);
		const unregisterSignature = registerHandler(
			"job.signature.save",
			async (payload) => {
				const parsed = fromJson<SignaturePayload>(payload);
				await signatureMutation.mutateAsync(parsed);
			},
		);
		return () => {
			unregisterStart();
			unregisterPause();
			unregisterComplete();
			unregisterMaterial();
			unregisterStatus();
			unregisterNotes();
			unregisterSignature();
		};
	}, [
		materialMutation,
		notesMutation,
		registerHandler,
		signatureMutation,
		statusMutation,
		timerMutation,
	]);

	useEffect(() => {
		return registerHandlers();
	}, [registerHandlers]);

	const handleTimerAction = useCallback(
		async (action: TimerAction) => {
			const payload: TimerPayload = { jobId: job.jobId, action };
			setJob((prev) => {
				previousRef.current = prev;
				return applyTimerOptimistic(prev, action);
			});

			if (isOffline) {
				const stamp = String(Temporal.Now.instant().epochMilliseconds);
				enqueue({
					id: `timer:${payload.jobId}:${action}:${stamp}`,
					kind: `job.timer.${action}`,
					payload: toJson(payload),
				});
				toast.info(t("jobCard.client.toast.timerQueued"));
				return;
			}

			try {
				const next = await timerMutation.mutateAsync(payload);
				previousRef.current = next;
				setJob(next);
				toast.success(t("jobCard.client.toast.timerSuccess"));
			} catch (error) {
				console.error(error);
				setJob(previousRef.current);
				toast.error(t("jobCard.client.toast.timerError"));
			}
		},
		[enqueue, isOffline, job.jobId, t, timerMutation],
	);

	const handleAddMaterial = useCallback(
		async (line: MaterialInput) => {
			setJob((prev) => {
				previousRef.current = prev;
				return applyMaterialOptimistic(prev, line);
			});

			const payload: MaterialPayload = { jobId: job.jobId, line };

			if (isOffline) {
				const stamp = String(Temporal.Now.instant().epochMilliseconds);
				enqueue({
					id: `material:${payload.jobId}:${stamp}`,
					kind: "job.material.add",
					payload: toJson(payload),
				});
				toast.info(t("jobCard.client.toast.materialQueued"));
				return;
			}

			try {
				const next = await materialMutation.mutateAsync(payload);
				previousRef.current = next;
				setJob(next);
				toast.success(t("jobCard.client.toast.materialSuccess"));
			} catch (error) {
				console.error(error);
				setJob(previousRef.current);
				toast.error(t("jobCard.client.toast.materialError"));
				throw error;
			}
		},
		[enqueue, isOffline, job.jobId, materialMutation, t],
	);

	const handleStatusUpdate = useCallback(
		async (nextStatus: JobCardStatus, notify: boolean) => {
			if (nextStatus === "completed" && !job.timer.locked) {
				toast.warning(t("jobCard.client.toast.statusNeedsTimer"));
				return;
			}

			setJob((prev) => {
				previousRef.current = prev;
				return applyStatusOptimistic(prev, nextStatus);
			});

			const payload: StatusPayload = {
				jobId: job.jobId,
				status: nextStatus,
				notifyCustomer: notify,
			};

			if (isOffline) {
				const stamp = String(Temporal.Now.instant().epochMilliseconds);
				enqueue({
					id: `status:${payload.jobId}:${nextStatus}:${stamp}`,
					kind: "job.status.update",
					payload: toJson(payload),
				});
				toast.info(t("jobCard.client.toast.statusQueued"));
				return;
			}

			try {
				const next = await statusMutation.mutateAsync(payload);
				previousRef.current = next;
				setJob(next);
				toast.success(t("jobCard.client.toast.statusSuccess"));
			} catch (error) {
				console.error(error);
				setJob(previousRef.current);
				toast.error(t("jobCard.client.toast.statusError"));
			}
		},
		[enqueue, isOffline, job.jobId, job.timer.locked, statusMutation, t],
	);

	const pendingBadge =
		pendingCount > 0 ? (
			<Badge variant="outline" className="bg-amber-50 text-amber-700">
				{t("jobCard.client.syncChip", { count: pendingCount })}
			</Badge>
		) : null;

	const priorityBadge = useMemo(() => {
		switch (job.priority) {
			case "emergency":
				return (
					<Badge variant="destructive">
						{t("jobCard.client.priority.emergency")}
					</Badge>
				);
			case "urgent":
				return (
					<Badge variant="default">{t("jobCard.client.priority.urgent")}</Badge>
				);
			default:
				return (
					<Badge variant="secondary">
						{t("jobCard.client.priority.normal")}
					</Badge>
				);
		}
	}, [job.priority, t]);

	return (
		<div className="min-h-screen bg-slate-50 p-4">
			<div className="mx-auto flex max-w-3xl flex-col gap-4">
				{isOffline ? (
					<div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
						{t("jobCard.client.offline")}
					</div>
				) : null}

				<header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
						<div>
							<h1 className="text-2xl font-semibold text-slate-900">
								{job.title}
							</h1>
							<p className="text-sm text-slate-600">
								{job.address ?? t("jobCard.client.header.addressUnknown")}
							</p>
							<p className="text-sm text-slate-600">
								{job.customer.name ??
									t("jobCard.client.header.customerUnknown")}
							</p>
							<p className="text-sm text-slate-600">
								{computeTimeRange(
									job.startsAtISO,
									job.endsAtISO,
									t("jobCard.client.header.timeUnknown"),
								)}
							</p>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
								{t(`jobCard.status.buttons.${job.status}`)}
							</span>
							{priorityBadge}
							{pendingBadge}
						</div>
					</div>

					<Separator className="my-4" />

					<div className="flex flex-col gap-2 sm:flex-row">
						<Button
							asChild
							variant="secondary"
							className="flex-1 min-h-12"
							aria-label={t("jobCard.client.contact.whatsapp")}
						>
							<a
								href={buildWhatsappLink(job.customer.whatsapp)}
								target="_blank"
								rel="noreferrer"
							>
								<MessageSquare className="mr-2 h-5 w-5" />{" "}
								{t("jobCard.client.contact.whatsapp")}
							</a>
						</Button>
						<Button
							asChild
							variant="secondary"
							className="flex-1 min-h-12"
							aria-label={t("jobCard.client.contact.call")}
						>
							<a href={buildTelLink(job.customer.phone)}>
								<Phone className="mr-2 h-5 w-5" />{" "}
								{t("jobCard.client.contact.call")}
							</a>
						</Button>
						<Button
							asChild
							variant="secondary"
							className="flex-1 min-h-12"
							aria-label={t("jobCard.client.contact.navigate")}
						>
							<a
								href={buildMapsLink(job.address)}
								target="_blank"
								rel="noreferrer"
							>
								<Navigation className="mr-2 h-5 w-5" />{" "}
								{t("jobCard.client.contact.navigate")}
							</a>
						</Button>
					</div>
				</header>

				<JobTimer
					timer={job.timer}
					onStart={async () => handleTimerAction("start")}
					onPause={async () => handleTimerAction("pause")}
					onComplete={async () => handleTimerAction("complete")}
					isProcessing={timerMutation.isPending}
					isOffline={isOffline}
				/>

				<StatusButtons
					status={job.status}
					timerLocked={job.timer.locked}
					onUpdate={handleStatusUpdate}
					isProcessing={statusMutation.isPending}
					isOffline={isOffline}
				/>

				<section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
					<div className="flex items-start justify-between gap-3">
						<div>
							<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
								{t("jobCard.notes.title")}
							</p>
							<p className="text-sm text-slate-600">
								{t("jobCard.notes.subtitle")}
							</p>
							{isOffline ? (
								<p className="mt-1 text-sm text-amber-600">
									{t("jobCard.notes.offline")}
								</p>
							) : null}
						</div>
					</div>
					<Textarea
						value={notesDraft}
						onChange={(event) => {
							handleNotesChange(event.target.value);
						}}
						rows={6}
						placeholder={t("jobCard.notes.placeholder")}
						className="mt-2"
					/>
					<div className="flex justify-end text-xs text-slate-500">
						{notesSaving
							? t("jobCard.notes.saving")
							: notesQueued
								? t("jobCard.notes.queued")
								: null}
					</div>
				</section>

				<MaterialsQuickAdd
					lines={job.materials.lines}
					totals={job.materials.totals}
					onAdd={handleAddMaterial}
					isProcessing={materialMutation.isPending}
					isOffline={isOffline}
				/>

				<section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
					<div className="flex items-start justify-between gap-3">
						<div>
							<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
								{t("jobCard.signature.title")}
							</p>
							<p className="text-sm text-slate-600">
								{t("jobCard.signature.subtitle")}
							</p>
							{isOffline ? (
								<p className="mt-1 text-sm text-amber-600">
									{t("jobCard.signature.offline")}
								</p>
							) : null}
						</div>
						{signatureQueued ? (
							<Badge variant="outline" className="bg-amber-50 text-amber-700">
								{t("jobCard.signature.queuedBadge")}
							</Badge>
						) : null}
					</div>
					<div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
						<canvas
							ref={signatureCanvasRef}
							className="h-44 w-full touch-none"
							style={{ touchAction: "none" }}
						/>
					</div>
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							variant="secondary"
							size="lg"
							onClick={() => {
								void handleSignatureClear();
							}}
							disabled={
								signatureSaving || (!signatureDirty && !job.signatureDataUrl)
							}
						>
							<Undo2 className="mr-2 h-5 w-5" />
							{t("jobCard.signature.clear")}
						</Button>
						<Button
							type="button"
							size="lg"
							onClick={() => {
								void handleSignatureSubmit();
							}}
							disabled={signatureSaving || !signatureReady || !signatureDirty}
						>
							<Save className="mr-2 h-5 w-5" />
							{t("jobCard.signature.save")}
						</Button>
					</div>
					{job.signatureDataUrl ? (
						<div>
							<p className="text-xs font-medium uppercase tracking-wide text-slate-500">
								{t("jobCard.signature.current")}
							</p>
							<div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white p-4">
								<Image
									src={job.signatureDataUrl}
									alt={t("jobCard.signature.alt")}
									width={600}
									height={200}
									unoptimized
									className="h-auto max-h-40 w-auto"
								/>
							</div>
						</div>
					) : null}
					<div className="flex justify-end text-xs text-slate-500">
						{signatureSaving
							? t("jobCard.signature.saving")
							: signatureQueued
								? t("jobCard.signature.queued")
								: null}
					</div>
				</section>
			</div>
		</div>
	);
}
export function JobCardClient({
	initialJob,
}: {
	readonly initialJob: JobCardView;
}): JSX.Element {
	return (
		<OfflineSyncProvider>
			<JobCardInner initialJob={initialJob} />
		</OfflineSyncProvider>
	);
}
