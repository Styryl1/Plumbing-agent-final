GPT-5 Codex — Non-Negotiable Rules (Plumbing Agent)

Mission: Deliver the Plumbing Agent MVP – an AI-assisted intake → proposal → schedule → offline job card loop for Dutch plumbing teams – adhering to GDPR, strict RLS, and provider-integrated invoicing. (See Docs/plumbing_agent_mvp_epic.md for overview). All features are staged in slices per PRP/Epic.

Tooling & Context Commitments

Small, focused diffs: Scope each task to a manageable change set (avoid sprawling commits). This aligns with best practices of keeping diffs small and incremental
honeycomb.io
. If tasks get too large or vague, the agent may “wander off” and produce nonsensical or non-compiling code
honeycomb.io
.

Continuous self-checks: After editing 1–2 files or a logical chunk, run pnpm check (which runs type-checks and other validations) and fix issues immediately. Don’t proceed with broken builds or failing tests. Using compiler feedback in short loops significantly reduces syntax errors and hallucinated interfaces
crawshaw.io
.

Full pipeline on completion: Once a feature “slice” is done, run the full pnpm guard pipeline (type-check, lint, tests, etc.) with an extended timeout before handing back the result. The agent will automatically execute listed build/test commands and attempt to fix any failures before finishing
agents.md
. Always ensure all guards pass.

Load context – never guess: Before coding, open and read all relevant PRPs/Epics in Docs/ (requirements, acceptance criteria). Key docs for most tasks include plumbing_agent_mvp_prp.md, plumbing_agent_mvp_epic.md, whatsapp_ai_unified_prp.md, schedule_x_prp.md, and invoicing_epic.md. Do not speculate on requirements – use the provided context. As one developer noted, AI agents “will never know exactly what it is that you are building and why… without you telling them”
infoq.com
, so we must explicitly provide business logic and context every time.

Use CLI tools for insight: Default working directory is /home/styryl/dev/pa. Use CLI tools like rg (ripgrep), sed, ls to inspect the codebase rather than relying on memory. Before writing code, snapshot the repo state (git status -sb, search for TODO/FIXME) to avoid duplicating work and to incorporate any existing to-do comments.

Leverage MCP servers (no simulations): We have various Model Context Protocol (MCP) integrations
infoq.com
infoq.com
 available – use them for real feedback and operations, instead of guessing outcomes:

Supabase (DB): Apply migrations and introspect the schema via the Supabase MCP server. After any DB migration, run mcp__supabase__generate_typescript_types() (which updates our src/types/supabase.generated.ts). Commit the refreshed types (ensuring the manual shim src/types/supabase.ts remains only for extending types).

Playwright (browser): Use the Playwright MCP to run interactive browser flows, capture screenshots, and perform accessibility checks on UI changes. This helps verify UI/UX in a real browser context.

Context7 (library docs): Use context7 to resolve and fetch live documentation for libraries instead of relying on outdated memory. This ensures correct API usage – the agent can pull in official docs via tools (akin to web_search or similar) to avoid hallucinating function names
crawshaw.io
.

Firecrawl (web): When uncertain about an external API or spec, use the firecrawl tool to search or scrape external resources (StackOverflow, official docs, etc.). This external lookup greatly improves accuracy of API usage
crawshaw.io
.

Testsprite, Clerk, Shadcn, Semgrep: Use these MCP endpoints as needed:

Testsprite for generating or running broader test scenarios (especially for complex end-to-end flows). Automated testing closes the loop by catching errors in generated code and even encourages writing missing tests
crawshaw.io
.

Clerk for simulating authentication/org workflow (e.g., test multi-tenant scenarios via Clerk’s API).

Shadcn UI for scaffolding consistent UI components (the agent can invoke a UI component library generator to enforce design consistency).

Semgrep for security scans and linting beyond our ESLint rules. It can catch vulnerabilities or anti-patterns; run it and fix any findings.

No fake outputs: Do not fake tool responses. Always run the actual tool. For example, let the Playwright tests truly execute and return results; let Semgrep output real findings. LLM agents have been known to sometimes “fake” success messages or test results
symflower.com
 if they only predict the outcome. We prevent this by actually invoking tools and validating their output.

Audit logging for AI proposals: All AI-initiated actions are propose-only and require human approval. For any AI-generated plan or JSON output (like AI-suggested schedule changes or WhatsApp replies), validate it against a Zod schema (we use Zod v4) and log the proposal along with whether it was accepted or rejected. Every AI JSON payload must be parsed with our Zod schemas before use (see src/server/api/routers/ai.ts for the pattern). This provides a safety net, as structured validation catches any format errors and prevents blindly trusting the AI output
inferable.ai
. Each decision (accepted vs. overridden) is recorded to an audit log as per Docs/whatsapp_ai_unified_epic.md. This diligence is critical because LLM outputs can sometimes be incorrect or overly confident; strict validation ensures reliability and compliance
symflower.com
.

Workflow Quickstart

Read Requirements – Begin by reading the active PRP or Epic slice in Docs/. Understand the acceptance criteria and scope. (E.g., if working on the scheduling UI, read schedule_x_prp.md thoroughly.) If anything is unclear, stop and seek clarification rather than guessing.

Prep Environment – Identify relevant existing code. Use rg to find related modules, and ls to navigate. Use context7/firecrawl to load any needed library docs or API specs. Initialize any required MCP servers (Supabase, Playwright, etc.) that you’ll need during development (e.g., start Supabase for DB changes, Playwright for UI verification).

Plan the Diff – Outline a minimal viable implementation plan (either mentally or in comments) before editing. Determine which files and functions need changing or creation. Aim for the smallest coherent change that delivers the slice’s requirements, rather than broad, speculative changes
honeycomb.io
. If the plan seems to touch too many areas, consider breaking the task into smaller subtasks.

Code with Checks – Implement the plan, writing code in small increments. After modifying 1–2 files or completing a logical unit of work, run pnpm check (this runs type-checking and any quick linters/tests). Address all errors or test failures immediately. This tight loop prevents compounding errors and keeps the agent on track, much like how a developer compiles and tests frequently to avoid big bangs
crawshaw.io
.

Repeat – Continue planning and coding in small chunks, running pnpm check frequently. Maintain a checklist of the requirements and mark them off as implemented. If a dependent requirement or PRP is ambiguous, pause and load more context (or ask for guidance) before proceeding.

Full Validation – Once the slice is complete (all subtasks done), run pnpm guard to execute the full validation pipeline. This runs our complete test suite, linter, type-checker, etc., and may execute MCP playbooks (like Playwright scenarios, Semgrep scan). The agent should wait for all checks to pass. If anything fails here – e.g., a test fails or a new lint rule is triggered – fix those issues before finalizing. The AGENTS.md file’s instructions, including build/test commands, are used by the agent to plan this verification step
docs.factory.ai
, ensuring that code contributions meet our standards.

Evidence & Handoff – After a clean pnpm guard run (all green), collect proof of correctness: e.g., relevant test outputs or screenshots from Playwright (for UI changes), the updated supabase.generated.ts (for DB changes), etc. These artifacts should be included in the handoff or PR description. By providing objective evidence (tests, snapshots, logs), we ensure trust in the change
docs.factory.ai
.

Commit Convention – When everything is verified, prepare a commit or PR. Use the conventional format for commit messages: [{package/component}] Short description of change. Include references to the PRP/Epic ticket number if applicable. Ensure the diff is limited to the intended scope (no sneaky unrelated changes). If the diff grew too large or includes noise, consider splitting commits or cleaning up before final submission.

0) Scope & Diff Budget

Lean, purposeful changes: Keep change-sets deliberate and minimal. We do not impose arbitrary file or line limits (e.g., there’s no hard “10 file” or “300 line” cap), but every edited line should serve the task’s goal. If a fix or feature requires a large diff across many files, that’s acceptable – but avoid unnecessary refactors or tangents. In short, don’t sacrifice completeness for artificial limits, but don’t introduce unrelated changes either. Small, focused diffs make it easier to review and maintain quality
honeycomb.io
.

Prefer extension over modification: When possible, add new modules or adapter functions rather than deeply rewriting core logic. It’s safer to extend (or wrap) existing functionality than to change it in-place, unless a refactor is part of the task.

Monitor error count: If you encounter more than 3 unexpected, unresolved TypeScript errors or a test suite with widespread failures, do not plow ahead. Stop and re-evaluate. Large numbers of errors might indicate a misunderstanding or a design that’s not fitting. In such cases, it’s better to pause, report the blockers (with file/line references and your intended fix), or break the task down further, rather than producing a broken implementation.

Avoid scope creep: Stick to the acceptance criteria of the active PRP/Epic. If you notice tangential issues (like a pre-existing bug or a TODO in unrelated code), document them or create a separate task, but do not try to fix everything at once in this diff.

Iterate with feedback: Use the “plan → code → check” cycle repeatedly to keep scope in check. This incremental approach is how human developers avoid getting lost, and it’s equally vital for an AI agent
honeycomb.io
. When the agent strays beyond the specified scope or starts making assumptions, it’s a warning sign – refocus on the defined requirements (or get clarification if the requirements are too vague).

1) Architecture & Boundaries

Layer separation: Follow the DTO → Mapper → UI flow strictly. Data coming from the database (e.g., Supabase rows) should be converted into defined Data Transfer Objects (DTOs) or domain models in the server layer, then mapped to UI-friendly formats if needed, before reaching React components. Never pass raw database rows directly into React – this ensures we can change back-end implementations without breaking the front-end and keeps types precise.

tRPC only for client-server: The client (React/Next.js) must never directly access the database or external services. All client-server communication goes through our tRPC API routes (see src/server/api/routers/*). That means no direct fetch calls to Supabase from the React side, and no use of service keys in the browser. This pattern enforces a clean API boundary and prevents security leaks, echoing the T3-stack principle of end-to-end type-safe APIs
supabase.com
.

No client-side secrets or logic: Do not import server-only modules (like Node fs, backend-only configs, or the Supabase service key) into any client-side code. If a React component requires some sensitive operation, move that logic to a tRPC procedure or Next.js Route Handler. Always assume anything sent to the client can be inspected by the user.

AI proposals are not final: Treat AI-generated outputs as suggestions that must be vetted. When the AI subsystem proposes a JSON outcome (for example, an AI-generated scheduling suggestion), use our Zod schemas to validate it before using it. If the schema check fails, the agent should correct the output (or request a correction) before proceeding
inferable.ai
inferable.ai
. Every acceptance of an AI-suggested action must be logged (including who/what approved it). This ensures a human or deterministic check gatekeeps any AI decision – vital for safety.

Audit and rollback: For any automated decision (like an AI classification of a message or an AI-generated scheduling change), record the input, the AI’s output, and the final decision (approved/applied or rejected/overridden). In case of errors, we need traceability. If an AI action is later identified as incorrect, we must be able to trace and undo its effects. The system should be designed such that AI-initiated changes are easy to revert if needed (e.g., AI proposals might be applied via explicit user clicks or queued for review rather than immediately stored).

Post-DB migration workflow: Whenever a database schema change is made (e.g., a new table or column via Supabase migration scripts), after running the migration, use the Supabase MCP to regenerate TypeScript types. This means calling the Supabase tool to introspect the DB and update supabase.generated.ts. Always do this before using new DB fields in code, to catch type mismatches. The generated file is the source of truth for DB types – do not manually edit it. We maintain a small shim (src/types/supabase.ts) for custom helpers or type adjustments, but the generated file ensures our code matches the actual database schema, saving us from runtime errors.

Encapsulation of integration logic: Each external integration (WhatsApp API, Mollie payments, etc.) should be wrapped in a dedicated service/module on the server side. For example, WhatsApp message handling lives in one module and is accessed via a clear interface, rather than scattered direct API calls. This modular approach isolates third-party intricacies and makes testing easier. It also prevents one integration’s quirks from leaking into other parts of the code.

2) Time, Money, i18n (Dutch Defaults)

Use Temporal API for time: We use the TC39 Temporal API for all date/time handling (via temporal-polyfill). A global import of temporal-polyfill/global is done in src/app/layout.tsx to make Temporal available. Do not use the built-in JavaScript Date for new code. Temporal’s ZonedDateTime, Instant, etc., give us proper time zone and DST handling. In practice, use helper functions in src/lib/time.ts (parseZdt, zdtToISO, parseDate, dateToISODate, etc.) for consistency. This ensures 24-hour time and European date formats are handled correctly, and avoids the many pitfalls of Date.

Monetary values in cents: Store and process all monetary values as integer cents (minor currency units). For instance, €19.99 should be represented in our system as 1999 (int). This avoids floating-point rounding errors in currency calculations
blog.agentrisk.com
. Use our Zod schemas (see src/schema/invoice.legacy.ts or newer invoice schemas) to enforce that prices are integers (and possibly non-negative, etc.). Any conversion to human-readable format (like “€19.99”) should happen at the display layer using formatting functions, not in core logic.

Currency and locale: Default to Dutch locale (nl-NL) for formatting. Use Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }) for currency display to get “€” and proper comma separators. For dates and times, use 24-hour format by default (e.g., toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) yields 14:30 for 2:30 PM). These defaults should be applied unless a user’s profile or settings specify otherwise.

Translations: We maintain English and Dutch messages in JSON under src/i18n/messages/en/*.json and src/i18n/messages/nl/*.json. Use the useTranslations() hook from next-intl for any user-facing text. Do not hardcode text strings in components – every label or message should go through the i18n system so that Dutch (and potentially other languages) are supported. When adding new text, add it to the appropriate en and nl JSON files with matching keys. After editing those, run pnpm i18n:aggregate to rebuild the en.json and nl.json aggregates, then run pnpm check to ensure no missing translations. Always provide Dutch translations for new text (if unsure, use a placeholder and mark it, but prefer getting a proper translation).

Numeric formatting: Use proper thousands separators and decimals in UI. For example, use new Intl.NumberFormat('nl-NL').format(number) for plain numbers. This will format 10000 as “10.000”. For percentages or other formats, also leverage Intl or our utility functions to maintain consistency.

No implicit UTC: Always be explicit with time zones. If storing a timestamp that isn’t already timezone-aware (Temporal types are, but if using ISO strings or Unix epochs anywhere), clarify if it’s UTC. Our preference is to store timestamps in UTC (or as ZonedDateTime with zone info) and convert to the user’s zone in the UI. The Netherlands is CET/CEST; however, we might have users across Europe. Rely on Temporal to handle these conversions correctly. Avoid using local system time zone implicitly in any server code – it should either be UTC or specified.

3) Next.js App Router & React Discipline

Server Components by default: In the Next.js App Router (our project is on Next 13+), components are Server Components unless otherwise specified. Take advantage of this. By default, make new components or pages server-side (no use client at the top) so they don’t include unnecessary JS on the client. Server Components can fetch data directly (via our tRPC or database queries on the server) and send fully rendered HTML to the client, improving performance
medium.com
. Only convert a component to a Client Component ("use client" directive) if it needs interactivity (state, event handlers, browser-only APIs).

Isolate browser-specific code: Never import server-only code into a Client Component. For example, environment variable utilities (which may include secrets) should stay on the server. If you find you need some data from a server-only module in the client, that’s a red flag – instead, fetch that data via a tRPC query or Next.js API route.

Split concerns: If a component has both interactive parts and heavy non-interactive logic, split it. Keep the parent as a Server Component that fetches data and renders static parts, and nest a small Client Component for the interactive widget part. This way most of the UI loads quickly and only the minimal JS is shipped for interactivity
medium.com
.

Lightweight clients: Client Components (for forms, buttons, modals, etc.) should be as lean as possible. No heavy computations or large data processing in the browser. Offload to web workers or back to the server if needed. Use React hooks effectively to avoid re-renders and subscribe only to necessary context/state.

No global client state singletons: Avoid patterns that mimic a global mutable state on the client (other than via React Context if truly needed). Our app should be mostly driven by server state (fetched via tRPC or server components). This prevents out-of-sync issues and leverages the server as the source of truth.

Styling and components: We use Shadcn UI (a set of pre-built Radix + Tailwind components) for consistent design. When adding UI elements, prefer using our existing component library or following its established patterns (e.g. for form inputs, modals, tables). Keep styling consistent with the rest of the app (Tailwind CSS utility classes, theming). If you need a new UI pattern, try to compose it from existing primitives (and consider adding a reusable component to our library if it will be used elsewhere).

Accessibility first: As you build UI, recall that we target WCAG AA compliance. This means:

All interactive elements must be reachable via keyboard (tabindex, proper HTML semantics).

Provide aria-labels or screen reader text for icons or non-text buttons.

Ensure color contrast meets AA standards (use our design tokens or check contrast for any new colors).

Include focus states for interactive elements (Tailwind’s focus: classes or our component defaults handle many, but be mindful if customizing).

For dynamic content or modals, ensure proper ARIA roles (e.g., role="dialog", aria-modal="true", focus trap in modals, etc.).

Testing UI with Playwright: After making UI changes, especially ones affecting navigation or forms, create or update Playwright tests (if not already covered by an existing test). The MCP Playwright server allows the agent to programmatically open pages and verify behavior – use it to assert that important flows (like submitting a job proposal, or marking a job as complete) still work and are accessible. For instance, after changing the calendar drag-and-drop, run a Playwright scenario that drags a job card and ensure it saves correctly, as per our acceptance tests. The agent should capture snapshots of any UI changes (for visual verification)
docs.factory.ai
 and include them in the output evidence.

4) Data Security & AuthZ

Multi-tenant awareness (Clerk + RLS): Our app is multi-tenant (plumbing companies, each with their own staff and customers). We use Clerk for authentication and organization context. In every tRPC procedure, derive the orgId, userId, and user role (e.g., Owner, Admin, Staff) from the Clerk-provided context. All data queries must be filtered by orgId (either implicitly via RLS or explicitly in the query) so one org cannot access another org’s data. Always assume orgId is required when querying the database. The tRPC context setup (src/server/api/trpc.ts) already attaches these; use them.

Role-based access: Enforce authorization checks on all sensitive operations. For example, only an Admin or Owner should be able to create an invoice, or only Staff+ roles can mark a job as complete. We have helper functions (e.g., ensureRole(role) or similar) to validate roles inside procedures – use them consistently. If a certain endpoint should only be called by owners, throw if the current user’s role is insufficient.

Supabase RLS: Supabase’s Postgres Row-Level Security is our last line of defense. We have RLS policies on every table in the database (see Supabase migration files under supabase/migrations/ for details). Design server queries to work with these policies. For example, when using the Supabase JS client on the server (with the service role key), you must still specify the org_id in the query where relevant, because even though service key can bypass RLS, we often simulate RLS in code to avoid accidental cross-org access. Never send the service_role key to the client – that key bypasses all RLS and must remain absolutely secret
supabase.com
. Use the anon key on client (which is RLS-restricted) and the service key only in backend secure functions.

Environment secrets: Keep secrets out of git and out of client code. Our environment variables (API keys, etc.) are defined in src/lib/env.ts with a Zod schema and loaded via Next’s environment system. The agent should not hard-code any credentials or tokens – instead, assume the correct values are in process.env. If writing code that needs a new secret (e.g., an API key for a new integration), update the env schema and use process.env.MY_SECRET on the server side. Document the expected env var in the README if needed, but do not commit actual secret values.

Webhook security: We integrate with external providers via webhooks (e.g., WhatsApp inbound messages via MessageBird or Twilio, Mollie payment status updates, Moneybird invoice callbacks). Always verify webhook signatures and authenticity. Each provider has a way to ensure the request is genuinely from them (for Mollie, an X-Mollie-Signature HMAC header
docs.mollie.com
; for Twilio/MessageBird, an HMAC or token, etc.). Implement the verification as per provider docs before trusting the payload. Also enforce idempotency: many webhooks can be delivered twice, so our handlers should check if the event (by ID) was already processed and skip duplicates.

No plaintext sensitive data: Do not log personal data or secrets. When logging (especially since we audit AI decisions and user actions), sanitize or omit PII and credentials. For instance, log user IDs, not names/emails; log a hash or ID of a record, not full content. This is both for GDPR compliance and general security hygiene.

Data validation at boundaries: All external input (including AI-generated content, as noted) must be validated. Use Zod .input() schemas on tRPC routers to validate incoming payloads from the client. Use Zod schemas for any external API responses if you rely on them (to guard against unexpected data). This way, if an external system returns something weird, or if the client submits bad data (or an AI generates an out-of-spec response), our system will catch it early. Essentially, any function boundary that receives untrusted data should immediately validate that data. This principle keeps bugs and security issues to a minimum
docs.factory.ai
.

5) Scheduling & Calendar

Schedule-X as source of truth: We have an internal calendar/scheduling service (“Schedule-X v3”) that manages job scheduling. All calendar events and job bookings should go through Schedule-X’s API or database tables (depending on integration point). Do not create ad-hoc scheduling logic. For example, to check availability or to book a slot, use the provided functions or queries outlined in Docs/schedule_x_prp.md instead of inventing new ones.

Temporal calculations: Use the Temporal API for any date math (meeting length, next available slot, etc.), as mentioned above. This ensures consistent handling of time zones, DST changes, etc., when scheduling jobs. For instance, if we need to snap a time to the nearest 15-minute increment (common for scheduling), use our helper that leverages Temporal to do this correctly.

15-minute snap rule: All jobs are scheduled on quarter-hour boundaries by business rule. So a job could start at 09:00 or 09:15 or 09:30, but not 09:10. When implementing scheduling UI or logic, always snap times to 15-minute increments. The UI picker should increment by 15, and any manual inputs should be rounded.

Color coding: Use deterministic color assignment for calendar entities (like each employee has an assigned color for their calendar events). We have a utility in src/components/calendar/useEmployeeColors.ts that assigns colors based on employee ID hashing. Use that for consistency so that each staff member’s events appear in the same color everywhere.

Multi-assignee support: Our scheduling supports multiple employees per job. Ensure that UIs account for this (e.g., a job card can show two initials, etc.), and that any scheduling logic does too (e.g., when checking availability, all assigned employees must be free at that time). The database schema links jobs to employees via a join table – use it properly rather than a single assigneeId.

Optimistic updates & rollback: When implementing drag-and-drop or quick scheduling changes on the UI, we use optimistic updates (update the UI immediately) but must rollback if the server (tRPC call) rejects it. Follow the pattern in our existing calendar component: on drag end, call a mutation to save the new time; if it fails, show an error and revert the change. Ensure the agent preserves this UX pattern to avoid inconsistent states.

Conflict handling: If two schedulers try to move overlapping jobs, the backend should reject one due to RLS policies or explicit checks. Make sure to surface such conflicts to the user with a clear message (e.g., “Slot already taken, please refresh”). The agent should not assume this rarely happens – write code to handle it gracefully (perhaps using a transaction or checking again before final save).

Refer to PRD: The scheduling logic has many domain-specific rules (like off-hours scheduling, urgent job highlighting, etc.) defined in Docs/schedule_x_prp.md. Refer to that document whenever working on scheduling features to ensure compliance with business rules.

6) WhatsApp + AI + Job Cards Loop

Two-number routing: The plumbing companies have two WhatsApp numbers: one for customers to send messages to, and one for internal control/dispatch. Our system differentiates inbound messages from customers vs. controllers. Make sure any WhatsApp message handling logic respects this:

Customer incoming messages (to the customer-facing number) should be parsed and fed into our AI triage system to draft a response or create a job proposal.

Internal controller messages (to the internal number) might be commands or confirmations that skip AI processing and go directly to actions.
Each inbound webhook payload contains which number it came in on; use that to route logic. This is described in Docs/whatsapp_ai_unified_prp.md.

24-hour session vs. template: Understand WhatsApp’s messaging window rules. Once a customer sends a message, we have 24 hours to freely chat (session). After 24h of inactivity, we cannot send any free-form messages – only templated messages are allowed
enchant.com
. Our system should enforce this: the AI or controllers should not attempt to send a normal message outside the 24h window. Instead, use a pre-approved template (via the WhatsApp API) for re-engaging after 24h. The agent should be aware of this rule so it doesn’t inadvertently violate WhatsApp policy. We have a utility to check if a conversation is still in session or needs a template.

AI triage workflow: Incoming customer WhatsApp messages are processed by an AI (LLM) to classify intent and propose actions (e.g., identify if it’s a request for a new appointment, a reschedule, a cancellation, etc.). The AI will output a suggested action (like “customer wants to book a maintenance appointment next week”) along with structured data (proposed date/time, service type, etc.). This output must be treated as a proposal: it gets reviewed by a human dispatcher (controller) in our interface. The dispatcher can then accept it (which creates a job in the schedule) or modify it. No job or change goes live without human approval. Ensure that code handling these proposals always waits for an explicit human confirmation.

Track decisions: Every AI suggestion and the human decision on it should be logged. For example, if the AI suggested scheduling on Dec 5, 10:00, and the dispatcher edited it to Dec 6, 09:00 before accepting – log that the suggestion was modified. We maintain an audit trail in the database (see AuditLog model) for AI-human interactions. Update it accordingly in any new flows.

Job Cards offline-first: The job cards (work orders) used by field plumbers are available offline (in the mobile app) and sync when connectivity is restored. When altering anything related to job cards, maintain this offline-first approach:

Any changes to a job card (like marking a task complete or adding notes) should be queued locally if offline and synced via background sync.

Design conflicts resolution: if two updates happen (one offline, one from HQ) to the same job, define which wins or how to merge (the PRD has a section on conflict policy).

Do not assume constant connectivity. Use our existing service worker and sync logic (if extending) rather than requiring an online round-trip for critical actions.

Notification boundaries: If an appointment is scheduled or changed as a result of the WhatsApp loop, ensure the customer gets notified (usually via WhatsApp template message confirmation) and the internal team gets updated (maybe via the internal WhatsApp or email). These notification triggers are in the PRD – keep them in mind when adding new reasons for notifications. Always verify that notifications comply with WhatsApp’s rules (e.g., use a template if outside 24h).

HMAC and Idempotency: As in security, all WhatsApp webhooks (from Twilio or MessageBird) must verify the signature to ensure it’s truly from WhatsApp provider. Also, use the messageId or similar to avoid processing the same message twice. Our webhook handler should quickly check a cache or DB to ignore duplicates. This prevents double-creating jobs from one message.

7) Invoicing & Payments (Provider-Based)

External invoice systems: We integrate with providers like Moneybird, e-Boekhouden, and WeFact for invoicing. These external systems are the source of truth for invoices after we send them. Our app generates draft invoice data, but when an invoice is sent through a provider, the provider assigns the official invoice number and PDF. Always rely on the provider’s response for final details:

Do not generate our own invoice numbers; use the number returned by the provider API.

Save the PDF or UBL link provided by them (we might store a copy or reference).

Mark invoices as sent only if the provider API call succeeded.

If editing an invoice after sending, that likely means creating a follow-up or credit note in the provider system – our system doesn’t directly edit after send.

Feature flags for providers: We have environment flags like ENABLE_MONEYBIRD, ENABLE_EBOEK, etc., to toggle which provider is active for a tenant. Code that deals with invoices/payments should check these flags or the tenant’s settings. For example, if ENABLE_MOLLIE=true for payments, then the payment link is via Mollie; if false, maybe payments are disabled or handled differently. Make sure to wrap provider-specific logic in the appropriate conditionals.

Payment flow (Mollie + iDEAL): For online payments (iDEAL via Mollie):

When an invoice is created that requires online payment, our system creates a payment intent via Mollie’s API. The API returns a payment link (_links.checkout) which we provide to the customer (usually via an email or WhatsApp message).

Redirect handling: After payment, Mollie will redirect the user to our return URL (which shows a “thank you” or “error” page), but importantly, do not trust the redirect alone for payment status. Always wait for the Mollie webhook to confirm payment status
docs.mollie.com
. The webhook payments.payid event tells us definitively if the payment succeeded, failed, expired, etc. The return page should likely poll or inform the user that confirmation is pending if we haven’t received the webhook yet.

On receiving a successful payment webhook, mark the invoice as paid in our system and possibly notify (e.g., send a receipt or update the status in the app).

Make sure to handle edge cases: payment expired or failed – in those cases, perhaps allow the user to retry or send a new link.

Never consider an invoice “paid” just because the user was redirected to our success page; always double-check with Mollie’s reported status (this prevents scenarios where a clever user could spoof a return).

Provider webhooks: Similar to above, when using Moneybird or others, if they have webhooks for events (like if an invoice is viewed or paid via their system), we should capture those. Ensure any webhook handlers for those providers verify authenticity and update our records accordingly.

Error handling and reconciliation: If a provider’s API is down or returns an error, handle it gracefully. E.g., if Moneybird API call fails to send an invoice, our system should catch that and not mark the invoice as sent. Perhaps queue a retry or alert an admin. We cannot assume third-party services are 100% reliable.

Tax and currency considerations: Most of our tenants are in the Netherlands (EUR currency, VAT system). However, if any provider integration involves currency or tax configuration, use the tenant’s settings (we store default VAT percentages, etc.). Ensure the amounts we send to providers match our records. Also, any currency conversion (if in future needed) must be handled carefully – but likely everything is in euros for now.

Never double-charge: If integrating recurring payments or retrying failed payments, implement safeguards so the customer is never charged twice for the same invoice. Use Mollie payment IDs or Moneybird invoice states to prevent duplicate processing.

8) Accessibility, Mobile, UX Polish

Meet WCAG AA: All UI changes must at least meet WCAG 2.1 AA guidelines. This includes:

Touch targets: Interactive elements (buttons, icons, etc.) should be at least 44px by 44px in clickable area
docs.factory.ai
. If you add a small icon button, ensure it has sufficient padding.

Color contrast: Use our theme colors which have been tested for contrast. If you introduce a new color (rare), check that the contrast ratio with text is at least 4.5:1 for body text or 3:1 for large text.

Focus indicators: Don’t remove the default focus outline without providing an equal or better alternative. Our design uses a custom focus ring; ensure it’s present for any custom component.

Alt text: Any image needs an alt attribute (or empty alt if decorative). Any icon used as a button or link needs an aria-label describing its action if no visible text.

Loading and feedback: Provide users with feedback on actions:

Use skeletons or spinners for content that is loading (especially lists or pages that take more than ~500ms to load). We have a Skeleton component for placeholders.

Use optimistic UI updates with undo where appropriate (e.g., deleting an item could immediately hide it and show an “Item deleted. Undo?” message, instead of waiting for server response).

Avoid modal confirmation popups for destructive actions; instead favor the above undo pattern or a soft-delete that can be reversed. This keeps UX smooth.

Mobile-first design: A lot of our users (plumbers) use the app on mobile devices. Any new UI must be tested in a mobile layout. Use responsive design (Tailwind’s responsive classes). Ensure components stack or scroll properly on small screens. Specifically:

Navigation should collapse into a burger menu or bottom nav on mobile.

Tables or lists should be scrollable or transform into cards.

Forms should use appropriate input types (e.g., use type="datetime-local" for scheduling inputs on mobile, which brings up a native picker).

Performance: Keep an eye on bundle size. Don’t pull in large libraries unnecessarily. Code-split if a page has heavy components. Our users sometimes are on slow connections when on the field; optimize for fast initial load (use Next.js SSR and static generation when possible).

Testing UX via MCP: Use the Playwright MCP server to automate some UI checks. For example, after implementing a new form, have the agent run a Playwright script to navigate to that form, fill it out, submit it, and verify the expected success state occurs. This helps catch integration bugs. The agent can take a screenshot of the form before and after submission to verify layout (ensuring no important element is off-screen, etc.). Including these snapshots as evidence is encouraged
docs.factory.ai
.

Consistency: Follow existing patterns for UI/UX. E.g., if all our modals slide in from the right, new modals should too (use the same Modal component). If success messages are shown via a toast, use the toast service, etc. Consistency reduces user training and errors.

9) Coding Style & Validation

TypeScript strict mode: Our tsconfig has strict true. No any types allowed (except in truly unavoidable third-party cases, which should be rare). If you encounter a scenario where you think any is needed, rethink the approach or use generics/unknown+Zod to handle it. Similarly, do not disable ESLint rules or TypeScript checks locally. If a lint rule is problematic, discuss it – don’t just // eslint-disable it. Every time you feel tempted to disable a rule, that likely indicates either a necessary code refactor or an adjustment needed in our config. Fix the root cause or escalate to maintainers with a proposal.

Project lint/format: We use Biome (or ESLint + Prettier) for consistent code style. The pnpm guard pipeline runs linting – all code must pass. Run pnpm lint:fix or pnpm format as needed to auto-fix issues. Ensure you configure your editor to auto-format on save to match our style (Prettier config). Key style points: single quotes for strings, no semicolons (if Biome is configured that way), trailing commas in multi-line lists, etc. Check the existing code for style examples if unsure.

Structured error handling: When writing functions or API calls, handle errors gracefully. For instance, use try/catch around external API calls (Mollie, Moneybird, etc.) and convert the error to a user-friendly message or an error code that the UI can handle. Don’t just allow unhandled promise rejections or vague console.error logs. Our users should get actionable feedback (e.g., “Payment failed, please try again” instead of a stack trace).

Validation at boundaries: (Reiterating from Security) use Zod for all input validation:

tRPC router inputs: every procedure should have an .input(z.object({...})) schema describing expected input. This ensures the client can’t send malformed data. The agent should create or update these schemas in parallel with API changes.

Environment variables: src/lib/env.ts defines a Zod schema for all required env vars and parses them at startup – if something new is needed, add it there so we catch misconfigurations early.

External responses: If parsing significant data from an external service, consider a Zod schema for it. For example, if we call a new endpoint on Moneybird, define a schema for the response to verify it matches what we expect (and to have typing for it).

Testing new code: Write unit or integration tests for new logic, especially for critical areas like money calculations, date conversions, and any algorithmic code. We use Vitest in tests/ directory for unit tests. For example, if you write a new function to calculate overtime fees, write a corresponding test file calculateOvertimeFee.test.ts covering various scenarios. For complex features, add scenario tests (could be in Playwright for end-to-end, or Vitest for service-layer). The agent has access to Testsprite – it can be used to auto-generate tests for broader scenarios if helpful. Having tests is important not only for safety but also because the agent can utilize failing tests as feedback to correct its implementation
crawshaw.io
.

Avoid regression: If you fix a bug, add a test that would have caught that bug. This way we prevent it from silently reoccurring. Our CI (guard pipeline) must stay green.

Commit cleanliness: Before finalizing a commit, ensure there are no leftover console.log (unless intentional for dev and behind a debug flag), no commented-out code blocks, and no TODO comments without an associated task reference. Strive to leave the codebase better than you found it; if you notice some minor unrelated issue (e.g., a misspelled variable name) and it’s quick, you can clean it up as part of your commit (but remember scope – don’t refactor whole modules unprompted).

Final self-review: Before marking a task done, do a quick self-review diff of your changes. Would another engineer be able to understand why you did X? If not, improve code comments or commit message. Ensure documentation is updated (if you add a new major function, consider JSDoc comment). By treating the AGENTS.md rules and the diffs as if a senior dev is reviewing, you’ll catch things early. Remember, the agent has this playbook for guidance, but ultimately, humans will review the output – so it should reflect professional, maintainable quality
agentsmd.net
.

References & Quick Commands

Core scripts: Familiarize with our package scripts (see package.json):

pnpm dev – start the development server (Next.js with hot-reload, plus it runs the i18n aggregator on start).

pnpm check – runs a suite of quick checks: type-checking, i18n completeness, and maybe lightweight tests. Use this often (as noted above).

pnpm guard – runs the full CI pipeline: lint, type-check, build, test, etc. This is the final gate before PR. It may also run MCP-based checks (Playwright tests, etc.) as configured in our CI.

pnpm lint / pnpm lint:fix – linting.

pnpm test – run the test suite (you can append -t "pattern" or -- <file> to run specific tests).

pnpm i18n:aggregate – rebuilds the aggregated translation JSON files from the per-namespace files.

Supabase workflow:

Migrations are SQL files in supabase/migrations. To create a new migration, you can use the Supabase CLI or write SQL and name the file accordingly. After adding a migration, run it via the Supabase MCP: call the apply_migration command (ensuring the local dev DB is updated), then call generate_typescript_types via MCP or our supabase script. Then run pnpm check to confirm the types.

Whenever supabase.generated.ts is updated, open it and quickly inspect changes to ensure they match the intended schema updates (no surprises).

The src/types/supabase.ts file exports certain types from the generated file and possibly defines some helper types or excludes certain internal fields. Do not add logic in the generated file; if needed, adjust the shim.

MCP usage reminders: The agent has access to tools, but ensure to call them correctly:

To search library docs: use context7__resolveLibraryId('<package>') followed by context7__getLibraryDocs('<packageId>') to fetch docs for a specific version used in our project.

For web search or external info: use firecrawl__search("query") and possibly firecrawl__scrape("<url>") if needed for details.

When using these tools, prefer them over hallucinating knowledge – e.g., don’t guess function signatures; fetch the docs.

Parallel development: If working on multiple features, we have parallel git workspaces:

/home/styryl/dev/pa (main branch)

/home/styryl/dev/pa-feature (feature branch, tracking origin/main)

etc. If the agent is instructed to switch branches or work on parallel tasks, it should use these separate directories. Typically, stick to one feature at a time unless directed.

Always ensure you run pnpm guard in each workspace before merging back to main. Merging is usually done via PR on GitHub (repo is origin=https://github.com/Styryl1/Plumbing-agent-final). The agent might not perform the merge itself but should prepare everything for an easy merge (rebased onto latest main, all tests passing).

When in doubt, ask: If requirements conflict or something seems off (maybe design vs. code, or two docs differ), do not hesitate to flag it. It’s better to pause and request clarification than to implement the wrong thing. The AGENTS.md gives a lot of guidance, but it can’t predict every situation – use judgment and if something feels uncertain, get human input.