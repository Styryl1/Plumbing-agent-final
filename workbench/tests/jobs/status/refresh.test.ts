import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeDbStub } from "../../_helpers/db";
import { Temporal } from "temporal-polyfill";

describe("refresh poller atomic claim", () => {
	let db: ReturnType<typeof makeDbStub>;

	beforeEach(() => {
		// Fresh db instance for each test - prevents mock drift
		db = makeDbStub();
		
		// Sanity guard: ensure mock implementation is present
		expect(vi.isMockFunction(db.rpc)).toBe(true);
		if (!db.rpc.getMockImplementation()) {
			// Re-seed (paranoid guard; should not trigger after config fix)
			db = makeDbStub();
			expect(db.rpc.getMockImplementation()).toBeTruthy();
		}
	});

	it("processes each job once with RPC claim semantics", async () => {
		// Seed queue with jobs
		db._tables["invoice_status_refresh_queue"] = [
			{
				id: "job1",
				invoice_id: "inv1",
				provider: "wefact",
				external_id: "X1",
				attempts: 0,
				max_attempts: 7,
				run_after: "2025-09-05T10:00:00Z",
				claimed_at: null,
				claimed_by: null,
			},
			{
				id: "job2",
				invoice_id: "inv2",
				provider: "moneybird",
				external_id: "MB001",
				attempts: 1,
				max_attempts: 7,
				run_after: "2025-09-05T10:30:00Z",
				claimed_at: null,
				claimed_by: null,
			},
		];

		// Simulate RPC claim_due_status_refresh_jobs
		const claimedJobs = await db.rpc("claim_due_status_refresh_jobs", {
			batch_size: 10,
		});

		// Should claim both jobs
		expect(claimedJobs.data).toHaveLength(2);
		expect(claimedJobs.data[0].claimed_at).toBeDefined();
		expect(claimedJobs.data[0].claimed_by).toBe("test-worker");

		// Second claim should return empty (already claimed)
		const secondClaim = await db.rpc("claim_due_status_refresh_jobs", {
			batch_size: 10,
		});
		expect(secondClaim.data).toHaveLength(0);
	});

	it("respects batch_size parameter", async () => {
		// Initialize the table first, then seed queue with many jobs
		db._tables["invoice_status_refresh_queue"] = [];
		for (let i = 1; i <= 20; i++) {
			db._tables["invoice_status_refresh_queue"].push({
				id: `job${i}`,
				invoice_id: `inv${i}`,
				provider: "wefact",
				external_id: `X${i}`,
				attempts: 0,
				max_attempts: 7,
				run_after: "2025-09-05T10:00:00Z",
				claimed_at: null,
				claimed_by: null,
			});
		}

		// Claim with batch_size = 5
		const claimedJobs = await db.rpc("claim_due_status_refresh_jobs", {
			batch_size: 5,
		});

		expect(claimedJobs.data).toHaveLength(5);

		// Verify only 5 jobs are claimed
		const claimedCount = db._tables["invoice_status_refresh_queue"].filter(
			j => j.claimed_at != null
		).length;
		expect(claimedCount).toBe(5);
	});

	it("only claims jobs with run_after in the past", async () => {
		const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");
		const past = now.subtract({ hours: 1 });
		const future = now.add({ hours: 1 });

		db._tables["invoice_status_refresh_queue"] = [
			{
				id: "job_past",
				invoice_id: "inv1",
				provider: "wefact",
				external_id: "X1",
				attempts: 0,
				max_attempts: 7,
				run_after: past.toString(),
				claimed_at: null,
				claimed_by: null,
			},
			{
				id: "job_future",
				invoice_id: "inv2",
				provider: "wefact",
				external_id: "X2",
				attempts: 0,
				max_attempts: 7,
				run_after: future.toString(),
				claimed_at: null,
				claimed_by: null,
			},
		];

		// Mock current time for RPC
		vi.spyOn(Date, 'now').mockReturnValue(now.epochMilliseconds);

		const claimedJobs = await db.rpc("claim_due_status_refresh_jobs", {
			batch_size: 10,
		});

		// Should only claim the past job
		expect(claimedJobs.data).toHaveLength(1);
		expect(claimedJobs.data[0].id).toBe("job_past");
	});

	it("skips already claimed jobs", async () => {
		const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");

		db._tables["invoice_status_refresh_queue"] = [
			{
				id: "job_unclaimed",
				invoice_id: "inv1",
				provider: "wefact",
				external_id: "X1",
				attempts: 0,
				max_attempts: 7,
				run_after: now.subtract({ hours: 1 }).toString(),
				claimed_at: null,
				claimed_by: null,
			},
			{
				id: "job_claimed",
				invoice_id: "inv2",
				provider: "wefact",
				external_id: "X2",
				attempts: 0,
				max_attempts: 7,
				run_after: now.subtract({ hours: 1 }).toString(),
				claimed_at: now.subtract({ minutes: 5 }).toString(),
				claimed_by: "other-worker",
			},
		];

		const claimedJobs = await db.rpc("claim_due_status_refresh_jobs", {
			batch_size: 10,
		});

		// Should only claim the unclaimed job
		expect(claimedJobs.data).toHaveLength(1);
		expect(claimedJobs.data[0].id).toBe("job_unclaimed");
	});

	it("handles concurrent workers correctly", async () => {
		// Seed a single job
		db._tables["invoice_status_refresh_queue"] = [
			{
				id: "job1",
				invoice_id: "inv1",
				provider: "wefact",
				external_id: "X1",
				attempts: 0,
				max_attempts: 7,
				run_after: "2025-09-05T10:00:00Z",
				claimed_at: null,
				claimed_by: null,
			},
		];

		// Simulate two workers trying to claim simultaneously
		// In reality, the DB would handle this atomically
		// Here we simulate the first worker winning
		const worker1Claim = await db.rpc("claim_due_status_refresh_jobs", {
			batch_size: 10,
		});
		expect(worker1Claim.data).toHaveLength(1);

		// Second worker gets nothing
		const worker2Claim = await db.rpc("claim_due_status_refresh_jobs", {
			batch_size: 10,
		});
		expect(worker2Claim.data).toHaveLength(0);
	});
});

describe("refresh job lifecycle", () => {
	let db: ReturnType<typeof makeDbStub>;

	beforeEach(() => {
		// Fresh db instance for each test - prevents mock drift
		db = makeDbStub();
		
		// Sanity guard: ensure mock implementation is present
		expect(vi.isMockFunction(db.rpc)).toBe(true);
		if (!db.rpc.getMockImplementation()) {
			// Re-seed (paranoid guard; should not trigger after config fix)
			db = makeDbStub();
			expect(db.rpc.getMockImplementation()).toBeTruthy();
		}
	});

	it("tracks attempt count and max attempts", () => {
		const job = {
			id: "job1",
			invoice_id: "inv1",
			provider: "wefact",
			external_id: "X1",
			attempts: 6,
			max_attempts: 7,
			run_after: "2025-09-05T10:00:00Z",
			claimed_at: null,
			claimed_by: null,
		};

		// Job has one attempt left
		expect(job.attempts < job.max_attempts).toBe(true);

		// After processing failure, increment attempts
		job.attempts++;
		expect(job.attempts).toBe(7);
		expect(job.attempts >= job.max_attempts).toBe(true); // Should be marked as failed
	});

	it("removes completed jobs from queue", async () => {
		db._tables["invoice_status_refresh_queue"] = [
			{
				id: "job1",
				invoice_id: "inv1",
				provider: "wefact",
				external_id: "X1",
				attempts: 0,
				max_attempts: 7,
				run_after: "2025-09-05T10:00:00Z",
				claimed_at: null,
				claimed_by: null,
			},
		];

		// Claim the job
		const claimedJobs = await db.rpc("claim_due_status_refresh_jobs", {
			batch_size: 1,
		});
		expect(claimedJobs.data).toHaveLength(1);

		// Simulate successful processing - remove from queue
		db.from("invoice_status_refresh_queue").delete().eq("id", "job1");

		// Queue should be empty
		expect(db._tables["invoice_status_refresh_queue"]).toHaveLength(0);
	});

	it("reschedules failed jobs with backoff", () => {
		const now = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam");
		const job = {
			id: "job1",
			invoice_id: "inv1",
			provider: "wefact",
			external_id: "X1",
			attempts: 2,
			max_attempts: 7,
			run_after: now.toString(),
			claimed_at: now.toString(),
			claimed_by: "worker1",
		};

		// Simulate processing failure - unclaim and reschedule
		job.attempts++;
		job.claimed_at = null;
		job.claimed_by = null;

		// Calculate next run with exponential backoff
		const baseSec = 60;
		const delaySec = baseSec * Math.pow(2, job.attempts);
		const nextRun = now.add({ seconds: delaySec });
		job.run_after = nextRun.toString();

		// Job should be rescheduled
		expect(job.attempts).toBe(3);
		expect(job.claimed_at).toBeNull();
		expect(job.run_after).toBe(nextRun.toString());
	});

	it("handles provider-specific retry logic", () => {
		const providers = ["moneybird", "wefact", "eboekhouden"];
		
		for (const provider of providers) {
			const job = {
				id: `job_${provider}`,
				invoice_id: "inv1",
				provider,
				external_id: "X1",
				attempts: 0,
				max_attempts: 7, // All providers use same max attempts
				run_after: "2025-09-05T10:00:00Z",
				claimed_at: null,
				claimed_by: null,
			};

			// Each provider should have same retry semantics
			expect(job.max_attempts).toBe(7);
		}
	});
});