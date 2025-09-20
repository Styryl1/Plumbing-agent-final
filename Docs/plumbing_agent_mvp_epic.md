# EPIC - Plumbing Agent MVP v1.0 (10-Person Team Edition)
_Last updated: 2025-09-13_

## North Star
- Replace paper job cards with AI-assisted intake, scheduling, and mobile execution purpose-built for 10-person Dutch plumbing teams.
- Give organisers real-time customer, asset, and manual context at the moment of contact while keeping plumbers productive offline.

## Success Metrics (MVP Gate)
- End-to-end intake -> proposal -> schedule -> job card -> completion flow live for at least two pilot organisations.
- >=90% of inbound WhatsApp messages and post-call transcripts appear in Unscheduled within 60 seconds.
- Emergency SLA breach rate <10% across pilots.
- >=80% of completed jobs include before/after photos and a signed customer confirmation.
- AI proposals reach >=60% approve rate within 24 hours, with confidence telemetry logged.
- Job cards operate offline with background sync and conflict policy enforced in production telemetry.
- GDPR retention timers (audio 90d, structured records 7y) and DSAR exports validated per org.
- Manuals Copilot answers top 10 manuals in <2s with page-level citations.

## Scope Boundaries
**In scope**
- MessageBird voice intake (record + post-call transcription) and WhatsApp mirror ingestion feeding the Unscheduled queue.
- AI-assisted proposals (CopilotKit + Vercel AI SDK) in operator console, Unscheduled drawer, job card, and voice draft flows.
- Schedule-X calendar with multi-assignee jobs, travel buffers, and SLA timers.
- Offline-capable mobile job cards with photos, notes, signatures, and conflict resolution.
- Commercial projects: projects, visits, parties, daily logs (default on) plus RFIs/change orders/punch lists (pilot flag).
- Manuals Copilot ingestion from Supabase Storage EU with photo-to-manual lookup.
- Notifications, GDPR console, search, settings, observability, and pilot readiness tasks that unlock real customer rollouts.

**Out of scope** (tracked elsewhere)
- Invoicing and payments (see Docs/Invoicing_prp.md and Docs/Invoicing_epic.md).
- Customer self-service portals, recurring jobs, GPS/route optimisation, live call streaming (Twilio) until Phase 2.

## Deployment Modes & Feature Flags (managed in S0)
| Flag | Default | Description |
| --- | --- | --- |
| `INTAKE_WHATSAPP` | on | Enables WhatsApp mirror ingestion (read-only).
| `INTAKE_VOICE` | on | Enables MessageBird voice recording and transcription pipeline.
| `JOB_CARDS` | on | Mobile job card experience and offline queue.
| `PROJECTS_CORE` | on | Projects, visits, parties, daily logs.
| `PROJECTS_ADVANCED` | off (per org) | Unlocks RFIs, change orders, punch lists for pilot customers.
| `MANUALS_COPILOT` | on | Manuals ingestion, lookup, and Copilot UI.
| `COPILOT_GLOBAL` | on | Copilot tools beyond intake (calendar, job card, project actions).
| `NOTIFICATIONS_CORE` | on | SLA, visit, RFI, punch reminders.
| `GDPR_CONSOLE` | on | Retention timers, DSAR export, consent editor.

## Global Guardrails & Constraints
- All AI actions are propose-only with explicit organiser approval; no silent writes.
- Zod-validated schemas for every external response (AI, MessageBird webhooks, Supabase storage metadata).
- Temporal helpers (`~/lib/time`) for all time math; use `??` for defaults.
- Strict Clerk + Supabase RLS enforcement; plumbers only read/write their scoped data.
- i18n root-hook pattern with NL-first parity; no literal UI strings.
- Service worker + IndexedDB manages offline queue; organiser scheduling changes remain source of truth.
- Structured logging + audit trail for every AI proposal, approval, rejection, notification, and data retention action.

## Vendor & Platform Decisions
- MessageBird Voice + Recording API for MVP intake; Twilio Media Streams held for Phase 2 live captions/porting.
- WhatsApp mirror mode (no BSP write-back) during MVP; WhatsApp Cloud API targeted for bi-directional messaging later.
- Supabase Storage (EU) for manuals repository (<=50 MB/400 pages per manual) with text-first indexing and RAG citations.
- CopilotKit + AG-UI for guided proposals; Vercel AI SDK (JSON mode) with confidence thresholds (0.7/0.5 gates).
- Workbox service worker and IndexedDB for offline job card media + mutation queue.

## Delivery Phases & Gates
| Phase | Slices | Outcome | Gate to Proceed |
| --- | --- | --- | --- |
| Phase 0 - Foundation Intake | S0-S2 | Stable schema, feature flags, ingestion + AI proposals in console | Unscheduled shows real data; audit + tests green |
| Phase 1 - Scheduling & Field Ops | S3-S6 | Unscheduled -> calendar -> mobile job card loop | One pilot plumber completes job offline -> synced |
| Phase 2 - Commercial & Copilot Depth | S7-S12 | Projects, daily logs, pilot-only advanced workflows, Copilot actions | Pilot customer signs off on project tooling in sandbox |
| Phase 3 - Compliance & Launch | S13-S20 | Notifications, GDPR, search, settings, security, metrics, performance polish, rollout | Pilot report meets success metrics for two weeks |

## Slice Breakdown

### S0 - Foundation & Schema
**Objective**: Provide the baseline data structures, feature flags, and audit scaffolding so subsequent slices can deploy safely.
**Scope**
- Create additive Supabase migrations for customers, sites, jobs (with offline_state), assets, projects, visits, rfis, changes, punch_list, manuals, audit_events tables.
- Implement feature flag table + `~/lib/env.ts` surfaced flags listed above, scoped per organisation.
- Seed RLS-lite policies (org_id isolation) and clerk role mappings.
- Generate TypeScript types (Zod + tRPC router inputs) and ensure existing tests compile.
**Depends on**: None.
**Validation**
- `pnpm check` + migrations run on CI, ensuring zero regressions in existing modules.
- Manual verification of RLS via Supabase row tests.
**Risks & Notes**
- Coordinate schema changes with sibling repos via shared migrations.
- Lock naming conventions (snake_case DB, camelCase API) now to avoid churn.

### S1 - Intake: WhatsApp Mirror + Voice Post-Call
**Objective**: Capture all inbound conversations into a unified Unscheduled queue with durable storage.
**Scope**
- Ingest WhatsApp mirror data via secured webhook; store text, media (Supabase Storage EU), metadata (timestamps, participants).
- Integrate MessageBird Voice: call recording, transcription (nl-NL), and push to intake events within 60 seconds.
- Extend intake router (tRPC) to normalise events and push to `intake_events` + `unscheduled_items` table.
- Enforce data residency (EU buckets) and retention (90 days audio). Runbooks for MessageBird outages.
**Depends on**: S0.
**Validation**
- Synthetic and real calls/messages appear in Unscheduled (UI + DB) within SLA.
- Media accessible in job context with signed URLs.
- Replay webhook tests idempotent.
**Risks & Notes**
- Need internal tooling to replay MessageBird payloads for debugging.
- Mirror mode requires organiser device online; capture fallback SOP.

### S2 - AI Operator Console (Post-Call)
**Objective**: Offer organiser AI proposals immediately after intake with transparent confidence.
**Scope**
- Build operator console UI with CopilotKit side panel.
- Implement Vercel AI SDK prompts for issue classification, urgency, materials, estimated time slot.
- Enforce confidence thresholds (>=0.7 apply enabled, 0.5-0.69 caution banner, <0.5 manual edit only).
- Log proposals, confidence, edits, and rejection reasons to audit_events.
**Depends on**: S1, S0.
**Validation**
- At least 20 seed conversations processed with expected telemetry.
- `pnpm test` includes schema validation for AI outputs.
**Risks & Notes**
- Collaborate with prompt team to align on new structured schema; include fallback manual entry if AI fails.

### S3 - Unscheduled Drawer & Apply Flow
**Objective**: Let organisers triage intake items into structured jobs with visibility into AI deltas.
**Scope**
- Drawer component listing recent intakes with filters (channel, SLA state).
- Apply flow showing AI proposal vs existing data diff; organiser can accept or edit fields (Temporal durations, asset selection).
- When saving, create job, customer/site if new, log audit entry linking to intake.
- Update Unscheduled tables on completion and support undo (soft delete).
**Depends on**: S2, S1, S0.
**Validation**
- Creating jobs via Apply writes correct associations (customer, site, asset).
- Audit log entry includes before/after snapshot and user id.
**Risks & Notes**
- Ensure concurrency control if multiple organisers handle same intake (optimistic locking).

### S4 - Calendar Core (Schedule-X v3)
**Objective**: Provide the shared scheduling backbone across web and mobile contexts.
**Scope**
- Embed Schedule-X v3 with month/week/day view parity and timezone handling via Temporal helpers.
- Multi-assignee support (primary + secondary) with colour chips (use existing deterministic colour util).
- Drag-and-drop rescheduling with conflict detection and travel buffer enforcement.
- Integrate with tRPC jobs router for updates; maintain audit trail of schedule changes.
**Depends on**: S3, S0.
**Validation**
- Calendar renders with seeded data; interactions persist to DB and reflect in job cards.
- Conflict detection prevents overlapping assignments unless admin override flag set.
**Risks & Notes**
- Performance: ensure virtualization for >50 jobs per day view.
- Travel buffer calculations must use on-road heuristics configurable in S16.

### S5 - SLA Engine & Alerts
**Objective**: Make SLA commitments visible and enforceable across intake and job lifecycle.
**Scope**
- Define ack/dispatch/on-site SLA rules per job priority with configurable thresholds.
- Timer chips in Unscheduled, calendar detail, job card header; countdown based on Temporal.
- Trigger alerts (WhatsApp/SMS/email) via notifications framework (link to S13) when thresholds breached.
- Log SLA state transitions to metrics pipeline.
**Depends on**: S4, S3, S1, S0.
**Validation**
- Automated tests for SLA calculations (unit + integration).
- Notification fired in staging when synthetic job breaches timers.
**Risks & Notes**
- Rate-limit notifications to avoid alert storms; respect per-channel opt-outs.

### S6 - Mobile Job Cards v1
**Objective**: Replace paper job sheets with an offline-first experience plumbers trust.
**Scope**
- Responsive job card UI (PWA-ready) with status, priority, customer info, asset chips, SLA chips.
- Timers (start/stop, rounding to 5/15 min), before/after photo capture (chunked upload), voice/text notes, signature pad.
- Workbox service worker + IndexedDB queue storing mutations + media; background sync with exponential backoff.
- Conflict policy enforcement (plumber wins job content, organiser wins schedule, tie = last-write + diff banner).
- Offline state banners and manual retry UI.
**Depends on**: S5, S4, S3, S0.
**Validation**
- Simulate offline completion flow in E2E test; ensures sync resolves correctly.
- Observability counters for queue success/failure.
**Risks & Notes**
- Large photo uploads require compression before enqueue.
- Need training artifact for plumbers (video/screenshot deck).

### S7 - Projects (Parent + Visits)
**Objective**: Support commercial jobs spanning multiple visits and stakeholders.
**Scope**
- Projects entity with status, metadata, pilot flag default on.
- Parties directory with quick contact actions (call, WhatsApp) and role tagging.
- Visits leverage existing job card but linked to project; show schedule + progress roll-up.
- Project dashboard summarising SLA, upcoming visits, latest logs.
**Depends on**: S6, S5, S4, S0.
**Validation**
- Create project with multiple visits; ensure permissions check (only assigned plumbers see relevant visits).
- Stats roll-up accurate (progress, open visits).
**Risks & Notes**
- Keep UI light; avoid overwhelming small residential teams by progressively disclosing detail.

### S8 - Daily Logs
**Objective**: Capture site diaries to provide context and compliance record.
**Scope**
- Daily log form per visit: attendance, hours, work done, blockers, deliveries, weather, photos.
- Offline support via job card queue; tie to visit timeline.
- Summaries visible in project dashboard with filter by date.
**Depends on**: S7, S6.
**Validation**
- Submit daily log offline/online; confirm attachments stored, watchers notified.
- Export daily logs as PDF/CSV for pilot review (optional stub).
**Risks & Notes**
- Manage photo storage quotas; align with Supabase retention policy.

### S9 - RFIs & Changes (Pilot Flag)
**Objective**: Enable structured coordination for pilot customers without slowing core rollout.
**Scope**
- Feature flag `PROJECTS_ADVANCED` gating UI + API.
- RFI workflow: create question, assign, due date, attachments, threaded replies.
- Change order workflow: scope delta, cost/time impact estimation, approval steps with digital sign-off.
- Notifications to relevant parties (hook into S13) and audit logging.
**Depends on**: S8, S7, S5, S0.
**Validation**
- Pilot org enabling flag sees modules; non-pilot hidden.
- RFI/Change states persisted and accessible in search (post S15).
**Risks & Notes**
- Approval trail must be non-repudiable (store signer info + timestamp).

### S10 - Punch/Snag List (Pilot Flag)
**Objective**: Provide close-out tracking for commercial handover.
**Scope**
- Punch list entries with photo, description, assignee, due date, status.
- Mobile capture via job card; integrate offline queue.
- Completion requires before/after evidence + optional customer acknowledgement.
**Depends on**: S7, S6, S5, S0.
**Validation**
- Pilot toggled org sees Punch module; statuses reflected in project summary.
**Risks & Notes**
- Keep metadata minimal to avoid adoption friction; rely on attachments for detail.

### S11 - Manuals Copilot v1
**Objective**: Serve boiler manuals instantly with safe AI assistance.
**Scope**
- Manual ingestion pipeline: upload to Supabase Storage EU, extract text, index with per-page offsets, hash metadata.
- Photo-to-manual identification using AI classification (brand/model detection) with fallback search.
- Copilot Q&A interface returning JSON with cited pages; block responses outside validated manuals or on gas safety prompts.
- Cache most-used manuals per tenant for offline fallback (tie to S19).
**Depends on**: S0.
**Validation**
- Upload sample manuals; run ingestion job; queries return within 2 seconds in staging.
- Safety tests to ensure blocking of unsupported topics.
**Risks & Notes**
- Manage storage quotas; plan for future S3 replication.
- Need manufacturer permission checks before ingesting certain docs.

### S12 - Copilot Everywhere (AG-UI Tools)
**Objective**: Extend guided AI actions across calendar, job card, and project workflows.
**Scope**
- Calendar tools: reschedule, reassign, extend duration, set priority using AG-UI diff pattern.
- Job card tools: start timer, add note/photo placeholder, mark complete with summarised log.
- Project tools: create visit, raise RFI, add punch item (respect feature flags).
- Ensure diffs shown pre-apply; approvals logged with AI metadata.
**Depends on**: S11, S10, S9, S8, S7, S6, S4, S3.
**Validation**
- Each tool flow covered by unit/integration tests; manual QA verifying approvals required.
**Risks & Notes**
- Prioritise top 3 actions per surface to prevent scope creep.
- Track usage to inform further automation.

### S13 - Notifications System
**Objective**: Keep the team informed without manual chasing.
**Scope**
- Notification service with channels (WhatsApp via mirror fallback, SMS, email) and templates.
- SLA breaches, visit reminders, RFI due, punch overdue triggers.
- Per-user/channel opt-out stored with audit trail.
- Ensure idempotency + retry with exponential backoff.
**Depends on**: S5, S9, S10, S8, S7, S0.
**Validation**
- Synthetic events produce exactly one outbound message.
- Observability dashboard shows send status + failures.
**Risks & Notes**
- Mirror mode limits outbound automation; for MVP use SMS/email + organiser manual WhatsApp follow-up.

### S14 - GDPR & Retention Console
**Objective**: Provide compliance tooling required for Dutch plumbing firms.
**Scope**
- Org-level settings for retention (audio, media, structured data) with preview of purge schedule.
- DSAR export pipeline generating encrypted zip with audit logging.
- Consent editor for IVR wording, WhatsApp profile text, email footers.
- Purge job with dry-run mode and alerting.
**Depends on**: S13, S1, S0.
**Validation**
- Test org adjusts retention; background job deletes expired records.
- DSAR export includes intake, jobs, project history, manuals queries.
**Risks & Notes**
- Coordinate with legal on consent language; maintain translation parity.

### S15 - Search & Global Navigation
**Objective**: Make every record discoverable instantly.
**Scope**
- Indexed search across customers, jobs, projects, RFIs, punch items using Postgres full-text or dedicated service.
- Phone reverse lookup for inbound calls.
- Global navigation command palette (cmd+k) with role-aware results.
**Depends on**: S8, S7, S6, S3, S2, S0.
**Validation**
- Search latency <200 ms for seeded dataset.
- RLS tests ensure plumbers only see authorised results.
**Risks & Notes**
- Consider caching hot queries; monitor for Postgres load.

### S16 - Settings & Org Defaults
**Objective**: Allow each organisation to tailor operations without code changes.
**Scope**
- Configure business hours, travel buffers, default job durations, SLA thresholds, colour palettes.
- Custom fields manager (JSON schema) for customers/sites/jobs with UI validation.
- Feature flag toggles (projects advanced, manuals, notifications) surfaced to owners.
**Depends on**: S5, S4, S3, S0.
**Validation**
- Setting change immediately reflected in calendar/job flows.
- Schema changes validated to avoid breaking job cards.
**Risks & Notes**
- Version custom field schema to support migration when structure changes.

### S17 - Roles & RLS Hardening
**Objective**: Deliver secure-by-default multi-tenant access control.
**Scope**
- Role management UI (owner/admin/organiser/plumber) with ability to invite/disable users.
- Audit changes to roles + impersonation actions (admin assist).
- Harden Supabase RLS policies, including advanced modules.
- Pen test style checklist for privilege escalation.
**Depends on**: S16, S6, S4, S0.
**Validation**
- Unit tests for policy coverage; manual attempt to access out-of-scope data denied.
**Risks & Notes**
- Ensure impersonation logs capture reason + start/end time.

### S18 - Observability & Metrics
**Objective**: Equip the team with insight into adoption and stability.
**Scope**
- Metrics dashboard: jobs/day, AI acceptance, SLA hit rate, offline sync success, photo/signature coverage.
- Feedback widget on job card/operator console capturing structured tags.
- Errors/latency instrumentation (Sentry, OpenTelemetry) with alerts.
**Depends on**: S17, S16, S13, S12, S6, S5, S3.
**Validation**
- Dashboard surfaces real-time data; feedback entries stored with job reference.
- Alert thresholds defined and tested.
**Risks & Notes**
- Align metrics schema with analytics warehouse if introduced later.

### S19 - Performance & Offline Polish
**Objective**: Keep the product fast and reliable in the field.
**Scope**
- Code-split heavy surfaces (calendar, projects, manuals) and implement hydration strategies.
- Image compression + lazy loading; prefetch top manuals for offline use.
- PWA install prompt, manifest, icons; verify offline caching works for job card and manuals snippet.
- Benchmarks ensuring critical bundle <500 KB.
**Depends on**: S18, S11, S6.
**Validation**
- Lighthouse mobile score >=85; manual offline test passes.
**Risks & Notes**
- Monitor Workbox cache size; purge old media carefully.

### S20 - Pilot Readiness & Rollout
**Objective**: Flip real pilots with confidence and gather learnings.
**Scope**
- CSV import for customers/jobs/assets; validation + dry run.
- IVR consent scripts deployed; WhatsApp mirror go-live checklist executed.
- Index at least 10 high-usage manuals per pilot.
- Run full pilot scenario (intake -> completion) with real data; capture retro.
- Rollout playbook: support contacts, escalation paths, training kits.
**Depends on**: All prior slices.
**Validation**
- Two-week pilot meets success metrics (SLA, AI acceptance, photo/signature rates).
- Post-pilot report signed off by product + ops.
**Risks & Notes**
- Schedule buffer for training and change management; capture feedback for GA backlog.

## Cross-Cutting Testing & Validation
- `pnpm check` mandatory after every slice; `pnpm guard` before promoting to pilot.
- Unit tests: AI schemas, SLA math, offline queue, retention timers.
- Integration tests: intake routers, job apply flow, calendar updates, notifications, manuals lookup.
- E2E (Playwright): intake -> proposal -> schedule -> job card offline -> completion -> metrics.
- Performance smoke tests (Lighthouse, WebPageTest) each release candidate.

## Documentation & Enablement
- Update Docs runbooks per slice: MessageBird ops, Offline troubleshooting, Copilot usage, GDPR procedures.
- Produce plumber-facing quick start (mobile) and organiser manual (desktop) before pilot.
- Maintain change log referencing feature flags for enablement cadence.

## Open Risks & Follow-Ups
- Telephony porting to Twilio for live captions requires regulatory lead time; start compliance paperwork during Phase 1.
- Manual ingestion licensing: confirm manufacturer agreements before large-scale uploads.
- Offline media growth: define retention/archival strategy (link to S14) to control storage costs.

## Related References
- PRP: `Docs/plumbing_agent_mvp_prp.md`
- Calendar deep dive: `Docs/schedule_x_prp.md`
- WhatsApp intake background: `Docs/whatsapp_ai_unified_prp.md`
- Invoicing scope (deferred): `Docs/Invoicing_prp.md`
