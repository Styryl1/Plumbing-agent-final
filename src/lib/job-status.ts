import { useTranslations } from "next-intl";
// Canonical UI status ↔ DB status maps and helpers
export type JobStatusUI = "planned" | "in_progress" | "done" | "cancelled";
export type JobStatusDB =
	| "scheduled"
	| "unscheduled"
	| "completed"
	| "invoiced"
	| "paid";

export const toDbStatus = (ui: JobStatusUI): JobStatusDB => {
	switch (ui) {
		case "planned":
			return "scheduled";
		case "in_progress":
			return "scheduled"; // UI "in_progress" rolls up to scheduled in DB
		case "done":
			return "completed";
		case "cancelled":
			return "unscheduled";
	}
};

export const fromDbStatus = (db: JobStatusDB): JobStatusUI => {
	switch (db) {
		case "scheduled":
			return "planned"; // default visual bucket
		case "completed":
			return "done";
		case "unscheduled":
			return "cancelled";
		case "invoiced":
			return "done";
		case "paid":
			return "done";
	}
};
