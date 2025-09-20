# Slice Implementation Status - S0-S5

## S0 - Foundation & Schema
Status: Partial (legacy baseline only)
- `customers` still exposes a single `phone` field and flat address structure (`src/server/db/sql/001_init.sql:40`), so the planned multi-phone, KVK/BTW, asset metadata, and custom-field support are missing.
- No migrations create the new domain tables (`sites`, `assets`, `projects`, `rfis`, `changes`, `punch_list`, `manuals`, `audit_events`) anywhere under `src/server/db/sql`, leaving the MVP data model unprepared.
- Feature flags are still derived from environment variables with a pilot cascade (`src/lib/feature-flags.ts:9`), with no per-organisation store or flags for intake/job-cards/manuals.
- Audit logging remains on `audit_logs` with a single `payload_json` blob (`src/server/db/sql/001_init.sql:203`); the structured `audit_events` table and before/after diff strategy have not been introduced.

## S1 - Intake: WhatsApp Mirror + Voice Post-Call
Status: Partial (WhatsApp plumbing only)
- Mirror-mode foundations exist via `wa_conversations`, `wa_messages`, and related services (`src/server/db/sql/020_whatsapp_foundation.sql:1`, `src/server/services/whatsapp/conversation-queries.ts:10`).
- There is no MessageBird voice integration or transcription pipeline in the codebase (the `MessageBird` identifier only appears in documentation), so call recordings and post-call transcripts are absent.
- No intake queue schema (`intake_events`, `unscheduled_items`, etc.) or tRPC router exists; searches across `src/server/db/sql` and `src/server/api` yield no such modules, which means new intakes are not flowing into a unified Unscheduled list.

## S2 - AI Operator Console (Post-Call)
Status: Partial (backend only)
- AI recommendations can be queried from `wa_suggestions` through `listRecommendations` (`src/server/api/routers/ai.ts:31`, `src/server/mappers/aiRecommendation.ts:25`).
- Operator-console surfaces, CopilotKit integrations, and confidence-gated UI are missing; there are no references to Copilot/AG-UI components anywhere in `src/`.
- Approval telemetry and audit logging are not wired; `Unscheduled` applies proposals directly without calling `logAuditEvent`, so there is no audit trail for accepts/rejects.

## S3 - Unscheduled Drawer & Apply Flow
Status: Partial (practical but incomplete)
- The drawer component exists and populates form state from AI suggestions and WhatsApp leads (`src/components/jobs/Unscheduled.tsx:120`).
- Critical UX hooks remain TODO: the component still lacks a customer picker and notes this explicitly (`src/components/jobs/Unscheduled.tsx:164`), and it posts straight to `jobs.create` with no diff/approval screen.
- No intake linkage or audit logging is performed when a job is created from the drawer, so provenance and compliance requirements are unmet.

## S4 - Calendar Core (Schedule-X v3)
Status: Mostly implemented with key gaps
- Schedule-X is wired up with drag-and-drop, resize, and range callbacks (`src/app/jobs/calendar/Calendar.tsx:12`, `src/app/jobs/calendar/Calendar.tsx:215`), and events are adapted via `jobsToSxEvents` (`src/lib/calendar-adapter.ts:13`).
- Multi-assignee support is still stubbed—`jobsRouter` repeatedly returns empty `secondaryEmployeeIds` with TODO comments (`src/server/api/routers/jobs.ts:128`, `src/server/api/routers/jobs.ts:248`).
- Conflict handling, travel buffers, and SLA-aware validation are absent; the reschedule mutation explicitly notes that business-hour validation is removed for now (`src/server/api/routers/jobs.ts:724`).
- Job statuses remain on the legacy `planned`/`in_progress` vocabulary (`src/server/api/routers/jobs.ts:17`), so the new `unscheduled`/`scheduled` states are not represented in calendar queries.

## S5 - SLA Engine & Alerts
Status: Not started
- There is no SLA timer or escalation logic anywhere under `src/server`; searches for "SLA" return no implementation.
- Notifications and tRPC routers do not emit SLA breach events, so the visual timers and alerting workflow outlined in the PRP are untouched.
