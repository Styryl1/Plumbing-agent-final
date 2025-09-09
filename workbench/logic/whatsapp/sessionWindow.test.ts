import { describe, it, expect } from "vitest";
import { withAmsterdamNow, amsterdamTime } from "../../setup/vitest.temporal";
import { isWithin24h } from "~/server/services/whatsapp/session";

describe("WhatsApp Session Window Logic", () => {
	describe("isWithin24h", () => {
		it("returns true when message is exactly 24 hours minus 1 minute", async () => {
			const lastMessageAt = amsterdamTime("2025-09-01T10:00:00");
			const nowTime = amsterdamTime("2025-09-02T09:59:00");

			await withAmsterdamNow(nowTime, () => {
				expect(isWithin24h(lastMessageAt)).toBe(true);
			});
		});

		it("returns false when message is exactly 24 hours plus 1 minute", async () => {
			const lastMessageAt = amsterdamTime("2025-09-01T10:00:00");
			const nowTime = amsterdamTime("2025-09-02T10:01:00");

			await withAmsterdamNow(nowTime, () => {
				expect(isWithin24h(lastMessageAt)).toBe(false);
			});
		});

		it("returns true when message is exactly 24 hours", async () => {
			const lastMessageAt = amsterdamTime("2025-09-01T10:00:00");
			const nowTime = amsterdamTime("2025-09-02T10:00:00");

			await withAmsterdamNow(nowTime, () => {
				expect(isWithin24h(lastMessageAt)).toBe(true);
			});
		});

		it("returns true when message is within 1 hour", async () => {
			const lastMessageAt = amsterdamTime("2025-09-02T09:00:00");
			const nowTime = amsterdamTime("2025-09-02T10:00:00");

			await withAmsterdamNow(nowTime, () => {
				expect(isWithin24h(lastMessageAt)).toBe(true);
			});
		});

		it("returns false when message is 25 hours old", async () => {
			const lastMessageAt = amsterdamTime("2025-09-01T09:00:00");
			const nowTime = amsterdamTime("2025-09-02T10:00:00");

			await withAmsterdamNow(nowTime, () => {
				expect(isWithin24h(lastMessageAt)).toBe(false);
			});
		});

		it("returns false when lastInboundIso is null", async () => {
			const nowTime = amsterdamTime("2025-09-02T10:00:00");

			await withAmsterdamNow(nowTime, () => {
				expect(isWithin24h(null)).toBe(false);
			});
		});

		it("returns false when lastInboundIso is undefined", async () => {
			const nowTime = amsterdamTime("2025-09-02T10:00:00");

			await withAmsterdamNow(nowTime, () => {
				expect(isWithin24h(undefined)).toBe(false);
			});
		});

		it("returns false when lastInboundIso is empty string", async () => {
			const nowTime = amsterdamTime("2025-09-02T10:00:00");

			await withAmsterdamNow(nowTime, () => {
				expect(isWithin24h("")).toBe(false);
			});
		});

		it("returns false when lastInboundIso is invalid format", async () => {
			const nowTime = amsterdamTime("2025-09-02T10:00:00");

			await withAmsterdamNow(nowTime, () => {
				expect(isWithin24h("invalid-date")).toBe(false);
			});
		});

		it("handles edge case with microseconds precision", async () => {
			const lastMessageAt = "2025-09-01T10:00:00.123456+02:00[Europe/Amsterdam]";
			const nowTime = amsterdamTime("2025-09-02T09:59:59");

			await withAmsterdamNow(nowTime, () => {
				expect(isWithin24h(lastMessageAt)).toBe(true);
			});
		});
	});
});