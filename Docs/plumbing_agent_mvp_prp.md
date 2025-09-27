Plumbing Agent MVP – Unified Product Requirements (Ultimate PRP v3.1)

Ultimate PRP Template v3.1 – Production-Ready with Phase 2 Enhancements
A comprehensive PRD for a full-stack web & mobile system that runs a Dutch plumbing business via AI and automation, now including advanced scheduling, tracking, and self-service features.

Executive Summary

Feature Name: Plumbing Agent MVP – “WhatsApp → AI → Schedule → Voice Invoice → iDEAL (Phase 2)”
One-Line Description: A WhatsApp-integrated AI receptionist that triages customer messages into jobs, schedules them on a multi-user calendar, and handles invoicing (by voice) with payment links – now extended with live GPS tracking, customer self-booking, multi-day scheduling, and other advanced workflows.
Business Impact: Saves ~15 hours per week per plumber by automating intake and admin, accelerates cash collection via instant iDEAL payments, and requires zero technical setup. Builds a unique “Plumber Brain” data moat from day one, continuously learning from user confirmations/edits. New Phase 2 features (route optimization, customer portal, etc.) further improve operational efficiency and customer satisfaction (e.g. fewer no-shows with live ETAs
housecallpro.com
housecallpro.com
).
Estimated Complexity: Epic (16+ hours across multiple sprints). MVP base features were delivered in Phase 1; Phase 2 adds significant scope (advanced scheduling, integrations, UI enhancements) but remains focused on high-value workflows.
Stack Compatibility: T3 Stack (Next.js App Router + tRPC), Supabase (Postgres + Row-Level Security), Clerk (Multi-tenant Orgs), Temporal (workflow orchestrator for scheduling/notifications), shadcn/UI components, Vercel AI SDK (v5) for voice (STT) & structured outputs, WhatsApp Business Cloud API, Google Calendar API (2-way sync), Moneybird/e-Boekhouden API (invoicing), Mollie (iDEAL payments), and PDF generation (for invoices).

Goals & Context
Goal

Ship a production-grade unified MVP that can run a small plumbing business end-to-end. The system uses WhatsApp as the customer intake channel: AI triages messages (text or images) into structured job info, the plumber schedules and dispatches jobs via a calendar (with smart suggestions for time and routing), completes jobs with minimal overhead (offline-capable job cards, digital signatures), and finalizes billing by simply speaking the invoice (AI-transcribed) and sending an iDEAL payment link. Every step provides structured feedback into an AI learning loop so the “Plumber Brain” continuously adapts to each business. Phase 2 expands the MVP to include advanced scheduling (recurring and multi-day jobs, route optimization, live GPS & ETA updates) and self-service options (customer booking portal, multi-language message templates), aiming for a seamless, highly automated workflow.

Why

Plumbers live in WhatsApp: Customers already prefer WhatsApp for communication. Instead of forcing a new app or booking widget prematurely, we leverage this existing behavior for job intake. (A public booking widget is now added in Phase 2 once the WhatsApp flow has proven value.)

AI + Voice = No Typing: Manual data entry is a major pain. AI extraction of job details and voice-controlled invoicing eliminate nearly all typing, letting plumbers focus on work instead of paperwork. This addresses the biggest time sinks in admin.

Familiar Scheduling UX: Owners and staff are comfortable with calendar-based scheduling (similar to Salonized/Jobber interfaces). A mobile-first, drag-and-drop schedule (Schedule-X) maps exactly to how they manage their day. New enhancements like route-aware scheduling and multi-day job support align with known best practices in field service software
housecallpro.com
help.housecallpro.com
.

Professional & Compliant: Automatically handling GDPR notices and Dutch legal invoice requirements builds trust with clients (and avoids fines). Invoices are fully compliant (proper BTW/VAT, KVK, invoice numbering) without extra effort. Phase 2 ensures even tighter compliance by integrating with established accounting systems rather than generating our own invoice numbers.

Why Phase 2: After validating the core flow, we include features that improve scalability and user experience: live GPS tracking reduces customer wait anxiety and no-shows by providing accurate ETAs
housecallpro.com
, a booking portal generates new business 24/7 without calls
housecallpro.com
, and recurring job scheduling targets maintenance contracts for steady revenue
help.getjobber.com
. These additions make the product a one-stop solution competitive with established platforms (Jobber, Housecall Pro, etc.) while staying uniquely automation-focused.

What (User-Visible Features)

WhatsApp AI Receptionist: Two dedicated WhatsApp Business numbers (customer-facing and an internal control number) receive all customer messages. Incoming WhatsApp texts and photos automatically appear in an “Unscheduled” leads drawer with an AI-generated summary of the issue, urgency, expected duration and materials. The AI can handle Dutch messages and even parse photos (e.g. broken pipe images) to diagnose common issues (leveraging Vision API in the future). The plumber can chat on an internal control number to coach the AI or correct info if needed.

AI Triage & Proposals: The AI Brain parses each conversation into structured data { issue, urgency, materials[], labor_hours, suggested_time } as an AIRecommendation. Each new lead in the Unscheduled drawer shows the AI’s proposal (“🧠 AI suggests: likely leak under sink, urgent (within 24h), ~1.5h work, needs PVC pipe + sealant”). The plumber reviews and with one tap can “Apply AI Proposal” to convert it into a job. (All AI suggestions are labeled and require explicit confirmation – the AI only proposes, never auto-schedules in human-confirmation mode.)

Schedule-X Calendar: A team calendar (Schedule-X v3) shows jobs in Day and Week views, supporting multiple employees’ schedules side-by-side
housecallpro.com
. Owners can assign/reassign jobs to any staff; employees can only see their own jobs. Features include drag-and-drop to reschedule jobs or assign them to someone else in seconds
housecallpro.com
, and visual indicators of travel time gaps. The calendar is travel-aware – it can display estimated drive times between jobs on the same day to prevent impossible bookings
housecallpro.com
. A built-in Map View plots job locations and live technician positions for dispatchers to optimize routes (integrated with Google Maps or a routing API). If a job is dragged to a new time that creates a conflict or too-short travel time, the UI warns the user (and in future could auto-adjust surrounding jobs). Jobs spanning multiple days are represented as linked calendar events (one per day) under a single job ID, similar to Housecall Pro’s multi-day appointments
help.housecallpro.com
.

Unscheduled to Scheduled Flow: New incoming WhatsApp leads (or self-bookings) sit in an “Unscheduled” drawer (a bottom sheet) until assigned a time. Plumbers can quickly pick a suggested time (default from AI’s recommended timeframe) and an employee, then drag the job onto the calendar. This one-click scheduling flow ensures leads are turned into booked jobs within minutes, reducing administrative lag. (Phase 2: If route optimization is enabled, the system can suggest an optimal slot where this new job fits with minimal extra travel
help.housecallpro.com
.)

Job Cards & Offline Mode: Each job has a Job Card (accessible via a slide-out drawer or separate screen) showing all details: customer info, location (with one-tap directions via Google Maps or Waze
help.getjobber.com
), job description, attached photos, and AI notes. While on-site, plumbers can start a job timer, add materials used (from a predefined list or freeform), and capture customer signature on completion. The app works offline – job details and essential data are cached locally (PWA support) so that even with poor connectivity (e.g. in a basement), plumbers can view job info and record completion. If offline, data syncs when back online. The signature capture feature allows the client to sign on the mobile device screen with a finger, and the signed acknowledgment is saved as a PDF attachment on the job
help.getjobber.com
. This is particularly useful for proving work done or for insurance reports.

Voice → Invoice Flow: Once a job is marked completed (and optionally signed), the plumber can tap “Voice Invoice”. They then speak out loud a summary of the work and charges (e.g. “Replaced 2 meters of pipe and one faucet, 2 hours labor, total 150 euros”). The Vercel AI SDK streams this speech-to-text and parses it into a draft invoice JSON (with line items for labor and materials, VAT applied per line). The app shows a Finom-style invoice editor: an easy interface to review and tweak line items, prices, or VAT rates (inspired by Finom’s 60-second invoicing UI with autocompletion
finom.co
). The invoice editor ensures all required fields are present (customer info, unique invoice number, proper BTW percentages, Dutch descriptions). When the plumber confirms, a PDF invoice is generated and a Mollie iDEAL payment link is created. The customer immediately receives a WhatsApp message (or email) with a friendly note and the payment link. All of this happens typically within 5 seconds of finishing the job, making billing virtually instantaneous (performance budget: voice transcription and invoice draft generation <5s P95).

Customer Portal & Booking Widget: New in Phase 2 is a self-service customer portal. After a job is scheduled, customers receive a link where they can see their upcoming appointment, view technician ETA on the day of service, and even reschedule if needed (with rules: can only push to available slots on certain days, cutoff time for same-day reschedule, etc.). This portal reduces phone calls for rescheduling and improves customer experience. Additionally, a public booking widget can be embedded on the plumber’s website or Facebook page, allowing new customers to request an appointment 24/7
housecallpro.com
. The widget supports selecting a service type (from predefined categories with descriptions and pricing info), picking a preferred time slot based on real-time availability, and entering contact details. Submitted bookings show up in the system as pending jobs (in the Unscheduled drawer or directly on the calendar as tentative, configurable). Internally, the plumber can confirm and assign these just like WhatsApp leads. This online booking flow means “jobs can be booked even while you sleep”, echoing Housecall Pro’s value proposition
housecallpro.com
.

Live GPS & “On My Way” ETA: For scheduled appointments, the system provides live GPS tracking of field technicians. Plumbers can use the mobile app’s built-in tracker (with permission) to share location updates. Dispatchers or owners see all active vans on a live fleet map
housecallpro.com
housecallpro.com
. When a plumber is en route to a job, they tap an “On My Way” button, which sends an automated WhatsApp (or SMS) to the customer with an exact GPS-based ETA (e.g. “John from SuperPlumber is on the way, arriving in ~15 minutes at 14:30”). Customers love these professional updates
housecallpro.com
, which reduce no-shows and ensure someone is home
housecallpro.com
housecallpro.com
. The ETA is continually adjusted if the driver is delayed (using live traffic data). All location data is handled in a privacy-compliant way (e.g., only shared during active jobs, and via secure tokens). This feature brings us to parity with top field service apps that offer live technician tracking and improves trust and transparency.

Multi-Day & Recurring Jobs: The system can handle complex scheduling scenarios. Multi-day jobs allow a single work order to span multiple appointments/days – for example, a big installation that starts on Friday and finishes on Monday. The UI lets the user add multiple appointments under one job record
help.housecallpro.com
help.housecallpro.com
. Each appointment can have its own assigned staff and time window, and all are linked to the same job (with one invoice at the end if desired). Technicians can send “On My Way” and complete each day’s part separately. The job is only fully “Done” after all appointments are completed. Recurring jobs enable setting a job to repeat on a schedule (e.g. every month, or every Monday for 10 weeks)
help.getjobber.com
. This is critical for maintenance contracts or subscription services. The app supports recurrence patterns (daily/weekly/monthly, custom dates, etc.) similar to Jobber’s approach
help.getjobber.com
, with an “as needed” option for unscheduled recurrences. Recurring series are managed so that changes (like skipping one occurrence or rescheduling one) do not break the series; the user can also “edit one or all” as with typical calendar events.

Advanced Rescheduling (Cascade Changes): When schedule changes happen (customer cancels, or a job overruns), the system assists in “rescheduling ripple” effects. For instance, if a plumber’s 10am job extends by an hour, the app can prompt: “Job X ran over – shift upcoming jobs accordingly?” With one tap, the plumber can delay all later jobs that day by 1 hour and automatically send updated ETA notifications to those customers. Similarly, if a job is moved to another day or employee, any dependent tasks (like follow-up visits) can optionally move as well. This cascading reschedule logic follows best practices for linked events
dayback.com
 and avoids manual rework. (Implementation uses Temporal workflows to coordinate these changes and notifications reliably, ensuring nothing is missed even if the user goes offline mid-change.)

Team Dashboard & Performance Metrics: Owners and managers have a dashboard giving at-a-glance insight into operations. The Phase 1 dashboard showed “Today’s jobs, Pending invoices, Total revenue, AI proposals waiting”. In Phase 2, we expand this to a Team Performance Dashboard. For example, a widget shows Jobs by Status (how many jobs are In Progress, Completed, etc. today) and Jobs by Team Member (workload distribution)
care.zuper.co
care.zuper.co
. Another widget is a Leaderboard of technicians by number of jobs completed or revenue generated
care.zuper.co
, fostering friendly competition or identifying who may be overloaded. We also display metrics like average response time to inquiries, percentage of jobs completed on schedule, and AI suggestion acceptance rate (with a target of >80% accepted if the AI is learning well). The dashboard is customizable: users can pick which widgets (charts, tables) matter to them. All data updates in real-time (using Supabase subscriptions or polling) so that the health of the business is always visible. These insights mirror the kind of KPI-driven dashboards Zuper and others tout for field service teams
care.zuper.co
care.zuper.co
.

AI Continuous Learning Loop: Every time the plumber edits an AI suggestion (e.g., corrects the detected issue or changes the duration) or modifies an AI-drafted invoice line, the system captures this feedback. We have an AI Learning Pipeline that anonymizes these corrections and uses them to fine-tune the model. For example, if plumbers consistently add 30 minutes to jobs of type “boiler maintenance” that the AI predicted as 1 hour, the model will learn to suggest 1.5 hours next time for similar contexts. Over time, the goal is that the AI’s proposals become so accurate that the plumber can start trusting Full Auto-Mode AI for certain tasks. In Full Auto-Mode, which can be toggled per organization or even per workflow, the AI’s proposals get auto-applied if confidence is high (e.g., automatically schedule straightforward jobs at suggested times, or auto-send a quote for a simple request). All such auto-actions still generate audit logs and can require after-the-fact approval. This “self-driving mode” is optional, but for tech-savvy plumbers it could handle routine booking and invoicing with zero clicks, delivering on the promise of an autonomous agent. (Auto-mode will only be enabled once the AI achieves >90% accuracy on certain predictions, and it will never fully bypass human oversight for critical decisions, in line with responsible AI practices.)

Example of the Schedule-X calendar with multi-employee week view and color-coded jobs. A drag-and-drop interface allows quick rescheduling and assignment changes, while unscheduled leads (e.g. from WhatsApp) appear in a drawer for easy scheduling.
housecallpro.com
housecallpro.com

Success Criteria

Complete End-to-End Use Case: A job can flow through the entire system without manual intervention outside the app: WhatsApp message received → AI suggestion generated → Plumber confirms and schedules → Job is completed (with potential multi-day appointments) → Invoice voiced and sent → Customer pays via iDEAL. All data should persist correctly and trigger appropriate status updates at each step.

No Mock Data or Orphan States: The app is fully live – all views (leads, calendar, invoices, customers) reflect real data from the database, and actions affect actual records (no fake/mocked content). There should be zero hard-coded or dummy data. Similarly, there should be no “stuck” states; e.g., every WhatsApp conversation is either linked to a job or remains actionable, every invoice progresses to paid or is followed up, etc.

Dutch Compliance Achieved: Invoices meet all Dutch legal requirements – they include the plumbing business’s KvK (Chamber of Commerce) number and BTW (VAT) number, a unique invoice sequence number from an official source, correct BTW percentages (21% standard, 9% low, 0% for reverse-charged or intra-EU), line item breakdown of amounts and VAT, totals in EUR, and are archived for at least 7 years. The system should also adhere to GDPR: customers are informed of data use, and personal data is anonymized in AI training logs. A privacy notice is provided in any customer-facing interface.

Mobile-First, Fast UX: The app must feel snappy on mobile. Interactions like dragging a job on the calendar or opening the job drawer happen in under 200ms (optimistic UI with rollback on server confirm). The voice transcription returns results within ~2-3 seconds for typical sentences (under 5s even for longer) to not keep users waiting. The UI is optimized for one-handed use: primary actions are reachable in the thumb zone, and important buttons (e.g. “Confirm”, “Send Invoice”) are prominent and never hidden off-screen. Visual design meets WCAG AA contrast standards; all tap targets are ≥44px in size for accessibility. We will measure Core Web Vitals for the web app – aim for Lighthouse performance score ≥90 on mobile and keep Time to Interactive < 3s on a typical device.

AI Efficacy and Safety: We target that at least 80% of AI proposals are accepted by the plumber with minimal edits. This indicates the AI is accurately understanding customer requests. We’ll track suggestion acceptance rate as a key metric. Additionally, there should be zero critical AI errors: e.g., no wildly wrong invoice amounts or missed emergency detections. AI outputs are always validated by Zod schemas, and any confidence below a threshold results in a fallback to a simpler workflow (like a form). All AI actions (suggestions, automated messages) are logged with their input and output for audit. The plumber should always feel in control – the AI never sends a message or books a job without either explicit confirmation or a configured auto-mode consent.

Robust Integration & Sync: All external integrations must work reliably in real conditions. WhatsApp messages are received via webhook and logged; replies or template messages go out with correct templates (if outside 24h window). Google Calendar sync, if enabled, should create events on the plumber’s Google Calendar and reflect updates (two-way where applicable). For invoicing, the data in our app and the external accounting system (Moneybird, e-Boekhouden, etc.) should remain consistent: e.g., when an invoice is sent, it exists in Moneybird with the same number and status. Payment status from Mollie’s webhook must update the invoice as paid within seconds. A success criterion is <1 minute from customer payment to our app marking invoice paid (almost entirely dependent on webhook speed and processing).

Uptime and Resilience: The system should achieve 99.9% uptime for the core features (excluding third-party downtime) – essentially no more than ~45 minutes of downtime per month, as this will likely run a business’s daily operations. There must be no data loss on crashes; e.g., if the server fails mid-voice invoice, the draft is not lost entirely. All background jobs (webhooks, Temporal workflows) either complete or recover gracefully. We also set a goal of 0 security incidents: no breaches or data leaks in production. Regular backups and the ability to restore data (with an RPO of 15 minutes and RTO of 4 hours for disaster recovery) are in place.

Requirements
Functional Requirements

FR1. WhatsApp Integration: Integrate with the WhatsApp Business Cloud API for two numbers (or two channels): one for customer communication and one for an internal AI/plumber chat. Implement webhook handlers to ingest incoming WhatsApp messages (text, images, PDFs, etc.) in real time. Store messages in a conversation thread linked to a customer contact (identify customers by phone number; if unknown, create a new contact). Support sending WhatsApp messages via API: this includes templated messages (for post-24h follow-ups or appointment reminders) and free-form responses within the 24h service window. We must handle media: download images via the API (note: WhatsApp media URLs expire quickly, so download immediately and store in secure storage). Outbound media (e.g., sending the PDF invoice) should also be supported. Ensure all webhooks from WhatsApp are JWT-verified (Meta provides a verification token) to confirm authenticity. Constraints: Must abide by WhatsApp rate limits and policy (no unsolicited messages outside the 24h window without template). Use idempotency for webhook processing to avoid duplicate job creation if Meta retries the webhook.

FR2. AI Triage & Recommendation Engine: Develop the AI Brain service that processes incoming conversation text (and possibly image context) to produce structured job data. This could be implemented via OpenAI function calling or fine-tuned models, with careful prompt design in Dutch. The output should include at least: detected issue description, urgency level (e.g., emergency, urgent <24h, routine), materials needed (array, possibly empty if not guessable), estimated labor hours, and suggested scheduling time window. All outputs must be validated with a Zod schema before use. Store the AI suggestion in the database (e.g. AIRecommendation table) with a confidence score. If the AI is not confident or message is unclear (e.g. lots of slang or noise), it can either ask a clarifying question (via the internal chat to the plumber) or mark the lead as requiring manual triage. The system should localize the AI’s analysis in Dutch for plumber readability (e.g., “Mogelijk probleem: lekkage onder de gootsteen, Urgentie: Hoog (binnen 24 uur)”). Also parse images: integrate a vision API or a heuristic (Phase 2 might not fully implement this, but leave hooks for it) to identify common plumbing issues from photos (e.g. presence of rust, type of pipe). Note: The AI suggestion is just a draft – the plumber can modify any field in the next step.

FR3. Lead Inbox & Confirmation: Provide an Unscheduled Leads Drawer in the UI that lists all new incoming jobs (from WhatsApp or the booking widget) that are not yet scheduled. Each entry shows the customer name (or unknown number), the AI’s summary of the request, and buttons to either “Apply AI Proposal” or manually schedule. When the plumber clicks “🧠 AI propose” (or “Apply proposal”), the system creates a Job draft pre-filled with the AI’s parsed details: issue description, a tentative duration, suggested urgency/priority flag (e.g. emergency jobs could be marked specially), and even a tentative date/time. The plumber can adjust any of these before saving. Confirming creates the job officially and removes it from the unscheduled list. Alternatively, the plumber might choose to “Schedule manually” which lets them fill in details from scratch if the AI was off. Edge cases: If two plumbers attempt to schedule the same lead, handle gracefully (perhaps lock it when one opens). After confirmation, an optional WhatsApp message can go out to the customer confirming that their request is being scheduled (using a template if outside 24h). All AI proposals, whether accepted or overridden, should be logged for learning.

FR4. Calendar Scheduling (Schedule-X): Implement a multi-employee calendar interface for jobs. Key features: Day and Week views (month view is nice-to-have, not critical for MVP). Display each employee’s schedule in parallel columns (for week view) or allow filtering by one or multiple employees. Support drag-and-drop to move a job to a new time or day, and drag-resize to extend/shorten a job’s duration. These interactions should update the underlying schedule in the database (with proper validation – e.g., can’t drop a job into the past or outside working hours without override). Provide visual hints for business hours (e.g., grey out times before 8:00 or after 17:00 by default) and lunch breaks, as per Dutch typical schedule. If a job is marked as “emergency”, allow it to override normal working hours (with an icon indicating after-hours). Travel time awareness: display a small gap or icon between back-to-back jobs if the locations are far apart. We can integrate Google Maps Distance Matrix API to fetch travel times between sequential jobs for an employee, and either warn if travel time plus job duration overlaps with next job’s start, or automatically adjust end-times. (For MVP, a simpler approach: assume a default 5-15min travel buffer and enforce that gap; Phase 2 now allows turning on the dynamic Google Maps mode for precise data). The calendar should handle multi-day jobs: these can appear as separate events on each day, possibly with a link icon or same color to indicate they belong together. Multi-assignee jobs: If a job has two employees (primary and secondary), show it on both employees’ calendars (perhaps as half-width cards or a unified block spanning both columns). This requires careful UI to avoid double-booking confusion. Permissions: Only Owner/Admin roles can see and edit all employees’ calendars; Staff (basic role) can only see their own (plus maybe free/busy of others). The UI should enforce this, but NFR1 will ensure server-side checks too. Finally, integrate rescheduling & assignment changes: a job card can be dragged from one employee’s lane to another’s (in week view) to reassign, or we provide a dropdown in the job drawer to change assignee. All such changes trigger notifications: e.g., if a job is reassigned, notify the new employee; if time changed, update the customer via WhatsApp (template: “Your appointment has been rescheduled to ...”).

FR5. Voice Invoicing & Finishing Jobs: When a job is in “Completed – ready to invoice” state (i.e., work done but invoice not sent), the plumber can trigger the Voice Invoice flow. Implement an interface (web and mobile) to capture audio using the device microphone (leveraging the Vercel AI SDK or similar which streams to OpenAI Whisper or an STT model). Show a live transcription to the user for confirmation. Once the plumber finishes dictating, send the transcript to the AI function that generates a draft invoice JSON. For example, speech “Repaired leak under sink, 1 hour labor, used 2m PVC pipe” would yield line items: “Labor (1 hour) – €X”, “Materials: PVC pipe 2m – €Y”, automatically pulling default rates (we’ll store default labor rate and material prices per org, configurable). The AI should also infer the right VAT category for each line (labor likely 21%, material 21%, but if something is lower VAT category, allow that – plumber can adjust). Use Zod to validate the draft invoice structure. Then present the Invoice Editor UI: list of line items with editable fields (description, quantity, price, VAT). Pre-fill customer details and invoice date. Ensure any edits maintain correctness (e.g., if quantity or price changes, recalc totals). Provide a preview of the PDF invoice (perhaps in a modal or side panel) – a simplified PDF Preview component can display how the invoice will look. When plumber confirms, call the appropriate Invoicing Provider API: e.g., create the invoice via Moneybird API instead of numbering ourselves. This returns an official invoice number and PDF link. Save the invoice record in our DB with status “Sent”. Then create a Mollie payment link for that invoice amount (via Mollie Payments API) and store it. Finally, send out the invoice: typically via WhatsApp – either as a PDF attachment or a link to the PDF on our portal, plus the Mollie “Pay now” link. (Also optionally via email if email is on file.) All invoicing must be done through the chosen provider’s system – our app should not generate its own final invoice numbers or sequences
developer.moneybird.com
. If Moneybird is connected, we use Moneybird’s numbering; if user opts to use e.g. WeFact or just PDF, we need to ensure uniqueness by pulling the latest number from their system or having a clearly defined sequence. The invoice record in our system will contain the external ID (like Moneybird invoice ID) for reconciliation. After sending, mark the job as “Invoiced”. If the plumber instead marks the job as “No invoice needed” (e.g., warranty work), allow skipping this. Note: The voice flow should also handle if the plumber wants to invoice from the office later – they can also type the invoice if preferred.

FR6. Customer & Contact Management: Auto-create or update Customer records from incoming chats. At minimum, store the phone number, name (if available from WhatsApp profile or if the person provides it), and subsequently any address or email the customer shares. By the time of invoicing, we need a billing name and address for the invoice legal requirements. The AI can attempt to extract address from chat (“I live at XYZ street, city”), but often the plumber will ask and fill it in. Provide a simple Customers module: a list of all customers with search/filter, and a detail view showing their info and history (past jobs, invoices, and conversations). Support basic edits to customer info. If a WhatsApp message comes from an existing customer (match by phone), attach it to their record. If the customer provides, or the plumber enters, an email, use that for sending PDFs if needed. Also consider company vs individual (maybe just a toggle and field for Company name + VAT if B2B). Integration: If using Moneybird or e-Boekhouden, also create/update the contact in those systems via API so that invoices align to the same contact (to avoid duplicates). We can do this on invoice creation (Moneybird API allows specifying a contact or creating one). Ensure GDPR compliance: if a customer asks to delete their data, we need to anonymize their personal data in our system (possibly just keep invoices with “Customer A” generic but remove identifiable info, while retaining records as required by tax law – see GDPR details in NFR2).

FR7. Dashboard & Team Management: Provide a Dashboard Home view for each logged-in user. For owners/admins, this is a high-level overview (as described in Team Dashboard under “What”). For staff, it can be a simpler “Today’s schedule and tasks” view. At minimum, show Today’s jobs (list or cards, maybe with quick status buttons), Pending invoices (invoices that are sent but not paid, or jobs “requiring invoicing”), and an alert if there are AI suggestions waiting or unassigned leads. Include a summary of total open invoices amount (so they see how much money is in play). Phase 2 adds more widgets: e.g., a map snippet with currently active jobs and plumber locations, a KPI like “Jobs completed this week vs last week”, etc. Also include a “Notifications” feed for important events (new lead in WhatsApp, payment received, etc.). The Team Management aspect: allow the owner to invite team members (via Clerk Organizations). Onboarding a new plumber means sending an invite email; once they join, they appear in the calendar’s employee list. Provide a UI to manage permissions (at least roles: admin vs staff) and working hours or other profile info (perhaps in settings). Also, integrate basic Google Calendar sync settings here: if an employee wants to see their jobs on their personal Google Calendar, allow them to link their Google account and auto-create events (one-way sync, initial version). Conversely, a “Public iCal feed” for their schedule could be offered (URL they can subscribe to). The goal is to ensure the plumber never misses an appointment because it will show up on whatever calendar they use daily.

FR8. Audit Logs & Activity Tracking: Every significant action should produce an audit log entry for security and learning purposes. This includes: AI events (e.g., “AI suggested X for lead #123”), user confirmations or overrides (“User changed duration from 1h to 2h on job #123”), scheduling moves (“Job #123 moved from 10:00 to 11:00 on Sep 26 by Alice”), invoices sent/paid, and any automated messages (e.g., “WhatsApp message sent to customer for reminder”). These logs should be stored append-only with timestamp, user, and metadata. Sensitive info in logs (like customer phone) should be redacted or referenced by ID for GDPR. Provide an admin UI (maybe just for us or for the owner) to view logs in a readable format, at least for debugging/troubleshooting. This is crucial for trust in AI actions; plumbers can review what the AI did or suggested at any time. Also include system alerts (e.g. if a WhatsApp webhook failed or an integration error). The logs can also feed into an analytics page if needed (to count AI usage, etc., but that’s stretch).

FR9. Live GPS Tracking & ETA Notifications: Implement a Fleet Tracking module: when a plumber is on the move for a job, allow their mobile app to send location updates (with consent). Display all active field tech locations on a map in the dispatcher’s dashboard (update in real-time, e.g., using websockets). For each job, store its location coordinates (geocode the address once). Calculate ETAs using Google Maps API or similar and enable a one-tap “On My Way” action that sends the customer a WhatsApp message with an ETA and perhaps a live tracking link
housecallpro.com
. The message can include a shortened URL to a live map showing the van en route (using something like Google’s share location or a simple map on our customer portal updating every few seconds). Also send an alert if the plumber will be late beyond a threshold (“running 15 min late” notification). In the app, provide an ETA view for the plumber as well – e.g., showing next job travel time so they know if they are on schedule. The system should also handle when multiple plumbers go to the same job (carpooling perhaps) or when a plumber goes off route (stop tracking after job marked complete or if they go out of scope area). Privacy: include a setting to disable GPS tracking for those who opt out (then just no live ETA, or rely on manual updates). This feature is inspired by platforms like Housecall Pro which emphasize real-time fleet visibility and automatic arrival alerts
housecallpro.com
housecallpro.com
.

FR10. Digital Signature Capture: For jobs requiring customer approval or completion acknowledgment, enable signature capture on the job completion screen. When a plumber hits “Complete Job,” if the setting is on, the app will prompt “Have the customer sign to confirm job completion.” The customer can use a finger (on touch devices) or mouse to draw their signature in a canvas
help.getjobber.com
. That signature image, along with a timestamp and an optional note, gets attached to the job’s record (and to the invoice PDF as a “signed by X on date” field possibly). The signature file should be stored securely (e.g., as a PDF or image in storage). Also log who took the signature (technician’s device) and consider offline mode (cache it if needed until online). This functionality mirrors Jobber’s approach where collected signatures are saved as PDFs on the job
help.getjobber.com
. Additionally, allow generating a completion report that includes the signature for customers who want a copy (could be combined with the invoice or separate). Ensure that if a client refuses to sign, the plumber can skip (maybe mark “customer not available to sign”).

FR11. WhatsApp Template Builder (Multi-language): Provide an interface in the app settings to manage WhatsApp Message Templates used for outbound communications. Because WhatsApp requires pre-approved templates (e.g., for appointment reminders or invoice notices) and supports localization, we need to let the plumber define these messages in multiple languages. Implement a Template Manager where the plumber (or we on their behalf) can create template drafts with placeholders (like {customer_name}, {date}, {time}). For example, a template “Appointment Reminder” might have bodies in Dutch and English. The UI should allow selecting a category (e.g., “Utility” for appointment reminders), choosing languages (WhatsApp requires separate template per language, but they can share a name)
developer.enablex.io
, and writing content for each. We then call the WhatsApp Cloud API or template submission API to submit these for approval
kommo.com
kommo.com
. Once approved, the template can be sent. The app should show the status of each template (in review, approved, rejected)
kommo.com
. This feature ensures plumbers can customize messages (like including their brand voice or specific instructions) and handle customers in their preferred language. Multi-language support means if a customer’s WhatsApp profile indicates a language or if the plumber knows they speak English, we send the English template variant (the API allows specifying template name and language code when sending)
developer.enablex.io
. The system should store these template IDs and use them for automated messages: e.g., “Booking Confirmation” template goes out once a job is scheduled (triggered by FR3 flow), “Reminder” goes out 1 day before appointment, “Follow-up” maybe after job completion, etc. We will provide a few default template texts to start, but this builder enables customization. (Note: To keep MVP scope in check, we might seed with a Dutch template for reminders and use it by default, but the structure is there for full editing.)

FR12. Online Booking Widget & Portal: Develop a public booking page/widget that plumbers can link to or embed on their website. This should allow a new potential customer to select a service and a preferred time. Key components: a form for customer info (name, phone, email, address), a dropdown or list of services (plumber defines these in settings, with estimated durations and optional prices), and a date/time picker that shows available slots. Available slots should consider the current calendar (so integrate with our Schedule-X availability – e.g., show openings in the next 2 weeks, maybe using a simplified free/busy lookup per employee or just for a generic “next available” if customer can’t choose employee). When the customer submits, create a new lead in the system: either as an unscheduled job (if they just request a time window) or as a tentatively scheduled job (if we auto-assigned them to an open slot). Likely, we treat it as Unscheduled with a requested time so the owner can confirm/assign. Send the customer a confirmation (template via WhatsApp or email) that their request is received and pending confirmation. For embedding, ensure the widget can be included via iframe or a small script. The Customer Portal (for existing bookings) can be linked from the confirmation message (“View your appointment”). On that page (authenticated by a secure token link), show the appointment details and provide options to Reschedule or Cancel. Rescheduling should present a picker of alternative slots (with rules: e.g., only allow moving to 48+ hours later if short notice not allowed). If they submit a reschedule, update the job in our system (mark it as customer-requested change) and notify the plumber. Cancellation would mark the job as cancelled and free the slot (and possibly send a notification to the plumber to confirm). This self-service reduces coordination overhead. Ensure all such changes still respect business rules (no double-booking, etc.). For phase 2 scope, the portal does not require login, it works via magic link per appointment for simplicity (maybe in future a full customer login could be offered).

FR13. Route Optimization Assistant: For businesses with many daily jobs or multiple techs, implement an option for route optimization. This could be a feature where the system looks at all Unscheduled jobs (or jobs needing scheduling) and suggests an optimal schedule assignment. For example, at end of each day, an algorithm (or integration like Beeline Routes
help.housecallpro.com
) can batch unscheduled jobs and propose dates/times for each that minimize driving distances given the current schedule. Or for scheduled jobs, provide a “Optimize Routes” button that reorders jobs or swaps assignments between techs to reduce overlap or travel. A simpler near-term feature: provide a Map view with job pins and route lines (as in Housecall Pro’s route mapping
housecallpro.com
) and let the dispatcher manually adjust after visualizing. Since full algorithmic optimization may be complex, we can start by integrating a known solution (Beeline or Google OR-Tools). Even without full automation, highlight potential improvements: e.g., “Technician A and B could swap these two jobs to save 10km” suggestion. If a suggestion is accepted, the system should rearrange the calendar events accordingly and notify the affected customers of any time changes. This FR is about giving the team tools to efficiently handle scheduling when there are multiple jobs and technicians. Over time, this ties into AI auto-mode, where the AI might take over this optimization entirely.

FR14. Recurring Jobs Management: Allow creation of recurring jobs as described. In the UI, when creating a job, besides “One-time”, provide options for recurrence: daily, weekly (with day of week picks), monthly (date or nth weekday), annually, or custom schedules
help.getjobber.com
. When a job is set to recur, automatically generate the series of visits (occurrences) in the calendar. For MVP, we might generate them a few cycles ahead (or all up to a certain horizon) to display on the calendar. Keep track of recurrence pattern and allow modifications: e.g., editing one occurrence (which becomes an exception) or changing the whole series going forward. Cancelling a recurring job can offer “this occurrence only” or “whole series”. The system should indicate on job details that it’s recurring and show upcoming visits in that series. Recurring jobs should also reflect in metrics (like on dashboard: count how many recurring vs one-off jobs
care.zuper.co
). If integrated with Moneybird’s subscription API, we could even link to automatic invoice schedules, but that might be beyond MVP (though Moneybird does have subscription/recurring billing endpoints
developer.moneybird.com
 which we list for future use). The main goal: plumbers can set maintenance visits easily and not re-enter them each time.

FR15. Multi-Day Appointments: Expand job scheduling to support jobs that need multiple days or multiple appointments (possibly with different staff). On a job, allow adding additional appointments (similar to Housecall Pro’s “Add Appointment” flow)
help.housecallpro.com
help.housecallpro.com
. For each appointment, capture date, start/end times, and assigned employee(s). The UI should clearly show how many appointments are linked to a job and their status (e.g., 2 of 3 done)
help.housecallpro.com
. On the calendar, these appointments appear like separate events, but clicking any can show the job context with all appointments. The system must ensure that completing the last appointment triggers the job completion/invoice process. Also, customers should get separate reminders for each appointment (e.g., if a 3-day job, remind each day’s visit). If one appointment is rescheduled, it generally shouldn’t automatically move others (unless using cascade FR16 logic explicitly). But if the first appointment of a multi-day job is moved, maybe subsequent ones shift the same amount – this could be optional. For simplicity, assume multi-day means predetermined schedule that can be adjusted manually. Also support multi-employee multi-day cases (like a big job where different people on different days). The data model needs to link appointments to one job ID.

FR16. Advanced Rescheduling & Cascading Changes: Implement logic to handle scenarios when one change affects others. Two sub-cases: (a) Linked appointments (multi-day jobs or follow-ups) – if the plumber moves the first appointment of a project, ask if subsequent appointments should move by the same delta (like DayBack’s cascading events custom action
dayback.com
). Provide a UI prompt: “This job has 3 appointments. Do you want to move the others by the same amount?”. If yes, adjust them and ensure no conflicts. (b) Daily schedule overruns – if a job extends past its scheduled end (plumber indicates this in app by not completing on time or manually extends it), then any immediately following jobs for that plumber on that day are now starting late. The app should detect this and either automatically push those jobs back (and notify customers of new ETA) or flag to dispatcher. We could integrate this with the live ETA system: e.g., plumber doesn’t mark job done by its scheduled end time, system knows they’re running late and updates next job’s customer. Possibly implement a “Mass reschedule” for the day if a big delay happens (like drag all remaining events together). Another scenario: a sick day – owner could drag all jobs from one day to another date or reassign to others in one action (batch select). This FR is partly covered by providing good UI and partly by automation. Using Temporal, we can have a workflow that listens for events (job extended or cancelled) and triggers appropriate adjustments and notifications in sequence, ensuring none are missed even if the user’s app is closed. The success condition is minimizing manual effort when things don’t go as planned – the system helps handle the domino effect of schedule changes.

FR17. Team Performance & Analytics: Extend the Dashboard (FR7) with deeper analytics tools. Provide screens or reports for: Technician Performance – jobs completed, revenue generated, average rating (if we add customer feedback later), etc. Workload Balancing – e.g., a chart of jobs per tech per week
care.zuper.co
. Response Times – how fast on average leads are addressed (time from message to scheduled). Conversion rates – number of leads vs booked jobs (if widget or WhatsApp inquiries that didn’t become jobs). Finance – totals of invoiced amounts per period, paid vs unpaid. Many of these can be implemented by querying our DB or using Supabase PG + an analytics library. Ensure owners can filter by date range, employee, etc. These metrics help show ROI of the system (e.g., “15 hours saved” could be indirectly measured by time stamps). We can also expose the AI suggestions acceptance rate here (maybe under an “AI Assistant” section) to build user confidence (“The AI saved you X keystrokes this week”). Another piece: Capacity planning – show days that are overbooked or underbooked, maybe via a heatmap calendar of how filled each day is. All these should be non-intrusive but available. (We prioritize a few key ones for MVP: job status breakdown, jobs per tech leaderboard, and revenue/invoice status overview, since those are explicitly requested and align with Zuper’s dashboard widgets
care.zuper.co
care.zuper.co
).

FR18. AI Full Auto-Mode (Opt-In): Allow the organization to enable Auto-Mode AI for certain actions once they trust the system. This could be a setting “Auto-schedule routine requests up to 1h” or “Auto-reply with booking link for simple inquiries after hours.” If enabled, the AI can automatically perform the action it would normally propose. For example, if a message comes in saying “Hi, I need my radiator fixed tomorrow,” the AI could directly reply through WhatsApp (via an approved template) offering a time slot and creating a tentative job, without waiting for plumber input – effectively acting as a virtual assistant. Another example: auto-create and send an invoice for small jobs below a certain amount (where the plumber might not need to review). All auto-actions must be auditable and reversible. Perhaps tag such jobs/invoices as “Auto-created by AI” and require the plumber to quickly review (could be in the morning). If no issues, they do nothing; if something’s off, they can intervene (e.g., cancel or edit). This feature should be carefully sandboxed – initially maybe only for after-hours or overflow situations. It’s essentially taking FR2 + FR3 and automating the confirmation step. We enforce that any AI-led action is validated (Zod) and logged, and ideally only happens for known patterns the model has high confidence in (the system could require confidence > some threshold or a past confirmation frequency for similar cases). This FR pushes the boundaries but is a key differentiator if done right. The UI should provide toggles and explain the risks (“Auto-mode will schedule jobs on your behalf. You can always undo changes in the log.”). We might start with a conservative implementation: e.g., just auto-send an acknowledgement and create a draft job that still needs plumber final approval in the morning (so not fully committing, but to the customer it appears responsive). Over time, this could evolve into fully automated scheduling and dispatch for an AI-run business mode.

Live GPS tracking and route view example. The system shows technician vehicles on a map in real time, enabling accurate “On my way” notifications with GPS-based ETA to customers
housecallpro.com
. Route optimization ensures fewer miles and more jobs per day by smart scheduling
housecallpro.com
.

Non-Functional Requirements

NFR1. Security & Access Control: The system must enforce multi-tenant isolation so each plumbing company’s data is siloed. Use Clerk Organizations for authentication – every request on the server side must verify the user’s org context (e.g., via JWT token claims) and restrict DB access to that org’s data. Although Supabase Row-Level Security could be used, for MVP we implement ACL in our API layer (tRPC procedures checking orgId). Plan to add RLS in future for defense-in-depth once the auth bridge is stable. Follow the principle of least privilege: e.g., service role keys only used on server, API keys (WhatsApp, Mollie, etc.) not exposed to client. All secrets stored securely (in Vercel env or Supabase vault). Webhooks from external services (WhatsApp, Mollie, Moneybird, etc.) should be verified (HMAC or signature) before processing. Rate limit external-facing endpoints (especially WhatsApp webhook and booking widget) to prevent abuse. Use HTTPS everywhere (including between front-end and our backend). For file storage (photos, PDFs), generate signed URLs or use expiring links so that only authorized users can access them. Perform security testing: e.g., use Semgrep (as integrated via MCP) to scan for common vulnerabilities and Dutch PII handling issues. Ensure that in multi-org scenario, one org cannot ever see another’s data (test by trying various ID tampering etc.). The app should also implement role-based permissions: e.g., Staff cannot delete invoices or see financial reports, etc. Those checks in UI and server.

NFR2. Compliance (GDPR, VAT, Data Retention): Handle personal data with care: since we are processing customer names, addresses, possibly sensitive info (like if a message includes a photo of someone’s living space – which could be personal), we must comply with GDPR. Provide a clear privacy notice to customers when appropriate (e.g., if using WhatsApp, perhaps in the WhatsApp business profile or first message, a note: “We use an AI assistant to help schedule and invoice your job. Your data is stored securely and never shared outside our organization.”). Implement data minimization & retention: Raw WhatsApp message content and media should be retained only as long as needed for operations. For MVP we keep chat history for, say, 30-90 days, after which it can be auto-deleted or archived (configurable). However, structured data derived (jobs, invoices) must be kept longer for business records. Dutch law requires keeping invoices for 7 years, so we mark those for long-term storage. Ensure the system can anonymize or delete customer data on request – e.g., delete a contact and their conversation logs if a GDPR deletion request comes, while retaining invoices (anonymizing the name on them perhaps, since invoices are legal records that might override deletion). VAT compliance: As mentioned, every invoice needs correct BTW fields. Also handle edge cases like reverse-charged VAT for B2B if plumber uses that, or 0% for certain services (if applicable, e.g. export – not common in plumbing, but ensure flexibility). The system should allow setting the company’s VAT rate defaults and apply Dutch rules (like if customer is business with VAT ID and service qualifies, set VAT 0%). Possibly integrate a VAT validation API to validate VAT numbers (could use via Moneybird or EU VIES). For Peppol e-invoicing (if requested by some customers, especially businesses/government): Moneybird can send via Peppol
developer.moneybird.com
; if plumber checks “send via Peppol”, we route invoice through that (later feature, but good to note the pathway). Record of Processing Activities: Log what data we store and why, and ensure we only use personal data for the stated purpose (training data should be anonymized thoroughly – replace names, phone numbers in AI training logs with placeholders).

NFR3. Legal & Localization (Dutch Market): The product must feel native to the Dutch market. That means all customer-facing text in Dutch by default (with English as fallback if needed). Use Dutch locale for dates/times (DD-MM-YYYY, 24h clock) and for currency formatting (€ with comma decimals). The UI should allow input of Dutch addresses (maybe integrate postcode lookup later). Invoice requirements: Follow guidelines from business.gov.nl – include company name, address, KvK number, BTW number, invoice number, date, description of work, amounts, VAT breakdown per rate, and totals. We should format invoices in Dutch (e.g., “Factuur” header, “Datum”, “Omschrijving”, “Bedrag excl. BTW”, “BTW bedrag”, “Totaal” etc.). Also include payment info if needed (our Mollie link suffices for digital, but some might print the invoice – ensure bank account info of plumber is on it). GDPR and Communication: since we handle personal info, we should register with Autoriteit Persoonsgegevens if needed as a processor (likely the plumber is controller, our app is processor – out of scope legally but mention compliance). Also incorporate Dutch cultural context in AI: e.g., how to address customers politely (use formal “u” in messages). Our AI emergency detection should recognize Dutch keywords for urgency (like “spoed”, “dringend”, “lekkage” etc.) and flag emergencies for immediate scheduling. The system should also be aware of local holidays when scheduling (no jobs on Koningsdag unless emergency, etc., possibly loaded via an API or config). Realtime Lokalisatie Systeem (RLS): not sure if the RLS acronym in prompt refers to something specific (possibly “Rijbewijs Lokalisatie Systeem” or maybe they meant RLS as in Row Level Security, which we covered). Assuming RLS meant Row-Level Security in context of Supabase, which is covered in NFR1. Summarily, ensure all locale settings (time zones, DST changes, etc.) are handled. Use moment or date-fns properly for Europe/Amsterdam timezone as default.

NFR4. Performance & User Experience: Set clear performance budgets for critical interactions. As mentioned: P95 latency for any AI response (triage or invoice draft) < 2 seconds (if OpenAI call is a bottleneck, consider returning a loading state and updating when ready, but aim to be fast). Page loads (especially on mobile) should be optimized: code-split heavy components (e.g., only load the PDF generator or map view when needed). The app should be usable on typical modern smartphones (say 3-year-old Android/iPhone) with poor connectivity (hence offline support for job details). Use caching and optimistic UI to mask server latency (e.g., show the job on calendar immediately when dragged while confirming in background). All UI elements must be designed for mobile-first: large buttons, minimal text input (because we rely on AI and voice), and accessible design for even less tech-savvy users. Achieve WCAG 2.1 AA compliance: text with sufficient contrast, support screen readers (all interactive elements have labels), and allow font scaling without breaking layouts. Ensure the app works on common browsers and OS (Chrome/Safari, iOS/Android). Given field usage, consider a dark mode or high-contrast mode for sunlight readability (nice-to-have). The UI should degrade gracefully if AI is offline – i.e., plumber can manually fill a form if needed. Also, no client-side secrets – all API keys and sensitive logic on server. The front-end should interact via our API or use supabase client for minimal public data, nothing like Mollie keys or WhatsApp tokens in client code. And obviously, no test data or placeholder text visible (polish everything since this is production grade). We will monitor Web Vitals in production and address any performance regressions proactively (maybe integrate Sentry or FID monitor).

NFR5. Reliability & Operations: The system should be robust to failures and scalable to moderate usage. Implement idempotency keys for external actions (like invoice creation, payment webhooks) to handle retries without duplication. Use queueing or workflows (Temporal) for long-running processes such as sending WhatsApp messages or generating PDFs, to avoid blocking requests and to allow retry on failure. For example, if a Mollie webhook comes in, ensure it’s processed exactly once – if our server was down, Mollie will retry; we must handle duplicate webhook events gracefully (perhaps by checking invoice status before updating, etc.). Similarly, when scheduling or rescheduling jobs, ensure consistency – possibly use transactions in the database to avoid partial updates (like job moved but notification not sent – Temporal could help sequence these). Maintain audit trails (from FR8) to support debugging any issues. Set up monitoring and alerts: integrate Sentry for error tracking (with PII scrubbing as shown in MCP snippet) and something like Prometheus or a simple logging of key metrics (jobs created, messages sent). Establish uptime alerts and a playbook for incidents (e.g., if WhatsApp API is down, the system should queue messages and alert admin). Aim for 99.9% uptime as mentioned, which may involve using redundant services (running on Vercel or similar with high uptime). Also ensure disaster recovery: daily database backups, backup of file storage, and the ability to restore within RPO 15 min (we might use Supabase’s point-in-time recovery or our own). The system should fail gracefully if a sub-service is down – e.g., if AI suggestion fails, don’t block job creation, just inform “AI is unavailable, please fill details manually.” If WhatsApp sending fails (like template not approved), log it and maybe email the info instead, etc. Use circuit breakers for external APIs that might hang or slow (prevent one down service from hanging user requests). For instance, if Moneybird API is slow, we could time out and show invoice in “pending send” state rather than freezing the app. Logging should be structured and capture important context but avoid sensitive details (no personal data in plain logs). Finally, test reliability through scenarios: high volume of WhatsApp messages (maybe 50 at once), network offline (does app recover), etc.

NFR6. Integration & Extensibility: Design the system to integrate with external providers for key functions (WhatsApp, Maps, Calendar, Invoicing, Payments) in a modular way. For invoicing specifically, never generate our own official invoice numbers – always fetch from the provider or use a provider’s system to ensure no duplicates or compliance issues
developer.moneybird.com
. For example, if using Moneybird, use their “create sales invoice” API and store the returned invoice number. This ensures continuity if the plumber also uses Moneybird outside our app. Similarly, use external payment identifiers (store Mollie payment ID, not just our own) so that reconciliation is foolproof. The architecture should allow swapping components: today Moneybird, tomorrow a different accounting system – abstract the invoice service with an interface. Temporal.io is used to orchestrate complex flows (like multi-step scheduling or reminder sequences) – ensure these workflows are designed so they can be changed or scaled (e.g., if we add an SMS provider, the Temporal workflow can call that activity easily). Validation everywhere: All inputs (especially from AI or user forms) should be validated using Zod schemas on the server, ensuring type safety and preventing bad data from causing errors downstream. Use TypeScript end-to-end so that API contracts are enforced. And no usage of production credentials in non-prod, etc. Also, avoid any mock data or dummy logic in final product – remove any placeholders used during development (the success criteria “no mock data” is firm). For accessibility and maintainability, adhere to established design system (shadcn UI) so the app is consistent and easier to update. The UI components from shadcn come with accessibility and theme support out of the box, which helps maintain compliance with AA standards. Use that library extensively instead of custom ones to reduce UI bugs. Testing & Quality: see testing strategy below, but essentially we require high test coverage on critical logic (AI parsing, scheduling conflicts, invoicing calculations, security rules).

NFR7. Scalability & Performance Metrics: (Anticipating growth) The system should support at least dozens of concurrent users per org and scale to hundreds of jobs per day. Use efficient queries – e.g., indexes on job timestamps for calendar queries, and pagination on lists. Consider using Supabase real-time streams for updates (so calendar and dashboard update instantly when something changes). Keep an eye on performance: e.g., loading the week view should not fetch all jobs ever, just relevant range (use date filters). Budget: P99 API response < 200ms for simple calls (some heavy ones like generating invoice PDF might be more but done async). Also ensure front-end performance: limit bundle size (tree-shake unused shadcn components, etc.), use code splitting for heavy routes (calendar, maps). Define some key technical metrics to monitor: average response time, memory usage, etc. Use these to detect issues like memory leaks or slow DB queries (perhaps add logging of slow queries > 300ms). This NFR is about making sure the app not only works for one plumber but can handle many customers and jobs without lag or crashing.

Explicitly Out of Scope

To clarify, the following features are out of scope for this PRP (possible future expansions beyond Phase 2):

Inventory/Stock Management: Tracking parts inventory (quantities of materials) or low-stock alerts is not included. We assume plumbers handle stock outside the app for now, aside from logging materials per job.

Advanced Analytics/BI: While we have dashboards, deep business intelligence tools or custom report builders are out of scope. No machine learning beyond our AI assistant.

Telephony Integration: We do not handle voice calls or transcribing phone calls to jobs (though WhatsApp voice notes could be a future input).

Full Accounting Features: We integrate with invoicing systems but we don’t aim to do full bookkeeping or tax filing. No general ledger, expense tracking (aside from marking invoices paid).

HR/Payroll: Time tracking is limited to job timers for billing; we are not doing payroll computation or vacation tracking (aside from basic time-off in dashboard possibly).

Auto-dispatch without confirmation: While auto-mode AI is in scope as optional, fully automatic dispatching of all jobs without any human check (especially for complex scenarios) is not the default and not forced; it’s opt-in and limited.

Multi-Tenant Org Admin beyond basics: We won’t implement things like multi-org collaboration or subcontractor external access in this phase. Each org is isolated.

Non-Dutch locales: We focus on the Dutch market compliance. Support for other countries’ tax systems, languages (except maybe English UI toggle) is not included in MVP.

Everything else described in Phase 1 and Phase 2 above is considered in-scope for this project. We intentionally include a broad scope in this unified PRP, recognizing it will be broken down into iterative releases.

All Needed Context
Documentation & References

WhatsApp Cloud API Docs (Meta): For integrating messaging, media, webhooks, and template usage. Critical details: 24-hour customer service window (after last customer message), use of pre-approved templates beyond that window, and the short-lived nature of media URLs requiring immediate fetch. Also review rate limit guidelines to avoid hitting messaging caps.

Mollie Payments API (v2): Specifically the Create Payment endpoint for iDEAL and handling of webhooks. Critical: always rely on the webhook to confirm payment success (don’t trust the redirect alone), and store mollie_payment_id to correlate events. Also implement HMAC signature verification for Mollie webhooks to ensure authenticity (Mollie provides a header with signature).

Schedule-X Calendar Library (v3): Our scheduling UI uses Schedule-X; docs on Week/Day views, multiple calendars for resources (employees), and the drag & drop plugin. Critical: Represent each employee as a “calendar” resource, use controlled state for the current date range, and ensure DnD events update state. Check how to best implement cross-resource DnD (for reassign).

Clerk Organizations (Auth): Reference Clerk docs for organization switching, roles, and server-side helpers. Critical: how to get the current org in API calls, enforce that in queries, and use Clerk’s invite system. Also ensure we fetch user’s org membership on client to filter data.

Supabase Postgres (Row-Level Security & Policies): Although using server ACL, be mindful of how RLS could be applied later. Critical: structure the schema so that every table has an org_id and possibly use policies for future. For now, at least concentrate all multi-tenant queries on org_id = currentOrg.

Vercel AI SDK (voice & AI): The Vercel AI SDK v5 docs for streaming transcription, and OpenAI function calling usage. Critical: use JSON mode or function calling to get structured output, validate with Zod, and manage a token limit. Also consider fallback models or shorter prompts if needed to meet performance. The SDK can handle mic input streaming which is useful for FR5.

shadcn/UI Library: Component usage and theming instructions. Critical: how to install components via CLI or MCP, maintaining consistent theme tokens (colors, spacing) to meet design guidelines, and built-in accessibility. Use Dialog, Sheet, Command, DataTable, Calendar components as needed. The library’s best practices will help with a11y (e.g., it has proper focus management in dialogs).

Dutch Invoice Requirements: Official checklist from business.gov.nl on invoice fields and retention. Critical: include KvK (CoC) and BTW numbers of supplier, invoice number and date, description of goods/services, quantity, price, VAT rate and amount per line, total excl and incl VAT. Also note: invoices should be sequentially numbered and kept 7 years (we will rely on external system for numbering to satisfy this).

Moneybird API (Accounting Integration): Moneybird’s API docs for Creating Sales Invoices, Managing Contacts, and sending via Peppol
developer.moneybird.com
. Critical: how to authenticate (personal token or OAuth), how to create an invoice draft and mark as sent, retrieving the PDF, and creating contacts. Also relevant: Moneybird supports recurring templates and subscriptions
developer.moneybird.com
, which could align with our recurring jobs (out of scope to integrate fully, but keep in mind). Moneybird will ensure compliance on invoice sequencing and offers Peppol sending for B2B.

Housecall Pro & Jobber UX Patterns: While not external APIs, we’ve researched their workflows. Notably, Housecall Pro’s Multi-day appointments design
help.housecallpro.com
 and On My Way notifications & live GPS features
housecallpro.com
, and Jobber’s digital signature and recurring job handling
help.getjobber.com
help.getjobber.com
. We will mirror proven approaches: e.g., multi-day jobs as multiple appointments under one job ID, recurring job scheduling UI similar to calendar recurrence dialog, and signature capture as a standard step for job completion. These references ensure our UX meets user expectations set by leading apps.

Beeline Route Optimization (Housecall integration): As a model for route suggestions
help.housecallpro.com
. It shows how unscheduled jobs can be automatically slotted for optimal routes. We might not use Beeline specifically, but this informs our approach to route optimization: treat it as a suggestion layer, not mandatory.

DayBack Cascading Events (for reschedule cascades): DayBack calendar’s blog on cascading events
dayback.com
 shows an example of how events with dependencies can automatically shift. This informs our FR16 implementation logic and warns us to be careful (and possibly include an undo option for batch moves).

GDPR & PII guidelines: We will adhere to GDPR for all personal data. The MCP Semgrep rules example highlights Dutch PII patterns (BSN, IBAN, postal codes) – we ensure not to log these or expose them improperly. Also ensure TLS encryption in transit and encryption at rest for sensitive fields (Supabase can encrypt columns or we can encrypt certain data like WhatsApp access tokens).

WCAG Accessibility Guidelines: Refer to WCAG 2.1 AA checklist for contrast and target sizes. Our design will leverage pre-tested component library but we’ll also test with screen readers and keyboard navigation (all functions should be usable via keyboard – e.g., calendar events should be focusable and draggable via keyboard or an alternative list view).

Existing Patterns to Mirror/Avoid

MIRROR – Mobile-First Action Placement: Design the UI so that on mobile, primary actions (like “Confirm”, “Send Invoice”, “Start Job”) are easily reachable in the thumb zone and often pinned at bottom if scrolling. This mirrors successful apps which have large footer buttons for key actions. Always keep “Confirm” or “Send” visible when relevant – don’t hide it behind menus.

MIRROR – Explicit AI Confirmation: Every AI-generated content presented to the user should be clearly labeled as such and requires user review/confirmation before it affects customers. This pattern builds trust and keeps the human in control. E.g., use labels like “AI Suggestion (Review before sending)” on drafts.

MIRROR – Calendar Drag/Drop UX: Emulate the polished feel of apps like Google Calendar or Jobber for scheduling: dragging should show a ghost preview, auto-scrolling the view if near edge, etc. Use optimistic update so the event moves immediately, then confirm with server (if server rejects, move it back with an error toast). This smooth UX is expected by users.

MIRROR – On-My-Way and Reminder etiquette: Follow the industry standard of sending an “On my way” notification when tech starts driving (maybe ~30 min before arrival)
housecallpro.com
, and possibly a reminder 1 day before. These messages should be brief and professional. Use templates that have been seen in practice (like the ones in Housecall or text message norms).

MIRROR – Recurring Job Flexibility: As per Jobber, allow complicated recurrence rules (multiple days a week, etc.)
help.getjobber.com
. Don’t lock down to just simple repeats if possible. Users often need that flexibility.

AVOID – Hard-coding or Mocking: No placeholder text like “Lorem ipsum” or fake menu items. Everything in UI must be real data or state explicitly when empty (e.g., “No jobs today” message). Also avoid any hidden developer shortcuts or debug info in prod.

AVOID – Unverified External Calls: Ensure every webhook (WhatsApp, Mollie) and incoming integration call is verified by signature or token. Don’t process them blindly – avoids security holes.

AVOID – Storing Secrets on Client: Never expose private API keys in the front-end. E.g., for Google Calendar or Maps, use either our server as proxy or restricted keys. This prevents misuse if someone inspects the app.

AVOID – Complex setup for users: The plumbers using this may not be tech experts. So avoid requiring them to do things like registering a Facebook Developer app or uploading their own SSL certificates. Any required setup (like WhatsApp Business API onboarding) should be guided through our UI or done for them via a managed service. In short, minimize friction in onboarding.

AVOID – UI Overload: Present data and options progressively. For example, on a job card, don’t show 50 fields by default. Perhaps show core info and hide advanced in an expandable section. Too much info can confuse. Focus on the day-to-day actions (schedule, do job, invoice).

MIRROR – Offline UX: Like many field apps, ensure the essential functions degrade gracefully offline. Possibly use IndexedDB via Supabase or Next.js caching to store upcoming jobs locally. Show an “offline” banner when no connection. Allow completing jobs offline and queue syncing. This pattern is expected by users in the field when connectivity can be an issue.

AVOID – Non-Dutch translations for customers: All customer-facing comms should be in Dutch (unless we detect they prefer English). Sending English messages to a Dutch customer could confuse or seem less professional. So ensure templates default to Dutch. For the app UI, English is fine for now since plumbers may know basic English technical terms, but perhaps offer Dutch UI later.

Research Approach

In developing this PRP and the subsequent solution, we leveraged a combination of web research and context from known tools:

Web Search Queries: We researched best practices and existing solutions with queries like “WhatsApp cloud API media webhooks best practices”, “Mollie iDEAL webhook verification”, “Moneybird API create invoice example”, “Jobber recurring jobs help”, “Housecall Pro route optimization GPS”, “Zuper dashboard metrics”. These searches yielded insights into how leading field service platforms handle features we’re building (citations provided above). For instance, Housecall’s own feature pages informed our approach to GPS tracking and route optimization
housecallpro.com
housecallpro.com
, and Jobber’s help center informed digital signature and recurring scheduling design
help.getjobber.com
help.getjobber.com
.

Context from MCP (Machine-Checked PRs): We utilized the MCP server integration context to accelerate and validate parts of the implementation (though not the main focus of the PRP, it ensures we know how to quickly scaffold things like Clerk orgs, shadcn components, etc., as seen in the PRP v3.1 template enhancements).

Security Guidance: We reviewed common patterns for webhook security (using HMAC secret comparison), idempotency keys usage for external API calls, and looked at examples of audit logging in Node (winston logs with masked PII).

AI Validation: Researched how to enforce structured outputs from AI (OpenAI function calling with a defined JSON schema, then using Zod to validate and transform into our types).

UI/UX Benchmarks: We studied UX of similar products: e.g., screenshots of Housecall Pro’s calendar and mobile app to ensure our design meets modern standards. We noted their emphasis on simplicity (one view for dispatching with drag-drop, color coding statuses
housecallpro.com
) and copied successful elements. Also drew on personal experience (if any) with tools like Freshdesk (for inbox style ticket management) and how that might translate to our WhatsApp leads inbox.

This research-backed approach gives confidence that our feature set and design aren’t reinventing the wheel blindly but standing on shoulders of proven solutions, while innovating with AI integration unique to our product.

UX/UI Specifications
Core Screens and Flows

Dashboard: A home screen with key cards showing Today’s Jobs (list of jobs with time, status, assignee), Pending Invoices (count and € amount), Total Revenue this month, and “AI Proposals Waiting” (count of new unscheduled leads). Each card links to the respective module (calendar, invoices, etc.). Quick actions at top like “+ New Job” (to manually create one) and “+ New Invoice” (in case of selling a product or quick invoice not tied to job, if needed). The design uses shadcn Cards for info and possibly graphs for performance metrics.

Leads/Unscheduled Drawer: Accessible from the calendar (e.g., a button or always visible panel on large screen, or a swipe-up drawer on mobile). Lists incoming WhatsApp conversations and online bookings that need scheduling. Each entry shows summary and maybe an icon if AI has a suggestion. Tapping it opens the AI details and scheduling options (maybe via a Sheet component on mobile).

Calendar (Jobs view): The main scheduling interface. Week view (default for web, maybe day view for mobile first). Each job displayed as a colored block (color maybe per technician or per job status). Unscheduled jobs can be shown in a side list that can be dragged onto the calendar to schedule
housecallpro.com
. There’s a toggle or filter for which employees to display (could be chips for each employee that toggle their column). On mobile, likely a day view with a dropdown to pick employee or a combined schedule (or just the user’s jobs if staff). Supports pinch or zoom (if timeline view) or uses a scrolling list of times. The Job Drawer appears when clicking a job: it shows job details, an edit button for time/assignee, a “Complete Job” or “Start Job” button depending on status, and an AI Notes tab where the AI’s original suggestion and any analysis (like recommended materials) are shown. Also from the Job Drawer, if job is not done, you can trigger “On My Way” (if within an hour of start).

Job Execution (Mobile): When a plumber selects a job in the mobile app, they see a screen with three tabs: Details, Map, and Complete. Details has customer info (with call/text buttons), job description, any attached images (click to view), and perhaps a checklist if there were forms. Map tab shows the address with an “Open in Maps” button for navigation. Complete tab (visible when job is in progress or done) has the “Start Timer/Stop Timer” for tracking time, a field to add materials used (with autocomplete from a list of common items and their prices), a signature capture button (if enabled), and finally a “Mark Complete” button. Once Mark Complete is pressed, it transitions to the invoice flow.

Invoice Editor: If voice input is used, the transcript appears for confirmation first (“You said: ... [Edit Text] or [Regenerate]”). Then the draft invoice is shown: a list of line items in a table form. Each line has description, quantity, unit price, VAT%, and line total. User can add/remove lines (e.g., if AI missed something). The UI calculates subtotal, tax, total in real time. It also shows customer info (editable if needed) and invoice date/number (not editable if coming from external provider, except maybe date). Possibly show a dropdown for Invoice Medium: WhatsApp or Email or Both. Once saved, show a preview PDF (maybe a thumbnail or link “Preview Invoice”). Then “Send Invoice” sends via chosen channels and finalizes it. If Moneybird is integrated, some fields might be locked (like invoice number) because it’s generated after creation. We should reflect any errors from provider (e.g., missing customer address causes Moneybird API error – catch and ask user to fill address).

Invoices List: A page with all invoices in a table: number, date, customer, amount, status (sent/paid/overdue). Can filter by status or search by customer. Clicking an invoice opens a detail view: shows the PDF (embedded or link), line items, payment status, and actions like “Copy Payment Link”, “Resend via WhatsApp” or “Mark as paid” (if needed to manually reconcile). If integrated with external, maybe also a “View in Moneybird” link for transparency. Overdue invoices might be highlighted.

Customers Module: A list of customers with search. Each customer detail page shows contact info and a timeline of their interactions: jobs done, invoices, and messages (if we want to display conversation history). Possibly allow initiating a new job for that customer from here.

Settings & Templates: Pages for organization settings (business details for invoice, working hours, team members invites, integration toggles for Moneybird/Calendar), and a Template Manager for WhatsApp templates (FR11) where they can create/edit message templates with placeholders and see status.

Team & Availability: Perhaps a calendar-like view of team availability or a simple list of who’s on vacation (if we track time-off). At least ensure the calendar doesn’t schedule someone on their day off – could integrate a simple availability per user (maybe via Clerk or our DB).

Interaction Patterns

Drag and Drop (Schedule): Implement with visual feedback; use a library or native DnD. If a job is dragged to another day/tech, the system should ask for confirmation or instantly apply depending on context (maybe instant for same-day/time move, confirm if moving far out or to different tech with notification). Provide undo for drag-drop (e.g., a toast “Job moved – Undo”).

Confirmations and Dialogs: Any destructive action (cancel job, delete something) gets a confirmation dialog (using shadcn Dialog component) to prevent accidents. Also, when moving an appointment that has dependencies (FR16), use a Dialog to confirm applying to all.

Optimistic UI: For actions like marking complete or sending invoice, show immediate feedback (e.g., change status to Completed and maybe disable some buttons) while the server processes, then confirm success or show error. Use loading spinners on buttons that perform network actions (like Send Invoice).

Notifications: Use a toast system (shadcn Toast) to show success/error messages. E.g., “Invoice sent to customer!” or “Error: WhatsApp message failed to send. Click to retry.” Provide actionable toasts where possible.

AI Feedback Loop: After an AI suggestion is accepted or modified, perhaps prompt the user “Was this suggestion helpful?” with thumbs up/down. This is optional, but could feed our improvement loop (not mandatory for MVP, but something to consider if time).

Keyboard Accessibility: Ensure one can navigate through list and calendar via keyboard (arrow keys to move day to day, enter to open job, etc.). Especially the web app should not trap focus or require mouse.

Mobile Gestures: Possibly implement swipe gestures: e.g., swipe job card to mark complete or swipe lead to archive. But that can come later. At least ensure scroll views don’t conflict with drag (maybe a handle for dragging unscheduled jobs).

Visual Design & Branding

The design should use a clean, modern style (Tailwind + shadcn defaults: likely a neutral gray background, white cards, primary color maybe a blue or green that matches plumbing theme). Use icons from Lucide or similar for quick recognition (e.g., a wrench icon for jobs, a chat bubble for WhatsApp leads, a calendar icon for schedule tab).

For status, use clear badges (e.g., a red “Overdue” badge on invoices, green “Paid” badge; for jobs, maybe color border by urgency or status: emergency jobs with a red left border). Ensure high contrast for these badges.

Make liberal use of shadcn components: their Sheet is great for mobile drawers, Command Palette could be a power-user feature (type “New job” to create one quickly), DataTable for invoice list etc. This accelerates development and ensures consistency.

Follow the Salonized/Jobber vibe for the calendar: a polished, slightly pastel color palette, legible text on events, and no overly tiny fonts.

Performance & Validation Considerations in UX

To keep the UI responsive, load heavy components asynchronously. E.g., don’t load the PDF preview until user clicks “Preview Invoice”. Use skeleton loaders for calendar and lists if needed while data fetches.

All forms (like scheduling or invoice edit) should validate inputs in real time: e.g., if user tries to set an appointment in the past, show error immediately; if an invoice line has empty description, highlight it.

We will implement comprehensive client-side validation for convenience, but always mirror it on server with Zod to enforce (never rely solely on front-end validation).

Integration Blueprint

This section outlines how different systems and components will interact in our solution:

System Architecture: A Next.js (App Router) front-end served on Vercel with a Node.js backend (serverless functions or edge functions for quick response, plus possibly a persistent Node process for Temporal workers). Supabase Postgres as primary DB for all business data, Supabase Storage for file uploads (images, PDFs). Temporal (could be hosted or tRPC-based) for orchestrating background workflows like sending reminders or cascading reschedules. External APIs: WhatsApp (Meta) for messaging, Google APIs (Maps for geocoding/ETA, Calendar for sync), Moneybird (or chosen accounting) for invoices, Mollie for payments.

Data Flow (WhatsApp Lead to Job): WhatsApp webhook → our API (/api/webhooks/whatsapp) → validate signature → parse message → store in conversations table and perhaps leads table → trigger AI Brain (via internal function call or queue job) → AI produces suggestion → store suggestion in ai_recommendations table linked to the lead. The front-end subscribed (maybe via Supabase realtime or just polling the Unscheduled list) sees new lead, shows it with “AI Suggestion ready” indicator. Plumber opens it, confirms → front-end calls tRPC createJobFromLead(leadId, overrides) → server creates job, marks lead as handled, returns success. That job now appears on calendar.

Data Flow (Booking Widget to Job): Booking form (could be a separate Next.js page or a static widget posting to an endpoint) → our endpoint creates a lead or tentative job similarly. If we host a separate site for booking, ensure CORS and CSRF properly handled.

Scheduling & Calendar: The front-end likely uses a React calendar library (Schedule-X provided or custom). We fetch events (jobs) for the current view via tRPC (with org and maybe filter). Drag-drop triggers a client event which calls tRPC rescheduleJob(jobId, newTime, newAssignee) etc. Server checks constraints (not overlapping unless allowed, etc.), updates DB. Then via subscription or the returned result, UI updates.

Temporal Workflows: Define workflows for things like Reminder workflow (scheduled at job creation to run at reminder time to send WhatsApp template), Invoice payment check (if needed to follow up on unpaid after X days), Reschedule cascade (maybe not needed as a separate workflow if done synchronously, but if we want to ensure notifications in order, could use it). Each workflow is triggered by events (job scheduled, invoice sent, etc.), possibly via direct call in code or via DB triggers + webhook to worker. Temporal ensures retries and ordered execution (e.g., send “reminder 1 day before” exactly at right time).

Integration with Moneybird: Use their REST API to create contacts (if new customer) and create invoice. Moneybird will return invoice details (including PDF link). We can either download the PDF into our storage or just store the link (but link might require auth – better to download and store for quick access or use Moneybird’s embedded viewer if any). This call happens during FR5 when sending invoice. If Moneybird is not connected (maybe plumber hasn’t provided API token), we fallback to our own numbering (maybe using a simple counter in our DB). However, since a goal is to avoid internal numbering, we should encourage connecting to at least a free Moneybird account or similar. Alternatively, could integrate a simpler provider like WeFact or use an open-source library for numbering – but that conflicts with the principle. For MVP, Moneybird integration is primary for invoice compliance.

Google Calendar Sync: If user connects (OAuth flow for Google), we subscribe to their calendar or simply create events on their calendar via API when jobs are scheduled. Two-way sync: if they move something on Google Cal, we’d need to catch that via webhook or polling – might be complex, so maybe one-way (our → Google) for now. But mention in PRP that rescheduling flows include updating Google Cal (phase 2 in-scope likely means at least basic sync).

Mollie Webhook: Mollie calls our /api/webhooks/mollie when payment status changes. We verify signature, then mark invoice paid in DB if status = paid, also update in external invoicing system if needed (Moneybird could also get a payment logged via their API, but optional). Then trigger any follow-ups: e.g., send a “Thanks for payment” message or simply reflect in dashboard. Perhaps also consider partial payments or expired payments (Mollie link can expire after certain time).

AI Model Improvement: We will capture AI interactions in a dataset. Perhaps use Supabase to log each suggestion with outcome (accepted/edited/rejected). Later, offline, those could be used to fine-tune a custom model or at least adjust prompts. Not an immediate integration to implement now, but design the system to log needed data (conversations, suggestions, final job data) with personal info stripped so we can feed it into model training respecting privacy.

Continuous Deployment: Use Vercel pipelines and possibly GitHub Actions (with Semgrep scans integrated as MCP suggests). Automated tests run on CI (especially important if we use Playwright for E2E as indicated).

Validation & Testing Strategy

We will employ a multi-layer testing approach:

Manual Testing Checklist: Before release, a human will go through key flows (as enumerated below):

Send a WhatsApp message as a customer; verify it appears in Unscheduled leads with correct content and that any image can be viewed.

See that an AI suggestion is generated for it. Click “Apply” and ensure a new job is created with those details on the calendar.

Assign the job to a different employee and verify that the employee can see it (and the original owner maybe gets a notification). Ensure staff cannot assign jobs to others (try as staff – should be prevented).

Mark job as complete and go through Voice Invoice. Speak an example, get the draft invoice, adjust something, send it. Verify the WhatsApp message with payment link is received by the customer.

Simulate clicking the Mollie payment link and paying (or call the webhook manually) – ensure invoice status flips to Paid and that the dashboard updates to remove it from “pending invoices”.

Check audit logs for these actions (AI suggestion, job create, invoice send, payment) are present.

Test on mobile: navigate the app as a plumber, ensure one-hand usability (important buttons reachable) and that no console errors or broken layouts occur.

Try the booking widget: submit a request, see it in leads, schedule it, etc.

Turn on live tracking, mark a job started and On My Way, verify the customer got ETA, and that map updates on dispatch view.

Use a long text or a weird phrase in WhatsApp to test AI robustness (does it handle Dutch slang or send a fallback message?).

Automated Unit Tests: Write unit tests for critical pure functions: e.g., VAT calculation logic (21% vs 9% totals), AI JSON validation (feed sample outputs to our Zod schema), webhook signature verification, and any scheduling conflict checker. These ensure each piece works in isolation.

Integration Tests: Simulate flows at a slightly higher level: e.g., call an API endpoint with a fake WhatsApp payload and see that a job is created in the DB (with an in-memory or test DB). Use the Playwright testing as indicated by MCP integration to simulate an end-to-end scenario in a headless browser. For instance, we could use Playwright to:

Open the dashboard,

Trigger a fake WhatsApp webhook via fetch (as in MCP example),

Verify the UI shows the lead and AI suggestion,

Click confirm to create job,

Then simulate completing it and so on. This is ambitious but possible; at least cover the main flow.

E2E Testing Environment: We can run a staging environment with test API keys (WhatsApp sandbox, Mollie test mode) to do full E2E tests. For example, ensure an actual WhatsApp message can be received and responded to (that requires Meta approval etc., maybe done manually).

Performance Testing: Possibly use scripts to add, say, 100 jobs and see calendar performance, or simulate 10 concurrent leads to see if any race conditions. Ensure P95 latencies meet our targets by profiling (could use artillery or k6 for simple load test on APIs).

Usability Testing: If possible, get a real plumber to beta test the app in real-life scenario and give feedback on UX (not exactly part of testing strategy here, but a part of validation of our assumptions).

Regression Tests: Each new feature, add tests. E.g., when adding recurring jobs, test that one-off jobs still work, etc. Use version control with CI to run test suite on every commit.

By combining manual, unit, integration, and E2E tests, we aim for a high confidence level (implementation readiness 10/10) before deploying. The MCP’s Playwright and other integrations have already saved dev time so we can focus on these tests. We target >= 80% unit test coverage on critical server code (if measuring).

Performance Budgets

We set specific budgets to ensure the app remains performant:

AI Suggestion Response: < 2 seconds for 90% of cases. This is measured from the time a message webhook is received to the time an AI suggestion is stored and ready. We will achieve this by prompt optimization and possibly using a smaller/faster model for extraction (or sending partial info as it’s ready).

Voice Invoice Turnaround: < 5 seconds from finishing speech to invoice draft shown. This includes transcription and invoice generation. If network latency to OpenAI is a problem, consider local processing for STT or streaming partial results.

Calendar Load: < 1 second to render the week view with up to 50 jobs. Use lazy loading if needed (load only current week’s events initially).

App Load (Time to Interactive): < 3s on mid-tier mobile (for the main dashboard screen). Optimize bundle and use SSR for initial content.

Background Jobs: Reminders and webhooks should be processed within a minute of scheduled time at worst (preferably seconds). E.g., if a reminder is set for 10:00, it should be sent by 10:00 ± a few seconds.

Memory/CPU: The app should not freeze or consume excessive memory even with large data. For example, loading 1000 past jobs for analytics might be heavy – we’d paginate or aggregate on server to send small payloads.

We will continuously monitor these budgets via APM tools and real user monitoring (maybe using something like Vercel Analytics or custom). If any metric drifts (say AI suggestion starts taking 4s average), we’ll investigate model or code changes.

Deployment & Rollout Plan

(While not explicitly asked, typically a PRP might outline how to roll out features, so adding briefly:)

We will implement in phases, feature-flagging the advanced ones if needed:

Phase 1 (Core MVP) – Basic WhatsApp intake, manual schedule, voice invoice, Mollie payment – delivered first to get a working vertical slice.

Phase 2 (Enhancements) – Gradually enable GPS tracking, booking portal, etc., possibly behind beta toggles for testing. For example, test live tracking with one user before broad enabling.

This approach ensures stability. We’ll gather user feedback after Phase 1 release to adjust priorities in Phase 2.