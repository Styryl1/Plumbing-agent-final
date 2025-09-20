PRP - Plumbing Agent MVP v1.0

Executive Summary
Feature Name: Plumbing Agent MVP v1.0 (10-Person Team Edition)
One-Line: Replace paper job cards with AI-assisted call/WhatsApp intake, scheduling, and mobile job tracking.
Business Impact: Helps 10-person plumbing firms digitize intake and job tracking without disrupting habits. Captures calls/WhatsApp, creates structured jobs, and replaces paper notes with mobile job cards and signatures.
Estimated Complexity: Epic (20+ slices).
Stack Compatibility: Next.js 15 (App Router), tRPC, Supabase (Postgres + Storage), Clerk, Schedule-X v3, CopilotKit (AG-UI), Vercel AI SDK (JSON), Whisper STT (nl-NL).

Goals & Context
Goal
Deliver an MVP that:
1. Captures customer calls and WhatsApp intake.
2. Auto-creates customer and job records with AI proposals (proposal-only, organiser approves).
3. Schedules jobs in a team calendar with travel buffers and SLA timers.
4. Provides plumbers with offline-capable mobile job cards (photos, notes, signatures).
5. Tracks long-running commercial projects with visits, parties, daily logs, and optional RFIs/changes/punch lists.
6. Provides instant boiler manual lookup via photo plus AI.

Why
- Replace paper job cards and reduce lost details.
- Organisers gain instant customer and boiler history during calls.
- Plumbers work with simple mobile job cards.
- Owners get proof-of-work photos and signatures.
- Fits both residential (single-day) and commercial (multi-week) projects.

What (User-visible)
- Call/WhatsApp intake goes to 072; organiser sees transcript, customer file, and AI proposals.
- Organiser approves proposals, creating jobs in the calendar.
- Plumber receives a job card, captures photos, notes, and signature.
- Commercial work tracks under projects with visits, parties, daily logs, and pilot-flag RFIs/changes/punch.
- Manuals Copilot answers boiler questions directly from official PDFs with citations.

Success Criteria
- End-to-end flow: intake to proposal to schedule to job card to completion.
- SLA timers visual with escalation alerts.
- Job card offline capable and syncs when reconnected.
- Before/after photos captured in 80 percent of jobs.
- Customer signature captured on 80 percent of completed jobs.
- AI acceptance rate 60 percent within 24 hours.
- SLA breach rate for emergency jobs under 10 percent.

Requirements
Functional Requirements
FR1: MessageBird voice intake with call recording and post-call transcription, plus WhatsApp mirror mode intake (no BSP write-back yet).
FR2: Auto-create or lookup customers (multi-phone, KVK/BTW, assets with custom fields) from intake events.
FR3: Projects module with visits, parties, and daily logs Day-1; RFIs, change orders, and punch lists behind a pilot flag (per customer opt-in).
FR4: Job cards with header, timer, before/after photos, notes, signature, offline sync, and conflict handling (plumber wins on job content, organiser wins on scheduling, tie uses last-write plus banner).
FR5: Manuals Copilot for photo identification and page-cited Q&A sourced from manufacturer PDFs.
FR6: Schedule-X calendar with month/week/day views, multi-assignee support, buffers, and SLA timers.
FR7: AI Copilot surfaces across operator console, unscheduled drawer, job card, and voice draft workflows with confidence gating.
FR8: Roles for owner, admin, organiser, and plumber with strict permissions via Clerk and RLS.
FR9: GDPR compliance with retention timers, consent banners, DSAR workflow, and auditable AI actions.

Non-Functional Requirements
NFR1: GDPR compliance (7-year invoices, 90-day audio, DSAR pipeline) with Dutch-first i18n.
NFR2: Performance budgets: calendar interactions P95 under 200 ms; job card load under 1 s on 3G.
NFR3: All AI outputs Zod-validated; no auto-writes on low confidence.
NFR4: Offline-first job cards using service worker background sync, IndexedDB media cache, retry with backoff, and conflict policy.
NFR5: Dutch-first i18n with English parity using namespace files and aggregated builds.
NFR6: Accessibility: WCAG AA, 44 pt tap targets, keyboard and screen reader support.

Explicitly Out of Scope
- Invoicing and payments (tracked separately in Invoicing PRP).
- Customer self-service portal.
- GPS tracking and route optimisation.
- Recurring jobs.

All Needed Context
Documentation & References
- https://www.messagebird.com/en/voice (Voice API, transcription)
- https://www.twilio.com/docs/voice (Media Streams, Recording; Phase 2 reference)
- Docs/schedule_x_prp.md (Calendar UX, Unscheduled, SLA timers)
- Docs/whatsapp_ai_unified_prp.md (Mirror mode intake, AI proposals)
- Docs/plumbing_agent_mvp_prp.md (Historical context and guardrails)

Current Codebase Analysis
- WhatsApp intake scoped in Docs/whatsapp_ai_unified_prp.md.
- Schedule-X v3 PRP exists (Docs/schedule_x_prp.md).
- Invoicing v2 epic exists but deferred.
- Need new projects, RFI, change, and punch tables behind pilot flag.
- Job card components stubbed; require offline mode, signature capture, and before/after flow.

Desired Codebase Structure
src/
  components/
    ai/
    calendar/
    job-card/
    projects/
    manuals/
  server/
    api/routers/
      intake.ts
      jobs.ts
      projects.ts
      rfi.ts
      change.ts
      punch.ts
    services/
      ai/
      telephony/
      manuals/
  app/(dashboard)/
    jobs/
    projects/
    customers/

Technical Architecture
Stack Requirements
Required stack: Next.js 15 (App Router), tRPC, Supabase (Postgres, Storage, RLS-lite), Clerk (auth and roles), Schedule-X v3, CopilotKit with AG-UI, Vercel AI SDK (JSON mode), Whisper STT (nl-NL), Workbox (service worker), IndexedDB (offline storage).
Optional stack: Pydantic-AI service for manuals OCR/RAG in later phases.

Telephony / WhatsApp Intake Plan
- MVP: MessageBird Voice for call recording and post-call transcription; WhatsApp mirror mode via existing organiser device (read-only, no BSP write-back).
- Phase 2: Port 072 to Twilio Voice for live media streams and screen-pop captions; adopt WhatsApp Cloud API for bi-directional messaging while keeping MessageBird BSP as optional fallback.
- Justification: MessageBird is fastest for Dutch MVP; Twilio provides best-in-class streaming when live captions are required.

Commercial Projects Rollout Strategy
- Day-1 default: Projects as parent containers, visits as child jobs, parties directory, and lean daily logs.
- Pilot flag (per customer): RFIs, change orders, and punch lists enabled for complex commercial clients after go-live.
- Admin UI must expose pilot toggles with audit trail.

Offline Job Card Sync Strategy
- Service worker built with Workbox background sync for queued mutations.
- IndexedDB caches photos, notes, signatures, and timers; media uploads chunked with retry and exponential backoff.
- Conflict policy: plumber edits (notes, photos, signature, timer) win; organiser scheduling and assignments win for calendar; simultaneous edits fall back to last-write wins with banner and diff review.

AI Proposal Acceptance Metric
- Metric: accepted proposals divided by accepted plus rejected plus ignored over 24 hours, measured per intake surface.
- Confidence gating: 0.70 and above enables Apply; 0.50-0.69 shows "Needs confirmation" UI; below 0.50 disables one-tap Apply and forces manual edit while surfacing the summary.
- Audit: store confidence, edited fields, and reason tags (#wrong_customer, #bad_slot, etc.).

Manuals Copilot Ingestion Plan
- Supabase Storage (EU region) is the source of truth; ingest official manufacturer PDFs only.
- Limits: maximum 50 MB or 400 pages per PDF; larger uploads rejected with guidance to trim.
- Index text with per-page offsets; generate optional page thumbnails on demand.
- Manual identifiers combine brand, model, edition, language, and page count hash.
- Answers use retrieval augmented generation with mandatory page citations; block freeform responses on gas or combustion topics.

Data Models (Delta Highlights)
Customers: id uuid pk, org_id uuid, name, phones[], kvk, btw, language, custom_fields jsonb.
Sites: id uuid pk, customer_id uuid, address, postal_code, city, assets jsonb.
Jobs: id uuid pk, customer_id, site_id, status, priority, start, end, assignees[], timer, notes, signature blob, offline_state jsonb.
Projects: id uuid pk, title, client_id, status, pilot_enabled boolean, custom_fields jsonb.
RFIs / Changes / Punch (pilot): id uuid pk, project_id, title, description, attachments[], due_date, status, assignee.
Manuals: id uuid pk, brand, model, edition, language, page_count, storage_key, checksum, indexed boolean.

Implementation Blueprint
Task 1: Foundation - feature flags (pilot toggles), base schemas, audit logs.
Task 2: Intake - MessageBird voice integration, WhatsApp mirror ingestion, transcription storage.
Task 3: AI Copilot - operator console, unscheduled drawer, confidence gating, audit logging.
Task 4: Scheduling - Schedule-X calendar, buffers, SLA timers, organiser override rules.
Task 5: Job Cards - mobile-first UI, offline sync plumbing, media capture, signature pad.
Task 6: Projects - projects, parties, visits, daily logs with Day-1 exposure and pilot flag plumbing.
Task 7: Daily Logs - attendance, blockers, deliveries linked to visits.
Task 8: RFIs & Changes (pilot) - threaded discussions, approval trail, attachments.
Task 9: Punch List (pilot) - photo evidence, assignee, due dates, completion tracking.
Task 10: Manuals Copilot - ingestion pipeline, brand/model detection, citations.
Task 11: Copilot Everywhere - AG-UI proposal-only surfaces, rejection flows.
Task 12: Notifications - SLA breach alerts, reminders, offline sync status.
Task 13: GDPR - retention settings UI, DSAR export, consent banners.
Task 14: Metrics - AI acceptance, SLA breach, photo/signature capture rate, offline success rate.
Task 15: Pilot Readiness - CSV import, IVR consent script, WhatsApp mirror go-live checklist.

Validation Loops
Level 1: pnpm check (lint, type, i18n, build).
Level 2: Unit tests (Zod schemas, SLA timers, confidence gating).
Level 3: Integration tests (intake routers, AI proposals, offline sync reconciliation).
Level 4: Playwright E2E (intake to proposal to schedule to job card to completion with signature).
Level 5: GDPR compliance checklist (retention timers, consent, DSAR export).

UI/UX Specifications
- Dashboard tiles for today's jobs, unscheduled work, SLA alerts, AI proposals.
- Calendar month/week/day views with drag-and-drop, SLA chips, multi-assignee visualization.
- Job card mobile layout with before/after photo capture, notes, signature pad, offline state banners.
- Projects overview with parties, daily logs, and gated RFIs/changes/punch tabs.
- Manuals Copilot upload flow plus Q&A card with citation chips.
- AG-UI interactions present confidence state and Require confirmation messaging.

Testing Strategy
- Unit tests for SLA timer math, AI schema validation, retention timers, offline queue utilities.
- Integration tests for intake routers, schedule updates, manual ingestion pipeline.
- E2E tests for WhatsApp/call intake through job completion and manual lookup.
- Performance tests (Lighthouse) targeting sub-1 s mobile job card load and under 500 KB bundle for critical paths.

Anti-Patterns & Golden Rules
- No mock data; rely on empty states, fixtures via seed scripts only.
- No auto-writes from AI; organiser approval required.
- Use Temporal helpers from ~/lib/time; no direct Date usage.
- Use ?? over || for defaults; no eslint disables.
- Enforce i18n root hook pattern; no literal strings in UI.
- Do not store PDF binaries inline; only Supabase Storage references.
- Respect RLS; use tRPC context clients only.

Rollout Considerations
- Pilot flag for commercial modules must default off and require owner opt-in.
- Telephony migration path documented before enabling Twilio streaming.
- Offline sync telemetry (success vs failure) fed into metrics dashboard.
- Manuals ingestion queue monitors file size and checksum collisions.

