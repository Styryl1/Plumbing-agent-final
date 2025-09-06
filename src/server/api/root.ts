import { aiRouter } from "./routers/ai";
import { customersRouter } from "./routers/customers";
import { employeesRouter } from "./routers/employees";
import { invoicesRouter } from "./routers/invoices";
import { jobsRouter } from "./routers/jobs";
import { orgSettingsRouter } from "./routers/orgSettings";
import { reportingRouter } from "./routers/reporting";
import { timelineRouter } from "./routers/timeline";
import { whatsappRouter } from "./routers/whatsapp";
import { createCallerFactory, router } from "./trpc";

export const appRouter = router({
	jobs: jobsRouter,
	employees: employeesRouter,
	customers: customersRouter,
	invoices: invoicesRouter,
	timeline: timelineRouter,
	reporting: reportingRouter,
	orgSettings: orgSettingsRouter,
	ai: aiRouter,
	whatsapp: whatsappRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
