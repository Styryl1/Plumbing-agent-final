import { describe, it, expect } from "vitest";
import { mapMoneybirdStatus } from "~/server/providers/moneybird/status-map";
import { mapEBoekhoudenStatus } from "~/server/providers/eboekhouden/status-map";
import { mapWeFactStatus } from "~/server/providers/wefact/status-map";

describe("Invoice Status Mapping Logic", () => {
	describe("Moneybird Status Mapping", () => {
		it("maps draft status correctly", () => {
			expect(mapMoneybirdStatus("draft")).toBe("draft");
			expect(mapMoneybirdStatus("DRAFT")).toBe("draft");
			expect(mapMoneybirdStatus("  draft  ")).toBe("draft");
		});

		it("maps open status to sent", () => {
			expect(mapMoneybirdStatus("open")).toBe("sent");
			expect(mapMoneybirdStatus("OPEN")).toBe("sent");
		});

		it("maps paid status correctly", () => {
			expect(mapMoneybirdStatus("paid")).toBe("paid");
			expect(mapMoneybirdStatus("PAID")).toBe("paid");
		});

		it("maps overdue statuses correctly", () => {
			expect(mapMoneybirdStatus("late")).toBe("overdue");
			expect(mapMoneybirdStatus("overdue")).toBe("overdue");
			expect(mapMoneybirdStatus("LATE")).toBe("overdue");
		});

		it("defaults unknown statuses to sent", () => {
			expect(mapMoneybirdStatus("unknown_status")).toBe("sent");
			expect(mapMoneybirdStatus("")).toBe("sent");
			expect(mapMoneybirdStatus("processing")).toBe("sent");
		});
	});

	describe("e-Boekhouden Status Mapping", () => {
		it("maps draft statuses correctly", () => {
			expect(mapEBoekhoudenStatus("concept")).toBe("draft");
			expect(mapEBoekhoudenStatus("draft")).toBe("draft");
			expect(mapEBoekhoudenStatus("ontwerp")).toBe("draft");
		});

		it("maps sent statuses correctly", () => {
			expect(mapEBoekhoudenStatus("verzonden")).toBe("sent");
			expect(mapEBoekhoudenStatus("sent")).toBe("sent");
			expect(mapEBoekhoudenStatus("verstuurd")).toBe("sent");
		});

		it("maps viewed statuses correctly", () => {
			expect(mapEBoekhoudenStatus("getoond")).toBe("viewed");
			expect(mapEBoekhoudenStatus("viewed")).toBe("viewed");
			expect(mapEBoekhoudenStatus("bekeken")).toBe("viewed");
		});

		it("maps paid statuses correctly", () => {
			expect(mapEBoekhoudenStatus("betaald")).toBe("paid");
			expect(mapEBoekhoudenStatus("paid")).toBe("paid");
			expect(mapEBoekhoudenStatus("voldaan")).toBe("paid");
		});

		it("maps overdue statuses correctly", () => {
			expect(mapEBoekhoudenStatus("te_laat")).toBe("overdue");
			expect(mapEBoekhoudenStatus("overdue")).toBe("overdue");
			expect(mapEBoekhoudenStatus("achterstallig")).toBe("overdue");
		});

		it("maps cancelled statuses correctly", () => {
			expect(mapEBoekhoudenStatus("geannuleerd")).toBe("cancelled");
			expect(mapEBoekhoudenStatus("cancelled")).toBe("cancelled");
			expect(mapEBoekhoudenStatus("ingetrokken")).toBe("cancelled");
		});

		it("defaults unknown statuses to unknown", () => {
			expect(mapEBoekhoudenStatus("unknown_status")).toBe("unknown");
			expect(mapEBoekhoudenStatus("")).toBe("unknown");
			expect(mapEBoekhoudenStatus("processing")).toBe("unknown");
		});
	});

	describe("WeFact Status Mapping", () => {
		it("maps draft statuses correctly", () => {
			expect(mapWeFactStatus("concept")).toBe("draft");
			expect(mapWeFactStatus("draft")).toBe("draft");
			expect(mapWeFactStatus("incomplete")).toBe("draft");
		});

		it("maps sent statuses correctly", () => {
			expect(mapWeFactStatus("open")).toBe("sent");
			expect(mapWeFactStatus("sent")).toBe("sent");
			expect(mapWeFactStatus("verzonden")).toBe("sent");
			expect(mapWeFactStatus("pending")).toBe("sent");
		});

		it("maps viewed statuses correctly", () => {
			expect(mapWeFactStatus("viewed")).toBe("viewed");
			expect(mapWeFactStatus("opened")).toBe("viewed");
			expect(mapWeFactStatus("bekeken")).toBe("viewed");
		});

		it("maps paid statuses correctly", () => {
			expect(mapWeFactStatus("paid")).toBe("paid");
			expect(mapWeFactStatus("betaald")).toBe("paid");
			expect(mapWeFactStatus("complete")).toBe("paid");
			expect(mapWeFactStatus("completed")).toBe("paid");
		});

		it("maps overdue statuses correctly", () => {
			expect(mapWeFactStatus("overdue")).toBe("overdue");
			expect(mapWeFactStatus("late")).toBe("overdue");
			expect(mapWeFactStatus("te_laat")).toBe("overdue");
			expect(mapWeFactStatus("achterstallig")).toBe("overdue");
		});

		it("maps cancelled statuses correctly", () => {
			expect(mapWeFactStatus("cancelled")).toBe("cancelled");
			expect(mapWeFactStatus("canceled")).toBe("cancelled");
			expect(mapWeFactStatus("geannuleerd")).toBe("cancelled");
			expect(mapWeFactStatus("void")).toBe("cancelled");
			expect(mapWeFactStatus("invalid")).toBe("cancelled");
		});

		it("defaults unknown statuses to unknown", () => {
			expect(mapWeFactStatus("unknown_status")).toBe("unknown");
			expect(mapWeFactStatus("")).toBe("unknown");
			expect(mapWeFactStatus("processing")).toBe("unknown");
		});
	});

	describe("Cross-Provider Consistency", () => {
		it("all providers map standard draft statuses consistently", () => {
			expect(mapMoneybirdStatus("draft")).toBe("draft");
			expect(mapEBoekhoudenStatus("draft")).toBe("draft");
			expect(mapWeFactStatus("draft")).toBe("draft");
		});

		it("all providers map standard paid statuses consistently", () => {
			expect(mapMoneybirdStatus("paid")).toBe("paid");
			expect(mapEBoekhoudenStatus("paid")).toBe("paid");
			expect(mapWeFactStatus("paid")).toBe("paid");
		});

		it("case insensitivity works across providers", () => {
			expect(mapMoneybirdStatus("DRAFT")).toBe("draft");
			expect(mapEBoekhoudenStatus("PAID")).toBe("paid");
			expect(mapWeFactStatus("OPEN")).toBe("sent");
		});

		it("whitespace trimming works across providers", () => {
			expect(mapMoneybirdStatus("  draft  ")).toBe("draft");
			expect(mapEBoekhoudenStatus("  betaald  ")).toBe("paid");
			expect(mapWeFactStatus("  open  ")).toBe("sent");
		});
	});
});