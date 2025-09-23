"use client";

import type { JSX, ReactNode } from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { Json } from "~/types/supabase";

const STORAGE_KEY = "offline.queue";

interface OfflineOperation {
	readonly id: string;
	readonly kind: string;
	readonly payload: Json;
	readonly createdAt: string;
}

type OfflineHandler = (payload: Json, op: OfflineOperation) => Promise<void>;

type EnqueueInput = {
	readonly id?: string;
	readonly kind: string;
	readonly payload: Json;
	readonly createdAt?: string;
};

interface OfflineSyncContextValue {
	readonly pendingCount: number;
	readonly isDraining: boolean;
	enqueue: (operation: EnqueueInput) => void;
	registerHandler: (kind: string, handler: OfflineHandler) => () => void;
	drain: () => Promise<void>;
}

const OfflineSyncContext = createContext<OfflineSyncContextValue | null>(null);

function readQueue(): OfflineOperation[] {
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			return [];
		}
		const parsed = JSON.parse(raw) as unknown;
		if (Array.isArray(parsed)) {
			return parsed.filter((item): item is OfflineOperation => {
				if (typeof item !== "object" || item === null) {
					return false;
				}
				const candidate = item as Record<string, unknown>;
				return (
					typeof candidate.id === "string" &&
					typeof candidate.kind === "string" &&
					typeof candidate.createdAt === "string" &&
					"payload" in candidate
				);
			});
		}
	} catch (error) {
		console.warn("[offline-sync] Failed to parse queue", error);
	}
	return [];
}

function writeQueue(queue: OfflineOperation[]): void {
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
	} catch (error) {
		console.warn("[offline-sync] Failed to persist queue", error);
	}
}

export function OfflineSyncProvider({
	children,
}: {
	readonly children: ReactNode;
}): JSX.Element {
	const [queue, setQueue] = useState<OfflineOperation[]>(() => readQueue());
	const [isDraining, setIsDraining] = useState(false);
	const handlersRef = useRef(new Map<string, OfflineHandler>());
	const queueRef = useRef<OfflineOperation[]>(queue);
	const drainingRef = useRef(false);

	useEffect(() => {
		queueRef.current = queue;
		writeQueue(queue);
	}, [queue]);

	const enqueue = useCallback((operation: EnqueueInput): void => {
		const id = operation.id ?? crypto.randomUUID();
		setQueue((prev) => {
			const op: OfflineOperation = {
				id,
				kind: operation.kind,
				payload: operation.payload,
				createdAt: operation.createdAt ?? Temporal.Now.instant().toString(),
			};
			const filtered = prev.filter((item) => item.id !== id);
			const next = [...filtered, op].sort((a, b) =>
				a.createdAt.localeCompare(b.createdAt),
			);
			return next;
		});
	}, []);

	const drain = useCallback(async (): Promise<void> => {
		if (drainingRef.current) {
			return;
		}
		if (typeof navigator !== "undefined" && !navigator.onLine) {
			return;
		}
		drainingRef.current = true;
		setIsDraining(true);
		try {
			let currentQueue = queueRef.current;
			if (currentQueue.length === 0) {
				return;
			}
			const remaining: OfflineOperation[] = [];
			for (const op of currentQueue) {
				const handler = handlersRef.current.get(op.kind);
				if (!handler) {
					remaining.push(op);
					continue;
				}
				try {
					await handler(op.payload, op);
				} catch (error) {
					console.error(`[offline-sync] Failed to process ${op.kind}`, error);
					remaining.push(op);
					break;
				}
			}
			if (remaining.length !== currentQueue.length) {
				currentQueue = remaining;
				queueRef.current = currentQueue;
				setQueue(currentQueue);
			}
		} finally {
			drainingRef.current = false;
			setIsDraining(false);
		}
	}, []);

	useEffect(() => {
		const handleOnline = (): void => {
			void drain();
		};
		try {
			window.addEventListener("online", handleOnline);
		} catch (error) {
			console.warn("[offline-sync] Failed to bind online listener", error);
		}
		return () => {
			try {
				window.removeEventListener("online", handleOnline);
			} catch (error) {
				console.warn("[offline-sync] Failed to unbind online listener", error);
			}
		};
	}, [drain]);

	const registerHandler = useCallback(
		(kind: string, handler: OfflineHandler): (() => void) => {
			handlersRef.current.set(kind, handler);
			void drain();
			return () => {
				handlersRef.current.delete(kind);
			};
		},
		[drain],
	);

	useEffect(() => {
		if (
			typeof navigator !== "undefined" &&
			navigator.onLine &&
			queue.length > 0
		) {
			void drain();
		}
	}, [drain, queue.length]);

	const value = useMemo<OfflineSyncContextValue>(
		() => ({
			pendingCount: queue.length,
			isDraining,
			enqueue,
			registerHandler,
			drain,
		}),
		[enqueue, drain, isDraining, registerHandler, queue.length],
	);

	return (
		<OfflineSyncContext.Provider value={value}>
			{children}
		</OfflineSyncContext.Provider>
	);
}

export function useOfflineSync(): OfflineSyncContextValue {
	const ctx = useContext(OfflineSyncContext);
	if (!ctx) {
		throw new Error("useOfflineSync must be used within OfflineSyncProvider");
	}
	return ctx;
}
