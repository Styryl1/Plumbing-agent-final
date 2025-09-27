Epic: Plumbing Agent MVP – Slices Breakdown
S0 — WhatsApp Webhook Foundation (Dual-Number Setup)

📌 Objective: Establish base infrastructure and configuration for WhatsApp integration, supporting a two-number (customer & control) model for each organization.

📂 Scope:

CREATE:

src/lib/feature-flags.ts (feature toggles like WHATSAPP_ENABLED, DUAL_NUMBER_MODE, AI_ANALYSIS_ENABLED, etc.)

src/lib/env-whatsapp.ts (validate env vars for WhatsApp API keys, phone IDs, HMAC secrets for both numbers)

src/server/db/sql/020_whatsapp_foundation.sql (add base tables: e.g. whatsapp_account for org’s phone IDs/tokens, initial customers table if not existing)

EDIT:

src/server/db/schema.sql (include new tables and needed columns like org_id in relevant tables)

src/pages/_app.tsx or layout (to initialize feature flags context if needed)

DON'T TOUCH:

Existing auth/Clerk config (assume orgs already set up)

⚙️ Commands:

Add .env entries for WhatsApp credentials (two phone numbers, verify tokens) and run DB migrations.

Use a test webhook payload to ensure env parsing and logging works (without processing logic yet).

pnpm check to verify new env/flag schemas pass validation.

🚨 Escalate:

Any misconfiguration of environment secrets (the slice should fail fast if tokens are missing or invalid format).

Data model changes that might conflict with existing tables (coordinate additive schema changes carefully).

🔐 Rules:

Implement multi-tenancy: all new tables link records to org_id (use Clerk org ID) for isolation.

No secret keys on the client – WhatsApp tokens and secrets must remain server-side.

Respect GDPR from the start: do not log full message contents in plaintext (placeholder or hashed logging for PII).

Feature flags default to off (e.g. WhatsApp integration inactive until explicitly enabled).

📋 Acceptance Criteria:

 Environment Config – Two distinct WhatsApp numbers are configurable (e.g. WA_BUSINESS_NUMBER_ID for customer chats, WA_CONTROL_NUMBER_ID for internal AI chats), and the app fails to start with a clear error if any required config is missing.

 Feature Flags – Toggling WHATSAPP_ENABLED on/off globally enables or disables all WhatsApp-related functionality at runtime (e.g., webhook routes do nothing if off).

 Data Model Ready – Database migrations apply without error, creating base tables for WhatsApp integration and linking them to organizations (e.g. storing phone IDs, webhook tokens).

 Logging & Monitoring – A basic logging utility (e.g. whatsappLogger) is in place to capture webhook hits and errors (with no PII) for debugging, and a health-check endpoint (if applicable) returns 200 OK when WhatsApp integration is enabled.

 Dual Number Schema – Data structures anticipate two numbers: for each org, we can store/access both the customer-facing number and the plumber control number (e.g., in whatsapp_account table or Clerk metadata).

 Security – Default webhook secret and any API keys are stored securely (not hard-coded) and environment validation ensures they meet expected length/format (e.g., 32+ char secret) on startup.

S1 — WhatsApp Webhook Infrastructure

📌 Objective: Receive and process inbound WhatsApp messages from both the customer number and control number with secure verification and idempotent handling.

📂 Scope:

CREATE:

src/app/api/wa/customer/route.ts – API route to handle incoming messages from the customer-facing WhatsApp number

src/app/api/wa/control/route.ts – API route for the plumber-facing control number messages

src/server/services/whatsapp-webhook.ts – Service logic for parsing WhatsApp webhook payloads (signature check, event routing)

src/server/db/sql/021_whatsapp_inbox.sql – Migration for message storage (e.g. whatsapp_messages table with fields for org, from/to, content, media URL, timestamp, etc.)

EDIT:

src/server/api/root.ts – Register new webhook routes if needed (for testing or tRPC context)

src/server/services/whatsapp-client.ts – (If existing or created) helper to call WhatsApp Cloud API for media download or sending messages, updated with proper auth tokens

DON'T TOUCH:

UI components (no UI yet, this is backend infra)

⚙️ Commands:

Simulate incoming webhooks using curl or a tool (with example JSON from WhatsApp) to each endpoint and observe logs/DB entries.

Use known test media URLs to ensure the media downloader in whatsapp-client saves files to storage (e.g. Supabase storage or local).

Run pnpm check after implementing handlers and ensure type safety (e.g. request body types match WhatsApp API specs).

🚨 Escalate:

HMAC Verification failures: if signatures don’t match, ensure immediate 401 response (no processing) – double-check using Meta’s docs for signature calculation.

Duplicate message delivery: WhatsApp may retry webhooks – must detect and ignore dups (e.g. via WhatsApp message ID or a dedupe key in DB).

Media URL expiration: downloaded media should be stored immediately; if URL is expired, log error and ensure the system can request again via API if needed.

🔐 Rules:

Use HMAC SHA256 verification for webhook payloads using the token from env – no processing unless signature is valid.

Idempotency: assign each inbound message a UUID or use WhatsApp message_id; skip processing if it’s already in the database.

Server-only: All webhook logic and media downloads run on the server side – do not expose any tokens or raw webhooks to the client.

No PII in Logs: When logging incoming messages, never include the full text or images of customer messages in plain text; just log message IDs or truncated info for traceability.

Org Resolution: Determine org_id for incoming messages – e.g., by mapping the WhatsApp phone number (which identifies the plumbing company) to the organization in our DB – and ensure messages are tagged with the correct org.

24h Window Awareness: Mark incoming messages with a timestamp to later enforce template usage if responding after 24h (but actual response handling in later slices).

📋 Acceptance Criteria:

 Secure Webhooks – Both POST /api/wa/customer and POST /api/wa/control endpoints accept and verify webhook payloads from WhatsApp. Given a valid incoming message with correct X-Hub-Signature, when the request is received, then the server validates the signature and processes the content. Requests with invalid signatures are rejected with HTTP 401.

 Customer Message Ingest – When a customer sends a WhatsApp message (text or image) to the business number, then a corresponding record is created in whatsapp_messages (or related) table linked to the correct org and customer. New customer phone numbers trigger auto-customer creation (e.g. a customers record with at least phone number, and name if available from message or WhatsApp profile).

 Plumber Control Ingest – When a plumber (staff) sends a WhatsApp message to the control number, then the system recognizes it as an internal message (by phone or org mapping) and logs it. (For MVP, such messages can be acknowledged or stored for context, even if full AI response workflow is limited.)

 Idempotent Handling – Given WhatsApp may retry the webhook for the same message ID, when a duplicate event arrives, then the service detects it (by message ID or a dedupe key) and does not create duplicate records or perform actions twice.

 Media Download – When a customer sends an image, then the system uses the WhatsApp API to download the media file and store it (e.g. in Supabase storage or an S3 bucket) with a reference URL in the message record. The media is accessible for later AI analysis. Expired URLs are handled by requesting a new download via API if needed (ensuring success if within a short time of receipt).

 Session Tracking – Incoming messages update a conversation’s last-received timestamp. (For future use: the system can determine if a reply is within 24h session or requires a template.) This criterion is met if each message record notes its received_at and we have a way to compute session age for outgoing messages.

 Performance – Webhook processing is efficient. When 10 messages arrive in quick succession, then the system processes them with P95 latency < 2 seconds each and without timeouts. All endpoints return a 200 OK quickly after queuing any longer processing (e.g. download tasks) to avoid blocking the webhook response.

 Unit Test – A simple unit test (or simulated call) for the HMAC verification passes (e.g., using a known sample payload and token to ensure our implementation matches the expected signature from WhatsApp docs).

S2 — AI Triage Engine & Learning Events

📌 Objective: Automatically analyze incoming WhatsApp conversations (text and images) to generate structured job suggestions (issue, urgency, materials, etc.), and lay the groundwork to capture plumber feedback for continuous learning.

📂 Scope:

CREATE:

src/server/services/ai/analyzer.ts – Core logic to process message text and images using AI (Vercel AI SDK v5 or OpenAI) and produce a structured recommendation (AIRecommendation).

src/server/services/ai/prompts.ts – Prompt templates and function-call definitions for triaging plumbing issues (e.g. prompt for extracting {issue, urgency, materials, labor_hours, suggested_time}).

src/schema/ai-types.ts – Zod schemas and TypeScript types for AI outputs (e.g. AIRecommendationSchema matching the JSON structure expected from AI).

src/server/db/sql/022_ai_recommendations.sql – Migration for ai_recommendations table (store AI suggestion data, confidence score, link to source message or job, and a status/feedback field).

EDIT:

src/server/api/routers/ai.ts – tRPC router (or Next API route) to expose AI analysis functions (if needed, e.g. for on-demand re-analysis or debugging).

src/server/services/whatsapp-webhook.ts – Integrate call to ai/analyzer.ts when a new customer message arrives (after saving message, trigger AI analysis asynchronously).

src/server/db/sql/021_whatsapp_inbox.sql – (If needed) ensure message table can reference an AI recommendation ID or has fields for AI triage status.

DON'T TOUCH:

UI (the results will be visible in a later slice, here we focus on backend analysis)

⚙️ Commands:

Use a curated set of sample messages (including text descriptions and image references) to test the analyzer: run the analyzer on these and validate outputs against expected results.

Run pnpm check to ensure the Zod schemas and types are correctly integrated and that no TypeScript errors occur when calling AI functions.

Simulate a plumber editing a suggestion: manually call a feedback function (if any) or at least insert a sample feedback in DB to ensure the schema can accommodate it.

🚨 Escalate:

AI Misinterpretation: If the AI returns incomplete or ill-formatted data (e.g. missing fields or hallucinated content), ensure the analyzer catches schema validation errors and defaults gracefully (e.g., low confidence or marks recommendation as needing human review).

Performance: If image analysis or large language model calls are slow (>3s), consider using streaming or a simpler model for MVP and log any timeouts.

Privacy: Images might contain sensitive info – ensure they are not sent to external APIs without proper handling (use reputable AI API, and note for GDPR if needed).

Multilingual edge cases: Most input will be Dutch; ensure the prompt or model can handle Dutch descriptions (or translate internally) so that triage accuracy remains high for Dutch messages.

🔐 Rules:

Zod Validation: All AI outputs must be validated with Zod schemas. The system should never trust raw AI JSON – if it doesn’t conform, log an error and treat the recommendation as unconfirmed.

No Auto-Actions: The AI can propose but not decide. Ensure that any scheduling or messaging action based on AI suggestion is gated behind explicit plumber approval (to be handled in later slices).

Logging: Record AI operations in the audit log (slice S11 will formalize this) – log when an AI suggestion is generated, including AI model used and confidence, but do not log full customer PII in prompt or response.

Learning Events Structure: Prepare to capture learning events – e.g., define a placeholder in ai_recommendations for feedback or a separate ai_feedback table. A “learning event” will record how the plumber’s final decision differed from the AI suggestion (e.g., plumber changed the suggested time from 2h to 4h). This slice sets up the data model for that even if the actual recording happens in UI slices.

AI Config: Use the Vercel AI SDK’s function calling mode if available to directly get a JSON response. Have fallback logic (e.g., second attempt or simpler prompt) if the primary model fails or returns an error.

Dual Language: Ensure the AI prompt explicitly allows Dutch and English input. The output should be in a structured format (English field keys, but content like issue description can remain in the customer’s language for consistency).

📋 Acceptance Criteria:

 Triage Data Extraction – Given a new customer inquiry (text and/or image) saved in the system, when the AI analyzer service runs, then it creates an AIRecommendation entry containing the parsed fields: e.g. issue description, urgency level (normal/emergency), materials (if any), labor_hours estimate, and suggested_time window. All expected fields are present and meet validation (e.g. labor_hours is a number, materials is an array of objects with name/qty).

 Accuracy (Benchmark) – On a set of 10 sample issues (with known outcomes), at least 8 receive reasonable AI proposals. For example, given a Dutch message “Water lekt onder de gootsteen” with a photo of a pipe leak, when analyzed, then the AI outputs something like {issue: "leaking sink pipe", urgency: "medium", materials: ["PVC coupling"], labor_hours: 1, suggested_time: "today 16:00-18:00"}. Minor deviations are acceptable, but structure must be correct.

 Schema Validation – When the AI returns a response, then it is validated against the Zod schema. If any required field is missing or type-mismatched, then the system marks the recommendation as invalid (and perhaps queues a fallback attempt or flags it for manual input). This is demonstrated by forcing an incorrect AI response in testing and seeing the system reject it safely.

 Stored for Review – The AI-generated recommendation is attached to the corresponding lead record: e.g. the unscheduled job or message now has a reference to an AIRecommendation. Plumbers will later see this suggestion in the UI. The suggestion includes a confidence score or similar indicator if provided by the AI model.

 Learning Event Capture (Design) – The system is ready to record plumber feedback: Given an AIRecommendation exists, when a plumber either accepts it as-is or modifies any details during scheduling, then the differences (e.g. changed time or added materials) are intended to be saved for model improvement. (For MVP, these events can be logged to the DB with a feedback field or separate table, even if not yet used by an AI retraining process.)

 No Auto Scheduling – The AI triage does not auto-create jobs without plumber input. This is validated by observing that after AI runs, jobs remain unscheduled (in a leads list) until an explicit confirm action (in later slice).

 Performance – AI analysis (text + image) completes typically in < 3 seconds per inquiry (P95). Large images (e.g. a 5 MB photo) are processed under 5 seconds. If the AI service times out or exceeds limits, the system handles it by marking the suggestion failed (with no crash) and surfaces a “AI proposal not available” state for that lead.

 Logging & Audit – Each AI suggestion generation event is logged (with timestamp, which user/org, and success/failure). We can verify an entry in the audit log (from S11) or in console logs for development that “AI suggested [issue] with confidence X” appears when a lead is processed.

S3 — Unscheduled Leads Drawer & Apply Flow

📌 Objective: Provide a UI for new incoming leads (WhatsApp conversations) so the plumber can review AI proposals and convert them into scheduled jobs or dismiss them, with minimal effort.

📂 Scope:

CREATE:

src/components/leads/LeadsDrawer.tsx – A slide-out drawer or panel listing all unscheduled leads (new customer requests) with summary info and AI suggestion.

src/components/leads/LeadCard.tsx – A small card or row component for an individual lead, showing customer name/number, message snippet or photo thumbnail, and AI-proposed issue/urgency. Includes an “🧠 AI propose” indicator or button.

src/components/leads/LeadDetailsModal.tsx – Modal or sheet to view/edit a lead in detail: allows plumber to adjust suggested fields (time, duration, etc.) before confirmation.

src/server/api/routers/leads.ts – tRPC endpoints for reading leads list (filtering jobs or messages with status unscheduled) and updating/confirming a lead into a job.

EDIT:

src/app/(dashboard)/jobs/page.tsx (or appropriate dashboard home) – Include a button or icon to open the “Unscheduled Leads” drawer. Possibly show a badge with count of waiting leads (matching “AI proposals waiting”).

src/server/db/sql/023_jobs_schema.sql – Migration update for jobs table if needed (e.g., add a status field if not present, to mark unscheduled vs scheduled, and fields for proposed vs confirmed time).

src/i18n/en.json & src/i18n/nl.json – Add microcopy strings (e.g., “New Leads”, “AI Suggestion”, “Confirm Job”, “Dismiss Lead”) in both English and Dutch.

DON'T TOUCH:

The Calendar UI (separate slice handles the scheduling view; here we focus on turning a lead into a job entry).

⚙️ Commands:

Trigger the UI by simulating incoming leads: insert a fake lead (or use an existing one from S1/S2) in the database and run the app to ensure it appears in the drawer with correct info.

Interact with the drawer in a browser: click “confirm” on a lead, pick a time, and see that it disappears from leads and appears on the calendar (will require S4 integration).

Run pnpm check and pnpm guard to ensure all new UI and API pieces are type-safe and following project conventions.

🚨 Escalate:

Race conditions: Two staff users might attempt to schedule the same lead – ensure that confirming a lead is atomic (e.g., use a transaction or status flag to prevent double-booking or duplicating jobs).

Data consistency: If the AI suggestion is outdated or the customer sent more messages, ensure the lead detail view updates (maybe allow refreshing the suggestion with “AI propose” again if new info came).

Permissions: Only users in the org should see its leads; verify a staff cannot see other orgs’ leads (covered by org context in queries).

Dismissing leads: If plumber decides not to schedule a lead (spam or customer went away), do we handle that? Possibly mark as “dismissed”. Not explicitly in scope, but ensure UI can remove a lead without scheduling if needed (and audit it).

🔐 Rules:

Mobile-first UI: The leads drawer and modals should be usable on mobile screens (e.g., full-screen sheet on mobile, side-drawer on desktop). Use shadcn/ui components (Drawer/Sheet, Card, etc.) to maintain accessibility and styling consistency.

Dutch Localization: All microcopy visible to the user (plumber) should be available in Dutch (nl-NL). For MVP we can hard-code Dutch text if needed, but ideally use i18n keys (with English fallback). Example: button text “Bevestigen” (Confirm) and “Negeren” (Ignore) for Dutch UI.

Optimistic UI: When plumber confirms a job, update the UI immediately (remove from leads list, etc.) while the backend processes. Use a loading state on confirmation buttons and handle errors (e.g., if scheduling fails due to conflict, show an error message).

No Fake Data: The leads drawer must reflect real data from the DB (messages and AI suggestions inserted by prior slices). Do not use placeholder leads in production; ensure integration with backend is solid.

Audit Trail: Each action in the leads UI should generate an audit log entry. E.g., confirming a lead to a job logs “Lead #123 scheduled by [user] at [time]” and capturing any AI edits (for learning event). Dismissing a lead logs a “rejected” event with reason if provided.

Apply Flow: The act of confirming a lead into a job (“Apply” the AI proposal) should either create a new job or update an existing one. If the lead corresponds to an existing customer and perhaps an open job thread, ensure we don’t duplicate customers or jobs. In MVP, treat every confirmed lead as a new job unless plumber explicitly merges with an existing (merging is out of scope, likely).

📋 Acceptance Criteria:

 Lead List Display – Given there are unscheduled leads in the system (customer messages that have not been handled), when a user (plumber/owner) opens the Unscheduled Leads drawer, then each lead is listed with key info: Customer name (or phone if name unknown), the timestamp of the last message, and the AI-proposed summary (issue and urgency). For example, a lead might show “John Doe – Leaking sink (Urgency: High) – received 10m ago”. The drawer clearly indicates how many leads are waiting (e.g., “New Leads (3)”).

 AI Proposal Visibility – For each lead, the plumber can see an “AI proposal” icon or toggle. When the plumber clicks on a lead, then a detail modal shows the full AI-proposed job details: e.g., Issue description, Estimated hours, Materials, Suggested timeslot. If the AI suggestion is not available or was invalid, the UI shows “AI proposal not available” and possibly offers a button “🧠 AI Propose” to retry analysis.

 Confirming a Job – Scenario: Convert lead to scheduled job. Given an AI suggestion for a lead, when the plumber clicks “Confirm Job” (or similar) on the lead detail, and selects/adjusts a time slot and assignee (if needed), then the system creates a Job entry with status “scheduled” and the chosen date/time. The lead is removed from the unscheduled list. The new job appears on the calendar (verified in S4) and is visible to the assigned employee. Acceptance: the lead drawer count decrements, and an audit log is created (e.g., “Lead #123 confirmed as Job #456 scheduled on 12 Oct 10:00”).

 Editing AI Suggestions – Scenario: Plumber tweaks the plan. Given the AI proposed 2 hours and “replace pipe” but the plumber decides it should be 3 hours and different materials, when the plumber edits the fields in the lead detail before confirming, then those changes are saved to the job record (overriding AI values) and a learning event is recorded (the system notes that AI estimated 2h but plumber set 3h, etc.). Acceptance: After confirmation, the job record in DB reflects the plumber’s inputs, not the original AI values, and the ai_recommendations entry is updated or linked with feedback about the change.

 Apply Without AI – Scenario: No AI available. Given a lead that has no AI suggestion (due to analysis failure or it’s a manual lead), when the plumber opens the detail view, then they see empty or manual fields to fill in (issue, schedule time, etc.) and can still confirm the job. The “AI propose” button should be available to attempt analysis if possible. Acceptance: A lead can be scheduled even if AI didn’t provide data, and no app errors occur in doing so.

 Dismiss Lead – (Optional) If the plumber chooses not to pursue a lead (e.g., spam or duplicate request), there should be a way to remove it from the list. This could be an “Ignore” button. When used, then the lead no longer appears in the drawer and is marked as dismissed in the DB (so it’s not counted in metrics). (Even if this feature is minimal, it ensures the plumber isn’t stuck with irrelevant leads.)

 A11y & UX – The drawer and dialogs can be operated with keyboard only (e.g., focus moves into the drawer, tab through lead items, pressing Enter opens detail, etc.). On mobile, the leads sheet is easy to scroll and close. Visual feedback is provided for actions: e.g., after confirming a job, maybe a toast “Job scheduled!” appears. All text is localized (Dutch for pilot plumbers) and uses clear, concise microcopy (checked by a Dutch speaker for tone).

 Security & Access – Only authorized users can view and act on leads: Given a staff (non-owner) plumber, when they open the leads drawer, then they only see leads assigned or relevant to them if such filtering is in place. (For MVP, likely all leads visible to owner and staff might see all as well since assignment hasn’t happened yet. But no cross-org data leak: a user in Org A cannot fetch leads of Org B – verified via org context in the API queries.)

 Test: Lead to Job Flow – A Playwright or manual test covers: creating a dummy lead in DB (with AI suggestion), plumber opens UI -> sees lead -> opens detail -> changes something -> confirms -> lead list count decrements -> job appears on calendar (if S4 done) -> the database shows the job and that the original lead entry is marked handled. This end-to-end path executes without errors.

S4 — Calendar UI: Day/Week View with Drag & Drop (Team Lanes)

📌 Objective: Implement a scheduling calendar interface using Schedule-X v3, allowing plumbers to view and manage jobs in day/week views with drag-and-drop rescheduling and multi-employee (team) lanes.

📂 Scope:

CREATE:

src/components/calendar/CalendarView.tsx – A Calendar component wrapping Schedule-X library, configured for week and day views. Includes drag-and-drop plugin for events.

src/hooks/useCalendarData.ts – Hook to fetch jobs from the database (via tRPC) and format them as events for the calendar, and to handle updates (e.g., on drag or resize events).

src/server/services/scheduleXAdapter.ts – (Optional) Utility to translate between our jobs data model and Schedule-X calendar events (e.g., mapping job start/end times, titles, and assigning to resource lanes per employee).

EDIT:

src/app/(dashboard)/jobs/calendar/page.tsx – Create or enhance the page that displays the main calendar view. Ensure it uses CalendarView component and allows switching between week and day modes.

src/server/api/routers/jobs.ts – Extend or create endpoints for fetching jobs (with filters like date range or employee) and updating job times/assignees (to be called when drag-drop occurs).

src/server/db/sql/024_jobs_calendar.sql – Migration if needed: ensure jobs table has fields for start_time, end_time (or duration), and an assigned employee (user) id; also ensure an index for querying by date range and org for performance.

src/i18n/en.json & nl.json – Add any calendar UI text or days/months if not auto-localized by library (likely Schedule-X can localize, but confirm Monday-Sunday labels in Dutch if needed).

DON'T TOUCH:

Google Calendar sync (out-of-scope in MVP unless trivial; focus on internal schedule management).

⚙️ Commands:

Load the calendar in development with sample jobs in DB: ensure events show up on correct dates/times and can be dragged.

Test drag-and-drop: e.g., move a job to a new day via mouse and verify in dev tools or DB that the job’s time/date got updated.

Switch to day view and verify layout on mobile vs desktop.

Run pnpm check for type safety, especially around date/time types (prefer Temporal for any date manipulation).

🚨 Escalate:

Time Zones: Ensure all scheduling uses Europe/Amsterdam time zone consistently. If using Temporal or date-fns, make sure 24h format and DST changes are handled correctly. Misalignment could cause jobs to appear at wrong hours.

Drag Conflicts: If a job is dragged to overlap another or to an impossible time (e.g., outside working hours), decide how to handle – likely just allow overlap for MVP (plumber responsible) or prevent drop with a warning.

Team Lanes UI Clutter: With multiple employees, the week view might get crowded. Ensure colors or labels distinguish each plumber’s events (maybe color-code by employee).

Optimistic vs Real Save: Dragging an event should update UI immediately; if the save to server fails (e.g., network down), we need a way to revert or notify user.

Large Data: If there are many past and future jobs, fetching all could be slow. Implement API to fetch only relevant range (e.g., current week or month) and perhaps lazy-load more as needed.

🔐 Rules:

Org Filtering: The calendar should only fetch jobs for the current organization (use the org context in tRPC calls or RLS if enabled). Under no circumstances should jobs from another business appear.

Employee Separation: Use Schedule-X’s resource calendar feature (calendars array) to represent each employee as a separate lane/resource. Each job is associated with one employee’s lane. If filtering by a single employee (e.g., a staff user might only want to see their own jobs), limit the calendars shown.

24h Format & Locale: Configure the calendar to use 24-hour time format and week starting on Monday, with Dutch labels if possible (e.g., “Ma, Di, Wo…” for days). Ensure all displayed dates/times respect nl-NL formatting conventions.

Drag-and-Drop: Integrate Schedule-X’s DnD plugin. Only allow dragging by users with permission: e.g., an owner can drag any job to reschedule or reassign (drag between lanes), whereas a staff plumber might be restricted to moving their own jobs. Enforce these rules either in the UI (conditionally allow DnD) or on drop (server double-check user’s role).

Optimistic Update: On a drop event, update the UI immediately (move the event) but also call the API to save changes (new date/employee). Use a toast or undo option if possible for quick correction.

No Overengineering: Skip advanced travel time checks for MVP – if a job is dragged to a new time that’s too close to another geographically, we won’t block it now (travel validation is deferred). Focus on basic scheduling function.

Accessibility: Provide non-drag options for rescheduling (for accessibility or precision). E.g., an edit dialog on event click where date/time can be changed via inputs, since drag and drop is not accessible to keyboard users. Ensure that this alternative exists (even a simple “Edit” button that opens a form). All calendar events should have readable labels (include customer name or address in event title for context).

📋 Acceptance Criteria:

 Week View (All Staff) – Given there are multiple jobs scheduled for the current week across different employees, when the owner views the calendar in Week mode, then they see a grid with days as columns (Mon–Sun) and timeslots rows, and each employee’s schedule is separated (e.g., separate row or column per person, or color-coded events). Events are displayed with title (e.g., customer name or job short description) and duration. For example, if Alice and Bob are plumbers, on Tuesday at 10:00 Alice’s job appears in her lane and Bob’s job in his lane.

 Day View (Single-day focus) – When the user switches to Day view (via a toggle or responsive behavior on mobile), then the calendar shows a detailed timeline for that day. If multiple employees are visible, their jobs stack or separate clearly for that day. On a phone-sized screen, the default view should likely be Day view (to avoid squeezing a full week). Scrolling is enabled to see the full day’s timeline.

 Drag-and-Drop Reschedule – Scenario: Reschedule within same person. Given a job scheduled for today at 9:00, when the user drags that job event to tomorrow 11:00 on the calendar, then the job’s scheduled time in the database is updated to tomorrow 11:00. The UI immediately reflects the event at its new time. A success indicator (like subtle highlight or a toast “Rescheduled to [date]”) confirms the change. The change is persistent on reload (data saved).

 Drag Across Employees – Scenario: Reassign to another plumber. Given an owner user viewing week view with multiple lanes, when they drag a job from Alice’s lane on Monday 10:00 to Bob’s lane at the same time (Monday 10:00), then the job’s assigned employee is updated to Bob, and the event now appears under Bob. Acceptance: in the database, the job’s employee_id (or equivalent) is changed to Bob’s id and the start time updated accordingly. The original slot under Alice is now free.

 Permission Checks – If a staff-level plumber (not owner) is logged in: when they view the calendar, then they either see only their own jobs or can see all jobs but cannot drag jobs that are not theirs (depending on product decision). For MVP, likely: a staff user sees only their own lane by default. Trying to access others’ data via API is prevented (returns empty or forbidden). This is tested by logging in as a non-owner and verifying the calendar only contains that user’s jobs.

 No Data Leakage – Given two different organizations each have jobs scheduled, when Org A’s user is viewing the calendar API or UI, then they see only Org A’s jobs. (Test by creating jobs in two orgs and ensure queries with the org context segregate them.)

 UI Performance – Calendar renders quickly. With, say, 50 jobs in the current week, when the calendar page loads, then it displays events within <500ms and interactions (drag, switching days) feel smooth (<200ms). No freezing or long blocking JS.

 Accessibility Alternative – When a user clicks or taps on a calendar event, then an event detail popup or sidebar appears with job info and an “Edit” button for date/time. This allows rescheduling via form controls. Acceptance: A keyboard-only user can tab to an event (the events should be focusable) and press Enter to open details, then change date/time via dropdown or date-picker and save, achieving the same result as drag-and-drop.

 Visual Clarity – Each employee’s jobs are visually distinct. For example, events might carry a colored tag or background unique to each plumber, consistent across views (e.g., Alice’s events are blue, Bob’s are green). If two events overlap in time (same timeslot), the calendar layout adjusts (side-by-side or stacked with clear indication) so both are readable. The design uses the shadcn/ui theming, matching the app’s overall style.

 Integration with Leads – When a lead is confirmed into a job via S3, then that new job appears on the calendar without requiring a full page reload (if possible). For instance, after confirming, the calendar data hook could refetch the latest jobs for that day. This can be verified by confirming a lead and seeing it show up in the appropriate timeslot. (This ensures slices S3 and S4 work together.)

 Testing – A manual or automated test moves a job via drag-and-drop and then queries the database (or uses the API) to verify the job’s new time and/or employee. Also test undoing a move: since we might not implement full “undo”, at least verify that another drag can move it back to original, and that two quick drags don’t break anything (i.e., moving job quickly twice only results in final position saved).

S5 — Offline-Capable Job Card (Timer & Materials Tracking)

📌 Objective: Create a mobile-first "Job Card" interface for plumbers to manage each job in the field – including a task timer, materials entry, and quick communication actions – that functions even without network and syncs when back online.

📂 Scope:

CREATE:

src/app/p/today/page.tsx – “Today’s Jobs” plumber view showing a list of that plumber’s jobs for the day (with status, start time, etc.), optimized for mobile (perhaps as the default home for a logged-in staff).

src/app/p/job/[id]/page.tsx – Job detail page (Job Card) for a specific job, identified by an ID or secure token. Displays job info and interactive controls (timer, materials, status updates).

src/components/jobcard/JobTimer.tsx – A component with Start/Stop/Pause buttons and a display of elapsed time, storing state locally so it runs offline.

src/components/jobcard/MaterialsList.tsx – A component to quickly add materials used (name, quantity, maybe price) and list them, updating totals. Possibly with a small predefined list or just free text + cost input.

src/components/jobcard/StatusActions.tsx – Quick action buttons like “🟢 On My Way” (sends WhatsApp message), “✅ Done” (mark job complete), and “📍 Navigate” (open maps to address).

src/hooks/useOfflineSync.ts – Custom hook to manage offline data: caches job data in local storage or IndexedDB and queues any updates (timer updates, materials added) to sync with server when online.

public/manifest.json and service worker (if using Next PWA plugin) – to enable installable PWA and offline asset caching (optional, if time permits for offline capability).

EDIT:

src/server/api/routers/jobs.ts – Extend with endpoints for updating job progress: e.g., an endpoint to POST time logs or materials used. Also endpoint to mark job status (in-progress/completed).

src/server/db/sql/025_jobcard_extensions.sql – Migration to add fields/tables: e.g., job_time_logs (to record start/stop times or total minutes per job), job_materials (items used, with description, quantity, cost), and possibly a status field on jobs (e.g., “scheduled”, “in_progress”, “completed”).

src/i18n/en.json & nl.json – Add microcopy for job card UI (e.g., “Start Timer”, “Pause”, “Add Material”, “On my way”, etc. in Dutch).

DON'T TOUCH:

Invoicing (next slice will handle converting these job details to invoice, but here we just collect data).

⚙️ Commands:

Test offline mode: run the app and disable network in dev tools, ensure the Job Card still loads if previously visited (simulate cached data) and that adding a material or toggling timer doesn’t crash. Then re-enable network and verify data syncs to DB.

Use Playwright or manual test on mobile viewport: start timer, navigate away, come back, ensure timer still running (or resumed correctly).

pnpm check and run any PWA build step if adding service worker to ensure no build errors.

🚨 Escalate:

Offline Sync Conflicts: If a user makes offline changes then something else updates the job on server (unlikely in single-user context, but could happen if owner edits job while plumber offline), decide a resolution strategy (MVP can be “last write wins” on reconnection, with audit log of both changes).

Timer Accuracy: Browser sleep or app closed – ensure the timer can handle being paused automatically or catch up on reopen (e.g., record start timestamp and calculate elapsed rather than relying solely on increments).

Data Storage Limits: Storing data in localStorage (5MB limit) vs IndexedDB – materials and time logs are small, so likely fine, but ensure images or large data (maybe job description or attachments) are not over-cached.

A11y on Mobile: Make sure buttons are reachable and large enough (44px touch targets). Contrast in sunlight if used outside (perhaps test on device).

Security: If using a shareable token in URL for job access (so plumber can open job link without re-login possibly), ensure it’s sufficiently long/unguessable, and maybe expire after job is done for safety. If not using token, ensure user must be logged in (Clerk session) to access job pages.

🔐 Rules:

Service Worker / PWA: If implementing, ensure it doesn’t cache sensitive data improperly. Use it primarily for offline page shell and perhaps caching recent job data. The service worker should respect authentication (perhaps only cache data for the logged-in user and purge on logout).

Local-First Updates: Use optimistic UI for job changes. E.g., tapping “Add Material” immediately shows the new item in list (with maybe a sync icon if offline). Timer should tick in UI regardless of server state; on reconnect, send the accumulated time.

Time Logging: Do not rely on client’s clock alone for final billing – when marking complete, consider sending both client-tracked duration and server-side timestamp for verification. For MVP, trust client duration but log start/stop times on server for traceability (and audit).

Material Data: Each material entry at least has a description and optionally a price. If prices will be used for invoicing, store as integer cents. If plumber doesn’t input price, default to 0 and allow editing during invoicing.

Mobile Layout: Design the Job Card UI in a single-column, big-button format for easy use in the field. Primary actions (start/stop, “Done”) should be at the bottom (thumb-accessible). Use icons + text for clarity (and include aria-labels for icons).

Status Updates: The “On My Way” or similar quick messages should integrate with WhatsApp API if possible. For MVP, tapping “On My Way” can simply deep-link to WhatsApp app with a prefilled message (using wa.me link) to send from the plumber’s phone. (If using API to send from system, ensure template usage if outside 24h. But direct plumber->customer messaging likely within 24h window anyway.) In either case, log that the action occurred (even if we can’t confirm send via link).

State Management: Use React state or context to maintain timer and materials list live. Utilize browser storage for persistence: e.g., on component mount, if a job has a running timer state stored (in localStorage), resume it. Likewise, store any unsynced materials in case of refresh.

📋 Acceptance Criteria:

 Job List Today – Given the plumber has X jobs scheduled for today, when they open the “Today’s Jobs” page, then they see a list of those jobs with key info: customer name, scheduled time, and maybe location or short description. Jobs are sorted by start time. If no jobs, show an empty state message (“No jobs for today”). This page is lightweight and loads quickly on mobile (under 1s).

 Job Card Details – When the plumber taps a job from the list (or otherwise navigates to /p/job/[id]), then they see the Job Card with: the customer’s name & address, scheduled time, and a map link (if address available); buttons for calling or messaging the customer (clicking call opens the phone dialer, clicking message opens WhatsApp chat with that customer’s number); the timer section; the materials section; and a completion action. All information (except map) is available offline after the first load.

 Start/Pause Timer – Scenario: tracking work time. Given a job is in progress, when the plumber presses “Start Timer”, then the timer begins counting up (seconds/minutes visible). The Start button turns into a “Pause” (or Stop) button. When paused, then the timer stops incrementing. The elapsed time is stored (in local state and synced to server if online). If the plumber closes the page or loses connectivity and returns, then the timer either (a) continues from the correct elapsed value (if still running) or (b) remains at the paused value. For example, plumber starts at 10:00, does work, at 10:30 they see “00:30:00” on timer, they pause it, leave the page, come back at 10:40, it still shows 00:30:00. If they resume, it continues counting up from 30:00.

 Materials Quick-Add – When the plumber clicks “Add Material”, then they can input a material name and quantity (and possibly price). For MVP, this might be a simple input field plus an “Add” button. After adding, then the new material appears in the materials list below, with its quantity. The UI immediately updates the “Total” cost if price info is present. For example, plumber adds “PVC Pipe (x2) €15 each”, the list shows “PVC Pipe – 2 pcs – €30” and total updates to €30. If offline, the material is stored locally and marked to sync.

 Offline Usage – Scenario: no internet at job site. Given the plumber opened the job card while online (data cached) and then goes offline, when they interact with the job card (start/stop timer, add materials), then all actions appear to work normally: the timer runs, materials show up in the list, etc., with no errors. A subtle indicator (like “Offline” badge) may be shown to remind them. When the connection is restored, then the accumulated offline actions (time logs, materials) are sent to the server. Acceptance: After reconnecting, the server database reflects the correct total time and materials for that job. (Test by simulating offline: add a material, come online, refresh page – the material persists meaning it was saved to DB).

 Complete Job Flow – When the plumber finishes a job, then they can tap a “Complete” or “Mark as Done” button. Then the UI might stop the timer if running, mark the job status as completed (perhaps visually or by moving it to a “done” list), and possibly prompt “Generate Invoice” (which leads into the next slice’s flow). The job is now read-only or indicated finished in the UI. Acceptance: marking complete triggers an update to the job status in DB (status = completed) and an audit log (“Job 456 marked complete by Bob at 14:32”). It also prepares the system to create an invoice (which will use the recorded time and materials).

 One-Tap Communications – The Job Card provides quick contact actions: “Call” and “WhatsApp”. When the plumber taps “Call”, then the device opens the phone dialer to the customer’s phone number (tel link). When the plumber taps “WhatsApp” (or an “On my way” preset), then either the device’s WhatsApp opens a chat with the customer (using wa.me link with the customer’s number and a pre-filled message like “On my way 👍”) or, if feasible, the system sends a template message via WhatsApp API to the customer and confirms to the plumber. Acceptance: The plumber can conveniently initiate a call or message without typing the number. If the message is sent via API (later automation), it is logged. For MVP, opening WhatsApp app is acceptable, and we trust the plumber to send it (we can’t track if they did in that case, but we log that they tapped the button).

 UI/UX & Accessibility – Visual: The Job Card UI is optimized for a smartphone screen: important buttons (Start/Pause, Complete) are large and at bottom for thumb reach. The layout uses accordions or sections for Timer, Materials, etc., to avoid scrolling too much. A11y: All interactive controls have accessible labels (e.g., the timer readout is announced, buttons have aria-label “Start timer”, etc.). Color contrast meets WCAG AA (any status color indicators have sufficient contrast on backgrounds). The page is usable via keyboard (though on mobile web keyboard nav is less common, still ensure focus order is logical).

 Data Integrity – Each piece of data recorded on the job card is saved accurately. When the plumber records 1 hour 30 min on the timer and 2 units of “Pipe”, then that exact data is what shows up later on the invoice draft (to be verified in S6). This implies that the timer data and materials are stored server-side (or in indexed cache and then server) with correct values (90 minutes, and material list with qty 2). Rounding of time (if any) or summing of costs is done as per rules (e.g., if using hourly rate, that will be applied later; here we just ensure the minutes are correct).

 Sync Conflicts – (Optional/edge) If a plumber tries to use the job card on two devices (or two people open same job), updates might conflict. For MVP, we assume one user per job at a time, but if tested: when two sessions modify a job offline and reconnect, then the last one to sync wins (and audit log captures both changes). There should be no crashing – either one update overwrites or additional material entries just accumulate. This is hard to test manually, but code review should ensure no glaring issues (like using job’s updated_at to reject stale writes, etc., if implemented).

S6 — Voice Invoice Capture & AI Draft (Speech → Invoice PDF)

📌 Objective: Enable plumbers to generate an invoice by voice. Capture a spoken description of the completed job, use AI to transcribe and parse it into an invoice draft (line items with prices and VAT), then prepare a PDF invoice for review.

📂 Scope:

CREATE:

src/components/invoice/VoiceCaptureButton.tsx – A UI component (e.g., a microphone icon button) that allows the user to record a voice note. Handles permission for mic, recording start/stop, and shows recording state (waveform or timer).

src/server/services/ai/invoiceParser.ts – Service that takes transcribed text (from speech) and uses AI (LLM with function calling or prompt) to convert it into structured invoice data: customer details (if mentioned), list of invoice lines (description, quantity, price, VAT rate per line), and possibly payment terms.

src/server/services/ai/transcription.ts – Utilize Vercel AI SDK or an API (like Whisper) to transcribe the audio recording (support Dutch and English).

src/server/services/invoiceGenerator.ts – Service to generate an invoice PDF (and/or UBL) from structured invoice data. For MVP, this can use a simple PDF library or rely on Moneybird API (if integration is ready in S7) to create a draft and fetch the PDF. If using Moneybird here is too early, use a placeholder PDF template.

src/server/db/sql/026_invoices.sql – Migration for basic invoice tracking: an invoices table to store invoice metadata (org, customer, total amount, status, provider_id etc.) and possibly invoice_lines table if needed to store draft lines (though if using Moneybird exclusively, we might not store line-by-line in our DB, just in provider).

EDIT:

src/app/p/job/[id]/page.tsx – Integrate the VoiceCaptureButton in the Job Card (e.g., visible once job is marked complete, prompting plumber to “Speak out the invoice”). Provide a section to review the AI-generated invoice draft.

src/components/invoice/InvoiceDraftReview.tsx – (Create as Edit if partially stubbed) A UI to show the parsed invoice lines and totals for confirmation/editing. The plumber can adjust any mistakes before finalizing.

src/server/api/routers/invoices.ts – Add an endpoint to create a new invoice draft (taking structured data, saving to DB and/or calling external API to generate PDF), and possibly an endpoint to get invoice PDF link or blob.

src/i18n/en.json & nl.json – Microcopy for any voice recording prompts or errors (e.g., “Listening…”, “Could not understand, please try again”, “Invoice draft ready for review”).

⚙️ Commands:

Test recording in a browser that supports MediaRecorder API: click and talk a sample sentence (“Replaced 2 meters of pipe and 1 hour labor”) and ensure the audio is captured and sent to backend.

Use a short known audio clip (maybe a pre-recorded sample in Dutch) and feed it to the transcription service function directly (bypassing UI) to validate the transcription and parser output.

Run end-to-end: start voice capture -> generate draft -> see PDF link, all in a dev environment with dummy data.

pnpm check for type consistency especially on the invoice data structure.

🚨 Escalate:

Transcription errors: Dialects or background noise could cause mis-transcription (e.g., “fifteen” vs “fifty”). We should allow easy re-record or edit. Make sure plumber can double-check the draft rather than sending directly.

AI Parsing ambiguity: The plumber might speak informally (“I replaced two pipes and spent an hour on it”). The parser must infer units and costs. If it’s unsure (missing price), better to leave a line as “TBD” than guess wrong.

VAT Calculations: Ensure each line gets a VAT rate (e.g., 21% standard in NL, or 9% for some items). If the voice input doesn’t specify, perhaps default everything to 21% and allow edit. Non-compliance with Dutch invoice rules is a risk if missed.

Performance: Large audio (like 1-minute explanation) could be big (~1MB+) and transcription via AI might be slow (>5s). This ties to NFR (voice flow <5s) – might need to stream transcription or at least show a spinner with progress.

File size / Memory: If using a client-side recording, ensure we set a reasonable max length (e.g., 60 seconds) to avoid giant files. Also, handle what happens if plumber keeps talking beyond limit (maybe auto-stop recording).

Fallback: If voice fails (user device has no mic permission or AI service down), plumber should still be able to manually create an invoice. MVP might not implement a full manual form, but at least allow typing line items in the draft review if voice input didn’t produce a good result.

🔐 Rules:

Privacy: The audio recording may contain personal data (names/addresses). Transmit it securely (HTTPS) and do not store the raw audio on our servers long-term (unless needed for debugging). If using external transcription (OpenAI Whisper via API), ensure compliance (maybe avoid sending highly sensitive info or at least mention in privacy terms).

Accuracy & Validation: Use Zod schemas for the invoice draft: each line must have description, amount, VAT%. The parser should round prices to two decimals and compute line totals and invoice total. Use integer cents internally for prices to avoid float issues.

Dutch Formatting: Format the invoice draft in locale nl-NL: use “€” and comma separators in the PDF or UI, and show dates in DD-MM-YYYY. The PDF should meet NL requirements (e.g., label “Factuur” and include BTW/VAT numbers – though those can be static from org settings).

Don’t Auto-Send: After voice capture and AI generation, present the draft for confirmation. Do not send it to the customer or Moneybird until plumber reviews and clicks send.

Integration Point: If Moneybird OAuth is connected (from S7), prefer to use Moneybird’s API to create the draft invoice and retrieve PDF (ensuring correct numbering and legal format). If not connected or in test mode, use a simple internal PDF generator (maybe an HTML template to PDF for now) so the feature is demoable. Implement a check: if Moneybird is available, route through Moneybird; otherwise, fallback to internal PDF.

Testing Strategy: Include test cases for the parser: e.g., an English voice transcription “3 hours of labor at 50 euros per hour, plus 2 Pipe segments at 10 euros each” should result in two line items (Labor: qty 3 hr @ €50, total €150; Pipe: qty 2 @ €10, total €20) with VAT perhaps default 21%. Similarly a Dutch example “1 uur arbeid, 2 meter pijp vervangen” should produce something sensible (we might need to map “uur” = hour, etc. in parser logic or rely on model’s understanding). All these should validate against the schema.

📋 Acceptance Criteria:

 Voice Recording UX – When the plumber taps the microphone button on the invoice section, then the app prompts for microphone permission (if not already granted). When permission is granted, then the plumber can speak their summary of the job. A visual indicator (such as a red recording dot or waveform) is shown while recording. When the plumber taps the button again (or “Stop”), then recording ends and the audio is captured for processing. If permission is denied or there’s no mic, an appropriate error message “Microphone access is needed to use voice invoicing” is shown.

 Transcription Accuracy – Given a clear spoken input in Dutch or English, when the audio is processed, then the transcribed text reflects the speech with high accuracy. For example, plumber says: “Ik heb twee uur gewerkt en drie meter leiding vervangen”, then the system produces a transcription like “Ik heb 2 uur gewerkt en 3 meter leiding vervangen”. Minor mistakes are acceptable, but critical info (quantities, items) should be correct. This can be tested with sample recordings.

 AI Invoice Parsing – Given a transcribed text, when the invoiceParser service runs, then it generates a structured draft invoice. For example: input “Replaced 3m of pipe (€10/m) and 2 hours labor” yields a JSON with two line items: { description: "Pipe replacement (3 m)", quantity: 3, unit_price: 10, vat_rate: 0.21 } and { description: "Labor", quantity: 2, unit_price: 50, vat_rate: 0.21 } (assuming default €50 hourly rate if not stated) and totals each line, plus overall total and tax breakdown. All numbers are validated as positive and within reasonable ranges. If something is missing (e.g., no price given for labor), the draft either uses a default or leaves it blank for edit, but does not fail.

 Draft Review UI – When the AI draft is ready, then the plumber is shown a summary of the invoice before sending. This InvoiceDraftReview should list each line item with description, quantity, unit price, line total, and VAT. The plumber can edit fields if needed (e.g., correct a price or description). Acceptance: The plumber is able to identify any errors in the draft and adjust them. The UI also shows key invoice info: invoice date (today), an auto-generated invoice number (if available from Moneybird or placeholder if not), the customer’s name/address on invoice (populated from job’s customer data), and the plumber’s business info (from org settings).

 PDF Generation – When the plumber confirms the invoice draft (e.g., presses “Generate PDF” or “Finalize Invoice”), then a PDF of the invoice is created. If Moneybird integration is active (from S7), then the invoice is created via Moneybird’s API and we retrieve the official PDF (and UBL) from Moneybird. Otherwise, then the system uses an internal template to generate a PDF. Acceptance: The resulting PDF can be downloaded or viewed, and it contains all the relevant data (line items, totals, company and customer info) meeting Dutch invoice requirements. The PDF should have correct calculations (sum of lines equals total, VAT shown per line or summary). It should use locale formatting (e.g., “€120,00” not “€120.00”). A quick check: no required field is missing (invoice number, date, company VAT number, etc., assuming those are provided via configuration).

 Speed – The voice-to-invoice pipeline is reasonably fast. From the moment the plumber stops recording to the draft being ready for review is ideally under 5 seconds for a typical 15-30 second description. (Acceptance can be qualitative: testers feel it’s “a few seconds” and not annoyingly long. If over 10s consistently, it fails this criterion.) If longer processing is needed, a loading state or spinner with messages like “Transcribing…” and “Generating invoice draft…” should be shown to manage expectations.

 Error Handling & Retry – If the transcription or AI parsing fails (e.g., due to poor audio or API error), the UI informs the user (“Sorry, I didn’t catch that. Please try again.”) and allows re-recording. Acceptance: simulate an AI failure (maybe by disabling network or forcing an exception) and confirm that the plumber sees a graceful error message and can attempt the flow again, rather than being stuck.

 Integration with Job Data – The invoice draft incorporates data from the job record: it should automatically include any materials and time tracked on the Job Card (S5) to cross-verify. For example: if the plumber logged 2 hours and 3 pipes in the job card, and the voice input mentioned those, the draft should match. If the voice input forgot something the job data has, the system could optionally warn or pre-populate missing lines. (This is an optional nicety; minimally, ensure that nothing blatantly conflicts – e.g., if job card has materials and voice invoice doesn’t, we still consider the invoice draft complete or allow adding those lines manually in review.)

 Audit Trail – When an invoice draft is generated, then an audit log entry is created (“Invoice draft #INV-1001 created for Job #456 via voice input by [user]”). If the AI made significant changes (like auto-pricing materials), perhaps note that in the log for transparency.

 Test End-to-End – As a final acceptance, a full end-to-end manual test: plumber completes a job -> uses voice to create invoice -> reviews draft -> finalizes invoice -> the invoice can be viewed as PDF and is ready to send. This process should work without developer intervention, indicating slices S5, S6, and S7 (if integrated) are connected. Verified by checking the invoice appears in the system (DB or Moneybird) and contains correct info from the job.

S7 — Moneybird Integration (OAuth, Invoice Drafting, PDF & Webhooks)

📌 Objective: Integrate Moneybird as the external accounting provider for invoices, enabling secure OAuth connection, creation of invoice drafts in Moneybird (with contacts and line items), retrieving PDF/UBL files, and handling Moneybird webhooks for updates.

📂 Scope:

CREATE:

src/components/settings/MoneybirdConnect.tsx – UI component (likely in a Settings page) with a “Connect to Moneybird” button and status. Initiates OAuth flow and displays connection status (e.g., "Connected to Moneybird account: [Company]").

src/app/api/oauth/moneybird/route.ts (or nested route for callback) – API route to handle OAuth redirect callback from Moneybird (receives auth code, performs token exchange).

src/server/services/providers/moneybird.ts – Service module with functions for Moneybird API calls: getAuthUrl(), exchangeToken(), createContact(), createInvoiceDraft(), sendInvoice() (if needed), getInvoicePDF(), getUBL(), and handleWebhook() etc.

src/app/api/webhooks/moneybird/route.ts – Endpoint for Moneybird to send webhooks (e.g., when an invoice is marked paid or a contact is updated).

src/server/db/sql/027_moneybird_integration.sql – Migration for storing Moneybird OAuth credentials and mappings: e.g., a table accounting_connections (org_id, provider = 'moneybird', access_token, refresh_token, etc.), and perhaps a table mapping our customer IDs to Moneybird contact IDs, and invoice IDs to Moneybird invoice IDs for reference.

EDIT:

src/server/api/routers/accounting.ts – tRPC router with procedures: e.g., getMoneybirdStatus (to check if connected), initiateMoneybirdOAuth, disconnectMoneybird, etc., and internal procedures to create invoice in Moneybird (called from invoice generation flow).

src/server/services/invoiceGenerator.ts – Update to use Moneybird: if org has Moneybird connected, route invoice creation through moneybird.createInvoiceDraft instead of internal PDF. This likely returns the Moneybird invoice ID and a link or triggers fetching PDF to store or send.

src/server/services/ai/invoiceParser.ts – (If needed) ensure it sets VAT rates or other fields in line with Moneybird’s expectations (Moneybird might require specific tax rate IDs or names – we might map 21% and 9% to Moneybird tax IDs if needed after OAuth, but MVP can assume defaults configured in Moneybird account).

⚙️ Commands:

Use a Moneybird test administration (sandbox or a trial account) to perform OAuth: clicking connect should redirect to Moneybird, after approval the callback should store tokens. Verify tokens are saved and secure (not exposed to client).

Create a dummy customer and invoice through the code: call moneybird.createContact and moneybird.createInvoiceDraft with sample data, and verify on Moneybird’s website that the contact/invoice appear correctly.

Test webhook handling by simulating a Moneybird webhook call (they usually allow setting a webhook URL in settings). Perhaps manually trigger an event (like mark invoice paid in Moneybird UI) and see if our webhook endpoint logs it.

Run pnpm check to ensure all new modules and types (especially external API response types) are accounted for.

🚨 Escalate:

OAuth complexity: Moneybird uses OAuth PKCE. If our app is Next.js on Vercel, ensure redirect URL is correct and we handle the PKCE verifier. If any step fails, handle gracefully (display connection error and allow retry).

Token Security: Access tokens and refresh tokens must be stored securely (likely in our DB, encrypted if possible, or at least not sent to client). They typically last a long time; ensure refresh logic is in place if needed (Moneybird tokens expire in 30 minutes by default, with refresh token to get new one). This adds complexity – consider storing expiry and refreshing automatically when calling the API. If refresh fails (revoked), treat as disconnected and prompt re-connect.

Rate Limits & API Errors: Moneybird API might have rate limits or could fail if data is invalid. For example, creating an invoice with a contact that has no address might error if required. We should validate fields (like require a customer email or address because Moneybird might). Also, ensure not to spam API calls – e.g., if syncing many invoices.

Webhooks Security: The Moneybird webhook calls should include a signature or at least a secret (though Moneybird webhooks might not have HMAC, need to check). If not, maybe restrict by IP or use a GUID in the URL. In any case, verify the payload’s invoice ID corresponds to an org we know (don’t allow updating other org’s invoices).

Multi-provider: Although out-of-scope to implement e-Boekhouden or WeFact, design the code so adding them later is easy. E.g., providers/moneybird.ts implements a generic interface defined in providers/types.ts. We can stub other providers with unimplemented methods behind flags.

Testing on Real Data: Moneybird sandbox may not exist, so might have to test with an actual Moneybird demo account – be careful not to spam real emails or invoices. Use a separate "Test" contact or mark invoices as test (Moneybird might have a test mode? If not, just don't send them out from Moneybird UI).

🔐 Rules:

OAuth PKCE: Implement the OAuth flow with PKCE (no client secret in our code, since it's a public client). Generate a secure random verifier, challenge = SHA256 etc., store verifier in session (or temporary store) until callback. On callback, exchange code+verifier for token. Do not expose tokens in logs or UI.

Store Minimal Data: We do not duplicate full invoice data in our DB. We store references and minimal metadata. Moneybird is source of truth for invoice content and PDFs. Specifically, store: Moneybird administration_id if needed, contact IDs for customers (to avoid creating duplicate contacts each invoice), invoice IDs, status (paid/draft/sent) sync, and totals for reporting. The actual PDF/UBL files we fetch on demand and don’t store permanently (or store cached copy for quick download, but consider privacy).

Error Mapping: If Moneybird API returns errors (e.g., 422 validation errors), catch them and surface a user-friendly message. For example, if connection is not authorized (token expired), notify “Connection to Moneybird expired. Please re-connect.” If invoice creation fails because a field is missing, log the error details for debugging and show generic “Failed to create invoice, please check data.”

Draft vs Send: For MVP, we likely keep invoices in Moneybird as drafts and not trigger Moneybird’s email send. We will handle sending via our system (WhatsApp/email with payment link) to maintain branding. So use Moneybird API to create the invoice and mark it as sent without emailing (Moneybird has an endpoint to send invoice or mark as sent). Mark-as-sent will finalize invoice number assignment. Use the “send method” that doesn’t notify customer.

VAT Compliance: Ensure we attach correct VAT rates in Moneybird. Likely, Moneybird requires specifying a tax rate ID per line (which depends on the administration’s settings). For simplicity, if all lines use 21%, we can fetch the default 21% tax rate ID from Moneybird on connect (or hardcode if stable) and use it for all lines. Similarly for any reduced rate if needed (maybe 9% for labor or materials if applicable in NL). Possibly allow configuration of which VAT rate to apply if not sure; but MVP can assume standard rate for everything unless clearly a different category.

Contact Sync: On invoice creation, ensure the customer exists in Moneybird. Implement createContact to add new contacts with name, address, email, phone as available. If the customer was already synced before (we can store a mapping of our customer_id to Moneybird contact_id in our DB), reuse that to avoid duplicates. If phone is the only identifier, consider that Moneybird might not allow duplicate names; perhaps use phone/email to search existing contacts via Moneybird API before creating a new one.

Feature Flags: Wrap Moneybird functionality behind a flag (e.g., INVOICING_MONEYBIRD from S0 flags). If off, skip calling Moneybird (use internal flow). This way, non-pilot tenants or dev mode without Moneybird can still use voice invoicing with internal PDF. Also, stub out e-Boekhouden/WeFact flags as false; code structure allows enabling them later easily (just don’t show UI for them now).

📋 Acceptance Criteria:

 OAuth Connection – Scenario: Connect to Moneybird. Given an owner is on the integrations/settings page, when they click “Connect to Moneybird”, then they are redirected to Moneybird’s OAuth consent screen. After authorizing, then our app receives the callback, exchanges the code successfully, and stores the tokens. Finally, the settings UI updates to show “Connected to Moneybird (Administration: [name])”. Acceptance: The token is stored in the database (verified by checking the accounting_connections table for the org), and a confirmation message or UI element indicates success. The user should not see the token; it’s handled internally.

 Create Contact on Invoice – Given a plumber has completed a job and we have a customer (with name/phone and maybe address), when the first invoice is created for that customer with Moneybird connected, then the system creates a new contact in Moneybird representing that customer. The contact should have at least the customer’s name, and email if we have it (phone can go in notes if no field). Acceptance: In Moneybird’s web UI, the contact appears in the contacts list after invoice creation. If the same customer has another invoice later, a duplicate contact is not created; the existing one is reused (implying our system stored the contact ID and recognized the customer).

 Invoice Draft via API – When the plumber finalizes an invoice (from S6, voice or otherwise) and Moneybird is connected, then our system calls Moneybird API to create the invoice in Moneybird instead of generating it only internally. Acceptance: The invoice appears in the Moneybird administration as a draft (or sent, depending on implementation). All line items from our draft are present, with correct amounts and VAT. The invoice total in Moneybird matches what our app showed. It should have a proper invoice number assigned by Moneybird (e.g., MB-2023-0001). Our database should record the mapping (e.g., our invoice.id with Moneybird’s invoice_id). Optionally, our app could fetch the PDF right away. This can be tested by checking Moneybird UI for the new invoice after triggering it from our app.

 PDF/UBL Retrieval – After creating the invoice draft, when the plumber or system requests the PDF (e.g., to send to customer or view), then the PDF is fetched from Moneybird via API. Acceptance: The PDF file we get is identical to the official Moneybird invoice (with all legal requirements). If we implement UBL (the Dutch e-invoice XML), similarly, it can be fetched. This could be tested by a manual trigger or automatically after creation. The system might store a copy or just get a link – if a link, ensure it’s used promptly (Moneybird might give a short-lived link token).

 Mark as Sent – When we finalize the invoice, if our flow dictates, then the invoice in Moneybird is marked as sent (so it gets an official number and is no longer draft). This might be done via calling the send endpoint with suppression of actual emailing. Acceptance: In Moneybird, the invoice status should be “Sent” (not just draft) without Moneybird having emailed it. The timeline in Moneybird might show “marked as sent via API”. This ensures the invoice number is locked in sequence.

 Moneybird Webhook (Payment) – Scenario: Customer pays an invoice outside our app (say via a bank transfer or a marked payment in Moneybird). Given Moneybird webhooks are set up for the administration, when an invoice’s status changes in Moneybird (e.g., marked paid), then Moneybird sends a webhook to our app and our /api/webhooks/moneybird handler processes it. Acceptance: The webhook data is parsed, the corresponding invoice in our database (by Moneybird ID) is found, and we update its status to paid. An audit log is written (“Invoice #INV-1001 marked paid via Moneybird”). We also trigger any in-app updates (e.g., if invoice was pending in a dashboard count, it should decrement). This can be tested by manually marking an invoice paid in Moneybird and observing our system’s data change or log output.

 End-to-End Invoice Send – Combine with next slice: after invoice PDF is obtained, the plumber can send it via WhatsApp/email to the customer. While actual sending may be handled in S8 (payment link via WhatsApp) or by the plumber manually, ensure that our integration provides all info needed for that: invoice PDF URL or file, invoice amount, etc., and maybe an invoice URL for customer portal (if Moneybird provides one, though we prefer our own portal). Essentially, at this point, an invoice can be fully generated and ready to deliver.

 Fallback if Not Connected – Given a plumber has not connected Moneybird, when they try to finalize an invoice, then the system still produces a PDF (using internal pipeline from S6) so they are not blocked. Perhaps a banner “(Connect to Moneybird for official numbering)” could be shown. Acceptance: The invoice still goes out (for MVP it could be an internally generated PDF) if Moneybird isn’t there. This ensures the feature is functional with or without the integration (just that with integration, it’s official and easier for long term compliance).

 Multi-tenant Isolation – A user from one organization connecting to Moneybird will store tokens scoped to their org. When another org’s user connects, then their tokens are stored separately. Our API calls always use the token for the current org’s connection. And if an org has no connection, we never inadvertently use another org’s token. Acceptance: in a multi-org test (two accounts connecting to two different Moneybird administrations), invoices go to the correct account. We can verify by seeing that Org A’s created invoices only appear in A’s Moneybird, and Org B’s in B’s.

 Secure Storage – Verify that sensitive data (Moneybird refresh tokens, etc.) are not exposed via client or logs. For example, call a tRPC whoami or org info endpoint (if any) and ensure it doesn’t return the tokens. Also, check that our logs do not print the token. This is a qualitative check by code inspection or controlled logging in dev.

 Provider Extensibility – (Optional) Check that the structure would allow another provider: e.g., providers/moneybird.ts implements an interface in providers/types.ts that defines needed methods (connect, createInvoice, etc.). We have flags INVOICING_EB or INVOICING_WEFACT set to false. This isn’t directly testable, but acceptance can be that the code is organized such that adding e-Boekhouden integration later would be adding a new file implementing the same interface and toggling the flag. (For now, this might just be noted rather than tested.)

S8 — iDEAL Payments via Mollie (Payment Links & Webhook Tracking)

📌 Objective: Integrate iDEAL payments using Mollie API – generate payment links for invoices, provide these links to customers (e.g., via WhatsApp or customer portal), and handle Mollie webhooks to update payment status in our system.

📂 Scope:

CREATE:

src/server/services/mollie.ts – Service module to interact with Mollie API. Functions: createPayment(amount, description, redirectUrl, webhookUrl) to create a payment for a given invoice and get the checkout link, and possibly verifySignature to validate Mollie webhook signatures (Mollie signs requests with HMAC using a secret).

src/app/api/webhooks/mollie/route.ts – Endpoint to receive Mollie payment status webhooks (should be a public URL Mollie can call).

src/components/invoice/PaymentStatusBadge.tsx – UI element to show payment status on an invoice (e.g., “Paid”, “Pending Payment”, “Expired”) with color indicators.

src/components/invoice/PayNowButton.tsx – If not using the customer portal, a component (maybe in invoice detail or customer portal) that says “Pay with iDEAL” and opens the Mollie payment link. For WhatsApp, we might not need a component; we just send the link, but having a button in a web context (customer portal invoice page) is useful.

src/server/db/sql/028_payments.sql – Migration for payments table or add to invoice_payments: store Mollie payment ID, invoice_id, status, amount, and timestamps. This helps correlate Mollie events to our invoices and track if multiple payment attempts occur.

EDIT:

src/server/api/routers/invoices.ts – When an invoice is finalized (from S6/S7), trigger payment link creation: e.g., a tRPC mutation preparePayment that calls Mollie API to create an iDEAL payment and saves the payment record. Also, endpoints to fetch payment status (though webhook will push updates).

src/components/customer/InvoicePage.tsx – In the customer portal (if we have a separate invoice view page for customers), include the PayNowButton so customer can initiate payment. If the portal is not separate, we assume sending link via WhatsApp. But likely, the portal slice S10 plus this means we might show an invoice detail to customer with a pay button.

src/server/services/providers/moneybird.ts – If Moneybird is integrated, ensure no conflict: Moneybird might also have payment links, but we choose to use Mollie independently. So ensure we don’t double-charge. Possibly mark Moneybird invoices with a payment reference note or do nothing aside from marking paid when Mollie confirms.

⚙️ Commands:

Use Mollie’s test API key in dev. Call createPayment with a small amount and redirectUrl to a dummy page (like our customer portal or just mollie test redirect), and webhookUrl pointing to our local endpoint (we might simulate this by copying payload). Check that it returns a payment URL.

Simulate a webhook: Mollie sends a POST with JSON including payment ID and status. We can mimic this by an HTTP call to our local endpoint (since Mollie can’t call localhost, either use a tunneling service or test by writing a unit test that calls our webhook handler function with sample data). Ensure signature verification passes (Mollie provides a header with a signature, which we can generate if we know the secret; in test we might disable signature or provide static known good).

Mark invoice as paid in DB after webhook and see if PaymentStatusBadge updates in UI (simulate by calling a function or temporarily marking as paid).

pnpm check to verify all Mollie integration code is typed correctly (Mollie responses have known schema, possibly use their TypeScript definitions if available or define minimal ones ourselves).

🚨 Escalate:

Webhook Reliability: The system must handle the case where we might miss a webhook (network issues or downtime). Implement idempotency and consider periodically polling Mollie as backup (Mollie provides GET payment status). MVP might skip polling, but we design webhook handling to be idempotent and consider manual refresh if needed.

Partial Payments/Expired: A Mollie payment link can expire (default 15 minutes or so for iDEAL if not used, or 28 days for some?). Decide what to do if expired – plumber could trigger a new link (maybe via a “Resend payment link” action). Also, handle if a payment is cancelled by user. Ensure we update status to something like “Expired” or “Canceled” in our DB so that the system can send reminders or open a new link.

Security: Verify Mollie webhook authenticity. Mollie includes a mollie-signature header (or it may require making an API call on webhook to double-check payment status, which is their recommended method). We should do that: upon webhook, immediately do a GET /payments/{id} from Mollie’s API to retrieve the official status, to avoid trusting the payload blindly. Also, the webhook URL should contain some random component or otherwise be protected since we can’t require auth on it (Mollie won’t provide).

Currency/Amount mismatches: All payments should be in EUR for iDEAL (Mollie supports multi-currency, but we’ll use EUR). Ensure the amount we send to Mollie exactly matches the invoice amount (in cents to avoid rounding). If VAT or totals are off by a cent due to rounding, better to charge full invoice gross total.

Multiple Payment Attempts: If a customer tries to pay and fails or closes, and the plumber sends a new link, track those attempts properly. Possibly create a new payments entry each time. Ensure that once one is paid, others (if still pending) are marked obsolete or cancelled to avoid double payment.

Customer Experience: iDEAL payments redirect the user to their banking app/site. We provided a redirectUrl in createPayment for after payment. Ideally, that could be our customer portal page showing “Payment received, thank you” or “Payment failed, try again.” We should implement or designate a redirect landing page that can parse Mollie’s return parameters (or we get the payment ID from the URL and then check status). MVP might not fully implement a pretty landing, but at least not leave them hanging.

Refunds: Out of scope likely, but just note if an invoice is overpaid or refunded offline, Moneybird might update. Not in MVP.

🔐 Rules:

Use Test Mode during dev and provide a way to easily switch to Live mode when deploying (via env variable for Mollie API key). Clearly separate test vs live to avoid accidental real charges.

One Payment per Invoice: Enforce that at a time only one active payment link exists per invoice (or at least that multiple payments can’t both mark it paid twice). For instance, when generating a new link, if a previous one was pending, consider cancelling it via Mollie API or just let it expire but ensure if its webhook comes later it doesn’t confuse (we can check if invoice already marked paid or if payment ID matches the latest we expect).

Webhook Idempotency: The Mollie webhook might be called multiple times (they retry until a 200 OK). Our handler should be idempotent – e.g., if we already processed a payment as paid, subsequent calls do nothing but still return 200.

Quiet Hours: Payment confirmation via WhatsApp: If a payment is completed at 3am via Mollie (maybe customer did it late), we should not send an immediate WhatsApp confirmation if outside allowed hours (or use a template if we do). MVP might skip auto-confirm message, but if we were to implement, respect quiet hours (the reminder engine slice might cover similar logic).

Data Integrity: The payments table should reference invoice_id (and org_id for safety) and store amounts and statuses. Whenever a webhook says “paid”, double-check that the amountPaid == invoice amount to avoid marking paid if partial (though iDEAL doesn’t really allow partial under one payment, but just in case). If amount differs, flag it.

No Client Secrets: All Mollie API calls and webhook handling logic remain on server. The front-end never directly hits Mollie. The PayNowButton is either a simple link (to Mollie Checkout) or triggers a server call to get a link.

Link Delivery: Use our existing channels to deliver the payment link. That could be via WhatsApp message (since we already have WA integration). Possibly as soon as invoice is ready, we send a template message to customer with “Pay securely via iDEAL: [link]”. If outside 24h, use an approved template (like “Payment reminder” template might double as initial payment request). Ensure this send is audited. MVP can simplify: plumber manually sends the link, or we piggyback on reminder system to send initial link. But mention in acceptance how link gets to customer.

📋 Acceptance Criteria:

 Payment Link Generation – Given an invoice with a total amount (e.g., €200), when the plumber or system triggers “Create iDEAL payment link” (this could be automatic upon invoice finalization or a button click), then a payment intent is created via Mollie. Acceptance: We obtain a checkout URL from Mollie (e.g., starting with https://www.mollie.com/pay/...). The payments table in our DB now has a record with this invoice’s ID, Mollie payment ID, status “open” (pending), and the exact amount. The link is accessible to be sent to the customer. The plumber is notified (maybe via UI) that a payment link is ready.

 Customer Payment Flow – Scenario: Customer uses the link. Given the customer receives the payment link (via WhatsApp message from the plumber or via the customer portal invoice page with a “Pay now” button that opens the link), when they click it, then they see Mollie’s payment page with iDEAL options (in test mode, a fake bank). They complete the payment successfully. Then Mollie redirects them to our specified redirectUrl (which could be a thank-you page in our app). Acceptance: The customer had a smooth payment experience and ended up back at our site or at least got confirmation on Mollie’s side. (To fully test, use Mollie test mode: choose a test bank, on successful payment it usually auto-redirects to provided redirect link with a status=paid parameter).

 Webhook Handling (Paid) – When Mollie sends a webhook for a payment (status change), then our endpoint processes it. For a successful payment, then the corresponding invoice in our system is marked as paid. Acceptance: The invoice’s status in our DB changes to “paid” (and in Moneybird, if integrated, we also mark it paid there via API or we rely on Moneybird’s own webhook if that’s also configured – potentially redundant, but at least our side knows). The payments record is updated (status = paid, paid_at timestamp). We respond 200 OK to Mollie. An audit log entry like “Invoice #1234 paid via iDEAL (Mollie payment id XYZ)” is created. If a user is viewing the invoice (dashboard or portal) at that moment, they would see the PaymentStatusBadge update to “Paid” (maybe via a refetch or real-time mechanism, which could be added later; MVP can require manual refresh).

 Payment Status Display – Given an invoice in the system, when the plumber views it in their dashboard or the customer views it in the portal, then the payment status is clearly shown. For example, if unpaid and a link was sent, it might show “Pending Payment” (perhaps with an icon or yellow badge). If paid, “Paid on [date]” with a green badge is shown. Acceptance: The status updates correctly after the webhook. (Test by: before payment, invoice page shows pending; after simulated webhook, refresh invoice page shows paid.)

 Reminders & Expiry – If a payment is not completed within a certain time (say customer doesn’t pay initially), the invoice remains “Pending”. The Payment Reminder system (S9) will handle follow-ups at +3 days, etc. Acceptance: Confirm that an unpaid invoice after 3 days triggers a reminder message (this will be covered in S9, but dependency: the invoice status is still “open” so S9 knows to remind). Also, if Mollie’s payment link expired, our system either receives a webhook (status “expired”) or we note it. Ensure that if expired, invoice still considered unpaid and can generate a new link if needed. (This can be tested by simulating an expiration webhook or by setting a very short expiry in dev, if possible.)

 Signature Verification – Our webhook handler should verify the authenticity of Mollie calls. When Mollie calls our webhook, then we verify the Mollie-Signature header (contains a SHA1 of the payload + secret). Acceptance: If the signature doesn’t match our known Mollie endpoint secret, we return 401 and do not alter invoice status. If it matches, we process and return 200. (Since testing actual signature in dev might be tricky, at least code review or a unit test with known example should demonstrate the check. Mollie’s docs suggest doing a GET to confirm status instead – we can do that too as verification: e.g., on webhook, call Mollie API getPayment and compare status, ensuring request came from Mollie since only they know the ID and our secret. If implemented, that double-checks authenticity implicitly.).

 Integration with Moneybird – If using Moneybird integration, ensure that marking the invoice paid in our system (from Mollie) also reflects in Moneybird. Acceptance: After a payment, the Moneybird invoice is marked paid either by: (a) our webhook handler calling Moneybird API to register a payment entry on that invoice, or (b) we rely on the fact that we didn’t use Moneybird’s payment link so it won’t know automatically – likely we must call Moneybird. So test: after webhook, query Moneybird invoice via API and see that its status is set to paid. If not, implement adding a payment in Moneybird (Moneybird API has an endpoint to register a payment on an invoice). The criterion is satisfied if Moneybird’s dashboard also shows the invoice as paid after our system processes the Mollie webhook.

 User Feedback – The plumber should be able to see that a payment link was sent and the outcome. Possibly in the invoice UI, we show “Payment link sent to customer via WhatsApp” and after payment “Customer completed payment via iDEAL.” This can be in the timeline or status. For MVP, a simpler acceptance: plumber sees the invoice turn to “Paid” within a reasonable time after customer pays, without needing to manually reconcile.

 Multiple Payment Attempts – Test scenario: Customer tries to pay but fails or cancels (Mollie might send a “canceled” status). When a Mollie webhook of status “canceled” or “expired” is received, then our system updates the payment record accordingly (maybe mark as canceled) but the invoice remains unpaid. Acceptance: The invoice status stays “Pending” and perhaps triggers the ability to send a new link (maybe manually or via reminder). If plumber sends a new link, that creates a new payment entry. We ensure that if eventually one of them is paid, the invoice marks paid (and we either ignore the other or mark it redundant). No duplicate “paid” events occur.

 No Overpayment – If somehow two payments come in for the same invoice (maybe customer paid twice or we allowed two links), our logic should handle it gracefully (maybe refund one later manually, but at least system-wise: once paid, further webhooks for same invoice should not change anything or could log “additional payment received” in audit). MVP acceptance: After an invoice is marked paid, additional “paid” webhooks for that invoice (if any) are logged but do not double-increment revenue metrics, etc. This is more of an edge-case and can be noted rather than tested practically.

S9 — Automated Payment Reminder System

📌 Objective: Implement an automated system to remind customers about unpaid invoices via WhatsApp messages after set intervals (e.g., 3, 7, 14 days), with appropriate template messages and respecting quiet hours, plus an option for manual trigger.

📂 Scope:

CREATE:

src/server/cron/paymentReminders.ts – A scheduled job (cron) that runs daily (or hourly) to check for invoices that are overdue for reminders and sends out reminder messages. Use a cron scheduling mechanism (could be a simple Node cron in our server, or Vercel cron job hitting an API route, or Supabase scheduled function).

src/server/services/reminderEngine.ts – Module encapsulating the logic: which invoices need reminders today, constructing the WhatsApp message content (possibly retrieving an approved template ID for “payment reminder”), and sending via WhatsApp (using our WhatsApp client service). Also ensures not to send outside allowed hours (e.g., only send between 08:00-20:00 local time).

src/components/settings/ReminderConfig.tsx – (Optional) UI in settings to configure the reminder system: toggle on/off automatic reminders, possibly customize times or message template? For MVP, might just have a toggle “Enable payment reminders” per org.

EDIT:

src/server/services/whatsapp-client.ts – Add support for sending template messages via WhatsApp Cloud API. We likely need to store the template name or ID. Ensure the client can handle those (WhatsApp Cloud API requires template name and language, plus variables like amount, invoice link). Possibly create a template like “PAYMENT_REMINDER” in Meta’s system beforehand.

src/server/db/sql/029_invoice_reminder_flags.sql – Migration to add fields like last_reminder_sent_at on invoices, and maybe reminder_count or a boolean reminders_disabled if we want to skip certain invoices. Also maybe org-level setting for reminders on/off.

src/server/api/routers/invoices.ts – Add a procedure for manual trigger: e.g., sendReminder(invoiceId) that calls the reminderEngine for that invoice immediately (for manual use via UI).

src/i18n/nl.json – Ensure any static text in reminder messages or related UI is present (though likely the WhatsApp template itself handles the content in the user’s language).

⚙️ Commands:

Populate test data: an invoice that is 4 days old and still unpaid. Run the paymentReminders job function in dev to see if it picks it up and attempts to send a message (log the action instead of actual send in test).

Test quiet hours logic by simulating a run at a disallowed time (set current time in code or adjust logic) and ensure it defers sending (maybe logs “will send later” or simply doesn’t send).

Use a fake WhatsApp send in dev (maybe stub the actual API call, or use real if we have test number) to verify the message format. Confirm that after sending, the invoice’s last_reminder_sent_at updates and that same invoice won’t get duplicate reminder the same day.

If possible, test manual trigger: call the endpoint to send a reminder for a specific invoice and check that it goes through even if schedule not yet due.

🚨 Escalate:

Template Approval: WhatsApp requires pre-approved templates to message outside 24h window. We need a “Payment Reminder” template (likely containing variables for customer name, amount, and maybe invoice link). If not already created, this is a dependency (outside our code scope). We assume such a template is approved. If not, we cannot send after 24h. For MVP, ensure to use template and not attempt freeform messages beyond 24h. Escalation: if template not approved in time, might have to skip reminders or use email fallback (not in MVP scope though).

Opt-Out/GDPR: We should consider if customers consent to reminders via WhatsApp. At MVP, perhaps implicitly yes because they contacted via WhatsApp. But ensure messages include identification and perhaps how to stop (maybe out-of-scope now). Also ensure we only use WhatsApp for those who initiated chat (which is the case here).

Multiple Reminders: Ensure we don’t double-remind. Use reminder_count or track which intervals done. If plumber manually sends a reminder via WhatsApp outside system, we might not know; we only handle our automated ones.

Quiet Hours Logic: Decide timeframe (e.g., between 21:00-07:00, don’t send). If a reminder is due at 3 days exactly which falls at 2am, we should delay until morning. Implement that by either scheduling at a fixed hour (like cron runs 09:00 daily to send all due) or check current time and hold off. Possibly simpler: run cron at 09:00 every day to send due reminders. That covers quiet hours naturally. Escalation if plumber sets a different preferred time? MVP probably fixed.

Edge: Already Paid: If an invoice gets paid after we queued a reminder (or just before sending), ensure we don’t send a false reminder. Solution: double-check invoice status before sending each message (including calling Moneybird or our DB). If paid, skip.

Localization: Template might be in Dutch only or multi-language. For MVP, likely all in Dutch (target audience). That’s fine, but mention in docs if English customers needed, would require translation.

Monitoring: If WhatsApp send fails (maybe template not approved or number opted out), log it and perhaps set a flag so we don’t spam attempts. Not critical MVP, but at least log failures clearly.

🔐 Rules:

Respect 24h Rule: Use only template messages for reminders, since initial invoice likely sent at day 0 (within 24h of last customer message in conversation perhaps), but by day 3 it’s outside the session window. So send template "Payment Reminder 1" at day 3, "Payment Reminder 2" at day 7, etc. If templates are separate or use same with variables for day? Possibly one template can suffice with dynamic text. But ensure to use it.

Reminder Cadence: Exactly at +3 days, +7 days, +14 days from invoice send (or due date if we have that concept). Possibly adjust weekends? For simplicity, send on those days even if weekend; plumber likely fine.

Stop After X: The spec says 3, 7, 14 days which is three reminders. After 14-day reminder, stop further automated chasing (maybe plumber will call or escalate by then). We should implement such that no further reminders beyond those intervals, unless plumber manually triggers or a future feature for 21/30 days is added.

Manual Trigger: The plumber should have a way to send an on-demand reminder, e.g., a “Send Reminder Now” button on an overdue invoice. When clicked, if outside 24h, it must also use the template. We can use the same service function with an override to ignore the schedule. This manual send should also update last_reminder_sent_at and count, to avoid doubling up with auto job.

Audit Logging: Every reminder sent should be logged with timestamp and which user or system triggered. If possible, also store the content or template id used. This will assist if a customer complains or for debugging.

No Spam: If an invoice is very overdue (e.g., 60 days) and the plumber hasn’t marked it paid, our system should not keep spamming indefinitely. After the 14-day reminder, automatic stops. If plumber still wants to chase at 30 days, they may do so manually.

Integration: This should integrate with Mollie status and Moneybird. If an invoice is marked paid via Mollie or Moneybird, the reminder job should detect it’s paid and not send anything. So always base the logic on invoice status in DB (which we keep updated via webhooks). If something goes out to paid invoice, that’s a bug.

📋 Acceptance Criteria:

 3-Day Reminder Sent – Given an invoice was sent to a customer and remains unpaid for 3 full days, when the automated reminder job runs on the 3rd day, then a WhatsApp message is sent to the customer’s WhatsApp number reminding them to pay. Acceptance: The message is indeed delivered (or at least attempted, with a success status from WhatsApp API) and it uses the correct template content, e.g., “Beste klant, dit is een vriendelijke herinnering dat factuur [number] van €X,XX openstaat. Klik hier om te betalen: [payment link]. Dank u!” (in Dutch). Check that last_reminder_sent_at is now set for that invoice (approx the 3-day date), and reminder_count (if used) incremented to 1. In a test, we simulate an invoice created on Oct 1, then set current date to Oct 4 and run the job, expecting a log or output of a send.

 Skip if Paid – Scenario: Invoice paid before reminder. Given an invoice was due for a 7-day reminder tomorrow but the customer paid on day 6, when the reminder job runs on day 7, then it does not send a WhatsApp message for that invoice because the status is now paid. Acceptance: We verify that paid invoices are filtered out. For test, mark an invoice as paid in DB and simulate the cron; ensure it doesn’t trigger a send (no log or an explicit log “skipping paid invoice X”).

 Sequence of Reminders – For an invoice that remains unpaid, the system should send at most three reminders (3d, 7d, 14d). Acceptance: We simulate an invoice not paid for 15 days. The cron runs daily: we see that on day 3, 7, 14 a send occurred. On day 14, after sending, perhaps we flag that no more will be sent. On day 21, cron runs and nothing is sent (since it hit max reminders). The invoice remains in pending status for manual follow-up beyond that. We can check reminder_count == 3 and perhaps a field reminders_exhausted = true or simply logic stops after count 3.

 Template Usage – When a reminder message is sent after 24 hours from last customer message, then the WhatsApp API call uses a pre-approved template. Acceptance: (This is internal, but we confirm by code or logs that we are indeed calling the template send, not a session message). In testing, if using a sandbox or fake send function, verify it uses a template name. For production readiness, ensure at least one template (e.g., “payment_reminder_1”) is in our WhatsApp business account. This criterion may be marked by demonstration of the template content being referenced in our code/config.

 Quiet Hour Respect – Scenario: Cron triggers during off-hours. If our design is to run at a specific time like 09:00, then by definition we are fine. But if not, test: Given the current time is 02:00 and an invoice just hit 3 days overdue, when the reminder job checks invoices, then it does not send the message at 02:00. Instead, it either schedules for morning or waits. Acceptance: This might be tested by simulating a run at nighttime: confirm function either does nothing (maybe logs “X reminders due but deferred for quiet hours”) or only sends during allowed hours. If using scheduled daily at morning, then test that it indeed doesn’t run at night at all.

 Manual Reminder Trigger – Given an owner views an overdue invoice in the dashboard and wants to nudge immediately, when they click “Send Reminder Now”, then the system sends a WhatsApp reminder to the customer immediately (using the template) regardless of schedule (assuming outside quiet hours). Acceptance: The manual trigger successfully sends the message (observed by receiving it or seeing log), and updates the invoice’s last_reminder_sent_at and counts so that the auto system knows this counts as one of the reminders (thus it won’t duplicate if a scheduled one was due soon). If manual was sent one day before the scheduled one, the next scheduled might skip or adjust schedule (but MVP can still send on original schedule, that’s fine or we consider manual as replacing one of them). For now, accept that manual sending doesn’t cause double sending on the same day.

 Audit & Visibility – When a reminder is sent (auto or manual), then an entry is added to the audit log and optionally to the invoice timeline (if we display timeline to plumber). Acceptance: Check the audit log table for an entry like “Payment reminder sent to +31xxxx for Invoice #1001 on [date/time]”. This gives the team traceability. If the plumber has some UI note (maybe in invoice detail: “Reminder sent 3 days after invoice”), that could be an enhancement, but not required. As long as audit exists.

 No Spam / Stop Conditions – After the third reminder (14 days), the system should not send further automatic reminders. Acceptance: If we simulate going beyond 14 days, the cron job finds the invoice has already 3 reminders and skips it. There should be no message at day 21 (tested earlier in sequence scenario). Also, if the plumber marks the invoice as in collections or something (out-of-scope scenario), we would stop, but MVP doesn’t have that so ignore. Essentially confirm the “max 3 reminders” rule.

 Internationalization – Since target is Dutch plumbers and customers, the reminder message will be in Dutch. Acceptance: content is indeed Dutch (which it will be if using a Dutch template). We won’t implement multi-language switching in MVP, just note that this is by design.

 Integration w/ Dashboard Metrics – This system helps reduce “pending invoices” count by nudging payments. We cannot fully test that here, but we can say once a reminder triggers a payment and payment comes in (from slice S8), the dashboard metric “pending invoices” would decrement on next refresh. Perhaps verify that after a payment, that invoice is no longer counted in pending. This shows the slices working together.

S10 — Customer Portal: Appointment View & Self-Reschedule

📌 Objective: Deliver a customer-facing portal where a client can view their appointment details (job info) and, if needed, reschedule the appointment within allowed parameters – all branded to the plumber’s business.

📂 Scope:

CREATE:

src/app/c/job/[token]/page.tsx – Public page for customers to view their job/appointment details, accessed via a secure token in the URL (to avoid login). Shows date/time, address, plumber contact info, and job description (if provided). Includes reschedule options if enabled.

src/app/c/reschedule/[token]/page.tsx – Public page that allows selecting a new time slot for the appointment. The token ensures it’s linked to the specific job and is still valid (within 24h or until some cutoff). After choosing a slot, the page will confirm the change.

src/components/customer/JobDetailsCard.tsx – A component to display appointment info: e.g., “Your appointment is scheduled for [Day, Date, Time] with [Plumber Name]. Address: [Customer Address]. Problem: [Issue description].” Also includes plumber’s company name/logo (branding) and a button “Reschedule Appointment” if applicable.

src/components/customer/SlotPicker.tsx – A date/time picker interface that shows a few available alternative slots for rescheduling. Likely a simple list of suggested slots (not a full calendar for customers). Possibly generate 3-5 options around the same timeframe or next openings.

src/components/customer/ConfirmRescheduleDialog.tsx – A confirmation prompt after a customer selects a slot, asking “Do you confirm changing to [new date/time]?” and on confirm triggers the update.

src/lib/branding.ts – Utility to fetch/apply branding (like fetch organization’s logo URL, color scheme, name) to customer pages. Could derive from org settings or Clerk org metadata (e.g., plumber’s business name and logo stored earlier).

EDIT:

src/server/api/routers/jobs.ts – Add an endpoint for customer reschedule, e.g., rescheduleJob(jobId, newTime) that checks that the new slot is free and within allowed bounds (not same day last-minute unless allowed). It updates the job’s time and perhaps employee assignment (keeping same plumber ideally). Also possibly generates a new confirmation message to plumber.

src/server/db/sql/030_job_token.sql – Migration to add a secure customer_portal_token or similar to jobs (random string). Also add fields like token_expires_at if using expiry. And maybe a boolean customer_can_reschedule to mark eligibility (e.g., some jobs might be locked from reschedule if too soon or emergency).

src/server/services/scheduleXAdapter.ts – If we need to find available slots, possibly reuse scheduling logic to get free times around the current booking. Or at least query the jobs table for free gaps. This might be a simplified check: show next 3 days same time slot if free, or morning/afternoon windows. Simplicity is key for MVP, maybe just a few predetermined choices.

src/i18n/en.json & nl.json – Customer-facing texts: “Reschedule Appointment”, “Confirm new time”, “Add to Calendar”, etc., likely in Dutch primarily.

⚙️ Commands:

Generate a token for a test job (maybe via DB or in code) and visit the c/job/[token] URL in a browser to ensure it shows correct info.

Test branding: assign a dummy logo URL and color in org metadata, reload page and see if the header shows plumber’s logo and the color scheme or name is reflected.

Click “Reschedule” on the job page, which navigates to c/reschedule/[token] (or opens a dialog) – ensure it lists some time options. Choose one and confirm – then check the database that the job’s date/time changed. Also ensure that any collision is handled (if we intentionally pick a slot overlapping another job for same plumber, the API should reject and the UI show an error “slot no longer available” ideally).

Test token expiry by manually marking an old token expired and trying to access – should show an error message.

pnpm check for new pages and hooks.

🚨 Escalate:

Token Security: The token in URL means the link could be shared. Ensure tokens are sufficiently random (at least 16+ bytes) and maybe time-limited. If expired, the page should not reveal any data, just say “Link expired.” Also ensure the token cannot be guessed to access others’ data (randomness covers that).

Race Conditions: If two customers or a customer and plumber try to change the appointment concurrently, or if a plumber edits the schedule around the same time, we could double-book or conflict. To mitigate, when a customer selects a slot, double-check it’s still free at confirm time (perhaps lock it in a transaction or check job hasn’t moved). If conflict, inform customer “Slot just got taken, choose another.”

Limits on Rescheduling: Possibly disallow rescheduling too close to appointment time (e.g., cannot reschedule less than 24h before appointment through portal – must call plumber instead). For MVP, if needed, enforce: if current time is within X hours of appointment, the portal might not allow reschedule (show a message “Please contact us to reschedule on short notice”).

Notification to Plumber: After a customer reschedules, plumber needs to know. We should decide how: possibly send a WhatsApp message to plumber’s control number or an email. Minimally, update the calendar which plumber will see. But real-time alert is better. We might integrate with WhatsApp: e.g., send plumber a message “Customer rescheduled to [new time]”. Or at least an audit log that the plumber can view. MVP might skip auto-notify beyond relying on plumber checking the app, but that’s risky. Maybe send a WhatsApp template to plumber’s number (since plumber number is likely also on WhatsApp)? Or use an SMS or email from Moneybird (no, keep in WA). Could for now assume plumber sees it on calendar. Mark this as a follow-up if not done.

Calendar Sync: If integrated with Google Calendar (phase 2 possibly), a reschedule should update Google too. But we didn't include Google sync in MVP, so skip. But ensure our own calendar (jobs data) updated.

Emergency / Non-reschedulable: Some jobs (like emergency same-day jobs) probably shouldn’t allow a reschedule from customer portal to any arbitrary time due to urgency. MVP can assume the portal link is mostly used for scheduled non-urgent jobs (like upcoming appointment in a day or two). If a job is marked emergency priority, maybe don’t even include a reschedule link. Possibly FR4 mention "emergency contact" – yes in the portal we should provide an emergency phone number for plumber for urgent matters instead. Implement: If job priority = emergency or same-day, hide reschedule button and instead say “For changes, call [emergency phone number].”

Add to Calendar: Providing an .ics file (or a button that triggers add to Google/Apple calendar) was in scope. Implementation: we can generate a simple .ics with appointment info. Not critical, but a nice touch. If doing, ensure it downloads with correct details.

Mobile UI: Customers will often open this link on mobile from WhatsApp. Make sure the pages look good on a phone. Test on a small viewport physically if possible.

Brand Trust: The portal should look professional. Use plumber’s branding and a clean design (maybe a simple header with logo and a card). Avoid showing any of our own company branding to keep it white-label. Check for any texts that reveal internal names (shouldn’t).

🔐 Rules:

Authentication: The token in URL is the sole auth for customer. The pages should not require login or any Clerk session (they are public). Use server-side data fetch by token. For extra safety, the token route can decode some information (like token might embed jobId and a HMAC, or we do a DB lookup). Simpler: store token in jobs table and look up by token.

Token Expiry: Set tokens to expire after a certain time, e.g., 24 hours after appointment or single-use. Likely we want them valid up until appointment end. Could also design so that once used to reschedule, maybe we issue a new token for the updated appointment to avoid reuse. For MVP, maybe simpler: token valid through the appointment date, and if appointment is rescheduled, we keep same token or issue new? Could keep same if not expiring, but if we expire after first use, need to give new link. Possibly easier: do not expire until after appointment, but include a timestamp in token if wanting short-lived (the epic mention token 24h expiry, but that might have been for initial booking link, not sure if for reschedule link). Might relax expiry to avoid cutting off legitimate usage. But definitely expire once job is completed or far in past.

Allowed Slot Generation: Only show the customer a curated list of slots that are actually available for that plumber (no double-book). We can generate a few options: e.g., next day same time, or same day next week, or two other times the plumber has free. We must query the job schedule: find free gap of similar length as original job (assuming we know e.g. a 2h job). Use current job’s duration to propose new times. MVP approach: for simplicity, maybe just allow them to request a callback to reschedule if scheduling logic is too heavy. But since explicitly asked, we do at least a basic. For now, maybe generate 3 options: one earlier, one later, one around same time next day. But better is to integrate with our calendar availability: find any open slot in next N days. Could reuse something from scheduling slice if available. If not, even a naive approach: e.g., allow them to choose any day/time and then plumber will confirm? That’s complicated. Instead, perhaps only allow them to request a reschedule, which notifies plumber to confirm. But the spec suggests immediate reschedule in portal.

Immediate Update: We likely should commit to the reschedule instantly (to avoid back-and-forth) since it’s MVP. So trust that our free slot check is accurate.

Emergency Contact: On the job view, if an appointment is scheduled in future and something comes up, provide plumber’s phone or “Call for emergencies: [number]”. Use the emergency_phone that might be stored in org metadata (as per PRP, they had emergencyPhone in Clerk org metadata).

Add to Calendar: Provide an “Add to calendar” link that downloads an ICS file containing appointment details (start/end time, plumber name/phone, maybe notes). That link should be easy to find. (Often people appreciate adding to their personal calendar.)

Customer Data Protection: Don’t display anything more than needed. The portal shows customer’s own data (address etc.), which is fine since they are the customer. But ensure you’re not leaking other customers’ data. The token is tied to one job, one customer. Even if someone randomly got another’s token, it’s near impossible to guess and if expired they can’t use. Also ensure no indexing of these pages by search engines (set meta noindex maybe, or random nature suffices).

Language: Customer portal content should ideally be in the local language (Dutch). If we have only Dutch customers for pilot, we can hardcode Dutch strings or use NL locale as default for these pages. Possibly not worry about switching languages for MVP.

📋 Acceptance Criteria:

 Secure Access Link – When a customer receives a link to the portal (e.g., via WhatsApp or email), containing a token, then clicking it opens the appointment details page without any login needed. The URL is unique and unguessable (e.g., /c/job/abcdef123456...). If the token is invalid or expired, then the page shows an error message like “Link invalid or expired. Please contact your plumber to get an updated link.” Valid token yields the info described below.

 Appointment Details Display – Given a valid token for a scheduled job, when the customer page loads, then it displays: the appointment date and time (formatted nicely, e.g., “Wednesday 12 Oct 2025 at 14:00”), the service description (e.g., “Fix leaking sink”), and the plumber’s business name and logo. It also shows who will come (plumber’s name if available) and any contact info (like “Questions? Call [Plumber Phone]”). Acceptance: All info is correct and corresponds to the job record. The design is clean and mobile-friendly (tested on a phone screen). Key action options (reschedule, add to calendar) are visible.

 Plumber Branding – When the customer views the portal, then the page is branded for the plumber’s company. Acceptance: The plumber’s logo appears at top (or as a favicon or graphic), their company name is clearly stated (e.g., “Acme Plumbing” Appointment Portal), and possibly the color scheme uses the company’s primary color (if provided). There is no mention of our app’s name or any third-party branding. This builds trust that it’s a legit page from the plumber. (Test by setting some branding values in the org and see them applied.)

 Add to Calendar – The appointment page provides an “Add to Calendar” link or button. When clicked, then an ICS file is downloaded (or the device’s calendar app opens) with the appointment details (correct date/time, duration perhaps 1 hour default or based on job, location likely the customer’s address or just note “at your address”, and plumber contact as part of description). Acceptance: Importing that ICS into Google/Outlook shows an event titled like “Plumber Appointment – [Plumber Name]” at the right time. (We can simulate clicking and opening the file in a calendar app to verify content.)

 Reschedule Option Availability – The portal shows a “Reschedule” button if the appointment is eligible for rescheduling. If the appointment is within a few hours or marked as emergency, then instead of reschedule, it shows “For changes, please call us at [phone].” Acceptance: For a test job 2 days out (non-emergency), the Reschedule button is visible. For a test job 1 hour from now or flagged emergency, the reschedule button is hidden and a message with phone is shown. This ensures we don’t allow last-minute online changes.

 Suggested New Slots – When the customer clicks “Reschedule Appointment”, then they are presented with a list of alternative time slots. Acceptance: The list contains a handful (e.g., 3-5) of upcoming available slots that fall within normal working hours and do not conflict with other jobs for that plumber. For instance, if current appointment was tomorrow 14:00-15:00, it might show: “Tomorrow at 16:00”, “The day after tomorrow at 14:00”, “Monday, Oct 16 at 10:00” as options (assuming those are free). The slots are reasonably close in date to the original (we’re not pushing months out unless plumber’s next availability is far). If no slots are available (unlikely for MVP), maybe display “Please contact to reschedule.” But normally always show something by extending range a bit.

 Reschedule Confirmation – Scenario: Customer selects a new time. Given the customer picks one of the offered slots (e.g., clicks on “Monday 16 Oct, 10:00”), when they confirm the reschedule, then the system updates the appointment. Acceptance: The page then updates to show the new appointment time (maybe back on the details page, with a success message “Your appointment has been rescheduled to ...”). In the database, the job’s start time (and end time if applicable) is updated to the new time. The customer_portal_token might be invalidated or remains same (not critical to user). Additionally, a notification to the plumber is (ideally) sent – for acceptance, at least verify the job appears changed on the plumber’s calendar (slice S4 integration). We check that the calendar (S4) now reflects the new time slot and that no duplicate job was created (it was an update).

 Slot Conflict Handling – Scenario: Two customers try to grab the same slot (rare) or slot just became unavailable. When a reschedule attempt is made and the slot is no longer free, then the system responds with an error message: “Sorry, that slot is no longer available. Please choose a different time.” Acceptance: Simulate by artificially creating a conflict (e.g., have two jobs and share a slot suggestion, or mark job as busy concurrently). The second attempt should not succeed in booking. The UI should handle this gracefully, not just fail silently. Possibly it returns to slot picker to choose another.

 Plumber Notification – After a successful reschedule, the plumber should be aware. Acceptance: Ideally, the plumber receives a WhatsApp (through our system’s control number or even the customer number? Possibly an internal note). If we implement, test that a WhatsApp message like “Customer John Doe rescheduled their appointment to Mon 16 Oct 10:00” is sent to the plumber (to either the plumber’s WA or maybe just an email). If not implemented, then acceptance is that at least the job shows up on their dashboard updated (which we did above). We mark this criteria as partially done if automated notify is not fully implemented in MVP (but mention as a follow-up).

 Audit Log & Security – When a reschedule happens, then an audit log entry is created (“Customer rescheduled Job #123 from Oct 12 14:00 to Oct 16 10:00 via portal”). Also, if token usage is one-time, mark it (but we might not enforce one-time, as token can be reused to view updated info, which is fine). Acceptance: Check audit logs for the entry. Also verify that without the token one cannot access any info (e.g., go to /c/job/[someotherid] yields nothing). Also ensure the token only exposes that job – e.g., in network calls on that page, they only fetch that specific job data, not a list of jobs or other sensitive info.

 Customer Experience – Gather that the portal is straightforward: The customer doesn’t need to log in, sees their appointment, can change it easily if needed, or add to calendar. Everything is in Dutch (assuming plumber communicates in Dutch). We consider it a success if a non-technical customer can use it without instruction. This is subjective but important. Testing with a person (or our own perspective) yields that it’s intuitive (the reschedule flow maybe even easier than calling).

S11 — Audit Logging & GDPR Compliance Foundation

📌 Objective: Implement a robust audit logging system for tracking all key actions (especially AI outputs, message sends, and data changes) and lay groundwork for GDPR compliance (data retention and access controls).

📂 Scope:

CREATE:

src/server/db/sql/031_audit_log.sql – Migration to create an audit_log table. Fields might include: id, org_id, user_id (nullable if system or customer action), action_type (enum or text), description, timestamp, and possibly related_record (like job_id or invoice_id). Ensure it's append-only.

src/server/services/audit.ts – Utility with functions like logAction(opts) to insert entries easily. Perhaps with predefined action types (e.g., AI_PROPOSAL_CREATED, JOB_SCHEDULED, INVOICE_SENT, PAYMENT_RECEIVED, etc.). Could also handle redaction (for GDPR, maybe certain logs can be anonymized after X days).

src/server/services/gdpr.ts – (If implementing anything now) possibly functions to anonymize or delete data as per GDPR requests. MVP likely just ensures structure in place (like we know what to delete after retention period). Could also include a stub for data export (like a function to gather all data for a customer if needed).

EDIT:

All slices’ relevant service functions: e.g., in whatsapp-webhook.ts, after processing message, call audit.logAction({ org, user: system, action: 'WhatsApp message received', details }); in ai/analyzer.ts, after suggestion, log AI proposal generated for job X with confidence Y; in scheduling/reschedule/invoice, log those actions. Essentially pepper logAction calls throughout the code at critical points.

src/server/db/sql/021_whatsapp_inbox.sql or similar – Add retention policy markers, e.g., maybe a timestamp on messages for when to delete. If not using Postgres policies yet, note in code to delete chat messages older than 90 days.

Possibly add a config in env or database for retention durations (e.g., CHAT_RETENTION_DAYS = 60).

src/server/api/routers/admin.ts – (Optional) If we want an endpoint to view audit logs or to trigger GDPR actions (for internal use). MVP might not expose UI, but having internal access might help debugging.

⚙️ Commands:

After implementing, cause some events (schedule a job, complete a job, etc.), then query the audit_log table to ensure entries are recorded with correct info.

Write a quick script or test to simulate retention deletion: e.g., mark some messages 91 days old and run a function to purge old messages, verifying deletion.

Possibly simulate a GDPR export: gather all data in DB related to a particular customer phone or name, ensuring we can get it if needed (this might be manual for now, but design the approach).

🚨 Escalate:

Performance: Audit logs can grow large. Ensure writing to audit_log is efficient (maybe non-blocking or via trigger? Probably fine to just insert asynchronously). Plan indexing by org_id and maybe action_type for queries. Possibly consider moving heavy audit (like AI full outputs) to a separate store if needed. But MVP likely low volume.

Sensitive Data: Ensure we do not log sensitive personal data in plain text unnecessarily. E.g., logging “customer phone X did Y” is fine, but avoid logging an entire message content if it contains personal address, etc. Instead refer to record IDs. For AI, maybe log that AI analyzed a photo but not store the photo in log, etc. Also audit_log likely considered company internal data, so might not be exported to external, but if a customer asks for their data, logs that include their personal data might need to be provided or deleted - we should be ready. Possibly an approach: logs that contain personal info should be ephemeral or sanitizable. Eg, we could replace actual phone numbers with an anonymized ID in logs. At least ensure logs of WhatsApp messages do not store message text beyond retention period.

GDPR Data Retention: The PRP mentions: chats 30-90 days, structured data 7 years (for invoices). For MVP, commit to a number: say 60 days for chat content. That means we should have a mechanism to delete or anonymize old WhatsApp messages. We could implement a nightly job to delete any whatsapp_messages older than 60 days. Possibly also anonymize AI recommendation data from those (maybe keep aggregated stats but remove PII). If not fully implementing now, at least put a placeholder or note. For invoice and job, we keep for 7 years (no deletion). So nothing to do now but just ensure we don't accidentally delete those.

User Access Controls: Multi-tenant: ensure one org’s admin cannot see audit logs of another. But since we likely won't have a UI to view logs in MVP, just ensure any admin endpoints filter by org_id (like everything else).

Right to Erasure: If a customer requests deletion, usually we'd remove personal identifiers but keep invoice data for legal. Maybe out-of-scope to implement fully. But we might plan to have a script that, say, can anonymize a customer (replace name/phone with random or “Deleted”) but keep invoice amounts. For now, not implementing, but ensure architecture doesn’t block doing so. Eg, if foreign key constraints require customer record, we could allow a “deleted” flag or something later.

Consent: Possibly ensure we have privacy policy in place or at least a statement. But technical side: maybe ensure tracking of consents if needed (not in MVP likely).

🔐 Rules:

Universal Logging: Every major external or security-related action must leave a log. That includes: incoming/outgoing WhatsApp messages, AI suggestions (with at least a reference to result, not necessarily full text), user confirmation actions (like scheduling, completing jobs), invoice creation/sending, payment received, reminders sent, reschedules, login events if relevant (Clerk might handle auth logs but we could log org membership actions, etc.). Essentially, one should be able to audit after the fact “who did what when”. For system actions (like an auto reminder), user_id can be null or “system”.

Immutability: Audit logs are write-only. No deletion or editing of audit entries by users. Even admins should not remove logs except via retention policy. If we need to correct an entry, add a new entry noting the correction.

Retention Implementation: Implement at least a scheduled deletion of old WhatsApp message content. Possibly the simplest: have a cron job run daily to delete from whatsapp_messages where created_at < now() - 90 days. Because these contain conversation text/media that should not be kept indefinitely. For training improvement, maybe we planned 30-90d, so 60 is fine. Document that. Also consider if we need to delete AI suggestions tied to those messages; or we could keep suggestions for analytics but those might have customer data (like address in a suggestion?). Maybe just treat them as part of conversation and also purge if their source message purged.

Anonymization: For any data we must retain long-term (invoices, jobs) that contain personal info, we might need to anonymize after a point if not needed. However, legally invoices must keep customer info for 7 years in NL, so those we keep intact (name/address). For training data (like AI learning events), we can anonymize the free text (remove names, etc.). Possibly not doing now.

Access to Logs: Only admin/owner roles (or developers via DB) can read audit logs. We might not build a front-end in MVP, but ensure if we did, normal staff wouldn’t see everything (maybe only their actions or none). It's more an internal admin feature.

Compliance: Provide a basic privacy notice somewhere (maybe not code, but as part of onboarding). Not in scope to implement UI for it, but could note it’s needed. If storing any personal data in third-party (we mostly store ourselves, except WhatsApp on Meta’s servers and Moneybird for invoices, which is fine).

Data Export: If asked to export all a customer's data, we should be able to query it (customer record, their jobs, invoices, messages). We won’t automate it now, but ensure our schema links things by customer_id etc. so it's feasible. Eg, jobs have customer_id, invoices have job_id or customer_id, whatsapp_messages have customer phone or id, etc., so that we can collect all info on a per-customer basis if needed.

📋 Acceptance Criteria:

 Audit Log Entries Created – Trigger various actions and verify logs:

When an AI suggestion is generated for a lead, an audit entry appears like “AI proposed job #456 (confidence 0.85)” with a timestamp.

When a plumber schedules a job or edits it, an entry “User Alice scheduled job #456 for Oct 5 10:00” is logged.

When an invoice is sent or a payment link is generated, entries “Invoice #1001 created (total €X)” and “Payment link sent to customer” are logged.

For each WhatsApp message sent or received by system, e.g., “WhatsApp message sent to +31612345678: [template name]” or “WhatsApp image received from +31612345678”.

Essentially, verifying by querying audit_log table that each of these actions in the test system wrote an appropriate row with correct detail text and references (job/invoice IDs).

 Audit Data Contents – Check that audit entries contain identifying info but not sensitive content. Acceptance: E.g., a log for an incoming message might say “WhatsApp msg from +316... stored (image)” rather than the full message “Hey my address is 123 Street”. We confirm by looking at a log entry for a message that it does not expose the whole user message. Similarly, an AI proposal log might include structured fields or just summary, not entire AI JSON if it has personal data. This ensures privacy in logs.

 Log Integrity – Attempt to alter an audit log entry (e.g., via an API if one existed or direct DB as non-admin) and ensure it’s not possible in application flows. Since we likely have no UI to edit, this is more about making sure we didn't build any deletion endpoints. So acceptance can be: only direct DB access (or no one except dev) could remove logs, meaning within the app they are append-only. Mark as satisfied by design.

 Retention of Chat Data – Simulate time passage or manually call retention logic: e.g., mark some message’s created_at to 91 days ago, run the retention cleanup function (or wait if scheduled daily) and see that the message is deleted from whatsapp_messages. Acceptance: The old records are gone, while newer remain. Also ensure that deletion cascades properly (if there's foreign key to media, maybe media in storage should be cleaned too, though maybe out-of-scope to remove images from storage automatically – ideally yes to fully remove PII. Possibly leave that as a manual or future step. For now, at least remove DB reference).

 No Impact on Key Data – Confirm that the retention job does not delete anything that should be preserved. For example, invoice and job records should remain intact. Test by having an invoice older than 90 days and see that it’s still there after retention script (since we set only chat messages to delete). If we implemented retention as a simple table-specific delete, then okay.

 Org Isolation in Logs – Create actions in two different organizations, then query audit log as if filtering by one org. Acceptance: Logs have an org_id column correctly filled, and if we were to fetch logs for Org A, none from Org B appear. This is more structural, but we can manually verify the entries. This ensures if in future we show org admins their audit logs, they only get their own.

 GDPR Support (Theoretical) – While no user-facing GDPR features (like data download or deletion request) are built, we have the data model prepared to comply: We can remove chat data after X days (and we do), we keep necessary data (invoices) for required period (7 yrs), and we avoid needless personal data duplication (we reference customer IDs instead of copying names around). Acceptance: By reviewing the schema and logs, confirm that personal data is centralized (e.g., if a customer’s phone or name is updated or removed, we don’t have stale copies in multiple places aside from audit which can be anonymized). Also, internal note: if asked to erase a customer, we could delete or anonymize their record which would cascade or nullify foreign keys, though invoice needs retention; we might instead pseudonymize name on invoice if needed after 7 yrs. For acceptance, it's enough that we have documented plan for these (which this does).

 Monitoring of System Actions – Ensure that automated processes also log their actions. For example, payment reminders (S9) sending out should log “Payment reminder sent for Invoice #1001 to +316... by system.” Customer reschedule (S10) logs as "Customer rescheduled...". The presence of these entries confirms that even background or external triggered events are audited.

 Privacy by Design Check – Quick scan: No customer personal data is stored beyond what’s needed. Example: We store customer phone, name, address in customer table and on invoices (for legal reasons). We do not store their messages long-term. AI proposals might contain a summary of issue (which could implicitly include address if customer wrote it), but we could choose not to store the exact address in the proposal fields. At least, post retention period, that won’t exist because the original message was removed – though the AIRecommendation might still have "address": "123 Main St" if it parsed it. Possibly we should plan to remove or mask addresses in AI data after retention window. For acceptance, note this as a point to handle. But at MVP, not doing that yet.

 Plan for RLS – Although currently we enforce multi-tenant in server code, mention that the schema is compatible with future row-level security. E.g., every table has org_id, and we could add RLS policies easily. We are not implementing them now (NFR2 noted plan), but ensure no table lacking org link except perhaps some global reference tables. Acceptance: by design, yes (we confirm all sensitive tables – jobs, customers, invoices, messages, audit – have an org_id). This is a preparation for stricter security.

S12 — Dashboard Metrics & KPI Overview

📌 Objective: Provide a simple dashboard for the plumber/owner to see key metrics at a glance: today’s jobs, number of pending (unpaid) invoices, total revenue (period to date), and count of AI proposals waiting for review.

📂 Scope:

CREATE:

src/components/dashboard/MetricsPanel.tsx – A component that displays metric cards or rows for the key performance indicators: e.g., “Jobs Today”, “Pending Invoices”, “Revenue (Month)”, “AI Proposals Waiting”. Possibly using shadcn/ui Card or Stats components.

src/components/dashboard/JobsListToday.tsx – A compact list of today’s upcoming jobs (maybe just time and address/customer) so the plumber can quickly see what’s on schedule today from the dashboard.

src/server/api/routers/dashboard.ts – tRPC queries to fetch the data for these metrics. For example: getTodayJobs(orgId, userId), getPendingInvoices(orgId), getRevenue(period, orgId), getWaitingProposals(orgId). These will aggregate from other tables: jobs where date = today, invoices where status = unpaid, sum of invoices in current month that are paid (for revenue), and leads (unscheduled jobs or AI recommendations that are not handled).

src/lib/dateUtils.ts – Utility for date boundaries (like to get start of month, etc., using Temporal or date-fns) for the revenue calculation and “today” filter.

EDIT:

src/app/(dashboard)/page.tsx (or wherever the home dashboard is) – Incorporate the MetricsPanel and JobsListToday components into the initial dashboard view after login. If the structure uses layout, maybe put these in the main dashboard page.

src/server/db/sql/032_dashboard_indexes.sql – If needed, add indexes to speed up queries used in metrics (e.g., index on jobs by date for today's query, index on invoices by status, etc.).

src/i18n/nl.json – Add translations for metric labels like “Pending Invoices”, “Revenue this month”, etc.

⚙️ Commands:

Populate some data: a couple of jobs today, some invoices (paid/unpaid with amounts), and some unscheduled leads (AI proposals waiting). Hit the dashboard page and ensure the numbers reflect correctly.

Change some data (mark an invoice paid, add a job) and refresh to see metrics update.

Use pnpm check to ensure all queries properly typed (maybe use Prisma or SQL raw? Our stack likely uses Supabase which could allow direct SQL or use the types from generated types).

🚨 Escalate:

Definition of Revenue: Clarify if “revenue” means total of paid invoices for the month, or all invoices created? Likely paid (money collected) as that's a KPI. But Moneybird might not have direct feed in MVP. We can derive from invoices marked paid in our system (from Mollie webhook or manual mark). Make sure we sum only those paid. If none paid yet in month for new business, could be 0 which is fine.

Performance: If an org had thousands of jobs or invoices, queries should still be fine with proper indexing. But if summing all invoices to date each time could be heavy. Better filter to this year or month. For month revenue, query just current month which is small. For pending invoices, it’s just a count/filter which is fine.

Real-time: These metrics likely update after actions (like if an invoice gets paid, pending count should decrease). We might not implement live push updates (though Supabase could with subscriptions). MVP likely just gets updated on page load/refresh. That's acceptable. Possibly clicking refresh or navigating away/back updates it.

User Role Differences: If a staff plumber logs in, maybe they should not see company revenue or all pending invoices (owner sees that). Possibly staff sees just their today's jobs and maybe nothing else or just proposals assigned to them (if assignment exists). For MVP, if single plumber operations or small team, maybe all see the same. But role-based filtering might be needed: e.g., staff user might see only their jobs count if we wanted. But since the PRP said owner vs staff, we should at least hide financial metrics (revenue, pending invoices) from non-owner staff if confidentiality is a concern. Or show only owner has the full dashboard, staff sees a limited one (like just jobs today and maybe their pending tasks). We'll implement a simple check: if user role is 'owner' (we can get from Clerk org membership), then show all metrics; if staff, maybe hide revenue and pending invoices, or show just those relevant. That might be nice to do.

AI Proposals Waiting: define as count of unscheduled leads with AI suggestions that plumber hasn’t acted on. We should count any job/lead in unscheduled status. Or if we created a separate leads table or just use jobs status unscheduled. Let's assume jobs status 'unscheduled'. Use that count.

Accuracy vs Moneybird: If Moneybird is connected and plumber might create invoices outside our app or mark them paid outside, our numbers could skew if not synced. But since MVP expects using our flow, likely fine. If needed, mention that all stats are based on data within Plumbing Agent (which should mirror Moneybird via webhooks anyway for paid statuses).

Time Zone: "Today" should be determined in the plumber’s timezone (which is Europe/Amsterdam as default). Use Temporal to get current date in that zone. If user is in NL, straightforward. If system is used elsewhere, we'd need dynamic but for MVP assume NL.

Future enhancements: Perhaps they’ll want more metrics (like number of jobs this week, average response time, etc.) in future. But keep MVP to four metrics given.

🔐 Rules:

Multi-tenant Queries: All metrics queries must filter by org_id so that only that org’s data is aggregated. This is obvious, but make sure no cross-org leak (like summing all invoices in DB). Already our tRPC context probably has org. Use it in each query.

Role-based Display: Implement basic role check from Clerk (owner vs employee). Possibly store it in JWT or fetch membership role on session and pass to client. Then in UI, conditionally render revenue and invoice metrics only for owners/admins. Staff might see simplified (maybe just “My Jobs Today”). If role info not easily accessible, at least ensure staff can’t see revenue through API by enforcing that route either requires owner or returns their subset (like we could tailor getRevenue to require owner). For MVP, an easier path: if we trust small teams, maybe not worry. But mention in code or comment that in future hide sensitive metrics from staff.

No Mock Data: The dashboard should use actual live data. If some metric is zero (like no pending invoices yet), show 0 or a friendly “No pending invoices!” rather than any placeholder. We explicitly avoid any hardcoded dummy numbers.

Refresh and Source of Truth: The data should be computed live (or near-live). We won’t implement caching beyond maybe relying on Postgres materialized view if performance needed (not needed now). So if an invoice status changes from unpaid to paid, a refresh (or navigating away/back) will reflect the new count. We won't require manual “refresh” button in UI aside from page reload.

UI/UX: Use clear labels and maybe icons for each metric. Possibly color-code: e.g., pending invoices count in red if >0 (needs attention), revenue in green. But keep it simple and clean. Use shadcn Card or Alert components. Ensure accessibility of color (use icons or text, not color alone to indicate good/bad).

Mobile: The dashboard should still look okay on mobile (cards stack vertically, not overly wide). Many plumbers might check on phone. Ensure metrics panel is responsive (e.g., use flex wrap or column layout on small screens).

Internationalization: Show currency with locale formatting (we have nl-NL presumably, so “€1.234,56”). Use e.g. toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' }) or similar. Times/dates also should be formatted (though on dash, maybe just numeric count except maybe the "Today" date or jobs list times). Use 24h times in jobs list.

No PII in metrics: The metrics themselves are aggregate counts or sums, so they’re fine. The jobs list might show customer names – which is fine for the plumber to see their own customers. The revenue figure is sensitive but internal. It's fine.

📋 Acceptance Criteria:

 Displays Key Metrics – When an owner user logs into the dashboard, then they see a panel of at least four metrics: (1) Jobs Today – the number of jobs scheduled for the current day (e.g., “Jobs Today: 3”), (2) Pending Invoices – the count of invoices that are sent but not yet paid (e.g., “Pending Invoices: 2”), (3) Revenue (This Month) – the total € of paid invoices for the current month (e.g., “Revenue (Oct): €5.200” or “€5,200” in Dutch format), and (4) AI Proposals Waiting – the number of AI-generated job proposals/leads that have not been confirmed or dismissed (“AI Proposals Waiting: 1”). These should be clearly labeled and possibly with small icons. Acceptance: The numbers accurately reflect the seeded data (we cross-check by manually counting jobs on today’s date, etc.). If any metric is zero, it still shows (“0”) clearly.

 Jobs Today List – Below or alongside the metrics, the dashboard shows a list of today’s jobs with basic info: ideally sorted by time. For example, it might list: “09:00 – John Doe (Leaky faucet)”, “13:00 – Acme Corp (Boiler maintenance)”, etc. Acceptance: The list includes all jobs for the logged-in user’s org that start today. If an owner, it might list all employees’ jobs (with maybe the employee name or initial noted). If a staff, list just their jobs. It's clear and matches what the calendar (S4) shows for today. If no jobs today, show “No jobs scheduled for today.”

 Pending Invoices Count Correct – Create e.g. 3 invoices, mark 1 as paid and 2 as unpaid. The dashboard’s Pending Invoices metric should show “2”. Mark another as paid, refresh, it shows “1”. Acceptance: The count updates as expected based on invoice statuses in DB. The metric likely excludes draft invoices or those not sent; we consider pending = sent but not paid. In our system, once invoice is created and link sent, it’s pending until paid, so that’s fine.

 Revenue Calculation – For the current month, sum all paid invoices’ totals. Example: If in October there are 2 paid invoices: one €100 and one €150 (including VAT), revenue should show €250. If none paid yet, show €0. If Moneybird integration is on, ensure we mark invoice totals in our DB so this sum is possible. Acceptance: The number shown matches the manual sum of known paid invoices. Also formatted with currency symbol and appropriate separators for locale. Possibly accompanied by a label like “Revenue (Oct 2025)” if year needed, but month name alone is fine if it’s clearly current year.

 AI Proposals Waiting – We consider proposals waiting as unscheduled leads count (FR7 wording “AI proposals waiting”). If there are e.g. 2 WhatsApp conversations that have AI suggestions not yet acted on (jobs not scheduled), the metric shows 2. If plumber converts one to job, it becomes 1. Acceptance: Confirm by making some leads: e.g., two entries in jobs table with status 'unscheduled'. Dashboard shows 2. After scheduling one (status->scheduled), count goes to 1.

 Role-Based Visibility – Scenario: staff login vs owner login. If implemented, when a non-owner plumber logs in, then either they see a limited dashboard (maybe only “My Jobs Today” and perhaps AI proposals relevant to them) and not the financial metrics. If we skip hiding in MVP, then we state that currently all metrics show to any logged-in user of the org. (However, highlighting in doc: if this were prod, probably should hide revenue from regular employees.) We decide an approach: ideally, hide revenue and pending invoices for non-owners. Acceptance (if implemented): Log in as a test staff user (with Clerk role 'basic' or so) and see that Revenue and Pending Invoices either are not shown or show blank/NA. They might still see their jobs count and maybe proposals count if those proposals are something they handle (though leads usually handled by owner then assigned). It's okay either way, but we ensure either parity or purposeful omission.

 Accurate Org Filtering – If we had multiple organizations in data, ensure that each org’s user sees only their org’s metrics. e.g., Org A has 5 jobs today, Org B has 2; a user from Org A sees “Jobs Today: 5”. Acceptance: Verified by either switching org in Clerk or simulating with two users. All queries use org_id context, so this should hold.

 Responsive Design – View the dashboard on a mobile screen (e.g., using dev tools or an actual device). Acceptance: Metrics cards stack nicely (not cut off), text is readable without zoom. The jobs list is scrollable if too many jobs but likely fine. On desktop, maybe metrics are in a grid of two columns by two rows or all in one row with space – in any case, it should use space well and not look awkward.

 Real-Time Updates (Optional) – Not strictly required, but if we use Supabase realtime or similar, we could auto-update metrics (for instance if an invoice gets paid while dashboard open). For MVP, likely not. So acceptance is that a manual refresh (browser refresh or revisit page) updates the metrics after any changes. No stale data beyond user session. Possibly we note a future enhancement for live updates.

 No Mock Info – Check the production build to ensure no placeholder text like “$$$” or “Lorem ipsum” anywhere. All fields should either show a number or be absent. Eg, if a metric has no data, we show 0 or “€0”. The UI should not show “--” unless intentionally (could do that for revenue if not available, but we have it). Acceptance: All four metrics are always visible (some with 0 if necessary) so the layout is consistent, and all come from actual computed values.

 Audit Log for Metrics? – Not needed; reading metrics doesn’t change data. But ensure if any data is derived from audit (like number of proposals waiting could come from audit logs of proposals? But we used unscheduled jobs approach). So fine.

 Consistency – Check that the numbers align with other parts of the app: e.g., Jobs Today count equals the number of entries in Today’s list (it should, or else clarify if count includes all whereas list might be partial for user – ideally they match if owner sees all jobs, count is all jobs). Pending invoices count should match the number of invoices listed in an “Invoices” page filter if that existed. If we had “AI proposals waiting” presumably matches the count of items in leads drawer (S3). For acceptance: cross-check a scenario: have 1 unscheduled lead and 1 scheduled job for tomorrow, the proposals waiting metric should be 1 and the unscheduled leads drawer also shows 1 item. This consistency ensures no confusion.