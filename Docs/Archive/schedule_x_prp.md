PRP — Schedule-X v3 Calendar Dashboard (Salonized/Jobber-style, Mobile-First)

Template: Ultimate PRP v3.x; Engineering Rules vNext; aligned with Plumbing Agent MVP

Executive Summary

Feature Name: Schedule-X v3 Calendar Dashboard
One-Line: A fast, mobile-first team calendar with Week/Day views, multi-assignee jobs, and an Unscheduled → Assign flow.
Business Impact: Turns WhatsApp/AI leads into scheduled jobs quickly; boosts trust with a Salonized/Jobber-grade UX.
Estimated Complexity: Epic
Stack Compatibility: Next.js App Router, tRPC, Supabase, Clerk Orgs, shadcn/ui, Tailwind v4, Schedule-X v3 (Temporal).

Goals & Context
Goal

Ship a production-grade, mobile-first calendar that feels like Salonized/Jobber and plugs into our MVP flow: Chat → AI Suggestion → Confirm → Schedule → Complete → Voice Invoice.

Why

Scheduling is the heartbeat of a trades business; poor UX kills adoption.

Mobile-first is critical: thumb-zone CTAs, sticky headers, smooth DnD.

It operationalizes our WhatsApp/AI pipeline and auditing.

What (user-visible)

Week/Day (month not critical), employee chips (filter), drag/move/resize, reassign.

Unscheduled bottom sheet (WhatsApp/AI leads) → “Apply proposal” → Confirm time → Assign.

Job Drawer with primary + secondary assignees, notes, Complete → Voice Invoice.

Success Criteria

 P95 < 200ms UI response for DnD (optimistic + rollback).

 Week/Day stable on mobile (375×667): sticky time ruler; 44pt targets; zero scroll jank.

 Role enforcement: Owner/Admin edit all; Staff self-only (server enforced; RLS next sprint).

 Unscheduled → Assign completes in ≤ 3 taps; AI duration preferred.

 Audit logs for create/move/resize/reassign.

Requirements
Functional Requirements

FR1 — Views & Resources: Week/Day (month not critical). Employees represented as Schedule-X calendars; multi-select chips filter.

FR2 — DnD/Resize: Drag-move, resize on 15-min grid with optimistic UI + rollback.

FR3 — Multi-assignee: Jobs support primary + secondary employees; mirror primary to jobs.employee_id.

FR4 — Reassign: Change assignees in Job Drawer (cross-lane DnD reserved for premium lanes).

FR5 — Unscheduled Drawer: Show AI/WhatsApp leads; Apply proposal → prefill title/priority/duration (prefer AI) → pick time → select assignees → create.

FR6 — Business rails: Visualize business hours (default 08:00–17:00), lunch (12:00–13:00), NL holidays (soft), 5-min travel hints (later: dynamic via Google Maps).

FR7 — Permissions: Owner/Admin override conflicts/off-hours; Staff blocked from off-hours and editing others.

FR8 — Locale/TZ: nl-NL, Europe/Amsterdam; DST-safe.

FR9 — Auditing: Log create/update/move/resize/reassign with actor + before/after snapshot.

Non-Functional Requirements

NFR1 (Perf): Sub-200ms optimistic feedback; calendar route code-split; 60fps scroll/DnD.

NFR2 (Security): No client secrets; org isolation and role checks server-side; RLS next sprint.

NFR3 (Compliance): GDPR logging/anonymisation, Dutch formats (24h, euro).

NFR4 (Accessibility): 44pt targets, focus rings, AA contrast, SR labels.

Explicitly Out of Scope (this phase)

Public booking widget, recurring rules engine, route optimization, payroll/vacation planner. (Hooks OK for future.)

Locked Decisions (from stakeholder answers)

Views: Week/Day (month not critical).

Grid/Snap: 15-min; default 60m.

Assignees: Multi-employee; primary + secondaries; no “Unassigned lane”—use Unscheduled.

Filters: Persist employee filter per device.

Hours & Lunch: Editable; default 08:00–17:00, 12:00–13:00 soft-block.

Travel: 5-minute hints now; later Google Maps Distance Matrix.

Off-hours: Warn+allow Owner/Admin; block Staff.

Staff create for others: No.

AI: Show confidence/materials; prefer AI duration.

Colors: Auto palette first; allow custom.

Overlap: Prevent same-employee overlap by default; Owner/Admin can override.

Recurring: Later.

RLS next sprint; tap-hold DnD UX ok.

All Needed Context
Documentation & References (Must-Read)
documentation:
  - url: https://schedule-x.dev/docs/calendar/major-version-migrations
    sections: [v3 Temporal model, callbacks]
    critical: v3 uses Temporal (ZonedDateTime/PlainDate); don't pass strings.

  - url: https://schedule-x.dev/docs/calendar
    sections: [Getting started, Views (week/day), Calendars, DnD/Resize plugins]
    critical: Use "calendars" for employees; optimistic updates with rollback.

  - file: Engineering_rules.md
    sections: [Pinned toolchain, imports, server-only env, ESLint flat + Biome, RLS plan]
    critical: **Node 22**, `~/` imports only, TS strict; no client secrets. :contentReference[oaicite:19]{index=19}

  - file: plumbing_agent_mvp_prp.md
    sections: [Unscheduled flow, audit logging, Dutch market UX, invoice/voice context]
    critical: Align with MVP end-to-end patterns and auditability. 

  - file: ultimate-prp-template.md
    sections: [Template structure, Implementation blueprint, Validation loops]
    critical: Keep structure + validation gates. :contentReference[oaicite:21]{index=21}

Technical Architecture
Schedule-X v3 (Temporal) Integration

Timed events: Temporal.ZonedDateTime (Europe/Amsterdam).

All-day: Temporal.PlainDate.

Polyfill: temporal-polyfill imported once at app bootstrap.

Persistence: Convert to ISO UTC via .toInstant().toString() before DB save. (DB stores timestamptz.)

Adapter boundary only: Use Temporal → ISO conversions in a thin adapter; rest of app may keep ISO strings.

Plugins: events-service, drag-and-drop (15), resize (15).

Background rails: Non-interactive shading for hours/lunch/holidays/travel.

Adapter snippet

// DB ISO -> Temporal (Zoned), and back (ISO UTC)
const TZ = 'Europe/Amsterdam';
const toZDT = (iso: string) => Temporal.Instant.from(iso).toZonedDateTimeISO(TZ);
const toISO = (zdt: Temporal.ZonedDateTime) => zdt.toInstant().toString();

Data Models (reuse + delta)

Reuse MVP tables: jobs, employees, ai_recommendations, audit_logs, invoices (voice/invoice flow later).

New: job_assignees(job_id, employee_id, is_primary) + triggers to mirror jobs.employee_id. (Ensures lanes semantics & back-compat.)

API Contracts (tRPC)
jobs.list:
  in: { fromISO: string; toISO: string; employeeIds?: string[] }
  out: Job[] (+ job_assignees)

jobs.create:
  in: { title, description?, priority, customer_id,
        starts_at: ISO, ends_at: ISO,
        primary_employee_id?, secondary_employee_ids: string[] }

jobs.reschedule:
  in: { jobId, starts_at: ISO, ends_at: ISO }

jobs.updateAssignees:
  in: { jobId, primary_employee_id: string|null, secondary_employee_ids: string[] }

jobs.byId:
  in: { id }; out: Job (+ assignees)

employees.list: -> Employee[]

ai.listRecommendations: -> AILead[] (stub ok)

Security & Roles

Clerk org context in tRPC ({ orgId, userId, role, employeeId }).

Owner/Admin edit all; Staff can only edit self; Staff cannot create for others.

Server enforce now; RLS next sprint (policies drafted in MVP PRP).

UI/UX Specifications (Mobile-First)
Core Screens

Calendar / Jobs

Top bar: Month nav, Today, View toggle (Week/Day), Employee chips (horizontal).

Grid: Sticky time ruler; 15-min grid; smooth DnD/resize.

Rails: Hours, lunch, holidays shaded; 5-min travel hints (later dynamic).

FAB: “Nieuw werk” (bottom-right).

Bottom sheet: Ongepland (Unscheduled) with AI/WhatsApp leads → Apply → Confirm time → Assign.

Job Drawer

Primary & secondaries; description; priority badge.

Tabs (later): Details, AI Notes, Materials, Activity (audit).

Footer: Complete → Voice Invoice handoff.

Interactions & Rules

Drag-create/move/resize (tap-hold on mobile).

Overlap same employee → confirm override (Owner/Admin), block for Staff.

Off-hours: warn + allow for Owner/Admin; block Staff.

Dutch toasts/messages; keyboard + SR support.

Implementation Blueprint
Directory Layout (delta/new)
src/components/calendar/Calendar.tsx           // Schedule-X v3 wrapper (“use client”)
src/components/calendar/EmployeeChips.tsx      // Filter control
src/components/jobs/Unscheduled.tsx            // Bottom-sheet list → create
src/components/jobs/JobDrawer.tsx              // Assignees & actions
src/lib/calendar-temporal.ts                   // Temporal helpers (TZ, snap, ISO)
src/lib/calendar.ts                            // calendars map, job→events, rails
src/app/jobs/page.tsx                          // Page shell (mobile-first)
src/server/api/routers/jobs.ts                 // list/create/reschedule/assignees/byId
src/server/api/routers/employees.ts            // list
src/server/api/routers/ai.ts                   // listRecommendations (stub)
src/server/db/sql/003_multi_assignees.sql      // M2M + triggers

Sequential Tasks

Temporal foundation: Install temporal-polyfill; import globally; build toZDT/toISO helpers.

Event adapter: Expand one job → N events (assignees); start/end as ZonedDateTime; id ${jobId}__${employeeId}.

Calendar wrapper: useNextCalendarApp with Week/Day, events-service, DnD(15), Resize(15); optimistic onEventUpdate → jobs.reschedule; rollback on false.

Employee chips: Horizontal, persistent via localStorage; color = custom || auto palette.

Unscheduled drawer: AI leads → Apply (prefill) → datetime picker (15-min snap) → primary + multi-secondary → jobs.create.

Job Drawer: View/edit assignees; description; Complete → Voice Invoice button (link).

Background rails: Render business hours, lunch, NL holidays; seed 5-min travel slivers (adjacency per employee).

Permissions & audit: Server checks on all mutations; append audit logs.

DST & edge tests: Week of DST change; overlap dialogs; off-hours blocks (staff).

Known Gotchas & Library Quirks
// Schedule-X v3 requires Temporal; don't pass strings.
// All timed events => Temporal.ZonedDateTime; all-day => Temporal.PlainDate.
// Keep calendar component "use client"; constrain height to avoid nested scroll traps.
// Use events-service plugin to sync events (removeAll/add on data changes).
// Enforce ~/ imports, TS strict; no client secrets (see Engineering Rules). :contentReference[oaicite:27]{index=27}

Testing Strategy & Validation Loops

Validation Loops (Template):

Level 1: lint/type/format gates green.

Level 2: Unit — time snapping, overlap detection, permission guards.

Level 3: Integration — list→render; DnD→persist; Unscheduled→Assign.

Level 4: E2E (Playwright) — mobile drag/create/move/resize; assignee edits; DST week; Staff blocked from others.

Manual checks (Dutch UX):

Thumb-reach actions; Today sticky; toasts in NL; 24h time.

Performance, Observability & Security

Perf budgets: P95 < 200ms interaction; route bundle trimmed via code-split.

Structured logging & audit: Winston logger; logAuditEvent for each mutation.

Monitoring: Sentry errors; perf metrics; alerts for anomalies.

Security: Server-only env; Clerk org scoping; idempotent mutations; RLS planned next sprint.

Database Migration (Delta)

003_multi_assignees.sql (summary)

job_assignees(job_id, employee_id, is_primary) PK(job_id, employee_id)

Seed existing jobs.employee_id as primary.

Trigger to mirror primary → jobs.employee_id.

Trigger to enforce single primary per job.
(Full SQL from earlier scaffold.)

API & Adapter Snippets (Reference)

Temporal conversion on persistence

// onEventUpdate (Schedule-X v3)
await trpc.jobs.reschedule.mutate({
  jobId,
  starts_at: updated.start.toInstant().toString(),
  ends_at:   updated.end.toInstant().toString(),
});


Unscheduled → create

const startZ = Temporal.PlainDateTime.from(localValue).toZonedDateTime('Europe/Amsterdam');
const endZ   = startZ.add({ minutes: aiSuggestedMinutes ?? 60 });
await trpc.jobs.create.mutate({
  ...fields,
  starts_at: startZ.toInstant().toString(),
  ends_at:   endZ.toInstant().toString(),
});

Rollback Plan

Checkpoint after each task (commit). If instability: revert to last green.

Fallback UI: Render an agenda list with create/edit dialogs while calendar issues are fixed.

Future Enhancements

Premium resource lanes (strict side-by-side employees).

Dynamic travel time via Google Maps Distance Matrix + nudges.

Recurring jobs; holiday source management; route optimization.

RLS policies turned on once auth bridge is ready.

Final Notes

This PRP is aligned with our MVP’s AI→Schedule→Invoice loop, Dutch market UX, and Engineering Rules guard-rails. It integrates Schedule-X v3 (Temporal) correctly while keeping the rest of the app simple via a clear adapter boundary. Ship mobile-first; keep every interaction optimistic with a clean rollback path and full auditing.