# ⚠️ DOCUMENT SUPERSEDED

**This document has been consolidated into:**
- **Primary**: [whatsapp_ai_unified_epic.md](./whatsapp_ai_unified_epic.md) - Complete implementation roadmap
- **Secondary**: [whatsapp_ai_unified_prp.md](./whatsapp_ai_unified_prp.md) - Technical specification

**Status**: ARCHIVED - Do not update
**Superseded**: 2025-01-09

---

# Original: EPIC — WhatsApp AI Partner Lite (MVP)
Scope & North Star

Run a plumber’s day on WhatsApp + Google Calendar with accountant-grade invoices handled by external providers. MVP excludes internal calendar UI; Google Calendar is the source of truth with mobile Job Cards for plumbers.

High-Level Flow

Customer WhatsApp → AI triage (issue/urgency/duration) → Plumber approves in Control Chat → Offer travel-safe times → Customer confirms via Magic Booking page → Google Calendar event with Job Card link → After visit, plumber sends time/materials → Invoice created in connected accounting app with Mollie iDEAL → Supervisor approves → send → auto reminders.

Guardrails (always on)

NL first (English fallback), GDPR, no mock data, org-scoped isolation, audit logs of AI actions & sends.

S0 — Foundations & Feature Flags

Objective: Establish flags, env, and minimal data model stubs so slices can ship independently and roll back cleanly.

Deliverables

~/lib/env.ts: WHATSAPP_MVP_ENABLED, ACCOUNTING_PROVIDER (moneybird|wefact|eboekhouden), USE_MOLLIE_FALLBACK, REMINDERS_ENABLED.

~/server/db/schema/*: orgs, customers, jobs, invoices, audit_log, accounting_connections (additive only).

~/server/observability/*: Sentry + structured logs (no PII).

Docs: runbooks for WA/Mollie/provider outages.

Acceptance

Type-safe env; flags toggle behavior at runtime.

PITR enabled; logs redact PII.

Health checks green.

Notes
Follow the “capability matrix + flags” pattern you used in invoicing v2 (single reminder engine).

S1 — WhatsApp Webhooks (Customer #1) + Control Chat (#2)

Objective: Receive inbound messages/media, verify HMAC, persist, and notify the plumber via Control Chat; support compliant session vs template selection (24-hour rule).

Deliverables

Routes: /api/wa/customer, /api/wa/control (verify X-Hub-Signature-256; idempotent handlers).

Tables: conversations, messages, media (private storage).

Outbox with retries/backoff + dedupe on waMessageId.

Acceptance

P95 inbound handling <2s incl. media fetch.

Relay latency plumber→customer <5s.

0 duplicate message inserts; session vs template selector correct.

S2 — AI Triage & Suggestions

Objective: Convert chat + photos into {issue, urgency, materials[], labor_hours, confidence}; log suggestions; never auto-send without plumber approval.

Deliverables

~/server/api/routers/ai.ts: suggest(conversationId) returns typed DTO.

Learning events table for plumber edits (time/material corrections).

Safe domain prompts and Zod validation.

Acceptance

≥80% triage correctness on a golden set; min–max time with confidence band; edits recorded.

S3 — Plumber Control Chat UX (Approve/Edit/Ask)

Objective: Notify plumber with an actionable card (Approve & send / Edit / Ask for more info / Auto-mode for clarifications only).

Deliverables

Control-chat intents → dispatcher: approveProposal, editAndSend, requestMoreInfo, toggleAutoMode.

Audit trail for every action (who/when/before→after).

Acceptance

All outbound to customers are plumber-approved; actions audited.

S4 — Travel-Aware Slot Proposals

Objective: Generate 2–3 “safe” time options based on Google Calendar free/busy + Distance Matrix edges (prev→this, this→next) with policy buffers and caching.

Deliverables

~/server/api/routers/schedule.ts: proposeSlots, confirmSchedule, reschedule.

~/lib/distance.ts: 5-min bucket cache; policy math helper.

Policy config: risk level → buffer %, city/outer mins.

Acceptance

Only travel-safe options presented; slot proposal latency <1s (excluding Maps call); fallbacks to fixed buffers on Maps outage.

S5 — Magic Booking Page (Customer) + Confirmation

Objective: Customer taps a link (tokenized) → sees 2–3 time windows → confirms; confirmation returns to WA + writes Calendar.

Deliverables

~/app/c/job/[id]/page.tsx: 24h token validity; reschedule path.

Template messages: “booking_link_v1”, confirmation copy.

ICS attachment/path after confirm.

Acceptance

Confirmed slot creates/updates Calendar; WA confirmation sent; ICS downloadable.

S6 — Google Calendar Write + Extended Properties

Objective: Persist bookings to the plumber’s Google Calendar as source of truth. Store jobId, lat, lng in extendedProperties.private.

Deliverables

~/server/api/routers/calendar.ts: upsert event, resync on change.

OAuth per plumber; token store; retry with backoff.

Acceptance

99.5% write success; extendedProperties contain jobId/lat/lng; mirrored on reschedule.

S7 — Plumber Job Cards (Mobile) + “Today” View

Objective: Mobile Job Cards for the plumber: time window, address→Maps, photos, AI notes, sticky action bar: On my way / Start / Add time+materials / Complete / Call / Open Maps.

Deliverables

~/app/p/today/page.tsx and ~/app/p/job/[id]/page.tsx (tokenized).

Status transitions update Calendar & notify customer.

Acceptance

Loads <1s on 3G Fast; actions update status + customer comms; WCAG AA.

S8 — Provider Invoicing v2 (Moneybird first; WeFact/e-Boekhouden later)

Objective: Create/send invoices in the selected provider; we store external ids, links, and statuses. We never assign internal numbers post-send.

Deliverables

DB additive migration: provider fields (provider, external_id, pdf_url, ubl_url, payment_url, provider_status, issued_at, is_legacy).

Provider interface + Moneybird adapter (OAuth, webhooks).

Minimal v2 router & UI (list/get/createDraft → send) with provider badges.

Acceptance

Draft→send produces provider PDF/UBL + PaymentURL; status sync via webhook/poll; v2 invoices lock after send.

S9 — Voice → Invoice Draft

Objective: Capture plumber voice after job → transcript → structured invoice draft (lines, VAT), plumber edits/approves → pass to provider.

Deliverables

~/server/api/routers/invoices.ts: createDraftFromVoice.

STT via AI SDK v5; Zod-validated DTO; cents math preserved.

Acceptance

≥70% voice notes → usable draft; Dutch VAT fields correct; no floating-point math.

S10 — Mollie iDEAL Payment Links & Webhooks

Objective: Attach PaymentURL from provider when available; otherwise create Mollie link; webhook sets paid status.

Deliverables

~/lib/mollie.ts; webhook route; audit.

UI shows PaymentURL (provider) or Mollie fallback; never mark paid client-side.

Acceptance

Payment status reflects provider/Mollie webhooks only; reminders skip paid.

S11 — Supervisor Approval Queue

Objective: All invoices queue for Supervisor review; after approval, plumber final-checks in WA; then send.

Deliverables

Supervisor review page (or Airtable view) + tRPC ops.

WA flow for final plumber “OK”.

Acceptance

AI draft → Supervisor approve → Plumber confirm → send; full audit trail.

S12 — Reminders (+3/+7/+14) & Reschedule

Objective: WhatsApp reminder templates for unpaid invoices; customer self-reschedule via Magic Link; recompute travel edges.

Deliverables

Reminder worker (queue + templates), reuse S4/S5 for reschedule.

Opt-out and quiet-hours policy.

Acceptance

Reminders fire correctly; Calendar & Job Cards update on reschedule; alerts on failures.

S13 — RLS, GDPR & Audit

Objective: Lock multi-tenant access and privacy. Add DSAR export/delete and retention jobs (media 12 months).

Deliverables

Supabase RLS policies by org_id; server-only service role in verified webhooks.

DSAR export; delete/anonymise pipeline; retention cron.

Acceptance

Org isolation tests pass; DSAR completed; retention job deletes media on schedule.

S14 — Observability, Alerts & Rollback

Objective: Production readiness: metrics, alerts, runbooks, and kill-switches.

Deliverables

Metrics for WA latency, Calendar write errors, template rejects, payment failures.

Alert policies; feature kill-switches per provider & WA.

Acceptance

On simulated outage, alerts trigger; kill-switch flips the feature off cleanly.

Validation & Testing Plan (apply per slice)

Unit: policy math, Distance Matrix parsing, Calendar upsert, provider payload mapping, VAT math.

Integration: WA webhook idempotency; schedule booking; provider draft→send; Mollie webhook.

E2E (Playwright): inbound WA → proposeSlots → confirmSchedule → Job Card → invoiceDraft → approve→ send → payment webhook (happy path).

Perf: Job Card <1s on 3G Fast; slot-proposal latency budgets met.

File & Module Map (golden paths)
src/
 ├─ app/
 │   ├─ c/job/[id]/page.tsx             # Magic Booking Page (customer)
 │   ├─ p/today/page.tsx                # Plumber Today view
 │   └─ p/job/[id]/page.tsx             # Plumber Job Card
 ├─ server/api/routers/
 │   ├─ wa.ts                           # WhatsApp webhooks + send
 │   ├─ ai.ts                           # Triage + suggestions
 │   ├─ schedule.ts                     # proposeSlots / confirm / reschedule
 │   ├─ calendar.ts                     # Google Calendar adapter
 │   ├─ invoices.ts                     # v2 provider routes + voice→draft
 │   └─ accounting.ts                   # provider auth (Moneybird first)
 ├─ lib/
 │   ├─ distance.ts                     # Distance Matrix + cache + policy
 │   ├─ mollie.ts                       # Mollie link + webhooks
 │   ├─ policy.ts                       # buffers, anchor job rules
 │   └─ provider/*.ts                   # Moneybird|WeFact|e-Boekhouden
 └─ server/db/schema/…                  # additive migrations only


“Claude Code Super-Prompt” seeds (repeatable per slice)

For each slice Sx, include:

Quick Card

📌 Objective: <one sentence>
📂 Scope (EDIT ONLY): <exact files/globs>
⚙️ Commands: pnpm check (every 1–2 edits) → pnpm guard --scope="<globs>"
🚨 Escalate: >3 TS errors, external API ambiguity, RLS policy edits
🔐 Rules: Temporal only, Zod v4, strict ?? discipline, DTO→mapper→UI, NL/EN i18n


(Use the same coding guardrails from your CLAUDE.md / super-prompt template.)

Acceptance (per slice)

0 TypeScript errors in scope; 0 ESLint warnings; E2E happy-path passes; schema-drift check clean.

Success Metrics (MVP)

Business: 20 pilot plumbers (≥€2k MRR in 4 weeks); ≥70% invoices paid <24h.

Reliability: 99%+ WA delivery; <0.5% Calendar write errors; travel warnings <10%.

Security/Privacy: 100% org isolation tests pass; DSAR flows verified; no PII in logs.

Out of Scope (MVP)

Internal Schedule-X calendar UI, route optimization/VRPTW, materials catalogue, marketplace, live GPS. (You can re-enable your internal calendar later as Phase 2.)