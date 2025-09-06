import { vi } from "vitest";
// Temporal is loaded globally by the setup file

type Row = Record<string, any>;

export function makeDbStub() {
	const tables: Record<string, Row[]> = {};
	
	function table(name: string) {
		tables[name] ??= [];
		return tables[name];
	}

	// Create RPC mock with stable implementation
	const rpc = vi.fn().mockImplementation((funcName: string, params?: any) => {
		console.log(`[DEBUG] RPC called: ${funcName} with params:`, params);
		if (funcName === "get_webhook_event_exists") {
			const webhookEvents = table("webhook_events");
			const exists = webhookEvents.some(e => 
				e.provider === params?.p_provider && 
				e.webhook_id === params?.p_webhook_id
			);
			return Promise.resolve({ data: exists, error: null });
		}
		
		if (funcName === "record_webhook_event") {
			const webhookEvents = table("webhook_events");
			const newEvent = {
				webhook_id: params?.p_webhook_id,
				provider: params?.p_provider,
				event_type: params?.p_event_type,
				entity_type: params?.p_entity_type,
				entity_id: params?.p_entity_id,
				processed_at: new Date().toISOString(),
			};
			webhookEvents.push(newEvent);
			return Promise.resolve({ data: newEvent, error: null });
		}
		
		if (funcName === "claim_due_status_refresh_jobs") {
			const queue = table("invoice_status_refresh_queue");
			console.log(`[DEBUG] RPC called with ${queue.length} jobs in queue`);

			// Use Temporal consistently (no Date)
			const nowInstant = Temporal.Now.instant();

			// Robust parser: handles ZonedDateTime strings like "...+02:00[Europe/Amsterdam]",
			// plain Instants, ISO with offsets, numeric ms, or the literal "now".
			const toInstant = (val: unknown, fallbackNow: Temporal.Instant): Temporal.Instant => {
				if (val == null) return fallbackNow; // treat missing as due now
				if (typeof val === "string") {
					const s = val.trim();
					if (s.toLowerCase() === "now") return fallbackNow;

					// Try ZonedDateTime first (supports the [Europe/Amsterdam] suffix)
					try {
						return Temporal.ZonedDateTime.from(s).toInstant();
					} catch {}

					// Strip bracketed IANA zone if present, e.g. "...+02:00[Europe/Amsterdam]" -> "...+02:00"
					const noBracket = s.replace(/\[[^\]]+\]$/, "");
					try {
						// Accepts ISO with offset or Z
						return Temporal.Instant.from(noBracket);
					} catch {}

					// As a last resort, try Date only if it parses, then convert to Instant
					const d = new Date(noBracket);
					if (!Number.isNaN(d.getTime())) {
						return Temporal.Instant.from(d.toISOString());
					}

					throw new RangeError(`Unsupported run_after format: ${s}`);
				}

				if (typeof val === "number") {
					// treat as epoch ms
					const d = new Date(val);
					return Temporal.Instant.from(d.toISOString());
				}

				// Already an Instant or something Temporal-like?
				try {
					// @ts-expect-error: runtime check
					if (typeof val.toString === "function") {
						return Temporal.Instant.from(String(val));
					}
				} catch {}

				return fallbackNow;
			};

			const dueJobs = queue.filter((j) => {
				const jobInstant = toInstant(j.run_after, nowInstant);
				return Temporal.Instant.compare(jobInstant, nowInstant) <= 0 && !j.claimed_at;
			});

			// Mark as claimed
			const claimed = dueJobs.slice(0, params?.batch_size || 10);
			claimed.forEach(job => {
				job.claimed_at = nowInstant.toString();
				job.claimed_by = "test-worker";
			});
			
			console.log(`[DEBUG] Returning ${claimed.length} claimed jobs`);
			return Promise.resolve({ data: claimed, error: null });
		}
		
		return Promise.resolve({ data: null, error: { message: "RPC not mocked" } });
	});

	const api = {
		from(name: string) {
			const rows = table(name);
			return {
				select: vi.fn().mockImplementation((cols?: string) => ({
					eq: (col: string, val: any) => ({
						single: () => {
							const r = rows.find(x => x[col] === val);
							return { data: r ?? null, error: r ? null : { message: "not found", code: "PGRST116" } };
						},
						maybeSingle: () => {
							const r = rows.find(x => x[col] === val);
							return { data: r ?? null, error: null };
						},
						limit: (n: number) => ({ data: rows.slice(0, n), error: null }),
					}),
					lte: (col: string, val: any) => ({ 
						order: (orderCol: string, opts?: { ascending?: boolean }) => ({ 
							limit: (n: number) => ({ 
								data: rows.filter(x => x[col] <= val).slice(0, n), 
								error: null 
							}) 
						}) 
					}),
				})),
				insert: vi.fn().mockImplementation((r: Row | Row[]) => {
					const arr = Array.isArray(r) ? r : [r];
					for (const x of arr) {
						// Emulate unique constraints
						if (name === "webhook_events" || name === "processed_webhooks") {
							const dup = rows.find(y => 
								y.provider === x.provider && 
								(y.event_id === x.event_id || y.webhook_id === x.webhook_id)
							);
							if (dup) return { data: null, error: { message: "duplicate key value", code: "23505" } };
						}
						
						// Generate ID if not provided
						if (!x.id) {
							x.id = `${name}_${rows.length + 1}`;
						}
						
						rows.push({ ...x });
					}
					return { data: arr, error: null };
				}),
				update: vi.fn().mockImplementation((patch: Row) => ({
					eq: (col: string, val: any) => {
						const r = rows.find(x => x[col] === val);
						if (!r) return { data: null, error: { message: "not found" } };
						Object.assign(r, patch);
						return { data: r, error: null };
					},
				})),
				delete: vi.fn().mockImplementation(() => ({ 
					eq: (col: string, val: any) => {
						const index = rows.findIndex(x => x[col] === val);
						if (index >= 0) {
							rows.splice(index, 1);
						}
						return { data: null, error: null };
					}
				})),
			};
		},
		
		// Use the stable RPC mock created above
		rpc,
		
		// Expose internal state for testing
		_tables: tables,
		_reset: () => {
			Object.keys(tables).forEach(key => {
				tables[key].length = 0;
			});
		},
	} as const;

	return Object.freeze(api);
}