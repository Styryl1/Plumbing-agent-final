import type { Json } from "~/types/supabase";

const DB_NAME = "pa-offline";
const DB_VERSION = 1;
const STORE_OPERATIONS = "operations";
const STORE_JOBS = "jobs";
const STORE_MEDIA = "media";

export interface OperationRecord {
	readonly id: string;
	readonly jobId: string;
	readonly kind: string;
	readonly payload: Json;
	readonly createdAt: number;
	readonly attempt: number;
	readonly nextAttemptAt: number;
}

const hasIndexedDb = typeof indexedDB !== "undefined";

const memoryOperations = new Map<string, OperationRecord>();
const memoryJobs = new Map<string, Json>();

async function txComplete(tx: IDBTransaction): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		tx.oncomplete = () => {
			resolve();
		};
		tx.onerror = () => {
			reject(tx.error ?? new Error("IDB transaction error"));
		};
		tx.onabort = () => {
			reject(tx.error ?? new Error("IDB transaction aborted"));
		};
	});
}

async function wrapRequest<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		request.onsuccess = () => {
			resolve(request.result);
		};
		request.onerror = () => {
			reject(request.error ?? new Error("IDB request error"));
		};
	});
}

function ensureSchema(db: IDBDatabase): void {
	if (!db.objectStoreNames.contains(STORE_OPERATIONS)) {
		const store = db.createObjectStore(STORE_OPERATIONS, { keyPath: "id" });
		store.createIndex("by_next_attempt", "nextAttemptAt");
		store.createIndex("by_job", "jobId");
	}
	if (!db.objectStoreNames.contains(STORE_JOBS)) {
		db.createObjectStore(STORE_JOBS, { keyPath: "jobId" });
	}
	if (!db.objectStoreNames.contains(STORE_MEDIA)) {
		db.createObjectStore(STORE_MEDIA, { keyPath: "id" });
	}
}

async function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = () => {
			const db = request.result;
			ensureSchema(db);
		};
		request.onsuccess = () => {
			resolve(request.result);
		};
		request.onerror = () => {
			reject(request.error ?? new Error("Failed to open offline DB"));
		};
	});
}

export async function addOperation(record: OperationRecord): Promise<void> {
	if (!hasIndexedDb) {
		memoryOperations.set(record.id, record);
		return;
	}
	const db = await openDb();
	const tx = db.transaction(STORE_OPERATIONS, "readwrite");
	tx.objectStore(STORE_OPERATIONS).put(record);
	await txComplete(tx);
	db.close();
}

export async function removeOperation(id: string): Promise<void> {
	if (!hasIndexedDb) {
		memoryOperations.delete(id);
		return;
	}
	const db = await openDb();
	const tx = db.transaction(STORE_OPERATIONS, "readwrite");
	tx.objectStore(STORE_OPERATIONS).delete(id);
	await txComplete(tx);
	db.close();
}

export async function countOperations(): Promise<number> {
	if (!hasIndexedDb) {
		return memoryOperations.size;
	}
	const db = await openDb();
	const tx = db.transaction(STORE_OPERATIONS, "readonly");
	const count = await wrapRequest(tx.objectStore(STORE_OPERATIONS).count());
	db.close();
	return count;
}

export async function listOperations(): Promise<OperationRecord[]> {
	if (!hasIndexedDb) {
		return Array.from(memoryOperations.values()).sort(
			(a, b) => a.createdAt - b.createdAt,
		);
	}
	const db = await openDb();
	const tx = db.transaction(STORE_OPERATIONS, "readonly");
	const request = tx.objectStore(STORE_OPERATIONS).getAll();
	const items = (await wrapRequest(request)) as OperationRecord[];
	db.close();
	return items.sort((a, b) => a.createdAt - b.createdAt);
}

export async function updateOperationMeta(
	id: string,
	meta: { readonly attempt: number; readonly nextAttemptAt: number },
): Promise<void> {
	if (!hasIndexedDb) {
		const existing = memoryOperations.get(id);
		if (existing) {
			memoryOperations.set(id, { ...existing, ...meta });
		}
		return;
	}
	const db = await openDb();
	const tx = db.transaction(STORE_OPERATIONS, "readwrite");
	const store = tx.objectStore(STORE_OPERATIONS);
	const existing = (await wrapRequest(store.get(id))) as
		| OperationRecord
		| undefined;
	if (existing) {
		store.put({ ...existing, ...meta });
	}
	await txComplete(tx);
	db.close();
}

export async function clearOperations(): Promise<void> {
	if (!hasIndexedDb) {
		memoryOperations.clear();
		return;
	}
	const db = await openDb();
	const tx = db.transaction(STORE_OPERATIONS, "readwrite");
	tx.objectStore(STORE_OPERATIONS).clear();
	await txComplete(tx);
	db.close();
}

export async function writeJobSnapshot(
	jobId: string,
	payload: Json,
): Promise<void> {
	if (!hasIndexedDb) {
		memoryJobs.set(jobId, payload);
		return;
	}
	const db = await openDb();
	const tx = db.transaction(STORE_JOBS, "readwrite");
	const updatedAt = Temporal.Now.instant().epochMilliseconds;
	tx.objectStore(STORE_JOBS).put({ jobId, payload, updatedAt });
	await txComplete(tx);
	db.close();
}

export async function readJobSnapshot(jobId: string): Promise<Json | null> {
	if (!hasIndexedDb) {
		return memoryJobs.get(jobId) ?? null;
	}
	const db = await openDb();
	const tx = db.transaction(STORE_JOBS, "readonly");
	const record = (await wrapRequest(tx.objectStore(STORE_JOBS).get(jobId))) as
		| { jobId: string; payload: Json }
		| undefined;
	db.close();
	return record ? record.payload : null;
}

export async function removeJobSnapshot(jobId: string): Promise<void> {
	if (!hasIndexedDb) {
		memoryJobs.delete(jobId);
		return;
	}
	const db = await openDb();
	const tx = db.transaction(STORE_JOBS, "readwrite");
	tx.objectStore(STORE_JOBS).delete(jobId);
	await txComplete(tx);
	db.close();
}
