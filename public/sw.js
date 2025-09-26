const DB_NAME = "pa-offline";
const DB_VERSION = 1;
const STORE_OPERATIONS = "operations";
const STORE_JOBS = "jobs";
const STORE_MEDIA = "media";
const STATIC_CACHE = "pa-static-v1";
const SYNC_TAG = "pa-sync-ops";

const MUTATION_MAP = {
	"job.timer.start": { path: "jobCard.updateTimer" },
	"job.timer.pause": { path: "jobCard.updateTimer" },
	"job.timer.complete": { path: "jobCard.updateTimer" },
	"job.material.add": { path: "jobCard.addMaterial" },
	"job.status.update": { path: "jobCard.updateStatus" },
	"job.notes.update": { path: "jobCard.updateNotes" },
	"job.signature.save": { path: "jobCard.saveSignature" },
};

let processing = false;

function nowEpochMilliseconds() {
	const temporal = globalThis.Temporal;
	if (temporal?.Now?.instant) {
		return temporal.Now.instant().epochMilliseconds;
	}
	return Math.round(performance.timeOrigin + performance.now());
}

self.addEventListener("install", (event) => {
	event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
	event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
	const request = event.request;
	if (request.method !== "GET") {
		return;
	}

	if (request.mode === "navigate") {
		event.respondWith(
			fetch(request)
				.then((response) => {
					const copy = response.clone();
					caches
						.open(STATIC_CACHE)
						.then((cache) => cache.put(request, copy))
						.catch(() => {});
					return response;
				})
				.catch(async () => {
					const cache = await caches.open(STATIC_CACHE);
					const cached = await cache.match(request);
					if (cached) return cached;
					return new Response("Offline", { status: 503, statusText: "Offline" });
				}),
		);
		return;
	}

	if (request.url.includes("/_next/")) {
		event.respondWith(staleWhileRevalidate(request));
	}
});

function staleWhileRevalidate(request) {
	return caches.match(request).then((cached) => {
		const fetchPromise = fetch(request)
			.then((response) => {
				if (response && response.status === 200) {
					const copy = response.clone();
					caches
						.open(STATIC_CACHE)
						.then((cache) => cache.put(request, copy))
						.catch(() => {});
				}
				return response;
			})
			.catch(() => undefined);
		return cached || fetchPromise;
	});
}

self.addEventListener("message", (event) => {
	const data = event.data;
	if (!data || typeof data.type !== "string") {
		return;
	}
	switch (data.type) {
		case "queue:added":
			scheduleSync().catch(() => {});
			break;
		case "sync-now":
			event.waitUntil(processQueue());
			break;
		case "cache-job":
			if (data.job && data.job.jobId) {
				event.waitUntil(writeJobSnapshot(data.job.jobId, data.job));
			}
			break;
		case "queue:status":
			event.waitUntil(broadcastPendingState());
			break;
		default:
			break;
	}
});

self.addEventListener("sync", (event) => {
	if (event.tag === SYNC_TAG) {
		event.waitUntil(processQueue());
	}
});

function openDb() {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = () => {
			const db = request.result;
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
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

async function getAllOperations() {
	const db = await openDb();
	const tx = db.transaction(STORE_OPERATIONS, "readonly");
	const request = tx.objectStore(STORE_OPERATIONS).getAll();
	const records = await wrapRequest(request);
	db.close();
	return Array.isArray(records) ? records : [];
}

async function removeOperation(id) {
	const db = await openDb();
	const tx = db.transaction(STORE_OPERATIONS, "readwrite");
	tx.objectStore(STORE_OPERATIONS).delete(id);
	await txComplete(tx);
	db.close();
}

async function updateOperationMeta(id, meta) {
	const db = await openDb();
	const tx = db.transaction(STORE_OPERATIONS, "readwrite");
	const store = tx.objectStore(STORE_OPERATIONS);
	const record = await wrapRequest(store.get(id));
	if (record) {
		store.put(Object.assign({}, record, meta));
	}
	await txComplete(tx);
	db.close();
}

async function countOperations() {
	const db = await openDb();
	const tx = db.transaction(STORE_OPERATIONS, "readonly");
	const count = await wrapRequest(tx.objectStore(STORE_OPERATIONS).count());
	db.close();
	return typeof count === "number" ? count : 0;
}

async function writeJobSnapshot(jobId, payload) {
	const db = await openDb();
	const tx = db.transaction(STORE_JOBS, "readwrite");
	tx
		.objectStore(STORE_JOBS)
		.put({ jobId, payload, updatedAt: nowEpochMilliseconds() });
	await txComplete(tx);
	db.close();
}

function wrapRequest(request) {
	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

function txComplete(tx) {
	return new Promise((resolve, reject) => {
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
		tx.onabort = () => reject(tx.error);
	});
}

function computeBackoffMillis(attempt) {
	const base = 30_000; // 30s
	const cap = 60 * 60 * 1000; // 1h
	const exponential = base * Math.pow(2, attempt);
	const capped = Math.min(exponential, cap);
	const jitter = Math.random() * capped * 0.2;
	return Math.round(capped + jitter);
}

async function scheduleSync() {
	if (processing) {
		return;
	}
	if (self.registration && self.registration.sync) {
		try {
			await self.registration.sync.register(SYNC_TAG);
			return;
		} catch {
			// fall through to immediate processing
		}
	}
	await processQueue();
}

async function processQueue() {
	if (processing) {
		return;
	}
	processing = true;
	await broadcastPendingState(true);
	try {
		const allOps = await getAllOperations();
		const now = nowEpochMilliseconds();
		const ready = allOps
			.filter((op) => typeof op.nextAttemptAt !== "number" || op.nextAttemptAt <= now)
			.sort((a, b) => a.createdAt - b.createdAt);

		for (const op of ready) {
			try {
				const result = await performOperation(op);
				await removeOperation(op.id);
				if (op.jobId && result) {
					await writeJobSnapshot(op.jobId, result);
				}
				await broadcast({
					type: "sync:result",
					opId: op.id,
					kind: op.kind,
					jobId: op.jobId,
					status: "success",
					result,
					pendingCount: await countOperations(),
				});
			} catch (error) {
				const attempt = typeof op.attempt === "number" ? op.attempt + 1 : 1;
				const nextAttemptAt = nowEpochMilliseconds() + computeBackoffMillis(attempt);
				await updateOperationMeta(op.id, {
					attempt,
					nextAttemptAt,
				});
				await broadcast({
					type: "sync:result",
					opId: op.id,
					kind: op.kind,
					jobId: op.jobId,
					status: "error",
					error: error && error.message ? error.message : String(error),
					pendingCount: await countOperations(),
				});
			}
		}
	} finally {
		processing = false;
		await broadcastPendingState(false);
		const remaining = await countOperations();
		if (remaining > 0) {
			scheduleSync().catch(() => {});
		}
	}
}

async function performOperation(op) {
	const mapping = MUTATION_MAP[op.kind];
	if (!mapping) {
		throw new Error(`Unknown offline operation: ${op.kind}`);
	}
	const body = JSON.stringify({ 0: { json: op.payload } });
	const response = await fetch(`/api/trpc/${mapping.path}?batch=1`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		credentials: "include",
		body,
	});
	if (!response.ok) {
		throw new Error(`HTTP ${response.status} ${response.statusText}`);
	}
	const json = await response.json();
	if (!Array.isArray(json) || json.length === 0) {
		return null;
	}
	const item = json[0];
	if (item?.error) {
		throw new Error(item.error.message ?? "tRPC error");
	}
	return item?.result?.data ?? null;
}

async function broadcast(message) {
	const clients = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
	for (const client of clients) {
		client.postMessage(message);
	}
}

async function broadcastPendingState(draining = false) {
	const pendingCount = await countOperations();
	await broadcast({ type: "sync:state", pendingCount, draining });
}
