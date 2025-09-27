EPIC — Headless Invoicing & BTW-Prep (Moneybird · e-Boekhouden · WeFact · Peppol)

Background

Strategy shift: Our app owns the drafting UX + AI + chasing; providers own numbering, legal PDFs/UBL, storage, and VAT filing. No more building our own invoice engine (numbering/PDF).

**Critical Decision: Quarantine & Rebuild Strategy**
After analysis, we're NOT deleting the existing invoice system. Instead, we're quarantining legacy code and building v2 alongside it. This preserves >40 files of working integrations while giving us a clean workspace for provider-based architecture.

What exists now (from code scan):

**Legacy System (to be quarantined)**:
- Draft editor(s) and job import: src/components/invoices/InvoiceDraftSafe.tsx, InvoiceDraftEditor.tsx, JobToInvoiceImport.tsx
- Unified DTO + totals (cents): src/schema/invoice.ts, src/server/mappers/invoiceMapperUnified.ts  
- Legacy/internal engine artifacts: numbering RPC (src/server/db/sql/004_issue_invoice_rpc.sql), unify migration (src/server/db/sql/20250903_invoices_unify_v1.sql)
- Database tables: invoices, invoice_lines, invoice_drafts, invoice_payments, invoice_audit_log
- Complex router with 600+ lines of internal state management

**Good foundations to preserve**:
- Integer cents money handling (no floating point errors)
- Audit logging infrastructure with Temporal timezone support
- RLS security policies (full multi-tenant isolation)
- i18n translations for Dutch/English

**Not present**: No internal PDF generator (good — aligns with PRP), no provider adapters yet

Target: Plug into Moneybird first, then WeFact, then e-Boekhouden; optional Peppol. All invoices are issued by a provider; our UI fetches official PDF/UBL and provider PaymentURL, and we chase via one engine (ours or provider).

Motivation

- Cash faster, less risk: iDEAL links and provider-sent invoices reduce DSO while providers shoulder compliance (numbering, PDFs/UBL, VAT).
- Market fit: Most plumbers already use these tools; connecting them increases adoption and trust.
- Ops sanity: Providers become system of record; our data stays slim (ids, status, totals_cents, links, audit), with strong webhooks/pollers.

Why Not Delete Everything?

**Blast radius**: 40+ files reference invoicing across DTOs, router, UI, scripts, middleware
**RLS & audit**: Would need to recreate complex permission policies and audit trails
**Hidden dependencies**: Jobs/customers screens import invoice types/components  
**Time investment**: Already normalized to integer cents and unified lines—deleting wastes this work
**Risk**: Days of re-plumbing with high chance of regression bugs

Migration Impact Map

**Phase 1: Quarantine (Pre-S1)**
```
MOVE (preserve git history):
src/components/invoices/ → src/components/_legacy_invoices/
src/server/api/routers/invoices.ts → src/server/api/routers/invoices.legacy.ts
src/server/mappers/invoiceMapper*.ts → src/server/mappers/*.legacy.ts

PRESERVE & EXTEND:
src/schema/invoice.ts (ADD provider fields, keep existing)
src/types/supabase.ts (REGENERATE after migration)
Database tables (ADD columns, don't drop)

CREATE NEW:
src/server/api/routers/invoices.ts (minimal v2)
src/server/mappers/invoice.ts (v2 mapper)
src/components/invoices/ (v2 UI components)
src/server/providers/ (provider adapters)
```

**Phase 2: Parallel Running**
- Legacy system remains functional but not imported by new UI
- V2 system handles new invoices with provider integration
- Feature flags control which system is active
- Both can run simultaneously during transition

**Phase 3: Sunset Legacy (Future)**
- After v2 stable for 3 months
- One-time migration script for remaining legacy invoices
- Archive legacy tables with backup
- Remove _legacy folders

Actions (slices) - UPDATED IMPLEMENTATION ORDER

**Note**: We shuffled several slices from the original epic to de-risk payments + communications first and push UI later.

**What changed**:
- Epic S8 "Send Dialog & Chasing Toggle" → deferred (prioritized backend dunning over UI toggles)
- Epic S9 "Draft Editor & Job Import" → deferred (keeps us out of UI churn while backends stabilize)  
- Epic S10 "Payments Surface" → pulled forward as S8 (Mollie v1)
- Epic S11 "Status Sync & Timeline" → split: Status sync landed in S7; Timeline became S10
- **NEW S9 "Dunning System"** → inserted for automated payment reminders
- **NEW S10 "Timeline Infrastructure"** → unified event tracking
- **NEW S11 "Reporting & Snapshots"** → operational analytics system

**Current working order**: S0 → S1 → S2 → S3 → S4 → S5 → S6 → S7 → S8 → S9 → S10 → S11

**Why we did it**: Risk-first approach prioritizing payments, webhooks, idempotency, and dunning infrastructure before UI polish.

Pre-S1 — Quarantine Legacy & Scaffold v2

**Purpose**: Create clean workspace without breaking existing functionality

**Git operations (preserve history)**:
```bash
git mv src/components/invoices src/components/_legacy_invoices
git mv src/server/api/routers/invoices.ts src/server/api/routers/invoices.legacy.ts  
git mv src/server/mappers/invoiceMapper.ts src/server/mappers/invoiceMapper.legacy.ts
git mv src/server/mappers/invoiceMapperUnified.ts src/server/mappers/invoiceMapperUnified.legacy.ts
cp src/schema/invoice.ts src/schema/invoice.legacy.ts  # Keep reference copy
```

**Create v2 scaffolding**:
- `src/server/api/routers/invoices.ts` - Minimal v2 router (just list/get)
- `src/server/mappers/invoice.ts` - Clean v2 mapper
- `src/components/invoices/InvoiceList.tsx` - Simple v2 list with provider badges
- `src/server/providers/types.ts` - Provider interface for S2+

**Update imports**:
- `src/app/invoices/page.tsx` - Import v2 components, not legacy
- `src/server/api/root.ts` - Import v2 router

S0 — Feature Flags, Kill-switch, Capability Matrix

**Flags (src/lib/env.ts)**:
```typescript
INVOICING_PROVIDER_MODE: z.boolean().default(false), // Master switch
INVOICING_MONEYBIRD: z.boolean().default(false),
INVOICING_WEFACT: z.boolean().default(false),
INVOICING_EB: z.boolean().default(false),
PEPPOL_SEND: z.boolean().default(false),
```

**UI capability tiles (Connect)**: Moneybird / e-Boekhouden / WeFact / Other (Peppol).

**Guardrails**: exactly one reminder engine active (ours or provider).

S1 — Domain & Data Model for Providers (Additive Migration)

**CRITICAL CHANGE**: We're NOT dropping tables or deleting data. Additive migration preserves everything.

**Database Migration** (`20250903_invoices_provider_s1.sql`):
```sql
-- Add provider columns without breaking existing
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS provider text 
    CHECK (provider IN ('moneybird','wefact','eboekhouden','peppol')),
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS provider_status text,
  ADD COLUMN IF NOT EXISTS payment_url text,
  ADD COLUMN IF NOT EXISTS pdf_url text,
  ADD COLUMN IF NOT EXISTS ubl_url text,
  ADD COLUMN IF NOT EXISTS message_ids jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS issued_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_legacy boolean DEFAULT false;

-- Mark all existing invoices with numbers as legacy
UPDATE invoices SET is_legacy = true 
WHERE number IS NOT NULL AND is_legacy = false;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_invoices_provider ON invoices(provider);
CREATE INDEX IF NOT EXISTS idx_invoices_external_id ON invoices(external_id);
CREATE INDEX IF NOT EXISTS idx_invoices_legacy ON invoices(is_legacy) 
  WHERE is_legacy = false; -- Partial index for new invoices

-- Document deprecation
COMMENT ON COLUMN invoices.number IS 
  'DEPRECATED: Only for legacy invoices. New invoices use provider numbering via external_id';
```

**DTO Extension** (src/schema/invoice.ts):
- Add `InvoiceProviderSchema` enum
- Extend existing `InvoiceDTO` with optional provider fields
- Keep all existing fields and `computeTotalsCents()` unchanged
- Provider fields optional during transition

**V2 Router** (src/server/api/routers/invoices.ts):
- Minimal implementation (list/get/create draft)
- Guard: "Never assign internal numbers - provider owns post-send"
- No complex state management
- Provider integration hooks (empty for S1)

**V2 UI** (src/components/invoices/):
- InvoiceList with provider badge + legacy chip
- Read-only display for S1
- No send functionality yet (S4+)

**Regenerate Types**: `mcp__supabase__generate_typescript_types()`

S2 — InvoiceProvider Interface & Adapters (skeletons)

**Provider Interface** (`src/server/providers/types.ts`):
```typescript
interface InvoiceProvider {
  createDraft(dto: InvoiceDTO): Promise<{ externalId: string }>;
  finalizeAndSend(externalId: string): Promise<InvoiceSendResult>;
  fetchPdf(externalId: string): Promise<Buffer>;
  fetchUbl(externalId: string): Promise<string>;
  getPaymentUrl(externalId: string): Promise<string | null>;
  syncStatus(externalId: string): Promise<InvoiceStatus>;
  listWebhooks(): Promise<WebhookConfig[]>;
  setupWebhooks(config: WebhookConfig): Promise<void>;
}
```

Implement stubs for Moneybird / WeFact / e-Boekhouden / Peppol AP in v2 structure; no network yet.

S3 — Moneybird Connector (OAuth2 + Webhooks)

OAuth flow + token storage/refresh; minimal health check endpoint.

Webhook verification and subscriptions for invoice events; idempotent handlers.

Security: no client secrets; service-role allowed only in verified webhooks.

S4 — Moneybird Draft → Send → Links → Status

Map our draft DTO to Moneybird invoice lines (cents, 0/9/21 VAT).

Send: provider assigns number + stores legal PDF/UBL; we persist external_id, pdf/ubl URLs, payment link.

Invoice detail now shows provider PDF/UBL + PaymentURL; status updates via webhook.

**Critical**: After S4, lock v2 invoices post-send (no edits once provider owns it).

S5 — WeFact Connector (API Key, PaymentURL, optional Peppol)

API key onboarding + IP allow-list note.

Draft→send, capture PaymentURL, fetch PDF/UBL; optional Peppol on send (flag).

S6 — e-Boekhouden Connector (API keys + Polling)

API keys onboarding; issue/send flow; auto-number if blank; fetch PDF; status polling (≤5 min SLA).

S7 — Provider Status Refresh & Reconciliation System ✅ COMPLETED

**Status**: ✅ Production-ready provider-agnostic status polling and reconciliation system

End-to-end webhook/poll for Sent/Viewed/Paid/Overdue on v2 invoices across all providers.

Unified status mapping with provider-specific reconciliation logic and audit trails.

S8 — Mollie Payments Integration ✅ COMPLETED  

**Status**: ✅ Production-ready iDEAL payment processing with comprehensive webhook handling

Complete Mollie integration: payment link generation, webhook verification, status updates.

Comprehensive test coverage with Vitest framework and idempotent payment processing.

S9 — Dunning System (Multi-channel Payment Reminders) ✅ COMPLETED

**Status**: ✅ Production-ready automated payment reminder system

Multi-channel reminder delivery (email + WhatsApp) with configurable escalation schedules.

Template-based messaging with customer personalization and Dutch localization.

Invoice selection logic excluding paid/cancelled invoices with comprehensive audit logging.

S10 — Timeline Infrastructure (Unified Event Tracking) ✅ COMPLETED  

**Status**: ✅ Production-ready centralized invoice event tracking system

Unified invoice_timeline table tracking events across all systems (system, provider, payment, dunning).

Event normalization from multiple sources with privacy-compliant metadata handling.

Chronological ordering with source priority and proper database indexing.

S11 — Reporting & Analytics System ✅ COMPLETED

**Status**: ✅ Production-ready daily invoice snapshots with aggregation capabilities

Daily snapshot computation with PII-free organization-level aggregation and aging bucket analysis.

Weekly rollup from daily snapshots with ISO week calculation using Temporal timezone handling.

Token-gated automation endpoints and comprehensive workbench test coverage.

## DEFERRED UI WORK (Future Slices)

**S12 — Send Dialog & Chasing Toggle** ⚠️ DEFERRED

"Provider sends" vs "We send via WhatsApp/Email" UI controls.

Enforce single reminder engine per tenant with visual toggles and audit storage.

**S13 — Draft Editor & Job Import (Provider-ready)** ⚠️ DEFERRED  

Finom-style UI in v2 with VIES check chip, VAT (0/9/21), and cents math.

Align lines to provider schemas; legal checklist (KVK, BTW-id, address) before enabling "Send".

**S14 — Customer Invoice Pages** ⚠️ DEFERRED

Hosted customer-facing invoice pages with embedded provider payment links.

Professional "from plumber" branding with iDEAL-first payment presentation.

## ORIGINAL ROADMAP CONTINUES

S15 — Legacy Migration Tool

One-time script to migrate remaining legacy invoices to provider system (if desired).

Optional manual trigger per organization.

S13 — Provider Health Dashboard

Monitor OAuth tokens, webhook latency, API quotas.

Alert on failures or approaching limits.

S14 — Bulk Operations

Export multiple invoices, bulk status refresh, mass reminder toggle.

S15 — VAT Prep Widget

Quarter summary from provider data; "Prepare BTW pack" deep-link.

S16 — Sunset Legacy

After 3+ months stable: archive legacy tables, remove _legacy folders.

Success Metrics

**Technical Health**:
- Zero data loss during quarantine
- Legacy system remains functional
- V2 system TypeScript clean (pnpm check)
- Provider fields flow through DTO/mapper/router

**Business Impact**:
- Time to payment <24h via provider iDEAL links
- 70%+ organizations connect provider in week 1
- 100% new invoices have provider PDF/UBL

**Code Quality**:
- Clear separation: legacy vs v2
- No RouterOutputs in UI components
- All provider calls through interface
- Feature flags control all provider features

Rollback Checkpoints

- Pre-quarantine: Full backup before git mv operations
- Post-S1: Can disable INVOICING_PROVIDER_MODE flag
- Per-provider: Individual flags allow disabling specific integrations
- Data safety: is_legacy flag preserves all historical invoices

Notes

- We keep our AI/UX moat; providers own numbering, legal PDFs, and VAT filing
- Legacy quarantine allows reference without interference
- Parallel running reduces risk during transition
- Final sunset only after proven stability