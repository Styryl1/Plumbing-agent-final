# ⚠️ DOCUMENT SUPERSEDED

**This document has been consolidated into:**
- **Primary**: [whatsapp_ai_unified_prp.md](./whatsapp_ai_unified_prp.md) - Complete technical specification
- **Secondary**: [whatsapp_ai_unified_epic.md](./whatsapp_ai_unified_epic.md) - Implementation roadmap

**Status**: ARCHIVED - Do not update
**Superseded**: 2025-01-09

---

# Original: Ultimate PRP Template v3 - Context-Rich Production-Ready Implementation

---

## Executive Summary

**Feature Name**: WhatsApp AI Partner for Plumbers — MVP (v1.0)
**One-Line Description**: WhatsApp intake → AI triage → travel‑aware scheduling in Google Calendar → Job Cards → invoicing via connected accounting apps.
**Business Impact**: Targets €2k MRR in month 1; saves 4–8 hrs/week/plumber in admin; increases on‑time arrivals via travel‑safe slotting.
**Estimated Complexity**: Epic (16+ hours)
**Stack Compatibility**: T3 stack (Next.js App Router, tRPC), Supabase (RLS), Meta WhatsApp Cloud API, Google Calendar API, Google Distance Matrix, Mollie, Accounting connectors (Moneybird, e‑Boekhouden, WeFact).

---

## Goals & Context

### Goal
Ship a production‑ready MVP for NL plumbers that runs an end‑to‑end flow entirely over WhatsApp with Google Calendar as the source of truth and **external accounting systems from day one** for invoicing and payments.

### Why
- Plumbers want zero‑friction booking and invoicing; WhatsApp is ubiquitous.
- Manual scheduling causes late arrivals and lost revenue; travel‑aware proposals prevent unrealistic slots.
- Invoicing engines are complex; integrate with **Moneybird/e‑Boekhouden/WeFact** from the start to stay compliant and reduce engineering risk.

### What
- AI triage (Dutch first, English fallback) requests photos, address, and details; creates a draft diagnosis, duration, and quote range.
- Plumber approves time & quote (auto‑mode only for trivial clarifications).
- Customer gets **only travel‑safe time options**, confirms via Magic Booking page; event created in **Google Calendar** with **Job Card** link.
- After job, plumber replies with time + materials; invoice is created in the selected accounting system with Mollie iDEAL link; Supervisor approves before sending; plumber final checks.

### Success Criteria
- [ ] 20 paying pilots (≥€2k MRR) within 4 weeks.
- [ ] ≥70% invoices paid within 24h via iDEAL.
- [ ] ≤10% of confirmed jobs flagged as travel‑risk afterwards.
- [ ] 99%+ WhatsApp delivery success; <0.5% Calendar write errors.

---

## Requirements

### Functional Requirements
- **FR1: WhatsApp Intake & Triage** — Handle inbound messages (Dutch first, English fallback), collect photo/video, postcode + house number, and problem details; classify urgency (🚨/✅) and confidence.
- **FR2: Plumber Control Chat** — Relay AI draft (reply text, duration, price range) to plumber with quick‑action buttons: Approve & send, Edit, Ask for more info, Set auto‑mode (for this thread only).
- **FR3: Travel‑Aware Slot Proposal** — Generate 2–3 slot options from Google Calendar free/busy that pass Distance Matrix edge checks (prev→this, this→next) with buffer policy; customer confirms via Magic Booking page.
- **FR4: Google Calendar Write** — Create/update events in the plumber’s Google Calendar; insert a tokenized **Job Card** URL; mirror updates on reschedule.
- **FR5: Job Cards** — Mobile web, tokenized, 24h validity; Today view and per‑job detail with: time window, urgency, address→Maps, photos, AI notes, **actions** (On my way / Start / Add time+materials / Complete / Call / Open Maps).
- **FR6: Anchor Job Policy** — Night‑before selection and lock of first job (45‑min window) by score (urgency, complexity, uncertainty, revenue, distance).
- **FR7: Invoicing via Accounting Apps** — During onboarding, plumber selects: **Moneybird**, **e‑Boekhouden**, or **WeFact**; we OAuth and create contacts + invoices there; attach **Mollie iDEAL** payment link; capture external IDs and payment status via webhooks.
- **FR8: Supervisor Approval** — All invoices queue for Supervisor review; after approval, plumber final‑checks via WhatsApp; then the invoice is sent to the customer (WA + optional email).
- **FR9: Reminders** — Unpaid invoice reminders at +3d, +7d, +14d via WhatsApp; optional email fallback.
- **FR10: Rescheduling** — Customer can reschedule from mini‑card; recompute travel for neighbors; show only safe options; update Calendar + Job Cards.
- **FR11: Roles & Permissions** — Owner, Dispatcher, Tech (Plumber), Supervisor; Dispatcher can rearrange all techs; Tech sees only own jobs.
- **FR12: Audit & Training Data** — Log all AI suggestions, plumber edits/overrides, schedule changes, and invoice actions for QA and future model improvements.

### Non-Functional Requirements
- **NFR1: Security** — Supabase RLS full multi‑tenant isolation; JWT‑based tokenized Job Card links (24h); HMAC‑verified WhatsApp webhooks; restricted API keys; idempotent message sending.
- **NFR2: Privacy/GDPR** — Dutch consent line on first interaction; media retention 12 months (purge on request); DSAR workflow documented; lawful basis: contract.
- **NFR3: Performance** — Distance Matrix calls cached by 5‑min buckets; <1s slot‑proposal latency (excluding Maps call); resilient fallbacks to fixed buffers.
- **NFR4: Reliability** — Retries with backoff for Calendar & accounting APIs; message outbox; monitoring + alerting on failures.
- **NFR5: Accessibility & Mobile** — Job Cards WCAG AA; tap targets ≥48px; fast on mid‑range Android.

### Explicitly Out of Scope (for MVP)
- Internal calendar UI (Schedule‑X).
- Route optimization / VRPTW; we only compute **adjacent edges**.
- Materials catalogue/parts pricing.
- Marketplace.
- Live GPS tracking.

---

## All Needed Context

### Documentation & References
```yaml
documentation:
  - url: Meta WhatsApp Cloud API
    sections: Messages, Templates, Webhooks, Rate limits
    critical: Use templates outside 24h window; verify X-Hub-Signature-256
  - url: Google Calendar API
    sections: FreeBusy, Events insert/update, Extended Properties
    critical: Use extendedProperties.private to store lat/lng & jobId
  - url: Google Distance Matrix API
    sections: departure_time, traffic_model
    critical: Use predicted traffic; cache by 5-min buckets
  - url: Mollie API
    sections: Payments, Payment Links, Webhooks
    critical: iDEAL primary; verify webhook signatures
  - url: Moneybird API
    sections: Contacts, Sales Invoices, Webhooks
    critical: OAuth2; rate limits; ledger/account mapping
  - url: e-Boekhouden API
    sections: Debiteuren, Facturen, Betaalstatus
    critical: Token-based auth; map VAT codes
  - url: WeFact API
    sections: Debtors, Invoices, Webhooks
    critical: API keys per tenant; invoice PDF handling
existing_patterns:
  - file: (to be added) src/server/api/routers/wa.ts
    pattern: webhook verification, outbox, idempotency
  - file: (to be added) src/server/api/routers/calendar.ts
    integration: free/busy lookup, event upsert with extendedProperties
research_approach:
  - web_search: "Google Distance Matrix predicted traffic best practices"
  - web_search: "Moneybird + Mollie payment links integration"
```

### Current Codebase Analysis
```bash
# To be documented after repo init
```

### Desired Codebase Structure
```bash
New Files:
├── src/server/db/schema/
│   ├── orgs.ts
│   ├── users.ts
│   ├── plumbers.ts
│   ├── customers.ts
│   ├── jobs.ts
│   ├── invoices.ts
│   ├── accounting_connections.ts
│   └── audit_log.ts
├── src/server/api/routers/
│   ├── wa.ts                # WhatsApp webhooks + send
│   ├── schedule.ts          # proposeSlots, confirmSchedule, recomputeEdges
│   ├── accounting.ts        # invoiceDraft, invoiceSend via provider
│   └── calendar.ts          # Google Calendar adapter
├── src/lib/
│   ├── distance.ts          # Distance Matrix client + cache
│   ├── policy.ts            # buffers, anchor scoring
│   ├── moneybird.ts         # provider adapter
│   ├── eboekhouden.ts       # provider adapter
│   ├── wefact.ts            # provider adapter
│   └── mollie.ts            # payment link + webhook verify
├── src/app/p/
│   ├── today/page.tsx       # plumber Today view (if needed)
│   └── job/[id]/page.tsx    # Job Card (tokenized)
└── src/app/c/
    └── job/[id]/page.tsx    # Customer mini-card (tokenized)
```

### Known Gotchas & Library Quirks
```typescript
// WhatsApp: templates required outside 24h; keep message IDs for idempotency.
// Calendar: always store lat/lng+jobId in extendedProperties.private; timezone = Europe/Amsterdam.
// Distance Matrix: set departure_time for predicted traffic; cache by 5-min; fallback to fixed buffers.
// Accounting: Map VAT codes (21%, 9%, 0%) and VAT regime (NL domestic).
// Moneybird: Needs ledger/account IDs; create or select default revenue ledger.
// e‑Boekhouden: Different date/number formats; convert € values carefully.
// WeFact: Invoice numbers are provider-owned; store external IDs.
// Dutch postal codes: NNNNAA; always validate and geocode once; store lat/lng.
// Currency/locale: € with comma decimals in UI; store cents in DB as integers.
```

---

## Technical Architecture

### Stack Requirements
```yaml
Required Dependencies:
  - Next.js App Router
  - tRPC (routers: wa, schedule, calendar, accounting)
  - Supabase (Postgres + RLS; storage for media)
  - Zod (all inputs/outputs)
  - shadcn/ui (Job Card UI)
  - Google APIs (Calendar, Distance Matrix)
  - Meta WhatsApp Cloud API SDK/HTTP
  - Mollie Node SDK
  - Moneybird, e‑Boekhouden, WeFact connectors (HTTP)
Optional Dependencies:
  - Upstash Redis (cache Distance Matrix)
  - Make/n8n (optional orchestration before service hardening)
```

### Data Models (Zod/Types)
```typescript
export const AddressSchema = z.object({
  line: z.string().min(3),
  postalCode: z.string().regex(/^\d{4}[A-Z]{2}$/i),
  city: z.string().min(2),
  lat: z.number(),
  lng: z.number(),
});

export const JobSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  plumberId: z.string().uuid(),
  customerId: z.string().uuid(),
  status: z.enum(['scheduled','on_the_way','in_progress','completed','invoiced','paid']),
  issue: z.string().min(3),
  aiConfidence: z.number().min(0).max(1),
  urgency: z.enum(['urgent','normal']),
  estDurationMin: z.number().int().positive(),
  priceLow: z.number().int(),
  priceHigh: z.number().int(),
  start: z.date().nullable(),
  end: z.date().nullable(),
  travelMin: z.number().int().nullable(),
  address: AddressSchema,
  mediaUrls: z.array(z.string()).default([]),
  overrides: z.record(z.any()).default({}),
  anchor: z.boolean().default(false),
  calendarEventId: z.string().nullable(),
});
```

### API Contracts (tRPC)
```typescript
export const scheduleRouter = createTRPCRouter({
  proposeSlots: protectedProcedure
    .input(z.object({ plumberId: z.string(), customerAddress: AddressSchema, durationMin: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {/* returns {start,end,label}[] */}),

  confirmSchedule: protectedProcedure
    .input(z.object({ jobId: z.string(), slot: z.object({ start: z.date(), end: z.date() }) }))
    .mutation(async ({ input, ctx }) => {/* writes Calendar; returns JobCardURL */}),

  recomputeEdges: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ input, ctx }) => {/* returns {tightPrev, tightNext, suggestedShift} */}),
});

export const accountingRouter = createTRPCRouter({
  connectProvider: protectedProcedure
    .input(z.object({ provider: z.enum(['moneybird','eboekhouden','wefact']) }))
    .mutation(async () => {/* OAuth/init */}),

  invoiceDraft: protectedProcedure
    .input(z.object({ jobId: z.string(), hours: z.number(), materialsText: z.string().default(''), extrasText: z.string().default('') }))
    .mutation(async () => {/* create contact+invoice in provider; return external ids + preview */}),

  invoiceSend: protectedProcedure
    .input(z.object({ invoiceId: z.string() }))
    .mutation(async () => {/* send via provider; return payment link if not auto */}),
});

export const waRouter = createTRPCRouter({
  inboundWebhook: publicProcedure.input(z.any()).mutation(async () => {/* verify, route, reply */}),
  send: protectedProcedure.input(z.object({ to: z.string(), template: z.string(), params: z.array(z.string()).optional() })).mutation(async () => {/* ... */}),
});
```

### Database Schema Changes (Drizzle/SQL)
```sql
-- organizations, users, plumbers, customers, jobs, invoices, accounting_connections, audit_log
-- RLS policies: org_id based; plumbers see only their jobs; dispatcher/supervisor full org scope
CREATE TABLE accounting_connections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  provider text not null check (provider in ('moneybird','eboekhouden','wefact')),
  access_token text not null,
  refresh_token text,
  external_org_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

ALTER TABLE invoices ADD COLUMN provider text;
ALTER TABLE invoices ADD COLUMN external_invoice_id text;
ALTER TABLE invoices ADD COLUMN external_contact_id text;
ALTER TABLE invoices ADD COLUMN payment_status text;
```

---

## Implementation Blueprint

### Sequential Task List
```yaml
Task 1: DB & RLS foundation
  type: CREATE
  files:
    - schema tables (orgs, users, plumbers, customers, jobs, invoices, accounting_connections, audit_log)
  validation: migrations run; RLS policies active

Task 2: WhatsApp webhook + outbox
  type: CREATE
  files:
    - src/server/api/routers/wa.ts
  validation: HMAC verify; idempotent sends; logs in audit_log

Task 3: Distance Matrix client & policy
  type: CREATE
  files:
    - src/lib/distance.ts, src/lib/policy.ts
  validation: cached ETAs; fallback buffers; unit tests on edge cases

Task 4: Schedule router (propose/confirm/recompute)
  type: CREATE
  files:
    - src/server/api/routers/schedule.ts, calendar adapter
  validation: end‑to‑end: propose → confirm writes to Calendar (with extendedProperties)

Task 5: Job Cards (plumber + customer)
  type: CREATE
  files:
    - src/app/p/today/page.tsx, src/app/p/job/[id]/page.tsx, src/app/c/job/[id]/page.tsx
  validation: tokenized access; mobile responsive; actions post back

Task 6: Accounting adapters (Moneybird/e‑Boekhouden/WeFact)
  type: CREATE
  files:
    - src/lib/moneybird.ts, eboekhouden.ts, wefact.ts; accounting router
  validation: OAuth/token flow; create contact+invoice; get payment link; webhook payment status

Task 7: Invoice supervision flow
  type: CREATE
  files:
    - supervisor review page or Airtable view + tRPC ops
  validation: AI draft → Supervisor approve → Plumber confirm → send

Task 8: Reminders & reschedule
  type: CREATE
  files:
    - reminder worker; reschedule path reuse propose/confirm
  validation: WhatsApp templates fire; Calendar updates; logs
```

### Per-Task Implementation Details
```typescript
// distance.ts (pseudo)
export async function eta(origin, dest, depart): Promise<number> {
  const bucket = roundTo5Min(depart);
  const key = cacheKey(origin, dest, bucket);
  const cached = await cache.get(key);
  if (cached) return cached;
  const res = await fetchMatrix(origin, dest, bucket);
  const minutes = parseDuration(res);
  await cache.set(key, minutes, { ttl: 3 * 3600 });
  return minutes;
}

export function requiredGap(etaMin: number, policy: { pct: number; minCity: number; minOuter: number }, zone: 'city'|'outer') {
  return Math.ceil(etaMin * policy.pct) + (zone === 'city' ? policy.minCity : policy.minOuter);
}
```

### Integration Points
```yaml
Authentication:
  - Clerk/NextAuth as existing; protect tRPC routes; role claims
Google Calendar:
  - OAuth per plumber; store refresh tokens; write extendedProperties.private { jobId, lat, lng }
Accounting Providers:
  - OAuth (Moneybird), token auth (others); map VAT codes and accounts; store external IDs
Mollie:
  - Create payment link if provider doesn’t auto‑attach; webhook updates payment_status
Storage:
  - Supabase Storage for media; signed URLs; 12‑month lifecycle
```

---

## Validation Loops

### Level 1: Syntax & Style
- `npm run lint`, `npm run type-check`, `npm run format` — no errors.

### Level 2: Unit Tests
- Policy math; Distance Matrix parsing; Calendar upsert; accounting payload mapping; VAT calculations.

### Level 3: Integration Tests
- E2E: inbound WA → proposeSlots → confirmSchedule → Job Card → invoiceDraft → approve → send → payment webhook.

### Level 4: Security & Performance
- Biome/Semgrep scan; API key restrictions; Lighthouse Mobile ≥ 90 for Job Cards.

---

## UI/UX Specifications

### Core Screens
- **Magic Booking Page**: brand‑colored (gradient green), lists 2–3 valid time windows; reschedule option; success screen.
- **Plumber Job Card**: sticky action bar; big buttons; media zoom; notes; invoice status.
- **Customer Mini‑Card**: time window, address, reschedule/cancel buttons, small print (consent).

### Interaction Patterns
- Plumber must approve time & quote before any schedule is sent.
- Auto‑mode only allows AI clarifications; never confirms schedule.
- Emergency flags bypass options and alert plumber immediately.

### Accessibility
- WCAG AA; semantic HTML; keyboard focus states; color contrast ≥ 4.5:1.

### Dutch Market Considerations
- Dutch first (“je” tone); English fallback on detect.
- Date/time: DD‑MM‑YYYY; 24‑hour.
- Currency: € with comma decimals in UI (store cents).
- Postcodes: NNNNAA; validate.

---

## Testing Strategy

### Manual Checklist
- [ ] WhatsApp webhook verifies; messages relay to plumber control chat.
- [ ] Photo intake saved; address geocoded; consent line shown.
- [ ] proposeSlots returns only travel‑safe windows; Calendar event written; Job Card link present.
- [ ] Job Card buttons update status; customer notified appropriately.
- [ ] Invoice created in chosen accounting app; payment link present; statuses update on webhook.
- [ ] Reminders fire at +3/+7/+14 days.

### Automated
- Unit tests for policy, parsing, adapters; integration tests for accounting flows.
- Playwright E2E for booking and invoicing happy path.

### Performance
- Build size acceptable; Job Card loads < 1s on 3G Fast.

---

## Anti-Patterns & Golden Rules
- ❌ Don’t show customers times that aren’t travel‑safe.
- ❌ Don’t auto‑schedule without plumber confirmation.
- ❌ Don’t store accounting credentials without encryption and rotation.
- ✅ Always store job lat/lng and jobId in Calendar extendedProperties.private.
- ✅ Always log AI suggestions and human overrides.
- ✅ Always provide fallback fixed buffers if Maps fails.

---

## Rollback Plan
- Git checkpoints after each Task; feature flags for provider connectors; ability to switch a plumber to PDF‑only invoices if provider outage occurs.

---

## Final Validation Checklist
- [ ] 2–3 pilot plumbers onboarded; real bookings created and completed.
- [ ] First invoices sent via accounting apps; iDEAL payments received.
- [ ] Supervisor daily invoice queue functioning.
- [ ] Travel warnings < 10% post‑confirm.
- [ ] Monitoring/alerts configured for WA, Calendar, Accounting, Mollie.

---

## Notes & Assumptions
- Accounting providers differ; we start with Moneybird best‑effort, then e‑Boekhouden/WeFact.
- Plumbers connect their own Google Calendar and accounting provider via OAuth.
- Telephony/caller → job prompts (Aircall/Twilio/VoIPGRID) are Phase 2.

## Future Enhancements
- Schedule‑X internal calendar; nightly VRPTW (suggest‑only); deeper accounting sync (item lines); live ETA; skills/zones; marketplace integrations.

