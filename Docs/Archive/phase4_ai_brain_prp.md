# ⚠️ DOCUMENT SUPERSEDED

**This document has been consolidated into:**
- **Primary**: [whatsapp_ai_unified_prp.md](./whatsapp_ai_unified_prp.md) - Complete technical specification
- **Secondary**: [whatsapp_ai_unified_epic.md](./whatsapp_ai_unified_epic.md) - Implementation roadmap

**Status**: ARCHIVED - Do not update
**Superseded**: 2025-01-09

---

# Original: PRP — Phase 4 "AI Brain + Official WhatsApp + Voice→Invoice + Media Uploads"

Owner: Jordan / Plumbing Agent

Status: Ready for implementation (no Bridge Mode)

Date: 28 Aug 2025 (Europe/Amsterdam)

Stack: Next.js (App Router), TypeScript, Tailwind v4, shadcn/ui, tRPC, Supabase (DB + private storage), Clerk, AI SDK v5



Executive Summary



Feature Name: Phase 4 — Core AI Brain \& Omnichannel Intake

One-Line Description: Turn WhatsApp chats and file uploads into safe, plumber-approved diagnosis + editable time estimates and voice-driven invoice drafts, with basic agent actions (add customer, send WhatsApp).

Business Impact: Faster quoting/invoicing, reduced admin, higher conversion, compounding learning loop.

Estimated Complexity: Epic (16+ hours)

Stack Compatibility: Matches Engineering Rules vNext; multi-tenant and GDPR-aware.



Goals \& Context

Goal



Ship a modular AI Brain that:



Analyzes customer messages (WhatsApp Cloud API + manual uploads) → triage, diagnosis hypotheses, time estimate range (editable).



Learns from plumber edits to time estimates (key signal).



Converts voice to invoice draft (Voice→Invoice), editable and plumber-approved.



Acts safely with basic agent actions only: Create Customer \& Send WhatsApp Message (with explicit approval + audit).



Works side-by-side with a WhatsApp thread UI or as a standalone AI page when WA isn’t connected.



Why



Reduce back-and-forth and speed booking.



Keep tone/compliance consistent.



Build a growing dataset from edits (learning loop).



Official WhatsApp ensures reliability and policy alignment (24-hour window, templates later).



What (user-visible)



Paste chat or use WhatsApp thread; upload photo/video/audio.



Click Analyze → see Triage / Hypotheses / Time range (min–max + assumptions).



Edit time range; edit or approve Voice→Invoice draft; Send message via WhatsApp (if within session).



Basic Quick Actions: “Ask AI” anywhere in dashboard; “Add Customer”; “Message on WhatsApp”.



Success Criteria



&nbsp;≥ 80% triage correctness (golden set).



&nbsp;MAE ≤ 30 mins for time estimates on common jobs.



&nbsp;≥ 70% voice notes → usable invoice draft (minimal edits).



&nbsp;p95 < 2.5s on analyzeIssue (text + small images).



&nbsp;100% outbound events gated by human approval; fully audited.



Requirements

Functional Requirements



FR1 – Intake:



WhatsApp Cloud API (2 numbers per org/plumber: business number + relay chat number).



Manual uploads: image/video/audio; “paste chat” input.



FR2 – Analyze: Triage, top diagnosis hypotheses, time range (min–max), assumptions, confidence.



FR3 – Editable Estimates: Plumber can edit min–max; every edit logged as learning event.



FR4 – Voice→Invoice: Audio → transcript → InvoiceDraft (editable).



FR5 – Basic Agent Actions:



CREATE\_CUSTOMER (name, phone, tags)



SEND\_WHATSAPP\_MESSAGE (to an existing/just-created contact)

Both require explicit approval; no auto-send.



FR6 – UI Surfaces:



Side-by-side: WhatsApp thread (left) + AI panel (right).



Standalone AI page if WA not connected.



Quick Actions open AI panel seeded with context (job/customer).



FR7 – Multi-tenant \& Numbers: Per org mapping for two WA numbers.



FR8 – GDPR \& Dutch best practice: Private storage, redaction, short retention defaults, data subject rights, explicit approval before sending, and transparency.



Non-Functional Requirements



Security: Server-only secrets; HMAC verification for webhooks; idempotency; RLS per tenant.



Performance: p95 <2.5s (analyzeIssue); streaming where helpful.



Reliability: Idempotent inbound events; poison queue on malformed payloads.



Observability: Audit logs on all agent actions; metrics on accuracy/MAE/overrides/cost/latency.



Accessibility: Keyboard/ARIA for AI panel and approval modals.



Explicitly Out of Scope



WhatsApp templates outside the 24-hour window (planned).



Live mic/telephony; TTS voice-relay.



Materials/SKU intelligence.



All Needed Context



Engineering Rules vNext: strict TypeScript, Zod at all boundaries, ~/ imports only, Supabase RLS, audit logging.



WhatsApp Cloud API:



24-hour session window: freeform replies allowed; after that requires approved templates.



30-day message retention on Meta systems; we copy only what’s needed into Supabase private storage, then purge pointers.



GDPR (NL best practice):



Service comms = contract/legitimate interest lawful basis.



Marketing or proactive comms require opt-in + templates.



Minimize retention: suggest 90 days for media, 180 days for transcripts.



Provide deletion/on-demand purge.



Dutch AP guidance: Delete chat histories when no longer needed.



Technical Architecture

Components



Normalizer: WA events \& uploads → normalized IssueInput.



Brain Router (tRPC): orchestrates triage, diagnosis, timeEstimate, messageDraft, voiceToInvoice.



Model Router (AI SDK v5): skill-specific model selection; JSON mode enforced.



Agent Actions: Proposed by AI → UI approval modal → executed by tRPC → fully audited.



Stores (Supabase): ai\_runs, ai\_learning\_events, wa\_numbers, wa\_contacts, attachments, customers, invoices.



Two-Number Model (per org)



Business Number: customer-facing, used for all normal traffic.



Relay Chat Number: PA-provided fallback/testing/opt-in channel.



Routing: inbound tagged with to\_number\_id; outbound uses chosen number (default: business).



Data Models (Zod + sketches)

export const Attachment = z.object({

&nbsp; id: z.string().uuid().optional(),

&nbsp; type: z.enum(\["image","video","audio","screenshot","pdf"]),

&nbsp; url: z.string().url(),

&nbsp; width: z.number().optional(),

&nbsp; height: z.number().optional(),

&nbsp; durationSec: z.number().optional(),

&nbsp; sha256: z.string().optional(),

});



export const IssueInput = z.object({

&nbsp; tenantId: z.string(),

&nbsp; channel: z.enum(\["app","whatsapp\_cloud"]).default("app"),

&nbsp; languagePref: z.enum(\["nl","en"]).default("nl"),

&nbsp; customerText: z.string().min(2),

&nbsp; attachments: z.array(Attachment).default(\[]),

&nbsp; locationPostalCode: z.string().optional(),

&nbsp; metadata: z.record(z.any()).default({}),

});



export const Triage = z.object({

&nbsp; category: z.enum(\["DIY","PRO","EMERGENCY"]),

&nbsp; confidence: z.number(),

&nbsp; reasons: z.array(z.string()).max(6),

&nbsp; nextQuestions: z.array(z.string()).max(5),

});



export const Diagnosis = z.object({

&nbsp; label: z.string(),

&nbsp; confidence: z.number(),

&nbsp; evidence: z.array(z.string()),

});



export const TimeEstimate = z.object({

&nbsp; minMins: z.number().int().nonnegative(),

&nbsp; maxMins: z.number().int().positive(),

&nbsp; assumptions: z.array(z.string()),

&nbsp; riskFlags: z.array(z.enum(\["WATER\_DAMAGE","GAS","SCALD","ELECTRICAL","CODE\_COMPLIANCE"])),

});



export const InvoiceLine = z.object({

&nbsp; kind: z.enum(\["LABOR","FEE","VAT","DISCOUNT","OTHER"]),

&nbsp; label: z.string(),

&nbsp; qty: z.number().positive().default(1),

&nbsp; unitPrice: z.number().nonnegative(),

});



export const InvoiceDraft = z.object({

&nbsp; items: z.array(InvoiceLine),

&nbsp; subtotal: z.number(),

&nbsp; vat: z.number(),

&nbsp; total: z.number(),

&nbsp; notes: z.string().optional(),

});



export const AgentAction = z.discriminatedUnion("type", \[

&nbsp; z.object({ type: z.literal("CREATE\_CUSTOMER"), payload: z.object({ name: z.string(), phoneE164: z.string(), tags: z.array(z.string()).default(\[]) }) }),

&nbsp; z.object({ type: z.literal("SEND\_WHATSAPP\_MESSAGE"), payload: z.object({ toWaContactId: z.string(), fromNumberId: z.string(), text: z.string().max(1000) }) }),

]);



export const BrainOutput = z.object({

&nbsp; triage: Triage,

&nbsp; diagnoses: z.array(Diagnosis).max(3),

&nbsp; timeEstimate: TimeEstimate,

&nbsp; messageDraft: z.object({ short: z.string().max(400), detailed: z.string().max(1500), language: z.enum(\["nl","en"]) }),

&nbsp; proposedActions: z.array(AgentAction).default(\[]),

&nbsp; modelMeta: z.object({ models: z.record(z.string()), latencyMs: z.number(), costEUR: z.number().default(0), promptVersion: z.string() }),

});



API Contracts

// brain.router.ts

export const brainRouter = createTRPCRouter({

&nbsp; analyzeIssue: protectedProcedure.input(IssueInput).mutation(/\* ... \*/),

&nbsp; replyDraft: protectedProcedure.input(z.object({ tenantId: z.string(), languagePref: z.enum(\["nl","en"]), triage: Triage.optional(), timeEstimate: TimeEstimate.optional() })).mutation(/\* ... \*/),

&nbsp; voiceToInvoice: protectedProcedure.input(z.object({ tenantId: z.string(), audio: Attachment, context: z.object({ jobId: z.string().optional() }) })).mutation(/\* ... \*/),

&nbsp; proposeActions: protectedProcedure.input(z.object({ tenantId: z.string(), brainOutput: BrainOutput })).mutation(/\* ... \*/),

&nbsp; executeActions: protectedProcedure.input(z.object({ tenantId: z.string(), actions: z.array(AgentAction), dryRun: z.boolean().default(false) })).mutation(/\* ... \*/),

&nbsp; learn: protectedProcedure.input(z.object({ tenantId: z.string(), jobId: z.string().optional(), kind: z.enum(\["TIME\_EDIT","INVOICE\_EDIT"]), before: z.any(), after: z.any(), tags: z.array(z.string()).default(\[]) })).mutation(/\* ... \*/),

});



// whatsapp.router.ts

export const whatsappRouter = createTRPCRouter({

&nbsp; getThreads: protectedProcedure.input(z.object({ tenantId: z.string() })).query(/\* ... \*/),

&nbsp; sendMessage: protectedProcedure.input(z.object({ tenantId: z.string(), fromNumberId: z.string(), toWaContactId: z.string(), text: z.string().max(1000) })).mutation(/\* session check + send \*/),

});





REST:



POST /api/wa/verify — webhook handshake



POST /api/wa/webhook — HMAC verify, idempotent insert, normalize+analyze



Database Schema Changes (outline)



(SQL schema for wa\_numbers, wa\_contacts, attachments, ai\_runs, ai\_learning\_events, customers — included in our earlier inline draft.)



Implementation Blueprint



Contracts \& Skill Shells: implement Zod schemas + skill stubs.



WhatsApp Inbound: webhook handlers; media storage.



Manual Upload Intake: UI for paste/upload.



Voice→Invoice: STT pipeline, transcript confirm → InvoiceDraft.



Basic Agent Actions: create customer, send message (approval only).



Side-by-Side UI: WA thread + AI panel.



Learning \& Metrics: capture edits.



QA Gates: golden set tests, session-window enforcement, GDPR redaction tests.



AI SDK v5 (Deep Dive)



Structured JSON outputs → validated via Zod.



Model-per-skill routing.



Proposed actions implemented as tools but never auto-executed.



Fallbacks: model swap/config flags.



Streaming support for UI responsiveness.



GDPR \& WhatsApp Compliance



Lawful basis: contract/legitimate interest for service chats; opt-in for marketing.



Retention: 90d media, 180d transcripts; purge beyond; respect DSAR.



Security: HMAC verify, tenant RLS, private storage, audit logs.



24-hour session rule: enforced; no template sends in this phase.



Testing Strategy



Unit: schema validation, webhook HMAC tests.



Integration: WA inbound, manual uploads, voice→invoice.



E2E: analyze → edit → approve → send.



Performance: measure p95 latency; cap costs.



Security: GDPR retention and redaction tested.



Rollback Plan



Canary new prompt versions; rollback on regression.



Feature flags for WA send + Voice→Invoice.



DB migrations additive only.



Final Validation Checklist



WhatsApp inbound + 2 numbers/tenant ✅



Manual upload + paste chat ✅



Analyze → triage/diagnosis/time range ✅



Edits captured as learning ✅



Voice→Invoice with transcript confirm ✅



Only basic actions (create customer, send WA) ✅



Approval required, audit logs present ✅



Metrics dashboard working ✅



GDPR compliance (retention, deletion, notices) ✅



Future Enhancements



WA templates \& proactive messages.



Expanded agent actions (jobs, scheduling, PDF invoices).



Calendar sync, deposits, supplier integration.



Vision cues (ask for part-specific photos).



DIY Agent Lite.

