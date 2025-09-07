import { aiRouter } from "./routers/ai";
import { customersRouter } from "./routers/customers";
import { employeesRouter } from "./routers/employees";
import { invoiceFlowRouter } from "./routers/invoiceFlow";
import { invoicesRouter } from "./routers/invoices";
import { jobsRouter } from "./routers/jobs";
import { orgSettingsRouter } from "./routers/orgSettings";
import { reportingRouter } from "./routers/reporting";
import { timelineRouter } from "./routers/timeline";
import { waAdminRouter } from "./routers/waAdmin";
import { whatsappRouter } from "./routers/whatsapp";
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
	ai: aiRouter,
	whatsapp: whatsappRouter,
	waAdmin: waAdminRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
