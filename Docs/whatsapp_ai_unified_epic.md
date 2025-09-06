# EPIC — WhatsApp AI Receptionist: Implementation Roadmap

**Version**: 2.0 (Unified)  
**Owner**: Plumbing Agent (Jordan)  
**Date**: 2025-01-09 (Europe/Amsterdam)  
**Scope**: Complete implementation in 22 slices  
**Timeline**: Phase 1 (S0-S14) immediate, Phase 2 (S15-S21) future  

---

## North Star Vision

Transform Dutch emergency plumbers from "overwhelmed by admin" to "AI-powered efficiency" through WhatsApp-first automation that handles intake → diagnosis → scheduling → invoicing → payment without forcing anyone into dashboards.

---

## Implementation Overview

### Phase 1: MVP Core (S0-S14)
**Goal**: Launch with 5 pilot plumbers within 3 weeks  
**Focus**: Two-number WhatsApp, AI analysis, Job Cards, Google Calendar, Moneybird invoicing

### Phase 2: Enhancements (S15-S21)  
**Goal**: Scale to 500 plumbers within 6 months  
**Focus**: Live tracking, voice transcription, advanced scheduling, team features

---

## Phase 1 Slices (MVP)

### S0 — Foundation & Configuration

**Objective**: Establish feature flags, environment variables, and base data model so all slices can ship independently.

**Deliverables**:
```yaml
Files to CREATE:
  - src/lib/feature-flags.ts
  - src/lib/env-whatsapp.ts
  - src/server/db/sql/020_whatsapp_foundation.sql
  - src/server/observability/whatsapp-logger.ts
  - Docs/runbooks/outage-procedures.md

Key Features:
  - WHATSAPP_ENABLED flag
  - DUAL_NUMBER_MODE flag
  - AI_ANALYSIS_ENABLED flag
  - JOB_CARDS_ENABLED flag
  - ACCOUNTING_PROVIDER enum (moneybird|wefact|eboekhouden)
  - Monitoring setup with Sentry
```

**Acceptance Criteria**:
- [ ] All flags toggle features at runtime
- [ ] Environment validation on startup
- [ ] Database migrations applied cleanly
- [ ] Health check endpoints return 200
- [ ] Monitoring dashboard shows metrics

**Claude Super-Prompt Seed**:
```
📌 Objective: Set up feature flags and foundational configuration
📂 Scope: Create new files only in lib/, server/db/sql/, server/observability/
⚙️ Commands: pnpm check after each file, pnpm guard at end
🚨 Escalate: Any changes to existing auth or RLS policies
🔐 Rules: Use ~/imports, Temporal only, strict TypeScript
```

---

### S1 — WhatsApp Webhook Infrastructure

**Objective**: Receive and process messages from both WhatsApp numbers with HMAC verification and idempotent handling.

**Deliverables**:
```yaml
Files to CREATE:
  - src/app/api/wa/customer/route.ts
  - src/app/api/wa/control/route.ts
  - src/server/api/routers/whatsapp.ts
  - src/server/services/whatsapp-client.ts
  - src/server/db/sql/021_whatsapp_tables.sql

Core Logic:
  - HMAC signature verification
  - Webhook event deduplication
  - Media download and storage
  - Message normalization
  - 24-hour session tracking
```

**Acceptance Criteria**:
- [ ] Webhooks verify Meta signatures correctly
- [ ] Duplicate events handled idempotently
- [ ] Media files downloaded and stored in Supabase
- [ ] Messages persisted with conversation threading
- [ ] P95 processing time < 2 seconds

**Claude Super-Prompt Seed**:
```
📌 Objective: Implement WhatsApp webhook handlers for two numbers
📂 Scope: app/api/wa/*, server/api/routers/whatsapp.ts
⚙️ Commands: Test with curl webhook simulations
🚨 Escalate: Security concerns with HMAC or token storage
🔐 Rules: Server-only secrets, no PII in logs
```

---

### S2 — AI Brain Core (Analysis Engine)

**Objective**: Analyze photos, text, and voice inputs to generate diagnosis, time estimates, and quote drafts.

**Deliverables**:
```yaml
Files to CREATE:
  - src/server/api/routers/ai-brain.ts
  - src/server/services/ai/analyzer.ts
  - src/server/services/ai/prompts.ts
  - src/schema/ai-types.ts
  - src/server/db/sql/022_ai_tables.sql

AI Capabilities:
  - Photo analysis for plumbing issues
  - Text parsing for problem description
  - Diagnosis generation with confidence
  - Time estimate (min-max range)
  - Quote draft with line items
  - Dutch + English support
```

**Acceptance Criteria**:
- [ ] 80%+ accuracy on test photo set
- [ ] Time estimates within 30min of actual
- [ ] All outputs Zod validated
- [ ] Learning events captured
- [ ] P95 analysis < 2.5 seconds

**Claude Super-Prompt Seed**:
```
📌 Objective: Build AI analysis engine for plumbing issues
📂 Scope: server/api/routers/ai-brain.ts, server/services/ai/*
⚙️ Commands: Test with sample photos and text
🚨 Escalate: AI SDK v5 integration issues
🔐 Rules: No auto-execution, all actions need approval
```

---

### S3 — Dashboard AI Chatbot

**Objective**: Provide web-based AI interface for plumbers who prefer dashboard over WhatsApp.

**Deliverables**:
```yaml
Files to CREATE:
  - src/components/ai/chat-widget.tsx
  - src/components/ai/voice-input.tsx
  - src/components/ai/screenshot-upload.tsx
  - src/app/(dashboard)/ai-chat/page.tsx
  - src/hooks/use-ai-chat.ts

Features:
  - Floating chat widget (collapsible)
  - Voice input with speech-to-text
  - Screenshot parsing for WhatsApp chats
  - Multi-file upload support
  - Results display panel
```

**Acceptance Criteria**:
- [ ] Voice input works on mobile browsers
- [ ] Screenshots extract text correctly
- [ ] Chat maintains conversation context
- [ ] Results show diagnosis + time estimate
- [ ] UI responsive on all devices

**Claude Super-Prompt Seed**:
```
📌 Objective: Create dashboard AI chatbot interface
📂 Scope: components/ai/*, app/(dashboard)/ai-chat/*
⚙️ Commands: Test on mobile with pnpm dev
🚨 Escalate: Browser compatibility issues
🔐 Rules: Use shadcn/ui components, Dutch i18n
```

---

### S4 — Plumber Control Chat (WhatsApp #2)

**Objective**: Enable plumber-AI conversation in Control Chat with approval workflow.

**Deliverables**:
```yaml
Files to CREATE:
  - src/server/services/control-chat.ts
  - src/server/api/routers/control-chat.ts
  - src/components/control/approval-flow.tsx
  - src/server/db/sql/023_control_chat.sql

Workflows:
  - AI suggestions sent to plumber
  - Quick action buttons (Approve/Edit/More Info)
  - Edit capture for learning
  - Auto-mode toggle per conversation
  - Message relay to customer
```

**Acceptance Criteria**:
- [ ] Plumber receives AI suggestions in WhatsApp
- [ ] All customer messages require approval
- [ ] Edits logged as learning events
- [ ] Auto-mode only allows clarifications
- [ ] Full audit trail maintained

**Claude Super-Prompt Seed**:
```
📌 Objective: Implement plumber approval workflow in Control Chat
📂 Scope: server/services/control-chat.ts, server/api/routers/control-chat.ts
⚙️ Commands: Test with WhatsApp simulator
🚨 Escalate: Message routing complexity
🔐 Rules: Default to approval required, audit everything
```

---

### S5 — Travel-Aware Slot Generation

**Objective**: Generate only physically possible appointment slots using Google Distance Matrix.

**Deliverables**:
```yaml
Files to CREATE:
  - src/server/services/scheduling/slot-generator.ts
  - src/server/services/scheduling/distance-matrix.ts
  - src/lib/scheduling/buffer-policy.ts
  - src/server/api/routers/scheduling.ts
  - src/server/db/sql/024_scheduling.sql

Core Logic:
  - Distance Matrix API integration
  - Travel time calculation with traffic
  - Buffer policy application
  - Edge validation (prev→this→next)
  - 5-minute bucket caching
```

**Acceptance Criteria**:
- [ ] No impossible slots offered
- [ ] Travel times include traffic predictions
- [ ] Cache reduces API calls by 50%+
- [ ] Fallback to fixed buffers on API failure
- [ ] P95 slot generation < 1 second

**Claude Super-Prompt Seed**:
```
📌 Objective: Build travel-aware scheduling system
📂 Scope: server/services/scheduling/*, lib/scheduling/*
⚙️ Commands: Test with mock coordinates
🚨 Escalate: Google API rate limits or costs
🔐 Rules: Cache aggressively, handle failures gracefully
```

---

### S6 — Job Cards (Mobile Command Center)

**Objective**: Create the primary plumber interface - offline-capable mobile Job Cards.

**Deliverables**:
```yaml
Files to CREATE:
  - src/app/p/today/page.tsx
  - src/app/p/job/[token]/page.tsx
  - src/components/job-card/timer.tsx
  - src/components/job-card/materials-quick-add.tsx
  - src/components/job-card/status-buttons.tsx
  - src/hooks/use-offline-sync.ts
  - src/server/db/sql/025_job_cards.sql

Features:
  - Today view with swipe navigation
  - Running timer with pause/resume
  - Materials quick-add with running total
  - One-tap WhatsApp/call/navigate
  - Custom status templates
  - Offline mode with sync
  - Week view navigation
```

**Acceptance Criteria**:
- [ ] Loads in < 1s on 3G
- [ ] Offline changes sync when reconnected
- [ ] Timer persists across sessions
- [ ] All buttons thumb-reachable
- [ ] Swipe navigation smooth

**Claude Super-Prompt Seed**:
```
📌 Objective: Build mobile-first Job Card interface
📂 Scope: app/p/*, components/job-card/*, hooks/use-offline-sync.ts
⚙️ Commands: Test with Playwright mobile emulation
🚨 Escalate: Service worker complexity
🔐 Rules: Mobile-first, 48px touch targets, WCAG AA
```

---

### S7 — Customer Portal (White-Label)

**Objective**: Professional customer-facing portal with plumber branding.

**Deliverables**:
```yaml
Files to CREATE:
  - src/app/c/job/[token]/page.tsx
  - src/app/c/reschedule/[token]/page.tsx
  - src/components/customer/job-details.tsx
  - src/components/customer/calendar-add.tsx
  - src/components/customer/emergency-contact.tsx
  - src/lib/branding.ts

Features:
  - Plumber logo/colors/name
  - Job details and quote
  - "Add to Calendar" with .ics
  - Reschedule button
  - Emergency contact
  - Status updates
  - Mobile responsive
```

**Acceptance Criteria**:
- [ ] Branding applied from org settings
- [ ] .ics file downloads correctly
- [ ] Reschedule shows available slots
- [ ] Emergency button works
- [ ] Loads fast on mobile

**Claude Super-Prompt Seed**:
```
📌 Objective: Create white-label customer portal
📂 Scope: app/c/*, components/customer/*
⚙️ Commands: Test with multiple brand configs
🚨 Escalate: Calendar compatibility issues
🔐 Rules: Professional design, Dutch-first, mobile responsive
```

---

### S8 — Google Calendar Integration

**Objective**: Sync appointments with Google Calendar as source of truth.

**Deliverables**:
```yaml
Files to CREATE:
  - src/server/services/google-calendar.ts
  - src/server/api/routers/calendar.ts
  - src/app/api/oauth/google/callback/route.ts
  - src/server/db/sql/026_calendar_sync.sql

Features:
  - OAuth2 connection per plumber
  - Event creation with extendedProperties
  - Free/busy lookup
  - Real-time sync
  - Conflict detection
  - Token refresh handling
```

**Acceptance Criteria**:
- [ ] OAuth flow completes successfully
- [ ] Events appear in Google Calendar
- [ ] ExtendedProperties store jobId/coordinates
- [ ] Sync latency < 500ms
- [ ] Token refresh automatic

**Claude Super-Prompt Seed**:
```
📌 Objective: Integrate with Google Calendar API
📂 Scope: server/services/google-calendar.ts, app/api/oauth/google/*
⚙️ Commands: Test with real Google account
🚨 Escalate: OAuth complexity or quota limits
🔐 Rules: Secure token storage, handle all error cases
```

---

### S9 — Schedule-X Calendar UI

**Objective**: Provide week overview with drag-and-drop editing that syncs with Google.

**Deliverables**:
```yaml
Files to EDIT:
  - src/app/(dashboard)/jobs/calendar/page.tsx
  - src/components/calendar/calendar-view.tsx
  
Files to CREATE:
  - src/hooks/use-calendar-sync.ts
  - src/server/services/schedule-x-sync.ts

Features:
  - Week view with all jobs
  - Drag-and-drop rescheduling
  - Two-way sync with Google
  - Employee color coding
  - Travel time visualization
```

**Acceptance Criteria**:
- [ ] Changes sync to Google Calendar
- [ ] Google changes appear in Schedule-X
- [ ] Drag-and-drop updates travel validation
- [ ] Colors consistent across views
- [ ] No sync conflicts

**Claude Super-Prompt Seed**:
```
📌 Objective: Enable Schedule-X ↔ Google Calendar sync
📂 Scope: EDIT calendar components, CREATE sync services
⚙️ Commands: Test drag-and-drop with pnpm dev
🚨 Escalate: Temporal timezone issues
🔐 Rules: Use existing Schedule-X setup, maintain colors
```

---

### S10 — Moneybird Accounting Integration

**Objective**: Complete OAuth and invoice creation with Moneybird.

**Deliverables**:
```yaml
Files to CREATE:
  - src/server/services/providers/moneybird.ts
  - src/server/api/routers/accounting.ts
  - src/app/api/oauth/moneybird/callback/route.ts
  - src/components/settings/accounting-connect.tsx
  - src/server/db/sql/027_accounting.sql

Features:
  - OAuth2 PKCE flow
  - Contact creation/lookup
  - Invoice generation
  - PDF/UBL retrieval
  - Webhook handling
  - Health monitoring
```

**Acceptance Criteria**:
- [ ] OAuth connects successfully
- [ ] Invoices created in Moneybird
- [ ] Contacts synced correctly
- [ ] Webhooks update payment status
- [ ] Health check accurate

**Claude Super-Prompt Seed**:
```
📌 Objective: Implement Moneybird provider integration
📂 Scope: server/services/providers/moneybird.ts, app/api/oauth/moneybird/*
⚙️ Commands: Test with Moneybird sandbox
🚨 Escalate: API version changes or rate limits
🔐 Rules: PKCE flow, secure token storage
```

---

### S11 — Invoice Generation from Jobs

**Objective**: Create invoices with materials and time from completed jobs.

**Deliverables**:
```yaml
Files to EDIT:
  - src/server/api/routers/invoices.ts
  
Files to CREATE:
  - src/components/invoice/draft-from-job.tsx
  - src/components/invoice/material-entry.tsx
  - src/server/services/invoice-generator.ts

Features:
  - Pull time from Job Card timer
  - Add materials with quick-select
  - Calculate totals with VAT
  - Generate in provider
  - Attach payment link
```

**Acceptance Criteria**:
- [ ] Timer minutes transfer correctly
- [ ] Materials calculate with VAT
- [ ] Invoice appears in provider
- [ ] Payment link generated
- [ ] Status shows in Job Card

**Claude Super-Prompt Seed**:
```
📌 Objective: Generate invoices from completed jobs
📂 Scope: EDIT invoices router, CREATE invoice components
⚙️ Commands: Test full flow job → invoice
🚨 Escalate: VAT calculation complexity
🔐 Rules: Integer cents only, Dutch VAT rates
```

---

### S12 — Mollie iDEAL Payments

**Objective**: Process payments via iDEAL with status tracking.

**Deliverables**:
```yaml
Files to CREATE:
  - src/server/services/mollie-client.ts
  - src/app/api/webhooks/mollie/route.ts
  - src/components/invoice/payment-status.tsx
  - src/server/db/sql/028_payments.sql

Features:
  - Payment link generation
  - iDEAL method configuration
  - Webhook status updates
  - Payment status display
  - Retry failed payments
```

**Acceptance Criteria**:
- [ ] iDEAL payment links work
- [ ] Status updates via webhook
- [ ] Payment reflected in invoice
- [ ] Job Card shows payment status
- [ ] Webhook signature verified

**Claude Super-Prompt Seed**:
```
📌 Objective: Integrate Mollie for iDEAL payments
📂 Scope: server/services/mollie-client.ts, app/api/webhooks/mollie/*
⚙️ Commands: Test with Mollie test mode
🚨 Escalate: Webhook signature verification
🔐 Rules: Never trust client-side payment status
```

---

### S13 — Payment Reminders

**Objective**: Send automated payment reminders via WhatsApp.

**Deliverables**:
```yaml
Files to CREATE:
  - src/server/services/reminder-engine.ts
  - src/server/cron/payment-reminders.ts
  - src/components/settings/reminder-config.tsx

Features:
  - Reminders at +3, +7, +14 days
  - WhatsApp template usage
  - Skip paid invoices
  - Quiet hours respect
  - Manual trigger option
```

**Acceptance Criteria**:
- [ ] Reminders sent on schedule
- [ ] Templates used after 24h
- [ ] Paid invoices skipped
- [ ] Audit trail complete
- [ ] Manual trigger works

**Claude Super-Prompt Seed**:
```
📌 Objective: Build payment reminder system
📂 Scope: server/services/reminder-engine.ts, server/cron/*
⚙️ Commands: Test with time simulation
🚨 Escalate: WhatsApp template approval
🔐 Rules: Respect quiet hours, log all sends
```

---

### S14 — Magic Booking & Reschedule

**Objective**: Customer self-service booking and rescheduling pages.

**Deliverables**:
```yaml
Files to CREATE:
  - src/app/book/[token]/page.tsx
  - src/app/reschedule/[token]/page.tsx
  - src/components/booking/slot-picker.tsx
  - src/components/booking/confirmation.tsx

Features:
  - Token-based access (24h expiry)
  - Show 3-5 available slots
  - Travel-validated options only
  - Instant confirmation
  - Calendar update on selection
  - WhatsApp notification to plumber
```

**Acceptance Criteria**:
- [ ] Tokens expire correctly
- [ ] Only valid slots shown
- [ ] Booking creates job
- [ ] Calendar updates
- [ ] Plumber notified

**Claude Super-Prompt Seed**:
```
📌 Objective: Create customer self-service booking pages
📂 Scope: app/book/*, app/reschedule/*, components/booking/*
⚙️ Commands: Test with expired tokens
🚨 Escalate: Double-booking edge cases
🔐 Rules: RLS enforce ownership, mobile-first
```

---

## Phase 2 Slices (Future Enhancements)

### S15 — Voice → Invoice Transcription

**Objective**: Convert voice notes to invoice drafts.

**Features**:
- Accept WhatsApp voice notes
- Speech-to-text (Dutch + English)
- Parse time and materials
- Generate draft invoice
- Plumber review/edit

---

### S16 — Live GPS Tracking

**Objective**: Share plumber location with customers.

**Features**:
- Opt-in GPS sharing
- "On my way" with live map
- ETA updates
- Privacy controls
- Battery optimization

---

### S17 — Signature Capture

**Objective**: Digital signature on job completion.

**Features**:
- Touch signature pad
- Store with job record
- Add to invoice
- Email copy to customer
- Legal compliance

---

### S18 — Advanced Rescheduling

**Objective**: Complex reschedule with full recalculation.

**Features**:
- Ripple effect calculation
- Multi-job optimization
- Reason capture
- Limit reschedules
- Priority preservation

---

### S19 — Team Management

**Objective**: Multi-plumber coordination features.

**Features**:
- Supervisor dashboard
- Cross-plumber job view
- Team calendar
- Workload balancing
- Performance metrics

---

### S20 — Template Builder

**Objective**: Custom WhatsApp message templates.

**Features**:
- Visual template editor
- Variable insertion
- Multi-language support
- Approval workflow
- A/B testing

---

### S21 — Full Auto Mode

**Objective**: AI handles complete conversations.

**Features**:
- Autonomous scheduling
- Price negotiation (within limits)
- Complex Q&A
- Escalation triggers
- Learning from outcomes

---

## Validation Strategy

### Per-Slice Testing

**Unit Tests** (via pnpm check):
- Zod schema validation
- Business logic functions
- API endpoint contracts

**Integration Tests** (via Playwright MCP):
- Webhook processing
- OAuth flows
- External API calls

**E2E Tests** (via local testing):
- Complete user journeys
- Mobile responsiveness
- Offline/online sync

### Quality Gates

**Before Moving to Next Slice**:
```bash
pnpm check        # After every 2-3 files
pnpm guard        # At slice completion
mcp__playwright__ # UI testing
```

**Deployment Checklist**:
- [ ] Feature flag configured
- [ ] Migrations applied
- [ ] Types regenerated
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] E2E test passes
- [ ] Monitoring configured

---

## Risk Management

### Technical Risks

| Risk | Mitigation | Owner |
|------|------------|-------|
| WhatsApp rate limits | Implement backoff, queue messages | S1 |
| AI hallucinations | Require approval, set confidence thresholds | S2 |
| Offline sync conflicts | Last-write-wins, audit trail | S6 |
| Calendar sync loops | Dedupe events, circuit breaker | S8 |
| Payment failures | Retry logic, manual fallback | S12 |

### Rollback Procedures

**Feature Flags**: Every slice behind flag for instant disable
**Database**: Migrations are additive only, no destructive changes
**External APIs**: Circuit breakers prevent cascade failures
**Cache**: Can be cleared without data loss

---

## Success Metrics

### Phase 1 Complete When
- 5 pilot plumbers using daily
- 50+ jobs processed
- 80%+ AI accuracy
- <10% travel conflicts
- 70%+ invoices paid in 24h
- Zero critical bugs

### Phase 2 Triggers
- 100+ active plumbers
- 1000+ jobs/week
- Feature requests stabilize
- Team can support scale
- Revenue supports development

---

## Claude Super-Prompt Template

For each slice implementation:

```markdown
## Slice [NUMBER] - [NAME]

📌 **Objective**: [One sentence goal]
📂 **Scope**: 
  - CREATE: [new files]
  - EDIT: [existing files]
  - DON'T TOUCH: [protected files]

⚙️ **Commands**:
  - `pnpm check` after every 2 files
  - `pnpm guard` at completion
  - Test with [specific test approach]

🚨 **Escalate**:
  - [Specific risk 1]
  - [Specific risk 2]

🔐 **Rules**:
  - Use ~/imports only
  - Temporal for dates
  - Integer cents for money
  - Dutch i18n first
  - No eslint-disable
  - Audit all actions

📋 **Acceptance**:
  - [ ] [Specific criterion 1]
  - [ ] [Specific criterion 2]
  - [ ] [Specific criterion 3]
```

---

## Appendix A: File Touch Map

### Core Files (Modified Multiple Slices)
```
src/server/api/root.ts         # Router registration
src/lib/env.ts                 # Environment variables
src/types/index.ts             # Shared types
src/server/db/schema.ts        # Database schema
```

### Protected Files (Don't Modify)
```
src/server/auth/*              # Authentication logic
src/server/db/index.ts         # Database client
src/middleware.ts              # Auth middleware
eslint.config.mjs              # Linting rules
```

---

## Appendix B: External Dependencies

### APIs Required
- WhatsApp Cloud API (Meta Business)
- Google Calendar API
- Google Distance Matrix API
- Moneybird API (or alternatives)
- Mollie API
- OpenAI/Anthropic (via AI SDK)

### Accounts Needed
- Meta Business verification
- Google Cloud Platform
- Mollie merchant account
- Accounting provider accounts

---

## Appendix C: Pilot Rollout Plan

### Week 1: Foundation (S0-S4)
- Deploy infrastructure
- Connect first plumber's WhatsApp
- Test AI analysis accuracy
- Verify approval workflow

### Week 2: Core Features (S5-S9)
- Enable scheduling
- Launch Job Cards
- Test calendar sync
- Customer portal live

### Week 3: Invoicing (S10-S14)
- Connect Moneybird
- Process first invoice
- Test payment flow
- Enable reminders

### Week 4: Optimization
- Gather feedback
- Fix critical bugs
- Improve AI accuracy
- Plan Phase 2

---

*This document consolidates and supersedes the previous epic documents. Each slice can be implemented independently with its own Claude super-prompt.*