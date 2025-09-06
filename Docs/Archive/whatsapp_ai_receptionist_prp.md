# ⚠️ DOCUMENT SUPERSEDED

**This document has been consolidated into:**
- **Primary**: [whatsapp_ai_unified_prp.md](./whatsapp_ai_unified_prp.md) - Complete technical specification
- **Secondary**: [whatsapp_ai_unified_epic.md](./whatsapp_ai_unified_epic.md) - Implementation roadmap

**Status**: ARCHIVED - Do not update
**Superseded**: 2025-01-09

---

# Original: PRP — WhatsApp AI Partner & Hybrid Messaging (Cloud API + Control Chat + Relay)

Version: 1.1 (MVP + Phase 2)
Owner: Plumbing Agent (Jordan)
Date: 28 Aug 2025 (Europe/Amsterdam)

Executive Summary

Feature: WhatsApp AI Partner for plumbers (Control Chat) + compliant customer messaging (Cloud API) with future Customer AI Receptionist & Self-Booking.
Mission: Keep both plumbers and customers inside WhatsApp while AI does triage, scheduling, invoicing, and reminders. Dashboard remains an optional “second screen.”
Why now: WhatsApp is the Dutch plumber’s default. We capture rich signals (text/photo) → faster diagnosis → faster booking → faster payment.
Scope:

Phase 1 (MVP): Two-number hybrid (Customer #1, Control Chat #2), AI suggestions, plumber approvals, scheduling, invoicing, payment, reminders, GDPR.

Phase 2 (Later Improvement): Customer AI Receptionist that triages, requests photos, and offers time slots (WhatsApp lists and optional “Magic Booking Link”), with optional deposits and reschedule links.

Goals & Success Criteria
Goals

G1: Customers message the main number (#1); we ingest, store, and respond compliantly.

G2: Plumbers talk to the AI partner in Control Chat (#2); never forced into a dashboard.

G3: AI proposes actions (diagnosis, materials, hours, time) and executes them with plumber approval.

G4: End-to-end: intake → schedule → invoice → iDEAL → reminders.

G5 (Phase 2): Customer AI Receptionist reduces back-and-forth: triage → photos → slot selection → confirm (± deposit).

Success Criteria

S1: P95 ingestion-to-database < 3s; P95 plumber-reply → customer-relay < 5s.

S2: 0 duplicate job/invoice creations (idempotency proven in logs).

S3: 100% outbound customer messages use session vs template correctly.

S4: GDPR: DSAR export/delete works; retention jobs pass audit; no PII in logs.

S5: Phase 2: ≥60% of non-urgent chats complete time selection without human back-and-forth.

Personas & UX Principles

Plumber (primary): Lives in WhatsApp. Needs speed, clarity, and control.

Customer (homeowner/tenant): Wants quick help, clear choices, and trust.

Admin (you): Needs auditability, privacy, and reliability.

Principles: WhatsApp-first, short messages, use buttons/lists where possible, truthful assistant, safe guidance (never unsafe boiler/gas advice), easy opt-out to human.

System Overview
Numbers

#1 Customer Number (Cloud API): All customer-facing threads (compliant rail).

#2 Control Chat (Cloud API): 1:1 plumber ↔ AI partner. (Optionally one per org.)

High-Level Flows (Phase 1)

Customer → #1: “Shower blocked” (+ photo) → webhook → store → AI suggests.

AI → #2: “Likely blockage; 90 min. Propose 16:00?” [Confirm] [Offer 18:30] [Not urgent]

Plumber action → #1 sends confirmation (session or template).

Invoice drafted on completion; iDEAL link via #1; reminders at 7/14/30 days.

High-Level Flows (Phase 2)

Receptionist in #1: triage, request photos, offer slots (WhatsApp list) or Magic Booking Link (micro booking page).

Optional deposit pre-confirmation.

Plumber approval remains in #2 (silent or explicit, configurable).

Reschedule link in WhatsApp confirmation (Micro page).

Requirements
Functional Requirements — Phase 1 (MVP)

FR1: Ingest customer messages/media from #1; verify HMAC; store conversations.

FR2: AI propose {issue, urgency, materials[], labor_hours, suggested_slot}.

FR3: Notify plumber in #2 with interactive options; accept free text/voice.

FR4: Relay plumber messages from #2 → #1 with 24h/session vs template selector.

FR5: Create/reschedule jobs (Schedule-X), apply travel buffer/risk setting.

FR6: Generate invoice PDF + Mollie link; send via #1; payment webhooks update state.

FR7: Payment reminders (7/14/30) via templates.

FR8: Conversation timeline per customer in dashboard (read-only MVP).

FR9: Audit logs for AI actions, approvals, outbound messages.

FR10: Idempotency for webhooks/outbox (dedupe by waMessageId + unique keys).

FR11: Fallback to email/SMS on WhatsApp send failure; notify plumber in #2.

FR12: Localization NL/EN (auto or org preference).

Functional Requirements — Phase 2 (Customer AI Receptionist & Self-Booking)

FR13: Receptionist greets in #1 (NL/EN), collects essentials (address, photos).

FR14: Triage follow-ups (domain-safe) and duration estimation.

FR15: Slot selection (Option A) — WhatsApp interactive list (2–5 slots).

FR16: Slot selection (Option B) — send “Magic Booking Link” (mobile page) with live availability.

FR17: Booking confirmation: WhatsApp message + ICS + (optional) deposit via Mollie.

FR18: Reschedule via Magic Link (customer self-serve) with RLS checks.

FR19: Escalation: low-confidence → ping plumber in #2; relay reply back to #1.

FR20: Template packs (NL/EN) for receptionist: slot offers, confirmations, deposits, reschedule, late running.

FR21: Feature flag: WHATSAPP_RECEPTIONIST_ENABLED per org.

FR22: Telemetry: conversion to booked, completion times, drop-off points.

Non-Functional Requirements (both phases)

NFR1: Performance: P95 webhook handling < 2s including media fetch.

NFR2: Reliability: Outbox retries + exponential backoff; circuit breakers.

NFR3: Security: Server-only env gateway; least privilege; encrypted storage; RLS by orgId.

NFR4: GDPR (NL): privacy link in WA profile; 30–90d raw chat/media; invoices 7y; DSAR ops; anonymise training data.

NFR5: Observability: structured logs, Sentry, metrics/alerts on 429/5xx/signature fails.

NFR6: Cost controls: per-org caps for templates; usage meters.

Explicitly Out of Scope (both phases)

Automated sending via Mirror/Web (inbound-only if used at all).

Voice/video calling in WhatsApp.

Payments inside WhatsApp (we use Mollie pages).

Multi-brand masking across numbers.

Architecture
Services & Components

WhatsApp Cloud API x 2 numbers (Customer #1, Control #2).

API routes (Next.js App Router): /api/wa/customer, /api/wa/control.

tRPC routers: automation, schedule, invoices, receptionist (Phase 2).

Outbox for reliable delivery with retries/backoff and dedupe.

Schedule-X for availability; Mollie for iDEAL; Supabase for DB/storage.

Data Model (additions since 1.0)
// Additions for Phase 2
export const proposedSlots = pgTable("proposed_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull(),
  conversationId: uuid("conversation_id").notNull(),
  durationMinutes: integer("duration_min").notNull(),
  windowStart: timestamp("window_start").notNull(),
  windowEnd: timestamp("window_end").notNull(),
  travelBufferMin: integer("travel_buffer_min").notNull().default(0),
  riskPolicy: varchar("risk_policy", { length: 16 }).notNull().default("normal"),
  source: varchar("source", { length: 16 }).notNull().default("ai"), // ai | human
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const bookingLinks = pgTable("booking_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull(),
  conversationId: uuid("conversation_id").notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  prefilled: jsonb("prefilled").$type<{
    durationMin: number; address?: string; jobType?: string;
  }>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const deposits = pgTable("deposits", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull(),
  jobId: uuid("job_id"),
  conversationId: uuid("conversation_id"),
  amountCents: integer("amount_cents").notNull(),
  molliePaymentId: varchar("mollie_payment_id", { length: 64 }),
  status: varchar("status", { length: 16 }).notNull().default("pending"), // pending|paid|failed|refunded
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

Slot Generation Algorithm (Phase 2)

Estimate duration from triage + history (min/max with confidence band).

Pull plumber availability (Schedule-X) for the next N days.

Apply travel buffer and risk policy (low risk = larger gaps).

Generate top 3–5 candidate windows near the customer’s preferred times.

If WA list limits exceeded or customer wants “other,” generate Magic Booking Link with long horizon search.

On customer pick, lock the slot (short TTL hold), prompt plumber approval (optional), then confirm.

24-Hour Rule Selector (unchanged)
if now - conversation.lastIncomingAt <= 24h:
  send freeform session message via #1
else:
  send approved template (brief follow-up) to reopen window

APIs & Contracts
Route Handlers

POST /api/wa/customer — Webhook from #1 (inbound).

Verify HMAC; download media immediately; store; fire receptionist.handleInbound() (Phase 2) or ai.suggest() (Phase 1).

POST /api/wa/control — Webhook from #2 (plumber).

Parse plumber intent; dispatch actions (relayToCustomer, schedule, invoice).

tRPC Routers

automation.relayToCustomer({ conversationId, text, media? })

automation.notifyPlumber({ orgId, conversationId, preview })

schedule.findSlots({ orgId, durationMin, window? })

schedule.book({ orgId, slot, customerId })

invoices.createAndSend({ jobId, lines[] })

Phase 2:

receptionist.offerSlots({ conversationId })

receptionist.createBookingLink({ conversationId, durationMin })

receptionist.confirmFromList({ conversationId, slotId })

receptionist.reschedule({ bookingId, newSlot })

WhatsApp Interactive Examples

A) Slot List (3 choices)

{
  "type": "interactive",
  "interactive": {
    "type": "list",
    "header": { "type": "text", "text": "Kies een tijd" },
    "body": { "text": "We kunnen vandaag of morgen langskomen." },
    "footer": { "text": "Plumbing Agent" },
    "action": {
      "button": "Tijd kiezen",
      "sections": [{
        "title": "Beschikbare tijden",
        "rows": [
          { "id": "slot_2025-08-28T16:00Z", "title": "Vandaag 16:00–17:30" },
          { "id": "slot_2025-08-28T18:30Z", "title": "Vandaag 18:30–20:00" },
          { "id": "slot_2025-08-29T09:00Z", "title": "Morgen 09:00–10:30" }
        ]
      }]
    }
  }
}


B) Magic Booking Link

{
  "messaging_product": "whatsapp",
  "to": "{{customer_phone}}",
  "type": "template",
  "template": {
    "name": "booking_link_v1",
    "language": { "code": "nl" },
    "components": [{
      "type": "body",
      "parameters": [
        { "type": "text", "text": "Kies zelf een tijd die past:" },
        { "type": "text", "text": "https://pa.example/booking?t={{token}}" }
      ]
    }]
  }
}


C) Booking Confirmation + ICS (MVP micro page generates .ics)

Send a session message with summary; attach .ics file URL (signed) or inline document.

Validation Gates & QA
Phase 1 Gates

✅ HMAC verification rejects bad signatures.

✅ Duplicate webhook deliveries → single row (idempotent).

✅ Outbound selector uses session vs template correctly (unit tests).

✅ Media downloaded and persisted (private); signed URL generated.

✅ Audit trail created for AI suggestion, plumber approval, and every outbound.

✅ E2E: intake → confirm → schedule → invoice → iDEAL → reminder.

Phase 2 Gates

✅ Receptionist never gives unsafe advice; domain-restricted Q&A.

✅ Slot generator returns ≤5 options; long horizon uses Magic Link.

✅ Booking is atomic and idempotent; plumber approval path configurable.

✅ Deposit optional; refund/void flows respected.

✅ Reschedule link enforces org/customer ownership (RLS).

✅ E2E: triage → photos → slot list selection → confirm + ICS → reschedule → (optional) deposit.

Security & GDPR

Lawful basis: contract performance.

Transparency: business profile contains privacy link.

Retention: conversations/media 30–90d; invoices/jobs 7y.

Training data: anonymised; exclude PII and precise addresses from model inputs.

Access control: org-scoped; per-plumber permissions; control chat isolated per org.

Auditability: append-only logs of AI actions, approvals, sends.

Backups/DR: PITR on DB; storage versioning for documents; runbooks for WA/Mollie outages.

Testing Strategy

Unit: Zod schemas, selectors (24h), slot generator, VAT math, HMAC.

Integration: Webhooks idempotency, schedule booking, invoice + payment webhook.

E2E (Playwright):

P1: customer msg → AI suggestion → plumber confirm in #2 → customer confirm in #1 → invoice paid.

P2: receptionist triage → photos → slot list selection → confirm + ICS → reschedule → (optional) deposit.

Perf/Load: send burst of messages; ensure queue/backoff holds; verify circuit breaker trips/recovers.

Rollout Plan

Feature flags: WHATSAPP_HYBRID_ENABLED, WHATSAPP_RECEPTIONIST_ENABLED.

Pilot: 1–3 plumbers; collect metrics; fix edge cases.

Templates: approve NL/EN for all core flows ahead of time.

Migration: when desired, migrate legacy numbers → Cloud API; retire Mirror.

Risks & Mitigations

Template rejections / 24h rules: keep neutral wording; use session when possible.

Media TTL: immediate fetch; retry on 401; alert on repeated failures.

Double booking: TTL slot holds; unique constraints; transactional booking.

Number reputation: keep message quality high; avoid spammy follow-ups.

Vendor outage: fall back to email/SMS; queue sends; inform plumber in #2.

Roadmap

Phase 1 (now): Two-number hybrid, relay, scheduling, invoicing, payment, reminders.

Phase 2 (later): Receptionist + slot chooser (lists/link), optional deposits, reschedule link.

Phase 3: Predictive slotting, auto-book on policy, richer analytics, supplier stock insights.

Appendices
A. Template Copy (Dutch, examples)

Follow-up (≥24h): “We hebben een update over uw aanvraag. Antwoord met ‘OK’ om verder te gaan.”

Slot list intro: “We kunnen vandaag of morgen langskomen. Kies een tijd:”

Magic link: “Liever zelf kiezen? Gebruik deze link: {{link}}”

Confirmation: “Bevestigd: {{date}} {{time}} (±{{duration}}).”

Deposit: “Om de afspraak te reserveren, graag een aanbetaling van €{{amount}}.”

Running late: “We lopen ongeveer {{mins}} min. uit. Excuses voor het ongemak.”

B. Safety Prompts (Receptionist)

“Ik ben de assistent van {Plumber}. Ik geef geen gas/boiler-instructies. In nood, bel 112.”

“Kunt u een foto sturen? Kunt u het water afsluiten (indien veilig)?”

“Ik kan drie tijden voorstellen. Welke past het best?”

Definition of Done (Phase 2 added):

All Phase 1 DoD items +

Receptionist feature flag off-by-default, tested in pilot org.

Slot list + Magic Link both functional, with deposit optional.

Reschedule link works and respects RLS.

E2E Phase 2 scenarios pass.

Templates approved NL/EN.