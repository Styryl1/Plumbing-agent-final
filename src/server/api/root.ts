import { aiRouter } from "./routers/ai";
import { customersRouter } from "./routers/customers";
import { employeesRouter } from "./routers/employees";
import { invoiceFlowRouter } from "./routers/invoiceFlow";
import { invoicesRouter } from "./routers/invoices";
import { jobCardRouter } from "./routers/job-card";
import { jobsRouter } from "./routers/jobs";
import { orgSettingsRouter } from "./routers/orgSettings";
import { providersRouter } from "./routers/providers";
import { reportingRouter } from "./routers/reporting";
import { schedulingRouter } from "./routers/scheduling";
import { settingsRouter } from "./routers/settings";
import { timelineRouter } from "./routers/timeline";
import { waAdminRouter } from "./routers/waAdmin";
import { whatsappRouter } from "./routers/whatsapp";
import { whatsappSettingsRouter } from "./routers/whatsappSettings";
import { createCallerFactory, router } from "./trpc";

export const appRouter = router({
	jobs: jobsRouter,
	employees: employeesRouter,
	customers: customersRouter,
	invoices: invoicesRouter,
	invoiceFlow: invoiceFlowRouter,
	timeline: timelineRouter,
	reporting: reportingRouter,
	orgSettings: orgSettingsRouter,
	providers: providersRouter,
	scheduling: schedulingRouter,
	settings: settingsRouter,
	ai: aiRouter,
	whatsapp: whatsappRouter,
	whatsappSettings: whatsappSettingsRouter,
	waAdmin: waAdminRouter,
	jobCard: jobCardRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
